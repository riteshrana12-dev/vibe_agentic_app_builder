import * as babel from "@babel/core";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { Message, FileData } from "@/types/workspace";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3.5-flash";

// ─── Request validation ────────────────────────────────────────────────────
// Previously the body was cast straight to a type with `as` — a malformed
// request crashed with an unhandled 500 instead of a clean 400.

const requestSchema = z.object({
  workspaceId: z.string().nullable(),
  userId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        imageUrl: z.string().url().optional(),
      }),
    )
    .min(1),
  fileData: z
    .object({
      files: z.record(z.string(), z.object({ code: z.string() })),
      dependencies: z.record(z.string(), z.string()),
      title: z.string().optional(),
    })
    .nullable(),
});

// ─── SSE helper ─────────────────────────────────────────────────────────────

function sseEvent(type: string, payload: unknown): string {
  let safePayload: Record<string, unknown>;
  try {
    safePayload = JSON.parse(JSON.stringify(payload)) as Record<
      string,
      unknown
    >;
  } catch {
    safePayload = { message: "Unserializable payload" };
  }
  return `data: ${JSON.stringify({ type, ...safePayload })}\n\n`;
}

// ─── Generated file validator ──────────────────────────────────────
function validateGeneratedFiles(files: Record<string, { code: string }>) {
  for (const [path, { code }] of Object.entries(files)) {
    try {
      babel.parse(code, { sourceType: "module", plugins: ["jsx"] });
    } catch (err) {
      throw new Error(
        `Generated file ${path} has invalid syntax: ${(err as Error).message}`,
      );
    }
  }
}
// ─── Extract short label from a Gemini thought chunk ──────────────────────

function extractThoughtLabel(text: string): string | null {
  const boldMatch = text.match(/\*\*([^*]{4,60})\*\*/);
  if (boldMatch) return boldMatch[1].trim();

  const sentence = text.split(/[.\n]/)[0].trim();
  if (sentence.length >= 8 && sentence.length <= 80) return sentence;

  return null;
}

// ─── npm validation ─────────────────────────────────────────────────────────
// Now returns which packages were dropped so we can tell the client, instead
// of silently shipping an app that imports a package which vanished from
// `dependencies` with no explanation.

async function validateDependencies(
  deps: Record<string, string>,
): Promise<{ valid: Record<string, string>; dropped: string[] }> {
  const valid: Record<string, string> = {};
  const dropped: string[] = [];

  await Promise.all(
    Object.entries(deps).map(async ([pkg, version]) => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkg}/latest`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          valid[pkg] = version;
        } else {
          dropped.push(pkg);
        }
      } catch {
        dropped.push(pkg);
      }
    }),
  );

  return { valid, dropped };
}

// ─── History trimming ───────────────────────────────────────────────────────

function trimHistory(messages: Message[]): Message[] {
  if (messages.length <= 10) return messages;
  return [messages[0], ...messages.slice(-8)];
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert React developer. Your job is to generate complete, working React applications based on user prompts.

RULES:
1. Always respond with a valid JSON object — no markdown fences, no extra text.
2. The JSON must match this exact shape:
{
  "assistantMessage": "<brief explanation of what you built/changed>",
  "title": "<short 2-4 word title for the app, e.g. 'Todo List App'>",
  "files": {
    "/App.js": { "code": "<full file content>" },
    "/components/SomeComponent.js": { "code": "<full file content>" }
  },
  "dependencies": {
    "some-package": "latest"
  }
}
3. Use React (functional components + hooks). Do NOT use TypeScript in generated files.
4. Use Tailwind CSS for all styling. Do not use CSS modules or inline styles unless absolutely necessary.
5. The entry point must always be /App.js and must export a default component.
6. All imports must reference files you include in "files" or packages in "dependencies".
7. Do not include react, react-dom, or tailwindcss in "dependencies" — they are always available.
8. When modifying existing code, include ALL files (both changed and unchanged) in "files".
9. Keep code clean, readable, and production-quality.
10. If the user attaches an image, use it as a design reference and match the layout/style as closely as possible.`;

// ─── Gemini contents builder ────────────────────────────────────────────────

function buildContents(messages: Message[], fileData: FileData | null) {
  const trimmed = trimHistory(messages);

  return trimmed.map((msg, idx) => {
    const role = msg.role === "assistant" ? "model" : "user";

    if (msg.role === "user") {
      const parts: object[] = [];
      let text = msg.content;

      if (msg.imageUrl) {
        text = `[The user has attached an image. Use this URL directly in the generated app where relevant (as img src, background-image, etc.): ${msg.imageUrl}]\n\n${text}`;
      }

      const isLast = idx === trimmed.length - 1;
      if (isLast && fileData) {
        text +=
          "\n\nCurrent project files for context:\n" +
          JSON.stringify(fileData, null, 2);
      }

      parts.push({ text });
      return { role, parts };
    }

    return { role, parts: [{ text: msg.content }] };
  });
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json();
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return Response.json(
      { message: "Invalid request body", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }
  const { workspaceId, userId, messages, fileData } = parsedBody.data;

  // Look up by primary key (`id`), then check clerkId in application code.
  // The previous `where: { id: userId, clerkId }` only works if the schema
  // declares a compound unique constraint on those two columns — if `id`
  // and `clerkId` are just two separately-unique fields, that query fails
  // to compile against Prisma. This form works regardless of the schema.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, clerkId: true, credits: true },
  });

  if (!user || user.clerkId !== clerkId) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }
  if (user.credits < CREDIT_COST_PER_GENERATION) {
    return Response.json({ message: "Insufficient credits" }, { status: 402 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      try {
        const contents = buildContents(
          messages as Message[],
          fileData as FileData | null,
        );

        const geminiStream = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
            responseMimeType: "application/json",
            thinkingConfig: {
              includeThoughts: true,
            },
          },
        });

        let accumulated = "";
        let lastEmitTime = 0;

        for await (const chunk of geminiStream) {
          const parts = chunk.candidates?.[0]?.content?.parts ?? [];

          for (const part of parts) {
            if (!part.text) continue;

            if (part.thought) {
              const now = Date.now();
              if (now - lastEmitTime > 600) {
                const label = extractThoughtLabel(part.text);
                if (label) {
                  enqueue(sseEvent("status", { message: label }));
                  lastEmitTime = now;
                }
              }
            } else {
              accumulated += part.text;
            }
          }
        }

        let parsed: {
          assistantMessage: string;
          title?: string;
          files: Record<string, { code: string }>;
          dependencies: Record<string, string>;
        };

        try {
          parsed = JSON.parse(accumulated);
        } catch {
          enqueue(
            sseEvent("error", {
              message: "AI returned invalid JSON. Please try again.",
            }),
          );
          controller.close();
          return;
        }
        try {
          validateGeneratedFiles(parsed.files);
        } catch (err) {
          enqueue(
            sseEvent("error", {
              message:
                err instanceof Error
                  ? err.message
                  : "Generated code failed validation.",
            }),
          );
          controller.close();
          return;
        }

        const {
          assistantMessage,
          title: aiTitle,
          files,
          dependencies,
        } = parsed;

        if (!files || typeof files !== "object") {
          enqueue(
            sseEvent("error", {
              message: "AI response missing files. Please try again.",
            }),
          );
          controller.close();
          return;
        }

        enqueue(sseEvent("status", { message: "Validating packages…" }));
        const { valid: validatedDeps, dropped } = await validateDependencies(
          dependencies ?? {},
        );

        if (dropped.length > 0) {
          enqueue(
            sseEvent("status", {
              message: `Skipped unavailable package${dropped.length > 1 ? "s" : ""}: ${dropped.join(", ")}`,
            }),
          );
        }

        const newFileData: FileData = {
          files,
          dependencies: validatedDeps,
          title: aiTitle,
        };

        enqueue(sseEvent("status", { message: "Saving…" }));

        const lastUserMessage = messages[messages.length - 1];
        const updatedMessages: Message[] = [
          ...(messages as Message[]),
          { role: "assistant", content: assistantMessage },
        ];

        // Debit credits atomically as part of the same transaction that
        // saves the workspace. `updateMany` with a `credits: { gte: cost }`
        // guard means two concurrent requests can't both pass the earlier
        // check and drive the balance negative — whichever commits second
        // sees `count: 0` and the whole transaction rolls back.
        const [workspace, debit] = await db.$transaction([
          workspaceId
            ? db.workspace.update({
                where: { id: workspaceId, userId },
                data: {
                  messages: updatedMessages as never,
                  fileData: newFileData as never,
                },
              })
            : db.workspace.create({
                data: {
                  userId,
                  title: aiTitle ?? lastUserMessage.content.slice(0, 80),
                  messages: updatedMessages as never,
                  fileData: newFileData as never,
                },
              }),
          db.user.updateMany({
            where: { id: userId, credits: { gte: CREDIT_COST_PER_GENERATION } },
            data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
          }),
        ]);

        if (debit.count === 0) {
          enqueue(
            sseEvent("error", {
              message:
                "Ran out of credits mid-generation. Your app was not saved — please top up and try again.",
            }),
          );
          controller.close();
          return;
        }

        const updatedUser = await db.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });

        enqueue(
          sseEvent("done", {
            workspaceId: workspace.id,
            assistantMessage,
            fileData: newFileData,
            creditsRemaining: updatedUser?.credits ?? 0,
          }),
        );
      } catch (err) {
        console.error("[gen-ai-code] stream error:", err);
        enqueue(
          sseEvent("error", {
            message: "Something went wrong. Please try again.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 300; // for vercel - 300s on Fluid

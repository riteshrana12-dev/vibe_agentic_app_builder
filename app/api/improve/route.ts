import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { GoogleGenAI, Type, type Content } from "@google/genai";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { FileData } from "@/types/workspace";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3.5-flash";
const MAX_ITERATIONS = 8;

// ─── Request validation ─────────────────────────────────────────────────────

const requestSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  userRequest: z.string().min(1),
  fileData: z.object({
    files: z.record(z.string(), z.object({ code: z.string() })),
    dependencies: z.record(z.string(), z.string()),
    title: z.string().optional(),
  }),
});

// ─── SSE helper ─────────────────────────────────────────────────────────────

function sseEvent(type: string, payload: object): string {
  return `data: ${JSON.stringify({ type, ...payload })}\n\n`;
}

// ─── Tool declarations ──────────────────────────────────────────────────────
// Same two tools the old cline/sdk agent had — update_file to patch one file
// at a time (streamed live), done_improving to end the run — just declared
// in Gemini's native function-calling schema instead of createTool().

const updateFileDeclaration = {
  name: "update_file",
  description:
    "Update or rewrite a file in the React sandbox. Call once per file you need to change.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "File path exactly as it appears, e.g. /App.js",
      },
      code: {
        type: Type.STRING,
        description: "Complete new contents of the file",
      },
      reason: {
        type: Type.STRING,
        description: "One sentence explaining what you changed and why",
      },
    },
    required: ["path", "code", "reason"],
  },
};

const doneImprovingDeclaration = {
  name: "done_improving",
  description: "Call this when you have finished making all improvements.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description:
          "A short friendly summary of all the improvements you made (1-3 sentences)",
      },
    },
    required: ["summary"],
  },
};

const TOOLS = [
  { functionDeclarations: [updateFileDeclaration, doneImprovingDeclaration] },
];

// ─── One model turn, streamed ───────────────────────────────────────────────
// Streams any text parts to the client as "thinking" deltas as they arrive
// (mirrors the old assistant-text-delta events), and collects functionCall
// parts to act on once the turn finishes. Returns the full parts list too,
// since that's what has to be pushed back into `contents` verbatim so the
// model has its own prior turn in context for the next round.

async function runTurn(
  contents: Content[],
  systemInstruction: string,
  enqueue: (chunk: string) => void,
) {
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      temperature: 0.4,
      tools: TOOLS,
    },
  });

  const parts: NonNullable<Content["parts"]> = [];
  const functionCalls: { name: string; args: Record<string, unknown> }[] = [];

  for await (const chunk of stream) {
    const chunkParts = chunk.candidates?.[0]?.content?.parts ?? [];
    for (const part of chunkParts) {
      if (part.text) {
        enqueue(sseEvent("thinking", { text: part.text }));
      }
      if (part.functionCall?.name) {
        functionCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args ?? {}) as Record<string, unknown>,
        });
      }
      parts.push(part);
    }
  }

  return { parts, functionCalls };
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return Response.json({ message: "Unauthorized" }, { status: 401 });

  const rawBody = await request.json();
  const parsedBody = requestSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return Response.json(
      { message: "Invalid request body", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }
  const { userId, workspaceId, userRequest, fileData } = parsedBody.data;

  // Same fix as gen-ai-code: look up by primary key, check clerkId in code,
  // rather than relying on a compound `where` that needs a matching Prisma
  // compound-unique constraint.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, clerkId: true, credits: true, plan: true },
  });

  if (!user || user.clerkId !== clerkId)
    return Response.json({ message: "User not found" }, { status: 404 });

  // Pro-only gate, unchanged from before — flag if Starter should also get
  // this feature; easy one-line change (`user.plan === "free"`) if so.
  if (user.plan !== "pro")
    return Response.json({ message: "Upgrade required" }, { status: 403 });

  if (user.credits < CREDIT_COST_PER_GENERATION)
    return Response.json({ message: "Insufficient credits" }, { status: 402 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      const patchedFiles: Record<string, { code: string }> = {
        ...fileData.files,
      };
      let finalSummary = "";

      const fileContext = Object.entries(fileData.files)
        .map(([path, { code }]) => `// ${path}\n${code}`)
        .join("\n\n---\n\n");

      const systemInstruction = `You are an expert React developer improving a live browser preview app.

The app uses React (functional components), Tailwind CSS for styling, and runs in Sandpack.
You CANNOT use TypeScript, CSS modules, or real npm install — only what's already available.
Available packages: react, react-dom, tailwindcss (CDN), lucide-react, recharts, react-router-dom, framer-motion, date-fns, zod, react-hook-form.

Here are the current files:

${fileContext}

WORKFLOW:
1. Understand what the user wants improved.
2. Identify which files need to change.
3. Call update_file for each file that needs changes (always include the COMPLETE file, not just the diff).
4. Once all files are updated, call done_improving with a short summary.

RULES:
- Always write complete file contents — never partial snippets.
- Keep all existing functionality unless asked to remove it.
- The entry point is always /App.js with a default export.
- All imports must reference files you've updated or packages in the available list above.`;

      // contents starts as a single user turn; each loop iteration appends
      // the model's turn (with its functionCall parts) and then a matching
      // functionResponse turn, exactly like the two-role pattern Gemini's
      // function-calling docs use for multi-turn tool loops.
      const contents: Content[] = [
        { role: "user", parts: [{ text: userRequest }] },
      ];

      try {
        enqueue(sseEvent("status", { message: "Analyzing your request…" }));

        let isDone = false;

        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
          const { parts, functionCalls } = await runTurn(
            contents,
            systemInstruction,
            enqueue,
          );

          contents.push({ role: "model", parts });

          if (functionCalls.length === 0) {
            // Model responded with plain text and no tool call — nothing
            // left to act on, so stop rather than loop until MAX_ITERATIONS.
            break;
          }

          const functionResponseParts: NonNullable<Content["parts"]> = [];

          for (const fc of functionCalls) {
            if (fc.name === "update_file") {
              const { path, code, reason } = fc.args as {
                path: string;
                code: string;
                reason: string;
              };
              patchedFiles[path] = { code };
              enqueue(sseEvent("file_patch", { path, code, reason }));
              enqueue(
                sseEvent("thinking", { text: `\n\nUpdating \`${path}\`…` }),
              );
              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: { result: `Updated ${path}` },
                },
              });
            } else if (fc.name === "done_improving") {
              const { summary } = fc.args as { summary: string };
              finalSummary = summary;
              isDone = true;
              enqueue(
                sseEvent("thinking", { text: "\n\nFinalizing improvements…" }),
              );
              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: { result: "acknowledged" },
                },
              });
            }
          }

          contents.push({ role: "user", parts: functionResponseParts });

          if (isDone) break;
        }

        const newFileData: FileData = {
          files: patchedFiles,
          dependencies: fileData.dependencies,
          title: fileData.title,
        };

        // Same atomic-debit fix as gen-ai-code: guarded updateMany inside
        // the transaction instead of an unconditional decrement after the
        // fact, so two concurrent improve calls can't overdraw credits.
        const [, debit] = await db.$transaction([
          db.workspace.update({
            where: { id: workspaceId, userId },
            data: { fileData: newFileData as never },
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
                "Ran out of credits mid-run. Your changes were not saved — please top up and try again.",
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
            fileData: newFileData,
            summary: finalSummary || "Made the requested changes.",
            creditsRemaining:
              updatedUser?.credits ?? user.credits - CREDIT_COST_PER_GENERATION,
          }),
        );
      } catch (err) {
        console.error("[improve] error:", err);
        enqueue(
          sseEvent("error", {
            message:
              err instanceof Error ? err.message : "Something went wrong.",
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

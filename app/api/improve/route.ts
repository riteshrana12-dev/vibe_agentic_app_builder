import * as babel from "@babel/core";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Agent, createTool } from "@cline/sdk";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { CREDIT_COST_PER_GENERATION } from "@/lib/constants";
import type { FileData } from "@/types/workspace";

// ─── Safe SSE helper ───────────────────────────────────────────────────────────
function sseEvent(type: string, payload: unknown): string {
  let safePayload: Record<string, unknown>;
  try {
    // Strip out unserializable values
    safePayload = JSON.parse(JSON.stringify(payload));
  } catch {
    safePayload = { message: "Unserializable payload" };
  }
  return `data: ${JSON.stringify({ type, ...safePayload })}\n\n`;
}

function validateGeneratedFiles(files: Record<string, { code: string }>): void {
  for (const [path, { code }] of Object.entries(files)) {
    try {
      babel.parse(code, {
        sourceType: "module",
        presets: ["@babel/preset-react"], // JSX support
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown parse error";
      throw new Error(`Generated file ${path} has invalid syntax: ${message}`);
    }
  }
}

// ─── Route ─────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId)
    return Response.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { userId, workspaceId, userRequest, fileData } = body as {
    userId: string;
    workspaceId: string;
    userRequest: string;
    fileData: FileData;
  };

  // ── Auth + credit check ──────────────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id: userId, clerkId },
    select: { id: true, credits: true, plan: true },
  });
  if (!user)
    return Response.json({ message: "User not found" }, { status: 404 });
  if (user.plan !== "pro")
    return Response.json({ message: "Upgrade required" }, { status: 403 });
  if (user.credits < CREDIT_COST_PER_GENERATION)
    return Response.json({ message: "Insufficient credits" }, { status: 402 });

  // ── Build the agent ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (chunk: string) =>
        controller.enqueue(encoder.encode(chunk));

      const patchedFiles: Record<string, { code: string }> = {
        ...fileData.files,
      };
      let finalSummary = "";

      // Tool 1: update_file
      const updateFileTool = createTool({
        name: "update_file",
        description: "Update or rewrite a file in the React sandbox.",
        inputSchema: z.object({
          path: z
            .string()
            .describe("File path exactly as it appears, e.g. /App.js"),
          code: z.string().describe("Complete new contents of the file"),
          reason: z
            .string()
            .describe("One sentence explaining what you changed and why"),
        }),
        async execute({ path, code, reason }) {
          patchedFiles[path] = { code };
          enqueue(sseEvent("file_patch", { path, code, reason }));
          return `Updated ${path}: ${reason}`;
        },
      });

      // Tool 2: done_improving
      const doneImprovingTool = createTool({
        name: "done_improving",
        description:
          "Call this when you have finished making all improvements.",
        inputSchema: z.object({
          summary: z
            .string()
            .describe(
              "A short friendly summary of all the improvements you made",
            ),
        }),
        lifecycle: { completesRun: true },
        async execute({ summary }) {
          finalSummary = summary;
          return "Done.";
        },
      });

      // Serialize current files for context
      const fileContext = Object.entries(fileData.files)
        .map(([path, { code }]) => `// ${path}\n${code}`)
        .join("\n\n---\n\n");

      const agent = new Agent({
        providerId: "gemini",
        modelId: "gemini-3.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
        maxIterations: 8,
        systemPrompt: `You are an expert React developer improving a live browser preview app... Here are the current files: ${fileContext}`,
        tools: [updateFileTool, doneImprovingTool],
        toolPolicies: {
          update_file: { autoApprove: true },
          done_improving: { autoApprove: true },
        },
      });

      try {
        // Subscribe to agent events
        agent.subscribe((event) => {
          if (event.type === "assistant-text-delta" && event.text) {
            enqueue(sseEvent("thinking", { text: event.text }));
          }
          if (event.type === "tool-started") {
            const name = event.toolCall?.toolName;
            if (name === "update_file") {
              const path =
                (event.toolCall?.input as { path?: string })?.path ?? "a file";
              enqueue(sseEvent("thinking", { text: `Updating \`${path}\`…` }));
            } else if (name === "done_improving") {
              enqueue(
                sseEvent("thinking", { text: "Finalizing improvements…" }),
              );
            }
          }
        });

        enqueue(sseEvent("status", { message: "Cline agent starting…" }));
        const result = await agent.run(userRequest);
        if (result.status === "failed") {
          throw new Error(result.error?.message ?? "Agent run failed");
        }

        // Deduct credit + save to DB
        const newFileData: FileData = {
          files: patchedFiles,
          dependencies: fileData.dependencies,
          title: fileData.title,
        };

        try {
          validateGeneratedFiles(newFileData.files);
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

        await db.$transaction([
          db.workspace.update({
            where: { id: workspaceId, userId },
            data: { fileData: newFileData as never },
          }),
          db.user.update({
            where: { id: userId },
            data: { credits: { decrement: CREDIT_COST_PER_GENERATION } },
          }),
        ]);

        const updatedUser = await db.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });

        // Final done event
        enqueue(
          sseEvent("done", {
            fileData: newFileData,
            summary: String(finalSummary || result.outputText || ""),
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
export const maxDuration = 300;

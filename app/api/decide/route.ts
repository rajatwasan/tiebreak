import Anthropic from "@anthropic-ai/sdk";
import { getClient, hasKey, MODEL } from "@/lib/claude";
import { DEMO_BRIEF } from "@/lib/demo";
import { DECIDE_SYSTEM } from "@/lib/prompts";
import type { DecideRequest } from "@/lib/types";

export const runtime = "nodejs";

function buildPrompt(body: DecideRequest): string {
  const answers = body.answers.length
    ? body.answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n")
    : "- (no clarifying questions were needed)";
  return [
    `Decision: ${body.label}`,
    `Options: ${body.options.join(" | ")}`,
    "",
    "Situation, in their words:",
    body.situation,
    "",
    "Their answers:",
    answers,
  ].join("\n");
}

const encoder = new TextEncoder();

function demoStream(): ReadableStream<Uint8Array> {
  // Emit the canned brief in small chunks at a realistic cadence.
  const words = DEMO_BRIEF.split(/(\s+)/);
  return new ReadableStream({
    async start(controller) {
      await new Promise((r) => setTimeout(r, 450));
      for (let i = 0; i < words.length; i += 3) {
        controller.enqueue(encoder.encode(words.slice(i, i + 3).join("")));
        await new Promise((r) => setTimeout(r, 28));
      }
      controller.close();
    },
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as DecideRequest;
  if (!body?.situation || !Array.isArray(body.options) || !Array.isArray(body.answers)) {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const headers = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  };

  if (!hasKey()) return new Response(demoStream(), { headers: { ...headers, "X-Tiebreak-Demo": "1" } });

  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: DECIDE_SYSTEM,
    messages: [{ role: "user", content: buildPrompt(body) }],
  });

  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_I can't help with this one._"));
        }
        controller.close();
      } catch (error) {
        if (error instanceof Anthropic.APIError) console.error("decide API error", error.status, error.message);
        controller.enqueue(encoder.encode("\n\n_Lost the connection to Claude. Try again._"));
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, { headers });
}

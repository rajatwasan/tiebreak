import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getClient, hasKey, MODEL } from "@/lib/claude";
import { demoClarify } from "@/lib/demo";
import { CLARIFY_SYSTEM } from "@/lib/prompts";
import type { ClarifyResult } from "@/lib/types";

export const runtime = "nodejs";

const ClarifySchema = z.object({
  label: z.string(),
  options: z.array(z.string()),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
    }),
  ),
});

export async function POST(req: Request) {
  const { situation } = (await req.json()) as { situation?: string };
  if (!situation || situation.trim().length < 8) {
    return Response.json({ error: "Describe the decision in a sentence or two." }, { status: 400 });
  }
  if (situation.length > 4000) {
    return Response.json({ error: "Keep it under 4,000 characters." }, { status: 400 });
  }

  if (!hasKey()) {
    // Small delay so demo mode feels like a real round trip.
    await new Promise((r) => setTimeout(r, 600));
    return Response.json(demoClarify());
  }

  try {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 2000,
      // Questions must come back fast; this call gates the whole flow.
      output_config: { effort: "low", format: zodOutputFormat(ClarifySchema) },
      system: CLARIFY_SYSTEM,
      messages: [{ role: "user", content: situation }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Couldn't work with that one. Try rephrasing the decision." }, { status: 422 });
    }

    const parsed = response.parsed_output;
    const result: ClarifyResult = {
      demo: false,
      label: parsed.label,
      options: parsed.options.slice(0, 4),
      questions: parsed.questions.slice(0, 3).map((q, i) => ({
        id: `q${i + 1}`,
        question: q.question,
        options: q.options.slice(0, 4),
      })),
    };
    return Response.json(result);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Busy right now. Try again in a minute." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("clarify API error", error.status, error.message);
      return Response.json({ error: "Claude is unavailable. Try again." }, { status: 502 });
    }
    throw error;
  }
}

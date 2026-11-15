import type { ClarifyResult } from "./types";

// Demo mode: used when no API key is configured, so the UX can be
// clicked through (and screenshotted) without spending tokens.

export function demoClarify(): ClarifyResult {
  return {
    demo: true,
    label: "Take the new job vs stay",
    options: ["Take the new job", "Stay"],
    questions: [
      {
        id: "q1",
        question: "What's pulling you toward the new job most?",
        options: ["More money", "Better work", "Escaping my manager", "Growth"],
      },
      {
        id: "q2",
        question: "How solid is the new offer?",
        options: ["Signed offer", "Verbal only", "Still interviewing"],
      },
      {
        id: "q3",
        question: "Could you get what you want by staying?",
        options: ["Already asked, no", "Haven't asked", "Maybe"],
      },
    ],
  };
}

export const DEMO_BRIEF = `## My call
Take the new job. The deciding factor is that you already asked for this at your current company and got a no.

## Why
- You want better work, and your current team has said it can't offer it.
- The offer is signed, so you're trading a known ceiling for a written commitment.
- Growth compounds: a year in the right role is worth more than a small raise in the wrong one.

## What would flip it
- If the offer were still verbal, I'd wait until it's in writing.
- If your manager came back with a concrete new scope, staying would be worth one more conversation.

## Do this today
Write down the three things you'd need to hear to stay. If your manager can't say yes to two of them by Friday, accept.`;

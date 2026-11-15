# The bet: Claude should ask before it answers

*One page. Rajat Kumar (Rajat Wasan).*

## The gap

Claude is good at the hard part of a decision: weighing tradeoffs, seeing what you left out, and committing to a call. But open claude.ai and type "should I take the new job or stay?" and you'll usually get a balanced essay: considerations for each side, a list of questions to ask yourself, and "ultimately it depends on your priorities." The model could ask the two questions that settle it. Chat as a format pushes it to answer right away, so it hedges.

People don't come to a decision for a survey of factors. They come to get unstuck. The thing they remember is whether they got a straight answer they trusted.

## The bet

For decision-shaped prompts, a **clarify-first flow** (at most three one-tap questions, then a short brief that commits: *my call, why, what would flip it, do this today*) will get more people to act on the answer than a one-shot chat reply, and will bring them back for the next decision.

Tiebreak is the leanest version of that: one input, one structured clarify call (questions come back as JSON so they render as tappable chips, not prose), and one streamed brief with a fixed four-section shape. No accounts, no history, no chat. That's about 400 lines of Next.js and TypeScript on the public Claude API.

## Why now

- **The models now commit well when given the facts.** Current Claude models follow a strict output contract reliably and give a firm recommendation once the ambiguity is removed. The hedging is a product problem now, not a model limit.
- **Structured outputs make the UI cheap.** Asking for questions as schema-validated JSON turns "Claude asks a clarifying question" from a chat turn into a one-tap UI element. A year ago that took brittle parsing.
- **Latency is low enough to add a round trip.** The clarify call runs at low effort and the brief streams, so the extra step costs a couple of seconds, not a page reload's worth of patience. The app shows "questions in Xs / first word in Ys" so this is measured, not assumed.
- **Consumers already bring decisions to Claude.** Career, money, and relationship decisions are some of the most common personal uses of chat assistants. The flow is the missing piece, not the demand.

## How I'd test it (cheapest first)

1. **Fake-door in the product, about a week.** Detect decision-shaped prompts with a cheap classifier. For 5% of them, show an inline "Want a straight call? Answer 3 quick questions" chip above the normal reply. *Metric:* chip tap rate. *Bar:* ≥15% of eligible prompts. Below 5%, kill it.
2. **A/B of the brief vs the chat reply, about two weeks.** Among people who tap, randomize to the Tiebreak flow or the normal reply. *Primary:* share of sessions with a "this helped me decide" thumbs-up, plus whether they copy or share the brief. *Guardrails:* drop-off between questions and brief (should stay under 20%), and time to a useful answer (median under 10s end to end).
3. **Return signal, 30 days.** Do people in the Tiebreak arm bring a *second* decision within 30 days more often than control? That's the real bet: once trusted, it becomes the place you go when you're stuck.

**What would kill it:** people skip the questions more than half the time (they wanted an instant answer), or thumbs-up doesn't move against a well-prompted one-shot reply (then this is just a better prompt, not a product).

**What I'd refuse to build first:** saved decision history, follow-up reminders, multi-person decisions, pros-and-cons tables. All of them are plausible, and none of them tests the core claim.

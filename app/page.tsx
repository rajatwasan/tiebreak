"use client";

import { useRef, useState } from "react";
import { Brief } from "@/lib/markdown";
import type { Answer, ClarifyResult } from "@/lib/types";

type Phase = "ask" | "clarifying" | "questions" | "deciding" | "done";

const EXAMPLES = [
  "I got an offer from a startup that pays 15% more, but I like my team. Should I switch?",
  "Should I fix my 9-year-old car for $2,400 or put that toward a new one?",
  "Do I go to my friend's wedding in Lisbon or save the money for a move in spring?",
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("ask");
  const [situation, setSituation] = useState("");
  const [clarify, setClarify] = useState<ClarifyResult | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timing, setTiming] = useState<{ questionsMs?: number; firstTokenMs?: number; totalMs?: number }>({});
  const [demo, setDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function askQuestions() {
    setError(null);
    setPhase("clarifying");
    const t0 = performance.now();
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      const result = data as ClarifyResult;
      setTiming({ questionsMs: Math.round(performance.now() - t0) });
      setDemo(result.demo);
      setClarify(result);
      setPicks({});
      if (result.questions.length === 0) {
        await decide(result, {});
      } else {
        setPhase("questions");
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("ask");
    }
  }

  async function decide(c: ClarifyResult, chosen: Record<string, string>) {
    setPhase("deciding");
    setBrief("");
    setError(null);
    const answers: Answer[] = c.questions
      .filter((q) => chosen[q.id])
      .map((q) => ({ question: q.question, answer: chosen[q.id] }));

    const ac = new AbortController();
    abortRef.current = ac;
    const t0 = performance.now();
    let first = true;
    try {
      const res = await fetch("/api/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, label: c.label, options: c.options, answers }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("Couldn't reach Claude. Try again.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (first) {
          first = false;
          setTiming((t) => ({ ...t, firstTokenMs: Math.round(performance.now() - t0) }));
        }
        setBrief((b) => b + decoder.decode(value, { stream: true }));
      }
      setTiming((t) => ({ ...t, totalMs: Math.round(performance.now() - t0) }));
      setPhase("done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
      setPhase("done");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setPhase("ask");
    setClarify(null);
    setBrief("");
    setPicks({});
    setTiming({});
    setError(null);
  }

  const answeredAll = clarify ? clarify.questions.every((q) => picks[q.id]) : false;

  return (
    <main>
      <div className="brand">
        <h1>Tiebreak</h1>
        <span>Claude asks before it answers</span>
      </div>

      {demo && (
        <div className="banner" role="status">
          Demo mode: no API key set, so you'll see sample questions and a sample brief. Add ANTHROPIC_API_KEY to use Claude.
        </div>
      )}

      {(phase === "ask" || phase === "clarifying") && (
        <section aria-labelledby="ask-h">
          <p id="ask-h" className="lede">What are you stuck deciding?</p>
          <p className="sub">Say it the way you'd text a friend. You'll get up to three quick questions, then a straight call.</p>
          <label htmlFor="situation" className="label" style={{ position: "absolute", left: -9999 }}>
            Your decision
          </label>
          <textarea
            id="situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Should I take the new job or stay where I am?"
            disabled={phase === "clarifying"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && situation.trim().length >= 8) askQuestions();
            }}
          />
          <div className="row">
            <button className="btn" onClick={askQuestions} disabled={situation.trim().length < 8 || phase === "clarifying"}>
              {phase === "clarifying" ? "Reading it…" : "Help me decide"}
            </button>
          </div>
          {phase === "ask" && (
            <div className="examples" aria-label="Examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setSituation(ex)}>
                  {ex.length > 52 ? ex.slice(0, 50) + "…" : ex}
                </button>
              ))}
            </div>
          )}
          {phase === "clarifying" && (
            <div className="card" aria-hidden>
              <div className="skeleton" style={{ width: "40%" }} />
              <div className="skeleton" style={{ width: "75%" }} />
              <div className="skeleton" style={{ width: "60%" }} />
            </div>
          )}
        </section>
      )}

      {clarify && phase === "questions" && (
        <section className="card" aria-labelledby="dec-h">
          <p className="label">Deciding</p>
          <p id="dec-h" className="decision">{clarify.label}</p>
          {clarify.questions.map((q) => (
            <div className="q" key={q.id} role="group" aria-label={q.question}>
              <p>{q.question}</p>
              <div className="chips">
                {q.options.map((o) => (
                  <button
                    key={o}
                    className="chip"
                    aria-pressed={picks[q.id] === o}
                    onClick={() => setPicks((p) => ({ ...p, [q.id]: o }))}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 22 }}>
            <button className="btn" disabled={!answeredAll} onClick={() => decide(clarify, picks)}>
              Give me the call
            </button>
            <button className="btn ghost" onClick={() => decide(clarify, picks)}>
              Skip, just answer
            </button>
          </div>
        </section>
      )}

      {clarify && (phase === "deciding" || phase === "done") && (
        <section className="card" aria-live="polite" aria-busy={phase === "deciding"}>
          <p className="label">{clarify.label}</p>
          <div className="brief">
            {brief ? <Brief text={brief} /> : <div className="skeleton" style={{ width: "70%" }} />}
            {phase === "deciding" && brief && <span className="caret" aria-hidden />}
          </div>
          <div className="meta">
            {timing.questionsMs !== undefined && <span>questions in {(timing.questionsMs / 1000).toFixed(1)}s</span>}
            {timing.firstTokenMs !== undefined && <span>first word in {(timing.firstTokenMs / 1000).toFixed(1)}s</span>}
            {timing.totalMs !== undefined && <span>done in {(timing.totalMs / 1000).toFixed(1)}s</span>}
          </div>
          {phase === "done" && (
            <div className="row">
              <button className="btn ghost" onClick={reset}>New decision</button>
            </div>
          )}
        </section>
      )}

      {error && <p className="err" role="alert">{error}</p>}
    </main>
  );
}

import { Fragment, type ReactNode } from "react";

// Minimal renderer for the four-section brief: headings, bullets, paragraphs,
// **bold** and _italic_. Deliberately tiny: the brief has a fixed shape, so a
// full markdown library would be dead weight in the client bundle.

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return <em key={`${key}-${i}`}>{p.slice(1, -1)}</em>;
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}

export function Brief({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (k: string) => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${k}`}>
          {bullets.map((b, i) => (
            <li key={i}>{inline(b, `li-${k}-${i}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush(String(i));
      out.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (/^[-*] /.test(line)) {
      bullets.push(line.slice(2));
    } else if (line.trim() === "") {
      flush(String(i));
    } else {
      flush(String(i));
      out.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
    }
  });
  flush("end");
  return <>{out}</>;
}

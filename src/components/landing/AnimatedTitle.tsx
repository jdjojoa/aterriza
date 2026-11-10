import type { CSSProperties } from "react";

/**
 * Heading whose letters appear one by one (see .letter in landing.css).
 * Screen readers get the plain text; the per-letter spans are hidden from them.
 * Words stay unbroken so the line only wraps between words.
 */
export function AnimatedTitle({ text, className = "" }: { text: string; className?: string }) {
  let index = 0;
  return (
    <h1 className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, w) => (
          <span key={w} className="inline-block whitespace-nowrap">
            {[...word].map((char) => (
              <span
                key={index}
                className="letter"
                style={{ "--i": index++ } as CSSProperties}
              >
                {char}
              </span>
            ))}
            {w < text.split(" ").length - 1 && " "}
          </span>
        ))}
      </span>
    </h1>
  );
}

"use client";

import { useId } from "react";

const STAR_PATH =
  "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className={filled ? "fill-heading stroke-heading" : "fill-none stroke-border"}
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

/** Read-only stars. `value` may be fractional (rounded to the nearest star). */
export function StarDisplay({ value, size = 18, label }: { value: number; size?: number; label: string }) {
  const rounded = Math.round(value);
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rounded} size={size} />
      ))}
    </span>
  );
}

/** 1–5 star picker built on native radios (keyboard: arrow keys). */
export function StarInput({
  value,
  onChange,
  legend,
}: {
  value: number;
  onChange: (value: number) => void;
  legend: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-bold text-heading">{legend}</legend>
      <div className="-ml-1.5 flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-hover has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-ring"
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Star filled={n <= value} size={30} />
            <span className="sr-only">{n === 1 ? "1 estrella" : `${n} estrellas`}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import type { ButtonHTMLAttributes } from "react";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean };

/** Toggle button used for filters and view switches. */
export function Chip({ selected, className = "", type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-border/40 bg-surface text-heading hover:bg-hover"
      } ${className}`.trim()}
      {...props}
    />
  );
}

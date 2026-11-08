import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border/30 bg-surface p-4 text-foreground shadow-sm ${className}`.trim()}
      {...props}
    />
  );
}

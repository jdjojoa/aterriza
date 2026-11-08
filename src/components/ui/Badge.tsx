import type { HTMLAttributes } from "react";

export type BadgeVariant = "success" | "warning";

const variants: Record<BadgeVariant, string> = {
  success: "bg-accent-soft text-on-accent-soft",
  warning: "bg-warning-soft text-on-warning-soft",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export function Badge({ variant = "success", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant]} ${className}`.trim()}
      {...props}
    />
  );
}

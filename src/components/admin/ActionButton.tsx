"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/admin/actions";
import { Button, type ButtonVariant } from "@/components/ui/Button";

const initial: ActionResult = { status: "idle", message: null };

type ActionButtonProps = {
  /** A bound Server Action, e.g. moderateTip.bind(null, id, "approved"). */
  action: (prev: ActionResult) => Promise<ActionResult>;
  label: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  /** Asks before running (destructive actions). */
  confirmMessage?: string;
  className?: string;
};

/** One-click admin action with pending state and an inline result message. */
export function ActionButton({
  action,
  label,
  pendingLabel = "Procesando…",
  variant = "secondary",
  confirmMessage,
  className = "",
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={`flex flex-col gap-1 ${className}`.trim()}
    >
      <Button type="submit" variant={variant} disabled={pending} className="w-full">
        {pending ? pendingLabel : label}
      </Button>
      <p
        role={state.status === "error" ? "alert" : "status"}
        className={`text-sm font-bold empty:hidden ${state.status === "error" ? "text-on-warning-soft" : "text-heading"}`}
      >
        {state.message ?? ""}
      </p>
    </form>
  );
}

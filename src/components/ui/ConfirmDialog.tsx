"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  /** Click handler for the confirm button. Omit when `confirmAction` submits a form. */
  onConfirm?: () => void;
  /** Server Action run by the confirm button (form submit). */
  confirmAction?: (formData: FormData) => void | Promise<void>;
  /** Runs right before `confirmAction` submits. */
  onConfirmSubmit?: () => void;
};

/**
 * Centered confirmation modal on <dialog>: focus is trapped inside, Escape
 * and a backdrop click cancel, and "Cancelar" gets the initial focus so an
 * accidental Enter never confirms a destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  pending = false,
  onCancel,
  onConfirm,
  confirmAction,
  onConfirmSubmit,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const buttons = (
    <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-end">
      <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={pending}>
        {cancelLabel}
      </Button>
      <Button type={confirmAction ? "submit" : "button"} onClick={onConfirm} disabled={pending}>
        {pending && pendingLabel ? pendingLabel : confirmLabel}
      </Button>
    </div>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape fires "cancel": keep the dialog in sync with React state.
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-border/30 bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id={titleId} className="text-xl font-extrabold text-heading">
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className="text-muted">
            {description}
          </div>
        )}
        {confirmAction ? (
          <form action={confirmAction} onSubmit={onConfirmSubmit}>
            {buttons}
          </form>
        ) : (
          buttons
        )}
      </div>
    </dialog>
  );
}

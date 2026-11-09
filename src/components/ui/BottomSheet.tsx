"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Modal sheet anchored to the bottom of the screen. Built on <dialog>, so it
 * gets focus trapping, Escape to close and the top layer (above Leaflet) for free.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop targets the <dialog> itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-b-0 border-border/30 bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 px-4 pt-2 pb-6">
        <span
          aria-hidden="true"
          className="mx-auto h-1.5 w-12 rounded-full bg-border/50"
        />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-extrabold text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-heading hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

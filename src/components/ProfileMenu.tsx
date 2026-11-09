"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/icons/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";

type ProfileMenuProps = {
  name: string | null;
  avatarUrl: string | null;
};

const itemClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left font-bold text-heading hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ProfileMenu({ name, avatarUrl }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menú de perfil"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar name={name} url={avatarUrl} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-30 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl border border-border/30 bg-surface p-2 shadow-lg"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar name={name} url={avatarUrl} size={40} />
            <p className="min-w-0 truncate font-bold text-heading">
              {name || "Tu cuenta"}
            </p>
          </div>
          <Link
            href="/perfil"
            className={itemClasses}
            onClick={() => setOpen(false)}
          >
            <Icon name="user" size={20} />
            Mi perfil
          </Link>
          <div className="flex items-center justify-between gap-2 px-3 py-1">
            <span className="text-sm font-bold text-muted">Tema</span>
            <ThemeToggle />
          </div>
          <form
            action={signOut}
            // Drop pages cached by public/sw.js so the next person on this device can't see them.
            onSubmit={() => {
              if ("caches" in window) void caches.delete("aterriza-pages");
            }}
          >
            <button type="submit" className={itemClasses}>
              <Icon name="logout" size={20} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

"use client";

import { useId, useState, useTransition } from "react";
import { setUserRole } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ROLE_LABELS, USER_ROLES } from "@/lib/roles";
import type { UserRole } from "@/types/database";

type RoleSelectProps = {
  userId: string;
  userName: string;
  role: UserRole;
  /** The signed-in admin's own row: shown but locked. */
  isSelf: boolean;
};

/** Role selector for /admin/usuarios. Every change asks for confirmation. */
export function RoleSelect({ userId, userName, role, isSelf }: RoleSelectProps) {
  const selectId = useId();
  const hintId = useId();
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!pendingRole) return;
    const next = pendingRole;
    startTransition(async () => {
      const res = await setUserRole(userId, next);
      setResult({ ok: res.status === "done", message: res.message ?? "" });
      setPendingRole(null);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-bold text-heading">
        Rol
      </label>
      <select
        id={selectId}
        value={role}
        disabled={isSelf || pending}
        aria-describedby={isSelf ? hintId : undefined}
        onChange={(e) => {
          setResult(null);
          setPendingRole(e.target.value as UserRole);
        }}
        className="min-h-11 rounded-xl border border-border bg-surface px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-70"
      >
        {USER_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {isSelf && (
        <p id={hintId} className="text-sm text-muted">
          Es tu cuenta: no puedes cambiar tu propio rol.
        </p>
      )}
      <p
        role={result && !result.ok ? "alert" : "status"}
        className={`text-sm font-bold empty:hidden ${result && !result.ok ? "text-on-warning-soft" : "text-heading"}`}
      >
        {result?.message ?? ""}
      </p>
      <ConfirmDialog
        open={pendingRole !== null}
        title="¿Cambiar el rol?"
        description={
          pendingRole && (
            <p>
              <strong className="text-heading">{userName}</strong> pasará de{" "}
              <strong className="text-heading">{ROLE_LABELS[role]}</strong> a{" "}
              <strong className="text-heading">{ROLE_LABELS[pendingRole]}</strong>.
              {pendingRole === "admin"
                ? " Podrá editar contenido, moderar aportes y cambiar roles."
                : " Perderá el acceso al panel de administración."}
            </p>
          )
        }
        confirmLabel="Cambiar rol"
        pendingLabel="Cambiando…"
        pending={pending}
        onCancel={() => setPendingRole(null)}
        onConfirm={confirm}
      />
    </div>
  );
}

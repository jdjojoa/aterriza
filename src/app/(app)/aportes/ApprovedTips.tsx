"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { TIP_CATEGORIES, formatShortDate, tipCategoryLabel } from "@/lib/community";
import type { ApprovedTipRow } from "@/types/database";

/** Approved tips from everyone, filterable by category. */
export function ApprovedTips({ tips }: { tips: ApprovedTipRow[] }) {
  const [category, setCategory] = useState<string | "all">("all");

  // Only offer chips for categories that have tips.
  const categories = useMemo(
    () => TIP_CATEGORIES.filter((c) => tips.some((t) => t.category === c.value)),
    [tips],
  );
  const visible = category === "all" ? tips : tips.filter((t) => t.category === category);

  return (
    <div className="flex flex-col gap-3">
      {categories.length > 1 && (
        <div role="group" aria-label="Filtrar por categoría" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip selected={category === "all"} onClick={() => setCategory("all")}>
            Todos
          </Chip>
          {categories.map((c) => (
            <Chip key={c.value} selected={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </Chip>
          ))}
        </div>
      )}
      <p aria-live="polite" className="text-sm text-muted">
        {visible.length === 1 ? "1 aporte" : `${visible.length} aportes`}
      </p>
      <ul className="flex flex-col gap-3">
        {visible.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm">
            <Badge className="self-start">{tipCategoryLabel(t.category)}</Badge>
            <p className="whitespace-pre-line break-words text-foreground">{t.body}</p>
            <p className="text-sm text-muted">
              Aporte de <span className="font-bold text-heading">{t.author_name}</span> ·{" "}
              <time dateTime={t.created_at}>{formatShortDate(t.created_at)}</time> · Revisado el{" "}
              <time dateTime={t.updated_at}>{formatShortDate(t.updated_at)}</time>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

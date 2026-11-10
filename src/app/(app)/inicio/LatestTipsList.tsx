"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ReportDialog, type ReportTarget } from "@/components/reviews/ReportDialog";
import { Button } from "@/components/ui/Button";
import { formatShortDate, tipCategoryLabel } from "@/lib/community";
import type { ApprovedTipRow } from "@/types/database";

/** Compact list of the latest tips on /inicio, each with "Reportar" (same flow as /aportes). */
export function LatestTipsList({ tips }: { tips: ApprovedTipRow[] }) {
  const [reported, setReported] = useState<Set<string>>(
    () => new Set(tips.filter((t) => t.reported_by_me).map((t) => t.id)),
  );
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  return (
    <>
      <ul className="flex flex-col divide-y divide-border/20">
        {tips.map((t) => (
          <li key={t.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <p className="line-clamp-3 break-words text-sm text-foreground">{t.body}</p>
            <p className="text-xs text-muted">
              <span className="font-bold text-heading">{t.author_name}</span> · {tipCategoryLabel(t.category)} ·{" "}
              <time dateTime={t.created_at}>{formatShortDate(t.created_at)}</time>
            </p>
            {!t.is_own &&
              (reported.has(t.id) ? (
                <span className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted">
                  <Icon name="flag" size={14} />
                  Ya lo reportaste
                </span>
              ) : (
                <Button
                  variant="ghost"
                  className="-ml-2 self-start text-xs"
                  onClick={() => setReporting({ kind: "tip", id: t.id, authorName: t.author_name })}
                >
                  <Icon name="flag" size={14} />
                  Reportar
                  <span className="sr-only"> el aporte de {t.author_name}</span>
                </Button>
              ))}
          </li>
        ))}
      </ul>

      <ReportDialog
        target={reporting}
        onClose={() => setReporting(null)}
        onReported={(id) => setReported((prev) => new Set(prev).add(id))}
      />
    </>
  );
}

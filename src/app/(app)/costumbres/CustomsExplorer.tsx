"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { Icon } from "@/components/icons/Icon";
import { CUSTOM_CATEGORIES, customCategory, type CustomItem } from "@/lib/customs";

const ORDER = CUSTOM_CATEGORIES.map((c) => c.value);
const rank = (category: string | null) => {
  const i = ORDER.indexOf(category ?? "");
  return i === -1 ? ORDER.length : i;
};

export function CustomsExplorer({ customs }: { customs: CustomItem[] }) {
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => CUSTOM_CATEGORIES.filter((c) => customs.some((x) => x.category === c.value)),
    [customs],
  );

  // Grouped by category, in CUSTOM_CATEGORIES order.
  const groups = useMemo(() => {
    const visible = customs
      .filter((c) => category === "all" || c.category === category)
      .sort((a, b) => rank(a.category) - rank(b.category));
    const out: { key: string; items: CustomItem[] }[] = [];
    for (const c of visible) {
      const key = c.category ?? "general";
      const last = out.at(-1);
      if (last?.key === key) last.items.push(c);
      else out.push({ key, items: [c] });
    }
    return out;
  }, [customs, category]);

  return (
    <>
      <div
        role="group"
        aria-label="Filtrar por categoría"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <Chip selected={category === "all"} onClick={() => setCategory("all")}>
          Todas
        </Chip>
        {categories.map((c) => (
          <Chip key={c.value} selected={category === c.value} onClick={() => setCategory(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group) => {
          const meta = customCategory(group.items[0].category);
          return (
            <section key={group.key} aria-labelledby={`custom-${group.key}`} className="flex flex-col gap-3">
              <h2
                id={`custom-${group.key}`}
                className="flex items-center gap-2 text-xl font-bold text-heading"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
                  <Icon name={meta.icon} size={20} />
                </span>
                {meta.label}
              </h2>
              <ul className="flex flex-col gap-3">
                {group.items.map((c) => (
                  <li key={c.id}>
                    <Card className="flex flex-col gap-3">
                      <h3 className="text-lg font-bold text-heading">{c.title}</h3>
                      <p className="text-foreground">{c.body}</p>
                      <SourceBadge
                        sourceName={c.source_name}
                        sourceUrl={c.source_url}
                        verifiedAt={c.verified_at}
                      />
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

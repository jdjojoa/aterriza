"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { SLANG_CATEGORIES, slangCategoryLabel, type SlangItem } from "@/lib/slang";
import { foldText } from "@/lib/text";

type Indexed = SlangItem & { termKey: string; textKey: string };

export function SlangExplorer({ terms }: { terms: SlangItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  // Accent-free copies, built once: same folding as unaccent(lower(x)).
  const indexed = useMemo<Indexed[]>(
    () =>
      terms.map((t) => ({
        ...t,
        termKey: foldText(t.term),
        textKey: foldText([t.meaning, t.equivalent_co, t.example].filter(Boolean).join(" ")),
      })),
    [terms],
  );

  const categories = useMemo(
    () => SLANG_CATEGORIES.filter((c) => terms.some((t) => t.category === c.value)),
    [terms],
  );

  const visible = useMemo(() => {
    const q = foldText(deferredQuery).replace(/[¡!¿?]/g, "");
    const inCategory =
      category === "all" ? indexed : indexed.filter((t) => t.category === category);
    if (!q) return inCategory;
    // Matches in the term first, then matches in meaning / equivalent / example.
    const byTerm = inCategory.filter((t) => t.termKey.includes(q));
    const byText = inCategory.filter((t) => !t.termKey.includes(q) && t.textKey.includes(q));
    return [...byTerm, ...byText];
  }, [indexed, category, deferredQuery]);

  return (
    <>
      <div role="search">
        <Input
          type="search"
          label="Buscar una palabra"
          placeholder="Ej.: chevere, jato, al toque"
          hint="No importan las tildes ni las mayúsculas."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
        />
      </div>

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

      <p className="text-sm text-muted" aria-live="polite">
        {visible.length === 1 ? "1 palabra" : `${visible.length} palabras`}
      </p>

      {visible.length === 0 ? (
        <Card className="flex flex-col gap-2 text-center">
          <p className="font-bold text-heading">No encontramos esa palabra</p>
          <p className="text-muted">
            Prueba con otra forma de escribirla o pregúntale al chat.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((t) => (
            <li key={t.id}>
              <SlangCard term={t} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SlangCard({ term }: { term: SlangItem }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-extrabold text-heading">{term.term}</h2>
        <Badge>{slangCategoryLabel(term.category)}</Badge>
      </div>
      <dl className="flex flex-col gap-2">
        <div>
          <dt className="text-sm font-bold text-heading">Significado</dt>
          <dd className="text-foreground">{term.meaning}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-heading">En Colombia</dt>
          <dd className="text-foreground">{term.equivalent_co || "Por verificar"}</dd>
        </div>
        {term.example && (
          <div>
            <dt className="text-sm font-bold text-heading">Ejemplo</dt>
            <dd className="italic text-foreground">“{term.example}”</dd>
          </div>
        )}
      </dl>
      <SourceBadge
        sourceName={term.source_name}
        sourceUrl={term.source_url}
        verifiedAt={term.verified_at}
      />
    </Card>
  );
}

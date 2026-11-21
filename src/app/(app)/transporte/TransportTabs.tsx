"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

type Tab = { id: string; label: string; content: ReactNode };

/** Accessible tabs (arrow keys move between them). Panels are rendered on the server. */
export function TransportTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const baseId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setActive(tabs[next].id);
    document.getElementById(`${baseId}-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Transporte" className="grid grid-cols-2 gap-1 rounded-2xl bg-accent-soft p-1">
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-11 rounded-xl px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected ? "bg-surface text-heading shadow-sm" : "text-on-accent-soft hover:bg-hover"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="flex-col gap-4 [&:not([hidden])]:flex"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

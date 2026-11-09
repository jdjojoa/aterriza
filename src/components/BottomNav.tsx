"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { SECTIONS } from "@/lib/sections";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border/30 bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {SECTIONS.map((section) => {
          const active =
            pathname === section.href ||
            pathname.startsWith(`${section.href}/`);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${
                  active ? "text-heading" : "text-muted hover:text-heading"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-12 items-center justify-center rounded-full ${
                    active ? "bg-primary text-on-primary" : ""
                  }`}
                >
                  <Icon name={section.icon} />
                </span>
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

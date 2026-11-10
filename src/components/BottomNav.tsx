"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { SECTIONS } from "@/lib/sections";

const NAV_SECTIONS = SECTIONS.filter((section) => section.inNav !== false);

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Mobile and tablet: fixed bar at the bottom. Hidden from 1024 px (see TopNav). */
export function BottomNav() {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border/30 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_SECTIONS.map((section) => {
          const active = isActive(section.href);
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

/** Desktop (1024 px and up): the same sections, inline in the header. */
export function TopNav() {
  const isActive = useIsActive();

  return (
    <nav aria-label="Secciones" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {NAV_SECTIONS.map((section) => {
          const active = isActive(section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  active ? "bg-primary text-on-primary" : "text-muted hover:bg-hover hover:text-heading"
                }`}
              >
                <Icon name={section.icon} size={18} />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

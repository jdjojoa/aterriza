"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTENT_CONFIG, CONTENT_TABLES } from "@/lib/admin/content-config";

const ITEMS = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/aportes", label: "Aportes" },
  ...CONTENT_TABLES.map((t) => ({ href: `/admin/contenido/${t}`, label: CONTENT_CONFIG[t].label })),
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de administración" className="-mx-4 overflow-x-auto px-4 pb-1">
      <ul className="flex gap-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  active
                    ? "border-primary-edge bg-primary text-on-primary"
                    : "border-border/40 bg-surface text-heading hover:bg-hover"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

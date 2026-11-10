import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Static chrome only: each page checks the admin role inside its own Suspense boundary. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl font-extrabold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Logo size={32} title="" />
              Aterriza · Admin
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/inicio"
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-heading hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Ir a la app
              </Link>
              <ThemeToggle />
            </div>
          </div>
          {/* usePathname can be request data on dynamic routes. */}
          <Suspense fallback={<div aria-hidden="true" className="h-12" />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16 pt-6">
        {children}
      </main>
    </>
  );
}

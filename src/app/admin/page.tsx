import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Administración · Aterriza" };

/** Server-side role check; the proxy redirect alone is not authorization. */
async function AdminPanel() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/inicio");

  return (
    <Card className="flex flex-col items-start gap-3">
      <Badge variant="warning">Próximamente</Badge>
      <p className="text-muted">
        Aquí podrás publicar y verificar contenido y moderar reseñas.
      </p>
    </Card>
  );
}

export default function AdminPage() {
  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4">
        <Logo size={40} />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">
          Administración
        </h1>
        <Suspense fallback={<div aria-hidden="true" className="h-28 rounded-2xl bg-accent-soft" />}>
          <AdminPanel />
        </Suspense>
        <Link href="/inicio" className={buttonClasses("secondary", "md", "self-start")}>
          Ir al inicio
        </Link>
      </main>
    </>
  );
}

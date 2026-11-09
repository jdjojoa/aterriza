import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/icons/Icon";
import { InstallAppButton } from "@/components/InstallAppButton";
import { firstName, getCurrentProfile } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { SECTIONS } from "@/lib/sections";

export const metadata: Metadata = { title: "Inicio · Aterriza" };

async function Greeting() {
  const profile = await getCurrentProfile();
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">
        ¡Hola, {firstName(profile.full_name)}!
      </h1>
      <p className="text-lg font-bold text-muted">
        {countryName(profile.origin_country)} → {profile.destination_city}
      </p>
    </>
  );
}

function GreetingFallback() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <span className="h-9 w-48 rounded-xl bg-accent-soft" />
      <span className="h-6 w-36 rounded-xl bg-accent-soft" />
    </div>
  );
}

export default function HomePage() {
  const sections = SECTIONS.filter((section) => section.href !== "/inicio");

  return (
    <main className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <Suspense fallback={<GreetingFallback />}>
          <Greeting />
        </Suspense>
      </section>

      <section aria-labelledby="sections-title" className="flex flex-col gap-3">
        <h2 id="sections-title" className="text-xl font-bold text-heading">
          ¿Qué necesitas hoy?
        </h2>
        <ul className="flex flex-col gap-3">
          {sections.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="flex items-center gap-3 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
                  <Icon name={section.icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-heading">{section.label}</span>
                    {!section.available && <Badge variant="warning">Próximamente</Badge>}
                  </span>
                  <span className="text-sm text-muted">{section.description}</span>
                </span>
                <span className="text-muted">
                  <Icon name="chevron-right" size={20} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <InstallAppButton />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getCurrentProfile } from "@/lib/auth";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";
import { countryName, originCountryOptions } from "@/lib/countries";
import { originLabel, profileOrigin } from "@/lib/origin";
import { getPeruLocations } from "@/lib/peru-locations";
import { ROLE_LABELS } from "@/lib/roles";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Mi perfil · Aterriza" };

const legalLinkClass =
  "inline-flex min-h-11 items-center rounded font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

async function ProfileSection() {
  const [profile, departments] = await Promise.all([getCurrentProfile(), getPeruLocations()]);
  const origin = profileOrigin(profile);
  return (
    <>
      <Card className="flex items-center gap-3">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={56} on="surface" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-heading">
            {profile.full_name || "Tu cuenta"}
          </p>
          <Badge
            variant={profile.role === "admin" ? "primary" : "neutral"}
            className="mt-0.5"
            aria-label={`Rol: ${ROLE_LABELS[profile.role]}`}
          >
            {ROLE_LABELS[profile.role]}
          </Badge>
          <p className="mt-1 text-sm text-muted">
            {originLabel(origin)} → {profile.destination_city}, {countryName(profile.destination_country)}
          </p>
        </div>
      </Card>
      <ProfileForm
        fullName={profile.full_name}
        countries={originCountryOptions()}
        departments={departments}
        initialOrigin={
          origin.type === "nacional"
            ? { type: "nacional", country: null, department: origin.department, city: origin.city }
            : { type: "internacional", country: origin.country, department: null, city: null }
        }
      />
    </>
  );
}

export default function ProfilePage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">Mi perfil</h1>
      <Suspense
        fallback={<div aria-hidden="true" className="h-20 rounded-2xl bg-accent-soft" />}
      >
        <ProfileSection />
      </Suspense>
      <nav aria-label="Documentos legales" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={TERMS_PATH} className={legalLinkClass}>
          Términos de uso
        </Link>
        <Link href={PRIVACY_PATH} className={legalLinkClass}>
          Política de privacidad
        </Link>
      </nav>
    </main>
  );
}

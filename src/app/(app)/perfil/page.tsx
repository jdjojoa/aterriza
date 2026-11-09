import type { Metadata } from "next";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/ui/Card";
import { getCurrentProfile } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Mi perfil · Aterriza" };

async function ProfileSection() {
  const profile = await getCurrentProfile();
  return (
    <>
      <Card className="flex items-center gap-3">
        <Avatar name={profile.full_name} url={profile.avatar_url} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-heading">
            {profile.full_name || "Tu cuenta"}
          </p>
          <p className="text-sm text-muted">
            Destino: {countryName(profile.destination_country)} → {profile.destination_city}
          </p>
        </div>
      </Card>
      <ProfileForm
        fullName={profile.full_name}
        originCountry={profile.origin_country}
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
    </main>
  );
}

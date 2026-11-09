import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { ProfileMenu } from "@/components/ProfileMenu";
import { getCurrentProfile } from "@/lib/auth";

async function CurrentProfileMenu() {
  const profile = await getCurrentProfile();
  return <ProfileMenu name={profile.full_name} avatarUrl={profile.avatar_url} />;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/30 bg-background">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-2">
          <Link
            href="/inicio"
            className="flex items-center gap-2 rounded-xl font-extrabold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Logo size={32} title="" />
            Aterriza
          </Link>
          <Suspense
            fallback={
              <span
                aria-hidden="true"
                className="size-11 rounded-full bg-accent-soft"
              />
            }
          >
            <CurrentProfileMenu />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-24 pt-6">
        {children}
      </div>
      <BottomNav />
    </>
  );
}

import { Logo } from "@/components/Logo";

/**
 * Loading state for route segments (loading.tsx): the airplane circles the
 * globe's orbit (.logo-loader in globals.css). With prefers-reduced-motion the
 * logo stays still and the text says what is happening.
 */
export function LogoLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
      <Logo variant="mark" size={88} title="" className="logo-loader overflow-visible" />
      <p className="text-sm font-bold text-muted">{label}</p>
    </div>
  );
}

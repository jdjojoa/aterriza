import { Logo } from "@/components/Logo";

/**
 * Animated logo for the landing hero (~2 s): the globe spins in, the airplane
 * flies the orbit to its corner and the pin drops and bounces; then the
 * continents keep drifting and the plane bobs. Motion lives in
 * src/app/landing.css (.logo-hero) and is off with prefers-reduced-motion,
 * which leaves the static logo.
 */
export function HeroMark({ className = "" }: { className?: string }) {
  return (
    <Logo
      variant="full"
      title=""
      className={`hero-mark logo-hero overflow-visible ${className}`.trim()}
    />
  );
}

/**
 * Single source of truth for the Aterriza logo (globe + orbit + airplane + pin).
 * Used by src/components/Logo.tsx and by scripts/generate-logo.ts, which writes
 * public/brand/logo-{full,mark,icon}*.svg and public/logo.svg.
 *
 * All variants share a 64×64 viewBox. The `full` and `mark` variants keep the
 * same layout so the CSS animations (src/app/globals.css, landing.css) work on
 * both; `icon` is a simplified, larger globe + pin that stays legible at 16 px.
 */

export type LogoVariant = "full" | "mark" | "icon";

/** Globe disc. Continents are clipped to it. */
export const GLOBE = { cx: 30, cy: 34, r: 19 } as const;

/**
 * Continents are drawn in a horizontal band one globe-diameter wide and
 * repeated LAND_COPIES times, so translating them by -LAND_PERIOD..0 loops
 * seamlessly (the "spin").
 */
export const LAND_PERIOD = 38;
export const LAND_COPIES = 3;

const NORTH_AMERICA =
  "M15.5 23.5C18 19.5 24.5 18.5 28.5 20.5C30.5 22 28.5 24.5 27 26C25 28 23.5 29.5 23 32.5C20.5 32 18.5 30 17 28.5C15 27 14.5 25 15.5 23.5Z";
const GREENLAND =
  "M29 17.5C31 16.5 33.5 17 33.5 18.5C32.5 20 30 20.5 29 19.5C28.5 19 28.5 18 29 17.5Z";
const SOUTH_AMERICA =
  "M23.5 35.5C26.5 34.5 29.5 36.5 29 40.5C28.5 44 26.5 47.5 24.5 50.5C23.5 47.5 23 44.5 22 41.5C21 39.5 21.5 36.5 23.5 35.5Z";
const EUROPE =
  "M42.5 21.5C44.5 20.5 47 21.5 47.5 23.5C46.5 25 44 25.5 42.5 24.5C41.5 23.5 41.5 22 42.5 21.5Z";
const AFRICA =
  "M36 33C39 31 44 32 45.5 35C46.5 38 43.5 41 42.5 44C41.5 46.5 39.5 48.5 38.5 47.5C37.5 44.5 37 41.5 35.5 38.5C34.5 36.5 34.5 34 36 33Z";

export const LAND: Record<"full" | "mark", string[]> = {
  full: [NORTH_AMERICA, GREENLAND, SOUTH_AMERICA, EUROPE, AFRICA],
  mark: [NORTH_AMERICA, SOUTH_AMERICA, AFRICA],
};

/** Faint meridian/equator lines (full variant only). Static, not clipped. */
export const GRID = [
  { cx: 30, cy: 34, rx: 19, ry: 4.5 },
  { cx: 30, cy: 34, rx: 8, ry: 19 },
] as const;

/** Night-side shading (full variant only): globe minus an offset disc, clipped. */
export const SHADE = "M4 30a22 22 0 1 0 44 0a22 22 0 1 0 -44 0ZM0 0H64V64H0Z";

/**
 * Orbit: ellipse centred at (30, 36), rx 29, ry 9, tilted -20°. The front half
 * passes in front of the globe; the back half is drawn behind it.
 * Plane keyframes in globals.css/landing.css were sampled from this ellipse.
 */
export const ORBIT_FRONT = "M2.75 45.92A29 9 -20 0 0 57.25 26.08";
export const ORBIT_BACK = "M57.25 26.08A29 9 -20 0 0 2.75 45.92";

/** Airplane silhouette pointing to +x, centred on the origin. */
export const PLANE =
  "M9 0C9-1.2 7.5-1.6 6-1.6L1.5-1.6L-3-8L-5.5-8L-2.5-1.6L-6.5-1.6L-8.5-4.5L-10-4.5L-9 0L-10 4.5L-8.5 4.5L-6.5 1.6L-2.5 1.6L-5.5 8L-3 8L1.5 1.6L6 1.6C7.5 1.6 9 1.2 9 0Z";
/** Resting pose of the plane (top right). Same as the last keyframe of the intro. */
export const PLANE_REST = "translate(52 14) rotate(-35) scale(0.62)";

/** Location pin standing on the globe (tip at 40, 39). */
export const PIN = {
  d: "M40 39C40 39 33.5 31.5 33.5 25.5A6.5 6.5 0 0 1 46.5 25.5C46.5 31.5 40 39 40 39Z",
  hole: { cx: 40, cy: 25.5, r: 2.6 },
  tip: { x: 40, y: 39 },
} as const;

/** Simplified icon: bigger globe, one chunky landmass, big pin. */
export const ICON = {
  globe: { cx: 32, cy: 32, r: 28 },
  land: [
    "M10 21C14 13.5 25 11 31 15C33.5 18 29.5 22 27.5 25C25.5 28 24.5 30.5 25.5 34C28.5 34.5 31 37.5 30 42.5C29 48 26 53 23 57C20 52 19.5 47 18 43.5C16.5 40.5 17 36.5 19 33.5C15 31.5 11 28.5 10 24.5C9.8 23.3 9.8 22 10 21Z",
  ],
  pin: {
    d: "M43 51C43 51 32 39 32 27.5A11 11 0 0 1 54 27.5C54 39 43 51 43 51Z",
    hole: { cx: 43, cy: 27.5, r: 4.2 },
  },
} as const;

/** Stroke widths per variant (the mark is drawn bolder for 32 px headers). */
export const STROKE = {
  full: { orbit: 2.2, orbitBack: 1.2, pin: 1.4 },
  mark: { orbit: 2.8, orbitBack: 1.6, pin: 1.6 },
  icon: { pin: 3 },
} as const;

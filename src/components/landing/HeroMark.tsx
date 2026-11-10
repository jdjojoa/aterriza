/**
 * Animated version of the logo for the landing hero: the pin draws itself and
 * the airplane flies along a curved approach until it lands inside the pin.
 * Geometry matches src/components/Logo.tsx; motion lives in src/app/landing.css.
 * Without motion (prefers-reduced-motion) it renders as the static logo.
 */
export function HeroMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="-16 -16 96 96"
      className={`hero-mark overflow-visible ${className}`.trim()}
      aria-hidden="true"
    >
      <circle className="hero-ring" cx="32" cy="32" r="32" />
      <circle className="hero-ring hero-ring--late" cx="32" cy="32" r="32" />
      <path
        className="hero-trail"
        pathLength={1}
        d="M-22 -16C-4 -20 15.7 19.9 32 27.5"
      />
      <g className="hero-pin">
        <circle className="hero-disc" cx="32" cy="32" r="32" fill="#B5D275" />
        <path
          className="hero-pin-outline"
          pathLength={1}
          d="M32 55C32 55 17.5 40 17.5 27.5A14.5 14.5 0 0 1 46.5 27.5C46.5 40 32 55 32 55Z"
          fill="#FFFFFF"
          stroke="#1B3A66"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </g>
      <g className="hero-plane">
        <path
          transform="translate(32 27.5) rotate(25) scale(0.95)"
          fill="#1B3A66"
          d="M9 0C9-1.2 7.5-1.6 6-1.6L1.5-1.6L-3-8L-5.5-8L-2.5-1.6L-6.5-1.6L-8.5-4.5L-10-4.5L-9 0L-10 4.5L-8.5 4.5L-6.5 1.6L-2.5 1.6L-5.5 8L-3 8L1.5 1.6L6 1.6C7.5 1.6 9 1.2 9 0Z"
        />
      </g>
    </svg>
  );
}

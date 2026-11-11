type LogoProps = {
  size?: number;
  className?: string;
  /** Accessible name. Pass an empty string when the logo is decorative. */
  title?: string;
};

/** Location pin with a landing airplane. Keep in sync with public/logo.svg. */
export function Logo({ size = 40, className, title = "Aterriza" }: LogoProps) {
  const decorative = title === "";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      <circle cx="32" cy="32" r="32" className="fill-brand-lilac" />
      <path
        d="M32 55C32 55 17.5 40 17.5 27.5A14.5 14.5 0 0 1 46.5 27.5C46.5 40 32 55 32 55Z"
        className="fill-white stroke-brand-navy"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        transform="translate(32 27.5) rotate(25) scale(0.95)"
        className="fill-brand-navy"
        d="M9 0C9-1.2 7.5-1.6 6-1.6L1.5-1.6L-3-8L-5.5-8L-2.5-1.6L-6.5-1.6L-8.5-4.5L-10-4.5L-9 0L-10 4.5L-8.5 4.5L-6.5 1.6L-2.5 1.6L-5.5 8L-3 8L1.5 1.6L6 1.6C7.5 1.6 9 1.2 9 0Z"
      />
    </svg>
  );
}

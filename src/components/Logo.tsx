import { useId } from "react";
import {
  GLOBE,
  GRID,
  ICON,
  LAND,
  LAND_COPIES,
  LAND_PERIOD,
  ORBIT_BACK,
  ORBIT_FRONT,
  PIN,
  PLANE,
  PLANE_REST,
  SHADE,
  STROKE,
  type LogoVariant,
} from "./logo/geometry";

type LogoProps = {
  /**
   * - `full`: detailed logo (globe grid, shading) for large sizes.
   * - `mark`: bolder version for headers (≈32–72 px). Default.
   * - `icon`: globe + pin only, legible down to 16 px.
   */
  variant?: LogoVariant;
  size?: number;
  className?: string;
  /** Accessible name. Pass an empty string when the logo is decorative. */
  title?: string;
};

/**
 * Globe with an orbiting airplane and a location pin. Geometry lives in
 * ./logo/geometry.ts (also used to generate public/brand/*.svg and the icons).
 * Every piece has its own group and class (logo-globe, logo-land, logo-orbit,
 * logo-plane, logo-pin) so CSS can animate it; motion is opt-in through a
 * wrapper class (logo-hover, logo-loader, logo-hero) and off with reduced motion.
 * Colors use brand tokens: orbit and plane follow `heading`, so they switch to
 * lilac in dark mode.
 */
export function Logo({ variant = "mark", size = 40, className, title = "Aterriza" }: LogoProps) {
  const uid = useId();
  const decorative = title === "";
  const clipId = `${uid}clip`;

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
      {variant === "icon" ? <IconArt clipId={clipId} uid={uid} /> : <FullArt variant={variant} clipId={clipId} uid={uid} />}
    </svg>
  );
}

function FullArt({ variant, clipId, uid }: { variant: "full" | "mark"; clipId: string; uid: string }) {
  const stroke = STROKE[variant];
  const land = LAND[variant];
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} />
        </clipPath>
      </defs>

      <g id={`${uid}orbit-back`} className="logo-orbit-back">
        <path
          d={ORBIT_BACK}
          className="fill-none stroke-heading"
          strokeOpacity={0.45}
          strokeWidth={stroke.orbitBack}
          strokeLinecap="round"
        />
      </g>

      <g id={`${uid}globe`} className="logo-globe">
        <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} className="fill-brand-lavender" />
        <g clipPath={`url(#${clipId})`}>
          <g className="logo-land-spin">
            <g id={`${uid}continents`} className="logo-land fill-brand-lilac">
              {Array.from({ length: LAND_COPIES }, (_, copy) => (
                <g key={copy} transform={copy ? `translate(${copy * LAND_PERIOD} 0)` : undefined}>
                  {land.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </g>
              ))}
            </g>
          </g>
          {variant === "full" && (
            <path d={SHADE} fillRule="evenodd" className="fill-brand-navy" fillOpacity={0.18} />
          )}
        </g>
        {variant === "full" &&
          GRID.map((e) => (
            <ellipse
              key={e.rx}
              {...e}
              className="fill-none stroke-brand-lilac"
              strokeOpacity={0.4}
              strokeWidth={0.6}
            />
          ))}
      </g>

      <g id={`${uid}orbit`} className="logo-orbit">
        <path
          d={ORBIT_FRONT}
          pathLength={1}
          className="fill-none stroke-heading"
          strokeWidth={stroke.orbit}
          strokeLinecap="round"
        />
      </g>

      <g id={`${uid}pin`} className="logo-pin">
        <path
          d={PIN.d}
          className="fill-brand-navy stroke-brand-cream"
          strokeWidth={stroke.pin}
          strokeLinejoin="round"
        />
        <circle {...PIN.hole} className="fill-brand-cream" />
      </g>

      <g id={`${uid}plane`} className="logo-plane" transform={PLANE_REST}>
        <g className="logo-plane-body">
          <path d={PLANE} className="fill-heading" />
        </g>
      </g>
    </>
  );
}

function IconArt({ clipId, uid }: { clipId: string; uid: string }) {
  const { globe, land, pin } = ICON;
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx={globe.cx} cy={globe.cy} r={globe.r} />
        </clipPath>
      </defs>
      <g id={`${uid}globe`} className="logo-globe">
        <circle cx={globe.cx} cy={globe.cy} r={globe.r} className="fill-brand-lavender" />
        <g id={`${uid}continents`} clipPath={`url(#${clipId})`} className="logo-land fill-brand-lilac">
          {land.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <g id={`${uid}pin`} className="logo-pin">
        <path
          d={pin.d}
          className="fill-brand-navy stroke-brand-cream"
          strokeWidth={STROKE.icon.pin}
          strokeLinejoin="round"
        />
        <circle {...pin.hole} className="fill-brand-cream" />
      </g>
    </>
  );
}

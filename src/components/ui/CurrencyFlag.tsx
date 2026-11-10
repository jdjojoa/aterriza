import type { ReactNode } from "react";
import type { Currency } from "@/lib/currency";

/** Five-point star centred on (cx, cy) with outer radius r. */
function starPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

function hStripes(colors: string[]) {
  const h = 20 / colors.length;
  return colors.map((c, i) => <rect key={i} y={i * h} width="30" height={h} fill={c} />);
}

function vStripes(colors: string[]) {
  const w = 30 / colors.length;
  return colors.map((c, i) => <rect key={i} x={i * w} width={w} height="20" fill={c} />);
}

// Simplified 3:2 flags (no external images, legible at small sizes).
const FLAGS: Record<Currency, ReactNode> = {
  PEN: vStripes(["#D91023", "#FFFFFF", "#D91023"]),
  COP: (
    <>
      <rect width="30" height="10" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </>
  ),
  USD: (
    <>
      <rect width="30" height="20" fill="#FFFFFF" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={(i * 2 * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
      ))}
      <rect width="12" height={(20 / 13) * 7} fill="#3C3B6E" />
    </>
  ),
  EUR: (
    <>
      <rect width="30" height="20" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 6) * i;
        return (
          <circle
            key={i}
            cx={(15 + 6 * Math.cos(a)).toFixed(2)}
            cy={(10 + 6 * Math.sin(a)).toFixed(2)}
            r="0.9"
            fill="#FFCC00"
          />
        );
      })}
    </>
  ),
  VES: (
    <>
      {hStripes(["#FFCC00", "#00247D", "#CF142B"])}
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI * (1.15 + (0.7 * i) / 7);
        return (
          <circle
            key={i}
            cx={(15 + 5 * Math.cos(a)).toFixed(2)}
            cy={(14.5 + 5 * Math.sin(a)).toFixed(2)}
            r="0.55"
            fill="#FFFFFF"
          />
        );
      })}
    </>
  ),
  ARS: (
    <>
      {hStripes(["#74ACDF", "#FFFFFF", "#74ACDF"])}
      <circle cx="15" cy="10" r="1.8" fill="#F6B40E" />
    </>
  ),
  BRL: (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <polygon points="15,2.5 27,10 15,17.5 3,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4" fill="#002776" />
    </>
  ),
  MXN: (
    <>
      {vStripes(["#006847", "#FFFFFF", "#CE1126"])}
      <circle cx="15" cy="10" r="2" fill="#8C5A2B" />
    </>
  ),
  CLP: (
    <>
      <rect width="30" height="10" fill="#FFFFFF" />
      <rect y="10" width="30" height="10" fill="#D52B1E" />
      <rect width="10" height="10" fill="#0039A6" />
      <polygon points={starPoints(5, 5, 3)} fill="#FFFFFF" />
    </>
  ),
  BOB: hStripes(["#D52B1E", "#F9E300", "#007934"]),
};

/** Decorative flag for a currency; pair it with a visible name. */
export function CurrencyFlag({
  currency,
  className = "",
}: {
  currency: Currency;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      className={`h-5 w-[30px] shrink-0 rounded-sm ring-1 ring-border/60 ${className}`}
    >
      {FLAGS[currency]}
    </svg>
  );
}

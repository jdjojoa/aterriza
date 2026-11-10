import type { CSSProperties } from "react";

/**
 * Decorative, stylized map of Piura for the hero background: the centro grid
 * on the west bank, the Piura river and Castilla on the east bank, and three
 * routes that draw themselves. Not to scale.
 */
const ROUTES = [
  "M40 470C160 430 220 330 330 320S520 300 640 210 760 120 820 90",
  "M120 -10C150 120 250 170 300 260S330 430 420 520 600 560 700 640",
  "M-10 200C120 210 200 160 280 120S470 80 560 140 700 300 820 330",
];

const STOPS: [number, number][] = [
  [330, 320],
  [300, 260],
  [280, 120],
  [640, 210],
  [420, 520],
  [560, 140],
];

const GRID = Array.from({ length: 13 }, (_, i) => 40 + i * 40);

export function RouteMap({ className = "", labels = true }: { className?: string; labels?: boolean }) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className={`route-map ${className}`.trim()}
      aria-hidden="true"
    >
      <g className="route-map__grid" transform="rotate(-12 260 300)">
        {GRID.map((x) => (
          <line key={`v${x}`} x1={x - 40} y1="-60" x2={x - 40} y2="660" />
        ))}
        {GRID.map((y) => (
          <line key={`h${y}`} x1="-60" y1={y - 60} x2="480" y2={y - 60} />
        ))}
      </g>
      <path
        className="route-map__river"
        d="M600 -20C560 80 620 160 560 250S470 420 520 520 480 600 470 640"
      />
      {ROUTES.map((d, i) => (
        <g key={d} className="route-map__route" style={{ "--i": i } as CSSProperties}>
          <path className="route-map__line" pathLength={1} d={d} />
          <path className="route-map__flow" pathLength={1} d={d} />
        </g>
      ))}
      {STOPS.map(([cx, cy], i) => (
        <circle
          key={`${cx}-${cy}`}
          className="route-map__stop"
          style={{ "--i": i } as CSSProperties}
          cx={cx}
          cy={cy}
          r="6"
        />
      ))}
      {labels && (
        <g className="route-map__labels">
          <text x="262" y="236">Centro</text>
          <text x="650" y="250">Castilla</text>
          <text x="520" y="390" transform="rotate(-62 520 390)">Río Piura</text>
        </g>
      )}
    </svg>
  );
}

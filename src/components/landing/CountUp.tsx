"use client";

import { useEffect, useRef } from "react";

const format = (value: number, decimals: number) =>
  value.toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/**
 * Number that counts up from 0 the first time it scrolls into view.
 * Server HTML and reduced-motion users get the final value directly.
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const render = (n: number) => {
      node.textContent = `${format(n, decimals)}${suffix}`;
    };
    render(0);

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          render(value * (1 - (1 - t) ** 3));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      render(value);
    };
  }, [value, decimals, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value, decimals)}
      {suffix}
    </span>
  );
}

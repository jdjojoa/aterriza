/**
 * Generic loading state for route segments (loading.tsx). Prerendered into the
 * static shell, so it shows the moment a link is tapped.
 */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando…</span>
      <div aria-hidden="true" className="h-8 w-2/3 animate-pulse rounded-xl bg-accent-soft motion-reduce:animate-none" />
      <div aria-hidden="true" className="h-4 w-1/2 animate-pulse rounded-lg bg-accent-soft motion-reduce:animate-none" />
      {Array.from({ length: blocks }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-32 animate-pulse rounded-2xl border border-border/20 bg-surface motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

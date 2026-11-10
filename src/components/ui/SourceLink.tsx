type SourceLinkProps = {
  sourceUrl: string | null | undefined;
  sourceName?: string | null;
  className?: string;
};

/**
 * Discreet "Fuente" link for places, foods, slang and customs. Renders
 * nothing without a URL. Medicines and transport fares use <SourceBadge>.
 */
export function SourceLink({ sourceUrl, sourceName, className = "" }: SourceLinkProps) {
  if (!sourceUrl) return null;
  return (
    <a
      href={sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center self-start rounded text-sm text-muted underline underline-offset-2 hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`.trim()}
    >
      Fuente
      <span className="sr-only">
        {sourceName ? `: ${sourceName}` : ""} (se abre en una pestaña nueva)
      </span>
    </a>
  );
}

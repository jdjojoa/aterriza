import { Badge } from "./Badge";

export type SourceBadgeVariant = "verificado" | "referencial-ia";

type SourceBadgeProps = {
  sourceName: string;
  sourceUrl: string;
  /** ISO date ("2026-11-08") or Date. `null` means not verified yet. */
  verifiedAt: string | Date | null;
  variant?: SourceBadgeVariant;
  className?: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Fixed locale and time zone so server and client render the same text.
function formatVerifiedAt(value: string | Date) {
  const dateOnly = typeof value === "string" && DATE_ONLY.test(value);
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : "America/Lima",
  }).format(date);
}

export function SourceBadge({
  sourceName,
  sourceUrl,
  verifiedAt,
  variant = "verificado",
  className = "",
}: SourceBadgeProps) {
  const isAi = variant === "referencial-ia";
  const pending = verifiedAt === null;

  return (
    <aside
      aria-label="Fuente de la información"
      className={`flex flex-col gap-1.5 rounded-xl border border-border/30 bg-surface p-3 text-sm ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isAi ? (
          <Badge variant="warning">Referencial · generado con IA</Badge>
        ) : pending ? (
          <Badge variant="warning">Pendiente de verificación</Badge>
        ) : (
          <Badge variant="success">Verificado</Badge>
        )}
      </div>
      <p className="text-foreground">
        Fuente:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {sourceName}
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </p>
      <p className="text-muted">
        {pending ? (
          "Pendiente de verificación"
        ) : (
          <>
            Verificado el{" "}
            <time
              dateTime={
                typeof verifiedAt === "string"
                  ? verifiedAt
                  : verifiedAt.toISOString()
              }
            >
              {formatVerifiedAt(verifiedAt)}
            </time>
          </>
        )}
      </p>
      {isAi && (
        <p className="text-muted">
          Texto de referencia generado con IA. Confírmalo siempre en la fuente
          oficial.
        </p>
      )}
    </aside>
  );
}

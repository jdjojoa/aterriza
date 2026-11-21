import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ARRIVAL_MODE_LABELS, formatPriceRange, type ArrivalItem } from "@/lib/arrival";
import { foldText } from "@/lib/text";

/** "Cómo llegar a Piura": routes from the student's city, then the other cities. */
export function ArrivalRoutes({ city, routes }: { city: string; routes: ArrivalItem[] }) {
  const own = routes.filter((r) => foldText(r.origin_city) === foldText(city));
  const others = routes.filter((r) => foldText(r.origin_city) !== foldText(city));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">
        Buses, vuelos y colectivos para llegar a Piura. Confirma horarios y precios con la empresa antes de viajar.
      </p>
      <section aria-labelledby="arrival-own" className="flex flex-col gap-3">
        <h2 id="arrival-own" className="text-lg font-extrabold text-heading">
          Desde {city}
        </h2>
        {own.length === 0 ? (
          <Card className="flex flex-col gap-1">
            <p className="font-bold text-heading">Aún no tenemos rutas desde {city}</p>
            <p className="text-muted">Pregúntale al chat o mira las rutas desde otras ciudades.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {own.map((r) => (
              <li key={r.id}>
                <ArrivalCard route={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {others.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-xl font-bold text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Ver rutas desde otras ciudades ({others.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {others.map((r) => (
              <li key={r.id}>
                <ArrivalCard route={r} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-bold text-heading">{label}</dt>
      <dd className="text-foreground">{value || "Por verificar"}</dd>
    </div>
  );
}

function ArrivalCard({ route }: { route: ArrivalItem }) {
  const noPrice = route.precio_min === null && route.precio_max === null;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{ARRIVAL_MODE_LABELS[route.transport_mode]}</Badge>
        {route.verified_at === null && <Badge variant="warning">Referencial</Badge>}
      </div>
      <h3 className="text-xl font-extrabold text-heading">{route.origin_city} → Piura</h3>
      <dl className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <Fact label="Sale de" value={route.terminal_origen} />
        <Fact label="Llega a" value={route.terminal_llegada} />
        <Fact label="Duración aproximada" value={route.duracion_aprox} />
        <div>
          <dt className="text-sm font-bold text-heading">Precio</dt>
          <dd className="text-foreground">
            {noPrice ? (
              <Badge variant="warning">{formatPriceRange(null, null)}</Badge>
            ) : (
              formatPriceRange(route.precio_min, route.precio_max)
            )}
          </dd>
        </div>
        <div className="min-[360px]:col-span-2">
          <Fact label="Empresas" value={route.empresas} />
        </div>
      </dl>
      {route.notas && <p className="whitespace-pre-line text-sm text-muted">{route.notas}</p>}
      {route.source_name && route.source_url ? (
        <SourceBadge sourceName={route.source_name} sourceUrl={route.source_url} verifiedAt={route.verified_at} />
      ) : (
        <p className="rounded-xl bg-warning-soft p-3 text-sm font-bold text-on-warning-soft">
          Sin fuente todavía · Referencial
        </p>
      )}
    </Card>
  );
}

import { Icon } from "@/components/icons/Icon";
import type { GeminiQuota, QuotaMeter } from "@/lib/admin/gemini-quota";

const LIMA = "America/Lima";
const HOUR = 3_600_000;

type Level = "ok" | "low" | "critical";

/** Normal above 50 % left, yellow 20–50 %, red below 20 %. */
function levelOf(percentLeft: number): Level {
  if (percentLeft < 20) return "critical";
  if (percentLeft <= 50) return "low";
  return "ok";
}

const STROKE: Record<Level, string> = {
  ok: "stroke-accent",
  low: "stroke-warning",
  critical: "stroke-danger",
};
const BAR: Record<Level, string> = { ok: "bg-accent", low: "bg-warning", critical: "bg-danger" };
const LEVEL_LABEL: Record<Level, string | null> = {
  ok: null,
  low: "Cuota a la mitad",
  critical: "Cuota casi agotada",
};
const LEVEL_BADGE: Record<Level, string> = {
  ok: "",
  low: "bg-warning-soft text-on-warning-soft",
  critical: "bg-danger-soft text-on-danger-soft",
};

const limaTime = (date: Date) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", minute: "2-digit" }).format(date);
const limaHour = (date: Date) =>
  new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, hour: "numeric", hour12: false }).format(date);

function resetLabel(reset: Date, now: Date) {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: LIMA }).format(d);
  const when =
    day(reset) === day(now)
      ? "hoy"
      : day(reset) === day(new Date(now.getTime() + 24 * HOUR))
        ? "mañana"
        : new Intl.DateTimeFormat("es-PE", { timeZone: LIMA, weekday: "long" }).format(reset);
  return `Se reinicia ${when} a las ${limaTime(reset)} (hora de Perú).`;
}

function Ring({ percentLeft, level }: { percentLeft: number; level: Level }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const left = Math.min(100, Math.max(0, percentLeft));
  return (
    <svg viewBox="0 0 120 120" className="size-36 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-hover" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - left / 100)}
        className={left > 0 ? STROKE[level] : "stroke-transparent"}
      />
    </svg>
  );
}

function HourlyChart({ meter, start, now, level }: { meter: QuotaMeter; start: Date; now: Date; level: Level }) {
  const peak = Math.max(0, ...meter.hourly);
  const max = Math.max(1, peak);
  const total = meter.hourly.reduce((a, b) => a + b, 0);
  const currentIndex = Math.floor((now.getTime() - start.getTime()) / HOUR);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-bold text-muted">Llamadas por hora (hora de Perú)</figcaption>
      <div
        role="img"
        aria-label={`Llamadas por hora desde las ${limaTime(start)}: ${total} en total; máximo ${peak} en una hora.`}
        className="flex h-20 items-end gap-px border-b border-border/50"
      >
        {meter.hourly.map((calls, i) => {
          const at = new Date(start.getTime() + i * HOUR);
          return (
            <div
              key={i}
              title={`${limaHour(at)}:00 · ${calls} llamada${calls === 1 ? "" : "s"}`}
              className={`flex-1 rounded-t-sm ${i > currentIndex ? "opacity-0" : ""} ${calls ? BAR[level] : "bg-hover"}`}
              style={{ height: `${calls ? Math.max(6, (calls / max) * 100) : 4}%` }}
            />
          );
        })}
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-muted tabular-nums">
        {[0, 6, 12, 18].map((i) => (
          <span key={i}>{limaHour(new Date(start.getTime() + i * HOUR))} h</span>
        ))}
        <span>{limaHour(new Date(start.getTime() + meter.hourly.length * HOUR))} h</span>
      </div>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-xl bg-background p-3">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums text-heading">{value}</dd>
    </div>
  );
}

function Meter({ meter, start, now, title }: { meter: QuotaMeter; start: Date; now: Date; title: string }) {
  const level = levelOf(meter.percentLeft);
  const percent = Math.floor(meter.percentLeft);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Ring percentLeft={meter.percentLeft} level={level} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tabular-nums text-heading">{percent} %</span>
            <span className="text-xs font-bold text-muted">queda</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-lg font-extrabold leading-tight text-heading">{title}</h3>
          <p className="text-foreground">
            <span className="font-extrabold tabular-nums">
              {meter.used} / {meter.limit}
            </span>{" "}
            usadas
          </p>
          <p className="break-all text-xs text-muted">{meter.model}</p>
          {LEVEL_LABEL[level] && (
            <span className={`self-start rounded-full px-2 py-0.5 text-xs font-bold ${LEVEL_BADGE[level]}`}>
              {LEVEL_LABEL[level]}
            </span>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {meter.uses.includes("chat") && <Stat label="Chat" value={meter.chatCalls} />}
        {meter.uses.includes("vision") && <Stat label="Fotos" value={meter.photoCalls} />}
        <Stat label="Fallidas por límite (429)" value={meter.rateLimited} />
      </dl>
      <HourlyChart meter={meter} start={start} now={now} level={level} />
    </div>
  );
}

/** Main card at the top of /admin. `quota` null = could not be loaded. */
export function GeminiQuotaCard({ quota }: { quota: GeminiQuota | null }) {
  const critical = quota?.meters.filter((m) => m.percentLeft < 10) ?? [];
  const single = quota?.meters.length === 1;
  return (
    <section aria-labelledby="gemini-quota" className="flex flex-col gap-4">
      {critical.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft p-3 font-bold text-on-danger-soft">
          <Icon name="info" size={20} />
          Queda menos del 10 % de la cuota diaria de Gemini
          {single ? "" : ` (${critical.map((m) => m.model).join(", ")})`}. El chat y las fotos pueden dejar de
          responder hasta el reinicio.
        </p>
      )}
      <div className="flex flex-col gap-5 rounded-2xl border border-border/30 bg-surface p-4 shadow-sm sm:p-5">
        <h2 id="gemini-quota" className="text-xl font-extrabold text-heading">
          Cuota diaria de Gemini
        </h2>
        {!quota ? (
          <p className="rounded-xl bg-warning-soft p-3 font-bold text-on-warning-soft">
            No se pudo cargar el uso de Gemini. ¿Ejecutaste la migración 0013_ai_usage_calls.sql?
          </p>
        ) : (
          <>
            {quota.meters.map((meter) => (
              <Meter
                key={meter.model}
                meter={meter}
                start={quota.start}
                now={quota.now}
                title={single ? "Chat y fotos" : meter.uses.includes("chat") ? "Chat" : "Fotos"}
              />
            ))}
            <div className="flex flex-col gap-1 text-sm text-muted">
              <p>{resetLabel(quota.reset, quota.now)}</p>
              <p>Estimación basada en las llamadas de Aterriza. El dato oficial está en Google AI Studio.</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

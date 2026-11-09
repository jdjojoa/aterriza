"use client";

import { useActionState, useRef, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import {
  DEFAULT_ORIGIN_COUNTRY,
  DESTINATION,
  countryName,
  type OriginCountryCode,
} from "@/lib/countries";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { error: null };

export function OnboardingForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [origin, setOrigin] = useState<OriginCountryCode>(DEFAULT_ORIGIN_COUNTRY);
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function goTo(next: 1 | 2) {
    setStep(next);
    // Move focus to the new step's heading for screen readers.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="origin_country" value={origin} />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-muted">Paso {step} de 2</p>
        <div className="flex gap-2" aria-hidden="true">
          <span className="h-1.5 flex-1 rounded-full bg-primary-edge" />
          <span
            className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-primary-edge" : "bg-border/30"}`}
          />
        </div>
      </div>

      {step === 1 ? (
        <>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-extrabold tracking-tight text-heading outline-none"
          >
            ¿De dónde vienes?
          </h1>
          <CountryPicker legend="País de origen" value={origin} onChange={setOrigin} />
          <Button size="lg" className="w-full" onClick={() => goTo(2)}>
            Continuar
          </Button>
        </>
      ) : (
        <>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-extrabold tracking-tight text-heading outline-none"
          >
            ¿A dónde llegas?
          </h1>
          <Card className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
              <Icon name="map-pin" size={24} />
            </span>
            <div>
              <p className="text-sm text-muted">Destino</p>
              <p className="text-lg font-bold text-heading">
                {countryName(DESTINATION.country)} → {DESTINATION.city}
              </p>
            </div>
          </Card>
          <p className="text-muted">
            Pronto más ciudades. Por ahora Aterriza te acompaña en Piura.
          </p>
          <p className="text-sm text-muted">
            Vienes de <strong className="text-foreground">{countryName(origin)}</strong>.
          </p>

          {state.error && (
            <p role="alert" className="text-sm font-bold text-on-warning-soft">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Guardando…" : "Empezar"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => goTo(1)}
              disabled={pending}
            >
              Atrás
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DEFAULT_ORIGIN_COUNTRY,
  isOriginCountry,
  type OriginCountryCode,
} from "@/lib/countries";
import { updateProfile, type ProfileFormState } from "./actions";

type ProfileFormProps = {
  fullName: string | null;
  originCountry: string;
};

const initialState: ProfileFormState = { status: "idle", message: null };

export function ProfileForm({ fullName, originCountry }: ProfileFormProps) {
  const [origin, setOrigin] = useState<OriginCountryCode>(
    isOriginCountry(originCountry) ? originCountry : DEFAULT_ORIGIN_COUNTRY,
  );
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Input
        label="Nombre"
        name="full_name"
        defaultValue={fullName ?? ""}
        autoComplete="name"
        required
        maxLength={80}
        error={state.status === "error" ? (state.message ?? undefined) : undefined}
      />
      <input type="hidden" name="origin_country" value={origin} />
      <CountryPicker legend="País de origen" value={origin} onChange={setOrigin} />

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <p role="status" className="min-h-5 text-center text-sm font-bold text-heading">
          {state.status === "saved" ? state.message : ""}
        </p>
      </div>
    </form>
  );
}

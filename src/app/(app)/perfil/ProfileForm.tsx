"use client";

import { useActionState, useState } from "react";
import {
  OriginPicker,
  isOriginComplete,
  type DepartmentOption,
  type OriginValue,
} from "@/components/OriginPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CountryOption } from "@/lib/countries";
import { updateProfile, type ProfileFormState } from "./actions";

type ProfileFormProps = {
  fullName: string | null;
  initialOrigin: OriginValue;
  countries: CountryOption[];
  departments: DepartmentOption[];
};

const initialState: ProfileFormState = { status: "idle", message: null };

export function ProfileForm({ fullName, initialOrigin, countries, departments }: ProfileFormProps) {
  const [origin, setOrigin] = useState<OriginValue>(initialOrigin);
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
      />
      <section aria-labelledby="origin-title" className="flex flex-col gap-3">
        <h2 id="origin-title" className="text-xl font-extrabold text-heading">
          ¿De dónde vienes?
        </h2>
        <OriginPicker countries={countries} departments={departments} value={origin} onChange={setOrigin} />
      </section>

      <div className="flex flex-col gap-2">
        {state.status === "error" && (
          <p role="alert" className="text-sm font-bold text-on-warning-soft">
            {state.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending || !isOriginComplete(origin)}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <p role="status" className="min-h-5 text-center text-sm font-bold text-heading">
          {state.status === "saved" ? state.message : ""}
        </p>
      </div>
    </form>
  );
}

"use client";

import { ORIGIN_COUNTRIES, type OriginCountryCode } from "@/lib/countries";

type CountryPickerProps = {
  legend: string;
  value: OriginCountryCode;
  onChange: (code: OriginCountryCode) => void;
  /** Form field name. Omit when a hidden input carries the value. */
  name?: string;
};

/** Radio cards for the origin country (short Latin American list). */
export function CountryPicker({ legend, value, onChange, name }: CountryPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold text-heading">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {ORIGIN_COUNTRIES.map((country) => {
          const checked = country.code === value;
          return (
            <label
              key={country.code}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 font-bold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${
                checked
                  ? "border-primary-edge bg-accent-soft text-on-accent-soft"
                  : "border-border bg-surface text-foreground hover:bg-hover"
              }`}
            >
              <input
                type="radio"
                name={name ?? "origin_country_choice"}
                value={country.code}
                checked={checked}
                onChange={() => onChange(country.code)}
                className="size-4 accent-[var(--primary-edge)]"
              />
              {country.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

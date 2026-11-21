"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { CountryOption } from "@/lib/countries";
import { foldText } from "@/lib/text";
import type { OriginType } from "@/types/database";

export type DepartmentOption = { department: string; cities: string[] };

export type OriginValue = {
  type: OriginType | null;
  country: string | null;
  department: string | null;
  city: string | null;
};

type OriginPickerProps = {
  /** Every origin country, sorted, built on the server. */
  countries: CountryOption[];
  departments: DepartmentOption[];
  value: OriginValue;
  onChange: (value: OriginValue) => void;
};

/** True when the value can be saved. */
export function isOriginComplete(value: OriginValue) {
  return value.type === "internacional"
    ? Boolean(value.country)
    : value.type === "nacional"
      ? Boolean(value.department && value.city)
      : false;
}

/** The form fields the Server Actions read (parseOriginForm). */
export function OriginHiddenInputs({ value }: { value: OriginValue }) {
  return (
    <>
      <input type="hidden" name="origin_type" value={value.type ?? ""} />
      <input type="hidden" name="origin_country" value={value.type === "internacional" ? (value.country ?? "") : ""} />
      <input type="hidden" name="origin_department" value={value.type === "nacional" ? (value.department ?? "") : ""} />
      <input type="hidden" name="origin_city" value={value.type === "nacional" ? (value.city ?? "") : ""} />
    </>
  );
}

const optionClasses = (checked: boolean) =>
  `flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 font-bold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${
    checked
      ? "border-primary-edge bg-accent-soft text-on-accent-soft"
      : "border-border bg-surface text-foreground hover:bg-hover"
  }`;

/**
 * "¿De dónde vienes?": two buttons ("De otro país" / "De otra ciudad del
 * Perú"), then a searchable country list or department + searchable city
 * list. Writes hidden inputs: origin_type, origin_country, origin_department,
 * origin_city.
 */
export function OriginPicker({ countries, departments, value, onChange }: OriginPickerProps) {
  const groupId = useId();
  const choose = (type: OriginType) => {
    if (type === value.type) return;
    onChange({ type, country: null, department: null, city: null });
  };

  return (
    <div className="flex flex-col gap-5">
      <OriginHiddenInputs value={value} />

      <div role="group" aria-labelledby={groupId} className="flex flex-col gap-2">
        <p id={groupId} className="text-sm font-bold text-heading">
          Elige una opción
        </p>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          <TypeButton
            selected={value.type === "internacional"}
            icon="globe"
            label="De otro país"
            onClick={() => choose("internacional")}
          />
          <TypeButton
            selected={value.type === "nacional"}
            icon="map-pin"
            label="De otra ciudad del Perú"
            onClick={() => choose("nacional")}
          />
        </div>
      </div>

      {value.type === "internacional" && (
        <CountrySearch
          countries={countries}
          selected={value.country}
          onSelect={(country) => onChange({ ...value, country })}
        />
      )}
      {value.type === "nacional" && (
        <CitySearch
          departments={departments}
          department={value.department}
          city={value.city}
          onChange={(department, city) => onChange({ ...value, department, city })}
        />
      )}
    </div>
  );
}

function TypeButton({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: "globe" | "map-pin";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 text-left font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-primary-edge bg-surface text-heading hover:bg-hover"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-on-primary text-primary" : "bg-accent-soft text-on-accent-soft"
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
      {label}
    </button>
  );
}

/** Text filter + radio list (keyboard friendly, no custom combobox). */
function SearchList<T extends { key: string; label: string; prefix?: string }>({
  legend,
  searchLabel,
  placeholder,
  items,
  selected,
  onSelect,
  name,
}: {
  legend: string;
  searchLabel: string;
  placeholder: string;
  items: T[];
  selected: string | null;
  onSelect: (key: string) => void;
  name: string;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const searchId = useId();
  const visible = useMemo(() => {
    const q = foldText(deferred);
    return q ? items.filter((i) => foldText(i.label).includes(q)) : items;
  }, [items, deferred]);
  const chosen = items.find((i) => i.key === selected);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold text-heading">{legend}</legend>
      {chosen && (
        <p className="text-sm text-muted" aria-live="polite">
          Elegiste:{" "}
          <strong className="text-foreground">
            {chosen.prefix ? `${chosen.prefix} ` : ""}
            {chosen.label}
          </strong>
        </p>
      )}
      <label htmlFor={searchId} className="sr-only">
        {searchLabel}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent">
          <Icon name="search" size={18} />
        </span>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-11 w-full rounded-xl border border-border bg-surface py-2 pl-10 pr-3 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl p-0.5">
        {visible.length === 0 ? (
          <p className="p-2 text-sm text-muted">No encontramos «{query}».</p>
        ) : (
          visible.map((item) => (
            <label key={item.key} className={optionClasses(item.key === selected)}>
              <input
                type="radio"
                name={name}
                value={item.key}
                checked={item.key === selected}
                onChange={() => onSelect(item.key)}
                className="size-4 shrink-0 accent-[var(--primary-edge)]"
              />
              {item.prefix && (
                <span aria-hidden="true" className="text-lg leading-none">
                  {item.prefix}
                </span>
              )}
              {item.label}
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

function CountrySearch({
  countries,
  selected,
  onSelect,
}: {
  countries: CountryOption[];
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const items = useMemo(
    () => countries.map((c) => ({ key: c.code, label: c.name, prefix: c.flag })),
    [countries],
  );
  return (
    <SearchList
      legend="País de origen"
      searchLabel="Buscar un país"
      placeholder="Busca tu país"
      items={items}
      selected={selected}
      onSelect={onSelect}
      name="origin_country_choice"
    />
  );
}

function CitySearch({
  departments,
  department,
  city,
  onChange,
}: {
  departments: DepartmentOption[];
  department: string | null;
  city: string | null;
  onChange: (department: string | null, city: string | null) => void;
}) {
  const selectId = useId();
  const items = useMemo(
    () => (departments.find((d) => d.department === department)?.cities ?? []).map((c) => ({ key: c, label: c })),
    [departments, department],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-bold text-heading">
          Departamento
        </label>
        <div className="relative">
          <select
            id={selectId}
            value={department ?? ""}
            onChange={(e) => onChange(e.target.value || null, null)}
            className="min-h-11 w-full appearance-none rounded-xl border border-border bg-surface px-3 pr-10 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="">Elige tu departamento</option>
            {departments.map((d) => (
              <option key={d.department} value={d.department}>
                {d.department}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="chevron-down" size={20} />
          </span>
        </div>
      </div>
      {department && (
        <SearchList
          key={department}
          legend="Ciudad"
          searchLabel="Buscar una ciudad"
          placeholder="Busca tu ciudad"
          items={items}
          selected={city}
          onSelect={(c) => onChange(department, c)}
          name="origin_city_choice"
        />
      )}
    </div>
  );
}

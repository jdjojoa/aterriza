import "server-only";
import { cache } from "react";
import type { DepartmentOption } from "@/components/OriginPicker";
import { isOriginCountry, DESTINATION } from "@/lib/countries";
import { isOriginType } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import type { OriginType } from "@/types/database";

/** Departments (alphabetical) with their cities: capital first, then by name. */
export const getPeruLocations = cache(async (): Promise<DepartmentOption[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("peru_locations")
    .select("department, city, kind")
    .limit(1000);
  if (error) console.error("[peru_locations] load failed", error.message);
  const byDepartment = new Map<string, { city: string; capital: boolean }[]>();
  for (const row of data ?? []) {
    const list = byDepartment.get(row.department) ?? [];
    list.push({ city: row.city, capital: row.kind === "capital" });
    byDepartment.set(row.department, list);
  }
  return [...byDepartment.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([department, cities]) => ({
      department,
      cities: cities
        .sort((a, b) => Number(b.capital) - Number(a.capital) || a.city.localeCompare(b.city, "es"))
        .map((c) => c.city),
    }));
});

/** Profile columns written by onboarding and /perfil. */
export type OriginUpdate = {
  origin_type: OriginType;
  origin_country: string;
  origin_department: string | null;
  origin_city: string | null;
};

/**
 * Validates the origin fields of a form (OriginPicker's hidden inputs).
 * National origins must be a department/city pair from peru_locations.
 */
export async function parseOriginForm(
  formData: FormData,
): Promise<{ ok: true; value: OriginUpdate } | { ok: false; error: string }> {
  const type = formData.get("origin_type");
  if (!isOriginType(type)) return { ok: false, error: "Cuéntanos de dónde vienes." };

  if (type === "internacional") {
    const country = formData.get("origin_country");
    if (!isOriginCountry(country)) return { ok: false, error: "Elige tu país de origen." };
    return {
      ok: true,
      value: { origin_type: type, origin_country: country, origin_department: null, origin_city: null },
    };
  }

  const department = String(formData.get("origin_department") ?? "").trim();
  const city = String(formData.get("origin_city") ?? "").trim();
  if (!department) return { ok: false, error: "Elige tu departamento." };
  if (!city) return { ok: false, error: "Elige tu ciudad." };
  const locations = await getPeruLocations();
  const valid = locations.some((d) => d.department === department && d.cities.includes(city));
  if (!valid) return { ok: false, error: "Elige una ciudad de la lista." };
  return {
    ok: true,
    value: {
      origin_type: type,
      origin_country: DESTINATION.country,
      origin_department: department,
      origin_city: city,
    },
  };
}

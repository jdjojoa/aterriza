# Carga de contenido desde CSV

Los archivos de `data/` son la fuente del contenido de `places`, `transport_routes`, `foods`,
`slang_terms` y `customs`.
Edítalos y vuelve a cargarlos con el script; no hace falta tocar SQL.

## Editar los CSV

- Ábrelos con Google Sheets, LibreOffice o VS Code. **No cambies ni reordenes el encabezado.**
- Si usas Excel en español y guarda con `;`, el script lo acepta (y también comas decimales).
- Celda vacía = sin dato (`null`). Si no sabes algo, déjalo vacío: **no inventes datos**.
- Formatos:
  - `verified_at`: fecha `AAAA-MM-DD`, solo cuando alguien comprobó el dato en persona o en la fuente.
  - `source_name` y `source_url`: obligatorios (`source_url` empieza por `http`). Al verificar, reemplaza
    "Pendiente de verificación" y el enlace de OpenStreetMap por la fuente real.
  - `lat`, `lng`: decimales con punto, p. ej. `-5.1966`.
  - `is_published`: `true` o `false`. Vacío = no cambia (al crear, queda en `true`).
  - `category` (places): `turistico`, `comida`, `salud`, `tramites`, `compras`, `universidad`.
  - `mode` (rutas): `combi`, `mototaxi`, `bus`, `colectivo`, `taxi`.
  - `path` (rutas): JSON con puntos `[lat, lng]`, p. ej. `"[[-5.1966,-80.6261],[-5.17,-80.633]]"`.
  - `fare_min`, `fare_max`: soles, p. ej. `1.50`. Las tarifas las llena quien vive en Piura.
- `id`, `verified_by`: déjalos vacíos salvo que quieras apuntar a una fila concreta.

### Cómo se reconoce una fila existente

- `places` y `foods`: por `name` (sin distinguir mayúsculas).
- `slang_terms`: por `term`; `customs`: por `title`.
- `transport_routes`: por `code`; si `code` está vacío, por `name`.
- Si la fila tiene `id`, se usa el `id`.

Coincide → se actualiza. No coincide → se inserta. **El script nunca borra filas**: si quitas una fila
del CSV, despublícala con `is_published = false` o bórrala desde el panel de Supabase.
Para **renombrar** un lugar, pon su `id` en la columna `id` (si no, se crea uno nuevo).

## Estado actual de los datos

- Las coordenadas son **aproximadas** y todo está "Pendiente de verificación".
- El hospital y la oficina de Migraciones están con `is_published = false` hasta confirmar su ubicación.
- Las 10 rutas son solo **estructura de ejemplo** (`EJ-01`…`EJ-10`), sin tarifas y sin publicar.

## Comidas (`foods.csv`)

15 platos piuranos y peruanos con `description`, `main_ingredients` y `keywords`, publicados pero
"Pendiente de verificación" (la app lo indica en cada ficha).

- `where_to_try` (dónde probarlo en Piura) está vacío a propósito: lo llena quien lo haya comprobado.
  El "parecido en {país}" va en `equivalents.csv` (ver abajo). Al verificar, pon la fuente real en `source_name`/`source_url` y la fecha
  en `verified_at`.
- `keywords`: otros nombres del plato separados por `|`, p. ej. `cebiche|seviche`. La búsqueda por foto de
  `/identificar` compara el nombre que reconoce la IA con `name` y con cada keyword.
- `image_url`: enlace a una foto con permiso de uso (opcional).
- Los alérgenos comunes (mariscos, maní, lácteos…) se detectan solos a partir de `name` e `main_ingredients`:
  escribe ahí los ingredientes reales.

La búsqueda por foto usa la función `search_foods` de `supabase/migrations/0004_search_foods.sql`
(pégala en el SQL Editor después de 0003).

## Jerga (`slang_terms.csv`) y costumbres (`customs.csv`)

40 términos peruanos y piuranos y 8 costumbres, publicados pero **todos "Pendiente de verificación"**
(`verified_at` vacío). Al verificar un término, pon la fuente real en `source_name`/`source_url` y la fecha.

- `category` (jerga): `expresiones`, `personas`, `comida`, `transporte`, `compras`, `estudio`, `lugares`, `ropa`.
- `category` (costumbres): `saludo`, `comida`, `transporte`, `horarios`, `propinas`, `seguridad`.
- `example`: una frase de uso, sin comillas. `is_piurano`: `true` si es una palabra típica de Piura
  (la app la marca con la etiqueta «Piurano»).
- Cómo se dice en cada país va en `equivalents.csv` (ver abajo), nunca en la tabla de jerga.
- `icon` (costumbres): opcional; la app elige el ícono por categoría.

El chatbot busca en la jerga con la función `search_slang_terms_v2` (sin tildes, con `unaccent`, y también
en la equivalencia del país del usuario) de `supabase/migrations/0016_equivalents.sql`. Mientras no esté,
el chat usa una búsqueda más simple.

## Equivalencias por país (`equivalents.csv`)

Una fila por contenido **y país**. Cada estudiante ve solo la de su país; si no hay, la app muestra
«Aún no tenemos equivalencias para {país}» con el botón «Sugerir una».

- `content_type`: `food`, `slang` o `medicine`.
- `content_key`: el `name` del plato, el `term` de la jerga o el `brand_name_pe` del medicamento.
- `country_code`: código ISO de dos letras (`CO`, `PY`, `ES`…). Nunca `PE`.
- `equivalent_text`: cómo se llama o se dice en ese país. `brand_names` (solo medicamentos): marcas separadas por `|`.
- `source_name` / `source_url`: opcionales.
- Hoy solo hay filas de Colombia (`CO`), las que antes estaban en las columnas `*_co`.

## Medicamentos (`medicines.csv`) — plantilla, aún no se carga

`medicines.csv` tiene las columnas de la tabla `medicines` y 25 medicamentos de venta libre comunes con
**solo** `brand_name_pe` (nombre genérico) y `active_ingredient`. El script `npm run seed` todavía **no** lo lee:
hay que completarlo antes desde fuentes oficiales.

- `where_to_buy`, `source_url` y `verified_at` están vacíos a propósito: complétalos desde
  [DIGEMID](https://opm-digemid.minsa.gob.pe/) (Perú). El equivalente referencial de cada país va en
  `equivalents.csv`, con la fuente de la autoridad sanitaria de ese país.
- `source_name`, `source_url` y `digemid_url` son obligatorios en la base de datos.
- `active_ingredient`: si hay varios, sepáralos con `+` (así los compara la búsqueda de `/identificar`).
- `keywords`: nombres comerciales para encontrar el medicamento por su marca.
- Nunca escribas dosis, ni las palabras "sustituto" o "intercambiable" (la base de datos las rechaza).
  Se habla siempre de **equivalente referencial**.
- `warning`: vacío = aviso por defecto de la tabla.

La búsqueda por foto usa la función `search_medicines` de `supabase/migrations/0003_search_medicines.sql`
(pégala en el SQL Editor después de 0001 y 0002).

## Volver a cargar

Requiere `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run seed -- --dry-run   # solo valida los CSV, no escribe nada
npm run seed                # valida y carga (equivale a: npx tsx scripts/seed-from-csv.ts)
```

Si algún CSV tiene un error de formato, el script indica archivo, línea y columna, y no escribe nada.
La service role key salta RLS: ejecuta el script solo en tu equipo.

## Carga del 20-11-2026 (`data/carga-2026-11-20/`)

Medicamentos (`medicamentos.csv`), equivalencias de Colombia (`equivalencias_colombia.csv`) y rutas para
llegar a Piura (`rutas_llegada.csv`). Requiere las migraciones `0018`, `0019` y `0020`.

```bash
npx tsx scripts/load-carga-2026-11-20.ts --dry-run   # valida (reglas de medicamentos incluidas)
npx tsx scripts/load-carga-2026-11-20.ts             # escribe
```

- Una fila de `medicines` por principio activo; las marcas de Perú van en `brand_names_pe` y en `keywords`
  (junto con las marcas del otro país, para que la foto de un empaque extranjero también encuentre la fila).
- `fuente_marcas_url`, `notas_para_revisar` y el registro INVIMA de ejemplo van a `admin_notes`
  (solo los ve el admin, en la ficha de edición).
- Todo queda publicado y **sin verificar** (`verified_at` vacío): la app muestra «Referencial».
- Antes de cargar las rutas borra las 3 filas de EJEMPLO de `arrival_routes`.
- Puede ejecutarse varias veces: actualiza en lugar de duplicar.

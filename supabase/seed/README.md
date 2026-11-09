# Carga de contenido desde CSV

Los archivos de `data/` son la fuente del contenido de `places` y `transport_routes`.
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

- `places`: por `name` (sin distinguir mayúsculas).
- `transport_routes`: por `code`; si `code` está vacío, por `name`.
- Si la fila tiene `id`, se usa el `id`.

Coincide → se actualiza. No coincide → se inserta. **El script nunca borra filas**: si quitas una fila
del CSV, despublícala con `is_published = false` o bórrala desde el panel de Supabase.
Para **renombrar** un lugar, pon su `id` en la columna `id` (si no, se crea uno nuevo).

## Estado actual de los datos

- Las coordenadas son **aproximadas** y todo está "Pendiente de verificación".
- El hospital y la oficina de Migraciones están con `is_published = false` hasta confirmar su ubicación.
- Las 10 rutas son solo **estructura de ejemplo** (`EJ-01`…`EJ-10`), sin tarifas y sin publicar.

## Medicamentos (`medicines.csv`) — plantilla, aún no se carga

`medicines.csv` tiene las columnas de la tabla `medicines` y 25 medicamentos de venta libre comunes con
**solo** `brand_name_pe` (nombre genérico) y `active_ingredient`. El script `npm run seed` todavía **no** lo lee:
hay que completarlo antes desde fuentes oficiales.

- `equivalent_co`, `where_to_buy`, `source_url` y `verified_at` están vacíos a propósito: complétalos desde
  [DIGEMID](https://opm-digemid.minsa.gob.pe/) (Perú) e [INVIMA](https://www.invima.gov.co/) (Colombia).
- `source_name`, `source_url` y `digemid_url` son obligatorios en la base de datos.
- `active_ingredient`: si hay varios, sepáralos con `+` (así los compara la búsqueda de `/identificar`).
- `keywords`: nombres comerciales para encontrar el medicamento por su marca.
- Nunca escribas dosis, ni las palabras "sustituto" o "intercambiable" (la base de datos las rechaza).
  En Colombia se habla siempre de **equivalente referencial**.
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

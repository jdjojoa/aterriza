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

## Volver a cargar

Requiere `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run seed -- --dry-run   # solo valida los CSV, no escribe nada
npm run seed                # valida y carga (equivale a: npx tsx scripts/seed-from-csv.ts)
```

Si algún CSV tiene un error de formato, el script indica archivo, línea y columna, y no escribe nada.
La service role key salta RLS: ejecuta el script solo en tu equipo.

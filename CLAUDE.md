# Aterriza — reglas permanentes

PWA en español para estudiantes que llegan a Piura, desde otro país o desde otra ciudad del Perú (Lima, Talara, Paita, Chiclayo, Trujillo, Sullana…). Proyecto de una sola persona: todo debe ser gratis.

@AGENTS.md

## Idioma
- Interfaz de usuario: **español**.
- Código, nombres de variables, funciones, archivos y commits: **inglés**.

## Stack fijo (no cambiar sin pedirlo explícitamente)
- Next.js (App Router) + TypeScript + Tailwind CSS, carpeta `src/`, npm.
- Supabase: Auth, Postgres con RLS activado en todas las tablas, Storage.
- Gemini vía `@google/genai`, **solo** en rutas API del servidor (`src/app/api/**`).
- Mapas: Leaflet + OpenStreetMap.
- **Prohibido** añadir servicios de pago o que pidan tarjeta de crédito.

## Secretos
- `GEMINI_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` **nunca** llegan al navegador: sin prefijo `NEXT_PUBLIC_`, nunca se importan en componentes cliente (`"use client"`) y solo se leen en código de servidor.
- Solo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL` pueden ser públicas.

## Contenido y fuentes
- **Medicamentos y tarifas de transporte** (regla de seguridad, no cambiar): fuente obligatoria y se muestran con `SourceBadge` (fuente, enlace, fecha, "Verificado" o "Referencial"). Solo estas tablas (`medicines`, `transport_routes` y `arrival_routes`) tienen verificación en el panel admin.
- **Lugares, platos, jerga y costumbres**: fuente opcional y sin verificación. Sin `SourceBadge` ni textos tipo "Pendiente de verificación"; si la fila tiene `source_url`, solo un enlace discreto "Fuente" (`SourceLink`).
- El contenido generado con IA sigue mostrando `SourceBadge` con `variant="referencial-ia"`.

## Origen del estudiante
- `profiles.origin_type`: `'internacional'` (usa `origin_country`, cualquier país ISO) o `'nacional'` (`origin_country = 'PE'` + `origin_department` y `origin_city` de `peru_locations`). Se elige en el registro ("¿De dónde vienes?") y se edita en `/perfil`.
- **Nunca asumir un país** (ni Colombia ni otro) en código, prompts, textos ni datos por defecto. Usa `profileOrigin()` / `originLabel()` de `src/lib/origin.ts`.
- Lista de países: `Intl.DisplayNames` (`src/lib/countries.ts`), con bandera y moneda ISO 4217 (`COUNTRY_CURRENCY`).
- Nacional: sin convertidor en el inicio (sigue en el menú), sin equivalencias extranjeras, jerga con etiqueta "Piurano" (`slang_terms.is_piurano`) y pestaña "Cómo llegar a Piura" (`arrival_routes`) en `/transporte`.
- Internacional: moneda del país (si la API no la tiene, USD con aviso). Equivalencias solo de su país (tabla `equivalents`); si no hay, "Aún no tenemos equivalencias para {país}" + "Sugerir una" (crea un aporte con categoría `equivalencia`).
- `arrival_routes` lleva tarifas: misma regla que transporte (fuente obligatoria para verificar, `SourceBadge`).

## Aportes y reseñas de la comunidad
- Los aportes se publican al instante (`status = 'approved'` por defecto) y tienen botón "Reportar", igual que las reseñas.
- Con 3 reportes, el aporte o la reseña se oculta y llega a la cola del admin (`/admin/aportes`, `/admin/reportes`). Lo hace la base de datos (trigger `handle_new_report`), no el cliente.
- El autor puede editar o borrar su aporte; editar no cambia su estado.

## Medicamentos
- Nunca dar dosis ni diagnósticos.
- Nunca usar las palabras "sustituto" ni "intercambiable".
- Usar siempre "equivalente referencial", mostrar un aviso y enlazar a DIGEMID.

## UI
- Mobile first (diseñar primero para 360 px de ancho).
- Modo claro y oscuro en cada pantalla.
- Contraste mínimo WCAG AA.

## Colores
- Paleta de marca: azul marino `#00105B`, azul lavanda `#6060B6`, lila `#CAB5E0`, crema `#FCF8EC`.
- Todos los colores viven como variables en `src/app/globals.css` (y `landing.css` para la landing). En los componentes solo se usan los tokens (`bg-primary`, `text-heading`, `text-accent`, `fill-brand-lilac`…); **prohibido** escribir hex o clases de color de Tailwind (`green-*`, `blue-*`…) a mano. Excepciones: banderas de `CurrencyFlag`, logo de Google, y los hex de `manifest.ts`/`layout.tsx`/`public/logo.svg`/`src/app/icon.svg`, que no aceptan variables CSS.
- Modo claro: fondo `#FCF8EC`, superficies blancas, títulos y botón principal `#00105B` con texto `#FCF8EC`, acentos e íconos `#6060B6`, tarjetas destacadas e insignias (`accent-soft`) `#CAB5E0` con texto `#00105B`.
- Modo oscuro: fondo `#000A3D`, superficies `#00105B`, texto `#FCF8EC`, títulos y acentos `#CAB5E0`, botón principal `#6060B6` con texto blanco.
- Si cambias un token, actualízalo también en `scripts/check-contrast.mjs` y ejecuta `npm run check:contrast` (debe pasar todo).
- Tras cambiar el logo o la paleta: `npm run icons` (favicon, icon, apple-icon y PWA), `npm run qr`, y sube `ICONS_VERSION` en `src/app/manifest.ts` y `VERSION` en `public/sw.js`.

## Forma de trabajar
- Cambios pequeños y verificables.
- Al final de cada tarea ejecuta `npm run build` y corrige todos los errores antes de darla por terminada.
- Next.js 16: `middleware.ts` está obsoleto; el punto de entrada es `src/proxy.ts`.
- Trabajo solo. Al terminar cada tarea, commit y push directo a main, salvo que te pida una rama.

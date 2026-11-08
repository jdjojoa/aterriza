# Aterriza — reglas permanentes

PWA en español para estudiantes colombianos que llegan a Piura, Perú. Proyecto de una sola persona: todo debe ser gratis.

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
- Todo contenido muestra **fuente, enlace y fecha de verificación** usando el componente `SourceBadge`.

## Medicamentos
- Nunca dar dosis ni diagnósticos.
- Nunca usar las palabras "sustituto" ni "intercambiable".
- Usar siempre "equivalente referencial", mostrar un aviso y enlazar a DIGEMID.

## UI
- Mobile first (diseñar primero para 360 px de ancho).
- Modo claro y oscuro en cada pantalla.
- Contraste mínimo WCAG AA.

## Forma de trabajar
- Cambios pequeños y verificables.
- Al final de cada tarea ejecuta `npm run build` y corrige todos los errores antes de darla por terminada.
- Next.js 16: `middleware.ts` está obsoleto; el punto de entrada es `src/proxy.ts`.

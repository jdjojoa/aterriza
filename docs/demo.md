# Demo de entrega — Aterriza (18 de noviembre)

Guion de **5 minutos** para la profesora. Se presenta desde el celular (o Chrome con
vista móvil a 360 px) con la app instalada como PWA.

---

## 0. Preparación (el día antes, no durante la demo)

### 0.1 Base de datos

1. En Supabase → SQL Editor, pega y ejecuta **en orden** las migraciones que falten:
   `0003_search_medicines.sql`, `0004_search_foods.sql`, `0005_search_slang.sql`,
   `0006_community.sql`, `0007_content_images.sql`, `0008_tips_author_edit.sql`.
   > En la revisión del 9 de noviembre **no estaban aplicadas**: sin ellas fallan
   > la identificación de medicamentos y comida, la jerga, las reseñas y los aportes.
2. Ejecuta `supabase/tests/check_rls.sql` y confirma:
   - consulta 1 → **0 filas** (todas las tablas con RLS),
   - consulta 3 → **5 funciones** y el bucket `content-images`.
3. Inicia sesión una vez con la cuenta principal y ejecuta `supabase/make_admin.sql`.

### 0.2 Cuentas

| Cuenta | Para qué | Rol |
|---|---|---|
| Cuenta principal (Google) | Toda la demo | `admin` |
| Cuenta secundaria (otro Gmail) | Escribir la reseña que luego se reporta | `user` |

### 0.3 Datos de prueba

| Pantalla | Dato |
|---|---|
| Perfil | País de origen: **Colombia** → Piura |
| Transporte | Ruta **EJ-01 · Centro a UCV** (combi) |
| Lugar con reseña | **Plaza de Armas de Piura** |
| Reseña (cuenta secundaria) | 4 estrellas: «Muy bonita de noche, hay policía y bancas para descansar.» |
| Reseña reportada | La cuenta principal reporta la reseña de la secundaria → motivo «Falso» |
| Medicamento | Caja de **Paracetamol** genérico con el nombre bien visible |
| Medicamento en la base | Desde `/admin/contenido/medicines` crea **Paracetamol** (principio activo `paracetamol`) con fuente y enlace reales de DIGEMID. Sin dosis. |
| Comida | Foto de un **ceviche** (o elegir «Ceviche» en la lista de platos) |
| Chat · pregunta válida | «¿Qué significa "causa" y cómo se dice en Colombia?» |
| Chat · fuera de tema | «¿Me resuelves esta ecuación: 2x + 3 = 7?» |
| Moneda | **50** en el campo S/; luego **100000** en el campo COP |
| Jerga | Buscar **«pata»**, luego **«al toque»** |
| Admin | `/admin/reportes` con el reporte creado arriba |

### 0.4 Cuotas de IA

- Límites diarios por usuario: **20 mensajes de chat** y **5 fotos**.
- Ensaya el día anterior, no la mañana de la demo, para llegar con la cuota completa.
- La cuota diaria se reinicia a las 00:00 (hora de Lima).

### 0.5 Capturas de respaldo (plan B)

Guárdalas en el celular, en un álbum «Aterriza demo», en este orden:

1. `01-identificar-medicamento.png` — resultado de Paracetamol (aviso + botón DIGEMID visibles).
2. `02-identificar-comida.png` — resultado de Ceviche.
3. `03-chat-valido.png` — respuesta sobre «causa» con fuente.
4. `04-chat-fuera-de-tema.png` — «Solo puedo ayudarte con temas para adaptarte a Piura.»

Tómalas en modo claro y oscuro (sirve también para mostrar los dos temas).

---

## 1. Guion (5:00)

| Tiempo | Pantalla | Qué hacer | Qué decir |
|---|---|---|---|
| 0:00–0:30 | **Login** `/` | Tocar «Entrar con Google» con la cuenta principal. | «Aterriza ayuda a estudiantes colombianos que llegan a Piura. Funciona como app instalable y sin costo.» |
| 0:30–0:50 | **Perfil** `/perfil` | Mostrar nombre y país de origen; en el menú del avatar (arriba a la derecha) cambiar el tema a oscuro. | «El perfil guarda de dónde viene el estudiante; toda la app tiene modo claro y oscuro.» |
| 0:50–1:20 | **Transporte** `/transporte` | Tocar la ruta EJ-01; enseñar el mapa y la etiqueta de fuente. | «Cada ruta muestra fuente y fecha de verificación. Lo que no está verificado se marca como pendiente.» |
| 1:20–1:55 | **Lugares** `/lugares` | Abrir Plaza de Armas → bajar a **Reseñas** (se ve la de la cuenta secundaria). | «Los estudiantes dejan reseñas; si alguien reporta una reseña, llega al panel de moderación.» |
| 1:55–2:35 | **Identificar · medicamento** `/identificar` | Tomar foto a la caja de Paracetamol. | «Lee el empaque y lo cruza con nuestra base. Nunca da dosis: muestra un **equivalente referencial**, un aviso y el enlace a DIGEMID.» |
| 2:35–2:55 | **Identificar · comida** | Cambiar a Comida y fotografiar el ceviche (o abrirlo en la lista). | «Explica el plato, alérgenos y su parecido en Colombia.» |
| 2:55–3:40 | **Chat** `/chat` | 1) Pregunta válida sobre «causa». 2) Pregunta fuera de tema (ecuación). | «Responde solo con nuestra información y cita la fuente. Si la pregunta no es sobre adaptarse a Piura, se niega.» |
| 3:40–4:00 | **Moneda** `/moneda` | Escribir 50 en S/; luego 100000 en COP (convierte en ambos sentidos). | «Tasa del día con su fuente y hora de actualización.» |
| 4:00–4:20 | **Jerga** `/jerga` | Buscar «pata» y «al toque». | «Jerga piurana con su equivalente colombiano.» |
| 4:20–5:00 | **Admin** `/admin/reportes` | Abrir el reporte; ocultar la reseña o descartar el reporte. | «El administrador modera reportes y edita el contenido. Todo protegido con RLS en Supabase.» |

---

## 2. Si algo falla

### Gemini devuelve 429 / «El asistente está muy ocupado, intenta en un minuto»

1. **No reintentes más de una vez** (cada intento puede gastar cuota).
2. Di: «Usamos la capa gratuita de Gemini, que limita las peticiones por minuto. La app
   lo detecta y muestra este mensaje en lugar de fallar. Les muestro el resultado que
   obtuve al probarlo.»
3. Abre el álbum «Aterriza demo» y enseña la captura correspondiente (01–04).
4. Sigue con la pantalla siguiente del guion; las pantallas de transporte, lugares,
   moneda, jerga y admin no usan Gemini.

### Otros

| Problema | Plan |
|---|---|
| Se acabó la cuota diaria («Ya usaste tus … de hoy») | Igual que el 429: explica el límite diario y usa las capturas. |
| Sin internet | Usar datos móviles. Si no hay, la app muestra `/offline`; enseñar capturas. |
| La reseña o el reporte no aparecen | Verifica que la migración `0006_community.sql` esté aplicada (`check_rls.sql`, consulta 3). |
| No aparece `/admin` | Ejecuta `supabase/make_admin.sql` y vuelve a iniciar sesión. |
| La foto no se lee | Mensaje «No pude leer el empaque…»: acercar la cámara al nombre y repetir una vez; si no, captura 01. |

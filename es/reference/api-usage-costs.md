---
summary: "Audita qué puede gastar dinero, qué claves se usan y cómo ver el uso"
read_when:
  - Quieres entender qué funciones pueden llamar a APIs de pago
  - Necesitas auditar claves, costes y visibilidad del uso
  - Estás explicando los informes de costes de /status o /usage
title: "Uso y costes de la API"
---

# Uso y costes de la API

Este documento enumera **funciones que pueden invocar claves de API** y dónde aparecen sus costes. Se centra en
las funciones de OpenClaw que pueden generar uso del proveedor o llamadas a APIs de pago.

## Dónde aparecen los costes (chat + CLI)

**Instantánea de costes por sesión**

- `/status` muestra el modelo de la sesión actual, el uso del contexto y los tokens de la última respuesta.
- Si el modelo usa **autenticación por clave de API**, `/status` también muestra el **coste estimado** para la última respuesta.

**Pie de coste por mensaje**

- `/usage full` añade un pie de uso a cada respuesta, incluyendo el **coste estimado** (solo clave de API).
- `/usage tokens` muestra solo los tokens; los flujos de OAuth ocultan el coste en dólares.

**Ventanas de uso de la CLI (cuotas del proveedor)**

- `openclaw status --usage` y `openclaw channels list` muestran las **ventanas de uso** del proveedor
  (instantáneas de cuota, no costes por mensaje).

Consulta [Uso de tokens y costes](/es/reference/token-use) para ver detalles y ejemplos.

## Cómo se descubren las claves

OpenClaw puede obtener las credenciales de:

- **Perfiles de autenticación** (por agente, almacenados en `auth-profiles.json`).
- **Variables de entorno** (p. ej. `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuración** (`models.providers.*.apiKey`, `tools.web.search.*`, `tools.web.fetch.firecrawl.*`,
  `memorySearch.*`, `talk.apiKey`).
- **Habilidades** (`skills.entries.<name>.apiKey`) que pueden exportar claves al entorno de proceso de la habilidad.

## Funciones que pueden gastar claves

### 1) Respuestas del modelo principal (chat + herramientas)

Cada respuesta o llamada a herramienta utiliza el **proveedor de modelo actual** (OpenAI, Anthropic, etc.). Esta es la
fuente principal de uso y coste.

Consulta [Modelos](/es/providers/models) para la configuración de precios y [Uso de tokens y costes](/es/reference/token-use) para su visualización.

### 2) Comprensión de medios (audio/imagen/vídeo)

Los medios entrantes se pueden resumir/transcribir antes de que se ejecute la respuesta. Esto utiliza las API del modelo/proveedor.

- Audio: OpenAI / Groq / Deepgram (ahora **habilitado automáticamente** cuando existen claves).
- Imagen: OpenAI / Anthropic / Google.
- Video: Google.

Consulte [Comprensión de medios](/es/nodes/media-understanding).

### 3) Incrustaciones de memoria + búsqueda semántica

La búsqueda de memoria semántica utiliza **API de incrustación** cuando se configura para proveedores remotos:

- `memorySearch.provider = "openai"` → Incrustaciones de OpenAI
- `memorySearch.provider = "gemini"` → Incrustaciones de Gemini
- `memorySearch.provider = "voyage"` → Incrustaciones de Voyage
- `memorySearch.provider = "mistral"` → Incrustaciones de Mistral
- `memorySearch.provider = "ollama"` → Incrustaciones de Ollama (local/autoalojado; generalmente sin facturación de API alojada)
- Respaldo opcional a un proveedor remoto si las incrustaciones locales fallan

Puede mantenerlo localmente con `memorySearch.provider = "local"` (sin uso de API).

Consulte [Memoria](/es/concepts/memory).

### 4) Herramienta de búsqueda web

`web_search` utiliza claves de API y puede generar cargos por uso dependiendo de su proveedor:

- **API de Brave Search**: `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
- **API de Perplexity Search**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`

Las rutas de proveedor heredadas `tools.web.search.*` todavía se cargan a través del shim de compatibilidad temporal, pero ya no son la superficie de configuración recomendada.

**Crédito gratuito de Brave Search:** Cada plan de Brave incluye $5/mes en crédito gratuito renovable. El plan de búsqueda cuesta $5 por 1,000 solicitudes, por lo que el crédito cubre 1,000 solicitudes/mes sin costo. Establezca su límite de uso en el panel de Brave para evitar cargos inesperados.

Consulte [Herramientas web](/es/tools/web).

### 5) Herramienta de recuperación web (Firecrawl)

`web_fetch` puede llamar a **Firecrawl** cuando hay una clave de API presente:

- `FIRECRAWL_API_KEY` o `tools.web.fetch.firecrawl.apiKey`

Si Firecrawl no está configurado, la herramienta recurre a una obtención directa + legibilidad (sin API de pago).

Consulte [Web tools](/es/tools/web).

### 6) Instantáneas de uso del proveedor (estado/salud)

Algunos comandos de estado llaman a **endpoints de uso del proveedor** para mostrar las ventanas de cuota o el estado de autenticación.
Estas son típicamente llamadas de bajo volumen, pero aun así golpean las APIs de los proveedores:

- `openclaw status --usage`
- `openclaw models status --json`

Consulte [Models CLI](/es/cli/models).

### 7) Resumen de protección de compactación

La protección de compactación puede resumir el historial de la sesión usando el **modelo actual**, lo cual
invoca a las APIs del proveedor cuando se ejecuta.

Consulte [Session management + compaction](/es/reference/session-management-compaction).

### 8) Escaneo / prueba de modelo

`openclaw models scan` puede probar modelos de OpenRouter y usa `OPENROUTER_API_KEY` cuando
la prueba está habilitada.

Consulte [Models CLI](/es/cli/models).

### 9) Hablar (voz)

El modo Talk puede invocar **ElevenLabs** cuando está configurado:

- `ELEVENLABS_API_KEY` o `talk.apiKey`

Consulte [Talk mode](/es/nodes/talk).

### 10) Habilidades (APIs de terceros)

Las habilidades pueden almacenar `apiKey` en `skills.entries.<name>.apiKey`. Si una habilidad usa esa clave para APIs
externas, puede incurrir en costos de acuerdo con el proveedor de la habilidad.

Consulte [Skills](/es/tools/skills).

import en from "/components/footer/en.mdx";

<en />

---
summary: "Audita qué puede gastar dinero, qué claves se usan y cómo ver el uso"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "Uso y costes de la API"
---

# Uso y costes de la API

Este documento lista las **características que pueden invocar claves de API** y dónde aparecen sus costes. Se centra en
las características de OpenClaw que pueden generar uso del proveedor o llamadas a APIs de pago.

## Dónde aparecen los costes (chat + CLI)

**Instantánea de costes por sesión**

- `/status` muestra el modelo de la sesión actual, el uso del contexto y los tokens de la última respuesta.
- Si el modelo usa **autenticación por clave de API**, `/status` también muestra el **coste estimado** de la última respuesta.

**Pie de página de costes por mensaje**

- `/usage full` añade un pie de página de uso a cada respuesta, incluyendo el **coste estimado** (solo clave de API).
- `/usage tokens` muestra solo tokens; los flujos de OAuth ocultan el coste en dólares.

**Ventanas de uso de la CLI (cuotas del proveedor)**

- `openclaw status --usage` y `openclaw channels list` muestran las **ventanas de uso** del proveedor
  (instantáneas de cuota, no costes por mensaje).

Consulta [Uso de tokens y costes](/es/reference/token-use) para obtener detalles y ejemplos.

## Cómo se descubren las claves

OpenClaw puede obtener las credenciales de:

- **Perfiles de autenticación** (por agente, almacenados en `auth-profiles.json`).
- **Variables de entorno** (por ej. `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuración** (`models.providers.*.apiKey`, `tools.web.search.*`, `tools.web.fetch.firecrawl.*`,
  `memorySearch.*`, `talk.apiKey`).
- **Habilidades** (`skills.entries.<name>.apiKey`) que pueden exportar claves al entorno de proceso de la habilidad.

## Características que pueden gastar claves

### 1) Respuestas del modelo principal (chat + herramientas)

Cada respuesta o llamada a herramienta utiliza el **proveedor de modelo actual** (OpenAI, Anthropic, etc.). Esta es la
fuente principal de uso y coste.

Consulta [Modelos](/es/providers/models) para la configuración de precios y [Uso de tokens y costes](/es/reference/token-use) para su visualización.

### 2) Comprensión de medios (audio/imagen/vídeo)

Los medios entrantes pueden resumirse/transcribirse antes de que se ejecute la respuesta. Esto utiliza las APIs del modelo/proveedor.

- Audio: OpenAI / Groq / Deepgram (ahora **habilitado automáticamente** cuando existen claves).
- Imagen: OpenAI / Anthropic / Google.
- Video: Google.

Consulte [Comprensión multimedia](/es/nodes/media-understanding).

### 3) Incrustaciones de memoria + búsqueda semántica

La búsqueda de memoria semántica utiliza **API de incrustación** cuando se configura para proveedores remotos:

- `memorySearch.provider = "openai"` → incrustaciones de OpenAI
- `memorySearch.provider = "gemini"` → incrustaciones de Gemini
- `memorySearch.provider = "voyage"` → incrustaciones de Voyage
- `memorySearch.provider = "mistral"` → incrustaciones de Mistral
- `memorySearch.provider = "ollama"` → incrustaciones de Ollama (local/autohospedado; generalmente sin facturación de API alojada)
- Retorno opcional a un proveedor remoto si las incrustaciones locales fallan

Puede mantenerlo localmente con `memorySearch.provider = "local"` (sin uso de API).

Consulte [Memoria](/es/concepts/memory).

### 4) Herramienta de búsqueda web

`web_search` utiliza claves de API y puede incurrir en cargos de uso dependiendo de su proveedor:

- **API de Brave Search**: `BRAVE_API_KEY` o `tools.web.search.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` o `tools.web.search.gemini.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` o `tools.web.search.grok.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY` o `tools.web.search.kimi.apiKey`
- **API de Perplexity Search**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `tools.web.search.perplexity.apiKey`

**Crédito gratuito de Brave Search:** Cada plan de Brave incluye $5/mes en crédito gratuito
renovable. El plan de búsqueda cuesta $5 por 1000 solicitudes, por lo que el crédito cubre
1000 solicitudes/mes sin costo. Establezca su límite de uso en el panel de Brave
para evitar cargos inesperados.

Consulte [Herramientas web](/es/tools/web).

### 5) Herramienta de obtención web (Firecrawl)

`web_fetch` puede llamar a **Firecrawl** cuando hay una clave de API presente:

- `FIRECRAWL_API_KEY` o `tools.web.fetch.firecrawl.apiKey`

Si Firecrawl no está configurado, la herramienta vuelve a la obtención directa + legibilidad (sin API de pago).

Consulte [Herramientas web](/es/tools/web).

### 6) Instantáneas de uso del proveedor (estado/salud)

Algunos comandos de estado llaman a **endpoints de uso del proveedor** para mostrar ventanas de cuota o el estado de autenticación.
Estas suelen ser llamadas de bajo volumen pero aún así alcanzan las APIs del proveedor:

- `openclaw status --usage`
- `openclaw models status --json`

Consulte [CLI de modelos](/es/cli/models).

### 7) Resumen de salvaguarda de compactación

La salvaguarda de compactación puede resumir el historial de la sesión usando el **modelo actual**, lo que
invoca las APIs del proveedor cuando se ejecuta.

Consulte [Gestión de sesiones + compactación](/es/reference/session-management-compaction).

### 8) Escaneo / sondeo de modelo

`openclaw models scan` puede sondear modelos de OpenRouter y usa `OPENROUTER_API_KEY` cuando
el sondeo está habilitado.

Consulte [CLI de modelos](/es/cli/models).

### 9) Hablar (voz)

El modo de habla puede invocar **ElevenLabs** cuando está configurado:

- `ELEVENLABS_API_KEY` o `talk.apiKey`

Consulte [Modo de habla](/es/nodes/talk).

### 10) Habilidades (APIs de terceros)

Las habilidades pueden almacenar `apiKey` en `skills.entries.<name>.apiKey`. Si una habilidad usa esa clave para APIs
externas, puede incurrir en costos según el proveedor de la habilidad.

Consulte [Habilidades](/es/tools/skills).

import es from "/components/footer/es.mdx";

<es />

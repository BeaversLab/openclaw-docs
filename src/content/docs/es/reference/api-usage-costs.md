---
summary: "Audita qué puede gastar dinero, qué claves se usan y cómo ver el uso"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You're explaining /status or /usage cost reporting
title: "Uso de la API y costos"
---

Este documento lista las **características que pueden invocar claves de API** y dónde aparecen sus costos. Se centra en las características de OpenClaw que pueden generar uso del proveedor o llamadas a API de pago.

## Dónde aparecen los costos (chat + CLI)

**Instantánea de costos por sesión**

- `/status` muestra el modelo de la sesión actual, el uso del contexto y los tokens de la última respuesta.
- Si el modelo usa **autenticación por clave de API**, `/status` también muestra el **costo estimado** para la última respuesta.
- Si los metadatos de la sesión en vivo son escasos, `/status` puede recuperar los contadores de tokens/caché y la etiqueta del modelo de ejecución activo a partir de la entrada de uso de la transcripción más reciente. Los valores en vivo distintos de cero existentes todavía tienen prioridad, y los totales de la transcripción del tamaño del prompt pueden prevailcer cuando los totales almacenados faltan o son menores.

**Pie de página de costes por mensaje**

- `/usage full` añade un pie de página de uso a cada respuesta, incluyendo el **costo estimado** (solo para clave de API).
- `/usage tokens` muestra solo los tokens; los flujos de suscripción tipo OAuth/token y la CLI ocultan el costo en dólares.
- Nota de la CLI de Gemini: cuando la CLI devuelve salida JSON, OpenClaw lee el uso de `stats`, normaliza `stats.cached` en `cacheRead` y deriva los tokens de entrada de `stats.input_tokens - stats.cached` cuando es necesario.

Nota de Anthropic: el personal de Anthropic nos indicó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata el reuso de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración, a menos que Anthropic publique una nueva política. Anthropic todavía no expone una estimación en dólares por mensaje que OpenClaw pueda mostrar en `/usage full`.

**Ventanas de uso de la CLI (cuotas del proveedor)**

- `openclaw status --usage` y `openclaw channels list` muestran las **ventanas de uso** del proveedor (instantáneas de cuota, no costos por mensaje).
- La salida legible por humanos se normaliza a `X% left` entre proveedores.
- Proveedores de ventana de uso actuales: Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi y z.ai.
- Nota de MiniMax: sus campos `usage_percent` / `usagePercent` sin procesar significan cuota
  restante, por lo que OpenClaw los invierte antes de mostrarlos. Los campos basados en recuentos tienen prioridad
  cuando están presentes. Si el proveedor devuelve `model_remains`, OpenClaw prefiere la
  entrada del modelo de chat, deriva la etiqueta de la ventana de las marcas de tiempo cuando es necesario y
  incluye el nombre del modelo en la etiqueta del plan.
- La autenticación de uso para esas ventanas de cuota proviene de enlaces específicos del proveedor cuando
  están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales OAuth/API-key
  de los perfiles de autenticación, las variables de entorno o la configuración.

Consulte [Uso de tokens y costos](/es/reference/token-use) para obtener detalles y ejemplos.

## Cómo se descubren las claves

OpenClaw puede obtener las credenciales de:

- **Perfiles de autenticación** (por agente, almacenados en `auth-profiles.json`).
- **Variables de entorno** (por ejemplo, `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuración** (`models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`,
  `plugins.entries.firecrawl.config.webFetch.apiKey`, `memorySearch.*`,
  `talk.providers.*.apiKey`).
- **Habilidades** (`skills.entries.<name>.apiKey`) que pueden exportar claves al entorno del proceso de la habilidad.

## Funciones que pueden consumir claves

### 1) Respuestas del modelo principal (chat + herramientas)

Cada respuesta o llamada a herramienta utiliza el **proveedor de modelos actual** (OpenAI, Anthropic, etc.). Esta es la
fuente principal de uso y costo.

Esto también incluye proveedores alojados de estilo de suscripción que aún cobran fuera de
la interfaz de usuario local de OpenClaw, como **OpenAI Codex**, **Plan de codificación de Alibaba Cloud Model Studio**, **Plan de codificación de MiniMax**, **Plan de codificación de Z.AI / GLM**, y
la ruta de inicio de sesión de OpenClaw Claude de Anthropic con **Uso adicional** habilitado.

Consulte [Modelos](/es/providers/models) para la configuración de precios y [Uso de tokens y costos](/es/reference/token-use) para su visualización.

### 2) Comprensión de medios (audio/imagen/video)

Los medios entrantes se pueden resumir/transcribir antes de que se ejecute la respuesta. Esto utiliza las API del modelo/proveedor.

- Audio: OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral.
- Imagen: OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI.
- Video: Google / Qwen / Moonshot.

Consulte [Comprensión de medios](/es/nodes/media-understanding).

### 3) Generación de imágenes y videos

Las capacidades de generación compartidas también pueden consumir claves de proveedores:

- Generación de imágenes: OpenAI / Google / DeepInfra / fal / MiniMax
- Generación de videos: DeepInfra / Qwen

La generación de imágenes puede inferir un proveedor predeterminado con autenticación cuando
`agents.defaults.imageGenerationModel` no está configurado. La generación de videos actualmente
requiere un `agents.defaults.videoGenerationModel` explícito, como
`qwen/wan2.6-t2v`.

Consulte [Generación de imágenes](/es/tools/image-generation), [Qwen Cloud](/es/providers/qwen)
y [Modelos](/es/concepts/models).

### 4) Incrustaciones de memoria + búsqueda semántica

La búsqueda de memoria semántica utiliza **API de incrustaciones** cuando se configura para proveedores remotos:

- `memorySearch.provider = "openai"` → Incrustaciones de OpenAI
- `memorySearch.provider = "gemini"` → Incrustaciones de Gemini
- `memorySearch.provider = "voyage"` → Incrustaciones de Voyage
- `memorySearch.provider = "mistral"` → Incrustaciones de Mistral
- `memorySearch.provider = "deepinfra"` → Incrustaciones de DeepInfra
- `memorySearch.provider = "lmstudio"` → Incrustaciones de LM Studio (local/autoalojado)
- `memorySearch.provider = "ollama"` → Incrustaciones de Ollama (local/autoalojado; generalmente sin facturación de API alojada)
- Retorno opcional a un proveedor remoto si las incrustaciones locales fallan

Puede mantenerlo localmente con `memorySearch.provider = "local"` (sin uso de API).

Consulte [Memoria](/es/concepts/memory).

### 5) Herramienta de búsqueda web

`web_search` puede incurrir en cargos de uso dependiendo de su proveedor:

- **API de Brave Search**: `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**: `EXA_API_KEY` o `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**: `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY` o `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**: sin clave para un host local de Ollama conectado y accesible; la búsqueda directa `https://ollama.com` usa `OLLAMA_API_KEY`, y los hosts protegidos con autenticación pueden reutilizar la autenticación de portador normal del proveedor Ollama
- **Perplexity Search API**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**: `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**: retorno sin clave (sin facturación de API, pero no oficial y basado en HTML)
- **SearXNG**: `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl` (sin clave/autoalojado; sin facturación de API alojada)

Las rutas del proveedor heredadas `tools.web.search.*` aún se cargan a través de la capa de compatibilidad temporal, pero ya no son la superficie de configuración recomendada.

**Crédito gratuito de Brave Search:** Cada plan de Brave incluye $5/mes en crédito gratuito renovable. El plan de búsqueda cuesta $5 por 1000 solicitudes, por lo que el crédito cubre 1000 solicitudes/mes sin costo. Establezca su límite de uso en el panel de Brave para evitar cargos inesperados.

Consulte [Web tools](/es/tools/web).

### 5) Herramienta de recuperación web (Firecrawl)

`web_fetch` puede llamar a **Firecrawl** cuando hay una clave de API presente:

- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webFetch.apiKey`

Si Firecrawl no está configurado, la herramienta vuelve a la obtención directa más el complemento `web-readability` incluido (sin API de pago). Desactive `plugins.entries.web-readability.enabled` para omitir la extracción local de Readability.

Consulte [Web tools](/es/tools/web).

### 6) Instantáneas de uso del proveedor (estado/salud)

Algunos comandos de estado llaman a **endpoints de uso del proveedor** para mostrar ventanas de cuota o estado de autenticación. Por lo general, son llamadas de bajo volumen pero aún así golpean las API de los proveedores:

- `openclaw status --usage`
- `openclaw models status --json`

Consulte [Models CLI](/es/cli/models).

### 7) Resumen de protección de compactación

El mecanismo de protección de compactación puede resumir el historial de la sesión utilizando el **modelo actual**, lo cual
invoca las APIs del proveedor cuando se ejecuta.

Consulte [Session management + compaction](/es/reference/session-management-compaction).

### 8) Escaneo / sondeo de modelo

`openclaw models scan` puede sondear modelos de OpenRouter y usa `OPENROUTER_API_KEY` cuando
el sondeo está habilitado.

Consulte [Models CLI](/es/cli/models).

### 9) Talk (voz)

El modo Talk puede invocar **ElevenLabs** cuando está configurado:

- `ELEVENLABS_API_KEY` o `talk.providers.elevenlabs.apiKey`

Consulte [Talk mode](/es/nodes/talk).

### 10) Habilidades (APIs de terceros)

Las habilidades pueden almacenar `apiKey` en `skills.entries.<name>.apiKey`. Si una habilidad usa esa clave para APIs externas,
puede incurrir en costos según el proveedor de la habilidad.

Consulte [Skills](/es/tools/skills).

## Relacionado

- [Token use and costs](/es/reference/token-use)
- [Prompt caching](/es/reference/prompt-caching)
- [Usage tracking](/es/concepts/usage-tracking)

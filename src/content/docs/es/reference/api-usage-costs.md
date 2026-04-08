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
- Si los metadatos de la sesión en vivo son escasos, `/status` puede recuperar los contadores de tokens/caché y la etiqueta del modelo de tiempo de ejecución activo desde la entrada de uso de la transcripción más reciente. Los valores en vivo existentes distintos de cero siguen teniendo prioridad, y los totales de transcripción del tamaño del prompt pueden prevalecer cuando los totales almacenados faltan o son menores.

**Pie de página de costo por mensaje**

- `/usage full` añade un pie de página de uso a cada respuesta, incluyendo el **costo estimado** (solo clave de API).
- `/usage tokens` muestra solo los tokens; los flujos de tipo suscripción OAuth/token y CLI ocultan el costo en dólares.
- Nota de CLI Gemini: cuando la CLI devuelve una salida JSON, OpenClaw lee el uso desde `stats`, normaliza `stats.cached` en `cacheRead` y deriva los tokens de entrada de `stats.input_tokens - stats.cached` cuando es necesario.

Nota de Anthropic: la documentación pública de Claude Code de Anthropic todavía incluye el uso directo de la terminal Claude Code en los límites del plan Claude. Por separado, Anthropic informó a los usuarios de OpenClaw que a partir del **4 de abril de 2026 a las 12:00 PM PT / 8:00 PM BST**, la ruta de inicio de sesión de Claude de **OpenClaw** cuenta como uso de arnés de terceros y requiere **Uso Adicional** facturado por separado de la suscripción. Anthropic no expone una estimación en dólares por mensaje que OpenClaw pueda mostrar en `/usage full`.

**Ventanas de uso de la CLI (cuotas del proveedor)**

- `openclaw status --usage` y `openclaw channels list` muestran las **ventanas de uso** del proveedor (instantáneas de cuota, no costos por mensaje).
- La salida humana se normaliza a `X% left` entre proveedores.
- Proveedores actuales de ventanas de uso: Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi y z.ai.
- Nota de MiniMax: sus campos `usage_percent` / `usagePercent` sin procesar significan cuota restante, por lo que OpenClaw los invierte antes de mostrarlos. Los campos basados en recuento aún prevalecen cuando están presentes. Si el proveedor devuelve `model_remains`, OpenClaw prefiere la entrada del modelo de chat, deriva la etiqueta de la ventana de las marcas de tiempo cuando es necesario e incluye el nombre del modelo en la etiqueta del plan.
- La autenticación de uso para esas ventanas de cuota proviene de enlaces específicos del proveedor cuando están disponibles; de lo contrario, OpenClaw recurre a hacer coincidir las credenciales de OAuth/API-key de los perfiles de autenticación, las variables de entorno o la configuración.

Consulte [Uso y costos de tokens](/en/reference/token-use) para obtener detalles y ejemplos.

## Cómo se descubren las claves

OpenClaw puede obtener credenciales de:

- **Perfiles de autenticación** (por agente, almacenados en `auth-profiles.json`).
- **Variables de entorno** (por ejemplo, `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuración** (`models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`,
  `plugins.entries.firecrawl.config.webFetch.apiKey`, `memorySearch.*`,
  `talk.providers.*.apiKey`).
- **Habilidades** (`skills.entries.<name>.apiKey`) que pueden exportar claves al entorno de proceso de la habilidad.

## Funciones que pueden consumir claves

### 1) Respuestas del modelo principal (chat + herramientas)

Cada respuesta o llamada a herramienta utiliza el **proveedor del modelo actual** (OpenAI, Anthropic, etc.). Esta es la principal fuente de uso y costo.

Esto también incluye proveedores alojados de tipo suscripción que aún cobran fuera de la interfaz de usuario local de OpenClaw, como **OpenAI Codex**, **Alibaba Cloud Model Studio
Coding Plan**, **MiniMax Coding Plan**, **Z.AI / GLM Coding Plan**,
y la ruta de inicio de sesión de Claude de OpenClaw de Anthropic con **Extra Usage** habilitado.

Consulte [Modelos](/en/providers/models) para la configuración de precios y [Uso y costos de tokens](/en/reference/token-use) para su visualización.

### 2) Comprensión de medios (audio/imagen/vídeo)

Los medios entrantes pueden resumirse/transcribirse antes de que se ejecute la respuesta. Esto utiliza las API del modelo/proveedor.

- Audio: OpenAI / Groq / Deepgram / Google / Mistral.
- Imagen: OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI.
- Vídeo: Google / Qwen / Moonshot.

Consulte [Comprensión de medios](/en/nodes/media-understanding).

### 3) Generación de imágenes y vídeos

Las capacidades de generación compartidas también pueden gastar claves de proveedor:

- Generación de imágenes: OpenAI / Google / fal / MiniMax
- Generación de vídeo: Qwen

La generación de imágenes puede inferir un proveedor predeterminado con respaldo de autenticación cuando
`agents.defaults.imageGenerationModel` no está establecido. La generación de vídeo actualmente
requiere un `agents.defaults.videoGenerationModel` explícito, como
`qwen/wan2.6-t2v`.

Consulte [Generación de imágenes](/en/tools/image-generation), [Qwen Cloud](/en/providers/qwen)
y [Modelos](/en/concepts/models).

### 4) Incrustaciones de memoria + búsqueda semántica

La búsqueda de memoria semántica utiliza **API de incrustaciones** cuando se configura para proveedores remotos:

- `memorySearch.provider = "openai"` → incrustaciones de OpenAI
- `memorySearch.provider = "gemini"` → incrustaciones de Gemini
- `memorySearch.provider = "voyage"` → incrustaciones de Voyage
- `memorySearch.provider = "mistral"` → incrustaciones de Mistral
- `memorySearch.provider = "ollama"` → incrustaciones de Ollama (local/autoalojado; generalmente sin facturación de API alojada)
- Retorno opcional a un proveedor remoto si las incrustaciones locales fallan

Puede mantenerlo localmente con `memorySearch.provider = "local"` (sin uso de API).

Consulte [Memoria](/en/concepts/memory).

### 5) Herramienta de búsqueda web

`web_search` puede generar cargos por uso dependiendo de su proveedor:

- **API de Brave Search**: `BRAVE_API_KEY` o `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**: `EXA_API_KEY` o `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**: `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Búsqueda de Google)**: `GEMINI_API_KEY` o `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` o `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY` o `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY` o `plugins.entries.minimax.config.webSearch.apiKey`
- **Búsqueda web de Ollama**: sin clave por defecto, pero requiere un host Ollama accesible más `ollama signin`; también puede reutilizar la autenticación de portador del proveedor Ollama normal cuando el host lo requiere
- **API de Perplexity Search**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY` o `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**: `TAVILY_API_KEY` o `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**: alternativa sin clave (sin facturación de API, pero no oficial y basada en HTML)
- **SearXNG**: `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl` (sin clave/autohospedado; sin facturación de API alojada)

Las rutas de proveedor heredadas `tools.web.search.*` todavía se cargan a través de la capa de compatibilidad temporal, pero ya no son la superficie de configuración recomendada.

**Crédito gratuito de Brave Search:** Cada plan de Brave incluye 5$/mes en
crédito gratuito renovable. El plan de Search cuesta 5$ por cada 1000 solicitudes, por lo que el crédito cubre
1000 solicitudes/mes sin costo. Establezca su límite de uso en el panel de Brave
para evitar cargos inesperados.

Consulte [Herramientas web](/en/tools/web).

### 5) Herramienta de obtención web (Firecrawl)

`web_fetch` puede llamar a **Firecrawl** cuando hay una clave API presente:

- `FIRECRAWL_API_KEY` o `plugins.entries.firecrawl.config.webFetch.apiKey`

Si Firecrawl no está configurado, la herramienta recurre a la obtención directa + legibilidad (sin API de pago).

Consulte [Herramientas web](/en/tools/web).

### 6) Instantáneas de uso del proveedor (estado/salud)

Algunos comandos de estado llaman a **endpoints de uso del proveedor** para mostrar ventanas de cuota o el estado de autenticación.
Estas suelen ser llamadas de bajo volumen pero aún así llegan a las APIs de los proveedores:

- `openclaw status --usage`
- `openclaw models status --json`

Consulte [CLI de modelos](/en/cli/models).

### 7) Resumen de seguridad de compactación

La seguridad de compactación puede resumir el historial de la sesión usando el **modelo actual**, lo que
invoca las APIs del proveedor cuando se ejecuta.

Consulte [Gestión de sesiones + compactación](/en/reference/session-management-compaction).

### 8) Escaneo / sondeo de modelo

`openclaw models scan` puede sondear modelos de OpenRouter y usa `OPENROUTER_API_KEY` cuando
el sondeo está habilitado.

Consulte [CLI de modelos](/en/cli/models).

### 9) Hablar (voz)

El modo de hablar puede invocar **ElevenLabs** cuando está configurado:

- `ELEVENLABS_API_KEY` o `talk.providers.elevenlabs.apiKey`

Consulte [Modo de hablar](/en/nodes/talk).

### 10) Habilidades (APIs de terceros)

Las habilidades pueden almacenar `apiKey` en `skills.entries.<name>.apiKey`. Si una habilidad usa esa clave para APIs
externas, puede incurrir en costos según el proveedor de la habilidad.

Consulte [Habilidades](/en/tools/skills).

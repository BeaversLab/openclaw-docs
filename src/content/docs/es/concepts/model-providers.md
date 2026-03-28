---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo + flujos de CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Proveedores de modelos"
---

# Proveedores de modelos

Esta página cubre **proveedores de modelos/LLM** (no canales de chat como WhatsApp/Telegram).
Para ver las reglas de selección de modelos, consulte [/concepts/models](/es/concepts/models).

## Reglas rápidas

- Las referencias de modelo usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
- Si configura `agents.defaults.models`, se convierte en la lista de permitidos.
- Auxiliares de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Los complementos del proveedor pueden inyectar catálogos de modelos a través de `registerProvider({ catalog })`;
  OpenClaw combina esa salida en `models.providers` antes de escribir
  `models.json`.
- Los manifiestos de proveedores pueden declarar `providerAuthEnvVars` para que las sondas de autenticación genéricas basadas en variables de entorno no necesiten cargar el tiempo de ejecución del complemento. El mapa central restante de variables de entorno ahora es solo para proveedores centrales/no complementarios y algunos casos de precedencia genérica, como la incorporación de Anthropic con prioridad de clave de API.
- Los complementos del proveedor también pueden poseer el comportamiento del tiempo de ejecución del proveedor a través de
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`,
  `refreshOAuth`, `buildAuthDoctorHint`,
  `isCacheTtlEligible`, `buildMissingAuthMessage`,
  `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`,
  `supportsXHighThinking`, `resolveDefaultThinkingLevel`,
  `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth` y
  `fetchUsageSnapshot`.
- Nota: el tiempo de ejecución del proveedor `capabilities` son metadatos compartidos del ejecutor (familia
  del proveedor, peculiaridades de transcripción/herramientas, sugerencias de transporte/caché). No es lo
  mismo que el [modelo de capacidad pública](/es/plugins/architecture#public-capability-model)
  que describe lo que un complemento registra (inferencia de texto, voz, etc.).

## Comportamiento del proveedor propiedad del complemento

Los complementos del proveedor ahora pueden poseer la mayor parte de la lógica específica del proveedor, mientras que OpenClaw mantiene
el bucle de inferencia genérico.

División típica:

- `auth[].run` / `auth[].runNonInteractive`: el proveedor posee los flujos de incorporación/inicio de sesión
  para `openclaw onboard`, `openclaw models auth` y la configuración headless
- `wizard.setup` / `wizard.modelPicker`: el proveedor posee las etiquetas de elección de autenticación,
  alias heredados, sugerencias de lista de permitidos de incorporación y entradas de configuración en los selectores de incorporación/modelos
- `catalog`: el proveedor aparece en `models.providers`
- `resolveDynamicModel`: el proveedor acepta identificadores de modelo que aún no están presentes en el
  catálogo estático local
- `prepareDynamicModel`: el proveedor necesita una actualización de metadatos antes de volver a intentar
  la resolución dinámica
- `normalizeResolvedModel`: el proveedor necesita reescrituras de transporte o URL base
- `capabilities`: el proveedor publica peculiaridades de transcripción/herramientas/familia del proveedor
- `prepareExtraParams`: el proveedor establece valores predeterminados o normaliza los parámetros de solicitud por modelo
- `wrapStreamFn`: el proveedor aplica encabezados de solicitud/cuerpo/envoltorios de compatibilidad de modelo
- `formatApiKey`: el proveedor formatea los perfiles de autenticación almacenados en la cadena
  `apiKey` de tiempo de ejecución esperada por el transporte
- `refreshOAuth`: el proveedor posee la actualización de OAuth cuando los actualizadores compartidos `pi-ai`
  no son suficientes
- `buildAuthDoctorHint`: el proveedor añade orientación de reparación cuando falla la actualización de OAuth
- `isCacheTtlEligible`: el proveedor decide qué identificadores de modelo ascendente admiten el TTL de caché de solicitudes
- `buildMissingAuthMessage`: el proveedor reemplaza el error genérico de auth-store
  con un consejo de recuperación específico del proveedor
- `suppressBuiltInModel`: el proveedor oculta las filas obsoletas de origen y puede devolver un
  error propiedad del proveedor para fallos de resolución directa
- `augmentModelCatalog`: el proveedor añade filas de catálogo sintéticas/finales después
  del descubrimiento y la fusión de la configuración
- `isBinaryThinking`: el proveedor es propietario de la experiencia de usuario de pensamiento binario on/off
- `supportsXHighThinking`: el proveedor opta por los modelos seleccionados en `xhigh`
- `resolveDefaultThinkingLevel`: el proveedor es propietario de la política `/think` predeterminada para una
  familia de modelos
- `isModernModelRef`: el proveedor es propietario de la coincidencia del modelo preferido live/smoke
- `prepareRuntimeAuth`: el proveedor convierte una credencial configurada en un token
  de ejecución de corta duración
- `resolveUsageAuth`: el proveedor resuelve las credenciales de uso/cuota para `/usage`
  y las superficies de estado/informes relacionadas
- `fetchUsageSnapshot`: el proveedor es propietario de la obtución/análisis del endpoint de uso mientras
  que el núcleo sigue siendo propietario del contenedor y formato del resumen

Ejemplos empaquetados actuales:

- `anthropic`: respaldo de compatibilidad futura de Claude 4.6, consejos de reparación de autenticación, obtención
  del endpoint de uso y metadatos de caché-TTL/familia del proveedor
- `openrouter`: ids de modelo de paso a través, contenedores de solicitudes, consejos de capacidad
  del proveedor y política de caché-TTL
- `github-copilot`: incorporación/inicio de sesión de dispositivo, respaldo de compatibilidad futura del modelo,
  consejos de transcripción de pensamiento de Claude, intercambio de token de ejecución y obtención
  del endpoint de uso
- `openai`: respaldo de compatibilidad futura de GPT-5.4, normalización del transporte
  directo de OpenAI, consejos de autenticación faltante compatible con Codex, supresión de Spark, filas
  de catálogo sintéticas de OpenAI/Codex, de pensamiento/modelo en vivo y
  metadatos de familia del proveedor
- `google` y `google-gemini-cli`: respaldo de compatibilidad futura de Gemini 3.1 y
  coincidencia de modelos modernos; Gemini CLI OAuth también es propietario del formato
  del token del perfil de autenticación, el análisis del token de uso y la obtención del endpoint de cuota para las superficies
  de uso
- `moonshot`: transporte compartido, normalización de carga útil de pensamiento propiedad del complemento
- `kilocode`: transporte compartido, encabezados de solicitud propiedad del complemento, normalización de la carga de razonamiento, sugerencias de transcripción de Gemini y política de caché-TTL
- `zai`: respaldo de compatibilidad futura de GLM-5, valores predeterminados de `tool_stream`, política de caché-TTL, política de pensamiento binario/modelo en vivo y obtención de autenticación de uso + cuota
- `mistral`, `opencode` y `opencode-go`: metadatos de capacidad propiedad del complemento
- `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`,
  `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`,
  `vercel-ai-gateway` y `volcengine`: solo catálogos propiedad del complemento
- `qwen-portal`: catálogo propiedad del complemento, inicio de sesión OAuth y actualización OAuth
- `minimax` y `xiaomi`: catálogos propiedad del complemento más lógica de autenticación/instantánea de uso

El complemento incluido `openai` ahora posee ambos ids de proveedor: `openai` y
`openai-codex`.

Eso cubre los proveedores que aún se ajustan a los transportes normales de OpenClaw. Un proveedor
que necesita un ejecutor de solicitud totalmente personalizado es una superficie de extensión
separada y más profunda.

## Rotación de clave de API

- Admite la rotación genérica de proveedores para proveedores seleccionados.
- Configure múltiples claves a través de:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (anulación en vivo única, prioridad más alta)
  - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
  - `<PROVIDER>_API_KEY` (clave principal)
  - `<PROVIDER>_API_KEY_*` (lista numerada, ej. `<PROVIDER>_API_KEY_1`)
- Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como respaldo.
- El orden de selección de claves preserva la prioridad y elimina duplicados de los valores.
- Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de velocidad (por ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`).
- Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
- Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

## Proveedores integrados (catálogo pi-ai)

OpenClaw incluye el catálogo pi‑ai. Estos proveedores no requieren **ninguna** configuración de `models.providers`; simplemente configure la autenticación y elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, más `OPENCLAW_LIVE_OPENAI_KEY` (anulación única)
- Modelos de ejemplo: `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto` (WebSocket primero, respaldo SSE)
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- El calentamiento de WebSocket de OpenAI Responses está habilitado de forma predeterminada mediante `params.openaiWsWarmup` (`true`/`false`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- El modo rápido de OpenAI se puede habilitar por modelo mediante `agents.defaults.models["<provider>/<model>"].params.fastMode`
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque la API en vivo de OpenAI lo rechaza; Spark se trata como solo Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY` o `claude setup-token`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, más `OPENCLAW_LIVE_ANTHROPIC_KEY` (anulación única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice token` (pegar setup-token) o `openclaw models auth paste-token --provider anthropic`
- Los modelos de clave de API directa admiten el interruptor compartido `/fast` y `params.fastMode`; OpenClaw asigna esto a Anthropic `service_tier` (`auto` vs `standard_only`)
- Nota de política: el soporte de token de configuración es compatibilidad técnica; Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado. Verifique los términos actuales de Anthropic y decida según su tolerancia al riesgo.
- Recomendación: la autenticación con clave de API de Anthropic es la ruta más segura y recomendada en comparación con la autenticación por token de configuración de suscripción.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- Proveedor: `openai-codex`
- Autenticación: OAuth (ChatGPT)
- Modelo de ejemplo: `openai-codex/gpt-5.4`
- CLI: `openclaw onboard --auth-choice openai-codex` o `openclaw models auth login --provider openai-codex`
- El transporte predeterminado es `auto` (primero WebSocket, respaldo SSE)
- Anular por modelo mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- Comparte el mismo interruptor `/fast` y configuración `params.fastMode` que `openai/*` directo
- `openai-codex/gpt-5.3-codex-spark` permanece disponible cuando el catálogo OAuth de Codex lo expone; depende de los derechos
- Nota de política: OAuth de OpenAI Codex es explícitamente compatible con herramientas/flujos de trabajo externos como OpenClaw.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- Autenticación: `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`)
- Proveedor de tiempo de ejecución Zen: `opencode`
- Proveedor de tiempo de ejecución Go: `opencode-go`
- Modelos de ejemplo: `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clave de API)

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY`
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, respaldo `GOOGLE_API_KEY` y `OPENCLAW_LIVE_GEMINI_KEY` (anulación única)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`

### CLI de Google Vertex y Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa gcloud ADC; la CLI de Gemini usa su flujo de OAuth
- Precaución: OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han reportado restricciones en la cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.
- OAuth de la CLI de Gemini se incluye como parte del complemento `google` incluido.
  - Activar: `openclaw plugins enable google`
  - Inicio de sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
  - Nota: **no** pega un id de cliente o secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena
    tokens en perfiles de autenticación en el host de puerta de enlace.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Alias: `z.ai/*` y `z-ai/*` se normalizan a `zai/*`

### Vercel AI Gateway

- Proveedor: `vercel-ai-gateway`
- Autenticación: `AI_GATEWAY_API_KEY`
- Modelo de ejemplo: `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Proveedor: `kilocode`
- Autenticación: `KILOCODE_API_KEY`
- Modelo de ejemplo: `kilocode/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --kilocode-api-key <key>`
- URL base: `https://api.kilo.ai/api/gateway/`
- El catálogo incorporado ampliado incluye GLM-5 Free, MiniMax M2.5 Free, GPT-5.2, Gemini 3 Pro Preview, Gemini 3 Flash Preview, Grok Code Fast 1 y Kimi K2.5.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedores incluidos

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Modelo de ejemplo: `openrouter/anthropic/claude-sonnet-4-6`
- Kilo Gateway: `kilocode` (`KILOCODE_API_KEY`)
- Modelo de ejemplo: `kilocode/anthropic/claude-opus-4.6`
- MiniMax: `minimax` (`MINIMAX_API_KEY`)
- Moonshot: `moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding: `kimi-coding` (`KIMI_API_KEY` o `KIMICODE_API_KEY`)
- Qianfan: `qianfan` (`QIANFAN_API_KEY`)
- Model Studio: `modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA: `nvidia` (`NVIDIA_API_KEY`)
- Together: `together` (`TOGETHER_API_KEY`)
- Venice: `venice` (`VENICE_API_KEY`)
- Xiaomi: `xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway: `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference: `huggingface` (`HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`)
- Cloudflare AI Gateway: `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine: `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus: `byteplus` (`BYTEPLUS_API_KEY`)
- xAI: `xai` (`XAI_API_KEY`)
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- Modelo de ejemplo: `mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Los modelos GLM en Cerebras usan los ids `zai-glm-4.7` y `zai-glm-4.6`.
  - URL base compatible con OpenAI: `https://api.cerebras.ai/v1`.
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modelo de ejemplo de Hugging Face Inference: `huggingface/deepseek-ai/DeepSeek-R1`; CLI: `openclaw onboard --auth-choice huggingface-api-key`. Consulte [Hugging Face (Inference)](/es/providers/huggingface).

## Proveedores a través de `models.providers` (URL base/personalizada)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o
proxies compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedores incluidos a continuación ya publican un catálogo predeterminado.
Use entradas explícitas de `models.providers.<id>` solo cuando desee anular la
URL base, los encabezados o la lista de modelos predeterminados.

### Moonshot AI (Kimi)

Moonshot utiliza puntos de conexión compatibles con OpenAI, por lo que debe configurarlo como un proveedor personalizado:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.5`

IDs de modelos Kimi K2:

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding utiliza el punto de conexión compatible con Anthropic de Moonshot AI:

- Proveedor: `kimi-coding`
- Autenticación: `KIMI_API_KEY`
- Modelo de ejemplo: `kimi-coding/k2p5`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### Qwen OAuth (nivel gratuito)

Qwen proporciona acceso OAuth a Qwen Coder + Vision a través de un flujo de código de dispositivo.
El complemento de proveedor incluido está habilitado de forma predeterminada, así que simplemente inicie sesión:

```bash
openclaw models auth login --provider qwen-portal --set-default
```

Referencias de modelos:

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Consulte [/providers/qwen](/es/providers/qwen) para obtener detalles de configuración y notas.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) proporciona acceso a Doubao y otros modelos en China.

- Proveedor: `volcengine` (codificación: `volcengine-plan`)
- Autenticación: `VOLCANO_ENGINE_API_KEY`
- Modelo de ejemplo: `volcengine/doubao-seed-1-8-251228`
- CLI: `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

Modelos disponibles:

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

Modelos de codificación (`volcengine-plan`):

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (Internacional)

BytePlus ARK proporciona acceso a los mismos modelos que Volcano Engine para usuarios internacionales.

- Proveedor: `byteplus` (codificación: `byteplus-plan`)
- Autenticación: `BYTEPLUS_API_KEY`
- Modelo de ejemplo: `byteplus/seed-1-8-251228`
- CLI: `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

Modelos disponibles:

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

Modelos de codificación (`byteplus-plan`):

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic proporciona modelos compatibles con Anthropic detrás del proveedor `synthetic`:

- Proveedor: `synthetic`
- Autenticación: `SYNTHETIC_API_KEY`
- Modelo de ejemplo: `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI: `openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax se configura a través de `models.providers` porque utiliza endpoints personalizados:

- MiniMax (compatible con Anthropic): `--auth-choice minimax-api`
- Autenticación: `MINIMAX_API_KEY`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

### Ollama

Ollama se distribuye como un complemento de proveedor incluido y utiliza la API nativa de Ollama:

- Proveedor: `ollama`
- Autenticación: No es necesaria (servidor local)
- Modelo de ejemplo: `ollama/llama3.3`
- Instalación: [https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando se activa con
`OLLAMA_API_KEY`, y el complemento de proveedor incluido añade Ollama directamente a
`openclaw onboard` y al selector de modelos. Consulte [/providers/ollama](/es/providers/ollama)
para obtener información sobre la incorporación, el modo en la nube/local y la configuración personalizada.

### vLLM

vLLM se distribuye como un complemento de proveedor incluido para servidores compatibles con OpenAI locales/autohospedados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para activar el descubrimiento automático localmente (cualquier valor funciona si su servidor no exige autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Vea [/providers/vllm](/es/providers/vllm) para más detalles.

### SGLang

SGLang se incluye como un complemento de proveedor empaquetado para servidores
autohospedados rápidos compatibles con OpenAI:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para activar el descubrimiento automático localmente (cualquier valor funciona si su servidor no
exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Vea [/providers/sglang](/es/providers/sglang) para más detalles.

### Proxies locales (LM Studio, vLLM, LiteLLM, etc.)

Ejemplo (compatible con OpenAI):

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Notas:

- Para proveedores personalizados, `reasoning`, `input`, `cost`, `contextWindow` y `maxTokens` son opcionales.
  Al omitirlos, OpenClaw usa por defecto:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.
- Para `api: "openai-completions"` en puntos finales no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
- Si `baseUrl` está vacío u omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve como `api.openai.com`).
- Por seguridad, un `compat.supportsDeveloperRole: true` explícito aún se anula en los puntos finales `openai-completions` no nativos.

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Vea también: [/gateway/configuration](/es/gateway/configuration) para ejemplos de configuración completa.

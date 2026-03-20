---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo + flujos de CLI"
read_when:
  - Necesitas una referencia de configuración de modelo proveedor por proveedor
  - Deseas configuraciones de ejemplo o comandos de incorporación de CLI para proveedores de modelos
title: "Proveedores de Modelos"
---

# Proveedores de modelos

Esta página cubre los **proveedores de LLM/modelos** (no canales de chat como WhatsApp/Telegram).
Para ver las reglas de selección de modelos, consulta [/concepts/models](/es/concepts/models).

## Reglas rápidas

- Las referencias de modelo usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
- Si configuras `agents.defaults.models`, se convierte en la lista de permitidos.
- Auxiliares de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Los complementos del proveedor pueden inyectar catálogos de modelos a través de `registerProvider({ catalog })`;
  OpenClaw fusiona esa salida en `models.providers` antes de escribir
  `models.json`.
- Los manifiestos del proveedor pueden declarar `providerAuthEnvVars` para que las sondas de autenticación genéricas basadas en entorno
  no necesiten cargar el tiempo de ejecución del complemento. El mapa de variables de entorno principal restante
  ahora es solo para proveedores principales/no complementarios y algunos casos de precedencia genérica
  como la incorporación con prioridad a la clave API de Anthropic.
- Los complementos del proveedor también pueden ser propietarios del comportamiento del tiempo de ejecución del proveedor a través de
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`,
  `refreshOAuth`, `buildAuthDoctorHint`,
  `isCacheTtlEligible`, `buildMissingAuthMessage`,
  `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`,
  `supportsXHighThinking`, `resolveDefaultThinkingLevel`,
  `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth` y
  `fetchUsageSnapshot`.
- Nota: el tiempo de ejecución del proveedor `capabilities` son metadatos compartidos del ejecutor (familia del proveedor, peculiaridades de la transcripción/herramientas, sugerencias de transporte/caché). No es lo mismo que el [modelo de capacidades públicas](/es/tools/plugin#public-capability-model), que describe lo que un complemento registra (inferencia de texto, voz, etc.).

## Comportamiento del proveedor propiedad del complemento

Los complementos del proveedor ahora pueden poseer la mayor parte de la lógica específica del proveedor, mientras que OpenClaw mantiene el bucle de inferencia genérico.

División típica:

- `auth[].run` / `auth[].runNonInteractive`: el proveedor posee los flujos de incorporación/inicio de sesión para `openclaw onboard`, `openclaw models auth` y la configuración sin interfaz gráfica
- `wizard.setup` / `wizard.modelPicker`: el proveedor posee las etiquetas de elección de autenticación, alias heredados, sugerencias de lista de permitidos de incorporación y entradas de configuración en los selectores de incorporación/modelos
- `catalog`: el proveedor aparece en `models.providers`
- `resolveDynamicModel`: el proveedor acepta identificadores de modelos que aún no están presentes en el catálogo estático local
- `prepareDynamicModel`: el proveedor necesita una actualización de metadatos antes de reintentar la resolución dinámica
- `normalizeResolvedModel`: el proveedor necesita reescrituras de transporte o URL base
- `capabilities`: el proveedor publica peculiaridades de transcripción/herramientas/familia del proveedor
- `prepareExtraParams`: el proveedor establece valores predeterminados o normaliza los parámetros de solicitud por modelo
- `wrapStreamFn`: el proveedor aplica encabezados de solicitud/cuerpo/envoltorios de compatibilidad de modelo
- `formatApiKey`: el proveedor da formato a los perfiles de autenticación almacenados en la cadena `apiKey` de tiempo de ejecución que espera el transporte
- `refreshOAuth`: el proveedor posee la actualización de OAuth cuando los actualizadores compartidos `pi-ai` no son suficientes
- `buildAuthDoctorHint`: el proveedor añade orientación de reparación cuando falla la actualización de OAuth
- `isCacheTtlEligible`: el proveedor decide qué identificadores de modelo ascendente admiten el TTL de caché de aviso (prompt-cache)
- `buildMissingAuthMessage`: el proveedor reemplaza el error genérico del almacén de autenticación con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: el proveedor oculta filas obsoletas ascendentes y puede devolver un error propio del proveedor para fallos de resolución directa
- `augmentModelCatalog`: el proveedor añade filas sintéticas/finales del catálogo después del descubrimiento y la fusión de la configuración
- `isBinaryThinking`: el proveedor es propietario de la UX de pensamiento binario activado/desactivado
- `supportsXHighThinking`: el proveedor opta por los modelos seleccionados en `xhigh`
- `resolveDefaultThinkingLevel`: el proveedor posee la política `/think` predeterminada para una familia de modelos
- `isModernModelRef`: el proveedor posee la coincidencia del modelo preferido en vivo/prueba
- `prepareRuntimeAuth`: el proveedor convierte una credencial configurada en un token de tiempo de ejecución de corta duración
- `resolveUsageAuth`: el proveedor resuelve las credenciales de uso/cuota para `/usage` y las superficies de estado/informes relacionados
- `fetchUsageSnapshot`: el proveedor es propietario de la obtención/análisis del punto final de uso, mientras que el núcleo sigue siendo propietario del contenedor y el formato del resumen

Ejemplos empaquetados actuales:

- `anthropic`: respaldo de compatibilidad futura de Claude 4.6, sugerencias de reparación de autenticación, obtención del punto final de uso y metadatos de TTL de caché/familia de proveedor
- `openrouter`: identificadores de modelos de paso a través, contenedores de solicitudes, sugerencias de capacidad del proveedor y política de TTL de caché
- `github-copilot`: incorporación/inicio de sesión del dispositivo, respaldo de compatibilidad futura del modelo, sugerencias de transcripción de pensamiento de Claude, intercambio de tokens de tiempo de ejecución y obtención del punto final de uso
- `openai`: respaldo de compatibilidad futura de GPT-5.4, normalización del transporte directo de OpenAI, sugerencias de autenticación faltante conscientes de Codex, supresión de Spark, filas sintéticas del catálogo OpenAI/Codex, política de modelo en vivo/de pensamiento y metadatos de familia de proveedor
- `google` y `google-gemini-cli`: respaldo de compatibilidad futura de Gemini 3.1 y coincidencia de modelos modernos; Gemini CLI OAuth también posee el formato de tokens de perfil de autenticación, el análisis de tokens de uso y la obtención del punto final de cuota para superficies de uso
- `moonshot`: transporte compartido, normalización de carga útil de pensamiento propiedad del complemento
- `kilocode`: transporte compartido, encabezados de solicitud propiedad del complemento, normalización del payload de razonamiento, sugerencias de transcripción de Gemini y política de TTL de caché
- `zai`: reserva de compatibilidad futura de GLM-5, valores predeterminados de `tool_stream`, política de TTL de caché, política de pensamiento binario/modelo en vivo y autenticación de uso + obtención de cuotas
- `mistral`, `opencode` y `opencode-go`: metadatos de capacidad propiedad del complemento
- `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`,
  `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`,
  `vercel-ai-gateway` y `volcengine`: solo catálogos propiedad del complemento
- `qwen-portal`: catálogo propiedad del complemento, inicio de sesión OAuth y actualización de OAuth
- `minimax` y `xiaomi`: catálogos propiedad del complemento más lógica de autenticación/instantánea de uso

El complemento `openai` incluido ahora posee ambos ids de proveedor: `openai` y
`openai-codex`.

Eso cubre los proveedores que aún se ajustan a los transportes normales de OpenClaw. Un proveedor
que necesita un ejecutor de solicitud totalmente personalizado es una superficie de extensión
separada y más profunda.

## Rotación de claves de API

- Admite la rotación genérica de proveedores para los proveedores seleccionados.
- Configure múltiples claves a través de:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (anulación en vivo única, máxima prioridad)
  - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
  - `<PROVIDER>_API_KEY` (clave principal)
  - `<PROVIDER>_API_KEY_*` (lista numerada, p. ej., `<PROVIDER>_API_KEY_1`)
- Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como alternativa.
- El orden de selección de claves preserva la prioridad y elimina duplicados de los valores.
- Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de velocidad (por ejemplo, `429`, `rate_limit`, `quota`, `resource exhausted`).
- Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
- Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

## Proveedores integrados (catálogo pi-ai)

OpenClaw incluye el catálogo pi‑ai. Estos proveedores no requieren **ninguna**
configuración de `models.providers`; simplemente configure la autenticación y elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, además de `OPENCLAW_LIVE_OPENAI_KEY` (anulación única)
- Modelos de ejemplo: `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto` (prioridad WebSocket, respaldo SSE)
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- El calentamiento de WebSocket de OpenAI Responses está habilitado de forma predeterminada mediante `params.openaiWsWarmup` (`true`/`false`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- El modo rápido de OpenAI se puede habilitar por modelo mediante `agents.defaults.models["<provider>/<model>"].params.fastMode`
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque la API en vivo de OpenAI lo rechaza; Spark se trata como exclusivo de Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY` o `claude setup-token`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, además de `OPENCLAW_LIVE_ANTHROPIC_KEY` (anulación única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice token` (pegar setup-token) o `openclaw models auth paste-token --provider anthropic`
- Los modelos de clave de API directa admiten el alternador `/fast` compartido y `params.fastMode`; OpenClaw asigna eso a Anthropic `service_tier` (`auto` vs `standard_only`)
- Nota de política: el soporte de setup-token es compatibilidad técnica; Anthropic ha bloqueado algún uso de suscripción fuera de Claude Code en el pasado. Verifica los términos actuales de Anthropic y decide según tu tolerancia al riesgo.
- Recomendación: la autenticación con clave de API de Anthropic es la ruta más segura y recomendada en comparación con la autenticación por setup-token de suscripción.

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
- El transporte predeterminado es `auto` (prioridad WebSocket, respaldo SSE)
- Anular por modelo mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- Comparte el mismo alternador `/fast` y configuración `params.fastMode` que la `openai/*` directa
- `openai-codex/gpt-5.3-codex-spark` permanece disponible cuando el catálogo OAuth de Codex lo expone; dependiente de derechos
- Nota de política: OpenAI Codex OAuth es compatible explícitamente para herramientas/flujos de trabajo externos como OpenClaw.

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

### Google Gemini (API key)

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY`
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, respaldo `GOOGLE_API_KEY` y `OPENCLAW_LIVE_GEMINI_KEY` (anulación única)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`

### Google Vertex y Gemini CLI

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa gcloud ADC; Gemini CLI usa su propio flujo OAuth
- Precaución: el OAuth de Gemini CLI en OpenClaw es una integración no oficial. Algunos usuarios han informado restricciones en su cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.
- El OAuth de Gemini CLI se incluye como parte del complemento empaquetado `google`.
  - Activar: `openclaw plugins enable google`
  - Iniciar sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
  - Nota: **no** debe pegar un ID de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena
    tokens en perfiles de autenticación en el host de la puerta de enlace.

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
- El catálogo integrado ampliado incluye GLM-5 Free, MiniMax M2.5 Free, GPT-5.2, Gemini 3 Pro Preview, Gemini 3 Flash Preview, Grok Code Fast 1 y Kimi K2.5.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedores empaquetados

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Modelo de ejemplo: `openrouter/anthropic/claude-sonnet-4-5`
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

Moonshot utiliza puntos finales compatibles con OpenAI, por lo que debe configurarlo como un proveedor personalizado:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.5`

ID de modelos Kimi K2:

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

Kimi Coding utiliza el punto final compatible con Anthropic de Moonshot AI:

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

### BytePlus (International)

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
- Autenticación: No se requiere (servidor local)
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
para obtener información sobre incorporación, modo en la nube/local y configuración personalizada.

### vLLM

vLLM se distribuye como un complemento de proveedor incluido para servidores compatibles con OpenAI locales/autoalojados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para participar en el autodescubrimiento localmente (cualquier valor funciona si su servidor no exige autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego establezca un modelo (reemplace con uno de los ID devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulte [/providers/vllm](/es/providers/vllm) para obtener detalles.

### SGLang

SGLang se incluye como un complemento de proveedor agrupado para servidores autoalojados rápidos compatibles con OpenAI:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para participar en el autodescubrimiento localmente (cualquier valor funciona si su servidor no exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego establezca un modelo (reemplace con uno de los ID devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulte [/providers/sglang](/es/providers/sglang) para obtener detalles.

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
  Cuando se omiten, OpenClaw utiliza los valores predeterminados:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.
- Para `api: "openai-completions"` en endpoints no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no admitidos.
- Si `baseUrl` está vacío/omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
- Por seguridad, un `compat.supportsDeveloperRole: true` explícito todavía se anula en los endpoints `openai-completions` no nativos.

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Consulte también: [/gateway/configuration](/es/gateway/configuration) para obtener ejemplos de configuración completa.

import es from "/components/footer/es.mdx";

<es />

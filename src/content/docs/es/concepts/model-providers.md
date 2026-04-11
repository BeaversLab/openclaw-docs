---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo + flujos de CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Proveedores de modelos"
---

# Proveedores de modelos

Esta página trata sobre los **proveedores de LLM/modelos** (no canales de chat como WhatsApp/Telegram).
Para consultar las reglas de selección de modelos, consulte [/concepts/models](/en/concepts/models).

## Reglas rápidas

- Las referencias de modelos usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
- Si configura `agents.defaults.models`, se convierte en la lista de permitidos.
- Asistentes de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Las reglas de tiempo de ejecución de respaldo, las sondas de enfriamiento y la persistencia de anulación de sesión están
  documentadas en [/concepts/model-failover](/en/concepts/model-failover).
- `models.providers.*.models[].contextWindow` son metadatos nativos del modelo;
  `models.providers.*.models[].contextTokens` es el límite efectivo de tiempo de ejecución.
- Los complementos del proveedor pueden inyectar catálogos de modelos a través de `registerProvider({ catalog })`;
  OpenClaw fusiona esa salida en `models.providers` antes de escribir
  `models.json`.
- Los manifiestos del proveedor pueden declarar `providerAuthEnvVars` para que las sondas de autenticación genéricas basadas en entorno
  no necesiten cargar el tiempo de ejecución del complemento. El mapa restante de variables de entorno
  principales es ahora solo para proveedores principales/sin complemento y unos pocos casos de precedencia genérica
  como la incorporación de Anthropic con prioridad a la clave de API.
- Los complementos de proveedor también pueden poseer el comportamiento de tiempo de ejecución del proveedor a través de
  `normalizeModelId`, `normalizeTransport`, `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`,
  `normalizeResolvedModel`, `contributeResolvedModelCompat`,
  `capabilities`, `normalizeToolSchemas`,
  `inspectToolSchemas`, `resolveReasoningOutputMode`,
  `prepareExtraParams`, `createStreamFn`, `wrapStreamFn`,
  `resolveTransportTurnState`, `resolveWebSocketSessionPolicy`,
  `createEmbeddingProvider`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`,
  `matchesContextOverflowError`, `classifyFailoverReason`,
  `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot` y
  `onModelSelected`.
- Nota: el tiempo de ejecución del proveedor `capabilities` son metadatos compartidos del ejecutor (familia
  del proveedor, peculiaridades de transcripción/herramientas, sugerencias de transporte/caché). No es lo
  mismo que el [modelo de capacidad pública](/en/plugins/architecture#public-capability-model)
  que describe lo que registra un complemento (inferencia de texto, voz, etc.).

## Comportamiento del proveedor propiedad del complemento

Los complementos de proveedor ahora pueden poseer la mayor parte de la lógica específica del proveedor, mientras que OpenClaw mantiene el bucle de inferencia genérico.

División típica:

- `auth[].run` / `auth[].runNonInteractive`: el proveedor posee los flujos de incorporación/inicio de sesión
  para `openclaw onboard`, `openclaw models auth` y la configuración sin interfaz gráfica
- `wizard.setup` / `wizard.modelPicker`: el proveedor es dueño de las etiquetas de elección de autenticación,
  alias heredados, sugerencias de lista de permitidos de incorporación y entradas de configuración en los selectores de incorporación/modelo
- `catalog`: el proveedor aparece en `models.providers`
- `normalizeModelId`: el proveedor normaliza los IDs de modelo heredados/de vista previa antes de
  la búsqueda o canonización
- `normalizeTransport`: el proveedor normaliza la familia de transporte `api` / `baseUrl`
  antes del ensamblaje genérico del modelo; OpenClaw verifica primero el proveedor coincidente,
  luego otros complementos de proveedor con capacidad de enlace hasta que uno cambie realmente el
  transporte
- `normalizeConfig`: el proveedor normaliza la configuración `models.providers.<id>` antes de
  que el tiempo de ejecución la use; OpenClaw verifica primero el proveedor coincidente, luego otros
  complementos de proveedor con capacidad de enlace hasta que uno cambie realmente la configuración. Si ningún
  enlace de proveedor reescribe la configuración, los asistentes de la familia Google incluidos
  n normalizan las entradas de proveedores de Google compatibles.
- `applyNativeStreamingUsageCompat`: el proveedor aplica reescrituras de compatibilidad de uso de streaming nativo impulsadas por el punto de conexión para proveedores de configuración
- `resolveConfigApiKey`: el proveedor resuelve la autenticación de marcador de entorno para proveedores de configuración
  sin forzar la carga completa de autenticación en tiempo de ejecución. `amazon-bedrock` también tiene un
  solucionador de marcador de entorno de AWS incorporado aquí, aunque la autenticación en tiempo de ejecución de Bedrock usa
  la cadena predeterminada del AWS SDK.
- `resolveSyntheticAuth`: el proveedor puede exponer la disponibilidad de autenticación local/autoalojada u otra
  respaldada por configuración sin persistir secretos en texto plano
- `shouldDeferSyntheticProfileAuth`: el proveedor puede marcar los marcadores de posición de perfil sintético almacenados
  con menor precedencia que la autenticación respaldada por entorno/configuración
- `resolveDynamicModel`: el proveedor acepta IDs de modelo que aún no están presentes en el
  catálogo estático local
- `prepareDynamicModel`: el proveedor necesita una actualización de metadatos antes de reintentar
  la resolución dinámica
- `normalizeResolvedModel`: el proveedor necesita reescrituras de transporte o URL base
- `contributeResolvedModelCompat`: el proveedor contribuye con marcas de compatibilidad para sus
  modelos de proveedor incluso cuando llegan a través de otro transporte compatible
- `capabilities`: el proveedor publica peculiaridades de la transcripción/herramientas/familia del proveedor
- `normalizeToolSchemas`: el proveedor limpia los esquemas de herramientas antes de que
  el integrado los vea
- `inspectToolSchemas`: el proveedor expone advertencias específicas del esquema de transporte
  después de la normalización
- `resolveReasoningOutputMode`: el proveedor elige contratos de salida de razonamiento
  nativos o etiquetados
- `prepareExtraParams`: el proveedor establece valores predeterminados o normaliza los parámetros de solicitud por modelo
- `createStreamFn`: el proveedor reemplaza la ruta de flujo normal con un transporte
  totalmente personalizado
- `wrapStreamFn`: el proveedor aplica encabezados/cuerpo de solicitud/envoltorios de compatibilidad del modelo
- `resolveTransportTurnState`: el proveedor proporciona encabezados o metadatos
  de transporte nativos por turno
- `resolveWebSocketSessionPolicy`: el proveedor proporciona encabezados de sesión
  nativos de WebSocket o política de enfriamiento de sesión
- `createEmbeddingProvider`: el proveedor posee el comportamiento de incrustación de memoria cuando
  corresponde al complemento del proveedor en lugar del conmutador de incrustación principal
- `formatApiKey`: el proveedor formatea los perfiles de autenticación almacenados en la cadena `apiKey`
  esperada por el transporte en tiempo de ejecución
- `refreshOAuth`: el proveedor gestiona la actualización de OAuth cuando los actualizadores `pi-ai`
  compartidos no son suficientes
- `buildAuthDoctorHint`: el proveedor añade orientación de reparación cuando falla
  la actualización de OAuth
- `matchesContextOverflowError`: el proveedor reconoce errores de desbordamiento de ventana de contexto
  específicos del proveedor que las heurísticas genéricas perderían
- `classifyFailoverReason`: el proveedor asigna errores de transporte/API brutos
  específicos del proveedor a motivos de conmutación por error, como límite de velocidad o sobrecarga
- `isCacheTtlEligible`: el proveedor decide qué IDs de modelo ascendentes admiten TTL de caché de indicaciones
- `buildMissingAuthMessage`: el proveedor reemplaza el error genérico del almacén de autenticación
  con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: el proveedor oculta filas ascendentes obsoletas y puede devolver un
  error propiedad del proveedor para fallos de resolución directa
- `augmentModelCatalog`: el proveedor añade filas de catálogo sintéticas/finales después
  del descubrimiento y la combinación de configuración
- `isBinaryThinking`: el proveedor posee la experiencia de usuario (UX) de pensamiento binario activado/desactivado
- `supportsXHighThinking`: el proveedor opta por los modelos seleccionados en `xhigh`
- `resolveDefaultThinkingLevel`: el proveedor posee la política predeterminada `/think` para una
  familia de modelos
- `applyConfigDefaults`: el proveedor aplica valores predeterminados globales específicos del proveedor
  durante la materialización de la configuración según el modo de autenticación, el entorno o la familia de modelos
- `isModernModelRef`: el proveedor posee la coincidencia de modelos preferidos en vivo/pruebas
- `prepareRuntimeAuth`: el proveedor convierte una credencial configurada en un token
  de tiempo de ejecución de corta duración
- `resolveUsageAuth`: el proveedor resuelve las credenciales de uso/cuota para `/usage`
  y las superficies de estado/informes relacionadas
- `fetchUsageSnapshot`: el proveedor posee la obtención/analisis del endpoint de uso mientras
  que el núcleo aún posee el contenedor y el formato del resumen
- `onModelSelected`: el proveedor ejecuta efectos secundarios posteriores a la selección, como
  telemetría o contabilidad de sesiones propiedad del proveedor

Ejemplos incluidos actualmente:

- `anthropic`: respaldo de compatibilidad futura de Claude 4.6, sugerencias de reparación de autenticación, obtención
  del endpoint de uso, metadatos de caché-TTL/familia del proveedor y valores predeterminados globales
  de configuración conscientes de la autenticación
- `amazon-bedrock`: coincidencia de desbordamiento de contexto propiedad del proveedor y clasificación del motivo de conmutación por error
  para errores de limitación/no listos específicos de Bedrock, además
  de la familia de repetición `anthropic-by-model` compartida para guardias
  de política de repetición solo para Claude en el tráfico de Anthropic
- `anthropic-vertex`: guardias de política de repetición solo para Claude en el tráfico
  de mensajes de Anthropic
- `openrouter`: ids de modelos de paso a través, contenedores de solicitudes, sugerencias de
  capacidad del proveedor, saneamiento de firmas de pensamiento de Gemini en el tráfico proxy de Gemini, inyección
  de razonamiento proxy a través de la familia de flujos `openrouter-thinking`, reenvío
  de metadatos de enrutamiento y política de caché-TTL
- `github-copilot`: incorporación/inicio de sesión de dispositivo, respaldo de modelo de compatibilidad futura,
  sugerencias de transcripción de pensamiento de Claude, intercambio de tokens de tiempo de ejecución y obtención
  del endpoint de uso
- `openai`: reserva de compatibilidad hacia adelante de GPT-5.4, normalización de transporte directo de OpenAI, sugerencias de autenticación faltante compatibles con Codex, supresión de Spark, filas sintéticas del catálogo de OpenAI/Codex, política de modelos en vivo/pensamiento, normalización de alias de tokens de uso (familias `input` / `output` y `prompt` / `completion`), la familia de flujo compartida `openai-responses-defaults` para envoltorios nativos de OpenAI/Codex, metadatos de familia de proveedor, registro de proveedor de generación de imágenes incluido para `gpt-image-1` y registro de proveedor de generación de video incluido para `sora-2`
- `google` y `google-gemini-cli`: respaldo de compatibilidad futura de Gemini 3.1,
  validación de repetición nativa de Gemini, saneamiento de repetición de arranque, modo de salida de razonamiento etiquetado,
  coincidencia de modelos modernos, registro del proveedor de generación de imágenes empaquetado
  para modelos de vista previa de imágenes de Gemini y registro del proveedor de generación de video
  empaquetado para modelos Veo; Gemini CLI OAuth también se encarga del formato de tokens de perfil de autenticación,
  el análisis de tokens de uso y la obtención de endpoints de cuota para superficies de uso
- `moonshot`: transporte compartido, normalización de carga útil de pensamiento propiedad del complemento
- `kilocode`: transporte compartido, encabezados de solicitud propiedad del complemento, normalización
  de carga útil de razonamiento, saneamiento de firma de pensamiento proxy-Gemini y política de TTL de caché
- `zai`: respaldo de compatibilidad futura de GLM-5, valores predeterminados de `tool_stream`, política de TTL
  de caché, política de pensamiento binario/modelo en vivo y autenticación de uso + obtención de cuota;
  los ids `glm-5*` desconocidos se sintetizan a partir de la plantilla `glm-4.7` empaquetada
- `xai`: normalización de transporte de Respuestas nativas, reescrituras de alias `/fast` para
  variantes rápidas de Grok, `tool_stream` predeterminado, limpieza de esquema de herramientas /
  carga útil de razonamiento específica de xAI, y registro del proveedor de generación de video
  empaquetado para `grok-imagine-video`
- `mistral`: metadatos de capacidad propiedad del complemento
- `opencode` y `opencode-go`: metadatos de capacidades propiedad del plugin más saneamiento de la firma de pensamiento de Gemini mediante proxy
- `alibaba`: catálogo de generación de vídeo propiedad del plugin para referencias directas de modelos Wan como `alibaba/wan2.6-t2v`
- `byteplus`: catálogos propiedad del plugin además del registro del proveedor de generación de vídeo incluido para modelos de texto a vídeo/imagen a vídeo de Seedance
- `fal`: registro del proveedor de generación de vídeo incluido para proveedores de generación de imágenes de terceros alojados para modelos de imagen FLUX más registro del proveedor de generación de vídeo incluido para modelos de vídeo de terceros alojados
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`, `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway` y `volcengine`: solo catálogos propiedad del plugin
- `qwen`: catálogos propiedad del plugin para modelos de texto más registros compartidos de proveedores de comprensión de medios y generación de vídeo para sus superficies multimodales; la generación de vídeo Qwen utiliza los puntos de conexión de vídeo estándar de DashScope con modelos Wan incluidos como `wan2.6-t2v` y `wan2.7-r2v`
- `runway`: registro del proveedor de generación de vídeo propiedad del plugin para modelos nativos basados en tareas de Runway como `gen4.5`
- `minimax`: catálogos propiedad del plugin, registro del proveedor de generación de vídeo incluido para modelos de vídeo Hailuo, registro del proveedor de generación de imágenes incluido para `image-01`, selección híbrida de políticas de reproducción de Anthropic/OpenAI y lógica de autenticación/instantáneas de uso
- `together`: catálogos propiedad del plugin más registro del proveedor de generación de vídeo incluido para modelos de vídeo Wan
- `xiaomi`: catálogos propiedad del plugin más lógica de autenticación/instantáneas de uso

El complemento incluido `openai` ahora posee ambos ids de proveedor: `openai` y
`openai-codex`.

Eso cubre los proveedores que todavía se ajustan a los transportes normales de OpenClaw. Un proveedor que necesita un ejecutor de solicitudes totalmente personalizado es una superficie de extensión separada y más profunda.

## Rotación de claves API

- Admite la rotación genérica de proveedores para los proveedores seleccionados.
- Configure múltiples claves a través de:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única anulación en vivo, mayor prioridad)
  - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
  - `<PROVIDER>_API_KEY` (clave principal)
  - `<PROVIDER>_API_KEY_*` (lista numerada, ej. `<PROVIDER>_API_KEY_1`)
- Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como respaldo.
- El orden de selección de claves preserva la prioridad y elimina los valores duplicados.
- Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de tasa (por
  ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`,
  `workers_ai ... quota limit exceeded`, o mensajes periódicos de límite de uso).
- Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
- Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

## Proveedores integrados (catálogo pi-ai)

OpenClaw incluye el catálogo pi-ai. Estos proveedores no requieren **ninguna**
configuración `models.providers`; simplemente configure la autenticación + elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, además de `OPENCLAW_LIVE_OPENAI_KEY` (única anulación)
- Modelos de ejemplo: `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto` (WebSocket primero, respaldo SSE)
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, o `"auto"`)
- El calentamiento de WebSocket de OpenAI Responses está habilitado de forma predeterminada mediante `params.openaiWsWarmup` (`true`/`false`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` mapean las solicitudes directas de `openai/*` Responses a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando quieras un nivel explícito en lugar del interruptor compartido `/fast`
- Los encabezados ocultos de atribución de OpenClaw (`originator`, `version`,
  `User-Agent`) se aplican solo en el tráfico nativo de OpenAI hacia `api.openai.com`, no en
  proxies genéricos compatibles con OpenAI
- Las rutas nativas de OpenAI también mantienen Responses `store`, sugerencias de caché de prompts y
  conformación de payload compatible con el razonamiento de OpenAI; las rutas de proxy no
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque la API en vivo de OpenAI la rechaza; Spark se trata como solo Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, más `OPENCLAW_LIVE_ANTHROPIC_KEY` (anulación única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice apiKey`
- Las solicitudes públicas directas de Anthropic admiten el interruptor compartido `/fast` y `params.fastMode`, incluido el tráfico autenticado con clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo asigna a Anthropic `service_tier` (`auto` vs `standard_only`)
- Nota de Anthropic: El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata la reutilización de la CLI de Claude y el uso de `claude -p` como sancionados para esta integración, a menos que Anthropic publique una nueva política.
- El token de configuración de Anthropic sigue disponible como una ruta de token compatible con OpenClaw, pero OpenClaw ahora prefiere la reutilización de la CLI de Claude y `claude -p` cuando están disponibles.

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
- Anular por modelo mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes nativas de Codex Responses (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`,
  `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia
  `chatgpt.com/backend-api`, no en los proxies compatibles con OpenAI genéricos
- Comparte el mismo interruptor `/fast` y la configuración `params.fastMode` que el `openai/*` directo; OpenClaw asigna eso a `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` permanece disponible cuando el catálogo OAuth de Codex lo expone; depende de los derechos
- `openai-codex/gpt-5.4` mantiene `contextWindow = 1050000` nativo y un tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite de tiempo de ejecución con `models.providers.openai-codex.models[].contextTokens`
- Nota de política: OAuth de OpenAI Codex es compatible explícitamente con herramientas/flujos de trabajo externos como OpenClaw.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.4", contextTokens: 160000 }],
      },
    },
  },
}
```

### Otras opciones alojadas de estilo de suscripción

- [Qwen Cloud](/en/providers/qwen): superficie del proveedor Qwen Cloud más la asignación de endpoints de Alibaba DashScope y Coding Plan
- [MiniMax](/en/providers/minimax): acceso mediante OAuth o clave de API de MiniMax Coding Plan
- [GLM Models](/en/providers/glm): Z.AI Coding Plan o endpoints de API generales

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
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent`
  (o el heredado `cached_content`) para reenviar un identificador
  `cachedContents/...` nativo del proveedor; los aciertos en la caché de Gemini aparecen como `cacheRead` de OpenClaw

### CLI de Google Vertex y Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa gcloud ADC; la CLI de Gemini usa su flujo OAuth
- Precaución: el OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han reportado restricciones en sus cuentas de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.
- El OAuth de la CLI de Gemini se incluye como parte del complemento `google` incluido.
  - Instale la CLI de Gemini primero:
    - `brew install gemini-cli`
    - o `npm install -g @google/gemini-cli`
  - Activar: `openclaw plugins enable google`
  - Iniciar sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`
  - Nota: **no** debe pegar un id de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena
    los tokens en perfiles de autenticación en el host de la puerta de enlace.
  - Si las solicitudes fallan después del inicio de sesión, configure `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  - Las respuestas JSON de la CLI de Gemini se analizan desde `response`; el uso recurre a
    `stats`, con `stats.cached` normalizado a `cacheRead` de OpenClaw.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Alias: `z.ai/*` y `z-ai/*` se normalizan a `zai/*`
  - `zai-api-key` detecta automáticamente el punto final de Z.AI coincidente; `zai-coding-global`, `zai-coding-cn`, `zai-global` y `zai-cn` fuerzan una superficie específica

### Vercel AI Gateway

- Proveedor: `vercel-ai-gateway`
- Autenticación: `AI_GATEWAY_API_KEY`
- Modelo de ejemplo: `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Proveedor: `kilocode`
- Autenticación: `KILOCODE_API_KEY`
- Modelo de ejemplo: `kilocode/kilo/auto`
- CLI: `openclaw onboard --auth-choice kilocode-api-key`
- URL base: `https://api.kilo.ai/api/gateway/`
- El catálogo de reserva estático incluye `kilocode/kilo/auto`; el descubrimiento en vivo
  de `https://api.kilo.ai/api/gateway/models` puede ampliar aún más el catálogo en tiempo de ejecución.
- El enrutamiento exacto upstream detrás de `kilocode/kilo/auto` es gestionado por Kilo Gateway,
  no está codificado en OpenClaw.

Consulte [/providers/kilocode](/en/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedor incluidos

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Modelo de ejemplo: `openrouter/auto`
- OpenClaw aplica los encabezados de atribución de aplicación documentados de OpenRouter solo cuando
  la solicitud realmente apunta a `openrouter.ai`
- Los marcadores `cache_control` específicos de Anthropic para OpenRouter también están limitados a
  rutas de OpenRouter verificadas, no a URL de proxy arbitrarias
- OpenRouter permanece en la ruta compatible con OpenAI estilo proxy, por lo que el modelado
  de solicitudes nativas solo para OpenAI (`serviceTier`, Responses `store`,
  sugerencias de caché de prompt, payloads compatibles con razonamiento de OpenAI) no se reenvía
- Las referencias de OpenRouter respaldadas por Gemini mantienen solo la limpieza de firmas de pensamiento
  de proxy-Gemini; la validación de reproducción nativa de Gemini y las reescrituras de arranque permanecen desactivadas
- Kilo Gateway: `kilocode` (`KILOCODE_API_KEY`)
- Modelo de ejemplo: `kilocode/kilo/auto`
- Las referencias de Kilo respaldadas por Gemini mantienen la misma ruta de limpieza
  de firmas de pensamiento de proxy-Gemini; `kilocode/kilo/auto` y otras sugerencias no compatibles con razonamiento de proxy
  omiten la inyección de razonamiento de proxy
- MiniMax: `minimax` (API key) y `minimax-portal` (OAuth)
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`
- Modelo de ejemplo: `minimax/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7`
- La configuración de onboarding/API-key de MiniMax escribe definiciones explícitas de modelos M2.7 con
  `input: ["text", "image"]`; el catálogo de proveedores incluido mantiene las referencias de chat
  solo de texto hasta que se materialice esa configuración del proveedor
- Moonshot: `moonshot` (`MOONSHOT_API_KEY`)
- Modelo de ejemplo: `moonshot/kimi-k2.5`
- Kimi Coding: `kimi` (`KIMI_API_KEY` o `KIMICODE_API_KEY`)
- Modelo de ejemplo: `kimi/kimi-code`
- Qianfan: `qianfan` (`QIANFAN_API_KEY`)
- Modelo de ejemplo: `qianfan/deepseek-v3.2`
- Qwen Cloud: `qwen` (`QWEN_API_KEY`, `MODELSTUDIO_API_KEY` o `DASHSCOPE_API_KEY`)
- Modelo de ejemplo: `qwen/qwen3.5-plus`
- NVIDIA: `nvidia` (`NVIDIA_API_KEY`)
- Modelo de ejemplo: `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun: `stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- Modelos de ejemplo: `stepfun/step-3.5-flash`, `stepfun-plan/step-3.5-flash-2603`
- Together: `together` (`TOGETHER_API_KEY`)
- Modelo de ejemplo: `together/moonshotai/Kimi-K2.5`
- Venice: `venice` (`VENICE_API_KEY`)
- Xiaomi: `xiaomi` (`XIAOMI_API_KEY`)
- Modelo de ejemplo: `xiaomi/mimo-v2-flash`
- Vercel AI Gateway: `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference: `huggingface` (`HUGGINGFACE_HUB_TOKEN` o `HF_TOKEN`)
- Cloudflare AI Gateway: `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine: `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- Modelo de ejemplo: `volcengine-plan/ark-code-latest`
- BytePlus: `byteplus` (`BYTEPLUS_API_KEY`)
- Modelo de ejemplo: `byteplus-plan/ark-code-latest`
- xAI: `xai` (`XAI_API_KEY`)
  - Las solicitudes nativas agrupadas de xAI utilizan la ruta de Respuestas de xAI
  - `/fast` o `params.fastMode: true` reescribe `grok-3`, `grok-3-mini`,
    `grok-4` y `grok-4-0709` a sus variantes `*-fast`
  - `tool_stream` está activado por defecto; establezca
    `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
    desactivarlo
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- Modelo de ejemplo: `mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Los modelos GLM en Cerebras utilizan los identificadores `zai-glm-4.7` y `zai-glm-4.6`.
  - URL base compatible con OpenAI: `https://api.cerebras.ai/v1`.
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modelo de ejemplo de Hugging Face Inference: `huggingface/deepseek-ai/DeepSeek-R1`; CLI: `openclaw onboard --auth-choice huggingface-api-key`. Consulte [Hugging Face (Inference)](/en/providers/huggingface).

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o
proxys compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedor agrupados a continuación ya publican un catálogo predeterminado.
Use entradas explícitas de `models.providers.<id>` solo cuando desee anular la
URL base, los encabezados o la lista de modelos predeterminados.

### Moonshot AI (Kimi)

Moonshot se distribuye como un complemento de proveedor agrupado. Utilice el proveedor integrado de
forma predeterminada y agregue una entrada explícita de `models.providers.moonshot` solo cuando
necesite anular la URL base o los metadatos del modelo:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.5`
- CLI: `openclaw onboard --auth-choice moonshot-api-key` o `openclaw onboard --auth-choice moonshot-api-key-cn`

IDs de modelos de Kimi K2:

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

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

Kimi Coding utiliza el endpoint compatible con Anthropic de Moonshot AI:

- Proveedor: `kimi`
- Autenticación: `KIMI_API_KEY`
- Modelo de ejemplo: `kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

El modelo heredado `kimi/k2p5` sigue siendo aceptado como ID de modelo de compatibilidad.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) proporciona acceso a Doubao y otros modelos en China.

- Proveedor: `volcengine` (codificación: `volcengine-plan`)
- Autenticación: `VOLCANO_ENGINE_API_KEY`
- Modelo de ejemplo: `volcengine-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

La incorporación por defecto se orienta a la superficie de codificación, pero el catálogo general `volcengine/*`
se registra al mismo tiempo.

En los selectores de incorporación/configuración de modelos, la elección de autenticación de Volcengine prefiere ambas
filas `volcengine/*` y `volcengine-plan/*`. Si esos modelos aún no están cargados,
OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector
vacío con ámbito de proveedor.

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
- Modelo de ejemplo: `byteplus-plan/ark-code-latest`
- CLI: `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

La incorporación por defecto se orienta a la superficie de codificación, pero el catálogo general `byteplus/*`
se registra al mismo tiempo.

En los selectores de modelos de incorporación/configuración, la elección de autenticación de BytePlus prefiere tanto las filas `byteplus/*` como `byteplus-plan/*`. Si esos modelos aún no se han cargado, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector con ámbito de proveedor vacío.

Modelos disponibles:

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

Modelos de código (`byteplus-plan`):

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

MiniMax se configura a través de `models.providers` porque utiliza puntos de conexión personalizados:

- OAuth de MiniMax (Global): `--auth-choice minimax-global-oauth`
- OAuth de MiniMax (CN): `--auth-choice minimax-cn-oauth`
- Clave de API de MiniMax (Global): `--auth-choice minimax-global-api`
- Clave de API de MiniMax (CN): `--auth-choice minimax-cn-api`
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o
  `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/en/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw desactiva el pensamiento por
defecto a menos que lo establezca explícitamente, y `/fast on` reescribe
`MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat permanecen en `minimax/MiniMax-M2.7`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es `MiniMax-VL-01` propiedad del complemento en ambas rutas de autenticación de MiniMax
- La búsqueda web permanece en el ID de proveedor `minimax`

### Ollama

Ollama se incluye como un complemento de proveedor empaquetado y utiliza la API nativa de Ollama:

- Proveedor: `ollama`
- Autenticación: No requerida (servidor local)
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

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando optas por participar con
`OLLAMA_API_KEY`, y el complemento de proveedor empaquetado añade Ollama directamente a
`openclaw onboard` y al selector de modelos. Consulta [/providers/ollama](/en/providers/ollama)
para obtener información sobre incorporación, modo en la nube/local y configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor empaquetado para servidores compatibles con OpenAI locales/autoalojados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de tu servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para optar por el descubrimiento automático localmente (cualquier valor funciona si tu servidor no aplica autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

Luego establezca un modelo (reemplace con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulte [/providers/vllm](/en/providers/vllm) para obtener detalles.

### SGLang

SGLang se incluye como un complemento de proveedor empaquetado para servidores compatibles con OpenAI autoalojados rápidos:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de tu servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para optar por el descubrimiento automático localmente (cualquier valor funciona si tu servidor no aplica autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

Luego establezca un modelo (reemplace con uno de los IDs devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulte [/providers/sglang](/en/providers/sglang) para obtener detalles.

### Proxies locales (LM Studio, vLLM, LiteLLM, etc.)

Ejemplo (compatible con OpenAI):

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
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
            id: "my-local-model",
            name: "Local Model",
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
  Cuando se omiten, OpenClaw utiliza de forma predeterminada:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.
- Para `api: "openai-completions"` en puntos de conexión no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
- Las rutas compatibles con OpenAI de tipo proxy también omiten el modelado de solicitudes exclusivo de OpenAI nativo: sin `service_tier`, sin Responses `store`, sin sugerencias de caché de indicaciones (prompt-cache), sin modelado de carga útil compatible con el razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
- Si `baseUrl` está vacío o se omite, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
- Por seguridad, un `compat.supportsDeveloperRole: true` explícito todavía se anula en los puntos de conexión `openai-completions` no nativos.

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Véase también: [/gateway/configuration](/en/gateway/configuration) para ejemplos de configuración completos.

## Relacionado

- [Modelos](/en/concepts/models) — configuración y alias de modelos
- [Conmutación por error de modelos](/en/concepts/model-failover) — cadenas de respaldo y comportamiento de reintentos
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults) — claves de configuración de modelos
- [Proveedores](/en/providers) — guías de configuración por proveedor

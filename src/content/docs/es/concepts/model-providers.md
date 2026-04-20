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

- Las referencias de modelos usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
- Si configura `agents.defaults.models`, se convierte en la lista de permitidos.
- Asistentes de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Las reglas de tiempo de ejecución de reserva, sondas de enfriamiento y la persistencia de anulación de sesión están
  documentadas en [/concepts/model-failover](/es/concepts/model-failover).
- `models.providers.*.models[].contextWindow` son metadatos nativos del modelo;
  `models.providers.*.models[].contextTokens` es el límite efectivo de tiempo de ejecución.
- Los complementos del proveedor pueden inyectar catálogos de modelos mediante `registerProvider({ catalog })`;
  OpenClaw fusiona esa salida en `models.providers` antes de escribir
  `models.json`.
- Los manifiestos del proveedor pueden declarar `providerAuthEnvVars` y
  `providerAuthAliases` para que las sondas de autenticación genéricas basadas en entorno y las variantes del proveedor
  no necesiten cargar el tiempo de ejecución del complemento. El mapa central de variables de entorno restante es ahora
  solo para proveedores principales/sin complemento y algunos casos de precedencia genérica, tales
  como la incorporación优先 con la clave API de Anthropic.
- Los complementos de proveedores también pueden poseer el comportamiento de tiempo de ejecución del proveedor a través de
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
- Nota: el `capabilities` de tiempo de ejecución del proveedor son metadatos compartidos del ejecutor (familia
  del proveedor, peculiaridades de la transcripción/herramientas, sugerencias de transporte/caché). No es lo
  mismo que el [modelo de capacidades públicas](/es/plugins/architecture#public-capability-model)
  que describe lo que registra un complemento (inferencia de texto, voz, etc.).
- El proveedor `codex` incluido está emparejado con el arnés del agente Codex incluido.
  Use `codex/gpt-*` cuando desee inicio de sesión propiedad de Codex, descubrimiento de modelos, reanudación
  nativa de hilos y ejecución en el servidor de aplicaciones. Las referencias `openai/gpt-*` simples continúan
  usando el proveedor OpenAI y el transporte normal del proveedor OpenClaw.
  Los despliegues solo de Codex pueden deshabilitar la alternativa automática a PI con
  `agents.defaults.embeddedHarness.fallback: "none"`; consulte
  [Codex Harness](/es/plugins/codex-harness).

## Comportamiento del proveedor propiedad del complemento

Los complementos de proveedor ahora pueden poseer la mayor parte de la lógica específica del proveedor, mientras que OpenClaw mantiene el bucle de inferencia genérico.

División típica:

- `auth[].run` / `auth[].runNonInteractive`: el proveedor es propietario de los flujos de incorporación/inicio de sesión para `openclaw onboard`, `openclaw models auth` y la configuración headless
- `wizard.setup` / `wizard.modelPicker`: el proveedor es propietario de las etiquetas de elección de autenticación, alias heredados, sugerencias de lista de permitidos de incorporación y entradas de configuración en los selectores de incorporación/modelos
- `catalog`: el proveedor aparece en `models.providers`
- `normalizeModelId`: el proveedor normaliza los identificadores de modelo heredados/versión preliminar antes de la búsqueda o canonización
- `normalizeTransport`: el proveedor normaliza la familia de transporte `api` / `baseUrl` antes del ensamblaje genérico del modelo; OpenClaw verifica primero el proveedor coincidente y luego otros complementos de proveedores con capacidades de enlace hasta que uno cambie realmente el transporte
- `normalizeConfig`: el proveedor normaliza la configuración `models.providers.<id>` antes de que el tiempo de ejecución la use; OpenClaw verifica primero el proveedor coincidente y luego otros complementos de proveedores con capacidades de enlace hasta que uno cambie realmente la configuración. Si ningún enlace de proveedor reescribe la configuración, los asistentes de la familia Google integrados aún normalizan las entradas de proveedores de Google compatibles.
- `applyNativeStreamingUsageCompat`: el proveedor aplica reescrituras de compatibilidad de uso de transmisión nativas impulsadas por el punto de conexión para proveedores de configuración
- `resolveConfigApiKey`: el proveedor resuelve la autenticación de marcador de entorno para proveedores de configuración sin forzar la carga completa de autenticación en tiempo de ejecución. `amazon-bedrock` también tiene un resolvedor de marcador de entorno AWS integrado aquí, aunque la autenticación en tiempo de ejecución de Bedrock usa la cadena predeterminada del AWS SDK.
- `resolveSyntheticAuth`: el proveedor puede exponer la disponibilidad de autenticación local/autoalojada u otra respaldada por configuración sin persistir secretos en texto sin formato
- `shouldDeferSyntheticProfileAuth`: el proveedor puede marcar los marcadores de posición de perfil sintético almacenados como de menor precedencia que la autenticación respaldada por entorno/configuración
- `resolveDynamicModel`: el proveedor acepta identificadores de modelo no presentes aún en el catálogo estático local
- `prepareDynamicModel`: el proveedor necesita una actualización de metadatos antes de reintentar la resolución dinámica
- `normalizeResolvedModel`: el proveedor necesita reescrituras de transporte o URL base
- `contributeResolvedModelCompat`: el proveedor contribuye con banderas de compatibilidad para sus modelos de proveedor incluso cuando llegan a través de otro transporte compatible
- `capabilities`: el proveedor publica peculiaridades de transcripción/herramientas/familia de proveedores
- `normalizeToolSchemas`: el proveedor limpia los esquemas de herramientas antes de que el runner integrado los vea
- `inspectToolSchemas`: el proveedor muestra advertencias de esquema específicas del transporte después de la normalización
- `resolveReasoningOutputMode`: el proveedor elige contratos de salida de razonamiento nativos frente a etiquetados
- `prepareExtraParams`: el proveedor establece valores predeterminados o normaliza los parámetros de solicitud por modelo
- `createStreamFn`: el proveedor reemplaza la ruta de flujo normal con un transporte completamente personalizado
- `wrapStreamFn`: el proveedor aplica encabezados/cuerpo de solicitud/contenedores de compatibilidad de modelo
- `resolveTransportTurnState`: el proveedor suministra encabezados o metadatos de transporte nativos por turno
- `resolveWebSocketSessionPolicy`: el proveedor suministra encabezados de sesión WebSocket nativos o política de enfriamiento de sesión
- `createEmbeddingProvider`: el proveedor es propietario del comportamiento de incrustación de memoria cuando corresponde al complemento del proveedor en lugar del conmutador de incrustación central
- `formatApiKey`: el proveedor formatea los perfiles de autenticación almacenados en la cadena `apiKey` esperada por el transporte
- `refreshOAuth`: el proveedor es propietario de la actualización de OAuth cuando los actualizadores compartidos `pi-ai` no son suficientes
- `buildAuthDoctorHint`: el proveedor añade orientación de reparación cuando falla la actualización de OAuth
- `matchesContextOverflowError`: el proveedor reconoce errores de desbordamiento de ventana de contexto específicos del proveedor que las heurísticas genéricas pasarían por alto
- `classifyFailoverReason`: el proveedor asigna errores de transporte/API sin procesar específicos del proveedor a motivos de conmutación por error, como límite de tasa o sobrecarga
- `isCacheTtlEligible`: el proveedor decide qué identificadores de modelo ascendente admiten TTL de caché de solicitud
- `buildMissingAuthMessage`: el proveedor reemplaza el error genérico del almacén de autenticación con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: el proveedor oculta filas obsoletas del origen y puede devolver un error propio del proveedor para fallos de resolución directa
- `augmentModelCatalog`: el proveedor añade filas sintéticas/finales del catálogo después del descubrimiento y la fusión de la configuración
- `isBinaryThinking`: el proveedor es propietario de la experiencia de usuario (UX) de pensamiento binario encendido/apagado
- `supportsXHighThinking`: el proveedor inscribe los modelos seleccionados en `xhigh`
- `resolveDefaultThinkingLevel`: el proveedor posee la política `/think` predeterminada para una familia de modelos
- `applyConfigDefaults`: el proveedor aplica valores predeterminados globales específicos del proveedor durante la materialización de la configuración basándose en el modo de autenticación, el entorno o la familia de modelos
- `isModernModelRef`: el proveedor posee la coincidencia del modelo preferido en vivo/pruebas de humo
- `prepareRuntimeAuth`: el proveedor convierte una credencial configurada en un token de tiempo de ejecución de corta duración
- `resolveUsageAuth`: el proveedor resuelve las credenciales de uso/cuota para `/usage` y las superficies relacionadas de estado/informes
- `fetchUsageSnapshot`: el proveedor posee la obtución/análisis del punto final de uso, mientras que el núcleo sigue siendo propietario del contenedor del resumen y el formato
- `onModelSelected`: el proveedor ejecuta efectos secundarios posteriores a la selección, como telemetría o contabilidad de sesiones propiedad del proveedor

Ejemplos incluidos actualmente:

- `anthropic`: respaldo de compatibilidad futura de Claude 4.6, sugerencias de reparación de autenticación, obtención del punto final de uso, metadatos de caché-TTL/familia del proveedor y valores predeterminados de configuración global con conocimiento de autenticación
- `amazon-bedrock`: coincidencia de desbordamiento de contexto propiedad del proveedor y clasificación de motivos de conmutación por error para errores de limitación/no preparación específicos de Bedrock, además de la familia de retransmisión `anthropic-by-model` compartida para guardias de política de retransmisión solo de Claude en el tráfico de Anthropic
- `anthropic-vertex`: guardias de política de retransmisión solo de Claude en el tráfico de mensajes de Anthropic
- `openrouter`: identificadores de modelo de paso a través, contenedores de solicitudes, sugerencias de capacidad del proveedor, saneamiento de firma de pensamiento de Gemini en el tráfico proxy de Gemini, inyección de razonamiento proxy a través de la familia de flujo `openrouter-thinking`, reenvío de metadatos de enrutamiento y política de caché-TTL
- `github-copilot`: incorporación/inicio de sesión del dispositivo, reserva compatible con versiones futuras del modelo,
  sugerencias de transcripción de pensamiento de Claude, intercambio de tokens en tiempo de ejecución y obtención
  del punto de conexión de uso
- `openai`: reserva compatible con versiones futuras de GPT-5.4, normalización
  de transporte directo de OpenAI, sugerencias de autenticación faltante compatibles con Codex, supresión de Spark, filas
  sintéticas del catálogo de OpenAI/Codex, política de modelos en vivo/pensamiento, normalización de alias de tokens de uso
  (familias `input` / `output` y `prompt` / `completion`), la
  familia de flujo compartida `openai-responses-defaults` para envoltorios nativos de OpenAI/Codex,
  metadatos de familia de proveedor, registro de proveedor de generación de imágenes incluido
  para `gpt-image-1` y registro de proveedor de generación de videos incluido
  para `sora-2`
- `google` y `google-gemini-cli`: reserva compatible con versiones futuras de Gemini 3.1,
  validación de repetición nativa de Gemini, saneamiento de repetición de arranque, modo
  de salida de razonamiento etiquetado, coincidencia de modelos modernos, registro de proveedor de generación de imágenes
  incluido para modelos de vista previa de imágenes de Gemini y registro
  de proveedor de generación de videos incluido para modelos Veo; Gemini CLI OAuth también
  gestiona el formato del token del perfil de autenticación, el análisis de tokens de uso y la obtención
  del punto de conexión de cuota para superficies de uso
- `moonshot`: transporte compartido, normalización de carga de pensamiento propiedad del complemento
- `kilocode`: transporte compartido, encabezados de solicitud propiedad del complemento, normalización de carga de razonamiento,
  saneamiento de firma de pensamiento de Gemini proxy y política de TTL de
  caché
- `zai`: reserva compatible con versiones futuras de GLM-5, valores predeterminados de `tool_stream`, política de TTL
  de caché, política de modelos en vivo/pensamiento binario y obtención de autenticación de uso + cuota;
  los ids `glm-5*` desconocidos se sintetizan a partir de la plantilla `glm-4.7` incluida
- `xai`: normalización del transporte de Responses nativo, reescrituras de alias `/fast` para
  las variantes rápidas de Grok, `tool_stream` predeterminado, limpieza de esquemas de herramientas /
  razonamiento-payload específicos de xAI, y registro agrupado del proveedor
  de generación de video para `grok-imagine-video`
- `mistral`: metadatos de capacidad propiedad del complemento
- `opencode` y `opencode-go`: metadatos de capacidad propiedad del complemento más
  saneamiento de firmas de pensamiento proxy-Gemini
- `alibaba`: catálogo de generación de video propiedad del complemento para referencias directas de modelos Wan
  tales como `alibaba/wan2.6-t2v`
- `byteplus`: catálogos propiedad del complemento más registro agrupado del proveedor
  de generación de video para modelos de texto a video/imagen a video de Seedance
- `fal`: registro agrupado del proveedor de generación de video para registro del proveedor
  de generación de imágenes de terceros alojado para modelos de imagen FLUX más registro
  agrupado del proveedor de generación de video para modelos de video de terceros alojados
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`,
  `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway` y `volcengine`:
  solo catálogos propiedad del complemento
- `qwen`: catálogos propiedad del complemento para modelos de texto más registros
  compartidos de proveedores de comprensión de medios y generación de video para sus
  superficies multimodales; la generación de video Qwen utiliza los puntos de conexión de video
  Standard DashScope con modelos Wan agrupados tales como `wan2.6-t2v` y `wan2.7-r2v`
- `runway`: registro del proveedor de generación de video propiedad del complemento para modelos
  nativos basados en tareas de Runway tales como `gen4.5`
- `minimax`: catálogos propiedad del plugin, registro de proveedor de generación de video incluido para modelos de video Hailuo, registro de proveedor de generación de imágenes incluido para `image-01`, selección híbrida de política de repetición Anthropic/OpenAI y lógica de autenticación/instantánea de uso
- `together`: catálogos propiedad del plugin además de registro de proveedor de generación de video incluido para modelos de video Wan
- `xiaomi`: catálogos propiedad del plugin además de lógica de autenticación/instantánea de uso

El plugin incluido `openai` ahora posee ambos ids de proveedor: `openai` y `openai-codex`.

Eso cubre los proveedores que todavía se ajustan a los transportes normales de OpenClaw. Un proveedor que necesita un ejecutor de solicitudes totalmente personalizado es una superficie de extensión separada y más profunda.

## Rotación de claves API

- Admite la rotación genérica de proveedores para proveedores seleccionados.
- Configure múltiples claves a través de:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (única anulación en vivo, prioridad más alta)
  - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
  - `<PROVIDER>_API_KEY` (clave principal)
  - `<PROVIDER>_API_KEY_*` (lista numerada, p. ej. `<PROVIDER>_API_KEY_1`)
- Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como alternativa.
- El orden de selección de claves preserva la prioridad y deduplica los valores.
- Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de tasa (por ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`,
  `workers_ai ... quota limit exceeded`, o mensajes periódicos de límite de uso).
- Los fallos que no son por límite de tasa fallan inmediatamente; no se intenta la rotación de claves.
- Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

## Proveedores integrados (catálogo pi-ai)

OpenClaw incluye el catálogo pi-ai. Estos proveedores no requieren configuración `models.providers`; simplemente configure la autenticación y elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, además de `OPENCLAW_LIVE_OPENAI_KEY` (única anulación)
- Modelos de ejemplo: `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto` (primero WebSocket, respaldo SSE)
- Anular por modelo a través de `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- El calentamiento del WebSocket de respuestas de OpenAI predeterminado está habilitado a través de `params.openaiWsWarmup` (`true`/`false`)
- El procesamiento prioritario de OpenAI se puede habilitar a través de `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` asignan solicitudes de respuestas directas de `openai/*` a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando desee un nivel explícito en lugar del interruptor `/fast` compartido
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`,
  `User-Agent`) se aplican solo en el tráfico nativo de OpenAI a `api.openai.com`, no en
  proxies genéricos compatibles con OpenAI
- Las rutas nativas de OpenAI también mantienen `store` de respuestas, sugerencias de caché de solicitudes y
  configuración de carga compatible con el razonamiento de OpenAI; las rutas de proxy no
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque la API en vivo de OpenAI la rechaza; Spark se trata solo como Codex

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
- Las solicitudes públicas directas de Anthropic admiten el interruptor `/fast` compartido y `params.fastMode`, incluido el tráfico autenticado con clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo asigna a `service_tier` de Anthropic (`auto` vs `standard_only`)
- Nota de Anthropic: El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata la reutilización de la CLI de Claude y el uso de `claude -p` como autorizados para esta integración, a menos que Anthropic publique una nueva política.
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
- Anular por modelo mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes nativas de Codex Responses (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`,
  `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia
  `chatgpt.com/backend-api`, no en proxys genéricos compatibles con OpenAI
- Comparte el mismo interruptor `/fast` y la configuración `params.fastMode` que el `openai/*` directo; OpenClaw lo asigna a `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` permanece disponible cuando el catálogo OAuth de Codex lo expone; sujeto a derechos
- `openai-codex/gpt-5.4` mantiene `contextWindow = 1050000` nativo y un tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite de tiempo de ejecución con `models.providers.openai-codex.models[].contextTokens`
- Nota de política: OpenAI Codex OAuth es compatible explícitamente con herramientas/flujo de trabajo externos como OpenClaw.

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

### Otras opciones alojadas de estilo suscripción

- [Qwen Cloud](/es/providers/qwen): Superficie del proveedor Qwen Cloud además de la asignación de puntos finales de Alibaba DashScope y Coding Plan
- [MiniMax](/es/providers/minimax): Acceso mediante OAuth o clave API de MiniMax Coding Plan
- [Modelos GLM](/es/providers/glm): Puntos finales de Coding Plan Z.AI o API general

### OpenCode

- Autenticación: `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`)
- Proveedor de tiempo de ejecución Zen: `opencode`
- Proveedor de tiempo de ejecución de Go: `opencode-go`
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
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, reserva de `GOOGLE_API_KEY` y `OPENCLAW_LIVE_GEMINI_KEY` (única anulación)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent`
  (o el heredado `cached_content`) para reenviar un identificador
  nativo del proveedor `cachedContents/...`; los aciertos en la caché de Gemini aparecen como `cacheRead` de OpenClaw

### CLI de Google Vertex y Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa gcloud ADC; la CLI de Gemini usa su propio flujo OAuth
- Precaución: OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han informado de restricciones en su cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.
- Gemini CLI OAuth se incluye como parte del complemento incluido `google`.
  - Primero instale la CLI de Gemini:
    - `brew install gemini-cli`
    - o `npm install -g @google/gemini-cli`
  - Activar: `openclaw plugins enable google`
  - Iniciar sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`
  - Nota: **no** debe pegar un ID de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena
    tokens en perfiles de autenticación en el host de la puerta de enlace.
  - Si las solicitudes fallan después del inicio de sesión, configure `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  - Las respuestas JSON de Gemini CLI se analizan a partir de `response`; el uso recurre a
    `stats`, con `stats.cached` normalizado a `cacheRead` de OpenClaw.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Alias: `z.ai/*` y `z-ai/*` normalizan a `zai/*`
  - `zai-api-key` detecta automáticamente el punto final Z.AI coincidente; `zai-coding-global`, `zai-coding-cn`, `zai-global` y `zai-cn` fuerzan una superficie específica

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
- El catálogo de respaldo estático incluye `kilocode/kilo/auto`; el descubrimiento en vivo `https://api.kilo.ai/api/gateway/models` puede ampliar aún más el catálogo en tiempo de ejecución.
- El enrutamiento exacto aguas arriba detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway, no está codificado en OpenClaw.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedor incluidos

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Modelo de ejemplo: `openrouter/auto`
- OpenClaw aplica los encabezados de atribución de aplicación documentados de OpenRouter solo cuando la solicitud apunta realmente a `openrouter.ai`
- Los marcadores `cache_control` de Anthropic específicos de OpenRouter también se limitan a las rutas verificadas de OpenRouter, no a URL de proxy arbitrarias
- OpenRouter permanece en la ruta compatible con OpenAI de estilo proxy, por lo que el modelado de solicitudes nativas solo de OpenAI (`serviceTier`, Respuestas `store`, sugerencias de caché de indicaciones, cargas útiles de compatibilidad de razonamiento de OpenAI) no se reenvía
- Las referencias de OpenRouter respaldadas por Gemini mantienen solo la saneamiento de firmas de pensamiento
  de proxy-Gemini; la validación de repetición nativa de Gemini y las reescrituras de arranque permanecen desactivadas
- Kilo Gateway: `kilocode` (`KILOCODE_API_KEY`)
- Modelo de ejemplo: `kilocode/kilo/auto`
- Las referencias de Kilo con respaldo de Gemini mantienen la misma ruta de saneamiento de firma de pensamiento proxy-Gemini; `kilocode/kilo/auto` y otras sugerencias no admitidas para razonamiento por proxy omiten la inyección de razonamiento por proxy
- MiniMax: `minimax` (clave de API) y `minimax-portal` (OAuth)
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`
- Modelo de ejemplo: `minimax/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7`
- La configuración de incorporación/clave de API de MiniMax escribe definiciones explícitas de modelos M2.7 con
  `input: ["text", "image"]`; el catálogo de proveedores incluido mantiene las referencias de chat
  solo de texto hasta que se materializa esa configuración de proveedor
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
  - Las solicitudes nativas integradas de xAI usan la ruta de Respuestas de xAI
  - `/fast` o `params.fastMode: true` reescribe `grok-3`, `grok-3-mini`,
    `grok-4` y `grok-4-0709` a sus variantes `*-fast`
  - `tool_stream` está activado de forma predeterminada; establezca
    `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
    desactivarlo
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- Modelo de ejemplo: `mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Los modelos GLM en Cerebras usan los identificadores `zai-glm-4.7` y `zai-glm-4.6`.
  - URL base compatible con OpenAI: `https://api.cerebras.ai/v1`.
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modelo de ejemplo de Hugging Face Inference: `huggingface/deepseek-ai/DeepSeek-R1`; CLI: `openclaw onboard --auth-choice huggingface-api-key`. Consulte [Hugging Face (Inference)](/es/providers/huggingface).

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o
proxies compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedores incluidos a continuación ya publican un catálogo predeterminado.
Use entradas explícitas `models.providers.<id>` solo cuando desee anular la
URL base, los encabezados o la lista de modelos predeterminados.

### Moonshot AI (Kimi)

Moonshot se incluye como un complemento de proveedor. Use el proveedor integrado de forma
predeterminada y agregue una entrada explícita `models.providers.moonshot` solo cuando
necesite anular la URL base o los metadatos del modelo:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.5`
- CLI: `openclaw onboard --auth-choice moonshot-api-key` o `openclaw onboard --auth-choice moonshot-api-key-cn`

IDs de modelos Kimi K2:

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

El modelo heredado `kimi/k2p5` sigue siendo aceptado como un ID de modelo de compatibilidad.

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

La incorporación (onboarding) tiene como valor predeterminado la superficie de codificación, pero el catálogo general `volcengine/*`
se registra al mismo tiempo.

En los selectores de modelo de incorporación/configuración, la elección de autenticación de Volcengine prefiere ambas
filas `volcengine/*` y `volcengine-plan/*`. Si esos modelos aún no se han cargado,
OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector
de alcance del proveedor vacío.

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

La incorporación tiene como valor predeterminado la superficie de codificación, pero el catálogo general `byteplus/*`
se registra al mismo tiempo.

En los selectores de modelo de incorporación/configuración, la elección de autenticación de BytePlus prefiere ambas
filas `byteplus/*` y `byteplus-plan/*`. Si esos modelos aún no se han cargado,
OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector
de alcance del proveedor vacío.

Modelos disponibles:

- `byteplus/seed-1-8-251228` (Semilla 1.8)
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

MiniMax se configura a través de `models.providers` porque utiliza puntos de conexión personalizados:

- MiniMax OAuth (Global): `--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN): `--auth-choice minimax-cn-oauth`
- Clave de API de MiniMax (Global): `--auth-choice minimax-global-api`
- Clave de API de MiniMax (CN): `--auth-choice minimax-cn-api`
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o
  `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw deshabilita el pensamiento de
manera predeterminada a menos que lo configure explícitamente, y `/fast on` reescribe
`MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat se mantienen en `minimax/MiniMax-M2.7`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es `MiniMax-VL-01` propiedad del complemento en ambas rutas de autenticación de MiniMax
- La búsqueda web se mantiene en el id. de proveedor `minimax`

### LM Studio

LM Studio se incluye como un complemento de proveedor que utiliza la API nativa:

- Proveedor: `lmstudio`
- Autenticación: `LM_API_TOKEN`
- URL base de inferencia predeterminada: `http://localhost:1234/v1`

Luego configure un modelo (reemplácelo con uno de los IDs devueltos por `http://localhost:1234/api/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw usa la `/api/v1/models` y `/api/v1/models/load` nativas de LM Studio
para el descubrimiento y la carga automática, con `/v1/chat/completions` para la inferencia de forma predeterminada.
Consulte [/providers/lmstudio](/es/providers/lmstudio) para la configuración y solución de problemas.

### Ollama

Ollama se incluye como un complemento de proveedor empaquetado y utiliza la API nativa de Ollama:

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

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando acepta con
`OLLAMA_API_KEY`, y el complemento de proveedor empaquetado añade Ollama directamente a
`openclaw onboard` y al selector de modelos. Consulte [/providers/ollama](/es/providers/ollama)
para la incorporación, el modo en la nube/local y la configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor empaquetado para servidores compatibles con OpenAI locales/autoalojados:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de tu servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para aceptar el descubrimiento automático localmente (cualquier valor funciona si su servidor no exige autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

A continuación, configure un modelo (reemplácelo con uno de los ID devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consulte [/providers/vllm](/es/providers/vllm) para obtener más detalles.

### SGLang

SGLang se incluye como un complemento de proveedor empaquetado para servidores compatibles con OpenAI autoalojados rápidos:

- Proveedor: `sglang`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:30000/v1`

Para aceptar el descubrimiento automático localmente (cualquier valor funciona si su servidor no exige autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

A continuación, configure un modelo (reemplácelo con uno de los ID devueltos por `/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consulte [/providers/sglang](/es/providers/sglang) para obtener más detalles.

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
        apiKey: "${LM_API_TOKEN}",
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
  Cuando se omiten, OpenClaw usa de forma predeterminada:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: establecer valores explícitos que coincidan con los límites de su proxy/modelo.
- Para `api: "openai-completions"` en puntos finales no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
- Las rutas compatibles con OpenAI de tipo proxy también omiten el moldeado de solicitudes nativas solo de OpenAI: sin `service_tier`, sin Responses `store`, sin sugerencias de caché de solicitudes, sin moldeado de carga útil de compatibilidad de razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
- Si `baseUrl` está vacío/omitido, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve en `api.openai.com`).
- Por seguridad, un `compat.supportsDeveloperRole: true` explícito todavía se anula en los puntos finales `openai-completions` no nativos.

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Véase también: [/gateway/configuration](/es/gateway/configuration) para ejemplos completos de configuración.

## Relacionado

- [Modelos](/es/concepts/models) — configuración y alias de modelos
- [Conmutación por error de modelos](/es/concepts/model-failover) — cadenas de reserva y comportamiento de reintentos
- [Referencia de configuración](/es/gateway/configuration-reference#agent-defaults) — claves de configuración de modelos
- [Proveedores](/es/providers) — guías de configuración por proveedor

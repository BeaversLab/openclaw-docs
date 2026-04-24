---
summary: "Resumen de proveedores de modelos con configuraciones de ejemplo + flujos de CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Proveedores de modelos"
---

# Proveedores de modelos

Esta página trata sobre **proveedores de LLM/modelos** (no canales de chat como WhatsApp/Telegram).
Para ver las reglas de selección de modelos, consulte [/concepts/models](/es/concepts/models).

## Reglas rápidas

- Las referencias de modelos usan `provider/model` (ejemplo: `opencode/claude-opus-4-6`).
- Si configura `agents.defaults.models`, se convierte en la lista de permitidos.
- Asistentes de CLI: `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Las reglas de tiempo de ejecución de respaldo (fallback), las sondas de enfriamiento (cooldown) y la persistencia de anulación de sesión están
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
- Los complementos (plugins) del proveedor también pueden controlar el comportamiento en tiempo de ejecución del proveedor a través de
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
  `augmentModelCatalog`, `resolveThinkingProfile`, `isBinaryThinking`,
  `supportsXHighThinking`, `resolveDefaultThinkingLevel`,
  `applyConfigDefaults`, `isModernModelRef`,
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`, y
  `onModelSelected`.
- Nota: los metadatos `capabilities` del tiempo de ejecución del proveedor son metadatos compartidos del ejecutor (familia
  del proveedor, peculiaridades de la transcripción/herramientas, sugerencias de transporte/caché). No son lo
  mismo que el [modelo de capacidades públicas](/es/plugins/architecture#public-capability-model)
  que describe lo que registra un complemento (inferencia de texto, voz, etc.).
- El proveedor incluido `codex` está emparejado con el arnés del agente Codex incluido.
  Use `codex/gpt-*` cuando desee inicio de sesión propiedad de Codex, descubrimiento de modelos, reanudación
  nativa de hilos y ejecución en el servidor de aplicaciones. Las referencias simples `openai/gpt-*` continúan
  utilizando el proveedor OpenAI y el transporte normal del proveedor OpenClaw.
  Las implementaciones solo de Codex pueden deshabilitar la reserva automática a PI con
  `agents.defaults.embeddedHarness.fallback: "none"`; consulte
  [Codex Harness](/es/plugins/codex-harness).

## Comportamiento del proveedor propiedad del complemento

Los complementos de proveedor ahora pueden poseer la mayor parte de la lógica específica del proveedor, mientras que OpenClaw mantiene el bucle de inferencia genérico.

División típica:

- `auth[].run` / `auth[].runNonInteractive`: el proveedor posee los flujos de incorporación/inicio de sesión
  para `openclaw onboard`, `openclaw models auth` y la configuración sin interfaz gráfica
- `wizard.setup` / `wizard.modelPicker`: el proveedor posee las etiquetas de elección de autenticación,
  alias heredados, sugerencias de lista de permitidos de incorporación y entradas de configuración en los selectores de incorporación/modelos
- `catalog`: el proveedor aparece en `models.providers`
- `normalizeModelId`: el proveedor normaliza los identificadores de modelos heredados/de vista previa antes
  de la búsqueda o canonización
- `normalizeTransport`: el proveedor normaliza la familia de transporte `api` / `baseUrl`
  antes del ensamblaje genérico del modelo; OpenClaw verifica primero el proveedor coincidente,
  y luego otros complementos de proveedor con capacidad de enganche hasta que uno realmente cambie el
  transporte
- `normalizeConfig`: el proveedor normaliza la configuración `models.providers.<id>` antes
  de que el tiempo de ejecución la use; OpenClaw verifica primero el proveedor coincidente, y luego otros
  complementos de proveedor con capacidad de enganche hasta que uno realmente cambie la configuración. Si ningún
  enlace de proveedor reescribe la configuración, los asistentes de familia Google incluidos aún
  normalizan las entradas de proveedores de Google compatibles.
- `applyNativeStreamingUsageCompat`: el proveedor aplica reescrituras de compatibilidad de uso de transmisión nativa impulsadas por el punto de conexión para proveedores de configuración
- `resolveConfigApiKey`: el proveedor resuelve la autenticación de marcador de entorno para proveedores de configuración
  sin forzar la carga completa de autenticación en tiempo de ejecución. `amazon-bedrock` también tiene un
  solucionador de marcador de entorno AWS integrado aquí, aunque la autenticación en tiempo de ejecución de Bedrock usa
  la cadena predeterminada del AWS SDK.
- `resolveSyntheticAuth`: proveedor puede exponer disponibilidad de autenticación local/autoalojada u otra respaldada por configuración sin persistir secretos en texto plano
- `shouldDeferSyntheticProfileAuth`: proveedor puede marcar marcadores de posición de perfil sintético almacenados como de menor precedencia que la autenticación respaldada por entorno/configuración
- `resolveDynamicModel`: proveedor acepta IDs de modelo no presentes en el catálogo estático local todavía
- `prepareDynamicModel`: proveedor necesita una actualización de metadatos antes de reintentar la resolución dinámica
- `normalizeResolvedModel`: proveedor necesita reescrituras de transporte o URL base
- `contributeResolvedModelCompat`: proveedor aporta banderas de compatibilidad para sus modelos de proveedor incluso cuando llegan a través de otro transporte compatible
- `capabilities`: proveedor publica peculiaridades de transcripción/herramientas/familia de proveedores
- `normalizeToolSchemas`: proveedor limpia esquemas de herramientas antes de que el runner integrado los vea
- `inspectToolSchemas`: proveedor muestra advertencias de esquema específicas del transporte después de la normalización
- `resolveReasoningOutputMode`: proveedor elige contratos de salida de razonamiento nativos frente a etiquetados
- `prepareExtraParams`: proveedor establece valores predeterminados o normaliza parámetros de solicitud por modelo
- `createStreamFn`: proveedor reemplaza la ruta de flujo normal con un transporte totalmente personalizado
- `wrapStreamFn`: proveedor aplica encabezados de solicitud/cuerpo/envoltorios de compatibilidad de modelo
- `resolveTransportTurnState`: proveedor proporciona encabezados de transporte nativos o metadatos por turno
- `resolveWebSocketSessionPolicy`: proveedor proporciona encabezados de sesión WebSocket nativos o política de enfriamiento de sesión
- `createEmbeddingProvider`: proveedor posee el comportamiento de incrustación de memoria cuando pertenece al complemento del proveedor en lugar del concentrador de incrustación central
- `formatApiKey`: proveedor formatea perfiles de autenticación almacenados en la cadena `apiKey` esperada por el transporte
- `refreshOAuth`: proveedor gestiona la actualización de OAuth cuando los actualizadores `pi-ai` compartidos no son suficientes
- `buildAuthDoctorHint`: proveedor añade guía de reparación cuando falla la actualización de OAuth
- `matchesContextOverflowError`: el proveedor reconoce errores de desbordamiento de la ventana de contexto específicos del proveedor que las heurísticas genéricas pasarían por alto
- `classifyFailoverReason`: el proveedor asigna errores de transporte/API sin procesar específicos del proveedor a motivos de conmutación por error, como límite de velocidad o sobrecarga
- `isCacheTtlEligible`: el proveedor decide qué identificadores de modelo ascendentes admiten el TTL de caché de solicitudes
- `buildMissingAuthMessage`: el proveedor reemplaza el error genérico del almacén de autenticación con una sugerencia de recuperación específica del proveedor
- `suppressBuiltInModel`: el proveedor oculta filas ascendentes obsoletas y puede devolver un error propiedad del proveedor para fallos de resolución directa
- `augmentModelCatalog`: el proveedor añade filas sintéticas/finales del catálogo después del descubrimiento y la fusión de configuraciones
- `resolveThinkingProfile`: el proveedor posee el conjunto de niveles exacto `/think`, etiquetas de visualización opcionales y el nivel predeterminado para un modelo seleccionado
- `isBinaryThinking`: gancho de compatibilidad para la experiencia de usuario de pensamiento binario encendido/apagado
- `supportsXHighThinking`: gancho de compatibilidad para modelos `xhigh` seleccionados
- `resolveDefaultThinkingLevel`: gancho de compatibilidad para la política `/think` predeterminada
- `applyConfigDefaults`: el proveedor aplica valores predeterminados globales específicos del proveedor durante la materialización de la configuración según el modo de autenticación, el entorno o la familia de modelos
- `isModernModelRef`: el proveedor posee la coincidencia de modelos preferidos en vivo/prueba
- `prepareRuntimeAuth`: el proveedor convierte una credencial configurada en un token de tiempo de ejecución de corta duración
- `resolveUsageAuth`: el proveedor resuelve las credenciales de uso/cuota para `/usage` y superficies relacionadas de estado/informes
- `fetchUsageSnapshot`: el proveedor posee la obtucción/análisis del punto de conexión de uso, mientras que el núcleo sigue siendo propietario del shell de resumen y el formato
- `onModelSelected`: el proveedor ejecuta efectos secundarios posteriores a la selección, como telemetría o contabilidad de sesiones propiedad del proveedor

Ejemplos empaquetados actuales:

- `anthropic`: reserva de compatibilidad futura de Claude 4.6, sugerencias de reparación de autenticación, obtención del punto de conexión de uso, metadatos de caché-TTL/familia del proveedor, y valores predeterminados de configuración global conscientes de la autenticación
- `amazon-bedrock`: coincidencia de desbordamiento de contexto propiedad del proveedor y conmutación por error
  clasificación de motivos para errores de limitación/no listos específicos de Bedrock, más
  la familia de retransmisión `anthropic-by-model` compartida para protecciones de política de retransmisión solo para Claude
  en el tráfico de Anthropic
- `anthropic-vertex`: protecciones de política de retransmisión solo para Claude en el tráfico de mensajes de Anthropic
- `openrouter`: ids de modelo de paso a través, contenedores de solicitudes, sugerencias de capacidad del proveedor,
  saneamiento de firma de pensamiento de Gemini en el tráfico proxy de Gemini, inyección de
  razonamiento proxy a través de la familia de transmisión `openrouter-thinking`, reenvío de
  metadatos de enrutamiento y política de caché-TTL
- `github-copilot`: incorporación/inicio de sesión de dispositivo, reserva de modelo compatible con versiones futuras,
  sugerencias de transcripción de pensamiento de Claude, intercambio de tokens en tiempo de ejecución y obtención del
  punto final de uso
- `openai`: reserva compatible con versiones futuras de GPT-5.4, normalización del transporte
  directo de OpenAI, sugerencias de autenticación faltante compatibles con Codex, supresión de Spark, filas de catálogo
  sintéticas de OpenAI/Codex, política de modelos en vivo/pensamiento, normalización de alias de tokens de uso
  (familias `input` / `output` y `prompt` / `completion`), la
  familia de transmisión `openai-responses-defaults` compartida para contenedores
  nativos de OpenAI/Codex, metadatos de familia de proveedor, registro de proveedor de generación de imágenes
  incluido para `gpt-image-2` y registro de proveedor de generación de video
  incluido para `sora-2`
- `google` y `google-gemini-cli`: reserva compatible con versiones futuras de Gemini 3.1,
  validación de retransmisión nativa de Gemini, saneamiento de retransmisión de arranque, modo de salida
  de razonamiento etiquetado, coincidencia de modelos modernos, registro de proveedor de generación de imágenes
  incluido para modelos de vista previa de imágenes de Gemini y registro de proveedor de
  generación de video incluido para modelos de Veo; Gemini CLI OAuth también
  posee el formato de tokens de perfil de autenticación, el análisis de tokens de uso y la obtención del
  punto final de cuota para superficies de uso
- `moonshot`: transporte compartido, normalización de carga útil de pensamiento propiedad del complemento
- `kilocode`: transporte compartido, encabezados de solicitud propiedad del complemento, normalización de razonamiento de carga útil, saneamiento de firma de pensamiento proxy-Gemini y política de TTL de caché
- `zai`: reserva de compatibilidad futura de GLM-5, valores predeterminados de `tool_stream`, política de TTL de caché, política de pensamiento binario/modelo en vivo y obtención de autenticación de uso + cuota; ids desconocidos de `glm-5*` se sintetizan a partir de la plantilla incluida `glm-4.7`
- `xai`: normalización del transporte nativo de Responses, reescrituras de alias de `/fast` para variantes rápidas de Grok, `tool_stream` predeterminado, limpieza específica de xAI de esquema de herramientas / carga útil de razonamiento y registro de proveedor de generación de video incluido para `grok-imagine-video`
- `mistral`: metadatos de capacidad propiedad del complemento
- `opencode` y `opencode-go`: metadatos de capacidad propiedad del complemento más saneamiento de firma de pensamiento proxy-Gemini
- `alibaba`: catálogo de generación de video propiedad del complemento para referencias directas de modelos Wan como `alibaba/wan2.6-t2v`
- `byteplus`: catálogos propiedad del complemento más registro de proveedor de generación de video incluido para modelos de texto a video/imagen a video de Seedance
- `fal`: registro de proveedor de generación de video incluido para registro de proveedor de terceros alojado para modelos de imagen FLUX más registro de proveedor de generación de video incluido para modelos de video de terceros alojados
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`, `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway` y `volcengine`: solo catálogos propiedad del complemento
- `qwen`: catálogos propiedad del complemento para modelos de texto más registros de proveedores de comprensión de medios y generación de videos compartidos para sus superficies multimodales; la generación de video Qwen utiliza los puntos finales de video de DashScope estándar con modelos Wan incluidos, como `wan2.6-t2v` y `wan2.7-r2v`
- `runway`: registro de proveedor de generación de video propiedad del complemento para modelos basados en tareas de Runway nativos, como `gen4.5`
- `minimax`: catálogos propiedad del complemento, registro de proveedor de generación de video incluido para modelos de video Hailuo, registro de proveedor de generación de imágenes incluido para `image-01`, selección de política de repetición híbrida de Anthropic/OpenAI y lógica de autenticación/instantánea de uso
- `together`: catálogos propiedad del complemento más registro de proveedor de generación de video incluido para modelos de video Wan
- `xiaomi`: catálogos propiedad del complemento más lógica de autenticación/instantánea de uso

El complemento `openai` incluido ahora posee ambos ID de proveedor: `openai` y `openai-codex`.

Eso cubre los proveedores que aún se ajustan a los transportes normales de OpenClaw. Un proveedor que necesita un ejecutor de solicitud totalmente personalizado es una superficie de extensión separada y más profunda.

## Rotación de clave de API

- Admite la rotación de proveedores genéricos para proveedores seleccionados.
- Configure varias claves a través de:
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (anulación única en vivo, prioridad más alta)
  - `<PROVIDER>_API_KEYS` (lista separada por comas o punto y coma)
  - `<PROVIDER>_API_KEY` (clave principal)
  - `<PROVIDER>_API_KEY_*` (lista numerada, p. ej. `<PROVIDER>_API_KEY_1`)
- Para los proveedores de Google, `GOOGLE_API_KEY` también se incluye como alternativa.
- El orden de selección de claves preserva la prioridad y elimina los valores duplicados.
- Las solicitudes se reintentan con la siguiente clave solo en respuestas de límite de velocidad (por
  ejemplo `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`,
  `workers_ai ... quota limit exceeded`, o mensajes periódicos de límite de uso).
- Los fallos que no son por límite de velocidad fallan inmediatamente; no se intenta la rotación de claves.
- Cuando fallan todas las claves candidatas, se devuelve el error final del último intento.

## Proveedores integrados (catálogo pi-ai)

OpenClaw incluye el catálogo pi‑ai. Estos proveedores no requieren **ninguna**
`models.providers` de configuración; simplemente configure la autenticación y elija un modelo.

### OpenAI

- Proveedor: `openai`
- Autenticación: `OPENAI_API_KEY`
- Rotación opcional: `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, más `OPENCLAW_LIVE_OPENAI_KEY` (anulación individual)
- Modelos de ejemplo: `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI: `openclaw onboard --auth-choice openai-api-key`
- El transporte predeterminado es `auto` (WebSocket primero, alternativa SSE)
- Anular por modelo mediante `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- El calentamiento previo de WebSocket de OpenAI Responses está habilitado de forma predeterminada mediante `params.openaiWsWarmup` (`true`/`false`)
- El procesamiento prioritario de OpenAI se puede habilitar mediante `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` y `params.fastMode` mapean las solicitudes directas de `openai/*` Responses a `service_tier=priority` en `api.openai.com`
- Use `params.serviceTier` cuando desee un nivel explícito en lugar del interruptor compartido `/fast`
- Los encabezados ocultos de atribución de OpenClaw (`originator`, `version`,
  `User-Agent`) se aplican solo en el tráfico nativo de OpenAI hacia `api.openai.com`, no en
  servidores proxy compatibles con OpenAI genéricos
- Las rutas nativas de OpenAI también conservan Responses `store`, sugerencias de caché de prompts y
  configuración de carga compatible con el razonamiento de OpenAI; las rutas de proxy no
- `openai/gpt-5.3-codex-spark` se suprime intencionalmente en OpenClaw porque la API en vivo de OpenAI la rechaza; Spark se trata como solo Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Proveedor: `anthropic`
- Autenticación: `ANTHROPIC_API_KEY`
- Rotación opcional: `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, además de `OPENCLAW_LIVE_ANTHROPIC_KEY` (anulación única)
- Modelo de ejemplo: `anthropic/claude-opus-4-6`
- CLI: `openclaw onboard --auth-choice apiKey`
- Las solicitudes públicas directas a Anthropic admiten el interruptor compartido `/fast` y `params.fastMode`, incluido el tráfico autenticado con clave de API y OAuth enviado a `api.anthropic.com`; OpenClaw lo asigna a Anthropic `service_tier` (`auto` vs `standard_only`)
- Nota de Anthropic: El personal de Anthropic nos dijo que el uso de la CLI de Claude al estilo OpenClaw está permitido nuevamente, por lo que OpenClaw trata la reutilización de la CLI de Claude y el uso de `claude -p` como autorizados para esta integración, a menos que Anthropic publique una nueva política.
- El token de configuración de Anthropic (setup-token) sigue disponible como una ruta de token compatible con OpenClaw, pero OpenClaw ahora prefiere la reutilización de la CLI de Claude y `claude -p` cuando están disponibles.

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
- El transporte predeterminado es `auto` (primero WebSocket, alternativa SSE)
- Anular por modelo mediante `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` o `"auto"`)
- `params.serviceTier` también se reenvía en las solicitudes nativas de Codex Responses (`chatgpt.com/backend-api`)
- Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`,
  `User-Agent`) solo se adjuntan en el tráfico nativo de Codex hacia
  `chatgpt.com/backend-api`, no en los proxies compatibles con OpenAI genéricos
- Comparte el mismo botón de alternancia `/fast` y la configuración `params.fastMode` que el `openai/*` directo; OpenClaw asigna eso a `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` permanece disponible cuando el catálogo OAuth de Codex lo expone; dependiente de derechos
- `openai-codex/gpt-5.4` mantiene `contextWindow = 1050000` nativo y un tiempo de ejecución predeterminado `contextTokens = 272000`; anule el límite de tiempo de ejecución con `models.providers.openai-codex.models[].contextTokens`
- Nota de política: OpenAI Codex OAuth es compatible explícitamente con herramientas/flujos de trabajo externos como OpenClaw.

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

### Otras opciones alojadas de tipo suscripción

- [Qwen Cloud](/es/providers/qwen): superficie del proveedor Qwen Cloud más Alibaba DashScope y la asignación de endpoints del Coding Plan
- [MiniMax](/es/providers/minimax): acceso OAuth o clave de API del MiniMax Coding Plan
- [GLM Models](/es/providers/glm): Z.AI Coding Plan o endpoints de API generales

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
- Rotación opcional: `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` de reserva y `OPENCLAW_LIVE_GEMINI_KEY` (anulación única)
- Modelos de ejemplo: `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilidad: la configuración heredada de OpenClaw que usa `google/gemini-3.1-flash-preview` se normaliza a `google/gemini-3-flash-preview`
- CLI: `openclaw onboard --auth-choice gemini-api-key`
- Las ejecuciones directas de Gemini también aceptan `agents.defaults.models["google/<model>"].params.cachedContent`
  (o el heredado `cached_content`) para reenviar un identificador
  `cachedContents/...` nativo del proveedor; los aciertos de caché de Gemini se muestran como `cacheRead` de OpenClaw

### CLI de Google Vertex y Gemini

- Proveedores: `google-vertex`, `google-gemini-cli`
- Autenticación: Vertex usa gcloud ADC; la CLI de Gemini usa su flujo OAuth
- Precaución: OAuth de la CLI de Gemini en OpenClaw es una integración no oficial. Algunos usuarios han reportado restricciones en su cuenta de Google después de usar clientes de terceros. Revise los términos de Google y use una cuenta no crítica si decide continuar.
- OAuth de la CLI de Gemini se incluye como parte del complemento incluido `google`.
  - Primero instale la CLI de Gemini:
    - `brew install gemini-cli`
    - o `npm install -g @google/gemini-cli`
  - Activar: `openclaw plugins enable google`
  - Iniciar sesión: `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modelo predeterminado: `google-gemini-cli/gemini-3-flash-preview`
  - Nota: **no** debe pegar un ID de cliente ni un secreto en `openclaw.json`. El flujo de inicio de sesión de la CLI almacena
    tokens en perfiles de autenticación en el host de la puerta de enlace.
  - Si las solicitudes fallan después del inicio de sesión, configure `GOOGLE_CLOUD_PROJECT` o `GOOGLE_CLOUD_PROJECT_ID` en el host de la puerta de enlace.
  - Las respuestas JSON de la CLI de Gemini se analizan desde `response`; el uso recurre a
    `stats`, con `stats.cached` normalizado a `cacheRead` de OpenClaw.

### Z.AI (GLM)

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- Modelo de ejemplo: `zai/glm-5.1`
- CLI: `openclaw onboard --auth-choice zai-api-key`
  - Alias: `z.ai/*` y `z-ai/*` se normalizan a `zai/*`
  - `zai-api-key` detecta automáticamente el endpoint Z.AI coincidente; `zai-coding-global`, `zai-coding-cn`, `zai-global` y `zai-cn` fuerzan una superficie específica

### Vercel AI Gateway

- Proveedor: `vercel-ai-gateway`
- Autenticación: `AI_GATEWAY_API_KEY`
- Modelos de ejemplo: `vercel-ai-gateway/anthropic/claude-opus-4.6`,
  `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Proveedor: `kilocode`
- Autenticación: `KILOCODE_API_KEY`
- Modelo de ejemplo: `kilocode/kilo/auto`
- CLI: `openclaw onboard --auth-choice kilocode-api-key`
- URL base: `https://api.kilo.ai/api/gateway/`
- El catálogo estático de reserva incluye `kilocode/kilo/auto`; el descubrimiento
  en vivo `https://api.kilo.ai/api/gateway/models` puede ampliar aún más el catálogo
  en tiempo de ejecución.
- El enrutamiento exacto al proveedor detrás de `kilocode/kilo/auto` es propiedad de Kilo Gateway,
  no está codificado en OpenClaw.

Consulte [/providers/kilocode](/es/providers/kilocode) para obtener detalles de configuración.

### Otros complementos de proveedor incluidos

- OpenRouter: `openrouter` (`OPENROUTER_API_KEY`)
- Modelos de ejemplo: `openrouter/auto`, `openrouter/moonshotai/kimi-k2.6`
- OpenClaw aplica los encabezados de atribución de aplicaciones documentados por OpenRouter solo cuando
  la solicitud realmente apunta a `openrouter.ai`
- Los marcadores `cache_control` específicos de Anthropic de OpenRouter también están limitados a
  las rutas verificadas de OpenRouter, no a URL de proxy arbitrarias
- OpenRouter permanece en la ruta compatible con OpenAI de estilo proxy, por lo que el modelado
  de solicitudes nativas solo para OpenAI (`serviceTier`, Responses `store`,
  sugerencias de caché de solicitud, payloads de compatibilidad de razonamiento de OpenAI) no se reenvía
- Las referencias de OpenRouter respaldadas por Gemini mantienen únicamente la saneamiento
  de firmas de pensamiento proxy-Gemini; la validación de repetición nativa de Gemini y las reescrituras de arranque permanecen desactivadas
- Kilo Gateway: `kilocode` (`KILOCODE_API_KEY`)
- Modelo de ejemplo: `kilocode/kilo/auto`
- Las referencias de Kilo respaldadas por Gemini mantienen la misma ruta de saneamiento
  de firmas de pensamiento proxy-Gemini; `kilocode/kilo/auto` y otras sugerencias no admitidas para
  razonamiento proxy omiten la inyección de razonamiento proxy
- MiniMax: `minimax` (clave de API) y `minimax-portal` (OAuth)
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o `MINIMAX_API_KEY` para `minimax-portal`
- Modelo de ejemplo: `minimax/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7`
- La configuración de incorporación/API key de MiniMax escribe definiciones explícitas de modelos M2.7 con
  `input: ["text", "image"]`; el catálogo de proveedores integrado mantiene las referencias de chat
  solo de texto hasta que se materialice esa configuración de proveedor
- Moonshot: `moonshot` (`MOONSHOT_API_KEY`)
- Modelo de ejemplo: `moonshot/kimi-k2.6`
- Kimi Coding: `kimi` (`KIMI_API_KEY` o `KIMICODE_API_KEY`)
- Modelo de ejemplo: `kimi/kimi-code`
- Qianfan: `qianfan` (`QIANFAN_API_KEY`)
- Modelo de ejemplo: `qianfan/deepseek-v3.2`
- Qwen Cloud: `qwen` (`QWEN_API_KEY`, `MODELSTUDIO_API_KEY`, o `DASHSCOPE_API_KEY`)
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
  - Las solicitudes xAI nativas agrupadas utilizan la ruta de Respuestas xAI
  - `/fast` o `params.fastMode: true` reescribe `grok-3`, `grok-3-mini`,
    `grok-4` y `grok-4-0709` a sus variantes `*-fast`
  - `tool_stream` está activado por defecto; configure
    `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
    desactivarlo
- Mistral: `mistral` (`MISTRAL_API_KEY`)
- Modelo de ejemplo: `mistral/mistral-large-latest`
- CLI: `openclaw onboard --auth-choice mistral-api-key`
- Groq: `groq` (`GROQ_API_KEY`)
- Cerebras: `cerebras` (`CEREBRAS_API_KEY`)
  - Los modelos GLM en Cerebras utilizan los ids `zai-glm-4.7` y `zai-glm-4.6`.
  - URL base compatible con OpenAI: `https://api.cerebras.ai/v1`.
- GitHub Copilot: `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modelo de ejemplo de Hugging Face Inference: `huggingface/deepseek-ai/DeepSeek-R1`; CLI: `openclaw onboard --auth-choice huggingface-api-key`. Consulte [Hugging Face (Inference)](/es/providers/huggingface).

## Proveedores a través de `models.providers` (URL personalizada/base)

Use `models.providers` (o `models.json`) para agregar proveedores **personalizados** o
proxies compatibles con OpenAI/Anthropic.

Muchos de los complementos de proveedores agrupados a continuación ya publican un catálogo predeterminado.
Use entradas explícitas de `models.providers.<id>` solo cuando desee anular la
URL base predeterminada, los encabezados o la lista de modelos.

### Moonshot AI (Kimi)

Moonshot se envía como un complemento de proveedor agrupado. Utilice el proveedor integrado de forma
predeterminada y agregue una entrada explícita de `models.providers.moonshot` solo cuando
necesite anular la URL base o los metadatos del modelo:

- Proveedor: `moonshot`
- Autenticación: `MOONSHOT_API_KEY`
- Modelo de ejemplo: `moonshot/kimi-k2.6`
- CLI: `openclaw onboard --auth-choice moonshot-api-key` o `openclaw onboard --auth-choice moonshot-api-key-cn`

IDs de modelos Kimi K2:

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
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

El `kimi/k2p5` heredado sigue siendo aceptado como ID de modelo de compatibilidad.

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

La incorporación predetermina a la superficie de codificación, pero el catálogo general `volcengine/*`
se registra al mismo tiempo.

En la incorporación/configuración de selectores de modelos, la elección de autenticación de Volcengine prefiere ambas
filas `volcengine/*` y `volcengine-plan/*`. Si esos modelos aún no se han cargado,
OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector
con ámbito de proveedor vacío.

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

La incorporación se realiza por defecto en la superficie de código, pero el catálogo general de `byteplus/*`
se registra al mismo tiempo.

En los selectores de incorporación/configuración de modelos, la elección de autenticación de BytePlus prefiere ambas
filas `byteplus/*` y `byteplus-plan/*`. Si esos modelos aún no están cargados,
OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector
con ámbito de proveedor vacío.

Modelos disponibles:

- `byteplus/seed-1-8-251228` (Semilla 1.8)
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

MiniMax se configura a través de `models.providers` porque utiliza endpoints personalizados:

- OAuth de MiniMax (Global): `--auth-choice minimax-global-oauth`
- OAuth de MiniMax (CN): `--auth-choice minimax-cn-oauth`
- Clave API de MiniMax (Global): `--auth-choice minimax-global-api`
- Clave API de MiniMax (CN): `--auth-choice minimax-cn-api`
- Autenticación: `MINIMAX_API_KEY` para `minimax`; `MINIMAX_OAUTH_TOKEN` o
  `MINIMAX_API_KEY` para `minimax-portal`

Consulte [/providers/minimax](/es/providers/minimax) para obtener detalles de configuración, opciones de modelo y fragmentos de configuración.

En la ruta de transmisión compatible con Anthropic de MiniMax, OpenClaw deshabilita el pensamiento de
manera predeterminada a menos que lo configure explícitamente, y `/fast on` reescribe
`MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.

División de capacidades propiedad del complemento:

- Los valores predeterminados de texto/chat permanecen en `minimax/MiniMax-M2.7`
- La generación de imágenes es `minimax/image-01` o `minimax-portal/image-01`
- La comprensión de imágenes es propiedad del complemento `MiniMax-VL-01` en ambas rutas de autenticación de MiniMax
- La búsqueda web se mantiene en el id. del proveedor `minimax`

### LM Studio

LM Studio se incluye como un complemento de proveedor empaquetado que utiliza la API nativa:

- Proveedor: `lmstudio`
- Autenticación: `LM_API_TOKEN`
- URL base de inferencia predeterminada: `http://localhost:1234/v1`

A continuación, configure un modelo (reemplácelo con uno de los ID devueltos por `http://localhost:1234/api/v1/models`):

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utiliza el `/api/v1/models` y el `/api/v1/models/load` nativos de LM Studio
para el descubrimiento y la carga automática, con `/v1/chat/completions` para la inferencia de forma predeterminada.
Consulte [/providers/lmstudio](/es/providers/lmstudio) para obtener configuración y solución de problemas.

### Ollama

Ollama se incluye como un complemento de proveedor empaquetado y utiliza la API nativa de Ollama:

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

Ollama se detecta localmente en `http://127.0.0.1:11434` cuando usted opta por participar con
`OLLAMA_API_KEY`, y el complemento de proveedor empaquetado añade Ollama directamente a
`openclaw onboard` y al selector de modelos. Consulte [/providers/ollama](/es/providers/ollama)
para obtener información sobre incorporación, modo en la nube/local y configuración personalizada.

### vLLM

vLLM se incluye como un complemento de proveedor empaquetado para servidores locales/autoalojados compatibles con OpenAI:

- Proveedor: `vllm`
- Autenticación: Opcional (depende de su servidor)
- URL base predeterminada: `http://127.0.0.1:8000/v1`

Para optar por el autodescubrimiento localmente (cualquier valor funciona si su servidor no aplica autenticación):

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

Para optar por el autodescubrimiento localmente (cualquier valor funciona si su servidor no aplica autenticación):

```bash
export SGLANG_API_KEY="sglang-local"
```

A continuación, configure un modelo (reemplácelo con uno de los IDs devueltos por `/v1/models`):

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
  Al omitirse, OpenClaw utiliza por defecto:
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recomendado: establezca valores explícitos que coincidan con los límites de su proxy/modelo.
- Para `api: "openai-completions"` en endpoints no nativos (cualquier `baseUrl` no vacío cuyo host no sea `api.openai.com`), OpenClaw fuerza `compat.supportsDeveloperRole: false` para evitar errores 400 del proveedor por roles `developer` no compatibles.
- Las rutas compatibles con OpenAI de tipo proxy también omiten el formateo de solicitudes nativo solo de OpenAI: sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de indicaciones, sin formateo de carga útil de compatibilidad de razonamiento de OpenAI y sin encabezados de atribución ocultos de OpenClaw.
- Si `baseUrl` está vacío o se omite, OpenClaw mantiene el comportamiento predeterminado de OpenAI (que se resuelve como `api.openai.com`).
- Por seguridad, un `compat.supportsDeveloperRole: true` explícito todavía se anula en los endpoints `openai-completions` no nativos.

## Ejemplos de CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Consulte también: [/gateway/configuration](/es/gateway/configuration) para obtener ejemplos completos de configuración.

## Relacionado

- [Modelos](/es/concepts/models) — configuración y alias de modelos
- [Conmutación por error de modelos](/es/concepts/model-failover) — cadenas de conmutación por error y comportamiento de reintentos
- [Referencia de configuración](/es/gateway/configuration-reference#agent-defaults) — claves de configuración de modelos
- [Proveedores](/es/providers) — guías de configuración por proveedor

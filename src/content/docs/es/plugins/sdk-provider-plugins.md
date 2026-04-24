---
title: "Construcción de Plugins de Proveedor"
sidebarTitle: "Plugins de Proveedor"
summary: "Guía paso a paso para construir un plugin de proveedor de modelos para OpenClaw"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# Crear complementos de proveedores

Esta guía explica cómo crear un complemento de proveedor que añade un proveedor de modelos
(LLM) a OpenClaw. Al final tendrás un proveedor con un catálogo de modelos,
autenticación de clave de API y resolución dinámica de modelos.

<Info>Si no has creado ningún complemento de OpenClaw antes, lee [Getting Started](/es/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

<Tip>Los complementos de proveedor añaden modelos al bucle de inferencia normal de OpenClaw. Si el modelo debe ejecutarse a través de un daemon de agente nativo que sea propietario de los subprocesos, la compactación o los eventos de herramientas, combina el proveedor con un [agent harness](/es/plugins/sdk-agent-harness) en lugar de poner los detalles del protocolo del daemon en el núcleo.</Tip>

## Tutorial

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Paquete y manifiesto">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "providerAuthEnvVars": {
        "acme-ai": ["ACME_AI_API_KEY"]
      },
      "providerAuthAliases": {
        "acme-ai-coding": "acme-ai"
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API key",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API key"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    El manifiesto declara `providerAuthEnvVars` para que OpenClaw pueda detectar
    las credenciales sin cargar el tiempo de ejecución de tu complemento. Añade `providerAuthAliases`
    cuando una variante del proveedor deba reutilizar la autenticación de otro ID de proveedor. `modelSupport`
    es opcional y permite que OpenClaw cargue automáticamente el complemento de tu proveedor desde ID de
    modelo abreviados como `acme-large` antes de que existan los enlaces de tiempo de ejecución. Si publicas el
    proveedor en ClawHub, esos campos `openclaw.compat` y `openclaw.build`
    son obligatorios en `package.json`.

  </Step>

  <Step title="Registrar el proveedor">
    Un proveedor mínimo necesita un `id`, `label`, `auth` y `catalog`:

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API key",
              hint: "API key from your Acme AI dashboard",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "Enter your Acme AI API key",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
                    {
                      id: "acme-large",
                      name: "Acme Large",
                      reasoning: true,
                      input: ["text", "image"],
                      cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
                      contextWindow: 200000,
                      maxTokens: 32768,
                    },
                    {
                      id: "acme-small",
                      name: "Acme Small",
                      reasoning: false,
                      input: ["text"],
                      cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
                      contextWindow: 128000,
                      maxTokens: 8192,
                    },
                  ],
                },
              };
            },
          },
        });
      },
    });
    ```

    Ese es un proveedor funcional. Los usuarios ahora pueden
    `openclaw onboard --acme-ai-api-key <key>` y seleccionar
    `acme-ai/acme-large` como su modelo.

    Si el proveedor upstream utiliza diferentes tokens de control que OpenClaw, añada una
    pequeña transformación de texto bidireccional en lugar de reemplazar la ruta de flujo (stream path):

    ```typescript
    api.registerTextTransforms({
      input: [
        { from: /red basket/g, to: "blue basket" },
        { from: /paper ticket/g, to: "digital ticket" },
        { from: /left shelf/g, to: "right shelf" },
      ],
      output: [
        { from: /blue basket/g, to: "red basket" },
        { from: /digital ticket/g, to: "paper ticket" },
        { from: /right shelf/g, to: "left shelf" },
      ],
    });
    ```

    `input` reescribe el contenido final del prompt del sistema y del mensaje de texto antes
    del transporte. `output` reescribe los deltas de texto del asistente y el texto final antes
    de que OpenClaw analice sus propios marcadores de control o la entrega del canal.

    Para proveedores empaquetados que solo registran un proveedor de texto con autenticación
    de clave de API más un tiempo de ejecución respaldado por un catálogo único, prefiera el auxiliar
    más estrecho `defineSingleProviderPluginEntry(...)`:

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API key",
            hint: "API key from your Acme AI dashboard",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "Enter your Acme AI API key",
            defaultModel: "acme-ai/acme-large",
          },
        ],
        catalog: {
          buildProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
          buildStaticProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    `buildProvider` es la ruta del catálogo en vivo utilizada cuando OpenClaw puede resolver la
    autenticación real del proveedor. Puede realizar descubrimientos específicos del proveedor. Use
    `buildStaticProvider` solo para filas sin conexión que sean seguras de mostrar antes de que se
    configure la autenticación; no debe requerir credenciales ni hacer solicitudes de red.
    La visualización `models list --all` de OpenClaw actualmente ejecuta catálicos estáticos
    solo para complementos de proveedor empaquetados, con una configuración vacía, entorno vacío y sin
    rutas de agente/espacio de trabajo.

    Si su flujo de autenticación también necesita parchear `models.providers.*`, alias y
    el modelo predeterminado del agente durante el incorporamiento (onboarding), use los auxiliares de preajuste de
    `openclaw/plugin-sdk/provider-onboard`. Los auxiliares más estrechos son
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` y
    `createModelCatalogPresetAppliers(...)`.

    Cuando el punto final nativo de un proveedor admite bloques de uso transmitidos en el
    transporte normal `openai-completions`, prefiera los auxiliares de catálogo compartidos en
    `openclaw/plugin-sdk/provider-catalog-shared` en lugar de codificar
    comprobaciones de id. de proveedor. `supportsNativeStreamingUsageCompat(...)` y
    `applyProviderNativeStreamingUsageCompat(...)` detectan soporte desde el
    mapa de capacidades del punto final, por lo que los puntos finales nativos de estilo Moonshot/DashScope
    aún participan incluso cuando un complemento usa un id. de proveedor personalizado.

  </Step>

  <Step title="Añadir resolución dinámica de modelos">
    Si su proveedor acepta ID de modelo arbitrarios (como un proxy o enrutador),
    añada `resolveDynamicModel`:

    ```typescript
    api.registerProvider({
      // ... id, label, auth, catalog from above

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    Si la resolución requiere una llamada de red, use `prepareDynamicModel` para la
    preparación asíncrona — `resolveDynamicModel` se ejecuta nuevamente después de que se complete.

  </Step>

  <Step title="Añadir ganchos de tiempo de ejecución (según sea necesario)">
    La mayoría de los proveedores solo necesitan `catalog` + `resolveDynamicModel`. Añada ganchos
    incrementalmente a medida que su proveedor los requiera.

    Los constructores de ayuda compartidos ahora cubren las familias de compatibilidad de reproducción/herramientas más comunes,
    por lo que los complementos generalmente no necesitan conectar cada gancho uno por uno:

    ```typescript
    import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
    import { buildProviderStreamFamilyHooks } from "openclaw/plugin-sdk/provider-stream";
    import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";

    const GOOGLE_FAMILY_HOOKS = {
      ...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
      ...buildProviderStreamFamilyHooks("google-thinking"),
      ...buildProviderToolCompatFamilyHooks("gemini"),
    };

    api.registerProvider({
      id: "acme-gemini-compatible",
      // ...
      ...GOOGLE_FAMILY_HOOKS,
    });
    ```

    Familias de reproducción disponibles hoy:

    | Familia | Lo que conecta |
    | --- | --- |
    | `openai-compatible` | Política de reproducción estilo OpenAI compartida para transportes compatibles con OpenAI, incluyendo saneamiento de ID de llamada a herramienta, correcciones de orden asistente-primero y validación genérica de turno Gemini donde el transporte lo necesita |
    | `anthropic-by-model` | Política de reproducción consciente de Claude elegida por `modelId`, por lo que los transportes de mensajes de Anthropic solo obtienen limpieza de bloques de pensamiento específicos de Claude cuando el modelo resuelto es realmente un ID de Claude |
    | `google-gemini` | Política de reproducción nativa de Gemini más saneamiento de reproducción de inicio y modo de salida de razonamiento etiquetado |
    | `passthrough-gemini` | Saneamiento de firma de pensamiento de Gemini para modelos Gemini que se ejecutan a través de transportes de proxy compatibles con OpenAI; no habilita la validación de reproducción nativa de Gemini ni reescrituras de inicio |
    | `hybrid-anthropic-openai` | Política híbrida para proveedores que mezclan superficies de modelo de mensajes de Anthropic y compatibles con OpenAI en un solo complemento; la eliminación opcional de bloques de pensamiento solo de Claude permanece limitada al lado de Anthropic |

    Ejemplos reales incluidos:

    - `google` y `google-gemini-cli`: `google-gemini`
    - `openrouter`, `kilocode`, `opencode`, y `opencode-go`: `passthrough-gemini`
    - `amazon-bedrock` y `anthropic-vertex`: `anthropic-by-model`
    - `minimax`: `hybrid-anthropic-openai`
    - `moonshot`, `ollama`, `xai`, y `zai`: `openai-compatible`

    Familias de flujo disponibles hoy:

    | Familia | Lo que conecta |
    | --- | --- |
    | `google-thinking` | Normalización de carga útil de pensamiento de Gemini en la ruta de flujo compartida |
    | `kilocode-thinking` | Envoltorio de razonamiento Kilo en la ruta de flujo de proxy compartido, con `kilo/auto` e ids de razonamiento de proxy no compatibles omitiendo el pensamiento inyectado |
    | `moonshot-thinking` | Mapeo de carga útil de pensamiento nativo binario de Moonshot desde la configuración + nivel `/think` |
    | `minimax-fast-mode` | Reescritura de modelo en modo rápido de MiniMax en la ruta de flujo compartida |
    | `openai-responses-defaults` | Envoltorios de Responses nativos OpenAI/Codex compartidos: encabezados de atribución, `/fast`/`serviceTier`, verbosidad de texto, búsqueda web nativa de Codex, conformación de carga útil de compatibilidad de razonamiento y gestión de contexto de Responses |
    | `openrouter-thinking` | Envoltorio de razonamiento OpenRouter para rutas de proxy, con omisiones de modelo no compatible/`auto` manejadas centralmente |
    | `tool-stream-default-on` | Envoltorio `tool_stream` activado por defecto para proveedores como Z.AI que quieren flujo de herramientas a menos que se desactive explícitamente |

    Ejemplos reales incluidos:

    - `google` y `google-gemini-cli`: `google-thinking`
    - `kilocode`: `kilocode-thinking`
    - `moonshot`: `moonshot-thinking`
    - `minimax` y `minimax-portal`: `minimax-fast-mode`
    - `openai` y `openai-codex`: `openai-responses-defaults`
    - `openrouter`: `openrouter-thinking`
    - `zai`: `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` también exporta el enum de familia de reproducción
    más las ayudas compartidas de las que se construyen esas familias. Las exportaciones públicas comunes
    incluyen:

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - constructores de reproducción compartidos como `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)`, y
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - ayudas de reproducción de Gemini como `sanitizeGoogleGeminiReplayHistory(...)`
      y `resolveTaggedReasoningOutputMode()`
    - ayuntas de punto final/modelo como `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)`, y
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` expone tanto el constructor de familia
    como las ayuntas de envoltorio públicas que esas familias reutilizan. Las exportaciones públicas comunes
    incluyen:

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - envoltorios compartidos OpenAI/Codex como
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)`, y
      `createCodexNativeWebSearchWrapper(...)`
    - envoltorios compartidos de proxy/proveedor como `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)`, y `createMinimaxFastModeWrapper(...)`

    Algunas ayuntas de flujo permanecen locales del proveedor a propósito. Ejemplo incluido
    actual: `@openclaw/anthropic-provider` exporta
    `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, y los
    constructores de envoltorio de Anthropic de menor nivel desde su costura pública `api.ts` /
    `contract-api.ts`. Esas ayuntas permanecen específicas de Anthropic porque
    también codifican el manejo beta de OAuth de Claude y el control de acceso `context1m`.

    Otros proveedores incluidos también mantienen envoltorios específicos del transporte de forma local cuando
    el comportamiento no se comparte limpiamente entre familias. Ejemplo actual: el
    complemento xAI incluido mantiene la forma nativa de Responses de xAI en su propio
    `wrapStreamFn`, incluyendo reescrituras de alias `/fast`, `tool_stream` predeterminado,
    limpieza de herramienta estricta no compatible y eliminación de carga útil de razonamiento específica de xAI.

    `openclaw/plugin-sdk/provider-tools` actualmente expone una familia de esquema de herramienta compartida
    más ayuntas de esquema/compatibilidad compartidas:

    - `ProviderToolCompatFamily` documenta el inventario de familias compartidas hoy.
    - `buildProviderToolCompatFamilyHooks("gemini")` conecta la limpieza de esquema
      de Gemini + diagnósticos para proveedores que necesitan esquemas de herramientas seguros para Gemini.
    - `normalizeGeminiToolSchemas(...)` y `inspectGeminiToolSchemas(...)`
      son las ayuntas públicas de esquema de Gemini subyacentes.
    - `resolveXaiModelCompatPatch()` devuelve el parche de compatibilidad xAI incluido:
      `toolSchemaProfile: "xai"`, palabras clave de esquema no compatibles, soporte `web_search`
      nativo, y decodificación de argumentos de llamada a herramienta de entidad HTML.
    - `applyXaiModelCompat(model)` aplica ese mismo parche de compatibilidad xAI a un
      modelo resuelto antes de que alcance el ejecutor.

    Ejemplo real incluido: el complemento xAI usa `normalizeResolvedModel` más
    `contributeResolvedModelCompat` para mantener esos metadatos de compatibilidad propiedad del
    proveedor en lugar de codificar reglas de xAI en el núcleo.

    El mismo patrón de raíz de paquete también respalda a otros proveedores incluidos:

    - `@openclaw/openai-provider`: `api.ts` exporta constructores de proveedor,
      ayuntas de modelo predeterminado y constructores de proveedor en tiempo real
    - `@openclaw/openrouter-provider`: `api.ts` exporta el constructor de proveedor
      más ayuntas de incorporación/configuración

    <Tabs>
      <Tab title="Intercambio de token">
        Para proveedores que necesitan un intercambio de token antes de cada llamada de inferencia:

        ```typescript
        prepareRuntimeAuth: async (ctx) => {
          const exchanged = await exchangeToken(ctx.apiKey);
          return {
            apiKey: exchanged.token,
            baseUrl: exchanged.baseUrl,
            expiresAt: exchanged.expiresAt,
          };
        },
        ```
      </Tab>
      <Tab title="Encabezados personalizados">
        Para proveedores que necesitan encabezados de solicitud personalizados o modificaciones del cuerpo:

        ```typescript
        // wrapStreamFn returns a StreamFn derived from ctx.streamFn
        wrapStreamFn: (ctx) => {
          if (!ctx.streamFn) return undefined;
          const inner = ctx.streamFn;
          return async (params) => {
            params.headers = {
              ...params.headers,
              "X-Acme-Version": "2",
            };
            return inner(params);
          };
        },
        ```
      </Tab>
      <Tab title="Identidad de transporte nativa">
        Para proveedores que necesitan encabezados de solicitud/sesión nativos o metadatos en
        transportes HTTP genéricos o WebSocket:

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
        }),
        resolveWebSocketSessionPolicy: (ctx) => ({
          headers: {
            "x-session-id": ctx.sessionId ?? "",
          },
          degradeCooldownMs: 60_000,
        }),
        ```
      </Tab>
      <Tab title="Uso y facturación">
        Para proveedores que exponen datos de uso/facturación:

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```
      </Tab>
    </Tabs>

    <Accordion title="Todos los ganchos de proveedor disponibles">
      OpenClaw llama a los ganchos en este orden. La mayoría de los proveedores solo usan 2-3:

      | # | Gancho | Cuándo usar |
      | --- | --- | --- |
      | 1 | `catalog` | Catálogo de modelos o URL base predeterminadas |
      | 2 | `applyConfigDefaults` | Valores globales propiedad del proveedor durante la materialización de la configuración |
      | 3 | `normalizeModelId` | Limpieza de alias de ID de modelo heredados/vista previa antes de la búsqueda |
      | 4 | `normalizeTransport` | Limpieza de `api` / `baseUrl` de la familia de proveedores antes del ensamblaje genérico del modelo |
      | 5 | `normalizeConfig` | Normalizar configuración `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Reescrituras de compatibilidad de uso de transmisión nativa para proveedores de configuración |
      | 7 | `resolveConfigApiKey` | Resolución de autenticación de marcador de entorno propiedad del proveedor |
      | 8 | `resolveSyntheticAuth` | Autenticación sintética local/autoalojada o respaldada por configuración |
      | 9 | `shouldDeferSyntheticProfileAuth` | Ocultar marcadores de posición de perfil almacenado sintético detrás de autenticación de entorno/configuración |
      | 10 | `resolveDynamicModel` | Aceptar ID de modelos ascendentes arbitrarios |
      | 11 | `prepareDynamicModel` | Obtención asincrónica de metadatos antes de resolver |
      | 12 | `normalizeResolvedModel` | Reescrituras de transporte antes del ejecutor |

    Notas de reserva de tiempo de ejecución:

    - `normalizeConfig` verifica primero el proveedor coincidente, luego otros
      complementos de proveedor con capacidad de gancho hasta que uno realmente cambie la configuración.
      Si ningún gancho de proveedor reescribe una entrada de configuración de familia Google compatible, el
      normalizador de configuración de Google incluido aún se aplica.
    - `resolveConfigApiKey` usa el gancho del proveedor cuando está expuesto. La ruta
      `amazon-bedrock` incluida también tiene un resolvedor de marcador de entorno AWS incorporado aquí,
      aunque la autenticación de tiempo de ejecución de Bedrock en sí aún usa la cadena predeterminada del AWS SDK.
      | 13 | `contributeResolvedModelCompat` | Indicadores de compatibilidad para modelos de proveedores detrás de otro transporte compatible |
      | 14 | `capabilities` | Bolsa de capacidades estática heredada; solo compatibilidad |
      | 15 | `normalizeToolSchemas` | Limpieza de esquema de herramienta propiedad del proveedor antes del registro |
      | 16 | `inspectToolSchemas` | Diagnósticos de esquema de herramienta propiedad del proveedor |
      | 17 | `resolveReasoningOutputMode` | Contrato de salida de razonamiento etiquetado vs nativo |
      | 18 | `prepareExtraParams` | Parámetros de solicitud predeterminados |
      | 19 | `createStreamFn` | Transporte StreamFn completamente personalizado |
      | 20 | `wrapStreamFn` | Envoltorios de encabezados/cuerpo personalizados en la ruta de flujo normal |
      | 21 | `resolveTransportTurnState` | Encabezados/metadatos nativos por turno |
      | 22 | `resolveWebSocketSessionPolicy` | Encabezados de sesión WS nativos/enfriamiento |
      | 23 | `formatApiKey` | Forma de token de tiempo de ejecución personalizada |
      | 24 | `refreshOAuth` | Actualización de OAuth personalizada |
      | 25 | `buildAuthDoctorHint` | Guía de reparación de autenticación |
      | 26 | `matchesContextOverflowError` | Detección de desbordamiento propiedad del proveedor |
      | 27 | `classifyFailoverReason` | Clasificación de límite de tasa/sobrecarga propiedad del proveedor |
      | 28 | `isCacheTtlEligible` | Control de TTL de caché de solicitud |
      | 29 | `buildMissingAuthMessage` | Pista personalizada de autenticación faltante |
      | 30 | `suppressBuiltInModel` | Ocultar filas ascendentes obsoletas |
      | 31 | `augmentModelCatalog` | Filas sintéticas de compatibilidad hacia adelante |
      | 32 | `resolveThinkingProfile` | Conjunto de opciones `/think` específico del modelo |
      | 33 | `isBinaryThinking` | Compatibilidad de pensamiento binario activado/desactivado |
      | 34 | `supportsXHighThinking` | Compatibilidad de soporte de razonamiento `xhigh` |
      | 35 | `resolveDefaultThinkingLevel` | Compatibilidad de política `/think` predeterminada |
      | 36 | `isModernModelRef` | Coincidencia de modelo en vivo/prueba |
      | 37 | `prepareRuntimeAuth` | Intercambio de token antes de la inferencia |
      | 38 | `resolveUsageAuth` | Análisis de credenciales de uso personalizadas |
      | 39 | `fetchUsageSnapshot` | Punto final de uso personalizado |
      | 40 | `createEmbeddingProvider` | Adaptador de incrustación propiedad del proveedor para memoria/búsqueda |
      | 41 | `buildReplayPolicy` | Política de reproducción/compactación de transcripción personalizada |
      | 42 | `sanitizeReplayHistory` | Reescrituras de reproducción específicas del proveedor después de la limpieza genérica |
      | 43 | `validateReplayTurns` | Validación estricta de turno de reproducción antes del ejecutor integrado |
      | 44 | `onModelSelected` | Devolución de llamada posterior a la selección (p. ej., telemetría) |

    Nota de ajuste de solicitud:

    - `resolveSystemPromptContribution` permite que un proveedor inyecte orientación de solicitud del sistema
        consciente de la caché para una familia de modelos. Prefiéralo sobre
        `before_prompt_build` cuando el comportamiento pertenece a una familia de proveedor/modelo
        y debe preservar la división de caché estable/dinámica.

    Para descripciones detalladas y ejemplos del mundo real, consulte
    [Internals: Provider Runtime Hooks](/es/plugins/architecture#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Añadir capacidades adicionales (opcional)">
    <a id="step-5-add-extra-capabilities"></a>
    Un complemento de proveedor puede registrar voz, transcripción en tiempo real,
    voz en tiempo real, comprensión de medios, generación de imágenes, generación
    de video, obtención web y búsqueda web junto con la inferencia de texto:

    ```typescript
    register(api) {
      api.registerProvider({ id: "acme-ai", /* ... */ });

      api.registerSpeechProvider({
        id: "acme-ai",
        label: "Acme Speech",
        isConfigured: ({ config }) => Boolean(config.messages?.tts),
        synthesize: async (req) => ({
          audioBuffer: Buffer.from(/* PCM data */),
          outputFormat: "mp3",
          fileExtension: ".mp3",
          voiceCompatible: false,
        }),
      });

      api.registerRealtimeTranscriptionProvider({
        id: "acme-ai",
        label: "Acme Realtime Transcription",
        isConfigured: () => true,
        createSession: (req) => {
          const apiKey = String(req.providerConfig.apiKey ?? "");
          return createRealtimeTranscriptionWebSocketSession({
            providerId: "acme-ai",
            callbacks: req,
            url: "wss://api.example.com/v1/realtime-transcription",
            headers: { Authorization: `Bearer ${apiKey}` },
            onMessage: (event, transport) => {
              if (event.type === "session.created") {
                transport.sendJson({ type: "session.update" });
                transport.markReady();
                return;
              }
              if (event.type === "transcript.final") {
                req.onTranscript?.(event.text);
              }
            },
            sendAudio: (audio, transport) => {
              transport.sendJson({
                type: "audio.append",
                audio: audio.toString("base64"),
              });
            },
            onClose: (transport) => {
              transport.sendJson({ type: "audio.end" });
            },
          });
        },
      });

      api.registerRealtimeVoiceProvider({
        id: "acme-ai",
        label: "Acme Realtime Voice",
        isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
        createBridge: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          setMediaTimestamp: () => {},
          submitToolResult: () => {},
          acknowledgeMark: () => {},
          close: () => {},
          isConnected: () => true,
        }),
      });

      api.registerMediaUnderstandingProvider({
        id: "acme-ai",
        capabilities: ["image", "audio"],
        describeImage: async (req) => ({ text: "A photo of..." }),
        transcribeAudio: async (req) => ({ text: "Transcript..." }),
      });

      api.registerImageGenerationProvider({
        id: "acme-ai",
        label: "Acme Images",
        generate: async (req) => ({ /* image result */ }),
      });

      api.registerVideoGenerationProvider({
        id: "acme-ai",
        label: "Acme Video",
        capabilities: {
          generate: {
            maxVideos: 1,
            maxDurationSeconds: 10,
            supportsResolution: true,
          },
          imageToVideo: {
            enabled: true,
            maxVideos: 1,
            maxInputImages: 1,
            maxDurationSeconds: 5,
          },
          videoToVideo: {
            enabled: false,
          },
        },
        generateVideo: async (req) => ({ videos: [] }),
      });

      api.registerWebFetchProvider({
        id: "acme-ai-fetch",
        label: "Acme Fetch",
        hint: "Fetch pages through Acme's rendering backend.",
        envVars: ["ACME_FETCH_API_KEY"],
        placeholder: "acme-...",
        signupUrl: "https://acme.example.com/fetch",
        credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
        getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
        setCredentialValue: (fetchConfigTarget, value) => {
          const acme = (fetchConfigTarget.acme ??= {});
          acme.apiKey = value;
        },
        createTool: () => ({
          description: "Fetch a page through Acme Fetch.",
          parameters: {},
          execute: async (args) => ({ content: [] }),
        }),
      });

      api.registerWebSearchProvider({
        id: "acme-ai-search",
        label: "Acme Search",
        search: async (req) => ({ content: [] }),
      });
    }
    ```

    OpenClaw clasifica esto como un complemento de **capacidad híbrida**. Este es
    el patrón recomendado para complementos de empresas (un complemento por
    proveedor). Consulte [Internals: Capability Ownership](/es/plugins/architecture#capability-ownership-model).

    Para la generación de video, se prefiere la forma de capacidad con conocimiento
    de modo que se muestra arriba: `generate`, `imageToVideo` y
    `videoToVideo`. Los campos agregados planos como `maxInputImages`,
    `maxInputVideos` y `maxDurationSeconds` no son suficientes para anunciar
    claramente el soporte del modo de transformación o los modos deshabilitados.

    Se prefiere el asistente de WebSocket compartido para proveedores de STT en
    streaming. Mantiene la captura del proxy, la retirada de reconexión, el
    vaciado de cierre, los protocolos de enlace de listos, la puesta en cola de
    audio y el diagnóstico de eventos de cierre consistentes entre los proveedores,
    mientras deja el código del proveedor responsable solo del mapeo de eventos
    ascendentes.

    Los proveedores de STT por lotes que hagan POST de audio multiparte deben usar
    `buildAudioTranscriptionFormData(...)` de `openclaw/plugin-sdk/provider-http` junto con los asistentes de
    solicitud HTTP del proveedor. El asistente de formulario normaliza los nombres
    de archivo de carga, incluyendo las cargas AAC que necesitan un nombre de
    archivo estilo M4A para las API de transcripción compatibles.

    Los proveedores de generación de música deben seguir el mismo patrón:
    `generate` para la generación solo con indicaciones y
    `edit` para la generación basada en imagen de referencia.
    Los campos agregados planos como `maxInputImages`, `supportsLyrics` y
    `supportsFormat` no son suficientes para anunciar el soporte de edición;
    los bloques explícitos `generate` / `edit` son el contrato
    esperado.

  </Step>

  <Step title="Probar">
    <a id="step-6-test"></a>
    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // Export your provider config object from index.ts or a dedicated file
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## Publicar en ClawHub

Los complementos de proveedor se publican de la misma manera que cualquier otro complemento de código externo:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

No use el alias de publicación heredado solo para habilidades aquí; los paquetes
de complementos deben usar `clawhub package publish`.

## Estructura de archivos

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## Referencia de orden del catálogo

`catalog.order` controla cuándo se fusiona tu catálogo en relación con los proveedores integrados:

| Orden     | Cuándo             | Caso de uso                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `simple`  | Primera pasada     | Proveedores de clave API simple                        |
| `profile` | Después de simple  | Proveedores restringidos por perfiles de autenticación |
| `paired`  | Después del perfil | Sintetizar múltiples entradas relacionadas             |
| `late`    | Último paso        | Sobrescribir proveedores existentes (gana en colisión) |

## Siguientes pasos

- [Complementos de canal](/es/plugins/sdk-channel-plugins) — si tu complemento también proporciona un canal
- [Entorno de ejecución del SDK](/es/plugins/sdk-runtime) — asistentes `api.runtime` (TTS, búsqueda, subagente)
- [Descripción general del SDK](/es/plugins/sdk-overview) — referencia completa de importaciones de subrutas
- [Aspectos internos de los complementos](/es/plugins/architecture#provider-runtime-hooks) — detalles de los enlaces y ejemplos incluidos

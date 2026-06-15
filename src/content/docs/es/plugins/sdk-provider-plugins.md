---
summary: "Guía paso a paso para crear un complemento de proveedor de modelos para OpenClaw"
title: "Crear complementos de proveedor"
sidebarTitle: "Complementos de proveedor"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

Esta guía explica cómo crear un complemento de proveedor que añade un proveedor de modelos (LLM) a OpenClaw. Al final tendrás un proveedor con un catálogo de modelos, autenticación de clave de API y resolución dinámica de modelos.

<Info>Si no ha creado ningún complemento de OpenClaw antes, lea primero [Getting Started](/es/plugins/building-plugins) para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

<Tip>Los complementos de proveedor añaden modelos al bucle de inferencia normal de OpenClaw. Si el modelo debe ejecutarse a través de un demonio de agente nativo que sea propietario de los subprocesos, la compactación o los eventos de herramientas, combine el proveedor con un [agent harness](/es/plugins/sdk-agent-harness) en lugar de poner los detalles del protocolo del demonio en el núcleo.</Tip>

## Tutorial

<Steps>
  <Step title="Paquete y manifiesto">
    ### Paso 1: Paquete y manifiesto

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
      "setup": {
        "providers": [
          {
            "id": "acme-ai",
            "envVars": ["ACME_AI_API_KEY"]
          }
        ]
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

    El manifiesto declara `setup.providers[].envVars` para que OpenClaw pueda detectar
    las credenciales sin cargar el tiempo de ejecución de su complemento. Añada `providerAuthAliases`
    cuando una variante de proveedor deba reutilizar la autenticación de otro ID de proveedor. `modelSupport`
    es opcional y permite a OpenClaw cargar automáticamente su complemento de proveedor desde ID de
    modelos abreviados como `acme-large` antes de que existan los enlaces de tiempo de ejecución. Si publica el
    proveedor en ClawHub, esos campos `openclaw.compat` y `openclaw.build`
    son obligatorios en `package.json`.

  </Step>

  <Step title="Registrar el proveedor">
    Un proveedor de texto mínimo necesita un `id`, un `label`, un `auth` y un `catalog`.
    `catalog` es el hook de configuración/ejecución propiedad del proveedor; puede llamar a las APIs
    de proveedores en vivo y devuelve entradas `models.providers`.

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

        api.registerModelCatalogProvider({
          provider: "acme-ai",
          kinds: ["text"],
          liveCatalog: async (ctx) => {
            const apiKey = ctx.resolveProviderApiKey("acme-ai").apiKey;
            if (!apiKey) return null;
            return [
              {
                kind: "text",
                provider: "acme-ai",
                model: "acme-large",
                label: "Acme Large",
                source: "live",
              },
            ];
          },
        });
      },
    });
    ```

    `registerModelCatalogProvider` es la superficie del catálogo del plano de control más reciente
    para la interfaz de usuario de lista/ayuda/selector. Úselo para filas de texto, generación de imágenes,
    generación de video y generación de música. Mantenga las llamadas a los endpoints del proveedor y
    el mapeo de respuestas en el complemento; OpenClaw posee la forma de fila compartida, las etiquetas
    de origen y el renderizado de ayuda.

    Ese es un proveedor funcional. Ahora los usuarios pueden
    `openclaw onboard --acme-ai-api-key <key>` y seleccionar
    `acme-ai/acme-large` como su modelo.

    Si el proveedor upstream utiliza diferentes tokens de control que OpenClaw, añada una
    pequeña transformación de texto bidireccional en lugar de reemplazar la ruta del flujo:

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

    `input` reescribe el prompt del sistema final y el contenido del mensaje de texto antes
    del transporte. `output` reescribe los deltas de texto del asistente y el texto final antes
    de que OpenClaw analice sus propios marcadores de control o la entrega del canal.

    Para proveedores empaquetados que solo registran un proveedor de texto con autenticación
    de clave de API más un tiempo de ejecución respaldado por un único catálogo, prefiera el auxiliar
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
    autenticación real del proveedor. Puede realizar un descubrimiento específico del proveedor. Use
    `buildStaticProvider` solo para filas fuera de línea que sean seguras de mostrar antes de que
    se configure la autenticación; no debe requerir credenciales ni hacer solicitudes de red.
    La visualización del `models list --all` de OpenClaw actualmente ejecuta catálicos estáticos
    solo para complementos de proveedor empaquetados, con una configuración vacía, un entorno vacío y sin
    rutas de agente/espacio de trabajo.

    Si su flujo de autenticación también necesita parchear `models.providers.*`, alias y
    el modelo predeterminado del agente durante la incorporación, use los auxiliares preestablecidos de
    `openclaw/plugin-sdk/provider-onboard`. Los auxiliares más estrechos son
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` y
    `createModelCatalogPresetAppliers(...)`.

    Cuando el endpoint nativo de un proveedor admite bloques de uso transmitidos en el
    transporte normal `openai-completions`, prefiera los auxiliares de catálogo compartidos en
    `openclaw/plugin-sdk/provider-catalog-shared` en lugar de codificar
    comprobaciones de ID de proveedor. `supportsNativeStreamingUsageCompat(...)` y
    `applyProviderNativeStreamingUsageCompat(...)` detectan el soporte desde el
    mapa de capacidades del endpoint, por lo que los endpoints nativos al estilo Moonshot/DashScope aún
    participan incluso cuando un complemento usa un ID de proveedor personalizado.

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

    Si la resolución requiere una llamada de red, use `prepareDynamicModel` para el
    precalentamiento asíncrono - `resolveDynamicModel` se ejecuta de nuevo después de que se complete.

  </Step>

  <Step title="Añadir hooks de ejecución (según sea necesario)">
    La mayoría de los proveedores solo necesitan `catalog` + `resolveDynamicModel`. Añada hooks
    incrementalmente a medida que su proveedor los requiera.

    Los constructores de ayudantes compartidos ahora cubren las familias de
    repetición (replay)/compatibilidad de herramientas más comunes, por lo que
    los plugins generalmente no necesitan conectar cada hook manualmente uno por uno:

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

    Familias de repetición disponibles hoy:

    | Familia | Lo que conecta | Ejemplos incluidos |
    | --- | --- | --- |
    | `openai-compatible` | Política de repetición estilo OpenAI compartida para transportes compatibles con OpenAI, que incluye saneamiento de tool-call-id, correcciones de ordenamiento assistant-first y validación genérica de turnos Gemini donde el transporte lo necesita | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | Política de repetición consciente de Claude elegida por `modelId`, por lo que los transportes de mensajes de Anthropic solo obtienen limpieza de bloques de pensamiento específicos de Claude cuando el modelo resuelto es realmente un id de Claude | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | Política de repetición nativa de Gemini más saneamiento de repetición de arranque. La familia compartida mantiene la CLI de Gemini de salida de texto en razonamiento etiquetado; el proveedor `google` directo sobrescribe `resolveReasoningOutputMode` a `native` porque el pensamiento de la API de Gemini llega como partes de pensamiento nativas. | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | Saneamiento de firma de pensamiento de Gemini para modelos Gemini que se ejecutan a través de transportes de proxy compatibles con OpenAI; no habilita la validación de repetición nativa de Gemini ni reescrituras de arranque | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | Política híbrida para proveedores que mezclan superficies de modelos de mensajes de Anthropic y compatibles con OpenAI en un solo plugin; la eliminación opcional de bloques de pensamiento solo de Claude permanece limitada al lado de Anthropic | `minimax` |

    Familias de transmisión disponibles hoy:

    | Familia | Lo que conecta | Ejemplos incluidos |
    | --- | --- | --- |
    | `google-thinking` | Normalización de carga útil de pensamiento de Gemini en la ruta de transmisión compartida | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | Contenedor de razonamiento Kilo en la ruta de transmisión de proxy compartido, con `kilo/auto` y ids de razonamiento de proxy no compatibles omitiendo el pensamiento inyectado | `kilocode` |
    | `moonshot-thinking` | Mapeo de carga útil de pensamiento nativo binario de Moonshot desde la configuración + nivel `/think` | `moonshot` |
    | `minimax-fast-mode` | Reescritura de modelo en modo rápido de MiniMax en la ruta de transmisión compartida | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | Contenedores compartidos nativos de OpenAI/Codex Responses: encabezados de atribución, `/fast`/`serviceTier`, verbosidad de texto, búsqueda web nativa de Codex, configuración de carga útil compatible con razonamiento y gestión de contexto de Responses | `openai` |
    | `openrouter-thinking` | Contenedor de razonamiento de OpenRouter para rutas de proxy, con omisiones de modelo no compatible/`auto` manejadas centralmente | `openrouter` |
    | `tool-stream-default-on` | Contenedor `tool_stream` activado por defecto para proveedores como Z.AI que quieren transmisión de herramientas a menos que se deshabilite explícitamente | `zai` |

    <Accordion title="Costuras del SDK que alimentan los constructores de familias">
      Cada constructor de familias se compone a partir de ayudantes públicos de nivel inferior exportados desde el mismo paquete, a los que puede recurrir cuando un proveedor necesita apartarse del patrón común:

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)` y los constructores de repetición sin procesar (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). También exporta ayudantes de repetición de Gemini (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) y ayudantes de endpoint/modelo (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, además de los contenedores compartidos de OpenAI/Codex (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), el contenedor compatible con OpenAI de DeepSeek V4 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), la limpieza de relleno previo de pensamiento de Anthropic Messages (`createAnthropicThinkingPrefillPayloadWrapper`), compatibilidad de llamadas a herramientas en texto sin formato (`createPlainTextToolCallCompatWrapper`) y contenedores de proxy/proveedor compartidos (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")` y ayudantes de esquema de proveedor subyacentes.

      Para los proveedores de la familia Gemini, mantenga el modo de salida de razonamiento alineado con
      el transporte. Los proveedores directos de la API de Google Gemini deben usar la salida de razonamiento
      `native` para que OpenClaw consuma partes de pensamiento nativas sin añadir
      directivas de prompt `<think>` / `<final>`. Los backends de estilo CLI de Gemini solo de
      texto que analizan una respuesta JSON/texto final pueden mantener el contrato
      etiquetado `google-gemini` compartido.

      Algunos ayudantes de transmisión se mantienen locales del proveedor a propósito. `@openclaw/anthropic-provider` mantiene `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` y los constructores de contenedores de Anthropic de nivel inferior en su propia costura pública `api.ts` / `contract-api.ts` porque codifican el manejo beta de OAuth de Claude y el control de acceso `context1m`. El plugin xAI mantiene de manera similar la forma nativa de Responses de xAI en su propio `wrapStreamFn` (alias `/fast`, `tool_stream` predeterminado, limpieza estricta de herramientas no compatibles, eliminación de carga útil de razonamiento específica de xAI).

      El mismo patrón de raíz de paquete también respalda `@openclaw/openai-provider` (constructores de proveedores, ayudantes de modelo predeterminado, constructores de proveedores en tiempo real) y `@openclaw/openrouter-provider` (constructor de proveedor más ayudantes de incorporación/configuración).
    </Accordion>

    <Tabs>
      <Tab title="Intercambio de tokens">
        Para proveedores que necesitan un intercambio de tokens antes de cada llamada de inferencia:

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
      <Tab title="Identidad de transporte nativo">
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

        `resolveUsageAuth` tiene tres resultados. Devuelva `{ token, accountId? }`
        cuando el proveedor tiene una credencial de uso/facturación. Devuelva
        `{ handled: true }` solo cuando el proveedor ha manejado definitivamente la autenticación
        de uso pero no tiene un token de uso utilizable, y OpenClaw debe omitir la alternativa
        genérica de clave de API/OAuth. Devuelva `null` o `undefined` cuando el proveedor no
        manejó la solicitud y OpenClaw debe continuar con la alternativa genérica.
      </Tab>
    </Tabs>

    <Accordion title="Todos los hooks de proveedor disponibles">
      OpenClaw llama a los hooks en este orden. La mayoría de los proveedores solo usan 2-3:
      Los campos de proveedores solo de compatibilidad que OpenClaw ya no llama, como
      `ProviderPlugin.capabilities` y `suppressBuiltInModel`, no están listados
      aquí.

      | # | Hook | Cuándo usar |
      | --- | --- | --- |
      | 1 | `catalog` | Catálogo de modelos o URL base predeterminada |
      | 2 | `applyConfigDefaults` | Valores globales propiedad del proveedor durante la materialización de la configuración |
      | 3 | `normalizeModelId` | Limpieza de alias de id de modelo heredados/vista previa antes de la búsqueda |
      | 4 | `normalizeTransport` | Limpieza de `api` / `baseUrl` de familia de proveedores antes del ensamblaje de modelo genérico |
      | 5 | `normalizeConfig` | Normalizar configuración `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Reescrituras de compatibilidad de uso de transmisión nativas para proveedores de configuración |
      | 7 | `resolveConfigApiKey` | Resolución de autenticación de marcador de entorno propiedad del proveedor |
      | 8 | `resolveSyntheticAuth` | Autenticación sintética local/autoalojada o respaldada por configuración |
      | 9 | `shouldDeferSyntheticProfileAuth` | Colocar marcadores de posición de perfil almacenado sintético de nivel inferior detrás de la autenticación de entorno/configuración |
      | 10 | `resolveDynamicModel` | Aceptar IDs de modelo ascendentes arbitrarios |
      | 11 | `prepareDynamicModel` | Obtención asincrónica de metadatos antes de resolver |
      | 12 | `normalizeResolvedModel` | Reescrituras de transporte antes del ejecutor |
      | 13 | `normalizeToolSchemas` | Limpieza de esquema de herramientas propiedad del proveedor antes del registro |
      | 14 | `inspectToolSchemas` | Diagnósticos de esquema de herramientas propiedad del proveedor |
      | 15 | `resolveReasoningOutputMode` | Contrato de salida de razonamiento etiquetado vs nativo |
      | 16 | `prepareExtraParams` | Parámetros de solicitud predeterminados |
      | 17 | `createStreamFn` | Transporte StreamFn completamente personalizado |
      | 19 | `wrapStreamFn` | Contenedores de encabezados/cuerpo personalizados en la ruta de transmisión normal |
      | 20 | `resolveTransportTurnState` | Encabezados/metadatos nativos por turno |
      | 21 | `resolveWebSocketSessionPolicy` | Encabezados de sesión WS nativos/enfriamiento |
      | 22 | `formatApiKey` | Forma de token de tiempo de ejecución personalizada |
      | 23 | `refreshOAuth` | Actualización de OAuth personalizada |
      | 24 | `buildAuthDoctorHint` | Guía de reparación de autenticación |
      | 25 | `matchesContextOverflowError` | Detección de desbordamiento propiedad del proveedor |
      | 26 | `classifyFailoverReason` | Clasificación de límite de tasa/sobrecarga propiedad del proveedor |
      | 27 | `isCacheTtlEligible` | Control de acceso TTL de caché de prompt |
      | 28 | `buildMissingAuthMessage` | Sugerencia personalizada de autenticación faltante |
      | 29 | `augmentModelCatalog` | Filas sintéticas de compatibilidad futura |
      | 30 | `resolveThinkingProfile` | Conjunto de opciones `/think` específico del modelo |
      | 31 | `isBinaryThinking` | Compatibilidad de pensamiento binario activado/desactivado |
      | 32 | `supportsXHighThinking` | Compatibilidad de soporte de razonamiento `xhigh` |
      | 33 | `resolveDefaultThinkingLevel` | Compatibilidad de política `/think` predeterminada |
      | 34 | `isModernModelRef` | Coincidencia de modelo en vivo/prueba |
      | 35 | `prepareRuntimeAuth` | Intercambio de tokens antes de la inferencia |
      | 36 | `resolveUsageAuth` | Análisis personalizado de credenciales de uso |
      | 37 | `fetchUsageSnapshot` | Endpoint de uso personalizado |
      | 38 | `createEmbeddingProvider` | Adaptador de incrustación propiedad del proveedor para memoria/búsqueda |
      | 39 | `buildReplayPolicy` | Política personalizada de repetición/compactación de transcripción |
      | 40 | `sanitizeReplayHistory` | Reescrituras de repetición específicas del proveedor después de la limpieza genérica |
      | 41 | `validateReplayTurns` | Validación estricta de turno de repetición antes del ejecutor incrustado |
      | 42 | `onModelSelected` | Devolución de llamada posterior a la selección (por ejemplo, telemetría) |

      Notas sobre alternativas de tiempo de ejecución:

      - `normalizeConfig` verifica primero el proveedor coincidente y luego otros plugins de proveedores con capacidad de hooks hasta que uno realmente cambia la configuración. Si ningún hook de proveedor reescribe una entrada de configuración de familia de Google compatible, el normalizador de configuración de Google incluido todavía se aplica.
      - `resolveConfigApiKey` usa el hook del proveedor cuando está expuesto. Amazon Bedrock mantiene la resolución del marcador de entorno de AWS en su plugin de proveedor; la autenticación de tiempo de ejecución en sí todavía usa la cadena predeterminada del SDK de AWS cuando se configura con `auth: "aws-sdk"`.
      - `resolveThinkingProfile(ctx)` recibe el `provider` seleccionado, `modelId`, sugerencia de catálogo `reasoning` fusionada opcional y hechos del modelo `compat` fusionados opcionales. Use `compat` solo para seleccionar la interfaz de usuario/perfil de pensamiento del proveedor.
      - `resolveSystemPromptContribution` permite que un proveedor inyecte orientación de prompt del sistema consciente de la caché para una familia de modelos. Prefiéralo sobre `before_prompt_build` cuando el comportamiento pertenece a una familia de proveedor/modelo y debe preservar la división de caché estable/dinámica.

      Para descripciones detalladas y ejemplos del mundo real, consulte [Internals: Provider Runtime Hooks](/es/plugins/architecture-internals#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Añadir capacidades adicionales (opcional)">
    ### Paso 5: Añadir capacidades adicionales

    Un complemento de proveedor puede registrar incrustaciones, voz, transcripción en tiempo real,
    voz en tiempo real, comprensión de medios, generación de imágenes, generación de video,
    obtención web y búsqueda web junto con la inferencia de texto. OpenClaw clasifica esto como un
    complemento de **capacidad híbrida**: el patrón recomendado para complementos de empresas
    (un complemento por proveedor). Consulte
    [Internals: Capability Ownership](/es/plugins/architecture#capability-ownership-model).

    Registre cada capacidad dentro de `register(api)` junto con su llamada
    `api.registerProvider(...)` existente. Elija solo las pestañas que necesite:

    <Tabs>
      <Tab title="Voz (TTS)">
        ```typescript
        import {
          assertOkOrThrowProviderError,
          postJsonRequest,
        } from "openclaw/plugin-sdk/provider-http";

        api.registerSpeechProvider({
          id: "acme-ai",
          label: "Acme Speech",
          defaultTimeoutMs: 120_000,
          isConfigured: ({ config }) => Boolean(config.messages?.tts),
          synthesize: async (req) => {
            const { response, release } = await postJsonRequest({
              url: "https://api.example.com/v1/speech",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: { text: req.text },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              auditContext: "acme speech",
            });
            try {
              await assertOkOrThrowProviderError(response, "Acme Speech API error");
              return {
                audioBuffer: Buffer.from(await response.arrayBuffer()),
                outputFormat: "mp3",
                fileExtension: ".mp3",
                voiceCompatible: false,
              };
            } finally {
              await release();
            }
          },
        });
        ```

        Use `assertOkOrThrowProviderError(...)` para fallos HTTP del proveedor para que
    los complementos compartan lecturas limitadas del cuerpo del error, análisis de errores JSON y
    sufijos de ID de solicitud.
      </Tab>
      <Tab title="Transcripción en tiempo real">
        Prefiera `createRealtimeTranscriptionWebSocketSession(...)`: el asistente compartido
    maneja la captura de proxy, la retirada de reconexión, el vaciado al cerrar, los apretones de mano listos,
    la puesta en cola de audio y el diagnóstico de eventos de cierre. Su complemento
    solo mapea los eventos ascendentes.

        ```typescript
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
        ```

        Los proveedores STT por lotes que hacen POST de audio multiparte deben usar
        `buildAudioTranscriptionFormData(...)` de
        `openclaw/plugin-sdk/provider-http`. El asistente normaliza los nombres
        de archivo de carga, incluidas las cargas AAC que necesitan un nombre de archivo estilo M4A para
        API de transcripción compatibles.
      </Tab>
      <Tab title="Voz en tiempo real">
        ```typescript
        api.registerRealtimeVoiceProvider({
          id: "acme-ai",
          label: "Acme Realtime Voice",
          capabilities: {
            transports: ["gateway-relay"],
            inputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            outputAudioFormats: [{ encoding: "pcm16", sampleRateHz: 24000, channels: 1 }],
            supportsBargeIn: true,
            supportsToolCalls: true,
          },
          isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
          createBridge: (req) => ({
            // Set this only if the provider accepts multiple tool responses for
            // one call, for example an immediate "working" response followed by
            // the final result.
            supportsToolResultContinuation: false,
            connect: async () => {},
            sendAudio: () => {},
            setMediaTimestamp: () => {},
            handleBargeIn: () => {},
            submitToolResult: () => {},
            acknowledgeMark: () => {},
            close: () => {},
            isConnected: () => true,
          }),
        });
        ```

        Declare `capabilities` para que `talk.catalog` pueda exponer modos válidos,
        transportes, formatos de audio y marcas de características a los clientes de Talk nativos y del navegador. Implemente `handleBargeIn` cuando un transporte pueda detectar que un
    humano está interrumpiendo la reproducción del asistente y el proveedor admite
    truncar o borrar la respuesta de audio activa.
      </Tab>
      <Tab title="Comprensión de medios">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```

        Los proveedores de medios locales o autohospedados que intencionalmente no requieren
        credenciales pueden exponer `resolveAuth` y devolver `kind: "none"`.
        OpenClaw aún mantiene la puerta de autorización normal para los proveedores que no
        se inscriben explícitamente. Los proveedores existentes pueden seguir leyendo `req.apiKey`;
        los nuevos proveedores deben preferir `req.auth`.

        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "local-audio",
          capabilities: ["audio"],
          resolveAuth: () => ({
            kind: "none",
            source: "local-audio plugin no-auth",
          }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="Incrustaciones">
        ```typescript
        api.registerEmbeddingProvider({
          id: "acme-ai",
          defaultModel: "acme-embed",
          transport: "remote",
          authProviderId: "acme-ai",
          create: async ({ model }) => ({
            provider: {
              id: "acme-ai",
              model,
              dimensions: 1536,
              embed: async (input) => {
                const text = typeof input === "string" ? input : input.text;
                return fetchAcmeEmbedding(text);
              },
              embedBatch: async (inputs) =>
                Promise.all(
                  inputs.map((input) =>
                    fetchAcmeEmbedding(typeof input === "string" ? input : input.text),
                  ),
                ),
            },
          }),
        });
        ```

        Declare el mismo id en `contracts.embeddingProviders`. Este es el
    contrato de incrustación general para la generación de vectores reutilizables, incluida
    la búsqueda de memoria. `registerMemoryEmbeddingProvider(...)` es compatibilidad
    en desuso para adaptadores de memoria específicos existentes.
      </Tab>
      <Tab title="Generación de imágenes y video">
        Las capacidades de video usan una forma con **conciencia del modo**: `generate`,
        `imageToVideo` y `videoToVideo`. Los campos agregados planos como
        `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` no son
        suficientes para anunciar el soporte del modo de transformación o los modos deshabilitados claramente.
        La generación de música sigue el mismo patrón con bloques explícitos `generate` /
        `edit`.

        ```typescript
        api.registerImageGenerationProvider({
          id: "acme-ai",
          label: "Acme Images",
          generate: async (req) => ({ /* image result */ }),
        });

        api.registerVideoGenerationProvider({
          id: "acme-ai",
          label: "Acme Video",
          defaultTimeoutMs: 600_000,
          capabilities: {
            generate: { maxVideos: 1, maxDurationSeconds: 10, supportsResolution: true },
            imageToVideo: {
              enabled: true,
              maxVideos: 1,
              maxInputImages: 1,
              maxInputImagesByModel: { "acme/reference-to-video": 9 },
              maxDurationSeconds: 5,
            },
            videoToVideo: { enabled: false },
          },
          generateVideo: async (req) => ({ videos: [] }),
        });
        ```
      </Tab>
      <Tab title="Obtención y búsqueda web">
        ```typescript
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
        ```
      </Tab>
    </Tabs>

  </Step>

  <Step title="Test">
    ### Paso 6: Probar

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

Los plugins de proveedores se publican de la misma manera que cualquier otro plugin de código externo:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

No use el alias de publicación solo de habilidades heredado aquí; los paquetes de complementos deben usar
`clawhub package publish`.

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

## Referencia del orden del catálogo

`catalog.order` controla cuándo se fusiona su catálogo en relación con los proveedores integrados:

| Orden     | Cuándo             | Caso de uso                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `simple`  | Primera pasada     | Proveedores de clave API simple                        |
| `profile` | Después de simple  | Proveedores restringidos por perfiles de autenticación |
| `paired`  | Después del perfil | Sintetizar múltiples entradas relacionadas             |
| `late`    | Última pasada      | Anular proveedores existentes (gana en colisión)       |

## Siguientes pasos

- [Complementos de canal](/es/plugins/sdk-channel-plugins) - si su complemento también proporciona un canal
- [Tiempo de ejecución del SDK](/es/plugins/sdk-runtime) - ayudantes `api.runtime` (TTS, búsqueda, subagente)
- [Descripción general del SDK](/es/plugins/sdk-overview) - referencia completa de importaciones de subrutas
- [Aspectos internos del complemento](/es/plugins/architecture-internals#provider-runtime-hooks) - detalles de los enlaces y ejemplos incluidos

## Relacionado

- [Configuración del SDK de complementos](/es/plugins/sdk-setup)
- [Creación de complementos](/es/plugins/building-plugins)
- [Creación de complementos de canal](/es/plugins/sdk-channel-plugins)

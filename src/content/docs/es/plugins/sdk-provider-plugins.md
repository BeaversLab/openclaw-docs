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

<Info>Si no has construido ningún plugin de OpenClaw antes, lee primero [Cómo empezar](/es/plugins/building-plugins) para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

<Tip>Los plugins de proveedor añaden modelos al bucle de inferencia normal de OpenClaw. Si el modelo debe ejecutarse a través de un demonio de agente nativo que sea propietario de los subprocesos, la compactación o los eventos de herramientas, empareja el proveedor con un [arnés de agente](/es/plugins/sdk-agent-harness) en lugar de poner los detalles del protocolo del demonio en el núcleo.</Tip>

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
    las credenciales sin cargar el tiempo de ejecución de tu plugin. Añade `providerAuthAliases`
    cuando una variante de proveedor deba reutilizar la autenticación de otro ID de proveedor. `modelSupport`
    es opcional y permite a OpenClaw cargar automáticamente tu plugin de proveedor desde IDs de modelo
    abreviados como `acme-large` antes de que existan los ganchos de tiempo de ejecución. Si publicas el
    proveedor en ClawHub, esos campos `openclaw.compat` y `openclaw.build`
    son obligatorios en `package.json`.

  </Step>

  <Step title="Registrar el proveedor">
    Un proveedor de texto mínimo necesita un `id`, un `label`, un `auth` y un `catalog`.
    El `catalog` es el enlace de tiempo de ejecución/configuración propiedad del proveedor; puede llamar a APIs de proveedores en vivo y devuelve entradas `models.providers`.

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

    El `registerModelCatalogProvider` es la superficie del catálogo del plano de control más reciente
    para la interfaz de usuario de lista/ayuda/selector. Úselo para filas de texto, generación de imágenes,
    generación de video y generación de música. Mantenga las llamadas a endpoints de proveedores y
    el mapeo de respuestas en el complemento; OpenClaw posee la forma de fila compartida, las etiquetas
    de origen y el renderizado de ayuda.

    Ese es un proveedor funcional. Los usuarios ahora pueden
    `openclaw onboard --acme-ai-api-key <key>` y seleccionar
    `acme-ai/acme-large` como su modelo.

    Si el proveedor upstream utiliza diferentes tokens de control que OpenClaw, agregue una
    pequeña transformación de texto bidireccional en lugar de reemplazar la ruta de flujo (stream):

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

    El `input` reescribe el contenido final del mensaje del sistema y de texto antes
    del transporte. El `output` reescribe los deltas de texto del asistente y el texto final antes
    de que OpenClaw analice sus propios marcadores de control o la entrega del canal.

    Para proveedores integrados que solo registran un proveedor de texto con autenticación
    de clave de API más un tiempo de ejecución respaldado por un solo catálogo, prefiera el auxiliar
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

    El `buildProvider` es la ruta del catálogo en vivo utilizada cuando OpenClaw puede resolver la
    autenticación real del proveedor. Puede realizar descubrimientos específicos del proveedor. Use
    `buildStaticProvider` solo para filas sin conexión que sean seguras de mostrar antes de que la
    autenticación esté configurada; no debe requerir credenciales ni realizar solicitudes de red.
    La visualización del `models list --all` de OpenClaw actualmente ejecuta catálogos estáticos
    solo para complementos de proveedor integrados, con una configuración vacía, un entorno vacío y sin
    rutas de agente/espacio de trabajo.

    Si su flujo de autenticación también necesita parchear `models.providers.*`, alias y
    el modelo predeterminado del agente durante la incorporación, use los auxiliares preestablecidos de
    `openclaw/plugin-sdk/provider-onboard`. Los auxiliares más estrechos son
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` y
    `createModelCatalogPresetAppliers(...)`.

    Cuando el endpoint nativo de un proveedor admite bloques de uso en flujo (streamed) en el
    transporte normal `openai-completions`, prefiera los auxiliares de catálogo compartidos en
    `openclaw/plugin-sdk/provider-catalog-shared` en lugar de codificar
    comprobaciones de ID de proveedor. El `supportsNativeStreamingUsageCompat(...)` y
    el `applyProviderNativeStreamingUsageCompat(...)` detectan compatibilidad desde el
    mapa de capacidades del endpoint, por lo que los endpoints nativos de estilo Moonshot/DashScope aún
    se activan incluso cuando un complemento utiliza un ID de proveedor personalizado.

  </Step>

  <Step title="Añadir resolución dinámica de modelos">
    Si su proveedor acepta IDs de modelo arbitrarios (como un proxy o enrutador),
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
    calentamiento asíncrono: `resolveDynamicModel` se ejecuta de nuevo después de que se complete.

  </Step>

  <Step title="Añadir hooks de tiempo de ejecución (según sea necesario)">
    La mayoría de los proveedores solo necesitan `catalog` + `resolveDynamicModel`. Añade hooks
    de manera incremental a medida que tu proveedor los requiera.

    Los constructores de ayuda compartidos ahora cubren las familias de replay/compatibilidad de herramientas más comunes,
    por lo que los complementos generalmente no necesitan conectar manualmente cada hook uno por uno:

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

    Familias de replay disponibles hoy:

    | Familia | Lo que conecta | Ejemplos incluidos |
    | --- | --- | --- |
    | `openai-compatible` | Política de replay estilo OpenAI compartida para transportes compatibles con OpenAI, incluyendo saneamiento de tool-call-id, correcciones de orden asistente-primero y validación genérica de turnos Gemini donde el transporte lo necesita | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | Política de replay consciente de Claude elegida por `modelId`, por lo que los transportes de mensajes de Anthropic solo obtienen la limpieza de bloques de pensamiento específica de Claude cuando el modelo resuelto es realmente un id de Claude | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | Política de replay nativa de Gemini más saneamiento de replay de arranque y modo de salida de razonamiento etiquetado | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | Saneamiento de firma de pensamiento de Gemini para modelos Gemini que se ejecutan a través de transportes de proxy compatibles con OpenAI; no habilita la validación de replay nativa de Gemini ni reescrituras de arranque | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | Política híbrida para proveedores que mezclan superficies de modelos de mensajes de Anthropic y compatibles con OpenAI en un solo complemento; la eliminación opcional de bloques de pensamiento solo para Claude se mantiene limitada al lado de Anthropic | `minimax` |

    Familias de stream disponibles hoy:

    | Familia | Lo que conecta | Ejemplos incluidos |
    | --- | --- | --- |
    | `google-thinking` | Normalización de carga útil de pensamiento de Gemini en la ruta de stream compartida | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | Envoltorio de razonamiento Kilo en la ruta de stream de proxy compartido, con `kilo/auto` e ids de razonamiento de proxy no compatibles que omiten el pensamiento inyectado | `kilocode` |
    | `moonshot-thinking` | Mapeo de carga útil de pensamiento nativo binario de Moonshot desde la configuración + nivel `/think` | `moonshot` |
    | `minimax-fast-mode` | Reescritura de modelo en modo rápido de MiniMax en la ruta de stream compartida | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | Envoltorios de Responses nativos compartidos de OpenAI/Codex: encabezados de atribución, `/fast`/`serviceTier`, verbosidad de texto, búsqueda web nativa de Codex, conformación de carga útil de compatibilidad de razonamiento y gestión de contexto de Responses | `openai`, `openai-codex` |
    | `openrouter-thinking` | Envoltorio de razonamiento de OpenRouter para rutas de proxy, con omisiones de modelo no compatible/`auto` manejadas centralmente | `openrouter` |
    | `tool-stream-default-on` | Envoltorio `tool_stream` activado por defecto para proveedores como Z.AI que desean streaming de herramientas a menos que se desactiven explícitamente | `zai` |

    <Accordion title="Costuras del SDK que impulsan los constructores de familias">
      Cada constructor de familia se compone de ayudas públicas de menor nivel exportadas desde el mismo paquete, a las que puedes recurrir cuando un proveedor necesita salirse del patrón común:

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)` y los constructores de replay brutos (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). También exporta ayudas de replay de Gemini (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) y ayudas de endpoint/modelo (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`, `normalizeNativeXaiModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, más los envoltorios compartidos de OpenAI/Codex (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), el envoltorio compatible con OpenAI de DeepSeek V4 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), la limpieza de prellenado de pensamiento de Mensajes de Anthropic (`createAnthropicThinkingPrefillPayloadWrapper`) y los envoltorios de proxy/proveedor compartidos (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("gemini")`, ayudas de esquema de Gemini subyacentes (`normalizeGeminiToolSchemas`, `inspectGeminiToolSchemas`) y ayudas de compatibilidad con xAI (`resolveXaiModelCompatPatch()`, `applyXaiModelCompat(model)`). El complemento xAI incluido usa `normalizeResolvedModel` + `contributeResolvedModelCompat` con estos para mantener las reglas xAI propiedad del proveedor.

      Algunas ayudas de stream se mantienen locales al proveedor a propósito. `@openclaw/anthropic-provider` mantiene `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` y los constructores de envoltorios de Anthropic de menor nivel en su propia costura pública `api.ts` / `contract-api.ts` porque codifican el manejo beta de OAuth de Claude y el control de acceso `context1m`. El complemento xAI mantiene de manera similar la forma nativa de Responses de xAI en su propio `wrapStreamFn` (alias de `/fast`, `tool_stream` predeterminado, limpieza de herramientas estrictas no compatibles, eliminación de carga útil de razonamiento específica de xAI).

      El mismo patrón de raíz de paquete también respalda `@openclaw/openai-provider` (constructores de proveedores, ayudas de modelo predeterminado, constructores de proveedores en tiempo real) y `@openclaw/openrouter-provider` (constructor de proveedor más ayudas de incorporación/configuración).
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

    <Accordion title="Todos los hooks de proveedor disponibles">
      OpenClaw llama a los hooks en este orden. La mayoría de los proveedores solo usan 2-3:
      Los campos de proveedor solo de compatibilidad que OpenClaw ya no llama, como
      `ProviderPlugin.capabilities` y `suppressBuiltInModel`, no se enumeran
      aquí.

      | # | Hook | Cuándo usar |
      | --- | --- | --- |
      | 1 | `catalog` | Catálogo de modelos o valores predeterminados de URL base |
      | 2 | `applyConfigDefaults` | Valores predeterminados globales propiedad del proveedor durante la materialización de la configuración |
      | 3 | `normalizeModelId` | Limpieza de alias de id de modelo heredados/vista previa antes de la búsqueda |
      | 4 | `normalizeTransport` | Limpieza de familia de proveedor `api` / `baseUrl` antes del ensamblaje de modelo genérico |
      | 5 | `normalizeConfig` | Normalizar configuración `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Reescrituras de compatibilidad de uso de streaming nativo para proveedores de configuración |
      | 7 | `resolveConfigApiKey` | Resolución de autenticación de marcador de entorno propiedad del proveedor |
      | 8 | `resolveSyntheticAuth` | Autenticación sintética local/autoalojada o respaldada por configuración |
      | 9 | `shouldDeferSyntheticProfileAuth` | Reducir marcadores de posición de perfil almacenado sintético detrás de autenticación de entorno/configuración |
      | 10 | `resolveDynamicModel` | Aceptar IDs de modelo ascendentes arbitrarios |
      | 11 | `prepareDynamicModel` | Obtención de metadatos asíncronos antes de resolver |
      | 12 | `normalizeResolvedModel` | Reescrituras de transporte antes del ejecutor |
      | 13 | `contributeResolvedModelCompat` | Indicadores de compatibilidad para modelos de proveedor detrás de otro transporte compatible |
      | 14 | `normalizeToolSchemas` | Limpieza de esquema de herramientas propiedad del proveedor antes del registro |
      | 15 | `inspectToolSchemas` | Diagnósticos de esquema de herramientas propiedad del proveedor |
      | 16 | `resolveReasoningOutputMode` | Contrato de salida de razonamiento etiquetado vs nativo |
      | 17 | `prepareExtraParams` | Parámetros de solicitud predeterminados |
      | 18 | `createStreamFn` | Transporte StreamFn completamente personalizado |
      | 19 | `wrapStreamFn` | Envoltorios de encabezados/cuerpo personalizados en la ruta de stream normal |
      | 20 | `resolveTransportTurnState` | Encabezados/metadatos nativos por turno |
      | 21 | `resolveWebSocketSessionPolicy` | Encabezados/enfriamiento de sesión WS nativa |
      | 22 | `formatApiKey` | Forma de token de tiempo de ejecución personalizada |
      | 23 | `refreshOAuth` | Actualización de OAuth personalizada |
      | 24 | `buildAuthDoctorHint` | Orientación de reparación de autenticación |
      | 25 | `matchesContextOverflowError` | Detección de desbordamiento propiedad del proveedor |
      | 26 | `classifyFailoverReason` | Clasificación de límite de tasa/sobrecarga propiedad del proveedor |
      | 27 | `isCacheTtlEligible` | Control de TTL de caché de prompt |
      | 28 | `buildMissingAuthMessage` | Sugerencia personalizada de autenticación faltante |
      | 29 | `augmentModelCatalog` | Filas sintéticas de compatibilidad futura |
      | 30 | `resolveThinkingProfile` | Conjunto de opciones `/think` específicas del modelo |
      | 31 | `isBinaryThinking` | Compatibilidad de encendido/apagado de pensamiento binario |
      | 32 | `supportsXHighThinking` | Compatibilidad de soporte de razonamiento `xhigh` |
      | 33 | `resolveDefaultThinkingLevel` | Compatibilidad de política `/think` predeterminada |
      | 34 | `isModernModelRef` | Coincidencia de modelo en vivo/prueba |
      | 35 | `prepareRuntimeAuth` | Intercambio de tokens antes de la inferencia |
      | 36 | `resolveUsageAuth` | Análisis de credenciales de uso personalizadas |
      | 37 | `fetchUsageSnapshot` | Endpoint de uso personalizado |
      | 38 | `createEmbeddingProvider` | Adaptador de incrustación propiedad del proveedor para memoria/búsqueda |
      | 39 | `buildReplayPolicy` | Política de replay/compactación de transcripción personalizada |
      | 40 | `sanitizeReplayHistory` | Reescrituras de replay específicas del proveedor después de la limpieza genérica |
      | 41 | `validateReplayTurns` | Validación estricta de turno de replay antes del ejecutor integrado |
      | 42 | `onModelSelected` | Devolución de llamada posterior a la selección (por ejemplo, telemetría) |

      Notas sobre respaldo en tiempo de ejecución:

      - `normalizeConfig` verifica el proveedor coincidente primero, luego otros complementos de proveedor con capacidades de hook hasta que uno realmente cambie la configuración. Si ningún hook de proveedor reescribe una entrada de configuración de familia de Google compatible, el normalizador de configuración de Google incluido aún se aplica.
      - `resolveConfigApiKey` usa el hook del proveedor cuando está expuesto. La ruta `amazon-bedrock` incluida también tiene un resolvedor de marcador de entorno de AWS integrado aquí, aunque la autenticación en tiempo de ejecución de Bedrock en sí aún usa la cadena predeterminada del AWS SDK.
      - `resolveSystemPromptContribution` permite que un proveedor inyecte orientación de prompt del sistema consciente de la caché para una familia de modelos. Prefiérala sobre `before_prompt_build` cuando el comportamiento pertenezca a una familia de proveedor/modelo y deba preservar la división de caché estable/dinámica.

      Para descripciones detalladas y ejemplos del mundo real, consulte [Internals: Provider Runtime Hooks](/es/plugins/architecture-internals#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Añadir capacidades adicionales (opcional)">
    ### Paso 5: Añadir capacidades adicionales

    Un proveedor de complementos puede registrar voz, transcripción en tiempo real, voz en tiempo real,
    comprensión de medios, generación de imágenes, generación de video, obtención web,
    y búsqueda web junto con la inferencia de texto. OpenClaw clasifica esto como un
    complemento de **capacidad híbrida**: el patrón recomendado para complementos de empresas

n (un complemento por proveedor). Consulte
[Internals: Capability Ownership](/es/plugins/architecture#capability-ownership-model).

    Registre cada capacidad dentro de `register(api)` junto con su llamada `api.registerProvider(...)` existente.
    Elija solo las pestañas que necesite:

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
        Se prefiere `createRealtimeTranscriptionWebSocketSession(...)`: el asistente compartido
        maneja la captura de proxy, la retirada de reconexión, el vaciado de cierre, los
        apretones de mano de listo, la puesta en cola de audio y el diagnóstico de eventos de cierre. Su complemento
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
        `openclaw/plugin-sdk/provider-http`. El asistente normaliza los nombres de archivo de carga,
        incluyendo las cargas AAC que necesitan un nombre de archivo estilo M4A para
        APIs de transcripción compatibles.
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
        transportes, formatos de audio y banderas de características a los clientes de Talk del navegador y nativos.
        Implemente `handleBargeIn` cuando un transporte pueda detectar que un
        humano está interrumpiendo la reproducción del asistente y el proveedor admita
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
      </Tab>
      <Tab title="Generación de imágenes y video">
        Las capacidades de video usan una forma **consciente del modo**: `generate`,
        `imageToVideo`, y `videoToVideo`. Los campos agregados planos como
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

No uses el alias de publicación heredado solo para habilidades aquí; los paquetes de plugins deben usar
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

`catalog.order` controla cuándo se fusiona tu catálogo en relación con los proveedores
integrados:

| Orden     | Cuándo             | Caso de uso                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `simple`  | Primera pasada     | Proveedores de clave API simple                        |
| `profile` | Después de simple  | Proveedores restringidos por perfiles de autenticación |
| `paired`  | Después del perfil | Sintetizar múltiples entradas relacionadas             |
| `late`    | Última pasada      | Anular proveedores existentes (gana en colisión)       |

## Siguientes pasos

- [Plugins de canal](/es/plugins/sdk-channel-plugins) - si tu plugin también proporciona un canal
- [SDK Runtime](/es/plugins/sdk-runtime) - ayudantes `api.runtime` (TTS, búsqueda, subagente)
- [Descripción general del SDK](/es/plugins/sdk-overview) - referencia completa de importaciones de subrutas
- [Aspectos internos del plugin](/es/plugins/architecture-internals#provider-runtime-hooks) - detalles de los enlaces (hooks) y ejemplos incluidos

## Relacionado

- [Configuración del Plugin SDK](/es/plugins/sdk-setup)
- [Creación de plugins](/es/plugins/building-plugins)
- [Creación de plugins de canal](/es/plugins/sdk-channel-plugins)

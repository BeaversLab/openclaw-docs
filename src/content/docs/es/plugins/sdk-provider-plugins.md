---
title: "Construir complementos de proveedor"
sidebarTitle: "Complementos de proveedor"
summary: "Guía paso a paso para construir un complemento de proveedor de modelos para OpenClaw"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# Crear complementos de proveedores

Esta guía explica cómo crear un complemento de proveedor que añade un proveedor de modelos
(LLM) a OpenClaw. Al final tendrás un proveedor con un catálogo de modelos,
autenticación de clave de API y resolución dinámica de modelos.

<Info>Si no has construido ningún complemento de OpenClaw antes, lee [Introducción](/en/plugins/building-plugins) primero para conocer la estructura básica del paquete y la configuración del manifiesto.</Info>

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
    las credenciales sin cargar el tiempo de ejecución de tu complemento. `modelSupport` es opcional
    y permite a OpenClaw cargar automáticamente tu complemento de proveedor desde IDs de modelos abreviados
    como `acme-large` antes de que existan los ganchos de tiempo de ejecución. Si publicas el
    proveedor en ClawHub, esos campos `openclaw.compat` y `openclaw.build`
    son obligatorios en `package.json`.

  </Step>

  <Step title="Registrar el proveedor">
    Un proveedor mínimo necesita un `id`, un `label`, un `auth` y un `catalog`:

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

    Ese es un proveedor funcional. Ahora los usuarios pueden
    `openclaw onboard --acme-ai-api-key <key>` y seleccionar
    `acme-ai/acme-large` como su modelo.

    Para proveedores integrados que solo registren un proveedor de texto con autenticación
    de clave de API más un tiempo de ejecución respaldado por un solo catálogo, prefiera el asistente más estrecho
    `defineSingleProviderPluginEntry(...)`:

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
        },
      },
    });
    ```

    Si su flujo de autenticación también necesita parchear `models.providers.*`, alias y
    el modelo predeterminado del agente durante la incorporación, use los asistentes preestablecidos de
    `openclaw/plugin-sdk/provider-onboard`. Los asistentes más estrechos son
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` y
    `createModelCatalogPresetAppliers(...)`.

    Cuando el punto final nativo de un proveedor admite bloques de uso transmitidos en el
    transporte normal `openai-completions`, prefiera los asistentes de catálogo compartidos en
    `openclaw/plugin-sdk/provider-catalog-shared` en lugar de codificar
    comprobaciones de ID de proveedor. `supportsNativeStreamingUsageCompat(...)` y
    `applyProviderNativeStreamingUsageCompat(...)` detectan el soporte desde el
    mapa de capacidades del punto final, por lo que los puntos finales nativos estilo Moonshot/DashScope aún
    se aceptan incluso cuando un complemento usa un ID de proveedor personalizado.

  </Step>

  <Step title="Agregar resolución dinámica de modelos">
    Si su proveedor acepta IDs de modelos arbitrarios (como un proxy o enrutador),
    agregue `resolveDynamicModel`:

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
    calentamiento asíncrono — `resolveDynamicModel` se ejecuta nuevamente después de que se complete.

  </Step>

  <Step title="Añadir ganchos de tiempo de ejecución (según sea necesario)">
    La mayoría de los proveedores solo necesitan `catalog` + `resolveDynamicModel`. Añada ganchos
    incrementalmente según los requiera su proveedor.

    Los constructores de ayuda compartidos ahora cubren las familias de
    reproducción/compatibilidad de herramientas más comunes, por lo que los
    complementos generalmente no necesitan conectar manualmente cada gancho uno
    por uno:

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
    | `openai-compatible` | Política de reproducción estilo OpenAI compartida para transportes compatibles con OpenAI, incluyendo saneamiento de id de llamada de herramienta, correcciones de ordenamiento de asistente primero y validación genérica de turnos Gemini donde el transporte lo necesita |
    | `anthropic-by-model` | Política de reproducción consciente de Claude elegida por `modelId`, por lo que los transportes de mensajes de Anthropic solo obtienen limpieza de bloques de pensamiento específicos de Claude cuando el modelo resuelto es realmente una id de Claude |
    | `google-gemini` | Política de reproducción nativa de Gemini más saneamiento de reproducción de arranque y modo de salida de razonamiento etiquetado |
    | `passthrough-gemini` | Saneamiento de firma de pensamiento de Gemini para modelos Gemini que se ejecutan a través de transportes de proxy compatibles con OpenAI; no habilita la validación de reproducción nativa de Gemini ni reescrituras de arranque |
    | `hybrid-anthropic-openai` | Política híbrida para proveedores que mezclan superficies de modelo de mensajes de Anthropic y compatibles con OpenAI en un complemento; la eliminación opcional de bloques de pensamiento solo para Claude permanece limitada al lado de Anthropic |

    Ejemplos reales incluidos:

    - `google`: `google-gemini`
    - `openrouter`, `kilocode`, `opencode`, y `opencode-go`: `passthrough-gemini`
    - `amazon-bedrock` y `anthropic-vertex`: `anthropic-by-model`
    - `minimax`: `hybrid-anthropic-openai`
    - `moonshot`, `ollama`, `xai`, y `zai`: `openai-compatible`

    Familias de transmisión disponibles hoy:

    | Familia | Lo que conecta |
    | --- | --- |
    | `google-thinking` | Normalización de carga útil de pensamiento de Gemini en la ruta de transmisión compartida |
    | `kilocode-thinking` | Envoltorio de razonamiento Kilo en la ruta de transmisión de proxy compartido, con `kilo/auto` e ids de razonamiento de proxy no compatibles omitiendo el pensamiento inyectado |
    | `moonshot-thinking` | Mapeo de carga útil de pensamiento nativo binario de Moonshot desde configuración + nivel `/think` |
    | `minimax-fast-mode` | Reescritura de modelo en modo rápido de MiniMax en la ruta de transmisión compartida |
    | `openai-responses-defaults` | Envoltorios nativos compartidos de OpenAI/Codex Responses: encabezados de atribución, `/fast`/`serviceTier`, verbosidad de texto, búsqueda web nativa de Codex, conformación de carga útil de compatibilidad de razonamiento y gestión de contexto de Responses |
    | `openrouter-thinking` | Envoltorio de razonamiento de OpenRouter para rutas de proxy, con omisiones de modelo no compatible/`auto` manejadas centralmente |
    | `tool-stream-default-on` | Envoltorio `tool_stream` activado por defecto para proveedores como Z.AI que desean transmisión de herramientas a menos que se desactive explícitamente |

    Ejemplos reales incluidos:

    - `google`: `google-thinking`
    - `kilocode`: `kilocode-thinking`
    - `moonshot`: `moonshot-thinking`
    - `minimax` y `minimax-portal`: `minimax-fast-mode`
    - `openai` y `openai-codex`: `openai-responses-defaults`
    - `openrouter`: `openrouter-thinking`
    - `zai`: `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` también exporta el enum de familia de
    reproducción más las ayudas compartidas de las que se construyen esas
    familias. Las exportaciones públicas comunes incluyen:

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - constructores de reproducción compartidos tales como `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)`, y
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - ayudas de reproducción de Gemini tales como `sanitizeGoogleGeminiReplayHistory(...)`
      y `resolveTaggedReasoningOutputMode()`
    - ayudas de punto final/modelo tales como `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)`, y
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` expone tanto el constructor de
    familia como las ayudas de envoltorio públicas que esas familias reutilizan.
    Las exportaciones públicas comunes incluyen:

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - envoltorios compartidos de OpenAI/Codex tales como
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)`, y
      `createCodexNativeWebSearchWrapper(...)`
    - envoltorios compartidos de proxy/proveedor tales como `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)`, y `createMinimaxFastModeWrapper(...)`

    Algunas ayudas de transmisión permanecen locales del proveedor a propósito.
    Ejemplo incluido actual: `@openclaw/anthropic-provider` exporta
    `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, y los
    constructores de envoltorio de Anthropic de menor nivel desde su costura pública
    `api.ts` / `contract-api.ts`. Esas ayudas permanecen
    específicas de Anthropic porque también codifican el manejo beta de OAuth de
    Claude y el control de acceso `context1m`.

    Otros proveedores incluidos también mantienen envoltorios específicos del
    transporte localmente cuando el comportamiento no se comparte de manera
    limpia entre familias. Ejemplo actual: el complemento xAI incluido mantiene
    la conformación de Responses nativa de xAI en su propio
    `wrapStreamFn`, incluyendo reescrituras de alias `/fast`,
    `tool_stream` predeterminado, limpieza de herramienta estricta no
    compatible y eliminación de carga útil de razonamiento específica de xAI.

    `openclaw/plugin-sdk/provider-tools` actualmente expone una familia de esquema de
    herramienta compartida más ayudas de esquema/compatibilidad compartidas:

    - `ProviderToolCompatFamily` documenta el inventario de familia compartido hoy.
    - `buildProviderToolCompatFamilyHooks("gemini")` conecta la limpieza y
      diagnósticos de esquema de Gemini para proveedores que necesitan esquemas de
      herramienta seguros para Gemini.
    - `normalizeGeminiToolSchemas(...)` y `inspectGeminiToolSchemas(...)`
      son las ayudas públicas de esquema de Gemini subyacentes.
    - `resolveXaiModelCompatPatch()` devuelve el parche de compatibilidad
      xAI incluido: `toolSchemaProfile: "xai"`, palabras clave de esquema no
      compatibles, soporte nativo `web_search`, y decodificación de
      argumentos de llamada de herramienta de entidad HTML.
    - `applyXaiModelCompat(model)` aplica ese mismo parche de compatibilidad
      xAI a un modelo resuelto antes de que llegue al ejecutor.

    Ejemplo real incluido: el complemento xAI usa `normalizeResolvedModel` más
    `contributeResolvedModelCompat` para mantener esos metadatos de compatibilidad
    propiedad del proveedor en lugar de codificar reglas xAI en el núcleo.

    El mismo patrón de raíz de paquete también respalda otros proveedores incluidos:

    - `@openclaw/openai-provider`: `api.ts` exporta constructores de
      proveedor, ayudas de modelo predeterminado y constructores de proveedor en
      tiempo real
    - `@openclaw/openrouter-provider`: `api.ts` exporta el constructor de
      proveedor más ayudas de incorporación/configuración

    <Tabs>
      <Tab title="Intercambio de token">
        Para proveedores que necesitan un intercambio de token antes de cada llamada de
        inferencia:

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
        Para proveedores que necesitan encabezados de solicitud personalizados o
        modificaciones del cuerpo:

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
        Para proveedores que necesitan encabezados de solicitud/sesión nativos o
        metadatos en transportes HTTP genéricos o WebSocket:

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
      OpenClaw llama a los ganchos en este orden. La mayoría de los proveedores
      solo usan 2-3:

      | # | Gancho | Cuándo usar |
      | --- | --- | --- |
      | 1 | `catalog` | Catálogo de modelos o valores predeterminados de URL base |
      | 2 | `applyConfigDefaults` | Valores predeterminados globales propiedad del proveedor durante la materialización de configuración |
      | 3 | `normalizeModelId` | Limpieza de alias de id de modelo heredados/vista previa antes de la búsqueda |
      | 4 | `normalizeTransport` | Limpieza de `api` / `baseUrl` de familia de proveedor antes del ensamblaje de modelo genérico |
      | 5 | `normalizeConfig` | Normalizar configuración `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Reescrituras de compatibilidad de uso de transmisión nativa para proveedores de configuración |
      | 7 | `resolveConfigApiKey` | Resolución de autenticación de marcador de entorno propiedad del proveedor |
      | 8 | `resolveSyntheticAuth` | Autenticación sintética local/autohospedada o respaldada por configuración |
      | 9 | `shouldDeferSyntheticProfileAuth` | Bajar marcadores de posición de perfil almacenado sintético detrás de autenticación de entorno/configuración |
      | 10 | `resolveDynamicModel` | Aceptar IDs de modelo ascendentes arbitrarios |
      | 11 | `prepareDynamicModel` | Obtención de metadatos asíncronos antes de resolver |
      | 12 | `normalizeResolvedModel` | Reescrituras de transporte antes del ejecutor |

    Notas de reserva de tiempo de ejecución:

    - `normalizeConfig` verifica el proveedor coincidente primero, luego otros
      complementos de proveedor con capacidad de gancho hasta que uno realmente
      cambie la configuración. Si ningún gancho de proveedor reescribe una entrada de
      configuración de familia Google compatible, el normalizador de configuración
      Google incluido todavía se aplica.
    - `resolveConfigApiKey` usa el gancho del proveedor cuando se expone. La ruta
      `amazon-bedrock` incluida también tiene un resolvedor de marcador de
      entorno AWS incorporado aquí, aunque la autenticación de tiempo de ejecución de
      Bedrock todavía usa la cadena predeterminada del AWS SDK.
      | 13 | `contributeResolvedModelCompat` | Banderas de compatibilidad para modelos de proveedor detrás de otro transporte compatible |
      | 14 | `capabilities` | Bolsa de capacidades estática heredada; solo compatibilidad |
      | 15 | `normalizeToolSchemas` | Limpieza de esquema de herramienta propiedad del proveedor antes del registro |
      | 16 | `inspectToolSchemas` | Diagnósticos de esquema de herramienta propiedad del proveedor |
      | 17 | `resolveReasoningOutputMode` | Contrato de salida de razonamiento etiquetado vs nativo |
      | 18 | `prepareExtraParams` | Parámetros de solicitud predeterminados |
      | 19 | `createStreamFn` | Transporte StreamFn totalmente personalizado |
      | 20 | `wrapStreamFn` | Envoltorios de encabezados/cuerpo personalizados en la ruta de transmisión normal |
      | 21 | `resolveTransportTurnState` | Encabezados/metadatos nativos por turno |
      | 22 | `resolveWebSocketSessionPolicy` | Encabezados/enfriamiento de sesión WS nativos |
      | 23 | `formatApiKey` | Forma de token de tiempo de ejecución personalizada |
      | 24 | `refreshOAuth` | Actualización de OAuth personalizada |
      | 25 | `buildAuthDoctorHint` | Guía de reparación de autenticación |
      | 26 | `matchesContextOverflowError` | Detección de desbordamiento propiedad del proveedor |
      | 27 | `classifyFailoverReason` | Clasificación de límite de tasa/sobrecarga propiedad del proveedor |
      | 28 | `isCacheTtlEligible` | Control de TTL de caché de aviso |
      | 29 | `buildMissingAuthMessage` | Sugerencia personalizada de autenticación faltante |
      | 30 | `suppressBuiltInModel` | Ocultar filas ascendentes obsoletas |
      | 31 | `augmentModelCatalog` | Filas sintéticas de compatibilidad futura |
      | 32 | `isBinaryThinking` | Pensamiento binario activado/desactivado |
      | 33 | `supportsXHighThinking` | Soporte de razonamiento `xhigh` |
      | 34 | `resolveDefaultThinkingLevel` | Política predeterminada `/think` |
      | 35 | `isModernModelRef` | Coincidencia de modelo en vivo/prueba |
      | 36 | `prepareRuntimeAuth` | Intercambio de token antes de la inferencia |
      | 37 | `resolveUsageAuth` | Análisis personalizado de credenciales de uso |
      | 38 | `fetchUsageSnapshot` | Punto final de uso personalizado |
      | 39 | `createEmbeddingProvider` | Adaptador de incrustación propiedad del proveedor para memoria/búsqueda |
    | 40 | `buildReplayPolicy` | Política personalizada de reproducción/compactación de transcripción |
    | 41 | `sanitizeReplayHistory` | Reescrituras de reproducción específicas del proveedor después de la limpieza genérica |
    | 42 | `validateReplayTurns` | Validación estricta de turno de reproducción antes del ejecutor incrustado |
    | 43 | `onModelSelected` | Devolución de llamada posterior a la selección (por ejemplo, telemetría) |

      Nota de ajuste de aviso:

      - `resolveSystemPromptContribution` permite a un proveedor inyectar orientación
        de aviso del sistema consciente de caché para una familia de modelos.
        Prefiérala sobre `before_prompt_build` cuando el comportamiento pertenece a
        una familia de proveedor/modelo y debe preservar la división de caché
        estable/dinámica.

      Para descripciones detalladas y ejemplos del mundo real, consulte
      [Internals: Provider Runtime Hooks](/en/plugins/architecture#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Añadir capacidades adicionales (opcional)">
    <a id="step-5-add-extra-capabilities"></a>
    Un proveedor de complementos puede registrar voz, transcripción en tiempo real,
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
        createSession: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          close: () => {},
          isConnected: () => true,
        }),
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
          maxVideos: 1,
          maxDurationSeconds: 10,
          supportsResolution: true,
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
    el patrón recomendado para complementos de empresas (un complemento por proveedor).
    Consulte [Internals: Capability Ownership](/en/plugins/architecture#capability-ownership-model).

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

Los plugins de proveedores se publican de la misma manera que cualquier otro plugin de código externo:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

No use el alias de publicación solo para habilidades heredado aquí; los paquetes
de complementos deben usar `clawhub package publish`.

## Estructura de archivos

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## Referencia del orden del catálogo

`catalog.order` controla cuándo se fusiona su catálogo en relación
con los proveedores integrados:

| Orden     | Cuándo             | Caso de uso                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `simple`  | Primera pasada     | Proveedores de clave API simple                        |
| `profile` | Después de simple  | Proveedores restringidos por perfiles de autenticación |
| `paired`  | Después del perfil | Sintetizar múltiples entradas relacionadas             |
| `late`    | Última pasada      | Anular proveedores existentes (gana en colisión)       |

## Siguientes pasos

- [Complementos de canal](/en/plugins/sdk-channel-plugins) — si su complemento también proporciona un canal
- [SDK Runtime](/en/plugins/sdk-runtime) — asistentes de `api.runtime` (TTS, búsqueda, subagente)
- [Descripción general del SDK](/en/plugins/sdk-overview) — referencia completa de importaciones de subrutas
- [Internos del complemento](/en/plugins/architecture#provider-runtime-hooks) — detalles de los ganchos y ejemplos incluidos

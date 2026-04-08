---
title: "Créer des plugins de fournisseur"
sidebarTitle: "Plugins de fournisseur"
summary: "Guide étape par étape pour créer un plugin de fournisseur de modèle pour OpenClaw"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

# Créer des plugins de fournisseur

Ce guide explique la création d'un plugin de fournisseur qui ajoute un fournisseur de modèle
(LLM) à OpenClaw. À la fin, vous disposerez d'un fournisseur avec un catalogue de modèles,
une authentification par clé API et une résolution dynamique de modèle.

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/en/plugins/building-plugins) pour comprendre la structure de base du package et la configuration du manifeste.</Info>

## Procédure pas à pas

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package et manifeste">
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

    Le manifeste déclare `providerAuthEnvVars` pour que OpenClaw puisse détecter
    les identifiants sans charger le runtime de votre plugin. `modelSupport` est optionnel
    et permet à OpenClaw de charger automatiquement votre plugin de fournisseur à partir d'IDs de modèle abrégés
    comme `acme-large` avant que les hooks du runtime n'existent. Si vous publiez le
    fournisseur sur ClawHub, ces champs `openclaw.compat` et `openclaw.build`
    sont requis dans `package.json`.

  </Step>

  <Step title="Enregistrer le fournisseur">
    Un fournisseur minimal a besoin d'un `id`, d'un `label`, d'un `auth` et d'un `catalog` :

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

    C'est un fournisseur fonctionnel. Les utilisateurs peuvent maintenant
    `openclaw onboard --acme-ai-api-key <key>` et sélectionner
    `acme-ai/acme-large` comme leur modèle.

    Pour les fournisseurs groupés qui n'enregistrent qu'un seul fournisseur de texte avec une authentification par clé API
    ainsi qu'un runtime basé sur un catalogue unique, préférez l'assistant plus étroit
    `defineSingleProviderPluginEntry(...)` :

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

    Si votre flux d'authentification doit également corriger `models.providers.*`, des alias et
    le modèle par défaut de l'agent lors de l'onboarding, utilisez les assistants prédéfinis de
    `openclaw/plugin-sdk/provider-onboard`. Les assistants les plus étroits sont
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` et
    `createModelCatalogPresetAppliers(...)`.

    Lorsque le point de terminaison natif d'un fournisseur prend en charge les blocs d'utilisation en flux sur le
    transport normal `openai-completions`, préférez les assistants de catalogue partagé dans
    `openclaw/plugin-sdk/provider-catalog-shared` au lieu de coder en dur
    les vérifications d'ID de fournisseur. `supportsNativeStreamingUsageCompat(...)` et
    `applyProviderNativeStreamingUsageCompat(...)` détectent la prise en charge à partir de
    la carte des capacités du point de terminaison, de sorte que les points de terminaison natifs de style Moonshot/DashScope
    s'activent toujours même lorsqu'un plugin utilise un ID de fournisseur personnalisé.

  </Step>

  <Step title="Ajouter la résolution dynamique de modèle">
    Si votre fournisseur accepte des ID de modèle arbitraires (comme un proxy ou un routeur),
    ajoutez `resolveDynamicModel` :

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

    Si la résolution nécessite un appel réseau, utilisez `prepareDynamicModel` pour un
    préchauffage asynchrone — `resolveDynamicModel` s'exécute à nouveau après son achèvement.

  </Step>

  <Step title="Ajouter des hooks d'exécution (si nécessaire)">
    La plupart des providers n'ont besoin que de `catalog` + `resolveDynamicModel`. Ajoutez les hooks
    progressivement au fur et à mesure que votre provider en a besoin.

    Les constructeurs d'assistants partagés couvrent désormais les familles de relecture/compatibilité d'outils les plus courantes,
    les plugins n'ont donc généralement pas besoin de câbler chaque hook manuellement un par un :

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

    Familles de relecture disponibles aujourd'hui :

    | Famille | Ce qu'elle connecte |
    | --- | --- |
    | `openai-compatible` | Stratégie de relecture partagée de type OpenAI pour les transports compatibles OpenAI, incluant le nettoyage des tool-call-id, les corrections de l'ordre assistant en premier, et la validation générique des tours Gemini lorsque le transport en a besoin |
    | `anthropic-by-model` | Stratégie de relecture consciente Claude choisie par `modelId`, donc les transports à messages Anthropic ne reçoivent le nettoyage spécifique des blocs de réflexion Claude que lorsque le modèle résolu est réellement un id Claude |
    | `google-gemini` | Stratégie de relecture native Gemini plus nettoyage de relecture d'amorçage et mode de sortie de raisonnement étiqueté |
    | `passthrough-gemini` | Nettoyage des signatures de pensée Gemini pour les modèles Gemini exécutés via des transports de proxy compatibles OpenAI ; n'active pas la validation de relecture native Gemini ou les réécritures d'amorçage |
    | `hybrid-anthropic-openai` | Stratégie hybride pour les providers qui mélangent les surfaces de modèles à messages Anthropic et compatibles OpenAI dans un seul plugin ; la suppression facultative des blocs de réflexion Claude uniquement reste limitée au côté Anthropic |

    Exemples réels fournis :

    - `google` : `google-gemini`
    - `openrouter`, `kilocode`, `opencode` et `opencode-go` : `passthrough-gemini`
    - `amazon-bedrock` et `anthropic-vertex` : `anthropic-by-model`
    - `minimax` : `hybrid-anthropic-openai`
    - `moonshot`, `ollama`, `xai` et `zai` : `openai-compatible`

    Familles de flux disponibles aujourd'hui :

    | Famille | Ce qu'elle connecte |
    | --- | --- |
    | `google-thinking` | Normalisation de la charge utile de réflexion Gemini sur le chemin de flux partagé |
    | `kilocode-thinking` | Wrapper de raisonnement Kilo sur le chemin de flux de proxy partagé, avec `kilo/auto` et les ids de raisonnement proxy non pris en charge sautant la réflexion injectée |
    | `moonshot-thinking` | Mappage de charge utile de réflexion native binaire Moonshot depuis la config + le niveau `/think` |
    | `minimax-fast-mode` | Réécriture de modèle en mode rapide MiniMax sur le chemin de flux partagé |
    | `openai-responses-defaults` | Wrappers de réponses natifs OpenAI/Codex partagés : en-têtes d'attribution, `/fast`/`serviceTier`, verbosité du texte, recherche web Codex native, mise en forme de charge utile compat raisonnement, et gestion de contexte Responses |
    | `openrouter-thinking` | Wrapper de raisonnement OpenRouter pour les routes proxy, avec les sauts modèle-non-pris-en-charge/`auto` gérés centralement |
    | `tool-stream-default-on` | Wrapper `tool_stream` activé par défaut pour les providers comme Z.AI qui veulent le flux d'outils sauf s'il est explicitement désactivé |

    Exemples réels fournis :

    - `google` : `google-thinking`
    - `kilocode` : `kilocode-thinking`
    - `moonshot` : `moonshot-thinking`
    - `minimax` et `minimax-portal` : `minimax-fast-mode`
    - `openai` et `openai-codex` : `openai-responses-defaults`
    - `openrouter` : `openrouter-thinking`
    - `zai` : `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` exporte également l'énumération de famille de relecture
    ainsi que les assistants partagés à partir desquels ces familles sont construites. Les exportations publiques courantes
    incluent :

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - constructeurs de relecture partagés tels que `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)` et
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - assistants de relecture Gemini tels que `sanitizeGoogleGeminiReplayHistory(...)`
      et `resolveTaggedReasoningOutputMode()`
    - assistants de point de terminaison/modèle tels que `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)` et
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` expose à la fois le constructeur de famille
    et les assistants wrapper publics que ces familles réutilisent. Les exportations publiques courantes
    incluent :

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - wrappers OpenAI/Codex partagés tels que
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)` et
      `createCodexNativeWebSearchWrapper(...)`
    - wrappers proxy/provider partagés tels que `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)` et `createMinimaxFastModeWrapper(...)`

    Certains assistants de flux restent spécifiques au provider par choix. L'exemple fourni
    actuel : `@openclaw/anthropic-provider` exporte
    `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` et les
    constructeurs de wrapper Anthropic de niveau inférieur à partir de sa couture publique `api.ts` /
    `contract-api.ts`. Ces assistants restent spécifiques à Anthropic car
    ils encodent également la gestion bêta OAuth de Claude OAuth et le filtrage `context1m`.

    D'autres providers fournis gardent également les wrappers spécifiques au transport en local lorsque
    le comportement n'est pas partagé proprement entre les familles. Exemple actuel : le
    plugin xAI fourni conserve la mise en forme des réponses xAI natives dans son propre
    `wrapStreamFn`, y compris les réécritures d'alias `/fast`, le `tool_stream` par défaut,
    le nettoyage strict des outils non pris en charge, et la suppression de charge utile de raisonnement spécifique à xAI.

    `openclaw/plugin-sdk/provider-tools` expose actuellement une famille
    de schéma d'outil partagée plus des assistants de schéma/compat partagés :

    - `ProviderToolCompatFamily` documente l'inventaire de la famille partagée aujourd'hui.
    - `buildProviderToolCompatFamilyHooks("gemini")` connecte le nettoyage du schéma
      Gemini + diagnostics pour les providers qui ont besoin de schémas d'outils sûrs pour Gemini.
    - `normalizeGeminiToolSchemas(...)` et `inspectGeminiToolSchemas(...)`
      sont les assistants de schéma Gemini publics sous-jacents.
    - `resolveXaiModelCompatPatch()` retourne le correctif de compat xAI fourni :
      `toolSchemaProfile: "xai"`, mots-clés de schéma non pris en charge, support
      `web_search` natif, et décodage des arguments d'appel d'outil d'entité HTML.
    - `applyXaiModelCompat(model)` applique ce même correctif de compat xAI à un
      modèle résolu avant qu'il n'atteigne le lanceur.

    Exemple réel fourni : le plugin xAI utilise `normalizeResolvedModel` plus
    `contributeResolvedModelCompat` pour garder ces métadonnées de compatibilité détenues par le
    provider au lieu de coder en dur les règles xAI dans le cœur.

    Le même modèle racine de package prend également en charge d'autres providers fournis :

    - `@openclaw/openai-provider` : `api.ts` exporte des constructeurs de provider,
      des assistants de modèle par défaut et des constructeurs de provider en temps réel
    - `@openclaw/openrouter-provider` : `api.ts` exporte le constructeur de provider
      plus les assistants d'intégration/de configuration

    <Tabs>
      <Tab title="Échange de jetons">
        Pour les providers qui ont besoin d'un échange de jetons avant chaque appel d'inférence :

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
      <Tab title="En-têtes personnalisés">
        Pour les providers qui ont besoin d'en-têtes de requête personnalisés ou de modifications du corps :

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
      <Tab title="Identité de transport native">
        Pour les providers qui ont besoin d'en-têtes de requête/session natifs ou de métadonnées sur
        les transports HTTP génériques ou WebSocket :

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
      <Tab title="Utilisation et facturation">
        Pour les providers qui exposent des données d'utilisation/facturation :

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

    <Accordion title="Tous les hooks de provider disponibles">
      OpenClaw appelle les hooks dans cet ordre. La plupart des providers n'en utilisent que 2 ou 3 :

      | # | Hook | Quand l'utiliser |
      | --- | --- | --- |
      | 1 | `catalog` | Catalogue de modèles ou URL de base par défaut |
      | 2 | `applyConfigDefaults` | Valeurs par défaut globales détenues par le provider lors de la matérialisation de la configuration |
      | 3 | `normalizeModelId` | Nettoyage d'alias d'identifiant de modèle hérité/aperçu avant recherche |
      | 4 | `normalizeTransport` | Nettoyage `api` / `baseUrl` de la famille de provider avant l'assemblage de modèle générique |
      | 5 | `normalizeConfig` | Normaliser la config `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Réécritures de compat d'utilisation de streaming natives pour les providers de config |
      | 7 | `resolveConfigApiKey` | Résolution d'auth de marqueur d'environnement détenue par le provider |
      | 8 | `resolveSyntheticAuth` | Auth synthétique local/auto-hébergé ou sauvegardée par config |
      | 9 | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil stocké synthétiques derrière l'auth env/config |
      | 10 | `resolveDynamicModel` | Accepter les ID de modèle en amont arbitraires |
      | 11 | `prepareDynamicModel` | Récupération asynchrone de métadonnées avant résolution |
      | 12 | `normalizeResolvedModel` | Réécritures de transport avant le lanceur |

    Notes de repli d'exécution :

    - `normalizeConfig` vérifie d'abord le provider correspondant, puis d'autres
      plugins provider capables de hooks jusqu'à ce que l'un change réellement la configuration.
      Si aucun hook de provider ne réécrit une entrée de configuration de famille Google prise en charge, le
      normaliseur de configuration Google fourni s'applique toujours.
    - `resolveConfigApiKey` utilise le hook de provider lorsqu'il est exposé. Le chemin
      `amazon-bedrock` fourni dispose également ici d'un résolveur de marqueur d'environnement AWS intégré,
      même si l'auth d'exécution Bedrock utilise toujours la chaîne par défaut du AWS SDK.
      | 13 | `contributeResolvedModelCompat` | Indicateurs de compat pour les modèles de fournisseur derrière un autre transport compatible |
      | 14 | `capabilities` | Sac de capacités statiques hérité ; compatibilité uniquement |
      | 15 | `normalizeToolSchemas` | Nettoyage du schéma d'outil détenu par le provider avant l'enregistrement |
      | 16 | `inspectToolSchemas` | Diagnostics du schéma d'outil détenus par le provider |
      | 17 | `resolveReasoningOutputMode` | Contrat de sortie de raisonnement étiqueté vs natif |
      | 18 | `prepareExtraParams` | Paramètres de requête par défaut |
      | 19 | `createStreamFn` | Transport StreamFn entièrement personnalisé |
      | 20 | `wrapStreamFn` | En-têtes/corps wrappers personnalisés sur le chemin de flux normal |
      | 21 | `resolveTransportTurnState` | En-têtes/métadonnées natifs par tour |
      | 22 | `resolveWebSocketSessionPolicy` | En-têtes/refroidissement de session WS natifs |
      | 23 | `formatApiKey` | Forme de jeton d'exécution personnalisée |
      | 24 | `refreshOAuth` | Actualisation OAuth personnalisée |
      | 25 | `buildAuthDoctorHint` | Conseils de réparation d'auth |
      | 26 | `matchesContextOverflowError` | Détection de dépassement détenue par le provider |
      | 27 | `classifyFailoverReason` | Classification de limite de taux/surcharge détenue par le provider |
      | 28 | `isCacheTtlEligible` | Filtrage TTL du cache de prompt |
      | 29 | `buildMissingAuthMessage` | Indication d'auth manquante personnalisée |
      | 30 | `suppressBuiltInModel` | Masquer les lignes en amont obsolètes |
      | 31 | `augmentModelCatalog` | Lignes synthétiques de compatibilité avant |
      | 32 | `isBinaryThinking` | Pensée binaire activée/désactivée |
      | 33 | `supportsXHighThinking` | Support de raisonnement `xhigh` |
      | 34 | `resolveDefaultThinkingLevel` | Stratégie `/think` par défaut |
      | 35 | `isModernModelRef` | Correspondance de modèle vivant/fumigé |
      | 36 | `prepareRuntimeAuth` | Échange de jetons avant inférence |
      | 37 | `resolveUsageAuth` | Analyse des identifiants d'utilisation personnalisés |
      | 38 | `fetchUsageSnapshot` | Point de terminaison d'utilisation personnalisé |
      | 39 | `createEmbeddingProvider` | Adaptateur d'incorporation détenu par le provider pour la mémoire/recherche |
      | 40 | `buildReplayPolicy` | Stratégie de relecture/compactage de transcription personnalisée |
      | 41 | `sanitizeReplayHistory` | Réécritures de relecture spécifiques au provider après le nettoyage générique |
      | 42 | `validateReplayTurns` | Validation stricte du tour de relecture avant le lanceur intégré |
      | 43 | `onModelSelected` | Rappel post-sélection (ex. télémétrie) |

      Note sur le réglage du prompt :

      - `resolveSystemPromptContribution` permet à un provider d'injecter des conseils
        de système de prompt sensibles au cache pour une famille de modèles. Préférez-le à
        `before_prompt_build` lorsque le comportement appartient à une famille de provider/modèle
        et doit préserver la division cache stable/dynamique.

      Pour des descriptions détaillées et des exemples concrets, voir
      [Internes : Hooks d'exécution du provider](/en/plugins/architecture#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Ajouter des capacités supplémentaires (optionnel)">
    <a id="step-5-add-extra-capabilities"></a>
    Un plugin de provider peut enregistrer la synthèse vocale, la transcription en temps réel, la voix en temps réel,
    la compréhension des médias, la génération d'images, la génération de vidéos, la récupération web,
    et la recherche web en plus de l'inférence de texte :

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

    OpenClaw classe cela comme un plugin à **capacités hybrides**. Il s'agit du
    modèle recommandé pour les plugins d'entreprise (un plugin par fournisseur). Voir
    [Internals: Capability Ownership](/en/plugins/architecture#capability-ownership-model).

  </Step>

  <Step title="Test">
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

## Publier sur ClawHub

Les plugins provider sont publiés de la même manière que tout autre plugin de code externe :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

N'utilisez pas ici l'alias de publication obsolète pour les seules compétences ; les packages de plugins doivent utiliser
`clawhub package publish`.

## Structure des fichiers

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with providerAuthEnvVars
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## Référence de l'ordre du catalogue

`catalog.order` contrôle le moment où votre catalogue fusionne par rapport aux providers
intégrés :

| Ordre     | Quand          | Cas d'usage                                                   |
| --------- | -------------- | ------------------------------------------------------------- |
| `simple`  | Première passe | Providers avec clé API simple                                 |
| `profile` | Après simple   | Providers conditionnés par des profils d'authentification     |
| `paired`  | Après profil   | Synthétiser plusieurs entrées liées                           |
| `late`    | Dernière passe | Remplacer les providers existants (gagne en cas de collision) |

## Étapes suivantes

- [Plugins de canal](/en/plugins/sdk-channel-plugins) — si votre plugin fournit également un channel
- [SDK Runtime](/en/plugins/sdk-runtime) — assistants `api.runtime` (TTS, recherche, sous-agent)
- [Aperçu du SDK](/en/plugins/sdk-overview) — référence complète des imports de sous-chemins
- [Plugins Internals](/en/plugins/architecture#provider-runtime-hooks) — détails des hooks et exemples groupés

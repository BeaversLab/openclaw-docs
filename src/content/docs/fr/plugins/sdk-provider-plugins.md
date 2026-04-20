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

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/fr/plugins/building-plugins) pour connaître la structure de base du package et la configuration du manifeste.</Info>

<Tip>Les plugins de fournisseur ajoutent des modèles à la boucle d'inférence normale de OpenClaw. Si le modèle doit passer par un démon d'agent natif qui gère les threads, la compactage ou les événements d'outil, associez le fournisseur à un [agent harness](/fr/plugins/sdk-agent-harness) au lieu de mettre les détails du protocole du démon dans le cœur.</Tip>

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

    Le manifeste déclare `providerAuthEnvVars` afin que OpenClaw puisse détecter
    les identifiants sans charger votre runtime de plugin. Ajoutez `providerAuthAliases`
    lorsqu'une variante de fournisseur doit réutiliser l'authentification de l'ID d'un autre fournisseur. `modelSupport`
    est facultatif et permet à OpenClaw de charger automatiquement votre plugin de fournisseur à partir d'ID de modèle
    abrégés comme `acme-large` avant que les hooks d'exécution n'existent. Si vous publiez le
    fournisseur sur ClawHub, ces champs `openclaw.compat` et `openclaw.build`
    sont requis dans `package.json`.

  </Step>

  <Step title="Enregistrer le provider">
    Un provider minimal a besoin d'un `id`, d'un `label`, d'un `auth` et d'un `catalog` :

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

    C'est un provider fonctionnel. Les utilisateurs peuvent maintenant
    `openclaw onboard --acme-ai-api-key <key>` et sélectionner
    `acme-ai/acme-large` comme leur modèle.

    Si le provider en amont utilise des jetons de contrôle différents de OpenClaw, ajoutez une
    petite transformation de texte bidirectionnelle au lieu de remplacer le chemin du flux :

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

    `input` réécrit le contenu final du système et des messages texte avant
    le transport. `output` réécrit les deltas de texte de l'assistant et le texte final avant
    que OpenClaw n'analyse ses propres marqueurs de contrôle ou la livraison par canal.

    Pour les providers groupés qui n'enregistrent qu'un seul provider texte avec une authentification par clé API
    ainsi qu'un runtime basé sur un catalogue unique, préférez l'assistant plus restreint
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

    Si votre flux d'authentification doit également corriger `models.providers.*`, les alias et
    le modèle par défaut de l'agent lors de l'onboarding, utilisez les assistants prédéfinis de
    `openclaw/plugin-sdk/provider-onboard`. Les assistants les plus restreints sont
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` et
    `createModelCatalogPresetAppliers(...)`.

    Lorsque le point de terminaison natif d'un provider prend en charge les blocs d'utilisation en flux sur le
    transport `openai-completions` normal, préférez les assistants de catalogue partagé dans
    `openclaw/plugin-sdk/provider-catalog-shared` au lieu de coder en dur
    les vérifications d'ID de provider. `supportsNativeStreamingUsageCompat(...)` et
    `applyProviderNativeStreamingUsageCompat(...)` détectent la prise en charge à partir de
    la carte des capacités du point de terminaison, les points de terminaison de style natif Moonshot/DashScope optent donc
    toujours pour cela, même lorsqu'un plugin utilise un ID de provider personnalisé.

  </Step>

  <Step title="Ajouter la résolution dynamique de modèle">
    Si votre provider accepte des ID de modèle arbitraires (comme un proxy ou un routeur),
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
    La plupart des providers n'ont besoin que de `catalog` + `resolveDynamicModel`. Ajoutez des hooks
    de manière incrémentale au fur et à mesure que votre provider en a besoin.

    Les builders de helpers partagés couvrent désormais les familles de reprise/compatibilité tool les plus courantes,
    les plugins n'ont donc généralement pas besoin de câbler chaque hook un par un :

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

    Familles de reprise disponibles aujourd'hui :

    | Famille | Ce qu'elle câble |
    | --- | --- |
    | `openai-compatible` | Stratégie de reprise de style OpenAI partagée pour les transports compatibles OpenAI, incluant la nettoyage des tool-call-id, les corrections de l'ordre assistant en premier, et la validation générique des tours Gemini là où le transport en a besoin |
    | `anthropic-by-model` | Stratégie de reprise consciente Claude choisie par `modelId`, afin que les transports de messages Anthropic ne reçoivent le nettoyage des blocs de pensée spécifiques à Claude que si le modèle résolu est réellement un id Claude |
    | `google-gemini` | Stratégie de reprise native Gemini plus nettoyage de la reprise de bootstrap et le mode de sortie de raisonnement étiqueté |
    | `passthrough-gemini` | Nettoyage de la signature de pensée Gemini pour les modèles Gemini fonctionnant via des transports proxy compatibles OpenAI ; n'active pas la validation de reprise native Gemini ou les réécritures de bootstrap |
    | `hybrid-anthropic-openai` | Politique hybride pour les providers qui mélangent les surfaces de modèles de messages Anthropic et compatibles OpenAI dans un seul plugin ; la suppression optionnelle des blocs de pensée Claude-only reste limitée au côté Anthropic |

    Exemples réels regroupés :

    - `google` et `google-gemini-cli` : `google-gemini`
    - `openrouter`, `kilocode`, `opencode`, et `opencode-go` : `passthrough-gemini`
    - `amazon-bedrock` et `anthropic-vertex` : `anthropic-by-model`
    - `minimax` : `hybrid-anthropic-openai`
    - `moonshot`, `ollama`, `xai`, et `zai` : `openai-compatible`

    Familles de flux disponibles aujourd'hui :

    | Famille | Ce qu'elle câble |
    | --- | --- |
    | `google-thinking` | Normalisation de la charge utile de pensée Gemini sur le chemin de flux partagé |
    | `kilocode-thinking` | Wrapper de raisonnement Kilo sur le chemin de flux proxy partagé, avec `kilo/auto` et les ids de raisonnement proxy non pris en charge sautant la pensée injectée |
    | `moonshot-thinking` | Mappage de charge utile de pensée native binaire Moonshot depuis la config + niveau `/think` |
    | `minimax-fast-mode` | Réécriture de modèle en mode rapide MiniMax sur le chemin de flux partagé |
    | `openai-responses-defaults` | Wrappers de réponses natifs OpenAI/Codex partagés : en-têtes d'attribution, `/fast`/`serviceTier`, verbosité du texte, recherche web Codex native, mise en forme de la charge utile compat raisonnement, et gestion du contexte des réponses |
    | `openrouter-thinking` | Wrapper de raisonnement OpenRouter pour les routes proxy, avec les sauts de modèle non pris en charge/`auto` gérés centralement |
    | `tool-stream-default-on` | Wrapper activé par défaut `tool_stream` pour les providers comme Z.AI qui veulent le streaming d'outils sauf s'il est explicitement désactivé |

    Exemples réels regroupés :

    - `google` et `google-gemini-cli` : `google-thinking`
    - `kilocode` : `kilocode-thinking`
    - `moonshot` : `moonshot-thinking`
    - `minimax` et `minimax-portal` : `minimax-fast-mode`
    - `openai` et `openai-codex` : `openai-responses-defaults`
    - `openrouter` : `openrouter-thinking`
    - `zai` : `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` exporte également l'énumération de famille de reprise
    ainsi que les helpers partagés à partir desquels ces familles sont construites. Les exportations publiques courantes incluent :

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - builders de reprise partagés tels que `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)`, et
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - helpers de reprise Gemini tels que `sanitizeGoogleGeminiReplayHistory(...)`
      et `resolveTaggedReasoningOutputMode()`
    - helpers de endpoint/modèle tels que `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)`, et
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` expose à la fois le builder de famille
    et les helpers de wrapper publics que ces familles réutilisent. Les exportations publiques courantes incluent :

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - wrappers partagés OpenAI/Codex tels que
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)`, et
      `createCodexNativeWebSearchWrapper(...)`
    - wrappers de proxy/provider partagés tels que `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)`, et `createMinimaxFastModeWrapper(...)`

    Certains helpers de flux restent locaux au provider par choix. Exemple regroupé actuel : `@openclaw/anthropic-provider` exporte
    `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les
    builders de wrapper Anthropic de niveau inférieur à partir de sa couture publique `api.ts` /
    `contract-api.ts`. Ces helpers restent spécifiques à Anthropic car
    ils encodent également la gestion bêta OAuth Claude OAuth et la limitation `context1m`.

    D'autres providers regroupés gardent également les wrappers spécifiques au transport en local lorsque
    le comportement n'est pas partagé proprement entre les familles. Exemple actuel : le plugin
    xAI regroupé conserve la mise en forme des réponses xAI natives dans son propre
    `wrapStreamFn`, y compris les réécritures d'alias `/fast`, le `tool_stream` par défaut,
    le nettoyage strict d'outil non pris en charge, et la suppression
    de charge utile de raisonnement spécifique à xAI.

    `openclaw/plugin-sdk/provider-tools` expose actuellement une famille de schéma d'outil partagée
    plus des helpers de schéma/compatibilité partagés :

    - `ProviderToolCompatFamily` documente l'inventaire de famille partagée aujourd'hui.
    - `buildProviderToolCompatFamilyHooks("gemini")` câble le nettoyage de schéma
      Gemini + diagnostics pour les providers qui ont besoin de schémas d'outil sûrs pour Gemini.
    - `normalizeGeminiToolSchemas(...)` et `inspectGeminiToolSchemas(...)`
      sont les helpers de schéma Gemini publics sous-jacents.
    - `resolveXaiModelCompatPatch()` renvoie le patch de compatibilité xAI regroupé :
      `toolSchemaProfile: "xai"`, mots-clés de schéma non pris en charge, support natif
      `web_search`, et décodage d'arguments d'appel d'outil d'entité HTML.
    - `applyXaiModelCompat(model)` applique ce même patch de compatibilité xAI à un
      modèle résolu avant qu'il n'atteigne le runner.

    Exemple réel regroupé : le plugin xAI utilise `normalizeResolvedModel` plus
    `contributeResolvedModelCompat` pour garder ces métadonnées de compatibilité détenues par le
    provider au lieu de coder en dur les règles xAI dans le core.

    Le même motif de racine de package prend également en charge d'autres providers regroupés :

    - `@openclaw/openai-provider` : `api.ts` exporte les builders de provider,
      les helpers de modèle par défaut, et les builders de provider en temps réel
    - `@openclaw/openrouter-provider` : `api.ts` exporte le builder de provider
      plus les helpers d'intégration/de configuration

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
        Pour les providers qui exposent des données d'utilisation/de facturation :

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
      OpenClaw appelle les hooks dans cet ordre. La plupart des providers n'en utilisent que 2-3 :

      | # | Hook | Quand l'utiliser |
      | --- | --- | --- |
      | 1 | `catalog` | Catalogue de modèles ou URL de base par défaut |
      | 2 | `applyConfigDefaults` | Valeurs globales par défaut détenues par le provider lors de la matérialisation de la configuration |
      | 3 | `normalizeModelId` | Nettoyage d'alias d'identifiant de modèle hérité/preview avant recherche |
      | 4 | `normalizeTransport` | Nettoyage `api` / `baseUrl` de la famille de provider avant l'assemblage générique du modèle |
      | 5 | `normalizeConfig` | Normaliser la config `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Réécritures de compatibilité d'utilisation de streaming natives pour les providers de configuration |
      | 7 | `resolveConfigApiKey` | Résolution d'auth par marqueur d'environnement détenue par le provider |
      | 8 | `resolveSyntheticAuth` | Auth synthétique local/auto-hébergé ou sauvegardée par la configuration |
      | 9 | `shouldDeferSyntheticProfileAuth` | Remplacer les espaces réservés de profil stocké synthétique par l'auth env/config |
      | 10 | `resolveDynamicModel` | Accepter les IDs de modèle amont arbitraires |
      | 11 | `prepareDynamicModel` | Récupération asynchrone de métadonnées avant résolution |
      | 12 | `normalizeResolvedModel` | Réécritures de transport avant le runner |

    Notes de repli d'exécution :

    - `normalizeConfig` vérifie d'abord le provider correspondant, puis les autres
      plugins de provider capables de hooks jusqu'à ce que l'un change réellement la configuration.
      Si aucun hook de provider ne réécrit une entrée de configuration de famille Google prise en charge, le
      normaliseur de configuration Google regroupé s'applique toujours.
    - `resolveConfigApiKey` utilise le hook du provider lorsqu'il est exposé. Le chemin
      `amazon-bedrock` regroupé a également un résolveur de marqueur d'environnement AWS intégré ici,
      même si l'auth runtime Bedrock utilise toujours la chaîne par défaut du AWS SDK.
      | 13 | `contributeResolvedModelCompat` | indicateurs de compatibilité pour les modèles de fournisseurs derrière un autre transport compatible |
      | 14 | `capabilities` | Sac de capacités statiques héritées ; compatibilité uniquement |
      | 15 | `normalizeToolSchemas` | Nettoyage de schéma d'outil détenue par le provider avant l'enregistrement |
      | 16 | `inspectToolSchemas` | Diagnostics de schéma d'outil détenue par le provider |
      | 17 | `resolveReasoningOutputMode` | Contrat de sortie de raisonnement étiqueté vs natif |
      | 18 | `prepareExtraParams` | Paramètres de requête par défaut |
      | 19 | `createStreamFn` | Transport StreamFn entièrement personnalisé |
      | 20 | `wrapStreamFn` | Wrappers d'en-têtes/corps personnalisés sur le chemin de flux normal |
      | 21 | `resolveTransportTurnState` | En-têtes/métadonnées natifs par tour |
      | 22 | `resolveWebSocketSessionPolicy` | En-tètres/session WS natifs et refroidissement |
      | 23 | `formatApiKey` | Forme de jeton d'exécution personnalisée |
      | 24 | `refreshOAuth` | Rafraîchissement OAuth personnalisé |
      | 25 | `buildAuthDoctorHint` | Guide de réparation d'auth |
      | 26 | `matchesContextOverflowError` | Détection de débordement détenue par le provider |
      | 27 | `classifyFailoverReason` | Classification de limite de taux/surcharge détenue par le provider |
      | 28 | `isCacheTtlEligible` | Gestion TTL du cache de prompt |
      | 29 | `buildMissingAuthMessage` | Indication personnalisée d'auth manquante |
      | 30 | `suppressBuiltInModel` | Masquer les lignes amont obsolètes |
      | 31 | `augmentModelCatalog` | Lignes synthétiques de compatibilité ascendante |
      | 32 | `isBinaryThinking` | Pensée binaire on/off |
      | 33 | `supportsXHighThinking` | Support de raisonnement `xhigh` |
      | 34 | `resolveDefaultThinkingLevel` | Politique par défaut `/think` |
      | 35 | `isModernModelRef` | Correspondance de modèle live/fumigée |
      | 36 | `prepareRuntimeAuth` | Échange de jetons avant l'inférence |
      | 37 | `resolveUsageAuth` | Analyse personnalisée des informations d'identification d'utilisation |
      | 38 | `fetchUsageSnapshot` | Point de terminaison d'utilisation personnalisé |
      | 39 | `createEmbeddingProvider` | Adaptateur d'intégration détenue par le provider pour la mémoire/recherche |
      | 40 | `buildReplayPolicy` | Politique personnalisée de reprise/compactage de transcription |
      | 41 | `sanitizeReplayHistory` | Réécritures de reprise spécifiques au provider après le nettoyage générique |
      | 42 | `validateReplayTurns` | Validation stricte du tour de reprise avant le runner intégré |
      | 43 | `onModelSelected` | Rappel post-sélection (ex. télémétrie) |

      Note sur le réglage de prompt :

    - `resolveSystemPromptContribution` permet à un provider d'injecter des directives de
      système de prompt tenant compte du cache pour une famille de modèles. Préférez-le à
      `before_prompt_build` lorsque le comportement appartient à une famille de provider/modèle
      et doit préserver la division stable/dynamique du cache.

      Pour des descriptions détaillées et des exemples réels, voir
      [Internals : Provider Runtime Hooks](/fr/plugins/architecture#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Ajouter des capacités supplémentaires (facultatif)">
    <a id="step-5-add-extra-capabilities"></a>
    Un plugin de fournisseur peut enregistrer la reconnaissance vocale, la transcription en temps réel, la voix en temps réel,
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

    OpenClaw classe cela comme un plugin à **capacités hybrides**. C'est le
    modèle recommandé pour les plugins d'entreprise (un plugin par fournisseur). Voir
    [Internals: Capability Ownership](/fr/plugins/architecture#capability-ownership-model).

    Pour la génération de vidéos, privilégiez la forme de capacité sensible au mode montrée ci-dessus :
    `generate`, `imageToVideo`, et `videoToVideo`. Les champs agrégés plats tels
    que `maxInputImages`, `maxInputVideos`, et `maxDurationSeconds` ne sont pas
    suffisants pour annoncer proprement le support du mode de transformation ou les modes désactivés.

    Les fournisseurs de génération de musique doivent suivre le même modèle :
    `generate` pour la génération par prompt uniquement et `edit` pour la génération
    basée sur une image de référence. Les champs agrégés plats tels que `maxInputImages`,
    `supportsLyrics`, et `supportsFormat` ne suffisent pas pour annoncer le support de l'édition ;
    les blocs explicites `generate` / `edit` constituent le contrat attendu.

  </Step>

  <Step title="Tester">
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

Les plugins de fournisseur sont publiés de la même manière que n'importe quel autre plugin de code externe :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

N'utilisez pas ici l'alias de publication obsolète pour les compétences uniquement ; les packages de plugins doivent utiliser
`clawhub package publish`.

## Structure des fichiers

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers metadata
├── openclaw.plugin.json      # Manifest with provider auth metadata
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # Tests
    └── usage.ts              # Usage endpoint (optional)
```

## Référence de l'ordre du catalogue

`catalog.order` contrôle le moment où votre catalogue fusionne par rapport aux fournisseurs intégrés :

| Ordre     | Quand          | Cas d'usage                                                    |
| --------- | -------------- | -------------------------------------------------------------- |
| `simple`  | Première passe | Fournisseurs avec clé API simple                               |
| `profile` | Après simple   | Fournisseurs restreints par des profils d'authentification     |
| `paired`  | Après profil   | Synthétiser plusieurs entrées liées                            |
| `late`    | Dernière passe | Remplacer les fournisseurs existants (gagne en cas de conflit) |

## Étapes suivantes

- [Plugins de channel](/fr/plugins/sdk-channel-plugins) — si votre plugin fournit également un channel
- [Runtime du SDK](/fr/plugins/sdk-runtime) — assistants `api.runtime` (TTS, recherche, sous-agent)
- [Présentation du SDK](/fr/plugins/sdk-overview) — référence complète des imports de sous-chemins
- [Fonctionnement interne des plugins](/fr/plugins/architecture#provider-runtime-hooks) — détails des hooks et exemples inclus

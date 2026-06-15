---
summary: "OpenClawGuide étape par étape pour créer un plugin de fournisseur de modèle pour OpenClaw"
title: "Créer des plugins de fournisseur"
sidebarTitle: "Plugins de fournisseur"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

Ce guide vous explique comment créer un plugin de fournisseur qui ajoute un fournisseur de modèle (LLM) à OpenClaw. À la fin, vous aurez un fournisseur avec un catalogue de modèles, une authentification par clé API et une résolution dynamique de modèles.

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez [Getting Started](OpenClaw/en/plugins/building-plugins) d'abord pour connaître la structure de base du package et la configuration du manifeste.</Info>

<Tip>Les plugins de fournisseur ajoutent des modèles à la boucle d'inférence normale d'OpenClaw. Si le modèle doit passer par un démon d'agent natif qui gère les threads, la compaction ou les événements d'outil, associez le fournisseur à un [agent harness](OpenClaw/en/plugins/sdk-agent-harness) au lieu de mettre les détails du protocole du démon dans le cœur.</Tip>

## Procédure pas à pas

<Steps>
  <Step title="Package and manifest">
    ### Étape 1 : Package et manifeste

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

    Le manifeste déclare `setup.providers[].envVars`OpenClaw afin qu'OpenClaw puisse détecter
    les identifiants sans charger votre runtime de plugin. Ajoutez `providerAuthAliases`
    lorsqu'une variante de fournisseur doit réutiliser l'authentification de l'ID d'un autre fournisseur. `modelSupport`OpenClaw
    est facultatif et permet à OpenClaw de charger automatiquement votre plugin de fournisseur à partir d'ID de modèle
    abrégés comme `acme-large`ClawHub avant l'existence des hooks d'exécution. Si vous publiez le
    fournisseur sur ClawHub, ces champs `openclaw.compat` et `openclaw.build`
    sont requis dans `package.json`.

  </Step>

  <Step title="Enregistrer le provider">
    Un provider de texte minimal nécessite un `id`, `label`, `auth` et `catalog`.
    `catalog` est le hook d'exécution/configuration détenu par le provider ; il peut appeler des API de fournisseurs en direct et renvoie des entrées `models.providers`.

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

    `registerModelCatalogProvider` est la nouvelle surface de catalogue du plan de contrôle pour l'interface utilisateur de liste/aide/sélection. Utilisez-le pour les lignes de texte, de génération d'images, de génération de vidéo et de génération de musique. Conservez les appels au point de terminaison du fournisseur et le mappage des réponses dans le plugin ; OpenClaw possède la forme de ligne partagée, les étiquettes source et le rendu de l'aide.

    Il s'agit d'un provider fonctionnel. Les utilisateurs peuvent désormais `openclaw onboard --acme-ai-api-key <key>` et sélectionner `acme-ai/acme-large` comme modèle.

    Si le provider en amont utilise des jetons de contrôle différents de ceux de OpenClaw, ajoutez une petite transformation de texte bidirectionnelle au lieu de remplacer le chemin du flux :

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

    `input` réécrit le système final et le contenu du message texte avant le transport. `output` réécrit les deltas de texte de l'assistant et le texte final avant que OpenClaw n'analyse ses propres marqueurs de contrôle ou la diffusion par canal.

    Pour les providers groupés qui n'enregistrent qu'un seul provider de texte avec une authentification par clé API et un seul runtime basé sur un catalogue, préférez l'assistant plus étroit `defineSingleProviderPluginEntry(...)` :

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

    `buildProvider` est le chemin de catalogue en direct utilisé lorsque OpenClaw peut résoudre l'authentification réelle du provider. Il peut effectuer une découverte spécifique au provider. Utilisez `buildStaticProvider` uniquement pour les lignes hors ligne qui peuvent être affichées en toute sécurité avant que l'authentification ne soit configurée ; elle ne doit pas nécessiter d'informations d'identification ni faire de requêtes réseau. L'affichage `models list --all` de OpenClaw exécute actuellement des catalogues statiques uniquement pour les plugins de provider groupés, avec une configuration vide, un environnement vide et aucun chemin d'agent/workspace.

    Si votre flux d'authentification doit également corriger `models.providers.*`, des alias et le modèle par défaut de l'agent lors de l'intégration, utilisez les assistants de préréglage de `openclaw/plugin-sdk/provider-onboard`. Les assistants les plus étroits sont `createDefaultModelPresetAppliers(...)`, `createDefaultModelsPresetAppliers(...)` et `createModelCatalogPresetAppliers(...)`.

    Lorsque le point de terminaison natif d'un provider prend en charge les blocs d'utilisation en continu sur le transport `openai-completions` normal, préférez les assistants de catalogue partagés dans `openclaw/plugin-sdk/provider-catalog-shared` au lieu de coder en dur les vérifications d'identifiant de provider. `supportsNativeStreamingUsageCompat(...)` et `applyProviderNativeStreamingUsageCompat(...)` détectent la prise en charge à partir de la carte des capacités du point de terminaison, de sorte que les points de terminaison natifs de style Moonshot/DashScope s'activent toujours, même lorsqu'un plugin utilise un identifiant de provider personnalisé.

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

    Si la résolution nécessite un appel réseau, utilisez `prepareDynamicModel` pour le préchargement asynchrone
    - `resolveDynamicModel` s'exécute à nouveau une fois qu'il est terminé.

  </Step>

  <Step title="Ajouter des hooks d'exécution (au besoin)">
    La plupart des providers n'ont besoin que de `catalog` + `resolveDynamicModel`. Ajoutez des hooks
    de manière incrémentielle au fur et à mesure que votre provider en a besoin.

    Les builders d'aides partagés couvrent désormais les familles de relecture/compatibilité d'outils (replay/tool-compat) les plus courantes, les plugins n'ont donc généralement pas besoin de câbler chaque hook manuellement un par un :

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

    Familles de relecture (replay) disponibles aujourd'hui :

    | Famille | Ce qu'elle câble | Exemples groupés |
    | --- | --- | --- |
    | `openai-compatible` | Politique de relecture de style OpenAI partagée pour les transports compatibles OpenAI, incluant le nettoyage des tool-call-id, les corrections de l'ordre assistant-first, et la validation des tours Gemini générique là où le transport en a besoin | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | Politique de relecture consciente Claude choisie par `modelId`, donc les transports de messages Anthropic ne reçoivent le nettoyage des blocs de pensée spécifiques à Claude que lorsque le modèle résolu est réellement un identifiant Claude | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | Politique de relecture Gemini native plus le nettoyage de la relecture d'amorçage (bootstrap). La famille partagée maintient la sortie texte du CLI Gemini sur le raisonnement étiqueté ; le provider `google` direct remplace `resolveReasoningOutputMode` par `native` car la pensée du API Gemini arrive sous forme de parties de pensée natives. | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | Nettoyage de la signature de pensée Gemini pour les modèles Gemini exécutés via des transports proxy compatibles OpenAI ; n'active pas la validation de relecture native Gemini ou les réécritures d'amorçage | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | Politique hybride pour les providers qui mélangent des surfaces de messages Anthropic et de modèles compatibles OpenAI dans un seul plugin ; la suppression facultative des blocs de pensée Claude-only reste limitée au côté Anthropic | `minimax` |

    Familles de flux (stream) disponibles aujourd'hui :

    | Famille | Ce qu'elle câble | Exemples groupés |
    | --- | --- | --- |
    | `google-thinking` | Normalisation de la charge utile de pensée Gemini sur le chemin de flux partagé | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | Wrapper de raisonnement Kilo sur le chemin de flux proxy partagé, avec `kilo/auto` et les identifiants de raisonnement proxy non pris en charge ignorant la pensée injectée | `kilocode` |
    | `moonshot-thinking` | Mappage de charge utile de pensée native binaire Moonshot à partir de la configuration + niveau `/think` | `moonshot` |
    | `minimax-fast-mode` | Réécriture de modèle en mode rapide MiniMax sur le chemin de flux partagé | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | Wrappers de réponses natifs OpenAI/Codex partagés : en-têtes d'attribution, `/fast`/`serviceTier`, verbosité du texte, recherche web Codex native, mise en forme de charge utile de compatibilité de raisonnement, et gestion du contexte des réponses | `openai` |
    | `openrouter-thinking` | Wrapper de raisonnement OpenRouter pour les routes proxy, avec les sauts de modèle non pris en charge/`auto` gérés centralement | `openrouter` |
    | `tool-stream-default-on` | Wrapper activé par défaut `tool_stream` pour les providers comme Z.AI qui veulent le flux d'outils sauf s'il est explicitement désactivé | `zai` |

    <Accordion title="Coutures SDK alimentant les builders de familles">
      Chaque builder de famille est composé d'aides publiques de niveau inférieur exportées à partir du même package, auxquelles vous pouvez accéder lorsqu'un provider doit s'écarter du modèle commun :

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)`, et les builders de relecture bruts (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). Exporte également des aides de relecture Gemini (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) et des aides de point de terminaison/modèle (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, plus les wrappers OpenAI/Codex partagés (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), le wrapper compatible OpenAI DeepSeek V4 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), le nettoyage du préremplissage de pensée des messages Anthropic (`createAnthropicThinkingPrefillPayloadWrapper`), la compatibilité des appels d'outils en texte brut (`createPlainTextToolCallCompatWrapper`), et les wrappers proxy/provider partagés (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("deepseek" | "gemini" | "openai")`, et les aides de schéma de provider sous-jacentes.

      Pour les providers de la famille Gemini, maintenez le mode de sortie de raisonnement aligné avec
      le transport. Les providers API Gemini directs de Google doivent utiliser la sortie de raisonnement `native`
      afin que OpenClaw consomme les parties de pensée natives sans ajouter
      de directives d'invite `<think>` / `<final>`. Les backends en texte pur de style CLI Gemini
      qui analysent une réponse JSON/texte finale peuvent conserver le contrat
      `google-gemini` étiqueté partagé.

      Certaines aides de flux restent locales au provider exprès. `@openclaw/anthropic-provider` conserve `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les builders de wrapper Anthropic de niveau inférieur dans sa propre couture publique `api.ts` / `contract-api.ts`OAuth car ils encodent la gestion bêta OAuth de Claude et la porte `context1m`. Le plugin xAI conserve de manière similaire la mise en forme des réponses xAI natives dans son propre `wrapStreamFn` (alias `/fast`, `tool_stream` par défaut, nettoyage d'outil strict non pris en charge, suppression de charge utile de raisonnement spécifique à xAI).

      Le même modèle de racine de package prend également en charge `@openclaw/openai-provider` (builders de providers, aides de modèle par défaut, builders de providers en temps réel) et `@openclaw/openrouter-provider` (builder de provider plus aides d'intégration/de configuration).
    </Accordion>

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
        Pour les providers qui ont besoin d'en-têtes de requête personnalisés ou de modifications de corps :

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
        les transports HTTP ou WebSocket génériques :

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

        `resolveUsageAuth` a trois résultats. Renvoyez `{ token, accountId? }`
        lorsque le provider dispose d'un identifiant d'utilisation/de facturation. Renvoyez
        `{ handled: true }` uniquement lorsque le provider a définitivement géré l'authentification d'utilisation
        mais n'a aucun jeton d'utilisation utilisable, et que OpenClaw doit ignorer le repli générique
        de clé API/OAuth. Renvoyez `null` ou `undefined` lorsque le provider n'a
        pas géré la demande et que OpenClaw doit continuer avec le repli générique.
      </Tab>
    </Tabs>

    <Accordion title="Tous les hooks de provider disponibles">
      OpenClaw appelle les hooks dans cet ordre. La plupart des providers n'en utilisent que 2-3 :
      Les champs de provider uniquement de compatibilité que OpenClaw n'appelle plus, tels que
      `ProviderPlugin.capabilities` et `suppressBuiltInModel`, ne sont pas répertoriés
      ici.

      | # | Hook | Quand l'utiliser |
      | --- | --- | --- |
      | 1 | `catalog` | Catalogue de modèles ou URL de base par défaut |
      | 2 | `applyConfigDefaults` | Valeurs par défaut globales détenues par le provider lors de la matérialisation de la configuration |
      | 3 | `normalizeModelId` | Nettoyage des alias d'identifiant de modèle hérités/preview avant la recherche |
      | 4 | `normalizeTransport` | Nettoyage `api` / `baseUrl` de la famille de provider avant l'assemblage de modèle générique |
      | 5 | `normalizeConfig` | Normaliser la configuration `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Réécritures de compatibilité d'utilisation de diffusion en continu native pour les providers de configuration |
      | 7 | `resolveConfigApiKey` | Résolution de l'authentification par marqueur d'environnement détenue par le provider |
      | 8 | `resolveSyntheticAuth` | Authentification synthétique locale/auto-hébergée ou sauvegardée par configuration |
      | 9 | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil stocké synthétiques derrière l'authentification par environnement/configuration |
      | 10 | `resolveDynamicModel` | Accepter les identifiants de modèle en amont arbitraires |
      | 11 | `prepareDynamicModel` | Récupération asynchrone de métadonnées avant la résolution |
      | 12 | `normalizeResolvedModel` | Réécritures de transport avant le runner |
      | 13 | `normalizeToolSchemas` | Nettoyage du schéma d'outil détenu par le provider avant l'enregistrement |
      | 14 | `inspectToolSchemas` | Diagnostics du schéma d'outil détenu par le provider |
      | 15 | `resolveReasoningOutputMode` | Contrat de sortie de raisonnement étiqueté vs natif |
      | 16 | `prepareExtraParams` | Paramètres de requête par défaut |
      | 17 | `createStreamFn` | Transport StreamFn entièrement personnalisé |
      | 19 | `wrapStreamFn` | Wrappers d'en-têtes/corps personnalisés sur le chemin de flux normal |
      | 20 | `resolveTransportTurnState` | En-têtes/métadonnées natifs par tour |
      | 21 | `resolveWebSocketSessionPolicy` | En-têtes/cool-down de session WS native |
      | 22 | `formatApiKey` | Forme de jeton d'exécution personnalisée |
      | 23 | `refreshOAuth` | Actualisation OAuth personnalisée |
      | 24 | `buildAuthDoctorHint` | Conseils de réparation d'authentification |
      | 25 | `matchesContextOverflowError` | Détection de débordement détenue par le provider |
      | 26 | `classifyFailoverReason` | Classification de limite de taux/surcharge détenue par le provider |
      | 27 | `isCacheTtlEligible` | Portail de TTL du cache d'invite |
      | 28 | `buildMissingAuthMessage` | Indice d'authentification manquante personnalisé |
      | 29 | `augmentModelCatalog` | Lignes de compatibilité avant synthétique |
      | 30 | `resolveThinkingProfile` | Ensemble d'options `/think` spécifique au modèle |
      | 31 | `isBinaryThinking` | Compatibilité on/off de la pensée binaire |
      | 32 | `supportsXHighThinking` | Compatibilité du support de raisonnement `xhigh` |
      | 33 | `resolveDefaultThinkingLevel` | Compatibilité de la stratégie `/think` par défaut |
      | 34 | `isModernModelRef` | Correspondance de modèle en direct/smoke |
      | 35 | `prepareRuntimeAuth` | Échange de jetons avant l'inférence |
      | 36 | `resolveUsageAuth` | Analyse d'identifiant d'utilisation personnalisée |
      | 37 | `fetchUsageSnapshot` | Point de terminaison d'utilisation personnalisé |
      | 38 | `createEmbeddingProvider` | Adaptateur d'intégration détenu par le provider pour la mémoire/recherche |
      | 39 | `buildReplayPolicy` | Politique de relecture/compactage de transcription personnalisée |
      | 40 | `sanitizeReplayHistory` | Réécritures de relecture spécifiques au provider après le nettoyage générique |
      | 41 | `validateReplayTurns` | Validation stricte du tour de relecture avant le runner intégré |
      | 42 | `onModelSelected` | Rappel après sélection (ex. télémétrie) |

      Notes sur le repli d'exécution :

      - `normalizeConfig` vérifie d'abord le provider correspondant, puis d'autres plugins de provider capables de hooks jusqu'à ce que l'un change réellement la configuration. Si aucun hook de provider ne réécrit une entrée de configuration de famille Google prise en charge, le normaliseur de configuration Google groupé s'applique toujours.
      - `resolveConfigApiKey` utilise le hook de provider lorsqu'il est exposé. Amazon Bedrock conserve la résolution du marqueur d'environnement AWS dans son plugin de provider ; l'authentification d'exécution elle-même utilise toujours la chaîne par défaut du AWS SDK lorsqu'elle est configurée avec `auth: "aws-sdk"`.
      - `resolveThinkingProfile(ctx)` reçoit le `provider` sélectionné, le `modelId`, l'indice de catalogue `reasoning` fusionné facultatif, et les faits de modèle `compat` fusionnés facultatifs. Utilisez `compat` uniquement pour sélectionner l'interface/profil de pensée du provider.
      - `resolveSystemPromptContribution` permet à un provider d'injecter des directives d'invite système conscientes du cache pour une famille de modèles. Préférez-le à `before_prompt_build` lorsque le comportement appartient à une famille de provider/modèle et doit préserver la division de cache stable/dynamique.

      Pour des descriptions détaillées et des exemples concrets, voir [Internes : Hooks d'exécution du provider](/fr/plugins/architecture-internals#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Ajouter des capacités supplémentaires (facultatif)">
    ### Étape 5 : Ajouter des capacités supplémentaires

    Un plugin provider peut enregistrer des embeddings, de la synthèse vocale, de la transcription en temps réel, de la voix en temps réel, de la compréhension multimédia, de la génération d'images, de la génération vidéo, la récupération web et la recherche web en plus de l'inférence de texte. OpenClaw classe cela comme un plugin à **capacités hybrides** — le modèle recommandé pour les plugins d'entreprise (un plugin par fournisseur). Voir
    [Internes : Propriété des capacités](/fr/plugins/architecture#capability-ownership-model).

    Enregistrez chaque capacité dans `register(api)` à côté de votre appel `api.registerProvider(...)` existant. Ne choisissez que les onglets dont vous avez besoin :

    <Tabs>
      <Tab title="Synthèse vocale (TTS)">
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

        Utilisez `assertOkOrThrowProviderError(...)` pour les échecs HTTP du provider afin que les plugins partagent la lecture limitée du corps de l'erreur, l'analyse de l'erreur JSON et les suffixes d'ID de requête.
      </Tab>
      <Tab title="Transcription en temps réel">
        Privilégiez `createRealtimeTranscriptionWebSocketSession(...)` — l'assistant partagé gère la capture du proxy, la reconnexion avec temporisation, le vidage à la fermeture, les poignées de main de préparation, la mise en file d'attente audio et les diagnostics d'événement de fermeture. Votre plugin ne fait que mapper les événements en amont.

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

        Les providers STT par lot qui envoient de l'audio multipart doivent utiliser `buildAudioTranscriptionFormData(...)` depuis `openclaw/plugin-sdk/provider-http`. L'assistant normalise les noms de fichiers de téléchargement, y compris les téléchargements AAC qui nécessitent un nom de fichier style M4A pour les API de transcription compatibles.
      </Tab>
      <Tab title="Voix en temps réel">
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

        Déclarez `capabilities` afin que `talk.catalog` puisse exposer des modes valides, des transports, des formats audio et des indicateurs de fonctionnalité aux clients de discussion natifs et du navigateur. Implémentez `handleBargeIn` lorsqu'un transport peut détecter qu'un humain interrompt la lecture de l'assistant et que le provider prend en charge la troncation ou l'effacement de la réponse audio active.
      </Tab>
      <Tab title="Compréhension multimédia">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```

        Les providers multimédias locaux ou auto-hébergés qui ne nécessitent pas intentionnellement d'informations d'identification peuvent exposer `resolveAuth` et renvoyer `kind: "none"`.
        OpenClaw conserve toujours la porte d'authentification normale pour les providers qui n'optent pas explicitement. Les providers existants peuvent continuer à lire `req.apiKey` ; les nouveaux providers devraient privilégier `req.auth`.

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
      <Tab title="Embeddings">
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

        Déclarez le même identifiant dans `contracts.embeddingProviders`. Il s'agit du contrat d'embedding général pour la génération de vecteurs réutilisables, y compris la recherche mémoire. `registerMemoryEmbeddingProvider(...)` est une compatibilité dépréciée pour les adaptateurs spécifiques à la mémoire existants.
      </Tab>
      <Tab title="Génération d'images et de vidéos">
        Les capacités vidéo utilisent une forme **sensible au mode** : `generate`, `imageToVideo` et `videoToVideo`. Les champs agrégés plats comme `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` ne suffisent pas pour annoncer proprement la prise en charge du mode de transformation ou les modes désactivés. La génération musicale suit le même modèle avec des blocs `generate` / `edit` explicites.

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
      <Tab title="Récupération et recherche web">
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
    ### Étape 6 : Test

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

N'utilisez pas ici l'alias de publication legacy réservé aux compétences ; les packages de plugins doivent utiliser
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

| Ordre     | Quand          | Cas d'usage                                                   |
| --------- | -------------- | ------------------------------------------------------------- |
| `simple`  | Première passe | Providers avec clé API simple                                 |
| `profile` | Après simple   | Providers conditionnés par des profils d'authentification     |
| `paired`  | Après profil   | Synthétiser plusieurs entrées liées                           |
| `late`    | Dernière passe | Remplacer les providers existants (gagne en cas de collision) |

## Étapes suivantes

- [Plugins de channel](/fr/plugins/sdk-channel-plugins) - si votre plugin fournit également un channel
- [SDK Runtime](/fr/plugins/sdk-runtime) - helpers `api.runtime` (TTS, recherche, sous-agent)
- [Aperçu du SDK](/fr/plugins/sdk-overview) - référence complète des importations de sous-chemins
- [Fonctionnement interne des plugins](/fr/plugins/architecture-internals#provider-runtime-hooks) - détails des hooks et exemples inclus

## Connexes

- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Créer des plugins](/fr/plugins/building-plugins)
- [Créer des plugins de channel](/fr/plugins/sdk-channel-plugins)

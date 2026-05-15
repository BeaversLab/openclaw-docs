---
summary: "Guide étape par étape pour créer un plugin de fournisseur pour OpenClaw"
title: "Créer des plugins de fournisseur"
sidebarTitle: "Plugins de fournisseur"
read_when:
  - You are building a new model provider plugin
  - You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw
  - You need to understand provider auth, catalogs, and runtime hooks
---

Ce guide vous explique comment créer un plugin de fournisseur qui ajoute un fournisseur de modèle (LLM) à OpenClaw. À la fin, vous aurez un fournisseur avec un catalogue de modèles, une authentification par clé API et une résolution dynamique de modèles.

<Info>Si vous n'avez jamais créé de plugin OpenClaw auparavant, lisez d'abord la section [Getting Started](/fr/plugins/building-plugins) pour découvrir la structure de base du package et la configuration du manifeste.</Info>

<Tip>Les plugins de fournisseur ajoutent des modèles à la boucle d'inférence normale de OpenClaw. Si le modèle doit s'exécuter via un démon d'agent natif qui gère les threads, la compaction ou les événements d'outil, associez le fournisseur à un [agent harness](/fr/plugins/sdk-agent-harness) au lieu d'intégrer les détails du protocole du démon dans le cœur.</Tip>

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

    Le manifeste déclare `providerAuthEnvVars` afin que OpenClaw puisse détecter les identifiants sans charger votre runtime de plugin. Ajoutez `providerAuthAliases` lorsqu'une variante de fournisseur doit réutiliser l'authentification de l'ID d'un autre fournisseur. `modelSupport` est facultatif et permet à OpenClaw de charger automatiquement votre plugin de fournisseur à partir d'ID de modèle abrégés comme `acme-large` avant que les hooks d'exécution n'existent. Si vous publiez le fournisseur sur ClawHub, ces champs `openclaw.compat` et `openclaw.build` sont requis dans `package.json`.

  </Step>

  <Step title="Enregistrer le provider">
    Un provider de texte minimal nécessite un `id`, `label`, `auth` et `catalog`.
    `catalog` est le hook de runtime/configuration détenu par le provider ; il peut appeler des
    API fournisseur en direct et renvoie des entrées `models.providers`.

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

    `registerModelCatalogProvider` est la surface de catalogue du plan de contrôle plus récente
    pour l'interface utilisateur de liste/aide/sélecteur. Utilisez-la pour les lignes de texte, de génération d'images,
    de génération de vidéo et de génération de musique. Gardez les appels au point de terminaison du fournisseur et
    le mappage des réponses dans le plugin ; OpenClaw possède la forme de ligne partagée, les
    étiquettes de source et le rendu de l'aide.

    C'est un provider fonctionnel. Les utilisateurs peuvent maintenant
    `openclaw onboard --acme-ai-api-key <key>` et sélectionner
    `acme-ai/acme-large` comme leur modèle.

    Si le fournisseur en amont utilise des jetons de contrôle différents de ceux de OpenClaw, ajoutez une
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

    `input` réécrit le contenu final de l'invite système et du message texte avant
    le transport. `output` réécrit les deltas de texte de l'assistant et le texte final avant
    que OpenClaw ne analyse ses propres marqueurs de contrôle ou la livraison du canal.

    Pour les fournisseurs groupés qui n'enregistrent qu'un seul provider de texte avec une authentification par
    clé API plus un runtime soutenu par un catalogue, privilégiez l'assistant plus étroit
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
          buildStaticProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    `buildProvider` est le chemin de catalogue en direct utilisé lorsque OpenClaw peut résoudre une
    authentification de provider réelle. Il peut effectuer une découverte spécifique au fournisseur. Utilisez
    `buildStaticProvider` uniquement pour les lignes hors ligne qui sont sûres à afficher avant que
    l'authentification ne soit configurée ; elle ne doit pas nécessiter d'informations d'identification ni faire de requêtes réseau.
    L'affichage `models list --all` de OpenClaw exécute actuellement des catalogues statiques
    uniquement pour les plugins de provider groupés, avec une configuration vide, un environnement vide et aucun
    chemin d'agent/workspace.

    Si votre flux d'authentification doit également corriger `models.providers.*`, des alias et
    le modèle par défaut de l'agent lors de l'intégration, utilisez les assistants de préréglage de
    `openclaw/plugin-sdk/provider-onboard`. Les assistants les plus étroits sont
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` et
    `createModelCatalogPresetAppliers(...)`.

    Lorsque le point de terminaison natif d'un provider prend en charge les blocs d'utilisation en continu sur le
    transport `openai-completions` normal, privilégiez les assistants de catalogue partagés dans
    `openclaw/plugin-sdk/provider-catalog-shared` au lieu de coder en dur
    des vérifications d'identifiant de provider. `supportsNativeStreamingUsageCompat(...)` et
    `applyProviderNativeStreamingUsageCompat(...)` détectent la prise en charge à partir de
    la carte des capacités du point de terminaison, donc les points de terminaison de style natif Moonshot/DashScope
    s'optent toujours pour cela, même lorsqu'un plugin utilise un identifiant de provider personnalisé.

  </Step>

  <Step title="Ajouter une résolution dynamique de modèle">
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

    Si la résolution nécessite un appel réseau, utilisez `prepareDynamicModel` pour un préchauffage
    asynchrone - `resolveDynamicModel` s'exécute à nouveau après son achèvement.

  </Step>

  <Step title="Ajouter des hooks d'exécution (si nécessaire)">
    La plupart des providers n'ont besoin que de `catalog` + `resolveDynamicModel`. Ajoutez des hooks
    de manière incrémentielle au fur et à mesure que votre provider en a besoin.

    Les builders de helpers partagés couvrent désormais les familles de reprise/compatibilité d'outils (replay/tool-compat) les plus courantes, les plugins n'ont donc généralement pas besoin de câbler chaque hook manuellement un par un :

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

    Familles de reprise (replay) disponibles aujourd'hui :

    | Famille | Ce qu'elle câble | Exemples groupés |
    | --- | --- | --- |
    | `openai-compatible` | Politique de reprise partagée de style OpenAI pour les transports compatibles OpenAI, y compris le nettoyage des IDs d'appels d'outils, les corrections de l'ordre assistant en premier, et la validation générique des tours Gemini lorsque le transport en a besoin | `moonshot`, `ollama`, `xai`, `zai` |
    | `anthropic-by-model` | Politique de reprise consciente Claude choisie par `modelId`, les transports de messages Anthropic ne reçoivent donc le nettoyage des blocs de pensée spécifiques à Claude que si le modèle résolu est réellement un ID Claude | `amazon-bedrock`, `anthropic-vertex` |
    | `google-gemini` | Politique de reprise native Gemini plus nettoyage de la reprise de bootstrap et mode de sortie de raisonnement balisé | `google`, `google-gemini-cli` |
    | `passthrough-gemini` | Nettoyage des signatures de pensée Gemini pour les modèles Gemini exécutés via des transports proxy compatibles OpenAI ; n'active pas la validation native de reprise Gemini ni les réécritures de bootstrap | `openrouter`, `kilocode`, `opencode`, `opencode-go` |
    | `hybrid-anthropic-openai` | Politique hybride pour les providers qui mélangent des surfaces de modèle messages Anthropic et compatibles OpenAI dans un seul plugin ; la suppression facultative des blocs de pensée Claude-only reste limitée au côté Anthropic | `minimax` |

    Familles de flux (stream) disponibles aujourd'hui :

    | Famille | Ce qu'elle câble | Exemples groupés |
    | --- | --- | --- |
    | `google-thinking` | Normalisation de la charge utile de pensée Gemini sur le chemin de flux partagé | `google`, `google-gemini-cli` |
    | `kilocode-thinking` | Wrapper de raisonnement Kilo sur le chemin de flux de proxy partagé, avec `kilo/auto` et les IDs de raisonnement de proxy non pris en charge ignorant la pensée injectée | `kilocode` |
    | `moonshot-thinking` | Mappage de charge utile de pensée native binaire Moonshot depuis la config + niveau `/think` | `moonshot` |
    | `minimax-fast-mode` | Réécriture de modèle en mode rapide MiniMax sur le chemin de flux partagé | `minimax`, `minimax-portal` |
    | `openai-responses-defaults` | Wrappers de réponses natifs partagés OpenAI/Codex : en-têtes d'attribution, `/fast`/`serviceTier`, verbosité du texte, recherche web native Codex, façonnage de charge utile compatibilité raisonnement, et gestion du contexte des réponses | `openai`, `openai-codex` |
    | `openrouter-thinking` | Wrapper de raisonnement OpenRouter pour les routes de proxy, avec les sauts modèle-non-pris-en-charge/`auto` gérés centralement | `openrouter` |
    | `tool-stream-default-on` | Wrapper `tool_stream` activé par défaut pour les providers comme Z.AI qui souhaitent le streaming d'outils sauf s'il est explicitement désactivé | `zai` |

    <Accordion title="Interfaces du SDK alimentant les builders de familles">
      Chaque builder de famille est composé de helpers publics de niveau inférieur exportés depuis le même package, auxquels vous pouvez accéder lorsqu'un provider doit s'écarter du modèle commun :

      - `openclaw/plugin-sdk/provider-model-shared` - `ProviderReplayFamily`, `buildProviderReplayFamilyHooks(...)`, et les builders de reprise bruts (`buildOpenAICompatibleReplayPolicy`, `buildAnthropicReplayPolicyForModel`, `buildGoogleGeminiReplayPolicy`, `buildHybridAnthropicOrOpenAIReplayPolicy`). Exporte également les helpers de reprise Gemini (`sanitizeGoogleGeminiReplayHistory`, `resolveTaggedReasoningOutputMode`) et les helpers de point de terminaison/modèle (`resolveProviderEndpoint`, `normalizeProviderId`, `normalizeGooglePreviewModelId`, `normalizeNativeXaiModelId`).
      - `openclaw/plugin-sdk/provider-stream` - `ProviderStreamFamily`, `buildProviderStreamFamilyHooks(...)`, `composeProviderStreamWrappers(...)`, ainsi que les wrappers partagés OpenAI/Codex (`createOpenAIAttributionHeadersWrapper`, `createOpenAIFastModeWrapper`, `createOpenAIServiceTierWrapper`, `createOpenAIResponsesContextManagementWrapper`, `createCodexNativeWebSearchWrapper`), le wrapper compatible OpenAI DeepSeek V4 (`createDeepSeekV4OpenAICompatibleThinkingWrapper`), le nettoyage du préremplissage de pensée des messages Anthropic (`createAnthropicThinkingPrefillPayloadWrapper`), et les wrappers partagés proxy/provider (`createOpenRouterWrapper`, `createToolStreamWrapper`, `createMinimaxFastModeWrapper`).
      - `openclaw/plugin-sdk/provider-tools` - `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks("gemini")`, les helpers de schéma Gemini sous-jacents (`normalizeGeminiToolSchemas`, `inspectGeminiToolSchemas`), et les helpers de compatibilité xAI (`resolveXaiModelCompatPatch()`, `applyXaiModelCompat(model)`). Le plugin xAI groupé utilise `normalizeResolvedModel` + `contributeResolvedModelCompat` avec ceux-ci pour garder les règles xAI détenues par le provider.

      Certains helpers de flux restent volontairement locaux au provider. `@openclaw/anthropic-provider` conserve `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les builders de wrapper Anthropic de niveau inférieur dans sa propre interface publique `api.ts` / `contract-api.ts` car ils encodent la gestion bêta OAuth de Claude et la porte `context1m`. Le plugin xAI conserve de même le façonnage des réponses xAI natives dans son propre `wrapStreamFn` (alias `/fast``tool_stream`, `tool_stream` par défaut, nettoyage strict d'outil non pris en charge, suppression de charge utile de raisonnement spécifique à xAI).

      Le même modèle à la racine du package soutient également `@openclaw/openai-provider` (builders de providers, helpers de modèle par défaut, builders de providers en temps réel) et `@openclaw/openrouter-provider` (builder de provider plus helpers d'intégration/de configuration).
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
      OpenClaw appelle les hooks dans cet ordre. La plupart des providers n'en utilisent que 2 ou 3 :
      Les champs de provider de compatibilité uniquement que OpenClaw n'appelle plus, tels que
      `ProviderPlugin.capabilities` et `suppressBuiltInModel`, ne sont pas répertoriés
      ici.

      | # | Hook | Quand l'utiliser |
      | --- | --- | --- |
      | 1 | `catalog` | Catalogue de modèles ou URL de base par défaut |
      | 2 | `applyConfigDefaults` | Valeurs par défaut globales détenues par le provider lors de la matérialisation de la configuration |
      | 3 | `normalizeModelId` | Nettoyage des alias d'ID de modèle hérités/aperçus avant la recherche |
      | 4 | `normalizeTransport` | Nettoyage de la famille de provider `api` / `baseUrl` avant l'assemblage du modèle générique |
      | 5 | `normalizeConfig` | Normaliser la configuration `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Réécritures de compatibilité d'utilisation de streaming natif pour les providers de configuration |
      | 7 | `resolveConfigApiKey` | Résolution d'authentification par marqueur d'environnement détenue par le provider |
      | 8 | `resolveSyntheticAuth` | Authentification synthétique locale/auto-hébergée ou sauvegardée par la configuration |
      | 9 | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil stocké synthétiques derrière l'authentification par environnement/configuration |
      | 10 | `resolveDynamicModel` | Accepter les ID de modèle en amont arbitraires |
      | 11 | `prepareDynamicModel` | Récupération asynchrone de métadonnées avant la résolution |
      | 12 | `normalizeResolvedModel` | Réécritures de transport avant le lanceur |
      | 13 | `contributeResolvedModelCompat` | Indicateurs de compatibilité pour les modèles de fournisseurs derrière un autre transport compatible |
      | 14 | `normalizeToolSchemas` | Nettoyage du schéma d'outil détenue par le provider avant l'enregistrement |
      | 15 | `inspectToolSchemas` | Diagnostics du schéma d'outil détenue par le provider |
      | 16 | `resolveReasoningOutputMode` | Contrat de sortie de raisonnement balisé vs natif |
      | 17 | `prepareExtraParams` | Paramètres de requête par défaut |
      | 18 | `createStreamFn` | Transport StreamFn entièrement personnalisé |
      | 19 | `wrapStreamFn` | Wrappers d'en-têtes/corps personnalisés sur le chemin de flux normal |
      | 20 | `resolveTransportTurnState` | En-têtes/métadonnées natifs par tour |
      | 21 | `resolveWebSocketSessionPolicy` | En-têtes de session WS natifs/refroidissement |
      | 22 | `formatApiKey` | Forme de jeton d'exécution personnalisée |
      | 23 | `refreshOAuth` | Actualisation OAuth personnalisée |
      | 24 | `buildAuthDoctorHint` | Conseils de réparation d'authentification |
      | 25 | `matchesContextOverflowError` | Détection de dépassement détenue par le provider |
      | 26 | `classifyFailoverReason` | Classification de limite de taux/surcharge détenue par le provider |
      | 27 | `isCacheTtlEligible` | Gating TTL du cache de prompt |
      | 28 | `buildMissingAuthMessage` | Indicateur d'authentification manquante personnalisée |
      | 29 | `augmentModelCatalog` | Lignes de compatibilité avant synthétique |
      | 30 | `resolveThinkingProfile` | Ensemble d'options `/think` spécifique au modèle |
      | 31 | `isBinaryThinking` | Compatibilité binaire de la pensée on/off |
      | 32 | `supportsXHighThinking` | Compatibilité du support de raisonnement `xhigh` |
      | 33 | `resolveDefaultThinkingLevel` | Compatibilité de la stratégie `/think` par défaut |
      | 34 | `isModernModelRef` | Correspondance de modèle en direct/fumigée |
      | 35 | `prepareRuntimeAuth` | Échange de jetons avant l'inférence |
      | 36 | `resolveUsageAuth` | Analyse des informations d'identification d'utilisation personnalisée |
      | 37 | `fetchUsageSnapshot` | Point de terminaison d'utilisation personnalisé |
      | 38 | `createEmbeddingProvider` | Adaptateur d'intégration détenue par le provider pour la mémoire/recherche |
      | 39 | `buildReplayPolicy` | Politique de reprise/compactage de transcription personnalisée |
      | 40 | `sanitizeReplayHistory` | Réécritures de reprise spécifiques au provider après le nettoyage générique |
      | 41 | `validateReplayTurns` | Validation stricte du tour de reprise avant le lanceur intégré |
      | 42 | `onModelSelected` | Rappel après sélection (ex: télémétrie) |

      Notes sur le repli d'exécution :

      - `normalizeConfig` vérifie d'abord le provider correspondant, puis d'autres plugins de provider capables de hooks jusqu'à ce que l'un change réellement la configuration. Si aucun hook de provider ne réécrit une entrée de configuration de famille Google prise en charge, le normaliseur de configuration Google groupé s'applique toujours.
      - `resolveConfigApiKey` utilise le hook de provider lorsqu'il est exposé. Le chemin groupé `amazon-bedrock` dispose également ici d'un résolveur de marqueur d'environnement AWS intégré, bien que l'authentification d'exécution Bedrock utilise toujours la chaîne par défaut du AWS SDK.
      - `resolveSystemPromptContribution` permet à un provider d'injecter des conseils de prompt système conscients du cache pour une famille de modèles. Privilégiez-le par rapport à `before_prompt_build` lorsque le comportement appartient à une famille de provider/modèle et doit préserver la division de cache stable/dynamique.

      Pour des descriptions détaillées et des exemples réels, consultez [Internals: Provider Runtime Hooks](/fr/plugins/architecture-internals#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Ajouter des capacités supplémentaires (facultatif)">
    ### Étape 5 : Ajouter des capacités supplémentaires

    Un plugin de fournisseur peut enregistrer la synthèse vocale, la transcription en temps réel, la voix en temps réel, la compréhension des médias, la génération d'images, la génération de vidéos, la récupération web et la recherche web en plus de l'inférence de texte. OpenClaw classe cela comme un plugin à **capacités hybrides** — le modèle recommandé pour les plugins d'entreprise (un plugin par fournisseur). Consultez [Internes : Propriété des capacités](/fr/plugins/architecture#capability-ownership-model).

    Enregistrez chaque capacité dans `register(api)` aux côtés de votre appel `api.registerProvider(...)` existant. Ne choisissez que les onglets dont vous avez besoin :

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

        Utilisez `assertOkOrThrowProviderError(...)` pour les échecs HTTP du fournisseur afin que les plugins partagent les lectures de corps d'erreur limitées, l'analyse d'erreur JSON et les suffixes d'ID de demande.
      </Tab>
      <Tab title="Transcription en temps réel">
        Préférez `createRealtimeTranscriptionWebSocketSession(...)` — l'assistant partagé gère la capture du proxy, la temporisation de reconnexion, le vidage à la fermeture, les poignées de main de disponibilité, la mise en file d'attente audio et les diagnostics d'événements de fermeture. Votre plugin se contente de mapper les événements en amont.

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

        Les fournisseurs STT par lots qui publient de l'audio multipart doivent utiliser `buildAudioTranscriptionFormData(...)` depuis `openclaw/plugin-sdk/provider-http`. L'assistant normalise les noms de fichiers de téléchargement, y compris les téléchargements AAC qui nécessitent un nom de fichier de style M4A pour les API de transcription compatibles.
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

        Déclarez `capabilities` pour que `talk.catalog` puisse exposer des modes, des transports, des formats audio et des indicateurs de fonctionnalités valides aux clients Talk natifs et du navigateur. Implémentez `handleBargeIn` lorsqu'un transport peut détecter qu'un humain interrompt la lecture de l'assistant et que le fournisseur prend en charge la troncature ou le effacement de la réponse audio active.
      </Tab>
      <Tab title="Compréhension des médias">
        ```typescript
        api.registerMediaUnderstandingProvider({
          id: "acme-ai",
          capabilities: ["image", "audio"],
          describeImage: async (req) => ({ text: "A photo of..." }),
          transcribeAudio: async (req) => ({ text: "Transcript..." }),
        });
        ```
      </Tab>
      <Tab title="Génération d'images et de vidéos">
        Les capacités vidéo utilisent une forme **sensible au mode** : `generate`, `imageToVideo` et `videoToVideo`. Les champs agrégés plats comme `maxInputImages` / `maxInputVideos` / `maxDurationSeconds` ne suffisent pas à annoncer proprement la prise en charge du mode de transformation ou les modes désactivés.
        La génération musicale suit le même modèle avec des blocs explicites `generate` / `edit`.

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

N'utilisez pas ici l'alias de publication obsolète réservé aux compétences ; les packages de plugins doivent utiliser
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
- [Runtime du SDK](/fr/plugins/sdk-runtime) - assistants `api.runtime` (TTS, recherche, sous-agent)
- [Présentation du SDK](/fr/plugins/sdk-overview) - référence complète des importations de sous-chemins
- [Fonctionnement interne des plugins](/fr/plugins/architecture-internals#provider-runtime-hooks) - détails des hooks et exemples inclus

## Connexes

- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
- [Création de plugins de channel](/fr/plugins/sdk-channel-plugins)

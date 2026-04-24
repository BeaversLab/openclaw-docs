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

<Info>Si vous n'avez jamais construit de plugin OpenClaw auparavant, lisez d'abord [Getting Started](/fr/plugins/building-plugins) pour connaître la structure de package de base et la configuration du manifeste.</Info>

<Tip>Les plugins de provider ajoutent des modèles à la boucle d'inférence normale de OpenClaw. Si le modèle doit passer par un démon d'agent natif qui possède des threads, une compactage ou des événements d'outil, associez le provider à un [agent harness](/fr/plugins/sdk-agent-harness) au lieu de mettre les détails du protocole du démon dans le cœur.</Tip>

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

    Le manifeste déclare `providerAuthEnvVars` afin qu'OpenClaw puisse détecter
    les informations d'identification sans charger votre runtime de plugin. Ajoutez `providerAuthAliases`
    lorsqu'une variante de fournisseur doit réutiliser l'authentification de l'ID d'un autre fournisseur. `modelSupport`
    est facultatif et permet à OpenClaw de charger automatiquement votre plugin de fournisseur à partir d'ID de modèle abrégés
    comme `acme-large` avant l'existence des hooks d'exécution. Si vous publiez le
    fournisseur sur ClawHub, ces champs `openclaw.compat` et `openclaw.build`
    sont requis dans `package.json`.

  </Step>

  <Step title="Register the provider">
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

    Si le provider amont utilise des jetons de contrôle différents de ceux d'OpenClaw, ajoutez une
    petite transformation de texte bidirectionnelle au lieu de remplacer le chemin du flux (stream) :

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

    `input` réécrit le prompt système final et le contenu du message texte avant
    le transport. `output` réécrit les deltas de texte de l'assistant et le texte final avant
    qu'OpenClaw n'analyse ses propres marqueurs de contrôle ou la diffusion par canal.

    Pour les providers groupés (bundled) qui n'enregistrent qu'un seul provider texte avec une authentification
    par clé API plus un runtime basé sur un catalogue unique, préférez l'assistant plus
    étroit `defineSingleProviderPluginEntry(...)` :

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

    `buildProvider` est le chemin de catalogue en direct utilisé lorsqu'OpenClaw peut résoudre
    une authentification provider réelle. Il peut effectuer une découverte spécifique au provider.
    Utilisez `buildStaticProvider` uniquement pour les lignes hors ligne qui sont sûres à afficher avant
    que l'authentification ne soit configurée ; il ne doit pas nécessiter d'identifiants ou faire de
    requêtes réseau. L'affichage `models list --all` d'OpenClaw exécute actuellement des catalogues
    statiques uniquement pour les plugins de provider groupés, avec une configuration vide, un environnement vide
    et aucun chemin d'agent/espace de travail.

    Si votre flux d'authentification doit également modifier `models.providers.*`, des alias et
    le modèle par défaut de l'agent lors de l'intégration (onboarding), utilisez les assistants de préréglage
    depuis `openclaw/plugin-sdk/provider-onboard`. Les assistants les plus étroits sont
    `createDefaultModelPresetAppliers(...)`,
    `createDefaultModelsPresetAppliers(...)` et
    `createModelCatalogPresetAppliers(...)`.

    Lorsque le point de terminaison natif d'un provider prend en charge les blocs d'utilisation diffusés
    (streamed) sur le transport normal `openai-completions`, préférez les assistants de catalogue partagés
    dans `openclaw/plugin-sdk/provider-catalog-shared` au lieu de coder en dur les vérifications d'identifiant de provider.
    `supportsNativeStreamingUsageCompat(...)` et
    `applyProviderNativeStreamingUsageCompat(...)` détectent la prise en charge à partir
    de la carte des capacités du point de terminaison, de sorte que les points de terminaison de style natif
    Moonshot/DashScope optent toujours pour l'option, même lorsqu'un plugin utilise
    un identifiant de provider personnalisé.

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

    Si la résolution nécessite un appel réseau, utilisez `prepareDynamicModel` pour un préchauffage
    asynchrone — `resolveDynamicModel` s'exécute à nouveau après son achèvement.

  </Step>

  <Step title="Ajouter des hooks d'exécution (si nécessaire)">
    La plupart des providers n'ont besoin que de `catalog` + `resolveDynamicModel`. Ajoutez les hooks
    de manière incrémentale au fur et à mesure que votre provider en a besoin.

    Les builders de helpers partagés couvrent désormais les familles de relecture/compatibilité d'outils (replay/tool-compat) les plus courantes,
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

    | Famille | Ce qu'elle câble |
    | --- | --- |
    | `openai-compatible` | Stratégie de relecture de style OpenAI partagée pour les transports compatibles OpenAI, incluant la sanitation des ID d'appels d'outils, les corrections de l'ordre assistant en premier, et la validation générique des tours Gemini lorsque le transport en a besoin |
    | `anthropic-by-model` | Stratégie de relecture consciente Claude choisie par `modelId`, donc les transports à messages Anthropic ne reçoivent le nettoyage des blocs de pensée spécifiques à Claude que si le modèle résolu est réellement un ID Claude |
    | `google-gemini` | Stratégie de relecture native Gemini plus la sanitation de la relecture bootstrap et le mode de sortie de raisonnement balisé |
    | `passthrough-gemini` | Sanitation de la signature de pensée Gemini pour les modèles Gemini fonctionnant via des transports proxy compatibles OpenAI ; n'active pas la validation native de la relecture Gemini ni les réécritures bootstrap |
    | `hybrid-anthropic-openai` | Stratégie hybride pour les providers qui mélangent les surfaces de modèle à messages Anthropic et compatibles OpenAI dans un seul plugin ; la suppression optionnelle des blocs de pensée Claude-only reste limitée au côté Anthropic |

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
    | `kilocode-thinking` | Wrapper de raisonnement Kilo sur le chemin de flux de proxy partagé, avec `kilo/auto` et les ID de raisonnement de proxy non pris en charge ignorant la pensée injectée |
    | `moonshot-thinking` | Mappage de charge utile de pensée native binaire Moonshot depuis la config + le niveau `/think` |
    | `minimax-fast-mode` | Réécriture de modèle en mode rapide MiniMax sur le chemin de flux partagé |
    | `openai-responses-defaults` | Wrappers de réponses natifs OpenAI/Codex partagés : en-têtes d'attribution, `/fast`/`serviceTier`, verbosité du texte, recherche web native Codex, façonnage de charge utile compat-raisonnement, et gestion du contexte Responses |
    | `openrouter-thinking` | Wrapper de raisonnement OpenRouter pour les routes proxy, avec les sauts modèle-non-supporté/`auto` gérés centralement |
    | `tool-stream-default-on` | Wrapper activé par défaut `tool_stream` pour les providers comme Z.AI qui veulent le flux d'outils sauf désactivation explicite |

    Exemples réels regroupés :

    - `google` et `google-gemini-cli` : `google-thinking`
    - `kilocode` : `kilocode-thinking`
    - `moonshot` : `moonshot-thinking`
    - `minimax` et `minimax-portal` : `minimax-fast-mode`
    - `openai` et `openai-codex` : `openai-responses-defaults`
    - `openrouter` : `openrouter-thinking`
    - `zai` : `tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` exporte également l'énumération de
    famille de relecture ainsi que les helpers partagés à partir desquels ces familles sont construites. Les exports publics courants incluent :

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - builders de relecture partagés tels que `buildOpenAICompatibleReplayPolicy(...)`,
      `buildAnthropicReplayPolicyForModel(...)`,
      `buildGoogleGeminiReplayPolicy(...)`, et
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - helpers de relecture Gemini tels que `sanitizeGoogleGeminiReplayHistory(...)`
      et `resolveTaggedReasoningOutputMode()`
    - helpers de point de terminaison/modèle tels que `resolveProviderEndpoint(...)`,
      `normalizeProviderId(...)`, `normalizeGooglePreviewModelId(...)`, et
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` expose à la fois le builder de famille
    et les helpers de wrapper publics que ces familles réutilisent. Les exports publics courants incluent :

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - wrappers partagés OpenAI/Codex tels que
      `createOpenAIAttributionHeadersWrapper(...)`,
      `createOpenAIFastModeWrapper(...)`,
      `createOpenAIServiceTierWrapper(...)`,
      `createOpenAIResponsesContextManagementWrapper(...)`, et
      `createCodexNativeWebSearchWrapper(...)`
    - wrappers partagés proxy/provider tels que `createOpenRouterWrapper(...)`,
      `createToolStreamWrapper(...)`, et `createMinimaxFastModeWrapper(...)`

    Certains helpers de flux restent locaux au provider volontairement. Exemple groupé actuel : `@openclaw/anthropic-provider` exporte
    `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
    `resolveAnthropicFastMode`, `resolveAnthropicServiceTier`, et les
    builders de wrapper Anthropic de niveau inférieur à partir de sa jonction publique `api.ts` /
    `contract-api.ts`. Ces helpers restent spécifiques à Anthropic car
    ils encodent également la gestion bêta OAuth de Claude et le verrouillage `context1m`.

    D'autres providers regroupés conservent également des wrappers spécifiques au transport localement lorsque
    le comportement n'est pas partagé proprement entre les familles. Exemple actuel : le plugin
    xAI groupé conserve la mise en forme native des réponses xAI dans son propre
    `wrapStreamFn`, incluant les réécritures d'alias `/fast`, le `tool_stream` par défaut,
    le nettoyage strict d'outils non pris en charge, et la suppression de la charge utile de raisonnement spécifique à xAI.

    `openclaw/plugin-sdk/provider-tools` expose actuellement une famille de schémas d'outils partagée
    plus des helpers de schéma/compat partagés :

    - `ProviderToolCompatFamily` documente l'inventaire des familles partagées aujourd'hui.
    - `buildProviderToolCompatFamilyHooks("gemini")` câble le nettoyage du schéma
      Gemini + diagnostics pour les providers qui ont besoin de schémas d'outils sûrs pour Gemini.
    - `normalizeGeminiToolSchemas(...)` et `inspectGeminiToolSchemas(...)`
      sont les helpers publics de schéma Gemini sous-jacents.
    - `resolveXaiModelCompatPatch()` retourne le correctif de compatibilité xAI groupé :
      `toolSchemaProfile: "xai"`, mots-clés de schéma non pris en charge, support
      `web_search` natif, et décodage des arguments d'appel d'outil d'entités HTML.
    - `applyXaiModelCompat(model)` applique ce même correctif de compatibilité xAI à un
      modèle résolu avant qu'il n'atteigne le lanceur (runner).

    Exemple réel groupé : le plugin xAI utilise `normalizeResolvedModel` plus
    `contributeResolvedModelCompat` pour garder ces métadonnées de compatibilité détenues par le
    provider au lieu de coder en dur les règles xAI dans le cœur (core).

    Le même modèle de racine de package soutient également d'autres providers groupés :

    - `@openclaw/openai-provider` : `api.ts` exporte les builders de provider,
      les helpers de modèle par défaut, et les builders de provider en temps réel
    - `@openclaw/openrouter-provider` : `api.ts` exporte le builder de provider
      plus les helpers d'intégration (onboarding)/de configuration

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
      OpenClaw appelle les hooks dans cet ordre. La plupart des providers n'en utilisent que 2-3 :

      | # | Hook | Quand l'utiliser |
      | --- | --- | --- |
      | 1 | `catalog` | Catalogue de modèles ou URL de base par défaut |
      | 2 | `applyConfigDefaults` | Valeurs globales détenues par le provider lors de la matérialisation de la configuration |
      | 3 | `normalizeModelId` | Nettoyage des alias d'ID de modèle hérités/prévisualisation avant la recherche |
      | 4 | `normalizeTransport` | Nettoyage de la famille de provider `api` / `baseUrl` avant l'assemblage générique du modèle |
      | 5 | `normalizeConfig` | Normaliser la config `models.providers.<id>` |
      | 6 | `applyNativeStreamingUsageCompat` | Réécritures de compat d'utilisation de flux native pour les providers de config |
      | 7 | `resolveConfigApiKey` | Résolution d'auth par marqueur d'environnement détenue par le provider |
      | 8 | `resolveSyntheticAuth` | Auth synthétique local/auto-hébergé ou basée sur la configuration |
      | 9 | `shouldDeferSyntheticProfileAuth` | Abaisser les espaces réservés de profil stocké synthétiques derrière l'auth env/config |
      | 10 | `resolveDynamicModel` | Accepter les ID de modèle en amont arbitraires |
      | 11 | `prepareDynamicModel` | Récupération asynchrone de métadonnées avant la résolution |
      | 12 | `normalizeResolvedModel` | Réécritures de transport avant le lanceur (runner) |

    Notes de repli d'exécution :

    - `normalizeConfig` vérifie d'abord le provider correspondant, puis les autres
      plugins de provider capables de hooks jusqu'à ce que l'un change réellement la configuration.
      Si aucun hook de provider ne réécrit une entrée de configuration de famille Google prise en charge, le
      normaliseur de configuration Google groupé s'applique toujours.
    - `resolveConfigApiKey` utilise le hook de provider lorsqu'il est exposé. Le chemin
      `amazon-bedrock` groupé possède également ici un résolveur de marqueur d'environnement AWS intégré,
      même si l'auth d'exécution Bedrock utilise toujours la chaîne par défaut
      du AWS SDK.
      | 13 | `contributeResolvedModelCompat` | Indicateurs de compat pour les modèles de fournisseurs derrière un autre transport compatible |
      | 14 | `capabilities` | Sac de capacités statiques hérité ; compatibilité uniquement |
      | 15 | `normalizeToolSchemas` | Nettoyage du schéma d'outils détenu par le provider avant l'enregistrement |
      | 16 | `inspectToolSchemas` | Diagnostics du schéma d'outils détenus par le provider |
      | 17 | `resolveReasoningOutputMode` | Contrat de sortie de raisonnement balisé vs natif |
      | 18 | `prepareExtraParams` | Paramètres de requête par défaut |
      | 19 | `createStreamFn` | Transport StreamFn entièrement personnalisé |
      | 20 | `wrapStreamFn` | Wrappers d'en-têtes/corps personnalisés sur le chemin de flux normal |
      | 21 | `resolveTransportTurnState` | En-têtes/métadonnées natifs par tour |
      | 22 | `resolveWebSocketSessionPolicy` | En-têtes/refroidissement de session WS natifs |
      | 23 | `formatApiKey` | Forme de jeton d'exécution personnalisée |
      | 24 | `refreshOAuth` | Actualisation OAuth personnalisée |
      | 25 | `buildAuthDoctorHint` | Conseils de réparation d'auth |
      | 26 | `matchesContextOverflowError` | Détection de débordement détenue par le provider |
      | 27 | `classifyFailoverReason` | Classification de limite de taux/surcharge détenue par le provider |
      | 28 | `isCacheTtlEligible` | Verrouillage du TTL du cache de prompt |
      | 29 | `buildMissingAuthMessage` | Indicateur personnalisé d'auth manquante |
      | 30 | `suppressBuiltInModel` | Masquer les lignes en amont obsolètes |
      | 31 | `augmentModelCatalog` | Lignes synthétiques de compatibilité future |
      | 32 | `resolveThinkingProfile` | Ensemble d'options `/think` spécifiques au modèle |
      | 33 | `isBinaryThinking` | Compatibilité activation/désactivation de la pensée binaire |
      | 34 | `supportsXHighThinking` | Compatibilité du support de raisonnement `xhigh` |
      | 35 | `resolveDefaultThinkingLevel` | Compatibilité de la stratégie `/think` par défaut |
      | 36 | `isModernModelRef` | Correspondance de modèle en direct/somke |
      | 37 | `prepareRuntimeAuth` | Échange de jetons avant l'inférence |
      | 38 | `resolveUsageAuth` | Analyse personnalisée des informations d'identification d'utilisation |
      | 39 | `fetchUsageSnapshot` | Point de terminaison d'utilisation personnalisé |
      | 40 | `createEmbeddingProvider` | Adaptateur d'incorporation (embedding) détenu par le provider pour la mémoire/recherche |
      | 41 | `buildReplayPolicy` | Stratégie personnalisée de relecture/compactage de transcription |
    - `sanitizeReplayHistory` | Réécritures de relecture spécifiques au provider après le nettoyage générique |
    - `validateReplayTurns` | Validation stricte du tour de relecture avant le lanceur intégré |
    - `onModelSelected` | Rappel post-sélection (ex: télémétrie) |

      Note de réglage de prompt :

      - `resolveSystemPromptContribution` permet à un provider d'injecter des directives de
        système de prompt conscientes du cache pour une famille de modèles. Préférez-le à
        `before_prompt_build` lorsque le comportement appartient à une famille de provider/modèle
        et doit préserver la division de cache stable/dynamique.

      Pour des descriptions détaillées et des exemples réels, voir
      [Internes: Hooks d'exécution de provider](/fr/plugins/architecture#provider-runtime-hooks).
    </Accordion>

  </Step>

  <Step title="Ajouter des capacités supplémentaires (facultatif)">
    <a id="step-5-add-extra-capabilities"></a>
    Un plugin provider peut enregistrer la parole, la transcription en temps réel, la voix en temps réel,
    la compréhension des médias, la génération d'images, la génération de vidéos, la récupération web
    et la recherche web ainsi que l'inférence de texte :

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

    OpenClaw classe cela comme un plugin à **capacités hybrides**. C'est le
    modèle recommandé pour les plugins d'entreprise (un plugin par fournisseur). Voir
    [Internes : Propriété des capacités](/fr/plugins/architecture#capability-ownership-model).

    Pour la génération de vidéos, préférez la forme de capacité consciente du mode montrée ci-dessus :
    `generate`, `imageToVideo` et `videoToVideo`. Les champs agrégés plats tels
    que `maxInputImages`, `maxInputVideos` et `maxDurationSeconds` ne sont pas
    suffisants pour annoncer proprement le support du mode de transformation ou les modes désactivés.

    Préférez le helper WebSocket partagé pour les providers STT en streaming. Il maintient la capture de proxy,
    l'attente de reconnexion, le vidage à la fermeture, les poignées de main de prêt, la mise en file d'attente audio
    et les diagnostics de événement de fermeture cohérents entre les providers tout en laissant le code provider
    responsable uniquement du mappage des événements en amont.

    Les providers STT par lots qui POSTent de l'audio multipart devraient utiliser
    `buildAudioTranscriptionFormData(...)` de
    `openclaw/plugin-sdk/provider-http` ainsi que les helpers de requête HTTP du provider.
    Le helper de formulaire normalise les noms de fichiers de téléchargement, y compris les téléchargements AAC
    qui ont besoin d'un nom de fichier style M4A pour les API de transcription compatibles.

    Les providers de génération de musique devraient suivre le même modèle :
    `generate` pour la génération par invite uniquement et `edit` pour la
    génération basée sur une image de référence. Les champs agrégés plats tels que `maxInputImages`,
    `supportsLyrics` et `supportsFormat` ne suffisent pas à annoncer le support d'édition ;
    les blocs explicites `generate` / `edit` constituent le contrat attendu.

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

Les plugins de fournisseur sont publiés de la même manière que tout autre plugin de code externe :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

N'utilisez pas ici l'alias de publication hérité uniquement pour les compétences ; les packages de plugins devraient utiliser
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

| Ordre     | Quand             | Cas d'usage                                                    |
| --------- | ----------------- | -------------------------------------------------------------- |
| `simple`  | Première passe    | Fournisseurs avec clé d'API simple                             |
| `profile` | Après les simples | Fournisseurs restreints par des profils d'authentification     |
| `paired`  | Après le profil   | Synthétiser plusieurs entrées connexes                         |
| `late`    | Dernière passe    | Remplacer les fournisseurs existants (gagne en cas de conflit) |

## Étapes suivantes

- [Plugins de channel](/fr/plugins/sdk-channel-plugins) — si votre plugin fournit également un channel
- [SDK Runtime](/fr/plugins/sdk-runtime) — aides `api.runtime` (TTS, recherche, sous-agent)
- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Fonctionnement interne des plugins](/fr/plugins/architecture#provider-runtime-hooks) — détails des hooks et exemples fournis

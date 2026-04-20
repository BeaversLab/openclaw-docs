---
summary: "Aperçu des fournisseurs de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Fournisseurs de modèles"
---

# Fournisseurs de modèles

Cette page couvre les **fournisseurs de LLM/modèles** (et non les canaux de chat comme WhatsApp/Telegram).
Pour les règles de sélection de modèle, voir [/concepts/models](/fr/concepts/models).

## Règles rapides

- Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Les règles d'exécution de repli, les sondages de refroidissement et la persistance de la priorité de session sont
  documentés dans [/concepts/model-failover](/fr/concepts/model-failover).
- `models.providers.*.models[].contextWindow` sont les métadonnées natives du modèle ;
  `models.providers.*.models[].contextTokens` est la limite effective d'exécution.
- Les plugins de fournisseur peuvent injecter des catalogues de modèles via `registerProvider({ catalog })` ;
  OpenClaw fusionne cette sortie dans `models.providers` avant d'écrire
  `models.json`.
- Les manifestes de fournisseur peuvent déclarer `providerAuthEnvVars` et
  `providerAuthAliases` afin que les sondages d'authentification génériques basés sur l'environnement et les variantes de fournisseur
  n'aient pas besoin de charger le runtime du plugin. La carte restante des variables d'environnement principales est désormais
  réservée aux fournisseurs non-plugins/principaux et à quelques cas de précédence générique tels
  que l'onboarding avec priorité à la clé API Anthropic.
- Les plugins de fournisseur peuvent également posséder le comportement d'exécution du fournisseur via
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
  `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot` et
  `onModelSelected`.
- Remarque : le `capabilities` du fournisseur à l'exécution est des métadonnées partagées du lanceur (famille
  de fournisseurs, particularités de transcription/outillage, indices de transport/cache). Ce n'est pas
  la même chose que le [modèle de capacité publique](/fr/plugins/architecture#public-capability-model)
  qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).
- Le fournisseur `codex` fourni est associé au harnais d'agent Codex fourni.
  Utilisez `codex/gpt-*` lorsque vous souhaitez une connexion, une découverte de modèle, une reprise
  de fil native et une exécution app-server propriétaires de Codex. Les références `openai/gpt-*` simples continuent
  d'utiliser le fournisseur OpenAI et le transport de fournisseur normal OpenClaw.
  Les déploiements Codex uniquement peuvent désactiver le repli automatique PI avec
  `agents.defaults.embeddedHarness.fallback: "none"` ; voir
  [Codex Harness](/fr/plugins/codex-harness).

## Comportement du fournisseur détenu par le plugin

Les plugins de fournisseur (provider plugins) peuvent maintenant posséder la majeure partie de la logique spécifique au fournisseur tandis que OpenClaw conserve la boucle d'inférence générique.

Répartition typique :

- `auth[].run` / `auth[].runNonInteractive` : le provider possède les flux d'onboarding/de connexion pour `openclaw onboard` , `openclaw models auth` et la configuration sans interface (headless)
- `wizard.setup` / `wizard.modelPicker` : le provider possède les étiquettes de choix d'authentification, les alias de compatibilité (legacy), les indicateurs de liste d'autorisation d'onboarding et les entrées de configuration dans les sélecteurs d'onboarding/de modèles
- `catalog` : le provider apparaît dans `models.providers`
- `normalizeModelId` : le provider normalise les identifiants de modèles de compatibilité/preview avant la recherche ou la canonisation
- `normalizeTransport` : le provider normalise la famille de transport `api` / `baseUrl` avant l'assemblage générique du modèle ; OpenClaw vérifie d'abord le provider correspondant, puis les autres plugins de providers capables d'accroches (hooks) jusqu'à ce que l'un modifie réellement le transport
- `normalizeConfig` : le provider normalise la configuration `models.providers.<id>` avant que l'exécution ne l'utilise ; OpenClaw vérifie d'abord le provider correspondant, puis les autres plugins de providers capables d'accroches jusqu'à ce que l'un modifie réellement la configuration. Si aucune accroche de provider ne réécrit la configuration, les assistants de la famille Google intégrés normalisent toujours les entrées de providers Google prises en charge.
- `applyNativeStreamingUsageCompat` : le provider applique des réécritures de compatibilité d'utilisation du streaming natif basées sur le point de terminaison pour les providers de configuration
- `resolveConfigApiKey` : le provider résout l'authentification par marqueur d'environnement pour les providers de configuration sans forcer le chargement complet de l'authentification à l'exécution. `amazon-bedrock` dispose également ici d'un résolveur de marqueur d'environnement AWS intégré, bien que l'authentification à l'exécution Bedrock utilise la chaîne par défaut du AWS SDK.
- `resolveSyntheticAuth` : le provider peut exposer une disponibilité d'authentification locale/auto-hébergée ou autre basée sur la configuration sans persister de secrets en texte clair
- `shouldDeferSyntheticProfileAuth` : le provider peut marquer les espaces réservés de profil synthétique stockés comme ayant une priorité inférieure à l'authentification basée sur l'environnement/la configuration
- `resolveDynamicModel` : le provider accepte les identifiants de modèle non encore présents dans le catalogue statique local
- `prepareDynamicModel` : le provider a besoin d'une actualisation des métadonnées avant de réessayer la résolution dynamique
- `normalizeResolvedModel` : le provider a besoin de réécritures de transport ou d'URL de base
- `contributeResolvedModelCompat` : le provider fournit des indicateurs de compatibilité pour ses modèles de fournisseur, même lorsqu'ils arrivent via un autre transport compatible
- `capabilities` : le provider publie les particularités de la transcription/outillage/famille de providers
- `normalizeToolSchemas` : le nettoie les schémas d'outils avant que le runner intégré ne les voie
- `inspectToolSchemas` : le provider expose des avertissements de schéma spécifiques au transport après normalisation
- `resolveReasoningOutputMode` : le provider choisit les contrats de sortie de raisonnement natifs ou balisés
- `prepareExtraParams` : le provider définit par défaut ou normalise les paramètres de requête par modèle
- `createStreamFn` : le provider remplace le chemin de flux normal par un transport entièrement personnalisé
- `wrapStreamFn` : le provider applique les en-têtes/corps de requête/wrappers de compatibilité de modèle
- `resolveTransportTurnState` : le provider fournit des en-têtes ou métadonnées de transport natifs par tour
- `resolveWebSocketSessionPolicy` : le provider fournit des en-têtes de session WebSocket natifs ou une politique de refroidissement de session
- `createEmbeddingProvider` : le provider gère le comportement d'intégration mémoire lorsqu'il appartient au plugin du provider plutôt qu'au standard d'intégration central
- `formatApiKey` : le provider formate les profils d'authentification stockés dans la chaîne `apiKey` attendue par le transport
- `refreshOAuth` : le provider gère le rafraîchissement OAuth lorsque les rafraîchisseurs partagés `pi-ai` ne suffisent pas
- `buildAuthDoctorHint` : le provider ajoute des conseils de réparation lorsque le rafraîchissement OAuth échoue
- `matchesContextOverflowError` : le provider reconnaît les erreurs de dépassement de fenêtre de contexte spécifiques au provider que les heuristiques génériques manqueraient
- `classifyFailoverReason` : le provider mappe les erreurs brutes de transport/API spécifiques au provider vers des raisons de basculement telles que la limitation de débit ou la surcharge
- `isCacheTtlEligible` : le provider décide quels identifiants de modèles en amont prennent en charge le TTL du cache de prompt
- `buildMissingAuthMessage` : le provider remplace l'erreur générique du magasin d'authentification par un indicateur de récupération spécifique au provider
- `suppressBuiltInModel` : le fournisseur masque les lignes en amont obsolètes et peut renvoyer une erreur propriétaire au fournisseur pour les échecs de résolution directe
- `augmentModelCatalog` : le fournisseur ajoute des lignes de catalogue synthétiques/finales après la découverte et la fusion de la configuration
- `isBinaryThinking` : le fournisseur possède l'UX de réflexion binaire activée/désactivée
- `supportsXHighThinking` : le fournisseur inscrit les modèles sélectionnés dans `xhigh`
- `resolveDefaultThinkingLevel` : le fournisseur possède la stratégie `/think` par défaut pour une famille de modèles
- `applyConfigDefaults` : le fournisseur applique des valeurs par défaut globales spécifiques au fournisseur lors de la matérialisation de la configuration en fonction du mode d'authentification, de l'environnement ou de la famille de modèles
- `isModernModelRef` : le fournisseur possède la correspondance de modèle préféré en temps réel/test (live/smoke)
- `prepareRuntimeAuth` : le fournisseur transforme une information d'identification configurée en un jeton d'exécution à courte durée de vie
- `resolveUsageAuth` : le fournisseur résout les informations d'identification d'utilisation/quota pour `/usage` et les surfaces d'état/rapport associées
- `fetchUsageSnapshot` : le fournisseur gère la récupération/analyse du point de terminaison d'utilisation, tandis que le cœur gère toujours le shell de synthèse et le formatage
- `onModelSelected` : le fournisseur exécute des effets secondaires post-sélection tels que la télémétrie ou la gestion de session propriétaire au fournisseur

Exemples groupés actuels :

- `anthropic` : repli de compatibilité ascendante Claude 4.6, indices de réparation d'authentification, récupération du point de terminaison d'utilisation, métadonnées de cache-TTL/famille de fournisseurs, et valeurs par défaut de configuration globales conscientes de l'authentification
- `amazon-bedrock` : correspondance de dépassement de contexte propriétaire au fournisseur et classification des motifs de basculement pour les erreurs spécifiques à Bedrock de limitation/non-prêt, ainsi que la famille de rejeu partagée `anthropic-by-model` pour les gardes de stratégie de rejeu exclusives à Claude sur le trafic Anthropic
- `anthropic-vertex` : gardes de stratégie de rejeu exclusives à Claude sur le trafic de messages Anthropic
- `openrouter` : identifiants de modèle passe-through, wrappers de requête, indices de capacité du fournisseur, nettoyage de la signature de pensée Gemini sur le trafic proxy Gemini, injection de raisonnement proxy via la famille de flux `openrouter-thinking`, transfert des métadonnées de routage, et stratégie de cache-TTL
- `github-copilot` : onboarding/device login, forward-compat model fallback,
  Claude-thinking transcript hints, runtime token exchange, and usage endpoint
  fetching
- `openai` : GPT-5.4 forward-compat fallback, direct OpenAI transport
  normalization, Codex-aware missing-auth hints, Spark suppression, synthetic
  OpenAI/Codex catalog rows, thinking/live-model policy, usage-token alias
  normalization (`input` / `output` et `prompt` / `completion` families), the
  shared `openai-responses-defaults` stream family for native OpenAI/Codex
  wrappers, provider-family metadata, bundled image-generation provider
  registration for `gpt-image-1` , and bundled video-generation provider
  registration for `sora-2`
- `google` et `google-gemini-cli` : Gemini 3.1 forward-compat fallback,
  native Gemini replay validation, bootstrap replay sanitation, tagged
  reasoning-output mode, modern-model matching, bundled image-generation
  provider registration for Gemini image-preview models, and bundled
  video-generation provider registration for Veo models ; Gemini CLI OAuth also
  owns auth-profile token formatting, usage-token parsing, and quota endpoint
  fetching for usage surfaces
- `moonshot` : shared transport, plugin-owned thinking payload normalization
- `kilocode` : shared transport, plugin-owned request headers, reasoning payload
  normalization, proxy-Gemini thought-signature sanitation, and cache-TTL
  policy
- `zai` : GLM-5 forward-compat fallback, `tool_stream` defaults, cache-TTL
  policy, binary-thinking/live-model policy, and usage auth + quota fetching;
  unknown `glm-5*` ids synthesize from the bundled `glm-4.7` template
- `xai` : normalisation du transport natif des réponses, réécritures d'alias `/fast` pour
  les variantes rapides de Grok, `tool_stream` par défaut, nettoyage des schémas d'outils /
  des charges utiles de raisonnement spécifiques à xAI, et inscription du provider
  de génération vidéo groupée pour `grok-imagine-video`
- `mistral` : métadonnées de capacité détenues par le plugin
- `opencode` et `opencode-go` : métadonnées de capacité détenues par le plugin plus
  assainissement de la signature de pensée proxy-Gemini
- `alibaba` : catalogue de génération vidéo détenu par le plugin pour des références directes de modèle Wan
  telles que `alibaba/wan2.6-t2v`
- `byteplus` : catalogues détenus par le plugin plus inscription du provider
  de génération vidéo groupée pour les modèles texte-vers-vidéo/image-vers-vidéo de Seedance
- `fal` : inscription du provider de génération vidéo groupée pour les provider tiers hébergés
  inscription du provider de génération d'images pour les modèles d'images FLUX plus inscription
  du provider de génération vidéo groupée pour les modèles vidéo tiers hébergés
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`,
  `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway`, et `volcengine` :
  catalogues détenus par le plugin uniquement
- `qwen` : catalogues détenus par le plugin pour les modèles texte plus inscriptions de provider partagées
  pour la compréhension de média et la génération vidéo pour ses
  surfaces multimodales ; la génération vidéo Qwen utilise les points de terminaison vidéo DashScope Standard
  avec des modèles Wan groupés tels que `wan2.6-t2v` et `wan2.7-r2v`
- `runway` : inscription du provider de génération vidéo détenu par le plugin pour les modèles
  natifs basés sur les tâches Runway tels que `gen4.5`
- `minimax` : catalogues appartenant aux plugins, enregistrement du fournisseur de génération vidéo groupé pour les modèles vidéo Hailuo, enregistrement du fournisseur de génération d'images groupé pour `image-01`, sélection hybride de la politique de relecture Anthropic/OpenAI, et logique d'authentification/snapshot d'utilisation
- `together` : catalogues appartenant aux plugins plus enregistrement du fournisseur de génération vidéo groupé pour les modèles vidéo Wan
- `xiaomi` : catalogues appartenant aux plugins plus logique d'authentification/snapshot d'utilisation

Le plugin groupé `openai` possède désormais les deux ids de fournisseur : `openai` et `openai-codex`.

Cela couvre les providers qui s'inscrivent encore dans les transports normaux de OpenClaw. Un provider
qui a besoin d'un exécuteur de requête totalement personnalisé constitue une surface d'extension
distincte et plus approfondie.

## Rotation de la clé API

- Prend en charge la rotation générique de provider pour les providers sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement en direct unique, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, par ex. `<PROVIDER>_API_KEY_1`)
- Pour les fournisseurs Google, `GOOGLE_API_KEY` est également inclus en guise de solution de secours.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les demandes sont réessayées avec la clé suivante uniquement en cas de réponses de limite de débit (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, ou messages périodiques de limite d'utilisation).
- Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi‑ai. Ces fournisseurs ne nécessitent **aucune** configuration `models.providers` ; définissez simplement l'authentification et choisissez un modèle.

### OpenAI

- Fournisseur : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Le préchauffage WebSocket OpenAI Responses est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les requêtes directes `openai/*` Responses vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu du commutateur partagé `/fast`
- Les en-têtes d'attribution cachés OpenClaw (`originator`, `version`,
  `User-Agent`) s'appliquent uniquement au trafic natif OpenAI vers `api.openai.com`, et non
  aux proxies compatibles OpenAI génériques
- Les routes natives OpenAI conservent également les `store` Responses, les indicateurs de cache de prompt, et
  le formatage de charge utile compatible avec le raisonnement OpenAI ; les routes proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'OpenAI API en direct la rejette ; Spark est traité comme exclusif à Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Modèle exemple : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les requêtes publiques directes Anthropic prennent en charge le commutateur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- Note Anthropic : Le personnel d'Anthropic nous a informés que l'utilisation de la CLI Claude de style OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
- Le jeton de configuration (setup-token) Anthropic reste disponible en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw privilégie désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'ils sont disponibles.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### Code OpenAI (Codex)

- Provider : `openai-codex`
- Auth : OAuth (ChatGPT)
- Exemple de modèle : `openai-codex/gpt-5.4`
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli sur SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes natives Codex Responses (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution cachés d'OpenClaw (`originator`, `version`,
  `User-Agent`) sont uniquement attachés au trafic natif Codex vers
  `chatgpt.com/backend-api`, et non aux proxys génériques compatibles OpenAI
- Partage le même commutateur `/fast` et la configuration `params.fastMode` que `openai/*` direct ; OpenClaw mappe cela vers `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue OAuth Codex l'expose ; dépend des droits d'accès
- `openai-codex/gpt-5.4` conserve `contextWindow = 1050000` natif et une limite d'exécution (runtime) par défaut `contextTokens = 272000` ; remplacez la limite d'exécution avec `models.providers.openai-codex.models[].contextTokens`
- Remarque sur la politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/flux de travail externes comme OpenClaw.

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

### Autres options hébergées par abonnement

- [Qwen Cloud](/fr/providers/qwen) : Surface du provider Qwen Cloud plus mappage des points de terminaison Alibaba DashScope et Coding Plan
- [MiniMax](/fr/providers/minimax) : Accès OAuth ou clé API pour MiniMax Coding Plan
- [GLM Models](/fr/providers/glm) : Plan de codage Z.AI ou points de terminaison API généraux

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Provider d'exécution Zen : `opencode`
- Fournisseur d'exécution Go : `opencode-go`
- Modèles exemples : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Provider : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` de repli et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Modèles exemples : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration héritée OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Les exécutions Gemini directes acceptent également `agents.defaults.models["google/<model>"].params.cachedContent`
  (ou l'ancien `cached_content`) pour transmettre un gestionnaire
  `cachedContents/...` natif du fournisseur ; les succès du cache Gemini apparaissent sous la forme de OpenClaw `cacheRead`

### Google Vertex et Gemini CLI

- Fournisseurs : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Gemini CLI utilise son propre flux OAuth
- Attention : CLI OAuth dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions de compte Google après avoir utilisé des clients tiers. Consultez les conditions de Google et utilisez un compte non critique si vous choisissez de continuer.
- Le CLI OAuth Gemini est fourni dans le cadre du plugin groupé `google`.
  - Installez d'abord Gemini CLI :
    - `brew install gemini-cli`
    - ou `npm install -g @google/gemini-cli`
  - Activer : `openclaw plugins enable google`
  - Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`
  - Remarque : vous ne devez **pas** coller un identifiant client ni un secret dans `openclaw.json`. Le flux de connexion CLI stocke
    des jetons dans les profils d'authentification sur l'hôte de la passerelle.
  - Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  - Les réponses JSON du CLI Gemini sont analysées à partir de `response` ; l'utilisation revient à `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Modèle exemple : `zai/glm-5.1`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Fournisseur : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemple de model : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Fournisseur : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de model : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte en direct
  de `https://api.kilo.ai/api/gateway/models` peut étendre davantage le catalogue
  d'exécution.
- Le routage amont exact derrière `kilocode/kilo/auto` est géré par Kilo Gateway,
  et n'est pas codé en dur dans OpenClaw.

Consultez [/providers/kilocode](/fr/providers/kilocode) pour les détails de la configuration.

### Autres plugins provider groupés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Exemple de model : `openrouter/auto`
- OpenClaw applique les en-têtes d'attribution d'application documentés de OpenRouter uniquement lorsque
  la requête cible réellement `openrouter.ai`
- Les marqueurs `cache_control` spécifiques à OpenRouter de Anthropic sont également limités aux
  routes vérifiées de OpenRouter, et non aux URL de proxy arbitraires
- OpenRouter reste sur le chemin compatible avec OpenAI de style proxy, donc le façonnage natif
  des requêtes uniquement pour OpenAI (`serviceTier`, Réponses `store`,
  indices de cache de prompt, charges utiles de compatibilité de raisonnement OpenAI) n'est pas transmis
- Les références OpenRouter avec support Gemini conservent uniquement la sanitation
  des signatures de pensée proxy-Gemini ; la validation de relecture native Gemini et les réécritures d'amorçage restent désactivées
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Exemple de model : `kilocode/kilo/auto`
- Les références Kilo soutenues par Gemini conservent le même chemin de nettoyage de signature de pensée proxy-Gemini ;
  `kilocode/kilo/auto` et d'autres indices non pris en charge par le raisonnement proxy
  ignorent l'injection de raisonnement proxy
- MiniMax : `minimax` (clé API) et `minimax-portal` (OAuth)
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`
- Modèle exemple : `minimax/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7`
- L'onboarding MiniMax / la configuration de la clé API écrit des définitions de modèle M2.7 explicites avec `input: ["text", "image"]` ; le catalogue de providers groupés conserve les refs de chat en mode texte uniquement jusqu'à ce que la configuration de ce provider soit matérialisée
- Moonshot : `moonshot` (`MOONSHOT_API_KEY`)
- Modèle exemple : `moonshot/kimi-k2.5`
- Kimi Coding : `kimi` (`KIMI_API_KEY` ou `KIMICODE_API_KEY`)
- Modèle exemple : `kimi/kimi-code`
- Qianfan : `qianfan` (`QIANFAN_API_KEY`)
- Modèle exemple : `qianfan/deepseek-v3.2`
- Qwen Cloud : `qwen` (`QWEN_API_KEY`, `MODELSTUDIO_API_KEY`, ou `DASHSCOPE_API_KEY`)
- Modèle exemple : `qwen/qwen3.5-plus`
- NVIDIA : `nvidia` (`NVIDIA_API_KEY`)
- Modèle exemple : `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun : `stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- Modèles exemples : `stepfun/step-3.5-flash`, `stepfun-plan/step-3.5-flash-2603`
- Together : `together` (`TOGETHER_API_KEY`)
- Modèle exemple : `together/moonshotai/Kimi-K2.5`
- Venice : `venice` (`VENICE_API_KEY`)
- Xiaomi : `xiaomi` (`XIAOMI_API_KEY`)
- Modèle exemple : `xiaomi/mimo-v2-flash`
- Vercel AI Gateway : `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`)
- Cloudflare AI Gateway : `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine : `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- Modèle exemple : `volcengine-plan/ark-code-latest`
- BytePlus : `byteplus` (`BYTEPLUS_API_KEY`)
- Modèle exemple : `byteplus-plan/ark-code-latest`
- xAI : `xai` (`XAI_API_KEY`)
  - Les requêtes groupées natives xAI utilisent le chemin de réponses xAI
  - `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`,
    `grok-4` et `grok-4-0709` en leurs variantes `*-fast`
  - `tool_stream` est activé par défaut ; définissez
    `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
    le désactiver
- Mistral : `mistral` (`MISTRAL_API_KEY`)
- Modèle exemple : `mistral/mistral-large-latest`
- CLI : `openclaw onboard --auth-choice mistral-api-key`
- Groq : `groq` (`GROQ_API_KEY`)
- Cerebras : `cerebras` (`CEREBRAS_API_KEY`)
  - Les modèles GLM sur Cerebras utilisent les ids `zai-glm-4.7` et `zai-glm-4.6`.
  - URL de base compatible OpenAI : `https://api.cerebras.ai/v1`.
- GitHub Copilot : `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modèle exemple Hugging Face Inference : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inference)](/fr/providers/huggingface).

## Fournisseurs via `models.providers` (URL de base/personnalisée)

Utilisez `models.providers` (ou `models.json`) pour ajouter des fournisseurs **personnalisés** ou
des proxys compatibles OpenAI/Anthropic.

La plupart des plugins de fournisseur groupés ci-dessous publient déjà un catalogue par défaut.
Utilisez des entrées `models.providers.<id>` explicites uniquement lorsque vous souhaitez remplacer l'URL de base par défaut, les en-têtes ou la liste des modèles.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de fournisseur groupé. Utilisez le fournisseur intégré par
défaut, et ajoutez une entrée `models.providers.moonshot` explicite uniquement lorsque vous
avez besoin de remplacer l'URL de base ou les métadonnées du modèle :

- Fournisseur : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Exemple de modèle : `moonshot/kimi-k2.5`
- CLI : `openclaw onboard --auth-choice moonshot-api-key` ou `openclaw onboard --auth-choice moonshot-api-key-cn`

ID des modèles Kimi K2 :

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding utilise le point de terminaison compatible Moonshot de Anthropic AI :

- Provider : `kimi`
- Auth : `KIMI_API_KEY`
- Exemple de modèle : `kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

L'ancien `kimi/k2p5` reste accepté en tant qu'ID de modèle de compatibilité.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) fournit l'accès à Doubao et à d'autres modèles en Chine.

- Provider : `volcengine` (coding : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Exemple de modèle : `volcengine-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

L'onboarding (intégration) est paramétré par défaut sur l'interface coding, mais le
catalogue général `volcengine/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'onboarding/configuration, le choix d'authentification Volcengine privilégie les lignes
`volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés,
OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur
délimité au provider vide.

Modèles disponibles :

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

Modèles de coding (`volcengine-plan`) :

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (International)

BytePlus ARK donne accès aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Provider : `byteplus` (coding : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de modèle : `byteplus-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

L'onboarding (intégration) est paramétré par défaut sur l'interface coding, mais le
catalogue général `byteplus/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'onboarding/configuration, le choix d'authentification BytePlus privilégie les lignes
`byteplus/*` et `byteplus-plan/*`. Si ces modèles ne sont pas encore chargés,
OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur
délimité au provider vide.

Modèles disponibles :

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

Modèles de codage (`byteplus-plan`) :

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic fournit des modèles compatibles avec Anthropic via le provider `synthetic` :

- Provider : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de modèle : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI : `openclaw onboard --auth-choice synthetic-api-key`

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

MiniMax est configuré via `models.providers` car il utilise des points de terminaison personnalisés :

- MiniMax OAuth (Global) : `--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN) : `--auth-choice minimax-cn-oauth`
- Clé MiniMax API (Global) : `--auth-choice minimax-global-api`
- Clé MiniMax API (CN) : `--auth-choice minimax-cn-api`
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou
  `MINIMAX_API_KEY` pour `minimax-portal`

Consultez [/providers/minimax](/fr/providers/minimax) pour les détails de configuration, les options de modèle et les extraits de configuration.

Sur le chemin de streaming compatible avec MiniMax de Anthropic, OpenClaw désactive la réflexion par
défaut, sauf si vous la définissez explicitement, et `/fast on` réécrit
`MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut de texte/discussion restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01` appartenant au plugin sur les deux chemins d'auth MiniMax
- La recherche Web reste sur l'id de fournisseur `minimax`

### LM Studio

LM Studio est fourni en tant que plugin de fournisseur groupé qui utilise l'API native :

- Provider : `lmstudio`
- Auth : `LM_API_TOKEN`
- URL de base d'inférence par défaut : `http://localhost:1234/v1`

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `http://localhost:1234/api/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utilise le `/api/v1/models` et le `/api/v1/models/load` natifs de LM Studio
pour la découverte et le chargement automatique, avec `/v1/chat/completions` pour l'inférence par défaut.
Voir [/providers/lmstudio](/fr/providers/lmstudio) pour la configuration et le dépannage.

### Ollama

Ollama est fourni en tant que plugin provider groupé et utilise l'Ollama native d'Ollama :

- Provider : `ollama`
- Auth : Aucune requise (serveur local)
- Exemple de model : `ollama/llama3.3`
- Installation : [https://ollama.com/download](https://ollama.com/download)

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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous activez l'option avec
`OLLAMA_API_KEY`, et le plugin provider groupé ajoute directement Ollama à
`openclaw onboard` et au sélecteur de model. Voir [/providers/ollama](/fr/providers/ollama)
pour l'onboarding, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin provider groupé pour les serveurs
compatibles OpenAI en local/auto-hébergés :

- Provider : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'auth) :

```bash
export VLLM_API_KEY="vllm-local"
```

Définissez ensuite un model (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Voir [/providers/vllm](/fr/providers/vllm) pour plus de détails.

### SGLang

SGLang est fourni en tant que plugin provider groupé pour les serveurs
compatibles OpenAI auto-hébergés rapides :

- Provider : `sglang`
- Auth : Optionnelle (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose
pas d'auth) :

```bash
export SGLANG_API_KEY="sglang-local"
```

Définissez ensuite un model (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Voir [/providers/sglang](/fr/providers/sglang) pour plus de détails.

### Proxys locaux (LM Studio, vLLM, LiteLLM, etc.)

Exemple (compatible OpenAI) :

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

Notes :

- Pour les providers personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs.
  En cas d'omission, OpenClaw utilise par défaut :
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.
- Pour `api: "openai-completions"` sur des points de terminaison non natifs (toute `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du fournisseur pour les rôles `developer` non pris en charge.
- Les routes de style proxy compatibles avec OpenAI ignorent également la mise en forme des requêtes natives exclusivement OpenAI : pas de `service_tier`, pas de Réponses `store`, pas d'indices de cache de prompt, pas de mise en forme de payload de compatibilité de raisonnement OpenAI, et pas d'en-têtes d'attribution OpenClaw masqués.
- Si `baseUrl` est vide ou omis, OpenClaw conserve le comportement par défaut OpenAI (qui résout vers `api.openai.com`).
- Par sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/fr/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Models](/fr/concepts/models) — configuration et alias de modèle
- [Model Failover](/fr/concepts/model-failover) — chaînes de repli et comportement de nouvelle tentative
- [Configuration Reference](/fr/gateway/configuration-reference#agent-defaults) — clés de configuration du modèle
- [Providers](/fr/providers) — guides de configuration par fournisseur

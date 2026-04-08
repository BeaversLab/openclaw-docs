---
summary: "Aperçu des providers de modèles avec des configurations d'exemple + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Model Providers"
---

# Fournisseurs de modèles

Cette page traite des **providers de LLM/de modèles** (et non des canaux de chat comme WhatsApp/Telegram).
Pour les règles de sélection de modèles, voir [/concepts/models](/en/concepts/models).

## Règles rapides

- Les références de modèles utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Les règles d'exécution de repli, les sondages de cooldown et la persistance des substitutions de session sont
  documentés dans [/concepts/model-failover](/en/concepts/model-failover).
- `models.providers.*.models[].contextWindow` sont les métadonnées natives du modèle ;
  `models.providers.*.models[].contextTokens` est la limite effective d'exécution.
- Les plugins de provider peuvent injecter des catalogues de modèles via `registerProvider({ catalog })` ;
  OpenClaw fusionne cette sortie dans `models.providers` avant d'écrire
  `models.json`.
- Les manifestes de provider peuvent déclarer `providerAuthEnvVars` afin que les sondages d'auth génériques basés sur l'env
  n'aient pas besoin de charger le runtime du plugin. Le reste du mappage des variables d'env de base
  est désormais réservé aux providers non-plugin/core et à quelques cas de précédence générique
  tels que l'onboarding avec clé Anthropic d'abord pour API.
- Les plugins de fournisseur peuvent également gérer le comportement du fournisseur à l'exécution via
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
- Remarque : les métadonnées `capabilities` du fournisseur à l'exécution sont des métadonnées partagées du runner (famille de
  fournisseurs, particularités de transcription/outillage, indications de transport/cache). Ce n'est pas la
  même chose que le [modèle de capacités public](/en/plugins/architecture#public-capability-model)
  qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).

## Comportement du fournisseur détenu par le plugin

Les plugins de fournisseur peuvent désormais gérer la plupart des logiques spécifiques au fournisseur tandis que OpenClaw conserve
la boucle d'inférence générique.

Répartition typique :

- `auth[].run` / `auth[].runNonInteractive` : le fournisseur gère les flux d'onboarding/de connexion
  pour `openclaw onboard`, `openclaw models auth` et la configuration sans interface
- `wizard.setup` / `wizard.modelPicker` : le provider possède les étiquettes de choix d'authentification,
  les alias hérités, les indices de liste d'autorisation d'intégration et les entrées de configuration dans les sélecteurs d'intégration/de modèle
- `catalog` : le provider apparaît dans `models.providers`
- `normalizeModelId` : le provider normalise les identifiants de modèle hérités/de prévisualisation avant
  la recherche ou la canonisation
- `normalizeTransport` : le provider normalise la famille de transport `api` / `baseUrl`
  avant l'assemblage générique du modèle ; OpenClaw vérifie d'abord le provider correspondant,
  puis les autres plugins de provider capables de hooks jusqu'à ce que l'un modifie réellement le
  transport
- `normalizeConfig` : le provider normalise la configuration `models.providers.<id>` avant
  son utilisation par l'exécution ; OpenClaw vérifie d'abord le provider correspondant, puis les autres
  plugins de provider capables de hooks jusqu'à ce que l'un modifie réellement la configuration. Si aucun
  hook de provider ne réécrit la configuration, les assistants groupés de la famille Google normalisent
  toujours les entrées de provider Google prises en charge.
- `applyNativeStreamingUsageCompat` : le provider applique des réécritures de compatibilité d'utilisation du streaming natif pilotées par le point de terminaison pour les providers de configuration
- `resolveConfigApiKey` : le provider résout l'authentification par marqueur d'environnement pour les providers de configuration
  sans forcer le chargement complet de l'authentification d'exécution. `amazon-bedrock` dispose également d'un
  résolveur de marqueur d'environnement AWS intégré ici, bien que l'authentification d'exécution Bedrock utilise
  la chaîne par défaut du SDK AWS.
- `resolveSyntheticAuth` : le provider peut exposer la disponibilité de l'authentification locale/auto-hébergée ou autre
  basée sur la configuration sans conserver de secrets en texte brut
- `shouldDeferSyntheticProfileAuth` : le provider peut marquer les espaces réservés de profil synthétique stockés
  comme ayant une priorité inférieure à l'authentification basée sur l'environnement/la configuration
- `resolveDynamicModel` : le provider accepte les identifiants de modèle non présents dans le
  catalogue statique local
- `prepareDynamicModel` : le provider a besoin d'une actualisation des métadonnées avant de réessayer
  la résolution dynamique
- `normalizeResolvedModel` : le provider a besoin de réécritures du transport ou de l'URL de base
- `contributeResolvedModelCompat` : le provider fournit des indicateurs de compatibilité pour ses
  modèles de fournisseur même lorsqu'ils arrivent via un autre transport compatible
- `capabilities` : le provider publie les particularités de la transcription/outillage/famille de providers
- `normalizeToolSchemas` : le nettoie les schémas d'outils avant que
  le runner intégré ne les voie
- `inspectToolSchemas` : le provider signale les avertissements de schéma spécifiques au transport
  après normalisation
- `resolveReasoningOutputMode` : le provider choisit les contrats de sortie de raisonnement natifs ou balisés
- `prepareExtraParams` : le provider définit par défaut ou normalise les paramètres de requête par modèle
- `createStreamFn` : le provider remplace le chemin de flux normal par un transport
  entièrement personnalisé
- `wrapStreamFn` : le provider applique les en-têtes/corps de requête/wrappers de compatibilité de modèle
- `resolveTransportTurnState` : le provider fournit les en-têtes ou métadonnées de transport natifs
  par tour
- `resolveWebSocketSessionPolicy` : le provider fournit les en-tètres de session WebSocket natifs
  ou la politique de refroidissement de session
- `createEmbeddingProvider` : le provider gère le comportement d'intégration de mémoire lorsqu'il
  appartient au plugin provider plutôt qu'au standard de commutation d'intégration central
- `formatApiKey` : le provider formate les profils d'authentification stockés en la chaîne
  `apiKey` attendue par le transport
- `refreshOAuth` : le provider gère le rafraîchissement OAuth lorsque les rafraîchisseurs
  partagés `pi-ai` ne suffisent pas
- `buildAuthDoctorHint` : le provider ajoute des conseils de réparation lorsque le rafraîchissement
  OAuth échoue
- `matchesContextOverflowError` : le provider reconnaît les erreurs de dépassement de fenêtre de contexte
  spécifiques au provider que les heuristiques génériques manqueraient
- `classifyFailoverReason` : le provider mappe les erreurs brutes de transport/API
  spécifiques au provider vers des raisons de basculement telles que la limite de taux ou la surcharge
- `isCacheTtlEligible` : le provider décide quels identifiants de modèles en amont prennent en charge le TTL du cache de prompts
- `buildMissingAuthMessage` : le provider remplace l'erreur générique du magasin d'authentification
  par un indice de récupération spécifique au provider
- `suppressBuiltInModel` : le provider masque les lignes en amont obsolètes et peut renvoyer une erreur
  détenue par le fournisseur pour les échecs de résolution directs
- `augmentModelCatalog` : le provider ajoute des lignes de catalogue synthétiques/finales après
  la découverte et la fusion de la configuration
- `isBinaryThinking` : le provider possède l'UX de réflexion binaire on/off
- `supportsXHighThinking` : le provider active les modèles sélectionnés dans `xhigh`
- `resolveDefaultThinkingLevel` : le provider possède la politique par défaut `/think` pour une
  famille de modèles
- `applyConfigDefaults` : le provider applique des valeurs par défaut globales spécifiques au fournisseur
  lors de la matérialisation de la configuration en fonction du mode d'auth, de l'environnement ou de la famille de modèles
- `isModernModelRef` : le provider gère la correspondance de modèle préféré en live/smoke
- `prepareRuntimeAuth` : le provider transforme une information d'identification configurée en un jeton d'exécution
  à courte durée de vie
- `resolveUsageAuth` : le provider résout les informations d'identification d'utilisation/quota pour `/usage`
  et les surfaces de rapport/status associées
- `fetchUsageSnapshot` : le provider gère la récupération/analyse de l'endpoint d'utilisation alors
  que le cœur gère toujours le shell de résumé et le formatage
- `onModelSelected` : le provider exécute des effets secondaires post-sélection tels que
  la télémétrie ou la tenue de session propriétaire du provider

Exemples groupés actuels :

- `anthropic` : repli de compatibilité avant Claude 4.6, indices de réparation d'auth, récupération de l'endpoint
  d'utilisation, métadonnées cache-TTL/provider-family, et configuration globale par défaut
  tenant compte de l'auth
- `amazon-bedrock` : correspondance de dépassement de contexte gérée par le provider et classification de la raison de basculement
  pour les erreurs d'étranglement/non-prêt spécifiques à Bedrock, ainsi que
  la famille de replay partagée `anthropic-by-model` pour les gardes de politique de replay
  Claude-only sur le trafic Anthropic
- `anthropic-vertex` : gardes de politique de replay Claude-only sur le trafic
  message Anthropic
- `openrouter` : ids de modèle pass-through, wrappers de requête, indices de capacité du
  provider, nettoyage de la signature de pensée Gemini sur le trafic proxy Gemini, injection
  de raisonnement proxy via la famille de flux `openrouter-thinking`, transfert de métadonnées
  de routage, et politique de cache-TTL
- `github-copilot` : onboarding/connexion d'appareil, repli de modèle de compatibilité avant,
  indices de transcription de pensée Claude, échange de jeton d'exécution, et récupération de
  l'endpoint d'utilisation
- `openai` : GPT-5.4 repli de compatibilité ascendante (forward-compat), transport direct OpenAI
  normalisation, indices d'authentification manquante compatibles Codex, suppression Spark, lignes
  synthétiques du catalogue OpenAI /Codex, stratégie de modèle de réflexion/en direct, normalisation des alias de jetons d'utilisation
  (`input` / `output` et `prompt` / `completion` familles), la
  famille de flux `openai-responses-defaults` partagée pour les wrappers natifs OpenAI /Codex,
  métadonnées de famille de provider, inscription de provider de génération d'images groupée pour
  `gpt-image-1`, et inscription de provider de génération de vidéo groupée pour
  `sora-2`
- `google` : repli de compatibilité ascendante Gemini 3.1, validation de
  relecture native Gemini, assainissement de la relecture de démarrage, mode de sortie de raisonnement balisé,
  correspondance de modèle moderne, inscription de provider de génération d'images groupée pour
  les modèles de prévisualisation d'images Gemini, et inscription de provider de génération de vidéo groupée pour
  les modèles Veo
- `moonshot` : transport partagé, normalisation de la charge utile de réflexion détenue par le plugin
- `kilocode` : transport partagé, en-têtes de requête détenus par le plugin, normalisation de la charge utile de raisonnement,
  assainissement de la signature de pensée proxy-Gemini, et stratégie de TTL de
  cache
- `zai` : repli de compatibilité ascendante GLM -5, valeurs par défaut `tool_stream`, stratégie de TTL de
  cache, stratégie de modèle de réflexion binaire/en direct, et authentification d'utilisation + récupération de quota ;
  les ids `glm-5*` inconnus sont synthétisés à partir du modèle `glm-4.7` groupé
- `xai` : normalisation du transport de réponses natif, réécritures d'alias `/fast` pour
  les variantes rapides Grok, `tool_stream` par défaut, nettoyage du schéma d'outil spécifique à xAI /
  de la charge utile de raisonnement, et inscription de provider de génération de vidéo groupée pour
  `grok-imagine-video`
- `mistral` : métadonnées de capacité détenues par le plugin
- `opencode` et `opencode-go` : métadonnées de capacité détenues par le plugin plus
  assainissement de la signature de pensée proxy-Gemini
- `alibaba` : catalogue de génération vidéo propriétaire du plugin pour les références directes au modèle Wan
  telles que `alibaba/wan2.6-t2v`
- `byteplus` : catalogues propriétaires du plugin plus enregistrement du fournisseur de génération vidéo
  comprenant pour les modèles de texte-vidéo/image-vidéo Seedance
- `fal` : enregistrement du fournisseur de génération vidéo pour des modèles vidéo
  tiers hébergés, enregistrement du fournisseur de génération d'image pour les modèles d'image FLUX plus enregistrement
  du fournisseur de génération vidéo pour des modèles vidéo tiers hébergés
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`,
  `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway` et `volcengine` :
  catalogues propriétaires du plugin uniquement
- `qwen` : catalogues propriétaires du plugin pour les modèles de texte plus enregistrements
  partagés de fournisseur de compréhension de médias et de génération vidéo pour ses
  surfaces multimodales ; la génération vidéo Qwen utilise les points de terminaison vidéo Standard DashScope
  avec des modèles Wan inclus tels que `wan2.6-t2v` et `wan2.7-r2v`
- `runway` : enregistrement du fournisseur de génération vidéo propriétaire du plugin pour les modèles
  natifs basés sur des tâches Runway tels que `gen4.5`
- `minimax` : catalogues propriétaires du plugin, enregistrement du fournisseur de génération vidéo
  pour les modèles vidéo Hailuo, enregistrement du fournisseur de génération d'image
  pour `image-01`, sélection hybride de stratégie de relecture Anthropic/OpenAI,
  et logique d'authentification/snapshot d'utilisation
- `together` : catalogues propriétaires du plugin plus enregistrement du fournisseur de génération vidéo
  pour les modèles vidéo Wan
- `xiaomi` : catalogues propriétaires du plugin plus logique d'authentification/snapshot d'utilisation

Le plugin `openai` inclus possède désormais les deux ID de fournisseur : `openai` et
`openai-codex`.

Cela concerne les providers qui correspondent toujours aux transports normaux de OpenClaw. Un provider
qui a besoin d'un exécuteur de requêtes totalement personnalisé constitue une surface d'extension
séparée et plus profonde.

## Rotation des clés API

- Prend en charge la rotation générique de provider pour les providers sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, par ex. `<PROVIDER>_API_KEY_1`)
- Pour les providers Google, `GOOGLE_API_KEY` est également inclus en tant que secours.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les requêtes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de débit (par
  exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Trop de
requêtes simultanées`, `ThrottlingException`, `limite de concurrence atteinte`,
  `workers_ai ... quota limit exceeded`, ou des messages périodiques de limite d'utilisation).
- Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Providers intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi‑ai. Ces providers ne nécessitent **aucune**
configuration `models.providers` ; définissez simplement l'auth + choisissez un modèle.

### OpenAI

- Provider : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Modèles exemples : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer par modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Le réchauffement WebSocket des réponses OpenAI est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les requêtes de réponses `openai/*` directes vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`,
  `User-Agent`) ne s'appliquent qu'au trafic natif OpenAI vers `api.openai.com`, et non
  aux proxys compatibles OpenAI génériques
- Les routes natives OpenAI conservent également `store` des réponses, les indications de cache de prompt (prompt-cache), et
  la mise en forme de payload compatible avec le raisonnement OpenAI ; les routes proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'API OpenAI en direct la rejette ; Spark est traité comme étant réservé à Codex uniquement

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, ainsi que `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Modèle exemple : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les requêtes publiques directes vers Anthropic prennent en charge l'interrupteur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API ou OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers `service_tier` Anthropic (`auto` vs `standard_only`)
- Note de facturation : pour Anthropic dans OpenClaw, la distinction pratique se fait entre la **clé API** ou l'**abonnement Claude avec Extra Usage**. Anthropic a informé les utilisateurs de OpenClaw le **4 avril 2026 à 12 h 00 PT / 20 h 00 BST** que le chemin de connexion Claude via **OpenClaw** compte comme une utilisation via un tiers et nécessite l'**Extra Usage** facturé séparément de l'abonnement. Nos reproductions locales montrent également que la chaîne de prompt identifiant OpenClaw ne se reproduit pas sur le chemin SDK Anthropic + clé API.
- Le jeton de configuration (setup-token) Anthropic est à nouveau disponible en tant que chemin hérité/manuel OpenClaw. Utilisez-le en sachant que Anthropic a indiqué aux utilisateurs de OpenClaw que ce chemin nécessite l'**Extra Usage**.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### Code OpenAI (Codex)

- Fournisseur : `openai-codex`
- Auth : OAuth (ChatGPT)
- Exemple de modèle : `openai-codex/gpt-5.4`
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (priorité WebSocket, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- `params.serviceTier` est également transmis lors des demandes de réponses Codex natives (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`,
  `User-Agent`) sont uniquement attachés au trafic natif Codex vers
  `chatgpt.com/backend-api`, et non aux proxies génériques compatibles OpenAI
- Partage le même bouton `/fast` et la même configuration `params.fastMode` que `openai/*` direct ; OpenClaw mappe cela vers `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue OAuth de Codex l'expose ; dépend des droits d'accès
- `openai-codex/gpt-5.4` conserve le `contextWindow = 1050000` natif et une limite d'exécution (runtime) par défaut `contextTokens = 272000` ; remplacez la limite d'exécution avec `models.providers.openai-codex.models[].contextTokens`
- Note de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/flux de travail externes tels que OpenClaw.

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

### Autres options hébergées de type abonnement

- [Qwen Cloud](/en/providers/qwen) : surface de fournisseur Qwen Cloud plus mappage des points de terminaison Alibaba DashScope et Coding Plan
- [MiniMax](/en/providers/minimax) : accès MiniMax ou par clé OAuth au plan de codage API
- [GLM Models](/en/providers/glm) : plan de codage Z.AI ou points de terminaison API généraux

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Fournisseur d'exécution Zen : `opencode`
- Fournisseur d'exécution Go : `opencode-go`
- Exemples de modèles : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, repli `GOOGLE_API_KEY` et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Exemples de modèles : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration héritée OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée en `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Les exécutions Gemini directes acceptent également `agents.defaults.models["google/<model>"].params.cachedContent`
  (ou l'ancien `cached_content`) pour transférer un identifiant
  `cachedContents/...` natif du fournisseur ; les correspondances du cache Gemini apparaissent sous la forme OpenClaw `cacheRead`

### Google Vertex

- Fournisseur : `google-vertex`
- Auth : gcloud ADC
  - Les réponses JSON du CLI Gemini sont analysées à partir de `response` ; l'utilisation revient à
    `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de modèle : `zai/glm-5`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés en `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Provider : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemple de model : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de model : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte
  `https://api.kilo.ai/api/gateway/models` en direct peut étendre davantage le
  catalogue d'exécution.
- Le routage amont exact derrière `kilocode/kilo/auto` est owned par Kilo Gateway,
  et n'est pas codé en dur dans OpenClaw.

Consultez [/providers/kilocode](/en/providers/kilocode) pour les détails de la configuration.

### Autres plugins de provider groupés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Exemple de model : `openrouter/auto`
- OpenClaw applique les en-têtes d'attribution d'application documentés de OpenRouter uniquement lorsque
  la requête cible réellement `openrouter.ai`
- Les marqueurs `cache_control` spécifiques à OpenRouter de Anthropic sont également limités aux
  itinéraires vérifiés de OpenRouter, et non aux URL de proxy arbitraires
- OpenRouter reste sur le chemin compatible OpenAI de style proxy, donc le formatage
  des requêtes natif uniquement pour OpenAI (`serviceTier`, Responses `store`,
  indications de cache de prompt, payloads de compatibilité de raisonnement OpenAI) n'est pas transmis
- Les références OpenRouter basées sur Gemini ne conservent que le nettoyage de la signature de pensée proxy-Gemini ;
  la validation de relecture native Gemini et les réécritures d'amorçage restent désactivées
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Exemple de model : `kilocode/kilo/auto`
- Les références Kilo basées sur Gemini conservent le même chemin de nettoyage de la signature de pensée proxy-Gemini ;
  `kilocode/kilo/auto` et autres indications non prises en charge par le raisonnement proxy
  ignorent l'injection de raisonnement proxy
- MiniMax : `minimax` (clé API) et `minimax-portal` (OAuth)
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`
- Exemple de model : `minimax/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7`
- La configuration d'intégration/de clé API MiniMax écrit des définitions de model M2.7 explicites avec
  `input: ["text", "image"]` ; le catalogue de providers groupé conserve les références de chat
  en mode texte jusqu'à ce que la configuration de ce provider soit matérialisée
- Moonshot : `moonshot` (`MOONSHOT_API_KEY`)
- Exemple de model : `moonshot/kimi-k2.5`
- Kimi Coding : `kimi` (`KIMI_API_KEY` ou `KIMICODE_API_KEY`)
- Exemple de model : `kimi/kimi-code`
- Qianfan : `qianfan` (`QIANFAN_API_KEY`)
- Exemple de model : `qianfan/deepseek-v3.2`
- Qwen Cloud : `qwen` (`QWEN_API_KEY`, `MODELSTUDIO_API_KEY`, ou `DASHSCOPE_API_KEY`)
- Exemple de model : `qwen/qwen3.5-plus`
- NVIDIA : `nvidia` (`NVIDIA_API_KEY`)
- Exemple de model : `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun : `stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- Exemples de models : `stepfun/step-3.5-flash`, `stepfun-plan/step-3.5-flash-2603`
- Together : `together` (`TOGETHER_API_KEY`)
- Exemple de model : `together/moonshotai/Kimi-K2.5`
- Venice : `venice` (`VENICE_API_KEY`)
- Xiaomi : `xiaomi` (`XIAOMI_API_KEY`)
- Exemple de model : `xiaomi/mimo-v2-flash`
- Vercel AI Gateway : `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`)
- Cloudflare AI Gateway : `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine : `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- Modèle exemple : `volcengine-plan/ark-code-latest`
- BytePlus : `byteplus` (`BYTEPLUS_API_KEY`)
- Modèle exemple : `byteplus-plan/ark-code-latest`
- xAI : `xai` (`XAI_API_KEY`)
  - Les requêtes xAI groupées natives utilisent le chemin xAI Responses
  - `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`,
    `grok-4` et `grok-4-0709` dans leurs variantes `*-fast`
  - `tool_stream` est activé par défaut ; définissez
    `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
    le désactiver
- Mistral : `mistral` (`MISTRAL_API_KEY`)
- Modèle exemple : `mistral/mistral-large-latest`
- CLI : `openclaw onboard --auth-choice mistral-api-key`
- Groq : `groq` (`GROQ_API_KEY`)
- Cerebras : `cerebras` (`CEREBRAS_API_KEY`)
  - Les modèles GLM sur Cerebras utilisent les identifiants `zai-glm-4.7` et `zai-glm-4.6`.
  - URL de base compatible OpenAI : `https://api.cerebras.ai/v1`.
- GitHub Copilot : `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Modèle exemple Hugging Face Inference : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inference)](/en/providers/huggingface).

## Fournisseurs via `models.providers` (URL personnalisée/de base)

Utilisez `models.providers` (ou `models.json`) pour ajouter des fournisseurs **personnalisés** ou
des proxies compatibles OpenAI/Anthropic.

La plupart des plugins de fournisseurs groupés ci-dessous publient déjà un catalogue par défaut.
Utilisez des entrées `models.providers.<id>` explicites uniquement lorsque vous souhaitez remplacer l'URL de base par défaut, les en-têtes ou la liste des modèles.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de fournisseur groupé. Utilisez le fournisseur intégré par défaut, et ajoutez une entrée explicite `models.providers.moonshot` uniquement lorsque vous avez besoin de remplacer l'URL de base ou les métadonnées du modèle :

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

Kimi Coding utilise le point de terminaison compatible Anthropic de l'IA Moonshot :

- Fournisseur : `kimi`
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

Volcano Engine (火山引擎) permet d'accéder à Doubao et à d'autres modèles en Chine.

- Fournisseur : `volcengine` (codage : `volcengine-plan`)
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

L'intégration (onboarding) est définie par défaut sur l'interface de codage, mais le catalogue général `volcengine/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'intégration/configuration, le choix d'authentification Volcengine privilégie à la fois les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur limité au fournisseur vide.

Modèles disponibles :

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

Modèles de codage (`volcengine-plan`) :

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (International)

BytePlus ARK permet d'accéder aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Provider : `byteplus` (codage : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de model : `byteplus-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

L'onboarding par défaut correspond à la surface de codage, mais le catalogue général `byteplus/*` est enregistré en même temps.

Dans les sélecteurs de model d'onboarding/configuration, le choix d'authentification BytePlus privilégie à la fois les lignes `byteplus/*` et `byteplus-plan/*`. Si ces models ne sont pas encore chargés, OpenClaw revient par défaut au catalogue non filtré au lieu d'afficher un sélecteur limité au provider vide.

Models disponibles :

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

Models de codage (`byteplus-plan`) :

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic fournit des models compatibles avec Anthropic via le provider `synthetic` :

- Provider : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de model : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
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

Consultez [/providers/minimax](/en/providers/minimax) pour plus de détails sur la configuration, les options de model et les extraits de configuration.

Sur le chemin de streaming compatible avec MiniMax de Anthropic, OpenClaw désactive la réflexion par défaut sauf si vous la définissez explicitement, et `/fast on` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut de texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01` appartenant au plugin sur les deux chemins d'auth MiniMax
- La recherche Web reste sur l'id de fournisseur `minimax`

### Ollama

Ollama est fourni en tant que plugin de fournisseur groupé et utilise l'Ollama native de API :

- Fournisseur : `ollama`
- Auth : Aucune requise (serveur local)
- Modèle exemple : `ollama/llama3.3`
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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous optez pour
`OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute Ollama directement à
`openclaw onboard` et au sélecteur de modèle. Voir [/providers/ollama](/en/providers/ollama)
pour l'onboarding, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs locaux/auto-hébergés compatibles OpenAI :

- Fournisseur : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour opter pour la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'auth) :

```bash
export VLLM_API_KEY="vllm-local"
```

Ensuite, définissez un modèle (remplacez par l'un des IDs renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Voir [/providers/vllm](/en/providers/vllm) pour plus de détails.

### SGLang

SGLang est fourni en tant que plugin de fournisseur groupé pour des serveurs
auto-hébergés rapides compatibles OpenAI :

- Fournisseur : `sglang`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour opter pour la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'auth) :

```bash
export SGLANG_API_KEY="sglang-local"
```

Ensuite, définissez un modèle (remplacez par l'un des IDs renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Voir [/providers/sglang](/en/providers/sglang) pour plus de détails.

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
        apiKey: "LMSTUDIO_KEY",
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

Remarques :

- Pour les fournisseurs personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont optionnels.
  Lorsqu'ils sont omis, OpenClaw utilise par défaut :
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recommandé : définissez des valeurs explicites qui correspondent aux limites de votre proxy/modèle.
- Pour `api: "openai-completions"` sur les points de terminaison non natifs (toute `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
- Les routes de style proxy compatibles avec OpenAI ignorent également le formatage de requête natif uniquement OpenAI : pas de `service_tier`, pas de Réponses `store`, pas d'indices de cache de prompt, pas de formatage de payload de compatibilité de raisonnement OpenAI, et pas d'en-têtes d'attribution cachés OpenClaw.
- Si `baseUrl` est vide/omis, OpenClaw conserve le comportement par défaut de OpenAI (qui est résolu en `api.openai.com`).
- Pour la sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/en/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Modèles](/en/concepts/models) — configuration et alias de modèle
- [Basculement de modèle](/en/concepts/model-failover) — chaînes de secours et comportement de nouvelle tentative
- [Référence de configuration](/en/gateway/configuration-reference#agent-defaults) — clés de configuration du modèle
- [Providers](/en/providers) — guides de configuration par provider

---
summary: "Aperçu des providers de modèles avec des configurations d'exemple + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Model Providers"
---

# Fournisseurs de modèles

Cette page couvre les **fournisseurs de LLM/modèles** (et non les canaux de discussion comme WhatsApp/Telegram).
Pour les règles de sélection de modèle, voir [/concepts/models](/en/concepts/models).

## Règles rapides

- Les références de modèles utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Les règles d'exécution de secours, les sondes de refroidissement et la persistance de la priorité de session sont
  documentées dans [/concepts/model-failover](/en/concepts/model-failover).
- `models.providers.*.models[].contextWindow` sont les métadonnées natives du modèle ;
  `models.providers.*.models[].contextTokens` est la limite effective d'exécution.
- Les plugins de provider peuvent injecter des catalogues de modèles via `registerProvider({ catalog })` ;
  OpenClaw fusionne cette sortie dans `models.providers` avant d'écrire
  `models.json`.
- Les manifestes de fournisseur peuvent déclarer `providerAuthEnvVars` et
  `providerAuthAliases` afin que les sondes d'authentification génériques basées sur l'environnement et les variantes de fournisseur
  n'aient pas besoin de charger l'exécution du plugin. La carte principale des variables d'environnement restante est maintenant
  réservée aux fournisseurs non-plugins/principaux et à quelques cas de précédence générique tels
  que l'onboarding avec priorité à la clé Anthropic API.
- Les plugins de fournisseur peuvent également gérer le comportement d'exécution du fournisseur via
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
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`, et
  `onModelSelected`.
- Remarque : le `capabilities` du fournisseur (provider runtime) sont des métadonnées partagées du runner (famille de fournisseurs, particularités de transcription/outillage, indices de transport/cache). Ce n'est pas la même chose que le [modèle de capacité public](/en/plugins/architecture#public-capability-model) qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).
- Le fournisseur (provider) `codex` fourni est associé au harnais d'agent Codex fourni. Utilisez `codex/gpt-*` lorsque vous souhaitez la connexion gérée par Codex, la découverte de modèles, la reprise native de fil et l'exécution sur le serveur d'application. Les références `openai/gpt-*` classiques continuent d'utiliser le fournisseur OpenAI et le transport de fournisseur OpenClaw normal. Les déploiements Codex uniquement peuvent désactiver le basculement automatique vers PI avec `agents.defaults.embeddedHarness.fallback: "none"` ; voir [Codex Harness](/en/plugins/codex-harness).

## Comportement du fournisseur détenu par le plugin

Les plugins de fournisseur (provider plugins) peuvent maintenant posséder la majeure partie de la logique spécifique au fournisseur tandis que OpenClaw conserve la boucle d'inférence générique.

Répartition typique :

- `auth[].run` / `auth[].runNonInteractive` : le fournisseur possède les flux d'intégration/connexion (onboarding/login) pour `openclaw onboard`, `openclaw models auth`, et la configuration sans tête (headless)
- `wizard.setup` / `wizard.modelPicker` : le fournisseur possède les étiquettes de choix d'authentification, les alias hérités, les indices de liste d'autorisation d'intégration (onboarding allowlist hints) et les entrées de configuration dans les sélecteurs d'intégration/de modèles
- `catalog` : le fournisseur apparaît dans `models.providers`
- `normalizeModelId` : le fournisseur normalise les ID de modèle hérités/preview avant la recherche ou la canonicalisation
- `normalizeTransport` : le fournisseur normalise `api` / `baseUrl` de la famille de transport avant l'assemblage du modèle générique ; OpenClaw vérifie d'abord le fournisseur correspondant, puis les autres plugins de fournisseur compatibles avec les hooks jusqu'à ce que l'un change réellement le transport
- `normalizeConfig` : le fournisseur normalise la configuration `models.providers.<id>` avant que l'exécution ne l'utilise ; OpenClaw vérifie d'abord le fournisseur correspondant, puis les autres plugins de fournisseur compatibles avec les hooks jusqu'à ce que l'un change réellement la configuration. Si aucun hook de fournisseur ne réécrit la configuration, les assistants de famille Google fournis normalisent toujours les entrées de fournisseur Google prises en charge.
- `applyNativeStreamingUsageCompat` : le provider applique des réécritures de compatibilité d'utilisation du streaming natif pilotées par le point de terminaison pour les providers de configuration
- `resolveConfigApiKey` : le provider résout l'auth par marqueur d'environnement pour les providers de configuration
  sans forcer le chargement complet de l'auth au moment de l'exécution. `amazon-bedrock` possède également un
  résolveur de marqueur d'environnement AWS intégré ici, même si l'auth d'exécution Bedrock utilise
  la chaîne par défaut du SDK AWS.
- `resolveSyntheticAuth` : le provider peut exposer une disponibilité d'auth locale/auto-hébergée ou autre
  basée sur la configuration sans persister de secrets en texte clair
- `shouldDeferSyntheticProfileAuth` : le provider peut marquer les espaces réservés de profil synthétique stockés
  comme ayant une priorité inférieure à l'auth basée sur l'environnement/la configuration
- `resolveDynamicModel` : le provider accepte les identifiants de modèle non présents dans le
  catalogue statique local pour l'instant
- `prepareDynamicModel` : le provider a besoin d'une actualisation des métadonnées avant de réessayer
  la résolution dynamique
- `normalizeResolvedModel` : le provider a besoin de réécritures de transport ou d'URL de base
- `contributeResolvedModelCompat` : le provider contribue aux indicateurs de compatibilité pour ses
  modèles de fournisseur même lorsqu'ils arrivent via un autre transport compatible
- `capabilities` : le provider publie les particularités de transcription/outillage/famille de providers
- `normalizeToolSchemas` : le provider nettoie les schémas d'outils avant que le runner
  intégré ne les voie
- `inspectToolSchemas` : le provider présente des avertissements de schéma spécifiques au transport
  après normalisation
- `resolveReasoningOutputMode` : le provider choisit les contrats de sortie de raisonnement natifs ou balisés
- `prepareExtraParams` : le provider définit par défaut ou normalise les paramètres de requête par modèle
- `createStreamFn` : le provider remplace le chemin de flux normal par un
  transport entièrement personnalisé
- `wrapStreamFn` : le provider applique des wrappers de compatibilité d'en-têtes/corps/modèle de requête
- `resolveTransportTurnState` : le provider fournit des en-têtes ou métadonnées de transport natifs par tour
- `resolveWebSocketSessionPolicy` : le provider fournit des en-têtes de session WebSocket natifs
  ou une politique de refroidissement de session
- `createEmbeddingProvider` : le provider gère le comportement d'incorporation mémoire (memory embedding) lorsqu'il
  appartient au plugin du provider plutôt qu'au standard d'acheminement d'incorporation central
- `formatApiKey` : le provider formate les profils d'authentification stockés dans la chaîne d'exécution
  `apiKey` attendue par le transport
- `refreshOAuth` : le provider gère le rafraîchissement OAuth lorsque les rafraîchissements partagés `pi-ai`
  ne suffisent pas
- `buildAuthDoctorHint` : le provider ajoute des conseils de réparation lorsque le rafraîchissement OAuth
  échoue
- `matchesContextOverflowError` : le provider reconnaît les erreurs de dépassement de fenêtre de contexte spécifiques au fournisseur que les heuristiques génériques manqueraient
- `classifyFailoverReason` : le provider mappe les erreurs brutes spécifiques au fournisseur de transport/API
  aux raisons de basculement telles que la limitation de débit ou la surcharge
- `isCacheTtlEligible` : le provider décide quels identifiants de modèle amont prennent en charge le TTL du cache de prompt
- `buildMissingAuthMessage` : le provider remplace l'erreur générique du magasin d'authentification
  par un indice de récupération spécifique au fournisseur
- `suppressBuiltInModel` : le provider masque les lignes amont obsolètes et peut renvoyer une erreur
  possédée par le fournisseur pour les échecs de résolution directs
- `augmentModelCatalog` : le provider ajoute des lignes de catalogue synthétiques/finales après
  la découverte et la fusion de la configuration
- `isBinaryThinking` : le provider gère l'UX de réflexion binaire on/off
- `supportsXHighThinking` : le provider active les modèles sélectionnés pour `xhigh`
- `resolveDefaultThinkingLevel` : le provider possède la stratégie par défaut `/think` pour une
  famille de modèles
- `applyConfigDefaults` : le provider applique les valeurs par défaut globales spécifiques au fournisseur
  lors de la matérialisation de la configuration en fonction du mode d'authentification, de l'environnement ou de la famille de modèles
- `isModernModelRef` : le provider gère la correspondance de modèle préféré en direct/test
- `prepareRuntimeAuth` : le provider transforme une identifiante configuré en un jeton d'exécution
  à courte durée de vie
- `resolveUsageAuth` : le provider résout les identifiants d'utilisation/quota pour `/usage`
  et les surfaces d'état/rapport associées
- `fetchUsageSnapshot` : le provider gère la récupération/analyse du point de terminaison d'utilisation tandis que
  le cœur gère toujours le shell de résumé et le formatage
- `onModelSelected` : le provider exécute des effets secondaires post-sélection tels que
  la télémétrie ou la gestion de session possédée par le fournisseur

Exemples groupés actuels :

- `anthropic` : repli de compatibilité future pour Claude 4.6, indices de réparation d'authentification, récupération de point de terminaison d'utilisation, métadonnées de cache-TTL/famille de provider et valeurs par défaut de configuration globale conscientes de l'authentification
- `amazon-bedrock` : correspondance du dépassement de contexte détenue par le provider et classification du motif de basculement pour les erreurs de limitation/non-prêt spécifiques à Bedrock, ainsi que la famille de rejeu partagée `anthropic-by-model` pour les gardes de stratégie de rejeu Claude-only sur le trafic Anthropic
- `anthropic-vertex` : gardes de stratégie de rejeu Claude-only sur le trafic de messages Anthropic
- `openrouter` : ids de modèle pass-through, wrappers de requête, indices de capacité du provider, assainissement de la signature de pensée Gemini sur le trafic proxy Gemini, injection de raisonnement proxy via la famille de flux `openrouter-thinking`, transfert des métadonnées de routage et stratégie de cache-TTL
- `github-copilot` : onboarding/connexion appareil, repli de modèle de compatibilité future, indices de transcription de pensée Claude, échange de jetons d'exécution et récupération de point de terminaison d'utilisation
- `openai` : repli de compatibilité future pour GPT-5.4, normalisation du transport direct OpenAI, indices d'authentification manquée conscients de Codex, suppression Spark, lignes de catalogue synthétique OpenAI/Codex, stratégie de modèle en direct/pensant, normalisation d'alias de jeton d'utilisation (familles `input` / `output` et `prompt` / `completion`), la famille de flux partagée `openai-responses-defaults` pour les wrappers natifs OpenAI/Codex, métadonnées de famille de provider, enregistrement groupé de provider de génération d'images pour `gpt-image-1` et enregistrement groupé de provider de génération de vidéo pour `sora-2`
- `google` et `google-gemini-cli` : repli de compatibilité ascendante Gemini 3.1,
  validation de relecture native Gemini, assainissement de l'amorçage de relecture, mode
  de sortie de raisonnement étiqueté, correspondance de modèle moderne, enregistrement
  de provider de génération d'images groupé pour les modèles d'aperçu d'images Gemini,
  et enregistrement de provider de génération vidéo groupé pour les modèles Veo ;
  CLI OAuth Gemini gère également le formatage des jetons
  de profil d'authentification, l'analyse des jetons d'utilisation et la récupération
  du point de terminaison de quota pour les surfaces d'utilisation
- `moonshot` : transport partagé, normalisation de la charge utile de réflexion détenue par le plugin
- `kilocode` : transport partagé, en-têtes de demande détenus par le plugin,
  normalisation de la charge utile de raisonnement, assainissement de la signature de pensée
  proxy-Gemini et stratégie de cache-TTL
- `zai` : repli de compatibilité ascendante GLM-5, valeurs par
  défaut `tool_stream`, stratégie de cache-TTL, stratégie de modèle
  binaire/pensée en direct et authentification d'utilisation + récupération de quota ;
  les ids `glm-5*` inconnus sont synthétisés à partir du modèle `glm-4.7` groupé
- `xai` : normalisation du transport des réponses natives, réécritures
  d'alias `/fast` pour les variantes rapides Grok, `tool_stream` par défaut,
  nettoyage du schéma d'outil spécifique à xAI / de la charge utile de raisonnement, et
  enregistrement de provider de génération vidéo groupé pour `grok-imagine-video`
- `mistral` : métadonnées de capacité détenues par le plugin
- `opencode` et `opencode-go` : métadonnées de capacité détenues par
  le plugin plus assainissement de la signature de pensée proxy-Gemini
- `alibaba` : catalogue de génération vidéo détenu par le plugin pour
  les références directes de modèle Wan telles que `alibaba/wan2.6-t2v`
- `byteplus` : catalogues détenus par le plugin plus enregistrement
  de provider de génération vidéo groupé pour les modèles Seedance texte-vers-vidéo/image-vers-vidéo
- `fal` : enregistrement de provider de génération vidéo groupé
  pour l'enregistrement de provider de génération d'images tiers hébergé pour les modèles
  d'images FLUX plus enregistrement de provider de génération vidéo groupé pour les modèles
  vidéo tiers hébergés
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`,
  `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway`, et `volcengine` :
  仅为 les catalogues détenus par des plugins
- `qwen` : catalogues détenus par des plugins pour les modèles de texte plus des
  enregistrements de provider de compréhension de média et de génération de vidéo partagés pour ses
  surfaces multimodales ; la génération vidéo Qwen utilise les points de terminaison vidéo
  Standard DashScope avec des modèles Wan groupés tels que `wan2.6-t2v` et `wan2.7-r2v`
- `runway` : enregistrement de provider de génération vidéo détenu par un plugin pour les modèles natifs
  Runway basés sur des tâches tels que `gen4.5`
- `minimax` : catalogues détenus par des plugins, enregistrement de provider de génération de vidéo groupé
  pour les modèles vidéo Hailuo, enregistrement de provider de génération d'image groupé
  pour `image-01`, sélection de stratégie de relecture hybride Anthropic/OpenAI,
  et logique d'authentification/snapshot d'utilisation
- `together` : catalogues détenus par des plugins plus enregistrement de provider de génération de vidéo groupé
  pour les modèles vidéo Wan
- `xiaomi` : catalogues détenus par des plugins plus logique d'authentification/snapshot d'utilisation

Le plugin groupé `openai` possède désormais les deux id de provider : `openai` et
`openai-codex`.

Cela couvre les providers qui s'inscrivent encore dans les transports normaux de OpenClaw. Un provider
qui a besoin d'un exécuteur de requête totalement personnalisé constitue une surface d'extension
distincte et plus approfondie.

## Rotation de la clé API

- Prend en charge la rotation générique de provider pour les providers sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement à la volée unique, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, ex. `<PROVIDER>_API_KEY_1`)
- Pour les providers Google, `GOOGLE_API_KEY` est également inclus en tant que repli.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les demandes sont retentées avec la clé suivante uniquement en cas de réponses de limitation de débit (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`,
  `workers_ai ... quota limit exceeded`, ou des messages périodiques de limite d'utilisation).
- Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi‑ai. Ces fournisseurs ne nécessitent **aucune** configuration `models.providers` ; il suffit de définir l'authentification et de choisir un modèle.

### OpenAI

- Fournisseur : `openai`
- Authentification : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, ainsi que `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket en priorité, repli sur SSE)
- Remplacer par modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Le préchauffage WebSocket des réponses OpenAI est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les demandes de réponses `openai/*` directes vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`,
  `User-Agent`) s'appliquent uniquement au trafic natif OpenAI vers `api.openai.com`, et non
  aux proxys compatibles OpenAI génériques
- Les routes natives OpenAI conservent également les `store` de réponses, les indicateurs de cache de prompt, et
  le formatage de charge utile compatible avec le raisonnement OpenAI ; les routes proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'OpenAI API en direct la rejette ; Spark est traité comme exclusivement Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de model : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les demandes publiques directes vers Anthropic prennent en charge le commutateur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé d'API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- Note Anthropic : Le personnel de Anthropic nous a informé que l'utilisation de la CLI Claude style OpenClaw est à nouveau autorisée, donc CLI considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si OpenClaw publie une nouvelle politique.
- Le jeton de configuration Anthropic reste disponible en tant que chemin de jeton OpenClaw pris en charge, mais OpenClaw préfère désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'elles sont disponibles.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### Code OpenAI (Codex)

- Fournisseur : `openai-codex`
- Auth : OAuth (ChatGPT)
- Exemple de model : `openai-codex/gpt-5.4`
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer par model via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes natives Codex Responses (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`,
  `User-Agent`) sont uniquement attachés au trafic natif Codex vers
  `chatgpt.com/backend-api`, et non aux proxys génériques compatibles OpenAI
- Partage le même sélecteur `/fast` et la même configuration `params.fastMode` que le `openai/*` direct ; OpenClaw mappe cela vers `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue Codex OAuth l'expose ; dépend des droits d'accès
- `openai-codex/gpt-5.4` conserve le `contextWindow = 1050000` natif et une limite d'exécution (runtime) par défaut `contextTokens = 272000` ; remplacez la limite d'exécution avec `models.providers.openai-codex.models[].contextTokens`
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

- [Qwen Cloud](/en/providers/qwen) : surface de provider Qwen Cloud plus mappage de points de terminaison Alibaba DashScope et Coding Plan
- [MiniMax](/en/providers/minimax) : accès Coding Plan MiniMax ou clé OAuth API
- [Modèles GLM](/en/providers/glm) : Z.AI Coding Plan ou points de terminaison API généraux

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Provider d'exécution Zen : `opencode`
- Provider d'exécution Go : `opencode-go`
- Exemples de modèles : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Provider : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, repli `GOOGLE_API_KEY` et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Exemples de modèles : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration OpenClaw héritée utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Les exécutions directes Gemini acceptent également `agents.defaults.models["google/<model>"].params.cachedContent`
  (ou l'ancien `cached_content`) pour transmettre un handle `cachedContents/...` natif du fournisseur ; les accès au cache Gemini apparaissent comme OpenClaw `cacheRead`

### Google Vertex et Gemini CLI

- Fournisseurs : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Gemini CLI utilise son propre flux OAuth
- Attention : CLI OAuth dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions de compte Google après avoir utilisé des clients tiers. Consultez les conditions de Google et utilisez un compte non critique si vous choisissez de continuer.
- CLI OAuth est fourni dans le cadre du plugin groupé `google`.
  - Installez d'abord Gemini CLI :
    - `brew install gemini-cli`
    - ou `npm install -g @google/gemini-cli`
  - Activer : `openclaw plugins enable google`
  - Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`
  - Remarque : vous ne devez **pas** coller un identifiant client ni un secret dans `openclaw.json`. Le flux de connexion CLI stocke
    les jetons dans les profils d'authentification sur l'hôte de la passerelle.
  - Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  - Les réponses JSON CLI sont analysées à partir de `response` ; l'utilisation revient à
    `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de modèle : `zai/glm-5.1`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Provider : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Modèle exemple : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Modèle exemple : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte
  en direct `https://api.kilo.ai/api/gateway/models` peut étendre davantage le catalogue
  d'exécution.
- Le routage exact en amont derrière `kilocode/kilo/auto` est géré par Kilo Gateway,
  et n'est pas codé en dur dans OpenClaw.

Voir [/providers/kilocode](/en/providers/kilocode) pour les détails de configuration.

### Autres plugins provider groupés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Modèle exemple : `openrouter/auto`
- OpenClaw applique les en-têtes d'attribution d'application documentés de OpenRouter uniquement lorsque
  la requête cible réellement `openrouter.ai`
- Les marqueurs `cache_control` OpenRouter spécifiques à Anthropic sont également limités aux
  itinéraires OpenRouter vérifiés, et non aux URL de proxy arbitraires
- OpenRouter reste sur le chemin compatible OpenAI de style proxy, donc la mise en forme des requêtes
  native uniquement OpenAI (`serviceTier`, Responses `store`,
  indicateurs de cache de prompt, payloads de compatibilité de raisonnement OpenAI) n'est pas transmise
- Les références OpenRouter avec support Gemini conservent uniquement la sanitation
  des signatures de pensée proxy-Gemini ; la validation de relecture native Gemini et les réécritures d'amorçage restent désactivées
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Modèle exemple : `kilocode/kilo/auto`
- Les références Kilo avec support Gemini conservent le même chemin de sanitation
  des signatures de pensée proxy-Gemini ; `kilocode/kilo/auto` et autres indicateurs
  non supportés par le raisonnement proxy ignorent l'injection du raisonnement proxy
- MiniMax : `minimax` (clé API) et `minimax-portal` (OAuth)
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`
- Exemple de model : `minimax/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7`
- La configuration de clé onboarding/MiniMax de API écrit des définitions de model M2.7 explicites avec `input: ["text", "image"]` ; le catalogue de providers fournis conserve les références de chat en mode texte uniquement jusqu'à ce que la configuration de ce provider soit matérialisée
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
- AI Vercel de Gateway : `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Inférence Hugging Face : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`)
- AI Gateway de Cloudflare : `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine : `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- Exemple de model : `volcengine-plan/ark-code-latest`
- BytePlus : `byteplus` (`BYTEPLUS_API_KEY`)
- Exemple de model : `byteplus-plan/ark-code-latest`
- xAI : `xai` (`XAI_API_KEY`)
  - Les requêtes groupées natives xAI utilisent le chemin de réponses xAI
  - `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`,
    `grok-4` et `grok-4-0709` vers leurs variantes `*-fast`
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
- Modèle exemple d'inférence Hugging Face : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inference)](/en/providers/huggingface).

## Fournisseurs via `models.providers` (URL personnalisée/de base)

Utilisez `models.providers` (ou `models.json`) pour ajouter des fournisseurs **personnalisés** ou
des proxies compatibles OpenAI/Anthropic.

La plupart des plugins de fournisseurs groupés ci-dessous publient déjà un catalogue par défaut.
Utilisez des entrées explicites `models.providers.<id>` uniquement lorsque vous souhaitez remplacer l'
URL de base par défaut, les en-têtes ou la liste des modèles.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de fournisseur groupé. Utilisez le fournisseur intégré par
défaut, et ajoutez une entrée explicite `models.providers.moonshot` uniquement lorsque vous
avez besoin de remplacer l'URL de base ou les métadonnées du modèle :

- Fournisseur : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Modèle exemple : `moonshot/kimi-k2.5`
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

`kimi/k2p5` (Legacy) reste accepté comme identifiant de modèle de compatibilité.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) fournit l'accès à Doubao et à d'autres modèles en Chine.

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

L'intégration (Onboarding) est définie par défaut sur l'interface de codage, mais le catalogue général `volcengine/*`
est enregistré en même temps.

Dans les sélecteurs de modèles d'intégration/de configuration, le choix d'authentification Volcengine privilégie les lignes
`volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés,
OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur
portée par le fournisseur vide.

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

BytePlus ARK donne accès aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Fournisseur : `byteplus` (codage : `byteplus-plan`)
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

L'intégration (Onboarding) est définie par défaut sur l'interface de codage, mais le catalogue général `byteplus/*`
est enregistré en même temps.

Dans l'intégration/configuration des sélecteurs de modèles, le choix d'authentification BytePlus privilégie les lignes `byteplus/*` et `byteplus-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient par défaut au catalogue non filtré au lieu d'afficher un sélecteur limité au provider vide.

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

Consultez [/providers/minimax](/en/providers/minimax) pour les détails de configuration, les options de modèles et les extraits de configuration.

Sur le chemin de streaming compatible avec MiniMax de Anthropic, OpenClaw désactive la réflexion par défaut, sauf si vous la définissez explicitement, et `/fast on` réécrit
`MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut pour le texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01` détenue par le plugin sur les deux chemins d'authentification MiniMax
- La recherche web reste sur l'id de provider `minimax`

### Ollama

Ollama est fourni en tant que plugin de fournisseur groupé et utilise l'API native d'Ollama :

- Fournisseur : `ollama`
- Auth : Aucune requise (serveur local)
- Exemple de modèle : `ollama/llama3.3`
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
`OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute directement Ollama à
`openclaw onboard` et au sélecteur de modèles. Consultez [/providers/ollama](/en/providers/ollama)
pour l'intégration, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs
compatibles OpenAI locaux/auto-hébergés :

- Fournisseur : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification) :

```bash
export VLLM_API_KEY="vllm-local"
```

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consultez [/providers/vllm](/en/providers/vllm) pour plus de détails.

### SGLang

SGLang est fourni en tant que plugin de fournisseur groupé pour les serveurs
compatibles OpenAI auto-hébergés rapides :

- Fournisseur : `sglang`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas
d'authentification) :

```bash
export SGLANG_API_KEY="sglang-local"
```

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consultez [/providers/sglang](/en/providers/sglang) pour plus de détails.

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

- Pour les fournisseurs personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs.
  En cas d'omission, OpenClaw utilise par défaut :
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.
- Pour `api: "openai-completions"` sur des points de terminaison non natifs (tout `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
- Les routes compatibles OpenAI de type proxy ignorent également le formatage de requête natif uniquement OpenAI : pas de `service_tier`, pas de `store` Responses, pas d'indices de cache de prompt, pas de formatage de payload de compatibilité de raisonnement OpenAI, et pas d'en-têtes d'attribution OpenClaw cachés.
- Si `baseUrl` est vide ou omis, OpenClaw conserve le comportement par défaut de OpenAI (qui correspond à `api.openai.com`).
- Par sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/en/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Models](/en/concepts/models) — configuration et alias de model
- [Model Failover](/en/concepts/model-failover) — chaînes de repli et comportement de réessai
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults) — clés de configuration de model
- [Providers](/en/providers) — guides de configuration par provider

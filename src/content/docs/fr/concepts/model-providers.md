---
summary: "Aperçu des fournisseurs de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Fournisseurs de modèles"
---

# Fournisseurs de modèles

Cette page traite des **fournisseurs de modèles/LLM** (et non des canaux de discussion comme WhatsApp/Telegram).
Pour les règles de sélection de modèles, voir [/concepts/models](/fr/concepts/models).

## Règles rapides

- Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Les règles d'exécution de repli, les sondages de refroidissement et la persistance des remplacements de session sont
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
  `supportsAdaptiveThinking`, `supportsMaxThinking`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`, et
  `onModelSelected`.
- Remarque : le `capabilities` d'exécution du fournisseur est des métadonnées partagées du runner (famille de
  fournisseurs, particularités de transcription/outillage, indices de transport/cache). Ce n'est pas la
  même chose que le [modèle de capacité publique](/fr/plugins/architecture#public-capability-model)
  qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).
- Le fournisseur `codex` inclus est associé au harnais d'agent Codex inclus.
  Utilisez `codex/gpt-*` lorsque vous souhaitez une connexion propriétaire de Codex, la découverte de modèles, la reprise native de thread et l'exécution du serveur d'application. Les références simples `openai/gpt-*` continuent d'utiliser le fournisseur OpenAI et le transport normal du fournisseur OpenClaw.
  Les déploiements Codex uniquement peuvent désactiver le basculement automatique vers PI avec
  `agents.defaults.embeddedHarness.fallback: "none"` ; voir
  [Codex Harness](/fr/plugins/codex-harness).

## Comportement du fournisseur détenu par le plugin

Les plugins de fournisseur (provider plugins) peuvent maintenant posséder la majeure partie de la logique spécifique au fournisseur tandis que OpenClaw conserve la boucle d'inférence générique.

Répartition typique :

- `auth[].run` / `auth[].runNonInteractive` : le fournisseur possède les flux d'intégration/de connexion
  pour `openclaw onboard`, `openclaw models auth` et la configuration sans interface
- `wizard.setup` / `wizard.modelPicker` : le fournisseur possède les étiquettes de choix d'authentification,
  les alias hérités, les indices de liste d'autorisation d'intégration et les entrées de configuration dans les sélecteurs de modèles/d'intégration
- `catalog` : le fournisseur apparaît dans `models.providers`
- `normalizeModelId` : le fournisseur normalise les ID de modèle hérités/preview avant
  la recherche ou la canonicalisation
- `normalizeTransport` : le fournisseur normalise `api` / `baseUrl` de la famille de transport
  avant l'assemblage générique du modèle ; OpenClaw vérifie d'abord le fournisseur correspondant,
  puis d'autres plugins de fournisseur compatibles avec les hooks jusqu'à ce que l'un change réellement le transport
- `normalizeConfig` : le fournisseur normalise la configuration `models.providers.<id>` avant
  que l'exécution ne l'utilise ; OpenClaw vérifie d'abord le fournisseur correspondant, puis d'autres
  plugins de fournisseur compatibles avec les hooks jusqu'à ce que l'un modifie réellement la configuration. Si aucun
  hook de fournisseur ne réécrit la configuration, les assistants de famille Google inclus normalisent toujours
  les entrées de fournisseur Google prises en charge.
- `applyNativeStreamingUsageCompat` : le fournisseur applique des réécritures de compatibilité d'utilisation du flux natif pilotées par le point de terminaison pour les fournisseurs de configuration
- `resolveConfigApiKey` : le fournisseur résout l'authentification par marqueur d'environnement pour les fournisseurs de configuration
  sans forcer le chargement complet de l'authentification d'exécution. `amazon-bedrock` possède également un
  résolveur de marqueur d'environnement AWS intégré ici, même si l'authentification d'exécution Bedrock utilise
  la chaîne par défaut du SDK AWS.
- `resolveSyntheticAuth` : le provider peut exposer une disponibilité d'authentification locale/auto-hébergée ou autre basée sur la configuration sans persister de secrets en texte brut
- `shouldDeferSyntheticProfileAuth` : le provider peut marquer les espaces réservés de profil synthétique stockés comme ayant une priorité inférieure à celle de l'authentification basée sur l'environnement/la configuration
- `resolveDynamicModel` : le provider accepte les IDs de model non présents dans le catalogue statique local pour l'instant
- `prepareDynamicModel` : le provider a besoin d'une actualisation des métadonnées avant de réessayer la résolution dynamique
- `normalizeResolvedModel` : le provider a besoin de réécritures du transport ou de l'URL de base
- `contributeResolvedModelCompat` : le provider fournit des indicateurs de compatibilité pour ses models de fournisseur même lorsqu'ils arrivent via un autre transport compatible
- `capabilities` : le provider publie les particularités de la transcription/outil/famille de providers
- `normalizeToolSchemas` : le provider nettoie les schémas d'outils avant que le runner intégré ne les voie
- `inspectToolSchemas` : le provider expose des avertissements de schéma spécifiques au transport après la normalisation
- `resolveReasoningOutputMode` : le provider choisit les contrats de sortie de raisonnement natifs ou balisés
- `prepareExtraParams` : le provider définit par défaut ou normalise les paramètres de requête par model
- `createStreamFn` : le provider remplace le chemin de flux normal par un transport entièrement personnalisé
- `wrapStreamFn` : le provider applique des en-têtes/corps de requête/garanties de compatibilité de model
- `resolveTransportTurnState` : le provider fournit des en-têtes ou des métadonnées de transport natifs par tour
- `resolveWebSocketSessionPolicy` : le provider fournit des en-têtes de session WebSocket natifs ou une politique de refroidissement de session
- `createEmbeddingProvider` : le provider gère le comportement d'intégration en mémoire lorsqu'il appartient au plugin du provider plutôt qu'au standard d'intégration central
- `formatApiKey` : le provider formate les profils d'authentification stockés dans la chaîne d'exécution `apiKey` attendue par le transport
- `refreshOAuth` : le provider gère le rafraîchissement OAuth lorsque les rafraîchisseurs partagés `pi-ai` ne suffisent pas
- `buildAuthDoctorHint` : le provider ajoute des conseils de réparation lorsque le rafraîchissement OAuth échoue
- `matchesContextOverflowError` : le provider reconnaît les erreurs de dépassement de fenêtre de contexte spécifiques au provider que les heuristiques génériques manqueraient
- `classifyFailoverReason` : le provider mappe les erreurs brutes de transport/API spécifiques au provider à des raisons de basculement telles que la limitation de débit ou la surcharge
- `isCacheTtlEligible` : le provider décide quels identifiants de model en amont prennent en charge le TTL du cache de prompt
- `buildMissingAuthMessage` : le provider remplace l'erreur générique du magasin d'authentification par un indice de récupération spécifique au provider
- `suppressBuiltInModel` : le provider masque les lignes en amont obsolètes et peut renvoyer une erreur propriétaire au fournisseur pour les échecs de résolution directs
- `augmentModelCatalog` : le provider ajoute des lignes de catalogue synthétiques/finales après la découverte et la fusion de la configuration
- `isBinaryThinking` : le provider gère l'UX de réflexion binaire activée/désactivée
- `supportsXHighThinking` : le provider active les models sélectionnés pour `xhigh`
- `supportsAdaptiveThinking` : le provider active les models sélectionnés pour `adaptive`
- `supportsMaxThinking` : le provider active les models sélectionnés pour `max`
- `resolveDefaultThinkingLevel` : le provider possède la politique `/think` par défaut pour une famille de models
- `applyConfigDefaults` : le provider applique des valeurs par défaut globales spécifiques au provider lors de la matérialisation de la configuration en fonction du mode d'authentification, de l'environnement ou de la famille de models
- `isModernModelRef` : le provider gère la correspondance du model préféré en direct/test
- `prepareRuntimeAuth` : le provider transforme une information d'identification configurée en un jeton d'exécution de courte durée
- `resolveUsageAuth` : le provider résout les informations d'identification d'utilisation/quota pour `/usage` et les surfaces d'état et de rapport associées
- `fetchUsageSnapshot` : le provider gère la récupération/analyse du point de terminaison d'utilisation tandis que le cœur gère toujours le shell récapitulatif et le formatage
- `onModelSelected` : le provider exécute des effets secondaires après la sélection, tels que la télémétrie ou la tenue de session propriétaire au provider

Exemples groupés actuels :

- `anthropic` : repli de compatibilité avant pour Claude 4.6, indices de réparation d'authentification, récupération du point de terminaison d'utilisation, métadonnées de cache-TTL/famille de provider, et valeurs par défaut de configuration globale sensibles à l'authentification
- `amazon-bedrock` : correspondance du dépassement de contexte appartenant au provider et classification des raisons d'échec pour les erreurs de limitation/not-ready spécifiques à Bedrock, ainsi que la famille de réessai partagée `anthropic-by-model` pour les gardes de stratégie de réessai exclusives à Claude sur le trafic Anthropic
- `anthropic-vertex` : gardes de stratégie de réessai exclusives à Claude sur le trafic de messages Anthropic
- `openrouter` : ids de modèle en mode transparent, enveloppes de requêtes, indices de capacité du provider, nettoyage de la signature de pensée Gemini sur le trafic proxy Gemini, injection de raisonnement proxy via la famille de flux `openrouter-thinking`, transfert des métadonnées de routage, et politique de cache-TTL
- `github-copilot` : onboarding/connexion par appareil, repli de compatibilité avant de modèle, indices de transcription de pensée Claude, échange de jeton d'exécution, et récupération du point de terminaison d'utilisation
- `openai` : repli de compatibilité avant pour GPT-5.4, normalisation du transport direct OpenAI, indices d'auth manquante compatibles Codex, suppression Spark, lignes de catalogue synthétiques OpenAI/Codex, stratégie de modèle de réflexion/live, normalisation d'alias de jeton d'utilisation (familles `input` / `output` et `prompt` / `completion`), la famille de flux partagée `openai-responses-defaults` pour les enveloppes natives OpenAI/Codex, métadonnées de famille de provider, inscription groupée de provider de génération d'images pour `gpt-image-1`, et inscription groupée de provider de génération de vidéos pour `sora-2`
- `google` et `google-gemini-cli` : repli de compatibilité future Gemini 3.1,
  validation de relecture native Gemini, assainissement de la relecture d'amorçage, mode de
  sortie de raisonnement étiqueté, correspondance de modèle moderne, enregistrement de provider
  de génération d'images groupé pour les modèles d'aperçu d'images Gemini et enregistrement de
  provider de génération vidéo groupé pour les modèles Veo ; le CLI OAuth Gemini possède
  également le formatage des jetons de profil d'authentification, l'analyse des jetons d'utilisation et la récupération du
  point de terminaison de quota pour les surfaces d'utilisation
- `moonshot` : transport partagé, normalisation de la charge utile de réflexion détenue par le plugin
- `kilocode` : transport partagé, en-têtes de requête détenus par le plugin, normalisation de la charge utile de
  raisonnement, assainissement de la signature de pensée proxy-Gemini et politique
  de cache-TTL
- `zai` : repli de compatibilité future GLM-5, valeurs par défaut `tool_stream`, politique de
  cache-TTL, politique de binaire-thinking/live-model, et authentification d'utilisation + récupération de quota ;
  les ids `glm-5*` inconnus sont synthétisés à partir du modèle `glm-4.7` groupé
- `xai` : normalisation du transport Responses natif, réécritures d'alias `/fast` pour
  les variantes rapides Grok, `tool_stream` par défaut, nettoyage du schéma d'outil / de la
  charge utile de raisonnement spécifique à xAI, et enregistrement de provider de
  génération vidéo groupé pour `grok-imagine-video`
- `mistral` : métadonnées de capacité détenues par le plugin
- `opencode` et `opencode-go` : métadonnées de capacité détenues par le plugin plus
  assainissement de la signature de pensée proxy-Gemini
- `alibaba` : catalogue de génération vidéo détenu par le plugin pour les références directes de modèle Wan
  telles que `alibaba/wan2.6-t2v`
- `byteplus` : catalogues détenus par le plugin plus enregistrement de provider de
  génération vidéo groupé pour les modèles texte-vidéo/image-vidéo Seedance
- `fal` : enregistrement de provider de génération vidéo groupé pour l'enregistrement de provider
  de génération d'images tiers hébergé pour les modèles d'images FLUX plus enregistrement
  de provider de génération vidéo groupé pour les modèles vidéo tiers hébergés
- `cloudflare-ai-gateway`, `huggingface`, `kimi`, `nvidia`, `qianfan`,
  `stepfun`, `synthetic`, `venice`, `vercel-ai-gateway` et `volcengine` :
  catalogues appartenant exclusivement aux plugins
- `qwen` : catalogues appartenant aux plugins pour les modèles de texte plus des enregistrements de provider partagés pour la compréhension de média et la génération vidéo pour ses surfaces multimodales ; la génération vidéo Qwen utilise les points de terminaison vidéo Standard DashScope avec des modèles Wan groupés tels que `wan2.6-t2v` et `wan2.7-r2v`
- `runway` : enregistrement de provider de génération vidéo appartenant au plugin pour les modèles natifs basés sur des tâches Runway tels que `gen4.5`
- `minimax` : catalogues appartenant aux plugins, enregistrement de provider de génération vidéo groupé pour les modèles vidéo Hailuo, enregistrement de provider de génération d'image groupé pour `image-01`, sélection de politique de relecture hybride Anthropic/OpenAI, et logique d'authentification/snapshot d'utilisation
- `together` : catalogues appartenant aux plugins plus enregistrement de provider de génération vidéo groupé pour les modèles vidéo Wan
- `xiaomi` : catalogues appartenant aux plugins plus logique d'authentification/snapshot d'utilisation

Le plugin groupé `openai` possède désormais les deux id de provider : `openai` et
`openai-codex`.

Cela couvre les providers qui s'intègrent toujours aux transports normaux de OpenClaw. Un provider qui a besoin d'un exécuteur de requête totalement personnalisé est une surface d'extension séparée et plus profonde.

## Rotation de clé API

- Prend en charge la rotation générique de provider pour les providers sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, ex. `<PROVIDER>_API_KEY_1`)
- Pour les providers Google, `GOOGLE_API_KEY` est également inclus en tant que secours.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les demandes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de débit (par
  exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many
concurrent requests`, `ThrottlingException`, `concurrency limit reached`,
  `workers_ai ... quota limit exceeded`, ou messages périodiques de limite d'utilisation).
- Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi‑ai. Ces fournisseurs ne nécessitent **aucune**
configuration `models.providers` ; définissez simplement l'authentification et choisissez un modèle.

### OpenAI

- Fournisseur : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, ainsi que `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket en priorité, repli sur SSE)
- Remplacer par modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- Le préchauffage WebSocket des réponses OpenAI est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les requêtes directes de réponses `openai/*` à `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`,
  `User-Agent`) s'appliquent uniquement au trafic natif OpenAI vers `api.openai.com`, et non
  aux proxies compatibles OpenAI génériques
- Les routes natives OpenAI conservent également les Réponses `store`, les indications de cache de prompt (prompt-cache), et
  le formatage de charge utile compatible avec le raisonnement OpenAI ; les routes proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'OpenAI API en direct le refuse ; Spark est traité comme exclusivement Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de modèle : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les demandes publiques directes Anthropic prennent en charge le commutateur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- Remarque Anthropic : Le personnel de Anthropic nous a informé que l'utilisation du CLI Claude de style OpenClaw est à nouveau autorisée, donc CLI considère la réutilisation du CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si OpenClaw publie une nouvelle politique.
- Le jeton de configuration (setup-token) Anthropic reste disponible en tant que chemin de jeton pris en charge pour OpenClaw, mais OpenClaw préfère désormais la réutilisation du CLI Claude et `claude -p` lorsqu'ils sont disponibles.

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
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer par modèle via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- `params.serviceTier` est également transféré lors des requêtes natives Codex Responses (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`,
  `User-Agent`) sont uniquement attachés au trafic natif Codex vers
  `chatgpt.com/backend-api`, et non aux proxies compatibles OpenAI génériques
- Partage le même bouton `/fast` et la même configuration `params.fastMode` que `openai/*` direct ; OpenClaw associe cela à `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue Codex OAuth l'expose ; dépend des droits d'utilisation
- `openai-codex/gpt-5.4` conserve le `contextWindow = 1050000` natif et une limite d'exécution `contextTokens = 272000` par défaut ; remplacez la limite d'exécution par `models.providers.openai-codex.models[].contextTokens`
- Note de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/flux de travail externes comme OpenClaw.

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

- [Qwen Cloud](/fr/providers/qwen) : surface du provider Qwen Cloud plus mappage des points de terminaison Alibaba DashScope et Coding Plan
- [MiniMax](/fr/providers/minimax) : accès MiniMax ou clé OAuth pour API Coding Plan
- [Modèles GLM](/fr/providers/glm) : Z.AI Coding Plan ou points de terminaison API généraux

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Provider d'exécution Zen : `opencode`
- Provider d'exécution Go : `opencode-go`
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
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, repli `GOOGLE_API_KEY` et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Modèles exemples : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration OpenClaw héritée utilisant `google/gemini-3.1-flash-preview` est normalisée en `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Les exécutions Gemini directes acceptent également `agents.defaults.models["google/<model>"].params.cachedContent`
  (ou l'ancien `cached_content`) pour transmettre un gestionnaire
  `cachedContents/...` natif du fournisseur ; les accès au cache Gemini apparaissent comme OpenClaw `cacheRead`

### Google Vertex et Gemini CLI

- Fournisseurs : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Gemini CLI utilise son propre flux OAuth
- Attention : le CLI OAuth de Gemini dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions de compte Google après avoir utilisé des clients tiers. Consultez les conditions d'utilisation de Google et utilisez un compte non critique si vous choisissez de continuer.
- Le CLI OAuth de Gemini est fourni dans le cadre du plugin groupé `google`.
  - Installez d'abord Gemini CLI :
    - `brew install gemini-cli`
    - ou `npm install -g @google/gemini-cli`
  - Activer : `openclaw plugins enable google`
  - Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
  - Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`
  - Remarque : vous ne devez **pas** coller un identifiant client ou un secret dans `openclaw.json`. Le flux de connexion CLI stocke
    des jetons dans des profils d'authentification sur l'hôte de la passerelle.
  - Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  - Les réponses JSON de la CLI Gemini sont analysées à partir de `response` ; l'utilisation revient à
    `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de modèle : `zai/glm-5.1`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` se normalisent en `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Fournisseur : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemple de modèle : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Fournisseur : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de modèle : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte
  `https://api.kilo.ai/api/gateway/models` en direct peut étendre davantage le catalogue
  d'exécution.
- Le routage exact en amont derrière `kilocode/kilo/auto` est géré par Kilo Gateway,
  et n'est pas codé en dur dans OpenClaw.

Consultez [/providers/kilocode](/fr/providers/kilocode) pour les détails de la configuration.

### Autres plugins de fournisseur groupés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Exemple de modèle : `openrouter/auto`
- OpenClaw applique les en-têtes d'attribution d'application documentés de OpenRouter uniquement lorsque
  la requête cible réellement `openrouter.ai`
- Les marqueurs `cache_control` spécifiques à OpenRouter Anthropic sont également limités aux
  routes OpenRouter vérifiées, et non aux URL de proxy arbitraires
- OpenRouter reste sur le chemin compatible OpenAI de style proxy, donc le formatage
  de requête natif uniquement OpenAI (`serviceTier`, Responses `store`,
  indices de cache de prompt, payloads de compatibilité de raisonnement OpenAI) n'est pas transmis
- Les références OpenRouter basées sur Gemini conservent uniquement le nettoyage des signatures de pensées proxy-Gemini ;
  la validation de relecture Gemini native et les réécritures de bootstrap restent désactivées
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Exemple de modèle : `kilocode/kilo/auto`
- Les références Kilo basées sur Gemini conservent le même chemin de nettoyage des signatures de pensées proxy-Gemini ;
  `kilocode/kilo/auto` et d'autres indices non pris en charge par le proxy de raisonnement ignorent l'injection de raisonnement proxy
- MiniMax : `minimax` (clé API) et `minimax-portal` (OAuth)
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`
- Exemple de modèle : `minimax/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7`
- La configuration d'onboarding/de clé MiniMax de API écrit des définitions de modèle M2.7 explicites avec `input: ["text", "image"]` ; le catalogue de fournisseurs inclus conserve les références de chat en texte uniquement jusqu'à ce que la configuration de ce fournisseur soit matérialisée
- Moonshot : `moonshot` (`MOONSHOT_API_KEY`)
- Exemple de modèle : `moonshot/kimi-k2.6`
- Kimi Coding : `kimi` (`KIMI_API_KEY` ou `KIMICODE_API_KEY`)
- Exemple de modèle : `kimi/kimi-code`
- Qianfan : `qianfan` (`QIANFAN_API_KEY`)
- Exemple de modèle : `qianfan/deepseek-v3.2`
- Qwen Cloud : `qwen` (`QWEN_API_KEY`, `MODELSTUDIO_API_KEY` ou `DASHSCOPE_API_KEY`)
- Exemple de modèle : `qwen/qwen3.5-plus`
- NVIDIA : `nvidia` (`NVIDIA_API_KEY`)
- Exemple de modèle : `nvidia/nvidia/llama-3.1-nemotron-70b-instruct`
- StepFun : `stepfun` / `stepfun-plan` (`STEPFUN_API_KEY`)
- Exemples de modèles : `stepfun/step-3.5-flash`, `stepfun-plan/step-3.5-flash-2603`
- Together : `together` (`TOGETHER_API_KEY`)
- Exemple de modèle : `together/moonshotai/Kimi-K2.5`
- Venice : `venice` (`VENICE_API_KEY`)
- Xiaomi : `xiaomi` (`XIAOMI_API_KEY`)
- Exemple de modèle : `xiaomi/mimo-v2-flash`
- Vercel AI Gateway : `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Hugging Face Inference : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`)
- Cloudflare AI Gateway : `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine : `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- Exemple de modèle : `volcengine-plan/ark-code-latest`
- BytePlus : `byteplus` (`BYTEPLUS_API_KEY`)
- Exemple de modèle : `byteplus-plan/ark-code-latest`
- xAI : `xai` (`XAI_API_KEY`)
  - Les requêtes xAI groupées natives utilisent le chemin de réponses xAI
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
- Modèle exemple d'inférence Hugging Face : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inference)](/fr/providers/huggingface).

## Providers via `models.providers` (URL personnalisée/base)

Utilisez `models.providers` (ou `models.json`) pour ajouter des providers **personnalisés** ou
des proxies compatibles OpenAI/Anthropic.

La plupart des plugins de providers groupés ci-dessous publient déjà un catalogue par défaut.
Utilisez des entrées explicites `models.providers.<id>` uniquement lorsque vous souhaitez remplacer l'
URL de base par défaut, les en-têtes ou la liste des modèles.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de provider groupé. Utilisez le provider intégré par
défaut, et ajoutez une entrée explicite `models.providers.moonshot` uniquement lorsque vous
avez besoin de remplacer l'URL de base ou les métadonnées du modèle :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Modèle exemple : `moonshot/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice moonshot-api-key` ou `openclaw onboard --auth-choice moonshot-api-key-cn`

ID des modèles Kimi K2 :

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
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

L'intégration (onboarding) utilise par défaut l'interface de codage, mais le catalogue
général `volcengine/*` est enregistré en même temps.

Dans les sélecteurs de modèle d'intégration/configuration, le choix d'authentification Volcengine
privilégie les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas
encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un
sélecteur limité au fournisseur vide.

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

L'intégration (onboarding) utilise par défaut l'interface de codage, mais le catalogue
général `byteplus/*` est enregistré en même temps.

Dans l'intégration/configuration des sélecteurs de modèles, le choix d'authentification BytePlus préfère à la fois les lignes `byteplus/*` et `byteplus-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient par défaut au catalogue non filtré au lieu d'afficher un sélecteur limité au fournisseur vide.

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

Synthetic fournit des modèles compatibles avec Anthropic via le fournisseur `synthetic` :

- Fournisseur : `synthetic`
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

Sur le chemin de streaming compatible avec MiniMax de Anthropic, OpenClaw désactive la réflexion par défaut, sauf si vous la définissez explicitement, et `/fast on` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut de texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01` détenue par le plugin sur les deux chemins d'authentification MiniMax
- La recherche Web reste sur l'id de fournisseur `minimax`

### LM Studio

LM Studio est fourni en tant que plugin de fournisseur groupé qui utilise l'API native :

- Fournisseur : `lmstudio`
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
pour la découverte + le chargement automatique, avec `/v1/chat/completions` pour l'inférence par défaut.
Voir [/providers/lmstudio](/fr/providers/lmstudio) pour la configuration et le dépannage.

### Ollama

Ollama est fourni en tant que plugin de fournisseur groupé et utilise l'Ollama native de API :

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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous optez pour
`OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute Ollama directement à
`openclaw onboard` et au sélecteur de modèle. Voir [/providers/ollama](/fr/providers/ollama)
pour l'intégration, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs locaux/auto-hébergés compatibles avec OpenAI :

- Fournisseur : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour opter pour la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification) :

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

Voir [/providers/vllm](/fr/providers/vllm) pour les détails.

### SGLang

SGLang est fourni en tant que plugin de fournisseur groupé pour des serveurs auto-hébergés rapides
compatibles avec OpenAI :

- Fournisseur : `sglang`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour opter pour la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification) :

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

Voir [/providers/sglang](/fr/providers/sglang) pour les détails.

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

- Pour les providers personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont optionnels.
  Lorsqu'ils sont omis, OpenClaw utilise par défaut :
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recommandé : définissez des valeurs explicites qui correspondent aux limites de votre proxy/modèle.
- Pour `api: "openai-completions"` sur des points de terminaison non natifs (tout `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider dues aux rôles `developer` non pris en charge.
- Les routes de type proxy compatibles OpenAI ignorent également le façonnage de requête natif exclusif à OpenAI : pas de `service_tier`, pas de `store` Responses, pas d'indices de cache de prompt, pas de façonnage de payload de compatibilité de raisonnement OpenAI, et pas d'en-têtes d'attribution OpenClaw cachés.
- Si `baseUrl` est vide ou omis, OpenClaw conserve le comportement par défaut de OpenAI (qui résout vers `api.openai.com`).
- Par sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/fr/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Models](/fr/concepts/models) — configuration et alias des modèles
- [Model Failover](/fr/concepts/model-failover) — chaînes de repli et comportement de nouvelle tentative
- [Configuration Reference](/fr/gateway/configuration-reference#agent-defaults) — clés de configuration des modèles
- [Providers](/fr/providers) — guides de configuration par provider

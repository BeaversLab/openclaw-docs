---
summary: "Aperçu des providers de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Providers de modèles"
---

# Fournisseurs de modèles

Cette page couvre les **providers de modèles/LLM** (et non les salons de discussion tels que WhatsApp/Telegram).
Pour les règles de sélection de modèles, voir [/concepts/models](/en/concepts/models).

## Règles rapides

- Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
- Les plugins de provider peuvent injecter des catalogues de modèles via `registerProvider({ catalog })` ;
  OpenClaw fusionne cette sortie dans `models.providers` avant d'écrire
  `models.json`.
- Les manifestes de fournisseur peuvent déclarer `providerAuthEnvVars` afin que les sondages d'authentification génériques basés sur les variables d'environnement n'aient pas besoin de charger le runtime du plugin. La carte principale des variables d'environnement restante est désormais réservée aux fournisseurs non-plugins/principaux et à quelques cas de précédence générique, tels que l'intégration Anthropic avec priorité à la clé API.
- Les plugins de fournisseur peuvent également définir le comportement d'exécution du fournisseur via
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`,
  `refreshOAuth`, `buildAuthDoctorHint`,
  `isCacheTtlEligible`, `buildMissingAuthMessage`,
  `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`,
  `supportsXHighThinking`, `resolveDefaultThinkingLevel`,
  `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth` et
  `fetchUsageSnapshot`.
- Remarque : le runtime du provider `capabilities` est des métadonnées partagées du runner (famille de providers, particularités de transcription/outils, indications de transport/cache). Ce n'est pas la même chose que le [modèle de capacité publique](/en/plugins/architecture#public-capability-model) qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).

## Comportement des providers possédés par plugin

Les plugins de provider peuvent désormais gérer la plupart de la logique spécifique au provider tandis que OpenClaw conserve
la boucle d'inférence générique.

Répartition typique :

- `auth[].run` / `auth[].runNonInteractive` : le fournisseur possède les flux d'intégration/connexion
  pour `openclaw onboard`, `openclaw models auth`, et la configuration sans interface (headless)
- `wizard.setup` / `wizard.modelPicker` : le fournisseur possède les libellés de choix d'authentification,
  les alias hérités, les indications de liste d'autorisation d'intégration, et les entrées de configuration dans les sélecteurs d'intégration/de modèles
- `catalog` : le fournisseur apparaît dans `models.providers`
- `resolveDynamicModel` : le fournisseur accepte les identifiants de modèles non présents dans le
  catalogue statique local
- `prepareDynamicModel` : le fournisseur a besoin d'une actualisation des métadonnées avant de réessayer
  résolution dynamique
- `normalizeResolvedModel` : le fournisseur a besoin d'une réécriture du transport ou de l'URL de base
- `capabilities` : le fournisseur publie les particularités de la transcription/de l'outillage/de la famille de fournisseurs
- `prepareExtraParams` : le fournisseur définit par défaut ou normalise les paramètres de requête par modèle
- `wrapStreamFn` : le fournisseur applique les en-têtes/corps de requête/wrappers de compatibilité de modèle
- `formatApiKey` : le fournisseur formate les profils d'authentification stockés dans la chaîne
  `apiKey` attendue par le transport
- `refreshOAuth` : le fournisseur gère le rafraîchissement OAuth lorsque les rafraîchissements
  partagés `pi-ai` ne suffisent pas
- `buildAuthDoctorHint` : le fournisseur ajoute des conseils de réparation lorsque le rafraîchissement OAuth
  échoue
- `isCacheTtlEligible` : le fournisseur décide quels identifiants de modèles en amont prennent en charge le TTL du cache de prompt
- `buildMissingAuthMessage` : le fournisseur remplace l'erreur générique du magasin d'authentification
  par un indice de récupération spécifique au fournisseur
- `suppressBuiltInModel` : le fournisseur masque les lignes en amont obsolètes et peut renvoyer une
  erreur appartenant au fournisseur pour les échecs de résolution directe
- `augmentModelCatalog` : le fournisseur ajoute des lignes de catalogue synthétiques/finales après
  la découverte et la fusion de la configuration
- `isBinaryThinking` : le fournisseur gère l'UX de réflexion binaire activée/désactivée
- `supportsXHighThinking` : le fournisseur opte pour les modèles sélectionnés dans `xhigh`
- `resolveDefaultThinkingLevel` : le fournisseur gère la stratégie par défaut `/think` pour une
  famille de modèles
- `isModernModelRef` : le fournisseur gère la correspondance du modèle préféré en direct/par test de fumée
- `prepareRuntimeAuth` : le fournisseur convertit une information d'identification configurée en un jeton d'exécution à courte durée de vie
- `resolveUsageAuth` : le fournisseur résout les informations d'identification d'utilisation/quota pour `/usage` et les surfaces connexes de statut/rapport
- `fetchUsageSnapshot` : le fournisseur gère la récupération/l'analyse du point de terminaison d'utilisation, tandis que le cœur gère toujours le shell de synthèse et le formatage

Exemples groupés actuels :

- `anthropic` : repli de compatibilité ascendante Claude 4.6, indices de réparation d'authentification, récupération du point de terminaison d'utilisation et métadonnées de cache-TTL/famille de fournisseurs
- `openrouter` : identifiants de modèle transmis (pass-through), wrappers de requête, indices de capacité du fournisseur et politique de cache-TTL
- `github-copilot` : onboarding/connexion par appareil, repli de compatibilité ascendante de modèle, indices de transcription de réflexion Claude (thinking), échange de jeton d'exécution et récupération du point de terminaison d'utilisation
- `openai` : repli de compatibilité ascendante GPT-5.4, transport direct OpenAI, normalisation, indices d'auth manquante conscients de Codex, suppression Spark, lignes de catalogue synthétiques OpenAI/Codex, stratégie de modèle pensant/en direct et métadonnées de famille de provider
- `google` et `google-gemini-cli` : repli de compatibilité ascendante Gemini 3.1 et correspondance de modèle moderne ; CLI OAuth Gemini gère également le formatage des jetons de profil d'auth, l'analyse des jetons d'utilisation et la récupération du point de terminaison de quota pour les surfaces d'utilisation
- `moonshot` : transport partagé, normalisation de la charge utile de réflexion (thinking) appartenant au plugin
- `kilocode` : transport partagé, en-têtes de requête appartenant au plugin, normalisation de la charge utile de raisonnement, indices de transcription Gemini et stratégie de cache-TTL
- `zai` : compatibilité amont GLM-5, valeurs par défaut `tool_stream`, stratégie de TTL de cache, stratégie de réflexion binaire/modèle en direct, et récupération de l'autorisation d'utilisation + des quotas
- `mistral`, `opencode` et `opencode-go` : métadonnées de capacité détenues par le plugin
- `byteplus`, `cloudflare-ai-gateway`, `huggingface`, `kimi-coding`,
  `modelstudio`, `nvidia`, `qianfan`, `synthetic`, `together`, `venice`,
  `vercel-ai-gateway` et `volcengine` : catalogues détenus par le plugin uniquement
- `minimax` et `xiaomi` : catalogues appartenant au plugin plus logique d'authentification/snapshot d'utilisation

Le plugin intégré `openai` possède désormais les deux identifiants de fournisseur : `openai` et
`openai-codex`.

Cela couvre les fournisseurs qui s'intègrent toujours aux transports normaux de OpenClaw. Un fournisseur
qui a besoin d'un exécuteur de requêtes totalement personnalisé constitue une surface d'extension distincte et plus approfondie.

## Rotation de la clé API

- Prend en charge la rotation générique de fournisseur pour les fournisseurs sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, par ex. `<PROVIDER>_API_KEY_1`)
- Pour les fournisseurs Google, `GOOGLE_API_KEY` est également inclus en repli.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les requêtes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de taux (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`).
- Les échecs non liés à la limitation de taux échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi‑ai. Ces fournisseurs ne nécessitent **aucune** configuration `models.providers` ; il suffit de définir l'authentification et de choisir un model.

### OpenAI

- Fournisseur : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Modèles exemples : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket en priorité, repli sur SSE)
- Remplacer par modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- Le préchauffage WebSocket pour OpenAI Responses est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les demandes directes de `openai/*` Responses vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'OpenAI API en direct la rejette ; Spark est traité comme exclusivement Codex

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Provider : `anthropic`
- Auth : `ANTHROPIC_API_KEY` ou `claude setup-token`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de modèle : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice token` (coller le jeton de configuration) ou `openclaw models auth paste-token --provider anthropic`
- Les demandes publiques directes vers Anthropic prennent en charge l'interrupteur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API ou OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- Remarque de politique : la prise en charge du jeton de configuration est une compatibilité technique ; Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code dans le passé. Vérifiez les conditions actuelles de Anthropic et décidez en fonction de votre tolérance au risque.
- Recommandation : l'authentification par clé Anthropic API est la voie la plus sûre et recommandée par rapport à l'authentification par jeton de configuration d'abonnement.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Code (Codex)

- Provider : `openai-codex`
- Auth : OAuth (ChatGPT)
- Exemple de modèle : `openai-codex/gpt-5.4`
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes de réponses Codex natives (`chatgpt.com/backend-api`)
- Partage le même commutateur `/fast` et la configuration `params.fastMode` que `openai/*` direct ; OpenClaw l'associe à `service_tier=priority`
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue Codex OAuth l'expose ; dépend des droits
- Remarque de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/workflows externes comme OpenClaw.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

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
- Compatibilité : la configuration héritée OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`

### Google Vertex et Gemini CLI

- Fournisseurs : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Gemini CLI utilise son propre flux OAuth
- Attention : Gemini CLI OAuth dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions sur leur compte Google après avoir utilisé des clients tiers. Consultez les conditions d'utilisation de Google et utilisez un compte non critique si vous choisissez de poursuivre.
- Gemini CLI OAuth est fourni dans le cadre du plugin groupé `google`.
  - Activer : `openclaw plugins enable google`
  - Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
  - Remarque : vous ne devez **pas** coller un identifiant client ou un secret dans `openclaw.json`. Le flux de connexion CLI stocke
    les jetons dans les profils d'authentification sur l'hôte de la passerelle.

### Z.AI (GLM)

- Provider : `zai`
- Auth : `ZAI_API_KEY`
- Modèle exemple : `zai/glm-5`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Les alias `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`

### Vercel AI Gateway

- Provider : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Modèle exemple : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Modèle exemple : `kilocode/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --kilocode-api-key <key>`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue intégré étendu comprend GLM-5 Free, MiniMax M2.7 Free, GPT-5.2, Gemini 3 Pro Preview, Gemini 3 Flash Preview, Grok Code Fast 1 et Kimi K2.5.

Consultez [/providers/kilocode](/en/providers/kilocode) pour les détails de configuration.

### Autres plugins de provider groupés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Modèle exemple : `openrouter/anthropic/claude-sonnet-4-6`
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Modèle exemple : `kilocode/anthropic/claude-opus-4.6`
- MiniMax : `minimax` (`MINIMAX_API_KEY`)
- Moonshot : `moonshot` (`MOONSHOT_API_KEY`)
- Kimi Coding : `kimi-coding` (`KIMI_API_KEY` ou `KIMICODE_API_KEY`)
- Qianfan : `qianfan` (`QIANFAN_API_KEY`)
- Model Studio : `modelstudio` (`MODELSTUDIO_API_KEY`)
- NVIDIA : `nvidia` (`NVIDIA_API_KEY`)
- Together : `together` (`TOGETHER_API_KEY`)
- Venice : `venice` (`VENICE_API_KEY`)
- Xiaomi : `xiaomi` (`XIAOMI_API_KEY`)
- Vercel AI Gateway : `vercel-ai-gateway` (`AI_GATEWAY_API_KEY`)
- Inférence Hugging Face : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`)
- Cloudflare AI Gateway : `cloudflare-ai-gateway` (`CLOUDFLARE_AI_GATEWAY_API_KEY`)
- Volcengine : `volcengine` (`VOLCANO_ENGINE_API_KEY`)
- BytePlus : `byteplus` (`BYTEPLUS_API_KEY`)
- xAI : `xai` (`XAI_API_KEY`)
- Mistral : `mistral` (`MISTRAL_API_KEY`)
- Exemple de model : `mistral/mistral-large-latest`
- CLI : `openclaw onboard --auth-choice mistral-api-key`
- Groq : `groq` (`GROQ_API_KEY`)
- Cerebras : `cerebras` (`CEREBRAS_API_KEY`)
  - Les models GLM sur Cerebras utilisent les identifiants `zai-glm-4.7` et `zai-glm-4.6`.
  - URL de base compatible OpenAI : `https://api.cerebras.ai/v1`.
- GitHub Copilot : `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Exemple de model d'inférence Hugging Face : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inférence)](/en/providers/huggingface).

## Providers via `models.providers` (URL de base personnalisée)

Utilisez `models.providers` (ou `models.json`) pour ajouter des providers **personnalisés** ou des proxies compatibles OpenAI/Anthropic.

La plupart des plugins de provider groupés ci-dessous publient déjà un catalogue par défaut.
Utilisez des entrées explicites `models.providers.<id>` uniquement lorsque vous souhaitez remplacer l'URL de base par défaut, les en-têtes ou la liste des models.

### Moonshot AI (Kimi)

Moonshot utilise des points de terminaison compatibles OpenAI, configurez-le donc comme un provider personnalisé :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Exemple de model : `moonshot/kimi-k2.5`

Identifiants de models Kimi K2 :

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`

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

Kimi Coding utilise le point de terminaison compatible Moonshot de l'IA Anthropic :

- Fournisseur : `kimi-coding`
- Auth : `KIMI_API_KEY`
- Modèle exemple : `kimi-coding/k2p5`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) permet d'accéder à Doubao et à d'autres modèles en Chine.

- Fournisseur : `volcengine` (codage : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Modèle exemple : `volcengine/doubao-seed-1-8-251228`
- CLI : `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

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
- Modèle exemple : `byteplus/seed-1-8-251228`
- CLI : `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

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

Synthetic fournit des modèles compatibles Anthropic via le fournisseur `synthetic` :

- Fournisseur : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Modèle exemple : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
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

- MiniMax (compatible Anthropic) : `--auth-choice minimax-api`
- Auth : `MINIMAX_API_KEY`

Consultez [/providers/minimax](/en/providers/minimax) pour les détails de configuration, les options de modèle et les extraits de configuration.

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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous activez l'option avec
`OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute Ollama directement à
`openclaw onboard` et au sélecteur de modèle. Consultez [/providers/ollama](/en/providers/ollama)
pour l'intégration, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI en auto-hébergement/local :

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

SGLang est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI en auto-hébergement rapide :

- Fournisseur : `sglang`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'impose pas d'authentification) :

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

### Proxies locaux (LM Studio, vLLM, LiteLLM, etc.)

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
- Pour `api: "openai-completions"` sur des points de terminaison non natifs (toute `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
- Si `baseUrl` est vide ou omis, OpenClaw conserve le comportement par défaut de OpenAI (qui résout en `api.openai.com`).
- Pour la sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/en/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Models](/en/concepts/models) — configuration de modèles et alias
- [Model Failover](/en/concepts/model-failover) — chaînes de repli et comportement de réessai
- [Configuration Reference](/en/gateway/configuration-reference#agent-defaults) — clés de configuration de modèle
- [Providers](/en/providers) — guides de configuration par provider

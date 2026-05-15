---
summary: "Auditer ce qui peut coûter de l'argent, quelles clés sont utilisées et comment visualiser l'utilisation"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You're explaining /status or /usage cost reporting
title: "API utilisation et coûts"
---

Ce document répertorie les **fonctionnalités qui peuvent invoquer des clés API** et l'endroit où leurs coûts apparaissent. Il se concentre sur
les fonctionnalités OpenClaw qui peuvent générer une utilisation du provider ou des appels API payants.

## Où les coûts apparaissent (chat + CLI)

**Instantané des coûts par session**

- `/status` affiche le model de session actuel, l'utilisation du contexte et les jetons de la dernière réponse.
- Si le model utilise l'authentification par **clé API**, `/status` affiche également le **coût estimé** pour la dernière réponse.
- Si les métadonnées de la session en direct sont limitées, `/status` peut récupérer les compteurs de jetons/cache
  et l'étiquette du model d'exécution actif à partir de la dernière entrée d'utilisation de la
  transcription. Les valeurs non nulles existantes en direct priment toujours, et les totaux
  de la transcription de taille de prompt peuvent l'emporter lorsque les totaux stockés sont manquants ou inférieurs.

**Pied de page des coûts par message**

- `/usage full` ajoute un pied de page d'utilisation à chaque réponse, y compris le **coût estimé** (clé API uniquement).
- `/usage tokens` affiche uniquement les jetons ; les flux OAuth/token de type abonnement et CLI masquent le coût en dollars.
- Note pour la CLI Gemini : lorsque la CLI renvoie une sortie JSON, OpenClaw lit l'utilisation à partir de
  `stats`, normalise `stats.cached` en `cacheRead` et dérive les jetons d'entrée
  à partir de `stats.input_tokens - stats.cached` si nécessaire.

Note Anthropic : le personnel Anthropic nous a informés que l'utilisation de la OpenClaw Claude style CLI est
à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation `claude -p` comme
autorisée pour cette intégration, sauf si Anthropic publie une nouvelle politique.
Anthropic n'expose toujours pas d'estimation en dollars par message que OpenClaw peut
afficher dans `/usage full`.

**Fenêtres d'utilisation CLI (quotas de provider)**

- `openclaw status --usage` et `openclaw channels list` affichent les **fenêtres d'utilisation** du provider
  (instantanés de quota, et non les coûts par message).
- La sortie humaine est normalisée à `X% left` pour tous les providers.
- Providers actuels des fenêtres d'utilisation : Anthropic, GitHub Copilot, CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.
- Note sur MiniMax : ses champs bruts `usage_percent` / `usagePercent` signifient le quota
  restant, donc OpenClaw les inverse avant l'affichage. Les champs basés sur le nombre prévalent
  toujours lorsqu'ils sont présents. Si le provider renvoie `model_remains`, OpenClaw préfère l'entrée
  du chat-model, dérive l'étiquette de la fenêtre à partir des horodatages si nécessaire, et
  inclut le nom du model dans l'étiquette du plan.
- L'auth d'utilisation pour ces fenêtres de quota provient de hooks spécifiques au provider lorsque
  disponibles ; sinon, OpenClaw revient à faire correspondre les identifiants OAuth/clé API
  à partir des profils d'auth, de l'env ou de la config.

Voir [Token use & costs](/fr/reference/token-use) pour plus de détails et d'exemples.

## Comment les clés sont découvertes

OpenClaw peut récupérer les identifiants à partir de :

- **Profils d'auth** (par agent, stockés dans `auth-profiles.json`).
- **Variables d'environnement** (ex. `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Config** (`models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`,
  `plugins.entries.firecrawl.config.webFetch.apiKey`, `memorySearch.*`,
  `talk.providers.*.apiKey`).
- **Skills** (`skills.entries.<name>.apiKey`) qui peuvent exporter des clés vers l'env du processus de skill.

## Fonctionnalités pouvant dépenser des clés

### 1) Réponses du model principal (chat + outils)

Chaque réponse ou appel d'outil utilise le **provider model actuel** (OpenAI, Anthropic, etc). C'est la
source principale d'utilisation et de coûts.

Cela inclut également les hébergeurs de type abonnement qui facturent toujours en dehors de l'interface locale d'OpenClaw, comme **OpenAI Codex**, **Alibaba Cloud Model Studio Coding Plan**, **MiniMax Coding Plan**, **Z.AI / GLM Coding Plan**, et le chemin de connexion Claude d'Anthropic chez OpenClaw avec **Extra Usage** activé.

Voir [Modèles](/fr/providers/models) pour la configuration des prix et [Utilisation des jetons et coûts](/fr/reference/token-use) pour l'affichage.

### 2) Compréhension des médias (audio/image/vidéo)

Les médias entrants peuvent être résumés/transcrits avant l'exécution de la réponse. Cela utilise les API de modèle/fournisseur.

- Audio : OpenAI / Groq / Deepgram / DeepInfra / Google / Mistral.
- Image : OpenAI / OpenRouter / Anthropic / DeepInfra / Google / MiniMax / Moonshot / Qwen / Z.AI.
- Vidéo : Google / Qwen / Moonshot.

Voir [Compréhension des médias](/fr/nodes/media-understanding).

### 3) Génération d'images et de vidéos

Les capacités de génération partagées peuvent également consommer des clés de fournisseur :

- Génération d'images : OpenAI / Google / DeepInfra / fal / MiniMax
- Génération de vidéos : DeepInfra / Qwen

La génération d'images peut déduire un fournisseur par défaut authentifié lorsque `agents.defaults.imageGenerationModel` n'est pas défini. La génération de vidéos nécessite actuellement un `agents.defaults.videoGenerationModel` explicite tel que `qwen/wan2.6-t2v`.

Voir [Génération d'images](/fr/tools/image-generation), [Qwen Cloud](/fr/providers/qwen) et [Modèles](/fr/concepts/models).

### 4) Embeddings mémoire + recherche sémantique

La recherche de mémoire sémantique utilise les **API d'embeddings** lorsqu'elle est configurée pour des fournisseurs distants :

- `memorySearch.provider = "openai"` → embeddings OpenAI
- `memorySearch.provider = "gemini"` → embeddings Gemini
- `memorySearch.provider = "voyage"` → embeddings Voyage
- `memorySearch.provider = "mistral"` → Embeddings Mistral
- `memorySearch.provider = "deepinfra"` → Embeddings DeepInfra
- `memorySearch.provider = "lmstudio"` → Embeddings LM Studio (local/self-hosted)
- `memorySearch.provider = "ollama"` → Embeddings Ollama (local/self-hosted; typically no hosted API billing)
- Repli optionnel vers un fournisseur distant si les embeddings locaux échouent

You can keep it local with `memorySearch.provider = "local"` (no API usage).

See [Memory](/fr/concepts/memory).

### 5) Outil de recherche Web

`web_search` may incur usage charges depending on your provider:

- **Brave Search API**: `BRAVE_API_KEY` or `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**: `EXA_API_KEY` ou `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**: `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)**: `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)**: `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)**: `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY`, ou `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search**: key-free for a reachable signed-in local Ollama host; direct `https://ollama.com` search uses `OLLAMA_API_KEY`, and auth-protected hosts can reuse normal Ollama provider bearer auth
- **Perplexity Search API**: `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**: `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo** : repli sans clé (aucune facturation d'API, mais non officiel et basé sur HTML)
- **SearXNG**: `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl` (key-free/self-hosted; no hosted API billing)

Les chemins de provider `tools.web.search.*` hérités sont toujours chargés via la couche de compatibilité temporaire, mais ils ne sont plus la surface de configuration recommandée.

**Crédit gratuit Brave Search :** Chaque plan Brave inclut 5 $/mois de crédit gratuit renouvelable. Le plan Search coûte 5 $ pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois sans frais. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus.

Voir [Web tools](/fr/tools/web).

### 5) Outil de récupération Web (Firecrawl)

`web_fetch`FirecrawlAPI peut appeler **Firecrawl** lorsqu'une clé API est présente :

- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webFetch.apiKey`

Si Firecrawl n'est pas configuré, l'outil revient à une récupération directe ainsi qu'au plugin Firecrawl`web-readability`API inclus (pas d'API payante). Désactivez `plugins.entries.web-readability.enabled` pour ignorer l'extraction locale Readability.

Voir [Web tools](/fr/tools/web).

### 6) Instantanés d'utilisation du fournisseur (status/health)

Certaines commandes d'état appellent des **points de terminaison d'utilisation du fournisseur** pour afficher les fenêtres de quota ou l'état de l'authentification.
Ce sont généralement des appels à faible volume mais qui atteignent toujours les API du fournisseur :

- `openclaw status --usage`
- `openclaw models status --json`

Voir [Models CLI](CLI/en/cli/models).

### 7) Résumé de la sauvegarde de compactage

La sauvegarde de compactage peut résumer l'historique de la session en utilisant le **model actuel**, ce qui
appelle les API du fournisseur lors de son exécution.

Voir [Session management + compaction](/fr/reference/session-management-compaction).

### 8) Analyse / sonde de model

`openclaw models scan`OpenRouter peut sonder les modèles OpenRouter et utilise `OPENROUTER_API_KEY` lorsque
le sondage est activé.

Voir [Models CLI](CLI/en/cli/models).

### 9) Talk (speech)

Le mode Talk peut invoquer **ElevenLabs** lorsqu'il est configuré :

- `ELEVENLABS_API_KEY` ou `talk.providers.elevenlabs.apiKey`

Voir [Talk mode](/fr/nodes/talk).

### 10) Skills (API tierces)

Les Skills peuvent stocker `apiKey` dans `skills.entries.<name>.apiKey`. Si une skill utilise cette clé pour des API
externes, cela peut engendrer des coûts selon le provider de la skill.

Voir [Skills](/fr/tools/skills).

## Connexes

- [Token use and costs](/fr/reference/token-use)
- [Prompt caching](/fr/reference/prompt-caching)
- [Usage tracking](/fr/concepts/usage-tracking)

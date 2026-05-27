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
- Si OpenClaw dispose des métadonnées d'utilisation et d'une tarification locale pour le modèle actif, `/status` affiche également le **coût estimé** de la dernière réponse. Cela peut inclure des fournisseurs explicitement tarifés sans clé API, tels que les modèles Bedrock `aws-sdk`.
- Si les métadonnées de session en direct sont éparses, `/status` peut récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir de la dernière entrée d'utilisation de la transcription. Les valeurs non nulles existantes en direct priment toujours, et les totaux de transcription de la taille du prompt peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.

**Pied de page des coûts par message**

- `/usage full` ajoute un pied de page d'utilisation à chaque réponse, y compris le **coût estimé** lorsque la tarification locale est configurée pour le modèle actif et que les métadonnées d'utilisation sont disponibles.
- `/usage tokens` affiche uniquement les jetons ; les flux de type abonnement avec OAuth/jeton et CLI affichent toujours uniquement les jetons, sauf si ce runtime fournit des métadonnées d'utilisation compatibles et qu'un prix local explicite est configuré.
- Note sur le CLI Gemini : lorsque le CLI renvoie une sortie JSON, OpenClaw lit l'utilisation à partir de `stats`, normalise `stats.cached` en `cacheRead` et déduit les jetons d'entrée à partir de `stats.input_tokens - stats.cached` si nécessaire.

Note Anthropic : le personnel de Anthropic nous a informés que l'utilisation du OpenClaw Claude dans le style CLI est à nouveau autorisée, donc OpenClaw considère la réutilisation du CLI Claude et l'utilisation de `claude -p` comme agréées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Anthropic n'expose toujours pas d'estimation en dollars par message que OpenClaw peut afficher dans `/usage full`.

**Fenêtres d'utilisation CLI (quotas de provider)**

- `openclaw status --usage` et `openclaw channels list` affichent les **fenêtres d'utilisation** du fournisseur (instantanés de quota, et non les coûts par message).
- La sortie humaine est normalisée à `X% left` pour tous les fournisseurs.
- Providers actuels des fenêtres d'utilisation : Anthropic, GitHub Copilot, CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.
- Note MiniMax : ses champs bruts MiniMax`usage_percent` / `usagePercent` signifient le quota restant, donc OpenClaw les inverse avant l'affichage. Les champs basés sur le nombre prévalent toujours lorsqu'ils sont présents. Si le provider renvoie `model_remains`, OpenClaw privilégie l'entrée du modèle de chat, déduit l'étiquette de fenêtre à partir des horodatages si nécessaire et inclut le nom du modèle dans l'étiquette du plan.
- L'auth d'utilisation pour ces fenêtres de quota provient de hooks spécifiques au provider lorsque
  disponibles ; sinon, OpenClaw revient à faire correspondre les identifiants OAuth/clé API
  à partir des profils d'auth, de l'env ou de la config.

Voir [Utilisation et coûts des tokens](/fr/reference/token-use) pour plus de détails et d'exemples.

## Comment les clés sont découvertes

OpenClaw peut récupérer les identifiants à partir de :

- **Profils d'authentification** (par agent, stockés dans `auth-profiles.json`).
- **Variables d'environnement** (par exemple `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuration** (`models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`,
  `plugins.entries.firecrawl.config.webFetch.apiKey`, `memorySearch.*`,
  `talk.providers.*.apiKey`).
- **Skills** (`skills.entries.<name>.apiKey`) qui peuvent exporter des clés vers l'environnement de processus du skill.

## Fonctionnalités pouvant dépenser des clés

### 1) Réponses du model principal (chat + outils)

Chaque réponse ou appel d'outil utilise le **provider model actuel** (OpenAI, Anthropic, etc). C'est la
source principale d'utilisation et de coûts.

Cela inclut également les hébergeurs de type abonnement qui facturent toujours en dehors de l'interface locale d'OpenClaw, comme **OpenAI Codex**, **Alibaba Cloud Model Studio Coding Plan**, **MiniMax Coding Plan**, **Z.AI / GLM Coding Plan**, et le chemin de connexion Claude d'Anthropic chez OpenClaw avec **Extra Usage** activé.

Voir [Modèles](/fr/providers/models) pour la configuration des prix et [Utilisation et coûts des tokens](/fr/reference/token-use) pour l'affichage.

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

La génération d'images peut déduire un provider par défaut avec authentification lorsque `agents.defaults.imageGenerationModel` n'est pas défini. La génération de vidéos nécessite actuellement un `agents.defaults.videoGenerationModel` explicite tel que `qwen/wan2.6-t2v`.

Voir [Génération d'images](/fr/tools/image-generation), [Qwen Cloud](/fr/providers/qwen)
et [Modèles](/fr/concepts/models).

### 4) Embeddings mémoire + recherche sémantique

La recherche de mémoire sémantique utilise les **API d'embeddings** lorsqu'elle est configurée pour des fournisseurs distants :

- `memorySearch.provider = "openai"` → embeddings OpenAI
- `memorySearch.provider = "gemini"` → embeddings Gemini
- `memorySearch.provider = "voyage"` → embeddings Voyage
- `memorySearch.provider = "mistral"` → embeddings Mistral
- `memorySearch.provider = "deepinfra"` → embeddings DeepInfra
- `memorySearch.provider = "lmstudio"` → embeddings LM Studio (local/auto-hébergé)
- `memorySearch.provider = "ollama"` → embeddings Ollama (local/auto-hébergé ; généralement sans facturation d'API hébergée)
- Repli optionnel vers un fournisseur distant si les embeddings locaux échouent

Vous pouvez le garder en local avec `memorySearch.provider = "local"` (pas d'utilisation d'API).

Voir [Mémoire](/fr/concepts/memory).

### 5) Outil de recherche Web

`web_search` peut entraîner des frais d'utilisation selon votre fournisseur :

- **Brave Search API** : `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
- **Exa** : `EXA_API_KEY` ou `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl** : `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)** : `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)** : profil OAuth xAI, OAuth`XAI_API_KEY`, ou `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)** : `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search** : `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY`, ou `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web Search** : sans clé pour un hôte local Ollama connecté et accessible ; la recherche directe `https://ollama.com` utilise `OLLAMA_API_KEY`, et les hôtes protégés par authentification peuvent réutiliser l'authentification par porteur du fournisseur Ollama normal
- **Perplexity Search API** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily** : `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo** : repli sans clé (aucune facturation d'API, mais non officiel et basé sur HTML)
- **SearXNG** : `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl` (sans clé / auto-hébergé ; pas de facturation d'API hébergée)

Les chemins du fournisseur `tools.web.search.*` hérités se chargent toujours via la couche de compatibilité temporaire, mais ils ne sont plus la surface de configuration recommandée.

**Crédit gratuit Brave Search :** Chaque plan Brave inclut 5 $/mois de crédit gratuit renouvelable. Le plan Search coûte 5 $ pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois sans frais. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus.

Voir [Outils Web](/fr/tools/web).

### 5) Outil de récupération Web (Firecrawl)

`web_fetch` peut appeler **Firecrawl** lorsqu'une clé d'API est présente :

- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webFetch.apiKey`

Si Firecrawl n'est pas configuré, l'outil revient à une récupération directe ainsi qu'au plugin `web-readability` inclus (pas d'API payant). Désactivez `plugins.entries.web-readability.enabled` pour ignorer l'extraction Readability locale.

Voir [Web tools](/fr/tools/web).

### 6) Instantanés d'utilisation du fournisseur (status/health)

Certaines commandes d'état appellent des **points de terminaison d'utilisation du fournisseur** pour afficher les fenêtres de quota ou l'état de l'authentification.
Ce sont généralement des appels à faible volume mais qui atteignent toujours les API du fournisseur :

- `openclaw status --usage`
- `openclaw models status --json`

Voir [Models CLI](/fr/cli/models).

### 7) Résumé de la sauvegarde de compactage

La sauvegarde de compactage peut résumer l'historique de la session en utilisant le **model actuel**, ce qui
appelle les API du fournisseur lors de son exécution.

Voir [Session management + compaction](/fr/reference/session-management-compaction).

### 8) Analyse / sonde de model

`openclaw models scan` peut sonder les modèles OpenRouter et utilise `OPENROUTER_API_KEY` lorsque
le sondage est activé.

Voir [Models CLI](/fr/cli/models).

### 9) Talk (speech)

Le mode Talk peut invoquer **ElevenLabs** lorsqu'il est configuré :

- `ELEVENLABS_API_KEY` ou `talk.providers.elevenlabs.apiKey`

Voir [Talk mode](/fr/nodes/talk).

### 10) Skills (API tierces)

Les compétences peuvent stocker `apiKey` dans `skills.entries.<name>.apiKey`. Si une compétence utilise cette clé pour des
API externes, cela peut entraîner des coûts selon le fournisseur de la compétence.

Voir [Skills](/fr/tools/skills).

## Connexes

- [Token use and costs](/fr/reference/token-use)
- [Prompt caching](/fr/reference/prompt-caching)
- [Usage tracking](/fr/concepts/usage-tracking)

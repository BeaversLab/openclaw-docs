---
summary: "Auditer ce qui peut coûter de l'argent, quelles clés sont utilisées et comment visualiser l'utilisation"
read_when:
  - You want to understand which features may call paid APIs
  - You need to audit keys, costs, and usage visibility
  - You’re explaining /status or /usage cost reporting
title: "API Utilisation et Coûts"
---

# API utilisation et coûts

Ce document répertorie les **features qui peuvent invoquer des clés API** et où leurs coûts apparaissent. Il se concentre sur
les features OpenClaw qui peuvent générer une utilisation de provider ou des appels API payants.

## Où les coûts apparaissent (chat + CLI)

**Instantané des coûts par session**

- `/status` affiche le model de session actuel, l'utilisation du contexte et les jetons de la dernière réponse.
- Si le model utilise une authentification par **clé API**, `/status` affiche également le **coût estimé** de la dernière réponse.
- Si les métadonnées de la session en direct sont peu détaillées, `/status` peut récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir de la dernière entrée d'utilisation de la transcription. Les valeurs dynamiques non nulles existantes sont toujours prioritaires, et les totaux de la transcription de la taille du prompt peuvent prévaloir lorsque les totaux stockés sont manquants ou inférieurs.

**Pied de page du coût par message**

- `/usage full` ajoute un pied de page d'utilisation à chaque réponse, incluant le **coût estimé** (clé API uniquement).
- `/usage tokens` affiche uniquement les jetons ; les flux d'abonnement OAuth/token et CLI masquent le coût en dollars.
- Note concernant le CLI Gemini : lorsque le CLI renvoie une sortie JSON, OpenClaw lit l'utilisation à partir de `stats`, normalise `stats.cached` en `cacheRead` et dérive les jetons d'entrée à partir de `stats.input_tokens - stats.cached` si nécessaire.

Remarque d'Anthropic : Le personnel d'Anthropic nous a indiqué que l'utilisation de la CLI Claude style OpenClaw est
à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme
autorisées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
Anthropic n'expose toujours pas d'estimation en dollars par message qu'OpenClaw peut
afficher dans `/usage full`.

**Fenêtres d'utilisation du CLI (quotas du provider)**

- `openclaw status --usage` et `openclaw channels list` affichent les **fenêtres d'utilisation** du provider
  (instantanés de quota, et non les coûts par message).
- La sortie humaine est normalisée à `X% left` pour tous les providers.
- Providers actuels avec fenêtres d'utilisation : Anthropic, GitHub Copilot, CLI Gemini, OpenAI Codex, MiniMax, Xiaomi et z.ai.
- Remarque MiniMax : ses champs bruts `usage_percent` / `usagePercent` signifient le quota
  restant, donc OpenClaw les inverse avant l'affichage. Les champs basés sur le nombre l'emportent
  toujours lorsqu'ils sont présents. Si le provider renvoie `model_remains`, OpenClaw préfère
  l'entrée du modèle de chat, dérive l'étiquette de la fenêtre à partir des horodatages si nécessaire, et
  inclut le nom du modèle dans l'étiquette du plan.
- L'autorisation d'utilisation pour ces fenêtres de quota provient de hooks spécifiques au fournisseur lorsque disponibles; sinon, OpenClaw revient à faire correspondre les identifiants OAuth/clé OAuth depuis les profils d'auth, l'environnement ou la configuration.

Voir [Utilisation et coûts des tokens](/en/reference/token-use) pour les détails et les exemples.

## Découverte des clés

OpenClaw peut récupérer les identifiants depuis :

- **Profils d'authentification** (par agent, stockés dans `auth-profiles.json`).
- **Variables d'environnement** (par exemple `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuration** (`models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`,
  `plugins.entries.firecrawl.config.webFetch.apiKey`, `memorySearch.*`,
  `talk.providers.*.apiKey`).
- **Skills** (`skills.entries.<name>.apiKey`) qui peuvent exporter des clés vers l'environnement du processus de skill.

## Fonctionnalités pouvant consommer des clés

### 1) Réponses du modèle principal (chat + outils)

Chaque réponse ou appel d'outil utilise le **fournisseur de modèle actuel** (OpenAI, Anthropic, etc). C'est la source principale d'utilisation et de coûts.

Cela inclut également les fournisseurs hébergés par abonnement qui facturent toujours en dehors de l'interface locale d'OpenClaw, tels que **OpenAI Codex**, **Alibaba Cloud Model Studio
Coding Plan**, **MiniMax Coding Plan**, **Z.AI / GLM Coding Plan**, et
le chemin de connexion Claude d'Anthropic d'OpenClaw avec l'**Utilisation supplémentaire** activée.

Voir [Modèles](/en/providers/models) pour la configuration des prix et [Utilisation et coûts des tokens](/en/reference/token-use) pour l'affichage.

### 2) Compréhension des médias (audio/image/vidéo)

Les médias entrants peuvent être résumés/transcrits avant l'exécution de la réponse. Cela utilise les API du modèle/fournisseur.

- Audio : OpenAI / Groq / Deepgram / Google / Mistral.
- Image : OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI.
- Vidéo : Google / Qwen / Moonshot.

Voir [Compréhension des médias](/en/nodes/media-understanding).

### 3) Génération d'images et de vidéos

Les capacités de génération partagées peuvent également dépenser les clés du fournisseur :

- Génération d'images : OpenAI / Google / fal / MiniMax
- Génération de vidéos : Qwen

La génération d'images peut déduire un provider par défaut soutenu par une authentification lorsque
`agents.defaults.imageGenerationModel` n'est pas défini. La génération de vidéo nécessite actuellement
un `agents.defaults.videoGenerationModel` explicite tel que
`qwen/wan2.6-t2v`.

Voir [Génération d'images](/en/tools/image-generation), [Qwen Cloud](/en/providers/qwen),
et [Modèles](/en/concepts/models).

### 4) Memory embeddings + recherche sémantique

La recherche de mémoire sémantique utilise des **API d'embedding** lorsqu'elle est configurée pour des providers distants :

- `memorySearch.provider = "openai"` → embeddings OpenAI
- `memorySearch.provider = "gemini"` → embeddings Gemini
- `memorySearch.provider = "voyage"` → embeddings Voyage
- `memorySearch.provider = "mistral"` → embeddings Mistral
- `memorySearch.provider = "ollama"` → embeddings Ollama (local/auto-hébergé ; généralement aucune facturation d'API hébergée)
- Retour facultatif à un provider distant si les embeddings locaux échouent

Vous pouvez le conserver en local avec `memorySearch.provider = "local"` (aucune utilisation d'API).

Voir [Mémoire](/en/concepts/memory).

### 5) Outil de recherche Web

`web_search` peut entraîner des frais d'utilisation selon votre fournisseur :

- **Brave Search API** : `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
- **Exa** : `EXA_API_KEY` ou `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl** : `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini (Google Search)** : `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)** : `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)** : `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
- **Recherche MiniMax** : `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, `MINIMAX_API_KEY`, ou `plugins.entries.minimax.config.webSearch.apiKey`
- **Recherche Web Ollama** : sans clé par défaut, mais nécessite un hôte Ollama accessible plus `ollama signin` ; peut également réutiliser l'authentification bearer du fournisseur Ollama normal lorsque l'hôte l'exige
- **Perplexity Search API** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily** : `TAVILY_API_KEY` ou `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo** : repli sans clé (aucune facturation d'API, mais non officiel et basé sur HTML)
- **SearXNG** : `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl` (sans clé/auto-hébergé ; aucune facturation d'API hébergée)

Les chemins du fournisseur `tools.web.search.*` hérités se chargent toujours via la couche de compatibilité temporaire, mais ce n'est plus la surface de configuration recommandée.

**Crédit gratuit Brave Search :** Chaque plan Brave inclut 5 $/mois de crédit gratuit renouvelable. Le plan Search coûte 5 $ pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois sans frais. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus.

Voir [Outils Web](/en/tools/web).

### 5) Outil de récupération Web (Firecrawl)

`web_fetch` peut appeler **Firecrawl** lorsqu'une clé API est présente :

- `FIRECRAWL_API_KEY` ou `plugins.entries.firecrawl.config.webFetch.apiKey`

Si Firecrawl n'est pas configuré, l'outil revient à une récupération directe + lisibilité (pas d'API payante).

Voir [Outils Web](/en/tools/web).

### 6) Instantanés d'utilisation du fournisseur (statut/santé)

Certaines commandes de statut appellent les **points de terminaison d'utilisation du fournisseur** pour afficher les fenêtres de quota ou l'état de l'authentification.
Ce sont généralement des appels à faible volume mais qui atteignent toujours les API des fournisseurs :

- `openclaw status --usage`
- `openclaw models status --json`

Voir [Modèles CLI](/en/cli/models).

### 7) Résumé de la sauvegarde de compactage

La sauvegarde de compactage peut résumer l'historique de la session en utilisant le **modèle actuel**, ce qui
appelle les API des fournisseurs lors de son exécution.

Voir [Gestion de session + compactage](/en/reference/session-management-compaction).

### 8) Analyse / sonde de modèle

`openclaw models scan` peut sonder les modèles OpenRouter et utilise `OPENROUTER_API_KEY` lorsque
le sondage est activé.

Voir [Modèles CLI](/en/cli/models).

### 9) Discussion (parole)

Le mode discussion peut appeler **ElevenLabs** lorsqu'il est configuré :

- `ELEVENLABS_API_KEY` ou `talk.providers.elevenlabs.apiKey`

Voir [Mode Talk](/en/nodes/talk).

### 10) Skills (API tierces)

Les Skills peuvent stocker `apiKey` dans `skills.entries.<name>.apiKey`. Si une skill utilise cette clé pour des API
externes, cela peut engendrer des coûts selon le provider de la skill.

Voir [Skills](/en/tools/skills).

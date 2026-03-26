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

**Pied de page des coûts par message**

- `/usage full` ajoute un pied de page d'utilisation à chaque réponse, y compris le **coût estimé** (clé API uniquement).
- `/usage tokens` affiche uniquement les jetons ; les flux OAuth masquent le coût en dollars.

**Fenêtres d'utilisation CLI (quotas de provider)**

- `openclaw status --usage` et `openclaw channels list` affichent les **fenêtres d'utilisation** du provider
  (instantanés de quota, pas les coûts par message).

Voir [Utilisation des jetons et coûts](/fr/reference/token-use) pour plus de détails et d'exemples.

## Comment les clés sont découvertes

OpenClaw peut récupérer les identifiants à partir de :

- **Profils d'authentification** (par agent, stockés dans `auth-profiles.json`).
- **Variables d'environnement** (par ex. `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuration** (`models.providers.*.apiKey`, `tools.web.search.*`, `tools.web.fetch.firecrawl.*`,
  `memorySearch.*`, `talk.apiKey`).
- **Skills** (`skills.entries.<name>.apiKey`) qui peuvent exporter des clés vers l'environnement de processus du skill.

## Fonctionnalités pouvant consommer des clés

### 1) Réponses du model de base (chat + outils)

Chaque réponse ou appel d'outil utilise le **provider de model actuel** (OpenAI, Anthropic, etc.). C'est la
source principale d'utilisation et de coûts.

Voir [Modèles](/fr/providers/models) pour la configuration des tarifs et [Utilisation des jetons et coûts](/fr/reference/token-use) pour l'affichage.

### 2) Compréhension des médias (audio/image/vidéo)

Les médias entrants peuvent être résumés/transcrits avant l'exécution de la réponse. Cela utilise les API de modèle/fournisseur.

- Audio : OpenAI / Groq / Deepgram (maintenant **auto-activé** lorsque des clés existent).
- Image : OpenAI / Anthropic / Google.
- Vidéo : Google.

Voir [Compréhension multimédia](/fr/nodes/media-understanding).

### 3) Embeddings de mémoire + recherche sémantique

La recherche de mémoire sémantique utilise les **API d'embedding** lorsqu'elle est configurée pour des fournisseurs distants :

- `memorySearch.provider = "openai"` → embeddings OpenAI
- `memorySearch.provider = "gemini"` → embeddings Gemini
- `memorySearch.provider = "voyage"` → embeddings Voyage
- `memorySearch.provider = "mistral"` → embeddings Mistral
- `memorySearch.provider = "ollama"` → embeddings Ollama (local/auto-hébergé ; généralement aucune facturation d'API hébergée)
- Repli optionnel vers un fournisseur distant si les embeddings locaux échouent

Vous pouvez le garder local avec `memorySearch.provider = "local"` (aucune utilisation d'API).

Voir [Mémoire](/fr/concepts/memory).

### 4) Outil de recherche Web

`web_search` utilise des clés d'API et peut entraîner des frais d'utilisation selon votre fournisseur :

- **Brave Search API** : `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)** : `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)** : `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)** : `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`

Les chemins de fournisseur `tools.web.search.*` hérités se chargent toujours via la shim de compatibilité temporaire, mais ce n'est plus la surface de configuration recommandée.

**Crédit gratuit Brave Search :** Chaque plan Brave inclut 5 $/mois de crédit gratuit renouvelable. Le plan Search coûte 5 $ pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois sans frais. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus.

Voir [Outils Web](/fr/tools/web).

### 5) Outil de récupération Web (Firecrawl)

`web_fetch` peut appeler **Firecrawl** lorsqu'une clé API est présente :

- `FIRECRAWL_API_KEY` ou `tools.web.fetch.firecrawl.apiKey`

Si Firecrawl n'est pas configuré, l'outil revient à une récupération directe + lisibilité (pas d'API payant).

Voir [Outils Web](/fr/tools/web).

### 6) Instantanés d'utilisation du fournisseur (statut/santé)

Certaines commandes de statut appellent des **points de terminaison d'utilisation du fournisseur** pour afficher les fenêtres de quota ou l'état de l'authentification.
Ce sont généralement des appels à faible volume mais qui atteignent toujours les API des fournisseurs :

- `openclaw status --usage`
- `openclaw models status --json`

Voir [Modèles CLI](/fr/cli/models).

### 7) Résumé de la sauvegarde de compactage

La sauvegarde de compactage peut résumer l'historique de la session en utilisant le **modèle actuel**, ce qui
appelle les API des fournisseurs lors de son exécution.

Voir [Gestion de session + compactage](/fr/reference/session-management-compaction).

### 8) Analyse / sonde de modèle

`openclaw models scan` peut sonder les modèles OpenRouter et utilise `OPENROUTER_API_KEY` lorsque
le sondage est activé.

Voir [Modèles CLI](/fr/cli/models).

### 9) Talk (parole)

Le mode Talk peut appeler **ElevenLabs** lorsqu'il est configuré :

- `ELEVENLABS_API_KEY` ou `talk.apiKey`

Voir [Talk mode](/fr/nodes/talk).

### 10) Skills (API tiers)

Les Skills peuvent stocker `apiKey` dans `skills.entries.<name>.apiKey`. Si une skill utilise cette clé pour des API
externes, elle peut entraîner des coûts selon le provider de la skill.

Voir [Skills](/fr/tools/skills).

import fr from "/components/footer/fr.mdx";

<fr />

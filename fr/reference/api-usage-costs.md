---
summary: "Auditez ce qui peut engendrer des coûts, quelles clés sont utilisées et comment visualiser l'utilisation"
read_when:
  - Vous souhaitez comprendre quelles fonctionnalités peuvent appeler des API payantes
  - Vous devez auditer les clés, les coûts et la visibilité de l'utilisation
  - Vous expliquez les rapports de coûts /status ou /usage
title: "API Utilisation et coûts"
---

# API utilisation et coûts

Ce document répertorie les **fonctionnalités pouvant invoquer des clés API** et l'endroit où leurs coûts apparaissent. Il se concentre sur
les fonctionnalités OpenClaw susceptibles de générer une utilisation du fournisseur ou des appels API payants.

## Où les coûts apparaissent (chat + CLI)

**Instantané des coûts par session**

- `/status` affiche le modèle de la session actuelle, l'utilisation du contexte et les jetons de la dernière réponse.
- Si le modèle utilise une **authentification par clé API**, `/status` affiche également le **coût estimé** de la dernière réponse.

**Pied de page des coûts par message**

- `/usage full` ajoute un pied de page d'utilisation à chaque réponse, y compris le **coût estimé** (uniquement pour la clé API).
- `/usage tokens` affiche uniquement les jetons ; les flux OAuth masquent le coût en dollars.

**Fenêtres d'utilisation CLI (quotas de fournisseur)**

- `openclaw status --usage` et `openclaw channels list` affichent les **fenêtres d'utilisation** du fournisseur
  (instantanés de quotas, pas les coûts par message).

Voir [Utilisation des jetons et coûts](/fr/reference/token-use) pour plus de détails et d'exemples.

## Comment les clés sont détectées

OpenClaw peut récupérer les identifiants à partir de :

- **Profils d'authentification** (par agent, stockés dans `auth-profiles.json`).
- **Variables d'environnement** (par ex. `OPENAI_API_KEY`, `BRAVE_API_KEY`, `FIRECRAWL_API_KEY`).
- **Configuration** (`models.providers.*.apiKey`, `tools.web.search.*`, `tools.web.fetch.firecrawl.*`,
  `memorySearch.*`, `talk.apiKey`).
- **Compétences** (`skills.entries.<name>.apiKey`) qui peuvent exporter des clés vers l'environnement du processus de compétence.

## Fonctionnalités pouvant consommer des clés

### 1) Réponses du modèle principal (chat + outils)

Chaque réponse ou appel d'outil utilise le **fournisseur de modèle actuel** (OpenAI, Anthropic, etc.). C'est la
principale source d'utilisation et de coûts.

Voir [Modèles](/fr/providers/models) pour la configuration des prix et [Utilisation des jetons et coûts](/fr/reference/token-use) pour l'affichage.

### 2) Compréhension des médias (audio/image/vidéo)

Les médias entrants peuvent être résumés/transcrits avant l'exécution de la réponse. Cela utilise les API de model/provider.

- Audio : OpenAI / Groq / Deepgram (désormais **activé automatiquement** lorsque des clés existent).
- Image : OpenAI / Anthropic / Google.
- Vidéo : Google.

Voir [Compréhension des médias](/fr/nodes/media-understanding).

### 3) Intégrations de mémoire + recherche sémantique

La recherche de mémoire sémantique utilise les **API d'intégration** lorsqu'elle est configurée pour des providers distants :

- `memorySearch.provider = "openai"` → intégrations OpenAI
- `memorySearch.provider = "gemini"` → intégrations Gemini
- `memorySearch.provider = "voyage"` → intégrations Voyage
- `memorySearch.provider = "mistral"` → intégrations Mistral
- `memorySearch.provider = "ollama"` → intégrations Ollama (local/auto-hébergé ; généralement aucune facturation d'API hébergée)
- Repli optionnel vers un provider distant si les intégrations locales échouent

Vous pouvez le garder local avec `memorySearch.provider = "local"` (aucune utilisation d'API).

Voir [Mémoire](/fr/concepts/memory).

### 4) Outil de recherche Web

`web_search` utilise des clés d'API et peut entraîner des frais d'utilisation selon votre provider :

- **Brave Search API** : `BRAVE_API_KEY` ou `plugins.entries.brave.config.webSearch.apiKey`
- **Gemini (Google Search)** : `GEMINI_API_KEY` ou `plugins.entries.google.config.webSearch.apiKey`
- **Grok (xAI)** : `XAI_API_KEY` ou `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi (Moonshot)** : `KIMI_API_KEY`, `MOONSHOT_API_KEY`, ou `plugins.entries.moonshot.config.webSearch.apiKey`
- **Perplexity Search API** : `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, ou `plugins.entries.perplexity.config.webSearch.apiKey`

Les chemins de provider `tools.web.search.*` hérités se chargent toujours via la couche de compatibilité temporaire, mais ils ne sont plus la surface de configuration recommandée.

**Crédit gratuit Brave Search :** Chaque forfait Brave inclut 5 $/mois en crédit gratuit renouvelable. Le forfait Search coûte 5 $ pour 1 000 requêtes, donc le crédit couvre 1 000 requêtes/mois sans frais. Définissez votre limite d'utilisation dans le tableau de bord Brave pour éviter des frais inattendus.

Voir [Outils Web](/fr/tools/web).

### 5) Outil de récupération Web (Firecrawl)

`web_fetch` peut appeler **Firecrawl** lorsqu'une clé d'API est présente :

- `FIRECRAWL_API_KEY` ou `tools.web.fetch.firecrawl.apiKey`

Si Firecrawl n'est pas configuré, l'outil revient à une récupération directe + lisibilité (pas d'API payante).

Voir [Outils Web](/fr/tools/web).

### 6) Instantanés d'utilisation du provider (statut/santé)

Certaines commandes de statut appellent les **points de terminaison d'utilisation du provider** pour afficher les fenêtres de quota ou l'état de l'auth.
Ce sont généralement des appels à faible volume, mais ils appellent toujours les API du provider :

- `openclaw status --usage`
- `openclaw models status --json`

Voir [Modèles CLI](/fr/cli/models).

### 7) Résumé de la protection de compactage

La protection de compactage peut résumer l'historique de la session en utilisant le **modèle actuel**, ce qui
appelle les API du provider lors de son exécution.

Voir [Gestion de session + compactage](/fr/reference/session-management-compaction).

### 8) Analyse de modèle / sonde

`openclaw models scan` peut sonder les modèles OpenRouter et utilise `OPENROUTER_API_KEY` lorsque
le sondage est activé.

Voir [Modèles CLI](/fr/cli/models).

### 9) Talk (discours)

Le mode Talk peut appeler **ElevenLabs** lorsqu'il est configuré :

- `ELEVENLABS_API_KEY` ou `talk.apiKey`

Voir [Mode Talk](/fr/nodes/talk).

### 10) Skills (API tierces)

Les Skills peuvent stocker `apiKey` dans `skills.entries.<name>.apiKey`. Si une skill utilise cette clé pour des API
externes, elle peut engendrer des coûts selon le provider de la skill.

Voir [Skills](/fr/tools/skills).

import en from "/components/footer/en.mdx";

<en />

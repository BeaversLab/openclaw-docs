---
summary: "OllamaOpenClawUtiliser Ollama Cloud directement avec OpenClaw"
read_when:
  - You want to use hosted Ollama models without a local Ollama server
  - You need the ollama-cloud provider id, key, or endpoint
title: "OllamaOllama Cloud"
---

Ollama Cloud est l'API de modèle hébergé d'Ollama. Elle permet à OpenClaw d'appeler des modèles
hébergés par Ollama directement, sans installer de serveur Ollama local ni connecter une application
Ollama locale au mode cloud. Utilisez l'id de fournisseur OllamaOllamaAPIOpenClawOllamaOllamaOllama`ollama-cloud` et les références de modèle comme
`ollama-cloud/kimi-k2.6`.

Cette page est destinée au routage direct exclusivement cloud. Le fournisseur utilise le style
natif Ollama`/api/chat`OpenAI d'Ollama, et non la route compatible OpenAI `/v1`OpenClaw. OpenClaw l'enregistre
sous un id de fournisseur distinct afin que les identifiants cloud-only, la découverte en direct du catalogue et
la sélection de modèles ne soient pas mélangés avec un hôte `ollama` local.

Utilisez cette page lorsque vous souhaitez un routage exclusivement cloud. Pour Ollama local, le routage
hybride cloud-plus-local, les embeddings et les détails d'hôte personnalisés, consultez
[Ollama](OllamaOllama/en/providers/ollama).

## Configuration

Créez une clé API Ollama Cloud sur [ollama.com/settings/keys](OllamaAPIhttps://ollama.com/settings/keys), puis exécutez :

```bash
openclaw onboard --auth-choice ollama-cloud
```

Ou définissez :

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

## Valeurs par défaut

- Fournisseur : `ollama-cloud`
- URL de base : `https://ollama.com`
- Variable d'environnement : `OLLAMA_API_KEY`
- Style d'API : natif Ollama APIOllama`/api/chat`
- Modèle exemple : `ollama-cloud/kimi-k2.6`

## Quand choisir Ollama Cloud

- Vous souhaitez des modèles Ollama hébergés sans exécuter Ollama`ollama serve` localement.
- Vous souhaitez la même forme d'API de chat native Ollama qu'OpenClaw utilise pour Ollama
  local, mais dirigée vers OllamaAPIOpenClawOllama`https://ollama.com`.
- Vous souhaitez un chemin cloud simple pour les modèles qui sont déjà dans le catalogue hébergé d'Ollama.
- Vous n'avez pas besoin de téléchargements de modèles locaux, de contrôle GPU local ou d'inférence en réseau uniquement (LAN-only).

Utilisez plutôt [Ollama](/fr/providers/ollama) lorsque vous souhaitez un routage uniquement local ou cloud-plus-local via un hôte Ollama connecté. Utilisez plutôt un fournisseur compatible OpenAI lorsque vous avez besoin de la sémantique `/v1/chat/completions` ou de fonctionnalités spécifiques au fournisseur de style OpenAI.

## Modèles

OpenClaw découvre les modèles Ollama Cloud à partir du catalogue hébergé en direct. Les identifiants hébergés couramment disponibles incluent :

- `ollama-cloud/gpt-oss:20b`
- `ollama-cloud/kimi-k2.6`
- `ollama-cloud/deepseek-v4-flash`
- `ollama-cloud/minimax-m2.7`
- `ollama-cloud/glm-5`

Utilisez un identifiant de modèle depuis votre catalogue hébergé actuel :

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

Les identifiants de modèle sont des identifiants du catalogue cloud, et non des noms de téléchargement locaux. Si un nom de modèle fonctionne sur un hôte Ollama local mais est absent du catalogue hébergé, utilisez plutôt le fournisseur `ollama` avec cet hôte local.

## Test en direct

Pour les tests de fumée de clé Ollama API Cloud, dirigez le test en direct Ollama vers le point de terminaison hébergé et choisissez un modèle dans votre catalogue actuel :

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

Le test de fumée cloud exécute du texte, du flux natif et une recherche web. Il ignore les embeddings par défaut pour `https://ollama.com` car les clés Ollama API Cloud peuvent ne pas autoriser `/api/embed`.

## Dépannage

- Erreurs `Set OLLAMA_API_KEY` : fournissez une vraie clé API cloud. Le marqueur local `ollama-local` est uniquement pour les hôtes Ollama locaux ou privés.
- Erreurs de modèle inconnu : exécutez `openclaw models list --provider ollama-cloud` et copiez exactement l'identifiant du modèle hébergé.
- Problèmes d'appel d'outil ou de JSON brut sur des hôtes Ollama personnalisés : vérifiez si vous utilisez accidentellement une URL compatible OpenAI OllamaOpenAI`/v1`Ollama. Les routes Ollama doivent utiliser l'URL de base native sans suffixe `/v1`.

## Connexes

- [Ollama](Ollama/en/providers/ollama)
- [Fournisseurs de modèles](/fr/concepts/model-providers)
- [Tous les fournisseurs](/fr/providers/index)

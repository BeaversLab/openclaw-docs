---
summary: "Référence CLI pour `openclaw models` (status/list/set/scan, alias, fallbacks, auth)"
read_when:
  - Vous souhaitez modifier les modèles par défaut ou afficher le statut d'authentification du fournisseur
  - Vous souhaitez scanner les modèles/fournisseurs disponibles et déboguer les profils d'authentification
title: "models"
---

# `openclaw models`

Découverte, scan et configuration de modèles (modèle par défaut, fallbacks, profils d'authentification).

Connexe :

- Fournisseurs + modèles : [Modèles](/fr/providers/models)
- Configuration de l'authentification du fournisseur : [Getting started](/fr/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut/fallbacks résolues ainsi qu'une vue d'ensemble de l'authentification.
Lorsque des instantanés d'utilisation du fournisseur sont disponibles, la section de statut OAuth/token inclut
les en-têtes d'utilisation du fournisseur.
Ajoutez `--probe` pour exécuter des sondages d'authentification en direct sur chaque profil de fournisseur configuré.
Les sondages sont de véritables requêtes (peuvent consommer des tokens et déclencher des limites de taux).
Utilisez `--agent <id>` pour inspecter l'état modèle/authentification d'un agent configuré. Si omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si défini, sinon l'agent
par défaut configuré.

Remarques :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- Les références de modèle sont analysées en séparant sur la **première** `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite l'entrée comme un alias ou un modèle pour le **fournisseur par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).
- `models status` peut afficher `marker(<value>)` dans la sortie d'authentification pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `qwen-oauth`, `ollama-local`) au lieu de les masquer comme des secrets.

### `models status`

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (sonde en direct des profils d'auth configurés)
- `--probe-provider <name>` (sonder un provider)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## Alias + replis

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Profils d'auth

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` exécute le flux d'authentification du plugin de provider (OAuth/clé API). Utilisez
`openclaw plugins list` pour voir quels providers sont installés.

Notes :

- `setup-token` demande une valeur de jeton de configuration (générez-la avec `claude setup-token` sur n'importe quelle machine).
- `paste-token` accepte une chaîne de jeton générée ailleurs ou par l'automatisation.
- Remarque sur la politique Anthropic : la prise en charge du jeton de configuration est une compatibilité technique. Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé, vérifiez donc les conditions actuelles avant de l'utiliser largement.

import fr from "/components/footer/fr.mdx";

<fr />

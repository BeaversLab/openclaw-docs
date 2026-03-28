---
summary: "Référence de la CLI pour `openclaw models` (status/list/set/scan, alias, replis, auth)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

Découverte, analyse et configuration de modèles (modèle par défaut, replis, profils d'auth).

Connexes :

- Providers + modèles : [Modèles](/fr/providers/models)
- Configuration de l'auth du provider : [Getting started](/fr/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut/replis résolues ainsi qu'un aperçu de l'auth.
Lorsque des instantanés d'utilisation des providers sont disponibles, la section de statut OAuth/token inclut
les en-têtes d'utilisation des providers.
Ajoutez `--probe` pour exécuter des sondages d'auth en direct sur chaque profil de provider configuré.
Les sondages sont de vraies requêtes (peuvent consommer des tokens et déclencher des limitations de taux).
Utilisez `--agent <id>` pour inspecter l'état model/auth d'un agent configuré. Si omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si défini, sinon l'agent par défaut configuré.

Remarques :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- Les références de modèle sont analysées en divisant sur la **première** occurrence `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du provider (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le provider, OpenClaw traite l'entrée comme un alias ou un modèle pour le **provider par défaut** (fonctionne uniquement lorsqu'il n'y a pas de `/` dans l'ID du modèle).
- `models status` peut afficher `marker(<value>)` dans la sortie d'auth pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `qwen-oauth`, `ollama-local`) au lieu de les masquer comme des secrets.

### `models status`

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (live probe of configured auth profiles)
- `--probe-provider <name>` (probe one provider)
- `--probe-profile <id>` (repeat or comma-separated profile ids)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (configured agent id; overrides `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

## Alias + solutions de repli

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Profils d'authentification

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` exécute le flux d'authentification d'un plugin de provider (OAuth/clé API). Utilisez
`openclaw plugins list` pour voir quels providers sont installés.

Notes :

- `setup-token` demande une valeur de setup-token (générez-la avec `claude setup-token` sur n'importe quelle machine).
- `paste-token` accepte une chaîne de token générée ailleurs ou via l'automatisation.
- Remarque sur la politique Anthropic : la prise en charge du setup-token est une compatibilité technique. Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code dans le passé, vérifiez donc les conditions actuelles avant une utilisation généralisée.

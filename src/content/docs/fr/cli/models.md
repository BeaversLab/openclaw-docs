---
summary: "Référence CLI pour `openclaw models` (status/list/set/scan, aliases, fallbacks, auth)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

Découverte, analyse et configuration de modèles (modèle par défaut, replis, profils d'auth).

Connexes :

- Fournisseurs + modèles : [Modèles](/en/providers/models)
- Configuration de l'authentification du fournisseur : [Getting started](/en/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut résolues/les secours ainsi qu'un aperçu de l'authentification.
Lorsque des instantanés d'utilisation de provider sont disponibles, la section de statut OAuth/token comprend
les en-têtes d'utilisation du provider.
Ajoutez `--probe` pour exécuter des sondages d'authentification en direct sur chaque profil provider configuré.
Les sondages sont de vraies requêtes (peuvent consommer des tokens et déclencher des limites de taux).
Utilisez `--agent <id>` pour inspecter l'état model/auth d'un agent configuré. Si omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si défini, sinon l'agent par défaut configuré.

Remarques :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- Les références de modèle sont analysées en divisant sur la **première** `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw traite l'entrée comme un alias ou un modèle pour le **fournisseur par défaut** (ne fonctionne que s'il n'y a pas de `/` dans l'ID du modèle).
- `models status` peut afficher `marker(<value>)` dans la sortie d'authentification pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

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

`models auth login` runs a provider plugin’s auth flow (OAuth/API key). Use
`openclaw plugins list` to see which providers are installed.

Examples:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw models auth login --provider openai-codex --set-default
```

Notes:

- `login --provider anthropic --method cli --set-default` reuses a local Claude
  CLI login and rewrites the main Anthropic default-model path to `claude-cli/...`.
- `setup-token` invite à entrer une valeur de setup-token (générez-la avec `claude setup-token` sur n'importe quelle machine).
- `paste-token` accepte une chaîne de token générée ailleurs ou par automation.
- Remarque sur la politique Anthropic : la prise en charge des setup-tokens est une compatibilité technique. Anthropic a bloqué par le passé certaines utilisations d'abonnement en dehors de Claude Code, vérifiez donc les conditions actuelles avant une utilisation large.

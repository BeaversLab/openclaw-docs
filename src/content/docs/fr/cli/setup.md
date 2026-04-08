---
summary: "Référence CLI pour `openclaw setup` (initialiser la config + l'espace de travail)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "setup"
---

# `openclaw setup`

Initialise `~/.openclaw/openclaw.json` et l'espace de travail de l'agent.

Connexe :

- Getting started : [Getting started](/en/start/getting-started)
- onboarding CLI : [Onboarding (CLI)](/en/start/wizard)

## Exemples

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Options

- `--workspace <dir>` : répertoire de l'espace de travail de l'agent (stocké sous `agents.defaults.workspace`)
- `--wizard` : exécuter l'onboarding
- `--non-interactive` : exécuter l'onboarding sans invite
- `--mode <local|remote>` : mode d'onboarding
- `--remote-url <url>` : URL WebSocket du Gateway distant
- `--remote-token <token>` : jeton du Gateway distant

Pour exécuter l'onboarding via le setup :

```bash
openclaw setup --wizard
```

Notes :

- Un `openclaw setup` simple initialise la config + l'espace de travail sans le processus complet d'onboarding.
- L'onboarding s'exécute automatiquement lorsque des indicateurs d'onboarding sont présents (`--wizard`, `--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

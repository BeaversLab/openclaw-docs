---
summary: "Référence CLI pour `openclaw setup` (initialiser la config + l'espace de travail)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "Configuration"
---

# `openclaw setup`

Initialise `~/.openclaw/openclaw.json` et l'espace de travail de l'agent.

Connexe :

- Getting started : [Getting started](/fr/start/getting-started)
- Onboarding CLI : [Onboarding (CLI)](/fr/start/wizard)

## Exemples

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Options

- `--workspace <dir>` : répertoire de l'espace de travail de l'agent (stocké sous `agents.defaults.workspace`)
- `--wizard` : exécuter l'onboarding
- `--non-interactive` : exécuter l'onboarding sans invite
- `--mode <local|remote>` : mode d'onboarding
- `--import-from <provider>` : fournisseur de migration à exécuter pendant l'onboarding
- `--import-source <path>` : répertoire d'origine de l'agent pour `--import-from`
- `--import-secrets` : importer les secrets pris en charge pendant la migration de l'onboarding
- `--remote-url <url>` : URL WebSocket de la Gateway distante
- `--remote-token <token>` : jeton de la Gateway distante

Pour exécuter l'onboarding via le setup :

```bash
openclaw setup --wizard
```

Remarques :

- Le `openclaw setup` simple initialise la configuration + l'espace de travail sans le processus complet d'onboarding.
- L'onboarding s'exécute automatiquement lorsque des indicateurs d'onboarding sont présents (`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`).
- Si un état Hermes est détecté, l'onboarding interactif peut proposer automatiquement une migration. L'importation lors de l'onboarding nécessite une nouvelle configuration ; utilisez [Migrate](/fr/cli/migrate) pour les plans à blanc, les sauvegardes et le mode de surcharge en dehors de l'onboarding.

## Connexes

- [Référence de la CLI](/fr/cli)
- [Vue d'ensemble de l'installation](/fr/install)

---
summary: "Référence CLI pour `openclaw setup` (initialiser la config + l'espace de travail)"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "Configuration"
---

# `openclaw setup`

Initialisez la configuration de base et l'espace de travail de l'agent sans exécuter le processus d'intégration guidé complet.

<Note>
  `openclaw setup` est destiné aux installations de configuration modifiable. En mode Nix (`OPENCLAW_NIX_MODE=1`), OpenClaw refuse les écritures de configuration car le fichier de configuration est géré par Nix. Les agents doivent utiliser le [nix-openclaw Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) de première partie ou la configuration source équivalente pour un autre
  paquet Nix.
</Note>

Connexes :

- Getting started : [Getting started](/fr/start/getting-started)
- onboarding CLI : [Onboarding (CLI)](/fr/start/wizard)

## Exemples

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Options

- `--workspace <dir>` : répertoire de l'espace de travail de l'agent (stocké comme `agents.defaults.workspace`)
- `--wizard` : exécuter l'onboarding
- `--non-interactive` : exécuter l'onboarding sans invite
- `--mode <local|remote>` : mode d'onboarding
- `--import-from <provider>` : provider de migration à exécuter pendant l'onboarding
- `--import-source <path>` : répertoire d'origine de l'agent pour `--import-from`
- `--import-secrets` : importer les secrets pris en charge lors de la migration de l'onboarding
- `--remote-url <url>` : URL WebSocket du Gateway distant
- `--remote-token <token>` : jeton du Gateway distant

Pour exécuter l'onboarding via le setup :

```bash
openclaw setup --wizard
```

Notes :

- Le `openclaw setup` simple initialise la configuration + l'espace de travail sans le processus d'onboarding complet.
- Après le setup simple, exécutez `openclaw onboard` pour le processus guidé complet, `openclaw configure` pour des modifications ciblées, ou `openclaw channels add` pour ajouter des comptes de channel.
- L'onboarding s'exécute automatiquement lorsque des indicateurs d'onboarding sont présents (`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`).
- Si un état Hermes est détecté, l'onboarding interactif peut proposer une migration automatiquement. L'importation via l'onboarding nécessite une nouvelle installation ; utilisez [Migrate](/fr/cli/migrate) pour les plans de simulation, les sauvegardes et le mode de surcharge en dehors de l'onboarding.

## Connexes

- [Référence CLI](CLI/en/cli)
- [Vue d'ensemble de l'installation](/fr/install)

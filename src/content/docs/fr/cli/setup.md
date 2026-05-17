---
summary: "CLIRéférence CLI pour `openclaw setup` (initialiser la configuration et l'espace de travail, exécuter facultativement l'onboarding)"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
  - You need every flag and how setup decides between baseline and wizard mode
title: "Configuration"
---

# `openclaw setup`

Initialise la configuration de base et l'espace de travail de l'agent. Si un indicateur d'onboarding est présent, exécute également l'assistant.

<Note>`openclaw setup` est destiné aux installations avec configuration mutable. En mode Nix (`OPENCLAW_NIX_MODE=1`), OpenClaw refuse les écritures de configuration car le fichier de configuration est géré par Nix. Utilisez le [nix-openclaw Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) officiel ou la configuration source équivalente pour un autre paquet Nix.</Note>

## Options

| Indicateur                 | Description                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | Répertoire de l'espace de travail de l'agent (par défaut `~/.openclaw/workspace` ; stocké sous `agents.defaults.workspace`). |
| `--wizard`                 | Exécuter l'onboarding interactif.                                                                                            |
| `--non-interactive`        | Exécuter l'onboarding sans invite.                                                                                           |
| `--mode <mode>`            | Mode d'onboarding : `local` ou `remote`.                                                                                     |
| `--import-from <provider>` | Provider de migration à exécuter pendant l'onboarding.                                                                       |
| `--import-source <path>`   | Répertoire agent source pour `--import-from`.                                                                                |
| `--import-secrets`         | Importer les secrets pris en charge pendant la migration de l'onboarding.                                                    |
| `--remote-url <url>`       | URL WebSocket du Gateway distant.                                                                                            |
| `--remote-token <token>`   | Jeton du Gateway distant (optionnel).                                                                                        |

### Déclenchement automatique de l'assistant

`openclaw setup` exécute l'assistant lorsque l'un de ces indicateurs est explicitement présent, même sans `--wizard` :

`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`.

## Exemples

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Notes

- Un `openclaw setup` simple initialise la configuration et l'espace de travail sans exécuter le processus d'onboarding complet.
- Après une installation simple, exécutez `openclaw onboard` pour le processus guidé complet, `openclaw configure` pour des modifications ciblées, ou `openclaw channels add` pour ajouter des comptes de channel.
- Si un état Hermes est détecté, l'onboarding interactif peut proposer automatiquement une migration. L'importation lors de l'onboarding nécessite une nouvelle installation ; utilisez [Migrate](/fr/cli/migrate) pour les plans de simulation, les sauvegardes et le mode de réécriture en dehors de l'onboarding.

## Connexes

- [Référence CLI](/fr/cli)
- [Onboarding (CLI)](/fr/start/wizard)
- [Getting started](/fr/start/getting-started)
- [Vue d'ensemble de l'installation](/fr/install)

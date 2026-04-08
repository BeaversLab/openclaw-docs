---
summary: "Référence CLI pour `openclaw uninstall` (supprimer le service de passerelle + les données locales)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `openclaw uninstall`

Désinstaller le service de passerelle + les données locales (le CLI reste).

Options :

- `--service` : supprimer le service de passerelle
- `--state` : supprimer l'état et la configuration
- `--workspace` : supprimer les répertoires de l'espace de travail
- `--app` : supprimer l'application macOS
- `--all` : supprimer le service, l'état, l'espace de travail et l'application
- `--yes` : ignorer les invites de confirmation
- `--non-interactive` : désactiver les invites ; nécessite `--yes`
- `--dry-run` : imprimer les actions sans supprimer les fichiers

Exemples :

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Notes :

- Exécutez `openclaw backup create` d'abord si vous souhaitez une instantanérestaurable avant de supprimer l'état ou les espaces de travail.
- `--all` est une abréviation pour supprimer le service, l'état, l'espace de travail et l'application ensemble.
- `--non-interactive` nécessite `--yes`.

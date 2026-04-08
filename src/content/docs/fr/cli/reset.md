---
summary: "Référence de la CLI pour `openclaw reset` (réinitialiser l'état/la configuration locale)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `openclaw reset`

Réinitialiser la configuration/l'état locaux (garde la CLI installée).

Options :

- `--scope <scope>` : `config`, `config+creds+sessions`, ou `full`
- `--yes` : ignorer les invites de confirmation
- `--non-interactive` : désactiver les invites ; nécessite `--scope` et `--yes`
- `--dry-run` : afficher les actions sans supprimer les fichiers

Exemples :

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

Notes :

- Exécutez `openclaw backup create` d'abord si vous souhaitez une instantanée restaurable avant de supprimer l'état local.
- Si vous omettez `--scope`, `openclaw reset` utilise une invite interactive pour choisir ce qu'il faut supprimer.
- `--non-interactive` n'est valide que lorsque `--scope` et `--yes` sont définis.

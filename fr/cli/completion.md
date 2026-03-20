---
summary: "Référence CLI pour `openclaw completion` (générer/installer les scripts de complétion de shell)"
read_when:
  - Vous souhaitez des complétions de shell pour zsh/bash/fish/PowerShell
  - Vous devez mettre en cache les scripts de complétion sous l'état OpenClaw
title: "completion"
---

# `openclaw completion`

Génère les scripts de complétion de shell et installez-les éventuellement dans votre profil de shell.

## Utilisation

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## Options

- `-s, --shell <shell>` : shell cible (`zsh`, `bash`, `powershell`, `fish` ; par défaut : `zsh`)
- `-i, --install` : installer la complétion en ajoutant une ligne de source à votre profil de shell
- `--write-state` : écrire le(s) script(s) de complétion dans `$OPENCLAW_STATE_DIR/completions` sans imprimer dans stdout
- `-y, --yes` : ignorer les invites de confirmation d'installation

## Notes

- `--install` écrit un petit bloc "OpenClaw Completion" dans votre profil de shell et le pointe vers le script mis en cache.
- Sans `--install` ou `--write-state`, la commande imprime le script vers stdout.
- La génération de complétion charge avec empressement les arbres de commandes afin que les sous-commandes imbriquées soient incluses.

import en from "/components/footer/en.mdx";

<en />

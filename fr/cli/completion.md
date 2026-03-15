---
summary: "Référence de la CLI pour `openclaw completion` (générer/installer les scripts de complétion de shell)"
read_when:
  - You want shell completions for zsh/bash/fish/PowerShell
  - You need to cache completion scripts under OpenClaw state
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
- `-i, --install` : installe la complétion en ajoutant une ligne de source à votre profil de shell
- `--write-state` : écrit le(s) script(s) de complétion dans `$OPENCLAW_STATE_DIR/completions` sans imprimer dans stdout
- `-y, --yes` : ignore les invites de confirmation d'installation

## Notes

- `--install` écrit un petit bloc "Complétion OpenClaw" dans votre profil de shell et le pointe vers le script mis en cache.
- Sans `--install` ni `--write-state`, la commande imprime le script sur stdout.
- La génération de complétion charge avidement les arborescences de commandes afin que les sous-commandes imbriquées soient incluses.

import fr from '/components/footer/fr.mdx';

<fr />

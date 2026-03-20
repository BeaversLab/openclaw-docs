---
summary: "Référence CLI pour `openclaw tui` (interface terminal connectée à la Gateway)"
read_when:
  - Vous souhaitez une interface terminal pour la Gateway (adaptée à distance)
  - Vous souhaitez transmettre l'url/le jeton/la session depuis des scripts
title: "tui"
---

# `openclaw tui`

Ouvrir l'interface terminal connectée à la Gateway.

Connexes :

- Guide TUI : [TUI](/fr/web/tui)

Notes :

- `tui` résout les SecretRefs d'authentification de passerelle configurés pour l'authentification par jeton/mot de passe lorsque cela est possible (fournisseurs `env`/`file`/`exec`).
- Lorsqu'il est lancé depuis un répertoire d'espace de travail d'agent configuré, le TUI sélectionne automatiquement cet agent pour la clé de session par défaut (sauf si `--session` est explicitement `agent:<id>:...`).

## Exemples

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import en from "/components/footer/en.mdx";

<en />

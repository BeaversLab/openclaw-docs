---
summary: "Référence CLI pour `openclaw tui` (interface utilisateur terminal connectée au Gateway)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `openclaw tui`

Ouvrez l'interface utilisateur terminal connectée au Gateway.

Connexes :

- Guide TUI : [TUI](/fr/web/tui)

Notes :

- `tui` résout les SecretRefs d'authentification de passerelle configurés pour l'authentification par jeton/mot de passe lorsque cela est possible (fournisseurs `env`/`file`/`exec`).
- Lorsqu'il est lancé depuis un répertoire de workspace d'agent configuré, le TUI sélectionne automatiquement cet agent pour la valeur par défaut de la clé de session (sauf si `--session` est explicitement `agent:<id>:...`).

## Exemples

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import fr from "/components/footer/fr.mdx";

<fr />

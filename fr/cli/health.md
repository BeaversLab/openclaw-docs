---
summary: "Référence CLI pour `openclaw health` (point de terminaison de santé du passerelle via RPC)"
read_when:
  - Vous souhaitez vérifier rapidement l'état de santé du passerelle en cours d'exécution
title: "health"
---

# `openclaw health`

Récupérer l'état de santé du passerelle en cours d'exécution.

```bash
openclaw health
openclaw health --json
openclaw health --verbose
```

Notes :

- `--verbose` exécute des sondages en direct et affiche les temps par compte lorsque plusieurs comptes sont configurés.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.

import en from "/components/footer/en.mdx";

<en />

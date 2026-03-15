---
summary: "Référence CLI pour `openclaw health` (point de terminaison santé du passerelle via RPC)"
read_when:
  - You want to quickly check the running Gateway’s health
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

- `--verbose` exécute des sondes en direct et imprime les timings par compte lorsque plusieurs comptes sont configurés.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.

import fr from '/components/footer/fr.mdx';

<fr />

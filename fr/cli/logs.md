---
summary: "Référence de la CLI pour `openclaw logs` (suivre les journaux du Gateway via RPC)"
read_when:
  - Vous devez suivre les journaux du Gateway à distance (sans SSH)
  - Vous voulez des lignes de journal JSON pour les outils
title: "logs"
---

# `openclaw logs`

Suivre les journaux de fichiers du Gateway via RPC (fonctionne en mode distant).

Connexes :

- Aperçu de la journalisation : [Journalisation](/fr/logging)

## Exemples

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
```

Utilisez `--local-time` pour afficher les horodatages dans votre fuseau horaire local.

import en from "/components/footer/en.mdx";

<en />

---
summary: "Référence CLI pour `openclaw status` (diagnostics, sondages, instantanés d'utilisation)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

Diagnostics pour les channels + sessions.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notes :

- `--deep` exécute des sondages en direct (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut le Gateway + l'état d'installation/exécution du service d'hôte de nœud lorsque disponible.
- La vue d'ensemble inclut le channel de mise à jour + le SHA git (pour les extraits de source).
- Les informations de mise à jour s'affichent dans la vue d'ensemble ; si une mise à jour est disponible, le status affiche un conseil pour exécuter `openclaw update` (voir [Mise à jour](/fr/install/updating)).
- Les surfaces de statut en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration ciblés lorsque cela est possible.
- Si un SecretRef de channel pris en charge est configuré mais indisponible dans le chemin de commande actuel, le status reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que « configured token unavailable in this command path », et la sortie JSON inclut `secretDiagnostics`.

import fr from '/components/footer/fr.mdx';

<fr />

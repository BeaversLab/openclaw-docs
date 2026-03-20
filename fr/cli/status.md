---
summary: "Référence CLI pour `openclaw status` (diagnostics, sondes, instantanés d'utilisation)"
read_when:
  - Vous souhaitez un diagnostic rapide de l'état du channel + les destinataires de session récents
  - Vous souhaitez un statut « all » collable pour le débogage
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

- `--deep` exécute des sondes en direct (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut le Gateway + l'état d'installation/d'exécution du service hôte du nœud lorsque disponible.
- La vue d'ensemble inclut le channel de mise à jour + le SHA git (pour les checkouts source).
- Les informations de mise à jour apparaissent dans la vue d'ensemble ; si une mise à jour est disponible, le statut affiche une indication pour exécuter `openclaw update` (voir [Mise à jour](/fr/install/updating)).
- Les surfaces de statut en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration cibles lorsque cela est possible.
- Si un SecretRef de channel pris en charge est configuré mais indisponible dans le chemin de commande actuel, le statut reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que « configured token unavailable in this command path », et la sortie JSON inclut `secretDiagnostics`.
- Lorsque la résolution locale de commande du SecretRef réussit, le statut privilégie l'instantané résolu et efface les marqueurs de channel « secret indisponible » transitoires de la sortie finale.
- `status --all` inclut une ligne de vue d'ensemble des Secrets et une section de diagnostic qui résume les diagnostics de secrets (tronqués pour la lisibilité) sans arrêter la génération du rapport.

import en from "/components/footer/en.mdx";

<en />

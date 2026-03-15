---
summary: "Intégration PeekabooBridge pour l'automatisation de l'interface macOS"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
title: "Peekaboo Bridge"
---

# Peekaboo Bridge (automatisation de l'interface macOS)

OpenClaw peut héberger **PeekabooBridge** en tant que courtier d'automatisation d'interface local et sensible aux permissions. Cela permet au `peekaboo` CLI de piloter l'automatisation de l'interface tout en réutilisant les permissions TCC de l'application macOS.

## Ce que c'est (et ce que ce n'est pas)

- **Hôte** : OpenClaw.app peut agir en tant qu'hôte PeekabooBridge.
- **Client** : utilisez le CLI `peekaboo` (pas de surface `openclaw ui ...` séparée).
- **Interface** : les superpositions visuelles restent dans Peekaboo.app ; OpenClaw est un hôte de courtier léger.

## Activer le pont

Dans l'application macOS :

- Réglages → **Activer le pont Peekaboo Bridge**

Lorsqu'il est activé, OpenClaw démarre un serveur de socket UNIX local. S'il est désactivé, l'hôte est arrêté et `peekaboo` reviendra aux autres hôtes disponibles.

## Ordre de découverte des clients

Les clients Peekaboo essaient généralement les hôtes dans cet ordre :

1. Peekaboo.app (expérience utilisateur complète)
2. Claude.app (si installé)
3. OpenClaw.app (courtier léger)

Utilisez `peekaboo bridge status --verbose` pour voir quel hôte est actif et quel chemin de socket est utilisé. Vous pouvez remplacer avec :

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## Sécurité et permissions

- Le pont valide les **signatures de code de l'appelant** ; une liste d'autorisation de TeamIDs est appliquée (TeamID de l'hôte Peekaboo + TeamID de l'application OpenClaw).
- Les demandes expirent après environ 10 secondes.
- Si les permissions requises sont manquantes, le pont renvoie un message d'erreur clair plutôt que de lancer les Réglages Système.

## Comportement des instantanés (automatisation)

Les instantanés sont stockés en mémoire et expirent automatiquement après une courte fenêtre. Si vous avez besoin d'une rétention plus longue, recapturez à partir du client.

## Dépannage

- Si `peekaboo` signale « le client pont n'est pas autorisé », assurez-vous que le client est correctement signé ou exécutez l'hôte avec `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` en mode **debug** uniquement.
- Si aucun hôte n'est trouvé, ouvrez l'une des applications hôte (Peekaboo.app ou OpenClaw.app)
  et vérifiez que les permissions sont accordées.

import fr from '/components/footer/fr.mdx';

<fr />

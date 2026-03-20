---
summary: "Intégration PeekabooBridge pour l'automatisation de l'interface utilisateur macOS"
read_when:
  - Hébergement de PeekabooBridge dans OpenClaw.app
  - Intégration de Peekaboo via Swift Package Manager
  - Modification du protocole/chemins PeekabooBridge
title: "Pont Peekaboo"
---

# Pont Peekaboo (automatisation de l'interface utilisateur macOS)

OpenClaw peut héberger **PeekabooBridge** en tant que courtier d'automatisation d'interface utilisateur local, tenant compte des autorisations. Cela permet à la CLI `peekaboo` de piloter l'automatisation de l'interface utilisateur tout en réutilisant les autorisations TCC de l'application macOS.

## Ce que c'est (et ce que ce n'est pas)

- **Hôte** : OpenClaw.app peut agir en tant qu'hôte PeekabooBridge.
- **Client** : utilisez la CLI `peekaboo` (pas d'interface `openclaw ui ...` distincte).
- **Interface utilisateur** : les superpositions visuelles restent dans Peekaboo.app ; OpenClaw est un hôte de courtier léger.

## Activer le pont

Dans l'application macOS :

- Paramètres → **Activer le pont Peekaboo**

Lorsqu'il est activé, OpenClaw démarre un serveur de socket UNIX local. S'il est désactivé, l'hôte est arrêté et `peekaboo` se repliera sur d'autres hôtes disponibles.

## Ordre de découverte des clients

Les clients Peekaboo essaient généralement les hôtes dans cet ordre :

1. Peekaboo.app (interface utilisateur complète)
2. Claude.app (si installé)
3. OpenClaw.app (courtier léger)

Utilisez `peekaboo bridge status --verbose` pour voir quel hôte est actif et quel chemin de socket est utilisé. Vous pouvez remplacer avec :

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## Sécurité et autorisations

- Le pont valide les **signatures de code de l'appelant** ; une liste d'autorisation de TeamIDs est appliquée (TeamID de l'hôte Peekaboo + TeamID de l'application OpenClaw).
- Les demandes expirent après environ 10 secondes.
- Si les autorisations requises sont manquantes, le pont renvoie un message d'erreur clair plutôt que de lancer les Paramètres système.

## Comportement des instantanés (automatisation)

Les instantanés sont stockés en mémoire et expirent automatiquement après une courte période. Si vous avez besoin d'une rétention plus longue, recapturez depuis le client.

## Dépannage

- Si `peekaboo` signale « le client du pont n'est pas autorisé », assurez-vous que le client est correctement signé ou exécutez l'hôte avec `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` en mode **debug** uniquement.
- Si aucun hôte n'est trouvé, ouvrez l'une des applications hôtes (Peekaboo.app ou OpenClaw.app) et confirmez que les autorisations sont accordées.

import fr from "/components/footer/fr.mdx";

<fr />

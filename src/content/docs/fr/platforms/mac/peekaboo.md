---
summary: "Intégration PeekabooBridge pour l'automatisation de l'interface macOS"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
  - Deciding between PeekabooBridge, Codex Computer Use, and cua-driver MCP
title: "Pont Peekaboo"
---

OpenClaw peut héberger **PeekabooBridge** en tant que courtier d'automatisation d'interface utilisateur local et conscient des permissions. Cela permet à la OpenClaw`peekaboo`CLImacOS CLI de piloter l'automatisation de l'interface utilisateur tout en réutilisant les permissions TCC de l'application macOS.

## Ce que c'est (et ce que ce n'est pas)

- **Hôte** : OpenClaw.app peut agir en tant qu'hôte PeekabooBridge.
- **Client** : utilisez la `peekaboo` CLI (aucune `openclaw ui ...` surface distincte).
- **Interface utilisateur** : les superpositions visuelles restent dans Peekaboo.app ; OpenClaw est un hôte de courtier léger.

## Relation avec l'utilisation de l'ordinateur

OpenClaw possède trois chemins de contrôle du bureau, et ils restent intentionnellement séparés :

- **Hôte PeekabooBridge** : OpenClaw.app peut héberger le socket PeekabooBridge local.
  La OpenClaw`peekaboo`CLIOpenClawmacOSPeekaboo CLI reste le client et utilise les permissions macOS d'OpenClaw.app
  pour les primitives d'automatisation Peekaboo telles que les captures d'écran, les clics,
  les menus, les boîtes de dialogue, les actions du Dock et la gestion des fenêtres.
- **Utilisation de l'ordinateur Codex** : le plugin `codex` inclus prépare le serveur d'application Codex,
  vérifie que le serveur MCP `computer-use`OpenClaw de Codex est disponible, puis permet
  à Codex de posséder les appels d'outil de contrôle natif du bureau lors des tours en mode Codex. OpenClaw
  ne relaie pas ces actions via PeekabooBridge.
- **MCP `cua-driver`OpenClaw direct** : OpenClaw peut enregistrer le serveur
  `cua-driver mcp` en amont de TryCua en tant que serveur MCP normal. Cela offre aux agents les propres schémas
  du pilote CUA et le flux de travail pid/window/element-index sans acheminement
  via la place de marché Codex ou le socket PeekabooBridge.

Utilisez Peekaboo lorsque vous souhaitez la surface d'automatisation macOS étendue et l'hôte de pont conscient des permissions d'OpenClaw.app. Utilisez l'Utilisation de l'ordinateur Codex lorsqu'un agent en mode Codex
doit s'appuyer sur le plugin d'utilisation native de l'ordinateur de Codex. Utilisez le PeekaboomacOSOpenClaw`cua-driver mcp`OpenClaw
direct lorsque vous souhaitez que le pilote CUA soit exposé à tout environnement d'exécution géré par OpenClaw en tant que serveur
MCP normal.

## Activer le pont

Dans l'application macOS :

- Paramètres → **Activer Peekaboo Bridge**

Lorsqu'il est activé, OpenClaw démarre un serveur de socket UNIX local. S'il est désactivé, l'hôte
est arrêté et OpenClaw`peekaboo` reviendra aux autres hôtes disponibles.

## Ordre de découverte du client

Les clients Peekaboo tentent généralement de contacter les hôtes dans cet ordre :

1. Peekaboo.app (interface utilisateur complète)
2. Claude.app (si installé)
3. OpenClaw.app (courtier léger)

Utilisez `peekaboo bridge status --verbose` pour voir quel hôte est actif et quel chemin de socket est utilisé. Vous pouvez remplacer cela par :

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## Sécurité et autorisations

- Le pont valide les **signatures de code de l'appelant** ; une liste d'autorisation de TeamIDs est appliquée (TeamID de l'hôte Peekaboo + TeamID de l'application OpenClaw).
- Privilégiez l'identité de pont/application signée par rapport à un runtime `node` générique pour l'Accessibilité. Accorder l'Accessibilité à `node` permet à tout package lancé par cet exécutable Node d'hériter de l'accès à l'automatisation de l'interface graphique ; voir [autorisations macOS](/fr/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes).
- Les demandes expirent après environ 10 secondes.
- Si les autorisations requises sont manquantes, le pont renvoie un message d'erreur clair plutôt que de lancer les Réglages Système.

## Comportement des instantanés (automatisation)

Les instantanés sont stockés en mémoire et expirent automatiquement après une courte période. Si vous avez besoin d'une rétention plus longue, recapturez depuis le client.

## Dépannage

- Si `peekaboo` indique « bridge client is not authorized », assurez-vous que le client est correctement signé ou exécutez l'hôte avec `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` uniquement en mode **debug**.
- Si aucun hôte n'est trouvé, ouvrez l'une des applications hôtes (Peekaboo.app ou OpenClaw.app) et confirmez que les autorisations sont accordées.

## Connexes

- [Application macOS](/fr/platforms/macos)
- [Autorisations macOS](/fr/platforms/mac/permissions)

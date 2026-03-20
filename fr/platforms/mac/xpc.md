---
summary: "architecture IPC macOS pour l'application IPC, le transport du nœud passerelle et PeekabooBridge"
read_when:
  - Modification des contrats IPC ou de l'IPC de l'application de la barre de menus
title: "macOS IPC"
---

# Architecture IPC macOS d'OpenClaw

**Modèle actuel :** un socket Unix local connecte le **service hôte de nœud** à l'**application macOS** pour les approbations d'exécution + `system.run`. Un `openclaw-mac` de débogage CLI existe pour les vérifications de découverte/connexion ; les actions de l'agent passent toujours par le WebSocket du Gateway et `node.invoke`. L'automatisation de l'interface utilisateur utilise PeekabooBridge.

## Objectifs

- Une seule instance d'application GUI qui possède tout le travail orienté TCC (notifications, enregistrement d'écran, microphone, synthèse vocale, AppleScript).
- Une petite surface pour l'automatisation : passerelle + commandes de nœud, plus PeekabooBridge pour l'automatisation de l'interface utilisateur.
- Autorisations prévisibles : toujours le même ID de bundle signé, lancé par launchd, afin que les autorisations TCC persistent.

## Fonctionnement

### Passerelle + transport de nœud

- L'application exécute la passerelle (mode local) et s'y connecte en tant que nœud.
- Les actions de l'agent sont effectuées via `node.invoke` (par ex. `system.run`, `system.notify`, `canvas.*`).

### Service de nœud + IPC d'application

- Un service hôte de nœud sans tête se connecte au WebSocket de la passerelle.
- Les requêtes `system.run` sont transmises à l'application macOS via un socket Unix local.
- L'application effectue l'exécution dans le contexte de l'interface utilisateur, invite si nécessaire, et renvoie la sortie.

Diagramme (SCI) :

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge (automatisation de l'interface utilisateur)

- L'automatisation de l'interface utilisateur utilise un socket UNIX distinct nommé `bridge.sock` et le protocole JSON PeekabooBridge.
- Ordre de préférence de l'hôte (côté client) : Peekaboo.app → Claude.app → OpenClaw.app → exécution locale.
- Sécurité : les hôtes de pont nécessitent un TeamID autorisé ; la sortie de secours DEBUG-only same-UID est protégée par `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (convention Peekaboo).
- Voir : [utilisation de PeekabooBridge](/fr/platforms/mac/peekaboo) pour plus de détails.

## Flux opérationnels

- Redémarrer/reconstruire : `SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - Tue les instances existantes
  - Build + package Swift
  - Écriture/amorçage/lancement du LaunchAgent
- Instance unique : l'application quitte tôt si une autre instance avec le même ID de bundle est en cours d'exécution.

## Notes de durcissement

- Préférer exiger une correspondance de TeamID pour toutes les surfaces privilégiées.
- PeekabooBridge : `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (DEBUG-only) peut autoriser les appelants same-UID pour le développement local.
- Toute la communication reste locale uniquement ; aucune socket réseau n'est exposée.
- Les invites TCC proviennent uniquement du bundle de l'application GUI ; gardez l'ID de bundle signé stable lors des reconstructions.
- Durcissement IPC : mode socket `0600`, jeton, vérifications peer-UID, défi/réponse HMAC, TTL court.

import fr from "/components/footer/fr.mdx";

<fr />

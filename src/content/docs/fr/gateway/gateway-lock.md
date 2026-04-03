---
summary: "Garde singleton de la Gateway utilisant la liaison de l'écouteur WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Verrou de la Gateway"
---

# Verrou de la Gateway

## Pourquoi

- S'assurer qu'une seule instance de la passerelle s'exécute par port de base sur le même hôte ; les passerelles supplémentaires doivent utiliser des profils isolés et des ports uniques.
- Survivre aux plantages/SIGKILL sans laisser de fichiers de verrouillage obsolètes.
- Échouer rapidement avec une erreur claire lorsque le port de contrôle est déjà occupé.

## Mécanisme

- La passerelle lie l'écouteur WebSocket (par défaut `ws://127.0.0.1:18789`) immédiatement au démarrage en utilisant un écouteur TCP exclusif.
- Si la liaison échoue avec `EADDRINUSE`, le démarrage génère `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Le système d'exploitation libère l'écouteur automatiquement à n'importe quelle sortie de processus, y compris les plantages et SIGKILL — aucun fichier de verrouillage séparé ni étape de nettoyage n'est nécessaire.
- À l'arrêt, la passerelle ferme le serveur WebSocket et le serveur HTTP sous-jacent pour libérer le port rapidement.

## Surface d'erreur

- Si un autre processus détient le port, le démarrage génère `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Les autres échecs de liaison apparaissent sous la forme de `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notes opérationnelles

- Si le port est occupé par un _autre_ processus, l'erreur est la même ; libérez le port ou choisissez-en un autre avec `openclaw gateway --port <port>`.
- L'application macOS conserve toujours son propre garde PID léger avant de lancer la passerelle ; le verrouillage d'exécution est appliqué par la liaison WebSocket.

## Connexes

- [Plusieurs passerelles](/en/gateway/multiple-gateways) — exécution de plusieurs instances avec des ports uniques
- [Dépannage](/en/gateway/troubleshooting) — diagnostic de `EADDRINUSE` et des conflits de ports

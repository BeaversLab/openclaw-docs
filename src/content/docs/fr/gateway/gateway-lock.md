---
summary: "Garde singleton de la Gateway utilisant la liaison de l'écouteur WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Verrou de la Gateway"
---

# Verrou de la Gateway

Dernière mise à jour : 2025-12-11

## Pourquoi

- Garantir qu'une seule instance de la gateway s'exécute par port de base sur le même hôte ; les gateways supplémentaires doivent utiliser des profils isolés et des ports uniques.
- Survivre aux plantages/SIGKILL sans laisser de fichiers de verrouillage périmés.
- Échouer rapidement avec une erreur claire lorsque le port de contrôle est déjà occupé.

## Mécanisme

- La gateway lie l'écouteur WebSocket (par défaut `ws://127.0.0.1:18789`) immédiatement au démarrage en utilisant un écouteur TCP exclusif.
- Si la liaison échoue avec `EADDRINUSE`, le démarrage génère `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Le système d'exploitation libère l'écouteur automatiquement à toute sortie de processus, y compris les plantages et SIGKILL — aucun fichier de verrouillage séparé ni étape de nettoyage n'est nécessaire.
- À l'arrêt, la gateway ferme le serveur WebSocket et le serveur HTTP sous-jacent pour libérer le port rapidement.

## Surface d'erreur

- Si un autre processus détient le port, le démarrage génère `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Les autres échecs de liaison apparaissent sous la forme `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notes opérationnelles

- Si le port est occupé par un _autre_ processus, l'erreur est la même ; libérez le port ou choisissez-en un autre avec `openclaw gateway --port <port>`.
- L'application macOS maintient toujours son propre garde de PID léger avant de lancer la gateway ; le verrouillage d'exécution est appliqué par la liaison WebSocket.

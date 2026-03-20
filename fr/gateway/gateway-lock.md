---
summary: "Gardien de singleton Gateway utilisant la liaison de l'écouteur WebSocket"
read_when:
  - Exécution ou débogage du processus de passerelle
  - Enquête sur l'application de la instance unique
title: "Verrou Gateway"
---

# Verrou Gateway

Dernière mise à jour : 2025-12-11

## Pourquoi

- S'assurer qu'une seule instance de passerelle s'exécute par port de base sur le même hôte ; les passerelles supplémentaires doivent utiliser des profils isolés et des ports uniques.
- Survivre aux plantages/SIGKILL sans laisser de fichiers de verrouillage périmés.
- Échouer rapidement avec une erreur claire lorsque le port de contrôle est déjà occupé.

## Mécanisme

- La passerelle lie l'écouteur WebSocket (par défaut `ws://127.0.0.1:18789`) immédiatement au démarrage à l'aide d'un écouteur TCP exclusif.
- Si la liaison échoue avec `EADDRINUSE`, le démarrage lance `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Le système d'exploitation libère l'écouteur automatiquement à toute sortie de processus, y compris les plantages et SIGKILL — aucun fichier de verrouillage ou étape de nettoyage distinct n'est nécessaire.
- Lors de l'arrêt, la passerelle ferme le serveur WebSocket et le serveur HTTP sous-jacent pour libérer le port rapidement.

## Surface d'erreur

- Si un autre processus détient le port, le démarrage lance `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Les autres échecs de liaison se manifestent sous la forme `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notes opérationnelles

- Si le port est occupé par un _autre_ processus, l'erreur est la même ; libérez le port ou choisissez-en un autre avec `openclaw gateway --port <port>`.
- L'application macOS maintient toujours sa propre légère garde de PID avant de lancer la passerelle ; le verrouillage d'exécution est appliqué par la liaison WebSocket.

import fr from "/components/footer/fr.mdx";

<fr />

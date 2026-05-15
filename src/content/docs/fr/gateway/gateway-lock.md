---
summary: "Garde singleton de la Gateway utilisant la liaison de l'écouteur WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Verrou de la passerelle"
---

## Pourquoi

- S'assurer qu'une seule instance de la passerelle s'exécute par port de base sur le même hôte ; les passerelles supplémentaires doivent utiliser des profils isolés et des ports uniques.
- Survivre aux plantages/SIGKILL sans laisser de fichiers de verrouillage obsolètes.
- Échouer rapidement avec une erreur claire lorsque le port de contrôle est déjà occupé.

## Mécanisme

- La passerelle acquiert d'abord un fichier de verrouillage par configuration sous le répertoire de verrouillage d'état et sonde le port configuré pour un écouteur existant.
- Si le propriétaire du verrou enregistré a disparu, le port est libre ou le verrou est périmé, le démarrage récupère le verrou et continue.
- La passerelle lie ensuite l'écouteur HTTP/WebSocket (par défaut `ws://127.0.0.1:18789`) à l'aide d'un écouteur TCP exclusif.
- Si la liaison échoue avec `EADDRINUSE`, le démarrage lance `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Lors de l'arrêt, la passerelle ferme le serveur HTTP/WebSocket et supprime le fichier de verrouillage.

## Surface d'erreur

- Si un autre processus détient le port, le démarrage génère `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Les autres échecs de liaison apparaissent sous la forme de `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notes opérationnelles

- Si le port est occupé par un _autre_ processus, l'erreur est la même ; libérez le port ou choisissez-en un autre avec `openclaw gateway --port <port>`.
- Sous un superviseur de service, un nouveau processus de passerelle qui voit un répondeur `/healthz` sain existant laisse ce processus en contrôle. Sur systemd, le lanceur en double se termine avec le code 78 afin que le `RestartPreventExitStatus=78` par défaut empêche `Restart=always` de boucler sur un verrou ou un conflit `EADDRINUSE`. Si le processus existant ne devient jamais sain, les tentatives sont limitées et le démarrage échoue avec une erreur de verrou claire au lieu de boucler indéfiniment.
- L'application macOS maintient toujours sa propre protection légère de PID avant de lancer la passerelle ; le verrouillage d'exécution est appliqué par le fichier de verrou ainsi que par la liaison HTTP/WebSocket.

## Connexes

- [Passerelles multiples](/fr/gateway/multiple-gateways) — exécution de plusieurs instances avec des ports uniques
- [Dépannage](/fr/gateway/troubleshooting) — diagnostic des `EADDRINUSE` et des conflits de ports

---
summary: "Référence CLI pour `openclaw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "Logs"
---

# `openclaw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Aperçu de la journalisation : [Journalisation](/fr/logging)
- CLI Gateway : [gateway](GatewayCLI/en/cli/gateway)

## Options

- `--limit <n>` : nombre maximum de lignes de journal à renvoyer (par défaut `200`)
- `--max-bytes <n>` : nombre maximum d'octets à lire à partir du fichier de journal (par défaut `250000`)
- `--follow` : suivre le flux de journaux
- `--interval <ms>` : intervalle d'interrogation lors du suivi (par défaut `1000`)
- `--json` : émettre des événements JSON délimités par des lignes
- `--plain` : sortie en texte brut sans formatage de style
- `--no-color` : désactiver les couleurs ANSI
- `--local-time` : afficher les horodatages dans votre fuseau horaire local

## Options Gateway RPC partagées

`openclaw logs` accepte également les indicateurs client standard Gateway :

- `--url <url>` : URL WebSocket Gateway
- `--token <token>` : jeton Gateway
- `--timeout <ms>` : délai d'attente en ms (par défaut `30000`)
- `--expect-final` : attendre une réponse finale lorsque l'appel Gateway est assuré par un agent

Lorsque vous transmettez `--url`, le CLI n'applique pas automatiquement la configuration ou les informations d'identification de l'environnement. Incluez `--token` explicitement si le Gateway cible nécessite une authentification.

## Exemples

```bash
openclaw logs
openclaw logs --follow
openclaw logs --follow --interval 2000
openclaw logs --limit 500 --max-bytes 500000
openclaw logs --json
openclaw logs --plain
openclaw logs --no-color
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## Notes

- Utilisez `--local-time` pour afficher les horodatages dans votre fuseau horaire local.
- Si le Gateway local loopback implicite demande un appairage, se ferme pendant la connexion ou expire avant que Gateway`logs.tail` ne réponde, `openclaw logs`Gateway revient automatiquement au fichier journal du Gateway configuré. Les cibles `--url` explicites n'utilisent pas ce repli.
- `openclaw logs --follow`GatewayRPCLinuxGatewayGateway ne suit pas les fichiers de repli configurés après des échecs implicites du RPC Gateway local. Sur Linux, il utilise le journal Gateway systemd actif de l'utilisateur par PID lorsque disponible et imprime la source de journal sélectionnée ; sinon, il continue de réessayer le Gateway en direct au lieu de suivre un fichier côte à côte potentiellement périmé.
- Lors de l'utilisation de `--follow`, les déconnexions transitoires du gateway (fermeture WebSocket, expiration, interruption de connexion) déclenchent une reconnexion automatique avec un backoff exponentiel (jusqu'à 8 tentatives, plafonnées à 30 s entre les tentatives). Un avertissement est imprimé sur stderr à chaque nouvelle tentative, et un avis `[logs] gateway reconnected` est imprimé dès qu'un sondage réussit. En mode `--json`, l'avertissement de nouvelle tentative et la transition de reconnexion sont tous deux émis sous forme d'enregistrements `{"type":"notice"}` sur stderr. Les erreurs non récupérables (échec d'authentification, mauvaise configuration) provoquent toujours une sortie immédiate.

## Connexes

- [Référence CLI](CLI/en/cli)
- [Journalisation Gateway](Gateway/en/gateway/logging)

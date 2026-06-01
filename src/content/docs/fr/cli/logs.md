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
- `--local-time` : afficher les horodatages dans votre fuseau horaire local (par défaut)
- `--utc` : afficher les horodatages en UTC

## Options partagées RPC Gateway

`openclaw logs`Gateway accepte également les indicateurs de client Gateway standard :

- `--url <url>`Gateway : URL WebSocket Gateway
- `--token <token>`Gateway : jeton Gateway
- `--timeout <ms>` : délai d'attente en ms (par défaut `30000`)
- `--expect-final`Gateway : attendre une réponse finale lorsque l'appel Gateway est géré par l'agent

Lorsque vous passez `--url`CLI, la CLI n'applique pas automatiquement les informations d'identification de la configuration ou de l'environnement. Incluez `--token`Gateway explicitement si le Gateway cible nécessite une authentification.

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
openclaw logs --utc
openclaw logs --follow --local-time
openclaw logs --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

## Notes

- Par défaut, les horodatages s'affichent dans votre fuseau horaire local. Utilisez `--utc` pour une sortie UTC.
- Si le local loopback Gateway implicite demande un appairage, se ferme pendant la connexion ou expire avant que Gateway`logs.tail` ne réponde, `openclaw logs`Gateway revient automatiquement au fichier journal Gateway configuré. Les cibles `--url` explicites n'utilisent pas ce repli.
- `openclaw logs --follow`GatewayRPCLinuxGatewayGateway ne suit pas les replis de fichiers configurés après des échecs RPC Gateway local implicites. Sur Linux, il utilise le journal Gateway utilisateur-systemd actif par PID lorsque disponible et imprime la source de journal sélectionnée ; sinon, il continue à réessayer le Gateway en direct au lieu de faire un suivi d'un fichier côte à côte potentiellement obsolète.
- Lors de l'utilisation de `--follow`, les déconnexions transitoires du Gateway (fermeture WebSocket, expiration du délai d'attente, rupture de connexion) déclenchent une reconnexion automatique avec un temporisateur exponentiel (jusqu'à 8 tentatives, plafonnées à 30 s entre chaque tentative). Un avertissement est imprimé sur stderr à chaque nouvelle tentative, et un avis `[logs] gateway reconnected` est imprimé une fois qu'un sondage réussit. En mode `--json`, l'avertissement de tentative et la transition de reconnexion sont tous deux émis sous forme d'enregistrements `{"type":"notice"}` sur stderr. Les erreurs non récupérables (échec de l'authentification, mauvaise configuration) entraînent toujours une sortie immédiate.

## Connexes

- [Référence CLI](/fr/cli)
- [Journalisation du Gateway](/fr/gateway/logging)

---
summary: "Référence CLI pour `openclaw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `openclaw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Vue d'ensemble de la journalisation : [Logging](/en/logging)
- Gateway CLI : [gateway](/en/cli/gateway)

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
- Si le Gateway de boucle locale demande un appairage, `openclaw logs` revient automatiquement au fichier journal local configuré. Les cibles `--url` explicites n'utilisent pas ce repli.

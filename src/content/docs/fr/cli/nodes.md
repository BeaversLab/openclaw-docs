---
summary: "Référence CLI pour `openclaw nodes` (status, pairing, invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

Gérer les nœuds jumelés (appareils) et appeler les capacités des nœuds.

Connexes :

- Aperçu des nœuds : [Nodes](/fr/nodes)
- Caméra : [Camera nodes](/fr/nodes/camera)
- Images : [Image nodes](/fr/nodes/images)

Options courantes :

- `--url`, `--token`, `--timeout`, `--json`

## Commandes courantes

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` affiche les tableaux en attente/jumelés. Les lignes jumelées incluent la durée écoulée depuis la connexion la plus récente (Dernière connexion).
Utilisez `--connected` pour afficher uniquement les nœuds actuellement connectés. Utilisez `--last-connected <duration>` pour
filtrer les nœuds qui se sont connectés dans une durée donnée (ex. `24h`, `7d`).

Note d'approbation :

- `openclaw nodes pending` nécessite uniquement la portée d'appariement.
- `openclaw nodes approve <requestId>` hérite des exigences de portée supplémentaires de la
  requête en attente :
  - requête sans commande : appariement uniquement
  - commandes de nœud non-exécutables : appariement + écriture
  - `system.run` / `system.run.prepare` / `system.which` : appariement + admin

## Invoke

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Invoke flags :

- `--params <json>` : chaîne d'objet JSON (par défaut `{}`).
- `--invoke-timeout <ms>` : délai d'expiration d'appel de nœud (par défaut `15000`).
- `--idempotency-key <key>` : clé d'idempotence facultative.
- `system.run` et `system.run.prepare` sont bloqués ici ; utilisez l'outil `exec` avec `host=node` pour l'exécution de shell.

Pour l'exécution de shell sur un nœud, utilisez l'outil `exec` avec `host=node` au lieu de `openclaw nodes run`.
La `nodes` CLI est désormais axée sur les capacités : RPC directe via `nodes invoke`, ainsi que l'appariement, la caméra,
l'écran, la localisation, le canvas et les notifications.

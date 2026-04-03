---
summary: "Référence CLI pour `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodes"
---

# `openclaw nodes`

Gérer les nœuds jumelés (appareils) et appeler les capacités des nœuds.

Connexes :

- Vue d'ensemble des nœuds : [Nœuds](/en/nodes)
- Caméra : [Nœuds de caméra](/en/nodes/camera)
- Images : [Nœuds d'image](/en/nodes/images)

Options courantes :

- `--url`, `--token`, `--timeout`, `--json`

## Commandes courantes

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` affiche les tableaux en attente/jumelés. Les lignes jumelées incluent la durée écoulée depuis la connexion la plus récente (Dernière connexion).
Utilisez `--connected` pour afficher uniquement les nœuds actuellement connectés. Utilisez `--last-connected <duration>` pour
filtrer les nœuds qui se sont connectés dans une durée donnée (ex. `24h`, `7d`).

## Invoquer

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Options d'appel :

- `--params <json>` : chaîne d'objet JSON (par défaut `{}`).
- `--invoke-timeout <ms>` : délai d'attente d'appel du nœud (par défaut `15000`).
- `--idempotency-key <key>` : clé d'idempotence facultative.
- `system.run` et `system.run.prepare` sont bloqués ici ; utilisez l'outil `exec` avec `host=node` pour l'exécution de shell.

Pour l'exécution de shell sur un nœud, utilisez l'outil `exec` avec `host=node` au lieu de `openclaw nodes run`.
La `nodes` CLI est désormais axée sur les fonctionnalités : RPC directe via `nodes invoke`, ainsi que l'appairage, la caméra,
l'écran, la localisation, le canvas et les notifications.

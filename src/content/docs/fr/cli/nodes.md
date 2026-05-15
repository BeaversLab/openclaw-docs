---
summary: "Référence CLI pour `openclaw nodes` (status, pairing, invoke, camera/canvas/screen)"
read_when:
  - You're managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "Nodes"
---

# `openclaw nodes`

Gérer les nœuds jumelés (appareils) et appeler les capacités des nœuds.

Connexes :

- Aperçu des Nodes : [Nodes](/fr/nodes)
- Caméra : [Nodes de caméra](/fr/nodes/camera)
- Images : [Nodes d'image](/fr/nodes/images)

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
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` affiche les tableaux des nœuds en attente/appariés. Les lignes appariées incluent l'âge de la connexion la plus récente (Last Connect).
Utilisez `--connected` pour afficher uniquement les nœuds actuellement connectés. Utilisez `--last-connected <duration>` pour
filtrer les nœuds qui se sont connectés dans une durée donnée (par ex. `24h`, `7d`).
Utilisez `nodes remove --node <id|name|ip>` pour supprimer un enregistrement d'appariement de nœud périmé appartenant à la passerelle.

Note d'approbation :

- `openclaw nodes pending` nécessite uniquement la portée d'appariement.
- `gateway.nodes.pairing.autoApproveCidrs` peut ignorer l'étape en attente uniquement pour
  l'appareil d'appariement de nœud `role: node` de première fois explicitement approuvé. Il est désactivé par
  défaut et n'approuve pas les mises à niveau.
- `openclaw nodes approve <requestId>` hérite des exigences de portée supplémentaires de la
  requête en attente :
  - requête sans commande : appariement uniquement
  - commandes de nœud non-exéc : appariement + écriture
  - `system.run` / `system.run.prepare` / `system.which` : appariement + admin

## Appeler

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Drapeaux d'appel (Invoke flags) :

- `--params <json>` : chaîne d'objet JSON (par défaut `{}`).
- `--invoke-timeout <ms>` : délai d'attente d'appel de nœud (par défaut `15000`).
- `--idempotency-key <key>` : clé d'idempotence facultative.
- `system.run` et `system.run.prepare` sont bloqués ici ; utilisez l'tool `exec` avec `host=node` pour l'exécution de shell.

Pour l'exécution de shell sur un nœud, utilisez l'outil `exec` avec `host=node` au lieu de `openclaw nodes run`.
La CLI `nodes` CLIRPC est désormais axée sur les fonctionnalités : RPC direct via `nodes invoke`, ainsi que l'appariement, la caméra,
l'écran, la localisation, Canvas et les notifications. Les commandes Canvas sont implémentées par le plugin expérimental Canvas inclus ; le cœur conserve un hook de compatibilité pour qu'elles restent sous `openclaw nodes canvas`.

## Connexes

- [Référence CLI](/fr/cli)
- [Nodes](/fr/nodes)

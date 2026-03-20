---
summary: "Référence de la CLI pour `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - Vous gérez des nœuds appairés (caméras, écran, canvas)
  - Vous devez approuver des demandes ou invoquer des commandes de nœuds
title: "nodes"
---

# `openclaw nodes`

Gérer les nœuds appairés (appareils) et invoquer les capacités des nœuds.

Connexe :

- Aperçu des nœuds : [Nœuds](/fr/nodes)
- Caméra : [Nœuds de caméra](/fr/nodes/camera)
- Images : [Nœuds d'image](/fr/nodes/images)

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

`nodes list` affiche les tableaux des nœuds en attente/appairés. Les lignes appairées incluent la durée depuis la connexion la plus récente (Dernière connexion).
Utilisez `--connected` pour afficher uniquement les nœuds actuellement connectés. Utilisez `--last-connected <duration>` pour
filtrer les nœuds qui se sont connectés dans une durée donnée (par ex. `24h`, `7d`).

## Invoke / run

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

Invoke flags :

- `--params <json>` : chaîne d'objet JSON (par défaut `{}`).
- `--invoke-timeout <ms>` : délai d'expiration de l'appel du nœud (par défaut `15000`).
- `--idempotency-key <key>` : clé d'idempotence facultative.

### Exec-style defaults

`nodes run` reflète le comportement exec du modèle (défauts + approbations) :

- Lit `tools.exec.*` (plus les remplacements `agents.list[].tools.exec.*`).
- Utilise les approbations exec (`exec.approval.request`) avant d'invoquer `system.run`.
- `--node` peut être omis lorsque `tools.exec.node` est défini.
- Nécessite un nœud qui annonce `system.run` (application compagnon macOS ou hôte de nœud headless).

Flags :

- `--cwd <path>` : répertoire de travail.
- `--env <key=val>` : remplacement env (répétable). Remarque : les hôtes de nœuds ignorent les remplacements `PATH` (et `tools.exec.pathPrepend` n'est pas appliqué aux hôtes de nœuds).
- `--command-timeout <ms>` : délai d'expiration de la commande.
- `--invoke-timeout <ms>` : délai d'expiration d'appel de nœud (par défaut `30000`).
- `--needs-screen-recording` : nécessite la permission d'enregistrement d'écran.
- `--raw <command>` : exécuter une chaîne shell (`/bin/sh -lc` ou `cmd.exe /c`).
  En mode liste blanche sur les hôtes de nœuds Windows, les exécutions du shell-wrapper `cmd.exe /c` nécessitent une approbation
  (une entrée de liste blanche n'autorise pas automatiquement le formulaire wrapper).
- `--agent <id>` : approbations/listes blanches limitées à l'agent (par défaut l'agent configuré).
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>` : substitutions.

import fr from "/components/footer/fr.mdx";

<fr />

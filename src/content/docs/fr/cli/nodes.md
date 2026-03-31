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

- Aperçu des nœuds : [Nœuds](/en/nodes)
- Caméra : [Nœuds caméra](/en/nodes/camera)
- Images : [Nœuds image](/en/nodes/images)

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

## Appeler / exécuter

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

Options d'appel :

- `--params <json>` : chaîne d'objet JSON (par défaut `{}`).
- `--invoke-timeout <ms>` : délai d'attente d'appel du nœud (par défaut `15000`).
- `--idempotency-key <key>` : clé d'idempotence facultative.

### Valeurs par défaut style Exec

`nodes run` reflète le comportement exec du modèle (valeurs par défaut + approbations) :

- Lit `tools.exec.*` (plus les remplacements `agents.list[].tools.exec.*`).
- Utilise les approbations exec (`exec.approval.request`) avant d'appeler `system.run`.
- `--node` peut être omis lorsque `tools.exec.node` est défini.
- Nécessite un nœud qui annonce `system.run` (application compagnon macOS ou hôte de nœud headless).

Options :

- `--cwd <path>` : répertoire de travail.
- `--env <key=val>` : substitution de variable d’environnement (répétable). Remarque : les hôtes de nœuds ignorent les substitutions de `PATH` (et `tools.exec.pathPrepend` n’est pas appliqué aux hôtes de nœuds).
- `--command-timeout <ms>` : délai d’attente de la commande.
- `--invoke-timeout <ms>` : délai d’attente d’appel de nœud (par défaut `30000`).
- `--needs-screen-recording` : exiger la permission d’enregistrement d’écran.
- `--raw <command>` : exécuter une chaîne de shell (`/bin/sh -lc` ou `cmd.exe /c`).
  En mode liste blanche sur les hôtes de nœuds Windows, les exécutions du wrapper de shell `cmd.exe /c` nécessitent une approbation
  (une entrée de liste blanche seule n’autorise pas automatiquement la forme wrapper).
- `--agent <id>` : approbations/listes blanches limitées à l’agent (par défaut l’agent configuré).
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>` : substitutions.

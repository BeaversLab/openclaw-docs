---
summary: "OpenProse : workflows .prose, commandes slash et état dans OpenClaw"
read_when:
  - Vous souhaitez exécuter ou rédiger des workflows .prose
  - Vous souhaitez activer le plugin OpenProse
  - Vous devez comprendre le stockage d'état
title: "OpenProse"
---

# OpenProse

OpenProse est un format de workflow portable, d'abord en markdown, pour orchestrer des sessions d'IA. Dans OpenClaw, il est fourni sous forme de plugin qui installe un pack de compétences OpenProse ainsi qu'une commande slash `/prose`. Les programmes résident dans des fichiers `.prose` et peuvent générer plusieurs sous-agents avec un flux de contrôle explicite.

Site officiel : [https://www.prose.md](https://www.prose.md)

## Ce qu'il peut faire

- Recherche et synthèse multi-agents avec parallélisme explicite.
- Workflows répétables et sûrs en termes d'approbation (révision de code, triage des incidents, pipelines de contenu).
- Programmes `.prose` réutilisables que vous pouvez exécuter sur les runtimes d'agents pris en charge.

## Installer + activer

Les plugins groupés sont désactivés par défaut. Activez OpenProse :

```bash
openclaw plugins enable open-prose
```

Redémarrez la passerelle (Gateway) après avoir activé le plugin.

Checkout dev/local : `openclaw plugins install ./extensions/open-prose`

Documentation connexe : [Plugins](/fr/tools/plugin), [Plugin manifest](/fr/plugins/manifest), [Skills](/fr/tools/skills).

## Commande slash

OpenProse enregistre `/prose` en tant que commande de compétence invocable par l'utilisateur. Il route vers les instructions de la machine virtuelle OpenProse et utilise les outils OpenClaw en arrière-plan.

Commandes courantes :

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## Exemple : un fichier `.prose` simple

```prose
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## Emplacements des fichiers

OpenProse conserve l'état sous `.prose/` dans votre espace de travail :

```
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

Les agents persistants au niveau de l'utilisateur résident à :

```
~/.prose/agents/
```

## Modes d'état

OpenProse prend en charge plusieurs backends d'état :

- **filesystem** (par défaut) : `.prose/runs/...`
- **in-context** : transitoire, pour les petits programmes
- **sqlite** (expérimental) : nécessite le binaire `sqlite3`
- **postgres** (expérimental) : nécessite `psql` et une chaîne de connexion

Notes :

- sqlite/postgres sont optionnels et expérimentaux.
- Les identifiants postgres se retrouvent dans les journaux des sous-agents ; utilisez une base de données dédiée avec les privilèges minimum.

## Programmes distants

`/prose run <handle/slug>` correspond à `https://p.prose.md/<handle>/<slug>`.
Les URL directes sont récupérées telles quelles. Cela utilise l'outil `web_fetch` (ou `exec` pour POST).

## Mappage du runtime OpenClaw

Les programmes OpenProse correspondent aux primitives OpenClaw :

| Concept OpenProse            | Outil OpenClaw   |
| ---------------------------- | ---------------- |
| Lancer session / Outil Tâche | `sessions_spawn` |
| Lecture/écriture de fichier  | `read` / `write` |
| Récupération Web             | `web_fetch`      |

Si votre liste blanche d'outils bloque ces outils, les programmes OpenProse échoueront. Voir [Configuration des Skills](/fr/tools/skills-config).

## Sécurité + approbations

Traitez les fichiers `.prose` comme du code. Passez-les en revue avant de les exécuter. Utilisez les listes blanches d'outils OpenClaw et les portes d'approbation pour contrôler les effets secondaires.

Pour des workflows déterministes avec validation, comparez avec [Lobster](/fr/tools/lobster).

import fr from "/components/footer/fr.mdx";

<fr />

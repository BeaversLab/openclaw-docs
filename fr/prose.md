---
summary: "OpenProse : workflows .prose, commandes slash et état dans OpenClaw"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

# OpenProse

OpenProse est un format de workflow portable, basé sur le markdown, pour orchestrer des sessions d'IA. Dans OpenClaw, il est livré sous forme de plugin qui installe un pack de compétences OpenProse ainsi qu'une commande slash `/prose`. Les programmes résident dans des fichiers `.prose` et peuvent générer plusieurs sous-agents avec un flux de contrôle explicite.

Site officiel : [https://www.prose.md](https://www.prose.md)

## Ce qu'il peut faire

- Recherche et synthèse multi-agents avec un parallélisme explicite.
- Workflows reproductibles et sûrs en matière d'approbations (revue de code, triage d'incidents, pipelines de contenu).
- Programmes `.prose` réutilisables que vous pouvez exécuter sur les runtimes d'agents pris en charge.

## Installer + activer

Les plugins groupés sont désactivés par défaut. Activez OpenProse :

```bash
openclaw plugins enable open-prose
```

Redémarrez la Gateway après avoir activé le plugin.

Checkout Dev/local : `openclaw plugins install ./extensions/open-prose`

Documentation connexe : [Plugins](/fr/tools/plugin), [Manifeste de plugin](/fr/plugins/manifest), [Compétences](/fr/tools/skills).

## Commande slash

OpenProse enregistre `/prose` en tant que commande de compétence invocable par l'utilisateur. Il achemine vers les instructions de la machine virtuelle OpenProse et utilise les outils OpenClaw en arrière-plan.

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
- les identifiants postgres transitent dans les journaux des sous-agents ; utilisez une base de données dédiée avec le moins de privilèges possible.

## Programmes distants

`/prose run <handle/slug>` est résolu en `https://p.prose.md/<handle>/<slug>`.
Les URL directes sont récupérées telles quelles. Cela utilise l'outil `web_fetch` (ou `exec` pour POST).

## Mapping du runtime OpenClaw

Les programmes OpenProse correspondent aux primitives OpenClaw :

| Concept OpenProse            | Outil OpenClaw   |
| ---------------------------- | ---------------- |
| Spawn session / Task tool    | `sessions_spawn` |
| Lecture/écriture de fichiers | `read` / `write` |
| Récupération Web             | `web_fetch`      |

Si votre liste blanche d'outils bloque ces outils, les programmes OpenProse échoueront. Voir [Skills config](/fr/tools/skills-config).

## Sécurité + approbations

Traitez les fichiers `.prose` comme du code. Révisez-les avant exécution. Utilisez les listes blanches d'outils OpenClaw et les portails d'approbation pour contrôler les effets secondaires.

Pour des flux de travail déterministes et soumis à approbation, comparer avec [Lobster](/fr/tools/lobster).

import fr from "/components/footer/fr.mdx";

<fr />

---
summary: "Référence de la CLI pour `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

Inspect local skills, search ClawHub, install skills from ClawHub/Git/local directories, and update
ClawHub-tracked installs.

Connexes :

- Système de compétences : [Skills](/fr/tools/skills)
- Configuration des compétences : [Skills config](/fr/tools/skills-config)
- Installations ClawHub : [ClawHub](/fr/clawhub/cli)

## Commandes

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install git:owner/repo
openclaw skills install git:owner/repo@main
openclaw skills install ./path/to/skill --as custom-name
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills install <slug> --global
openclaw skills update <slug>
openclaw skills update <slug> --global
openclaw skills update --all
openclaw skills update --all --agent <id>
openclaw skills update --all --global
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills list --agent <id>
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills info <name> --agent <id>
openclaw skills check
openclaw skills check --agent <id>
openclaw skills check --json
```

`search` et `update` utilisent ClawHub directement. `install <slug>` installe une compétence
ClawHub, `install git:owner/repo[@ref]` clone une compétence Git et `install ./path`
copie un répertoire de compétences local. Par défaut, `install` et `update` ciblent le
répertoire `skills/` de l'espace de travail actif ; avec `--global`, ils ciblent le répertoire
géré partagé des compétences. `list`/`info`/`check` inspectent toujours les compétences
locales visibles par l'espace de travail et la configuration actuels. Les commandes basées sur l'espace de travail
résolvent l'espace de travail cible à partir de `--agent <id>`, puis du répertoire de travail actuel
lorsqu'il se trouve dans un espace de travail d'agent configuré, puis l'agent par défaut.

Les installations depuis Git et les répertoires locaux s'attendent à `SKILL.md` à la racine de la source. L'identifiant
d'installation provient du champ `name` de la frontmatter `SKILL.md` lorsqu'il est valide, puis du
nom du répertoire source ou du référentiel ; utilisez `--as <slug>` pour le remplacer. `--version`
est exclusif à ClawHub. Les installations de compétences ne prennent pas en charge les spécifications de packages npm ou les chemins de zip/archive,
et `openclaw skills update` met à jour uniquement les installations suivies par ClawHub.

Les installations de dépendances de compétences soutenues par Gateway déclenchées depuis l'intégration ou les paramètres
de Skills utilisent plutôt le chemin de requête `skills.install` séparé.

Notes :

- `search [query...]` accepte une requête facultative ; omettez-la pour parcourir le flux de recherche par défaut de ClawHub.
- `search --limit <n>` limite les résultats renvoyés.
- `install git:owner/repo[@ref]` installe une compétence Git. Les références de branche peuvent contenir des barres obliques, comme `git:owner/repo@feature/foo`.
- `install ./path/to/skill` installe un répertoire local dont la racine contient `SKILL.md`.
- `install --as <slug>` remplace le slug déduit pour les installations Git et de répertoire local.
- `install --version <version>` ne s'applique qu'aux slugs de compétences ClawHub.
- `install --force` écrase un dossier de compétence de l'espace de travail existant pour le même slug.
- `--global` cible le répertoire partagé des compétences gérées et ne peut pas être combiné avec `--agent <id>`.
- `--agent <id>` cible un espace de travail d'agent configuré et remplace la déduction du répertoire de travail actuel.
- `update <slug>` met à jour une seule compétence suivie. Ajoutez `--global` pour cibler le répertoire partagé des compétences gérées au lieu de l'espace de travail.
- `update --all` met à jour les installations ClawHub suivies dans l'espace de travail sélectionné, ou dans le répertoire partagé des compétences gérées lorsqu'il est combiné avec `--global`.
- `check --agent <id>` vérifie l'espace de travail de l'agent sélectionné et indique quelles compétences prêtes sont réellement visibles par l'invite de commande ou l'interface de commande de cet agent.
- `list` est l'action par défaut lorsqu'aucune sous-commande n'est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec `--json`, cela signifie que la payload lisible par la machine reste sur stdout pour les tuyaux (pipes) et les scripts.

## Connexes

- [Référence CLI](/fr/cli)
- [Skills](/fr/tools/skills)

---
summary: "Référence de la CLI pour `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

Inspecter les compétences locales et installer/mettre à jour les compétences depuis ClawHub.

Connexes :

- Système de Skills : [Skills](/fr/tools/skills)
- Configuration des Skills : [Skills config](/fr/tools/skills-config)
- Installations ClawHub : [ClawHub](ClawHubClawHub/en/clawhub/cli)

## Commandes

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
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

`search`/`install`/`update`ClawHub utilisent ClawHub directement. Par défaut, `install` et
`update` ciblent le répertoire `skills/` de l'espace de travail actif ; avec `--global`, ils
ciblent le répertoire géré et partagé des Skills. `list`/`info`/`check` inspectent toujours
les Skills locaux visibles pour l'espace de travail et la configuration actuels. Les commandes
basées sur l'espace de travail résolvent l'espace de travail cible à partir de `--agent <id>`, puis du
répertoire de travail actuel lorsqu'il se trouve dans un espace de travail d'agent configuré, puis de
l'agent par défaut.

Cette commande CLI CLI`install`ClawHubGateway télécharge les dossiers de Skills depuis ClawHub. Les installations
de dépendances de Skills sauvegardées par la Gateway et déclenchées depuis l'onboarding ou les paramètres des Skills utilisent
le chemin de requête `skills.install` séparé à la place.

Notes :

- `search [query...]`ClawHub accepte une requête facultative ; omettez-la pour parcourir le flux de
  recherche ClawHub par défaut.
- `search --limit <n>` limite les résultats renvoyés.
- `install --force` écrase un dossier de Skills d'espace de travail existant pour le même
  slug.
- `--global` cible le répertoire géré partagé des Skills et ne peut pas être combiné
  avec `--agent <id>`.
- `--agent <id>` cible un espace de travail d'agent configuré et remplace l'inférence
  du répertoire de travail actuel.
- `update <slug>` met à jour une seule Skill suivie. Ajoutez `--global` pour cibler le
  répertoire géré partagé des Skills au lieu de l'espace de travail.
- `update --all`ClawHub met à jour les installations ClawHub suivies dans l'espace de travail sélectionné, ou
  dans le répertoire géré partagé des Skills lorsqu'il est combiné avec `--global`.
- `check --agent <id>` vérifie l'espace de travail de l'agent sélectionné et signale quelles
  compétences prêtes sont réellement visibles pour la surface de prompt ou de commande de cet agent.
- `list` est l'action par défaut lorsqu'aucune sous-commande n'est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec
  `--json`, cela signifie que la charge utile lisible par la machine reste sur stdout pour les pipes
  et les scripts.

## Connexe

- [Référence CLI](/fr/cli)
- [Skills](/fr/tools/skills)

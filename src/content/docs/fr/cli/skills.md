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

- Système de compétences : [Skills](/fr/tools/skills)
- Configuration des compétences : [Skills config](/fr/tools/skills-config)
- Installations ClawHub : [ClawHub](ClawHubClawHub/en/clawhub/cli)

## Commandes

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills install <slug> --agent <id>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills update --all --agent <id>
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

`search`/`install`/`update`ClawHub utilisent ClawHub directement et installent dans le répertoire de l'espace de travail actif `skills/`. `list`/`info`/`check` inspectent toujours les compétences locales visibles pour l'espace de travail et la configuration actuels. Les commandes basées sur l'espace de travail résolvent l'espace de travail cible à partir de `--agent <id>`, puis du répertoire de travail actuel lorsqu'il se trouve dans un espace de travail d'agent configuré, puis de l'agent par défaut.

Cette commande CLI CLI`install`ClawHubGateway télécharge des dossiers de compétences depuis ClawHub. Les installations de dépendances de compétences basées sur la Gateway, déclenchées depuis l'onboarding ou les paramètres des compétences, utilisent plutôt le chemin de requête séparé `skills.install`.

Notes :

- `search [query...]`ClawHub accepte une requête facultative ; omettez-la pour parcourir le flux de recherche ClawHub par défaut.
- `search --limit <n>` limite les résultats renvoyés.
- `install --force` écrase un dossier de compétences d'espace de travail existant pour le même slug.
- `--agent <id>` cible un espace de travail d'agent configuré et remplace l'inférence du répertoire de travail actuel.
- `update --all`ClawHub met uniquement à jour les installations ClawHub suivies dans l'espace de travail actif.
- `check --agent <id>` vérifie l'espace de travail de l'agent sélectionné et signale quelles compétences prêtes sont réellement visibles pour l'invite de commande ou la surface de commande de cet agent.
- `list` est l'action par défaut lorsqu aucune sous-commande n'est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec `--json`, cela signifie que la charge utile lisible par la machine reste sur stdout pour les pipes et les scripts.

## Connexes

- [Référence CLI](/fr/cli)
- [Skills](/fr/tools/skills)

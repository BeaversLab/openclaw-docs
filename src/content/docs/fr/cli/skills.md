---
summary: "Référence de la CLI pour `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from ClawHub
  - You want to debug missing binaries/env/config for skills
title: "compétences"
---

# `openclaw skills`

Inspecter les compétences locales et installer/mettre à jour les compétences depuis ClawHub.

Connexes :

- Système de Skills : [Skills](/fr/tools/skills)
- Configuration des Skills : [Skills config](/fr/tools/skills-config)
- Installations ClawHub : [ClawHub](/fr/tools/clawhub)

## Commandes

```bash
openclaw skills search "calendar"
openclaw skills search --limit 20 --json
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills install <slug> --force
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills list --json
openclaw skills list --verbose
openclaw skills info <name>
openclaw skills info <name> --json
openclaw skills check
openclaw skills check --json
```

`search`/`install`/`update` utilisent ClawHub directement et installent dans le répertoire `skills/` de l'espace de travail actif. `list`/`info`/`check` inspectent toujours les compétences locales visibles pour l'espace de travail et la configuration actuels.

Cette commande CLI `install` télécharge des dossiers de compétences depuis ClawHub. Les installations de dépendances de compétences prises en charge par Gateway et déclenchées depuis l'onboarding ou les paramètres Skills utilisent plutôt le chemin de requête `skills.install` distinct.

Notes :

- `search [query...]` accepte une requête facultative ; omettez-la pour parcourir le flux de recherche ClawHub par défaut.
- `search --limit <n>` limite les résultats renvoyés.
- `install --force` écrase un dossier de skill d'espace de travail existant pour le même slug.
- `update --all` met à jour uniquement les installations ClawHub suivies dans l'espace de travail actif.
- `list` est l'action par défaut lorsqu'aucune sous-commande n'est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec `--json`, cela signifie que la payload lisible par machine reste sur stdout pour les tubes et les scripts.

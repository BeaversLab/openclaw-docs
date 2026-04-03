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

- Système de compétences : [Skills](/en/tools/skills)
- Configuration des compétences : [Skills config](/en/tools/skills-config)
- Installations ClawHub : [ClawHub](/en/tools/clawhub)

## Commandes

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` utilisent ClawHub directement et installent dans le répertoire `skills/` de l'espace de travail actif. `list`/`info`/`check` inspectent toujours les compétences locales visibles pour l'espace de travail et la configuration actuels.

Cette commande CLI `install` télécharge des dossiers de compétences depuis ClawHub. Les installations de dépendances de compétences prises en charge par Gateway et déclenchées depuis l'onboarding ou les paramètres Skills utilisent plutôt le chemin de requête `skills.install` distinct.

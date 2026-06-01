---
summary: "CLIRéférence CLI pour `openclaw skills` (recherche/installation/mise à jour/vérification/liste/infos/vérification)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You want to verify a ClawHub skill with ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `openclaw skills`

Inspecter les compétences locales, rechercher ClawHub, installer des compétences depuis ClawHub/Git/les répertoires locaux, vérifier les compétences ClawHub, et mettre à jour les installations suivies par ClawHub.

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
openclaw skills verify <slug>
openclaw skills verify <slug> --version <version>
openclaw skills verify <slug> --tag <tag>
openclaw skills verify <slug> --card
openclaw skills verify <slug> --global
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

`search`, `update` et `verify`ClawHub utilisent ClawHub directement. `install <slug>`ClawHub installe une compétence ClawHub, `install git:owner/repo[@ref]` clone une compétence Git et `install ./path` copie un répertoire de compétences local. Par défaut, `install`, `update` et `verify` ciblent le répertoire `skills/` de l'espace de travail actif ; avec `--global`, ils ciblent le répertoire géré partagé des compétences. `list`/`info`/`check` inspectent toujours les compétences locales visibles pour l'espace de travail et la configuration actuels. Les commandes basées sur l'espace de travail résolvent l'espace de travail cible à partir de `--agent <id>`, puis du répertoire de travail actuel lorsqu'il se trouve dans un espace de travail d'agent configuré, puis de l'agent par défaut.

Les installations depuis Git et des répertoires locaux s'attendent à `SKILL.md` à la racine de la source. Le slug d'installation provient du `name` `SKILL.md` frontmatter lorsqu'il est valide, puis du répertoire source ou du nom du référentiel ; utilisez `--as <slug>` pour le remplacer. `--version`ClawHubnpm est réservé à ClawHub. Les installations de compétences ne prennent pas en charge les spécifications de paquets npm ou les chemins zip/archive, et `openclaw skills update`ClawHub ne met à jour que les installations suivies par ClawHub.

Les installations de dépendances de compétences prises en charge par Gateway, déclenchées depuis l'onboarding ou les paramètres Skills, utilisent plutôt le chemin de requête séparé Gateway`skills.install`.

Notes :

- `search [query...]`ClawHub accepte une requête facultative ; omettez-la pour parcourir le flux de recherche ClawHub par défaut.
- `search --limit <n>` limite les résultats renvoyés.
- `install git:owner/repo[@ref]` installe une compétence Git. Les références de branche peuvent contenir des barres obliques, comme `git:owner/repo@feature/foo`.
- `install ./path/to/skill` installe un répertoire local dont la racine contient `SKILL.md`.
- `install --as <slug>` remplace le slug déduit pour les installations depuis Git et les répertoires locaux.
- `install --version <version>`ClawHub s'applique uniquement aux slugs de compétences ClawHub.
- `install --force` écrase le dossier de compétence de l'espace de travail existant pour le même slug.
- `--global` cible le répertoire partagé des compétences gérées et ne peut pas être combiné avec `--agent <id>`.
- `--agent <id>` cible un espace de travail d'agent configuré et remplace la déduction du répertoire de travail actuel.
- `update <slug>` met à jour une compétence suivie unique. Ajoutez `--global` pour cibler le répertoire partagé des compétences gérées au lieu de l'espace de travail.
- `update --all`ClawHub met à jour les installations ClawHub suivies dans l'espace de travail sélectionné, ou dans le répertoire partagé des compétences gérées lorsqu'il est combiné avec `--global`.
- `verify <slug>`ClawHub imprime l'enveloppe JSON `clawhub.skill.verify.v1` de ClawHub par défaut. Il n'y a pas d'indicateur `--json` car JSON est déjà la valeur par défaut.
- `verify` utilise `.clawhub/origin.json`ClawHub pour les compétences ClawHub installées, il vérifie donc la version installée par rapport au registre d'origine. `--version` et `--tag` remplacent le sélecteur de version mais conservent ce registre installé lorsque les métadonnées d'origine existent.
- `verify --card` imprime la Markdown de la Skill Card générée au lieu du JSON. La
  commande se termine avec un code non nul lorsque ClawHub renvoie `ok: false` ou `decision: "fail"` ;
  les signatures non signées sont informatives, sauf si la politique de ClawHub change.
- Les bundles ClawHub installés peuvent inclure un `skill-card.md` généré. OpenClaw
  traite la vérification comme une décision du serveur ClawHub et ne rejette pas une
  skill installée simplement parce que cette carte générée modifie l'empreinte
  du bundle.
- `check --agent <id>` vérifie l'espace de travail de l'agent sélectionné et signale quelles
  skills prêtes sont réellement visibles pour l'invite de commande ou la surface de commande de cet agent.
- `list` est l'action par défaut lorsqu aucune sous-commande n est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec
  `--json`, cela signifie que la charge utile lisible par la machine reste sur stdout pour les pipes
  et les scripts.

## Connexes

- [Référence CLI](/fr/cli)
- [Skills](/fr/tools/skills)

---
summary: "CLIRéférence CLI pour `openclaw skills` (search/install/update/verify/list/info/check/workshop)"
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

- Système de Skills : [Skills](/fr/tools/skills)
- Configuration des Skills : [Skills config](/fr/tools/skills-config)
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
openclaw skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Not reusable"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`, `update` et `verify`ClawHub utilisent ClawHub directement. `install <slug>`ClawHub installe
une Skill ClawHub, `install git:owner/repo[@ref]` clone une Skill Git, et
`install ./path` copie un répertoire de Skill local. Par défaut, `install`, `update`
et `verify` ciblent le répertoire `skills/` de l'espace de travail actif ; avec `--global`,
ils ciblent le répertoire géré partagé des Skills. `list`/`info`/`check` inspectent
toujours les Skills locaux visibles pour l'espace de travail et la configuration actuels.
Les commandes basées sur l'espace de travail résolvent l'espace de travail cible à partir de `--agent <id>`, puis
le répertoire de travail actuel lorsqu'il se trouve dans un espace de travail d'agent configuré,
puis l'agent par défaut.

Les installations depuis Git et des répertoires locaux s'attendent à `SKILL.md` à la racine de la source. Le
slug d'installation provient du frontmatter `name` de `SKILL.md` lorsqu'il est valide, puis du
nom du répertoire source ou du dépôt ; utilisez `--as <slug>` pour le remplacer. `--version`ClawHubnpm
est réservé à ClawHub. Les installations de Skills ne prennent pas en charge les spécifications de paquets npm ou les chemins zip/archive,
et `openclaw skills update`ClawHub met à jour uniquement les installations suivies par ClawHub.

Les installations de dépendances de compétences basées sur le Gateway et déclenchées depuis l'intégration ou les paramètres Skills utilisent le chemin de requête Gateway`skills.install` distinct.

Notes :

- `search [query...]`ClawHub accepte une requête facultative ; omettez-la pour parcourir le flux de recherche ClawHub par défaut.
- `search --limit <n>` limite les résultats retournés.
- `install git:owner/repo[@ref]` installe une compétence Git. Les références de branche peuvent contenir des barres obliques, telles que `git:owner/repo@feature/foo`.
- `install ./path/to/skill` installe un répertoire local dont la racine contient `SKILL.md`.
- `install --as <slug>` remplace le slug (identifiant) déduit pour les installations Git et de répertoires locaux.
- `install --version <version>`ClawHub s'applique uniquement aux slugs de compétences ClawHub.
- `install --force` écrase un dossier de compétence d'espace de travail existant pour le même slug.
- `--global` cible le répertoire partagé des compétences gérées et ne peut pas être combiné avec `--agent <id>`.
- `--agent <id>` cible un espace de travail d'agent configuré et remplace la déduction du répertoire de travail actuel.
- `update <slug>` met à jour une seule compétence suivie. Ajoutez `--global` pour cibler le répertoire partagé des compétences gérées au lieu de l'espace de travail.
- `update --all`ClawHub met à jour les installations ClawHub suivies dans l'espace de travail sélectionné, ou dans le répertoire partagé des compétences gérées lorsqu'il est combiné avec `--global`.
- `verify <slug>`ClawHub imprime l'enveloppe JSON `clawhub.skill.verify.v1` de ClawHub par défaut. Il n'y a pas d'indicateur `--json` car JSON est déjà la valeur par défaut.
- `verify` utilise `.clawhub/origin.json`ClawHub pour les compétences ClawHub installées, il vérifie donc la version installée par rapport au registre d'origine. `--version` et `--tag` remplacent le sélecteur de version mais conservent ce registre installé lorsque les métadonnées d'origine existent.
- `verify --card` imprime la carte de compétence Markdown générée au lieu du JSON. La
  commande se termine avec un code non nul lorsque ClawHub renvoie `ok: false` ou `decision: "fail"`;
  les signatures non signées sont informatives, sauf si la politique de ClawHub change.
- Les bundles ClawHub installés peuvent inclure un `skill-card.md` généré. OpenClaw
  traite la vérification comme une décision du serveur ClawHub et ne rejette pas une
  compétence installée simplement parce que cette carte générée modifie l'empreinte
  du bundle.
- `check --agent <id>` vérifie l'espace de travail de l'agent sélectionné et signale quelles
  compétences prêtes sont réellement visibles pour l'invite de commande ou la surface de commande de cet agent.
- `list` est l'action par défaut lorsqu'aucune sous-commande n'est fournie.
- `list`, `info` et `check` écrivent leur sortie rendue sur stdout. Avec
  `--json`, cela signifie que la payload lisible par la machine reste sur stdout pour les pipes
  et les scripts.

## Propositions de l'atelier de compétences

`openclaw skills workshop` gère les propositions de compétences en attente dans l'espace de travail
sélectionné. Les propositions sont un état durable OpenClaw sous
`<OPENCLAW_STATE_DIR>/skill-workshop/proposals/` ; elles ne sont pas des compétences actives
tant qu'elles ne sont pas appliquées. Le répertoire d'état par défaut est `~/.openclaw`. Les corps des propositions
respectent `skills.workshop.maxSkillBytes`, et les descriptions des propositions sont limitées à
160 octets car elles peuvent apparaître dans la sortie de découverte et de listing.

Créer une proposition à partir d'un fichier brouillon Markdown :

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
```

Ou créer une proposition à partir d'un répertoire complet de brouillon de compétence :

```bash
openclaw skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
```

Mettre à jour une compétence d'espace de travail existante via le même chemin en attente :

```bash
openclaw skills workshop propose-update qa-check --proposal ./PROPOSAL.md
```

Réviser une proposition en attente avant approbation :

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

Le brouillon fourni est stocké sous `PROPOSAL.md` avec des frontmatter spécifiques à la proposition :

```markdown
---
name: qa-check
description: Repeatable QA checklist
status: proposal
version: v1
date: "2026-05-30T00:00:00.000Z"
---
```

L'application d'une proposition écrit le `SKILL.md` actif dans la racine de l'espace de travail `skills/`, supprime `status`, la proposition `version` et la proposition `date` de la frontmatter, analyse le brouillon, écrit les métadonnées de retour en arrière, et refuse les mises à jour obsolètes lorsque la compétence cible a changé après la création de la proposition.

Lorsque `--proposal-dir` est utilisé, le répertoire doit contenir `PROPOSAL.md`. Les fichiers de support peuvent être inclus sous `assets/`, `examples/`, `references/`, `scripts/` ou `templates/`. OpenClaw stocke les fichiers de support avec la proposition, les analyse, vérifie leurs hachages avant l'application et les écrit à côté du `SKILL.md` actif uniquement après l'application de la proposition.

Les agents peuvent créer, réviser, lister et inspecter les propositions en attente via l'outil `skill_workshop` lorsque l'utilisateur demande que le travail réutilisable soit capturé. La capture autonome de propositions à partir de signaux de conversation durables est désactivée par défaut et est activée avec `skills.workshop.autonomous.enabled`. Si l'utilisateur demande explicitement d'approuver/utiliser/appliquer, de rejeter ou de mettre en quarantaine une proposition spécifique, `skill_workshop` peut également effectuer cette action de cycle de vie de proposition via les mêmes garanties de l'Atelier de compétences.

## Connexes

- [Référence CLI](/fr/cli)
- [Compétences](/fr/tools/skills)

---
summary: "ClawHubCLIOpenClawPoints d'entrée CLI ClawHub pour découvrir, installer, publier et vérifier les compétences et plugins OpenClaw."
read_when:
  - You want to use ClawHub from the command line
  - You want to install ClawHub skills or plugins through OpenClaw
  - You want to publish ClawHub packages
title: "ClawHubCLIClawHub CLI"
---

# ClawHub CLI

OpenClaw possède deux points d'entrée en ligne de commande pour ClawHub :

- `openclaw skills` et `openclaw plugins`ClawHubOpenClaw installent et gèrent les packages ClawHub
  dans OpenClaw.
- La CLI `clawhub`CLI autonome gère les workflows de l'éditeur tels que la connexion,
  la publication, le transfert et la synchronisation.

## Découvrir et installer

Utilisez les commandes OpenClaw lorsque vous souhaitez installer ou mettre à jour des packages pour un agent
ou une passerelle OpenClaw local.

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills update <slug>
openclaw skills verify <slug>

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update <id-or-npm-spec>
```

Les installations de compétences ciblent par défaut le répertoire de l'espace de travail actif `skills/`. Ajoutez
`--global` pour installer dans le répertoire géré partagé des compétences.

Les installations de plugins utilisent le préfixe `clawhub:`ClawHubnpm lorsque vous souhaitez une résolution ClawHub
au lieu de npm ou d'une autre source d'installation.

## Publier et maintenir

Installez la CLI ClawHub autonome pour les workflows de l'éditeur :

```bash
npm i -g clawhub
clawhub login
```

Publiez les packages de plugins avec `clawhub package publish` :

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

Publiez les dossiers de compétences avec `clawhub skill publish` :

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0
```

Lorsque l'état du scan local des compétences ou la propriété des packages nécessite une maintenance, utilisez la
commande autonome appropriée :

```bash
clawhub sync --all
clawhub package transfer @old-owner/package --to new-owner
```

## Connexes

- [`openclaw skills`](/fr/cli/skills) - recherche, installation, mise à jour et
  vérification des compétences locales
- [`openclaw plugins`](/fr/cli/plugins) - recherche, installation, mise à jour et
  inspection des plugins
- [Publication ClawHub](ClawHub/en/clawhub/publishing) - étendue du propriétaire, validation de la version,
  et flux de révision
- [Création de compétences](/fr/tools/creating-skills) - flux de création et de publication de compétences
- [Création de plugins](/fr/plugins/building-plugins) - création de packages de plugins

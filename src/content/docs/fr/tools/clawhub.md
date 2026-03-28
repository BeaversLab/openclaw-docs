---
summary: "Guide ClawHub : registre public, flux d'installation natifs OpenClaw et workflows CLI ClawHub"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub est le registre public pour les **skills et plugins OpenClaw**.

- Utilisez les commandes natives `openclaw` pour rechercher/installer/mettre à jour des skills et installer
  des plugins depuis ClawHub.
- Utilisez la `clawhub` CLI séparée lorsque vous avez besoin de l'authentification au registre, pour publier, supprimer,
  annuler la suppression ou synchroniser des workflows.

Site : [clawhub.ai](https://clawhub.ai)

## Flux natifs OpenClaw

Skills :

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

Plugins :

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

Les spécifications nues de plugin compatibles npm sont également essayées sur ClawHub avant npm :

```bash
openclaw plugins install openclaw-codex-app-server
```

Les commandes natives `openclaw` installent dans votre espace de travail actif et conservent les métadonnées de source
afin que les appels `update` ultérieurs puissent rester sur ClawHub.

## Ce qu'est ClawHub

- Un registre public pour les skills OpenClaw.
- Un magasin versionné de bundles de skills et de métadonnées.
- Une surface de découverte pour la recherche, les balises et les signaux d'utilisation.

## Comment cela fonctionne

1. Un utilisateur publie un bundle de skills (fichiers + métadonnées).
2. ClawHub stocke le bundle, analyse les métadonnées et attribue une version.
3. Le registre indexe le skill pour la recherche et la découverte.
4. Les utilisateurs naviguent, téléchargent et installent des skills dans OpenClaw.

## Ce que vous pouvez faire

- Publier de nouveaux skills et de nouvelles versions de skills existants.
- Découvrir des skills par nom, balises ou recherche.
- Télécharger des bundles de skills et inspecter leurs fichiers.
- Signaler les skills qui sont abusifs ou non sûrs.
- Si vous êtes modérateur, masquer, afficher, supprimer ou bannir.

## À qui cela s'adresse (adapté aux débutants)

Si vous souhaitez ajouter de nouvelles capacités à votre agent OpenClaw, ClawHub est le moyen le plus simple de trouver et d'installer des skills. Vous n'avez pas besoin de savoir comment fonctionne le backend. Vous pouvez :

- Rechercher des skills en langage clair.
- Installer un skill dans votre espace de travail.
- Mettre à jour les skills plus tard avec une seule commande.
- Sauvegarder vos propres skills en les publiant.

## Démarrage rapide (non technique)

1. Recherchez quelque chose dont vous avez besoin :
   - `openclaw skills search "calendar"`
2. Installez un skill :
   - `openclaw skills install <skill-slug>`
3. Démarrez une nouvelle session OpenClaw afin qu'elle prenne en compte le nouveau skill.
4. Si vous souhaitez publier ou gérer l'authentification au registre, installez également la
   `clawhub` CLI séparée.

## Installer la CLI ClawHub

Vous n'en avez besoin que pour les workflows authentifiés par le registre, tels que la publication/synchronisation :

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## Comment cela s'intègre à OpenClaw

La commande native `openclaw skills install` installe dans le répertoire de l'espace de travail actif `skills/`. `openclaw plugins install clawhub:...` enregistre une installation de plugin gérée standard ainsi que les métadonnées de source ClawHub pour les mises à jour.

L'CLI `clawhub` distinct installe également des compétences dans `./skills` sous votre répertoire de travail actuel. Si un espace de travail OpenClaw est configuré, `clawhub` revient par défaut à cet espace de travail, sauf si vous substituez `--workdir` (ou `CLAWHUB_WORKDIR`). OpenClaw charge les compétences de l'espace de travail à partir de `<workspace>/skills` et les récupérera lors de la **prochaine** session. Si vous utilisez déjà `~/.openclaw/skills` ou des compétences groupées, les compétences de l'espace de travail prévalent.

Pour plus de détails sur le chargement, le partage et la limitation des compétences, voir [Skills](/fr/tools/skills).

## Aperçu du système de compétences

Une compétence est un bundle versionné de fichiers qui enseigne à OpenClaw comment effectuer une tâche spécifique. Chaque publication crée une nouvelle version et le registre conserve un historique des versions afin que les utilisateurs puissent auditer les modifications.

Une compétence type inclut :

- Un fichier `SKILL.md` avec la description principale et l'utilisation.
- Des configurations, scripts ou fichiers de prise en charge facultatifs utilisés par la compétence.
- Des métadonnées telles que des balises, un résumé et des exigences d'installation.

ClawHub utilise les métadonnées pour alimenter la découverte et exposer en toute sécurité les capacités des compétences. Le registre suit également les signaux d'utilisation (tels que les étoiles et les téléchargements) pour améliorer le classement et la visibilité.

## Ce que fournit le service (fonctionnalités)

- **Navigation publique** des compétences et de leur contenu `SKILL.md`.
- **Recherche** propulsée par des embeddings (recherche vectorielle), et pas seulement par des mots-clés.
- **Versionnage** avec semver, journaux des modifications et balises (y compris `latest`).
- **Téléchargements** sous forme de fichier zip par version.
- **Étoiles et commentaires** pour les retours de la communauté.
- **Points d'ancrage de modération** pour les approbations et les audits.
- **CLI compatible API** pour l'automatisation et les scripts.

## Sécurité et modération

ClawHub est ouvert par défaut. Tout le monde peut téléverser des compétences, mais un compte GitHub doit
exister depuis au moins une semaine pour publier. Cela aide à ralentir les abus sans bloquer
les contributeurs légitimes.

Signalement et modération :

- Tout utilisateur connecté peut signaler une compétence.
- Les motifs de signalement sont requis et enregistrés.
- Chaque utilisateur peut avoir jusqu'à 20 signalements actifs à la fois.
- Les compétences recevant plus de 3 signalements uniques sont automatiquement masquées par défaut.
- Les modérateurs peuvent voir les compétences masquées, les afficher, les supprimer ou bannir les utilisateurs.
- L'abus de la fonction de signalement peut entraîner des bannissements de compte.

Vous souhaitez devenir modérateur ? Demandez sur le OpenClaw Discord et contactez un
modérateur ou un mainteneur.

## Commandes et paramètres CLI

Options globales (s'appliquent à toutes les commandes) :

- `--workdir <dir>` : Répertoire de travail (par défaut : répertoire actuel ; revient à l'espace de travail OpenClaw).
- `--dir <dir>` : Répertoire des compétences, relatif au répertoire de travail (par défaut : `skills`).
- `--site <url>` : URL de base du site (connexion navigateur).
- `--registry <url>` : URL de base de l'API du registre.
- `--no-input` : Désactiver les invites (non-interactif).
- `-V, --cli-version` : Afficher la version CLI.

Auth :

- `clawhub login` (flux navigateur) ou `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

Options :

- `--token <token>` : Coller un jeton API.
- `--label <label>` : Libellé stocké pour les jetons de connexion navigateur (par défaut : `CLI token`).
- `--no-browser` : Ne pas ouvrir de navigateur (requiert `--token`).

Rechercher :

- `clawhub search "query"`
- `--limit <n>` : Résultats max.

Installer :

- `clawhub install <slug>`
- `--version <version>` : Installer une version spécifique.
- `--force` : Écraser si le dossier existe déjà.

Mettre à jour :

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>` : Mettre à jour vers une version spécifique (un seul slug).
- `--force` : Écraser lorsque les fichiers locaux ne correspondent à aucune version publiée.

Lister :

- `clawhub list` (lit `.clawhub/lock.json`)

Publier :

- `clawhub publish <path>`
- `--slug <slug>` : Slug de compétence.
- `--name <name>` : Nom d'affichage.
- `--version <version>` : Version Semver.
- `--changelog <text>` : Texte du journal des modifications (peut être vide).
- `--tags <tags>` : Balises séparées par des virgules (par défaut : `latest`).

Supprimer/Récupérer (propriétaire/administrateur uniquement) :

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Synchroniser (analyser les compétences locales + publier les nouvelles/mises à jour) :

- `clawhub sync`
- `--root <dir...>` : Racines d'analyse supplémentaires.
- `--all` : Tout télécharger sans invite de commande.
- `--dry-run` : Afficher ce qui serait téléchargé.
- `--bump <type>` : `patch|minor|major` pour les mises à jour (par défaut : `patch`).
- `--changelog <text>` : Journal des modifications pour les mises à jour non interactives.
- `--tags <tags>` : Balises séparées par des virgules (par défaut : `latest`).
- `--concurrency <n>` : Vérifications du registre (par défaut : 4).

## Flux de travail courants pour les agents

### Rechercher des compétences

```bash
clawhub search "postgres backups"
```

### Télécharger de nouvelles compétences

```bash
clawhub install my-skill-pack
```

### Mettre à jour les compétences installées

```bash
clawhub update --all
```

### Sauvegarder vos compétences (publier ou synchroniser)

Pour un seul dossier de compétence :

```bash
clawhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

Pour analyser et sauvegarder plusieurs compétences à la fois :

```bash
clawhub sync --all
```

## Détails avancés (technique)

### Gestion de version et balises

- Chaque publication crée une nouvelle `SkillVersion` **semver**.
- Les balises (comme `latest`) pointent vers une version ; le déplacement des balises vous permet de revenir en arrière.
- Les journaux des modifications sont attachés par version et peuvent être vides lors de la synchronisation ou de la publication de mises à jour.

### Modifications locales vs versions du registre

Les mises à jour comparent le contenu de la compétence locale aux versions du registre à l'aide d'un hachage de contenu. Si les fichiers locaux ne correspondent à aucune version publiée, le CLI demande avant d'écraser (ou nécessite `--force` lors des exécutions non interactives).

### Analyse de synchronisation et racines de secours

`clawhub sync` analyse d'abord votre répertoire de travail actuel. Si aucune compétence n'est trouvée, elle revient aux anciens emplacements connus (par exemple `~/openclaw/skills` et `~/.openclaw/skills`). Ceci est conçu pour trouver les anciennes installations de compétences sans indicateurs supplémentaires.

### Stockage et fichier de verrouillage

- Les compétences installées sont enregistrées dans `.clawhub/lock.json` sous votre répertoire de travail.
- Les jetons d'authentification sont stockés dans le fichier de configuration de la ClawHub CLI (remplaçable via `CLAWHUB_CONFIG_PATH`).

### Télémétrie (nombre d'installations)

Lorsque vous exécutez `clawhub sync` alors que vous êtes connecté, la CLI envoie un instantané minimal pour calculer les nombres d'installations. Vous pouvez désactiver ceci entièrement :

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## Variables d'environnement

- `CLAWHUB_SITE` : Remplacer l'URL du site.
- `CLAWHUB_REGISTRY` : Remplacer l'URL de l'API du registre.
- `CLAWHUB_CONFIG_PATH` : Remplacer l'emplacement où la CLI stocke le jeton/la configuration.
- `CLAWHUB_WORKDIR` : Remplacer le répertoire de travail par défaut.
- `CLAWHUB_DISABLE_TELEMETRY=1` : Désactiver la télémétrie sur `sync`.

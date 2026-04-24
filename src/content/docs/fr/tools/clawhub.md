---
summary: "Guide ClawHub : registre public, flux d'installation natifs OpenClaw et workflows CLI ClawHub"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills or plugins
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub est le registre public pour les **skills et plugins OpenClaw**.

- Utilisez les commandes natives `openclaw` pour rechercher/installer/mettre à jour des compétences et installer
  des plugins depuis ClawHub.
- Utilisez la `clawhub` CLI distincte lorsque vous avez besoin de l'authentification au registre, pour publier, supprimer,
  restaurer ou synchroniser des workflows.

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

Les commandes natives `openclaw` installent dans votre espace de travail actif et conservent les métadonnées
sources afin que les appels `update` ultérieurs puissent rester sur ClawHub.

Les installations de plugins valident la compatibilité annoncée de `pluginApi` et `minGatewayVersion`
avant l'exécution de l'installation de l'archive, donc les hôtes incompatibles échouent de manière sécurisée
tôt au lieu d'installer partiellement le paquet.

`openclaw plugins install clawhub:...` n'accepte que les familles de plugins installables.
Si un paquet ClawHub est en réalité une compétence, OpenClaw s'arrête et vous redirige vers
`openclaw skills install <slug>` à la place.

## Ce qu'est ClawHub

- Un registre public pour les compétences et plugins OpenClaw.
- Un magasin versionné de bundles de compétences et de métadonnées.
- Une surface de découverte pour la recherche, les balises et les signaux d'utilisation.

## Comment cela fonctionne

1. Un utilisateur publie un bundle de compétences (fichiers + métadonnées).
2. ClawHub stocke le bundle, analyse les métadonnées et attribue une version.
3. Le registre indexe la compétence pour la recherche et la découverte.
4. Les utilisateurs naviguent, téléchargent et installent des compétences dans OpenClaw.

## Ce que vous pouvez faire

- Publier de nouvelles compétences et de nouvelles versions de compétences existantes.
- Découvrir des compétences par nom, balises ou recherche.
- Télécharger des bundles de compétences et inspecter leurs fichiers.
- Signaler les compétences qui sont abusives ou non sécurisées.
- Si vous êtes modérateur, masquer, afficher, supprimer ou bannir.

## À qui cela s'adresse (adapté aux débutants)

Si vous souhaitez ajouter de nouvelles capacités à votre agent OpenClaw, ClawHub est le moyen le plus simple de trouver et d'installer des compétences. Vous n'avez pas besoin de savoir comment fonctionne le backend. Vous pouvez :

- Rechercher des compétences en langage clair.
- Installer une compétence dans votre espace de travail.
- Mettre à jour les compétences ultérieurement avec une seule commande.
- Sauvegarder vos propres compétences en les publiant.

## Démarrage rapide (non technique)

1. Recherchez quelque chose dont vous avez besoin :
   - `openclaw skills search "calendar"`
2. Installez une compétence :
   - `openclaw skills install <skill-slug>`
3. Démarrez une nouvelle session OpenClaw pour qu'elle prenne en compte la nouvelle compétence.
4. Si vous souhaitez publier ou gérer l'authentification au registre, installez également le CLI
   `clawhub` séparé.

## Installer le ClawHub CLI

Vous n'en avez besoin que pour les flux de travail authentifiés par le registre tels que publier/synchroniser :

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## Comment cela s'intègre dans OpenClaw

Les installations natives `openclaw skills install` se font dans le répertoire `skills/`
de l'espace de travail actif. `openclaw plugins install clawhub:...` enregistre une installation de plugin gérée normale
plus les métadonnées de source ClawHub pour les mises à jour.

L'installation anonyme de plugins ClawHub échoue également pour les packages privés. Les canaux communautaires ou autres non officiels peuvent toujours installer, mais OpenClaw avertit afin que les opérateurs puissent vérifier la source et la vérification avant de les activer.

La CLI `clawhub` distincte installe également des compétences dans `./skills` sous votre répertoire de travail actuel. Si un espace de travail OpenClaw est configuré, `clawhub` revient à cet espace de travail à moins que vous ne remplaciez `--workdir` (ou `CLAWHUB_WORKDIR`). OpenClaw charge les compétences de l'espace de travail à partir de `<workspace>/skills` et les récupérera lors de la **prochaine** session. Si vous utilisez déjà `~/.openclaw/skills` ou des compétences groupées, les compétences de l'espace de travail ont la priorité.

Pour plus de détails sur le chargement, le partage et la restriction des compétences, consultez
[Skills](/fr/tools/skills).

## Présentation du système de compétences

Une compétence est un ensemble versionné de fichiers qui apprend à OpenClaw comment effectuer une tâche spécifique. Chaque publication crée une nouvelle version et le registre conserve un historique des versions afin que les utilisateurs puissent auditer les modifications.

Une compétence type comprend :

- Un fichier `SKILL.md` avec la description principale et l'utilisation.
- Des configurations, scripts ou fichiers de prise en charge facultatifs utilisés par la compétence.
- Des métadonnées telles que les balises, le résumé et les exigences d'installation.

ClawHub utilise les métadonnées pour alimenter la découverte et exposer en toute sécurité les capacités des compétences. Le registre suit également les signaux d'utilisation (tels que les étoiles et les téléchargements) pour améliorer le classement et la visibilité.

## Ce que fournit le service (fonctionnalités)

- **Navigation publique** des compétences et de leur contenu `SKILL.md`.
- **Recherche** propulsée par des embeddings (recherche vectorielle), et pas seulement par des mots-clés.
- **Gestion de version** avec semver, des journaux des modifications et des balises (y compris `latest`).
- **Téléchargements** sous forme de fichier zip par version.
- **Étoiles et commentaires** pour les retours de la communauté.
- **Crochets de modération** pour les approbations et les audits.
- **CLI conviviale pour la API** pour l'automatisation et le scriptage.

## Sécurité et modération

ClawHub est ouvert par défaut. N'importe qui peut télécharger des compétences, mais un compte GitHub doit avoir au moins une semaine pour publier. Cela aide à ralentir les abus sans bloquer les contributeurs légitimes.

Rapports et modération :

- Tout utilisateur connecté peut signaler une compétence.
- Les motifs de rapport sont requis et enregistrés.
- Chaque utilisateur peut avoir jusqu'à 20 rapports actifs à la fois.
- Les Skills ayant plus de 3 rapports uniques sont masquées automatiquement par défaut.
- Les modérateurs peuvent voir les Skills masquées, les révéler, les supprimer ou bannir les utilisateurs.
- L'abus de la fonctionnalité de rapport peut entraîner des bannissements de compte.

Intéressé par devenir modérateur ? Demandez sur le OpenClaw Discord et contactez un
modérateur ou un mainteneur.

## Commandes et paramètres CLI

Options globales (s'appliquent à toutes les commandes) :

- `--workdir <dir>` : Répertoire de travail (par défaut : répertoire actuel ; revient à l'espace de travail OpenClaw).
- `--dir <dir>` : Répertoire des Skills, relatif au répertoire de travail (par défaut : `skills`).
- `--site <url>` : URL de base du site (connexion navigateur).
- `--registry <url>` : URL de base de l'API du registre.
- `--no-input` : Désactiver les invites (non interactif).
- `-V, --cli-version` : Afficher la version CLI.

Auth :

- `clawhub login` (flux navigateur) ou `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

Options :

- `--token <token>` : Coller un jeton API.
- `--label <label>` : Libellé stocké pour les jetons de connexion navigateur (par défaut : `CLI token`).
- `--no-browser` : Ne pas ouvrir de navigateur (nécessite `--token`).

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

Publier des Skills :

- `clawhub skill publish <path>`
- `--slug <slug>` : Slug de la Skill.
- `--name <name>` : Nom d'affichage.
- `--version <version>` : Version Semver.
- `--changelog <text>` : Texte du journal des modifications (peut être vide).
- `--tags <tags>` : Balises séparées par des virgules (par défaut : `latest`).

Publier des plugins :

- `clawhub package publish <source>`
- `<source>` peut être un dossier local, `owner/repo`, `owner/repo@ref` ou une URL GitHub.
- `--dry-run` : Créer le plan de publication exact sans rien télécharger.
- `--json` : Générer une sortie lisible par machine pour l'CI.
- `--source-repo`, `--source-commit`, `--source-ref` : Substitutions facultatives lorsque la détection automatique ne suffit pas.

Supprimer/annuler la suppression (propriétaire/administrateur uniquement) :

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

Synchroniser (scanner les compétences locales + publier les nouvelles/mises à jour) :

- `clawhub sync`
- `--root <dir...>` : Racines de scan supplémentaires.
- `--all` : Tout télécharger sans invite.
- `--dry-run` : Afficher ce qui serait téléchargé.
- `--bump <type>` : `patch|minor|major` pour les mises à jour (par défaut : `patch`).
- `--changelog <text>` : Journal des modifications pour les mises à jour non interactives.
- `--tags <tags>` : Balises séparées par des virgules (par défaut : `latest`).
- `--concurrency <n>` : Vérifications du registre (par défaut : 4).

## Workflows courants pour les agents

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
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

Pour scanner et sauvegarder plusieurs compétences à la fois :

```bash
clawhub sync --all
```

### Publier un plugin depuis GitHub

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
clawhub package publish https://github.com/your-org/your-plugin
```

Les plugins de code doivent inclure les métadonnées requises OpenClaw dans `package.json` :

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

Les packages publiés doivent contenir du JavaScript construit et pointer `runtimeExtensions`
vers cette sortie. Les installations via Git checkout peuvent toujours revenir au code source TypeScript
lorsqu'aucun fichier construit n'existe, mais les entrées d'exécution construites évitent la compilation TypeScript
à l'exécution lors des chemins de démarrage, de diagnostic et de chargement des plugins.

## Détails avancés (technique)

### Versionnage et balises

- Chaque publication crée une nouvelle version **semver** `SkillVersion`.
- Les balises (comme `latest`) pointent vers une version ; le déplacement des balises vous permet de revenir en arrière.
- Les journaux des modifications sont attachés par version et peuvent être vides lors de la synchronisation ou de la publication des mises à jour.

### Modifications locales vs versions du registre

Les mises à jour comparent le contenu des compétences locales aux versions du registre à l'aide d'un hachage de contenu. Si les fichiers locaux ne correspondent à aucune version publiée, le CLI demande avant d'écraser (ou nécessite `--force` dans les exécutions non interactives).

### Analyse de synchronisation et racines de repli

`clawhub sync` analyse d'abord votre répertoire de travail actuel. Si aucune compétence n'est trouvée, il revient aux emplacements hérités connus (par exemple `~/openclaw/skills` et `~/.openclaw/skills`). Cela est conçu pour trouver les anciennes installations de compétences sans indicateurs supplémentaires.

### Stockage et fichier de verrouillage

- Les compétences installées sont enregistrées dans `.clawhub/lock.json` sous votre répertoire de travail.
- Les jetons d'authentification sont stockés dans le fichier de configuration de la ClawHub CLI (remplaçable via `CLAWHUB_CONFIG_PATH`).

### Télémétrie (comptes d'installation)

Lorsque vous exécutez `clawhub sync` alors que vous êtes connecté, la CLI envoie un instantané minimal pour calculer les comptes d'installation. Vous pouvez désactiver complètement ceci :

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## Variables d'environnement

- `CLAWHUB_SITE` : Remplacer l'URL du site.
- `CLAWHUB_REGISTRY` : Remplacer l'URL de l'API du registre.
- `CLAWHUB_CONFIG_PATH` : Remplacer l'emplacement où la CLI stocke le jeton/la configuration.
- `CLAWHUB_WORKDIR` : Remplacer le répertoire de travail par défaut.
- `CLAWHUB_DISABLE_TELEMETRY=1` : Désactiver la télémétrie sur `sync`.

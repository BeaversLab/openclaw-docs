---
summary: "Canaux stables, bêta et dev : sémantique, changement, épinglage et étiquetage"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "Release channels"
sidebarTitle: "Canaux de publication"
---

OpenClaw est livré avec trois canaux de mise à jour :

- **stable** : npm dist-tag npm`latest`. Recommandé pour la plupart des utilisateurs.
- **beta** : npm dist-tag npm`beta` lorsqu'il est à jour ; si la version bêta est manquante ou plus ancienne que
  la dernière version stable, le processus de mise à jour revient à `latest`.
- **dev** : l'étête en mouvement de `main`npm (git). npm dist-tag : `dev` (lorsqu'il est publié).
  La branche `main` est destinée à l'expérimentation et au développement actif. Elle peut contenir
  des fonctionnalités incomplètes ou des changements cassants. Ne l'utilisez pas pour les passerelles de production.

Nous publions généralement les versions stables sur **beta** d'abord, les testons là-bas, puis exécutons une
étape de promotion explicite qui déplace la version vérifiée vers `latest` sans
changer le numéro de version. Les mainteneurs peuvent également publier une version stable
directement sur `latest`npm si nécessaire. Les dist-tags sont la source de vérité pour les installations
npm.

## Changer de canaux

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` persiste votre choix dans la configuration (`update.channel`) et aligne la
méthode d'installation :

- **`stable`npm** (installations de package) : mises à jour via npm dist-tag `latest`.
- **`beta`npm** (installations de package) : préfère npm dist-tag `beta`, mais revient à
  `latest` lorsque `beta` est manquant ou plus ancien que le tag stable actuel.
- **`stable`** (installations git) : extrait le dernier tag git stable.
- **`beta`** (installations git) : préfère le dernier tag git bêta, mais revient au
  dernier tag git stable lorsque la bêta est manquante ou plus ancienne.
- **`dev`** : assure un checkout git (par défaut `~/openclaw`, ou
  `$OPENCLAW_HOME/openclaw` lorsque `OPENCLAW_HOME` est défini ; remplacer par
  `OPENCLAW_GIT_DIR`), bascule sur `main`, rebase sur l'amont, compile, et
  installe le CLI global depuis ce checkout.

<Tip>Si vous voulez stable et dev en parallèle, gardez deux clones et pointez votre passerelle sur celui stable.</Tip>

## Ciblage ponctuel de version ou de tag

Utilisez `--tag` pour cibler un dist-tag, une version ou une spécification de paquet spécifique pour une seule
mise à jour **sans** changer votre channel persistant :

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Switch to the moving GitHub main checkout
openclaw update --channel dev

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1

# Install from GitHub main once without persisting the channel
openclaw update --tag main
```

Notes :

- `--tag` s'applique **uniquement aux installations de paquets (npm)**. Les installations git l'ignorent.
- Le tag n'est pas persisté. Votre prochain `openclaw update` utilise votre channel
  configuré comme d'habitude.
- Pour les installations de paquets, OpenClaw pré-emballe les spécifications de source GitHub/git dans un
  fichier tar temporaire avant l'installation npm intermédiaire. Utilisez `--channel dev` ou
  `--install-method git --version main` lorsque vous souhaitez le checkout `main`
  mobile comme installation persistante.
- Protection de rétrogradation : si la version cible est antérieure à votre version actuelle,
  OpenClaw demande une confirmation (ignorer avec `--yes`).
- `--channel beta` est différent de `--tag beta` : le flux de channel peut revenir
  à stable/latest lorsque beta est manquant ou obsolète, tandis que `--tag beta` cible le
  dist-tag `beta` brut pour cette exécution unique.

## Test à blanc

Prévisualiser ce que ferait `openclaw update` sans apporter de modifications :

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

Le test à blanc affiche le canal effectif, la version cible, les actions planifiées et si une confirmation de rétrogradation serait requise.

## Plugins et canaux

Lorsque vous changez de channel avec `openclaw update`, OpenClaw synchronise également les
sources des plugins :

- `dev` préfère les plugins groupés depuis le checkout git.
- `stable` et `beta` restaurent les paquets de plugins installés via npm.
- Les plugins installés par npm sont mis à jour après la fin de la mise à jour du cœur.

## Vérification de l'état actuel

```bash
openclaw update status
```

Affiche le canal actif, le type d'installation (git ou package), la version actuelle et la source (config, git tag, git branch ou default).

## Bonnes pratiques d'étiquetage

- Taguez les versions que vous souhaitez voir atterrir sur les checkouts git (`vYYYY.M.D` pour stable,
  `vYYYY.M.D-beta.N` pour beta).
- `vYYYY.M.D.beta.N` est également reconnu pour la compatibilité, mais préférez `-beta.N`.
- Les balises `vYYYY.M.D-<patch>` héritées sont toujours reconnues comme stables (non bêta).
- Gardez les étiquettes immuables : ne déplacez jamais et ne réutilisez jamais une étiquette.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` -> stable
  - `beta` -> version candidate ou version stable prioritaire bêta
  - `dev` -> instantané main (facultatif)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure une version d'application macOS. Cela est normal :

- La balise git et la dist-tag npm peuvent toujours être publiées.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

## Articles connexes

- [Mise à jour](/fr/install/updating)
- [Fonctionnement interne de l'installateur](/fr/install/installer)

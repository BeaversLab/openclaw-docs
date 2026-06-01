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
- **`stable`** (installations git) : extrait le dernier tag git stable, à l'exclusion
  des tags de préversion semver tels que `-alpha.N`, `-beta.N`, `-rc.N`, `-dev.N`,
  `-next.N`, `-preview.N`, `-canary.N`, `-nightly.N` et autres
  suffixes de préversion.
- **`beta`** (installations git) : préfère le dernier tag git bêta, mais revient au
  dernier tag git stable lorsque la bêta est manquante ou plus ancienne.
- **`dev`** : assure un git checkout (par défaut `~/openclaw`, ou
  `$OPENCLAW_HOME/openclaw` quand `OPENCLAW_HOME` est défini ; remplacer avec
  `OPENCLAW_GIT_DIR`), bascule sur `main`, effectue un rebase en amont, compile, et
  installe le CLI global depuis ce checkout.

<Tip>Si vous voulez stable et dev en parallèle, gardez deux clones et pointez votre passerelle sur celui stable.</Tip>

## Ciblage ponctuel de version ou de tag

Utilisez `--tag` pour cibler un dist-tag, une version ou une spécification de package spécifique pour une mise à jour unique **sans** changer votre channel persistant :

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

- `--tag` s'applique **uniquement aux installations de package (npm)**. Les installations git l'ignorent.
- Le tag n'est pas persisté. Votre prochain `openclaw update` utilise votre channel configuré
  comme d'habitude.
- Pour les installations de package, OpenClaw pré-emballe les spécifications de source GitHub/git dans une
  archive temporaire avant l'installation npm. Utilisez `--channel dev` ou
  `--install-method git --version main` lorsque vous voulez le checkout `main`
  en évolution comme installation persistante.
- Protection de rétrogradation : si la version cible est antérieure à votre version actuelle,
  OpenClaw demande confirmation (ignorer avec `--yes`).
- `--channel beta` est différent de `--tag beta` : le flux de channel peut revenir
  à stable/latest lorsque la bêta est manquante ou plus ancienne, tandis que `--tag beta` cible le
  dist-tag brut `beta` pour cette exécution unique.

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

Lorsque vous changez de canal avec `openclaw update`OpenClaw, OpenClaw synchronise également les sources des plugins :

- `dev` privilégie les plugins groupés depuis le git checkout.
- `stable` et `beta`npm restaurent les packages de plugins installés via npm.
- Les plugins installés par npm sont mis à jour après la fin de la mise à jour du cœur.

## Vérification de l'état actuel

```bash
openclaw update status
```

Affiche le canal actif, le type d'installation (git ou package), la version actuelle et la source (config, git tag, git branch ou default).

## Bonnes pratiques d'étiquetage

- Marquez les versions sur lesquelles vous voulez que les git checkouts atterrissent (`vYYYY.M.D` pour stable, `vYYYY.M.D-beta.N` pour bêta ; les suffixes de pré-version semver nommés tels que `-alpha.N`, `-rc.N` et `-next.N` ne sont pas des cibles stables).
- Les balises stables numériques héritées telles que `vYYYY.M.D-1` et `v1.0.1-1` sont toujours reconnues comme des balises git stables pour la compatibilité.
- `vYYYY.M.D.beta.N` est également reconnu pour compatibilité, mais privilégiez `-beta.N`.
- Gardez les étiquettes immuables : ne déplacez jamais et ne réutilisez jamais une étiquette.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` -> stable
  - `beta` -> version candidate ou version stable bêta en premier
  - `dev` -> snapshot principal (facultatif)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure une version d'application macOS. Cela est normal :

- La balise git et la dist-tag npm peuvent toujours être publiées.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

## Articles connexes

- [Mise à jour](/fr/install/updating)
- [Fonctionnement interne de l'installateur](/fr/install/installer)

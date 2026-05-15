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
- **`dev`** : assure un extraction git (par défaut `~/openclaw`, remplacer par
  `OPENCLAW_GIT_DIR`), bascule vers `main`CLI, rebase sur l'amont, construit, et
  installe le CLI global depuis cette extraction.

<Tip>Si vous voulez stable et dev en parallèle, gardez deux clones et pointez votre passerelle sur celui stable.</Tip>

## Ciblage ponctuel de version ou de tag

Utilisez `--tag` pour cibler un dist-tag, une version ou une spécification de package spécifique pour une seule mise à jour **sans** changer votre channel persistant :

```bash
# Install a specific version
openclaw update --tag 2026.4.1-beta.1

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.4.1-beta.1
```

Notes :

- `--tag` s'applique **uniquement aux installations de packages (npm)**. Les installations Git l'ignorent.
- Le tag n'est pas persisté. Votre prochain `openclaw update` utilise votre channel configuré comme d'habitude.
- Protection de rétrogradation : si la version cible est antérieure à votre version actuelle, OpenClaw demande une confirmation (ignorer avec `--yes`).
- `--channel beta` est différent de `--tag beta` : le flux de channel peut revenir à stable/latest lorsque beta est manquant ou plus ancien, tandis que `--tag beta` cible le dist-tag `beta` brut pour cette exécution unique.

## Essai à blanc (Dry run)

Prévisualisez ce que `openclaw update` ferait sans apporter de modifications :

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

L'essai à blanc affiche le channel effectif, la version cible, les actions planifiées et si une confirmation de rétrogradation serait requise.

## Plugins et channels

Lorsque vous changez de channel avec `openclaw update`, OpenClaw synchronise également les sources des plugins :

- `dev` préfère les plugins groupés depuis le checkout git.
- `stable` et `beta` restaurent les packages de plugins installés via npm.
- Les plugins installés via npm sont mis à jour après la fin de la mise à jour du cœur.

## Vérification de l'état actuel

```bash
openclaw update status
```

Affiche le channel actif, le type d'installation (git ou package), la version actuelle et la source (config, git tag, git branch ou par défaut).

## Bonnes pratiques de tagging

- Taggez les releases que vous voulez voir utiliser par les git checkouts (`vYYYY.M.D` pour stable, `vYYYY.M.D-beta.N` pour beta).
- `vYYYY.M.D.beta.N` est également reconnu pour compatibilité, mais préférez `-beta.N`.
- Les tags `vYYYY.M.D-<patch>` hérités sont toujours reconnus comme stables (non-beta).
- Gardez les tags immuables : ne déplacez ou ne réutilisez jamais un tag.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` -> stable
  - `beta` -> version candidate ou version stable en beta-first
  - `dev` -> instantané main (facultatif)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure de version de l'application macOS. Cela n'est pas grave :

- Le tag git et le dist-tag npm peuvent toujours être publiés.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

## Connexes

- [Mise à jour](/fr/install/updating)
- [Fonctionnement interne de l'installateur](/fr/install/installer)

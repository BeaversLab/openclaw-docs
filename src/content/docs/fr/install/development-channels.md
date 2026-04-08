---
summary: "Canaux stables, bêta et dev : sémantique, changement, épinglage et étiquetage"
read_when:
  - You want to switch between stable/beta/dev
  - You want to pin a specific version, tag, or SHA
  - You are tagging or publishing prereleases
title: "Canaux de publication"
sidebarTitle: "Canaux de publication"
---

# Canaux de développement

OpenClaw fournit trois canaux de mise à jour :

- **stable** : npm dist-tag `latest`. Recommandé pour la plupart des utilisateurs.
- **beta** : npm dist-tag `beta` lorsqu'il est à jour ; si beta est manquant ou plus ancien que
  la dernière version stable, le processus de mise à jour revient à `latest`.
- **dev** : tête mobile de `main` (git). npm dist-tag : `dev` (lorsqu'il est publié).
  La branche `main` est destinée à l'expérimentation et au développement actif. Elle peut contenir
  des fonctionnalités incomplètes ou des changements cassants. Ne l'utilisez pas pour les passerelles de production.

Nous publions généralement les versions stables d'abord sur **beta**, les testons, puis exécutons une
étape de promotion explicite qui déplace la version vérifiée vers `latest` sans
changer le numéro de version. Les mainteneurs peuvent également publier une version stable
directement sur `latest` si nécessaire. Les dist-tags sont la source de vérité pour les installations
npm.

## Changer de canal

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` enregistre votre choix dans la configuration (`update.channel`) et aligne la
méthode d'installation :

- **`stable`** (installations de package) : mises à jour via npm dist-tag `latest`.
- **`beta`** (installations de package) : préfère npm dist-tag `beta`, mais revient à
  `latest` lorsque `beta` est manquant ou plus ancien que l'étiquette stable actuelle.
- **`stable`** (installations git) : extrait le dernier tag git stable.
- **`beta`** (installations git) : préfère le dernier tag git beta, mais revient au
  dernier tag git stable lorsque beta est manquant ou plus ancien.
- **`dev`** : assure un checkout git (par défaut `~/openclaw`, remplacer par
  `OPENCLAW_GIT_DIR`), bascule sur `main`, effectue un rebase sur upstream, compile, et
  installe le CLI global depuis ce checkout.

Astuce : si vous voulez stable + dev en parallèle, gardez deux clones et pointez votre
passerelle sur celui stable.

## Ciblage ponctuel de version ou de tag

Utilisez `--tag` pour cibler un dist-tag, une version ou une spécification de package spécifique pour une mise à jour
unique **sans** changer votre channel persistant :

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

- `--tag` s'applique **uniquement aux installations de package (npm)**. Les installations git l'ignorent.
- La balise n'est pas conservée. Votre prochain `openclaw update` utilise votre canal configuré comme d'habitude.
- Protection de rétrogradation : si la version cible est antérieure à votre version actuelle, OpenClaw demande une confirmation (ignorez avec `--yes`).
- `--channel beta` est différent de `--tag beta` : le flux du canal peut revenir à stable/latest lorsque beta est manquant ou plus ancien, tandis que `--tag beta` cible la balise de dist brute `beta` pour cette exécution unique.

## Test à blanc

Prévisualiser ce que `openclaw update` ferait sans apporter de modifications :

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.4.1-beta.1 --dry-run
openclaw update --dry-run --json
```

Le test à blanc affiche le canal effectif, la version cible, les actions planifiées et si une confirmation de rétrogradation serait requise.

## Plugins et canaux

Lorsque vous changez de canal avec `openclaw update`, OpenClaw synchronise également les sources des plugins :

- `dev` préfère les plugins groupés depuis l'extraction git.
- `stable` et `beta` restaurent les packages de plugins installés par npm.
- Les plugins installés par npm sont mis à jour après la fin de la mise à jour du cœur.

## Vérification de l'état actuel

```bash
openclaw update status
```

Affiche le canal actif, le type d'installation (git ou package), la version actuelle et la source (config, git tag, git branch ou default).

## Bonnes pratiques d'étiquetage

- Étiquetez les versions sur lesquelles vous voulez que les extractions git atterrissent (`vYYYY.M.D` pour stable, `vYYYY.M.D-beta.N` pour beta).
- `vYYYY.M.D.beta.N` est également reconnu pour compatibilité, mais préférez `-beta.N`.
- Les étiquettes `vYYYY.M.D-<patch>` héritées sont toujours reconnues comme stables (non-bêta).
- Gardez les étiquettes immuables : ne déplacez jamais et ne réutilisez jamais une étiquette.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` -> stable
  - `beta` -> version candidate ou version stable prioritaire bêta
  - `dev` -> snapshot main (optionnel)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure une version d'application macOS. Cela est normal :

- La balise git et la dist-tag npm peuvent toujours être publiées.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

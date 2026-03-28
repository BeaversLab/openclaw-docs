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
- **beta** : npm dist-tag `beta` (versions en cours de test).
- **dev** : tête mobile de `main` (git). npm dist-tag : `dev` (lors de la publication).
  La branche `main` est destinée à l'expérimentation et au développement actif. Elle peut contenir
  des fonctionnalités incomplètes ou des changements cassants. Ne l'utilisez pas pour des passerelles de production.

Nous publions des versions sur **beta**, les testons, puis **promouvons une version vérifiée vers `latest`**
sans changer le numéro de version -- les dist-tags sont la source de vérité pour les installations npm.

## Changer de canal

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

`--channel` enregistre votre choix dans la configuration (`update.channel`) et aligne la
méthode d'installation :

- **`stable`/`beta`** (installations de package) : mises à jour via le npm dist-tag correspondant.
- **`stable`/`beta`** (installations git) : extrait le dernier tag git correspondant.
- **`dev`** : assure un checkout git (par défaut `~/openclaw`, remplacer par
  `OPENCLAW_GIT_DIR`), bascule sur `main`, effectue un rebase sur l'amont, compile, et
  installe le CLI global depuis ce checkout.

Astuce : si vous voulez stable + dev en parallèle, gardez deux clones et pointez votre
passerelle vers celui stable.

## Ciblage ponctuel de version ou de tag

Utilisez `--tag` pour cibler un dist-tag, une version ou une spécification de package spécifique pour une seule
mise à jour **sans** changer votre canal persistant :

```bash
# Install a specific version
openclaw update --tag 2026.3.22

# Install from the beta dist-tag (one-off, does not persist)
openclaw update --tag beta

# Install from GitHub main branch (npm tarball)
openclaw update --tag main

# Install a specific npm package spec
openclaw update --tag openclaw@2026.3.22
```

Notes :

- `--tag` s'applique **uniquement aux installations de package (npm)**. Les installations git l'ignorent.
- Le tag n'est pas persisté. Votre prochain `openclaw update` utilise votre
  canal configuré comme d'habitude.
- Protection contre la rétrogradation : si la version cible est antérieure à votre version actuelle,
  OpenClaw demande confirmation (ignorez avec `--yes`).

## Essai à blanc

Prévisualiser ce que `openclaw update` ferait sans apporter de modifications :

```bash
openclaw update --dry-run
openclaw update --channel beta --dry-run
openclaw update --tag 2026.3.22 --dry-run
openclaw update --dry-run --json
```

L'essai à blanc affiche le canal effectif, la version cible, les actions planifiées et indique
si une confirmation de rétrogradation serait requise.

## Plugins et canaux

Lorsque vous changez de canal avec `openclaw update`, OpenClaw synchronise également les
sources des plugins :

- `dev` privilégie les plugins groupés depuis l'extraction git.
- `stable` et `beta` restaurent les packages de plugins installés via npm.
- Les plugins installés via npm sont mis à jour après la fin de la mise à jour du cœur.

## Vérifier l'état actuel

```bash
openclaw update status
```

Affiche le canal actif, le type d'installation (git ou package), la version actuelle et
la source (config, git tag, git branch ou par défaut).

## Bonnes pratiques de balisage

- Balisez les versions que vous souhaitez voir utilisées par les extractions git (`vYYYY.M.D` pour stable,
  `vYYYY.M.D-beta.N` pour bêta).
- `vYYYY.M.D.beta.N` est également reconnu pour compatibilité, mais privilégiez `-beta.N`.
- Les balises `vYYYY.M.D-<patch>` héritées sont toujours reconnues comme stables (non bêta).
- Gardez les balises immuables : ne déplacez jamais et ne réutilisez jamais une balise.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` -> stable
  - `beta` -> build candidat
  - `dev` -> instantané main (optionnel)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure de version d'application macOS. Ce n'est pas grave :

- La balise git et le dist-tag npm peuvent toujours être publiés.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

---
summary: "Canaux stable, bêta et dev : sémantique, basculement et étiquetage"
read_when:
  - Vous souhaitez basculer entre stable/bêta/dev
  - Vous êtes en train d'étiqueter ou de publier des préversions
title: "Canaux de développement"
---

# Canaux de développement

Dernière mise à jour : 2026-01-21

OpenClaw propose trois canaux de mise à jour :

- **stable** : étiquette de distribution npm `latest`.
- **bêta** : étiquette de distribution npm `beta` (versions en cours de test).
- **dev** : tête mobile de `main` (git). étiquette de distribution npm : `dev` (lors de la publication).

Nous livrons les versions sur **bêta**, les testons, puis **promouvons une version vérifiée vers `latest`**
sans changer le numéro de version — les dist-tags sont la source de vérité pour les installations npm.

## Basculement de canaux

Git checkout :

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

- `stable`/`beta` extraient la dernière balise correspondante (souvent la même balise).
- `dev` bascule vers `main` et effectue un rebase sur l'amont.

Installation globale npm/pnpm :

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

Ceci se met à jour via l'étiquette de distribution npm correspondante (`latest`, `beta`, `dev`).

Lorsque vous basculez de canaux de manière **explicite** avec `--channel`, OpenClaw aligne également
la méthode d'installation :

- `dev` assure un git checkout (par défaut `~/openclaw`, remplacer par `OPENCLAW_GIT_DIR`),
  le met à jour, et installe la CLI globale depuis ce checkout.
- `stable`/`beta` installe depuis npm en utilisant le dist-tag correspondant.

Astuce : si vous souhaitez avoir stable + dev en parallèle, gardez deux clones et pointez votre passerelle vers celui stable.

## Plugins et canaux

Lorsque vous basculez de canaux avec `openclaw update`, OpenClaw synchronise également les sources des plugins :

- `dev` privilégie les plugins groupés depuis le git checkout.
- `stable` et `beta` restaurent les packages de plugins installés via npm.

## Bonnes pratiques d'étiquetage

- Étiquetez les versions que vous voulez que les git checkouts récupèrent (`vYYYY.M.D` pour stable, `vYYYY.M.D-beta.N` pour bêta).
- `vYYYY.M.D.beta.N` est également reconnu pour compatibilité, mais préférez `-beta.N`.
- Les balises `vYYYY.M.D-<patch>` obsolètes sont toujours reconnues comme stables (non bêta).
- Gardez les balises immuables : ne déplacez jamais et ne réutilisez jamais une balise.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` → stable
  - `beta` → build candidat
  - `dev` → snapshot main (facultatif)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure une version d'application macOS. Ce n'est pas grave :

- La balise git et le dist-tag npm peuvent toujours être publiés.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

import fr from "/components/footer/fr.mdx";

<fr />

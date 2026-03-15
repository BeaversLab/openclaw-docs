---
summary: "Canaux stable, bêta et dev : sémantique, basculement et étiquetage"
read_when:
  - You want to switch between stable/beta/dev
  - You are tagging or publishing prereleases
title: "Canaux de développement"
---

# Canaux de développement

Dernière mise à jour : 2026-01-21

OpenClaw fournit trois canaux de mise à jour :

- **stable** : npm dist-tag `latest`.
- **beta** : npm dist-tag `beta` (versions en test).
- **dev** : tête mobile de `main` (git). npm dist-tag : `dev` (lorsqu'il est publié).

Nous publions des versions sur **beta**, les testons, puis **promouvons une version vérifiée vers `latest`**
sans changer le numéro de version — les dist-tags sont la source de vérité pour les installations npm.

## Changer de canal

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

Ceci met à jour via le npm dist-tag correspondant (`latest`, `beta`, `dev`).

Lorsque vous changez de canal de manière **explicite** avec `--channel`, OpenClaw aligne également
la méthode d'installation :

- `dev` assure un git checkout (par défaut `~/openclaw`, remplacer avec `OPENCLAW_GIT_DIR`),
  le met à jour et installe le CLI global depuis ce checkout.
- `stable`/`beta` installe depuis npm en utilisant le dist-tag correspondant.

Astuce : si vous voulez stable + dev en parallèle, gardez deux clones et pointez votre passerelle sur celui stable.

## Plugins et canaux

Lorsque vous changez de canal avec `openclaw update`, OpenClaw synchronise également les sources des plugins :

- `dev` privilégie les plugins groupés depuis le git checkout.
- `stable` et `beta` restaurent les packages de plugins installés via npm.

## Bonnes pratiques pour le marquage

- Marquez les versions sur lesquelles vous voulez que les extraits git aboutissent (`vYYYY.M.D` pour stable, `vYYYY.M.D-beta.N` pour bêta).
- `vYYYY.M.D.beta.N` est également reconnu pour la compatibilité, mais préférez `-beta.N`.
- Les balises `vYYYY.M.D-<patch>` héritées sont toujours reconnues comme stables (non-bêta).
- Gardez les balises immuables : ne déplacez ou ne réutilisez jamais une balise.
- Les dist-tags npm restent la source de vérité pour les installations npm :
  - `latest` → stable
  - `beta` → build candidat
  - `dev` → instantané main (facultatif)

## Disponibilité de l'application macOS

Les versions bêta et dev peuvent **ne pas** inclure une version de l'application macOS. Ce n'est pas grave :

- La balise git et le dist-tag npm peuvent toujours être publiés.
- Indiquez « pas de build macOS pour cette bêta » dans les notes de version ou le journal des modifications.

import fr from '/components/footer/fr.mdx';

<fr />

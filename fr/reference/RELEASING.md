---
title: "Politique de publication"
summary: "Canaux de publication publique, nommage des versions et cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Politique de publication

OpenClaw dispose de trois canaux de publication publique :

- stable : versions taguées qui sont publiées sur npm `latest`
- beta : balises de prépublication qui sont publiées sur npm `beta`
- dev : la tête mobile de `main`

## Nommage des versions

- Version de publication stable : `YYYY.M.D`
  - Balise Git : `vYYYY.M.D`
- Version de prépublication beta : `YYYY.M.D-beta.N`
  - Balise Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la publication stable actuelle sur npm
- `beta` désigne la prépublication actuelle sur npm
- Les versions beta peuvent être publiées avant que l'application macOS ne soit à jour

## Cadence de publication

- Les publications se font d'abord en beta
- La version stable ne suit qu'après validation de la dernière beta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont
  réservés aux mainteneurs

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le manuel opérationnel réel.

import fr from "/components/footer/fr.mdx";

<fr />

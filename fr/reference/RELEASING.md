---
title: "Politique de publication"
summary: "Canaux de publication publics, nommage des versions et cadence"
read_when:
  - Recherche de définitions des canaux de publication publics
  - Recherche du nommage et de la cadence des versions
---

# Politique de publication

OpenClaw a trois voies de publication publiques :

- stable : versions taguées qui sont publiées sur npm `latest`
- beta : balises de prépublication qui sont publiées sur npm `beta`
- dev : la tête courante de `main`

## Nommage des versions

- Version stable : `YYYY.M.D`
  - Balise Git : `vYYYY.M.D`
- Version bêta de prépublication : `YYYY.M.D-beta.N`
  - Balise Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la publication stable actuelle sur npm
- `beta` désigne la publication de prépublication actuelle sur npm
- Les versions bêta peuvent être publiées avant que l'application macOS ne soit à jour

## Cadence de publication

- Les publications passent d'abord par la bêta
- La version stable ne suit qu'après validation de la dernière bêta
- La procédure de publication détaillée, les approbations, les identifiants et les notes de récupération sont
  réservés aux mainteneurs

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook actual.

import fr from "/components/footer/fr.mdx";

<fr />

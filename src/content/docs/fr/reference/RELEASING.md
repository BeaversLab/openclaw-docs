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
- Version de correction stable : `YYYY.M.D-N`
  - Tag Git : `vYYYY.M.D-N`
- Version de prépublication bêta : `YYYY.M.D-beta.N`
  - Tag Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la version stable actuelle publiée sur npm
- `beta` désigne la version de prépublication actuelle publiée sur npm
- Les versions de correction stables sont également publiées sur npm `latest`
- Chaque version d'OpenClaw publie le paquet npm et l'application macOS ensemble

## Cadence de publication

- Les publications passent d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont réservés aux mainteneurs

## Préparation de la publication

- Exécutez `pnpm build` avant `pnpm release:check` afin que les artefacts de publication `dist/*` attendus existent pour l'étape de validation du paquet
- Exécutez `pnpm release:check` avant chaque publication taguée
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou le tag bêta/correction correspondant) avant approbation
- Après la publication sur npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un nouveau préfixe temporaire
- Pour les versions de correction stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le chemin de mise à niveau de même préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de publication ne puissent pas laisser silencieusement d'anciennes installations globales sur
  le contenu stable de base
- La prépublication de version npm échoue fermement à moins que l'archive ne contienne à la fois
  `dist/control-ui/index.html` et un contenu `dist/control-ui/assets/` non vide
  afin que nous ne publions plus à nouveau un tableau de bord vide pour le navigateur
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la publication GitHub doit contenir les éléments empaquetés `.zip`, `.dmg` et `.dSYM.zip`
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application empaquetée doit conserver un identifiant de bundle non-débogage, une URL de flux Sparkle non vide et un `CFBundleVersion` supérieur ou égal au seuil de build Sparkle canonique pour cette version de publication

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook réel.

---
title: "Politique de publication"
summary: "Canaux de publication publique, nommage des versions et cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Politique de publication

OpenClaw dispose de trois canaux de publication publique :

- stable : versions étiquetées qui sont publiées sur npm npm `latest` et reflètent la même version sur `beta`, sauf si `beta` pointe déjà vers une pré-version plus récente
- beta : balises de pré-version qui sont publiées sur npm `beta`
- dev : la tête mouvante de `main`

## Nommage des versions

- Version de la version stable : `YYYY.M.D`
  - Balise Git : `vYYYY.M.D`
- Version de la version de correction stable : `YYYY.M.D-N`
  - Balise Git : `vYYYY.M.D-N`
- Version de la pré-version bêta : `YYYY.M.D-beta.N`
  - Balise Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la version stable actuelle de npm
- `beta` désigne la cible d'installation bêta actuelle, qui peut pointer soit vers la pré-version active soit vers la dernière version stable promue
- Les versions stables et les versions de correction stables sont publiées sur npm `latest` et réétiquettent également npm `beta` avec cette même version non bêta après la promotion, sauf si `beta` pointe déjà vers une pré-version plus récente
- Chaque version d'OpenClaw publie le paquet npm et l'application macOS ensemble

## Cadence de publication

- Les publications passent d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont réservés aux mainteneurs

## Préparation de la publication

- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de
  version `dist/*` attendus et le bundle Control UI existent pour l'étape
  de validation du pack
- Exécutez `pnpm release:check` avant chaque version étiquetée
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise bêta/correction correspondante) avant approbation
- Après la publication sur npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire vierge
- Les workflows des mainteneurs peuvent réutiliser une exécution de contrôle préliminaire réussie pour la véritable
  publication afin que l'étape de publication promeuve les artefacts de version préparés au lieu de
  les reconstruire
- Pour les versions de correction stables comme `YYYY.M.D-N`, le vérificateur
  post-publication vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne puissent pas laisser silencieusement des installations globales plus anciennes sur
  la charge utile stable de base
- La prépublication de la version npm échoue fermement à moins que l'archive ne contienne à la fois `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide, afin que nous ne livrions plus un tableau de bord navigateur vide
- Si le travail de publication a touché la planification CI, les manifestes de minutage d'extension ou les matrices de test rapide, régénérez et examinez le plan de partition `checks-fast-extensions` propriétaire du planificateur via `node scripts/ci-write-manifest-outputs.mjs --workflow ci` avant approbation, afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la publication GitHub doit finalement contenir les fichiers `.zip`, `.dmg` et `.dSYM.zip` empaquetés
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application empaquetée doit conserver un identifiant de bundle non-debug, une URL de flux Sparkle non vide et une `CFBundleVersion` supérieure ou égale au plancher de construction Sparkle canonique pour cette version

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les responsables utilisent la documentation de publication privée dans [`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md) pour le manuel d'exécution réel.

---
title: "Politique de publication"
summary: "Canaux de publication publique, nommage des versions et cadence"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# Politique de publication

OpenClaw dispose de trois canaux de publication publique :

- stable : versions tagguées qui sont publiées sur npm `beta` par défaut, ou sur npm `latest` sur demande explicite
- beta : balises de préversion qui publient sur npm `beta`
- dev : la tête mobile de `main`

## Nommage des versions

- Version de release stable : `YYYY.M.D`
  - Tag Git : `vYYYY.M.D`
- Version de release de correction stable : `YYYY.M.D-N`
  - Tag Git : `vYYYY.M.D-N`
- Version de préversion bêta : `YYYY.M.D-beta.N`
  - Tag Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la release stable npm actuellement promue
- `beta` désigne la cible d'installation bêta actuelle
- Les releases stables et les releases de correction stable sont publiées sur npm `beta` par défaut ; les opérateurs de release peuvent cibler `latest` explicitement, ou promouvoir ultérieurement un build bêta vérifié
- Chaque version d'OpenClaw publie le paquet npm et l'application macOS ensemble

## Cadence de publication

- Les publications passent d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont réservés aux mainteneurs

## Préparation de la publication

- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de release
  `dist/*` attendus et le bundle Control UI existent pour l'étape de
  validation du pack
- Exécutez `pnpm release:check` avant chaque release tagguée
- La préversion npm de la branche principale exécute également
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  avant de créer l'archive tar, en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et
  `ANTHROPIC_API_KEY`
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou le tag bêta/correction correspondant) avant l'approbation
- Après la publication sur npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un nouveau préfixe temporaire
- L'automatisation des releases par les mainteneurs utilise désormais le mode préversion-puis-promotion :
  - la véritable publication npm doit réussir une vérification npm `preflight_run_id` réussie
  - les releases stables npm sont par défaut `beta`
  - la publication stable npm peut cibler `latest` explicitement via l'entrée du workflow
  - la promotion stable npm de `beta` vers `latest` est toujours disponible en tant que mode manuel explicite sur le workflow de confiance `OpenClaw NPM Release`
  - que le mode de promotion nécessite toujours un `NPM_TOKEN` valide dans l'environnement `npm-release` car la gestion `dist-tag` de npm est distincte de la publication approuvée
  - public `macOS Release` est une validation uniquement
  - la publication mac privée réelle doit réussir le test mac privé
    `preflight_run_id` et `validate_run_id`
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
    à nouveau
- Pour les corrections de version stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` à `YYYY.M.D-N`
  afin que les corrections de version ne puissent pas laisser silencieusement des installations globales plus anciennes sur
  la charge utile stable de base
- la prépublication de version npm échoue fermement à moins que l'archive ne comprenne à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  pour que nous ne livrions plus un tableau de bord de navigateur vide
- Si le travail de publication a touché à la planification CI, aux manifestes de timing d'extension, ou aux matrices de test d'extension, régénérez et examinez les sorties de matrice de workflow `checks-node-extensions` détenues par le planificateur à partir de `.github/workflows/ci.yml` avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète.
- La préparation de la version stable macOS comprend également les surfaces de l'outil de mise à jour :
  - la version GitHub doit se retrouver avec le `.zip` empaqueté, le `.dmg`, et le `.dSYM.zip`
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application empaquetée doit conserver un id de bundle non-débogage, une URL de flux Sparkle
    non vide, et un `CFBundleVersion` à ou au-dessus du plancher de build Sparkle canonique
    pour cette version

## Entrées de workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : balise de version requise telle que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1`
- `preflight_only` : `true` pour validation/build/package uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel afin que le workflow réutilise
  l'archive tarball préparée lors de l'exécution réussie du prévol
- `npm_dist_tag` : étiquette de cible npm pour le chemin de publication ; par défaut `beta`
- `promote_beta_to_latest` : `true` pour sauter la publication et déplacer une version stable `beta`
  déjà publiée vers `latest`

Règles :

- Les étiquettes stables et de correction peuvent être publiées soit sur `beta` soit sur `latest`
- Les étiquettes de préversion bêta peuvent être publiées uniquement sur `beta`
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors du prévol ;
  le workflow vérifie que les métadonnées sont identiques avant que la publication ne continue
- Le mode de promotion doit utiliser une étiquette stable ou de correction, `preflight_only=false`,
  un `preflight_run_id` vide, et `npm_dist_tag=beta`
- Le mode de promotion nécessite également un `NPM_TOKEN` valide dans l'environnement `npm-release`
  car `npm dist-tag add` a toujours besoin d'une authentification npm régulière

## Séquence de publication stable npm

Lors de la création d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement
   lorsque vous voulez intentionnellement une publication stable directe
3. Sauvegardez le `preflight_run_id` réussi
4. Exécutez `OpenClaw NPM Release` à nouveau avec `preflight_only=false`, le même
   `tag`, le même `npm_dist_tag`, et le `preflight_run_id` sauvegardé
5. Si la publication a atterri sur `beta`, exécutez `OpenClaw NPM Release` plus tard avec le
   même `tag` stable, `promote_beta_to_latest=true`, `preflight_only=false`,
   `preflight_run_id` vide, et `npm_dist_tag=beta` lorsque vous souhaitez déplacer cette
   build publiée vers `latest`

Le mode de promotion nécessite toujours l'approbation de l'environnement `npm-release` et un
`NPM_TOKEN` valide dans cet environnement.

Cela permet de garder à la fois le chemin de publication directe et le chemin de promotion via la version bêta documentés et visibles pour les opérateurs.

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook actuel.

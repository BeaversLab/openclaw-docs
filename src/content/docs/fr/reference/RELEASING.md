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
- Les vérifications de version s'exécutent désormais dans un workflow manuel distinct :
  `OpenClaw Release Checks`
- La validation de l'exécution de l'installation et de la mise à niveau multi-OS est distribuée depuis le
  workflow d'appel privé
  `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`,
  qui invoque le workflow public réutilisable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Cette séparation est intentionnelle : garder le chemin de publication npm réel court,
  déterministe et axé sur les artefacts, tandis que les vérifications en direct plus lentes restent dans leur
  propre voie afin qu'elles ne bloquent pas ou n'entravent pas la publication
- Les vérifications de version doivent être distribuées à partir de la référence de workflow `main` afin que la
  logique et les secrets du workflow restent canoniques
- Ce workflow accepte soit une étiquette de version existante, soit le SHA de commit `main` complet actuel
  de 40 caractères
- En mode SHA de commit, il n'accepte que le HEAD `origin/main` actuel ; utilisez une
  étiquette de version pour les commits de version plus anciens
- La pré-vérification de validation uniquement `OpenClaw NPM Release` accepte également le
  SHA de commit `main` complet actuel de 40 caractères sans exiger d'étiquette poussée
- Ce chemin SHA est réservé à la validation et ne peut être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la
  vérification des métadonnées du package ; la publication réelle nécessite toujours une véritable étiquette de version
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners hébergés par GitHub,
  tandis que le chemin de validation sans mutation peut utiliser les runners
  Linux plus volumineux de Blacksmith
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La pré-vérification de version npm n'attend plus la voie distincte des vérifications de version
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou l'étiquette bêta/correction correspondante) avant approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation du registre
  publié dans un préfixe temporaire frais
- L'automatisation de version par les mainteneurs utilise désormais la pré-vérification puis la promotion :
  - la publication npm réelle doit réussir une vérification npm `preflight_run_id` réussie
  - les versions stables npm sont par défaut `beta`
  - la publication stable npm peut cibler `latest` explicitement via l'entrée du workflow
  - la mutation de la dist-tag basée sur un jeton npm réside désormais dans
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que le
    dépôt public conserve uniquement la publication par OIDC
  - la `macOS Release` publique est réservée à la validation
  - la publication privée mac réelle doit réussir le private mac
    `preflight_run_id` et le `validate_run_id`
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les versions de correction stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne laissent pas silencieusement d'anciennes installations globales sur
  la charge utile stable de base
- la prépublication de version npm échoue fermement à moins que l'archive n'inclue à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus un tableau de bord navigateur vide
- `pnpm test:install:smoke` applique également le budget de npm pack `unpackedSize` sur
  l'archive de mise à jour candidate, afin que l'e2e de l'installateur intercepte le gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de version a touché à la planification CI, aux manifestes de synchronisation des extensions, ou
  aux matrices de test des extensions, régénérez et examinez les sorties de matrice de workflow
  `checks-node-extensions` détenues par le planificateur depuis `.github/workflows/ci.yml`
  avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS inclut également les surfaces de mise à jour :
  - la version GitHub doit se terminer avec les `.zip` packagés, `.dmg`, et `.dSYM.zip`
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application packagée doit conserver un id de bundle non debug, une URL de flux Sparkle
    non vide, et une `CFBundleVersion` à ou au-dessus du seuil de build Sparkle canonique
    pour cette version

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : balise de version requise telle que `v2026.4.2`, `v2026.4.2-1` ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, ce peut également être le SHA de
  commit `main` complet de 40 caractères actuel pour une pré-vérification de validation uniquement
- `preflight_only` : `true` pour la validation/build/package uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel afin que le workflow réutilise
  l'archive tarball préparée lors de l'exécution réussie de la pré-vérification
- `npm_dist_tag` : balise cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : balise de version existante ou le SHA de commit `main` complet actuel de 40 caractères
  à valider

Règles :

- Les balises stables et de correction peuvent être publiées soit sur `beta` soit sur `latest`
- Les balises de pré-version bêta ne peuvent être publiées que sur `beta`
- L'entrée du SHA de commit complet n'est autorisée que lorsque `preflight_only=true`
- Le mode de vérification de version par SHA de commit nécessite également le HEAD `origin/main` actuel
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors de la pré-vérification ;
  le workflow vérifie ces métadonnées avant que la publication ne se poursuive

## Séquence de publication stable npm

Lors de la création d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise n'existe, vous pouvez utiliser le SHA de commit `main` complet actuel pour
     un essai à blanc de validation uniquement du workflow de pré-vérification
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement
   si vous souhaitez intentionnellement une publication stable directe
3. Exécutez `OpenClaw Release Checks` séparément avec la même balise ou le
   SHA de commit `main` complet actuel lorsque vous souhaitez une couverture du cache d'invite en direct
   - Ceci est séparé exprès afin que la couverture en direct reste disponible sans
     recoupler des vérifications de longue durée ou instables au workflow de publication
4. Sauvegardez le `preflight_run_id` réussi
5. Exécutez `OpenClaw NPM Release` à nouveau avec `preflight_only=false`, le même
   `tag`, le même `npm_dist_tag`, et le `preflight_run_id` enregistré
6. Si la version a atterri sur `beta`, utilisez le workflow privé
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   pour promouvoir cette version stable de `beta` vers `latest`
7. Si la version a été intentionnellement publiée directement sur `latest` et que `beta`
   doit suivre immédiatement le même build stable, utilisez ce même workflow privé
   pour pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation
   d'auto-réparation planifiée déplacer `beta` plus tard

La mutation de dist-tag réside dans le dépôt privé pour des raisons de sécurité car elle
nécessite encore `NPM_TOKEN`, tandis que le dépôt public conserve la publication OIDC uniquement.

Cela permet de garder le chemin de publication directe et le chemin de promotion beta-premier tous deux
documentés et visibles par les opérateurs.

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les mainteneurs utilisent la documentation de version privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook réel.

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
- Chaque version stable d'OpenClaw inclut le package npm et l'application macOS ; les versions bêta valident et publient généralement d'abord le chemin npm/package, la construction, la signature et la notarisation de l'application mac étant réservées à la version stable sauf demande explicite

## Cadence de publication

- Les publications passent d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- Les mainteneurs créent généralement les versions à partir d'une branche `release/YYYY.M.D` créée à partir du `main` actuel, afin que la validation et les correctifs de version ne bloquent pas le nouveau développement sur `main`
- Si une étiquette bêta a été poussée ou publiée et nécessite une correction, les mainteneurs créent la prochaine étiquette `-beta.N` au lieu de supprimer ou de recréer l'ancienne étiquette bêta
- La procédure de version détaillée, les approbations, les identifiants et les notes de récupération sont réservés aux mainteneurs

## Pré-vol de version

- Exécutez `pnpm check:test-types` avant le pré-vol de version afin que le TypeScript de test reste couvert en dehors de la porte `pnpm check` locale plus rapide
- Exécutez `pnpm check:architecture` avant le pré-vol de version afin que les contrôles plus larges du cycle d'importation et des limites d'architecture soient au vert en dehors de la porte locale plus rapide
- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de version `dist/*` attendus et le bundle Control UI existent pour l'étape de validation du pack
- Exécutez `pnpm release:check` avant chaque version étiquetée
- Les vérifications de version s'exécutent désormais dans un workflow manuel séparé : `OpenClaw Release Checks`
- La validation du runtime d'installation et de mise à niveau multi-OS est distribuée à partir du workflow d'appel privé `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`, qui invoque le workflow public réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Cette séparation est intentionnelle : gardez le vrai chemin de publication npm court, déterministe et axé sur les artefacts, tandis que les vérifications directes plus lentes restent dans leur propre voie afin qu'elles ne fassent pas traîner ou bloquer la publication
- Les vérifications de version doivent être distribuées à partir de la référence de workflow `main` ou d'une référence de workflow `release/YYYY.M.D` afin que la logique et les secrets du workflow restent contrôlés
- Ce workflow accepte soit une étiquette de version existante, soit le SHA de commit de branche de workflow complet actuel de 40 caractères
- En mode SHA de commit, il n'accepte que le HEAD de la branche de workflow actuelle ; utilisez une étiquette de version pour les commits de version plus anciens
- Le prévol validation-only `OpenClaw NPM Release` accepte également le
  SHA de commit complet de 40 caractères de la branche de workflow sans nécessiter de balise poussée
- Ce chemin SHA est validation-only et ne peut être promu en une vraie publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la
  vérification des métadonnées du package ; une vraie publication nécessite toujours une vraie balise de version
- Les deux workflows gardent le chemin de vraie publication et de promotion sur les hébergés
  par GitHub,
  tandis que le chemin de validation non-mutant peut utiliser les plus gros
  runners Linux de Blacksmith
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- Le prévol de publication npm n'attend plus la file de vérification de version séparée
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise beta/correction correspondante) avant l'approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version beta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un nouveau préfixe temporaire
- L'automatisation de publication du responsable utilise désormais prévol-puis-promotion :
  - la vraie publication npm doit réussir un `preflight_run_id` npm réussi
  - la vraie publication npm doit être dispatchée à partir de la même branche `main` ou
    `release/YYYY.M.D` que l'exécution de prévol réussie
  - les versions stables npm sont `beta` par défaut
  - la publication stable npm peut cibler `latest` explicitement via l'entrée de workflow
  - la mutation de dist-tag npm basée sur des jetons réside désormais dans
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que le
    dépôt public garde une publication OIDC-only
  - le `macOS Release` public est validation-only
  - la vraie publication privée mac doit réussir le `preflight_run_id` privé mac
    et le `validate_run_id` réussis
  - les chemins de vraie publication promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les corrections de versions stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne laissent pas silencieusement d'anciennes installations globales sur
  la charge utile stable de base
- La pré-publication de version npm échoue fermement à moins que l'archive ne contienne à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus un tableau de bord navigateur vide
- `pnpm test:install:smoke` applique également le budget `unpackedSize` de pack npm sur
  l'archive de la mise à jour candidate, afin que l'installer e2e détecte un gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de version a touché la planification CI, les manifestes de timing d'extension, ou
  les matrices de tests d'extension, régénérez et révisez les sorties de matrice de workflow
  `checks-node-extensions` appartenant au planificateur à partir de `.github/workflows/ci.yml`
  avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la version GitHub doit se retrouver avec le `.zip` packagé, `.dmg`, et `.dSYM.zip`
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application packagée doit conserver un id de bundle non débogage, une URL de flux Sparkle
    non vide, et une `CFBundleVersion` à ou au-dessus du plancher de build Sparkle canonique
    pour cette version

## Entrées de workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : balise de version requise telle que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1` ; quand `preflight_only=true`, ce peut aussi être le
  SHA de commit complet de 40 caractères de la branche de workflow actuel pour une pré-publication de validation uniquement
- `preflight_only` : `true` pour validation/build/package uniquement, `false` pour le
  vrai chemin de publication
- `preflight_run_id` : requis sur le vrai chemin de publication afin que le workflow réutilise
  l'archive préparée de l'exécution de pré-publication réussie
- `npm_dist_tag` : étiquette cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : étiquette de version existante ou le SHA de commit complet actuel sur 40 caractères `main` à valider lors du déclenchement depuis `main` ; depuis une branche de version, utilisez une étiquette de version existante ou le SHA de commit de la branche de version complet actuel sur 40 caractères

Règles :

- Les étiquettes stables et de correction peuvent être publiées soit sur `beta` soit sur `latest`
- Les étiquettes de prépublication bêta ne peuvent être publiées que sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée du SHA de commit complet n'est autorisée que lorsque `preflight_only=true`
- `OpenClaw Release Checks` est toujours uniquement une validation et accepte également le SHA de commit de la branche de workflow actuelle
- Le mode SHA de commit des vérifications de version nécessite également la HEAD actuelle de la branche de workflow
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors des vérifications préalables ; le workflow vérifie que les métadonnées avant la publication se poursuivent

## Séquence de publication stable npm

Lors de la création d'une version stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une étiquette n'existe, vous pouvez utiliser le SHA de commit complet actuel de la branche de workflow pour un essai à blanc de validation uniquement du workflow de vérifications préalables
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `OpenClaw Release Checks` séparément avec la même étiquette ou le SHA de commit complet actuel de la branche de workflow lorsque vous souhaitez une couverture en temps réel du cache de invites
   - Ceci est séparé exprès pour que la couverture en temps réel reste disponible sans recoupler des vérifications longues ou instables au workflow de publication
4. Enregistrez le `preflight_run_id` réussi
5. Exécutez `OpenClaw NPM Release` à nouveau avec `preflight_only=false`, le même `tag`, le même `npm_dist_tag` et le `preflight_run_id` enregistré
6. Si la publication a atterri sur `beta`, utilisez le workflow privé
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   pour promouvoir cette version stable de `beta` vers `latest`
7. Si la publication a été intentionnellement publiée directement sur `latest` et que `beta`
   doit suivre immédiatement le même build stable, utilisez ce même workflow
   privé pour pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation
   d'auto-réparation planifiée déplacer `beta` plus tard

La mutation du dist-tag se trouve dans le repo privé pour des raisons de sécurité car elle nécessite encore
`NPM_TOKEN`, tandis que le repo public conserve une publication OIDC uniquement.

Cela permet de garder le chemin de publication directe et le chemin de promotion beta-first tous deux
documentés et visibles par les opérateurs.

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook réel.

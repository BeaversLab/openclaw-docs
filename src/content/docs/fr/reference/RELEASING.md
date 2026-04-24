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
- `OpenClaw Release Checks` exécute également la porte de parité simulée du QA Lab ainsi que les voies QA en direct Matrix et Telegram avant l'approbation de la release. Les voies en direct utilisent l'environnement `qa-live-shared` ; Telegram utilise également les baux d'identifiants CI Convex.
- La validation du runtime d'installation et de mise à niveau multi-OS est dispatchée depuis le workflow privé appelant `openclaw/releases-private/.github/workflows/openclaw-cross-os-release-checks.yml`, qui invoque le workflow public réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Cette séparation est intentionnelle : garder le chemin de release npm réel court, déterministe et axé sur les artefacts, tandis que les vérifications en direct plus lentes restent dans leur propre voie afin de ne pas bloquer ou empêcher la publication
- Les vérifications de release doivent être dispatchées depuis la ref de workflow `main` ou depuis une ref de workflow `release/YYYY.M.D` afin que la logique et les secrets du workflow restent contrôlés
- Ce workflow accepte soit un tag de release existant, soit le SHA de commit complet actuel de 40 caractères de la branche de workflow
- En mode SHA de commit, il n'accepte que le HEAD actuel de la branche de workflow ; utilisez un tag de release pour les commits de release plus anciens
- La pré-vérification de validation uniquement `OpenClaw NPM Release` accepte également le SHA de commit complet actuel de 40 caractères de la branche de workflow sans exiger de tag poussé
- Ce chemin SHA est uniquement pour validation et ne peut être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la vérification des métadonnées du package ; la publication réelle nécessite toujours un vrai tag de release
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners hébergés par GitHub, tandis que le chemin de validation non mutateur peut utiliser les plus gros runners Linux Blacksmith
- Ce workflow exécute `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache` en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La pré-vérification de release npm n'attend plus la voie séparée des vérifications de release
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts` (ou le tag beta/correction correspondant) avant l'approbation
- Après la publication npm, exécutez `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D` (ou la version beta/correction correspondante) pour vérifier le chemin d'installation du registre publié dans un préfixe temporaire frais
- L'automatisation de release des mainteneurs utilise désormais pré-vérification-puis-promotion :
  - la publication npm réelle doit réussir un npm `preflight_run_id` réussi
  - la véritable publication npm doit être expédiée à partir de la même branche `main` ou
    `release/YYYY.M.D` que celle de la prévol réussie
  - les versions stables npm sont `beta` par défaut
  - la publication stable npm peut cibler `latest` explicitement via l'entrée du workflow
  - la mutation du dist-tag npm basée sur un jeton réside maintenant dans
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que
    le dépôt public conserve une publication uniquement OIDC
  - le `macOS Release` public est uniquement une validation
  - la vraie publication privée mac doit réussir la prévol privée mac
    `preflight_run_id` et `validate_run_id`
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les versions de corrections stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne laissent pas silencieusement des installations globales plus anciennes sur
  la charge utile stable de base
- la prévol de publication npm échoue fermée à moins que l'archive ne contienne à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus un tableau de bord navigateur vide
- La vérification post-publication vérifie également que l'installation du registre publiée
  contient des dépendances d'exécution de plugin groupées non vides sous la racine `dist/*`
  disposition. Une version livrée avec des charges utiles de dépendances de plugin groupées manquantes ou vides
  échoue au vérificateur postpublication et ne peut être promue
  vers `latest`.
- `pnpm test:install:smoke` applique également le budget `unpackedSize` de pack npm sur
  l'archive de mise à jour candidate, afin que l'e2e de l'installeur détecte un gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de publication a touché la planification CI, les manifestes de synchronisation des extensions ou
  les matrices de test des extensions, régénérez et examinez les sorties de matrice de workflow `checks-node-extensions`
  détenues par le planificateur à partir de `.github/workflows/ci.yml`
  avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS comprend également les surfaces du programme de mise à jour :
  - la version GitHub doit contenir les fichiers `.zip`, `.dmg` et `.dSYM.zip` empaquetés
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application empaquetée doit conserver un bundle id non-débogage, une URL de flux Sparkle non vide
    et un `CFBundleVersion` supérieur ou égal au seuil de build Sparkle canonique
    pour cette version de publication

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : balise de version requise telle que `v2026.4.2`, `v2026.4.2-1` ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, il peut également s'agir du
  SHA de commit complet de 40 caractères de la branche de workflow actuel pour une pré-vol de validation uniquement
- `preflight_only` : `true` pour la validation/le build/l'empaquetage uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel afin que le workflow réutilise
  le tarball préparé lors de la pré-vol réussie
- `npm_dist_tag` : balise cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : balise de version existante ou le SHA de commit `main` complet de 40 caractères actuel
  à valider lors du déclenchement depuis `main` ; depuis une branche de version, utilisez une
  balise de version existante ou le SHA de commit de branche de version complet de 40 caractères actuel

Règles :

- Les balises stables et de correction peuvent être publiées soit sur `beta` soit sur `latest`
- Les balises de pré-version bêta ne peuvent être publiées que sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée de SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` est toujours une validation uniquement et accepte également le
  SHA de commit de la branche de workflow actuelle
- Le mode SHA de commit des vérifications de version nécessite également la HEAD actuelle de la branche de workflow
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors des vérifications préalables ; le workflow vérifie ces métadonnées avant que la publication ne se poursuive

## Séquence de publication stable npm

Lors de la création d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise (tag) n'existe, vous pouvez utiliser le SHA de commit complet actuel de la branche de workflow pour un essai à blanc (dry run) de validation uniquement du workflow préalable
2. Choisissez `npm_dist_tag=beta` pour le flux normal prioritaire à la version bêta, ou `latest` uniquement lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `OpenClaw Release Checks` séparément avec la même balise ou le SHA de commit complet actuel de la branche de workflow lorsque vous voulez une mise en cache dynamique des invites, la parité du QA Lab, Matrix et la couverture Telegram
   - Ceci est séparé exprès pour que la couverture dynamique reste disponible sans recoupler des vérifications de longue durée ou instables au workflow de publication
4. Sauvegardez le `preflight_run_id` réussi
5. Exécutez `OpenClaw NPM Release` à nouveau avec `preflight_only=false`, le même `tag`, le même `npm_dist_tag` et le `preflight_run_id` sauvegardé
6. Si la publication a atterri sur `beta`, utilisez le workflow privé `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` pour promouvoir cette version stable de `beta` vers `latest`
7. Si la publication a été intentionnellement publiée directement sur `latest` et que `beta` doit suivre immédiatement le même build stable, utilisez ce même workflow privé pour pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation d'auto-réparation programmée déplacer `beta` plus tard

La mutation du dist-tag réside dans le dépôt privé pour des raisons de sécurité car elle nécessite encore `NPM_TOKEN`, tandis que le dépôt public conserve une publication par OIDC uniquement.

Cela permet de garder le chemin de publication direct et le chemin de promotion prioritaire à la bêta tous deux documentés et visibles par les opérateurs.

## Références publiques

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le manuel de procédures réel.

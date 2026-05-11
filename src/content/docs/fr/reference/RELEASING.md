---
summary: "Release lanes, operator checklist, validation boxes, version naming, and cadence"
title: "Politique de publication"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw dispose de trois canaux de publication publics :

- stable : versions étiquetées qui sont publiées sur npm `beta` par défaut, ou sur npm `latest` sur demande explicite
- beta : étiquettes de pré-publication qui sont publiées sur npm `beta`
- dev : la tête mobile de `main`

## Nommage des versions

- Version de publication stable : `YYYY.M.D`
  - Étiquette Git : `vYYYY.M.D`
- Version de publication de correction stable : `YYYY.M.D-N`
  - Étiquette Git : `vYYYY.M.D-N`
- Version de pré-publication bêta : `YYYY.M.D-beta.N`
  - Étiquette Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest` désigne la publication stable npm actuellement promue
- `beta` désigne la cible d'installation bêta actuelle
- Les publications stables et les corrections stables sont publiées sur npm `beta` par défaut ; les opérateurs de publication peuvent cibler `latest` explicitement, ou promouvoir ultérieurement une version bêta vérifiée
- Chaque publication stable de OpenClaw livre le paquet npm et l'application macOS ensemble ;
  les publications bêta valident et publient généralement d'abord le chemin npm/paquet, avec
  la construction/signature/notarisation de l'application mac réservée aux versions stables sauf demande explicite

## Cadence de publication

- Les publications se font d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- Les mainteneurs créent généralement les publications à partir d'une branche `release/YYYY.M.D` créée
  à partir du `main` actuel, afin que la validation et les corrections de la publication ne bloquent pas le nouveau
  développement sur `main`
- Si une étiquette bêta a été poussée ou publiée et nécessite une correction, les mainteneurs créent
  la prochaine étiquette `-beta.N` au lieu de supprimer ou de recréer l'ancienne étiquette bêta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont
  réservés aux mainteneurs

## Liste de contrôle pour l'opérateur de publication

Cette liste de contrôle constitue la forme publique du flux de publication. Les informations d'identification privées, la signature, la notarisation, la récupération des dist-tags et les détails de retour en urgence demeurent dans le manuel de publication réservé aux mainteneurs.

1. Commencez à partir de `main` actuel : tirez les dernières modifications, confirmez que le commit cible est poussé, et confirmez que le CI actuel de `main` est suffisamment vert pour créer une branche à partir de celui-ci.
2. Réécrivez la section supérieure `CHANGELOG.md` à partir de l'historique réel des commits avec `/changelog`, gardez les entrées orientées utilisateur, commitez-la, poussez-la, et effectuez un rebase/pull une fois de plus avant de créer la branche.
3. Examinez les enregistrements de compatibilité des versions dans `src/plugins/compat/registry.ts` et `src/commands/doctor/shared/deprecation-compat.ts`. Supprimez la compatibilité expirée uniquement lorsque le chemin de mise à niveau reste couvert, ou enregistrez la raison pour laquelle elle est intentionnellement conservée.
4. Créez `release/YYYY.M.D` à partir de `main` actuel ; ne faites pas le travail de publication normal directement sur `main`.
5. Augmentez chaque emplacement de version requis pour l'étiquette prévue, puis exécutez la pré-vérification locale déterministe : `pnpm check:test-types`, `pnpm check:architecture`, `pnpm build && pnpm ui:build`, et `pnpm release:check`.
6. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`. Avant qu'une étiquette n'existe, un SHA complet de 40 caractères de la branche de publication est autorisé pour la pré-vérification de validation uniquement. Sauvegardez le `preflight_run_id` réussi.
7. Lancez tous les tests de pré-publication avec `Full Release Validation` pour la branche de publication, l'étiquette, ou le SHA complet du commit. C'est le seul point d'entrée manuel pour les quatre grandes boîtes de test de publication : Vitest, Docker, QA Lab et Package.
8. Si la validation échoue, corrigez sur la branche de publication et relancez le plus petit fichier, lane, tâche de workflow, profil de package, fournisseur, ou liste d'autorisation de modèle ayant échoué et prouvant la correction. Relancez le parapluie complet uniquement lorsque la surface modifiée rend les preuves précédentes obsolètes.
9. Pour la version bêta, étiquetez `vYYYY.M.D-beta.N`, publiez avec le dist-tag npm `beta`, puis exécutez
   la vérification post-publication du package par rapport au package `openclaw@YYYY.M.D-beta.N`
   ou `openclaw@beta` publié. Si une version bêta poussée ou publiée nécessite une correction, créez
   la prochaine `-beta.N` ; ne supprimez pas ou ne réécrivez pas l'ancienne version bêta.
10. Pour la version stable, continuez seulement après que la version bêta vérifiée ou le candidat à la release dispose des
    preuves de validation requises. La publication stable sur npm réutilise l'artefact
    de prévol réussi via `preflight_run_id` ; la préparation de la release stable sur macOS
    nécessite également les packages `.zip`, `.dmg`, `.dSYM.zip`, et la mise à jour
    `appcast.xml` sur `main`.
11. Après la publication, exécutez le vérificateur post-publication npm, les E2E npm autonomes facultatifs
    published-Telegram lorsque vous avez besoin d'une preuve post-publication du channel,
    la promotion des dist-tags si nécessaire, les notes de release/prérelease GitHub issues de la
    section `CHANGELOG.md` correspondante complète, et les étapes de l'annonce de release.

## Prévol de release

- Exécutez `pnpm check:test-types` avant la prévol de release afin que les tests TypeScript restent
  couverts en dehors de la barrière `pnpm check` locale plus rapide
- Exécutez `pnpm check:architecture` avant la prévol de release afin que les contrôles plus larges du
  cycle d'importation et des limites de l'architecture soient au vert en dehors de la barrière locale plus rapide
- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de release
  `dist/*` attendus et le bundle Control UI existent pour l'étape de validation du package
- Exécutez le workflow manuel `Full Release Validation` avant l'approbation de la release pour
  lancer toutes les boîtes de test de pré-release à partir d'un point d'entrée unique. Il accepte une branche,
  un tag ou un SHA de commit complet, dispatche les `CI` manuels, et dispatche
  `OpenClaw Release Checks` pour les tests de fumée d'installation, l'acceptation des packages, les suites de chemins de release
  Docker, live/E2E, OpenWebUI, parité QA Lab, Matrix, et Telegram.
  Fournissez `npm_telegram_package_spec` seulement après qu'un package a été
  publié et que les E2E Telegram post-publication doivent également s'exécuter. Exemple :
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par canal parallèle
  pour un candidat de package pendant que le travail de publication se poursuit. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/étiquette/SHA `package_ref` approuvée avec le harnais
  `workflow_ref` actuel ; `source=url` pour une archive tar HTTPS avec un
  SHA-256 requis ; ou `source=artifact` pour une archive tar téléchargée par une autre exécution
  d'actions GitHub. Le workflow résout le candidat en
  `package-under-test`, réutilise le planificateur de publication E2E Docker contre cette
  archive, et peut exécuter les tests QA Telegram contre la même archive avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : install/channel/agent, réseau de passerelle, et voies de rechargement de configuration
  - `package` : voies de package/update/plugin natifs aux artefacts sans OpenWebUI ou ClawHub en direct
  - `product` : profil de package plus canaux MCP, nettoyage cron/subagent,
    recherche web OpenAI, et OpenWebUI
  - `full` : morceaux de chemin de publication Docker avec OpenWebUI
  - `custom` : sélection exacte `docker_lanes` pour une réexécution ciblée
- Exécutez directement le workflow manuel `CI` lorsque vous avez uniquement besoin d'une couverture CI normale complète
  pour le candidat de publication. Les répartitions CI manuelles contournent la portée des modifications
  et forcent les partitions Node Linux, les partitions bundled-plugin, les contrats
  de canal, la compatibilité Node 22, `check`, `check-additional`, build smoke,
  vérifications de docs, compétences Python, Windows, macOS, Android, et les voies i18n
  de l'interface de contrôle.
  Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de publication. Il exerce
  le QA-lab via un récepteur OTLP/HTTP local et vérifie les noms des spans de trace exportés,
  les attributs bornés, et le masquage de contenu/identifiant sans
  nécessiter Opik, Langfuse, ou un autre collecteur externe.
- Exécutez `pnpm release:check` avant chaque version taguée
- Les vérifications de version s'exécutent désormais dans un workflow manuel distinct :
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également la porte de parité de simulation du QA Lab ainsi que le profil rapide
  live Matrix et le volet QA Telegram avant l'approbation de la version. Les volets
  live utilisent l'environnement `qa-live-shared` ; Telegram utilise également les baux d'informations d'identification
  Convex CI. Exécutez le workflow manuel `QA-Lab - All Lanes` avec
  `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet Matrix
  de transport, de médias et E2EE en parallèle.
- La validation de l'exécution de l'installation et de la mise à niveau multi-OS fait partie des versions publiques
  `OpenClaw Release Checks` et `Full Release Validation`, qui appellent
  le workflow réutilisable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directement
- Cette séparation est intentionnelle : garder le chemin de publication réel npm court,
  déterministe et axé sur les artefacts, tandis que les vérifications live plus lentes restent dans leur
  propre voie afin qu'elles ne bloquent ou n'interrompent pas la publication
- Les vérifications de version contenant des secrets doivent être envoyées via `Full Release
Validation` or from the `main`/release workflow ref afin que la logique du workflow et
  les secrets restent contrôlés
- `OpenClaw Release Checks` accepte une branche, un tag ou un SHA de commit complet tant
  que le commit résolu est accessible à partir d'une branche OpenClaw ou d'un tag de version
- La prévol validation-only `OpenClaw NPM Release` accepte également le SHA
  complet actuel de 40 caractères du commit de branche de workflow sans nécessiter de tag poussé
- Ce chemin SHA est réservé à la validation et ne peut être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour
  la vérification des métadonnées du package ; la publication réelle nécessite toujours un vrai tag de version
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners hébergés par GitHub,
  tandis que le chemin de validation non mutatif peut utiliser les runners
  Linux plus volumineux de Blacksmith
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La prévol de version npm n'attend plus le volet de vérifications de version distinct
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou le tag beta/correction correspondant) avant l'approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire frais
- Après une publication bêta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  pour vérifier l'onboarding du paquet installé, la configuration Telegram, et le E2E Telegram réel
  contre le paquet npm publié en utilisant le pool d'informations d'identification Telegram loué partagé.
  Les ponctions occasionnelles des mainteneurs locaux peuvent omettre les vars Convex et passer les trois
  informations d'identification d'environnement `OPENCLAW_QA_TELEGRAM_*` directement.
- Les mainteneurs peuvent exécuter la même vérification post-publication depuis GitHub Actions via le
  workflow manuel `NPM Telegram Beta E2E`. Il est intentionnellement uniquement manuel et
  ne s'exécute pas à chaque fusion.
- L'automatisation de publication des mainteneurs utilise désormais préflight-then-promote :
  - la vraie publication npm doit réussir un `preflight_run_id` npm réussi
  - la vraie publication npm doit être dispatchée depuis la même branche `main` ou
    `release/YYYY.M.D` que l'exécution préflight réussie
  - les publications npm stables sont par défaut `beta`
  - la publication npm stable peut cibler `latest` explicitement via l'entrée du workflow
  - la mutation de dist-tag npm basée sur des jetons réside désormais dans
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a toujours besoin de `NPM_TOKEN` alors que le
    dépôt public conserve une publication OIDC uniquement
  - le `macOS Release` public est uniquement pour validation
  - la vraie publication privée mac doit réussir le `preflight_run_id` privé mac réussi
    et `validate_run_id`
  - les vrais chemins de publication promeuvent les artefacts préparés au lieu de les reconstruire
    à nouveau
- Pour les publications de corrections stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` à `YYYY.M.D-N`
  afin que les corrections de publication ne puissent pas laisser silencieusement des installations globales plus anciennes sur
  la charge utile stable de base
- le préflight de publication npm échoue de manière fermée à moins que l'archive n'inclue à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus un tableau de bord navigateur vide
- La vérification après publication vérifie également que l'installation du registre publié
  contient des dépendances d'exécution de plugin groupées non vides sous la racine `dist/*`
  layout. Une version qui expédie des charges utiles de dépendances de plugin groupées manquantes ou vides échoue au vérificateur postpublish et ne peut être promue
  vers `latest`.
- `pnpm test:install:smoke` applique également le budget npm pack `unpackedSize` sur
  l'archive tarball de la mise à jour candidate, de sorte que l'installateur e2e détecte le gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de la version a touché la planification CI, les manifestes de synchronisation des extensions, ou
  les matrices de test d'extension, régénérez et examinez les sorties de matrice de workflow
  `checks-node-extensions` détenues par le planificateur à partir de `.github/workflows/ci.yml`
  avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS comprend également les surfaces de mise à jour :
  - la version GitHub doit se retrouver avec le `.zip` packagé, `.dmg`, et `.dSYM.zip`
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication
  - l'application packagée doit conserver un identifiant de bundle non-debug, une URL de flux Sparkle non vide
    et un `CFBundleVersion` à ou au-dessus du plancher de build Sparkle canonique
    pour cette version

## Release test boxes

`Full Release Validation` est la manière dont les opérateurs lancent tous les tests de pré-publication depuis
un point d'entrée unique. Exécutez-le à partir de la référence de workflow `main` de confiance et passez la branche de
version, le tag ou le SHA de commit complet en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both
```

Le workflow résout la référence cible, envoie manuellement `CI` avec
`target_ref=<release-ref>`, envoie `OpenClaw Release Checks`, et
envoie éventuellement des tests de bout en bout (E2E) autonomes après publication Telegram lorsque
`npm_telegram_package_spec` est défini. `OpenClaw Release Checks` déploie ensuite
les tests de fumée d'installation, les vérifications de publication multi-OS, la couverture du chemin de publication Docker en direct/E2E,
l'acceptation des paquets avec les tests de qualité des paquets Telegram, la parité du Lab QA, les tests en direct Matrix, et
les tests en direct Telegram. Une exécution complète n'est acceptable que lorsque le résumé `Full Release Validation`
indique `normal_ci` et `release_checks` comme réussis, et que tout enfant `npm_telegram`
optionnel est soit réussi, soit intentionnellement ignoré.
Les workflows enfants sont envoyés depuis la référence de confiance qui exécute `Full Release
Validation`, normally `--ref main`, even when the target `ref` pointe vers une
branche ou une balise de publication plus ancienne. Il n'y a pas d'entrée de référence de workflow (workflow-ref) distincte pour la Validation Complète de Publication ; choisissez le harnais de confiance en choisissant la référence d'exécution du workflow.

Utilisez ces variantes en fonction de l'étape de publication :

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both

# Validate an exact pushed commit.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=<40-char-sha> \
  -f provider=openai \
  -f mode=both

# After publishing a beta, add published-package Telegram E2E.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

N'utilisez pas l'ensemble complet comme première réexécution après une correction ciblée. Si une boîte échoue,
utilisez le workflow enfant, le travail, la voie Docker, le profil de paquet, le fournisseur de modèle,
ou la voie QA ayant échoué pour la preuve suivante. Réexécutez l'ensemble complet uniquement lorsque
la correction a modifié l'orchestration de publication partagée ou a rendu les preuves de toutes les boîtes obsolètes.
Le vérificateur final de l'ensemble revérifie les identifiants d'exécution du workflow enfant enregistrés,
donc après la réexécution réussie d'un workflow enfant, réexécutez uniquement le travail parent `Verify full validation` ayant échoué.

### Vitest

La boîte Vitest est le workflow enfant `CI` manuel. L'CI manuelle contourne intentionnellement
la portée des modifications et force le graphe de tests normal pour le candidat à la publication :
shards Node Linux, shards de plugins groupés, contrats de canal, compatibilité Node 22,
`check`, `check-additional`, tests de fumée de construction, vérifications de documentation,
compétences Python, Windows, macOS, Android et i18n de l'interface de contrôle.

Utilisez cette boîte pour répondre à « l'arborescence source a-t-elle passé la suite de tests normale complète ? »
Ce n'est pas la même chose que la validation du produit du chemin de publication. Preuves à conserver :

- `Full Release Validation` résumé affichant l'URL de l'exécution `CI` envoyée
- exécution `CI` réussie sur le SHA cible exact
- noms de partitions échouées ou lentes provenant des tâches CI lors de l'enquête sur les régressions
- artefacts de chronométrage Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une
  exécution nécessite une analyse des performances

Exécuter le CI manuel directement uniquement lorsque la version nécessite un CI normal déterministe mais
pas les boîtes Docker, QA Lab, en direct, multi-OS ou de package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

La boîte Docker se trouve dans `OpenClaw Release Checks` via
`openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow de
mode de version `install-smoke`. Il valide le candidat à la publication via des environnements
Docker empaquetés au lieu de tests uniquement au niveau source.

La couverture de version Docker inclut :

- test de fumée d'installation complète avec le test de fumée d'installation globale lent de Bun activé
- voies de test E2E du référentiel
- morceaux Docker du chemin de version : `core`, `package-update`, `plugins-runtime` et
  `bundled-channels`
- couverture OpenWebUI dans le morceau `plugins-runtime` lors de la demande
- voies de dépendance de canal groupé divisées dans leur propre morceau `bundled-channels`
  au lieu de la voie série tout-en-un groupée par canal
- voies d'installation/désinstallation de plugin groupé divisées
  `bundled-plugin-install-uninstall-0` via
  `bundled-plugin-install-uninstall-7`
- suites de fournisseur en direct/E2E et couverture de modèle en direct Docker lorsque les vérifications de version
  incluent des suites en direct

Utilisez les artefacts Docker avant de réexécuter. Le planificateur du chemin de version télécharge
`.artifacts/docker-tests/` avec les journaux de voie, `summary.json`, `failures.json`,
les durées de phase, le plan de planificateur JSON et les commandes de réexécution. Pour une récupération ciblée,
utilisez `docker_lanes=<lane[,lane]>` sur le workflow réutilisable en direct/E2E au lieu de
réexécuter tous les morceaux de version. Les commandes de réexécution générées incluent les entrées `package_artifact_run_id`
précédentes et les entrées d'image Docker préparées lorsqu'elles sont disponibles, afin qu'une
voie échouée puisse réutiliser la même archive et les mêmes images GHCR.

### QA Lab

La boîte QA Lab fait également partie de `OpenClaw Release Checks`. Il s'agit de la barrière de publication
au niveau du comportement agentique et du canal, distincte de la mécanique de package Vitest et Docker.

La couverture du QA Lab de release inclut :

- porte de parité mock comparant la voie candidate OpenAI à la ligne de base Opus 4.6
  en utilisant le pack de parité agentic
- profil QA rapide en direct Matrix utilisant l'environnement `qa-live-shared`
- voie QA en direct Telegram utilisant les baux d'informations d'identification Convex CI
- `pnpm qa:otel:smoke` lorsque la télémétrie de release nécessite une preuve locale explicite

Utilisez cette boîte pour répondre « est-ce que la release se comporte correctement dans les scénarios QA et
les flux de channel en direct ? ». Conservez les URLs des artefacts pour les voies de parité, Matrix et Telegram
lors de l'approbation de la release. Une couverture complète Matrix reste disponible en tant que
manuel QA-Lab fragmenté plutôt que la voie critique de release par défaut.

### Paquet

La boîte Paquet est la porte du produit installable. Elle est soutenue par
`Package Acceptance` et le résolveur
`scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un
candidat dans l'archive `package-under-test` consommée par Docker E2E, valide
l'inventaire du paquet, enregistre la version du paquet et le SHA-256, et conserve la
référence du harnais de workflow séparée de la référence source du paquet.

Sources candidates prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de release OpenClaw exacte
- `source=ref` : empaqueter une branche `package_ref` de confiance, une balise ou un SHA de commit complet
  avec le harnais `workflow_ref` sélectionné
- `source=url` : télécharger un `.tgz` HTTPS avec les `package_sha256` requises
- `source=artifact` : réutiliser un `.tgz` téléversé par une autre exécution GitHub Actions

`OpenClaw Release Checks` exécute l'acceptation des paquets avec `source=ref`,
`package_ref=<release-ref>`, `suite_profile=custom`,
`docker_lanes=bundled-channel-deps-compat plugins-offline` et
`telegram_mode=mock-openai`. Les blocs Docker du chemin de publication (release-path) couvrent les voies d'installation, de mise à jour et de mise à jour des plugins qui se chevauchent ; l'acceptation des paquets maintient la compatibilité des canaux groupés natifs aux artefacts, les appareils de plugins hors ligne et la QA des paquets Docker par rapport au même tarball résolu. C'est le remplacement natif Telegram pour la plupart de la couverture de paquet/mise à jour qui nécessitait auparavant Parallels. Les vérifications de publication multi-OS sont toujours importantes pour l'intégration (%PH:GLOSSARY:??%) spécifique à l'OS, l'installateur et le comportement de la plateforme, mais la validation produit de paquet/mise à jour devrait préférer l'acceptation des paquets.

La clémence héritée de l'acceptation des paquets est volontairement limitée dans le temps. Les paquets jusqu'à `2026.4.25` peuvent utiliser le chemin de compatibilité pour les écarts de métadonnées déjà publiés sur npm : entrées d'inventaire QA privées manquantes dans le tarball, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans l'appareil git dérivé du tarball, `update.channel` persistant manquant, anciens emplacements d'enregistrements d'installation de plugins, persistance manquante des enregistrements d'installation du marketplace et migration des métadonnées de configuration pendant `plugins update`. Les paquets après `2026.4.25` doivent satisfaire les contrats de paquets modernes ; ces mêmes écarts font échouer la validation de la publication.

Utilisez des profils d'acceptation de paquets plus larges lorsque la question de publication concerne un paquet installable réel :

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product
```

Profils de paquets courants :

- `smoke` : voies rapides d'installation de paquet/canal/agent, de réseau passerelle et de
  rechargement de configuration
- `package` : contrats de paquets d'installation/mise à jour/plugin sans ClawHub en direct ; c'est la valeur par défaut
  du vérificateur de publication (release-check)
- `product` : `package` plus les canaux MCP, le nettoyage cron/sous-agent, la recherche web OpenAI
  et OpenWebUI
- `full` : blocs du chemin de publication (release-path) Docker avec OpenWebUI
- `custom` : liste exacte de `docker_lanes` pour les réexécutions ciblées

Pour la preuve Telegram des candidats de paquet, activez `telegram_mode=mock-openai` ou
`telegram_mode=live-frontier` dans l'acceptation de paquet (Package Acceptance). Le workflow passe
l'archive tar `package-under-test` résolue dans la voie Telegram ; le workflow
autonome Telegram accepte toujours une spec Telegram publiée pour les vérifications post-publication.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, il peut également s'agir du SHA
  de commit complet de 40 caractères de la branche de workflow actuel pour une prévolite de validation uniquement
- `preflight_only` : `true` pour la validation/build/paquet uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel afin que le workflow réutilise
  l'archive tar préparée à partir de l'exécution de prévolite réussie
- `npm_dist_tag` : tag cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : branche, tag ou SHA de commit complet à valider. Les vérifications contenant des secrets
  nécessitent que le commit résolu soit accessible depuis une branche OpenClaw ou
  un tag de version.

Règles :

- Les tags stables et de correction peuvent être publiés soit sur `beta` soit sur `latest`
- Les tags de préversion bêta ne peuvent être publiés que sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée du SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours
  en validation uniquement
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors de la prévolite ;
  le workflow vérifie que les métadonnées avant publication continuent

## Séquence de version stable npm

Lors de la création d'une version stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise n'existe, vous pouvez utiliser le SHA de commit complet de la branche de workflow actuelle pour une exécution à blanc de validation uniquement du workflow préliminaire
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement lorsque vous voulez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de version, la balise de version ou le SHA de commit complet lorsque vous voulez une CI normale plus le cache de prompt en direct, Docker, QA Lab, Matrix et la couverture Telegram à partir d'un workflow manuel
4. Si vous avez intentionnellement uniquement besoin du graphe de test normal déterministe, exécutez le workflow manuel `CI` sur la référence de version à la place
5. Enregistrez le `preflight_run_id` réussi
6. Exécutez `OpenClaw NPM Release` à nouveau avec `preflight_only=false`, le même `tag`, le même `npm_dist_tag`, et le `preflight_run_id` enregistré
7. Si la version a atterri sur `beta`, utilisez le workflow privé `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` pour promouvoir cette version stable de `beta` vers `latest`
8. Si la version a été intentionnellement publiée directement sur `latest` et que `beta` doit suivre immédiatement la même version stable, utilisez ce même workflow privé pour pointer les deux balises de distribution vers la version stable, ou laissez sa synchronisation d'auto-réparation programmée déplacer `beta` plus tard

La mutation de la balise de distribution réside dans le référentiel privé pour des raisons de sécurité car elle nécessite encore `NPM_TOKEN`, tandis que le référentiel public conserve la publication OIDC uniquement.

Cela permet de garder le chemin de publication direct et le chemin de promotion bêta en premier tous deux documentés et visibles par l'opérateur.

Si un mainteneur doit revenir à l'authentification npm locale, exécutez les commandes CLI (`op`) de 1Password uniquement à l'intérieur d'une session tmux dédiée. N'appelez pas `op` directement depuis le shell de l'agent principal ; le garder à l'intérieur de tmux rend les invites, les alertes et la gestion OTP observables et empêche les alertes d'hôte répétées.

## Références publiques

- [`.github/workflows/full-release-validation.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/full-release-validation.yml)
- [`.github/workflows/package-acceptance.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/package-acceptance.yml)
- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`.github/workflows/openclaw-release-checks.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-release-checks.yml)
- [`.github/workflows/openclaw-cross-os-release-checks-reusable.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-cross-os-release-checks-reusable.yml)
- [`scripts/resolve-openclaw-package-candidate.mjs`](https://github.com/openclaw/openclaw/blob/main/scripts/resolve-openclaw-package-candidate.mjs)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

Les responsables utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le manuel de procédures réel.

## Connexes

- [Canaux de publication](/fr/install/development-channels)

---
summary: "Release lanes, operator checklist, validation boxes, version naming, and cadence"
title: "Politique de publication"
read_when:
  - Looking for public release channel definitions
  - Running release validation or package acceptance
  - Looking for version naming and cadence
---

OpenClaw dispose de trois canaux de publication publics :

- stable : versions étiquetées publiées sur npm npm `beta` par défaut, ou sur npm npm `latest` si demandé explicitement
- beta : étiquettes de prépublication publiées sur npm npm `beta`
- dev : la tête mobile de `main`

## Nommage des versions

- Version de publication stable : `YYYY.M.D`
  - Étiquette Git : `vYYYY.M.D`
- Version de correction stable : `YYYY.M.D-N`
  - Étiquette Git : `vYYYY.M.D-N`
- Version de prépublication bêta : `YYYY.M.D-beta.N`
  - Étiquette Git : `vYYYY.M.D-beta.N`
- Ne pas compléter le mois ou le jour avec des zéros
- `latest`npm désigne la publication stable npm actuellement promue
- `beta` désigne la cible d'installation bêta actuelle
- Les versions stables et les corrections stables sont publiées sur npm npm `beta` par défaut ; les opérateurs de publication peuvent cibler `latest` explicitement, ou promouvoir ultérieurement une build bêta vérifiée
- Chaque publication stable de OpenClaw livre le paquet npm et l'application macOS ensemble ;
  les publications bêta valident et publient généralement d'abord le chemin npm/paquet, avec
  la construction/signature/notarisation de l'application mac réservée aux versions stables sauf demande explicite

## Cadence de publication

- Les publications se font d'abord en bêta
- La version stable ne suit qu'après validation de la dernière bêta
- Les mainteneurs créent généralement les versions à partir d'une branche `release/YYYY.M.D` créée
  à partir du `main` actuel, afin que la validation et les correctifs de version ne bloquent pas le
  nouveau développement sur `main`
- Si une étiquette bêta a été poussée ou publiée et nécessite une correction, les mainteneurs créent
  l'étiquette `-beta.N` suivante au lieu de supprimer ou recréer l'ancienne étiquette bêta
- La procédure détaillée de publication, les approbations, les identifiants et les notes de récupération sont
  réservés aux mainteneurs

## Liste de contrôle pour l'opérateur de publication

Cette liste de contrôle constitue la forme publique du flux de publication. Les informations d'identification privées, la signature, la notarisation, la récupération des dist-tags et les détails de retour en urgence demeurent dans le manuel de publication réservé aux mainteneurs.

1. Commencer à partir du `main` actuel : tirer les dernières modifications, confirmer que le commit cible est poussé,
   et confirmer que la CI actuelle du `main` est suffisamment verte pour créer une branche à partir de celle-ci.
2. Générer la section `CHANGELOG.md` supérieure à partir des PR fusionnés et de tous les commits directs depuis la dernière balise de version accessible. Conserver les entrées orientées utilisateur, dédupliquer les entrées PR/commit direct qui se chevauchent, valider la réécriture, la pousser, et effectuer un rebase/pull une fois de plus avant de créer une branche.
3. Examiner les enregistrements de compatibilité des versions dans `src/plugins/compat/registry.ts` et `src/commands/doctor/shared/deprecation-compat.ts`. Supprimer la compatibilité expirée uniquement lorsque le chemin de mise à niveau reste couvert, ou enregistrer la raison pour laquelle elle est intentionnellement conservée.
4. Créer `release/YYYY.M.D` à partir du `main` actuel ; ne pas effectuer le travail de version normal directement sur `main`.
5. Incrémenter chaque emplacement de version requis pour la balise prévue, puis exécuter `pnpm release:prep`. Il actualise les versions des plugins, l'inventaire des plugins, le schéma de configuration, les métadonnées de configuration de canal groupées, la ligne de base de la documentation de configuration, les exportations du SDK de plugin et la ligne de base de l'API du SDK de plugin dans le bon ordre. Valider toute dérive générée avant le balisage. Ensuite, exécuter la pré-vérification déterministe locale : `pnpm check:test-types`, `pnpm check:architecture`, `pnpm build && pnpm ui:build` et `pnpm release:check`.
6. Exécuter `OpenClaw NPM Release` avec `preflight_only=true`. Avant qu'une balise n'existe, un SHA complet de 40 caractères de la branche de version est autorisé pour la pré-vérification de validation uniquement. La pré-vérification génère des preuves de version des dépendances pour le graphe de dépendances exact extrait et les stocke dans l'artefact de pré-vérification npm. Enregistrer le `preflight_run_id` réussi.
7. Lancer tous les tests de pré-version avec `Full Release Validation` pour la branche de version, la balise ou le SHA de commit complet. C'est le seul point d'entrée manuel pour les quatre grandes boîtes de test de version : Vitest, Docker, QA Lab et Package.
8. Si la validation échoue, corrigez sur la branche de publication et relancez le plus petit fichier, lane, tâche de workflow, profil de package, fournisseur, ou liste d'autorisation de modèle ayant échoué et prouvant la correction. Relancez le parapluie complet uniquement lorsque la surface modifiée rend les preuves précédentes obsolètes.
9. Pour la version bêta, créez un tag `vYYYY.M.D-beta.N`, puis exécutez `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `npmTelegramnpmClawHubrelease/YYYY.M.D` branche. L'assistant exécute
   les vérifications locales de version générée, envoie ou vérifie la validation complète de la version
   et les preuves de prévol npm, exécute les preuves de package Parallels et Telegram,
   enregistre les plans de plugin npm et ClawHub, et imprime la commande exacte
   `OpenClaw Release Publish` uniquement une fois que le bundle de preuves est vert.
   `OpenClaw Release Publish`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub envoie les packages de plugin sélectionnés ou pouvant être tous publiés
   vers npm et le même ensemble vers ClawHub en parallèle, puis promeut l'artefact
   de prévol npm OpenClaw préparé avec le dist-tag correspondant dès que la
   publication du plugin npm réussit.
   Une fois que la tâche enfant de publication npm OpenClaw réussit, il crée ou met à jour la
   page de version/préversion GitHub correspondante à partir de la section
   `CHANGELOG.md`npm correspondante complète. Les versions stables publiées sur npm `latest`GitHubnpm deviennent la
   dernière version GitHub ; les versions de maintenance stables conservées sur npm `beta`GitHub sont
   créées avec GitHub `latest=false`GitHub. Le workflow télécharge également les preuves de dépendances de prévol
   vers la version GitHub en tant que
   `openclaw-<version>-dependency-evidence.zip`GitHubOpenClawnpmClawHubOpenClawnpm pour la gestion des incidents
   après publication. Le workflow de publication imprime immédiatement les ID d'exécution enfants, approuve automatiquement
   les portes d'environnement de release que le jeton de workflow est autorisé à approuver, résume
   les tâches enfants échouées avec les fins de journaux, clôture la version GitHub et les preuves de dépendances
   dès que la publication npm OpenClaw réussit, attend ClawHub chaque fois que
   npm OpenClaw est en cours de publication, puis exécute `pnpm release:verify-beta`GitHubnpmnpmClawHubTelegramClawHubCLI et
   télécharge les preuves de post-publication pour la version GitHub, le package npm, les packages
   de plugin npm sélectionnés, les packages ClawHub sélectionnés, les ID d'exécution de workflow enfants, et
   l'ID d'exécution Telegram NPM facultatif. Le chemin ClawHub réessaie les échecs d'installation
   de dépendances CLI transitoires, publie les plugins réussissant la prévisualisation même si une
   cellule de prévisualisation échoue, et se termine par une vérification du registre pour chaque version
   de plugin attendue afin que les publications partielles restent visibles et réessayables. Ensuite, exécutez l'acceptation du package post-publication
   sur le package
   `openclaw@YYYY.M.D-beta.N` ou
   `openclaw@beta` publié. Si une préversion poussée ou publiée nécessite une correction,
   coupez le numéro de préversion correspondant suivant ; ne supprimez pas ou ne réécrivez pas l'ancienne
   préversion.
10. Pour stable, continuer uniquement une fois que la bêta vérifiée ou la version candidate dispose des
    preuves de validation requises. La publication npm stable passe également par
    npm`OpenClaw Release Publish`, en réutilisant l'artefact de prévol réussi via
    `preflight_run_id`macOS%%; la disponibilité de la version stable macOS nécessite également le
    `.zip` conditionné, `.dmg`, `.dSYM.zip`, et la `appcast.xml` mise à jour sur
    `main`macOS.
    Le workflow de publication macOS publie l'appcast signée vers le `main` public
    automatiquement après vérification des assets de version ; si la protection de branche bloque le
    push direct, il ouvre ou met à jour une PR d'appcast.
11. Après publication, exécutez le vérificateur post-publication npm, le npm E2E autonome publié-Telegram optionnel lorsque vous avez besoin d'une preuve de canal post-publication,
    la promotion des balises de distribution (dist-tag) si nécessaire, vérifiez la page de publication générée GitHub,
    et exécutez les étapes d'annonce de publication.

## Prévol de release

- Exécutez `pnpm check:test-types` avant la prépublication de version afin que la couverture du test TypeScript reste
  assurée en dehors de la porte de validation locale plus rapide `pnpm check`
- Exécutez `pnpm check:architecture` avant la prépublication de version afin que les contrôles plus larges du
  cycle d'importation et des limites de l'architecture soient au vert en dehors de la porte locale plus rapide
- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les
  artefacts de publication `dist/*` attendus et le bundle Control UI existent pour l'étape de
  validation du paquet
- Exécutez `pnpm release:prep` après l'incrément de version racine et avant le balisage. Il
  exécute chaque générateur de publication déterministe qui dérive généralement après un
  changement de version/config/API : versions des plugins, inventaire des plugins, schéma de configuration de base,
  métadonnées de configuration de canal regroupées, base de référence de la documentation de configuration, exportations du SDK de plugin
  et base de référence de API du SDK de plugin. `pnpm release:check` réexécute ces
  gardes en mode vérification et signale chaque échec de dérive généré qu'il trouve en une
  seule passe avant d'exécuter les vérifications de publication de paquet.
- La synchronisation des versions de plug-ins met à jour les versions des packages de plug-ins officiels et les planchers `openclaw.compat.pluginApi`OpenClaw existants
  vers la version de publication OpenClaw par
  défaut. Considérez ce champ comme le plancher du SDK/d'exécution APIOpenClaw du plug-in, et non comme une simple copie
  de la version du package : pour les publications de plug-in uniquement qui restent intentionnellement
  compatibles avec les hôtes OpenClaw plus anciens, gardez le plancher à l'API de l'hôte la plus ancienne prise en charge
  et documentez ce choix dans la preuve de publication du plug-in.
- Exécutez le workflow manuel `Full Release Validation` avant l'approbation de la version pour
  lancer toutes les boîtes de test pré-version à partir d'un point d'entrée unique. Il accepte une branche,
  un tag ou un SHA de commit complet, dispatche le manuel `CI`, et dispatche
  `OpenClaw Release Checks` pour les tests de fumée d'installation, l'acceptation des paquets, les vérifications
  de paquets multi-OS, la parité du QA Lab, les voies Matrix et Telegram. Les exécutions stables/défaut
  gardent les tests exhaustifs live/E2E et le soak de chemin de version Docker derrière
  `run_release_soak=true` ; `release_profile=full` force l'activation du soak. Avec
  `release_profile=full` et `rerun_group=all`, il exécute également le paquet Telegram
  E2E contre l'artefact `release-package-under-test` provenant des vérifications de version.
  Fournissez `release_package_spec` après la publication d'une bêta pour réutiliser le paquet
  npm expédié à travers les vérifications de version, l'Acceptation des Paquets, et le paquet Telegram
  E2E sans reconstruire l'archive de version. Fournissez
  `npm_telegram_package_spec` uniquement lorsque Telegram doit utiliser un paquet
  publié différent du reste de la validation de version. Fournissez
  `package_acceptance_package_spec` lorsque l'Acceptation des Paquets doit utiliser un
  paquet publié différent des spécifications du paquet de version. Fournissez
  `evidence_package_spec` lorsque le rapport de preuve de version doit prouver que la
  validation correspond à un paquet npm publié sans forcer Telegram E2E.
  Exemple :
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par canal parallèle
  pour un candidat de paquet pendant que le travail de publication se poursuit. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/étiquette/SHA `package_ref` de confiance avec le
  harnais `workflow_ref` actuel ; `source=url` pour une archive tar HTTPS publique avec une
  SHA-256 requise et une stricte politique d'URL publique ; `source=trusted-url` pour une
  stratégie nommée de source de confiance utilisant `trusted_source_id` requis et SHA-256 ; ou
  `source=artifact`GitHub pour une archive tar téléchargée par une autre exécution GitHub Actions. Le
  workflow résout le candidat en
  `package-under-test`DockerTelegram, réutilise le planificateur de publication E2E Docker contre cette
  archive, et peut exécuter la QA Telegram contre la même archive avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`Docker. Lorsque les
  voies Docker sélectionnées incluent `published-upgrade-survivor`, l'artefact
  du paquet est le candidat et `published_upgrade_survivor_baseline` sélectionne
  la ligne de base publiée. `update-restart-auth`CLI utilise le paquet candidat à la fois
  comme le CLI installé et comme le paquet-testé, exerçant ainsi le chemin de redémarrage géré de la commande de mise à jour du candidat.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : voies install/channel/agent, réseau de passerelle et rechargement de configuration
  - `package`ClawHub : voies package/update/restart/plugin natives d'artefact sans OpenWebUI ou ClawHub en direct
  - `product`OpenAI : profil de paquet plus canaux MCP, nettoyage cron/subagent,
    recherche web OpenAI et OpenWebUI
  - `full`Docker : segments de chemin de publication Docker avec OpenWebUI
  - `custom` : sélection `docker_lanes` exacte pour une réexécution ciblée
- Exécutez le workflow manuel `CI`Linux directement lorsque vous avez uniquement besoin d'une couverture CI normale complète pour le candidat à la publication. Les répartitions manuelles du CI contournent la portée des modifications et forcent les shards Linux Node, les shards bundled-plugin, les shards de contrat de plugin et de channel, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS, Android, et les voies i18n de l'interface de contrôle. Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de publication. Il exerce le QA-lab via un récepteur OTLP/HTTP local et vérifie l'exportation des traces, des métriques et des journaux, ainsi que les attributs de traces limités et la rédaction du contenu/identifiant, sans nécessiter Opik, Langfuse ou un autre collecteur externe.
- Exécutez `pnpm qa:otel:collector-smoke` lors de la validation de la compatibilité du collecteur. Il achemine le même export OTLP du QA-lab via un conteneur Docker réel du collecteur OpenTelemetry avant les assertions du récepteur local.
- Exécutez `pnpm qa:prometheus:smoke` lors de la validation du scraping Prometheus protégé. Il exerce le QA-lab, rejette les scrapings non authentifiés et vérifie que les familles de métriques critiques pour la publication restent exemptes de contenu de prompt, d'identifiants bruts, de jetons d'authentification et de chemins locaux.
- Exécutez `pnpm qa:observability:smoke` lorsque vous souhaitez que les voies de test de fumée OpenTelemetry et Prometheus du source-checkout se suivent.
- Exécutez `pnpm release:check` avant chaque publication taguée
- La préversion `OpenClaw NPM Release` génère des preuves de publication des dépendances avant de compresser l'archive npm. La barrière de vulnérabilité des avis npm est bloquante pour la publication. Le risque de manifeste transitif, la surface de propriété/installation des dépendances et les rapports de modification des dépendances ne sont que des preuves de publication. Le rapport de modification des dépendances compare le candidat à la publication avec le tag de publication précédent accessible.
- La prévol télécharge les preuves de dépendances sous `openclaw-release-dependency-evidence-<tag>` et les intègre également sous `dependency-evidence/` à l'intérieur de l'artefact de prévol npm préparé. Le vrai chemin de publication réutilise cet artefact de prévol, puis attache les mêmes preuves à la publication GitHub sous la forme `openclaw-<version>-dependency-evidence.zip`.
- Exécutez `OpenClaw Release Publish` pour la séquence de publication modifiable après l'existence de l'étiquette. Déclenchez-le depuis `release/YYYY.M.D` (ou `main` lors de la publication d'une étiquette accessible depuis main), passez l'étiquette de version et l'OpenClaw npm `preflight_run_id` réussi, et gardez la portée de publication de plugin par défaut `all-publishable` sauf si vous exécutez délibérément une réparation ciblée. Le workflow sérialise la publication npm du plugin, la publication du plugin ClawHub et la publication OpenClaw npm afin que le package principal ne soit pas publié avant ses plugins externalisés.
- Les vérifications de version s'exécutent désormais dans un workflow manuel séparé :
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également la voie de parité simulée du QA Lab ainsi que le profil Matrix rapide et la voie QA Telegram avant l'approbation de la version. Les voies en direct utilisent l'environnement `qa-live-shared` ; Telegram utilise également des baux d'identifiants CI Convex. Exécutez le workflow manuel `QA-Lab - All Lanes` avec `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet du transport, des médias et de l'E2EE Matrix en parallèle.
- La validation de l'exécution de l'installation et de la mise à niveau multi-OS fait partie des `OpenClaw Release Checks` et `Full Release Validation` publics, qui appellent directement le workflow réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- Cette scission est intentionnelle : gardez le vrai chemin de publication npm court, déterministe et axé sur les artefacts, tandis que les vérifications en direct plus lentes restent dans leur propre voie afin qu'elles ne bloquent ou n'interrompent pas la publication
- Les vérifications de version portant des secrets doivent être envoyées via la référence de workflow `Full Release
Validation` or from the `main`/release afin que la logique du workflow et
  les secrets restent contrôlés
- `OpenClaw Release Checks` accepte une branche, une balise ou un SHA de commit complet tant
  que le commit résolu est accessible depuis une branche OpenClaw ou une balise de version
- La pré-vérification de validation uniquement `OpenClaw NPM Release` accepte également le
  SHA de commit complet de 40 caractères actuel de la branche de workflow sans nécessiter de balise poussée
- Ce chemin SHA est réservé à la validation uniquement et ne peut pas être promu en une vraie publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la
  vérification des métadonnées du package ; la vraie publication nécessite toujours une vraie balise de version
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners
  hébergés par GitHub, tandis que le chemin de validation non mutante peut utiliser les plus grands
  runners Linux Linux
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La pré-vérification de version npm n'attend plus la voie de vérification de version séparée
- Avant de baliser localement un candidat à la version, exécutez
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. L'assistant
  exécute les garde-fous de version rapide, les vérifications de version de plugin npm/ClawHub, la compilation,
  la compilation de l'interface utilisateur et `release:openclaw:npm:check` dans l'ordre qui détecte les erreurs
  bloquant l'approbation courantes avant le début du workflow de publication GitHub.
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise bêta/correction correspondante) avant l'approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire frais
- Après une publication bêta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`TelegramTelegramnpmTelegram
  pour vérifier l'onboarding des packages installés, la configuration Telegram, et le E2E Telegram réel
  par rapport au package npm publié en utilisant le pool partagé de crédential Telegram louées.
  Les ponctuels de mainteneur locaux peuvent omettre les vars Convex et passer directement les trois
  crédentiales d'environnement `OPENCLAW_QA_TELEGRAM_*`.
- Pour exécuter le test complet post-publication bêta depuis une machine de mainteneur, utilisez `pnpm release:beta-smoke -- --beta betaN`npm. L'assistant exécute la validation de mise à jour/cible fraîche npm Parallels, envoie `NPM Telegram Beta E2E`Telegram, interroge l'exécution exacte du workflow, télécharge l'artefact et imprime le rapport Telegram.
- Les mainteneurs peuvent exécuter la même vérification post-publication depuis GitHub Actions via le
  workflow manuel GitHub`NPM Telegram Beta E2E`. Il est intentionnellement uniquement manuel et
  ne s'exécute pas à chaque fusion.
- L'automatisation de publication du mainteneur utilise maintenant preflight-then-promote :
  - la publication npm réelle doit réussir un npmnpm`preflight_run_id` npm réussi
  - la publication npm réelle doit être envoyée depuis la même branche npm`main` ou
    `release/YYYY.M.D` que l'exécution réussie du prévol
  - les versions stables npm sont par défaut npm`beta`
  - la publication stable npm peut cibler npm`latest` explicitement via l'entrée du workflow
  - la mutation de dist-tag npm basée sur des jetons réside maintenant dans
    npm`openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` car
    `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que le repo source conserve
    la publication uniquement OIDC
  - le `macOS Release` public est uniquement validation ; lorsqu'une balise ne réside que sur une
    branche de sortie mais que le workflow est envoyé depuis `main`, définissez
    `public_release_branch=release/YYYY.M.D`
  - la publication macOS réelle doit réussir le macOSmacOS`preflight_run_id` macOS et
    `validate_run_id` réussis
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les versions de correction stables comme `YYYY.M.D-N`, le vérificateur post-publication vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N` afin que les corrections de version ne puissent pas laisser silencieusement des installations globales plus anciennes sur la charge utile stable de base
- La prépublication de version npm échoue en mode fermé à moins que l'archive ne contienne à la fois `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide afin que nous ne livrions plus un tableau de bord navigateur vide
- La vérification post-publication vérifie également que les points d'entrée des plugins publiés et les métadonnées des packages sont présents dans la disposition du registre installé. Une version qui livre des charges utiles d'exécution de plugin manquantes échoue le vérificateur de post-publication et ne peut pas être promue vers `latest`.
- `pnpm test:install:smoke` applique également le budget `unpackedSize` du pack npm sur l'archive de mise à jour candidate, afin que l'installer e2e détecte le gonflement accidentel du pack avant le chemin de publication de la version
- Si le travail de publication a touché la planification CI, les manifestes de synchronisation des extensions ou les matrices de test des extensions, régénérez et examinez les sorties de matrice `plugin-prerelease-extension-shard` détenues par le planificateur à partir de `.github/workflows/plugin-prerelease.yml` avant approbation afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la version GitHub doit aboutir avec `.zip`, `.dmg` et `.dSYM.zip` packagés
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après la publication ; le flux de travail de publication macOS le valide automatiquement, ou ouvre une PR d'appcast lorsque la poussée directe est bloquée
  - l'application packagée doit conserver un id de bundle non de débogage, une URL de flux Sparkle non vide et un `CFBundleVersion` à ou au-dessus du plancher de build Sparkle canonique pour cette version

## Boîtes de test de version

`Full Release Validation` est la méthode par laquelle les opérateurs lancent tous les tests de pré-version depuis
un point d'entrée unique. Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez
l'assistant pour que chaque workflow enfant s'exécute depuis une branche temporaire fixée sur le SHA
cible :

```bash
pnpm ci:full-release --sha <full-sha>
```

L'assistant pousse `release-ci/<sha>-...`, envoie `Full Release Validation`
depuis cette branche avec `ref=<sha>`, vérifie que chaque workflow enfant `headSha`
correspond à la cible, puis supprime la branche temporaire. Cela évite de valider par accident
une exécution enfant `main` plus récente.

Pour la validation d'une branche ou d'un tag de version, exécutez-le depuis la référence de workflow `main` de confiance
et passez la branche ou le tag de version en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

Le workflow résout la ref cible, distribue manuel `CI` avec
`target_ref=<release-ref>`, distribue `OpenClaw Release Checks`, prépare un
artefact parent `release-package-under-test` pour les vérifications orientées package, et
distribue le package autonome Telegram E2E lorsque `release_profile=full` avec
`rerun_group=all` ou lorsque `release_package_spec` ou
`npm_telegram_package_spec` est défini. `OpenClawDocker Release
Checks` répartit ensuite les tests de fumée d'installation, les vérifications de publication multi-OS, la couverture du chemin de publication Docker live/E2E lorsque le soak est activé, l'acceptation de package avec le package QA Telegram, la parité du QA Lab, Matrix en direct, et Telegram en direct. Une exécution complète n'est acceptable que lorsque le
résumé `Full Release Validation`
affiche `normal_ci` et `release_checks` comme réussis. En mode complet/tout,
l'enfant `npm_telegram` doit également être réussi ; en dehors du mode complet/tout, il est ignoré
sauf si un `release_package_spec` ou un `npm_telegram_package_spec` publié a été
fourni. Le résumé final du vérificateur comprend des tableaux des travaux les plus lents pour chaque exécution enfant, afin que le responsable de la publication puisse voir le chemin critique actuel sans télécharger les journaux.
Voir [Full release validation](/fr/reference/full-release-validation) pour la
matrice d'étapes complète, les noms exacts des travaux du workflow, les différences entre les profils stable et complet, les artefacts et les gestionnaires de réexécution ciblés.
Les workflows enfants sont distribués à partir de la ref de confiance qui exécute `Full Release
Validation`, normally `--ref main`, even when the target `ref` pointe vers une
branche ou un tag de version plus ancien. Il n'y a pas d'entrée séparée pour la réf de workflow Full Release Validation ; choisissez le harnais de confiance en choisissant la réf d'exécution du workflow.
N'utilisez pas `--ref main -f ref=<sha>` pour une preuve de commit exacte sur le `main` mobile ;
les SHA de commit bruts ne peuvent pas être des réfs de distribution de workflow, utilisez donc
`pnpm ci:full-release --sha <sha>` pour créer la branche temporaire épinglée.

Utilisez `release_profile` pour sélectionner l'étendue live/provider :

- `minimum`OpenAI : chemin le plus rapide critique pour la release OpenAI/core en direct et Docker
- `stable` : minimum plus une couverture stable des provider/backends pour l'approbation de la release
- `full` : stable plus une large couverture consultative des provider/médias

Utilisez `run_release_soak=true` avec `stable` lorsque les lanes bloquant la release sont
au vert et que vous souhaitez le balayage exhaustif live/E2E, du chemin de release Docker, et des packages publiés de mise à niveau survivants bornés avant la promotion. Ce balayage couvre
les quatre derniers packages stables plus les lignes de base épinglées `2026.4.23` et `2026.5.2`
plus la couverture des `2026.4.15` plus anciens, avec les lignes de base en double supprimées et
chaque ligne de base partitionnée dans son propre job de runner Docker. `full` implique
`run_release_soak=true`.

`OpenClaw Release Checks` utilise la ref de workflow de confiance pour résoudre la ref
cible une fois sous la forme `release-package-under-test` et réutilise cet artefact dans les vérifications multi-OS,
d'acceptation de package, et du chemin de release Docker lors des exécutions de trempage. Cela permet de garder
toutes les boxes orientées package sur les mêmes octets et d'éviter les builds de package répétés.
Une fois qu'une bêta est déjà sur npm, définissez `release_package_spec=openclaw@YYYY.M.D-beta.N`
pour que les vérifications de release téléchargent le package expédié une fois, extraient son SHA de source de build
à partir de `dist/build-info.json`, et réutilisent cet artefact pour les lanes multi-OS,
d'acceptation de package, du chemin de release Docker, et Telegram de package.
Le test de fumée d'installation OpenAI multi-OS utilise `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsque la
variable repo/org est définie, sinon `openai/gpt-5.4`, car cette lane vise à prouver
l'installation du package, l'onboarding, le démarrage de la passerelle et un tour d'agent en direct
plutôt que de benchmark le modèle par défaut le plus lent. La matrice de provider live plus large
reste l'endroit pour une couverture spécifique au modèle.

Utilisez ces variantes en fonction de l'étape de la release :

```bash
# Validate an unpublished release candidate branch.
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable

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
  -f release_profile=full \
  -f release_package_spec=openclaw@YYYY.M.D-beta.N \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

N'utilisez pas le processus complet (umbrella) comme première nouvelle exécution après une correction ciblée. Si une boîte échoue, utilisez le workflow enfant, le travail, le volet Docker, le profil de package, le fournisseur de modèle ou le volet QA ayant échoué pour la prochaine vérification. Relancez le processus complet uniquement lorsque la correction a modifié l'orchestration partagée de la publication ou rendu obsolètes les preuves antérieures de toutes les boîtes. Le vérificateur final du processus vérifie à nouveau les ID d'exécution du workflow enfant enregistrés, donc après qu'un workflow enfant a été relancé avec succès, relancez uniquement le travail parent `Verify full validation` ayant échoué.

Pour une récupération limitée, passez `rerun_group` au processus. `all` est l'exécution réelle de la version candidate, `ci` exécute uniquement l'enfant CI normal, `plugin-prerelease` exécute uniquement l'enfant du plugin de publication uniquement, `release-checks` exécute chaque boîte de publication, et les groupes de publication plus étroits sont `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` et `npm-telegram`. Les nouvelles exécutions ciblées de `npm-telegram` nécessitent `release_package_spec` ou `npm_telegram_package_spec` ; les exécutions complètes/toutes avec `release_profile=full` utilisent l'artefact du package release-checks. Les nouvelles exécutions ciblées multi-OS peuvent ajouter `cross_os_suite_filter=windows/packaged-upgrade` ou un autre filtre de OS/suite. Les échecs des vérifications de publication QA sont consultifs, à l'exception de la barrière de couverture des outils d'exécution standard, qui bloque la validation de la publication lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé de niveau standard.

### Vitest

La boîte Vitest est le workflow enfant manuel `CI`. Le CI manuel contourne intentionnellement le scope des modifications et force le graphe de tests normal pour le candidat à la publication : shards Node Linux, shards bundled-plugin, shards de contrat plugin et channel, compatibilité Node 22, `check-*`, `check-additional-*`, contrôles fumés des artefacts construits, contrôles de docs, compétences Python, Windows, macOS, Android, et i18n de l'interface de contrôle.

Utilisez cette boîte pour répondre à « l'arborescence source a-t-elle passé la suite de tests normale complète ? » Ce n'est pas la même chose que la validation produit du chemin de publication. Preuves à conserver :

- Résumé `Full Release Validation` montrant l'URL de l'exécution `CI` répartie
- Exécution `CI` réussie sur le SHA cible exact
- noms de shards échoués ou lents provenant des tâches CI lors de l'investigation des régressions
- Artefacts de minutage Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une exécution nécessite une analyse des performances

Exécutez le CI manuel directement uniquement lorsque la publication nécessite un CI normal déterministe mais non les boîtes Docker, QA Lab, live, cross-OS ou package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

La boîte Docker se trouve dans `OpenClaw Release Checks` via `openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow `install-smoke` en mode publication. Elle valide le candidat à la publication via des environnements Docker empaquetés au lieu de tests au niveau source uniquement.

La couverture Docker de publication inclut :

- test fumé d'installation complète avec le test fumé d'installation globale lente de Bun activé
- préparation/réutilisation de l'image de test fumé du Dockerfile racine par SHA cible, avec QR, root/gateway et les tâches de test fumé installer/Bun s'exécutant comme des shards install-smoke séparés
- voies E2E du dépôt
- release-path Docker chunks : Docker`core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g`, et `plugins-runtime-install-h`
- Couverture OpenWebUI dans le chunk `plugins-runtime-services` lorsque demandée
- voies d'installation/désinstallation de plugins groupés séparées
  `bundled-plugin-install-uninstall-0` à
  `bundled-plugin-install-uninstall-23`
- suites de provider live/E2E et couverture de modèle Docker live lorsque les vérifications de version
  incluent des suites live

Utilisez les artefacts Docker avant de relancer. Le planificateur release-path télécharge
Docker`.artifacts/docker-tests/` avec les journaux de voie, `summary.json`, `failures.json`,
les timings de phase, le plan du planificateur JSON et les commandes de relance. Pour une récupération ciblée,
utilisez `docker_lanes=<lane[,lane]>` sur le workflow live/E2E réutilisable au lieu de
relancer tous les chunks de version. Les commandes de relance générées incluent les entrées `package_artifact_run_id`Docker
précédentes et les entrées d'image Docker préparées si disponibles, afin qu'une
voie en échec puisse réutiliser la même archive et les images GHCR.

### Labo QA

La boîte du Labo QA fait également partie de `OpenClaw Release Checks`Docker. Il s'agit de la porte de version
du comportement agentique et au niveau du channel, distincte de la mécanique de
packaging Vitest et Docker.

La couverture du Labo QA de version inclut :

- voie de parité mock comparant la voie candidate OpenAI à la ligne de base
  Opus 4.6 en utilisant le pack de parité agentique
- profil QA live Matrix rapide utilisant l'environnement Matrix`qa-live-shared`
- voie QA Telegram live utilisant les baux d'identifiants Convex CI
- `pnpm qa:otel:smoke`, `pnpm qa:otel:collector-smoke`,
  `pnpm qa:prometheus:smoke`, ou
  `pnpm qa:observability:smoke` lorsque la télémétrie de version nécessite une preuve
  locale explicite

Utilisez cette case pour répondre à « la version se comporte-t-elle correctement dans les scénarios QA et les flux de channel en direct ? ». Conservez les URL des artefacts pour les voies de parité, Matrix et Telegram lors de l'approbation de la version. La couverture complète Matrix reste disponible en tant qu'exécution manuelle partitionnée QA-Lab plutôt que la voie critique de version par défaut.

### Package

La case Package est la porte du produit installable. Elle est soutenue par `Package Acceptance` et le résolveur `scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un candidat dans l'archive `package-under-test` consommée par Docker E2E, valide l'inventaire du package, enregistre la version du package et le SHA-256, et maintient la référence du harnais de workflow séparée de la référence source du package.

Sources de candidats prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte OpenClaw
- `source=ref` : empaqueter une branche `package_ref` approuvée, une balise ou un SHA de commit complet avec le harnais `workflow_ref` sélectionné
- `source=url` : télécharger un `.tgz` HTTPS public avec `package_sha256` requis ; les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte privés/interne/à usage spécial ou les adresses résolues, et les redirections non sécurisées sont rejetés
- `source=trusted-url` : télécharger un `.tgz` HTTPS avec `package_sha256` requis et `trusted_source_id` à partir d'une stratégie nommée dans `.github/package-trusted-sources.json` ; utilisez ceci pour les miroirs d'entreprise possédés par les mainteneurs ou les dépôts de packages privés au lieu d'ajouter un contournement de réseau privé au niveau de l'entrée à `source=url`
- `source=artifact` : réutiliser un `.tgz` téléchargé par une autre exécution Actions GitHub

`OpenClaw Release Checks` exécute Package Acceptance avec `source=artifact`, l'artefact du package de version préparé, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. Package Acceptance maintient la migration, la mise à jour,
le redémarrage après mise à jour de l'auth configurée, l'installation en direct de la compétence ClawHub, le nettoyage des dépendances de plugin obsolètes, les fixtures de plugin hors ligne,
la mise à jour des plugins et la QA de package Telegram sur le même tarball résolu.
Les vérifications de version bloquantes utilisent la ligne de base du dernier package publié par défaut ;
`run_release_soak=true` ou `release_profile=full` s'étend à chaque ligne de base stable publiée sur npm
de `2026.4.23` à `latest` plus les fixtures de problèmes signalés.
Utilisez Package Acceptance avec `source=npm` pour un candidat déjà livré,
`source=ref` pour un tarball local npm basé sur un SHA avant publication,
`source=trusted-url` pour un miroir d'entreprise/privé détenu par un mainteneur, ou
`source=artifact` pour un tarball préparé téléchargé par une autre exécution d'actions GitHub.
C'est le remplacement natif GitHub pour la majeure partie de la couverture de package/mise à jour qui nécessitait auparavant Parallels.
Les vérifications de version multi-OS sont toujours importantes pour l'onboarding spécifique à l'OS,
l'installateur et le comportement de la plateforme, mais la validation de produit package/mise à jour devrait
préférer Package Acceptance.

La liste de contrôle canonique pour la validation des mises à jour et des plugins est
[Test des mises à jour et des plugins](/fr/help/testing-updates-plugins). Utilisez-la lors de
la décision de quelle voie locale, Docker, Package Acceptance ou de vérification de version prouve une
installation/mise à jour de plugin, un nettoyage du doctor ou un changement de migration de package publié.
La migration exhaustive de mise à jour publiée à partir de chaque package stable `2026.4.23+` est
un workflow manuel `Update Migration` distinct, qui ne fait pas partie de Full Release CI.

La clémence d'acceptation des packages hérités est volontairement limitée dans le temps. Les packages jusqu'à `2026.4.25` peuvent utiliser le chemin de compatibilité pour les écarts de métadonnées déjà publiés sur npm : entrées d'inventaire QA privées manquantes dans l'archive, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le fixture git dérivé de l'archive, `update.channel` persistants manquants, emplacements d'enregistrement d'installation de plugin hérités, persistance d'enregistrement d'installation du marketplace manquante, et migration des métadonnées de configuration pendant `plugins update`. Le package publié `2026.4.26` peut avertir pour les fichiers de tampon de métadonnées de build local qui ont déjà été livrés. Les packages ultérieurs doivent satisfaire les contrats de packages modernes ; ces mêmes écarts entraînent l'échec de la validation de la version.

Utilisez des profils d'Acceptation de Package plus larges lorsque la question de version porte sur un package réellement installable :

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

Profils de packages courants :

- `smoke` : voies rapides d'installation de package/channel/agent, de réseau de passerelle et de rechargement de configuration
- `package` : contrats de package d'installation/mise à jour/redémarrage/plugin plus preuve d'installation de compétence live ClawHub ; ceci est la valeur par défaut de release-check
- `product` : `package` plus les channels MCP, le nettoyage cron/subagent, la recherche web OpenAI et OpenWebUI
- `full` : blocs de chemin de version Docker avec OpenWebUI
- `custom` : liste exacte de `docker_lanes` pour les réexécutions ciblées

Pour la preuve Telegram de candidat de package, activez `telegram_mode=mock-openai` ou `telegram_mode=live-frontier` sur l'Acceptation de Package. Le workflow transmet l'archive `package-under-test` résolue dans la voie Telegram ; le workflow autonome Telegram accepte toujours une spec npm publiée pour les vérifications post-publication.

## Automatisation de publication de version

`OpenClaw Release Publish` est le point d'entrée de publication modifiant normal. Il orchestre les workflows de l'éditeur de confiance dans l'ordre dont la version a besoin :

1. Extrayez le tag de version et récupérez son SHA de commit.
2. Vérifiez que le tag est accessible depuis `main` ou `release/*`.
3. Exécutez `pnpm plugins:sync:check`.
4. Déclenchez `Plugin NPM Release` avec `publish_scope=all-publishable` et
   `ref=<release-sha>`.
5. Déclenchez `Plugin ClawHub Release` avec le même scope et SHA.
6. Déclenchez `OpenClaw NPM Release`npm avec le tag de version, le dist-tag npm, et
   `preflight_run_id` enregistré.

Exemple de publication bêta :

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

La publication stable vers le dist-tag bêta par défaut :

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

La promotion stable directement vers `latest` est explicite :

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=latest
```

Utilisez les workflows de niveau inférieur `Plugin NPM Release` et `Plugin ClawHub Release`
uniquement pour des réparations ciblées ou des travaux de republication. `OpenClaw Release Publish` rejette
`plugin_publish_scope=selected` lorsque `publish_openclaw_npm=true`, donc le package
core ne peut pas être expédié sans chaque plugin officiel publiable, y compris
`@openclaw/diffs-language-pack`. Pour une réparation de plugin sélectionné, définissez
`publish_openclaw_npm=false` avec `plugin_publish_scope=selected` et
`plugins=@openclaw/name`, ou déclenchez directement le workflow enfant.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, il peut aussi être le SHA
  complet de 40 caractères du commit de la branche de workflow actuel pour une prévalidation uniquement
- `preflight_only` : `true` pour validation/build/package uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel afin que le workflow réutilise
  l'archive tarball préparée lors de l'exécution de prévalidation réussie
- `npm_dist_tag`npm : tag cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Publish` accepte ces entrées contrôlées par l'opérateur :

- `tag` : étiquette de version requise ; doit déjà exister
- `preflight_run_id` : ID d'exécution préliminaire `OpenClaw NPM Release` réussie ;
  requis lorsque `publish_openclaw_npm=true`
- `npm_dist_tag` : étiquette cible npm pour le package OpenClaw
- `plugin_publish_scope` : valeur par défaut `all-publishable` ; utiliser `selected` uniquement
  pour un travail de réparation ciblé sur les plugins avec `publish_openclaw_npm=false`
- `plugins` : noms de packages `@openclaw/*` séparés par des virgules lorsque
  `plugin_publish_scope=selected`
- `publish_openclaw_npm` : valeur par défaut `true` ; définir `false` uniquement lors de l'utilisation du
  workflow en tant qu'orchestrateur de réparation de plugins uniquement
- `wait_for_clawhub` : valeur par défaut `false` afin que la disponibilité npm ne soit pas bloquée par
  le sidecar ClawHub ; définir `true` uniquement lorsque la fin du workflow doit inclure
  la fin ClawHub

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : branche, étiquette ou SHA de commit complet à valider. Les vérifications contenant des secrets
  nécessitent que le commit résolu soit accessible depuis une branche OpenClaw ou
  une étiquette de version.
- `run_release_soak` : activer les tests exhaustifs en direct/E2E, le chemin de publication Docker et
  le test de résistance d'amélioration « all-since » sur les vérifications de version stables/défauts. Il est forcé
  activé par `release_profile=full`.

Règles :

- Les étiquettes stables et de correction peuvent être publiées sur `beta` ou `latest`
- Les étiquettes de préversion bêta ne peuvent être publiées que sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée du SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours
  en validation uniquement
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors de la pré-vérification ; le workflow vérifie ces métadonnées avant de poursuivre la publication

## Séquence de publication stable npm

Lors de la création d'une version stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise n'existe, vous pouvez utiliser le SHA de validation complet actuel de la branche de workflow pour un essai à blanc de validation uniquement du workflow de pré-vérification
2. Choisissez `npm_dist_tag=beta` pour le flux normal beta-first, ou `latest` uniquement lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de version, la balise de version ou le SHA de validation complet lorsque vous souhaitez une CI normale plus la mise en cache des invites en direct, Docker, QA Lab, Matrix et la couverture Telegram à partir d'un workflow manuel
4. Si vous avez intentionnellement uniquement besoin du graphe de tests normal déterministe, exécutez plutôt le workflow manuel `CI` sur la référence de version
5. Sauvegardez le `preflight_run_id` réussi
6. Exécutez `OpenClaw Release Publish` avec le même `tag`, le même `npm_dist_tag` et le `preflight_run_id` sauvegardé ; il publie les plugins externalisés sur npm et ClawHub avant de promouvoir le paquet OpenClaw npm
7. Si la version a atterri sur `beta`, utilisez le workflow `openclaw/releases/.github/workflows/openclaw-npm-dist-tags.yml` pour promouvoir cette version stable de `beta` vers `latest`
8. Si la version a été intentionnellement publiée directement sur `latest` et que `beta` doit suivre immédiatement la même version stable, utilisez le même workflow de version pour faire pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation d'auto-réparation planifiée déplacer `beta` plus tard

La mutation du dist-tag se trouve dans le dépôt du registre des versions car elle nécessite toujours `NPM_TOKEN`, tandis que le dépôt source conserve la publication OIDC uniquement.

Cela permet de garder documentés et visibles par les opérateurs le chemin de publication direct ainsi que le chemin de promotion via la version bêta.

Si un mainteneur doit revenir à l'authentification npm locale, exécutez toutes les commandes 1Password CLI (`op`) uniquement dans une session tmux dédiée. N'appelez pas `op` directement depuis le shell de l'agent principal ; le garder à l'intérieur de tmux rend les invites, les alertes et la gestion de l'OTP observables et empêche les alertes d'hôte répétées.

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

Les mainteneurs utilisent la documentation de publication privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook réel.

## Connexes

- [Canaux de publication](/fr/install/development-channels)

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
2. Réécrire la section supérieure `CHANGELOG.md` à partir de l'historique réel des commits avec
   `/changelog`, conserver les entrées orientées utilisateur, la committer, la pousser, et effectuer un rebase/pull
   une fois de plus avant de créer la branche.
3. Examiner les enregistrements de compatibilité des versions dans
   `src/plugins/compat/registry.ts` et
   `src/commands/doctor/shared/deprecation-compat.ts`. Ne supprimer la compatibilité
   expirée que si le chemin de mise à niveau reste couvert, ou consigner la raison pour laquelle elle est
   intentionnellement conservée.
4. Créer `release/YYYY.M.D` à partir de `main` actuel ; ne pas effectuer le travail de version normal
   directement sur `main`.
5. Incrémenter chaque emplacement de version requis pour le tag prévu, puis exécuter
   `pnpm release:prep`. Il actualise les versions des plugins, l'inventaire des plugins, le schéma
   de configuration, les métadonnées de configuration de channel groupé, la base de référence de la documentation de configuration, les exportations du SDK de
   plugin et la base de référence de l'API du plugin dans le bon ordre. Valider toute dérive
   générée avant le tagage. Ensuite, exécuter le prévol local déterministe :
   `pnpm check:test-types`, `pnpm check:architecture`,
   `pnpm build && pnpm ui:build` et `pnpm release:check`.
6. Exécuter `OpenClaw NPM Release` avec `preflight_only=true`. Avant qu'un tag n'existe,
   un SHA complet de 40 caractères de la branche de version est autorisé pour le prévol
   de validation uniquement. Enregistrer le `preflight_run_id` réussi.
7. Lancer tous les tests de pré-version avec `Full Release Validation` pour la
   branche de version, le tag ou le SHA de commit complet. Il s'agit de l'unique point d'entrée manuel
   pour les quatre grandes boîtes de test de version : Vitest, Docker, QA Lab et Package.
8. Si la validation échoue, corrigez sur la branche de publication et relancez le plus petit fichier, lane, tâche de workflow, profil de package, fournisseur, ou liste d'autorisation de modèle ayant échoué et prouvant la correction. Relancez le parapluie complet uniquement lorsque la surface modifiée rend les preuves précédentes obsolètes.
9. Pour la bêta, créez le tag `vYYYY.M.D-beta.N`, puis exécutez `OpenClaw Release Publish` depuis
   la branche `release/YYYY.M.D` correspondante. Il vérifie `pnpm plugins:sync:check`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub,
   envoie tous les packages de plugins publiables vers npm et le même ensemble vers
   ClawHub en parallèle, puis promeut l'artefact de prépublication OpenClaw npm préparé
   avec le dist-tag correspondant dès que la publication du plugin npm réussit.
   Une fois que l'enfant de publication OpenClaw npm réussit, il crée ou met à jour la
   page de version/pré-version GitHub correspondante à partir de la section `CHANGELOG.md`npm correspondante complète. Les versions stables publiées sur npm `latest`GitHubnpm deviennent la
   dernière version GitHub ; les versions de maintenance stables conservées sur npm `beta`GitHub sont
   créées avec GitHub `latest=false`ClawHubOpenClawnpmClawHubOpenClawnpmClawHub.
   La publication ClawHub peut toujours être en cours d'exécution pendant les publications OpenClaw npm, mais le
   workflow de publication de version imprime immédiatement les ID d'exécution enfants. Par défaut, il
   n'attend pas ClawHub après l'avoir envoyé, donc la disponibilité d'OpenClaw npm
   n'est pas bloquée par les approbations ou le travail de registre plus lents de ClawHub ; définissez
   `wait_for_clawhub=true`ClawHubClawHubCLI lorsque ClawHub doit bloquer la fin du workflow. Le chemin
   ClawHub réessaie les échecs d'installation de dépendances CLI transitoires, publie
   les plugins ayant réussi la prévisualisation même lorsqu'une cellule de prévisualisation est instable, et se termine par
   une vérification du registre pour chaque version de plugin attendue afin que les publications partielles
   restent visibles et réessayables. Après la publication, exécutez
   l'acceptation du package post-publication
   sur le package `openclaw@YYYY.M.D-beta.N` ou
   `openclaw@beta` publié. Si une pré-version poussée ou publiée nécessite une correction,
   créez le prochain numéro de pré-version correspondant ; ne supprimez pas et ne réécrivez pas l'ancienne
   pré-version.
10. Pour la version stable, ne continuer qu'une fois que la version bêta ou candidate validée dispose des
    preuves de validation requises. La publication npm stable passe également par
    `OpenClaw Release Publish`, en réutilisant l'artefact de prévol réussi via
    `preflight_run_id`npmmacOS; la préparation de la version stable macOS nécessite également le
    `.zip` empaqueté, `.dmg`, `.dSYM.zip`, et `appcast.xml` mis à jour sur `main`.
    Le workflow de publication privé macOS publie automatiquement le appcast signé vers le public
    `main` après vérification des assets de publication; si la protection de branche bloque
    la poussée directe, il ouvre ou met à jour une PR appcast.
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
- Exécutez le workflow manuel `Full Release Validation` avant l'approbation de la version pour
  lancer toutes les boîtes de test de pré-publication à partir d'un seul point d'entrée. Il accepte une branche,
  un tag ou un SHA de commit complet, distribue manuellement `CI`, et distribue
  `OpenClaw Release Checks` pour les tests d'installation, l'acceptation des paquets, les vérifications
  de paquets multi-OS, la parité QA Lab, les voies Matrix et Telegram. Les exécutions stables/par défaut
  gardent les tests complets en direct/E2E et le soak du chemin de publication Docker derrière
  `run_release_soak=true` ; `release_profile=full` force l'activation du soak. Avec
  `release_profile=full` et `rerun_group=all`, il exécute également les E2E de paquet Telegram
  contre l'artefact `release-package-under-test` provenant des vérifications de version.
  Fournissez `npm_telegram_package_spec` après publication lorsque les mêmes
  E2E Telegram doivent également valider le paquet npm publié. Fournissez
  `package_acceptance_package_spec` après publication lorsque l'Acceptation des Paquets
  doit exécuter sa matrice de paquet/mise à jour contre le paquet npm expédié au lieu
  de l'artefact construit à partir du SHA. Fournissez
  `evidence_package_spec` lorsque le rapport de preuve privé doit prouver que
  la validation correspond à un paquet npm publié sans forcer les E2E Telegram.
  Exemple :
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par voie latérale
  pour un candidat de paquet pendant que le travail de publication continue. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/tag/SHA `package_ref` de confiance avec le
  harnais `workflow_ref` actuel ; `source=url` pour une archive HTTPS avec un
  SHA-256 requis ; ou `source=artifact` pour une archive téléchargée par une autre exécution
  d'Actions GitHub. Le workflow résout le candidat en
  `package-under-test`, réutilise le planificateur de publication E2E Docker contre cette
  archive, et peut exécuter la QA Telegram contre la même archive avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`. Lorsque les
  voies Docker sélectionnées incluent `published-upgrade-survivor`, l'artefact
  du paquet est le candidat et `published_upgrade_survivor_baseline` sélectionne
  la base de référence publiée. `update-restart-auth` utilise le paquet candidat comme
  CLI installé et le paquet-sous-test, exerçant ainsi le
  chemin de redémarrage géré de la commande de mise à jour du candidat.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : voies install/channel/agent, réseau de passerelle et rechargement de configuration
  - `package` : voies package/update/restart/plugin natives aux artefacts sans OpenWebUI ou ClawHub en direct
  - `product` : profil de paquet plus les channels MCP, nettoyage cron/subagent,
    recherche web OpenAI et OpenWebUI
  - `full` : morceaux du chemin de publication Docker avec OpenWebUI
  - `custom` : sélection exacte de `docker_lanes` pour une réexécution ciblée
- Exécutez le workflow manuel `CI`Linux directement lorsque vous avez uniquement besoin d'une couverture CI normale complète pour le candidat à la publication. Les déclenchements manuels du CI contournent la portée des modifications et forcent les shards Node Linux, les shards bundled-plugin, les contrats de channel, la compatibilité Node 22, `check`, `check-additional`, les tests de fumée de construction, les vérifications de documentation, les compétences Python, Windows, macOS, Android et les voies i18n de l'interface utilisateur de contrôle. Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de publication. Il exerce le QA-lab via un récepteur OTLP/HTTP local et vérifie les noms des spans de trace exportés, les attributs bornés et la rédaction du contenu/identifiant sans nécessiter Opik, Langfuse ou un autre collecteur externe.
- Exécutez `pnpm release:check` avant chaque publication marquée
- Exécutez `OpenClaw Release Publish` pour la séquence de publication avec mutation une fois que le tag existe. Déclenchez-le à partir de `release/YYYY.M.D` (ou `main` lors de la publication d'un tag accessible depuis main), passez le tag de publication et le OpenClaw npm `preflight_run_id` réussi, et gardez la portée de publication de plugin par défaut `all-publishable` sauf si vous exécutez délibérément une réparation ciblée. Le workflow sérialise la publication npm du plugin, la publication ClawHub du plugin et la publication OpenClaw npm afin que le package principal ne soit pas publié avant ses plugins externalisés.
- Les vérifications de publication s'exécutent désormais dans un workflow manuel séparé :
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également la voie de parité simulée du QA Lab ainsi que le profil live rapide Matrix et la voie QA Telegram avant l'approbation de la publication. Les voies live utilisent l'environnement `qa-live-shared` ; Telegram utilise également les baux d'informations d'identification Convex CI. Exécutez le workflow manuel `QA-Lab - All Lanes` avec `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet du transport, des médias et de l'E2EE Matrix en parallèle.
- La validation de l'exécution d'installation et de mise à niveau multi-OS fait partie des `OpenClaw Release Checks` et `Full Release Validation` publics, qui appellent le workflow réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directement
- Cette séparation est intentionnelle : gardez la vraie voie de publication npm courte, déterministe et axée sur les artefacts, tandis que les vérifications live plus lentes restent dans leur propre voie afin qu'elles ne bloquent pas ou n'entravent pas la publication
- Les vérifications de publication contenant des secrets doivent être dispatchées via la référence de workflow `Full Release Validation` or from the `main`/release afin que la logique du workflow et les secrets restent contrôlés
- `OpenClaw Release Checks` accepte une branche, une balise ou un SHA de commit complet tant que le commit résolu est accessible depuis une branche ou une balise de publication OpenClaw
- La pré-vérification de validation uniquement `OpenClaw NPM Release` accepte également le SHA de commit complet actuel de 40 caractères de la branche de workflow sans nécessiter de balise poussée
- Ce chemin SHA est réservé à la validation et ne peut être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la vérification des métadonnées du package ; la véritable publication nécessite toujours une vraie balise de version
- Les deux workflows gardent le chemin réel de publication et de promotion sur les hébergeurs GitHub, tandis que le chemin de validation non-mutant peut utiliser les plus grands hébergeurs Blacksmith Linux
- Ce workflow exécute `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache` en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La pré-vérification de publication npm n'attend plus la voie distincte des vérifications de publication
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise beta/correction correspondante) avant l'approbation
- Après la publication npm, exécutez
  npm`node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version beta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire frais
- Après une publication beta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`TelegramTelegramnpmTelegram
  pour vérifier l'onboarding du paquet installé, la configuration Telegram, et les E2E Telegram réels
  contre le paquet npm publié en utilisant le pool partagé d'identifiants Telegram loués.
  Les tests ponctuels du mainteneur local peuvent omettre les vars Convex et passer directement les trois
  identifiants d'environnement `OPENCLAW_QA_TELEGRAM_*`.
- Pour exécuter le test complet de fumée post-publication beta depuis une machine de mainteneur, utilisez `pnpm release:beta-smoke -- --beta betaN`npm.
  L'assistant exécute la validation de mise à jour/cible fraîche npm Parallels, répartit `NPM Telegram Beta E2E`Telegram, sonde l'exécution exacte du workflow,
  télécharge l'artefact et imprime le rapport Telegram.
- Les mainteneurs peuvent exécuter la même vérification post-publication depuis GitHub Actions via le
  workflow manuel GitHub`NPM Telegram Beta E2E`. Il est intentionnellement uniquement manuel et
  ne s'exécute pas à chaque fusion.
- L'automatisation de publication du mainteneur utilise désormais préflight-then-promote :
  - la vraie publication npm doit réussir un npm npmnpm`preflight_run_id` réussi
  - la vraie publication npm doit être répartie depuis la même branche npm`main` ou
    `release/YYYY.M.D` que l'exécution préflight réussie
  - les publications npm stables sont par défaut npm`beta`
  - la publication npm stable peut cibler npm`latest` explicitement via l'entrée du workflow
  - la mutation de dist-tag npm basée sur des jetons réside désormais dans
    npm`openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que le
    dépôt public conserve une publication OIDC uniquement
  - public `macOS Release` est réservé à la validation ; lorsqu'une étiquette n'existe que sur une
    branche de version mais que le workflow est déclenché depuis `main`, définissez
    `public_release_branch=release/YYYY.M.D`
  - la publication réelle privée mac doit réussir les tests privés mac
    `preflight_run_id` et `validate_run_id`
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
    à nouveau
- Pour les corrections de versions stables comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne laissent pas silencieusement d'anciennes installations globales sur
  la charge utile stable de base
- npm la pré-publication échoue fermement à moins que l'archive ne comprenne à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus un tableau de bord navigateur vide
- La vérification post-publication vérifie également que les points d'entrée des plugins publiés et
  les métadonnées du package sont présents dans la disposition du registre installé. Une version qui
  expédie des charges utides d'exécution de plugin manquantes échoue au vérificateur post-publication et
  ne peut pas être promue vers `latest`.
- `pnpm test:install:smoke` applique également le budget `unpackedSize` du pack npm sur
  l'archive de mise à jour candidate, afin que l'e2e de l'installateur détecte le gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de publication a touché la planification CI, les manifestes de synchronisation des extensions, ou
  les matrices de test d'extension, régénérez et examinez les sorties de matrice `plugin-prerelease-extension-shard`
  détenues par le planificateur depuis `.github/workflows/plugin-prerelease.yml` avant approbation afin que les notes de version ne
  décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS comprend également les surfaces du programme de mise à jour :
  - la version GitHub doit se retrouver avec les `.zip`, `.dmg` et `.dSYM.zip` empaquetés
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après la publication ; le workflow de publication privé macOS le commit automatiquement, ou ouvre une PR appcast lorsque la poussée directe est bloquée
  - l'application empaquetée doit conserver un identifiant de bundle non-débogage, une URL de flux Sparkle non vide et un `CFBundleVersion` égal ou supérieur au plancher de build Sparkle canonique pour cette version

## Boîtes de test de version

`Full Release Validation` est la méthode par laquelle les opérateurs lancent tous les tests de pré-version depuis un seul point d'entrée. Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez l'assistant afin que chaque workflow enfant s'exécute depuis une branche temporaire fixée au SHA cible :

```bash
pnpm ci:full-release --sha <full-sha>
```

L'assistant pousse `release-ci/<sha>-...`, envoie `Full Release Validation` depuis cette branche avec `ref=<sha>`, vérifie que chaque `headSha` de workflow enfant correspond à la cible, puis supprime la branche temporaire. Cela évite de valider par accident un exécution enfant plus récente de `main`.

Pour la validation de la branche ou de l'étiquette de version, exécutez-le depuis la référence de workflow `main` de confiance et passez la branche ou l'étiquette de version en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

Le workflow résout la référence cible, dispatche des `CI` manuels avec `target_ref=<release-ref>`, dispatche `OpenClaw Release Checks`, prépare un artefact `release-package-under-test` parent pour les vérifications orientées package, et dispatche les E2E de package autonome Telegram lorsque `release_profile=full` avec `rerun_group=all` ou lorsque `npm_telegram_package_spec` est défini. `Vérifications de Release OpenClaw` déploie ensuite des tests de fumée d'installation, des vérifications de release inter-OS, la couverture du chemin de release en direct/E2E Docker lorsque le soak est activé, l'acceptation de package avec QA de package Telegram, la parité QA Lab, Matrix en direct, et Telegram en direct. Une exécution complète n'est acceptable que lorsque le résumé `Full Release Validation` indique `normal_ci` et `release_checks` comme réussis. En mode complet/all, l'enfant `npm_telegram` doit également être réussi ; en dehors du mode complet/all, il est ignoré sauf si un `npm_telegram_package_spec` publié a été fourni. Le résumé final du vérificateur comprend des tableaux des tâches les plus lentes pour chaque exécution enfant, afin que le responsable de la release puisse voir le chemin critique actuel sans télécharger les journaux. Voir [Full release validation](/fr/reference/full-release-validation) pour la matrice complète des étapes, les noms exacts des tâches de workflow, les différences entre le profil stable et complet, les artefacts et les poignées de réexécution ciblées. Les workflows enfants sont dispatchés à partir de la référence de confiance qui exécute `Full Release Validation`, normally `--ref main`, even when the target `ref` pointe vers une branche de version ou un tag plus ancien. Il n'y a pas d'entrée de référence de workflow Full Release Validation séparée ; choisissez le harnais de confiance en choisissant la référence d'exécution du workflow. N'utilisez pas `--ref main -f ref=<sha>` pour la preuve exacte de commit sur `main` en mouvement ; les SHA de commit bruts ne peuvent pas être des références de dispatch de workflow, utilisez donc `pnpm ci:full-release --sha <sha>` pour créer la branche temporaire épinglée.

Utilisez `release_profile` pour sélectionner l'étendue en direct/fournisseur :

- `minimum`OpenAI : chemin critique de release le plus rapide pour OpenAI/core live et Docker
- `stable` : minimum plus une couverture stable provider/backend pour l'approbation de release
- `full` : stable plus une large couverture consultative provider/media

Utilisez `run_release_soak=true` avec `stable` lorsque les voies bloquant la release sont vertes et que vous voulez le balayage exhaustif live/E2E, le chemin de release Docker et le balayage des survivants de mise à niveau publiés limités avant la promotion. Ce balayage couvre les quatre derniers packages stables plus les lignes de base épinglées `2026.4.23` et `2026.5.2` plus la couverture `2026.4.15` plus ancienne, avec les lignes de base en double supprimées et chaque ligne de base fragmentée dans son propre tâche de runner Docker. `full` implique `run_release_soak=true`.

`OpenClaw Release Checks` utilise la ref de workflow de confiance pour résoudre la ref cible une fois sous la forme `release-package-under-test` et réutilise cet artefact dans les contrôles cross-OS, d'acceptation de package et de chemin de release Docker lors des exécutions de trempage (soak). Cela maintient toutes les boîtes orientées package sur les mêmes octets et évite les builds de package répétés. Le test de fumée d'installation OpenAI cross-OS utilise `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsque la variable repo/org est définie, sinon `openai/gpt-5.4`, car cette voie prouve l'installation du package, l'onboarding, le démarrage de la passerelle et un tour d'agent live plutôt que de benchmark le modèle par défaut le plus lent. La matrice live plus large de provider reste l'endroit pour la couverture spécifique au modèle.

Utilisez ces variantes en fonction de l'étape de release :

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
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_package_spec=openclaw@YYYY.M.D-beta.N \
  -f npm_telegram_provider_mode=mock-openai
```

N'utilisez pas l'intégralité du parapluie comme premier réexécution après une correction ciblée. Si une boîte échoue, utilisez le workflow enfant, le travail, la voie Docker, le profil de package, le fournisseur de modèle ou la voie QA échoué pour la preuve suivante. Réexécutez le parapluie complet uniquement lorsque la correction a modifié l'orchestration commune de la version ou a rendu obsolètes les preuves antérieures de toutes les boîtes. Le vérificateur final du parapluie vérifie à nouveau les identifiants d'exécution des workflows enfants enregistrés, donc après qu'un workflow enfant a été réexécuté avec succès, réexécutez uniquement le travail parent Docker`Verify full validation` échoué.

Pour une récupération limitée, passez `rerun_group` au parapluie. `all` est l'exécution réelle du candidat à la release, `ci` n'exécute que l'enfant CI normal, `plugin-prerelease` n'exécute que l'enfant du plugin release-only, `release-checks` exécute chaque boîte de release, et les groupes de release plus restreints sont `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` et `npm-telegram`. Les réexécutions ciblées `npm-telegram` nécessitent `npm_telegram_package_spec` ; les exécutions complètes/toutes avec `release_profile=full` utilisent l'artefact du package release-checks. Les réexécutions ciblées multi-OS peuvent ajouter `cross_os_suite_filter=windows/packaged-upgrade` ou un autre filtre OS/suite. Les échecs des release-checks QA sont consultatifs ; un échec uniquement QA ne bloque pas la validation de la release.

### Vitest

La boîte Vitest est le workflow enfant `CI` manuel. Le CI manuel contourne intentionnellement le champ d'application des modifications et force le graphe de tests normal pour le candidat à la release : shards Node Linux, shards bundled-plugin, contrats de channel, compatibilité Node 22, `check`, `check-additional`, build smoke, vérifications docs, compétences Python, Windows, macOS, Android et i18n de l'interface de contrôle.

Utilisez cette boîte pour répondre à « l'arborescence source a-t-elle passé la suite de tests normale complète ? »
Ce n'est pas la même chose que la validation produit du chemin de release. Preuves à conserver :

- `Full Release Validation` résumé indiquant l'URL d'exécution `CI` envoyée
- exécution `CI` au vert sur le SHA cible exact
- noms de partitions échouées ou lentes à partir des tâches CI lors de l'investigation des régressions
- artefacts de synchronisation Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une
  exécution nécessite une analyse des performances

Exécuter le CI manuel directement uniquement lorsque la release nécessite un CI normal déterministe mais
pas les boîtes Docker, QA Lab, live, cross-OS ou package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

La boîte Docker se trouve dans `OpenClaw Release Checks` via
`openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow
`install-smoke` en mode release. Il valide le candidat à la release via des environnements
Docker empaquetés au lieu de tests uniquement au niveau source.

La couverture de release Docker inclut :

- test de fumée d'installation complète avec le test de fumée d'installation globale lent Bun activé
- préparation/réutilisation de l'image de test de fumée Dockerfile racine par SHA cible, avec QR,
  racine/passerelle et les tâches de test de fumée installateur/Bun s'exécutant comme des partitions
  install-smoke séparées
- voies E2E du référentiel
- morceaux Docker du chemin de release : `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g` et `plugins-runtime-install-h`
- couverture OpenWebUI dans le morceau `plugins-runtime-services` lorsque demandée
- voies d'installation/désinstallation de plugin groupé séparées
  `bundled-plugin-install-uninstall-0` via
  `bundled-plugin-install-uninstall-23`
- suites de provider live/E2E et couverture de modèle live Docker lorsque les vérifications de release
  incluent des suites live

Utilisez les artefacts Docker avant de réexécuter. Le planificateur de chemin de publication (release-path) télécharge
`.artifacts/docker-tests/` avec les journaux de voie (lane), `summary.json`, `failures.json`,
les minutages de phase, le plan du planificateur JSON et les commandes de réexécution. Pour une récupération ciblée,
utilisez `docker_lanes=<lane[,lane]>` sur le workflow réutilisable live/E2E au lieu de
réexécuter tous les morceaux de publication. Les commandes de réexécution générées incluent les `package_artifact_run_id`
antérieurs et les entrées d'image Docker préparées lorsque disponibles, afin qu'une
voie en échec puisse réutiliser le même tarball et les images GHCR.

### QA Lab

La boîte QA Lab fait également partie de `OpenClaw Release Checks`. Il s'agit de la barrière (gate) de publication
niveau comportement agentique et niveau channel, distincte de la mécanique de package Vitest et Docker.

La couverture du QA Lab de publication comprend :

- voie de parité factice (mock) comparant la voie candidate OpenAI à la ligne de base
  Opus 4.6 en utilisant le pack de parité agentique
- profil QA live rapide Matrix utilisant l'environnement `qa-live-shared`
- voie QA live Telegram utilisant les baux d'informations d'identification Convex CI
- `pnpm qa:otel:smoke` lorsque la télémétrie de publication nécessite une preuve locale explicite

Utilisez cette boîte pour répondre à « la publication se comporte-t-elle correctement dans les scénarios QA et
les flux channel live ? » Conservez les URL d'artefacts pour les voies de parité, Matrix et Telegram
lors de l'approbation de la publication. La couverture complète Matrix reste disponible sous forme d'exécution
manuelle partitionnée QA-Lab plutôt que la voie critique de publication par défaut.

### Package

La boîte Package est la barrière du produit installable. Elle est soutenue par
`Package Acceptance` et le résolveur
`scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un
candidat dans le tarball `package-under-test` consommé par Docker E2E, valide
l'inventaire du package, enregistre la version du package et le SHA-256, et garde la
référence du harnais de workflow séparée de la référence source du package.

Sources de candidats prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de publication OpenClaw exacte
- `source=ref` : compacter une branche `package_ref` approuvée, une balise ou un SHA de commit complet
  avec le harnais `workflow_ref` sélectionné
- `source=url` : télécharger une ressource `.tgz` HTTPS avec le `package_sha256` requis
- `source=artifact` : réutiliser une ressource `.tgz` téléchargée par une autre exécution GitHub Actions

`OpenClaw Release Checks` exécute Package Acceptance avec `source=artifact`, l'artefact
de paquet de version préparé, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. Package Acceptance conserve les tests de migration, de mise à jour,
de redémarrage après mise à jour de l'auth configurée, d'installation de compétence en direct ClawHub, de nettoyage des dépendances de plugins obsolètes, de fixtures de plugins hors ligne, de mise à jour de plugins et de QA de paquet Telegram sur le même tarball résolu.
Les contrôles de version bloquants utilisent la ligne de base du dernier paquet publié par défaut ;
`run_release_soak=true` ou `release_profile=full` s'étend à toutes les lignes de base stables publiées sur npm
de `2026.4.23` à `latest` plus les fixtures de problèmes signalés.
Utilisez Package Acceptance avec `source=npm` pour un candidat déjà expédié, ou
`source=ref`/`source=artifact` pour un tarball local npm basé sur un SHA avant
publication. C'est le remplacement natif GitHub pour
la plupart de la couverture de paquet/mise à jour qui nécessitait auparavant Parallels.
Les contrôles de version multi-OS sont toujours importants pour le spécifique à l'OS, l'installateur et le comportement de la plateforme, mais la validation produit de paquet/mise à jour devrait préférer Package Acceptance.

La liste de contrôle canonique pour la validation des mises à jour et des plugins est
[Testing updates and plugins](/fr/help/testing-updates-plugins). Utilisez-la lors
de la décision sur la voie locale, Docker, d'acceptation de package, ou de vérification de version qui prouve un
d'installation/de mise à jour de plugin, un nettoyage docteur, ou un changement de migration de package publié.
La migration exhaustive des mises à jour publiées à partir de chaque package stable `2026.4.23+` est
un workflow manuel `Update Migration` distinct, et ne fait pas partie de la CI de Version Complète.

La clémence d'acceptation de package héritée est intentionnellement limitée dans le temps. Les packages jusqu'à
`2026.4.25` peuvent utiliser le chemin de compatibilité pour les écarts de métadonnées déjà publiés
sur npm : entrées d'inventaire QA privées manquantes dans l'archive, `gateway install --wrapper` manquant,
fichiers de correctifs manquants dans le fixture git dérivé de l'archive,
`update.channel` persisté manquant, emplacements d'enregistrement d'installation de plugin hérités,
persistence d'enregistrement d'installation de marketplace manquante, et migration des métadonnées de configuration
pendant `plugins update`. Le package publié `2026.4.26` peut avertir
concernant les fichiers de tampon de métadonnées de construction locale qui ont déjà été expédiés. Les packages ultérieurs
doivent satisfaire les contrats de package modernes ; ces mêmes écarts entraînent l'échec de la validation
de version.

Utilisez des profils d'acceptation de package plus larges lorsque la question de version concerne un
package réellement installable :

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f published_upgrade_survivor_baseline=openclaw@2026.4.26
```

Profils de package courants :

- `smoke` : voies rapides d'installation/de channel/d'agent de package, de réseau passerelle, et de
  rechargement de configuration
- `package` : contrats de package d'installation/de mise à jour/de redémarrage/de plugin plus preuve d'installation de compétence ClawHub
  en direct ; ceci est la valeur par défaut de vérification de version
- `product` : `package` plus les canaux MCP, le nettoyage cron/sous-agent, la recherche web OpenAI,
  et OpenWebUI
- `full` : morceaux de chemin de version Docker avec OpenWebUI
- `custom` : liste `docker_lanes` exacte pour les réexécutions ciblées

Pour la preuve Telegram des candidats de paquet, activez Telegram`telegram_mode=mock-openai` ou
`telegram_mode=live-frontier` sur l'acceptation des paquets. Le workflow transmet
l'archive tarball `package-under-test` résolue dans la voie Telegram; le workflow
autonome Telegram accepte toujours une spécification npm publiée pour les vérifications post-publication.

## Automatisation de la publication des versions

`OpenClaw Release Publish` est le point d'entrée normal de publication avec mutation. Il
orchestre les workflows de l'éditeur de confiance dans l'ordre requis par la version :

1. Extrayez le tag de version et résolvez son SHA de commit.
2. Vérifiez que le tag est accessible depuis `main` ou `release/*`.
3. Exécutez `pnpm plugins:sync:check`.
4. Dispatchez `Plugin NPM Release` avec `publish_scope=all-publishable` et
   `ref=<release-sha>`.
5. Dispatchez `Plugin ClawHub Release` avec la même portée (scope) et SHA.
6. Dispatchez `OpenClaw NPM Release` avec le tag de version, le dist-tag npm et
   `preflight_run_id` enregistré.

Exemple de publication bêta :

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Publication stable vers le dist-tag bêta par défaut :

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
uniquement pour une réparation ciblée ou une nouvelle publication. Pour une réparation de plugin sélectionné, passez
`plugin_publish_scope=selected` et `plugins=@openclaw/name` à
`OpenClaw Release Publish`, ou dispatchez le workflow enfant directement lorsque le
paquet OpenClaw ne doit pas être publié.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1` ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, il peut également être le SHA de commit
  complet de 40 caractères actuel de la branche de workflow pour une pré-vérification de validation uniquement
- `preflight_only` : `true` pour la validation/build/package uniquement, `false` pour le
  chemin réel de publication
- `preflight_run_id` : requis sur le chemin réel de publication afin que le workflow réutilise
  l'archive tar préparée lors de l'exécution de préflight réussie
- `npm_dist_tag`npm : étiquette cible npm pour le chemin de publication ; valeur par défaut `beta`

`OpenClaw Release Publish` accepte ces entrées contrôlées par l'opérateur :

- `tag` : étiquette de version requise ; doit déjà exister
- `preflight_run_id` : ID d'exécution de préflight `OpenClaw NPM Release` réussie ;
  requis lorsque `publish_openclaw_npm=true`
- `npm_dist_tag`npmOpenClaw : étiquette cible npm pour le package OpenClaw
- `plugin_publish_scope` : valeur par défaut `all-publishable` ; utiliser `selected` uniquement
  pour des travaux de réparation ciblés
- `plugins` : noms de packages `@openclaw/*` séparés par des virgules lorsque
  `plugin_publish_scope=selected`
- `publish_openclaw_npm` : valeur par défaut `true` ; définir `false` uniquement lors de l'utilisation du
  workflow en tant qu'orchestrateur de réparation plugin-only

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref`OpenClaw : branche, étiquette ou SHA de commit complet à valider. Les vérifications contenant des secrets
  nécessitent que le commit résolu soit accessible depuis une branche OpenClaw ou
  une étiquette de version.
- `run_release_soak`Docker : activer exhaustive live/E2E, le chemin de publication Docker, et
  le soak all-since upgrade-survivor sur les vérifications de version stables/par défaut. Elle est forcée
  activée par `release_profile=full`.

Règles :

- Les étiquettes stables et de correction peuvent être publiées sur `beta` ou `latest`
- Les étiquettes de préversion bêta peuvent être publiées uniquement sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée du SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours
  réservés à la validation uniquement
- Le vrai chemin de publication doit utiliser le même `npm_dist_tag` que celui utilisé lors de la pré-vérification (preflight) ;
  le workflow vérifie que ces métadonnées persistent avant la publication

## Séquence de publication stable npm

Lors de la préparation d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise (tag) n'existe, vous pouvez utiliser le SHA complet actuel du commit de la branche de workflow
     pour un essai à blanc de validation unique du workflow de pré-vérification (preflight)
2. Choisissez `npm_dist_tag=beta` pour le flux normal commençant par la bêta, ou `latest` uniquement
   lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de publication, la balise de publication, ou le SHA
   complet du commit lorsque vous souhaitez une CI normale plus une couverture en temps réel du cache de prompt, de Docker, du QA Lab,
   de Matrix et de Telegram via un workflow manuel unique
4. Si vous avez intentionnellement besoin uniquement du graphe de tests normal déterministe, exécutez
   le workflow manuel `CI` sur la référence de publication à la place
5. Sauvegardez le `preflight_run_id` réussi
6. Exécutez `OpenClaw Release Publish` avec le même `tag`, le même `npm_dist_tag`,
   et le `preflight_run_id` sauvegardé ; cela publie les plugins externalisés vers npm
   et ClawHub avant de promouvoir le paquet OpenClaw npm
7. Si la publication a abouti sur `beta`, utilisez le workflow privé
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   pour promouvoir cette version stable de `beta` vers `latest`
8. Si la publication a été intentionnellement publiée directement sur `latest` et que `beta`
   doit suivre immédiatement la même version stable, utilisez ce même workflow
   privé pour pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation
   d'auto-réparation programmée déplacer `beta` plus tard

La mutation de dist-tag réside dans le dépôt privé pour des raisons de sécurité car elle nécessite toujours `NPM_TOKEN`, tandis que le dépôt public conserve une publication OIDC uniquement.

Cela permet de garder le chemin de publication direct et le chemin de promotion en bêta d'abord tous deux documentés et visibles par les opérateurs.

Si un mainteneur doit revenir à l'authentification locale npm, exécutez les commandes 1Password CLI (`op`) uniquement dans une session tmux dédiée. N'appelez pas `op` directement depuis le shell de l'agent principal ; le garder à l'intérieur de tmux rend les invites, les alertes et la gestion des OTP observables et évite les alertes répétées de l'hôte.

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

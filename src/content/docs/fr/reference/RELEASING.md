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
9. Pour la version bêta, balisez `vYYYY.M.D-beta.N`, puis exécutez `OpenClaw Release Publish` à partir de
   la branche `release/YYYY.M.D` correspondante. Il vérifie `pnpm plugins:sync:check`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub,
   envoie tous les packages de plugins publiables vers npm et le même ensemble vers
   ClawHub en parallèle, puis promeut l'artefact de pré-vérification npm OpenClaw préparé
   avec le dist-tag correspondant dès que la publication npm du plugin réussit.
   Une fois que l'enfant de publication npm OpenClaw réussit, il crée ou met à jour la
   page de version/pré-version GitHub correspondante à partir de la section `CHANGELOG.md`npm correspondante complète. Les versions stables publiées sur npm `latest`GitHubnpm deviennent la
   dernière version GitHub ; les versions de maintenance stables conservées sur npm `beta`GitHub sont
   créées avec GitHub `latest=false`ClawHubOpenClawnpmClawHubOpenClawnpmClawHub.
   La publication ClawHub peut toujours être en cours pendant que npm publie OpenClaw, mais le
   workflow de publication de version affiche immédiatement les ID d'exécution enfants. Par défaut, il
   n'attend pas ClawHub après l'avoir envoyé, donc la disponibilité npm OpenClaw
   n'est pas bloquée par les approbations ou le travail de registre plus lents de ClawHub ; définissez
   `wait_for_clawhub=true`ClawHubClawHubCLI lorsque ClawHub doit bloquer la fin du workflow. Le
   chemin ClawHub réessaie les échecs d'installation des dépendances CLI transitoires, publie
   les plugins réussissant l'aperçu même lorsqu'une cellule d'aperçu échoue, et se termine par
   une vérification du registre pour chaque version de plugin attendue afin que les publications partielles
   restent visibles et réessayables. Après la publication, exécutez
   `pnpm release:verify-beta -- YYYY.M.D-beta.N --openclaw-npm-run <run-id> --plugin-npm-run <run-id> --plugin-clawhub-run <run-id>`GitHubnpm
   pour vérifier la pré-version GitHub, les dist-tags npm `beta`npmClawHubClawHub, l'intégrité npm,
   le chemin d'installation publié, les versions exactes ClawHub, les artefacts ClawHub, et les conclusions
   de workflows enfants à partir d'une seule commande. Ajoutez `--rerun-failed-clawhub`ClawHub lorsque le
   sidecar ClawHub a échoué uniquement dans des tâches réessayables et doit être réexécuté sur place.
   Exécutez ensuite l'acceptation du package post-publication sur le package `openclaw@YYYY.M.D-beta.N` ou
   `openclaw@beta` publié. Si une pré-version publiée ou envoyée nécessite une correction,
   coupez le prochain numéro de pré-version correspondant ; ne supprimez pas ou ne réécrivez pas l'ancienne
   pré-version.
10. Pour la version stable, continuer uniquement après que la version bêta ou le candidat à la publication validé dispose des preuves de validation requises. La publication npm stable passe également par npm`OpenClaw Release Publish`, en réutilisant l'artefact de prévol réussi via `preflight_run_id`macOS ; la disponibilité de la version stable macOS nécessite également le `.zip`, `.dmg`, `.dSYM.zip` empaquetés et `appcast.xml` mis à jour sur `main`macOS.
    Le workflow de publication macOS privé publie l'appcast signée vers le `main` public automatiquement après la vérification des assets de publication ; si la protection de branche bloque la poussée directe, il ouvre ou met à jour une PR d'appcast.
11. Après publication, exécutez le vérificateur post-publication npm, le npm E2E autonome publié-Telegram optionnel lorsque vous avez besoin d'une preuve de canal post-publication,
    la promotion des balises de distribution (dist-tag) si nécessaire, vérifiez la page de publication générée GitHub,
    et exécutez les étapes d'annonce de publication.

## Prévol de release

- Exécutez `pnpm check:test-types` avant la prévol de publication afin que le test TypeScript reste couvert en dehors de la porte `pnpm check` locale plus rapide
- Exécutez `pnpm check:architecture` avant la prévol de publication afin que les contrôles du cycle d'importation plus large et des limites de l'architecture soient au vert en dehors de la porte locale plus rapide
- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de publication `dist/*` attendus et le bundle Control UI existent pour l'étape de validation du pack
- Exécutez `pnpm release:prep` après l'incrémentation de la version racine et avant le balisage. Il exécute chaque générateur de publication déterministe qui dérive souvent après un changement de version/configuration/API : les versions des plugins, l'inventaire des plugins, le schéma de configuration de base, les métadonnées de configuration de canal groupées, la ligne de base de la documentation de configuration, les exportations du SDK de plugin et la ligne de base de l'API du SDK de plugin. `pnpm release:check` réexécute ces gardes en mode vérification et signale chaque échec de dérive généré qu'il trouve en une seule passe avant d'exécuter les vérifications de publication du package.
- Exécutez le workflow manuel `Full Release Validation` avant l'approbation de la release pour
  lancer toutes les boîtes de test pré-release à partir d'un seul point d'entrée. Il accepte une branche,
  un tag, ou un SHA de commit complet, déclenche manuel `CI`, et déclenche
  `OpenClaw Release Checks` pour le test de fumée d'installation, l'acceptation du paquet, les vérifications de paquet cross-OS,
  la parité QA Lab, les voies Matrix et Telegram. Les exécutions Stable/default
  gardent les tests complets en direct/E2E et le trempage de la voie de release Docker derrière
  `run_release_soak=true` ; `release_profile=full` force le trempage. Avec
  `release_profile=full` et `rerun_group=all`, il exécute également le paquet Telegram
  E2E sur l'artéfact `release-package-under-test` à partir des vérifications de release.
  Fournissez `release_package_spec` après la publication d'une bêta pour réutiliser le paquet
  npm expédié dans toutes les vérifications de release, l'acceptation du paquet et le paquet Telegram
  E2E sans reconstruire l'archive de release. Fournissez
  `npm_telegram_package_spec` uniquement lorsque Telegram doit utiliser un paquet
  publié différent du reste de la validation de release. Fournissez
  `package_acceptance_package_spec` lorsque l'acceptation du paquet doit utiliser un
  paquet publié différent des spécifications du paquet de release. Fournissez
  `evidence_package_spec` lorsque le rapport de preuve privé doit prouver que la
  validation correspond à un paquet npm publié sans forcer le Telegram E2E.
  Exemple :
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par canal parallèle
  pour un candidat de package pendant que le travail de publication se poursuit. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/étiquette/SHA `package_ref` de confiance avec le harnais
  `workflow_ref` actuel ; `source=url` pour une archive tar HTTPS avec un
  SHA-256 requis ; ou `source=artifact` pour une archive tar téléchargée par une autre exécution
  d'actions GitHub. Le workflow résout le candidat en
  `package-under-test`, réutilise le planificateur de publication E2E Docker contre cette
  archive tar, et peut exécuter la QA Telegram contre la même archive tar avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`. Lorsque les
  voies Docker sélectionnées incluent `published-upgrade-survivor`, l'artefact
  du package est le candidat et `published_upgrade_survivor_baseline` sélectionne
  la base de référence publiée. `update-restart-auth` utilise le package candidat comme
  CLI installé et le package-testé, exerçant ainsi le
  chemin de redémarrage géré de la commande de mise à jour candidate.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : voies install/channel/agent, réseau de passerelle et rechargement de configuration
  - `package` : voies package/update/restart/plugin natives aux artefacts sans OpenWebUI ou ClawHub en direct
  - `product` : profil de package plus canaux MCP, nettoyage cron/sous-agent,
    recherche web OpenAI et OpenWebUI
  - `full` : fragments du chemin de publication Docker avec OpenWebUI
  - `custom` : sélection exacte du `docker_lanes` pour une réexécution ciblée
- Exécutez directement le workflow manuel `CI`Linux lorsque vous avez uniquement besoin d'une couverture CI normale complète pour la version candidate. Les déclenchements manuels de CI contournent le champ d'application des modifications et forcent les shards Node Linux, les shards bundled-plugin, les contrats de canal, la compatibilité Node 22, `check`, `check-additional`WindowsmacOSAndroid, les tests de fumée de build, les vérifications de documentation, les compétences Python, les voies Windows, macOS, Android et i18n de l'interface utilisateur de contrôle. Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de version. Il exerce le QA-lab via un récepteur OTLP/HTTP local et vérifie les noms des span de trace exportés, les attributs bornés et la suppression de contenu/identifiant sans nécessiter Opik, Langfuse ou un autre collecteur externe.
- Exécutez `pnpm release:check` avant chaque version taguée
- Exécutez `OpenClaw Release Publish` pour la séquence de publication avec mutation après l'existence du tag. Déclenchez-le depuis `release/YYYY.M.D` (ou `main`OpenClawnpm lors de la publication d'un tag accessible depuis main), passez le tag de version et le npm `preflight_run_id` OpenClaw réussi, et conservez la portée de publication de plugin par défaut `all-publishable`npmClawHubOpenClawnpm à moins que vous ne exécutiez intentionnellement une réparation ciblée. Le workflow sérialise la publication npm du plugin, la publication ClawHub du plugin et la publication npm d'OpenClaw afin que le package principal ne soit pas publié avant ses plugins externalisés.
- Les vérifications de version s'exécutent désormais dans un workflow manuel distinct : `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également le couloir de parité fictif du QA Lab ainsi que le profil live rapide Matrix et le couloir QA Telegram avant l'approbation de la version. Les couloirs live utilisent l'environnement `qa-live-shared` ; Telegram utilise également des baux d'identifiants CI Convex. Exécutez le workflow manuel `QA-Lab - All Lanes` avec `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet du transport, des médias et de l'E2EE Matrix en parallèle.
- La validation du runtime d'installation et de mise à niveau multi-OS fait partie des versions publiques `OpenClaw Release Checks` et `Full Release Validation`, qui appellent le workflow réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directement.
- Cette séparation est intentionnelle : gardez la vraie voie de publication npm courte, déterministe et axée sur les artefacts, tandis que les vérifications live plus lentes restent dans leur propre voie afin qu'elles ne bloquent pas ou n'entravent pas la publication
- Les vérifications de version contenant des secrets doivent être dispatchées via `Full Release Validation` or from the `main`/release workflow ref afin que la logique du workflow et les secrets restent contrôlés.
- `OpenClaw Release Checks` accepte une branche, une balise ou un SHA de commit complet tant que le commit résolu est accessible à partir d'une branche OpenClaw ou d'une balise de version.
- La pré-vérification de validation uniquement `OpenClaw NPM Release` accepte également le SHA de commit complet actuel de 40 caractères de la branche de workflow sans exiger de balise poussée.
- Ce chemin SHA est réservé à la validation et ne peut être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la vérification des métadonnées du package ; la publication réelle nécessite toujours une balise de version réelle.
- Les deux workflows gardent le chemin réel de publication et de promotion sur les hébergeurs GitHub, tandis que le chemin de validation non-mutant peut utiliser les plus grands hébergeurs Blacksmith Linux
- Ce workflow exécute `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache` en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`.
- La pré-vérification de publication npm n'attend plus la voie distincte des vérifications de publication
- Avant de baliser localement un candidat à la publication, exécutez `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. L'outil d'aide exécute les garde-fous de version rapide, les vérifications de version de plugin npm/ClawHub, le build, le build de l'interface utilisateur et `release:openclaw:npm:check` dans l'ordre qui détecte les erreurs courantes bloquant l'approbation avant le début du workflow de publication GitHub.
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts` (ou la balise bêta/correction correspondante) avant l'approbation.
- Après la publication npm, exécutez
  npm`node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le registre publié
  et le chemin d'installation dans un préfixe temporaire frais
- Après une publication bêta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`TelegramTelegramnpmTelegram
  pour vérifier l'onboarding du paquet installé, la configuration Telegram, et la E2E Telegram réelle
  contre le paquet npm publié en utilisant le pool partagé de crédentials loués Telegram.
  Les tests ponctuels des mainteneurs locaux peuvent omettre les vars Convex et passer les trois
  identifiants d'environnement `OPENCLAW_QA_TELEGRAM_*` directement.
- Pour exécuter le test complet de fumée post-publication bêta depuis une machine de mainteneur, utilisez `pnpm release:beta-smoke -- --beta betaN`npm. L'assistant exécute la validation de mise à jour/cible fraîche Parallels npm, dispatche `NPM Telegram Beta E2E`Telegram, interroge l'exécution exacte du workflow, télécharge l'artefact et imprime le rapport Telegram.
- Les mainteneurs peuvent exécuter la même vérification post-publication depuis GitHub Actions via le
  workflow manuel GitHub`NPM Telegram Beta E2E`. Il est intentionnellement uniquement manuel et
  ne s'exécute pas à chaque fusion.
- L'automatisation de publication des mainteneurs utilise désormais préflight-then-promote :
  - la publication npm réelle doit réussir un npm npmnpm`preflight_run_id` réussi
  - la publication npm réelle doit être dispatchée depuis la même branche npm`main` ou
    `release/YYYY.M.D` que l'exécution de préflight réussie
  - les versions stables npm sont npm`beta` par défaut
  - la publication npm stable peut cibler npm`latest` explicitement via l'entrée du workflow
  - la mutation du tag de distribution npm basée sur des jetons réside désormais dans
    npm`openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    par sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` alors que
    le dépôt public conserve une publication uniquement OIDC
  - la `macOS Release` publique sert uniquement à la validation ; lorsqu'une étiquette n'existe que sur une
    branche de version mais que le workflow est déclenché depuis `main`, définissez
    `public_release_branch=release/YYYY.M.D`
  - la vraie publication privée mac doit réussir les `preflight_run_id` et `validate_run_id` privées mac
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les corrections de version stable comme `YYYY.M.D-N`, le vérificateur post-publication
  vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne puissent pas laisser silencieusement d'anciennes installations globales sur le
  contenu stable de base
- la pré-publication de version npm échoue de manière fermée à moins que l'archive ne contienne à la fois
  `dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide
  afin que nous ne livrions plus jamais un tableau de bord navigateur vide
- La vérification post-publication vérifie également que les points d'entrée des plugins publiés et
  les métadonnées des packages sont présents dans la disposition du registre installé. Une version qui
  livre des charges utuelles d'exécution de plugin manquantes échoue au vérificateur post-publication et
  ne peut être promue vers `latest`.
- `pnpm test:install:smoke` applique également le budget `unpackedSize` du npm pack sur
  l'archive de mise à jour candidate, de sorte que l'installateur e2e détecte le gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de publication a touché la planification CI, les manifestes de minutage d'extension, ou
  les matrices de test d'extension, régénérez et examinez les sorties de matrice `plugin-prerelease-extension-shard`
  détenues par le planificateur à partir de
  `.github/workflows/plugin-prerelease.yml` avant approbation afin que les notes de version ne
  décrivent pas une disposition CI obsolète
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la version GitHub doit se retrouver avec le `.zip` empaqueté, `.dmg` et `.dSYM.zip`
  - `appcast.xml` sur `main`macOS doit pointer vers le nouveau zip stable après la publication ; le
    workflow de publication privé macOS le commite automatiquement, ou ouvre une PR appcast
    lorsque le push direct est bloqué
  - l'application empaquetée doit conserver un identifiant de bundle non de débogage, une URL de flux Sparkle
    non vide et un `CFBundleVersion` supérieur ou égal au plancher de build Sparkle canonique
    pour cette version de publication

## Release test boxes

`Full Release Validation` est le moyen par lequel les opérateurs lancent tous les tests de pré-publication à partir
d'un seul point d'entrée. Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez
l'assistant afin que chaque workflow enfant s'exécute à partir d'une branche temporaire fixée au SHA
cible :

```bash
pnpm ci:full-release --sha <full-sha>
```

L'assistant push `release-ci/<sha>-...`, dispatche `Full Release Validation`
à partir de cette branche avec `ref=<sha>`, vérifie que chaque workflow enfant `headSha`
correspond à la cible, puis supprime la branche temporaire. Cela évite de prouver par inadvertance un
`main` enfant plus récent.

Pour la validation de branche de publication ou de balise, exécutez-le à partir de la référence de workflow `main` de confiance
et passez la branche ou la balise de publication en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

Le workflow résout la référence cible, distribue manuellement `CI` avec
`target_ref=<release-ref>`, distribue `OpenClaw Release Checks`, prépare un
artefact parent `release-package-under-test` pour les vérifications orientées paquet, et
distribue le E2E de paquet autonome Telegram lorsque `release_profile=full` avec
`rerun_group=all` ou lorsque `release_package_spec` ou
`npm_telegram_package_spec` est défini. `Vérifications de version
OpenClaw` répartit ensuite les tests de fumée d'installation, les vérifications de version multi-OS, la couverture du chemin de version en direct/E2E Docker
lorsque le soak est activé, l'acceptation du paquet avec le QA de paquet Telegram,
la parité du Lab QA, le Matrix en direct et le Telegram en direct. Une exécution complète n'est acceptable que lorsque le
résumé `Full Release Validation`
indique `normal_ci` et `release_checks` comme réussis. En mode complet/all,
l'enfant `npm_telegram` doit également être réussi ; en dehors du mode complet/all, il est ignoré
sauf si un `release_package_spec` ou `npm_telegram_package_spec` publié a été
fourni. Le résumé final du vérificateur inclut des tableaux des tâches les plus lentes pour chaque exécution enfant, afin que le responsable de la version puisse voir le chemin critique actuel sans télécharger les journaux.
Voir [Validation complète de version](/fr/reference/full-release-validation) pour la
matrice complète des étapes, les noms exacts des tâches de workflow, les différences entre le profil stable et complet, les artefacts et les gestionnaires de réexécution ciblés.
Les workflows enfants sont distribués depuis la référence approuvée qui exécute `Validation complète de
version`, normally `--ref main`, even when the target `ref` pointe vers une
branche ou une balise de version plus ancienne. Il n'y a pas d'entrée séparée pour la référence de workflow de validation complète de version ; choisissez le harnais approuvé en choisissant la référence d'exécution du workflow.
N'utilisez pas `--ref main -f ref=<sha>` pour la preuve exacte de commit sur le `main` mobile ;
les SHA de commit bruts ne peuvent pas être des références de distribution de workflow, utilisez donc
`pnpm ci:full-release --sha <sha>` pour créer la branche temporaire épinglée.

Utilisez `release_profile` pour sélectionner l'étendue en direct/provider :

- `minimum`OpenAIDocker : chemin le plus rapide critique pour la version OpenAI/core en direct et Docker
- `stable` : minimum plus couverture stable provider/backend pour l'approbation de version
- `full` : stable plus large couverture consultative provider/médias

Utilisez `run_release_soak=true` avec `stable`Docker lorsque les voies bloquant la version sont
débloquées et que vous souhaitez le balayage complet live/E2E, du chemin de version Docker, et
des survivants de mise à niveau publiés bornés avant la promotion. Ce balayage couvre
les quatre derniers packages stables plus les lignes de base épinglées `2026.4.23` et `2026.5.2`
plus la couverture `2026.4.15`Docker plus ancienne, avec les lignes de base en double supprimées et
chaque ligne de base fragmentée dans son propre job de runner Docker. `full` implique
`run_release_soak=true`.

`OpenClaw Release Checks` utilise la ref de workflow de confiance pour résoudre la ref
cible une fois comme `release-package-under-test`Dockernpm et réutilise cet artefact dans les vérifications cross-OS,
d'acceptation de package, et du chemin de version Docker lors des exécutions de trempage. Cela permet de garder
toutes les boîtes orientées package sur les mêmes octets et d'éviter les builds de package répétés.
Une fois qu'une bêta est déjà sur npm, définissez `release_package_spec=openclaw@YYYY.M.D-beta.N`
pour que les vérifications de version téléchargent le package expédié une fois, extraient son build source
SHA de `dist/build-info.json`DockerTelegramOpenAI, et réutilisent cet artefact pour les voies cross-OS,
d'acceptation de package, du chemin de version Docker, et Telegram de package.
Le test de fumée d'installation OpenAI cross-OS utilise `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsque la
variable repo/org est définie, sinon `openai/gpt-5.4`, car cette voie prouve
l'installation du package, l'onboarding, le démarrage de la passerelle et un tour d'agent en direct
plutôt que de benchmark le modèle le plus lent par défaut. La matrice plus large de provider en direct
reste l'endroit pour la couverture spécifique au modèle.

Utilisez ces variantes selon l'étape de la version :

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

N'utilisez pas l'ensemble complet comme première réexécution après une correction ciblée. Si une boîte échoue, utilisez le workflow enfant, le travail, la voie Docker, le profil de package, le fournisseur de modèle ou la voie QA ayant échoué pour la prochaine vérification. Réexécutez l'ensemble complet uniquement lorsque la correction a modifié l'orchestration partagée de la publication ou a rendu obsolètes les preuves précédentes de toutes les boîtes. Le vérificateur final de l'ensemble vérifie à nouveau les identifiants d'exécution enregistrés des workflows enfants, donc après la réexécution réussie d'un workflow enfant, réexécutez uniquement le travail parent Docker`Verify full validation` ayant échoué.

Pour une récupération limitée, passez `rerun_group` à l'ensemble. `all` est la véritable exécution de candidat à la publication, `ci` exécute uniquement l'enfant CI normal, `plugin-prerelease` exécute uniquement l'enfant du plugin de publication uniquement, `release-checks` exécute chaque boîte de publication, et les groupes de publication plus restreints sont `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` et `npm-telegram`. Les réexécutions ciblées de `npm-telegram` nécessitent `release_package_spec` ou `npm_telegram_package_spec` ; les exécutions complètes/totales avec `release_profile=full` utilisent l'artefact du package release-checks. Les réexécutions ciblées multi-OS peuvent ajouter `cross_os_suite_filter=windows/packaged-upgrade` ou un autre filtre de système d'exploitation/suite. Les échecs des release-checks QA sont consultatifs ; un échec QA uniquement ne bloque pas la validation de la publication.

### Vitest

La boîte Vitest est le workflow enfant `CI` manuel. Le CI manuel contourne intentionnellement la portée des modifications et force le graphique de tests normal pour le candidat à la publication : fragments de nœuds Linux, fragments de plugins regroupés, contrats de canal, compatibilité Node 22, `check`, `check-additional`, test de fumée de build, vérifications de docs, compétences Python, Windows, macOS, Android et i18n de l'interface utilisateur de contrôle.

Utilisez cette case pour répondre à « l'arborescence source a-t-elle réussi la suite de tests normale complète ? »
Ce n'est pas la même chose que la validation produit du chemin de publication (release-path). Preuves à conserver :

- `Full Release Validation` résumé montrant l'URL de l'exécution `CI` envoyée
- exécution `CI` réussie sur le SHA cible exact
- noms de partitions (shards) échouées ou lentes provenant des tâches CI lors de l'investigation des régressions
- artefacts de minutage Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une
  exécution nécessite une analyse des performances

Exécutez le CI manuel directement uniquement lorsque la publication nécessite un CI normal déterministe mais
pas les cases Docker, QA Lab, live, cross-OS ou package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

La case Docker réside dans Docker`OpenClaw Release Checks` via
`openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow
`install-smoke`Docker en mode publication. Elle valide le candidat à la publication via des
environnements Docker empaquetés au lieu de tests uniquement au niveau source.

La couverture Docker de la publication inclut :

- test de fumée d'installation complète avec le test de fumée d'installation globale lente de Bun activé
- préparation/réutilisation de l'image de test de fumée du Dockerfile racine par SHA cible, avec QR,
  root/gateway, et les tâches de test de fumée installateur/Bun s'exécutant en tant que partitions
  install-smoke distinctes
- voies E2E du dépôt
- fragments Docker release-path : Docker`core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g`, et `plugins-runtime-install-h`
- couverture OpenWebUI à l'intérieur du fragment `plugins-runtime-services` lorsque demandé
- voies d'installation/désinstallation de plugins groupés divisées
  `bundled-plugin-install-uninstall-0` via
  `bundled-plugin-install-uninstall-23`
- suites de fournisseurs live/E2E et couverture de modèle live Docker lorsque les vérifications de
  publication incluent des suites live

Utilisez les artefacts Docker avant de réexécuter. Le planificateur de chemin de publication (release-path scheduler) télécharge `.artifacts/docker-tests/` avec les journaux de voie (lane logs), `summary.json`, `failures.json`, les timings de phase, le plan du planificateur JSON et les commandes de réexécution. Pour une récupération ciblée, utilisez `docker_lanes=<lane[,lane]>` sur le workflow live/E2E réutilisable au lieu de réexécuter tous les morceaux de publication. Les commandes de réexécution générées incluent les `package_artifact_run_id` antérieurs et les entrées d'image Docker préparées lorsqu'elles sont disponibles, donc une voie en échec peut réutiliser la même archive (tarball) et les images GHCR.

### QA Lab

La boîte QA Lab fait également partie de `OpenClaw Release Checks`. Il s'agit du comportement agentique et de la porte de publication au niveau du canal (channel-level release gate), distincte de la mécanique de paquetage Vitest et Docker.

La couverture du QA Lab de publication comprend :

- voie de parité simulée (mock parity lane) comparant la voie candidate OpenAI à la ligne de base Opus 4.6 en utilisant le pack de parité agentique
- profil QA live rapide Matrix utilisant l'environnement `qa-live-shared`
- voie QA live Telegram utilisant les baux d'identification Convex CI
- `pnpm qa:otel:smoke` lorsque la télémétrie de publication nécessite une preuve locale explicite

Utilisez cette boîte pour répondre à la question « la publication se comporte-t-elle correctement dans les scénarios QA et les flux de canal en direct ? ». Conservez les URL d'artefacts pour les voies de parité, Matrix et Telegram lors de l'approbation de la publication. La couverture complète Matrix reste disponible en tant que exécution manuelle partitionnée QA-Lab plutôt que la voie critique de publication par défaut.

### Package

La boîte Package est la porte du produit installable. Elle est soutenue par `Package Acceptance` et le résolveur `scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un candidat dans l'archive tar `package-under-test` consommée par Docker E2E, valide l'inventaire des paquets, enregistre la version du paquet et le SHA-256, et maintient la référence du harnais de workflow séparée de la référence source du paquet.

Sources candidates prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte OpenClaw
- `source=ref` : empaqueter une branche `package_ref` de confiance, une étiquette ou un SHA de commit complet
  avec le faisceau `workflow_ref` sélectionné
- `source=url` : télécharger un `.tgz` HTTPS avec les `package_sha256` requises
- `source=artifact` : réutiliser un `.tgz`GitHub téléchargé par une autre exécution GitHub Actions

`OpenClaw Release Checks` exécute l'acceptation de package (Package Acceptance) avec `source=artifact`, l'artefact
de package de version préparé, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`ClawHubTelegram. L'acceptation de package maintient la migration, la mise à jour,
le redémarrage de mise à jour avec auth configuré, l'installation en direct de la compétence ClawHub, le nettoyage des dépendances de plugin obsolètes, les fixtures de plugin hors ligne,
la mise à jour de plugin et la QA de package Telegram sur le même tarball résolu.
Les vérifications de version bloquantes utilisent la ligne de base par défaut du dernier package
publié ; `run_release_soak=true` ou
`release_profile=full`npm s'étend à chaque ligne de base stable publiée sur npm de
`2026.4.23` à `latest` plus les fixtures de problèmes signalés. Utilisez
l'acceptation de package avec `source=npm` pour un candidat déjà livré, ou
`source=ref`/`source=artifact`npmGitHub pour un tarball npm local basé sur un SHA avant
publication. C'est le remplacement natif GitHub
pour la plupart de la couverture de package/mise à jour qui nécessitait précédemment
Parallels. Les vérifications de version multi-OS sont toujours importantes pour l'intégration,
l'installateur et le comportement de la plateforme spécifiques à l'OS, mais la validation
produit de package/mise à jour devrait préférer l'acceptation de package.

La liste de contrôle canonique pour la validation des mises à jour et des plugins est
[Test des mises à jour et des plugins](/fr/help/testing-updates-plugins). Utilisez-lorsque vous décidez quelle voie locale, Docker, d'acceptation de package ou de vérification de release prouve un changement d'installation/de mise à jour de plugin, de nettoyage de docteur ou de migration de package publié. La migration exhaustive des mises à jour publiées à partir de chaque package stable `2026.4.23+` est un workflow manuel `Update Migration` distinct, et ne fait pas partie du CI de Release Complète.

La clémence héritée en matière d'acceptation des packages est volontairement limitée dans le temps. Les packages jusqu'à `2026.4.25` peuvent utiliser le chemin de compatibilité pour les lacunes de métadonnées déjà publiées sur npm : entrées d'inventaire QA privées manquantes dans l'archive, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le montage git dérivé de l'archive, `update.channel` persisté manquant, emplacements hérités des enregistrements d'installation de plugins, persistance manquante des enregistrements d'installation du marketplace, et migration des métadonnées de configuration pendant `plugins update`. Le package `2026.4.26` publié peut avertir concernant les fichiers d'horodatage des métadonnées de build local qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire les contrats de package modernes ; ces mêmes lacunes entraînent l'échec de la validation de la release.

Utilisez des profils d'acceptation de package plus larges lorsque la question de la release concerne un
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

- `smoke` : voies rapides d'installation de package/channel/agent, de réseau de passerelle et de
  rechargement de configuration
- `package` : contrats de package d'installation/mise à jour/redémarrage/plugin plus preuve d'installation de compétence ClawHub en direct ; ceci est la valeur par défaut de release-check
- `product` : `package` plus les channels MCP, le nettoyage cron/subagent, la recherche web OpenAI et OpenWebUI
- `full` : morceaux de chemin de release Docker avec OpenWebUI
- `custom` : liste `docker_lanes` exacte pour les réexécutions ciblées

Pour la preuve Telegram des candidats au paquet, activez Telegram`telegram_mode=mock-openai` ou `telegram_mode=live-frontier` lors de l'acceptation du paquet. Le workflow transmet l'archive tarball `package-under-test`Telegram résolue à la voie Telegram ; le workflow autonome Telegram accepte toujours une spécification npm publiée pour les vérifications post-publication.

## Automatisation de la publication des versions

`OpenClaw Release Publish` est le point d'entrée de publication modifiant normal. Il orchestre les workflows de trusted-publisher dans l'ordre requis par la version :

1. Extrayez le tag de la version et résolvez son SHA de commit.
2. Vérifiez que le tag est accessible depuis `main` ou `release/*`.
3. Exécutez `pnpm plugins:sync:check`.
4. Déclenchez `Plugin NPM Release` avec `publish_scope=all-publishable` et
   `ref=<release-sha>`.
5. Déclenchez `Plugin ClawHub Release` avec le même scope et SHA.
6. Déclenchez `OpenClaw NPM Release` avec le tag de version, le dist-tag npm, et
   `preflight_run_id` enregistré.

Exemple de publication beta :

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Publication stable vers le dist-tag beta par défaut :

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

Utilisez les workflows de niveau inférieur `Plugin NPM Release` et `Plugin ClawHub Release` uniquement pour des réparations ou des republications ciblées. Pour une réparation de plugin sélectionnée, passez `plugin_publish_scope=selected` et `plugins=@openclaw/name` à `OpenClaw Release Publish`, ou déclenchez le workflow enfant directement lorsque le paquet OpenClaw ne doit pas être publié.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1` ; lorsque `preflight_only=true`, il peut aussi être le
  SHA de commit de 40 caractères complet de la branche de workflow actuelle pour une pré-vérification de validation uniquement
- `preflight_only` : `true` pour la validation/build/package uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel pour que le workflow réutilise
  l'archive tarball préparée lors de l'exécution réussie de la préflight
- `npm_dist_tag` : balise cible npm pour le chemin de publication ; la valeur par défaut est `beta`

`OpenClaw Release Publish` accepte ces entrées contrôlées par l'opérateur :

- `tag` : balise de version requise ; doit déjà exister
- `preflight_run_id` : ID d'exécution de préflight réussie `OpenClaw NPM Release` ;
  requis lorsque `publish_openclaw_npm=true`
- `npm_dist_tag` : balise cible npm pour le package OpenClaw
- `plugin_publish_scope` : la valeur par défaut est `all-publishable` ; utilisez `selected` uniquement
  pour les travaux de réparation ciblés
- `plugins` : noms de packages `@openclaw/*` séparés par des virgules lorsque
  `plugin_publish_scope=selected`
- `publish_openclaw_npm` : la valeur par défaut est `true` ; définissez `false` uniquement lors de l'utilisation du
  workflow en tant qu'orchestrateur de réparation plugin-only
- `wait_for_clawhub` : la valeur par défaut est `false` afin que la disponibilité npm ne soit pas bloquée par
  le sidecar ClawHub ; définissez `true` uniquement lorsque la fin du workflow doit inclure
  la fin de ClawHub

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : branche, balise ou SHA de commit complet à valider. Les vérifications contenant des secrets
  nécessitent que le commit résolu soit accessible à partir d'une branche OpenClaw ou
  d'une balise de version.
- `run_release_soak` : activer les tests exhaustifs en direct/E2E, le chemin de publication Docker et
  le soak all-since upgrade-survivor sur les vérifications de version stables/définies par défaut. Il est forcé
  activé par `release_profile=full`.

Règles :

- Les balises stables et de correction peuvent être publiées sur `beta` ou `latest`
- Les balises de préversion bêta peuvent être publiées uniquement sur `beta`
- Pour `OpenClaw NPM Release`, la saisie du SHA de commit complet est autorisée uniquement lorsque `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours des validations uniquement
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors des vérifications préliminaires ; le workflow vérifie ces métadonnées avant que la publication ne se poursuive

## Séquence de publication stable npm

Lors de la création d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise n'existe, vous pouvez utiliser le SHA de commit complet actuel de la branche de workflow pour un essai à blanc de validation uniquement du workflow de vérification préliminaire
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de publication, la balise de publication ou le SHA de commit complet lorsque vous souhaitez une CI normale plus une couverture en temps réel du cache de prompt, Docker, QA Lab, Matrix et Telegram à partir d'un workflow manuel
4. Si vous avez intentionnellement uniquement besoin du graphe de tests normal déterministe, exécutez plutôt le workflow manuel `CI` sur la référence de publication
5. Enregistrez le `preflight_run_id` réussi
6. Exécutez `OpenClaw Release Publish` avec le même `tag`, le même `npm_dist_tag` et le `preflight_run_id` enregistré ; il publie les plugins externalisés vers npm et ClawHub avant de promouvoir le package OpenClaw npm
7. Si la publication a atterri sur `beta`, utilisez le workflow privé `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` pour promouvoir cette version stable de `beta` vers `latest`
8. Si la publication de la version est volontairement faite directement sur `latest` et que `beta` doit suivre immédiatement le même build stable, utilisez le même workflow privé pour pointer les deux dist-tags vers la version stable, ou laissez sa synchronisation planifiée de guérison automatique déplacer `beta` plus tard

La mutation du dist-tag réside dans le dépôt privé pour des raisons de sécurité car elle nécessite encore `NPM_TOKEN`, tandis que le dépôt public conserve une publication uniquement par OIDC.

Cela permet de garder le chemin de publication directe et le chemin de promotion via la bêta tous deux documentés et visibles par les opérateurs.

Si un mainteneur doit revenir à l'authentification locale npm, exécutez toutes les commandes de la CLI (`op`) 1Password uniquement dans une session tmux dédiée. N'appelez pas `op` directement depuis le shell de l'agent principal ; le garder à l'intérieur de tmux rend les invites, les alertes et la gestion des OTP observables et évite les alertes répétées de l'hôte.

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

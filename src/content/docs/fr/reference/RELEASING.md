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
6. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`npm. Avant l'existence d'un tag,
   un SHA complet de 40 caractères de la branche de release est autorisé pour un prévol
   de validation uniquement. Le prévol génère des preuves de release des dépendances pour le
   graphe de dépendances exact extrait et les stocke dans l'artefact de prévol
   npm. Enregistrez le `preflight_run_id` réussi.
7. Lancer tous les tests de pré-version avec `Full Release Validation` pour la
   branche de version, le tag ou le SHA de commit complet. Il s'agit de l'unique point d'entrée manuel
   pour les quatre grandes boîtes de test de version : Vitest, Docker, QA Lab et Package.
8. Si la validation échoue, corrigez sur la branche de publication et relancez le plus petit fichier, lane, tâche de workflow, profil de package, fournisseur, ou liste d'autorisation de modèle ayant échoué et prouvant la correction. Relancez le parapluie complet uniquement lorsque la surface modifiée rend les preuves précédentes obsolètes.
9. Pour la version bêta, taguez `vYYYY.M.D-beta.N`, puis exécutez `pnpm release:candidate -- --tag
vYYYY.M.D-beta.N` from the matching `npmTelegramnpmClawHubrelease/YYYY.M.D` branche. L'outil d'assistance exécute
   les vérifications de version générée localement, envoie ou vérifie la validation complète de la version
   et les preuves de prévol npm, exécute Parallels et la preuve de paquet
   Telegram, enregistre les plans npm des plugins et ClawHub, et imprime la commande exacte
   `OpenClaw Release Publish` uniquement après que le paquet de preuves est vert.
   `OpenClaw Release Publish`npmClawHubOpenClawnpmnpmOpenClawnpmGitHub envoie les plugins sélectionnés ou publiales
   vers npm et le même ensemble vers ClawHub en parallèle, puis promeut l'artefact
   de prévol npm OpenClaw préparé avec le dist-tag correspondant dès que
   la publication npm du plugin réussit.
   Une fois que l'enfant de publication npm OpenClaw réussit, il crée ou met à jour la
   page de version/préversion GitHub correspondante à partir de la section correspondante complète
   `CHANGELOG.md`npm. Les versions stables publiées sur npm `latest`GitHubnpm deviennent la
   dernière version GitHub ; les versions de maintenance stables conservées sur npm `beta`GitHub sont
   créées avec GitHub `latest=false`GitHub. Le workflow télécharge également les preuves de dépendances de prévol
   vers la version GitHub en tant que
   `openclaw-<version>-dependency-evidence.zip`GitHubOpenClawnpmClawHubOpenClawnpm pour la réponse aux incidents
   post-publication. Le workflow de publication imprime immédiatement les ID d'exécution enfants, approuve automatiquement
   les portes d'environnement de publication que le jeton de workflow est autorisé à approuver, résume
   les travaux enfants échoués avec les fins de journaux, clôture la version GitHub et les preuves
   de dépendances dès que la publication npm OpenClaw réussit, attend ClawHub chaque fois que
   npm OpenClaw est en cours de publication, puis exécute `pnpm release:verify-beta`GitHubnpmnpmClawHubTelegramClawHubCLI et
   télécharge les preuves post-publication pour la version GitHub, le paquet npm, les paquets
   npm de plugins sélectionnés, les paquets ClawHub sélectionnés, les ID d'exécution de workflow enfants, et
   l'ID d'exécution NPM Telegram facultatif. Le chemin ClawHub réessaie les échecs d'installation
   de dépendances CLI transitoires, publie les plugins réussissant l'aperçu même si une
   cellule d'aperçu échoue, et se termine par une vérification du registre pour chaque version de
   plugin attendue afin que les publications partielles restent visibles et réessayables. Exécutez ensuite l'acceptation de paquet
   post-publication par rapport au paquet publié
   `openclaw@YYYY.M.D-beta.N` ou
   `openclaw@beta`. Si une préversion publiée ou transmise nécessite une correction,
   coupez le numéro de préversion correspondant suivant ; ne supprimez pas ou ne réécrivez pas l'ancienne
   préversion.
10. Pour une version stable, ne continuer qu'une fois la version bêta ou le candidat à la publication validé dispose des preuves de validation requises. La publication npm stable passe également par npm`OpenClaw Release Publish`, en réutilisant l'artefact de prévol réussi via `preflight_run_id`macOS ; la préparation de la version stable macOS nécessite également le `.zip` packagé, `.dmg`, `.dSYM.zip`, et `appcast.xml` mis à jour sur `main`macOS.
    Le workflow de publication privé macOS publie l'appcast signé vers le public `main` automatiquement après vérification des assets de version ; si la protection de branche bloque la poussée directe, il ouvre ou met à jour une PR appcast.
11. Après publication, exécutez le vérificateur post-publication npm, le npm E2E autonome publié-Telegram optionnel lorsque vous avez besoin d'une preuve de canal post-publication,
    la promotion des balises de distribution (dist-tag) si nécessaire, vérifiez la page de publication générée GitHub,
    et exécutez les étapes d'annonce de publication.

## Prévol de release

- Exécutez `pnpm check:test-types` avant la prévol de publication afin que le test TypeScript reste couvert en dehors de la passerelle locale plus rapide `pnpm check`
- Exécutez `pnpm check:architecture` avant la prévol de publication afin que les contrôles du cycle d'importation plus large et des limites de l'architecture soient au vert en dehors de la passerelle locale plus rapide
- Exécutez `pnpm build && pnpm ui:build` avant `pnpm release:check` afin que les artefacts de version `dist/*` attendus et le bundle Control UI existent pour l'étape de validation du pack
- Exécutez `pnpm release:prep` après l'incrémentation de la version racine et avant le marquage. Il exécute chaque générateur de version déterministe qui dérive généralement après un changement de version/config/API : versions des plugins, inventaire des plugins, schéma de configuration de base, métadonnées de configuration de canal groupées, ligne de base de la documentation de configuration, exportations du SDK de plugin et ligne de base du API du SDK de plugin. `pnpm release:check` réexécute ces gardes en mode vérification et signale chaque échec de dérive généré qu'il trouve en une seule passe avant d'exécuter les vérifications de publication du package.
- Exécutez le workflow manuel `Full Release Validation` avant l'approbation de la version pour
  lancer toutes les boîtes de test de pré-publication à partir d'un point d'entrée unique. Il accepte une branche,
  un tag ou un SHA de commit complet, dispatche le manuel `CI`, et dispatche
  `OpenClaw Release Checks` pour le test de fumée d'installation, l'acceptation des paquets, les vérifications
  de paquets multi-OS, la parité QA Lab, les voies Matrix et Telegram. Les exécutions Stable/défaut
  gardent les tests exhaustifs en direct/E2E et le soak du chemin de publication Docker derrière
  `run_release_soak=true` ; `release_profile=full` force l'activation du soak. Avec
  `release_profile=full` et `rerun_group=all`, il exécute également les tests E2E de paquet Telegram
  sur l'artefact `release-package-under-test` des vérifications de version.
  Fournissez `release_package_spec` après la publication d'une bêta pour réutiliser le paquet
  npm expédié à travers les vérifications de version, l'acceptation des paquets et les tests E2E de paquet Telegram
  sans reconstruire l'archive de la version. Fournissez
  `npm_telegram_package_spec` uniquement lorsque Telegram doit utiliser un
  paquet publié différent du reste de la validation de version. Fournissez
  `package_acceptance_package_spec` lorsque l'acceptation des paquets doit utiliser
  un paquet publié différent des spécifications du paquet de version. Fournissez
  `evidence_package_spec` lorsque le rapport de preuve privé doit prouver que la
  validation correspond à un paquet npm publié sans forcer les tests E2E Telegram.
  Exemple :
  `gh workflow run full-release-validation.yml --ref main -f ref=release/YYYY.M.D`
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par canal latéral
  pour un candidat de package pendant que le travail de publication continue. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/étiquette/SHA `package_ref` de confiance avec le harnais
  `workflow_ref` actuel ; `source=url` pour une archive tar HTTPS avec un
  SHA-256 requis ; ou `source=artifact`GitHub pour une archive tar téléchargée par une autre exécution
  GitHub Actions. Le workflow résout le candidat en
  `package-under-test`, réutilise le planificateur de publication E2E Docker contre cette
  archive, et peut exécuter la QA Telegram contre la même archive avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`. Lorsque les
  voies Docker sélectionnées incluent `published-upgrade-survivor`, l'artefact
  du package est le candidat et `published_upgrade_survivor_baseline` sélectionne
  la base de référence publiée. `update-restart-auth` utilise le package candidat à la fois
  comme CLI installé et comme package-testé, exerçant ainsi le
  chemin de redémarrage géré de la commande de mise à jour candidate.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : voies install/channel/agent, réseau de passerelle et rechargement de configuration
  - `package` : voies package/update/restart/plugin natives de l'artefact sans OpenWebUI ou ClawHub en direct
  - `product` : profil de package plus channels MCP, nettoyage cron/subagent,
    recherche web OpenAI et OpenWebUI
  - `full` : fragments de chemin de publication Docker avec OpenWebUI
  - `custom` : sélection exacte de `docker_lanes` pour une réexécution ciblée
- Exécutez le workflow `CI` manuel directement lorsque vous avez uniquement besoin d'une couverture CI normale complète pour le candidat à la publication. Les répartitions CI manuelles contournent la portée des modifications et forcent les shards Node Linux, les shards bundled-plugin, les shards plugin et channel contract, la compatibilité Node 22, `check-*`, `check-additional-*`, les contrôles de fumée des artefacts construits, les contrôles de documentation, les compétences Python, Windows, macOS, Android, et les voies d'internationalisation de l'interface de contrôle. Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de publication. Il exerce le QA-lab via un récepteur OTLP/HTTP local et vérifie les noms des spans de trace exportés, les attributs bornés et le masquage du contenu/identifiant sans nécessiter Opik, Langfuse ou un autre collecteur externe.
- Exécutez `pnpm release:check` avant chaque publication balisée
- La pré-vérification `OpenClaw NPM Release` génère des preuves de publication des dépendances avant de compresser l'archive tarball npm. La barrière de vulnérabilité d'avis npm bloque la publication. Le risque de manifeste transitif, la surface de propriété/d'installation des dépendances et les rapports de changement de dépendances ne sont que des preuves de publication. Le rapport de changement de dépendances compare le candidat à la publication avec la balise de publication précédente accessible.
- La pré-vérification télécharge les preuves de dépendances en tant que `openclaw-release-dependency-evidence-<tag>` et les intègre également sous `dependency-evidence/` à l'intérieur de l'artefact de pré-vérification npm préparé. Le chemin de publication réel réutilise cet artefact de pré-vérification, puis attache les mêmes preuves à la publication GitHub en tant que `openclaw-<version>-dependency-evidence.zip`.
- Exécutez `OpenClaw Release Publish` pour la séquence de publication avec mutation après que
  le tag existe. Déclenchez-le depuis `release/YYYY.M.D` (ou `main` lors de la publication d'un
  tag atteignable depuis main), transmettez le tag de version et le OpenClaw npm `preflight_run_id` réussi d'OpenClaw,
  et gardez la portée de publication du plugin par défaut `all-publishable` sauf si vous exécutez délibérément une réparation ciblée. Le
  workflow sérialise la publication npm des plugins, la publication plugin ClawHub et la publication OpenClaw npm d'OpenClaw afin que le package principal ne soit pas publié avant ses plugins externalisés.
- Les vérifications de version s'exécutent désormais dans un workflow manuel distinct :
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également la voie de parité de simulation QA Lab ainsi que le profil Matrix en direct rapide et la voie QA Telegram avant l'approbation de la version. Les voies
  en direct utilisent l'environnement `qa-live-shared` ; Telegram utilise également des baux d'informations d'identification Convex CI.
  Exécutez le workflow manuel `QA-Lab - All Lanes` avec `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet du transport, des médias et de l'E2EE Matrix en parallèle.
- La validation du runtime d'installation et de mise à niveau multi-OS fait partie des vérifications publiques
  `OpenClaw Release Checks` et `Full Release Validation`, qui appellent le
  workflow réutilisable `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directement
- Cette séparation est intentionnelle : gardez le chemin réel de publication npm court,
  déterministe et axé sur les artefacts, tandis que les vérifications en direct plus lentes restent dans leur
  propre voie afin qu'elles ne bloquent pas ou n'interrompent pas la publication
- Les vérifications de version contenant des secrets doivent être déclenchées via la référence de workflow `Full Release
Validation` or from the `main`/release afin que la logique du workflow et les
  secrets restent contrôlés
- `OpenClaw Release Checks` accepte une branche, un tag ou un SHA de commit complet tant
  que le commit résolu est accessible depuis une branche OpenClaw ou un tag de version
- `OpenClaw NPM Release` validation-only preflight accepte également le SHA de commit complet de 40 caractères de la branche de workflow sans nécessiter de balise poussée
- Ce chemin SHA est réservé à la validation et ne peut pas être promu en une vraie publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la vérification des métadonnées du package ; la vraie publication nécessite toujours une vraie balise de version
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners hébergés par GitHub, tandis que le chemin de validation sans mutation peut utiliser les plus grands runners Blacksmith Linux
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- La prépublication de version npm n'attend plus la file de vérification de version séparée
- Avant de baliser localement un candidat à la publication, exécutez
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. L'assistant
  exécute les garde-fous de version rapides, les vérifications de publication des plugins npm/ClawHub, le build,
  le build de l'UI et `release:openclaw:npm:check` dans un ordre qui détecte les erreurs
  bloquantes courantes avant le début du workflow de publication GitHub.
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise bêta/correction correspondante) avant l'approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire frais
- Après une publication bêta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  pour vérifier l'onboarding des packages installés, la configuration Telegram et le E2E réel Telegram
  contre le package npm publié en utilisant le pool d'identifiants
  Telegram loués partagés. Les opérations ponctuelles du mainteneur local peuvent omettre les vars Convex et passer directement les trois
  identifiants d'environnement `OPENCLAW_QA_TELEGRAM_*`.
- Pour exécuter le test complet de fumée bêta post-publication depuis la machine d'un mainteneur, utilisez `pnpm release:beta-smoke -- --beta betaN`. L'assistant exécute la validation de mise à jour/cible fraîche de Parallels npm, envoie `NPM Telegram Beta E2E`, interroge l'exécution exacte du workflow, télécharge l'artefact et imprime le rapport Telegram.
- Les mainteneurs peuvent exécuter la même vérification post-publication depuis GitHub Actions via le
  workflow manuel `NPM Telegram Beta E2E`. Il est intentionnellement manuel uniquement et
  ne s'exécute pas à chaque fusion.
- L'automatisation de publication des mainteneurs utilise désormais préflight-then-promote :
  - la vraie publication npm doit réussir un npm `preflight_run_id` réussi
  - la vraie publication npm doit être envoyée depuis la même branche `main` ou
    `release/YYYY.M.D` que l'exécution préflight réussie
  - les versions stables npm sont par défaut `beta`
  - la publication stable npm peut cibler `latest` explicitement via l'entrée du workflow
  - la mutation de dist-tag npm basée sur des jetons réside désormais dans
    `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
    pour des raisons de sécurité, car `npm dist-tag add` a toujours besoin de `NPM_TOKEN` alors que le
    dépôt public conserve une publication OIDC uniquement
  - `macOS Release` publique est uniquement pour validation ; lorsqu'une balise ne réside que sur une
    branche de version mais que le workflow est envoyé depuis `main`, définissez
    `public_release_branch=release/YYYY.M.D`
  - la vraie publication privée mac doit réussir les tests privés mac
    `preflight_run_id` et `validate_run_id`
  - les vrais chemins de publication promeuvent les artefacts préparés au lieu de les reconstruire
    à nouveau
- Pour les versions de corrections stables comme `YYYY.M.D-N`, le vérificateur
  post-publication vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` vers `YYYY.M.D-N`
  afin que les corrections de version ne puissent pas laisser silencieusement les anciennes installations globales sur le
  payload stable de base
- npm release preflight échoue fermement sauf si l'archive inclut à la fois
  npm`dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide,
  afin que nous ne livrions plus un tableau de bord vide
- La vérification post-publication vérifie également que les points d'entrée des plugins publiés et
  les métadonnées du package sont présents dans la structure du registre installé. Une version
  qui expédie des charges utiles d'exécution de plugin manquantes échoue au vérificateur postpublication et
  ne peut être promue en `latest`.
- `pnpm test:install:smoke`npm applique également le budget `unpackedSize` de npm pack sur
  l'archive de la mise à jour candidate, afin que l'e2e de l'installateur détecte tout gonflement accidentel du pack
  avant le chemin de publication de la version
- Si le travail de la version a touché à la planification CI, aux manifestes de synchronisation des extensions, ou
  aux matrices de test des extensions, régénérez et révisez les sorties de matrice `plugin-prerelease-extension-shard` détenues par le planificateur
  issues de `.github/workflows/plugin-prerelease.yml` avant approbation afin que les notes de version ne
  décrivent pas une configuration CI obsolète
- La préparation de la version stable macOS inclut également les surfaces du programme de mise à jour :
  - la version GitHub doit aboutir avec le GitHub`.zip` packagé, `.dmg`, et `.dSYM.zip`
  - `appcast.xml` sur `main`macOS doit pointer vers le nouveau zip stable après publication ; le
    flux de travail de publication macOS privé le valide automatiquement, ou ouvre une appcast
    PR lorsque la poussée directe est bloquée
  - l'application packagée doit conserver un identifiant de bundle non-débogage, une URL de flux Sparkle
    non vide, et un `CFBundleVersion` au niveau ou au-dessus du plancher de build Sparkle canonique
    pour cette version

## Release test boxes

`Full Release Validation` est la manière dont les opérateurs lancent tous les tests de pré-version depuis
un point d'entrée unique. Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez
l'assistant afin que chaque workflow enfant s'exécute depuis une branche temporaire fixée au SHA
cible :

```bash
pnpm ci:full-release --sha <full-sha>
```

L'assistant pousse `release-ci/<sha>-...`, distribue `Full Release Validation`
à partir de cette branche avec `ref=<sha>`, vérifie que chaque workflow enfant `headSha`
correspond à la cible, puis supprime la branche temporaire. Cela évite d'approuver par erreur
une exécution enfant `main` plus récente.

Pour la validation de la branche ou du tag de release, exécutez-le à partir de la référence de workflow `main` de confiance
et passez la branche ou le tag de release en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable \
  -f evidence_package_spec=openclaw@YYYY.M.D-beta.N
```

Le workflow résout la référence cible, dispatche manuellement `CI` avec
`target_ref=<release-ref>`, dispatche `OpenClaw Release Checks`, prépare un
artefact parent `release-package-under-test` pour les vérifications orientées package, et
dispatche les tests E2E autonomes du package Telegram lorsque `release_profile=full` avec
`rerun_group=all` ou lorsque `release_package_spec` ou
`npm_telegram_package_spec` est défini. `Vérifications de version
OpenClaw` déploie ensuite les tests de fumée d'installation, les vérifications de version multi-OS, la couverture du chemin de version live/E2E Docker
lorsque le soak est activé, l'acceptation du package avec les QA de package Telegram,
la parité du Lab QA, le live Matrix et le live Telegram. Une exécution complète n'est acceptable que lorsque le
résumé `Full Release Validation`
montre `normal_ci` et `release_checks` comme réussis. En mode full/all,
l'enfant `npm_telegram` doit également réussir ; en dehors du mode full/all, il est ignoré
sauf si un `release_package_spec` ou un `npm_telegram_package_spec` publié a été
fourni. Le résumé final du vérificateur inclut des tableaux des tâches les plus lentes pour chaque exécution enfant, afin que le responsable de la version puisse voir le chemin critique actuel sans télécharger les journaux.
Voir [Validation complète de version](/fr/reference/full-release-validation) pour la
matrice complète des étapes, les noms exacts des tâches du workflow, les différences entre le profil stable et complet, les artefacts et les poignées de réexécution ciblées.
Les workflows enfants sont dispatchés à partir de la référence de confiance qui exécute `Validation complète de version
`, normally `--ref main`, even when the target `ref` pointe vers une
branche ou une balise de version plus ancienne. Il n'y a pas d'entrée de référence de workflow séparée pour la Validation complète de version ; choisissez le harnais de confiance en choisissant la référence d'exécution du workflow.
N'utilisez pas `--ref main -f ref=<sha>` pour une preuve de commit exacte sur `main` en mouvement ;
les SHA de commits bruts ne peuvent pas être des références de dispatch de workflow, utilisez donc
`pnpm ci:full-release --sha <sha>` pour créer la branche temporaire épinglée.

Utilisez `release_profile` pour sélectionner l'étendue live/provider :

- `minimum`OpenAI : chemin le plus rapide critique pour la release OpenAI/core live et Docker
- `stable` : minimum plus couverture stable provider/backend pour l'approbation de la release
- `full` : stable plus large couverture consultative provider/media

Utilisez `run_release_soak=true` avec `stable` lorsque les voies bloquant la release sont au vert et que vous souhaitez le balayage exhaustif live/E2E, du chemin de release Docker et des survivants de mise à niveau publiés délimités avant la promotion. Ce balayage couvre les quatre derniers packages stables plus les lignes de base épinglées `2026.4.23` et `2026.5.2` plus la couverture `2026.4.15` plus ancienne, les lignes de base en double étant supprimées et chaque ligne de base étant partitionnée dans son propre job de runner Docker. `full` implique `run_release_soak=true`.

`OpenClaw Release Checks` utilise la ref de workflow de confiance pour résoudre la ref cible une fois comme `release-package-under-test` et réutilise cet artefact dans les vérifications cross-OS, d'acceptation de package et de chemin de release Docker lors des exécutions de soak. Cela maintient toutes les boîtes orientées package sur les mêmes octets et évite les builds de package répétés. Une fois qu'une bêta est déjà sur npm, définissez `release_package_spec=openclaw@YYYY.M.D-beta.N` pour que les vérifications de release téléchargent le package expédié une fois, extraient son SHA de source de build à partir de `dist/build-info.json` et réutilisent cet artefact pour les voies cross-OS, d'acceptation de package, de chemin de release Docker et de package Telegram. Le test de fumée d'installation OpenAI cross-OS utilise `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsque la variable repo/org est définie, sinon `openai/gpt-5.4`, car cette voie prouve l'installation du package, l'onboarding, le démarrage de la passerelle et un tour d'agent live plutôt que de benchmark le modèle le plus lent par défaut. La matrice live provider plus large reste l'endroit pour la couverture spécifique au modèle.

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

N'utilisez pas le parapluie complet comme première nouvelle exécution après une correction ciblée. Si une boîte échoue, utilisez le workflow enfant, le travail, la ligne Docker, le profil de package, le fournisseur de modèle ou la ligne QA ayant échoué pour la preuve suivante. Relancez le parapluie complet uniquement lorsque la correction a modifié l'orchestration partagée de la publication ou a rendu obsolètes les preuves précédentes de toutes les boîtes. Le vérificateur final du parapluie vérifie à nouveau les ID d'exécution des workflows enfants enregistrés, donc après qu'un workflow enfant a été relancé avec succès, relancez uniquement le travail parent `Verify full validation` ayant échoué.

Pour une récupération limitée, passez `rerun_group` au parapluie. `all` est l'exécution réelle du candidat à la publication, `ci` exécute uniquement l'enfant CI normal, `plugin-prerelease` exécute uniquement l'enfant plugin de publication uniquement, `release-checks` exécute chaque boîte de publication, et les groupes de publication plus étroits sont `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, et `npm-telegram`. Les réexécutions focalisées `npm-telegram` nécessitent `release_package_spec` ou `npm_telegram_package_spec` ; les exécutions complètes/totales avec `release_profile=full` utilisent l'artefact du package release-checks. Les réexécutions focalisées multi-OS peuvent ajouter `cross_os_suite_filter=windows/packaged-upgrade` ou un autre filtre OS/suite. Les échecs des contrôles de publication QA sont consultifs, à l'exception de la porte de couverture de l'outil d'exécution standard, qui bloque la validation de la publication lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé de niveau standard.

### Vitest

La boîte Vitest est le workflow enfant `CI`Linux manuel. Le CI manuel contourne intentionnellement le scope des modifications et force le graphe de tests normal pour le candidat à la release : shards Linux Node, shards bundled-plugin, shards de contrat plugin et channel, compatibilité Node 22, `check-*`, `check-additional-*`, tests de fumée des artefacts construits, vérifications des docs, compétences Python, Windows, macOS, Android, et i18n de l'interface de contrôle.

Utilisez cette section pour répondre à « l'arborescence source a-t-elle passé la suite de tests normale complète ? »
Cela n'est pas identique à la validation produit du chemin de publication. Preuves à conserver :

- `Full Release Validation` résumé montrant l'URL d'exécution `CI` distribuée
- exécution `CI` verte sur le SHA cible exact
- noms de partitions échouées ou lentes provenant des tâches CI lors de l'investigation des régressions
- artefacts de chronométrage Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une
  exécution nécessite une analyse des performances

Exécutez le CI manuel directement uniquement lorsque la publication nécessite un CI normal déterministe, mais
pas les environnements Docker, le QA Lab, le mode live, le multi-OS ou les environnements de package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

L'environnement Docker se trouve dans `OpenClaw Release Checks` via
`openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow
`install-smoke` en mode publication. Il valide la candidature à la publication via des environnements
Docker empaquetés au lieu de tests au niveau source uniquement.

La couverture Docker de la publication inclut :

- test de fumée de l'installation complète avec le test de fumée d'installation globale lente de Bun activé
- préparation/réutilisation de l'image de test de fumée du Dockerfile racine par SHA cible, avec QR,
  root/gateway, et les tâches de test de fumée de l'installateur/Bun s'exécutant en tant que partitions
  de test de fumée d'installation distinctes
- voies E2E du dépôt
- morceaux Docker du chemin de publication : `core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g`, et `plugins-runtime-install-h`
- couverture OpenWebUI à l'intérieur du morceau `plugins-runtime-services` lorsque demandé
- voies d'installation/désinstallation de greffons groupés séparées
  `bundled-plugin-install-uninstall-0` via
  `bundled-plugin-install-uninstall-23`
- suites de provider live/E2E et couverture du modèle live Docker lorsque les vérifications de publication
  incluent des suites live

Utilisez les artefacts Docker avant de réexécuter. Le planificateur de chemin de publication (release-path scheduler) télécharge Docker`.artifacts/docker-tests/` avec les journaux de voie (lane logs), `summary.json`, `failures.json`,
les minutages de phase, le plan du planificateur au format JSON et les commandes de réexécution. Pour une récupération ciblée,
utilisez `docker_lanes=<lane[,lane]>` sur le workflow live/E2E réutilisable au lieu de
réexécuter tous les morceaux de publication (release chunks). Les commandes de réexécution générées incluent les `package_artifact_run_id`Docker précédents
et les entrées d'image Docker préparées lorsqu'elles sont disponibles, afin qu'une
voie en échec puisse réutiliser le même fichier tar et les images GHCR.

### Laboratoire QA

La boîte du Laboratoire QA fait également partie de `OpenClaw Release Checks`Docker. Il s'agit du comportement agentique
et de la porte de publication au niveau du channel, distinct des mécaniques de
packaging Vitest et Docker.

La couverture du Laboratoire QA de publication inclut :

- voie de parité factice (mock parity lane) comparant la voie candidate OpenAI à la ligne de base Opus 4.6
  en utilisant le pack de parité agentique
- profil QA rapide live Matrix utilisant l'environnement `qa-live-shared`
- voie QA live Telegram utilisant les baux d'identifiants Convex CI
- `pnpm qa:otel:smoke` lorsque la télémétrie de publication nécessite une preuve locale explicite

Utilisez cette boîte pour répondre à la question « la publication se comporte-t-elle correctement dans les scénarios QA et
les flux de channel en direct ? ». Conservez les URL des artefacts pour les voies de parité, Matrix et Telegram
lors de l'approbation de la publication. Une couverture complète Matrix reste disponible sous la forme
d'une exécution partitionnée manuelle du QA-Lab plutôt que la voie critique de publication par défaut.

### Paquet (Package)

La boîte Paquet est la porte du produit installable. Elle est soutenue par
`Package Acceptance` et le résolveur
`scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un
candidat dans l'archive `package-under-test`Docker consommée par Docker E2E, valide
l'inventaire du paquet, enregistre la version du paquet et le SHA-256, et garde la
référence du harnais de workflow séparée de la référence source du paquet.

Sources candidates prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de publication OpenClaw exacte
- `source=ref` : empaqueter une branche `package_ref` de confiance, une balise ou un SHA de commit complet
  avec le harnais `workflow_ref` sélectionné
- `source=url` : télécharger un `.tgz` HTTPS avec les `package_sha256` requises
- `source=artifact` : réutiliser un `.tgz` téléchargé par une autre exécution GitHub Actions

`OpenClaw Release Checks` exécute l'acceptation de package avec `source=artifact`, l'artefact de package de version préparé, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`. L'acceptation de package maintient la migration, la mise à jour,
le redémarrage de mise à jour auth-configurée, l'installation en direct de la compétence ClawHub, le nettoyage des dépendances de plugin obsolètes, les fixtures de plugin hors ligne,
la mise à jour de plugin et les contrôles qualité de package Telegram par rapport à la même archive tar
résolue. Les contrôles de version bloquants utilisent la base de référence du dernier package publié par défaut ;
`run_release_soak=true` ou
`release_profile=full` s'étend à chaque base de référence stable publiée sur npm de
`2026.4.23` à `latest` plus les fixtures de problèmes signalés. Utilisez
l'acceptation de package avec `source=npm` pour un candidat déjà livré, ou
`source=ref`/`source=artifact` pour une archive tar npm locale basée sur un SHA avant
la publication. C'est le remplacement natif GitHub
pour la majeure partie de la couverture de mise à jour/package qui nécessitait auparavant
Parallels. Les contrôles de version multi-OS sont toujours importants pour l'intégration spécifique à l'OS,
l'installateur et le comportement de la plateforme, mais la validation produit de mise à jour/package devrait
préférer l'acceptation de package.

La liste de contrôle canonique pour la mise à jour et la validation des plugins est
[Test des mises à jour et des plugins](/fr/help/testing-updates-plugins). Utilisez-la lors
de la décision sur la voie locale, Docker, d'acceptation de package ou de vérification de version qui prouve un
changement d'installation/de mise à jour de plugin, de nettoyage de docteur ou de migration de package publié. La migration exhaustive des mises à jour publiées à partir de chaque package stable `2026.4.23+` est
un flux de travail manuel `Update Migration` distinct, et ne fait pas partie du CI de version complète.

La clémence héritée d'acceptation des packages est intentionnellement limitée dans le temps. Les packages jusqu'à
`2026.4.25` peuvent utiliser le chemin de compatibilité pour les écarts de métadonnées déjà publiés
sur npm : entrées d'inventaire QA privées manquantes dans l'archive, `gateway install --wrapper` manquant,
fichiers de correctifs manquants dans le montage git dérivé de l'archive,
`update.channel` persisté manquant, emplacements hérités des enregistrements d'installation de plugins,
persistence manquante des enregistrements d'installation du marketplace, et migration des métadonnées de configuration
pendant `plugins update`. Le package `2026.4.26` publié peut avertir
concernant les fichiers d'horodatage des métadonnées de construction locale qui ont déjà été expédiés. Les packages ultérieurs
doivent respecter les contrats de packages modernes ; ces mêmes écarts entraînent l'échec de la validation de la version.

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

Profils de packages courants :

- `smoke` : voies rapides d'installation de package/channel/agent, de réseau de passerelle et de
  rechargement de configuration
- `package` : contrats de package d'installation/mise à jour/redémarrage/plugin plus preuve d'installation de compétence ClawHub
  en direct ; c'est la valeur par défaut pour la vérification de version
- `product` : `package` plus channels MCP, nettoyage cron/subagent, recherche web OpenAI
  et OpenWebUI
- `full` : blocs de chemin de version Docker avec OpenWebUI
- `custom` : liste exacte de `docker_lanes` pour des réexécutions ciblées

Pour la preuve Telegram pour les candidats de package, activez Telegram`telegram_mode=mock-openai` ou
`telegram_mode=live-frontier` lors de l'acceptation du package. Le workflow transmet l'archive tar `package-under-test`TelegramTelegramnpm résolue dans la voie Telegram ; le workflow autonome
Telegram accepte toujours une spécification npm publiée pour les vérifications post-publication.

## Automatisation de la publication de version

`OpenClaw Release Publish` est le point d'entrée de publication modifiant normal. Il
orchestre les workflows de l'éditeur de confiance dans l'ordre requis par la version :

1. Extraire le tag de version et résoudre son SHA de commit.
2. Vérifiez que le tag est accessible depuis `main` ou `release/*`.
3. Exécuter `pnpm plugins:sync:check`.
4. Déclencher `Plugin NPM Release` avec `publish_scope=all-publishable` et
   `ref=<release-sha>`.
5. Déclencher `Plugin ClawHub Release` avec le même périmètre (scope) et SHA.
6. Déclencher `OpenClaw NPM Release`npm avec le tag de version, le dist-tag npm, et
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
uniquement pour des réparations ciblées ou des travaux de republication. Pour une réparation de plugin sélectionné, passez
`plugin_publish_scope=selected` et `plugins=@openclaw/name` à
`OpenClaw Release Publish`OpenClaw, ou déclenchez le workflow enfant directement lorsque le
package OpenClaw ne doit pas être publié.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1` ou
  `v2026.4.2-beta.1` ; lorsqu'il est `preflight_only=true`, il peut aussi être le SHA de commit
  complet de 40 caractères de la branche de workflow actuelle pour une pré-vol de validation uniquement
- `preflight_only` : `true` pour la validation/build/package uniquement, `false` pour le
  chemin de publication réel
- `preflight_run_id` : requis sur le chemin de publication réel pour que le workflow réutilise
  l'archive tarball préparée lors de l'exécution préflight réussie
- `npm_dist_tag`npm : tag cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Publish` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis ; doit déjà exister
- `preflight_run_id` : ID d'exécution préflight `OpenClaw NPM Release` réussie ;
  requis quand `publish_openclaw_npm=true`
- `npm_dist_tag`npmOpenClaw : tag cible npm pour le paquet OpenClaw
- `plugin_publish_scope` : par défaut `all-publishable` ; utiliser `selected` uniquement
  pour des travaux de réparation ciblés
- `plugins` : noms de paquets `@openclaw/*` séparés par des virgules lorsque
  `plugin_publish_scope=selected`
- `publish_openclaw_npm` : par défaut `true` ; définir `false` uniquement lors de l'utilisation du
  workflow en tant qu'orchestrateur de réparation plugin-only
- `wait_for_clawhub` : par défaut `false`npmClawHub pour que la disponibilité npm ne soit pas bloquée par
  le sidecar ClawHub ; définir `true`ClawHub uniquement lorsque l'achèvement du workflow doit inclure
  l'achèvement de ClawHub

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref`OpenClaw : branche, tag ou SHA de commit complet à valider. Les vérifications portant des secrets
  nécessitent que le commit résolu soit accessible depuis une branche OpenClaw ou
  un tag de version.
- `run_release_soak`Docker : activer les tests exhaustifs live/E2E, le chemin de publication Docker, et
  le soak de survie de mise à niveau all-since sur les vérifications de version stables/défaut. Il est forcé
  activé par `release_profile=full`.

Règles :

- Les balises stables et de correction peuvent être publiées soit sur `beta` soit sur `latest`
- Les balises de préversion bêta ne peuvent être publiées que sur `beta`
- Pour `OpenClaw NPM Release`, la saisie du SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours
  en validation uniquement
- Le chemin de publication réel doit utiliser le même `npm_dist_tag` que celui utilisé lors du prévol ;
  le workflow vérifie que ces métadonnées sont toujours valides avant de poursuivre la publication

## Séquence de publication stable npm

Lors de la création d'une publication stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise n'existe, vous pouvez utiliser le SHA complet actuel du commit de la branche de workflow
     pour un essai à blanc de validation uniquement du workflow de prévol
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement
   lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de version, la balise de version ou le SHA complet
   du commit lorsque vous souhaitez une CI normale plus une couverture en direct du cache d'invite, Docker, QA Lab,
   Matrix et Telegram depuis un workflow manuel
4. Si vous avez intentionnellement uniquement besoin du graphe de tests normal déterministe, exécutez plutôt
   le workflow manuel `CI` sur la référence de version
5. Enregistrez le `preflight_run_id` réussi
6. Exécutez `OpenClaw Release Publish` avec le même `tag`, le même `npm_dist_tag`
   et le `preflight_run_id` enregistré ; il publie les plugins externalisés sur npm
   et ClawHub avant de promouvoir le paquet OpenClaw npm
7. Si la publication a abouti sur `beta`, utilisez le workflow privé
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   pour promouvoir cette version stable de `beta` vers `latest`
8. Si la publication est intentionnellement publiée directement sur `latest` et que `beta` doit suivre immédiatement la même version stable, utilisez ce même workflow privé pour pointer les deux balises de distribution (dist-tags) vers la version stable, ou laissez sa synchronisation de réparation automatique planifiée déplacer `beta` plus tard.

La mutation de la balise de distribution réside dans le référentiel privé pour des raisons de sécurité, car elle nécessite toujours `NPM_TOKEN`, tandis que le référentiel public conserve une publication uniquement OIDC.

Cela permet de maintenir le chemin de publication directe et le chemin de promotion en priorité beta tous deux documentés et visibles par les opérateurs.

Si un mainteneur doit revenir à une authentification locale npm, exécutez toutes les commandes 1Password CLI (`op`) uniquement dans une session tmux dédiée. N'appelez pas `op` directement depuis le shell de l'agent principal ; le garder à l'intérieur de tmux rend les invites, les alertes et la gestion des OTP observables et empêche les alertes d'hôte répétées.

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

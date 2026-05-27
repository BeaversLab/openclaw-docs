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
- Exécutez le workflow manuel `Package Acceptance` lorsque vous souhaitez une preuve par voie latérale
  pour un candidat de package pendant que le travail de publication se poursuit. Utilisez `source=npm` pour
  `openclaw@beta`, `openclaw@latest`, ou une version de publication exacte ; `source=ref`
  pour empaqueter une branche/tag/SHA `package_ref` de confiance avec le harnais
  `workflow_ref` actuel ; `source=url` pour une archive tar HTTPS publique avec une
  SHA-256 requise et une politique d'URL publique stricte ; `source=trusted-url` pour une
  politique de source de confiance nommée utilisant un `trusted_source_id` requis et SHA-256 ; ou
  `source=artifact` pour une archive tar téléchargée par une autre exécution d'actions GitHub. Le
  workflow résout le candidat en
  `package-under-test`, réutilise le planificateur de publication E2E Docker contre cette
  archive tar, et peut exécuter le QA Telegram contre la même archive tar avec
  `telegram_mode=mock-openai` ou `telegram_mode=live-frontier`. Lorsque les
  voies Docker sélectionnées incluent `published-upgrade-survivor`, l'artefact
  du package est le candidat et `published_upgrade_survivor_baseline` sélectionne
  la base de référence publiée. `update-restart-auth`CLI utilise le package candidat comme
  à la fois la CLI installée et le package-sous-test, exerçant ainsi le
  chemin de redémarrage géré de la commande de mise à jour du candidat.
  Exemple : `gh workflow run package-acceptance.yml --ref main -f workflow_ref=main -f source=npm -f package_spec=openclaw@beta -f suite_profile=product -f published_upgrade_survivor_baseline=openclaw@2026.4.26 -f telegram_mode=mock-openai`
  Profils courants :
  - `smoke` : voies install/channel/agent, réseau de passerelle et rechargement de configuration
  - `package` : voies package/update/restart/plugin natives aux artefacts sans OpenWebUI ou ClawHub en direct
  - `product` : profil de package plus canaux MCP, nettoyage cron/sous-agent,
    recherche web OpenAI et OpenWebUI
  - `full` : fragments du chemin de publication Docker avec OpenWebUI
  - `custom` : sélection exacte du `docker_lanes` pour une réexécution ciblée
- Exécutez directement le workflow manuel `CI` lorsque vous avez uniquement besoin d'une couverture CI normale complète
  pour le candidat de publication. Les répartitions manuelles du CI contournent le périmètre des modifications
  et forcent les shards Node Linux, les shards de bundle de plugins, les shards de contrat de plugins et de
  channel, la compatibilité Node 22, `check-*`, `check-additional-*`,
  les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS,
  Android et les voies i18n de l'interface utilisateur de contrôle.
  Exemple : `gh workflow run ci.yml --ref release/YYYY.M.D`
- Exécutez `pnpm qa:otel:smoke` lors de la validation de la télémétrie de version. Il exerce
  QA-lab via un récepteur OTLP/HTTP local et vérifie l'exportation des traces, métriques et journaux
  ainsi que les attributs de traces bornés et le masquage de contenu/identifiant sans
  nécessiter Opik, Langfuse ou un autre collecteur externe.
- Exécutez `pnpm qa:prometheus:smoke` lors de la validation du scraping Prometheus protégé.
  Il exerce QA-lab, rejette les scrapings non authentifiés et vérifie
  que les familles de métriques critiques pour la version restent exemptes de contenu de prompt, d'identifiants bruts,
  de jetons d'authentification et de chemins locaux.
- Exécutez `pnpm qa:observability:smoke` lorsque vous souhaitez exécuter les tests de fumée
  OpenTelemetry et Prometheus à partir de la source-checkout l'un après l'autre.
- Exécutez `pnpm release:check` avant chaque version étiquetée
- La pré-vérification `OpenClaw NPM Release` génère des preuves de version des dépendances avant
  de créer l'archive tar npm. La porte de contrôle des vulnérabilités de sécurité npm est
  bloquante pour la version. Le risque du manifeste transitif, la surface de propriété/installation
  des dépendances et les rapports de changement de dépendances ne sont que des preuves de version. Le
  rapport de changement de dépendances compare la candidate à la version avec le
  tag de version précédent accessible.
- La pré-vérification télécharge les preuves de dépendances sous la forme de
  `openclaw-release-dependency-evidence-<tag>` et les intègre également sous
  `dependency-evidence/` à l'intérieur de l'artefact de pré-vérification npm préparé. Le chemin réel
  de publication réutilise cet artefact de pré-vérification, puis attache les mêmes preuves
  à la version GitHub en tant que `openclaw-<version>-dependency-evidence.zip`.
- Exécutez `OpenClaw Release Publish` pour la séquence de publication avec mutation après que
  le tag existe. Déclenchez-le depuis `release/YYYY.M.D` (ou `main` lors de la publication d'un
  tag joignable depuis main), transmettez le tag de version et le OpenClaw npm
  `preflight_run_id` réussi, et gardez la portée de publication de plugin par défaut
  `all-publishable` sauf si vous effectuez délibérément une réparation ciblée. Le
  workflow sérialise la publication npm du plugin, la publication ClawHub du plugin, et la publication OpenClaw de npm
  afin que le package principal ne soit pas publié avant ses plugins externalisés.
- Les vérifications de version s'exécutent désormais dans un workflow manuel séparé :
  `OpenClaw Release Checks`
- `OpenClaw Release Checks` exécute également la voie de parité de simulation du QA Lab ainsi que le profil
  Matrix rapide en direct et la voie QA Telegram avant l'approbation de la version. Les voies
  en direct utilisent l'environnement `qa-live-shared` ; Telegram utilise également les baux d'identifiants CI Convex.
  Exécutez le workflow manuel `QA-Lab - All Lanes` avec
  `matrix_profile=all` et `matrix_shards=true` lorsque vous souhaitez un inventaire complet du transport, des médias et de l'E2EE Matrix
  en parallèle.
- La validation du runtime d'installation et de mise à niveau multi-OS fait partie des
  `OpenClaw Release Checks` et `Full Release Validation` publics, qui appellent le
  workflow réutilisable
  `.github/workflows/openclaw-cross-os-release-checks-reusable.yml` directement
- Cette séparation est intentionnelle : gardez le chemin de publication réel npm court,
  déterministe et axé sur les artefacts, tandis que les vérifications en direct plus lentes restent dans leur
  propre voie afin qu'elles ne bloquent pas ou n'interrompent pas la publication
- Les vérifications de version contenant des secrets doivent être déclenchées via la référence de workflow `Full Release
Validation` or from the `main`/release afin que la logique du workflow et
  les secrets restent contrôlés
- `OpenClaw Release Checks` accepte une branche, un tag ou un SHA de commit complet tant
  que le commit résolu est joignable depuis une branche ou un tag de version OpenClaw
- `OpenClaw NPM Release` validation-only preflight accepte également le SHA de commit complet de 40 caractères de la branche de workflow sans exiger de balise poussée
- Ce chemin SHA est uniquement réservé à la validation et ne peut pas être promu en une véritable publication
- En mode SHA, le workflow synthétise `v<package.json version>` uniquement pour la vérification des métadonnées du package ; la véritable publication nécessite toujours une vraie balise de version
- Les deux workflows gardent le chemin de publication et de promotion réel sur les runners hébergés par GitHub, tandis que le chemin de validation sans mutation peut utiliser les plus gros runners Linux de Blacksmith
- Ce workflow exécute
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`
  en utilisant à la fois les secrets de workflow `OPENAI_API_KEY` et `ANTHROPIC_API_KEY`
- Le préflight de publication npm n'attend plus la voie séparée des vérifications de version
- Avant de baliser localement un candidat à la publication, exécutez
  `RELEASE_TAG=vYYYY.M.D-beta.N pnpm release:fast-pretag-check`. L'outil d'assistance
  exécute les garde-fous de version rapide, les vérifications de publication de plugin npm/ClawHub, la construction,
  la construction de l'interface utilisateur et `release:openclaw:npm:check` dans un ordre qui détecte les erreurs courantes
  bloquant l'approbation avant que le workflow de publication GitHub ne démarre.
- Exécutez `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (ou la balise bêta/correction correspondante) avant l'approbation
- Après la publication npm, exécutez
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  (ou la version bêta/correction correspondante) pour vérifier le chemin d'installation
  du registre publié dans un préfixe temporaire frais
- Après une publication bêta, exécutez `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@YYYY.M.D-beta.N OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci pnpm test:docker:npm-telegram-live`
  pour vérifier l'onboarding du paquet installé, la configuration Telegram et le E2E Telegram réel
  contre le paquet npm publié en utilisant le pool d'identifiants Telegram loués partagés. Les tests ponctuels du mainteneur local peuvent omettre les variables Convex et passer directement les trois
  identifiants d'environnement `OPENCLAW_QA_TELEGRAM_*`.
- Pour exécuter le test complet de fumée post-publication bêta depuis une machine de mainteneur, utilisez `pnpm release:beta-smoke -- --beta betaN`. L'assistant exécute la validation de mise à jour/cible vierge de npm Parallels, envoie `NPM Telegram Beta E2E`, interroge l'exécution exacte du workflow, télécharge l'artefact et imprime le rapport Telegram.
- Les mainteneurs peuvent exécuter la même vérification post-publication via GitHub Actions en utilisant le workflow manuel `NPM Telegram Beta E2E`. Il est volontairement uniquement manuel et ne s'exécute pas à chaque fusion.
- L'automatisation de publication des mainteneurs utilise désormais le préflight-then-promote :
  - la vraie publication npm doit réussir un npm `preflight_run_id` réussi
  - la vraie publication npm doit être envoyée depuis la même branche `main` ou `release/YYYY.M.D` que l'exécution préflight réussie
  - les versions stables npm sont par défaut `beta`
  - la publication stable npm peut cibler `latest` explicitement via l'entrée du workflow
  - la mutation de dist-tag npm basée sur des jetons réside désormais dans `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml` pour des raisons de sécurité, car `npm dist-tag add` a encore besoin de `NPM_TOKEN` tandis que le dépôt public conserve la publication uniquement OIDC
  - `macOS Release` publique est uniquement pour validation ; lorsqu'une balise réside uniquement sur une branche de publication mais que le workflow est envoyé depuis `main`, définissez `public_release_branch=release/YYYY.M.D`
  - la vraie publication privée mac doit réussir le mac privé `preflight_run_id` et `validate_run_id`
  - les chemins de publication réels promeuvent les artefacts préparés au lieu de les reconstruire
- Pour les versions de corrections stables comme `YYYY.M.D-N`, le vérificateur post-publication vérifie également le même chemin de mise à niveau avec préfixe temporaire de `YYYY.M.D` à `YYYY.M.D-N` afin que les corrections de publication ne puissent pas laisser silencieusement d'anciennes installations globales sur la charge utile stable de base
- La prépublication de la version npm échoue par défaut (fails closed) à moins que l'archive ne contienne à la fois npm`dist/control-ui/index.html` et une charge utile `dist/control-ui/assets/` non vide, afin que nous ne livrions plus un tableau de bord navigateur vide
- La vérification post-publication vérifie également que les points d'entrée des plugins publiés et les métadonnées du package sont présents dans la disposition du registre installé. Une version qui expédie des charges utiles d'exécution de plugin manquantes échoue au vérificateur post-publication et ne peut pas être promue vers `latest`.
- `pnpm test:install:smoke`npm applique également le budget `unpackedSize` du pack npm sur l'archive de mise à jour candidate, afin que le test de bout en bout de l'installateur détecte le gonflement accidentel du pack avant le chemin de publication de la version
- Si le travail de version a touché la planification CI, les manifestes de synchronisation des extensions ou les matrices de test des extensions, régénérez et examinez les sorties de matrice `plugin-prerelease-extension-shard` détenues par le planificateur à partir de `.github/workflows/plugin-prerelease.yml` avant approbation, afin que les notes de version ne décrivent pas une disposition CI obsolète
- La préparation de la version stable pour macOS inclut également les surfaces de mise à jour :
  - la version GitHub doit se retrouver avec les `.zip`, `.dmg` et `.dSYM.zip` empaquetés
  - `appcast.xml` sur `main` doit pointer vers le nouveau zip stable après publication ; le workflow de publication macOS privé le commit automatiquement, ou ouvre une PR d'appcast lorsque le push direct est bloqué
  - l'application empaquetée doit conserver un identifiant de bundle non-debug, une URL de flux Sparkle non vide et un `CFBundleVersion` supérieur ou égal au plancher de construction Sparkle canonique pour cette version

## Boîtes de test de version

`Full Release Validation` est la méthode par laquelle les opérateurs lancent tous les tests de pré-publication depuis un point d'entrée unique. Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez l'assistant afin que chaque workflow enfant s'exécute à partir d'une branche temporaire fixée au SHA cible :

```bash
pnpm ci:full-release --sha <full-sha>
```

L'assistant effectue un push de `release-ci/<sha>-...`, dispatche `Full Release Validation`
à partir de cette branche avec `ref=<sha>`, vérifie que chaque workflow enfant `headSha`
correspond à la cible, puis supprime la branche temporaire. Cela évite de prouver par
accident une exécution enfant `main` plus récente.

Pour la validation de branche ou de tag de release, exécutez-le à partir de la ref de workflow `main` de confiance
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

Le workflow résout la ref cible, envoie manuel `CI` avec
`target_ref=<release-ref>`, envoie `OpenClaw Release Checks`, prépare un
artefact parent `release-package-under-test` pour les vérifications orientées package, et
envoie le E2E du package autonome Telegram lorsque `release_profile=full` avec
`rerun_group=all` ou lorsque `release_package_spec` ou
`npm_telegram_package_spec` est défini. `Vérifications de version OpenClaw`
distribue ensuite les tests de fumée d'installation, les vérifications de version inter-OS, la couverture du chemin de version live/E2E Docker
lorsque le soak est activé, l'acceptation du package avec le QA de package Telegram,
la parité du QA Lab, le live Matrix et le live Telegram. Une exécution complète n'est acceptable que lorsque le
résumé `Full Release Validation`
affiche `normal_ci` et `release_checks` comme réussis. En mode complet/all,
l'enfant `npm_telegram` doit également réussir ; en dehors du mode complet/all, il est ignoré
sauf si un `release_package_spec` ou un `npm_telegram_package_spec` publié
a été fourni. Le résumé final
du vérificateur comprend des tableaux des tâches les plus lentes pour chaque exécution enfant, afin que le responsable de la version
puisse voir le chemin critique actuel sans télécharger les journaux.
Voir [Validation complète de version](/fr/reference/full-release-validation) pour la
matrice complète des étapes, les noms exacts des tâches de workflow, les différences entre le profil stable et complet,
les artefacts et les poignées de réexécution ciblées.
Les workflows enfants sont envoyés depuis la ref approuvée qui exécute `Validation complète de version
`, normally `--ref main`, even when the target `ref` pointe vers une
branche ou une balise de version plus ancienne. Il n'y a pas d'entrée séparée de workflow-ref pour la validation complète de version ;
choisissez le harnais approuvé en choisissant la ref d'exécution du workflow.
N'utilisez pas `--ref main -f ref=<sha>` pour une preuve de commit exacte sur le `main` mobile ;
les SHAs de commits bruts ne peuvent pas être des refs de dispatch de workflow, utilisez donc
`pnpm ci:full-release --sha <sha>` pour créer la branche temporaire épinglée.

Utilisez `release_profile` pour sélectionner l'étendue live/fournisseur :

- `minimum`OpenAI : chemin critique de release le plus rapide pour OpenAI/core en direct et Docker
- `stable` : minimum plus une couverture stable du provider/backend pour l'approbation de la release
- `full` : stable plus une large couverture consultative du provider/média

Utilisez `run_release_soak=true` avec `stable` lorsque les lanes bloquant la release sont
au vert et que vous souhaitez le balayage exhaustif live/E2E, du chemin de release Docker et des survivants de mise à niveau publiés bornés avant la promotion. Ce balayage couvre
les quatre derniers packages stables plus les lignes de base épinglées `2026.4.23` et `2026.5.2`
plus la couverture `2026.4.15` plus ancienne, avec les lignes de base en double supprimées et
chaque ligne de base répartie dans son propre tâche de runner Docker. `full` implique
`run_release_soak=true`.

`OpenClaw Release Checks` utilise la ref de workflow de confiance pour résoudre la ref
cible une fois sous la forme `release-package-under-test` et réutilise cet artefact pour les vérifications cross-OS,
d'acceptation de package et de chemin de release Docker lors des exécutions de soak. Cela permet de garder
toutes les boxes orientées package sur les mêmes octets et évite les constructions répétées de packages.
Une fois qu'une bêta est déjà sur npm, définissez `release_package_spec=openclaw@YYYY.M.D-beta.N`
pour que les vérifications de release téléchargent le package expédié une seule fois, extraient son SHA de source de construction
à partir de `dist/build-info.json`, et réutilisent cet artefact pour les lanes cross-OS,
d'acceptation de package, de chemin de release Docker, et de package Telegram.
Le test de fumée d'installation OpenAI cross-OS utilise `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsque la variable
repo/org est définie, sinon `openai/gpt-5.4`, car cette lane prouve l'installation du package, l'onboarding, le démarrage de la passerelle et un tour d'agent en direct
plutôt que de benchmarking le model par défaut le plus lent. La matrice plus large de providers en direct
reste l'endroit pour la couverture spécifique au model.

Utilisez ces variantes en fonction de l'étape de la release :

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

N'utilisez pas l'ensemble complet (umbrella) comme première nouvelle exécution après une correction ciblée. Si une boîte échoue, utilisez le workflow enfant, le travail, la voie Docker, le profil de package, le fournisseur de modèle ou la voie QA ayant échoué pour la prochaine preuve. Relancez l'ensemble complet uniquement lorsque la correction a modifié l'orchestration partagée de la version ou a rendu obsolètes les preuves de toutes les boîtes précédentes. Le vérificateur final de l'ensemble vérifie à nouveau les IDs d'exécution du workflow enfant enregistrés, donc après qu'un workflow enfant a été relancé avec succès, relancez uniquement le travail parent Docker`Verify full validation` ayant échoué.

Pour une récupération limitée, passez `rerun_group` à l'ensemble (umbrella). `all` est l'exécution réelle de la version candidate, `ci` exécute uniquement l'enfant CI normal, `plugin-prerelease` exécute uniquement l'enfant du plugin de version uniquement, `release-checks` exécute chaque boîte de version, et les groupes de version plus étroits sont `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` et `npm-telegram`. Les nouvelles exécutions ciblées `npm-telegram` nécessitent `release_package_spec` ou `npm_telegram_package_spec` ; les exécutions complètes/toutes avec `release_profile=full` utilisent l'artefact du package release-checks. Les nouvelles exécutions multi-OS ciblées peuvent ajouter `cross_os_suite_filter=windows/packaged-upgrade` ou un autre filtre OS/suite. Les échecs des vérifications de version QA sont consultifs, à l'exception de la porte de couverture des outils d'exécution standard, qui bloque la validation de la version lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé du niveau standard.

### Vitest

La boîte Vitest est le workflow enfant manuel `CI`Linux. Le CI manuel contourne intentionnellement la portée des modifications et force le graphique de test normal pour le candidat à la version : les shards Linux Node, les shards bundled-plugin, les shards de contrat de plugin et de channel, la compatibilité Node 22, `check-*`, `check-additional-*`, les vérifications de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS, Android et l'i18n de l'interface utilisateur de contrôle.

Utilisez cette boîte pour répondre à la question « l'arborescence source a-t-elle réussi la suite de tests normale complète ? » Ce n'est pas la même chose que la validation produit du chemin de version (release-path). Preuves à conserver :

- Résumé `Full Release Validation` montrant l'URL de l'exécution `CI` envoyée
- Exécution `CI` réussie sur le SHA cible exact
- noms de shards échoués ou lents provenant des tâches CI lors de l'investigation des régressions
- Artefacts de timing Vitest tels que `.artifacts/vitest-shard-timings.json` lorsqu'une exécution nécessite une analyse des performances

Exécutez le CI manuellement directement uniquement lorsque la version nécessite un CI normal déterministe mais pas les boîtes Docker, QA Lab, live, cross-OS ou package :

```bash
gh workflow run ci.yml --ref main -f target_ref=release/YYYY.M.D
```

### Docker

La boîte Docker se trouve dans `OpenClaw Release Checks` via `openclaw-live-and-e2e-checks-reusable.yml`, ainsi que le workflow `install-smoke` en mode release. Elle valide le candidat à la version via des environnements Docker empaquetés au lieu de tests uniquement au niveau source.

La couverture de Docker de la version inclut :

- test de fumée d'installation complète avec le test de fumée d'installation globale lente de Bun activé
- préparation/réutilisation de l'image de fumée Dockerfile racine par SHA cible, avec QR, root/gateway et les tâches de fumée installer/Bun s'exécutant en tant que shards install-smoke distincts
- voies E2E du référentiel
- release-path Docker chunks : Docker`core`, `package-update-openai`,
  `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`,
  `plugins-runtime-services`,
  `plugins-runtime-install-a`, `plugins-runtime-install-b`,
  `plugins-runtime-install-c`, `plugins-runtime-install-d`,
  `plugins-runtime-install-e`, `plugins-runtime-install-f`,
  `plugins-runtime-install-g`, et `plugins-runtime-install-h`
- Couverture OpenWebUI dans le chunk `plugins-runtime-services` lorsque demandé
- voies d'installation/désinstallation de plugins groupées séparées
  `bundled-plugin-install-uninstall-0` à
  `bundled-plugin-install-uninstall-23`
- suites de provider live/E2E et couverture de modèle live Docker lorsque les vérifications de release
  incluent des suites live

Utilisez les artefacts Docker avant de réexécuter. Le planificateur release-path télécharge
Docker`.artifacts/docker-tests/` avec les journaux de voie, `summary.json`, `failures.json`,
les timings de phase, le plan du planificateur JSON et les commandes de réexécution. Pour une récupération ciblée,
utilisez `docker_lanes=<lane[,lane]>` sur le workflow réutilisable live/E2E au lieu de
réexécuter tous les chunks de release. Les commandes de réexécution générées incluent les
`package_artifact_run_id`Docker antérieurs et les entrées d'image Docker préparées lorsque disponibles, de sorte qu'une
voie échouée puisse réutiliser la même archive et les images GHCR.

### Labo QA

La box Labo QA fait également partie de `OpenClaw Release Checks`Docker. Il s'agit de la barrière de release
au niveau du comportement agentique et du channel, distincte de la mécanique de packaging
Vitest et Docker.

La couverture du Labo QA de release inclut :

- voie de parité mock comparant la voie candidate OpenAI à la base de référence
  Opus 4.6 en utilisant le pack de parité agentique
- profil QA live Matrix rapide utilisant l'environnement Matrix`qa-live-shared`
- voie QA live Telegram utilisant les baux d'identification Convex CI
- `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke`, ou
  `pnpm qa:observability:smoke` lorsque la télémétrie de release nécessite une preuve
  locale explicite

Utilisez cette case pour répondre à la question « la version se comporte-t-elle correctement dans les scénarios QA et les flux de canaux en direct ? ». Conservez les URL d'artefacts pour les canaux de parité, Matrix et Telegram lors de l'approbation de la version. La couverture complète de Matrix reste disponible sous la forme d'une exécution manuelle partitionnée du QA-Lab plutôt que comme le canal critique par défaut pour la version.

### Package

La case Package est la porte du produit installable. Elle est soutenue par `Package Acceptance` et le résolveur `scripts/resolve-openclaw-package-candidate.mjs`. Le résolveur normalise un candidat dans l'archive `package-under-test` consommée par Docker E2E, valide l'inventaire du package, enregistre la version du package et le SHA-256, et maintient la référence du harnais de workflow séparée de la référence source du package.

Sources de candidats prises en charge :

- `source=npm` : `openclaw@beta`, `openclaw@latest`, ou une version de release exacte de OpenClaw
- `source=ref` : empaqueter une branche, une balise ou un SHA de commit complet approuvé `package_ref` avec le harnais `workflow_ref` sélectionné
- `source=url` : télécharger un `.tgz` HTTPS public avec le `package_sha256` requis ; les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte ou adresses résolues privés/internes/à usage spécial, et les redirections non sécurisées sont rejetés
- `source=trusted-url` : télécharger un `.tgz` HTTPS avec le `package_sha256` et le `trusted_source_id` requis à partir d'une stratégie nommée dans `.github/package-trusted-sources.json` ; utilisez ceci pour les miroirs d'entreprise appartenant aux mainteneurs ou les référentiels de packages privés au lieu d'ajouter un contournement de réseau privé au niveau des entrées à `source=url`
- `source=artifact` : réutiliser un `.tgz` téléchargé par une autre exécution GitHub Actions

`OpenClaw Release Checks` exécute l'acceptation de package avec `source=artifact`, l'artefact de package de version préparé, `suite_profile=custom`,
`docker_lanes=doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update`,
`telegram_mode=mock-openai`ClawHubTelegram. L'acceptation de package maintient la migration, la mise à jour,
le redémarrage de mise à jour configured-auth, l'installation en direct de la compétence ClawHub, le nettoyage des dépendances de plugins obsolètes, les fixtures de plugins hors ligne,
la mise à jour des plugins et la QA de package Telegram par rapport à la même archive tar
résolue. Les vérifications de version bloquantes utilisent la ligne de base par défaut du dernier package
publié ; `run_release_soak=true` ou
`release_profile=full`npm s'étend à chaque ligne de base stable publiée sur npm
de `2026.4.23` à `latest` plus les fixtures de problèmes signalés. Utilisez
l'acceptation de package avec `source=npm` pour un candidat déjà livré,
`source=ref`npm pour une archive tar npm locale soutenue par un SHA avant publication,
`source=trusted-url` pour un miroir d'entreprise/privé détenu par un mainteneur, ou
`source=artifact`GitHubGitHub pour une archive tar préparée téléchargée par une autre exécution GitHub Actions.
C'est le remplacement natif GitHub
pour la plupart de la couverture de mise à jour de package qui nécessitait auparavant
Parallels. Les vérifications de version multi-OS restent importantes pour l'onboarding,
l'installateur et le comportement spécifiques à l'OS, mais la validation produit de la mise à jour de package doit
préférer l'acceptation de package.

La liste de contrôle canonique pour la validation de la mise à jour et des plugins est
[Testing updates and plugins](/fr/help/testing-updates-pluginsDocker). Utilisez-la lors
de la décision de savoir quelle voie locale, Docker, d'acceptation de package ou de vérification de version prouve une
installation/mise à jour de plugin, un nettoyage de médecin ou un changement de migration de package publié.
La migration exhaustive de mise à jour publiée à partir de chaque package stable `2026.4.23+` est
un workflow manuel `Update Migration` distinct, qui ne fait pas partie de la CI de version complète.

La clémence de l'acceptation des packages de l'ancienne version est intentionnellement limitée dans le temps. Les packages jusqu'au `2026.4.25` peuvent utiliser le chemin de compatibilité pour les écarts de métadonnées déjà publiés sur npm : entrées d'inventaire QA privées manquantes dans l'archive, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le dispositif git dérivé de l'archive, `update.channel` persistants manquants, emplacements d'enregistrement d'installation de plugin hérités, persistance d'enregistrement d'installation de la place de marché manquante, et migration des métadonnées de configuration pendant `plugins update`. Le package `2026.4.26` publié peut avertir pour les fichiers d'horodatage des métadonnées de build local qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire les contrats de package modernes ; ces mêmes écarts entraînent l'échec de la validation de la version.

Utilisez des profils d'acceptation de package plus larges lorsque la question de version concerne un package réellement installable :

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

- `smoke` : voies rapides d'installation de package/channel/agent, de réseau de passerelle et de rechargement de configuration
- `package` : contrats de package d'installation/mise à jour/redémarrage/plugin plus preuve d'installation de compétence en direct ClawHub ; ceci est la valeur par défaut de release-check
- `product` : `package` plus les canaux MCP, le nettoyage cron/subagent, la recherche web OpenAI et OpenWebUI
- `full` : morceaux de chemin de publication Docker avec OpenWebUI
- `custom` : liste exacte `docker_lanes` pour les réexécutions ciblées

Pour la preuve Telegram des candidats packages, activez `telegram_mode=mock-openai` ou `telegram_mode=live-frontier` sur l'acceptation de package. Le workflow transmet l'archive tarball `package-under-test` résolue dans la voie Telegram ; le workflow autonome Telegram accepte toujours une spec npm publiée pour les vérifications post-publication.

## Automatisation de la publication des versions

`OpenClaw Release Publish` est le point d'entrée de publication modifiant normal. Il orchestre les workflows de l'éditeur de confiance dans l'ordre dont la version a besoin :

1. Extrayez le tag de version et résolvez son commit SHA.
2. Vérifiez que le tag est accessible depuis `main` ou `release/*`.
3. Exécutez `pnpm plugins:sync:check`.
4. Déclenchez `Plugin NPM Release` avec `publish_scope=all-publishable` et
   `ref=<release-sha>`.
5. Déclenchez `Plugin ClawHub Release` avec la même portée (scope) et SHA.
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

Utilisez les workflows de bas niveau `Plugin NPM Release` et `Plugin ClawHub Release`
uniquement pour des réparations ciblées ou des travaux de republication. Pour une réparation de plugin sélectionné, passez
`plugin_publish_scope=selected` et `plugins=@openclaw/name` à
`OpenClaw Release Publish`, ou déclenchez le workflow enfant directement lorsque le
package OpenClaw ne doit pas être publié.

## Entrées du workflow NPM

`OpenClaw NPM Release` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis tel que `v2026.4.2`, `v2026.4.2-1`, ou
  `v2026.4.2-beta.1` ; lorsqu'il s'agit de `preflight_only=true`, il peut aussi s'agir du SHA complet
  sur 40 caractères du commit de la branche de workflow actuel pour une pré-vol de validation uniquement
- `preflight_only` : `true` pour validation/build/package uniquement, `false` pour le
  chemin réel de publication
- `preflight_run_id` : requis sur le chemin réel de publication afin que le workflow réutilise
  l'archive tarball préparée lors de l'exécution réussie de la pré-vol
- `npm_dist_tag` : tag cible npm pour le chemin de publication ; par défaut `beta`

`OpenClaw Release Publish` accepte ces entrées contrôlées par l'opérateur :

- `tag` : tag de version requis ; doit déjà exister
- `preflight_run_id` : ID d'exécution préflight réussie de `OpenClaw NPM Release` ;
  requis lorsque `publish_openclaw_npm=true`
- `npm_dist_tag` : tag cible npm pour le paquet OpenClaw
- `plugin_publish_scope` : par défaut `all-publishable` ; utilisez `selected` uniquement
  pour des travaux de réparation ciblés
- `plugins` : noms de paquets `@openclaw/*` séparés par des virgules lorsque
  `plugin_publish_scope=selected`
- `publish_openclaw_npm` : par défaut `true` ; définissez `false` uniquement lors de l'utilisation du
  workflow en tant qu'orchestrateur de réparation pour plugins uniquement
- `wait_for_clawhub` : par défaut `false` afin que la disponibilité npm ne soit pas bloquée par
  le sidecar ClawHub ; définissez `true` uniquement lorsque l'achèvement du workflow doit inclure
  l'achèvement de ClawHub

`OpenClaw Release Checks` accepte ces entrées contrôlées par l'opérateur :

- `ref` : branche, tag ou SHA de commit complet à valider. Les vérifications comportant des secrets
  nécessitent que le commit résolu soit accessible depuis une branche OpenClaw ou
  un tag de release.
- `run_release_soak` : opter pour une analyse exhaustive en direct/E2E, le chemin de release Docker et
  une analyse de survie de mise à niveau all-since sur les vérifications de release stables/par défaut. Elle est forcée
  activée par `release_profile=full`.

Règles :

- Les tags stables et de correction peuvent être publiés soit sur `beta` soit sur `latest`
- Les tags de prérelease bêta peuvent être publiés uniquement sur `beta`
- Pour `OpenClaw NPM Release`, l'entrée du SHA de commit complet n'est autorisée que lorsque
  `preflight_only=true`
- `OpenClaw Release Checks` et `Full Release Validation` sont toujours
  validation uniquement
- Le véritable chemin de publication doit utiliser le même `npm_dist_tag` utilisé lors du préflight ;
  le workflow vérifie ces métadonnées avant que la publication ne continue

## Séquence de release npm stable

Lors de la création d'une version stable npm :

1. Exécutez `OpenClaw NPM Release` avec `preflight_only=true`
   - Avant qu'une balise (tag) n'existe, vous pouvez utiliser le SHA de commit complet de la branche de workflow actuelle
     pour un essai à blanc de validation uniquement du workflow de pré-vol
2. Choisissez `npm_dist_tag=beta` pour le flux normal bêta en premier, ou `latest` uniquement
   lorsque vous souhaitez intentionnellement une publication stable directe
3. Exécutez `Full Release Validation` sur la branche de version, la balise de version, ou le SHA
   de commit complet lorsque vous voulez une CI normale plus le cache de prompts en direct, Docker, QA Lab,
   Matrix et Telegram via un workflow manuel unique
4. Si vous avez intentionnellement uniquement besoin du graphe de tests normal déterministe, exécutez plutôt
   le workflow manuel `CI` sur la référence de version
5. Sauvegardez le `preflight_run_id` réussi
6. Exécutez `OpenClaw Release Publish` avec le même `tag`, le même `npm_dist_tag`,
   et le `preflight_run_id` sauvegardé ; il publie les plugins externalisés sur npm
   et ClawHub avant de promouvoir le paquet OpenClaw npm
7. Si la version a atterri sur `beta`, utilisez le workflow privé
   `openclaw/releases-private/.github/workflows/openclaw-npm-dist-tags.yml`
   pour promouvoir cette version stable de `beta` vers `latest`
8. Si la version a été intentionnellement publiée directement sur `latest` et que `beta`
   doit suivre immédiatement la même version stable, utilisez ce même workflow privé
   pour faire pointer les deux balises de distribution (dist-tags) vers la version stable, ou laissez sa synchronisation
   auto-réparatrice programmée déplacer `beta` plus tard

La mutation de la balise de distribution (dist-tag) réside dans le dépôt privé pour des raisons de sécurité car elle
nécessite encore `NPM_TOKEN`, tandis que le dépôt public conserve une publication OIDC uniquement.

Cela permet de garder le chemin de publication directe et le chemin de promotion bêta en premier tous deux
documentés et visibles par les opérateurs.

Si un mainteneur doit revenir à l'authentification npm locale, n'exécutez les commandes de l'interface en ligne de commande (CLI) 1Password (npmCLI`op`) qu'à l'intérieur d'une session tmux dédiée. N'appelez pas `op`
directement depuis le shell de l'agent principal ; le maintenir à l'intérieur de tmux rend les invites, les alertes et la gestion des OTP observables et empêche les alertes d'hôte répétées.

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

Les mainteneurs utilisent la documentation de release privée dans
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
pour le runbook réel.

## Connexes

- [Canaux de release](/fr/install/development-channels)

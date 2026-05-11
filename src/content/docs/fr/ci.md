---
summary: "Graphe de tâches CI, portées des portes et équivalents de commandes locales"
title: Pipeline CI
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging failing GitHub Actions checks
---

La CI s'exécute à chaque envoi vers `main` et à chaque demande de tirage (pull request). Elle utilise une portée intelligente pour ignorer les tâches coûteuses lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch` contournent intentionnellement la portée intelligente et déploient le graphe CI normal complet pour les candidats à la publication ou une validation large.

`Full Release Validation` est le workflow parapluie manuel pour « tout exécuter
avant la publication ». Il accepte une branche, une balise ou un SHA de commit complet, envoie le
workflow manuel `CI` avec cette cible et envoie `OpenClaw Release Checks`
pour le test de fumée d'installation, l'acceptation des paquets, les suites de chemins de publication Docker, en direct/E2E,
OpenWebUI, la parité QA Lab, les voies Matrix et Telegram. Il peut également exécuter le
workflow de post-publication `NPM Telegram Beta E2E` lorsqu'une spécification de paquet publiée est
fournie. Le parapluie enregistre les identifiants des exécutions enfants envoyées, et la tâche finale
`Verify full validation` vérifie à nouveau les conclusions des exécutions enfants actuelles. Si un
workflow enfant est réexécuté et devient vert, réexécutez uniquement la tâche de vérification parente pour
actualiser le résultat du parapluie.

L'enfant de publication live/E2E maintient une couverture native étendue de `pnpm test:live`, mais il
l'exécute sous forme de fragments nommés (`native-live-src-agents`, `native-live-src-gateway`,
`native-live-test`, `native-live-extensions-a-k` et
`native-live-extensions-l-z`) via `scripts/test-live-shard.mjs` au lieu d'
une tâche série unique. Cela permet de conserver la même couverture de fichiers tout en rendant les échecs lents du
provider en direct plus faciles à réexécuter et à diagnostiquer.

`Package Acceptance` est le workflow d'exécution parallèle pour valider un artefact de package
sans bloquer le workflow de publication. Il résout un candidat à partir d'une
spécification npm publiée, une image de confiance `package_ref` construite avec le
harnais `workflow_ref` sélectionné, une URL d'archive HTTPS avec SHA-256, ou un artefact d'archive
provenant d'une autre exécution d'actions GitHub, le téléverse en tant que `package-under-test`, puis réutilise
le planificateur de publication/E2E Docker avec cette archive au lieu de réempaqueter
l'extraction du workflow. Les profils couvrent les sélections de voies Docker de type test de fumée (smoke), package, produit, complet et personnalisé.
Le profil `package` utilise une couverture de plug-in hors ligne afin que
la validation du package publié ne soit pas bloquée par la disponibilité en ligne de ClawHub. La
voie Telegram optionnelle réutilise l'artefact
`package-under-test` dans le workflow `NPM Telegram Beta E2E`, le
chemin de la spécification npm publiée étant conservé pour les déclenchements autonomes.

## Acceptation de package

Utilisez `Package Acceptance` lorsque la question est « ce package OpenClaw installable
fonctionne-t-il comme un produit ? ». Il diffère de la CI normale : la CI normale valide
l'arborescence source, tandis que l'acceptation de package valide une archive unique via le
même harnais E2E Docker que les utilisateurs exercent après l'installation ou la mise à jour.

Le workflow comporte quatre tâches :

1. `resolve_package` extrait `workflow_ref`, résout un candidat de package,
   écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit
   `.artifacts/docker-e2e-package/package-candidate.json`, téléverse les deux en tant que
   artefact `package-under-test` et imprime la source, la référence du workflow, la référence
   du package, la version, le SHA-256 et le profil dans le résumé d'étape GitHub.
2. `docker_acceptance` appelle
   `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et
   `package_artifact_name=package-under-test`. Le workflow réutilisable télécharge
   cet artefact, valide l'inventaire de l'archive, prépare les images
   Docker de digest de package si nécessaire et exécute les voies Docker sélectionnées sur ce
   package au lieu d'empaqueter l'extraction du workflow.
3. `package_telegram` appelle facultativement `NPM Telegram Beta E2E`. Il s'exécute lorsque
   `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test`
   lorsque l'acceptation de package en a résolu un ; un dispatch autonome Telegram
   peut toujours installer une spécification npm publiée.
4. `summary` fait échouer le workflow si la résolution de package, l'acceptation Docker ou
   la voie Telegram optionnelle a échoué.

Sources candidates :

- `source=npm` : n'accepte que `openclaw@beta`, `openclaw@latest`, ou une version de
  publication OpenClaw exacte telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour
  l'acceptation bêtable/stable publiée.
- `source=ref` : empaquète une branche `package_ref` de confiance, une balise ou un SHA de commit complet.
  Le résolveur récupère les branches/balises OpenClaw, vérifie que le commit sélectionné est
  accessible à partir de l'historique des branches du dépôt ou d'une balise de version, installe les dépendances dans un
  arbre de travail détaché et l'empaquette avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` : télécharge un `.tgz` HTTPS ; `package_sha256` est requis.
- `source=artifact` : télécharge un `.tgz` depuis `artifact_run_id` et
  `artifact_name` ; `package_sha256` est facultatif mais devrait être fourni pour
  les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harness
de confiance qui exécute le test. `package_ref` est le commit source
qui est empaqueté lors de `source=ref`. Cela permet au harnais de test actuel de valider
d'anciens commits source de confiance sans exécuter une ancienne logique de workflow.

Les profils correspondent à la couverture Docker :

- `smoke` : `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` : `npm-onboard-channel-agent`, `doctor-switch`,
  `update-channel-switch`, `bundled-channel-deps-compat`, `plugins-offline`,
  `plugin-update`
- `product` : `package` plus `mcp-channels`, `cron-mcp-cleanup`,
  `openai-web-search-minimal`, `openwebui`
- `full` : full Docker release-path chunks with OpenWebUI
- `custom` : exact `docker_lanes`; required when `suite_profile=custom`

Release checks call Package Acceptance with `source=ref`,
`package_ref=<release-ref>`, `workflow_ref=<release workflow ref>`,
`suite_profile=custom`,
`docker_lanes='bundled-channel-deps-compat plugins-offline'`, and
`telegram_mode=mock-openai`. The release-path Docker
chunks cover the overlapping package/update/plugin lanes, while Package
Acceptance keeps the artifact-native bundled-channel compat, offline plugin, and
Telegram proof against the same resolved package tarball.
Cross-OS release checks still cover OS-specific onboarding, installer, and
platform behavior; package/update product validation should start with Package
Acceptance. The Windows packaged and installer fresh lanes also verify that an
installed package can import a browser-control override from a raw absolute
Windows path.

L'acceptation des packages dispose d'une fenêtre de compatibilité héritée délimitée pour les packages déjà publiés via `2026.4.25`, y compris `2026.4.25-beta.*`. Ces tolérances sont documentées ici pour qu'elles ne deviennent pas des omissions silencieuses permanentes : les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent émettre un avertissement lorsque l'archive omet ces fichiers ; `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ; `update-channel-switch` peut supprimer les `pnpm.patchedDependencies` manquantes du faux fichier d'installation git dérivé de l'archive et peut consigner les `update.channel` persistants manquants ; les tests de fumée des plugins peuvent lire les emplacements hérités des enregistrements d'installation ou accepter l'absence de persistance des enregistrements d'installation de la place de marché ; et `plugin-update` peut permettre la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement de non-réinstallation restent inchangés. Les packages après `2026.4.25` doivent satisfaire les contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'ignorer.

Exemples :

```bash
# Validate the current beta package with product-level coverage.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai

# Pack and validate a release branch with the current harness.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=ref \
  -f package_ref=release/YYYY.M.D \
  -f suite_profile=package \
  -f telegram_mode=mock-openai

# Validate a tarball URL. SHA-256 is mandatory for source=url.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=url \
  -f package_url=https://example.com/openclaw-current.tgz \
  -f package_sha256=<64-char-sha256> \
  -f suite_profile=smoke

# Reuse a tarball uploaded by another Actions run.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=package-under-test \
  -f suite_profile=custom \
  -f docker_lanes='install-e2e plugin-update'
```

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, journaux de voie, timings de phase et commandes de réexécution. Préférez la réexécution du profil de package ayant échoué ou des voies Docker exactes plutôt que la réexécution de la validation complète de version.

Le QA Lab dispose de volets CI dédiés en dehors du workflow principal avec portée intelligente. Le workflow `Parity gate` s'exécute sur les modifications de PR correspondantes et le déclenchement manuel ; il construit l'environnement d'exécution QA privé et compare les packs d'agents simulés GPT-5.5 et Opus 4.6. Le workflow `QA-Lab - All Lanes` s'exécute toutes les nuits sur `main` et lors du déclenchement manuel ; il déploie la porte de parité simulée, le volet Matrix en direct, et les volets Telegram et Discord en direct en tant que travaux parallèles. Les travaux en direct utilisent l'environnement `qa-live-shared`, et Telegram/Discord utilisent des baux Convex. Matrix utilise `--profile fast` pour les portes planifiées et de version, en ajoutant `--fail-fast` uniquement lorsque la CLI extraite le prend en charge. La valeur par défaut de la CLI et l'entrée de workflow manuel restent `all` ; le déclenchement manuel `matrix_profile=all`
fragmente toujours la couverture Matrix complète en travaux `transport`, `media`,
`e2ee-smoke`, `e2ee-deep` et `e2ee-cli`. `OpenClaw Release Checks` exécute également les volets QA Lab critiques pour la version avant l'approbation de la version.

Le workflow `Duplicate PRs After Merge` est un workflow manuel de maintenance pour le nettoyage des doublons après intégration. Il est en mode dry-run par défaut et ne ferme que les PR explicitement répertoriés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR intégré a été fusionné et que chaque doublon a soit un problème référencé partagé, soit des blocs de modifications chevauchants.

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour maintenir la documentation existante alignée avec les modifications récemment intégrées. Il n'a pas de planification pure : une exécution CI de push non-bot réussie sur `main` peut la déclencher, et un déclenchement manuel peut l'exécuter directement. Les invocations de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution non ignorée de Docs Agent a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits du SHA source Docs Agent précédent non ignoré jusqu'au `main` actuel, de sorte qu'une exécution horaire peut couvrir toutes les modifications principales accumulées depuis le dernier passage de documentation.

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements
pour les tests lents. Il n'a pas de planification pure : une exécution de CI de push non-bot réussie sur
`main` peut la déclencher, mais elle est ignorée si une autre invocation de workflow s'est déjà
exécutée ou est en cours ce jour-là en UTC. La répartition manuelle contourne cette porte d'activité
quotidienne. La voie génère un rapport de performance Vitest groupé pour la suite complète, permet à Codex
d'apporter uniquement de petites corrections de performance de tests préservant la couverture au lieu de refactorisations
larges, puis réexécute le rapport complet et rejette les modifications qui réduisent le
nombre de tests de référence réussis. Si la référence contient des tests échouants, Codex peut corriger
uniquement les échecs évidents et le rapport complet après agent doit réussir avant
que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot n'atterrisse, la voie
rebase le correctif validé, réexécute `pnpm check:changed` et réessaie le push ;
les correctifs obsolètes en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action
Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Aperçu des tâches

| Tâche                            | Objectif                                                                                                                              | Quand elle s'exécute                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                      | Détecter les modifications uniquement de documentation, les portées modifiées, les extensions modifiées et construire le manifeste CI | Toujours sur les pushs et les PRs non-brouillons      |
| `security-scm-fast`              | Détection de clé privée et audit de workflow via `zizmor`                                                                             | Toujours sur les pushs et les PRs non-brouillons      |
| `security-dependency-audit`      | Audit de lockfile de production sans dépendance contre les avis npm                                                                   | Toujours sur les pushs et les PRs non-brouillons      |
| `security-fast`                  | Agrégat requis pour les tâches de sécurité rapides                                                                                    | Toujours sur les pushs et les PRs non-brouillons      |
| `build-artifacts`                | Construire `dist/`, l'interface de contrôle, les vérifications d'artefacts construits et les artefacts en aval réutilisables          | Modifications pertinentes pour Node                   |
| `checks-fast-core`               | Voies de correction Linux rapides telles que les vérifications bundled/plugin-contract/protocol                                       | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels` | Vérifications de contrat de canal partitionnées avec un résultat de vérification agrégé stable                                        | Modifications pertinentes pour Node                   |
| `checks-node-extensions`         | Partitions de tests bundled-plugin complètes sur la suite d'extensions                                                                | Modifications pertinentes pour Node                   |
| `checks-node-core-test`          | Shards de tests Core Node, à l'exclusion des voies channel, bundled, contract et extension                                            | Modifications pertinentes pour Node                   |
| `check`                          | Équivalent de la porte locale principale fractionnée : types de production, lint, gardes, types de tests et tests de fumée stricts    | Modifications pertinentes pour Node                   |
| `check-additional`               | Shards de gardes d'architecture, de limites, de surface d'extension, de limites de paquets et de surveillance de passerelle           | Modifications pertinentes pour Node                   |
| `build-smoke`                    | Tests de fumée CLI intégrés et tests de fumée de mémoire de démarrage                                                                 | Modifications pertinentes pour Node                   |
| `checks`                         | Vérificateur pour les tests de canal d'artefacts intégrés                                                                             | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`      | Voie de build et de tests de compatibilité Node 22                                                                                    | Répartition manuelle de CI pour les versions          |
| `check-docs`                     | Vérifications de formatage, de lint et de liens brisés pour la documentation                                                          | Documentation modifiée                                |
| `skills-python`                  | Ruff + pytest pour les compétences basées sur Python                                                                                  | Modifications pertinentes pour les compétences Python |
| `checks-windows`                 | Tests de processus/chemin spécifiques à Windows plus régressions de spécificateurs d'importation d'exécution partagés                 | Modifications pertinentes pour Windows                |
| `macos-node`                     | Voie de test TypeScript macOS utilisant les artefacts de construction partagés                                                        | Modifications pertinentes pour macOS                  |
| `macos-swift`                    | Lint, construction et tests Swift pour l'application macOS                                                                            | Modifications pertinentes pour macOS                  |
| `android`                        | Tests unitaires Android pour les deux variantes plus une construction APK de débogage                                                 | Modifications pertinentes pour Android                |
| `test-performance-agent`         | Optimisation quotidienne des tests lents Codex après une activité de confiance                                                        | Succès du CI principal ou répartition manuelle        |

Les répartitions manuelles de CI exécutent le même graphe de tâches que le CI normal, mais forcent l'activation de chaque voie délimitée : shards Node Linux, shards de plugins groupés, contrats de canal, compatibilité Node 22, `check`, `check-additional`, tests de fumée de construction, vérifications de documentation, compétences Python, Windows, macOS, Android, et i18n de l'interface utilisateur de contrôle. Les exécutions manuelles utilisent un groupe de simultanéité unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée optionnelle `target_ref` permet à un appelant de confiance d'exécuter ce graphe sur une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow à partir de la référence de répartition sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha>
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Ordre d'échec rapide

Les tâches sont ordonnées de sorte que les vérifications légères échouent avant que les plus lourdes ne s'exécutent :

1. `preflight` détermine quelles voies existent. Les logiques `docs-scope` et `changed-scope` sont des étapes à l'intérieur de cette tâche, et non des tâches autonomes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrices de plateformes.
3. `build-artifacts` chevauche les voies Linux rapides afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les voies plus lourdes de plateforme et d'exécution se déploient ensuite : `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-extensions`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`.
La distribution manuelle ignore la détection des modifications de portée et fait agir le manifeste préliminaire
comme si chaque zone délimitée avait changé.
Les modifications du workflow CI valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas les builds natifs Windows, Android ou macOS par eux-mêmes ; ces voies de plateforme restent limitées aux modifications de la source de la plateforme.
Les modifications uniquement liées au routage CI, les modifications de fixtures de test de base peu coûteuses sélectionnées, et les modifications étroites d'aide au contrat de plug-in/routage de test utilisent un chemin de manifeste rapide uniquement Node : préliminaire, sécurité, et une seule tâche `checks-fast-core`. Ce chemin évite les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards complets du cœur, les shards de plug-ins regroupés, et les matrices de garde supplémentaires lorsque les fichiers modifiés sont limités aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
Les contrôles Node Windows sont limités aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de paquets, et aux surfaces du workflow CI qui exécutent cette voie ; les modifications sans rapport de la source, des plug-ins, des install-smoke et des tests uniquement restent sur les voies Node Linux afin qu'ils ne réservent pas un worker Windows de 16 vCPU pour une couverture déjà exercée par les shards de test normaux.
Le workflow séparé `install-smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture de smoke en `run_fast_install_smoke` et `run_full_install_smoke`. Les pull requests exécutent le chemin rapide pour les surfaces Docker/package, les modifications de package/manifeste de plug-ins regroupés, et les surfaces du plug-in central/channel/gateway/Plugin SDK que les travaux smoke Docker exercent. Les modifications de plug-ins regroupés source uniquement, les modifications de test uniquement et les modifications de docs uniquement ne réservent pas de workers Docker. Le chemin rapide construit l'image racine Dockerfile une fois, vérifie le CLI, exécute les agents delete shared-workspace CLI smoke, exécute le e2e de réseau de passerelle de conteneur, vérifie un argument de build d'extension regroupée, et exécute le profil CLI de plug-in regroupé délimité sous un délai d'attente de commande agrégé de 240 secondes avec chaque exécution Docker de scénario plafonnée séparément. Le chemin complet conserve l'installation de package QR et la couverture Docker/update de l'installateur pour les exécutions planifiées nocturnes, les distributions manuelles, les contrôles de release par appel de workflow, et les pull requests qui touchent réellement les surfaces de l'installateur/package/Docker. Les pushs vers `main`, y compris les commits de fusion, ne forcent pas le chemin complet ; lorsque la logique de portée modifiée demanderait une couverture complète lors d'un push, le workflow conserve le smoke Docker rapide et laisse le smoke d'installation complet aux validations nocturnes ou de release. Le smoke lent du fournisseur d'image d'installation global Docker est séparément bloqué par `run_bun_global_install_smoke` ; il s'exécute sur la planification nocturne et à partir du workflow de contrôles de release, et les distributions manuelles `install-smoke` peuvent l'activer, mais les pull requests et les pushs vers `main` ne l'exécutent pas. Les tests Bun QR et installateur conservent leurs propres Dockerfiles axés sur l'installation. Le `test:docker:all` local préconstruit une image de test live partagée, empaquette Docker une fois sous forme de tarball OpenClaw, et construit deux images `scripts/e2e/Dockerfile` partagées : un exécuteur Node/Git nu pour les voies installateur/update/dépendance de plug-in et une image fonctionnelle qui installe le même tarball dans `/app` pour les voies de fonctionnalité normales. Les définitions de voie npm résident dans `scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs`, et l'exécuteur exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1` ; réglez le nombre d'emplacements main-pool par défaut de 10 avec `OPENCLAW_DOCKER_ALL_PARALLELISM` et le nombre d'emplacements tail-pool sensible au fournisseur de 10 avec `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM`. Les plafonds de voie lourde sont par défaut `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` afin que les voies d'installation Docker et multi-service ne surchargent pas npm tandis que les voies plus légères remplissent toujours les emplacements disponibles. Une voie unique plus lourde que les plafonds effectifs peut toujours démarrer d'un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. Les démarrages de voie sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création du démon Docker local ; remplacer par `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=0` ou une autre valeur en millisecondes. L'agrégateur local préliminaire Docker, supprime les conteneurs E2E Docker périmés, émet le statut de voie active, persiste les minutages de voie pour l'ordre le-plus-long-en-premier, et prend en charge `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour l'inspection du planificateur. Il arrête la planification de nouvelles voies groupées après le premier échec par défaut, et chaque voie a un délai d'attente de repli de 120 minutes remplaçable par `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les voies live/tail sélectionnées utilisent des plafonds par voie plus stricts. `OPENCLAW_DOCKER_ALL_LANES=<lane[,lane]>` exécute les voies exactes du planificateur, y compris les voies release uniquement telles que `install-e2e` et les voies de mise à jour regroupées fractionnées telles que `bundled-channel-update-acpx`, tout en sautant le smoke de nettoyage pour que les agents puissent reproduire une voie en échec. Le workflow live/E2E réutilisable demande à `scripts/test-docker-all.mjs --plan-json` quel package, genre d'image, image live, voie et couverture d'informations d'identification sont requis, puis `scripts/docker-e2e.mjs` convertit ce plan en sorties et résumés OpenClaw. Il empaquette soit GitHub via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package à partir de `package_artifact_run_id` ; valide l'inventaire de la tarball ; construit et pousse les images E2E OpenClaw nues/fonctionnelles étiquetées avec le digest du package via le cache de couche Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images digest de package existantes au lieu de reconstruire. Le workflow `Package Acceptance` est la porte de package de haut niveau : il résout un candidat à partir de Docker, d'un `package_ref` de confiance, d'une tarball HTTPS plus SHA-256, ou d'un artefact de workflow précédent, puis passe cet artefact unique `package-under-test` dans le workflow E2E npm réutilisable. Il garde `workflow_ref` séparé de `package_ref` afin que la logique d'acceptation actuelle puisse valider les commits de confiance plus anciens sans extraire l'ancien code de workflow. Les contrôles de release exécutent un delta d'acceptation de package personnalisé pour la référence cible : compatibilité channel regroupé, fixtures de plug-in hors ligne, et QA de package Docker contre la tarball résolue. La suite Telegram du chemin de release exécute quatre travaux fractionnés avec `OPENCLAW_SKIP_DOCKER_BUILD=1` afin que chaque fraction ne tire que le genre d'image dont il a besoin et exécute plusieurs voies via le même planificateur pondéré (`OPENCLAW_DOCKER_ALL_PROFILE=release-path`, `OPENCLAW_DOCKER_ALL_CHUNK=core|package-update|plugins-runtime|bundled-channels`). OpenWebUI est intégré dans `plugins-runtime` lorsque la couverture complète du chemin de release le demande, et conserve une fraction `openwebui` autonome uniquement pour les distributions OpenWebUI uniquement. La fraction `package-update` divise l'E2E de l'installateur en `install-e2e-openai` et `install-e2e-anthropic` ; `install-e2e` reste l'alias de réexécution manuel agrégé. La fraction `bundled-channels` exécute les voies `bundled-channel-*` et `bundled-channel-update-*` fractionnées plutôt que la voie tout-en-un série `bundled-channel-deps` ; `plugins-integrations` reste un alias agrégé hérité pour les réexécutions manuelles. Chaque fraction téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le plan JSON du planificateur, les tables de voie lente, et les commandes de réexécution par voie. L'entrée de workflow `docker_lanes` exécute les voies sélectionnées contre les images préparées au lieu des travaux fractionnés, ce qui limite le débogage de voie en échec à un travail Docker ciblé et prépare, télécharge ou réutilise l'artefact de package pour cette exécution ; si une voie sélectionnée est une voie Docker live, le travail ciblé construit l'image de test live localement pour cette réexécution. Les commandes de réexécution Docker générées par voie incluent `package_artifact_run_id`, `package_artifact_name` et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie en échec puisse réutiliser le package exact et les images de l'exécution en échec. Utilisez `pnpm test:docker:rerun <run-id>` pour télécharger les artefacts GitHub à partir d'une exécution Docker et imprimer les commandes de réexécution ciblées combinées/par voie ; utilisez `pnpm test:docker:timings <summary.json>` pour les résumés de voie lente et de chemin critique de phase. Le workflow live/E2E planifié exécute quotidiennement la suite GitHub complète du chemin de release. La matrice de mise à jour regroupée est fractionnée par cible de mise à jour afin que les passes répétées de mise à jour Docker et de réparation du docteur puissent être partagées avec d'autres contrôles regroupés.

La logique locale de changed-lane réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de contrôle locale est plus stricte quant aux limites de l'architecture que la portée plus large de la plateforme CI : les modifications de production du cœur exécutent le cœur de production et le typecheck de test du cœur plus le cœur lint/guards, les modifications de test uniquement du cœur n'exécutent que le typecheck de test du cœur plus le cœur lint, les modifications de production de l'extension exécutent la production de l'extension et le typecheck de test de l'extension plus l'extension lint, et les modifications de test uniquement de l'extension exécutent le typecheck de test de l'extension plus l'extension lint. Les modifications du SDK public de plugins ou des contrats de plugins s'étendent au typecheck de l'extension car les extensions dépendent de ces contrats centraux, mais les passages de l'extension Vitest sont un travail de test explicite. Les mises à jour de version uniquement pour les métadonnées de version exécutent des vérifications ciblées de version/config/root-dependency. Les modifications inconnues de root/config échouent en toute sécurité sur toutes les voies de vérification.

Les répartitions manuelles CI exécutent `checks-node-compat-node22` en tant que couverture de compatibilité des candidats à la publication. Les demandes de tirage normales et les poussées `main` ignorent cette voie et gardent la matrice concentrée sur les voies de test/channel Node 24.

Les familles de tests Node les plus lentes sont divisées ou équilibrées afin que chaque travail reste petit sans trop réserver de runners : les contrats de canal s'exécutent sous forme de trois partitions pondérées, les tests de plugins groupés s'équilibrent sur six workers d'extension, les petits lanes d'unités de base sont couplés, la réponse automatique s'exécute sur quatre workers équilibrés avec le sous-arbre de réponse divisé en partitions agent-runner, dispatch et commands/state-routing, et les configurations de passerelle/plugin agentiques sont réparties sur les travaux Node agentiques existants « source-only » au lieu d'attendre les artefacts construits. Les tests étendus de navigateur, QA, multimédia et divers plugins utilisent leurs configurations Vitest dédiées au lieu de la configuration de capture globale partagée pour les plugins. Les travaux de partition d'extension exécutent jusqu'à deux groupes de configuration de plugin à la fois avec un worker Vitest par groupe et un tas Node plus important afin que les lots de plugins lourds en importations ne créent pas de travaux CI supplémentaires. Le lane d'agents étendu utilise le planificateur parallèle de fichiers Vitest partagé car il est dominé par les importations/planification plutôt que détenu par un seul fichier de test lent. `runtime-config` s'exécute avec la partition core-runtime d'infra pour empêcher la partition d'exécution partagée de détenir la queue. Les partitions de modèles d'inclusion enregistrent les entrées de synchronisation à l'aide du nom de la partition CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration complète d'une partition filtrée. `check-additional` regroupe le travail de compilation/canary lié aux limites des packages et sépare l'architecture de la topologie d'exécution de la couverture de surveillance de passerelle ; la partition de garde des limites exécute ses petites gardes indépendantes simultanément dans un seul travail. La surveillance de Gateway, les tests de canal et la partition de support de limites principales s'exécutent simultanément dans `build-artifacts` une fois que `dist/` et `dist-runtime/` sont déjà construits, en conservant leurs anciens noms de vérification en tant que travaux de vérification légers tout en évitant deux workers Blacksmith supplémentaires et une seconde file d'attente de consommateurs d'artefacts.
Le CI Android exécute à la fois `testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`, puis construit l'APK de débogage Play. La variante tierce n'a pas de jeu de sources ni de manifeste distincts ; son lane de tests unitaires compile toujours cette variante avec les indicateurs BuildConfig SMS/call-log, tout en évitant un travail de conditionnement d'APK de débogage en double à chaque poussée pertinente pour Android.
GitHub peut marquer les travaux remplacés comme `cancelled` lorsqu'une nouvelle poussée atterrit sur la même PR ou la référence `main`. Considérez cela comme du bruit CI, sauf si l'exécution la plus récente pour la même référence échoue également. Les vérifications de partition agrégées utilisent `!cancelled() && always()` afin qu'elles signalent toujours les échecs de partition normaux mais ne se mettent pas en file d'attente après que le workflow entier a déjà été remplacé.
La clé de concurrence CI automatique est versionnée (`CI-v7-*`) afin qu'un zombie côté GitHub dans un ancien groupe de files d'attente ne puisse pas bloquer indéfiniment les nouvelles exécutions principales. Les exécutions manuelles de la suite complète utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

## Exécuteurs

| Exécuteur                        | Tâches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, tâches de sécurité rapides et agrégats (`security-scm-fast`, `security-dependency-audit`, `security-fast`), vérifications rapides de protocole/contrat/groupées, vérifications de contrat de canal partitionnées, partitions `check` à l'exception de lint, partitions et agrégats `check-additional`, vérificateurs d'agrégats de tests Node, vérifications de docs, compétences Python, workflow-sanity, labeler, auto-response ; install-smoke preflight utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse mettre en file d'attente plus tôt |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`, build-smoke, partitions de tests Node Linux, partitions de tests de plugins groupés, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint`, qui reste suffisamment sensible au CPU pour que 8 vCPU coûtent plus que ce qu'ils ont économisé ; les builds Docker install-smoke, où le temps d'attente de la file de 32 vCPU coûtait plus que ce qu'il a économisé                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Équivalents locaux

```bash
pnpm changed:lanes   # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed   # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check          # fast local gate: production tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed    # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:changed   # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # build dist when CI artifact/build-smoke lanes matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
```

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de publication](/fr/install/development-channels)

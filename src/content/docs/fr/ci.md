---
summary: "Graphe de tâches CI, portes de portée, parapluies de version et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI s'exécute à chaque push vers OpenClaw`main` et chaque pull request. La tâche `preflight` classe les différences et désactive les volets coûteux lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la publication et les validations larges. Les volets Android restent en opt-in via `include_android`. La couverture des plugins uniquement pour les publications se trouve dans le workflow séparé [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

## Aperçu du pipeline

| Tâche                              | Objectif                                                                                                                                         | Quand elle s'exécute                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `preflight`                        | Détecte les modifications uniquement de documentation, les portées modifiées, les extensions modifiées et construit le manifeste CI              | Toujours sur les poussées et PRs non-brouillons       |
| `security-fast`                    | Détection de clé privée, audit de workflow via `zizmor`, et audit du lockfile de production                                                      | Toujours sur les poussées et PRs non-brouillons       |
| `check-dependencies`               | Passe de dépendance uniquement de production Knip plus la garde de liste d'autorisation de fichiers inutilisés                                   | Modifications pertinentes pour Node                   |
| `build-artifacts`                  | Build `dist/`CLI, Control UI, vérifications de fumée de la CLI intégrée, vérifications d'artefacts intégrés intégrés, et artefacts réutilisables | Modifications pertinentes pour Node                   |
| `checks-fast-core`                 | Volets de correction rapides Linux tels que bundled, protocol, et les vérifications CI-routing                                                   | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-plugins-*`  | Deux vérifications de contrat de plugin partitionnées                                                                                            | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels-*` | Deux vérifications de contrat de canal partitionnées                                                                                             | Modifications pertinentes pour Node                   |
| `checks-node-core-*`               | Partitions de test Node de base, à l'exclusion des volets channel, bundled, contract et extension                                                | Modifications pertinentes pour Node                   |
| `check-*`                          | Équivalent partitionné de la passerelle locale principale : types prod, lint, gardes, types de test et fumée stricte                             | Modifications pertinentes pour Node                   |
| `check-additional-*`               | Architecture, dérive de partition/prompt partitionnée, gardes d'extension, limite de package et topologie d'exécution                            | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`        | Volet de build et de fumée de compatibilité Node 22                                                                                              | Déclenchement manuel CI pour les publications         |
| `check-docs`                       | Vérifications de formatage, lint et de liens brisés pour les docs                                                                                | Docs modifiés                                         |
| `skills-python`                    | Ruff + pytest pour les compétences basées sur Python                                                                                             | Modifications pertinentes pour les compétences Python |
| `checks-windows`                   | Tests de processus/chemin spécifiques à Windows et régressions des spécificateurs d'importation du runtime partagé                               | Modifications pertinentes pour Windows                |
| `macos-node`                       | Voie de test TypeScript macOS utilisant les artefacts de construction partagés                                                                   | Modifications pertinentes pour macOS                  |
| `macos-swift`                      | Lint Swift, construction et tests pour l'application macOS                                                                                       | Modifications pertinentes pour macOS                  |
| `android`                          | Tests unitaires Android pour les deux variantes plus une construction d'APK de débogage                                                          | Modifications pertinentes pour Android                |
| `test-performance-agent`           | Optimisation des tests lents quotidiens de Codex après une activité de confiance                                                                 | Succès de la CI principale ou répartition manuelle    |
| `openclaw-performance`             | Rapports de performance d'exécution quotidiens/à la demande de Kova avec mock-provider, deep-profile et les voies en direct GPT 5.5              | Répartition planifiée et manuelle                     |

## Ordre d'échec rapide

1. `preflight` décide quelles voies existent. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de ce travail, pas des travaux autonomes.
2. `security-fast`, `check-*`, `check-additional-*`, `check-docs` et `skills-python` échouent rapidement sans attendre les travaux plus lourds d'artefacts et de matrice de plateforme.
3. `build-artifacts` chevauche les voies rapides de Linux afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Ensuite, les voies plus lourdes de plateforme et d'exécution se déploient : `checks-fast-core`, `checks-fast-contracts-plugins-*`, `checks-fast-contracts-channels-*`, `checks-node-core-*`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les travaux remplacés comme GitHub`cancelled` lorsqu'un nouveau push arrive sur la même PR ou la référence `main`Matrix. Considérez cela comme du bruit CI, sauf si l'exécution la plus récente pour la même référence échoue également. Les travaux Matrix utilisent `fail-fast: false`, et `build-artifacts` signale directement les échecs de channel intégrés, de limites de support principal (core-support-boundary) et de surveillance de passerelle (gateway-watch) au lieu de mettre en file d'attente de minuscules travaux de vérification. La clé de concurrence CI automatique est versionnée (`CI-v7-*`GitHub) afin qu'un zombie côté GitHub dans un ancien groupe de file d'attente ne puisse pas bloquer indéfiniment les nouvelles exécutions sur main. Les exécutions manuelles complètes utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

Le travail `ci-timings-summary` télécharge un artefact compact `ci-timings-summary` pour chaque exécution CI non brouillon. Il enregistre le temps écoulé, le temps d'attente, les travaux les plus lents et les travaux ayant échoué pour l'exécution en cours, afin que les vérifications de santé CI n'aient pas besoin d'extraire répétitivement la charge utile complète des Actions.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de portée modifiée et fait agir le manifeste prévol comme si chaque zone délimitée avait changé.

- Les **modifications du workflow CI** valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas par elles-mêmes les builds natifs Windows, Android ou macOS ; ces lignes de plateforme restent limitées aux modifications des sources de la plateforme.
- La **documentation sur les pushs `main`** est vérifiée par le workflow autonome `Docs`ClawHub avec le même miroir de documentation ClawHub utilisé par CI, de sorte que les pushs mixtes code+docs ne mettent pas non plus en file d'attente le shard CI `check-docs`. Les pull requests et le CI manuel exécutent toujours `check-docs` depuis CI lorsque la documentation change.
- **Les modifications uniquement liées au routage CI, les modifications sélectionnées de fixtures de test de base peu coûteuses et les modifications étroites d'aide de contrat de plug-in/routage de test** utilisent un chemin de manifeste rapide uniquement pour Node : `preflight`, la sécurité et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards de base complets, les shards de plug-ins regroupés et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de packages et aux surfaces du workflow CI qui exécutent ce canal ; les modifications de source, de plug-in, de test d'installation (install-smoke) et de test uniquement non liées restent sur les canaux Node Linux.

Les familles de tests Node les plus lentes sont divisées ou équilibrées pour que chaque travail reste petit sans sur-réserver les exécuteurs : les contrats de plugins et les contrats de canal s'exécutent chacun sous forme de deux partitions pondérées prises en charge par Blacksmith avec le repli sur l'exécuteur standard GitHub, les voies rapides/de support unitaires du noyau s'exécutent séparément, l'infrastructure d'exécution du noyau est répartie entre l'état, le processus/configuration, le partagé et trois partitions de domaine cron, la réponse automatique s'exécute sous forme de workers équilibrés (avec le sous-arbre de réponse divisé en partitions agent-exécuteur, répartition et commandes/routage d'état), et les configurations de passerelle/serveur agentic sont réparties sur les voies chat/auth/model/http-plugin/runtime/démarrage au lieu d'attendre les artefacts construits. Les tests larges de navigateur, de QA, de média et de plugins divers utilisent leurs configurations Vitest dédiées au lieu de la configuration globale de rattrapage pour plugins. Les partitions basées sur des modèles d'inclusion enregistrent des entrées de chronométrage en utilisant le nom de la partition CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration complète d'une partition filtrée. `check-additional-*` maintient ensemble le travail de compilation/canary lié aux limites des packages et sépare l'architecture de topologie d'exécution de la couverture de surveillance de la passerelle ; la liste des gardes de limite est répartie en une partition lourde en invites et une partition combinée pour les autres bandes de gardes, chacune exécutant les gardes indépendants sélectionnés simultanément et imprimant les chronométrages par vérification. La vérification coûteuse de la dérive des instantanés d'invite du chemin heureux Codex s'exécute en tant que travail supplémentaire distinct pour la CI manuelle et uniquement pour les modifications affectant les invites, afin que les modifications Node normales non liées n'attendent pas derrière la génération d'instantanés d'invite à froid et que les partitions de limite restent équilibrées tandis que la dérive d'invite est toujours épinglée à la PR qui l'a causée ; le même indicateur ignore la generation d'instantanés Vitest à l'intérieur de la partition de limite de support du noyau basée sur les artefacts construits. La surveillance de la Gateway, les tests de canal et la partition de limite de support du noyau s'exécutent simultanément à l'intérieur de `build-artifacts` après que `dist/` et `dist-runtime/` ont déjà été construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`Android puis génère le APK de débogage Play. La version tierce n'a pas de jeu de sources ni de manifeste distinct ; sa voie de test unitaire compile toujours la version avec les indicateurs BuildConfig SMS/journal des appels, tout en évitant une tâche de doublon d'empaquetage du APK de débogage à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendances-uniquement épinglée à la dernière version de Knip, avec l'âge de publication minimum de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip par rapport à `scripts/deadcode-unused-files.allowlist.mjs`. La garde des fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non examiné ou laisse une entrée d'autorisation périmée, tout en préservant les surfaces intentionnelles de plug-in dynamique, générées, de build, de test en direct et de pont de paquet que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extrait ni n'exécute de code de demande de tirage (pull request) non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des payloads compacts `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau des commits sur les pushes `main` ;
- `github_activity`GitHub pour l'activité GitHub générale que l'agent ClawSweeper peut inspecter.

La lane `github_activity` ne transmet que les métadonnées normalisées : le type d'événement, l'action, l'acteur, le dépôt, le numéro de l'élément, l'URL, le titre, l'état et de courts extraits pour les commentaires ou les révisions, le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui envoie l'événement normalisé au hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, pas une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne doit publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, les modifications, l'activité des bots, le bruit en double des webhooks et le trafic normal de révision doivent entraîner `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ils servent d'entrées pour le résumé et l'orientation, et non d'instructions pour le workflow ou l'exécution de l'agent.

## Répartitions manuelles

Les répartitions CI manuelles exécutent le même graphe de tâches que le CI normal mais activent toutes les lanes non étendues à Android : les shards Node Linux, les shards de plugins groupés, les shards de contrats de plugins et de channels, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de docs, les compétences Python, Windows, macOS et l'i18n de l'interface utilisateur de contrôle. Les répartitions CI manuelles autonomes n'exécutent Android qu'avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de prépublication de plugins, le shard `agentic-plugins` de publication uniquement, le balayage complet du lot d'extensions et les lanes de prépublication de plugins Docker sont exclus du CI. La suite de prépublication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow `Plugin Prerelease` distinct avec la porte release-validation activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée facultative `target_ref` permet à un appelant de confiance d'exécuter ce graphe sur une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow à partir de la référence de dispatch sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, vérifications de documentation, compétences Python, workflow-sanity, labeler, auto-response ; install-smoke preflight utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse se mettre en file d'attente plus tôt     |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `security-fast`, shards d'extension de poids inférieur, `checks-fast-core`, shards de contrat plugin/channel, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, et `check-test-types`                               |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de tests Node Linux, shards de tests de plugins regroupés, shards `check-additional-*`, `android`                                                                                                                                                      |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint`Docker (suffisamment sensibles au CPU pour que 8 vCPU coûtent plus cher que ce qu'ils économisaient) ; les builds Docker install-smoke (le temps d'attente dans la file de 32 vCPU coûtait plus cher que ce qu'il économisait) |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                              |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                  |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                 |

Le CI du dépôt canonique conserve Blacksmith comme chemin d'exécuteur par défaut. Durant `preflight`, `scripts/ci-runner-labels.mjs` vérifie les exécutions Actions récentes en file d'attente et en cours pour les tâches Blacksmith en file d'attente. Si une étiquette Blacksmith spécifique a déjà des tâches en file d'attente, les tâches en aval qui utiliseraient cette exacte étiquette reviennent à l'exécuteur hébergé par GitHub correspondant (`ubuntu-24.04`, `windows-2025` ou `macos-latest`) pour cette exécution uniquement. Les autres tailles Blacksmith dans la même famille de systèmes d'exploitation restent sur leurs étiquettes principales. Si la sonde API échoue, aucun retour n'est appliqué.

## Équivalents locaux

```bash
pnpm changed:lanes                            # inspect the local changed-lane classifier for origin/main...HEAD
pnpm check:changed                            # smart local check gate: changed typecheck/lint/guards by boundary lane
pnpm check                                    # fast local gate: prod tsgo + sharded lint + parallel fast guards
pnpm check:test-types
pnpm check:timed                              # same gate with per-stage timings
pnpm build:strict-smoke
pnpm check:architecture
pnpm test:gateway:watch-regression
pnpm test                                     # vitest tests
pnpm test:changed                             # cheap smart changed Vitest targets
pnpm test:channels
pnpm test:contracts:channels
pnpm check:docs                               # docs format + lint + broken links
pnpm build                                    # build dist when CI artifact/smoke checks matter
pnpm ci:timings                               # summarize the latest origin/main push CI run
pnpm ci:timings:recent                        # compare recent successful main CI runs
node scripts/ci-run-timings.mjs <run-id>      # summarize wall time, queue time, and slowest jobs
node scripts/ci-run-timings.mjs --latest-main # ignore issue/comment noise and choose origin/main push CI
node scripts/ci-run-timings.mjs --recent 10   # compare recent successful main CI runs
pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json
pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## Performances OpenClaw

`OpenClaw Performance` est le workflow de performance produit/runtime. Il s'exécute quotidiennement sur `main` et peut être déclenché manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le déclenchement manuel effectue généralement un benchmark de la référence du workflow. Définissez `target_ref` pour effectuer un benchmark d'une balise de version ou d'une autre branche avec l'implémentation actuelle du workflow. Les chemins de rapport publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version épinglée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois voies :

- `mock-provider` : scénarios de diagnostic Kova sur un runtime construit localement avec une authentification compatible OpenAI factice déterministe.
- `mock-deep-profile` : profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds de tour d'agent.
- `live-openai-candidate` : un tour d'agent réel OpenAI `openai/gpt-5.5`, ignoré lorsque `OPENAI_API_KEY` est indisponible.

Le couloir mock-provider exécute également des sondes de source natives OpenClaw après la passe Kova : le timing de démarrage et la mémoire de la passerelle pour les cas de démarrage par défaut, hook et 50 plugins ; des boucles de hello mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI répétées ; et des commandes de démarrage CLI contre la passerine démarrée. Le résumé Markdown des sondes de source se trouve à `source/index.md` dans le bundle de rapport, avec le JSON brut à côté.

Chaque couloir téléverse des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, des bundles, `index.md` et des artefacts de sonde de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel parapluie pour « exécuter tout avant la sortie ». Il accepte une branche, une balise ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease` pour la preuve de plugin/package/statique/Docker uniquement en version de sortie, et envoie `OpenClaw Release Checks` pour le test de fumée d'installation, l'acceptation des packages, les vérifications de packages multi-OS, la parité du Lab QA, les voies Matrix et Telegram. Les exécutions stables/défaut gardent une couverture exhaustive en direct/E2E et le chemin de sortie Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture de trempe pour que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` contre l'artefact `release-package-under-test` des vérifications de sortie. Après publication, passez `release_package_spec` pour réutiliser le package npm expédié à travers les vérifications de sortie, l'acceptation des packages, Docker, le multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un package différent.

Voir [Full release validation](/fr/reference/full-release-validation) pour la
matrice des étapes, les noms exacts des tâches de workflow, les différences de profil, les artefacts et
les poignées de réexécution ciblées.

`OpenClaw Release Publish` est le workflow de sortie à modification manuelle. Déclenchez-le
de `release/YYYY.M.D` ou `main` une fois que la balise de sortie existe et une fois que
la pré-vérification OpenClaw npm a réussi. Il vérifie `pnpm plugins:sync:check`,
envoie `Plugin NPM Release` pour tous les packages de plugins publiables, envoie
`Plugin ClawHub Release` pour le même SHA de sortie, et ensuite seulement envoie
`OpenClaw NPM Release` avec le `preflight_run_id` sauvegardé.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez l'assistant au lieu de
`gh workflow run ... --ref main -f ref=<sha>` :

```bash
pnpm ci:full-release --sha <full-sha>
```

Les références de dispatch de workflow GitHub doivent être des branches ou des balises, et non des SHA de commit bruts. L'assistant crée une branche temporaire `release-ci/<sha>-...` sur le SHA cible, lance `Full Release Validation` à partir de cette référence épinglée, vérifie que chaque workflow enfant `headSha` correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si un workflow enfant a été exécuté sur un SHA différent.

`release_profile` contrôle l'étendue direct/fournisseur transmise aux vérifications de version. Les workflows de version manuelle sont réglés par défaut sur `stable` ; n'utilisez `full` que lorsque vous souhaitez explicitement la matrice large de fournisseur/média consultatif. `run_release_soak` contrôle si les vérifications de version stables par défaut exécutent le test de mise en condition complet direct/E2E et le chemin de version Docker ; `full` force la mise en condition.

- `minimum` conserve les voies les plus rapides critiques pour la version OpenAI/core.
- `stable` ajoute l'ensemble stable de fournisseur/backend.
- `full` exécute la matrice large de fournisseur/média consultatif.

Le parapluie enregistre les ID des exécutions enfants envoyées, et le travail final `Verify full validation` vérifie à nouveau les conclusions des exécutions enfants actuelles et ajoute les tableaux des travaux les plus lents pour chaque exécution enfant. Si un workflow enfant est réexécuté et repasse au vert, ne réexécute que le travail du vérificateur parent pour rafraîchir le résultat du parapluie et le résumé des temps.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de pré-version du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de limiter la réexécution d'une version défaillante après une correction ciblée. Pour une seule voie inter-OS défaillante, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes inter-OS longues émettent des lignes de pulsation et les résumés de mise à jour des packages incluent des minutages par phase. Les voies de vérification de version QA sont consultives, à l'exception de la porte de couverture de l'outil d'exécution standard, qui bloque lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé de niveau standard.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois en une archive `release-package-under-test`, puis transmet cet artefact aux vérifications inter-OS et à l'acceptation des packages, ainsi qu'au workflow Docker de chemin de version live/E2E lorsque la couverture de trempage s'exécute. Cela permet de maintenir la cohérence des octets du package sur les boîtes de version et d'éviter de réempaqueter le même candidat dans plusieurs tâches enfants.

Les exécutions en double `Full Release Validation` pour `ref=main` et `rerun_group=all`
supplantent l'ancien parapluie. Le moniteur parent annule tout workflow enfant
qu'il a déjà distribué lorsque le parent est annulé, de sorte que la validation
main plus récente ne reste pas bloquée derrière une exécution de vérification
de version périmée de deux heures. La validation de branche/étiquette de version
et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

La release live/E2E enfant conserve une large couverture native `pnpm test:live`, mais l'exécute sous forme de partitions nommées via `scripts/test-live-shard.mjs` au lieu d'un travail séquentiel :

- `native-live-src-agents`
- `native-live-src-gateway-core`
- tâches `native-live-src-gateway-profiles` filtrées par provider
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- partitions audio/vidéo de média partagées et partitions musicales filtrées par provider

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des échecs lents des providers en direct. Les noms de partition agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions ponctuelles manuelles.

Les partitions de média natif en direct s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construit par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe`DockerDocker ; les tâches média ne vérifient que les binaires avant la configuration. Gardez les suites en direct basées sur Docker sur les runners Blacksmith normaux — les tâches conteneur ne sont pas l'endroit approprié pour lancer des tests Docker imbriqués.

Les partitions de modèle/backend en direct basées sur Docker utilisent une image Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI partagée distincte par commit sélectionné. Le workflow de release en direct construit et pousse cette image une seule fois, puis les partitions de modèle en direct Docker, de Gateway fragmenté par provider, de backend CLI, de liaison ACP et de harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`GatewayDocker. Les partitions Docker Gateway comportent des limites explicites au niveau du script `timeout`Docker inférieures au délai d'expiration de la tâche de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'intégralité du budget de vérification de la release. Si ces partitions reconstruisent indépendamment la cible Docker source complète, l'exécution de la release est mal configurée et perdra du temps réel sur les constructions d'images en double.

## Acceptation des packages

Utilisez `Package Acceptance`OpenClawDocker lorsque la question est « ce package OpenClaw installable fonctionne-t-il comme un produit ? ». Il diffère de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation de package valide une seule tarball via le même harnais E2E Docker que les utilisateurs utilisent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de package, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test`GitHub, et imprime la source, la référence du workflow, la référence du package, la version, le SHA-256 et le profil dans le résumé d'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`DockerDocker. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de la tarball, prépare les images Docker package-digest si nécessaire, et exécute les voies Docker sélectionnées contre ce package au lieu d'emballer l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes`Docker ciblées, le workflow réutilisable prépare le package et les images partagées une seule fois, puis répartit ces voies en tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle facultativement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test`Telegramnpm lorsque l'acceptation de package en a résolu un ; une expédition Telegram autonome peut toujours installer une spec npm publiée.
4. `summary`DockerTelegram fait échouer le workflow si la résolution du package, l'acceptation Docker ou la voie Telegram facultative a échoué.

### Sources candidates

- `source=npm` accepte uniquement `openclaw@beta`, `openclaw@latest`OpenClaw, ou une version de release OpenClaw exacte telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des pré-versions/stables publiées.
- `source=ref` compresse une branche `package_ref`OpenClaw de confiance, un tag, ou un SHA de commit complet. Le résolveur récupère les branches/tags OpenClaw, vérifie que le commit sélectionné est accessible depuis l'historique des branches du dépôt ou un tag de release, installe les dépendances dans un arbre de travail détaché, et le compresse avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS ; `package_sha256` est requis.
- `source=artifact` télécharge un `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est compressé lorsque `source=ref`. Cela permet au harnais de test actuel de valider d'anciens commits source de confiance sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — morceaux complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exacte ; requis quand `suite_profile=custom`

Le profil `package` utilise une couverture de plugin hors ligne, de sorte que la validation du package publié n'est pas tributaire de la disponibilité en direct de ClawHub. La voie facultative Telegram réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spec npm publié conservé pour les envois autonomes.

Pour la politique dédiée aux tests de mise à jour et de plugins, y compris les commandes locales,
les voies Docker, les entrées d'acceptation des packages, les valeurs par défaut de publication et le triage des échecs,
voyez [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de publication appellent Package Acceptance avec `source=artifact`, l'artefact du package de publication préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`. Cela permet de maintenir la migration du package, la mise à jour, l'installation des compétences live ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation de l'installation des plugins configurés, le plugin hors ligne, la mise à jour des plugins et la preuve Telegram sur le même tarball de package résolu. Définissez `release_package_spec` sur la validation complète de publication ou sur les vérifications de publication OpenClaw après la publication d'une version bêta pour exécuter la même matrice par rapport au package npm expédié sans重建 ; définissez `package_acceptance_package_spec` uniquement lorsque Package Acceptance a besoin d'un package différent du reste de la validation de publication. Les vérifications de publication multi-OS couvrent toujours l'onboarding spécifique à l'OS, l'installateur et le comportement de la plateforme ; la validation du produit de mise à jour de package doit commencer par Package Acceptance. Le pipeline Docker `published-upgrade-survivor` valide une base de référence de package publiée par exécution dans le chemin de publication bloquant. Dans Package Acceptance, le tarball `package-under-test` résolu est toujours le candidat et `published_upgrade_survivor_baseline` sélectionne la base de référence publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de pipeline échoué préservent cette base de référence. La validation complète de publication avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues` pour s'étendre sur les quatre dernières versions stables npm, plus les versions limites de compatibilité des plugins et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona conservés, les installations de plugins OpenClaw configurés, les chemins de journal tilde et les racines de dépendances de plugins hérités obsolètes. Les sélections de survivants de mise à niveau publiée multi-bases de référence sont partitionnées par base de référence dans des tâches d'exécution Docker ciblées distinctes. Le workflow distinct `Update Migration` utilise le pipeline Docker `update-migration` avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne un nettoyage exhaustif des mises à jour publiées, et non l'étendue normale du CI de publication complète. Les exécutions agrégées locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver un seul pipeline avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` tel que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. Le pipeline publié configure la base de référence avec une commande de commande `openclaw config set` intégrée, enregistre les étapes de la commande dans `summary.json`, et sonde `/healthz`, `/readyz`, plus le statut RPC après le démarrage du Gateway. Les pipelines frais Windows packagés et d'installation vérifient également qu'un package installé peut importer un remplacement de contrôle de navigateur à partir d'un chemin absolu brut Windows. Le test de fumée de tour d'agent multi-OS OpenAI par défaut est `OPENCLAW_CROSS_OS_OPENAI_MODEL` s'il est défini, sinon `openai/gpt-5.5`, de sorte que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritées

Le Package Acceptance dispose de fenêtres de compatibilité héritées délimitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis du tarball ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les pnpm `patchedDependencies` manquants du faux fixture git dérivé du tarball et peut consigner les `update.channel` persistants manquants ;
- les smokes de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation du marketplace ;
- `plugin-update` peut permettre la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement sans réinstallation restent inchangés.

Le package publié `2026.4.26` peut également avertir pour les fichiers d'horodatage des métadonnées de build locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire les contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

### Exemples

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

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance`Docker et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`Docker, les journaux de voie, les timings de phase et les commandes de réexécution. Préférez la réexécution du profil de package ayant échoué ou des voies Docker exactes plutôt que la réexécution de la validation complète de la version.

## Install smoke

Le workflow distinct `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture smoke en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions en **Fast path** sont destinées aux pull requests touchant les surfaces Docker/package, les modifications de package/manifeste du plugin groupé, ou les surfaces du plugin central/channel/gateway/Plugin SDK que les tâches de fumée Docker exercent. Les modifications de plugin groupé uniquement en code source, les modifications de tests uniquement et les modifications de documentation uniquement ne réservent pas de workers Docker. Le chemin rapide construit l'image du Dockerfile racine une fois, vérifie le DockerDockerDockerCLI, exécute les agents de suppression de la fumée CLI de l'espace de travail partagé, exécute le e2e du réseau de passerelle de conteneur, vérifie un argument de construction d'extension groupée et exécute le profil Docker du plugin groupé délimité sous un délai d'expiration de commande global de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **Full path** conserve la couverture d'installation du package QR et de Docker de l'installateur/de mise à jour pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de release des appels de workflow et les pull requests qui touchent réellement les surfaces de l'installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image de fumée du Dockerfile racine GHCR target-SHA, puis exécute l'installation du package QR, les fumées du Dockerfile racine/gateway, les fumées de l'installateur/de mise à jour et le e2e Docker rapide du plugin groupé en tant que tâches distinctes afin que le travail de l'installateur n'attende pas derrière les fumées de l'image racine.

Les pushes `main` (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique de portée modifiée demanderait une couverture complète lors d'un push, le workflow conserve la fumée Docker rapide et laisse la fumée d'installation complète aux exécutions nocturnes ou de validation de release.

La fumée lente du fournisseur d'image d'installation globale Bun est séparément contrôlée par `run_bun_global_install_smoke`. Elle s'exécute selon la planification nocturne et à partir du workflow de vérifications de release, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais ce n'est pas le cas des pull requests et des pushes `main`. Les tests Docker QR et de l'installateur conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm prégénère une image live-test partagée, empaquete OpenClaw une fois sous forme de tarball npm, et construit deux images `scripts/e2e/Dockerfile` partagées :

- un runner Node/Git nu pour les voies d'installation/de mise à jour/dépendances de plugins ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normale.

Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs`, et le runner exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                                                |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                                     |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de queue (tail-pool) sensible au fournisseur.                                                                          |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Plafond de voies simultanées (live lanes) pour éviter que les fournisseurs ne limitent le débit.                                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Plafond de voies d'installation npm simultanées.                                                                                                     |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Plafond de voies multi-services simultanées.                                                                                                         |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les démarrages de voies pour éviter les tempêtes de création du démon Docker ; définissez `0` pour aucun délai.                          |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/tail sélectionnées utilisent des plafonds plus stricts.                                       |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` imprime le plan du planificateur sans exécuter les voies.                                                                                        |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage (cleanup smoke) pour que les agents puissent reproduire une voie ayant échoué. |

Une voie plus lourde que sa plafond effectif peut toujours démarrer à partir d'un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégateur local effectue des vérifications préalables sur Docker, supprime les conteneurs E2E OpenClaw périmés, émet l'état des voies actives, persiste les durées des voies pour un ordre du plus long au plus court, et arrête par défaut la planification de nouvelles voies mises en pool après le premier échec.

### Workflow live/E2E réutilisable

Le workflow réutilisable live/E2E demande à `scripts/test-docker-all.mjs --plan-json` quel package, type d'image, image live, voie et couverture d'informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il soit empaquete OpenClaw via `scripts/package-openclaw-for-docker.mjs`, soit télécharge un artefact de package de l'exécution en cours, soit télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse des images E2E Docker nues/fonctionnelles étiquetées avec le digest du package via le cache de couche Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images digest de package existantes au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente borné de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Segments du chemin de release

La couverture Docker de release exécute des plus petits travaux segmentés avec `OPENCLAW_SKIP_DOCKER_BUILD=1` afin que chaque segment ne tire que le type d'image dont il a besoin et exécute plusieurs voies via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les segments Docker actuels de la release sont `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` via `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies d'installation de provider.

OpenWebUI est intégré à `plugins-runtime-services` lorsqu'une couverture complète du chemin de publication le demande, et conserve un bloc `openwebui` autonome uniquement pour les répartitions spécifiques à OpenWebUI. Les voies de mise à jour de canal groupé réessaient une fois en cas d'erreurs réseau transitoires npm.

Chaque bloc téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le JSON du planificateur, les tables de voies lentes et les commandes de réexécution par voie. L'entrée `docker_lanes` du workflow exécute les voies sélectionnées par rapport aux images préparées au lieu des tâches de bloc, ce qui permet de limiter le débogage des voies échouées à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de package pour cette exécution ; si une voie sélectionnée est une voie Docker en direct, la tâche ciblée construit l'image de test en direct localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name`, et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le package exact et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié live/E2E exécute quotidiennement la suite complète Docker du chemin de publication.

## Prerelease de plugin

`Plugin Prerelease` est une couverture produit/colis plus coûteuse, c'est donc un workflow séparé déclenché par `Full Release Validation` ou par un opérateur explicite. Les pull requests normales, les poussées `main` et les déclenchements manuels autonomes de CI gardent cette suite désactivée. Il équilibre les tests de plugins groupés sur huit workers d'extension ; ces travaux de shard d'extension exécutent jusqu'à deux groupes de configuration de plugins à la fois avec un worker Vitest par groupe et un tas Node plus grand afin que les lots de plugins lourds en importations ne créent pas de travaux CI supplémentaires. Le chemin de prépublication Docker réservé aux releases regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des travaux d'une à trois minutes. Le workflow télécharge également un artefact informatif `plugin-inspector-advisory` à partir de `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont une entrée de triage et ne modifient pas la porte de blocage Plugin Prerelease.

## QA Lab

QA Lab dispose de voies CI dédiées en dehors du workflow principal à portée intelligente. La parité agentic est imbriquée sous les harnais QA et release larges, et non dans un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute nightly sur `main` et sur déclenchement manuel ; il déploie la voie de parité mock, la voie live Matrix, et les voies live Telegram et Discord comme travaux parallèles. Les travaux live utilisent l'environnement `qa-live-shared`, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport live Matrix et Telegram avec le fournisseur mock déterministe et des modèles qualifiés mock (`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`) afin que le contrat de channel soit isolé de la latence du modèle live et du démarrage normal du fournisseur-plugin. La passerelle de transport live désactive la recherche de mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du fournisseur est couverte par les suites séparées de modèle live, de fournisseur natif et de fournisseur Docker.

Matrix utilise Matrix`--profile fast` pour les portails programmés et de publication, en ajoutant `--fail-fast`CLICLI uniquement lorsque la CLI extraite le prend en charge. La valeur par défaut de la CLI et l'entrée manuelle du workflow restent `all` ; la répartition manuelle `matrix_profile=all`Matrix divise toujours la couverture Matrix complète en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies QA Lab critiques pour la publication avant l'approbation de la version ; son portail de parité QA exécute les packs candidats et de base en tant que tâches de voie parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normaux, suivez les preuves CI/check délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non le balayage complet du référentiel. Les exécutions quotidiennes, manuelles et de garde pour les pull request non brouillonons analysent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité à haute confiance filtrées pour les niveaux `security-severity` élevés/critiques.

La garde de pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow programmé. Les CodeQL Android et macOS restent en dehors des valeurs par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron et passerelle de base                                                                                                                                  |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le Plugin SDK, les secrets, les points de contact d'audit                            |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF de base, d'analyse IP, de garde réseau, de récupération Web et de SSRF du Plugin SDK                                                                     |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution d'outils d'agent                                                                        |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation par gestionnaire de packages, chargement source et surfaces de confiance du contrat de package du SDK de plugin |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security`AndroidAndroidLinux — shard de sécurité Android planifié. Génère l'application Android manuellement pour CodeQL sur le plus petit runner Linux Blacksmith accepté par la cohérence du workflow. Télécharge sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security`macOSmacOSmacOS — shard de sécurité macOS hebdomadaire/manuel. Génère l'application macOS manuellement pour CodeQL sur Blacksmith macOS, filtre les résultats de build des dépendances du SARIF téléchargé, et téléverse sous `/codeql-critical-security/macos`macOS. Gardé en dehors des paramètres par défaut quotidiens car le build macOS domine le temps d'exécution même lorsqu'il est propre.

### Catégories de qualité critique

`CodeQL Critical Quality` est le shard non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript de gravité erreur et non-sécurité sur des surfaces étroites à haute valeur sur le plus petit runner Blacksmith Linux. Son garde de demande de tirage (pull request) est intentionnellement plus petit que le profil programmé : les PR non brouillon n'exécutent que les shards correspondants `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` pour l'exécution de commande d'agent/modèle/tool et le code de répartition de réponse, le code de schéma/migration/IO de configuration, le code d'auth/secrets/bac à sable/sécurité, le runtime du plugin channel principal et groupé, le protocole Gateway/méthode de serveur, la colle runtime/SDK mémoire, MCP/processus/livraison sortante, le runtime provider/catalogue modèle, les diagnostics de session/files d'attente de livraison, le chargeur de plugin, le contrat de package Plugin SDK, ou les modifications du runtime de réponse Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze shards de qualité de PR.

La répartition manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des hooks d'enseignement/itération pour exécuter un shard de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code de limite de sécurité Auth, secrets, bac à sable, cron et Gateway                                                                                                                                                  |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats d'ES                                                                                                                                                      |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode de serveur                                                                                                                                                          |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation du plugin channel principal et groupé                                                                                                                                                         |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commande, répartition modèle/provider, répartition et files d'attente de réponse automatique, et contrats de runtime du plan de contrôle ACP                                                               |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts tool, assistants de supervision de processus, et contrats de livraison sortante                                                                                                                   |
| `/codeql-critical-quality/memory-runtime-boundary`      | Memory host SDK, façades d'exécution de la mémoire, alias du SDK de Plugin de mémoire, colle d'activation d'exécution de la mémoire et commandes du médecin de la mémoire                                               |
| `/codeql-critical-quality/session-diagnostics-boundary` | Internes de la file de réponse, files de livraison de session, assistants de liaison/livraison de session sortante, surfaces de lots d'événements/journaux de diagnostic et contrats CLI du médecin de session          |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Répartition des réponses entrantes du SDK de Plugin, assistants de payload/découpage/exécution des réponses, options de réponse de channel, files de livraison et assistants de liaison de session/fil                  |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte de provider, inscription d'exécution de provider, valeurs par défaut/catalogues de provider et registres web/recherche/récupération/incorporation |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface utilisateur de contrôle, persistance locale, flux de contrôle de passerelle et contrats d'exécution du plan de contrôle des tâches                                                              |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web principale, E/S média, compréhension des médias, génération d'images et contrats d'exécution de génération de médias                                                                         |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique et points d'entrée du SDK de plug-in                                                                                                                                               |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source du SDK de plug-in côté package publié et assistants de contrat de package de plug-in                                                                                                                             |

La qualité reste séparée de la sécurité afin que les résultats de qualité puissent être planifiés, mesurés, désactivés ou étendus sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plug-ins groupés ne devrait être réajoutée que sous forme de travail de suivi délimité ou fragmenté une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour garder les documents existants alignés avec les changements récents. Il n'a pas d'horaire fixe : une exécution CI réussie de poussée non-bot sur `main` peut le déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution non ignorée de Docs Agent a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits du SHA source Docs Agent non ignoré précédent au `main` actuel, de sorte qu'une exécution horaire peut couvrir tous les changements principaux accumulés depuis la dernière passe de documentation.

### Agent de performance des tests

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas de planification pure : une exécution de CI de push non-bot réussie sur `main` peut le déclencher, mais il ignore si une autre invocation de workflow a déjà été exécutée ou est en cours ce jour-là UTC. La répartition manuelle contourne cette porte d'activité quotidienne. La voie construit un rapport de performance Vitest groupé pour la suite complète, permet à Codex de n'apporter que de petites corrections de performance de test préservant la couverture au lieu de refactorisations larges, puis réexécute le rapport de la suite complète et rejette les modifications qui réduisent le nombre de tests de référence réussis. Si la référence contient des tests en échec, Codex peut ne corriger que les échecs évidents et le rapport de la suite complète après agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot n'atterrisse, la voie rebascule le correctif validé, réexécute `pnpm check:changed` et réessaie le push ; les correctifs obsolètes en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité de suppression de sudo que l'agent de documentation.

### PR en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow de mainteneur manuel pour le nettoyage des doublons après atterrissage. Il fonctionne par défaut en mode simulation (dry-run) et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR atterri a été fusionné et que chaque doublon a soit un problème de référence partagé soit des tronçons modifiés qui se chevauchent.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale de voie modifiée réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte concernant les limites de l'architecture que la portée large de la plate-forme CI :

- les modifications de production de base exécutent la production de base et la vérification de type des tests de base plus lint/gardes de base ;
- les modifications de tests uniquement de base n'exécutent que la vérification de type des tests de base plus lint de base ;
- les modifications de production d'extension exécutent la production d'extension et la vérification de type des tests d'extension plus lint d'extension ;
- les modifications de tests uniquement d'extension exécutent la vérification de type des tests d'extension plus lint d'extension ;
- les modifications du SDK public de plugin ou du contrat de plugin s'étendent à la vérification de type d'extension car les extensions dépendent de ces contrats de base (les parcours d'extension Vitest restent un travail de test explicite) ;
- les mises à jour de version de métadonnées uniquement exécutent des vérifications ciblées sur la version/configuration/dépendances racine ;
- les modifications inconnues de racine/configuration échouent en toute sécurité vers toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed`DiscordSlack : les modifications directes de tests s'exécutent elles-mêmes, les modifications de source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison pour les salons de groupe partagés est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison des réponses sources, ou du prompt système de l'outil de message passent par les tests de réponse de base plus les régressions de livraison Discord et Slack, de sorte qu'une modification par défaut partagée échoue avant le premier push de PR. Utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque la modification est suffisamment large au niveau du harnais pour que l'ensemble mappé peu coûteux ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est le wrapper de boîte distante appartenant au dépôt pour la preuve Linux des mainteneurs. Utilisez-le depuis la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI est importante, ou lorsque la preuve nécessite des secrets, Docker, des voies de paquets, des boîtes réutilisables ou des journaux distants. Le backend OpenClaw normal est LinuxDockerOpenClaw`blacksmith-testbox`Hetzner ; la capacité AWS/Hetzner possédée est un secours pour les pannes de Blacksmith, les problèmes de quota ou les tests explicites de capacité possédée.

Les exécutions Blacksmith soutenues par Crabbox effectuent un échauffement, une réclamation, une synchronisation, une exécution, un rapport et un nettoyage des Testboxes ponctuels. Le contrôle de santé de synchronisation intégré échoue rapidement lorsque les fichiers racine requis tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short` affiche au moins 200 suppressions suivies. Pour les PR intentionnelles avec de grandes suppressions, définissez `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale CLI de Blacksmith qui reste dans la phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée pour les diffs locaux inhabituellement grands.

Avant une première exécution, vérifiez le wrapper depuis la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Le wrapper du dépôt refuse un binaire Crabbox périmé qui n'annonce pas `blacksmith-testbox`. Passez le provider explicitement même si `.crabbox.yaml` a des valeurs par défaut pour owned-cloud. Dans les worktrees Codex ou les checkouts liés/sparse, évitez le script local `pnpm crabbox:run` car pnpm peut réconcilier les dépendances avant que Crabbox ne démarre ; invoquez plutôt directement le wrapper node :

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

Porte modifiée :

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
```

Réexécution de test ciblée :

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test <path-or-filter>"
```

Suite complète :

```bash
pnpm crabbox:run -- --provider blacksmith-testbox \
  --blacksmith-org openclaw \
  --blacksmith-workflow .github/workflows/ci-check-testbox.yml \
  --blacksmith-job check \
  --blacksmith-ref main \
  --idle-timeout 90m \
  --ttl 240m \
  --timing-json \
  --shell -- \
  "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm test"
```

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions Crabbox ponctuelles soutenues par Blacksmith doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les box en direct et n'arrêtez que celles que vous avez créées :

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

Utilisez la réutilisation uniquement lorsque vous avez intentionnellement besoin de plusieurs commandes sur la même box hydratée :

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez Blacksmith
direct uniquement pour les diagnostics tels que `list`, `status`, et le nettoyage. Corrigez le
chemin Crabbox avant de traiter une exécution Blacksmith directe comme une preuve de mainteneur.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que de nouveaux
échauffements restent `queued` sans IP ni URL d'exécution Actions après quelques minutes,
considérez cela comme une pression du provider Blacksmith, de la file d'attente, de la facturation ou des limites de l'organisation. Arrêtez les
ids en file d'attente que vous avez créés, évitez de démarrer d'autres Testboxes, et déplacez la preuve vers le
chemin de capacité Crabbox owned ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith,
la facturation et les limites de l'organisation.

Passez à la capacité Crabbox owned uniquement lorsque Blacksmith est en panne, limité par quota, manque l'environnement nécessaire, ou si la capacité owned est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Sous pression AWS, évitez `class=beast` sauf si la tâche nécessite vraiment un processeur de classe 48xlarge. Une requête `beast` commence à 192 vCPUs et est le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` appartenant au dépôt est réglé par défaut sur `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS négociés impriment la région/marché sélectionné(e), la pression sur le quota, le repli Spot et les avertissements de classe haute pression. Utilisez `fast` pour les vérifications broad plus lourdes, `large` uniquement après que standard/fast ne suffisent pas, et `beast`Docker uniquement pour les lanes exceptionnellement liées au CPU telles que les matrices Docker full-suite ou all-plugin, la validation explicite de release/blocker, ou le profilage de performance à cœur élevé. N'utilisez pas `beast` pour `pnpm check:changed`, les tests ciblés, le travail docs-only, lint/typecheck ordinaire, de petits repros E2E, ou le triage de panne Blacksmith. Utilisez `--market on-demand` pour le diagnostic de capacité afin que le turnover du marché Spot ne soit pas mélangé au signal.

`.crabbox.yaml` possède les valeurs par défaut de provider, de sync et d'hydratation GitHub Actions pour les lanes owned-cloud. Il exclut le `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les distants locaux du mainteneur et les magasins d'objets, et il exclut les artefacts de runtime/build locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère le checkout, la configuration Node/pnpm, la récupération `origin/main`, et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Aperçu de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

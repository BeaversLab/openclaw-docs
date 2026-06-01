---
summary: "Graphe de tâches CI, portes de portée, parapluies de version et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI s'exécute à chaque envoi vers OpenClaw`main` et chaque demande de tirage. La tâche `preflight` classe les différences et désactive les volets coûteux lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement la délimitation intelligente et déploient le graphique complet pour les candidats à la publication et les validations étendues. Les volets Android restent en option via `include_android`. La couverture des plugins uniquement pour les publications se trouve dans le workflow distinct [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

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

Utilisez `pnpm ci:timings`, `pnpm ci:timings:recent` ou `node scripts/ci-run-timings.mjs <run-id>` pour résumer le temps écoulé, le temps de file d'attente, les tâches les plus lentes, les échecs et la barrière de déploiement `pnpm-store-warmup`GitHub depuis GitHub Actions. Le CI télécharge également le même récapitulatif d'exécution en tant qu'artefact `ci-timings-summary`. Pour le minutage de la build, consultez l'étape `Build dist` de la tâche `build-artifacts` : `pnpm build:ci-artifacts` affiche `[build-all] phase timings:` et inclut `ui:build` ; la tâche télécharge également l'artefact `startup-memory`.

Pour les exécutions de demandes de tirage, la tâche terminale de récapitulatif du temps exécute l'assistant à partir de la révision de base approuvée avant de passer `GH_TOKEN` à `gh run view`. Cela permet de garder la requête tokenisée hors du code contrôlé par la branche tout en résumant toujours l'exécution CI actuelle de la demande de tirage.

## Preuve du comportement réel

Les demandes de tirage de contributeurs externes exécutent une porte `Real behavior proof` à partir de
`.github/workflows/real-behavior-proof.yml`. Le workflow extrait le commit de base approuvé
et évalue uniquement le corps de la demande de tirage ; il n'exécute pas le code de la
branche du contributeur.

La porte s'applique aux auteurs de demandes de tirage qui ne sont pas propriétaires, membres,
collaborateurs ou bots du dépôt. Elle réussit lorsque le corps de la demande de tirage contient une
section `Real behavior proof` avec des valeurs remplies pour :

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

Les preuves doivent montrer le comportement modifié après le correctif dans une configuration OpenClaw réelle. Les captures d'écran, les enregistrements, les captures de terminal, la sortie de la console, la sortie en direct copiée, les journaux d'exécuration expurgés et les artefacts liés comptent tous. Les tests unitaires, les simulacres, les instantanés, les analyseurs de code, les vérifications de type et les résultats de l'IC sont des vérifications de soutien utiles, mais ils ne satisfont pas à cette exigence par eux-mêmes.

Lorsque la vérification échoue, mettez à jour le corps de la PR au lieu d'envoyer un autre commit de code. Les mainteneurs peuvent appliquer `proof: override` uniquement lorsque l'exigence de preuve ne doit pas s'appliquer à cette PR.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de la portée modifiée et fait agir le manifeste prévol comme si chaque zone délimitée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node plus l'analyse du workflow, mais ne forcent pas les constructions natives Windows, Android ou macOS par eux-mêmes ; ces voies de plateforme restent limitées aux modifications de la source de la plateforme.
- **La documentation sur les poussées `main`** est vérifiée par le workflow autonome `Docs` avec le même miroir de documentation ClawHub utilisé par l'IC, de sorte que les poussées mixtes code+docs ne mettent pas non plus en file d'attente le fragment `check-docs` de l'IC. Les demandes d'extraction et l'IC manuelle exécutent toujours `check-docs` à partir de l'IC lorsque la documentation est modifiée.
- **Le PTY TUI** est un workflow ciblé pour les modifications TUI. Il exécute `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` sur Node 24 Linux pour `src/tui/**`, le harnais de surveillance, le script de package, le fichier de verrouillage et les modifications de workflow. La voie requise utilise un appareil `TuiBackend` déterministe ; le test de fumée `tui --local` plus lent est optionnel avec `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` et simule uniquement le point de terminaison du modèle externe.
- **Les modifications de routage CI uniquement, les modifications sélectionnées de fixtures de tests de base peu coûteuses, et les modifications étroites d'aides de contrat de plug-in/routage de tests** utilisent un chemin de manifeste rapide Node uniquement : `preflight`, sécurité, et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards de base complets, les shards de plug-ins groupés, et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de paquets, et aux surfaces du workflow CI qui exécutent cette voie ; les modifications de source, de plug-in, de test d'installation (install-smoke) et de test uniquement non liées restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont divisées ou équilibrées afin que chaque travail reste petit sans sur-réserver les runners : les contrats de plugins et les contrats de canal s'exécutent chacun sous forme de deux fragments pondérés pris en charge par Blacksmith avec le repli sur le runner standard GitHub, les voies rapides/support de l'unité principale s'exécutent séparément, l'infrastructure d'exécution principale est répartie entre l'état, le processus/configuration, le partagé et trois fragments de domaine cron, la réponse automatique s'exécute sous forme de workers équilibrés (avec le sous-arbre de réponse divisé en fragments agent-runner, dispatch, et commandes/routage d'état), et les configurations de passerelle/serveur agentiques sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests de navigateur étendus, QA, multimédia et divers de plugins utilisent leurs propres configurations Vitest au lieu du fichier global attrape-tout partagé pour les plugins. Les fragments basés sur des modèles d'inclusion enregistrent des entrées de chronométrage en utilisant le nom du fragment CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration complète d'un fragment filtré. `check-additional-*` maintient ensemble le travail de compilation/canary lié aux limites des packages et sépare l'architecture de la topologie d'exécution de la couverture de surveillance de la passerelle ; la liste des gardes de frontière est divisée en bandes en un fragment lourd en invites et un fragment combiné pour les bandes de gardes restantes, chacun exécutant des gardes indépendants sélectionnés simultanément et imprimant les chronométrages par vérification. La vérification coûteuse de la dérive de l'instantané d'invite du chemin heureux Codex s'exécute en tant que travail supplémentaire distinct pour la CI manuelle et uniquement pour les modifications affectant les invites, afin que les modifications Node normales non liées n'attendent pas derrière la génération à froid d'instantanés d'invite et que les fragments de frontière restent équilibrés pendant que la dérive de l'invite est toujours épinglée à la PR qui l'a causée ; le même indicateur saute la génération Vitest de l'instantané d'invite à l'intérieur du fragment de frontière de support principal des artefacts construits. La surveillance de Gateway, les tests de canal et le fragment de frontière de support principal s'exécutent simultanément à l'intérieur de `build-artifacts` une fois que `dist/` et `dist-runtime/` sont déjà construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`, puis génère l'APK de debug Play. La variante tierce n'a pas de jeu de sources ni de manifeste séparés ; sa voie de test unitaire compile toujours la variante avec les indicateurs BuildConfig SMS/journal des appels, tout en évitant une tâche de conditionnement d'APK de debug en double à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendances uniquement épinglée sur la dernière version de Knip, avec l'âge minimum de publication de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip avec `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non révisé ou laisse une entrée de liste d'autorisation périmée, tout en préservant les surfaces intentionnelles de plug-in dynamique, générées, de build, de test en direct et de pont de paquet que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extraite pas et n'exécute pas le code de pull request non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow possède quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les pushes `main` ;
- `github_activity` pour l'activité générale GitHub que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transmet uniquement des métadonnées normalisées : type d'événement, action, acteur, dépôt, numéro de l'élément, URL, titre, état et de courts extraits pour les commentaires ou avis le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, et non une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne doit publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, modifications, bruit de bot, bruit de webhook en double et trafic d'avis normaux doivent aboutir à `NO_REPLY`.

Traitez les titres, commentaires, corps, texte d'avis, noms de branche et messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ils servent d'entrée pour le résumé et la priorisation, et non d'instructions pour le workflow ou l'exécution de l'agent.

## Répartitions manuelles

Les répartitions CI manuelles exécutent le même graphe de travaux que le CI normal, mais forcent l'activation de chaque voie non Android : les partitions Node Linux, les partitions bundled-plugin, les partitions de contrats de plugin et channel, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS et l'i18n de l'interface de contrôle. Les répartitions CI manuelles autonomes exécutent uniquement Android avec `include_android=true` ; le parapluie de publication complète active Android en transmettant `include_android=true`. Les vérifications statiques de pré-publication de plugins, la partition `agentic-plugins` publication uniquement, le balayage complet du lot d'extensions et les voies Docker de pré-publication de plugins sont exclus du CI. La suite de pré-publication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow séparé `Plugin Prerelease` avec la porte release-validation activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée optionnelle `target_ref` permet à un appelant de confiance d'exécuter ce graphe contre une branche, une étiquette ou un SHA de commit complet, tout en utilisant le fichier de workflow à partir de la référence de dispatch sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | Dispatch CI manuel et replis pour les référentiels non canoniques, workflow-sanity, labeler, auto-response, workflows de docs hors CI, et préflight install-smoke afin que la matrice Blacksmith puisse se mettre en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `preflight`, `security-fast`, shards d'extension de poids inférieur, `checks-fast-core`, shards de contrat plugin/channel, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, et `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de tests Node Linux, shards de tests de plugins groupés, shards `check-additional-*`, `check-dependencies`, et `android`                                                                                                              |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (assez sensibles au CPU pour que 8 vCPU coûtent plus que ce qu'ils ont économisé) ; builds Docker install-smoke (le temps d'attente dans la file de 32 vCPU coûtait plus que ce qu'il a économisé)           |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-15`      | `macos-node` sur `openclaw/openclaw` ; les forks retombent sur `macos-15`                                                                                                                                                                    |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` sur `openclaw/openclaw` ; les forks retombent sur `macos-26`                                                                                                                                                                   |

La CI du référentiel canonique conserve Blacksmith comme chemin de runner par défaut pour les exécutions normales de push et de pull-request. `workflow_dispatch` et les exécutions de référentiels non canoniques utilisent des runners hébergés par GitHub, mais les exécutions canoniques normales ne sondent pas actuellement la santé de la file d'attente Blacksmith ni ne retombent automatiquement sur les labels hébergés par GitHub lorsque Blacksmith est indisponible.

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
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
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
pnpm test:startup:memory
pnpm test:extensions:memory -- --json .artifacts/openclaw-performance/source/mock-provider/extension-memory.json
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## Performance OpenClaw

`OpenClaw Performance` est le workflow de performance produit/runtime. Il s'exécute quotidiennement sur `main` et peut être déclenché manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le déclenchement manuel effectue généralement un benchmark sur la référence du workflow. Définissez `target_ref` pour effectuer un benchmark sur un tag de publication ou une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de la voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version figée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` figée, puis exécute trois voies :

- `mock-provider` : scénarios de diagnostic Kova sur un runtime build localement avec une fausse authentification compatible OpenAI déterministe.
- `mock-deep-profile` : profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds des tours d'agent.
- `live-openai-candidate` : un vrai tour d'agent `openai/gpt-5.5` OpenAI, ignoré lorsque `OPENAI_API_KEY` n'est pas disponible.

La voie du faux fournisseur exécute également des sondes sources natives OpenClaw après le passage Kova : timing et mémoire de démarrage de la passerelle pour les cas par défaut, hook et avec 50 plugins ; RSS d'import des plugins groupés, boucles de bonjour répétées `channel-chat-baseline` mock-OpenAI et commandes de démarrage CLI contre la passerelle démarrée. Lorsque le rapport source précédent du faux fournisseur est disponible pour la référence testée, le résumé source compare les valeurs RSS et tas actuelles par rapport à cette base de référence et marque les augmentations importantes de RSS comme `watch`. Le résumé Markdown de la sonde source se trouve à `source/index.md` dans le bundle de rapports, avec le JSON brut à côté.

Chaque voie (lane) téléverse des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md` et les artefacts de source-probe dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel global pour « tout exécuter avant la publication ». Il accepte une branche, une balise ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease` pour la preuve de plugin/package/statique/Docker uniquement à la publication, et envoie `OpenClaw Release Checks` pour le test d'installation, l'acceptation de package, les vérifications de package multi-OS, la parité QA Lab, les voies Matrix et Telegram. Les exécutions stables/par défaut gardent une couverture exhaustive en direct/E2E et du chemin de publication Docker derrière `run_release_soak=true` ; `release_profile=full` force l'activation de cette couverture étendue pour que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` par rapport à l'artefact `release-package-under-test` des vérifications de publication. Après la publication, passez `release_package_spec` pour réutiliser le package npm expédié sur les vérifications de publication, l'acceptation de package, Docker, le multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un package différent. La voie du package en direct du plugin Codex utilise le même état sélectionné par défaut : le `release_package_spec=openclaw@<tag>` publié dérive `codex_plugin_spec=npm:@openclaw/codex@<tag>`, tandis que les exécutions SHA/artefact empaquettent `extensions/codex` à partir de la référence sélectionnée. Définissez `codex_plugin_spec` explicitement pour les sources de plugin personnalisées telles que les spécifications `npm:`, `npm-pack:` ou `git:`.

Voir [Validation complète de la publication](/fr/reference/full-release-validation) pour la
matrice des étapes, les noms exacts des tâches de workflow, les différences de profil, les artefacts et
les gestionnaires de réexécution ciblés.

`OpenClaw Release Publish` est le workflow de publication avec mutations manuel. Déclenchez-le depuis `release/YYYY.M.D` ou `main`OpenClawnpm une fois que la balise de publication existe et une fois que la pré-vérification npm d'OpenClaw a réussi. Il vérifie `pnpm plugins:sync:check`, déclenche `Plugin NPM Release` pour tous les packages de plugins publiables, déclenche `Plugin ClawHub Release` pour le même SHA de publication, et ce n'est qu'ensuite qu'il déclenche `OpenClaw NPM Release` avec la `preflight_run_id` sauvegardée.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez le helper au lieu de `gh workflow run ... --ref main -f ref=<sha>` :

```bash
pnpm ci:full-release --sha <full-sha>
```

Les références de dispatch de workflow GitHub doivent être des branches ou des balises, et non des SHA de commit bruts. Le helper pousse une branche temporaire GitHub`release-ci/<sha>-...` au SHA cible, déclenche `Full Release Validation` depuis cette référence épinglée, vérifie que chaque `headSha` de workflow enfant correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si n'importe quel workflow enfant s'est exécuté à un SHA différent.

`release_profile` contrôle l'étendue direct/fournisseur transmise aux vérifications de publication. Les workflows de publication manuels sont par défaut `stable` ; utilisez `full` uniquement lorsque vous souhaitez intentionnellement la large matrice fournisseur/média consultative. `run_release_soak`Docker contrôle si les vérifications de publication stables/défaut exécutent le test direct/E2E exhaustif et le trempage du chemin de publication Docker ; `full` force le trempage.

- `minimum`OpenAI conserve les voies OpenAI/core les plus rapides et critiques pour la publication.
- `stable` ajoute l'ensemble de backend/fournisseur stable.
- `full` exécute la large matrice fournisseur/média consultative.

Le parapluie enregistre les ids des exécutions enfants déclenchées, et le travail final `Verify full validation` vérifie à nouveau les conclusions des exécutions enfants actuelles et ajoute les tableaux des tâches les plus lentes pour chaque exécution enfant. Si un workflow enfant est réexécuté et passe au vert, réexécutez uniquement le travail de vérificateur parent pour rafraîchir le résultat du parapluie et le résumé des timings.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de préversion du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live` ou `npm-telegram` sur le parapluie. Cela permet de maintenir une nouvelle exécution limitée après une correction ciblée. Pour une voie cross-OS en échec, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade`OpenClaw ; les commandes cross-OS longues émettent des lignes de pulsation et les résumés de mise à niveau des packages incluent des minutages par phase. Les voies de vérification de version QA sont consultatives, à l'exception de la porte de couverture de l'outil d'exécution standard, qui bloque lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé du niveau standard.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois dans une archive `release-package-under-test`Dockernpm, puis transmet cet artefact aux vérifications cross-OS et à l'acceptation des packages, ainsi qu'au workflow Docker de la voie de version live/E2E lorsque la couverture soak est exécutée. Cela permet de maintenir la cohérence des octets du package sur les boîtes de version et d'éviter de reconditionner le même candidat dans plusieurs travaux enfants. Pour la voie live du plugin npm Codex, les vérifications de version transmettent soit une spécification de plugin publiée correspondante dérivée de `release_package_spec`, soit le `codex_plugin_spec`Docker fourni par l'opérateur, soit laissent l'entrée vide pour que le script Docker empaquete le plugin Codex de l'extraction sélectionnée.

Les exécutions en double `Full Release Validation` pour `ref=main` et `rerun_group=all`
supplantent l'ancien parapluie (umbrella). Le moniteur parent annule tout workflow enfant
qu'il a déjà distribué lorsque le parent est annulé, donc la validation plus récente du main
ne reste pas bloquée derrière une exécution de vérification de release périmée de deux heures. La validation des branches/tags de release et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant release live/E2E conserve une large couverture native `pnpm test:live`, mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail série unique :

- `native-live-src-agents`
- `native-live-src-gateway-core`
- travaux `native-live-src-gateway-profiles` filtrés par provider
- `native-live-src-gateway-backends`
- `native-live-test`
- `native-live-extensions-a-k`
- `native-live-extensions-l-n`
- `native-live-extensions-openai`
- `native-live-extensions-o-z-other`
- `native-live-extensions-xai`
- shards audio/vidéo de média fractionnés et shards de musique filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des échecs lents des providers live. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions manuelles ponctuelles.

Les shards de média live natifs s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les travaux de média vérifient uniquement les binaires avant la configuration. Gardez les suites live basées sur Docker sur les runners Blacksmith normaux — les travaux conteneurs ne sont pas l'endroit approprié pour lancer des tests Docker imbriqués.

Les partitions de modèle/live backend basées sur Docker utilisent une image Docker partagée séparée par commit sélectionné. Le workflow de release en direct construit et pousse cette image une seule fois, puis les partitions du modèle live Docker, de la Gateway shardée par provider, du backend CLI, de ACP bind et du harnais Codex s'exécutent avec cette image. Les partitions Docker Gateway transportent des limites de délai d'attente explicites au niveau du script sous le délai d'attente du travail de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'intégralité du budget de vérification de release. Si ces partitions reconstruisent indépendamment la cible Docker source complète, l'exécution de la release est mal configurée et gaspillera du temps d'horloge sur des constructions d'images en double.

## Acceptation des paquets

Utilisez `Package Acceptance`OpenClawDocker lorsque la question est « ce paquet OpenClaw installable fonctionne-t-il comme un produit ? ». Il est différent de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation des paquets valide un seul tarball via le même harnais Docker E2E que les utilisateurs utilisent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de paquet, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux sous forme d'artefact `package-under-test`GitHub et imprime la source, la référence du workflow, la référence du paquet, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`DockerDocker. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive tar, prépare les images Docker package-digest si nécessaire, et exécute les voies Docker sélectionnées par rapport à ce paquet au lieu d'empaqueter l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes`Docker ciblées, le workflow réutilisable prépare le paquet et les images partagées une seule fois, puis répartit ces voies en tant que tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle facultativement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test`Telegramnpm lorsque l'acceptation du paquet en a résolu un ; une répartition Telegram autonome peut toujours installer une spécification npm publiée.
4. `summary`DockerTelegram fait échouer le workflow si la résolution du paquet, l'acceptation Docker ou la voie facultative Telegram a échoué.

### Sources candidates

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest`OpenClaw, ou une version de release exacte d'OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des versions de pré-release/stables publiées.
- `source=ref` empaquète une branche `package_ref`OpenClaw de confiance, une balise ou un SHA de commit complet. Le résolveur récupère les branches/balises OpenClaw, vérifie que le commit sélectionné est accessible à partir de l'historique des branches du dépôt ou d'une balise de release, installe les dépendances dans un arbre de travail détaché, et l'empaquète avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS public ; `package_sha256` est requis. Ce chemin rejette les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte privés/internes/à usage spécial ou les IP résolues, et les redirections en dehors de la même politique de sécurité publique.
- `source=trusted-url` télécharge un `.tgz` HTTPS à partir d'une stratégie de source de confiance nommée dans `.github/package-trusted-sources.json` ; `package_sha256` et `trusted_source_id` sont requis. Utilisez ceci uniquement pour les miroirs d'entreprise détenus par les mainteneurs ou les référentiels de packages privés qui nécessitent des hôtes, des ports, des préfixes de chemin, des hôtes de redirection ou une résolution de réseau privé configurés. Si la stratégie déclare une authentification par porteur (bearer auth), le workflow utilise le secret `OPENCLAW_TRUSTED_PACKAGE_TOKEN` fixe ; les identifiants intégrés à l'URL sont toujours rejetés.
- `source=artifact` télécharge un `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lorsque `source=ref`. Cela permet au harnais de test actuel de valider des commits sources de confiance plus anciens sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — blocs complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exacte ; requis lorsque `suite_profile=custom`

Le profil `package` utilise une couverture de plugins hors ligne, de sorte que la validation des paquets publiés n'est pas dépendante de la disponibilité du ClawHub en ligne. La voie Telegram optionnelle réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spec npm publié conservé pour les déclenchements autonomes.

Pour la stratégie dédiée aux tests de mises à jour et de plugins, y compris les commandes locales,
les voies Docker, les entrées de Package Acceptance, les valeurs par défaut de release, et le triage des échecs,
voir [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de version appellent Package Acceptance avec `source=artifact`, l'artefact du package de version préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`. Cela permet de conserver la migration de package, la mise à jour, l'installation en direct de la compétence ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation de l'installation de plugins configurés, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive tar de package résolue. Définissez `release_package_spec`OpenClaw sur Full Release Validation ou OpenClaw Release Checks après la publication d'une bêta pour exécuter la même matrice sur le package npm expédié sans reconstruction ; définissez `package_acceptance_package_spec` uniquement lorsque Package Acceptance a besoin d'un package différent du reste de la validation de version. Les vérifications de version multi-OS couvrent toujours le comportement spécifique à l'OS, l'installation et la plateforme ; la validation de produit de package/mise à jour doit commencer par Package Acceptance. La voie Docker `published-upgrade-survivor` valide une base de référence de package publié par exécution dans le chemin de version bloquant. Dans Package Acceptance, l'archive tar `package-under-test` résolue est toujours le candidat et `published_upgrade_survivor_baseline` sélectionne la base de référence publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de voie échouée préservent cette base de référence. Full Release Validation avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues` pour s'étendre sur les quatre dernières versions stables npm, ainsi que les versions limites de compatibilité des plugins et les fixtures de type problème pour la configuration Feishu, les fichiers bootstrap/persona conservés, les installations de plugins OpenClaw configurés, les chemins de journal avec tildes et les racines de dépendances de plugins hérités obsolètes. Les sélections de survivants de mise à niveau publiée multi-base sont fragmentées par base de référence dans des travaux de runner Docker distincts et ciblés. Le workflow séparé `Update Migration` utilise la voie Docker `update-migration` avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale de la CI de version complète. Les exécutions d'agrégat locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la base de référence avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json`, et sonde `/healthz`, `/readyz`, ainsi que le statut RPC après le démarrage de Gateway. Les voies fraîches du package et de l'installateur Windows vérifient également qu'un package installé peut importer une priorité de contrôle de navigateur à partir d'un chemin absolu brut Windows. Le test de fumée de tour d'agent multi-OS OpenAI par défaut est `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsqu'il est défini, sinon `openai/gpt-5.5`, de sorte que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritée

Package Acceptance dispose de fenêtres de compatibilité héritée limitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées privées QA connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis du tarball ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les pnpm `patchedDependencies` manquants du fixture git factice dérivé du tarball et peut enregistrer les `update.channel` persistants manquants ;
- les tests de fumée de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation sur la marketplace ;
- `plugin-update` peut permettre la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement sans réinstallation restent inchangés.

Le package `2026.4.26` publié peut également avertir pour les fichiers d'horodatage des métadonnées de build locale qui ont déjà été livrés. Les packages ultérieurs doivent satisfaire les contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

# Validate a tarball from a named trusted private mirror policy.
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-current.tgz \
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

Lors du débogage d'une exécution d'acceptation de package échouée, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`Docker, les journaux de lane, les minutages de phase et les commandes de réexécution. Préférez la réexécution du profil de package échoué ou des lanes Docker exactes au lieu de réexécuter la validation complète de la version.

## Test de fumée d'installation

Le workflow `Install Smoke` distinct réutilise le même script de scope via son propre travail `preflight`. Il divise la couverture des tests de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions **Fast path** pour les pull requests touchant les surfaces Docker/package, les modifications de package/manifest de plugin groupé, ou les surfaces core plugin/channel/gateway/Plugin SDK que les jobs de smoke Docker exercent. Les modifications de plugin groupé sources uniquement, les modifications de tests uniquement et les modifications de docs uniquement ne réservent pas de workers Docker. Le chemin rapide construit l'image root Dockerfile une fois, vérifie la CLI, exécute le smoke CLI de suppression des agents shared-workspace, exécute le e2e du réseau de passerelle de conteneur, vérifie un arg de build d'extension groupée, et exécute le profil Docker de plugin groupé borné sous un délai d'expiration de commande agrégé de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **Full path** conserve la couverture d'installation de package QR et de Docker/update de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de release par appel de workflow, et les pull requests qui touchent réellement les surfaces installer/package/Docker. En mode complet, install-smoke prépare ou réutilise une image de smoke Dockerfile racine GHCR target-SHA, puis exécute l'installation du package QR, les smokes Dockerfile racine/passerelle, les smokes installateur/mise à jour, et le E2E Docker de plugin groupé rapide en tant que jobs distincts pour que le travail de l'installateur n'attende pas derrière les smokes de l'image racine.

Les pushs `main`Docker (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique de portée modifiée demanderait une couverture complète sur un push, le workflow conserve le smoke Docker rapide et laisse le smoke d'installation complet aux validations nocturnes ou de release.

Le smoke lent du provider d'image d'installation globale Bun est séparément contrôlé par `run_bun_global_install_smoke`. Il s'exécute selon la planification nocturne et à partir du workflow de vérifications de release, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais pas les pull requests et les pushs `main`. Le CI PR normal exécute toujours la voie de régression du lanceur BunDocker rapide pour les modifications pertinentes pour Node. Les tests Docker QR et installateur conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all` pré-construit une image live-test partagée, empaquette OpenClaw une fois en tant qu'archive npm et construit deux images `scripts/e2e/Dockerfile` partagées :

- un runner Node/Git nu pour les voies d'installateur/de mise à jour/dépendances de plugin ;
- une image fonctionnelle qui installe la même archive dans `/app` pour les voies de fonctionnalité normales.

Les définitions de voie Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs` et le runner exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres

| Variable                               | Par défaut | Objet                                                                                                                                      |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                           |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de queue sensible au fournisseur.                                                                            |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite simultanée de voies actives afin que les fournisseurs ne limitent pas le débit.                                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite simultanée de voies d'installation npm.                                                                                             |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite simultanée de voies multi-services.                                                                                                 |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les démarrages de voies pour éviter les tempêtes de création du démon Docker ; définissez `0` pour aucun délai.                |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/queue sélectionnées utilisent des limites plus strictes.                            |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` imprime le planificateur sans exécuter les voies.                                                                                      |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage smoke afin que les agents puissent reproduire une voie ayant échoué. |

Une voie plus lourde que sa plafond effectif peut toujours démarrer à partir d'un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégateur local effectue des vérifications préliminaires sur Docker, supprime les conteneurs E2E OpenClaw obsolètes, émet l'état des voies actives, persiste les minutages des voies pour un ordonnancement du plus long en premier, et arrête par défaut l'ordonnancement de nouvelles voies regroupées après le premier échec.

### Workflow live/E2E réutilisable

Le workflow live/E2E réutilisable demande à `scripts/test-docker-all.mjs --plan-json` quel package, quel type d'image, quelle image live, quelle voie et quelle couverture d'informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquette OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse des images E2E Docker nues/fonctionnelles étiquetées par digest de package via le cache de couche Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes étiquetées par digest de package au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente limité de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Segments du chemin de publication

La couverture Docker pour la publication exécute des plus petits travaux segmentés avec `OPENCLAW_SKIP_DOCKER_BUILD=1` afin que chaque segment ne récupère que le type d'image dont il a besoin et exécute plusieurs voies via le même ordonnanceur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les morceaux Docker de la version actuelle sont Docker`core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` jusqu'à `plugins-runtime-install-h`. `package-update-openai`OpenClaw inclut la ligne de paquet du plugin Codex en direct, qui installe le paquet candidat OpenClaw, installe le plugin Codex à partir de `codex_plugin_spec`CLICLIOpenClawOpenAI ou d'une archive tar de même référence avec une approbation d'installation explicite de la CLI Codex, exécute les contrôles préalables de la CLI Codex, puis exécute plusieurs tours d'agent OpenClaw de même session contre OpenAI. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de ligne `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux lignes d'installation de fournisseur.

OpenWebUI est intégré à `plugins-runtime-services` lorsque la couverture complète du chemin de version le demande, et conserve un morceau autonome `openwebui`npm uniquement pour les répartitions exclusives à OpenWebUI. Les lignes de mise à jour de canal groupé réessayent une fois en cas de pannes réseau transitoires npm.

Chaque bloc téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le JSON du planificateur, les tables de voies lentes et les commandes de réexécution par voie. L'entrée `docker_lanes`DockerDockerGitHub du workflow exécute les voies sélectionnées sur les images préparées au lieu des tâches de bloc, ce qui limite le débogage des voies échouées à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie Docker active, la tâche ciblée construit l'image de test active localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name` et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le paquet exact et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié live/E2E exécute quotidiennement la suite complète Docker de chemin de release.

## Prérelease de plugin

`Plugin Prerelease` est une couverture produit/paquet plus coûteuse, c'est donc un workflow séparé distribué par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées `main`DockerDocker et les distributions manuelles autonomes de CI gardent cette suite désactivée. Il équilibre les tests de plugin groupés sur huit workers d'extension ; ces tâches de shard d'extension exécutent jusqu'à deux groupes de config de plugin à la fois avec un worker Vitest par groupe et un tas Node plus grand afin que les lots de plugins lourds en importation ne créent pas de tâches CI supplémentaires. Le chemin de prérelease Docker exclusif aux release groupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow téléverse également un artefact d'information `plugin-inspector-advisory` à partir de `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont une entrée de triage et ne modifient pas la porte de blocage Plugin Prerelease.

## Labo QA

Le QA Lab dispose de voies CI dédiées en dehors du workflow principal à portée intelligente. La parité agentique est imbriquée sous les harnais de QA et de version étendus, et non sous un workflow de PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation étendue.

- Le workflow `QA-Lab - All Lanes` s'exécute toutes les nuits sur `main`MatrixTelegramDiscord et lors d'un déclenchement manuel ; il déploie la voie de parité simulée, la voie Matrix en direct, et les voies Telegram et Discord en direct en tant que tâches parallèles. Les tâches en direct utilisent l'environnement `qa-live-shared`TelegramDiscord, et Telegram/Discord utilisent des baux Convex.

Les vérifications de version exécutent les voies de transport en direct Matrix et Telegram avec le fournisseur simulé déterministe et des modèles qualifiés pour simulation (MatrixTelegram`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`Docker), afin que le contrat de channel soit isolé de la latence du modèle en direct et du démarrage normal du plugin fournisseur. La passerelle de transport en direct désactive la recherche de mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du fournisseur est couverte par les suites distinctes de modèle en direct, de fournisseur natif et de fournisseur Docker.

Matrix utilise Matrix`--profile fast` pour les planifications et les portes de version, en ajoutant `--fail-fast`CLICLI uniquement lorsque le CLI extrait le prend en charge. L'entrée par défaut du CLI et du workflow manuel reste `all` ; le déclenchement manuel `matrix_profile=all`Matrix divise toujours la couverture Matrix complète en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies critiques du QA Lab avant l'approbation de la version ; sa porte de parité QA exécute les packs candidats et de base en tant que tâches de voie parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normales, suivez les preuves CI/check délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non un balayage complet du dépôt. Les exécutions quotidiennes, manuelles et de garde de pull request non brouillon scannent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité à haute confiance filtrées sur des niveaux `security-severity` élevés/critiques.

La garde de pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. Les Android et CodeQL macOS restent en dehors des valeurs par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron et passerelle de base                                                                                                                         |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit                 |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF, d'analyse IP, de garde réseau, de récupération web et de SSRF du Plugin SDK de base                                                            |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution de tool d'agent                                                                |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de paquets, chargement source et surfaces de confiance du contrat de paquet Plugin SDK |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — shard de sécurité Android planifié. Construit l'application Android manuellement pour CodeQL sur le plus petit runner Linux Blacksmith accepté par la cohérence du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — shard de sécurité macOS hebdomadaire/manuel. Génère manuellement l'application macOS pour CodeQL sur Blacksmith macOS, filtre les résultats de build des dépendances du SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`. Gardé en dehors des défauts quotidiens car le build macOS domine le temps d'exécution même lorsqu'il est propre.

### Catégories de qualité critique

`CodeQL Critical Quality` est le shard non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript non-sécurité et de gravité erreur sur des surfaces de haute valeur restreintes sur le plus petit runner Blacksmith Linux. Son garde de pull request est intentionnellement plus petit que le profil planifié : les PR non-brouillon n'exécutent que les shards `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract`, et `plugin-sdk-reply-runtime` correspondants pour le code d'exécution et de répartition des réponses de commande/model/tool d'agent, le code de schéma/migration/IO de configuration, le code d'auth/secrets/bac à sable/sécurité, le runtime du plugin channel principal et groupé, le protocole/méthode de serveur gateway, la colle runtime/SDK de mémoire, la livraison MCP/processus/sortant, le catalogue de model/runtime de provider, les files de diagnostic/livraison de session, le chargeur de plugin, le contrat de paquet/Plugin SDK, ou les modifications du runtime de réponse du Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze shards de qualité de PR.

La répartition manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des crochets d'enseignement/itération pour exécuter un shard de qualité en isolement.

| Catégorie                                               | Surface                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code d'auth, secrets, bac à sable, cron et frontière de sécurité gateway                                                                                                                                                                                   |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats IO                                                                                                                                                                                           |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode de serveur                                                                                                                                                                                             |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation des plugins de canal principal et de canal groupé                                                                                                                                                                                |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commandes, distribution model/provider, distribution et files d'attente de réponses automatiques, et contrats d'exécution du plan de contrôle ACP                                                                                             |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision de processus, et contrats de livraison sortante                                                                                                                                                  |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK hôte de mémoire, façades d'exécution de mémoire, alias du SDK de plugin de mémoire, colle d'activation de l'exécution de mémoire, et commandes du docteur de mémoire                                                                                   |
| `/codeql-critical-quality/session-diagnostics-boundary` | Fonctionnement interne de la file d'attente de réponses, files d'attente de livraison de session, assistants de liaison/livraison de session sortante, surfaces de regroupement d'événements/journaux de diagnostic, et contrats CLI du docteur de session |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Distribution des réponses entrantes du SDK de plugin, assistants de payload/fragmentation/exécution des réponses, options de réponse de canal, files d'attente de livraison, et assistants de liaison session/fil de discussion                            |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte de provider, enregistrement de l'exécution du provider, valeurs par défaut/catalogues du provider, et registres web/recherche/récupération/incorporation                             |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface de contrôle, persistance locale, flux de contrôle de passerelle, et contrats d'exécution du plan de contrôle des tâches                                                                                                            |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web principale, E/S média, compréhension média, génération d'images, et contrats d'exécution de génération média                                                                                                                    |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique, et contrats du point d'entrée du SDK de plugin                                                                                                                                                                       |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source du SDK de plugin côté package publié et assistants de contrat de package de plugin                                                                                                                                                                  |

La qualité reste séparée de la sécurité afin que les résultats de qualité puissent être planifiés, mesurés, désactivés ou étendus sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plugins groupés ne doit être réintégrée que sous forme de travail de suivi délimité ou partitionné une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour garder les documents existants alignés avec les modifications récemment intégrées. Il n'a pas de planification pure : une exécution CI réussie de push non-bot sur `main` peut la déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution de Docs Agent non ignorée a été créée au cours de la dernière heure. Lorsqu'elle s'exécute, elle examine la plage de commits depuis le SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, ainsi une seule exécution horaire peut couvrir toutes les modifications principales accumulées depuis la dernière passe de documentation.

### Agent de performance de test

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas de planification pure : une exécution CI réussie de push non-bot sur `main` peut la déclencher, mais elle est ignorée si une autre invocation d'exécution de workflow a déjà été exécutée ou est en cours ce jour-là UTC. La répartition manuelle contourne cette porte d'activité quotidienne. La voie construit un rapport de performance Vitest groupé pour la suite complète, permet à Codex de n'apporter que de petites corrections de performance de test préservant la couverture au lieu de refactorisations larges, puis relance le rapport de la suite complète et rejette les modifications qui réduisent le nombre de tests de base réussis. Le rapport groupé enregistre le temps mural par configuration et le RSS maximal sur Linux et macOS, de sorte que la comparaison avant/après met en évidence les écarts de mémoire des tests à côté des écarts de durée. Si la base contient des tests échouant, Codex peut ne corriger que les échecs évidents et le rapport de la suite complète après l'agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot ne soit intégré, la voie rebascule le correctif validé, relance `pnpm check:changed` et réessaie le push ; les correctifs périmés en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité de suppression de sudo que l'agent de documentation.

### PR en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow de maintenance manuel pour le nettoyage des doublons après l'intégration. Il est en mode dry-run par défaut et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR intégré a bien été fusionné et que chaque doublon possède soit un problème référencé partagé, soit des morceaux de code modifiés qui se chevauchent.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale des voies modifiées (changed-lane) réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte concernant les limites de l'architecture que la portée générale de la plateforme CI :

- les modifications de production du core exécutent core prod, core test typecheck ainsi que core lint/guards ;
- les modifications de test uniquement du core n'exécutent que core test typecheck ainsi que core lint ;
- les modifications de production des extensions exécutent extension prod, extension test typecheck ainsi que extension lint ;
- les modifications de test uniquement des extensions exécutent extension test typecheck ainsi que extension lint ;
- les modifications du Plugin SDK public ou du plugin-contract s'étendent à l'extension typecheck car les extensions dépendent de ces contrats du core (les parcours Vitest des extensions restent du travail de test explicite) ;
- les augmentations de version des métadonnées de release uniquement exécutent des vérifications ciblées sur la version, la configuration et les dépendances racines ;
- les modifications inconnues à la racine ou dans la configuration échouent en sécurité (fail safe) vers toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes des tests s'exécutent elles-mêmes, les modifications du code source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison partagée des salles de groupe est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de réponse source, ou du prompt système de l'outil de message passent par les tests de réponse du core ainsi que par les régressions de livraison Discord et Slack, de sorte qu'un changement par défaut partagé échoue avant le premier push de PR. N'utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` que lorsque le modification est suffisamment large au niveau du harnais pour que l'ensemble mappé peu coûteux ne soit pas un proxy fiable.

## Validation Testbox

Crabbox est le wrapper de boîte distante appartenant au dépôt pour la preuve Linux du mainteneur. Utilisez-le
à partir de la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI
compte, ou lorsque la preuve nécessite des secrets, Docker, les voies de paquets,
des boîtes réutilisables ou des journaux distants. Le backend OpenClaw normal est
LinuxDockerOpenClaw`blacksmith-testbox`Hetzner ; la capacité AWS/Hetzner détenue est un repli pour les pannes de Blacksmith,
les problèmes de quota, ou les tests explicites de capacité détenue.

Les exécutions Blacksmith soutenues par Crabbox lancent warm, claim, sync, run, report et nettoient
les Testboxes ponctuels. Le contrôle de cohérence de synchronisation intégré échoue rapidement lorsque les fichiers racine requis
tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short`
affiche au moins 200 suppressions suivies. Pour les PR avec des suppressions intentionnelles importantes, définissez
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale de Blacksmith CLI qui reste dans la
phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez
CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée
pour les différences locales inhabituellement grandes.

Avant une première exécution, vérifiez le wrapper à partir de la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Le wrapper du dépôt refuse un binaire Crabbox obsolète qui n'annonce pas `blacksmith-testbox`. Passez le fournisseur explicitement même si `.crabbox.yaml` a des valeurs par défaut pour le cloud détenu. Dans les arbres de travail Codex ou les extraits liés/clairsemés, évitez le script `pnpm crabbox:run` local car pnpm peut réconcilier les dépendances avant le démarrage de Crabbox ; invoquez plutôt directement le wrapper node :

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
  "corepack pnpm check:changed"
```

Nouvelle exécution de test ciblée :

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
  "corepack pnpm test <path-or-filter>"
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
  "corepack pnpm test"
```

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions Crabbox soutenues par Blacksmith ponctuelles doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes en cours d'exécution et arrêtez uniquement les boîtes que vous avez créées :

```bash
blacksmith testbox list --all
blacksmith testbox status --id <tbx_id>
blacksmith testbox stop --id <tbx_id>
```

Utilisez la réutilisation uniquement lorsque vous avez intentionnellement besoin de plusieurs commandes sur la même boîte hydratée :

```bash
pnpm crabbox:run -- --provider blacksmith-testbox --id <tbx_id> --no-sync --timing-json --shell -- "pnpm test <path-or-filter>"
pnpm crabbox:stop -- <tbx_id>
```

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez le Blacksmith direct uniquement pour les diagnostics tels que `list`, `status`, et le nettoyage. Corrigez le chemin Crabbox avant de considérer une exécution Blacksmith directe comme une preuve pour le mainteneur.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux warmups restent `queued` sans IP ni d'URL d'exécution Actions après quelques minutes, considérez cela comme une pression du provider Blacksmith, de la file d'attente, de la facturation ou des limites de l'organisation. Arrêtez les identifiants en file d'attente que vous avez créés, évitez de démarrer plus de Testboxes, et déplacez la preuve vers le chemin de capacité Crabbox détenu ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Escaladez vers la capacité Crabbox détenu uniquement lorsque Blacksmith est en panne, limité par le quota, manque de l'environnement nécessaire, ou si la capacité détenu est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

En cas de pression AWS, évitez `class=beast` à moins que la tâche n'ait vraiment besoin d'un CPU de classe 48xlarge. Une demande `beast` commence à 192 vCPUs et est le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` détenu par le dépôt est configuré par défaut sur `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS courtiers impriment la région/marché sélectionné(e), la pression du quota, le repli Spot et les avertissements de classe haute pression. Utilisez `fast` pour les vérifications larges plus lourdes, `large` uniquement après que standard/fast ne suffisent plus, et `beast`Docker uniquement pour les exceptionnels volets liés au CPU tels que les matrices Docker full-suite ou all-plugin, la validation explicite de version/bloqueur, ou le profilage de performance à haut nombre de cœurs. N'utilisez pas `beast` pour `pnpm check:changed`, les tests focalisés, le travail uniquement sur la documentation, le lint/typecheck ordinaire, les petites reproductions E2E, ou le triage de panne Blacksmith. Utilisez `--market on-demand` pour le diagnostic de capacité afin que l'agitation du marché Spot ne soit pas mélangée au signal.

`.crabbox.yaml` possède les valeurs par défaut de fournisseur, de synchronisation et d'hydratation des GitHub Actions pour les lignes owned-cloud. Il exclut le `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les distantes et les magasins d'objets locaux du mainteneur, et il exclut les artefacts d'exécution/de build locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère le checkout, la configuration de Node/pnpm, la récupération `origin/main` et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

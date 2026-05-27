---
summary: "Graphe de tâches CI, portes de portée, parapluies de version et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

OpenClaw CI s'exécute à chaque envoi vers OpenClaw`main` et à chaque pull request. Le job `preflight` classe les différences et désactive les volets coûteux lorsque seules des zones non liées ont changé. Les exécutions manuelles `workflow_dispatch`Android contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la publication et les validations étendues. Les volets Android restent en option via `include_android`. La couverture des plugins uniquement pour les publications se trouve dans le workflow séparé [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

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

## Preuve du comportement réel

Les PR des contributeurs externes exécutent une porte `Real behavior proof` à partir de
`.github/workflows/real-behavior-proof.yml`. Le workflow extrait le commit de base de confiance
e n'évalue que le corps de la PR ; il n'exécute pas le code de la
branche du contributeur.

La porte s'applique aux auteurs de PR qui ne sont pas propriétaires, membres,
collaborateurs ou bots du dépôt. Elle réussit lorsque le corps de la PR contient une
section `Real behavior proof` avec des valeurs remplies pour :

- `Behavior or issue addressed`
- `Real environment tested`
- `Exact steps or command run after this patch`
- `Evidence after fix`
- `Observed result after fix`
- `What was not tested`

La preuve doit montrer le comportement modifié après le correctif dans une configuration OpenClaw
réelle. Les captures d'écran, les enregistrements, les captures de terminal, la sortie console, la copie de la
sortie en direct, les journaux d'exécution expurgés et les artefacts liés comptent tous. Les tests unitaires, les simulations,
les instantanés, les linters, les vérifications de type et les résultats de CI sont des vérifications de support utiles,
mais ils ne satisfont pas à eux seuls cette porte.

Lorsque la vérification échoue, mettez à jour le corps de la PR au lieu de pousser un autre commit de code.
Les mainteneurs peuvent appliquer `proof: override` uniquement lorsque la porte de preuve ne doit pas
s'appliquer à cette PR.

## Portée et routage

La logique de portée se trouve dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. Le déclenchement manuel ignore la détection de portée modifiée et fait agir le manifeste prévol comme si chaque zone délimitée avait changé.

- **Modifications du workflow CI** valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas les builds natifs Windows, Android ou macOS par eux-mêmes ; ces voies de plateforme restent limitées aux modifications des sources de la plateforme.
- **Docs sur les pushes `main`** sont vérifiées par le workflow autonome `Docs` avec le même miroir de docs ClawHub utilisé par la CI, donc les pushes mixtes code+docs ne mettent pas non plus en file d'attente le shard CI `check-docs`. Les pull requests et la CI manuelle exécutent toujours `check-docs` à partir de la CI lorsque les docs changent.
- **PTY TUI** est un workflow ciblé pour les modifications TUI. Il exécute `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` sur Linux Node 24 pour `src/tui/**`, le harnais de surveillance, le script de package, le fichier de verrouillage et les modifications de workflow. La voie obligatoire utilise une fixture `TuiBackend` déterministe ; le test de fumée plus lent `tui --local` est optionnel avec `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` et simule uniquement le point de terminaison externe du model.
- **Modifications du routage CI uniquement, modifications sélectionnées de fixtures de tests de base peu coûteuses, et modifications étroites d'aide de contrat de plugin/routage de test** utilisent un chemin de manifeste Node uniquement rapide : `preflight`, sécurité, et une seule tâche `checks-fast-core`. Ce chemin évite les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards de base complets, les shards de plugins groupés, et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
- **Vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de packages, et aux surfaces du workflow CI qui exécutent cette voie ; les modifications non liées, de plugin, de test de fumée d'installation et de test uniquement restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont réparties ou équilibrées afin que chaque job reste petit sans sur-réserver les runners : les contrats de plugins et les contrats de canaux s'exécutent chacun sous la forme de deux shards pondérés soutenus par Blacksmith avec le repli sur le runner standard GitHub, les voies rapides/de support d'unités principales s'exécutent séparément, l'infrastructure d'exécution principale est répartie entre l'état, le process/config, le partagé et trois shards de domaine cron, la réponse automatique s'exécute en tant que workers équilibrés (avec le sous-arbre de réponse réparti en shards agent-runner, dispatch, et commands/state-routing), et les configs de serveur/gateway agentiques sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests larges de navigateur, QA, média et de plugins divers utilisent leurs propres configs Vitest dédiées au lieu du fichier de récupération de plugins partagé. Les shards basés sur des modèles d'inclusion enregistrent des entrées de chronologie en utilisant le nom du shard CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une config entière d'un shard filtré. `check-additional-*` maintient ensemble le travail de compilation/canary lié aux limites de packages et sépare l'architecture de topologie d'exécution de la couverture de surveillance du Gateway ; la liste des gardiens de limites est répartie en un shard gourmand en prompts et un shard combiné pour les autres bandes de gardiens, chacun exécutant les gardiens indépendants sélectionnés simultanément et imprimant des chronologies par vérification. La vérification coûteuse de la dérive des snapshots de prompts du chemin heureux Codex s'exécute en tant que job supplémentaire distinct pour le CI manuel et uniquement pour les modifications affectant les prompts, afin que les modifications Node normales non liées n'attendent pas derrière la génération à froid de snapshots de prompts et que les shards de limites restent équilibrés tandis que la dérive de prompts reste épinglée à la PR qui l'a causée ; le même indicateur ignore la génération Vitest de snapshots de prompts à l'intérieur du shard de limites de support principal des artefacts construits. La surveillance du Gateway, les tests de canaux et le shard de limites de support principal s'exécutent simultanément à l'intérieur de `build-artifacts` une fois que `dist/` et `dist-runtime/` sont déjà construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`Android puis construit l'APK de débogage Play. La variante tierce n'a pas de jeu de sources ou de manifeste distinct ; sa voie de test unitaire compile toujours la variante avec les indicateurs BuildConfig de SMS/journal d'appels, tout en évitant une tâche de conditionnement d'APK de débogage en double à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (un passage de production Knip dépendances uniquement épinglé sur la dernière version de Knip, avec l'âge de sortie minimum de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés de production de Knip avec `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non révisé ou laisse une entrée de liste d'autorisation obsolète, tout en préservant les surfaces de plugin dynamique intentionnelles, générées, de build, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extrait ni n'exécute de code de demande de tirage (pull request) non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de demandes de tirage ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les pushes `main` ;
- `github_activity`GitHub pour l'activité GitHub générale que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transmet uniquement les métadonnées normalisées : type d'événement, action, acteur, référentiel, numéro de l'élément, URL, titre, état et de courts extraits pour les commentaires ou les révisions, le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, et non une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne devrait publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, modifications, activités des bots, bruit de webhook en double et le trafic normal de révision devraient entraîner `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ce sont des entrées pour le résumé et l'orientation, et non des instructions pour le workflow ou le runtime de l'agent.

## Répartitions manuelles

Les répartitions CI manuelles exécutent le même graphe de travaux que le CI normal mais forcent l'activation de chaque voie à portée non-Android : fragments Node Linux, fragments de plugin regroupés, fragments de contrat de plugin et de channel, compatibilité Node 22, `check-*`, `check-additional-*`, tests de fumée des artefacts construits, vérifications de documentation, compétences Python, Windows, macOS et i18n de l'interface de contrôle. Les répartitions CI manuelles autonomes exécutent uniquement Android avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de prépublication de plugins, le fragment `agentic-plugins` publication uniquement, le balayage complet du lot d'extensions et les voies Docker de prépublication de plugins sont exclus du CI. La suite de prépublication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow séparé `Plugin Prerelease` avec la porte de validation de publication activée.

Les exécutions manuelles utilisent un groupe de simultanéité unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée optionnelle `target_ref` permet à un appelant de confiance d'exécuter ce graphe contre une branche, une étiquette ou un SHA de commit complet tout en utilisant le fichier de workflow depuis la référence de distribution sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ubuntu-24.04`                   | `preflight`, vérifications de documentation, compétences Python, workflow-sanity, labeler, auto-response ; le prévol install-smoke utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse mettre en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `security-fast`, shards d'extension de poids inférieur, `checks-fast-core`, shards de contrat plugin/channel, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, et `check-test-types`                        |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de tests Node Linux, shards de tests de plugins regroupés, shards `check-additional-*`, `android`                                                                                                                                               |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint`Docker (assez sensibles au CPU pour que 8 vCPU coûtent plus qu'ils n'économisent) ; constructions Docker install-smoke (le temps d'attente dans la file de 32 vCPU coûte plus qu'il n'économise)                        |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                       |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                           |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                          |

Le CI du dépôt canonique conserve Blacksmith comme chemin de runner par défaut. Pendant `preflight`, `scripts/ci-runner-labels.mjs` vérifie les exécutions d'Actions récentes en file d'attente et en cours pour les tâches Blacksmith en file d'attente. Si un label Blacksmith spécifique a déjà des tâches en file d'attente, les tâches en aval qui utiliseraient ce label exact reviennent au runner hébergé par GitHub correspondant (`ubuntu-24.04`, `windows-2025`, ou `macos-latest`) uniquement pour cette exécution. Les autres tailles Blacksmith de la même famille de système d'exploitation restent sur leurs labels principaux. Si la sonde de l'API échoue, aucun retour de secours n'est appliqué.

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
pnpm perf:kova:summary --report .artifacts/kova/reports/mock-provider/report.json --output .artifacts/kova/summary.md
```

## Performance OpenClaw

`OpenClaw Performance` est le workflow de performance produit/runtime. Il s'exécute quotidiennement sur `main` et peut être lancé manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le lancement manuel effectue généralement un benchmark de la référence du workflow. Définissez `target_ref` pour effectuer un benchmark d'un tag de publication ou d'une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une publication épinglée et Kova à partir de `openclaw/Kova` sur l'entrée épinglée `kova_ref`, puis exécute trois voies :

- `mock-provider` : Scénarios de diagnostic Kova sur un runtime construit localement avec une authentification factice déterministe compatible OpenAI.
- `mock-deep-profile` : Profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds de tour d'agent.
- `live-openai-candidate` : un tour d'agent `openai/gpt-5.5` OpenAI réel, ignoré lorsque `OPENAI_API_KEY` est indisponible.

La voie mock-provider exécute également des sondes de source natives OpenClaw après la passe Kova : le temps de démarrage et la mémoire de la passerelle dans les cas de démarrage par défaut, avec hook et 50 plugins ; des boucles de bonjour répétées mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI ; et les commandes de démarrage CLI contre la passerelle démarrée. Le résumé Markdown de la sonde de source se trouve à `source/index.md` dans le bundle de rapport, avec le JSON brut à côté.

Chaque voie téléverse des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md` et les artefacts de sonde de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la release

`Full Release Validation` est le workflow manuel parapluie pour "exécuter tout avant la publication". Il accepte une branche, une balise ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease` pour la preuve de plugin/colis/statique/Docker uniquement pour la publication, et envoie `OpenClaw Release Checks` pour le test de fumée d'installation, l'acceptation de colis, les vérifications de colis multi-OS, la parité du Lab QA, les voies Matrix et Telegram. Les exécutions stables/par défaut gardent la couverture exhaustive en direct/E2E et le chemin de publication Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture de trempage afin que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` par rapport à l'artefact `release-package-under-test` des vérifications de publication. Après publication, passez `release_package_spec` pour réutiliser le colis npm expédié dans les vérifications de publication, l'acceptation de colis, Docker, multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un colis différent. La voie du colis en direct du plugin Codex utilise le même état sélectionné par défaut : le `release_package_spec=openclaw@<tag>` publié dérive `codex_plugin_spec=npm:@openclaw/codex@<tag>`, tandis que les exécutions SHA/artefact empaquètent `extensions/codex` à partir de la référence sélectionnée. Définissez `codex_plugin_spec` explicitement pour les sources de plugin personnalisées telles que les spécifications `npm:`, `npm-pack:` ou `git:`.

Voir [Validation complète de la publication](/fr/reference/full-release-validation) pour la
matrice de étapes, les noms exacts des tâches de workflow, les différences de profil, les artefacts et
les poignées de réexécution ciblées.

`OpenClaw Release Publish` est le workflow de publication avec mutation manuelle. Déclenchez-le depuis `release/YYYY.M.D` ou `main` une fois que le tag de publication existe et une fois que la pré-vérification OpenClaw npm a réussi. Il vérifie `pnpm plugins:sync:check`, déclenche `Plugin NPM Release` pour tous les packages de plugins publiables, déclenche `Plugin ClawHub Release` pour le même SHA de publication, et ce n'est qu'alors qu'il déclenche `OpenClaw NPM Release` avec le `preflight_run_id` enregistré.

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

Les refs de dispatch de workflow GitHub doivent être des branches ou des tags, et non des SHAs de commit bruts. L'helper pousse une branche temporaire `release-ci/<sha>-...` au SHA cible, déclenche `Full Release Validation` depuis cette réf épinglée, vérifie que chaque `headSha` de workflow enfant correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si un workflow enfant s'est exécuté sur un SHA différent.

`release_profile` contrôle l'étendue directe/provider transmise aux vérifications de publication. Les workflows de publication manuelle par défaut sont `stable` ; n'utilisez `full` que lorsque vous souhaitez intentionnellement la large matrice provider/média consultative. `run_release_soak` contrôle si les vérifications de publication stables/défauts exécutent le soak complet direct/E2E et le chemin de publication Docker ; `full` force l'activation du soak.

- `minimum` conserve les voies les plus rapides critiques pour la publication OpenAI/core.
- `stable` ajoute l'ensemble stable provider/backend.
- `full` exécute la large matrice provider/média consultative.

Le parapluie enregistre les IDs d'exécution enfants déclenchés, et le travail final `Verify full validation` revérifie les conclusions actuelles des exécutions enfants et ajoute des tableaux des travaux les plus lents pour chaque exécution enfant. Si un workflow enfant est réexécuté et passe au vert, réexécutez uniquement le travail de vérificateur parent pour actualiser le résultat du parapluie et le résumé des durées.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de pré-version du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de maintenir bornée la réexécution d'une version échouée après une correction ciblée. Pour une seule voie cross-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes cross-OS longues émettent des lignes de signal de vie et les résumés de mise à niveau de paquets incluent des minutages par phase. Les voies de vérification de version QA sont consultives, à l'exception de la barrière de couverture de l'outil d'exécution standard, qui bloque lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé du niveau standard.

`OpenClaw Release Checks` utilise la référence de workflow approuvée pour résoudre la référence sélectionnée une seule fois en une archive tar `release-package-under-test`, puis transmet cet artefact aux vérifications cross-OS et à l'acceptation des paquets, ainsi qu'au workflow de version de chemin de publication Dockernpm en direct/E2E lors de l'exécution de la couverture de trempage. Cela maintient les octets du paquet cohérents entre les boîtes de version et évite de réempaqueter le même candidat dans plusieurs travaux enfants. Pour la voie en direct du plugin npm Codex, les vérifications de version transmettent soit une spécification de plugin publiée correspondante dérivée de `release_package_spec`, transmettent le `codex_plugin_spec` fourni par l'opérateur, ou laissent l'entrée vide afin que le script Docker empaquette le plugin Codex de l'extraction sélectionnée.

Les exécutions en double de `Full Release Validation` pour `ref=main` et `rerun_group=all`
supplantent l'ensemble global précédent. Le moniteur parent annule tout workflow enfant
qu'il a déjà dispatché lorsque le parent est annulé, donc une validation plus récente de main
n'attend pas derrière une exécution de release-check obsolète de deux heures. La validation
de la branche/du tag de release et les groupes de réexécution focalisée conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant release live/E2E conserve une large couverture native `pnpm test:live`, mais il l'exécute en tant que shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail série unique :

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
- shards audio/vidéo de média divisés et shards de musique filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des défaillances lentes des providers en direct. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions manuelles ponctuelles.

Les shards de média live natifs s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les travaux média vérifient uniquement les binaires avant la configuration. Gardez les suites live soutenues par Docker sur les runners Blacksmith normaux — les travaux conteneur ne sont pas l'endroit approprié pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI partagée distincte par commit sélectionné. Le workflow de version en direct construit et pousse cette image une fois, puis les shards du modèle en direct Docker, de la Gateway shardée par fournisseur, du backend CLI, d'ACP bind et du harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`GatewayDocker. Les shards Docker de Gateway comportent des limites `timeout`Docker explicites au niveau du script, inférieures au délai d'expiration du job de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'intégralité du budget de vérification de version. Si ces shards reconstruisent indépendamment la cible Docker source complète, l'exécution de la version est mal configurée et gaspillera du temps horloge sur des constructions d'images en double.

## Acceptation de package

Utilisez `Package Acceptance`OpenClawDocker lorsque la question est « ce package OpenClaw installable fonctionne-t-il comme un produit ? ». Il diffère de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation de package valide un seul fichier tar via le même harnais E2E Docker que les utilisateurs utilisent après l'installation ou la mise à jour.

### Jobs

1. `resolve_package` récupère `workflow_ref`, résout un candidat de package, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test`GitHub et imprime la source, la référence du workflow, la référence du package, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`DockerDocker. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive tar, prépare les images Docker de digest de package si nécessaire, et exécute les voies Docker sélectionnées sur ce package au lieu d'emballer l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes`Docker ciblés, le workflow réutilisable prépare le package et les images partagées une seule fois, puis répartit ces voies en tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle `NPM Telegram Beta E2E` de manière facultative. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test`Telegramnpm lorsque l'acceptation de package en a résolu un ; une distribution Telegram autonome peut toujours installer une spécification npm publiée.
4. `summary`DockerTelegram fait échouer le workflow si la résolution du package, l'acceptation Docker ou la voie Telegram facultative a échoué.

### Sources candidates

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest`OpenClaw, ou une version de publication exacte d'OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des versions préliminaires/stables publiées.
- `source=ref` emballe une branche, une balise ou un SHA de commit complet approuvé `package_ref`OpenClaw. Le résolveur récupère les branches/balises OpenClaw, vérifie que le commit sélectionné est accessible à partir de l'historique des branches du référentiel ou d'une balise de publication, installe les dépendances dans un arbre de travail détaché, et l'emballe avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS public ; `package_sha256` est requis. Ce chemin rejette les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte privés/interne/à usage spécial ou les IP résolues, et les redirections en dehors de la même politique de sécurité publique.
- `source=trusted-url` télécharge un `.tgz` HTTPS à partir d'une stratégie de source approuvée nommée dans `.github/package-trusted-sources.json` ; `package_sha256` et `trusted_source_id` sont requis. Utilisez ceci uniquement pour les miroirs d'entreprise appartenant aux mainteneurs ou les référentiels de packages privés qui nécessitent des hôtes, des ports, des préfixes de chemin, des hôtes de redirection ou une résolution de réseau privé configurés. Si la stratégie déclare une authentification bearer, le workflow utilise le secret fixe `OPENCLAW_TRUSTED_PACKAGE_TOKEN` ; les identifiants intégrés dans l'URL sont toujours rejetés.
- `source=artifact` télécharge un `.tgz` à partir de `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harness de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lorsque `source=ref`. Cela permet au harnais de test actuel de valider des commits source de confiance plus anciens sans exécuter l'ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragments complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis lorsque `suite_profile=custom`

Le profil `package` utilise une couverture de plugins hors ligne, de sorte que la validation des packages publiés n'est pas conditionnée à la disponibilité de ClawHub en direct. La voie Telegram optionnelle réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spec npm publié conservé pour les déclenchements autonomes.

Pour la politique dédiée de mise à jour et de test des plugins, y compris les commandes locales,
les voies Docker, les entrées de Package Acceptance, les valeurs par défaut de version et le triage des échecs,
voyez [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de release appellent Package Acceptance avec `source=artifact`, l'artefact de package de release préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`ClawHubTelegram. Cela permet de conserver la migration de package, la mise à jour, l'installation de compétence live ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation d'installation de plugins configurés, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive tar de package résolue. Définissez `release_package_spec`OpenClawnpm sur la Validation Complète de Release ou les Vérifications de Release OpenClaw après la publication d'une bêta pour exécuter la même matrice par rapport au package npm expédié sans reconstruction ; définissez `package_acceptance_package_spec` uniquement lorsque Package Acceptance a besoin d'un package différent du reste de la validation de release. Les vérifications de release multi-OS couvrent toujours le comportement d'onboarding, d'installateur et de plateforme spécifique à l'OS ; la validation de produit package/mise à jour doit commencer par Package Acceptance. La lane `published-upgrade-survivor`Docker Docker valide une ligne de base de package publiée par exécution dans le chemin de release bloquant. Dans Package Acceptance, l'archive tar `package-under-test` résolue est toujours la candidate et `published_upgrade_survivor_baseline` sélectionne la ligne de base publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de lane en éch préservent cette ligne de base. La Validation Complète de Release avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker pour s'étendre sur les quatre dernières releases stables npm, plus les releases limites de compatibilité des plugins et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona conservés, les installations de plugins OpenClaw configurés, les chemins de journal avec tilde et les racines de dépendances de plugins hérités obsolètes. Les sélections survivantes de mise à jour publiée multi-ligne de base sont partitionnées par ligne de base dans des travaux de runner Docker ciblés séparés. Le workflow séparé `Update Migration` utilise la lane `update-migration`Docker Docker avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale de CI de Release Complète. Les exécutions d'agrégat local peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule lane avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La lane publiée configure la ligne de base avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json` et sonde `/healthz`, `/readyz`RPCGatewayWindowsWindowsOpenAI, ainsi que le statut RPC après le démarrage de Gateway. Les lanes fraîches de package et d'installateur Windows vérifient également qu'un package installé peut importer un remplacement de contrôle de navigateur à partir d'un chemin Windows absolu brut. Le test de fumée cross-OS de tour d'agent OpenAI par défaut est `OPENCLAW_CROSS_OS_OPENAI_MODEL` si défini, sinon `openai/gpt-5.5`, afin que la preuve d'installation et de gateway reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritées

Package Acceptance dispose de fenêtres de compatibilité héritées délimitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis de l'archive ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les `patchedDependencies` pnpm manquants du fixture git factice dérivé de l'archive et peut consigner les `update.channel` persistants manquants ;
- les tests de fumée de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation du marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement sans réinstallation restent inchangés.

Le package `2026.4.26` publié peut également avertir pour les fichiers d'horodatage des métadonnées de build locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire les contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Ensuite, inspectez l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, les journaux de voie, les minutages de phase et les commandes de réexécution. Privilégiez la réexécution du profil de package ayant échoué ou des voies Docker exactes au lieu de réexécuter la validation complète de la version.

## Test de fumée d'installation

Le workflow séparé `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture des tests de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions **Fast path** concernent les pull requests touchant les surfaces de Docker/package, les modifications de package/manifeste de plugin groupé, ou les surfaces principales de plugin/channel/gateway/Plugin SDK que les travaux de test de Docker exercent. Les modifications de plugins groupés uniquement source, les modifications uniquement de test et les modifications uniquement de documentation ne réservent pas de workers Docker. Le chemin rapide construit l'image du Dockerfile racine une fois, vérifie la CLI, exécute les agents delete shared-workspace CLI smoke, exécute le conteneur gateway-network e2e, vérifie un argument de build d'extension groupée, et exécute le profil bundled-plugin Docker borné sous un délai d'expiration de commande global de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **Full path** conserve la couverture d'installation du package QR et de Docker/update pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de version par appel de workflow, et les pull requests qui touchent réellement les surfaces du programme d'installation/package/DockerDocker. En mode complet, install-smoke prépare ou réutilise une image de test smoke GHCR du Dockerfile racine target-SHA, puis exécute l'installation du package QR, les tests smoke du Dockerfile racine/gateway, les tests smoke du programme d'installation/de mise à jour, et le E2E Docker bundled-plugin rapide en tant que travaux distincts, afin que le travail du programme d'installation n'attende pas derrière les tests smoke de l'image racine.

Les pushes `main` (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique d'étendue modifiée demanderait une couverture complète lors d'un push, le workflow conserve le test smoke Docker rapide et laisse le test smoke d'installation complet aux exécutions nocturnes ou à la validation de version.

Le test smoke lent du fournisseur d'image d'installation globale Bun est séparément conditionné par `run_bun_global_install_smoke`. Il s'exécute sur la planification nocturne et à partir du workflow de vérifications de version, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais les pull requests et les pushes `main` ne le font pas. Les tests Docker QR et du programme d'installation conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm préconstruit une image de test en direct partagée, empaquète OpenClaw une fois sous forme de tarball npm, et construit deux images `scripts/e2e/Dockerfile` partagées :

- un exécuteur Node/Git nu pour les voies d'installation/de mise à jour/de dépendance de plugin ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normales.

Les définitions de voies Docker se trouvent dans Docker`scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur dans `scripts/lib/docker-e2e-plan.mjs`, et l'exécuteur exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                                                    |
| -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                                         |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de fin sensible au fournisseur.                                                                                            |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite simultanée de voies en direct pour éviter que les fournisseurs ne limitent la vitesse.                                                            |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite simultanée de voies d'installation npm.                                                                                                           |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite simultanée de voies multi-services.                                                                                                               |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les démarrages de voies pour éviter les tempêtes de création du démon Docker ; définissez Docker`0` pour aucun délai.                        |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies en direct/de fin sélectionnées utilisent des limites plus strictes.                                    |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` imprime le plan du planificateur sans exécuter les voies.                                                                                            |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage de pré-vérification afin que les agents puissent reproduire une voie ayant échoué. |

Une voie plus lourde que sa limite effective peut toujours démarrer à partir d'un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégateur local effectue une vérification préalable de Docker, supprime les conteneurs E2E OpenClaw obsolètes, émet le statut des voies actives, persiste les minutages des voies pour le classement du plus long en premier, et arrête par défaut la planification de nouvelles voies regroupées après le premier échec.

### Workflow live/E2E réutilisable

Le workflow live/E2E réutilisable demande à `scripts/test-docker-all.mjs --plan-json` quel package, type d'image, image live, lane et couverture d'identifiants sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquette soit OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id`Docker ; valide l'inventaire de l'archive tar ; construit et pousse des images E2E Docker nues/fonctionnelles étiquetées avec le digest du package sur le GHCR via le cache de couche Docker de Blacksmith lorsque le plan nécessite des lanes avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes du digest du package au lieu de les reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente borné de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Morceaux du chemin de release

La couverture Docker de release exécute des tâches plus petites et découpées avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, afin que chaque morceau ne tire que le type d'image dont il a besoin et exécute plusieurs lanes via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les morceaux Docker de la version actuelle sont Docker`core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` jusqu'à `plugins-runtime-install-h`. `package-update-openai`OpenClaw inclut la voie de package du plugin Codex en direct, qui installe le package candidat OpenClaw, installe le plugin Codex à partir de `codex_plugin_spec`CLICLIOpenClawOpenAI ou d'une archive tar de même référence avec une approbation d'installation explicite de la CLI Codex, exécute les pré-vols de la CLI Codex, puis exécute plusieurs tours d'agent OpenClaw de même session contre OpenAI. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies de programme d'installation du fournisseur.

OpenWebUI est intégré à `plugins-runtime-services` lorsque la couverture complète du chemin de version le demande, et conserve un morceau autonome `openwebui`npm uniquement pour les répartitions exclusives à OpenWebUI. Les voies de mise à jour de canal groupé réessaient une fois en cas de pannes réseau transitoires de npm.

Chaque chunk téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le JSON du planificateur, les tables de voies lentes et les commandes de réexécution par voie. L'entrée `docker_lanes` du workflow exécute les voies sélectionnées sur les images préparées au lieu des tâches de chunk, ce qui permet de limiter le débogage des voies échouées à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie Docker active, la tâche ciblée construit l'image de test active localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name` et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le paquet et les images exacts de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow programmé en direct/E2E exécute quotidiennement la suite complète de Docker du chemin de release.

## Préversion de plugin

`Plugin Prerelease` est une couverture produit/paquet plus coûteuse, c'est donc un workflow distinct distribué par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage (pull requests) normales, les poussées (pushes) `main` et les distributions manuelles autonomes de CI gardent cette suite désactivée. Il équilibre les tests de plugins regroupés sur huit workers d'extension ; ces tâches de fragment d'extension exécutent jusqu'à deux groupes de configuration de plugins à la fois avec un worker Vitest par groupe et un tas Node plus grand pour que les lots de plugins lourds en importation ne créent pas de tâches CI supplémentaires. Le chemin de préversion Docker réservé aux releases regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow téléverse également un artefact d'information `plugin-inspector-advisory` à partir de `@openclaw/plugin-inspector` ; les constatations de l'inspecteur sont des entrées de triage et ne modifient pas la porte de blocage de la préversion de plugin.

## Laboratoire de QA

QA Lab dispose de voies CI dédiées en dehors du workflow principal à portée intelligente. La parité agentic est imbriquée sous les harnais QA et release larges, et non un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute toutes les nuits sur `main`MatrixTelegramDiscord et lors d'un déclenchement manuel ; il déploie la voie de parité simulée, la voie Matrix en direct, et les voies Telegram et Discord en direct en tant que travaux parallèles. Les travaux en direct utilisent l'environnement `qa-live-shared`TelegramDiscord, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport en direct Matrix et Telegram avec le provider simulé déterministe et des modèles qualifiés simulés (MatrixTelegram`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`Docker) afin que le contrat du channel soit isolé de la latence du modèle en direct et du démarrage normal du plugin provider. La passerelle de transport en direct désactive la recherche mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du provider est couverte par les suites distinctes du modèle en direct, du provider natif et du provider Docker.

Matrix utilise Matrix`--profile fast` pour les planifications et les portes de release, en ajoutant `--fail-fast`CLICLI uniquement lorsque la CLI extraite le prend en charge. La valeur par défaut de la CLI et l'entrée du workflow manuel restent `all` ; le déclenchement manuel `matrix_profile=all`Matrix partitionne toujours la couverture Matrix complète en travaux `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies QA Lab critiques pour la release avant l'approbation de la release ; sa porte de parité QA exécute les packs candidat et de base en tant que travaux de voie parallèles, puis télécharge les deux artefacts dans un petit travail de rapport pour la comparaison de parité finale.

Pour les PR normales, suivez les preuves CI/check délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non une analyse complète du référentiel. Les exécutions quotidiennes, manuelles et de garde de pull request non brouillon analysent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité haute confiance filtrées sur des niveaux `security-severity` élevés/critiques.

La garde de pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. Android et macOS CodeQL restent exclus des valeurs par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron et passerelle de base                                                                                                                              |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit                      |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF de base, analyse d'IP, garde réseau, récupération web et SSRF du Plugin SDK                                                                          |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution d'tool d'agent                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de packages, chargement source et surfaces de confiance du contrat de package du Plugin SDK |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — shard de sécurité Android planifié. Construit manuellement l'application Android pour CodeQL sur le plus petit runner Blacksmith Linux accepté par la sanity du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security`macOSmacOSmacOS — fragment de sécurité macOS hebdomadaire/manuel. Construit manuellement l'application macOS pour CodeQL sur Blacksmith macOS, filtre les résultats de build des dépendances du SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`macOS. Gardé en dehors des valeurs par défaut quotidiennes car le build macOS domine le temps d'exécution même lorsqu'il est propre.

### Catégories de qualité critique

`CodeQL Critical Quality`Linux est le fragment de sécurité non correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript non sécurisées de gravité erreur sur des surfaces à haute valeur étroites sur le runner Linux Blacksmith plus petit. Son garde de demande d'extraction est intentionnellement plus petit que le profil planifié : les PR non brouillonnes n'exécutent que les fragments correspondants `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` pour le code d'exécution et de répartition de réponse de commande/model/tool d'agent, le code de schéma/migration/IO de configuration, le code d'auth/secrets/sandbox/sécurité, le runtime du plugin channel principal et groupé, le protocole/méthode-serveur de gateway, la colle runtime/SDK de mémoire, la livraison MCP/processus/sortant, le catalogue de model/runtime de provider, les files de livraison/diagnostiques de session, le chargeur de plugin, le contrat de package/Plugin SDK, ou les modifications du runtime de réponse du Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze fragments de qualité PR.

La distribution manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des crochets d'enseignement/itération pour exécuter un fragment de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code d'authentification, de secrets, de sandbox, de cron et de limite de sécurité de la passerelle                                                                                                                                                        |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats IO                                                                                                                                                                                          |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode serveur                                                                                                                                                                                               |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation des plugins de canal principal et de canal groupé                                                                                                                                                                               |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commandes, dispatch modèle/fournisseur, dispatch et files d'attente de réponse automatique, et contrats d'exécution du plan de contrôle ACP                                                                                                  |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision de processus, et contrats de livraison sortante                                                                                                                                                 |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK hôte de mémoire, façades d'exécution de mémoire, alias du SDK Plugin de mémoire, collage d'activation d'exécution de mémoire, et commandes doctor de mémoire                                                                                          |
| `/codeql-critical-quality/session-diagnostics-boundary` | Fonctionnement interne de la file d'attente de réponses, files d'attente de livraison de session, assistants de liaison/livraison de session sortante, surfaces de regroupement d'événements/journaux de diagnostic, et contrats CLI de doctor de session |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Dispatch de réponse entrante du SDK Plugin, assistants de payload/découpage/exécution de réponse, options de réponse de canal, files d'attente de livraison, et assistants de liaison session/fil                                                         |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte des fournisseurs, inscription d'exécution des fournisseurs, catalogues/par défaut des fournisseurs, et registres web/recherche/récupération/incorporation                           |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface utilisateur de contrôle, persistance locale, flux de contrôle de passerelle, et contrats d'exécution du plan de contrôle des tâches                                                                                               |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web principale, E/S média, compréhension média, génération d'images, et contrats d'exécution de génération média                                                                                                                   |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique, et contrats de point d'entrée du SDK Plugin                                                                                                                                                                         |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source du SDK Plugin côté package publié et assistants de contrat de package de plugin                                                                                                                                                                    |

La qualité reste séparée de la sécurité afin que les résultats de qualité puissent être planifiés, mesurés, désactivés ou étendus sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plugins groupés ne doit être réintégrée que sous forme de travail de suivi délimité ou fragmenté une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour maintenir les documents existants alignés sur les modifications récemment intégrées. Il n'a pas d'horaire purement planifié : une exécution CI réussie de type push (non-bot) sur `main` peut le déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution de Docs Agent non ignorée a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits depuis le SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, de sorte qu'une exécution horaire peut couvrir toutes les modifications principales accumulées depuis la dernière passe de documentation.

### Agent de performance des tests

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas d'horaire purement planifié : une exécution CI réussie de type push (non-bot) sur `main` peut le déclencher, mais il est ignoré si une autre invocation d'exécution de workflow a déjà été exécutée ou est en cours ce jour-là (UTC). La répartition manuelle contourne cette porte d'activité quotidienne. La voie génère un rapport de performance Vitest groupé pour la suite complète, permet à Codex de n'apporter que de petites corrections de performance de test préservant la couverture au lieu de refactorisations importantes, puis relance le rapport complet et rejette les modifications qui réduisent le nombre de tests de référence réussis. Si la référence contient des échecs de tests, Codex peut ne corriger que les échecs évidents et le rapport complet post-agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot n'aboutisse, la voie rebasera le correctif validé, relancera `pnpm check:changed` et réessaiera le push ; les correctifs obsolètes en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité sans sudo que l'agent de documentation.

### PR en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow de mainteneur manuel pour le nettoyage des doublons après intégration. Il est par défaut en mode dry-run (simulation) et ne ferme que les PR listées explicitement lorsque `apply=true`. Avant de modifier GitHub, il vérifie que la PR intégrée a été fusionnée et que chaque doublon a soit un problème référencé commun, soit des morceaux de code modifiés qui se chevauchent.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Gates de vérification locale et routage modifié

La logique locale de modified-lane réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Ce portail de vérification local est plus strict concernant les limites de l'architecture que la portée large de la plateforme CI :

- les modifications de production de base exécutent la base prod et le typecheck de test de base plus la base lint/guards ;
- les modifications de test uniquement de base n'exécutent que le typecheck de test de base plus la base lint ;
- les modifications de production d'extension exécutent l'extension prod et le typecheck de test d'extension plus l'extension lint ;
- les modifications de test uniquement d'extension exécutent le typecheck de test d'extension plus l'extension lint ;
- les modifications publiques du Plugin SDK ou du contrat de plugin s'étendent au typecheck d'extension car les extensions dépendent de ces contrats de base (les balayages d'extension Vitest restent un travail de test explicite) ;
- les bumps de version des métadonnées de release uniquement exécutent des vérifications ciblées de version/config/root-dependency ;
- les modifications inconnues de root/config échouent en toute sécurité vers toutes les voies de vérification.

Le routage local des modified-tests réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes de tests s'exécutent elles-mêmes, les modifications de source préfèrent des mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison partagée de groupe-salle est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de réponse source, ou du système de prompt de l'outil de message routent à travers les tests de réponse de base plus les régressions de livraison Discord et Slack afin qu'une modification par défaut partagée échoue avant le premier push de PR. Utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque la modification est suffisamment large pour que l'ensemble mappé bon marché ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est le wrapper de remote-box appartenant au dépôt pour la preuve Linux du mainteneur. Utilisez-le
à partir de la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI
compte, ou lorsque la preuve a besoin de secrets, Docker, les voies de packages,
les boîtes réutilisables, ou les journaux distants. Le backend normal OpenClaw est
`blacksmith-testbox` ; la capacité AWS/Hetzner possédée est un secours pour les pannes
Blacksmith, les problèmes de quota, ou les tests explicites de capacité possédée.

Les exécutions Blacksmith soutenues par Crabbox effectuent un échauffement, une réclamation, une synchronisation, une exécution, un rapport et un nettoyage de Testboxes ponctuels. Le contrôle de sanity de synchronisation intégré échoue rapidement lorsque les fichiers racine requis tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short` affiche au moins 200 suppressions suivies. Pour les PR intentionnelles avec de nombreuses suppressions, définissez `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale de la CLI Blacksmith qui reste dans la phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez `CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée pour les diffs locaux inhabituellement volumineux.

Avant une première exécution, vérifiez le wrapper depuis la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Le wrapper du dépôt refuse un binaire Crabbox obsolète qui n'annonce pas `blacksmith-testbox`. Passez le provider explicitement même si `.crabbox.yaml` a des valeurs par défaut pour le cloud possédé. Dans les arbres de travail Codex ou les checkouts liés/partiels, évitez le script local `pnpm crabbox:run` car pnpm peut réconcilier les dépendances avant le démarrage de Crabbox ; invoquez plutôt directement le wrapper node :

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions ponctuelles Crabbox soutenues par Blacksmith devraient arrêter automatiquement la Testbox ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boxes en direct et n'arrêtez que les boxes que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez Blacksmith direct uniquement pour les diagnostics tels que `list`, `status` et le nettoyage. Corrigez le chemin Crabbox avant de traiter une exécution directe de Blacksmith comme une preuve de mainteneur.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux warmups restent `queued` sans IP ni URL d'exécution Actions après quelques minutes, considérez cela comme une pression du fournisseur, de la file d'attente, de la facturation ou des limites d'organisation de Blacksmith. Arrêtez les identifiants en file d'attente que vous avez créés, évitez de démarrer d'autres Testboxes, et déplacez la preuve vers le chemin de capacité Crabbox possédé ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Escaladez vers la capacité Crabbox possédée uniquement lorsque Blacksmith est en panne, limité par quota, manque de l'environnement nécessaire, ou lorsque la capacité possédée est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

En cas de pression AWS, évitez `class=beast` sauf si la tâche nécessite vraiment un CPU de classe 48xlarge. Une demande `beast` commence à 192 vCPUs et est le moyen le plus simple de déclencher le quota Spot EC2 régional ou Standard à la demande. Le `.crabbox.yaml` appartenant au dépôt a par défaut `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS court-circuités affichent la région/marché sélectionnée, la pression de quota, le repli Spot et les avertissements de classe à haute pression. Utilisez `fast` pour des vérifications larges plus lourdes, `large` uniquement après que standard/fast ne suffisent plus, et `beast` uniquement pour les voies exceptionnellement liées au CPU telles que les matrices Docker de suite complète ou tous les plugins, la validation explicite de version/bloquante, ou le profilage de performance à fort nombre de cœurs. N'utilisez pas `beast` pour `pnpm check:changed`, des tests ciblés, du travail uniquement sur la documentation, du lint/typecheck ordinaire, de petites reproductions E2E, ou le triage de panne Blacksmith. Utilisez `--market on-demand` pour le diagnostic de capacité afin que le churn du marché Spot ne soit pas mélangé au signal.

`.crabbox.yaml` est propriétaire des valeurs par défaut du fournisseur, de la synchronisation et de l'hydratation des GitHub Actions pour les voies owned-cloud. Il exclut le `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les dépôts distants et les magasins d'objets locaux du mainteneur, et il exclut les artefacts d'exécution/de build locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` est propriétaire du checkout, de la configuration Node/pnpm, de la récupération `origin/main`, et du transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

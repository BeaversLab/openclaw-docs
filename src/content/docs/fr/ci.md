---
summary: "Graphe de tâches CI, portées de validation, parapluies de publication et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI OpenClaw s'exécute à chaque poussée vers OpenClaw`main` et à chaque demande de tirage (pull request). La tâche `preflight` classe les différences et désactive les voies coûteuses lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la publication et les validations larges. Les voies Android restent en option via `include_android`. La couverture des plugins de publication uniquement réside dans le workflow séparé [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

## Aperçu du pipeline

| Tâche                            | Objectif                                                                                                                                 | Quand elle s'exécute                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                      | Détecter les modifications uniquement de documentation, les portées modifiées, les extensions modifiées et construire le manifeste CI    | Toujours sur les poussées et les PR non brouillons    |
| `security-scm-fast`              | Détection de clé privée et audit de workflow via `zizmor`                                                                                | Toujours sur les poussées et les PR non brouillons    |
| `security-dependency-audit`      | Audit de fichier de verrouillage de production sans dépendance par rapport aux avis npm                                                  | Toujours sur les poussées et les PR non brouillons    |
| `security-fast`                  | Toujours sur les poussées et les PR non brouillons                                                                                       | `security-fast`                                       |
| `check-dependencies`             | Passage de production sans dépendance Knip plus la garde de liste d'autorisation de fichiers inutilisés                                  | Modifications pertinentes pour Node                   |
| `build-artifacts`                | Construire `dist/`, l'interface utilisateur de contrôle, les vérifications d'artefacts construits et les artefacts réutilisables en aval | Modifications pertinentes pour Node                   |
| `checks-fast-core`               | Voies de correction Linux rapides telles que les vérifications groupées/contrat de plugin/protocole                                      | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels` | Vérifications de contrat de canal partitionnées avec un résultat de vérification agrégé stable                                           | Modifications pertinentes pour Node                   |
| `checks-node-core-test`          | Shards de tests Core Node, à l'exclusion des lanes channel, bundled, contract et extension                                               | Modifications pertinentes pour Node                   |
| `check`                          | Équivalent de la passerelle locale principale partitionnée : types de production, lint, gardes, types de tests et tests de fumée stricts | Modifications pertinentes pour Node                   |
| `check-additional`               | Architecture, dérive des limites/prompts partitionnés, gardes d'extension, limites des packages et surveillance de la passerelle         | Modifications pertinentes pour Node                   |
| `build-smoke`                    | Tests de fumée de la CLI générée et tests de fumée de la mémoire au démarrage                                                            | Modifications pertinentes pour Node                   |
| `checks`                         | Vérificateur pour les tests de canal des artefacts générés                                                                               | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`      | Lane de compatibilité et de génération Node 22                                                                                           | Répartition CI manuelle pour les releases             |
| `check-docs`                     | Vérifications de formatage, de lint et de liens brisés pour la documentation                                                             | Documentation modifiée                                |
| `skills-python`                  | Ruff + pytest pour les compétences basées sur Python                                                                                     | Modifications pertinentes pour les compétences Python |
| `checks-windows`                 | Tests de processus/chemin spécifiques à Windows plus régressions de spécificateurs d'importation d'exécution partagés                    | Modifications pertinentes pour Windows                |
| `macos-node`                     | Lane de test TypeScript pour macOS utilisant les artefacts construits partagés                                                           | Modifications pertinentes pour macOS                  |
| `macos-swift`                    | Lint, génération et tests Swift pour l'application macOS                                                                                 | Modifications pertinentes pour macOS                  |
| `android`                        | Tests unitaires Android pour les deux variantes plus une génération d'APK de débogage                                                    | Modifications pertinentes pour Android                |
| `test-performance-agent`         | Optimisation quotidienne des tests lents Codex après une activité de confiance                                                           | Succès du CI principal ou répartition manuelle        |
| `openclaw-performance`           | Rapports de performance d'exécution Kova quotidiens/à la demande avec les lanes mock-provider, deep-profile et GPT 5.4 live              | Répartition planifiée et manuelle                     |

## Ordre d'échec rapide

1. `preflight` détermine quelles lanes existent. Les logiques `docs-scope` et `changed-scope` sont des étapes à l'intérieur de ce travail, pas des travaux autonomes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrice de plateforme.
3. `build-artifacts` chevauche les voies rapides Linux afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les voies plus lourdes de plateforme et d'exécution s'étendent ensuite : `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les tâches supplantées comme `cancelled` lorsqu'un nouveau push arrive sur la même PR ou la référence `main`. Considérez cela comme du bruit CI à moins que la plus récente exécution pour la même référence échoue également. Les vérifications agrégées de shards utilisent `!cancelled() && always()` afin qu'elles signalent toujours les échecs de shard normaux mais ne s'exécutent pas après que le workflow entier a déjà été supplanté. La clé de concurrence CI automatique est versionnée (`CI-v7-*`) pour qu'un zombie côté GitHub dans un ancien groupe de file ne puisse pas bloquer indéfiniment les nouvelles exécutions main. Les exécutions manuelles de la suite complète utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

La tâche `ci-timings-summary` télécharge un artefact `ci-timings-summary` compact pour chaque exécution CI non-brouillon. Elle enregistre le temps écoulé, le temps de file d'attente, les tâches les plus lentes et les tâches échouées pour l'exécution actuelle, afin que les vérifications de santé CI n'aient pas besoin de récupérer répétitivement la charge utile complète d'Actions.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de la portée modifiée et fait agir le manifeste prévol comme si chaque zone à portée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas les builds natifs Windows, Android ou macOS par eux-mêmes ; ces voies de plateformes restent limitées aux modifications des sources de la plateforme.
- **Les modifications uniquement de routage CI, les modifications sélectionnées de fixtures de tests core peu coûteuses, et les modifications étroites d'aide de contrat de plugin/routage de tests** utilisent un chemin de manifeste rapide Node uniquement : `preflight`, sécurité, et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards core complets, les shards de plugins groupés, et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de paquets, et aux surfaces de workflow CI qui exécutent cette voie ; les modifications non liées de la source, du plugin, de l'install-smoke et des tests uniquement restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont divisées ou équilibrées afin que chaque travail reste petit sans sur-réserver les exécuteurs : les contrats de canal s'exécutent sous forme de trois shards pondérés avec Blacksmith et le repli standard sur l'exécuteur GitHub, les voies rapides/support d'unités principales s'exécutent séparément, l'infrastructure d'exécution principale est répartie entre les shards d'état, de processus/config, de cron et partagés, la réponse automatique s'exécute en tant que workers équilibrés (avec le sous-arbre de réponse divisé en shards agent-runner, dispatch, et commandes/state-routing), et les configurations de passerelle/serveur agentiques sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests étendus de navigateur, d'assurance qualité, multimédias et de plugins divers utilisent leurs propres configurations Vitest dédiées au lieu de la configuration de rattrapage de plugin partagée. Les shards de modèles d'inclusion enregistrent des entrées de chronométrage en utilisant le nom du shard CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration entière d'un shard filtré. `check-additional` maintient ensemble le travail de compilation/canary lié aux packages et sépare l'architecture de topologie d'exécution de la couverture de surveillance de Gateway ; la liste des gardes de frontière est répartie sur quatre shards de matrice, chacun exécutant des gardes indépendants sélectionnés simultanément et imprimant les chronométrages par vérification. La vérification coûteuse de la dérive des instantanés de prompts du chemin heureux Codex s'exécute en tant que travail supplémentaire distinct pour le CI manuel et uniquement pour les modifications affectant les prompts, afin que les modifications Node normales non liées n'attendent pas derrière la génération à froid d'instantanés de prompts et que les shards de frontière restent équilibrés pendant que la dérive de prompts est toujours épinglée à la PR qui l'a causée ; le même indicateur saute la génération Vitest d'instantanés de prompts à l'intérieur du shard de frontière de support principal des artefacts construits. La surveillance de Gateway, les tests de canal et le shard de frontière de support principal s'exécutent simultanément dans `build-artifacts` une fois que `dist/` et `dist-runtime/` sont déjà construits.

Android CI exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`Android puis compile le APK de débogage Play. La variante third-party n'a pas de jeu de sources ni de manifeste distincts ; sa voie de tests unitaires compile toujours la variante avec les indicateurs BuildConfig de SMS/journal d'appels, tout en évitant une tâche de empaquetage APK de débogage en double à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendance-seulement épinglée à la dernière version de Knip, avec l'âge de publication minimum de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip avec `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non examiné ou laisse une entrée de liste d'autorisation obsolète, tout en préservant les surfaces intentionnelles de plugin dynamique, générées, de build, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'effectue pas de checkout ou d'exécution de code de pull request non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les pushes `main` ;
- `github_activity`GitHub pour l'activité GitHub générale que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transmet uniquement les métadonnées normalisées : le type d'événement, l'action, l'acteur, le référentiel, le numéro de l'élément, l'URL, le titre, l'état et de courts extraits pour les commentaires ou les avis lorsqu'ils sont présents. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, pas une diffusion par défaut. L'agent ClawSweeper reçoit la cible Discord dans son prompt et ne doit publier sur `#clawsweeper` que lorsque l'événement est surprenant, exploitable, risqué ou utile opérationnellement. Les ouvertures, les modifications, le trafic de bots, le bruit des webhooks en double et le trafic normal d'avis doivent aboutir à `NO_REPLY`.

Traitez les titres, les commentaires, les corps, le texte des avis, les noms de branches et les messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ce sont des entrées pour le résumé et l'orientation, et non des instructions pour le workflow ou le runtime de l'agent.

## Déclenchements manuels

Les déclenchements manuels de CI exécutent le même graphe de travaux que la CI normale, mais activent chaque voie délimitée non Android : les fragments Node Linux, les fragments bundled-plugin, les contrats de , la compatibilité Node 22, `check`, `check-additional`, les tests de fumée de build, les vérifications de docs, les compétences Python, Windows, macOS et l'i18n de l'interface de contrôle. Les déclenchements manuels autonomes de CI exécutent Android uniquement avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de pré-publication des plugins, le fragment `agentic-plugins` uniquement pour la publication, le balayage complet du lot d'extensions et les voies Docker de pré-publication des plugins sont exclus de la CI. La suite de pré-publication Docker ne s'exécute que lorsque `Full Release Validation` déclenche le workflow séparé `Plugin Prerelease` avec la porte de validation de publication activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une autre exécution de PR sur la même référence. L'entrée facultative `target_ref` permet à un appelant de confiance d'exécuter ce graphe sur une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow de la référence de répartition sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Exécuteurs

| Exécuteur                        | Tâches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, tâches de sécurité rapides et agrégats (`security-scm-fast`, `security-dependency-audit`, `security-fast`), vérifications rapides de protocole/contrat/bundle, vérifications de contrat de canal partitionnées, partitions `check` à l'exception de lint, agrégats `check-additional`, vérificateurs d'agrégats de tests Node, vérifications de docs, compétences Python, workflow-sanity, labeler, réponse automatique ; le pré-vol install-smoke utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse se mettre en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, partitions d'extension de poids inférieur, `checks-fast-core`, `checks-node-compat-node22`, `check-prod-types` et `check-test-types`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-8vcpu-ubuntu-2404`   | `build-artifacts`, build-smoke, partitions de tests Node Linux, partitions de tests de plugins groupés, partitions `check-additional`, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `blacksmith-16vcpu-ubuntu-2404`  | `check-lint` (assez sensible au CPU pour que 8 vCPU coûtent plus cher que ce qu'ils ont permis d'économiser) ; les builds Docker install-smoke (le temps d'attente dans la file de 32 vCPU coûtait plus cher que ce qu'il a permis d'économiser)                                                                                                                                                                                                                                                                                                                                       |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les fourches reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les fourches reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Le CI du dépôt canonique conserve Blacksmith comme chemin d'exécuteur par défaut. Pendant `preflight`, `scripts/ci-runner-labels.mjs` vérifie les exécutions d'Actions récentes mises en file d'attente et en cours pour les tâches Blacksmith mises en file d'attente. Si une étiquette Blacksmith spécifique a déjà des tâches en file d'attente, les tâches en aval qui utiliseraient cette étiquette exacte reviennent à l'exécuteur hébergé par GitHub correspondant (`ubuntu-24.04`, `windows-2025`, ou `macos-latest`) pour cette exécution uniquement. Les autres tailles Blacksmith de la même famille de système d'exploitation restent sur leurs étiquettes principales. Si la sonde API échoue, aucun repli n'est appliqué.

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
pnpm build                                    # build dist when CI artifact/build-smoke lanes matter
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
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le lancement manuel compare généralement les performances de la référence du workflow. Définissez `target_ref` pour comparer une étiquette de version ou une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version épinglée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois voies :

- `mock-provider` : scénarios de diagnostic Kova sur un runtime construit localement avec une authentification fausse déterministe compatible OpenAI.
- `mock-deep-profile` : profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds de tour d'agent.
- `live-gpt54` : un vrai tour d'agent `openai/gpt-5.4` OpenAI, ignoré lorsque `OPENAI_API_KEY` est indisponible.

La voie mock-provider exécute également des sondes de source natives OpenClaw après la passe Kova : le temps de démarrage et la mémoire de la passerelle pour les cas de démarrage par défaut, hook et 50 plugins ; des boucles de salutation hello mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI répétées ; et les commandes de démarrage CLI contre la passerine démarrée. Le résumé Markdown de la sonde de source se trouve à `source/index.md` dans le bundle de rapport, avec le JSON brut à côté.

Chaque voie téléverse des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md`, et les artefacts de sonde de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow parapluie manuel pour « tout exécuter avant la version ». Il accepte une branche, une étiquette ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease`Docker pour la preuve de plugin/paquet/statique/Docker uniquement pour la version, et envoie `OpenClaw Release Checks`MatrixTelegramDocker pour le test de fumée d'installation, l'acceptation des paquets, les vérifications de paquets multi-OS, la parité du Lab QA, les voies Matrix et Telegram. Les exécutions stables par défaut gardent une couverture exhaustive de chemin de version en direct/E2E et Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture de trempage afin que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` contre l'artefact `release-package-under-test` des vérifications de version. Après publication, passez `npm_telegram_package_spec`Telegramnpm pour réexécuter la même voie de paquet Telegram contre le paquet npm publié.

Consultez [Validation complète de la release](/fr/reference/full-release-validation) pour la
matrice des étapes, les noms exacts des jobs de workflow, les différences de profil, les artefacts et
les gestionnaires de relancement ciblés.

`OpenClaw Release Publish` est le workflow de release mutante manuel. Déclenchez-le
à partir de `release/YYYY.M.D` ou `main`OpenClawnpm après que le tag de release existe et après que
la pré-vérification npm d'OpenClaw a réussi. Il vérifie `pnpm plugins:sync:check`,
déclenche `Plugin NPM Release` pour tous les packages de plugins publiables, déclenche
`Plugin ClawHub Release` pour le même SHA de release, et seulement ensuite déclenche
`OpenClaw NPM Release` avec le `preflight_run_id` enregistré.

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

Les refs de dispatch de workflow GitHub doivent être des branches ou des tags, pas des SHA de commit bruts. L'assistant
pousse une branche temporaire GitHub`release-ci/<sha>-...` sur le SHA cible,
déclenche `Full Release Validation` à partir de cette réf épinglée, vérifie que chaque `headSha`
de workflow enfant correspond à la cible, et supprime la branche temporaire lorsque l'exécution
est terminée. Le vérificateur parapluie échoue également si un workflow enfant s'est exécuté sur un
SHA différent.

`release_profile` contrôle l'étendue live/fournisseur passée aux vérifications de release. Les
workflows de release manuels sont par défaut sur `stable` ; utilisez `full` uniquement lorsque vous
voulez intentionnellement la large matrice fournisseur/média consultative. `run_release_soak`Docker
contrôle si les vérifications de release stables par défaut exécutent le test de pénétration (soak) live/E2E exhaustif et
le chemin de release Docker ; `full` force l'activation du soak.

- `minimum`OpenAI conserve les voies les plus rapides critiques pour la release OpenAI/cœur.
- `stable` ajoute l'ensemble stable de fournisseurs/backends.
- `full` exécute la large matrice fournisseur/média consultative.

Le parapluie enregistre les identifiants des exécutions enfants réparties, et la tâche finale `Verify full validation` revérifie les conclusions actuelles des exécutions enfants et ajoute des tableaux des tâches les plus lentes pour chaque exécution enfant. Si un workflow enfant est réexécuté et devient vert, réexécutez uniquement la tâche de vérification parente pour actualiser le résultat du parapluie et le résumé des durées.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de pré-version du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de maintenir la réexécution d'une version échouée délimitée après une correction ciblée. Pour une voie trans-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes trans-OS longues émettent des lignes de pulsation et les résumés de mise à niveau de paquets incluent des durées par phase. Les voies de vérification de version QA sont consultatives, les échecs uniquement QA génèrent donc des avertissements mais ne bloquent pas le vérificateur de vérification de version.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois en une archive tar `release-package-under-test`Docker, puis transmet cet artefact aux vérifications trans-OS et à l'acceptation des paquets, ainsi qu'au workflow Docker de chemin de version live/E2E lorsque la couverture de trempage s'exécute. Cela maintient les octets du paquet cohérents entre les boîtes de version et évite de réemballer le même candidat dans plusieurs tâches enfants.

Les exécutions en double de `Full Release Validation` pour `ref=main` et `rerun_group=all`
supplantent l'ancien groupe global. Le moniteur parent annule tout workflow enfant
qu'il a déjà distribué lorsque le parent est annulé, afin que la validation principale
plus récente ne reste pas bloquée derrière une exécution de vérification de
périphérie obsolète de deux heures. La validation des branches/tags de
périphérie et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant Live/E2E de la périphérie conserve une couverture native `pnpm test:live` étendue,
mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un
travail sériel unique :

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
- séparer les shards audio/vidéo multimédias et les shards musicaux filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en rendant les
échecs lents des providers live plus faciles à réexécuter et à diagnostiquer.
Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et
`native-live-extensions-media-music` restent valides pour les réexécutions manuelles
uniques.

Les shards média live natifs s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par
le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg`
et `ffprobe` ; les tâches média ne vérifient que les binaires
avant la configuration. Conservez les suites live basées sur Docker
sur les runners Blacksmith normaux — les tâches conteneur ne sont pas
l'endroit approprié pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image partagée Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI distincte par commit sélectionné. Le workflow de version en direct construit et pousse cette image une seule fois, puis les shards du modèle en direct Docker, de la passerelle fragmentée par fournisseur, du backend CLI, de la liaison ACP et du harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`GatewayDocker. Les shards Docker de la passerine contiennent des limites explicites au niveau du script `timeout`Docker inférieures au délai d'expiration du job de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'intégralité du budget de vérification de version. Si ces shards reconstruisent indépendamment la cible Docker source complète, l'exécution de la version est mal configurée et gaspillera du temps d'horloge sur des constructions d'images en double.

## Acceptation des paquets

Utilisez `Package Acceptance`OpenClawDocker lorsque la question est « ce paquet OpenClaw installable fonctionne-t-il comme un produit ? ». C'est différent de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation des paquets valide un seul fichier tar via le même harnais E2E Docker que les utilisateurs exercent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de paquet, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test`GitHub et imprime la source, la référence du workflow, la référence du paquet, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`DockerDocker. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive, prépare les images Docker package-digest si nécessaire, et exécute les voies Docker sélectionnées par rapport à ce package au lieu d'empaqueter l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes`Docker ciblées, le workflow réutilisable prépare le package et les images partagées une seule fois, puis répartit ces voies en travaux Docker ciblés parallèles avec des artefacts uniques.
3. `package_telegram` appelle optionnellement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test`Telegramnpm lorsque l'acceptation de package en a résolu un ; une répartition Telegram autonome peut toujours installer une spécification npm publiée.
4. `summary`DockerTelegram fait échouer le workflow si la résolution du package, l'acceptation Docker ou la voie Telegram optionnelle a échoué.

### Sources candidates

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest`, ou une version de release exacte d'OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des versions préliminaires/stables publiées.
- `source=ref` empaquète une branche `package_ref` de confiance, une étiquette ou un SHA de commit complet. Le résolveur récupère les branches/étiquettes d'OpenClaw, vérifie que le commit sélectionné est accessible à partir de l'historique des branches du dépôt ou d'une étiquette de release, installe les dépendances dans un arbre de travail détaché, et l'empaquète avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS ; `package_sha256` est requis.
- `source=artifact` télécharge un `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lorsque `source=ref`. Cela permet au harnais de test actuel de valider des commits sources de confiance plus anciens sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — morceaux complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis lors de `suite_profile=custom`

Le profil `package` utilise une couverture de plugin hors ligne, de sorte que la validation des paquets publiés n'est pas bloquée par la disponibilité de ClawHub en direct. La voie facultative Telegram réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spec npm publié conservé pour les déclenchements autonomes.

Pour la politique dédiée de test des mises à jour et des plugins, y compris les commandes locales,
les lanes Docker, les entrées d'acceptation des packages, les valeurs par défaut de publication et le tri des échecs,
voir [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de publication appellent Package Acceptance avec `source=artifact`, l'artefact du package de publication préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`. Cela permet de maintenir la migration de package, la mise à jour, l'installation de la compétence live ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation de l'installation de plugins configurés, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive de package résolue. Définissez `package_acceptance_package_spec`OpenClaw sur Full Release Validation ou OpenClaw Release Checks pour exécuter cette même matrice par rapport à un package npm livré au lieu de l'artefact construit par SHA. Les vérifications de publication multi-OS couvrent toujours l'onboarding spécifique à l'OS, l'installateur et le comportement de la plateforme ; la validation produit de package/mise à jour devrait commencer par Package Acceptance. La voie `published-upgrade-survivor` Docker valide une ligne de base de package publiée par exécution dans le chemin de publication bloquant. Dans Package Acceptance, l'archive `package-under-test` résolue est toujours la candidate et `published_upgrade_survivor_baseline` sélectionne la ligne de base publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de voie échouée préservent cette ligne de base. La validation complète de publication avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues` pour s'étendre sur les quatre dernières versions stables npm plus les versions limites de compatibilité des plugins et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona préservés, les installations de plugins OpenClaw configurés, les chemins de journal tilde et les racines de dépendance de plugins hérités obsolètes. Les sélections survivantes de mise à niveau publiée multiligne de base sont fragmentées par ligne de base dans des travaux de runner Docker ciblés distincts. Le workflow distinct `Update Migration` utilise la voie `update-migration` Docker avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question est le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale de la CI de publication complète. Les exécutions agrégées locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la ligne de base avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json` et sonde `/healthz`, `/readyz`, ainsi que le statut RPC après le démarrage de Gateway. Les voies fraîches de package et d'installateur Windows vérifient également qu'un package installé peut importer une priorité de contrôle de navigateur à partir d'un chemin absolu brut Windows. Le test de fumée de tour d'agent multi-OS OpenAI par défaut est `OPENCLAW_CROSS_OS_OPENAI_MODEL` s'il est défini, sinon `openai/gpt-5.4`, de sorte que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritée

Le processus d'acceptation des paquets dispose de fenêtres de compatibilité héritée délimitées pour les paquets déjà publiés. Les paquets jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis de l'archive tar ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le paquet n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les `pnpm.patchedDependencies` manquants du faux appareil git dérivé de l'archive et peut enregistrer les `update.channel` persistants manquants ;
- les tests de fumée de plugins peuvent lire les emplacements hérités des enregistrements d'installation ou accepter l'absence de persistance des enregistrements d'installation du marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement de non-réinstallation restent inchangés.

Le paquet publié `2026.4.26` peut également émettre des avertissements pour les fichiers d'horodatage des métadonnées de build locale qui ont déjà été expédiés. Les paquets ultérieurs doivent satisfaire les contrats modernes ; les mêmes conditions entraînent un échec au lieu d'un avertissement ou d'un saut.

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

Lors du débogage d'une exécution échouée de l'acceptation de paquet, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du paquet. Inspectez ensuite l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, les journaux de voie, les chronologies de phase et les commandes de réexécution. Privilégiez la réexécution du profil de paquet échoué ou des voies Docker exactes plutôt que la réexécution de la validation complète de la version.

## Test de fumée d'installation

Le workflow séparé `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture des tests de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions en **chemin rapide** pour les pull requests touchant les surfaces de package/Docker, les modifications de package/manifeste de plugin groupé, ou les surfaces du cœur du plugin/channel/gateway/Plugin SDK que les travaux de smoke Docker exercent. Les modifications de plugin groupé sources uniquement, les modifications de tests uniquement et les modifications de documentation uniquement ne réservent pas de workers Docker. Le chemin rapide construit l'image Dockerfile racine une fois, vérifie la CLI, exécute le smoke des agents delete shared-workspace CLI, exécute le e2e container gateway-network, vérifie un arg de build d'extension groupée, et exécute le profil Docker de plugin groupé borné sous un délai d'expiration de commande agrégé de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **chemin complet** conserve la couverture d'installation de package QR et Docker de mise à jour de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de release par appel de workflow, et les pull requests qui touchent réellement les surfaces de l'installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image de smoke Dockerfile racine GHCR target-SHA, puis exécute l'installation de package QR, les smokes Dockerfile racine/gateway, les smokes installateur/mise à jour, et le e2e Docker rapide de plugin groupé en tant que travaux distincts pour que le travail de l'installateur n'attende pas derrière les smokes de l'image racine.

Les pushs `main` (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique de portée modifiée demanderait une couverture complète sur un push, le workflow conserve le smoke Docker rapide et laisse le smoke d'installation complet aux validations nocturnes ou de release.

Le smoke lent du provider d'image d'installation globale Bun est séparément contrôlé par `run_bun_global_install_smoke`. Il s'exécute selon la planification nocturne et à partir du workflow des vérifications de release, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais pas les pull requests et les pushs `main`. Les tests Docker QR et de l'installateur conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all` prégénère une image live-test partagée, empaquete OpenClaw une fois sous forme de tarball npm et construit deux images `scripts/e2e/Dockerfile` partagées :

- un runner Node/Git nu pour les voies d'installateur/de mise à jour/de dépendance de plugin ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normales.

Les définitions de voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur dans `scripts/lib/docker-e2e-plan.mjs`, et le runner exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                                  |
| -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre de créneaux du pool principal pour les voies normales.                                                                          |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre de créneaux du pool de queue sensible au fournisseur.                                                                           |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Plafond de voies simultanées en direct pour éviter que les fournisseurs ne limitent le débit.                                          |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Plafond de voies d'installation npm simultanées.                                                                                       |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Plafond de voies multi-services simultanées.                                                                                           |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les démarrages de voies pour éviter les tempêtes de création du démon Docker ; définissez `0` pour aucun délai.            |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/queue sélectionnées utilisent des plafonds plus stricts.                        |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | unset      | `1` imprime le plan du planificateur sans exécuter les voies.                                                                          |
| `OPENCLAW_DOCKER_ALL_LANES`            | unset      | Liste de voies exactes séparées par des virgules ; ignore le nettoyage fumé afin que les agents puissent reproduire une voie en échec. |

Une voie plus lourde que sa plafond effectif peut toujours démarrer à partir d'un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégat local effectue une vérification préalable de Docker, supprime les conteneurs E2E OpenClaw obsolètes, émet l'état des voies actives, persiste les minutages des voies pour l'ordonnancement du plus long en premier, et arrête par défaut la planification de nouvelles voies regroupées après le premier échec.

### Workflow live/E2E réutilisable

Le workflow réutilisable live/E2E demande à `scripts/test-docker-all.mjs --plan-json` quel package, le type d'image, l'image live, la voie et la couverture des informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquette soit OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package à partir de `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse les images E2E Docker nues/fonctionnelles taguées avec le condensé du package via le cache de couche Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes avec condensé de package au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente borné de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Morceaux du chemin de release

La couverture Docker de release exécute des tâches plus petites et découpées avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, afin que chaque morceau ne tire que le type d'image dont il a besoin et exécute plusieurs voies via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les morceaux Docker de la release actuelle sont `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services`, et `plugins-runtime-install-a` via `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime`, et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies de l'installateur de fournisseur.

OpenWebUI est intégré à `plugins-runtime-services` lorsque la couverture complète du chemin de release le demande, et conserve un bloc `openwebui` autonome uniquement pour les dispatchs exclusifs à OpenWebUI. Les voies de mise à jour du canal groupé réessaient une fois en cas d'échecs réseau transitoires de npm.

Chaque bloc téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le plan du planificateur JSON, les tables de voies lentes et les commandes de réexécution par voie. L'entrée `docker_lanes` du workflow exécute les voies sélectionnées sur les images préparées au lieu des tâches de bloc, ce qui limite le débogage des voies échouées à une seule tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie live Docker, la tâche ciblée construit l'image de test localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name`, et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le paquet exact et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié live/E2E exécute quotidiennement la suite complète Docker du chemin de release.

## Prérelease de plugin

`Plugin Prerelease` est une couverture de produit/paquet plus coûteuse, c'est donc un workflow séparé dispatché par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées vers `main` et les dispatchs CI manuels autonomes gardent cette suite désactivée. Il équilibre les tests de plugins groupés sur huit workers d'extension ; ces tâches de shard d'extension exécutent jusqu'à deux groupes de configuration de plugin à la fois avec un worker Vitest par groupe et un tas Node plus important afin que les lots de plugins lourds en importations ne créent pas de tâches CI supplémentaires. Le chemin de prérelease Docker uniquement pour les release regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes.

## Labo QA

Le QA Lab dispose de voies CI dédiées en dehors du workflow principal à portée intelligente (smart-scoped). La parité agentic est imbriquée sous les harnais QA et release plus larges, et non pas dans un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute chaque nuit sur `main`MatrixTelegramDiscord et lors d'un déclenchement manuel ; il déploie la voie de parité simulée (mock), la voie Matrix en direct, et les voies Telegram et Discord en direct en tant que tâches parallèles. Les tâches en direct utilisent l'environnement `qa-live-shared`TelegramDiscord, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport en direct Matrix et Telegram avec le fournisseur simulé (mock) déterministe et des modèles qualifiés simulés (MatrixTelegram`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`Docker) afin que le contrat du channel soit isolé de la latence du modèle en direct et du démarrage normal du plugin fournisseur. La passerelle de transport en direct désactive la recherche mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du fournisseur est couverte par les suites distinctes du modèle en direct, du fournisseur natif et du fournisseur Docker.

Matrix utilise Matrix`--profile fast` pour les barrières programmées et de release, en ajoutant `--fail-fast`CLICLI uniquement lorsque le CLI extrait le prend en charge. La valeur par défaut du CLI et l'entrée du workflow manuel restent `all` ; le déclenchement manuel `matrix_profile=all`Matrix fractionne toujours la couverture Matrix complète en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies critiques pour la release du QA Lab avant l'approbation de la release ; sa barrière de parité QA exécute les packs candidat et baseline comme tâches de voies parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normaux, suivez les preuves CI/check étendues au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non un balayage complet du dépôt. Les exécutions quotidiennes, manuelles et de garde de non-brouillon de pull request scannent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité à haute confiance filtrées pour les niveaux `security-severity` élevés/critiques.

La garde de pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages`, ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. Android et macOS CodeQL restent exclus des valeurs par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, et base de référence de la passerelle                                                                                                              |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit                       |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF de base, d'analyse IP, de garde réseau, de récupération web et de SSRF du Plugin SDK                                                                  |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portiques d'exécution d'agent tool                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de paquets, chargement de source et surfaces de confiance du contrat de paquet du Plugin SDK |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — shard de sécurité Android planifié. Construit manuellement l'application Android pour CodeQL sur le plus petit runner Blacksmith Linux accepté par la santé du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security`macOSmacOSmacOS — shard de sécurité macOS hebdomadaire/manuel. Construit manuellement l'application macOS pour CodeQL sur Blacksmith macOS, filtre les résultats de construction des dépendances du SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`macOS. Gardé en dehors des valeurs par défaut quotidiennes car la construction macOS domine le temps d'exécution même lorsqu'elle est propre.

### Catégories de qualité critique

`CodeQL Critical Quality`Linux est le shard non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript non-sécurité de gravité erreur sur des surfaces à haute valeur étroite sur le plus petit runner Blacksmith Linux. Son garde de demande de tirage est intentionnellement plus petit que le profil planifié : les PR non-brouillons n'exécutent que les shards correspondants `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` pour le code d'exécution et de répartition de réponse de commande/modèle/outil d'agent, le code de schéma/migration/IO de configuration, le code d'auth/secrets/bac à sable/sécurité, le runtime du plugin de canal principal et groupé, le protocole/serveur-méthode de Gateway, la colle runtime/SDK de mémoire, la livraison MCP/processus/sortant, le catalogue runtime/modèle de provider, les diagnostics/files d'attente de livraison de session, le chargeur de plugin, le contrat de paquet/Plugin SDK, ou les modifications de runtime de réponse du Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze shards de qualité PR.

La répartition manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des hooks d'enseignement/itération pour exécuter un shard de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code de limite de sécurité d'authentification, de secrets, de bac à sable, de cron et de passerelle                                                                                                                               |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats d'E/S                                                                                                                                                               |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode serveur                                                                                                                                                                       |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation des plugins pour le channel principal et le channel groupé                                                                                                                                              |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution des commandes, répartition model/provider, répartition et files d'attente de réponse automatique, et contrats d'exécution du plan de contrôle ACP                                                                       |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision des processus, et contrats de livraison sortante                                                                                                                        |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK hôte de mémoire, façades d'exécution de la mémoire, alias du SDK de Plugin de mémoire, colle d'activation de l'exécution de la mémoire, et commandes du docteur de la mémoire                                                 |
| `/codeql-critical-quality/session-diagnostics-boundary` | Fonctionnement interne de la file de réponse, files de livraison de session, assistants de liaison/livraison de session sortante, surfaces des bundles d'événements/journaux de diagnostic, et contrats du docteur de session CLI |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Répartition des réponses entrantes du SDK de Plugin, assistants de charge utile/découpage/exécution des réponses, options de réponse du channel, files de livraison, et assistants de liaison de session/discussion               |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte de provider, inscription de l'exécution du provider, valeurs par défaut/catalogues du provider, et registres web/recherche/récupération/embedding           |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface utilisateur de contrôle, persistance locale, flux de contrôle de passerelle, et contrats d'exécution du plan de contrôle des tâches                                                                       |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web principale, E/S média, compréhension des médias, génération d'images, et contrats d'exécution de la génération de médias                                                                               |
| `/codeql-critical-quality/plugin-boundary`              | Contrats du chargeur, du registre, de la surface publique et du point d'entrée du SDK de Plugin                                                                                                                                   |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source SDK de Plugin côté package publié et assistants de contrat de package de plugin                                                                                                                                            |

La qualité reste séparée de la sécurité afin que les résultats de qualité puissent être planifiés, mesurés, désactivés ou étendus sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plugins groupés ne doit être réajoutée que dans le cadre d'un travail de suivi délimité ou partitionné une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour maintenir la documentation existante alignée avec les modifications récemment intégrées. Il n'a pas de planification pure : une exécution CI de push non-bot réussie sur `main` peut la déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution de Docs Agent non ignorée a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits du SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, de sorte qu'une exécution horaire peut couvrir toutes les modifications principales accumulées depuis la dernière passe de documentation.

### Test Performance Agent

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas de planification pure : une exécution CI de push non-bot réussie sur `main` peut la déclencher, mais elle est ignorée si une autre invocation d'exécution de workflow a déjà été exécutée ou est en cours ce jour-là UTC. La répartition manuelle contourne cette porte d'activité quotidienne. La voie construit un rapport de performance Vitest groupé pour la suite complète, permet à Codex de n'apporter que de petites corrections de performance de test préservant la couverture au lieu de refactorisations vastes, puis relance le rapport complet et rejette les modifications qui réduisent le nombre de tests de référence réussis. Si la référence contient des tests échouants, Codex peut ne corriger que les échecs évidents et le rapport complet de l'après-agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot n'atterrisse, la voie rebase le patch validé, relance `pnpm check:changed` et réessaie le push ; les patchs périmés en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

### Duplicate PRs After Merge

Le workflow `Duplicate PRs After Merge` est un workflow manuel de mainteneur pour le nettoyage des doublons après intégration. Il est par défaut en mode dry-run et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR intégré a été fusionné et que chaque doublon a soit un problème référencé partagé, soit des sections de code modifiées qui se chevauchent.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Local check gates and changed routing

La logique locale de voie modifiée réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de contrôle locale est plus stricte concernant les limites de l'architecture que la portée de la plateforme CI large :

- les modifications de la production principale exécutent la vérification de type de la production et du test principaux, ainsi que les lint/gardes principaux ;
- les modifications de test uniquement principales n'exécutent que la vérification de type du test principal ainsi que les lint principaux ;
- les modifications de la production d'extension exécutent la vérification de type de la production et du test d'extension ainsi que les lint d'extension ;
- les modifications de test uniquement d'extension exécutent la vérification de type du test d'extension ainsi que les lint d'extension ;
- les modifications du SDK public de plugins ou des contrats de plugins s'étendent à la vérification de type d'extension car les extensions dépendent de ces contrats principaux (les balayages d'extension Vitest restent un travail de test explicite) ;
- les mises à jour de version de métadonnées de version uniquement exécutent des contrôles ciblés de version/configuration/dépendances racines ;
- les modifications inconnues de racine/configuration échouent en mode sécurisé vers toutes les voies de contrôle.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes de test s'exécutent elles-mêmes, les modifications de source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison de salon de groupe partagé est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de réponse source, ou du prompt système de l'outil de message passent par les tests de réponse principaux ainsi que les régressions de livraison Discord et Slack afin qu'un changement de défaut partagé échoue avant le premier push de PR. N'utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` que lorsque le changement est suffisamment large pour que l'ensemble mappé peu coûteux ne soit pas un proxy fiable.

## Validation Testbox

Exécutez Testbox à partir de la racine du dépôt et préférez une box fraîche et réchauffée pour une preuve large. Avant de dépenser une porte lente sur une box qui a été réutilisée, expirée, ou qui vient simplement de rapporter une synchronisation étonnamment grande, exécutez `pnpm testbox:sanity` à l'intérieur de la box d'abord.

Le contrôle de santé échoue rapidement lorsque les fichiers racine requis tels que `pnpm-lock.yaml` ont disparu ou lorsque `git status --short` indique au moins 200 suppressions suivies. Cela signifie généralement que l'état de synchronisation distant n'est pas une copie fiable de la PR ; arrêtez cette boîte et démarrez-en une nouvelle au lieu de déboguer l'échec du test produit. Pour les PR avec des suppressions intentionnelles importantes, définissez `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour cette exécution de contrôle de santé.

`pnpm testbox:run` termine également une invocation locale de Blacksmith CLI qui reste dans la phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez `OPENCLAW_TESTBOX_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée pour les différences locales inhabituellement grandes.

Crabbox est l'enveloppe de boîte distante détenue par le dépôt pour la preuve Linux des mainteneurs. Utilisez-la lorsqu'un contrôle est trop large pour une boucle d'édition locale, lorsque la parité CI est importante, ou lorsque la preuve a besoin de secrets, de Docker, de volets de paquets, de boîtes réutilisables ou de journaux distants. Le backend OpenClaw normal est `blacksmith-testbox` ; la capacité détenue AWS/Hetzner est un repli pour les pannes de Blacksmith, les problèmes de quota ou les tests explicites de capacité détenue.

Avant une première exécution, vérifiez l'enveloppe depuis la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

L'enveloppe du dépôt refuse un binaire Crabbox périmé qui n'annonce pas `blacksmith-testbox`. Passez le fournisseur explicitement même si `.crabbox.yaml` a des valeurs par défaut pour le cloud détenu.

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions Crabbox soutenues par Blacksmith ponctuelles doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes en direct et arrêtez uniquement les boîtes que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez Blacksmith direct comme repli étroit :

```bash
blacksmith testbox warmup ci-check-testbox.yml --ref main --idle-timeout 90
blacksmith testbox run --id <tbx_id> "env CI=1 NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
blacksmith testbox stop --id <tbx_id>
```

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux
warmups restent `queued` sans IP ni URL d'exécution Actions après quelques minutes,
considérez cela comme une pression du fournisseur, de la file d'attente, de la facturation ou des limites de l'organisation de la part de Blacksmith. Arrêtez les
identifiants en file d'attente que vous avez créés, évitez de démarrer plus de Testboxes, et déplacez la preuve vers le
chemin de capacité Crabbox possédé ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith,
la facturation et les limites de l'organisation.

N'escaladez vers la capacité Crabbox possédée que lorsque Blacksmith est en panne, limité par le quota, manque de l'environnement nécessaire, ou que la capacité possédée est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

En cas de pression AWS, évitez `class=beast` sauf si la tâche nécessite vraiment un CPU de classe 48xlarge. Une requête `beast` commence à 192 vCPUs et est le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` possédé par le dépôt est réglé par défaut sur `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS courtiers affichent la région/marché sélectionné(e), la pression de quota, le repli Spot et les avertissements de classe à haute pression. Utilisez `fast` pour des vérifications larges plus lourdes, `large` uniquement après que standard/fast ne suffisent plus, et `beast` uniquement pour les voies exceptionnelles liées au CPU telles que les matrices Docker de suite complète ou tous les plugins, la validation explicite des versions/bloqueurs, ou le profilage de performance à nombreux cœurs. N'utilisez pas `beast` pour `pnpm check:changed`, les tests focalisés, le travail uniquement sur la documentation, les lint/typecheck ordinaires, les petites reproductions E2E, ou le tri des pannes de Blacksmith. Utilisez `--market on-demand` pour le diagnostic de la capacité afin que le turnover du marché Spot ne soit pas mélangé au signal.

`.crabbox.yaml` définit les valeurs par défaut du provider, de la synchronisation et de l'hydratation des GitHub Actions pour les voies owned-cloud. Il exclut le `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les dépôts distants locaux du mainteneur et les magasins d'objets, et il exclut les artefacts d'exécution/de build locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère le checkout, la configuration de Node/pnpm, la récupération `origin/main` et le transfert de l'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

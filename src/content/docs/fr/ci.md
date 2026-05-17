---
summary: "Graphe de tâches CI, portes de portée, parapluies de version et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI OpenClaw s'exécute à chaque poussée vers OpenClaw`main` et à chaque demande de tirage (pull request). La tâche `preflight` classifie les différences et désactive les volets coûteux lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la version et les validations étendues. Les volets Android restent en option via `include_android`. La couverture des plugins réservée aux versions se trouve dans le workflow séparé [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

## Aperçu du pipeline

| Tâche                            | Objectif                                                                                                                            | Quand elle s'exécute                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                      | Détecte les modifications uniquement de documentation, les portées modifiées, les extensions modifiées et construit le manifeste CI | Toujours sur les poussées et PRs non-brouillons       |
| `security-scm-fast`              | Détection de clé privée et audit de workflow via `zizmor`                                                                           | Toujours sur les poussées et PRs non-brouillons       |
| `security-dependency-audit`      | Audit de lockfile de production sans dépendance contre les avis de sécurité npm                                                     | Toujours sur les poussées et PRs non-brouillons       |
| `security-fast`                  | Agrégat requis pour les tâches de sécurité rapides                                                                                  | Toujours sur les poussées et PRs non-brouillons       |
| `check-dependencies`             | Passe de production Knip dépendance-uniquement plus la garde de liste d'autorisation des fichiers inutilisés                        | Modifications pertinentes pour Node                   |
| `build-artifacts`                | Construction de `dist/`, UI de contrôle, vérifications des artefacts construits et artefacts réutilisables en aval                  | Modifications pertinentes pour Node                   |
| `checks-fast-core`               | Volets de correction rapides Linux tels que les vérifications bundled/plugin-contract/protocol                                      | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels` | Vérifications de contrat de canal partitionnées avec un résultat de vérification agrégé stable                                      | Modifications pertinentes pour Node                   |
| `checks-node-core-test`          | Shards de tests de Node Core, à l'exclusion des canaux, bundles, contrats et voies d'extension                                      | Modifications pertinentes pour Node                   |
| `check`                          | Équivalent fragmenté de la passerelle locale principale : types de prod, lint, gardes, types de test et test de fumée strict        | Modifications pertinentes pour Node                   |
| `check-additional`               | Architecture, dérive de limite/invite fragmentée, gardes d'extension, limite de package et surveillance de passerelle               | Modifications pertinentes pour Node                   |
| `build-smoke`                    | Tests de fumée CLI intégrés et test de fumée de mémoire de démarrage                                                                | Modifications pertinentes pour Node                   |
| `checks`                         | Vérificateur pour les tests de canal d'artefacts construits                                                                         | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`      | Voie de construction et de test de compatibilité Node 22                                                                            | Répartition manuelle du CI pour les versions          |
| `check-docs`                     | Formatage, lint et vérification des liens brisés des docs                                                                           | Docs modifiés                                         |
| `skills-python`                  | Ruff + pytest pour les compétences Python                                                                                           | Modifications pertinentes pour les compétences Python |
| `checks-windows`                 | Tests de processus/chemin spécifiques à Windows plus régressions de spécificateurs d'importation d'exécution partagés               | Modifications pertinentes pour Windows                |
| `macos-node`                     | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                           | Modifications pertinentes pour macOS                  |
| `macos-swift`                    | Lint, construction et tests Swift pour l'application macOS                                                                          | Modifications pertinentes pour macOS                  |
| `android`                        | Tests unitaires Android pour les deux saveurs plus une construction de debug APK                                                    | Modifications pertinentes pour Android                |
| `test-performance-agent`         | Optimisation quotidienne des tests lents Codex après une activité approuvée                                                         | Succès du CI principal ou répartition manuelle        |
| `openclaw-performance`           | Rapports de performance d'exécution Kova quotidiens/à la demande avec mock-provider, deep-profile et voies en direct GPT 5.4        | Répartition programmée et manuelle                    |

## Ordre échec-rapide

1. `preflight` détermine quelles voies existent. La logique `docs-scope` et `changed-scope` sont des étapes de ce travail, et non des travaux autonomes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrices de plateformes.
3. `build-artifacts`Linux chevauche les voies Linux rapides afin que les consommateurs en aval puissent démarrer dès que la build partagée est prête.
4. Ensuite, les voies plus lourdes de plateforme et d'exécution se déploient : `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les tâches remplacées comme GitHub`cancelled` lorsqu'un push plus récent atterrit sur la même PR ou la référence `main`. Considérez cela comme un bruit CI à moins que l'exécution la plus récente pour la même référence échoue également. Les vérifications agrégées de shards utilisent `!cancelled() && always()` pour qu'elles signalent toujours les échecs normaux de shards mais ne se mettent pas en file d'attente une fois que le workflow entier a déjà été remplacé. La clé automatique de concurrence CI est versionnée (`CI-v7-*`GitHub) afin qu'un zombie côté GitHub dans un ancien groupe de file d'attente ne puisse pas bloquer indéfiniment les nouvelles exécutions sur main. Les exécutions manuelles complètes utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

La tâche `ci-timings-summary` télécharge un artefact `ci-timings-summary` compact pour chaque exécution CI non brouillon. Elle enregistre le temps écoulé, le temps d'attente, les tâches les plus lentes et les tâches échouées pour l'exécution en cours, afin que les vérifications de santé CI n'aient pas besoin d'extraire à plusieurs reprises la charge utile complète des Actions.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. Le répartition manuelle ignore la détection de la portée modifiée et fait agir le manifeste préliminaire comme si chaque zone à portée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node ainsi que le linting des workflows, mais ne forcent pas les builds natifs Windows, Android ou macOS par elles-mêmes ; ces voies de plateforme restent limitées aux modifications des sources de la plateforme.
- **Les modifications d'acheminement CI uniquement, les modifications sélectionnées peu coûteuses de fixtures de test principal, et les modifications étroites d'aide de contrat de plugin/acheminement de test** utilisent un chemin de manifeste rapide uniquement pour Node : `preflight`, sécurité, et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de canal, les fragments complets du cœur, les fragments de plugins groupés, et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces d'acheminement ou d'aide que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides de lanceur npm/pnpm/UI, à la configuration du gestionnaire de paquets, et aux surfaces de workflow CI qui exécutent cette voie ; les modifications de source non liées, de plugin, de smoke d'installation et de test uniquement restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont divisées ou équilibrées afin que chaque travail reste petit sans sur-réserver les exécuteurs : les contrats de canal s'exécutent sous forme de trois shards pondérés pris en charge par Blacksmith avec le repli sur l'exécuteur standard GitHub, les voies rapides/support de l'unité principale s'exécutent séparément, l'infrastructure d'exécution principale est répartie entre les shards d'état, de processus/config, de cron et partagés, la réponse automatique s'exécute en tant que travailleurs équilibrés (avec le sous-arbre de réponse divisé en shards agent-runner, dispatch, et commandes/routage d'état), et les configurations de passerelle/serveur agentiques sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests larges de navigateur, de QA, multimédias et de plugins divers utilisent leurs propres configurations Vitest dédiées au lieu du fichier de rattrapage partagé pour les plugins. Les shards basés sur des modèles d'inclusion enregistrent des entrées de minutage en utilisant le nom du shard CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration entière d'un shard filtré. `check-additional` maintient ensemble le travail de compilation/canary lié aux limites des packages et sépare l'architecture de la topologie d'exécution de la couverture de surveillance de la passerelle ; la liste des gardes de limite est répartie sur quatre shards de matrice, chacun exécutant des gardes indépendants sélectionnés simultanément et imprimant les minutages par vérification. La vérification coûteuse de la dérive des instantanés de prompt du chemin heureux Codex s'exécute en tant que travail supplémentaire distinct pour le CI manuel et uniquement pour les modifications affectant les prompts, afin que les modifications Node normales sans lien n'attendent pas derrière la génération à froid d'instantanés de prompt et que les shards de limites restent équilibrés tandis que la dérive des prompts reste épinglée à la PR qui l'a causée ; le même indicateur saute la génération Vitest d'instantanés de prompt à l'intérieur du shard de limite de support principal des artefacts construits. La surveillance de la Gateway, les tests de canal et le shard de limite de support principal s'exécutent simultanément à l'intérieur de `build-artifacts` une fois que `dist/` et `dist-runtime/` sont déjà construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest` puis génère le APK de débogage Play. La variante tierce n'a pas de jeu de sources ni de manifeste distincts ; sa voie de test unitaire compile toujours la variante avec les indicateurs BuildConfig de SMS/journal d'appels, tout en évitant une tâche de redondance d'empaquetage du APK de débogage à chaque poussée pertinente pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendance-only épinglée à la dernière version de Knip, avec l'âge minimum de publication de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip par rapport à `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non révisé ou laisse une entrée de liste d'autorisation obsolète, tout en préservant les surfaces intentionnelles de plugin dynamique, générées, de build, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extrait pas ni n'exécute de code de pull request non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis distribue des payloads compacts `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les poussées `main` ;
- `github_activity` pour l'activité générale GitHub que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transmet uniquement les métadonnées normalisées : type d'événement, action, acteur, dépôt, numéro d'élément, URL, titre, état et de courts extraits pour les commentaires ou les révisions le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, pas une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne devrait publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, modifications, activités de robot, bruits de webhook en double et trafic de révision normal devraient entraîner `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ce sont des entrées pour la synthèse et le triage, et non des instructions pour le workflow ou le runtime de l'agent.

## Répartitions manuelles

Les répartitions CI manuelles exécutent le même graphe de tâches que le CI normal mais forcent l'activation de chaque voie à portée non Android : partitions Node Linux, partitions de bundles de plugins, contrats de channel, compatibilité Node 22, `check`, `check-additional`, tests de fumée de build, vérifications de documentation, compétences Python, Windows, macOS et i18n de l'interface utilisateur de contrôle. Les répartitions CI manuelles autonomes exécutent Android uniquement avec `include_android=true` ; le parapluie complet de version active Android en passant `include_android=true`. Les vérifications statiques de préversion de plugins, la partition `agentic-plugins` uniquement pour les versions, le balayage complet du lot d'extensions et les voies Docker de préversion de plugins sont exclus du CI. La suite de préversion Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow séparé `Plugin Prerelease` avec la porte release-validation activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée facultative `target_ref` permet à un appelant de confiance d'exécuter ce graphe sur une branche, une balise ou un SHA de commit complet, tout en utilisant le fichier de workflow à partir de la référence de répartition sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, tâches de sécurité rapides et agrégats (`security-scm-fast`, `security-dependency-audit`, `security-fast`), vérifications rapides de protocole/contrat/groupées, vérifications de contrat de canal fragmentées, fragments `check` à l'exception de lint, agrégats `check-additional`, vérificateurs d'agrégats de tests Node, vérifications de documentation, compétences Python, workflow-sanity, labeler, auto-response ; l'avant-vol install-smoke utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse être mise en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, fragments d'extension de poids inférieur, `checks-fast-core`, `checks-node-compat-node22`, `check-prod-types` et `check-test-types`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke, fragments de tests Node Linux, fragments de tests de plugins groupés, fragments `check-additional`, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (assez sensibles au CPU pour que 8 vCPU coûtent plus que ce qu'ils ont permis d'économiser) ; les builds Docker de install-smoke (le temps d'attente dans la file de 32 vCPU coûtait plus que ce qu'il a permis d'économiser)                                                                                                                                                                                                                                                                                                                             |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les forks reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

Le CI du dépôt canonique conserve Blacksmith comme chemin d'exécuteur par défaut. Pendant `preflight`, `scripts/ci-runner-labels.mjs` vérifie les exécutions d'Actions récentes mises en file d'attente et en cours pour les tâches Blacksmith en file d'attente. Si une étiquette Blacksmith spécifique a déjà des tâches en file d'attente, les tâches en aval qui utiliseraient cette étiquette exacte reviennent à l'exécuteur hébergé par GitHub correspondant (`ubuntu-24.04`, `windows-2025` ou `macos-latest`) pour cette exécution uniquement. Les autres tailles Blacksmith dans la même famille de systèmes d'exploitation restent sur leurs étiquettes principales. Si la sonde de l'API échoue, aucun retour n'est appliqué.

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

`OpenClaw Performance` est le workflow de performance produit/runtime. Il s'exécute quotidiennement sur `main` et peut être déclenché manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_gpt54=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le déclenchement manuel effectue généralement des tests de référence sur la référence du workflow. Définissez `target_ref` pour effectuer un test de référence sur une étiquette de version ou une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification des lanes, le modèle, le nombre de répétitions et les filtres de scénarios.

Le workflow installe OCM à partir d'une version épinglée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois lanes :

- `mock-provider` : scénarios de diagnostic Kova sur un runtime construit localement avec une authentification fausse déterministe compatible OpenAI.
- `mock-deep-profile` : profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds des tours d'agent.
- `live-gpt54` : un tour d'agent réel `openai/gpt-5.4` OpenAI, ignoré lorsque `OPENAI_API_KEY` n'est pas disponible.

Le mock-provider lane exécute également des sondes de source natives OpenClaw après le passage Kova : le timing et la mémoire de démarrage de la passerelle dans les cas par défaut, hook et 50 plugins ; des boucles de salutation mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI répétées ; et les commandes de démarrage CLI contre la passerelle démarrée. Le résumé Markdown des sondes de source se trouve à `source/index.md` dans le bundle de rapport, avec le JSON brut à côté.

Chaque lane télécharge des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md` et les artefacts de sondes de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur de tested-ref actuel est écrit en tant que `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel global pour "exécuter tout avant la publication". Il accepte une branche, une étiquette ou un SHA de commit complet, distribue le workflow manuel `CI` avec cette cible, distribue `Plugin Prerelease` pour la preuve des plugins/packages/statiques/Docker liés uniquement à la publication, et distribue `OpenClaw Release Checks` pour le test d'installation fumé, l'acceptation des packages, les vérifications de packages cross-OS, la parité du QA Lab, les voies Matrix et Telegram. Les exécutions stables/défaut maintiennent une couverture exhaustive en direct/E2E et le chemin de publication Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture approfondie afin que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` par rapport à l'artefact `release-package-under-test` issu des vérifications de publication. Après publication, passez `release_package_spec` pour réutiliser le package npm livré à travers les vérifications de publication, l'acceptation des packages, Docker, le cross-OS et Telegram sans reconstruire. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un package différent.

Consultez [Full release validation](/fr/reference/full-release-validation) pour la
matrice des étapes, les noms exacts des tâches de workflow, les différences de profil, les artefacts et
les poignées de réexécution ciblées.

`OpenClaw Release Publish` est le workflow de publication modifiant manuel. Distribuez-le
depuis `release/YYYY.M.D` ou `main` après que l'étiquette de publication existe et après que
la pré-vérification OpenClaw npm a réussi. Il vérifie `pnpm plugins:sync:check`,
distribue `Plugin NPM Release` pour tous les packages de plugins publiables, distribue
`Plugin ClawHub Release` pour le même SHA de publication, et seulement ensuite distribue
`OpenClaw NPM Release` avec le `preflight_run_id` enregistré.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez le helper au lieu de
`gh workflow run ... --ref main -f ref=<sha>` :

```bash
pnpm ci:full-release --sha <full-sha>
```

Les références de dispatch de workflow GitHub doivent être des branches ou des balises (tags), et non des SHA de commit bruts. L'outil d'aide pousse une branche temporaire `release-ci/<sha>-...` au SHA cible, effectue un dispatch `Full Release Validation` à partir de cette référence épinglée, vérifie que chaque exécution de workflow enfant `headSha` correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si un workflow enfant a tourné sur un SHA différent.

`release_profile` contrôle l'étendue live/fournisseur (provider) transmise aux vérifications de version. Les workflows de version manuelle sont par défaut sur `stable` ; utilisez `full` uniquement lorsque vous voulez intentionnellement la large matrice fournisseur/média consultative. `run_release_soak` contrôle si les vérifications de version stable/défaut exécutent le test de résistance (soak) exhaustif live/E2E et du chemin de version Docker ; `full` force l'activation du test de résistance.

- `minimum` conserve les voies les plus rapides critiques pour la version OpenAI/core.
- `stable` ajoute l'ensemble stable de fournisseurs (provider)/backends.
- `full` exécute la large matrice fournisseur/média consultative.

Le parapluie enregistre les identifiants des exécutions enfants envoyées, et le travail final `Verify full validation` vérifie à nouveau les conclusions actuelles des exécutions enfants et ajoute des tableaux des tâches les plus lentes pour chaque exécution enfant. Si un workflow enfant est réexécuté et passe au vert, réexécutez uniquement le travail du vérificateur parent pour rafraîchir le résultat du parapluie et le résumé des timings.

Pour la récupération, à la fois `Full Release Validation` et `OpenClaw Release Checks` acceptent `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de préversion du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de maintenir limitée la réexécution d'une boîte de version échouée après une correction ciblée. Pour une voie cross-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes cross-OS longues émettent des lignes de pulsation et les résumés de mise à niveau de package incluent des timings par phase. Les voies de vérification de version QA sont consultatives, par conséquent les échecs QA uniquement avertissent mais ne bloquent pas le vérificateur de vérification de version.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois en une archive `release-package-under-test`, puis transmet cet artefact aux vérifications cross-OS et à l'acceptation des packages, ainsi qu'au workflow Docker du chemin de version live/E2E lors de l'exécution de la couverture soak. Cela permet de garder les octets du package cohérents entre les boîtes de version et d'éviter de réempaqueter le même candidat dans plusieurs travaux enfants.

Les exécutions en double de `Full Release Validation` pour `ref=main` et `rerun_group=all`
supplantent l'ancien parapluie. Le moniteur parent annule tout workflow enfant qu'il
a déjà distribué lorsque le parent est annulé, de sorte que la validation main plus récente
ne reste pas en attente d'une exécution de vérification de version périmée de deux heures. La validation de branche/étiquette de version
et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant live/E2E de la version conserve une couverture native `pnpm test:live` large, mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail série :

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
- fractionne les shards audio/vidéo des médias et les shards musicaux filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des échecs lents des providers en direct. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions manuelles ponctuelles.

Les shards natifs de médias en direct s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les tâches multimédias ne vérifient que les binaires avant la configuration. Conservez les suites en direct basées sur Docker sur les runners Blacksmith normaux — les tâches conteneur ne sont pas l'endroit approprié pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image `ghcr.io/openclaw/openclaw-live-test:<sha>` partagée distincte par commit sélectionné. Le workflow de version en direct construit et pousse cette image une seule fois, puis les shards de modèle en direct Docker, de Gateway partitionné par provider, de backend CLI, de liaison ACP et de harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`. Les shards Gateway Docker comportent des limites `timeout` explicites au niveau du script, inférieures au délai d'expiration de la tâche du workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'ensemble du budget de vérification de version. Si ces shards reconstruisent indépendamment la cible source complète Docker, l'exécution de la version est mal configurée et gaspillera du temps horloge sur les constructions d'images en double.

## Acceptation des paquets

Utilisez `Package Acceptance` lorsque la question est « ce paquet OpenClaw installable fonctionne-t-il comme un produit ? ». Cela diffère de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation du paquet valide une seule archive tar via le même harnais E2E Docker que les utilisateurs exécutent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de paquet, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test` et imprime la source, la référence du workflow, la référence du paquet, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive tar, prépare les images Docker de digest de paquet si nécessaire, et exécute les voies Docker sélectionnées sur ce paquet au lieu d'empaqueter l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes` ciblées, le workflow réutilisable prépare le paquet et les images partagées une fois, puis distribue ces voies sous forme de tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle optionnellement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test` lorsque l'acceptation du paquet en a résolu un ; un déclenchement autonome Telegram peut toujours installer une spécification npm publiée.
4. `summary` fait échouer le workflow si la résolution du paquet, l'acceptation Docker ou la voie Telegram optionnelle ont échoué.

### Sources de candidats

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest`, ou une version de release exacte d'OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des pré-versions/stables publiées.
- `source=ref` empaquette une branche `package_ref` de confiance, un tag, ou un SHA de commit complet. Le résolveur récupère les branches/tags d'OpenClaw, vérifie que le commit sélectionné est accessible depuis l'historique des branches du dépôt ou un tag de release, installe les dépendances dans un worktree détaché, et l'empaquette avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS ; `package_sha256` est requis.
- `source=artifact` télécharge un `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harness de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lors de `source=ref`. Cela permet au harnais de test actuel de valider d'anciens commits sources de confiance sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — fragments complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis quand `suite_profile=custom`

Le profil `package` utilise une couverture de plug-in hors ligne, de sorte que la validation du package publié n'est pas verrouillée par la disponibilité de ClawHub en ligne. La voie facultative Telegram réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spéc npm publié conservé pour les déclenchements autonomes.

Pour la politique dédiée aux tests de mises à jour et de plug-ins, y compris les commandes locales,
les voies Docker, les entrées d'acceptation des packages, les valeurs par défaut de publication et le triage des échecs,
voir [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de publication appellent l'acceptation des packages avec `source=artifact`, l'artefact du package de publication préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`ClawHubTelegram. Cela maintient la migration de package, la mise à jour, l'installation de la compétence live ClawHub, le nettoyage des dépendances de plugin obsolètes, la réparation de l'installation de plugin configuré, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive tar de package résolue. Définissez `release_package_spec`OpenClawnpm sur la validation complète de publication ou les vérifications de publication OpenClaw après la publication d'une bêta pour exécuter la même matrice par rapport au package npm expédié sans reconstruction ; définissez `package_acceptance_package_spec` uniquement lorsque l'acceptation des packages a besoin d'un package différent du reste de la validation de publication. Les vérifications de publication multi-OS couvrent toujours l'intégration spécifique à l'OS, l'installateur et le comportement de la plateforme ; la validation produit de package/mise à jour doit commencer par l'acceptation des packages. La voie Docker `published-upgrade-survivor`Docker valide une ligne de base de package publiée par exécution dans le chemin de publication bloquant. Dans l'acceptation des packages, l'archive tar `package-under-test` résolue est toujours le candidat et `published_upgrade_survivor_baseline` sélectionne la ligne de base publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de voie en échec préservent cette ligne de base. La validation complète de publication avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker pour s'étendre sur les quatre dernières versions stables npm plus les versions de limite de compatibilité de plugin épinglées et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona conservés, les installations de plugin OpenClaw configurées, les chemins de journal tilde et les racines de dépendance de plugin héritées obsolètes. Les sélections de survivants de mise à niveau publiée multi-lignes de base sont partitionnées par ligne de base en travaux de runner Docker ciblés distincts. Le flux de travail séparé `Update Migration` utilise la voie Docker `update-migration`Docker avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale des CI de publication complète. Les exécutions agrégées locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la ligne de base avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json` et sonde `/healthz`, `/readyz`RPCGatewayWindowsWindowsOpenAI ainsi que le statut RPC après le démarrage de Gateway. Les voies d'empaquetage et d'installateur frais Windows vérifient également qu'un package installé peut importer une substitution de contrôle de navigateur à partir d'un chemin Windows absolu brut. Le test de fumée de tour d'agent multi-OS OpenAI est par défaut `OPENCLAW_CROSS_OS_OPENAI_MODEL` s'il est défini, sinon `openai/gpt-5.4`, de sorte que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritées

Le processus d'acceptation des packages dispose de fenêtres de compatibilité héritées délimitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis de l'archive tar ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les pnpm `patchedDependencies` manquants du faux appareil git dérivé de l'archive tar et peut enregistrer les `update.channel` persistants manquants ;
- les tests de fumée de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation sur la marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement de non-réinstallation restent inchangés.

Le package `2026.4.26` publié peut également avertir pour les fichiers d'horodatage des métadonnées de construction locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire aux contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, les journaux de voie, les minutages de phase et les commandes de réexécution. Préférez la réexécution du profil de package ayant échoué ou des voies Docker exactes plutôt que de réexécuter la validation complète de la version.

## Test de fumée d'installation

Le workflow `Install Smoke` distinct réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture des tests de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions en **Fast path** pour les demandes de tirage (pull requests) touchant les surfaces Docker/package, les changements de package/manifest de plugin groupé, ou les surfaces principales de plugin/channel/gateway/Plugin SDK que les jobs de smoke Docker exercent. Les changements de plugin groupé source-only, les modifications test-only et les modifications docs-only ne réservent pas de workers Docker. Le fast path construit l'image racine Dockerfile une fois, vérifie le CLI, exécute les agents delete shared-workspace CLI smoke, exécute le container gateway-network e2e, vérifie un arg de build d'extension groupée, et exécute le profil Docker de plugin groupé borné sous un délai d'expiration de commande global de 240 secondes (chaque exécution Docker de scénario est plafonnée séparément).
- Le **Full path** conserve la couverture d'installation de package QR et Docker de mise à jour de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles (dispatches), les vérifications de release par appel de workflow, et les demandes de tirage qui touchent vraiment les surfaces de l'installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image smoke Dockerfile racine GHCR target-SHA, puis exécute l'installation de package QR, les smokes racine Dockerfile/gateway, les smokes de l'installateur/mise à jour, et l'E2E Docker rapide de plugin groupé en tant que jobs distincts afin que le travail de l'installateur n'attende pas derrière les smokes de l'image racine.

Les poussées (pushes) `main`Docker (y compris les commits de fusion) ne forcent pas le full path ; lorsque la logique de portée modifiée demanderait une couverture complète sur une poussée, le workflow conserve le smoke Docker rapide et laisse le smoke d'installation complet aux exécutions nocturnes ou de validation de release.

Le smoke lent d'image-provider d'installation globale de Bun est séparément conditionné par `run_bun_global_install_smoke`. Il s'exécute sur la planification nocturne et à partir du workflow des vérifications de release, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais les demandes de tirage et les poussées `main`Docker ne le font pas. Les tests Docker QR et de l'installateur conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm précompile une image live-test partagée, empaquète OpenClaw une fois en tant qu'archive tar npm, et construit deux images partagées `scripts/e2e/Dockerfile` :

- un runner Node/Git nu pour les voies d'installation/de mise à jour/de dépendances de plugin ;
- une image fonctionnelle qui installe la même archive dans `/app` pour les voies de fonctionnalités normales.

Les définitions de voies Docker se trouvent dans Docker`scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur dans `scripts/lib/docker-e2e-plan.mjs`, et le runner exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                             |
| -------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                  |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de queue sensibles au fournisseur.                                                                  |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite concurrente de voies en direct pour éviter la limitation par les fournisseurs.                                             |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite concurrente de voies d'installation npm.                                                                                   |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite concurrente de voies multi-services.                                                                                       |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les démarrages de voies pour éviter les tempêtes de création du démon Docker ; définissez Docker`0` pour aucun délai. |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/tail sélectionnées utilisent des limites plus strictes.                    |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` affiche le plan du planificateur sans exécuter les voies.                                                                     |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage pour que les agents puissent reproduire une voie échouée.   |

Une voie plus lourde que sa limite effective peut toujours démarrer depuis un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégateur local effectue des prévols sur Docker, supprime les conteneurs E2E OpenClaw périmés, émet le statut des voies actives, persiste les durées des voies pour un ordre du plus long au plus court, et arrête par défaut la planification de nouvelles voies groupées après le premier échec.

### Workflow live/E2E réutilisable

Le workflow réutilisable live/E2E demande à `scripts/test-docker-all.mjs --plan-json` quel package, le type d'image, l'image live, la voie et la couverture des informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquète OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse des images E2E Docker nues/fonctionnelles étiquetées avec le digest du package via le cache de couches Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes du digest du package au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente borné de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Morceaux du chemin de release

La couverture Docker de release exécute des plus petits travaux découpés avec `OPENCLAW_SKIP_DOCKER_BUILD=1` afin que chaque morceau ne tire que le type d'image dont il a besoin et exécute plusieurs voies via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les morceaux Docker actuels de la release sont `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` via `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies de l'installateur de fournisseur.

OpenWebUI est intégré dans `plugins-runtime-services` lorsque la couverture complète du chemin de publication le demande, et conserve un bloc `openwebui` autonome uniquement pour les dispatches OpenWebUI exclusifs. Les voies de mise à jour groupées par canal réessaient une fois en cas d'erreurs réseau npm transitoires.

Chaque bloc téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le JSON du planificateur, les tables de voies lentes et les commandes de réexécution par voie. L'entrée `docker_lanes` du workflow exécute les voies sélectionnées sur les images préparées au lieu des tâches de bloc, ce qui limite le débogage des voies échouées à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie Docker en direct, la tâche ciblée construit l'image de test en direct localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name` et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le paquet exact et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié en direct/E2E exécute quotidiennement la suite complète Docker du chemin de publication.

## Prépublication de plugin

`Plugin Prerelease` est une couverture produit/package plus coûteuse, c'est donc un workflow séparé distribué par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées `main` et les déclenchements manuels autonomes de CI gardent cette suite désactivée. Elle équilibre les tests de plugins groupés sur huit workers d'extension ; ces tâches de shard d'exécution exécutent jusqu'à deux groupes de configuration de plugins à la fois avec un worker Vitest par groupe et un tas Node plus grand afin que les lots de plugins lourds en importations ne créent pas de tâches CI supplémentaires. Le chemin de prépublication Docker uniquement pour les versions regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow télécharge également un artefact informatif `plugin-inspector-advisory` depuis `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont des entrées de triage et ne modifient pas la barrière bloquante de Prépublication de Plugin.

## QA Lab

Le QA Lab dispose de voies CI dédiées en dehors du principal workflow à portée intelligente. La parité agentic est imbriquée sous les harnais QA et release larges, et non un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute chaque nuit sur `main` et sur déclenchement manuel ; il déploie la voie de parité simulée (mock), la voie Matrix en direct, et les voies Telegram et Discord en direct comme tâches parallèles. Les tâches en direct utilisent l'environnement `qa-live-shared`, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport en direct Matrix et Telegram avec le provider simulé déterministe et des modèles qualifiés pour simulation (`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`) afin que le contrat de canal soit isolé de la latence du modèle en direct et du démarrage normal du provider-plugin. La passerelle de transport en direct désactive la recherche mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du provider est couverte par les suites distinctes du modèle en direct, du provider natif et du provider Docker.

Matrix utilise Matrix`--profile fast` pour les éléments planifiés et les portes de publication (release gates), en ajoutant `--fail-fast`CLICLI uniquement lorsque la CLI extraite le prend en charge. La valeur par défaut de la CLI et l'entrée du flux de travail manuel restent `all` ; la répartition manuelle `matrix_profile=all`Matrix fragmente toujours la couverture Matrix complète en `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies critiques du QA Lab avant l'approbation de la publication ; sa porte de parité QA exécute les packs candidats et de base en tant que tâches de voie parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normaux, suivez les preuves CI/check délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le flux de travail `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non un balayage complet du référentiel. Les exécutions quotidiennes, manuelles et de garde de demande de tirage (pull request) non brouillon scannent le code du flux de travail Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité haute confiance filtrées sur des `security-severity` élevées/critiques.

La garde de demande de tirage reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`AndroidmacOS, et elle exécute la même matrice de sécurité à haute confiance que le flux de travail planifié. Android et macOS CodeQL restent en dehors des valeurs par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, et passerelle de base (gateway baseline)                                                                                                            |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation du canal principal (core channel) plus le runtime du plugin de canal, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit        |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF principales, d'analyse IP, de garde réseau, de récupération web et de stratégie SSRF du Plugin SDK                                                     |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution d'outils d'agent                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de paquets, chargement de source et surfaces de confiance du contrat de package du SDK Plugin |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — shard de sécurité Android planifié. Construit l'application Android manuellement pour CodeQL sur le plus petit runner Blacksmith Linux accepté par la santé du workflow. Télécharge sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — shard de sécurité macOS hebdomadaire/manuel. Construit l'application macOS manuellement pour CodeQL sur Blacksmith macOS, filtre les résultats de construction des dépendances hors du SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`. Gardé en dehors des valeurs par défaut quotidiennes car la construction macOS domine le temps d'exécution même lorsqu'elle est propre.

### Catégories de qualité critique

`CodeQL Critical Quality`Linux est le shard non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript de gravité erreur et non-sécurité sur des surfaces de haute valeur étroites sur le plus petit runner Blacksmith Linux. Son garde pour les pull requests est intentionnellement plus petit que le profil planifié : les PR non-brouillon n'exécutent que les shards `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` correspondants pour l'exécution de commande d'agent/modèle/tool et le code de dispatch de réponse, le code de schéma/migration/IO de configuration, le code d'auth/secrets/sandbox/sécurité, le runtime des plugins channel principaux et groupés, le protocole Gateway/méthode de serveur, la colle runtime/SDK de mémoire, la livraison MCP/processus/sortant, le catalogue de runtime de fournisseur/modèle, les files de diagnostics/livraison de session, le chargeur de plugins, le contrat de package/Plugin SDK, ou les modifications du runtime de réponse du Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze shards de qualité PR.

La distribution manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des hooks d'enseignement/itération pour exécuter un shard de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code d'authentification, de secrets, de sandbox, de cron et de limite de sécurité de la passerelle                                                                                                                                     |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats d'E/S                                                                                                                                                                    |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode serveur                                                                                                                                                                            |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation du plugin channel principal et groupé                                                                                                                                                                        |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commande, dispatch fournisseur/modèle, dispatch et files de réponse automatique, et contrats de runtime du plan de contrôle ACP                                                                                           |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision de processus, et contrats de livraison sortant                                                                                                                               |
| `/codeql-critical-quality/memory-runtime-boundary`      | Kit de développement logiciel (SDK) hôte de mémoire, façades d'exécution de mémoire, alias du SDK de plug-in de mémoire, colle d'activation d'exécution de mémoire et commandes du docteur mémoire                                     |
| `/codeql-critical-quality/session-diagnostics-boundary` | Internes de la file de réponse, files de livraison de session, assistants de liaison/livraison de session sortante, surfaces de bundle d'événements/journaux de diagnostic et contrats CLI du docteur de session                       |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Répartition des réponses entrantes du SDK de plug-in, assistants de charge utile/découpage/exécution des réponses, options de réponse de canal, files de livraison et assistants de liaison de session/thread                          |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte du fournisseur, inscription de l'exécution du fournisseur, valeurs par défaut/catalogues du fournisseur et registres de web/recherche/récupération/incorporation |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface utilisateur de contrôle, persistance locale, flux de contrôle de passerelle et contrats d'exécution du plan de contrôle des tâches                                                                             |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web de base, E/S média, compréhension média, génération d'images et contrats d'exécution de génération média                                                                                                    |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique et contrats de point d'entrée du SDK de plug-in                                                                                                                                                   |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source du SDK de plug-in côté package publié et assistants de contrat de package de plug-in                                                                                                                                            |

La qualité reste distincte de la sécurité afin que les conclusions de qualité puissent être planifiées, mesurées, désactivées ou étendues sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plug-ins groupés ne doit être réajoutée que sous forme de travail de suivi délimité ou fragmenté une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une ligne de maintenance Codex pilotée par les événements pour garder les documents existants alignés avec les modifications récemment intégrées. Il n'a pas de calendrier pur : une exécution CI de push non-bot réussie sur `main` peut la déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution de Docs Agent non ignorée a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de validations du SHA source Docs Agent non ignoré précédent vers le `main` actuel, de sorte qu'une exécution horaire peut couvrir toutes les modifications principales accumulées depuis la dernière passe de documentation.

### Agent de performance de test

Le workflow `Test Performance Agent` est une voie de maintenance Codex basée sur les événements pour les tests lents. Il n'a pas de calendrier pur : une exécution de CI de push non-bot réussie sur `main` peut le déclencher, mais il est ignoré si une autre invocation de workflow-run a déjà été exécutée ou est en cours ce jour-là (UTC). L'expédition manuelle contourne cette porte d'activité quotidienne. La voie construit un rapport de performance Vitest groupé pour la suite complète, permet à Codex d'effectuer uniquement de petites corrections de performance de test préservant la couverture au lieu de refactorisations larges, puis réexécute le rapport complet et rejette les modifications qui réduisent le nombre de tests de référence réussis. Si la référence contient des tests échouant, Codex peut ne corriger que les échecs évidents et le rapport complet après l'agent doit réussir avant que quoi que ce soit ne soit validé. Quand `main` avance avant que le push du bot n'atterrisse, la voie effectue un rebase du patch validé, réexécute `pnpm check:changed`, et réessaie le push ; les patches conflictuels obsolètes sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

### PRs en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow manuel de mainteneur pour le nettoyage des doublons après intégration. Il est défini par défaut sur dry-run et ne ferme que les PR explicitement listés quand `apply=true`. Avant de modifier GitHub, il vérifie que la PR intégrée est fusionnée et que chaque doublon a soit un problème référencé partagé soit des blocs de modifications superposés.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale de voie modifiée réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte sur les limites de l'architecture que la portée large de la plateforme CI :

- les modifications de production de base exécutent core prod et core test typecheck plus core lint/guards ;
- les modifications de test uniquement de base n'exécutent que core test typecheck plus core lint ;
- les modifications de production d'extension exécutent extension prod et extension test typecheck plus extension lint ;
- les modifications de test uniquement d'extension exécutent extension test typecheck plus extension lint ;
- les modifications du Plugin SDK public ou du plugin-contract s'étendent à l'extension typecheck car les extensions dépendent de ces contrats de base (les parcours d'extension Vitest restent un travail de test explicite) ;
- les mises à jour de version de métadonnées uniquement exécutent des vérifications ciblées de version/configuration/dépendances racine ;
- les modifications inconnues de la racine ou de la configuration échouent en mode sûr sur toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed`DiscordSlack : les modifications directes des tests s'exécutent elles-mêmes, les modifications sources préfèrent les mappages explicites, puis les tests frères et les dépendances du graphe d'importation. La configuration de livraison par salon de groupe partagé est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison des réponses source, ou de l'invite système de l'outil de message passent par les tests de réponse principaux ainsi que les régressions de livraison Discord et Slack afin qu'une modification par défaut partagée échoue avant le premier push de PR. Utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque la modification est suffisamment large pour que l'ensemble mappé peu coûteux ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est l'enveloppe de boîte distante détenue par le dépôt pour les preuves Linux des mainteneurs. Utilisez-la
à partir de la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI
importe, ou lorsque la preuve a besoin de secrets, Docker, de voies de paquets,
de boîtes réutilisables ou de journaux distants. Le backend OpenClaw normal est
LinuxDockerOpenClaw`blacksmith-testbox`Hetzner ; la capacité détenue AWS/Hetzner est un repli pour les pannes Blacksmith,
les problèmes de quota ou les tests explicites de capacité détenue.

Les exécutions Blacksmith soutenues par Crabbox effectuent le réchauffement, la réclamation, la synchronisation, l'exécution, le rapport et le nettoyage
de Testboxes ponctuels. Le contrôle de santé de synchronisation intégré échoue rapidement lorsque les fichiers
racine requis tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short`
affiche au moins 200 suppressions suivies. Pour les PR de suppressions volumineuses intentionnelles, définissez
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale CLI Blacksmith qui reste dans la
phase de synchronisation pendant plus de cinq minutes sans sortie après synchronisation. Définissez
CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus grande
pour les diffs locaux inhabituellement volumineux.

Avant une première exécution, vérifiez l'enveloppe à partir de la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

L'enveloppe du dépôt refuse un binaire Crabbox obsolète qui n'annonce pas `blacksmith-testbox`. Passez le fournisseur explicitement même si `.crabbox.yaml` a des valeurs par défaut pour le cloud possédé.

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions uniques de Crabbox prises en charge par Blacksmith doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes en direct et arrêtez uniquement les boîtes que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez Blacksmith directement uniquement pour les diagnostics tels que `list`, `status` et le nettoyage. Corrigez le chemin Crabbox avant de traiter une exécution directe de Blacksmith comme une preuve pour le responsable.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux échauffements restent `queued` sans adresse IP ni URL d'exécution Actions après quelques minutes, considérez cela comme une pression sur le fournisseur, la file d'attente, la facturation ou les limites de l'organisation de Blacksmith. Arrêtez les identifiants en file d'attente que vous avez créés, évitez de démarrer d'autres Testboxes, et déplacez la preuve vers le chemin de capacité Crabbox possédé ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Passez à la capacité Crabbox possédée uniquement lorsque Blacksmith est en panne, limité par quota, manque l'environnement nécessaire, ou si la capacité possédée est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Sous pression AWS, évitez `class=beast` à moins que la tâche n'ait vraiment besoin d'un processeur de classe 48xlarge. Une demande `beast` commence à 192 vCPU et constitue le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` appartenant au dépôt est par défaut `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS courtiers impriment la région/marché sélectionné(e), la pression de quota, le repli Spot et les avertissements de classe haute pression. Utilisez `fast` pour des vérifications larges plus lourdes, `large` uniquement après que standard/fast ne suffisent pas, et `beast` uniquement pour les voies exceptionnellement liées au processeur telles que les matrices Docker pour la suite complète ou tous les plugins, la validation explicite des versions/bloqueurs, ou le profilage de performances à cœur élevé. N'utilisez pas `beast` pour `pnpm check:changed`, les tests focalisés, le travail uniquement sur la documentation, le lint/typecheck ordinaire, les petites reproductions E2E ou le tri des pannes de Blacksmith. Utilisez `--market on-demand` pour le diagnostic de la capacité afin que le taux de rotation du marché Spot ne soit pas mélangé au signal.

`.crabbox.yaml` possède les valeurs par défaut de fournisseur, de synchronisation et d'hydratation GitHub Actions pour les voies owned-cloud. Il exclut `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les dépôts distants et les magasins d'objets locaux du responsable, et il exclut les artefacts d'exécution/de construction locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère le checkout, la configuration Node/pnpm, la récupération `origin/main` et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

---
summary: "Graphe de tâches CI, portes de portée, parapluies de version et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI OpenClaw s'exécute à chaque envoi (push) vers OpenClaw`main` et chaque demande de tirage (pull request). La tâche `preflight` classe les différences et désactive les voies coûteuses lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la version et les validations larges. Les voies Android restent en option via `include_android`. La couverture des plugins uniquement pour les versions se trouve dans le workflow séparé [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'une diffusion manuelle explicite.

## Aperçu du pipeline

| Tâche                            | Objectif                                                                                                                              | Quand elle s'exécute                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                      | Détecte les modifications uniquement de documentation, les portées modifiées, les extensions modifiées et construit le manifeste CI   | Toujours sur les poussées et PRs non-brouillons       |
| `security-scm-fast`              | Détection de clé privée et audit de workflow via `zizmor`                                                                             | Toujours sur les poussées et PRs non-brouillons       |
| `security-dependency-audit`      | Audit de lockfile de production sans dépendance contre les avis de sécurité npm                                                       | Toujours sur les poussées et PRs non-brouillons       |
| `security-fast`                  | Agrégat requis pour les tâches de sécurité rapides                                                                                    | Toujours sur les poussées et PRs non-brouillons       |
| `check-dependencies`             | Passe de production Knip dépendance-uniquement plus la garde de liste d'autorisation des fichiers inutilisés                          | Modifications pertinentes pour Node                   |
| `build-artifacts`                | Construction de `dist/`, interface utilisateur de contrôle, vérifications des artefacts construits et artefacts réutilisables en aval | Modifications pertinentes pour Node                   |
| `checks-fast-core`               | Volets de correction rapides Linux tels que les vérifications bundled/plugin-contract/protocol                                        | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels` | Vérifications de contrat de canal partitionnées avec un résultat de vérification agrégé stable                                        | Modifications pertinentes pour Node                   |
| `checks-node-core-test`          | Shards de tests de Node Core, à l'exclusion des canaux, bundles, contrats et voies d'extension                                        | Modifications pertinentes pour Node                   |
| `check`                          | Équivalent fragmenté de la passerelle locale principale : types de prod, lint, gardes, types de test et test de fumée strict          | Modifications pertinentes pour Node                   |
| `check-additional`               | Architecture, dérive de limite/invite fragmentée, gardes d'extension, limite de package et surveillance de passerelle                 | Modifications pertinentes pour Node                   |
| `build-smoke`                    | Tests de fumée CLI intégrés et test de fumée de mémoire de démarrage                                                                  | Modifications pertinentes pour Node                   |
| `checks`                         | Vérificateur pour les tests de canal d'artefacts construits                                                                           | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`      | Voie de construction et de test de compatibilité Node 22                                                                              | Répartition manuelle du CI pour les versions          |
| `check-docs`                     | Formatage, lint et vérification des liens brisés des docs                                                                             | Docs modifiés                                         |
| `skills-python`                  | Ruff + pytest pour les compétences Python                                                                                             | Modifications pertinentes pour les compétences Python |
| `checks-windows`                 | Tests de processus/chemin spécifiques à Windows plus régressions de spécificateurs d'importation d'exécution partagés                 | Modifications pertinentes pour Windows                |
| `macos-node`                     | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                             | Modifications pertinentes pour macOS                  |
| `macos-swift`                    | Lint, construction et tests Swift pour l'application macOS                                                                            | Modifications pertinentes pour macOS                  |
| `android`                        | Tests unitaires Android pour les deux saveurs plus une construction de debug APK                                                      | Modifications pertinentes pour Android                |
| `test-performance-agent`         | Optimisation quotidienne des tests lents Codex après une activité approuvée                                                           | Succès du CI principal ou répartition manuelle        |
| `openclaw-performance`           | Rapports de performance d'exécution Kova quotidiens/à la demande avec mock-provider, deep-profile et voies en direct GPT 5.4          | Répartition programmée et manuelle                    |

## Ordre échec-rapide

1. `preflight` décide quelles voies existent du tout. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de cette tâche, et non des tâches autonomes.
2. `security-scm-fast`, `security-dependency-audit`, `security-fast`, `check`, `check-additional`, `check-docs` et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de matrice de plateforme.
3. `build-artifacts`Linux chevauche les voies Linux rapides afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Ensuite, les voies de plateforme et d'exécution plus lourdes se déploient : `checks-fast-core`, `checks-fast-contracts-channels`, `checks-node-core-test`, `checks`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les tâches supplantées comme GitHub`cancelled` lorsqu'un envoi plus récent atterrit sur la même PR ou la référence `main`. Considérez cela comme du bruit CI, sauf si l'exécution la plus récente pour la même référence échoue également. Les vérifications agrégées de fragments utilisent `!cancelled() && always()` afin qu'elles signalent toujours les échecs normaux des fragments mais ne se mettent pas en file d'attente une fois que l'ensemble du workflow a déjà été supplanté. La clé de concurrence CI automatique est versionnée (`CI-v7-*`GitHub) afin qu'un zombie côté GitHub dans un ancien groupe de file d'attente ne puisse pas bloquer indéfiniment les nouvelles exécutions main. Les exécutions manuelles de la suite complète utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

La tâche `ci-timings-summary` télécharge un artefact `ci-timings-summary` compact pour chaque exécution CI non-brouillon. Elle enregistre le temps écoulé, le temps de file d'attente, les tâches les plus lentes et les tâches échouées pour l'exécution actuelle, afin que les vérifications de santé CI n'aient pas besoin d'extraire répétitivement la charge utile complète des Actions.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de la portée modifiée et fait agir le manifeste préliminaire comme si chaque zone délimitée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node ainsi que le linting des workflows, mais ne forcent pas les builds natifs Windows, Android ou macOS par elles-mêmes ; ces voies de plateforme restent limitées aux modifications des sources de la plateforme.
- **Les modifications relatives uniquement au routage CI, les modifications sélectionnées de fixtures de tests de base peu coûteuses et les modifications étroites d'aideurs/au routage de tests de contrat de plugin** utilisent un chemin de manifeste rapide uniquement Node : `preflight`, sécurité et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de channel, les shards complets du cœur, les shards de plugins groupés et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aideurs que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides de lanceur npm/pnpm/UI, à la configuration du gestionnaire de paquets, et aux surfaces de workflow CI qui exécutent cette voie ; les modifications de source non liées, de plugin, de smoke d'installation et de test uniquement restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont divisées ou équilibrées pour que chaque tâche reste petite sans sur-réserver les exécuteurs : les contrats de canal s'exécutent sous forme de trois shards pondérés soutenus par Blacksmith avec le repli sur l'exécuteur standard GitHub, les voies rapides/support des unités centrales s'exécutent séparément, l'infrastructure d'exécution centrale est répartie entre les shards d'état, de processus/configuration, de cron et partagés, la réponse automatique s'exécute en tant que workers équilibrés (avec le sous-arbre de réponse divisé en shards agent-runner, dispatch, et commandes/routage d'état), et les configurations de passerelle/serveur agentiques sont divisées entre les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests de navigateur étendus, QA, multimédia et de plugins divers utilisent leurs configurations Vitest dédiées au lieu du catch-all de plugin partagé. Les shards basés sur des modèles d'inclusion enregistrent des entrées de minutage en utilisant le nom du shard CI, afin que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration complète d'un shard filtré. `check-additional` maintient ensemble le travail de compilation/canary lié aux limites des packages et sépare l'architecture de la topologie d'exécution de la couverture de surveillance de la passerelle ; la liste des gardes de limite est répartie sur quatre shards de matrice, chacun exécutant des gardes indépendants sélectionnés simultanément et imprimant les minutages par vérification. La vérification coûteuse de la dérive des instantanés de prompt de happy-path Codex s'exécute en tant que tâche supplémentaire distincte pour le CI manuel et uniquement pour les modifications affectant les prompts, afin que les modifications Node normales non liées n'attendent pas derrière la génération d'instantanés de prompt à froid et que les shards de limite restent équilibrés tandis que la dérive de prompt reste liée à la PR qui l'a provoquée ; le même indicateur ignore la génération d'instantanés de prompt Vitest à l'intérieur du shard de limite de support central des artefacts construits. La surveillance de Gateway, les tests de canal et le shard de limite de support central s'exécutent simultanément dans `build-artifacts` après que `dist/` et `dist-runtime/` ont déjà été construits.

Android CI exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest`Android puis construit l'APK de débogage Play. La variante tierce n'a pas de jeu de sources ni de manifeste distincts ; sa voie de test unitaire compile toujours la variante avec les drapeaux BuildConfig SMS/call-log, tout en évitant une tâche de conditionnement APK de débogage en double à chaque poussée pertinente pour Android.

Le fragment `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendance uniquement épinglée à la dernière version de Knip, avec l'âge de publication minimum de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip avec `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non examiné ou laisse une entrée de liste d'autorisation obsolète, tout en préservant les surfaces de plug-in dynamique intentionnelles, générées, de construction, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml`OpenClawGitHub est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extrait pas ni n'exécute de code de demande de tirage (pull request) non fiable. Le flux de travail crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes de problèmes et de demandes de tirage ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires de problèmes ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau des commit sur les poussées `main` ;
- `github_activity`GitHub pour l'activité GitHub générale que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transmet uniquement les métadonnées normalisées : le type d'événement, l'action, l'acteur, le référentiel, le numéro de l'élément, l'URL, le titre, l'état et de courts extraits pour les commentaires ou les examens, le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, et non une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne doit publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, modifications, fluctuations de bots, bruits de webhooks en double et trafic d'examen normaux devraient entraîner `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de commit GitHub comme des données non fiables tout au long de ce chemin. Ce sont des entrées pour la synthèse et le triage, et non des instructions pour le workflow ou le runtime de l'agent.

## Répartitions manuelles

Les répartitions manuelles de CI exécutent le même graphe de tâches que la CI normale, mais forcent l'activation de chaque voie délimitée non Android : les shards Node Linux, les shards de plugins groupés, les contrats de canal, la compatibilité Node 22, `check`, `check-additional`, les tests de fumée de build, les vérifications de docs, les compétences Python, Windows, macOS et l'i18n de l'interface utilisateur de contrôle. Les répartitions manuelles autonomes de CI exécutent Android uniquement avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de prépublication de plugins, le shard `agentic-plugins` réservé à la publication, le balayage complet du lot d'extensions et les voies Docker de prépublication de plugins sont exclus de la CI. La suite de prépublication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow séparé `Plugin Prerelease` avec la porte de validation de publication activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète de candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée facultative `target_ref` permet à un appelant de confiance d'exécuter ce graphe sur une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow à partir de la référence de répartition sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | `preflight`, tâches de sécurité rapides et agrégations (`security-scm-fast`, `security-dependency-audit`, `security-fast`), vérifications rapides de protocole/contrat/groupées, vérifications de contrat de canal fragmentées, fragments `check` à l'exception de lint, agrégations `check-additional`, vérificateurs d'agrégats de tests Node, vérifications de documentation, compétences Python, workflow-sanity, labeler, réponse automatique ; l'avant-vol install-smoke utilise également Ubuntu hébergé par GitHub afin que la matrice Blacksmith puisse se mettre en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, fragments d'extension de poids inférieur, `checks-fast-core`, `checks-node-compat-node22`, `check-prod-types` et `check-test-types`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `blacksmith-8vcpu-ubuntu-2404`   | build-smoke, fragments de tests Node Linux, fragments de tests de plugins groupés, fragments `check-additional`, `android`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (assez sensibles au CPU pour que 8 vCPU coûtent plus qu'ils n'économisent) ; les builds Docker install-smoke (le temps d'attente dans la file 32-vCPU coûtait plus que ce qu'il économisait)                                                                                                                                                                                                                                                                                                                                                                          |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `blacksmith-6vcpu-macos-latest`  | `macos-node` sur `openclaw/openclaw` ; les bifurcations (forks) reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `blacksmith-12vcpu-macos-latest` | `macos-swift` sur `openclaw/openclaw` ; les bifurcations (forks) reviennent à `macos-latest`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Le CI du dépôt canonique conserve Blacksmith comme chemin d'exécuteur par défaut. Pendant `preflight`, `scripts/ci-runner-labels.mjs` vérifie les exécutions d'Actions récentes mises en file d'attente et en cours pour les tâches Blacksmith mises en file d'attente. Si une étiquette Blacksmith spécifique a déjà des tâches en file d'attente, les tâches en aval qui utiliseraient cette étiquette exacte reviennent à l'exécuteur hébergé par GitHub correspondant (`ubuntu-24.04`, `windows-2025` ou `macos-latest`) pour cette exécution uniquement. Les autres tailles Blacksmith de la même famille de système d'exploitation restent sur leurs étiquettes principales. Si la sonde de API échoue, aucun repli n'est appliqué.

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

Le déclenchement manuel effectue généralement un benchmark de la référence du workflow. Définissez `target_ref` pour effectuer un benchmark d'une étiquette de version ou d'une autre branche avec l'implémentation actuelle du workflow. Les chemins de rapport publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version épinglée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois voies :

- `mock-provider` : Scénarios de diagnostic Kova sur un runtime construit localement avec une authentification fictive compatible OpenAI déterministe.
- `mock-deep-profile` : Profilage CPU/tas/trace pour les points chauds de démarrage, passerelle et tour d'agent.
- `live-gpt54` : un tour d'agent OpenAI `openai/gpt-5.4` réel, ignoré lorsque `OPENAI_API_KEY` est indisponible.

Le lane mock-provider exécute également des sondes de source natives d'OpenClaw après le passage Kova : le temps de démarrage et la mémoire de la passerelle pour les cas de démarrage par défaut, hook et 50 plugins ; des boucles de salutation hello mock-OpenAI OpenClawOpenAI`channel-chat-baseline`CLI répétées ; et les commandes de démarrage CLI contre la passerelle démarrée. Le résumé Markdown de la sonde de source se trouve à `source/index.md` dans le bundle de rapport, avec le JSON brut à côté.

Chaque lane télécharge des artefacts GitHub. Lorsque GitHub`CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md` et les artefacts de sonde de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit en tant que `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel parapluie pour « tout exécuter avant la sortie ». Il accepte une branche, une balise ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease` pour la preuve de plugin/paquet/statique/Docker réservés à la sortie, et envoie `OpenClaw Release Checks` pour le test d'installation fumant, l'acceptation de paquet, les vérifications de paquet multi-OS, la parité du Lab QA, les voies Matrix et Telegram. Les exécutions stables/par défaut conservent une couverture exhaustive en direct/E2E et de la voie de sortie Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture d'absorption afin que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` par rapport à l'artefact `release-package-under-test` des vérifications de sortie. Après publication, passez `release_package_spec` pour réutiliser le paquet npm expédié entre les vérifications de sortie, l'acceptation de paquet, Docker, le multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un paquet différent.

Voir [Full release validation](/fr/reference/full-release-validation) pour la
matrice de stages, les noms exacts des jobs de workflow, les différences de profil, les artefacts et
les poignées de relancement ciblées.

`OpenClaw Release Publish` est le workflow de sortie mutante manuel. Déclenchez-le
à partir de `release/YYYY.M.D` ou `main` après que la balise de sortie existe et après que
la pré-vérification OpenClaw npm ait réussi. Il vérifie `pnpm plugins:sync:check`,
envoie `Plugin NPM Release` pour tous les paquets de plugins publiables, envoie
`Plugin ClawHub Release` pour le même SHA de sortie, et ensuite seulement envoie
`OpenClaw NPM Release` avec le `preflight_run_id` sauvegardé.

```bash
gh workflow run openclaw-release-publish.yml \
  --ref release/YYYY.M.D \
  -f tag=vYYYY.M.D-beta.N \
  -f preflight_run_id=<successful-openclaw-npm-preflight-run-id> \
  -f npm_dist_tag=beta
```

Pour une preuve de commit épinglé sur une branche à évolution rapide, utilisez le helper à la place de
`gh workflow run ... --ref main -f ref=<sha>` :

```bash
pnpm ci:full-release --sha <full-sha>
```

Les références de dispatch de workflow GitHub doivent être des branches ou des balises, et non des SHAs de commit bruts. L'assistant crée une branche `release-ci/<sha>-...` temporaire au SHA cible, effectue un dispatch de `Full Release Validation` depuis cette référence épinglée, vérifie que chaque `headSha` de workflow enfant correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si un workflow enfant s'est exécuté à un SHA différent.

`release_profile` contrôle l'étendue live/provider transmise aux vérifications de version. Les workflows de version manuels sont définis par défaut sur `stable` ; utilisez `full` uniquement lorsque vous souhaitez explicitement la matrice large de provider/média consultative. `run_release_soak` contrôle si les vérifications de version stables par défaut exécutent le test de résistance (soak) complet live/E2E et du chemin de version Docker ; `full` force l'activation du test de résistance.

- `minimum` conserve les voies les plus rapides critiques pour la version OpenAI/core.
- `stable` ajoute l'ensemble stable de providers/backends.
- `full` exécute la matrice large de provider/média consultative.

Le parapluie enregistre les identifiants des exécutions enfants dispatchées, et le travail final `Verify full validation` vérifie à nouveau les conclusions des exécutions enfants actuelles et ajoute les tableaux des travaux les plus lents pour chaque exécution enfant. Si un workflow enfant est réexécuté et passe au vert, réexécutez uniquement le travail de vérificateur parent pour rafraîchir le résultat du parapluie et le résumé des durées.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant complet normal de la CI, `plugin-prerelease` pour uniquement l'enfant de préversion du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de maintenir borné le réexécution d'une version échouée après une correction ciblée. Pour une seule voie inter-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes inter-OS longues émettent des lignes de battement de cœur et les résumés de mise à niveau de paquets incluent des timings par phase. Les voies de vérification de version QA sont consultatives, les échecs QA uniquement émettent donc un avertissement mais ne bloquent pas le vérificateur de vérification de version.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois dans une archive `release-package-under-test`, puis transmet cet artefact aux vérifications inter-OS et à l'acceptation des paquets, ainsi qu'au workflow de version de chemin de diffusion en direct/E2E Docker lorsque la couverture de trempe s'exécute. Cela permet de maintenir la cohérence des octets de paquets entre les boîtes de version et d'éviter le reconditionnement du même candidat dans plusieurs travaux enfants.

Les exécutions en double de `Full Release Validation` pour `ref=main` et `rerun_group=all`
remplacent l'ancien parapluie. Le moniteur parent annule tout workflow enfant qu'il
a déjà distribué lorsque le parent est annulé, de sorte que la validation principale
plus récente ne reste pas derrière une exécution de vérification de version de deux heures périmée. La validation de branche/étiquette de version
et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant de version en direct/E2E conserve une couverture `pnpm test:live` native étendue, mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail série :

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

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des échecs lents des providers en direct. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions ponctuelles manuelles.

Les shards de média natifs en direct s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les tâches média ne vérifient que les binaires avant la configuration. Conservez les suites de tests en direct basées sur Docker sur les runners Blacksmith normaux — les tâches conteneur ne sont pas l'endroit approprié pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image `ghcr.io/openclaw/openclaw-live-test:<sha>` partagée distincte par commit sélectionné. Le workflow de publication en direct construit et pousse cette image une seule fois, puis les shards de modèle en direct Docker, de Gateway partitionné par provider, de backend CLI, de liaison ACP et de harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`. Les shards Gateway Docker comportent des limites `timeout` explicites au niveau du script, inférieures au délai d'attente du job de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement plutôt que de consommer l'ensemble du budget de vérification de publication. Si ces shards reconstruisent indépendamment la cible source complète Docker, l'exécution de la publication est mal configurée et gaspillera du temps d'horloge sur des constructions d'images en double.

## Acceptation des paquets

Utilisez `Package Acceptance` lorsque la question est « ce paquet installable OpenClaw fonctionne-t-il comme un produit ? ». Il diffère de la CI normale : la CI normale valide l'arborescence des sources, tandis que l'acceptation des paquets valide une seule archive tar via le même harnais E2E Docker que les utilisateurs exercent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de package, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test` et imprime la source, la référence du workflow, la référence du package, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive, prépare les images Docker de digestion de package si nécessaire et exécute les voies Docker sélectionnées par rapport à ce package au lieu d'emballer l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes` ciblées, le workflow réutilisable prépare le package et les images partagées une seule fois, puis répartit ces voies en tant que tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle `NPM Telegram Beta E2E` en option. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test` lorsque l'acceptation des packages en a résolu un ; un envoi autonome Telegram peut toujours installer une spécification npm publiée.
4. `summary` fait échouer le workflow si la résolution du package, l'acceptation Docker ou la voie Telegram en option ont échoué.

### Sources de candidats

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest` ou une version de release exacte OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation des pré-versions/stables publiées.
- `source=ref` compresse une branche `package_ref`OpenClaw de confiance, une balise ou un SHA de commit complet. Le résolveur récupère les branches/balises OpenClaw, vérifie que le commit sélectionné est accessible à partir de l'historique des branches du dépôt ou d'une balise de version, installe les dépendances dans un arbre de travail détaché et le compresse avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge une ressource `.tgz` via HTTPS ; `package_sha256` est requis.
- `source=artifact` télécharge une ressource `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est compressé lors de `source=ref`. Cela permet au harnais de test actuel de valider d'anciens commits source de confiance sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — morceaux complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis lors de `suite_profile=custom`

Le profil `package` utilise une couverture de plugins hors ligne, de sorte que la validation des packages publiés n'est pas conditionnée à la disponibilité de ClawHub en ligne. La voie optionnelle Telegram réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spec npm publié conservé pour les envois autonomes.

Pour la politique dédiée aux tests de mise à jour et de plugins, y compris les commandes locales,
les voies Docker, les entrées de Package Acceptance, les valeurs par défaut de version et le triage des échecs,
voyez [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les contrôles de version appellent Package Acceptance avec `source=artifact`, l'artefact du package de version préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`. Cela permet de maintenir la migration de package, la mise à jour, l'installation de compétence live ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation de l'installation de plugins configurés, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive tar de package résolue. Définissez `release_package_spec` sur la validation complète de version ou sur les contrôles de version OpenClaw après la publication d'une bêta pour exécuter la même matrice sur le package npm expédié sans reconstruction ; définissez `package_acceptance_package_spec` uniquement lorsque Package Acceptance a besoin d'un package différent du reste de la validation de version. Les contrôles de version multi-OS couvrent toujours l'intégration spécifique à l'OS, l'installateur et le comportement de la plateforme ; la validation du produit de package/mise à jour doit commencer par Package Acceptance. Le voie Docker `published-upgrade-survivor` valide une ligne de base de package publiée par exécution dans le chemin de publication bloquant. Dans Package Acceptance, l'archive tar `package-under-test` résolue est toujours la candidate et `published_upgrade_survivor_baseline` sélectionne la ligne de base publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de voie échouée préservent cette ligne de base. La validation complète de version avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues` pour s'étendre sur les quatre dernières versions stables npm, plus les versions de limite de compatibilité des plugins épinglées et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona conservés, les installations de plugins OpenClaw configurés, les chemins de journal tilde et les racines de dépendance de plugins hérités obsolètes. Les sélections survivantes de mise à niveau publiée multi-lignes de base sont partitionnées par ligne de base en travaux de runner Docker distincts et ciblés. Le workflow distinct `Update Migration` utilise la voie Docker `update-migration` avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale de la CI de version complète. Les exécutions agrégées locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la ligne de base avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json` et sonde `/healthz`, `/readyz`, ainsi que le statut RPC après le démarrage du Gateway. Les voies fraîches de package et d'installateur Windows vérifient également qu'un package installé peut importer une substitution de contrôle de navigateur à partir d'un chemin absolu brut Windows. Le test de fumée de tour d'agent multi-OS OpenAI par défaut est `OPENCLAW_CROSS_OS_OPENAI_MODEL` s'il est défini, sinon `openai/gpt-5.4`, afin que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritées

Package Acceptance dispose de fenêtres de compatibilité héritée délimitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis du tarball ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les pnpm `patchedDependencies` manquants du fixture git factice dérivé du tarball et peut consigner les `update.channel` persistantes manquantes ;
- les tests de fumée de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation sur la marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement de non-réinstallation restent inchangés.

Le package publié `2026.4.26` peut également avertir concernant les fichiers d'horodatage des métadonnées de build locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire aux contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance`Docker et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`Docker, les journaux de voie, les minutages de phase et les commandes de réexécution. Préférez la réexécution du profil de package ayant échoué ou des voies Docker exactes plutôt que la réexécution de la validation complète de version.

## Test de fumée d'installation

Le workflow séparé `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions en **Fast path** pour les demandes de tirage (pull requests) touchant les surfaces Docker/package, les changements de package/manifest de plugin groupé, ou les surfaces principales de plugin/channel/gateway/Plugin SDK que les jobs de smoke Docker exercent. Les changements de plugin groupé source-only, les modifications test-only et les modifications docs-only ne réservent pas de workers Docker. Le fast path construit l'image racine Dockerfile une fois, vérifie le CLI, exécute les agents delete shared-workspace CLI smoke, exécute le container gateway-network e2e, vérifie un arg de build d'extension groupée, et exécute le profil Docker de plugin groupé borné sous un délai d'expiration de commande global de 240 secondes (chaque exécution Docker de scénario est plafonnée séparément).
- Le **Full path** conserve la couverture d'installation de package QR et Docker de mise à jour de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles (dispatches), les vérifications de release par appel de workflow, et les demandes de tirage qui touchent vraiment les surfaces de l'installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image smoke Dockerfile racine GHCR target-SHA, puis exécute l'installation de package QR, les smokes racine Dockerfile/gateway, les smokes de l'installateur/mise à jour, et l'E2E Docker rapide de plugin groupé en tant que jobs distincts afin que le travail de l'installateur n'attende pas derrière les smokes de l'image racine.

Les poussées `main`Docker (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique de portée modifiée demanderait une couverture complète lors d'une poussée, le workflow conserve la fumée Docker rapide et laisse la fumée d'installation complète aux exécutions nocturnes ou aux validations de version.

Le test de fumée lent d'installation globale de fournisseur d'image Bun est séparément contrôlé par Bun`run_bun_global_install_smoke`. Il s'exécute selon la planification nocturne et à partir du flux de travail des vérifications de version, et les envois manuels `Install Smoke` peuvent l'activer, mais ce n'est pas le cas pour les demandes de tirage et les poussées `main`Docker. Les tests QR et d'installateur Docker conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm pré-construit une image de test en direct partagée, empaquète OpenClaw une fois en tant que tarball npm, et construit deux images `scripts/e2e/Dockerfile` partagées :

- un runner Node/Git nu pour les voies d'installation/de mise à jour/de dépendances de plugin ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normales.

Les définitions des voies Docker résident dans Docker`scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs`, et l'exécuteur exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                                     |
| -------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                          |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de queue sensibles au fournisseur.                                                                          |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite concurrente de voies en direct pour éviter la limitation par les fournisseurs.                                                     |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite concurrente de voies d'installation npm.                                                                                           |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite concurrente de voies multi-services.                                                                                               |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Échelonnez les démarrages des voies pour éviter les tempêtes de création du démon Docker ; définissez Docker`0` pour aucun échelonnement. |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/tail sélectionnées utilisent des limites plus strictes.                            |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` imprime le plan du planificateur sans exécuter les voies.                                                                             |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage pour que les agents puissent reproduire une voie échouée.           |

Une voie plus lourde que sa limite effective peut toujours démarrer depuis un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégateur local effectue des prévols sur Docker, supprime les conteneurs E2E OpenClaw périmés, émet le statut des voies actives, persiste les durées des voies pour un ordre du plus long au plus court, et arrête par défaut la planification de nouvelles voies groupées après le premier échec.

### Workflow live/E2E réutilisable

Le workflow réutilisable live/E2E demande à `scripts/test-docker-all.mjs --plan-json` quel package, type d'image, image live, voie et couverture d'informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquette soit OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse des images E2E Docker nues/fonctionnelles étiquetées avec le digest du package via le cache de calques Docker de Blacksmith lorsque le plan nécessite des voies avec des packages installés ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes de digest de package au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente limité de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'CI.

### Morceaux du chemin de release

La couverture Docker de version exécute des tâches plus petites et découpées avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, afin que chaque morceau ne tire que le type d'image dont il a besoin et exécute plusieurs voies via le même ordonnanceur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les morceaux Docker de la version actuelle sont `core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` via `plugins-runtime-install-h`. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies d'installation de fournisseur.

OpenWebUI est intégré dans `plugins-runtime-services` lorsque la couverture complète du chemin de versionnement le demande, et conserve un segment `openwebui`npm autonome uniquement pour les répartitions exclusives à OpenWebUI. Les voies de mise à jour du canal groupé réessaient une fois en cas d'erreurs réseau transitoires npm.

Chaque segment téléverse `.artifacts/docker-tests/` avec les journaux des voies, les minutages, `summary.json`, `failures.json`, les minutages des phases, le JSON du planificateur, les tables de voies lentes, et les commandes de réexécution par voie. L'entrée `docker_lanes`DockerDockerGitHub du workflow exécute les voies sélectionnées sur les images préparées plutôt que sur les tâches du segment, ce qui limite le débogage des voies échouées à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de package pour cette exécution ; si une voie sélectionnée est une voie Docker en direct, la tâche ciblée construit l'image de test en direct localement pour cette réexécution. Les commandes de réexécution GitHub par voie générées incluent `package_artifact_run_id`, `package_artifact_name`, et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le package exact et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié en direct/E2E exécute quotidiennement la suite complète Docker du chemin de publication.

## Prépublication de plugin

`Plugin Prerelease` est une couverture produit/package plus coûteuse, c'est donc un workflow séparé réparti par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées `main`DockerDocker et les répartitions manuelles autonomes de CI désactivent cette suite. Elle équilibre les tests de plugins groupés sur huit workers d'extension ; ces tâches de fragments d'extension exécutent jusqu'à deux groupes de configuration de plugins à la fois avec un worker Vitest par groupe et un tas Node plus important, de sorte que les lots de plugins gourmands en importations ne créent pas de tâches CI supplémentaires. Le chemin de pré-versionnement Docker uniquement pour la version regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow téléverse également un artefact d'information `plugin-inspector-advisory` à partir de `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont une entrée de triage et ne modifient pas la porte de blocage Plugin Prerelease.

## QA Lab

Le QA Lab dispose de voies de CI dédiées en dehors du flux de travail principal à portée intelligente. La parité agentic est imbriquée sous les harnais QA et release plus larges, et non dans un flux de travail PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit être incluse dans une exécution de validation large.

- Le flux de travail `QA-Lab - All Lanes` s'exécute chaque nuit sur `main` et lors d'une répartition manuelle ; il déploie la voie de parité simulée, la voie Matrix en direct, et les voies Telegram et Discord en direct en tant que tâches parallèles. Les tâches en direct utilisent l'environnement `qa-live-shared`, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport en direct Matrix et Telegram avec le provider simulé déterministe et des modèles qualifiés simulés (`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`) afin que le contrat de channel soit isolé de la latence du modèle en direct et du démarrage normal du plugin provider. La passerelle de transport en direct désactive la recherche mémoire car la parité QA couvre le comportement mémoire séparément ; la connectivité du provider est couverte par les suites distinctes de modèle en direct, de provider natif et de provider Docker.

Matrix utilise `--profile fast` pour les tâches planifiées et les portes de release, en ajoutant `--fail-fast` uniquement lorsque la CLI extraite le prend en charge. La valeur par défaut de la CLI et l'entrée de flux de travail manuel restent `all` ; la répartition manuelle `matrix_profile=all` fractionne toujours la couverture complète du Matrix en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies du QA Lab critiques pour la release avant l'approbation de celle-ci ; sa porte de parité QA exécute les packs candidats et de base en tant que tâches de voie parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normaux, suivez les preuves CI/check délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non un balayage complet du référentiel. Les exécutions quotidiennes, manuelles et de garde des demandes de tirage (pull requests) non brouillons scannent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité à haute confiance filtrées pour les niveaux `security-severity` élevés/critiques.

La garde des demandes de tirage reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. Les analyses CodeQL pour Android et macOS restent exclues des valeurs par défaut pour les PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, et passerelle de base (gateway baseline)                                                                                                            |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation du canal principal (core channel) plus le runtime du plugin de canal, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit        |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de stratégie SSRF principales, d'analyse IP, de garde réseau, de récupération web et de stratégie SSRF du Plugin SDK                                                     |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution d'outils d'agent                                                                      |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de paquets, chargement de source et surfaces de confiance du contrat de package du SDK Plugin |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — fragment de sécurité Android planifié. Construit l'application Android manuellement pour CodeQL sur le plus petit runner Blacksmith Linux accepté par la sanity du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragment de sécurité macOS hebdomadaire/manuel. Construit l'application macOS manuellement pour CodeQL sur Blacksmith macOS, filtre les résultats de build des dépendances du SARIF téléversé, et téléverse sous `/codeql-critical-security/macos`. Gardé en dehors des valeurs par défaut quotidiennes car le build macOS domine le temps d'exécution même lorsqu'il est propre.

### Catégories de qualité critique

`CodeQL Critical Quality` est le shard non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript non liées à la sécurité et de gravité erreur sur des surfaces de grande valeur restreintes, sur le runner Blacksmith Linux plus petit. Sa garde de pull request est intentionnellement plus petite que le profil planifié : les PR non-brouillon n'exécutent que les shards `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` correspondants pour l'exécution de commande d'agent/model/tool et le code de dispatch de réponse, le code de schéma/migration/E/S de configuration, le code d'auth/secrets/sandbox/sécurité, le runtime du plugin channel principal et groupé, le protocole/serveur-méthode de passerelle, la colle runtime/SDK de mémoire, la livraison MCP/processus/sortant, le catalogue runtime/model de provider, les files d'attente de diagnostics/livraison de session, le chargeur de plugin, le contrat-paquet/Plugin SDK, ou les modifications du runtime de réponse du Plugin SDK. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze shards de qualité de PR.

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

Le workflow `Docs Agent` est une voie de maintenance Codex basée sur les événements pour garder la documentation existante alignée avec les récents changements intégrés. Il n'a pas de calendrier pur : une exécution CI de push non-bot réussie sur `main` peut le déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations de workflow-run sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution non ignorée de Docs Agent a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits depuis le SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, de sorte qu'une exécution horaire peut couvrir tous les changements principaux accumulés depuis la dernière passe de documentation.

### Agent de performance de test

Le workflow `Test Performance Agent` est une voie de maintenance Codex basée sur les événements pour les tests lents. Il n'a pas de calendrier pur : une exécution CI de push non-bot réussie sur `main` peut le déclencher, mais il est ignoré si une autre invocation de workflow-run a déjà été exécutée ou est en cours ce jour-là (UTC). La répartition manuelle contourne cette barrière d'activité quotidienne. La voie construit un rapport de performance Vitest groupé pour la suite complète, permet à Codex de faire uniquement de petites corrections de performance de tests préservant la couverture au lieu de refactorisations larges, puis réexécute le rapport complet et rejette les changements qui réduisent le nombre de tests de base réussis. Si la base contient des tests échouant, Codex peut corriger uniquement les échecs évidents et le rapport complet après l'agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot n'aboutisse, la voie rebascule le patch validé, réexécute `pnpm check:changed` et réessaie le push ; les patches obsolètes en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

### PRs en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow manuel de mainteneur pour le nettoyage des doublons après intégration. Il est par défaut en mode dry-run (simulation) et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR intégré a été fusionné et que chaque doublon a soit un problème référencé partagé, soit des morceaux de changements se chevauchant.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale de voie modifiée réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte concernant les limites de l'architecture que la portée générale de la plateforme CI :

- les modifications de production de base exécutent core prod et core test typecheck plus core lint/guards ;
- les modifications de test uniquement de base n'exécutent que core test typecheck plus core lint ;
- les modifications de production d'extension exécutent extension prod et extension test typecheck plus extension lint ;
- les modifications de test uniquement d'extension exécutent extension test typecheck plus extension lint ;
- les modifications du Plugin SDK public ou du plugin-contract s'étendent à l'extension typecheck car les extensions dépendent de ces contrats de base (les parcours d'extension Vitest restent un travail de test explicite) ;
- les mises à jour de version de métadonnées uniquement exécutent des vérifications ciblées de version/configuration/dépendances racine ;
- les modifications inconnues de la racine ou de la configuration échouent en mode sûr sur toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes des tests s'exécutent elles-mêmes, les modifications du code source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison pour les salles de groupe partagées est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de la réponse source, ou de l'invite système du message-tool passent par les tests de réponse de base ainsi que les régressions de livraison Discord et Slack afin qu'un changement de valeur par défaut partagé échoue avant le premier push de PR. N'utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` que lorsque la modification est suffisamment large pour que l'ensemble mappé peu coûteux ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est le wrapper de boîte distante appartenant au dépôt pour la preuve Linux des mainteneurs. Utilisez-le
à partir de la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI
importe, ou lorsque la preuve nécessite des secrets, Docker, des voies de packages,
des boîtes réutilisables ou des journaux distants. Le backend OpenClaw normal est
`blacksmith-testbox` ; la capacité AWS/Hetzner détenue est un secours pour les pannes
de Blacksmith, les problèmes de quota ou les tests explicites de capacité détenue.

Les exécutions Blacksmith soutenues par Crabbox effectuent les étapes warm, claim, sync, run, report et clean up
pour des Testboxes ponctuels. Le contrôle de cohérence de synchronisation intégré échoue rapidement lorsque les fichiers racine requis
tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short`
affiche au moins 200 suppressions suivies. Pour les PR avec suppressions intentionnellement volumineuses, définissez
`OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox met également fin à une invocation locale CLI de Blacksmith qui reste dans la
phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez
`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée
pour les différences locales inhabituellement grandes.

Avant une première exécution, vérifiez l'enveloppe à partir de la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

L'enveloppe du dépôt refuse un binaire Crabbox périmé qui n'annonce pas `blacksmith-testbox`. Passez le provider explicitement même si `.crabbox.yaml` a des valeurs par défaut pour owned-cloud. Dans les worktrees Codex ou les extraits liés/sparse, évitez le script local `pnpm crabbox:run` car pnpm peut réconcilier les dépendances avant le démarrage de Crabbox ; invoquez plutôt directement l'enveloppe node :

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions Crabbox ponctuelles soutenues par Blacksmith doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes en direct et n'arrêtez que celles que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, n'utilisez le Blacksmith direct que pour les diagnostics tels que `list`, `status` et le nettoyage. Corrigez le chemin Crabbox avant de traiter une exécution Blacksmith directe comme une preuve de maintenance.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux warmups restent `queued` sans IP ni d'URL d'exécution Actions après quelques minutes, considérez cela comme une pression du provider, de la file d'attente, de la facturation ou de la limite d'organisation de Blacksmith. Arrêtez les ids en file d'attente que vous avez créés, évitez de démarrer davantage de Testboxes et déplacez la preuve vers le chemin de capacité Crabbox propriétaire ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Passez à la capacité Crabbox possédée uniquement lorsque Blacksmith est en panne, limité par quota, manque l'environnement nécessaire, ou si la capacité possédée est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "env NODE_OPTIONS=--max-old-space-size=4096 OPENCLAW_TEST_PROJECTS_PARALLEL=6 OPENCLAW_VITEST_MAX_WORKERS=1 OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=900000 pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Sous pression AWS, évitez `class=beast` sauf si la tâche nécessite vraiment un CPU de classe 48xlarge. Une requête `beast` commence à 192 vCPUs et c'est le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` détenu par le dépôt est configuré par défaut sur `standard`, plusieurs régions de capacité et `capacity.hints: true` afin que les baux AWS négociés affichent la région/marché sélectionnée, la pression sur le quota, le repli Spot et les avertissements de classe haute pression. Utilisez `fast` pour des vérifications générales plus lourdes, `large` uniquement après que standard/rapide ne suffisent plus, et `beast` uniquement pour les voies exceptionnellement liées au CPU telles que les matrices Docker complète suite ou tous plugins, la validation explicite de version/bloquant, ou le profilage de performance multi-cœur élevé. N'utilisez pas `beast` pour `pnpm check:changed`, les tests ciblés, le travail uniquement documentation, le lint/typecheck ordinaire, les petites reproductions E2E, ou le triage des pannes Blacksmith. Utilisez `--market on-demand` pour le diagnostic de capacité afin que l'instabilité du marché Spot ne soit pas mélangée au signal.

`.crabbox.yaml` possède les valeurs par défaut du fournisseur (provider), de la synchronisation et de l'hydratation des GitHub Actions pour les voies owned-cloud. Il exclut le `.git` local afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les dépôts distants et les magasins d'objets locaux du mainteneur, et il exclut les artefacts d'exécution/construction locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère le checkout, la configuration Node/pnpm, la récupération `origin/main` et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

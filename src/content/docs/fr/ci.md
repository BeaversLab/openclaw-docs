---
summary: "Graphe de tâches CI, portées des scopes, parapluies de publication, et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI OpenClaw s'exécute à chaque poussée vers `main` et à chaque pull request. La tâche `preflight` classe la diff et désactive les voies coûteuses lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch` contournent intentionnellement la portée intelligente et déploient le graphe complet pour les candidats à la publication et les validations larges. Les voies Android restent en option via `include_android`. La couverture des plugins uniquement pour les publications réside dans le workflow distinct [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

## Aperçu du pipeline

| Tâche                              | Objectif                                                                                                                                                                   | Quand elle s'exécute                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                        | Détecter les modifications de docs uniquement, les portées modifiées, les extensions modifiées, et construire le manifeste CI                                              | Toujours sur les poussées et PR non brouillons        |
| `security-fast`                    | Détection de clé privée, audit de workflow via `zizmor`, et audit du lockfile de production                                                                                | Toujours sur les poussées et PR non brouillons        |
| `check-dependencies`               | Passe de production Knip dépendances uniquement plus la garde de liste d'autorisation de fichiers inutilisés                                                               | Modifications pertinentes pour Node                   |
| `build-artifacts`                  | Construction de `dist/`, interface utilisateur de contrôle, tests de fumée de la CLI intégrée, vérifications des artefacts intégrés, et artefacts réutilisables            | Modifications pertinentes pour Node                   |
| `checks-fast-core`                 | Voies de correction rapides Linux telles que groupées, protocole, et vérifications de routage CI                                                                           | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-plugins-*`  | Deux vérifications de contrat de plugin partitionnées                                                                                                                      | Modifications pertinentes pour Node                   |
| `checks-fast-contracts-channels-*` | Deux vérifications de contrat de channel partitionnées                                                                                                                     | Modifications pertinentes pour Node                   |
| `checks-node-core-*`               | Partitions de tests Node Core, excluant les voies channel, bundled, contract, et extension                                                                                 | Modifications pertinentes pour Node                   |
| `check-*`                          | Équivalent local fragmenté de la porte principale (main gate) : types de production, lint, gardes, types de tests et test de fumée strict                                  | Modifications pertinentes pour Node                   |
| `check-additional-*`               | Architecture, dérive de la frontière/prompt fragmenté, gardes d'extension, frontière du package et topologie du runtime                                                    | Modifications pertinentes pour Node                   |
| `checks-node-compat-node22`        | Voie de compilation et de test de fumée de compatibilité Node 22                                                                                                           | Distribution manuelle CI pour les versions            |
| `check-docs`                       | Formatage, lint et vérifications des liens brisés pour la documentation                                                                                                    | Documentation modifiée                                |
| `skills-python`                    | Ruff + pytest pour les compétences (skills) sous-tendues par Python                                                                                                        | Modifications pertinentes pour les compétences Python |
| `checks-windows`                   | Tests de processus/chemin spécifiques à Windows et régressions de spécificateurs d'import du runtime partagé                                                               | Modifications pertinentes pour Windows                |
| `macos-node`                       | Voie de test TypeScript macOS utilisant les artefacts construits partagés                                                                                                  | Modifications pertinentes pour macOS                  |
| `macos-swift`                      | Lint, compilation et tests Swift pour l'application macOS                                                                                                                  | Modifications pertinentes pour macOS                  |
| `android`                          | Tests unitaires Android pour les deux variantes plus une compilation APK de debug                                                                                          | Modifications pertinentes pour Android                |
| `test-performance-agent`           | Optimisation quotidienne des tests lents Codex après une activité de confiance                                                                                             | Succès du CI principal ou distribution manuelle       |
| `openclaw-performance`             | Rapports de performance du runtime Kova quotidiens/à la demande avec lanes de fournisseur simulé (mock-provider), de profilage profond (deep-profile) et en direct GPT 5.5 | Distribution planifiée et manuelle                    |

## Ordre d'échec rapide (fail-fast)

1. `preflight` décide quelles lanes existent du tout. La logique `docs-scope` et `changed-scope` sont des étapes à l'intérieur de ce travail, et non des travaux autonomes.
2. `security-fast`, `check-*`, `check-additional-*`, `check-docs` et `skills-python` échouent rapidement sans attendre les travaux plus lourds d'artefacts et de matrice de plateforme.
3. `build-artifacts` chevauche les lanes Linux rapides afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les lanes de plateforme et d'exécution plus lourdes se déploient ensuite : `checks-fast-core`, `checks-fast-contracts-plugins-*`, `checks-fast-contracts-channels-*`, `checks-node-core-*`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les jobs supplantés comme GitHub`cancelled` lorsqu'un push plus récent arrive sur la même PR ou la réf `main`Matrix. Considérez cela comme du bruit CI, sauf si l'exécution la plus récente pour la même réf échoue également. Les jobs Matrix utilisent `fail-fast: false`, et `build-artifacts` signale directement les échecs du channel intégré, de la frontière de support du cœur (core-support-boundary) et de la surveillance de la passerelle (gateway-watch) au lieu de mettre en file d'attente de minuscules jobs de vérification. La clé de concurrence CI automatique est versionnée (`CI-v7-*`GitHub) afin qu'un zombie côté GitHub dans un ancien groupe de file d'attente ne puisse pas bloquer indéfiniment les nouvelles exécutions sur main. Les exécutions manuelles complètes de la suite utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

Utilisez `pnpm ci:timings`, `pnpm ci:timings:recent` ou `node scripts/ci-run-timings.mjs <run-id>` pour résumer le temps écoulé, le temps d'attente, les jobs les plus lents, les échecs et la barrière de déploiement `pnpm-store-warmup`GitHub de GitHub Actions. La CI télécharge également le même résumé d'exécution en tant qu'artefact `ci-timings-summary`. Pour le chronométrage de la build, vérifiez l'étape `Build dist` du job `build-artifacts` : `pnpm build:ci-artifacts` affiche `[build-all] phase timings:` et inclut `ui:build` ; le job télécharge également l'artefact `startup-memory`.

Pour les exécutions de pull request, le job terminal timing-summary exécute l'assistant à partir de la révision de base approuvée avant de passer `GH_TOKEN` à `gh run view`. Cela permet de garder la requête tokenisée hors du code contrôlé par la branche tout en résumant l'exécution CI actuelle de la pull request.

## Preuve du comportement réel

Les PR des contributeurs externes exécutent une porte `Real behavior proof` à partir de
`.github/workflows/real-behavior-proof.yml`. Le workflow extrait le commit de base de confiance
et évalue uniquement le corps de la PR ; il n'exécute pas le code de la
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
réelle. Les captures d'écran, les enregistrements, les captures de terminal, la sortie de la console, la sortie en direct
copiée, les journaux d'exécuration expurgés et les artefacts liés comptent tous. Les tests unitaires, les simulations,
les instantanés, les linters, les vérifications de type et les résultats de CI sont des vérifications de soutien utiles,
mais ils ne satisfont pas à eux seuls cette porte.

Lorsque la vérification échoue, mettez à jour le corps de la PR au lieu de pousser un autre commit de code.
Les mainteneurs peuvent appliquer `proof: override` uniquement lorsque la porte de preuve ne doit pas
s'appliquer à cette PR.

## Portée et routage

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de la portée modifiée et fait en sorte que le manifeste préliminaire agisse comme si chaque zone délimitée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas les builds natifs Windows, Android ou macOS par eux-mêmes ; ces voies de plateforme restent limitées aux modifications de la source de la plateforme.
- **Les docs sur les pushes `main`** sont vérifiés par le workflow autonome `Docs` avec le même miroir de docs ClawHub utilisé par la CI, de sorte que les pushes mixtes code+docs ne mettent pas non plus en file d'attente le shard CI `check-docs`. Les demandes d'extraction et la CI manuelle exécutent toujours `check-docs` à partir de la CI lorsque les docs sont modifiés.
- **TUI PTY** est un workflow ciblé pour les modifications de TUI. Il exécute `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` sur Linux Node 24 pour `src/tui/**`, le harnais de surveillance (watch harness), le script de package, le fichier de verrouillage et les modifications du workflow. La voie obligatoire utilise une fixture `TuiBackend` déterministe ; le test de fumée `tui --local` plus lent est optionnel avec `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1`\*\* et simule uniquement le point de terminaison du modèle externe.
- **Les modifications de routage CI uniquement, les modifications sélectionnées de fixtures de tests principaux peu coûteuses et les modifications étroites d'aide de contrat de plugin/test de routage** utilisent un chemin de manifeste rapide uniquement pour Node : `preflight`, sécurité et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de build, la compatibilité Node 22, les contrats de canal, les fragments complets du cœur, les fragments de plugins groupés et les matrices de garde supplémentaires lorsque la modification est limitée aux surfaces de routage ou d'aide que la tâche rapide exerce directement.
- **Les vérifications Node Windows** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécution de runner npm/pnpm/UI, à la configuration du gestionnaire de packages et aux surfaces de workflow CI qui exécutent cette voie ; les modifications non liées de la source, des plugins, du test d'installation (install-smoke) et des tests uniquement restent sur les voies Node Linux.

Les familles de tests Node les plus lentes sont réparties ou équilibrées afin que chaque tâche reste de taille réduite sans sur-réserver les runners : les contrats de plugins et les contrats de canal s'exécutent chacun sous la forme de deux partitions pondérées prises en charge par Blacksmith avec le repli standard vers le runner GitHub, les voies rapides/support de l'unité principale s'exécutent séparément, l'infra d'exécution principale est répartie entre l'état, le processus/config, le partagé et trois partitions de domaine cron, la réponse automatique s'exécute sous forme de workers équilibrés (avec le sous-arbre de réponse réparti en partitions agent-runner, dispatch et commands/state-routing), et les configurations agentic gateway/server sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests étendus de navigateur, QA, multimédia et divers de plugins utilisent leurs propres configurations Vitest au lieu de la configuration globale de rattrapage des plugins. Les partitions basées sur des modèles d'inclusion enregistrent des entrées de minutage en utilisant le nom de la partition CI, de sorte que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration complète d'une partition filtrée. `check-additional-*` regroupe le travail de compilation/canary des limites de paquets et sépare l'architecture de la topologie d'exécution de la couverture de surveillance du Gateway ; la liste des gardes de frontière est divisée en une partition lourde en prompts et une partition combinée pour les bandes de garde restantes, chacune exécutant des gardes indépendants sélectionnés simultanément et imprimant les minutages par vérification. La vérification de dérive des instantanés de prompts de chemin heureux coûteuse de Codex s'exécute en tant que tâche supplémentaire distincte pour la CI manuelle et uniquement pour les modifications affectant les prompts, afin que les modifications Node normales non liées n'attendent pas derrière la génération d'instantanés de prompts à froid et que les partitions de frontière restent équilibrées tandis que la dérive de prompts reste épinglée à la PR qui l'a causée ; le même drapeau ignore la génération Vitest d'instantanés de prompts à l'intérieur de la partition de frontière de support principale des artefacts construits. La surveillance du Gateway, les tests de canal et la partition de frontière de support principale s'exécutent simultanément à l'intérieur de `build-artifacts` après que `dist/` et `dist-runtime/` ont déjà été construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest` puis construit l'APK de débogage Play. La variante tierce n'a pas de jeu de sources ou de manifeste distinct ; sa voie de test unitaire compile toujours la variante avec les indicateurs BuildConfig SMS/journal d'appels, tout en évitant une tâche de conditionnement d'APK de débogage en double à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendance uniquement épinglée à la dernière version de Knip, avec l'âge minimum de release de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip par rapport à `scripts/deadcode-unused-files.allowlist.mjs`. La garde des fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non révisé ou laisse une entrée de liste autorisée périmée, tout en préservant les surfaces intentionnelles de plugin dynamique, générées, de construction, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` est le pont côté cible de l'activité du référentiel OpenClaw vers ClawSweeper. Il n'effectue pas de checkout ou d'exécution de code de pull request non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow a quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les pushes `main` ;
- `github_activity` pour l'activité générale GitHub que l'agent ClawSweeper peut inspecter.

La voie `github_activity` transfère uniquement les métadonnées normalisées : le type d'événement, l'action, l'acteur, le dépôt, le numéro de l'élément, l'URL, le titre, l'état et de courts extraits pour les commentaires ou les révisions, le cas échéant. Elle évite intentionnellement de transférer le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, pas une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne devrait publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile opérationnellement. Les ouvertures, modifications, activités de bot, bruits de webhooks en double et le trafic normal de révision devraient résulter en `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de validation de GitHub comme des données non fiables tout au long de ce chemin. Ils servent d'entrée pour le résumé et la priorisation, et non d'instructions pour le workflow ou l'exécution de l'agent.

## Répartitions manuelles

Les répartitions CI manuelles exécutent le même graphe de tâches que le CI normal mais forcent l'activation de chaque voie avec portée non-Android : les fragments Node Linux, les fragments de plugin groupé, les fragments de contrats de plugin et de channel, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de docs, les compétences Python, Windows, macOS et l'i18n de l'interface de contrôle. Les répartitions CI manuelles autonomes n'exécutent Android qu'avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de prépublication de plugin, le fragment `agentic-plugins` publication uniquement, le balayage complet des lots d'extensions et les voies Docker de prépublication de plugin sont exclus du CI. La suite de prépublication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow séparé `Plugin Prerelease` avec la porte de validation de publication activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète pour un candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée optionnelle `target_ref` permet à un appelant de confiance d'exécuter ce graphe contre une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow depuis la référence de dispatch sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | Dispatch manuel CI et replis pour les dépôts non canoniques, workflow-sanity, labeler, auto-response, workflows docs hors CI, et préflight install-smoke pour que la matrice Blacksmith puisse mettre en file d'attente plus tôt             |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `preflight`, `security-fast`, shards d'extension de poids inférieur, `checks-fast-core`, shards de contrat plugin/channel, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, et `check-test-types` |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de tests Node Linux, shards de tests plugin groupés, shards `check-additional-*`, `check-dependencies`, et `android`                                                                                                                  |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (assez sensibles au CPU pour que 8 vCPU coûtent plus qu'ils n'économisent) ; builds Docker install-smoke (le temps de file d'attente 32-vCPU coûte plus qu'il n'économise)                                   |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                             |
| `blacksmith-6vcpu-macos-15`      | `macos-node` sur `openclaw/openclaw` ; les forks reviennent à `macos-15`                                                                                                                                                                     |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` sur `openclaw/openclaw` ; les forks reviennent à `macos-26`                                                                                                                                                                    |

Le CI du dépôt canonique conserve Blacksmith comme chemin de runner par défaut pour les exécutions normales de push et de pull-request. `workflow_dispatch` et les exécutions de dépôt non canonique utilisent des runners hébergés par GitHub, mais les exécutions canoniques normales ne sondent pas actuellement la santé de la file d'attente Blacksmith ou ne reviennent pas automatiquement aux labels hébergés par GitHub lorsque Blacksmith est indisponible.

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

## OpenClaw Performance

`OpenClaw Performance` est le workflow de performance produit/runtime. Il s'exécute quotidiennement sur `main` et peut être déclenché manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le déclenchement manuel effectue généralement un benchmark sur la référence du workflow. Définissez `target_ref` pour effectuer un benchmark sur un tag de version ou une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version épinglée et Kova depuis `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois voies :

- `mock-provider` : Scénarios de diagnostic Kova sur un runtime construit localement avec une authentification factice déterministe compatible OpenAI.
- `mock-deep-profile` : Profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds des tours d'agent.
- `live-openai-candidate` : un tour d'agent `openai/gpt-5.5` OpenAI réel, ignoré lorsque `OPENAI_API_KEY` n'est pas disponible.

La voie mock-provider exécute également des sondes de source natives OpenClaw après la passe Kova : le temps de démarrage et la mémoire de la passerelle pour les cas par défaut, hook et 50 plugins ; l'RSS d'import des plugins groupés, les boucles de hello `channel-chat-baseline` mock-OpenAI répétées, et les commandes de démarrage CLI contre la passerelle démarrée. Lorsque le rapport de source mock-provider précédemment publié est disponible pour la référence testée, le résumé de la source compare les valeurs RSS et de tas actuelles par rapport à cette ligne de base et marque les augmentations importantes de RSS comme `watch`. Le résumé Markdown de la sonde de source se trouve à `source/index.md` dans le bundle de rapports, avec le JSON brut à côté.

Chaque ligne téléverse des artefacts GitHub. Lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, les artefacts `index.md` et les artefacts de source-probe dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel global pour « tout exécuter avant la publication ». Il accepte une branche, une étiquette ou un SHA de commit complet, déclenche le workflow manuel `CI` avec cette cible, déclenche `Plugin Prerelease` pour la preuve de plugin/ package/statique/Docker en version uniquement, et déclenche `OpenClaw Release Checks` pour le test de fumée d'installation, l'acceptation de package, les vérifications de package multi-OS, la parité QA Lab, les voies Matrix et Telegram. Les exécutions stables par défaut gardent la couverture exhaustive en direct/de bout en bout et le chemin de publication Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture de trempage pour que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` sur l'artefact `release-package-under-test` des vérifications de publication. Après publication, passez `release_package_spec` pour réutiliser le package npm livré dans les vérifications de publication, l'acceptation de package, Docker, multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un package différent. La voie du package en direct du plugin Codex utilise le même état sélectionné par défaut : le `release_package_spec=openclaw@<tag>` publié dérive `codex_plugin_spec=npm:@openclaw/codex@<tag>`, tandis que les exécutions SHA/artefact empaquettent `extensions/codex` à partir de la référence sélectionnée. Définissez `codex_plugin_spec` explicitement pour les sources de plugin personnalisées telles que les spécifications `npm:`, `npm-pack:` ou `git:`.

Consultez [Validation complète de la publication](/fr/reference/full-release-validation) pour la
matrice de stage, les noms exacts des jobs de workflow, les différences de profil, les artefacts et
les poignées de réexécution ciblées.

`OpenClaw Release Publish` est le workflow de publication avec mutation manuel. Déclenchez-le
à partir de `release/YYYY.M.D` ou `main` une fois que la balise de publication existe et après que
la pré-vérification OpenClaw npm a réussi. Il vérifie `pnpm plugins:sync:check`,
déclenche `Plugin NPM Release` pour tous les packages de plugins publiables, déclenche
`Plugin ClawHub Release` pour le même SHA de publication, et ce n'est qu'alors qu'il déclenche
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

Les refs de dispatch de workflow GitHub doivent être des branches ou des balises, et non des SHA de commit bruts. Le
helper crée une branche temporaire `release-ci/<sha>-...` au SHA cible,
déclenche `Full Release Validation` depuis cette référence épinglée, vérifie que chaque `headSha` de workflow enfant
correspond à la cible, et supprime la branche temporaire lorsque l'exécution
est terminée. Le vérificateur parapluie échoue également si n'importe quel workflow enfant s'est exécuté à un
SHA différent.

`release_profile` contrôle l'étendue live/provider transmise aux vérifications de publication. Les
workflows de publication manuels sont par défaut sur `stable` ; n'utilisez `full` que lorsque vous
voulez intentionnellement la large matrice provider/média consultative. `run_release_soak`
contrôle si les vérifications de publication stable/default exécutent le test soak exhaustif live/E2E et
le chemin de publication Docker ; `full` force l'activation du soak.

- `minimum` conserve les voies les plus rapides critiques pour la publication OpenAI/core.
- `stable` ajoute l'ensemble stable provider/backend.
- `full` exécute la large matrice provider/média consultative.

Le parapluie enregistre les ID des exécutions enfants déclenchées, et le job final `Verify full validation` vérifie à nouveau les conclusions des exécutions enfants actuelles et ajoute les tableaux des tâches les plus lentes pour chaque exécution enfant. Si un workflow enfant est réexécuté et passe au vert, réexécutez uniquement le job de vérification parent pour rafraîchir le résultat du parapluie et le résumé des durées.

Pour la récupération, à la fois `Full Release Validation` et `OpenClaw Release Checks` acceptent `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de préversion du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur le parapluie. Cela permet de maintenir bornée la réexécution d'une boîte de version échouée après une correction ciblée. Pour une voie inter-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade` ; les commandes inter-OS longues émettent des lignes de pulsation et les résumés de mise à niveau des packages incluent des minutages par phase. Les voies de contrôle de version QA sont consultatives, à l'exception de la porte de couverture des outils d'exécution standard, qui bloque lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé du niveau standard.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois en une archive tar `release-package-under-test`, puis transmet cet artefact aux contrôles inter-OS et à l'acceptation des packages, ainsi qu'au workflow de chemin de version Dockernpm en direct/E2E lorsque la couverture de soak s'exécute. Cela maintient les octets du package cohérents entre les boîtes de version et évite de réempaqueter le même candidat dans plusieurs travaux enfants. Pour la voie en direct du plugin npm Codex, les contrôles de version transmettent soit une spécification de plugin publiée correspondante dérivée de `release_package_spec`, transmettent le `codex_plugin_spec` fourni par l'opérateur, ou laissent l'entrée vide pour que le script Docker empaquette le plugin Codex de l'extraction sélectionnée.

Les exécutions en double `Full Release Validation` pour `ref=main` et `rerun_group=all`
remplacent l'ancien parapluie (umbrella). Le moniteur parent annule tout workflow enfant
qu'il a déjà distribué lorsque le parent est annulé, de sorte que la validation plus récente de main
ne se trouve pas derrière une exécution de vérification de publication (release-check) obsolète de deux heures. La validation des branches/tags de publication et les groupes de réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant de publication Live/E2E conserve une large couverture native `pnpm test:live`, mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail sériel unique :

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
- shards audio/vidéo média fractionnés et shards musique filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en rendant les échecs lents des providers Live plus faciles à réexécuter et à diagnostiquer. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions manuelles ponctuelles.

Les shards média natifs Live s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les tâches média ne font que vérifier les binaires avant la configuration. Gardez les suites Live soutenues par Docker sur les runners Blacksmith normaux — les tâches conteneur ne sont pas le bon endroit pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image partagée `ghcr.io/openclaw/openclaw-live-test:<sha>` distincte par commit sélectionné. Le workflow de version live build et pousse cette image une seule fois, puis les shards du modèle live Docker, de la passerelle partitionnée par fournisseur, du backend CLI, de la liaison ACP et du harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`. Les shards Gateway Docker portent des plafonds `timeout` explicites au niveau du script, inférieurs au délai d'expiration du job de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'intégralité du budget de vérification de version. Si ces shards reconstruisent indépendamment la cible source Docker complète, l'exécution de la version est mal configurée et gaspillera du temps réel sur des constructions d'images en double.

## Acceptation de package

Utilisez `Package Acceptance` lorsque la question est « ce package installable OpenClaw fonctionne-t-il comme un produit ? ». C'est différent de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation de package valide un seul tarball via le même harnais E2E Docker que les utilisateurs exercent après installation ou mise à jour.

### Tâches

1. `resolve_package` récupère `workflow_ref`, résout un candidat de package, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test` et imprime la source, la référence du workflow, la référence du package, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive tar, prépare les images Docker d'empreinte de package si nécessaire, et exécute les Docker sélectionnés sur ce package au lieu d'empaqueter l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes` ciblées, le workflow réutilisable prépare le package et les images partagées une seule fois, puis répartit ces voies en tant que tâches Docker ciblées parallèles avec des artefacts uniques.
3. `package_telegram` appelle facultativement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test` lorsque l'acceptation de package en a résolu un ; un dispatch autonome Telegram peut toujours installer une spécification npm publiée.
4. `summary` fait échouer le workflow si la résolution du package, l'acceptation Docker ou la voie facultative Telegram a échoué.

### Sources candidates

- `source=npm` n'accepte que `openclaw@beta`, `openclaw@latest`, ou une version de release exacte de OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation de préversions/stables publiées.
- `source=ref` empaquète une branche, un tag ou un SHA de commit complet approuvé `package_ref`. Le résolveur récupère les branches/tags OpenClaw, vérifie que le commit sélectionné est accessible depuis l'historique des branches du dépôt ou d'un tag de release, installe les dépendances dans un arbre de travail détaché, et l'empaquète avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS public ; `package_sha256` est requis. Ce chemin rejette les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte ou IP résolus privés/internes/à usage spécial, et les redirections en dehors de la même politique de sécurité publique.
- `source=trusted-url` télécharge un HTTPS `.tgz` à partir d'une stratégie de source de confiance nommée dans `.github/package-trusted-sources.json` ; `package_sha256` et `trusted_source_id` sont requis. Utilisez ceci uniquement pour les miroirs d'entreprise détenus par les mainteneurs ou les référentiels de packages privés qui nécessitent des hôtes, des ports, des préfixes de chemin, des hôtes de redirection ou une résolution de réseau privé configurés. Si la stratégie déclare une authentification bearer, le workflow utilise le secret fixe `OPENCLAW_TRUSTED_PACKAGE_TOKEN` ; les informations d'identification intégrées à l'URL sont toujours rejetées.
- `source=artifact` télécharge un `.tgz` à partir de `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés en externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lorsque `source=ref`. Cela permet au harnais de test actuel de valider les anciens commits de source de confiance sans exécuter l'ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — morceaux complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis lorsque `suite_profile=custom`

Le profil `package` utilise la couverture hors ligne des plugins, de sorte que la validation des packages publiés n'est pas dépendante de la disponibilité de ClawHub en ligne. La voie Telegram optionnelle réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de la spécification npm publiée conservé pour les déclenchements autonomes.

Pour la stratégie dédiée aux tests de mise à jour et aux plugins, y compris les commandes locales,
les voies Docker, les entrées de Package Acceptance, les valeurs par défaut de publication et le triage des échecs,
consultez [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de version appellent Package Acceptance avec `source=artifact`, l'artefact de package de version préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'` et `telegram_mode=mock-openai`ClawHubTelegram. Cela permet de maintenir la migration de package, la mise à jour, l'installation de la compétence live ClawHub, le nettoyage des dépendances de plugins obsolètes, la réparation de l'installation de plugins configurés, le plugin hors ligne, la mise à jour de plugin et la preuve Telegram sur la même archive tar de package résolu. Définissez `release_package_spec`OpenClawnpm sur la validation complète de version ou sur les vérifications de version OpenClaw après la publication d'une version bêta pour exécuter la même matrice sur le package npm expédié sans重建 ; définissez `package_acceptance_package_spec` uniquement lorsque Package Acceptance nécessite un package différent du reste de la validation de version. Les vérifications de version multi-OS couvrent toujours l'onboarding spécifique à l'OS, l'installateur et le comportement de la plateforme ; la validation de produit de package/mise à jour doit commencer par Package Acceptance. La voie Docker `published-upgrade-survivor`Docker valide une ligne de base de package publiée par exécution dans le chemin de version bloquant. Dans Package Acceptance, l'archive tar `package-under-test` résolue est toujours la candidate et `published_upgrade_survivor_baseline` sélectionne la ligne de base publiée de repli, par défaut `openclaw@latest` ; les commandes de réexécution de voie en échec préservent cette ligne de base. La validation complète de version avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues`npmOpenClawDocker pour s'étendre sur les quatre dernières versions stables npm, plus les versions de limite de compatibilité de plugin épinglées et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona préservés, les installations de plugins OpenClaw configurés, les chemins de journal tilde et les racines de dépendances de plugins hérités obsolètes. Les sélections de survivants de mise à niveau publiée multi-ligne de base sont partitionnées par ligne de base dans des tâches de runner Docker ciblées distinctes. Le flux de travail séparé `Update Migration` utilise la voie Docker `update-migration`Docker avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif des mises à jour publiées, et non l'étendue normale des CI de version complète. Les exécutions d'agrégats locaux peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, conserver une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la ligne de base avec une commande de recette intégrée `openclaw config set`, enregistre les étapes de la recette dans `summary.json` et sonde `/healthz`, `/readyz`RPCGatewayWindowsWindowsOpenAI, ainsi que le statut RPC après le démarrage de Gateway. Les voies fraîches de package et d'installateur Windows vérifient également qu'un package installé peut importer une substitution de contrôle de navigateur à partir d'un chemin absolu Windows brut. Le test de fumée de tour d'agent multi-OS OpenAI par défaut sur `OPENCLAW_CROSS_OS_OPENAI_MODEL` si défini, sinon `openai/gpt-5.5`, afin que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritée

Package Acceptance dispose de fenêtres de compatibilité héritée bornées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées privées QA connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis de l'archive ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les `patchedDependencies` pnpm manquants du faux fixture git dérivé de l'archive et peut enregistrer les `update.channel` persistants manquants ;
- les tests de fumée de plugins peuvent lire les emplacements d'enregistrement d'installation hérités ou accepter l'absence de persistance de l'enregistrement d'installation du marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement de non-réinstallation restent inchangés.

Le package publié `2026.4.26` peut également avertir pour les fichiers d'horodatage des métadonnées de build locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire aux contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

Lors du débogage d'une exécution d'acceptation de package échouée, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Inspectez ensuite l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, les journaux de voie, les timings de phase et les commandes de réexécution. Préférez la réexécution du profil de package échoué ou des voies Docker exactes au lieu de réexécuter la validation complète de la version.

## Test de fumée d'installation

Le workflow distinct `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture des tests de fumée en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions de **chemin rapide** (Fast path) concernent les demandes de tirage (pull requests) touchant les surfaces de package/Docker, les modifications de package/manifeste de plugin groupé, ou les surfaces du cœur du plugin//passerelle/Plugin SDK exercées par les tâches de test de fumée (smoke) de Docker. Les modifications de plugins groupés en code source uniquement, les modifications de tests uniquement et les modifications de documentation uniquement ne réservent pas de workers Docker. Le chemin rapide construit l'image racine du Dockerfile une seule fois, vérifie le CLI, exécute les agents de suppression du test de fumée du CLI de l'espace de travail partagé (shared-workspace), exécute le test de bout en bout (e2e) du réseau de passerelle de conteneur, vérifie un argument de construction d'extension groupée, et exécute le profil Docker de plugin groupé délimité sous un délai d'expiration de commande agrégé de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **chemin complet** (Full path) conserve la couverture d'installation de package QR et d'Docker de mise à jour de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de publication par appel de workflow, et les demandes de tirage touchant réellement les surfaces de l'installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image de test de fumée (smoke) du Dockerfile racine GHCR pour un SHA cible, puis exécute l'installation du package QR, les tests de fumée du Dockerfile racine/de la passerelle, les tests de fumée de l'installateur/de la mise à jour, et le test de bout en bout (E2E) Docker rapide de plugin groupé en tant que tâches distinctes, afin que le travail de l'installateur n'attende pas derrière les tests de fumée de l'image racine.

Les poussées (pushes) `main` (y compris les commits de fusion) ne forcent pas le chemin complet ; lorsque la logique d'étendue modifiée demanderait une couverture complète lors d'une poussée, le workflow conserve le test de fumée (smoke) rapide de Docker et laisse le test de fumée d'installation complet aux exécutions nocturnes ou à la validation de publication.

Le test de fumée lent du fournisseur d'image d'installation globale de Bun est contrôlé séparément par `run_bun_global_install_smoke`. Il s'exécute selon la planification nocturne et à partir du workflow de vérifications de publication, et les répartitions manuelles `Install Smoke` peuvent l'activer par option (opt-in), mais les demandes de tirage et les poussées `main` ne le font pas. L'IC normale des PR exécute toujours la voie de régression rapide du lanceur Bun pour les modifications pertinentes pour Node. Les tests de l'installateur Docker et QR conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm préconstruit une image de test en direct partagée, empaquette OpenClaw une fois sous forme de tarball npm et construit deux images `scripts/e2e/Dockerfile` partagées :

- un exécuteur Node/Git nu pour les voies d'installateur/mise à jour/dépendance de plugin ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normales.

Les définitions de voies Docker se trouvent dans Docker`scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs`, et l'exécuteur exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres réglables

| Variable                               | Par défaut | Objectif                                                                                                                                   |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                           |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de queue sensible au fournisseur.                                                                            |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite simultanée de voies en direct pour éviter que les fournisseurs ne limitent le trafic.                                               |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite simultanée de voies d'installation npm.                                                                                             |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite simultanée de voies multi-services.                                                                                                 |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Décalage entre les démarrages de voie pour éviter les tempêtes de création du démon Docker ; définissez Docker`0` pour aucun décalage.     |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/tail sélectionnées utilisent des limites plus strictes.                             |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` imprime le planificateur sans exécuter les voies.                                                                                      |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage smoke pour que les agents puissent reproduire une voie ayant échoué. |

Une voie plus lourde que sa plafond effectif peut toujours démarrer depuis un pool vide, puis s'exécute seule jusqu'à ce qu'elle libère de la capacité. L'agrégat local effectue des vérifications préalables Docker, supprime les conteneurs E2E OpenClaw obsolètes, émet le statut de la voie active, persiste les durées des voies pour l'ordre du plus long au premier, et arrête par défaut la planification de nouvelles voies regroupées après le premier échec.

### Workflow réutilisable live/E2E

Le workflow réutilisable live/E2E demande à `scripts/test-docker-all.mjs --plan-json` quel package, quel type d'image, quelle image live, quelle voie et quelle couverture d'identifiants sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquette OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive ; construit et pousse des images E2E Docker nues/fonctionnelles taguées par digest de package via le cache de couches Docker de Blacksmith lorsque le plan nécessite des voies avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes taguées par digest de package au lieu de reconstruire. Les tirages d'images Docker sont réessayés avec un délai d'attente borné de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'IC.

### Segments du chemin de publication

La couverture Docker de publication exécute des tâches plus petites et découpées avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, afin que chaque segment ne tire que le type d'image dont il a besoin et exécute plusieurs voies via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les chunks Docker de la version actuelle sont Docker`core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` jusqu'à `plugins-runtime-install-h`. `package-update-openai`OpenClaw inclut la ligne du paquet du plugin live Codex, qui installe le paquet candidat OpenClaw, installe le plugin Codex à partir de `codex_plugin_spec`CLICLIOpenClawOpenAI ou d'une archive tar de même référence avec une approbation d'installation explicite de la CLI Codex, exécute les prévols de la CLI Codex, puis exécute plusieurs tours d'agent OpenClaw de même session contre OpenAI. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de ligne `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux lignes d'installation du provider.

OpenWebUI est intégré dans `plugins-runtime-services` lorsque la couverture complète du chemin de version le demande, et conserve un chunk autonome `openwebui`npm uniquement pour les dispatches exclusifs à OpenWebUI. Les lignes de mise à jour du canal groupé réessayent une fois en cas de pannes réseau transitoires npm.

Chaque bloc téléverse `.artifacts/docker-tests/` avec les journaux de voie, les chronométrages, `summary.json`, `failures.json`, les chronométrages de phase, le JSON du planificateur, les tables de voies lentes et les commandes de réexécution par voie. L'entrée du workflow `docker_lanes`DockerDockerGitHub exécute les voies sélectionnées par rapport aux images préparées au lieu des tâches de bloc, ce qui permet de limiter le débogage des voies échouées à une tâche Docker ciblée et de préparer, télécharger ou réutiliser l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie Docker active, la tâche ciblée construit l'image de test active localement pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name` et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser exactement le paquet et les images de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié live/E2E exécute quotidiennement la suite complète Docker du chemin de publication.

## Prépublication de plugin

`Plugin Prerelease` est une couverture produit/paquet plus coûteuse, c'est donc un workflow distinct déclenché par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées `main`DockerDocker et les déclenchements manuels autonomes de CI désactivent cette suite. Il équilibre les tests de plugin regroupés sur huit travailleurs d'extension ; ces tâches de fragmentation d'extension exécutent jusqu'à deux groupes de configuration de plugin à la fois avec un travailleur Vitest par groupe et un tas Node plus volumineux afin que les lots de plugin lourds en importation ne créent pas de tâches CI supplémentaires. Le chemin de prépublication Docker réservé aux publications regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow téléverse également un artefact informatif `plugin-inspector-advisory` à partir de `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont une entrée de triage et ne modifient pas la barrière bloquante de Prépublication de plugin.

## Labo QA

Le QA Lab dispose de voies CI dédiées en dehors du workflow principal à portée intelligente (smart-scoped). La parité agentic est imbriquée sous les harnais QA et release larges, et non un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute chaque nuit sur `main`MatrixTelegramDiscord et lors d'un déclenchement manuel ; il déploie la voie de parité simulée (mock parity lane), la voie Matrix en direct, et les voies Telegram et Discord en direct en tant que tâches parallèles. Les tâches en direct utilisent l'environnement `qa-live-shared`TelegramDiscord, et Telegram/Discord utilisent des baux Convex.

Les vérifications de release exécutent les voies de transport en direct Matrix et Telegram avec le provider simulé déterministe et des modèles qualifiés simulés (MatrixTelegram`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`Docker) afin que le contrat de channel soit isolé de la latence du modèle en direct et du démarrage normal des plugins de provider. La passerelle de transport en direct désactive la recherche mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du provider est couverte par les suites distinctes de modèle en direct, de provider natif et de provider Docker.

Matrix utilise Matrix`--profile fast` pour les programmations et les portes de release, en ajoutant `--fail-fast`CLICLI uniquement lorsque le CLI extrait le prend en charge. La valeur par défaut du CLI et l'entrée du workflow manuel restent `all` ; le déclenchement manuel `matrix_profile=all`Matrix divise toujours la couverture Matrix complète en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies QA Lab critiques pour la release avant l'approbation de la release ; sa porte de parité QA exécute les packs candidats et de référence en tant que tâches de voies parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normales, suivez les preuves CI/vérification délimitées au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non un balayage complet du référentiel. Les exécutions quotidiennes, manuelles et de garde de pull request non brouillon analysent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité à haute confiance filtrées pour des niveaux de gravité `security-severity` élevés/critiques.

La garde de pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. Android et macOS CodeQL restent en dehors des paramètres par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron, et passerelle de base                                                                                                                                             |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le Plugin SDK, les secrets et les points de contact d'audit                                      |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de politique SSRF, d'analyse IP, de garde réseau, de récupération web et de SSRF du Plugin SDK de base                                                                                 |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution de tool d'agent                                                                                     |
| `/codeql-security-high/plugin-trust-boundary`     | Surfaces de confiance d'installation de plugin, de chargeur, de manifeste, de registre, d'installation de gestionnaire de packages, de chargement source et de contrat de package du Plugin SDK |

### Fragments de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — fragment de sécurité Android planifié. Construit manuellement l'application Android pour CodeQL sur le plus petit runner Linux Blacksmith accepté par la validité du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security` — fragment de sécurité macOS hebdomadaire/manuel. Génère manuellement l'application macOS pour CodeQL sur macOS Blacksmith, filtre les résultats de build des dépendances du fichier SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`. Gardé en dehors des valeurs par défaut quotidiennes car le build macOS domine le temps d'exécution même lorsqu'il est propre.

### Catégories de Qualité Critique

`CodeQL Critical Quality` est le fragment non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript de gravité erreur et non sécurisées sur des surfaces de haute valeur restreintes sur le runner Linux Blacksmith plus petit. Sa garde de pull request est intentionnellement plus petite que le profil planifié : les PR non-brouillon n'exécutent que les fragments `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract` et `plugin-sdk-reply-runtime` correspondants pour l'exécution et le code de dispatch de réponse de commande/model/ d'agent, le code de schéma/migration/E/S de configuration, le code d'auth/secrets/bac à sable/sécurité, le runtime du plugin principal et groupé, le protocole/méthode de serveur , la colle runtime/SDK mémoire, la livraison MCP/processus/sortant, le catalogue runtime/model de , les files de diagnostic/livraison de , le chargeur de plugin, le contrat de paquet/Plugin SDK, ou les changements de runtime de réponse Plugin SDK. Les changements de configuration CodeQL et de workflow de qualité exécutent les douze fragments de qualité PR.

La répartition manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des crochets d'enseignement/itération pour exécuter un fragment de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code d'auth, secrets, bac à sable, cron, et limite de sécurité Gateway                                                                                                                                                           |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats E/S                                                                                                                                                                |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode de serveur                                                                                                                                                                   |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation des plugins du canal principal et des canals groupés                                                                                                                                                   |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commandes, distribution model/provider, distribution et files d'attente de réponse automatique, et contrats d'exécution du plan de contrôle ACP                                                                     |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision de processus, et contrats de livraison sortante                                                                                                                        |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK d'hôte de mémoire, façades d'exécution de mémoire, alias du SDK de Plugin de mémoire, colle d'activation d'exécution de mémoire, et commandes du docteur de mémoire                                                          |
| `/codeql-critical-quality/session-diagnostics-boundary` | Fonctionnement interne de la file de réponse, files de livraison de session, assistants de liaison/livraison de session sortante, surfaces de bundles d'événements/journaux de diagnostic, et contrats CLI du docteur de session |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Distribution de réponse entrante du SDK de Plugin, assistants de payload/découpage/exécution de réponse, options de réponse du channel, files de livraison, et assistants de liaison session/fil                                 |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte de provider, enregistrement d'exécution de provider, valeurs par défaut/catalogues de provider, et registres web/recherche/récupération/incorporation      |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface de contrôle, persistance locale, flux de contrôle de passerelle, et contrats d'exécution du plan de contrôle des tâches                                                                                  |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web principale, E/S multimédia, compréhension multimédia, génération d'images et contrats d'exécution de génération multimédia                                                                            |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique et contrats de point d'entrée du SDK de Plugin                                                                                                                                              |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source publiée côté package du SDK de Plugin et assistants de contrat de package de plugin                                                                                                                                       |

La qualité reste distincte de la sécurité afin que les conclusions de qualité puissent être planifiées, mesurées, désactivées ou étendues sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plugins groupés ne doit être réajoutée que comme travail de suivi délimité ou partitionné une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour garder les docs existants alignés avec les modifications récemment intégrées. Il n'a pas de planification pure : une exécution CI de push réussie et non par un bot sur `main` peut la déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations de workflow-run sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution non ignorée de Docs Agent a été créée au cours de la dernière heure. Lorsqu'il s'exécute, il examine la plage de commits depuis le SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, de sorte qu'une seule exécution horaire peut couvrir toutes les modifications principales accumulées depuis la dernière passe de documentation.

### Test Performance Agent

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas de planification pure : une exécution CI de push réussie et non par un bot sur `main` peut la déclencher, mais elle est ignorée si une autre invocation de workflow-run a déjà été exécutée ou est en cours ce jour-là UTC. La répartition manuelle contourne cette porte d'activité quotidienne. La voie génère un rapport de performance Vitest groupé pour la suite complète, laisse Codex apporter uniquement de petites corrections de performance de tests préservant la couverture au lieu de refactorisations importantes, puis réexécute le rapport de la suite complète et rejette les modifications qui réduisent le nombre de tests de base réussis. Le rapport groupé enregistre le temps d'horloge par configuration et le RSS maximal sur Linux et macOS, de sorte que la comparaison avant/après met en évidence les écarts de mémoire des tests à côté des écarts de durée. Si la base contient des tests en échec, Codex ne peut corriger que les échecs évidents et le rapport de la suite complète après l'agent doit réussir avant que quoi que ce soit ne soit validé. Lorsque `main` avance avant que le push du bot ne soit intégré, la voie effectue un rebase du correctif validé, réexécute `pnpm check:changed` et réessaie le push ; les correctifs périmés en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

### PRs en double après fusion

Le workflow `Duplicate PRs After Merge` est un workflow manuel de maintenance pour le nettoyage des doublons après fusion. Il fonctionne par défaut en mode simulation (dry-run) et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que la PR fusionnée est bien mergée et que chaque doublon a soit un problème référencé partagé, soit des blocs de modifications superposés.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale des voies modifiées (changed-lane) réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte concernant les limites de l'architecture que le périmètre large de la plateforme CI :

- les modifications de production du noyau exécutent core prod, core test typecheck, ainsi que core lint/guards ;
- les modifications de tests uniquement du noyau n'exécutent que core test typecheck ainsi que core lint ;
- les modifications de production d'extension exécutent extension prod, extension test typecheck ainsi que extension lint ;
- les modifications de tests uniquement d'extension exécutent extension test typecheck ainsi que extension lint ;
- les modifications du Plugin SDK public ou des contrats de plugins s'étendent à l'extension typecheck car les extensions dépendent de ces contrats centraux (les parcours d'extensions Vitest restent un travail de test explicite) ;
- les augmentations de version de métadonnées de release uniquement exécutent des vérifications ciblées sur la version, la configuration et les dépendances racine ;
- les modifications inconnues à la racine ou dans la configuration échouent en mode sécurité (fail safe) vers toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes de tests s'exécutent elles-mêmes, les modifications de code source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison partagée pour les salles de groupe est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de réponse source, ou du système d'invite de l'outil de message transitent par les tests de réponse centrale ainsi que par les régressions de livraison Discord et Slack, afin qu'une modification par défaut partagée échoue avant le premier push de PR. N'utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` que lorsque la modification est suffisamment large à l'échelle du harnais pour que l'ensemble mappé peu coûteux ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est le wrapper de boîte distante détenue par le dépôt pour la preuve Linux des mainteneurs. Utilisez-le depuis la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI est importante, ou lorsque la preuve nécessite des secrets, Docker, des voies de packages (package lanes), des boîtes réutilisables ou des journaux distants. Le backend OpenClaw normal est LinuxDockerOpenClaw`blacksmith-testbox`Hetzner ; la capacité AWS/Hetzner détenue est un secours en cas de pannes Blacksmith, de problèmes de quota ou de tests explicites de capacité détenue.

Les exécutions Blacksmith prises en charge par Crabbox effectuent les opérations warm, claim, sync, run, report et clean up sur des Testboxes ponctuelles. La vérification de cohérence de synchronisation intégrée échoue rapidement lorsque les fichiers racine requis tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short` affiche au moins 200 suppressions suivies. Pour les PR avec des suppressions intentionnelles de grande envergure, définissez `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale du CLI Blacksmith qui reste dans la phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée pour les différences locales inhabituellement grandes.

Avant une première exécution, vérifiez le wrapper depuis la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

Le wrapper du dépôt refuse un binaire Crabbox obsolète qui n'annonce pas `blacksmith-testbox`. Passez le fournisseur explicitement même si `.crabbox.yaml` a des valeurs par défaut pour le cloud détenu. Dans les arbres de travail Codex ou les extractions liées/clairsemées (linked/sparse checkouts), évitez le script `pnpm crabbox:run` local car pnpm peut réconcilier les dépendances avant le démarrage de Crabbox ; invoquez plutôt directement le wrapper node :

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions ponctuelles de Crabbox prises en charge par Blacksmith doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes actives et arrêtez uniquement les boîtes que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith fonctionne lui-même, utilisez le Blacksmith direct uniquement pour les diagnostics tels que `list`, `status`, et le nettoyage. Corrigez le chemin Crabbox avant de considérer une exécution directe de Blacksmith comme une preuve mainteneur.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux warmups restent `queued` sans IP ni d'URL d'exécution Actions après quelques minutes, considérez cela comme une pression sur le provider Blacksmith, la file d'attente, la facturation ou les limites de l'organisation. Arrêtez les identifiants en file d'attente que vous avez créés, évitez de démarrer plus de Testboxes, et déplacez la preuve vers le chemin de capacité Crabbox possédé ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Passez à la capacité Crabbox possédée uniquement lorsque Blacksmith est en panne, limité par quota, manque l'environnement nécessaire, ou si la capacité possédée est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Sous pression AWS, évitez `class=beast` à moins que la tâche n'ait vraiment besoin d'un CPU de classe 48xlarge. Une demande `beast` commence à 192 vCPUs et est le moyen le plus simple de déclencher le quota Spot EC2 régional ou On-Demand Standard. Le `.crabbox.yaml` possédé par le dépôt est réglé par défaut sur `standard`, plusieurs régions de capacité, et `capacity.hints: true` afin que les baux AWS courtiers impriment la région/marché sélectionné, la pression sur le quota, le repli Spot, et les avertissements de classe haute pression. Utilisez `fast` pour des vérifications broad plus lourdes, `large` uniquement après que standard/fast ne suffisent pas, et `beast`Docker uniquement pour les lanes exceptionnellement liées au CPU telles que les matrices Docker full-suite ou all-plugin, la validation explicite de release/blocker, ou le profilage de performance à nombreux cœurs. N'utilisez pas `beast` pour `pnpm check:changed`, des tests focalisés, un travail docs-only, des lint/typecheck ordinaires, de petits repros E2E, ou le triage de panne Blacksmith. Utilisez `--market on-demand` pour le diagnostic de capacité afin que le churn du marché Spot ne soit pas mélangé au signal.

`.crabbox.yaml` définit les valeurs par défaut du provider, de la synchronisation et de l'hydratation des GitHub Actions pour les voies owned-cloud. Il exclut les `.git` locaux afin que le checkout Actions hydraté conserve ses propres métadonnées Git distantes au lieu de synchroniser les dépôts et magasins d'objets locaux du mainteneur, et il exclut les artefacts d'exécution/de build locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` définit le checkout, la configuration de Node/pnpm, la récupération `origin/main` et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

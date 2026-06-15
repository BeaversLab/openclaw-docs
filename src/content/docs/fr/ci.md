---
summary: "Graphe de tâches CI, portes de périmètre, parapluies de publication et équivalents de commandes locales"
title: "Pipeline CI"
read_when:
  - You need to understand why a CI job did or did not run
  - You are debugging a failing GitHub Actions check
  - You are coordinating a release validation run or rerun
  - You are changing ClawSweeper dispatch or GitHub activity forwarding
---

La CI OpenClaw s'exécute à chaque envoi (push) vers OpenClaw`main` et à chaque demande de tirage (pull request). La tâche `preflight` classe les différences (diff) et désactive les volets coûteux lorsque seules des zones non liées ont changé. Les exécutions manuelles de `workflow_dispatch`Android contournent intentionnellement le périmètre intelligent et déploient le graphique complet pour les candidats à la publication et les validations larges. Les volets Android restent en option (opt-in) via `include_android`. La couverture des plugins exclusifs aux publications réside dans le workflow distinct [`Plugin Prerelease`](#plugin-prerelease) et ne s'exécute qu'à partir de [`Full Release Validation`](#full-release-validation) ou d'un déclenchement manuel explicite.

## Aperçu du pipeline

| Tâche                              | Objectif                                                                                                                                                                   | Quand elle s'exécute                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `preflight`                        | Détecter les modifications de docs uniquement, les portées modifiées, les extensions modifiées, et construire le manifeste CI                                              | Toujours sur les poussées et PR non brouillons        |
| `security-fast`                    | Détection de clé privée, audit des workflows modifiés via `zizmor` et audit du lockfile de production                                                                      | Toujours sur les poussées et PR non brouillons        |
| `check-dependencies`               | Passe de production Knip dépendances uniquement plus la garde de liste d'autorisation de fichiers inutilisés                                                               | Modifications pertinentes pour Node                   |
| `build-artifacts`                  | Construction de `dist/`, interface utilisateur de contrôle, tests de fumée de la CLI intégrée, vérifications des artefacts intégrés intégrés et artefacts réutilisables    | Modifications pertinentes pour Node                   |
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

1. `preflight` décide quels volets existent du tout. Les logiques `docs-scope` et `changed-scope` sont des étapes à l'intérieur de cette tâche, et non des tâches autonomes.
2. `security-fast`, `check-*`, `check-additional-*`, `check-docs`, et `skills-python` échouent rapidement sans attendre les tâches plus lourdes d'artefacts et de plateformes de la matrice.
3. `build-artifacts` chevauche les voies rapides Linux afin que les consommateurs en aval puissent démarrer dès que la construction partagée est prête.
4. Les voies plus lourdes de plateforme et d'exécution sont ensuite réparties : `checks-fast-core`, `checks-fast-contracts-plugins-*`, `checks-fast-contracts-channels-*`, `checks-node-core-*`, `checks-windows`, `macos-node`, `macos-swift` et `android`.

GitHub peut marquer les tâches remplacées comme `cancelled` lorsqu'un push plus récent arrive sur la même PR ou la référence `main`. Considérez cela comme du bruit CI, sauf si l'exécution la plus récente pour la même référence échoue également. Les tâches Matrix utilisent `fail-fast: false`, et `build-artifacts` signale directement les échecs de channel intégré, de core-support-boundary et de gateway-watch au lieu de mettre en file d'attente de minuscules tâches de vérification. La clé de concurrence CI automatique est versionnée (`CI-v7-*`), de sorte qu'un zombie côté GitHub dans un ancien groupe de file d'attente ne peut pas bloquer indéfiniment les nouvelles exécutions sur main. Les exécutions manuelles de la suite complète utilisent `CI-manual-v1-*` et n'annulent pas les exécutions en cours.

Utilisez `pnpm ci:timings`, `pnpm ci:timings:recent` ou `node scripts/ci-run-timings.mjs <run-id>` pour résumer le temps écoulé, le temps de file d'attente, les tâches les plus lentes, les échecs et la barrière de répartition `pnpm-store-warmup` depuis GitHub Actions. Le CI télécharge également le même résumé d'exécution en tant qu'artefact `ci-timings-summary`. Pour le timing de la construction, vérifiez l'étape `Build dist` de la tâche `build-artifacts` : `pnpm build:ci-artifacts` imprime `[build-all] phase timings:` et inclut `ui:build` ; la tâche télécharge également l'artefact `startup-memory`.

Pour les exécutions de pull request, la tâche terminale timing-summary exécute l'assistant à partir de la révision de base approuvée avant de passer `GH_TOKEN` à `gh run view`. Cela permet de garder la requête tokenisée hors du code contrôlé par la branche tout en résumant l'exécution CI actuelle de la pull request.

## Preuve du comportement réel

Les PR de contributeurs externes exécutent une porte `Real behavior proof` à partir de
`.github/workflows/real-behavior-proof.yml`. Le workflow extrait le commit de base
approuvé et évalue uniquement le corps de la PR ; il n'exécute pas le code de la
branche du contributeur.

La porte s'applique aux auteurs de PR qui ne sont pas propriétaires, membres,
collaborateurs ou bots du dépôt. Elle réussit lorsque le corps de la PR contient une
section `Real behavior proof` avec des valeurs renseignées pour :

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

La logique de portée réside dans `scripts/ci-changed-scope.mjs` et est couverte par des tests unitaires dans `src/scripts/ci-changed-scope.test.ts`. L'envoi manuel ignore la détection de la portée modifiée et fait en sorte que le manifeste préliminaire agisse comme si chaque zone à portée avait changé.

- **Les modifications du workflow CI** valident le graphe CI Node ainsi que le linting du workflow, mais ne forcent pas les builds natifs Windows, Android ou macOS par eux-mêmes ; ces voies de plateforme restent limitées aux modifications de la source de la plateforme.
- **Workflow Sanity** exécute `actionlint`, `zizmor` sur tous les fichiers YAML de workflow, la garde d'interpolation des actions composites et la garde de marqueurs de conflit. La tâche `security-fast` limitée à la PR exécute également `zizmor` sur les fichiers de workflow modifiés afin que les résultats de sécurité du workflow échouent tôt dans le graphe CI principal.
- **Docs sur les pushes `main`** sont vérifiées par le workflow autonome `Docs`ClawHub avec le même miroir de docs ClawHub utilisé par CI, afin que les pushes mixtes code+docs ne mettent pas non plus en file d'attente le shard CI `check-docs`. Les pull requests et les CI manuels exécutent toujours `check-docs` à partir de CI lorsque les docs changent.
- **TUI PTY** est un workflow ciblé pour les modifications de la TUI. Il exécute TUITUI`node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts`Linux sur Linux Node 24 pour `src/tui/**`, le harnais de surveillance, le script de package, le fichier de verrouillage et les modifications du workflow. La voie obligatoire utilise un appareil `TuiBackend` déterministe ; le test de fumée `tui --local` plus lent est optionnel avec `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` et simule uniquement le point de terminaison du modèle externe.
- **Les modifications de routage CI uniquement, les modifications sélectionnées d'appareils de test central peu coûteux et les modifications étroites d'aide de contrat de plugin/routage de test** utilisent un chemin de manifeste rapide uniquement Node : `preflight`, sécurité et une seule tâche `checks-fast-core`. Ce chemin ignore les artefacts de construction, la compatibilité Node 22, les contrats de channel, les fragments centraux complets, les fragments de plugin groupés et les matrices de garde supplémentaires lorsque la modification est limitée au routage ou aux surfaces d'aide que la tâche rapide exerce directement.
- **Les vérifications Windows Node** sont limitées aux wrappers de processus/chemin spécifiques à Windows, aux aides d'exécuteur npm/pnpm/UI, à la configuration du gestionnaire de packages et aux surfaces de workflow CI qui exécutent cette voie ; les modifications non liées de la source, du plugin, du test de fumée d'installation et des tests uniquement restent sur les voies Linux Node.

Les familles de tests Node les plus lentes sont divisées ou équilibrées afin que chaque tâche reste petite sans sur-réserver les exécuteurs : les contrats de plugins et les contrats de canal s'exécutent chacun en deux partitions pondérées soutenues par Blacksmith avec le repli standard sur l'exécuteur GitHub, les voies rapides/support d'unités principales s'exécutent séparément, l'infrastructure d'exécution principale est répartie entre l'état, le processus/config, le partagé et trois partitions de domaine cron, la réponse automatique s'exécute en tant que workers équilibrés (avec le sous-arbre de réponse divisé en partitions agent-runner, dispatch, et commands/state-routing), et les configurations de passerelle/serveur agentic sont réparties sur les voies chat/auth/model/http-plugin/runtime/startup au lieu d'attendre les artefacts construits. Les tests larges de navigateur, QA, multimédia et divers de plugins utilisent leurs configurations Vitest dédiées au lieu de la solution de rattrapage partagée pour les plugins. Les partitions basées sur des modèles d'inclusion enregistrent des entrées de minutage en utilisant le nom de la partition CI, de sorte que `.artifacts/vitest-shard-timings.json` puisse distinguer une configuration entière d'une partition filtrée. `check-additional-*` maintient le travail de compilation/canary lié aux limites de paquets ensemble et sépare l'architecture de la topologie d'exécution de la couverture de surveillance de Gateway ; la liste des gardes de limite est répartie en une partition lourde en invites et une partition combinée pour les bandes de gardes restantes, chacune exécutant les gardes indépendants sélectionnés simultanément et imprimant les minutages par vérification. La vérification coûteuse de la dérive de l'instantané d'invite du chemin heureux Codex s'exécute en tant que tâche supplémentaire distincte pour la CI manuelle et uniquement pour les modifications affectant les invites, afin que les modifications Node normales non liées n'attendent pas derrière la génération d'instantanés d'invite à froid et que les partitions de limite restent équilibrées pendant que la dérive d'invite est toujours épinglée à la PR qui l'a provoquée ; le même indicateur ignore la generation d'instantanés Vitest d'invite à l'intérieur de la partition de limite de support principal basée sur des artefacts construits. La surveillance de Gateway, les tests de canal et la partition de limite de support principal s'exécutent simultanément à l'intérieur de `build-artifacts` après que `dist/` et `dist-runtime/` ont déjà été construits.

Le CI Android exécute à la fois Android`testPlayDebugUnitTest` et `testThirdPartyDebugUnitTest` puis construit le APK de débogage Play. La variante tierce n'a pas de jeu de sources ou de manifeste distinct ; sa voie de test unitaire compile toujours la variante avec les indicateurs BuildConfig SMS/journal des appels, tout en évitant une tâche de empaquetage APK de débogage en double à chaque push pertinent pour Android.

Le shard `check-dependencies` exécute `pnpm deadcode:dependencies` (une passe de production Knip dépendance-only épinglée à la dernière version de Knip, avec l'âge de publication minimum de pnpm désactivé pour l'installation `dlx`) et `pnpm deadcode:unused-files`, qui compare les résultats de fichiers inutilisés en production de Knip par rapport à `scripts/deadcode-unused-files.allowlist.mjs`. La garde de fichiers inutilisés échoue lorsqu'une PR ajoute un nouveau fichier inutilisé non examiné ou laisse une entrée de liste d'autorisation périmée, tout en préservant les surfaces intentionnelles de plugin dynamique, générées, de build, de test en direct et de pont de package que Knip ne peut pas résoudre statiquement.

## Transfert d'activité ClawSweeper

`.github/workflows/clawsweeper-dispatch.yml` est le pont côté cible de l'activité du dépôt OpenClaw vers ClawSweeper. Il n'extrait pas ni n'exécute de code de pull request non fiable. Le workflow crée un jeton d'application GitHub à partir de `CLAWSWEEPER_APP_PRIVATE_KEY`, puis envoie des charges utiles compactes `repository_dispatch` à `openclaw/clawsweeper`.

Le workflow comporte quatre voies :

- `clawsweeper_item` pour les demandes de révision exactes d'issues et de pull requests ;
- `clawsweeper_comment` pour les commandes explicites ClawSweeper dans les commentaires d'issues ;
- `clawsweeper_commit_review` pour les demandes de révision au niveau du commit sur les pushes `main` ;
- `github_activity` pour l'activité générale GitHub que l'agent ClawSweeper peut inspecter.

La voie `github_activity` ne transmet que les métadonnées normalisées : type d'événement, action, acteur, référentiel, numéro de l'élément, URL, titre, état et de courts extraits pour les commentaires ou les révisions le cas échéant. Elle évite intentionnellement de transmettre le corps complet du webhook. Le workflow de réception dans `openclaw/clawsweeper` est `.github/workflows/github-activity.yml`, qui publie l'événement normalisé sur le hook OpenClaw Gateway pour l'agent ClawSweeper.

L'activité générale est une observation, pas une livraison par défaut. L'agent ClawSweeper reçoit la cible Discord dans son invite et ne devrait publier sur `#clawsweeper` que lorsque l'événement est surprenant, actionnable, risqué ou utile sur le plan opérationnel. Les ouvertures, modifications, le brouillage des bots, le bruit dupliqué des webhooks et le trafic normal de révision devraient aboutir à `NO_REPLY`.

Traitez les titres, commentaires, corps, texte de révision, noms de branches et messages de commit GitHub comme des données non approuvées tout au long de ce chemin. Ils servent d'entrée pour le résumé et le triage, et non d'instructions pour le workflow ou le runtime de l'agent.

## Répartitions manuelles

Les répartitions manuelles de CI exécutent le même graphe de travaux que le CI normal, mais activent de force chaque voie à portée non Android : les partitions Node Linux, les partitions de plugins regroupés, les partitions de contrats de plugins et de canaux, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS et l'i18n de l'interface utilisateur de contrôle. Les répartitions manuelles autonomes de CI n'exécutent Android qu'avec `include_android=true` ; le parapluie complet de publication active Android en passant `include_android=true`. Les vérifications statiques de prépublication de plugins, la partition `agentic-plugins` de publication uniquement, le balayage complet du lot d'extensions et les voies Docker de prépublication de plugins sont exclus du CI. La suite de prépublication Docker ne s'exécute que lorsque `Full Release Validation` répartit le workflow `Plugin Prerelease` séparé avec la porte de validation de publication activée.

Les exécutions manuelles utilisent un groupe de concurrence unique afin qu'une suite complète de candidat à la publication ne soit pas annulée par un autre push ou une exécution de PR sur la même référence. L'entrée optionnelle `target_ref` permet à un appelant de confiance d'exécuter ce graphe par rapport à une branche, une balise ou un SHA de commit complet tout en utilisant le fichier de workflow depuis la référence de répartition sélectionnée.

```bash
gh workflow run ci.yml --ref release/YYYY.M.D
gh workflow run ci.yml --ref main -f target_ref=<branch-or-sha> -f include_android=true
gh workflow run full-release-validation.yml --ref main -f ref=<branch-or-sha>
```

## Runners

| Runner                           | Tâches                                                                                                                                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ubuntu-24.04`                   | Répartition manuelle CI et secours pour les dépôts non canoniques, sanity de workflow, étiqueteur, réponse automatique, workflows docs hors CI, et pré-vol install-smoke pour que la matrice Blacksmith puisse se mettre en file d'attente plus tôt |
| `blacksmith-4vcpu-ubuntu-2404`   | `CodeQL Critical Quality`, `preflight`, `security-fast`, shards d'extension de poids inférieur, `checks-fast-core`, shards de contrat plugin/channel, `checks-node-compat-node22`, `check-guards`, `check-prod-types`, et `check-test-types`        |
| `blacksmith-8vcpu-ubuntu-2404`   | Shards de test Linux Node, shards de test de plugin groupés, shards `check-additional-*`, `check-dependencies`, et `android`                                                                                                                        |
| `blacksmith-16vcpu-ubuntu-2404`  | `build-artifacts`, `check-lint` (assez sensibles au CPU pour que 8 vCPU coûtent plus que ce qu'ils ont économisé) ; builds Docker install-smoke (le temps d'attente dans la file de 32 vCPU coûte plus que ce qu'il a économisé)                    |
| `blacksmith-16vcpu-windows-2025` | `checks-windows`                                                                                                                                                                                                                                    |
| `blacksmith-6vcpu-macos-15`      | `macos-node` sur `openclaw/openclaw` ; les forks retombent sur `macos-15`                                                                                                                                                                           |
| `blacksmith-12vcpu-macos-26`     | `macos-swift` sur `openclaw/openclaw` ; les forks retombent sur `macos-26`                                                                                                                                                                          |

La CI du dépôt canonique garde Blacksmith comme chemin de runner par défaut pour les exécutions normales de push et de pull-request. `workflow_dispatch` et les exécutions de dépôt non canonique utilisent des runners hébergés par GitHub, mais les exécutions canoniques normales ne sondent pas actuellement la santé de la file de Blacksmith ou ne retombent pas automatiquement sur les étiquettes hébergées par GitHub lorsque Blacksmith est indisponible.

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

## Performances OpenClaw

`OpenClaw Performance` est le workflow de performances produit/runtime. Il s'exécute quotidiennement sur `main` et peut être déclenché manuellement :

```bash
gh workflow run openclaw-performance.yml --ref main -f profile=diagnostic -f repeat=3
gh workflow run openclaw-performance.yml --ref main -f profile=smoke -f repeat=1 -f deep_profile=true -f live_openai_candidate=true
gh workflow run openclaw-performance.yml --ref main -f target_ref=v2026.5.2 -f profile=diagnostic -f repeat=3
```

Le déclenchement manuel mesure généralement les performances de la référence du workflow. Définissez `target_ref` pour mesurer un tag de version ou une autre branche avec l'implémentation actuelle du workflow. Les chemins des rapports publiés et les pointeurs les plus récents sont indexés par la référence testée, et chaque `index.md` enregistre la référence/SHA testée, la référence/SHA du workflow, la référence Kova, le profil, le mode d'authentification de voie, le modèle, le nombre de répétitions et les filtres de scénario.

Le workflow installe OCM à partir d'une version épinglée et Kova à partir de `openclaw/Kova` à l'entrée `kova_ref` épinglée, puis exécute trois voies :

- `mock-provider` : scénarios de diagnostic Kova contre un runtime de compilation locale avec une authentification fausse déterministe compatible OpenAI.
- `mock-deep-profile` : profilage CPU/tas/trace pour le démarrage, la passerelle et les points chauds des tours d'agent.
- `live-openai-candidate` : un tour d'agent `openai/gpt-5.5` OpenAI réel, ignoré lorsque `OPENAI_API_KEY` n'est pas disponible.

La voie mock-provider exécute également des sondes source natives OpenClaw après la passe Kova : le temps de démarrage et la mémoire de la passerelle pour les cas par défaut, hook et 50 plugins ; l'import RSS du plugin groupé, les boucles hello `channel-chat-baseline` mock-OpenAI répétées, et les commandes de démarrage CLI contre la passerelle démarrée. Lorsque le rapport source mock-provider précédemment publié est disponible pour la référence testée, le résumé source compare les valeurs RSS et de tas actuelles par rapport à cette ligne de base et marque les augmentations importantes de RSS comme `watch`. Le résumé Markdown de la sonde source se trouve à `source/index.md` dans le bundle de rapports, avec le JSON brut à côté.

Chaque voie téléverse des artefacts GitHub. Lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré, le workflow valide également `report.json`, `report.md`, les bundles, `index.md` et les artefacts de sonde de source dans `openclaw/clawgrit-reports` sous `openclaw-performance/<tested-ref>/<run-id>-<attempt>/<lane>/`. Le pointeur tested-ref actuel est écrit sous la forme `openclaw-performance/<tested-ref>/latest-<lane>.json`.

## Validation complète de la version

`Full Release Validation` est le workflow manuel parapluie pour « exécuter tout avant la release ». Il accepte une branche, une balise ou un SHA de commit complet, envoie le workflow manuel `CI` avec cette cible, envoie `Plugin Prerelease` pour la preuve de plugin/package/statique/Docker exclusif à la release, et envoie `OpenClaw Release Checks` pour le test d'installation, l'acceptation de package, les vérifications de package multi-OS, la parité du QA Lab, les voies Matrix et Telegram. Les exécutions stables/défaut gardent la couverture exhaustive en direct/E2E et le chemin de release Docker derrière `run_release_soak=true` ; `release_profile=full` force cette couverture d'imprégnation pour que la validation consultative large reste large. Avec `rerun_group=all` et `release_profile=full`, il exécute également `NPM Telegram Beta E2E` par rapport à l'artefact `release-package-under-test` provenant des vérifications de release. Après publication, passez `release_package_spec` pour réutiliser le package npm expédié à travers les vérifications de release, l'Acceptation de Package, Docker, le multi-OS et Telegram sans reconstruction. Utilisez `npm_telegram_package_spec` uniquement lorsque Telegram doit prouver un package différent. La voie du package en direct du plugin Codex utilise par défaut le même état sélectionné : le `release_package_spec=openclaw@<tag>` publié dérive `codex_plugin_spec=npm:@openclaw/codex@<tag>`, tandis que les exécutions SHA/artefact empaquettent `extensions/codex` à partir de la référence sélectionnée. Définissez `codex_plugin_spec` explicitement pour les sources de plugin personnalisées telles que les specs `npm:`, `npm-pack:` ou `git:`.

Voir [Full release validation](/fr/reference/full-release-validation) pour la
matrice de stage, les noms exacts des tâches de workflow, les différences de profil, les artefacts et
les poignées de réexécution ciblées.

`OpenClaw Release Publish` est le workflow de release avec mutation manuelle. Déclenchez-le depuis `release/YYYY.M.D` ou `main` une fois que le tag de release existe et une fois que la pré-vérification OpenClaw npm a réussi. Il vérifie `pnpm plugins:sync:check`, déclenche `Plugin NPM Release` pour tous les packages de plugins publiables, déclenche `Plugin ClawHub Release` pour le même SHA de release, et ce n'est qu'ensuite qu'il déclenche `OpenClaw NPM Release` avec le `preflight_run_id` sauvegardé.

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

Les refs de dispatch de workflow GitHub doivent être des branches ou des tags, et non des SHAs de commit bruts. Le helper pousse une branche temporaire `release-ci/<sha>-...` au SHA cible, déclenche `Full Release Validation` depuis cette réf épinglée, vérifie que chaque `headSha` de workflow enfant correspond à la cible, et supprime la branche temporaire lorsque l'exécution est terminée. Le vérificateur parapluie échoue également si n'importe quel workflow enfant a tourné à un SHA différent.

`release_profile` contrôle l'étendue live/fournisseur passée aux vérifications de release. Les workflows de release manuels par défaut à `stable` ; utilisez `full` uniquement lorsque vous voulez intentionnellement la large matrice provider/média advisory. `run_release_soak` contrôle si les vérifications de release stable/défaut exécutent le soak complet live/E2E et du chemin de release Docker ; `full` force le soak.

- `minimum` conserve les voies les plus rapides critiques pour la release OpenAI/core.
- `stable` ajoute l'ensemble stable de fournisseurs/backends.
- `full` exécute la large matrice provider/média advisory.

Le parapluie enregistre les IDs des exécutions enfants déclenchées, et le travail final `Verify full validation` revérifie les conclusions actuelles des exécutions enfants et ajoute les tableaux des travaux les plus lents pour chaque exécution enfant. Si un workflow enfant est réexécuté et devient vert, réexécutez uniquement le travail vérificateur parent pour rafraîchir le résultat du parapluie et le résumé du timing.

Pour la récupération, `Full Release Validation` et `OpenClaw Release Checks` acceptent tous deux `rerun_group`. Utilisez `all` pour une version candidate, `ci` pour uniquement l'enfant CI complet normal, `plugin-prerelease` pour uniquement l'enfant de pré-version du plugin, `release-checks` pour chaque enfant de version, ou un groupe plus restreint : `install-smoke`, `cross-os`, `live-e2e`, `package`, `qa`, `qa-parity`, `qa-live`, ou `npm-telegram` sur l'ombrelle. Cela permet de maintenir une réexécution limitée d'une version échouée après une correction ciblée. Pour une seule voie inter-OS échouée, combinez `rerun_group=cross-os` avec `cross_os_suite_filter`, par exemple `windows/packaged-upgrade`OpenClaw ; les commandes inter-OS longues émettent des lignes de signal de vie (heartbeat) et les résumés de mise à jour de package incluent des minutages par phase. Les voies de contrôle de version QA sont consultatives, à l'exception de la porte de couverture des outils d'exécution standard, qui bloque lorsque les outils dynamiques OpenClaw requis dérivent ou disparaissent du résumé de niveau standard.

`OpenClaw Release Checks` utilise la référence de workflow de confiance pour résoudre la référence sélectionnée une fois dans une archive tar `release-package-under-test`Dockernpm, puis transmet cet artefact aux contrôles inter-OS et à l'acceptation de package, ainsi qu'au workflow de publication Docker en direct/E2E lorsque la couverture de trempage (soak) est exécutée. Cela permet de maintenir la cohérence des octets de package sur les boîtes de version et d'éviter de réemballer le même candidat dans plusieurs tâches enfants. Pour la voie en direct du plugin Codex npm, les contrôles de version transmettent soit une spécification de plugin publiée correspondante dérivée de `release_package_spec`, transmettent le `codex_plugin_spec`Docker fourni par l'opérateur, ou laissent l'entrée vide pour que le script Docker empaquette le plugin Codex de l'extraction sélectionnée.

Les exécutions en double de `Full Release Validation` pour `ref=main` et `rerun_group=all`
remplacent l'ancien parapluie global. Le moniteur parent annule tout workflow enfant
qu'il a déjà dispatché lorsque le parent est annulé, de sorte que la validation plus
récente de main ne se retrouve pas derrière une exécution de vérification de release
périmée de deux heures. La validation des branches/tags de release et les groupes de
réexécution ciblés conservent `cancel-in-progress: false`.

## Shards Live et E2E

L'enfant release live/E2E conserve une large couverture native `pnpm test:live`, mais il l'exécute sous forme de shards nommés via `scripts/test-live-shard.mjs` au lieu d'un travail sériel unique :

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
- séparer les shards audio/vidéo media et les shards musicaux filtrés par provider

Cela permet de conserver la même couverture de fichiers tout en facilitant la réexécution et le diagnostic des défaillances lentes des providers live. Les noms de shards agrégés `native-live-extensions-o-z`, `native-live-extensions-media` et `native-live-extensions-media-music` restent valides pour les réexécutions manuelles ponctuelles.

Les shards live media natifs s'exécutent dans `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, construits par le workflow `Live Media Runner Image`. Cette image préinstalle `ffmpeg` et `ffprobe` ; les tâches media ne vérifient que les binaires avant la configuration. Gardez les suites live basées sur Docker sur les runners Blacksmith normaux — les tâches conteneur ne sont pas le bon endroit pour lancer des tests Docker imbriqués.

Les shards de modèle/backend en direct basés sur Docker utilisent une image Docker partagée distincte Docker`ghcr.io/openclaw/openclaw-live-test:<sha>`DockerCLI par commit sélectionné. Le workflow de version en direct construit et pousse cette image une seule fois, puis les shards du modèle Docker en direct, de la Gateway fragmentée par fournisseur, du backend CLI, de la liaison ACP et du harnais Codex s'exécutent avec `OPENCLAW_SKIP_DOCKER_BUILD=1`GatewayDocker. Les shards Docker de la Gateway comportent des plafonds de délai d'expiration `timeout`Docker explicites au niveau du script, en dessous du délai d'expiration du travail de workflow, afin qu'un conteneur bloqué ou un chemin de nettoyage échoue rapidement au lieu de consommer l'ensemble du budget de vérification de la version. Si ces shards reconstruisent indépendamment la cible Docker source complète, l'exécution de la version est mal configurée et gaspillera du temps de traitement sur des constructions d'images en double.

## Acceptation des paquets

Utilisez `Package Acceptance`OpenClawDocker lorsque la question est « ce paquet OpenClaw installable fonctionne-t-il comme un produit ? ». Il diffère de la CI normale : la CI normale valide l'arborescence source, tandis que l'acceptation des paquets valide un seul fichier tar via le même harnais E2E Docker que les utilisateurs utilisent après l'installation ou la mise à jour.

### Tâches

1. `resolve_package` extrait `workflow_ref`, résout un candidat de paquet, écrit `.artifacts/docker-e2e-package/openclaw-current.tgz`, écrit `.artifacts/docker-e2e-package/package-candidate.json`, télécharge les deux en tant qu'artefact `package-under-test`GitHub et imprime la source, la référence du workflow, la référence du paquet, la version, le SHA-256 et le profil dans le résumé de l'étape GitHub.
2. `docker_acceptance` appelle `openclaw-live-and-e2e-checks-reusable.yml` avec `ref=workflow_ref` et `package_artifact_name=package-under-test`. Le workflow réutilisable télécharge cet artefact, valide l'inventaire de l'archive, prépare les images Docker de digest de package si nécessaire, et exécute les voies Docker sélectionnées par rapport à ce package au lieu d'empaqueter l'extraction du workflow. Lorsqu'un profil sélectionne plusieurs `docker_lanes` ciblées, le workflow réutilisable prépare le package et les images partagées une seule fois, puis déploie ces voies en parallèle en tant que tâches Docker ciblées avec des artefacts uniques.
3. `package_telegram` appelle facultativement `NPM Telegram Beta E2E`. Il s'exécute lorsque `telegram_mode` n'est pas `none` et installe le même artefact `package-under-test` lorsque l'acceptation de package en a résolu un ; l'expédition autonome Telegram peut toujours installer une spec npm publiée.
4. `summary` fait échouer le workflow si la résolution de package, l'acceptation Docker, ou la voie facultative Telegram a échoué.

### Sources candidates

- `source=npm` accepte uniquement `openclaw@beta`, `openclaw@latest`, ou une version de release exacte de OpenClaw telle que `openclaw@2026.4.27-beta.2`. Utilisez ceci pour l'acceptation de préversions/stables publiées.
- `source=ref` empaquète une branche `package_ref` approuvée, une balise, ou un SHA de commit complet. Le résolveur récupère les branches/balises OpenClaw, vérifie que le commit sélectionné est accessible à partir de l'historique des branches du dépôt ou d'une balise de release, installe les dépendances dans un arbre de travail détaché, et l'empaquète avec `scripts/package-openclaw-for-docker.mjs`.
- `source=url` télécharge un `.tgz` HTTPS public ; `package_sha256` est requis. Ce chemin rejette les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte privés/interne/à usage spécial ou les IP résolues, et les redirections en dehors de la même politique de sécurité publique.
- `source=trusted-url` télécharge un fichier HTTPS `.tgz` à partir d'une stratégie de source approuvée nommée dans `.github/package-trusted-sources.json` ; `package_sha256` et `trusted_source_id` sont requis. Utilisez ceci uniquement pour les miroirs d'entreprise détenus par les mainteneurs ou les référentiels de packages privés qui nécessitent des hôtes, des ports, des préfixes de chemin, des hôtes de redirection ou une résolution de réseau privé configurés. Si la stratégie déclare une authentification bearer, le workflow utilise le secret fixe `OPENCLAW_TRUSTED_PACKAGE_TOKEN` ; les informations d'identification intégrées à l'URL sont toujours rejetées.
- `source=artifact` télécharge un fichier `.tgz` depuis `artifact_run_id` et `artifact_name` ; `package_sha256` est facultatif mais doit être fourni pour les artefacts partagés externe.

Gardez `workflow_ref` et `package_ref` séparés. `workflow_ref` est le code de workflow/harnais de confiance qui exécute le test. `package_ref` est le commit source qui est empaqueté lorsque `source=ref`. Cela permet au harnais de test actuel de valider les commits de source de confiance plus anciens sans exécuter une ancienne logique de workflow.

### Profils de suite

- `smoke` — `npm-onboard-channel-agent`, `gateway-network`, `config-reload`
- `package` — `npm-onboard-channel-agent`, `doctor-switch`, `update-channel-switch`, `skill-install`, `update-corrupt-plugin`, `upgrade-survivor`, `published-upgrade-survivor`, `update-restart-auth`, `plugins-offline`, `plugin-update`
- `product` — `package` plus `mcp-channels`, `cron-mcp-cleanup`, `openai-web-search-minimal`, `openwebui`
- `full` — blocs complets du chemin de publication Docker avec OpenWebUI
- `custom` — `docker_lanes` exact ; requis lorsque `suite_profile=custom`

Le profil `package`ClawHub utilise une couverture de plug-in hors ligne, de sorte que la validation des packages publiés n'est pas conditionnée à la disponibilité de ClawHub en ligne. La voie facultative Telegram réutilise l'artefact `package-under-test` dans `NPM Telegram Beta E2E`, avec le chemin de spécification npm publié conservé pour les déclenchements autonomes.

Pour la politique dédiée aux tests de mises à jour et de plug-ins, y compris les commandes locales,
les voies Docker, les entrées d'acceptation de packages, les valeurs par défaut de version et le triage des échecs,
voyez [Testing updates and plugins](/fr/help/testing-updates-plugins).

Les vérifications de version appellent l'acceptation de package avec `source=artifact`, l'artefact de package de version préparé, `suite_profile=custom`, `docker_lanes='doctor-switch update-channel-switch skill-install update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update'`, et `telegram_mode=mock-openai`. Cela maintient la migration de package, la mise à jour, l'installation de compétence en direct ClawHub, le nettoyage des dépendances de plugin obsolètes, la réparation de l'installation de plugin configuré, le plugin hors ligne, la mise à jour de plugin, et la preuve Telegram sur la même archive tar de package résolue. Définissez `release_package_spec` sur la validation complète de version ou les vérifications de version OpenClaw après la publication d'une bêta pour exécuter la même matrice contre le package npm expédié sans reconstruction ; définissez `package_acceptance_package_spec` uniquement lorsque l'acceptation de package a besoin d'un package différent du reste de la validation de version. Les vérifications de version multi-OS couvrent toujours l'onboarding spécifique à l'OS, l'installateur, et le comportement de la plateforme ; la validation de produit de package/mise à jour devrait commencer par l'acceptation de package. La voie Docker du `published-upgrade-survivor` valide une base de référence de package publiée par exécution dans le chemin de version bloquant. Dans l'acceptation de package, l'archive tar `package-under-test` résolue est toujours le candidat et `published_upgrade_survivor_baseline` sélectionne la base de référence publiée de secours, par défaut `openclaw@latest` ; les commandes de réexécution de voie échouée préservent cette base de référence. La validation complète de version avec `run_release_soak=true` ou `release_profile=full` définit `published_upgrade_survivor_baselines='last-stable-4 2026.4.23 2026.5.2 2026.4.15'` et `published_upgrade_survivor_scenarios=reported-issues` pour s'étendre sur les quatre dernières versions stables npm plus les versions de limite de compatibilité de plugin épinglées et les fixtures en forme de problème pour la configuration Feishu, les fichiers bootstrap/persona préservés, les installations de plugin OpenClaw configurées, les chemins de journal tilde, et les racines de dépendance de plugin hérité obsolètes. Les sélections de survivants de mise à niveau publiée multi-base sont partitionnées par base dans des travaux de runner Docker ciblés distincts. Le workflow séparé `Update Migration` utilise la voie Docker du `update-migration` avec `all-since-2026.4.23` et `plugin-deps-cleanup` lorsque la question concerne le nettoyage exhaustif de mise à jour publiée, et non l'étendue normale des CI de version complète. Les exécutions d'agrégat locales peuvent transmettre des spécifications de package exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS`, garder une seule voie avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC` telle que `openclaw@2026.4.15`, ou définir `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` pour la matrice de scénarios. La voie publiée configure la base de référence avec une recette de commande `openclaw config set` intégrée, enregistre les étapes de la recette dans `summary.json`, et sonde `/healthz`, `/readyz`, plus le statut RPC après le démarrage du Gateway. Les voies fraîches de package et d'installateur Windows vérifient également qu'un package installé peut importer une priorité de contrôle de navigateur à partir d'un chemin absolu brut Windows. Le test de fumée inter-OS de tour d'agent OpenAI est par défaut `OPENCLAW_CROSS_OS_OPENAI_MODEL` lorsqu'il est défini, sinon `openai/gpt-5.5`, de sorte que la preuve d'installation et de passerelle reste sur un modèle de test GPT-5 tout en évitant les valeurs par défaut GPT-4.x.

### Fenêtres de compatibilité héritées

Package Acceptance dispose de fenêtres de compatibilité héritées limitées pour les packages déjà publiés. Les packages jusqu'à `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent utiliser le chemin de compatibilité :

- les entrées QA privées connues dans `dist/postinstall-inventory.json` peuvent pointer vers des fichiers omis du tarball ;
- `doctor-switch` peut ignorer le sous-cas de persistance `gateway install --wrapper` lorsque le package n'expose pas cet indicateur ;
- `update-channel-switch` peut supprimer les pnpm `patchedDependencies` manquants du faux fixture git dérivé du tarball et peut consigner les `update.channel` persistants manquants ;
- les essais de plugins peuvent lire les emplacements hérités des enregistrements d'installation ou accepter l'absence de persistance des enregistrements d'installation de la marketplace ;
- `plugin-update` peut autoriser la migration des métadonnées de configuration tout en exigeant que l'enregistrement d'installation et le comportement sans réinstallation restent inchangés.

Le package `2026.4.26` publié peut également avertir pour les fichiers de tampon de métadonnées de construction locale qui ont déjà été expédiés. Les packages ultérieurs doivent satisfaire les contrats modernes ; les mêmes conditions échouent au lieu d'avertir ou d'être ignorées.

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

Lors du débogage d'une exécution d'acceptation de package ayant échoué, commencez par le résumé `resolve_package` pour confirmer la source, la version et le SHA-256 du package. Ensuite, inspectez l'exécution enfant `docker_acceptance` et ses artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, les journaux de voie, les durées des phases et les commandes de réexécution. Privilégiez la réexécution du profil de package ayant échoué ou des voies Docker exactes au lieu de réexécuter la validation complète de la version.

## Essai d'installation

Le workflow distinct `Install Smoke` réutilise le même script de portée via son propre travail `preflight`. Il divise la couverture des essais en `run_fast_install_smoke` et `run_full_install_smoke`.

- Les exécutions en **Fast path** concernent les pull requests touchant aux surfaces Docker/package, aux changements de package/manifeste de plugin groupé, ou aux surfaces du plugin principal/channel/gateway/Plugin SDK que les jobs de smoke Docker exercent. Les changements de plugin groupé source-only, les modifications test-only et les modifications docs-only ne réservent pas de workers Docker. Le fast path construit l'image Dockerfile racine une seule fois, vérifie le CLI, exécute le smoke CLI de suppression de shared-workspace des agents, exécute le e2e de réseau-gateway du conteneur, vérifie un arg de build d'extension groupée, et exécute le profil Docker de bundled-plugin borné sous un délai d'expiration de commande agrégé de 240 secondes (chaque exécution Docker de scénario étant plafonnée séparément).
- Le **Full path** conserve la couverture d'installation de package QR et de Docker/update de l'installateur pour les exécutions planifiées nocturnes, les répartitions manuelles, les vérifications de release par appel de workflow, et les pull requests qui touchent réellement aux surfaces installateur/package/Docker. En mode complet, install-smoke prépare ou réutilise une image de smoke Dockerfile racine GHCR target-SHA, puis exécute l'installation de package QR, les smokes Dockerfile racine/gateway, les smokes installateur/update, et le E2E Docker bundled-plugin rapide en tant que jobs distincts pour que le travail de l'installateur n'attende pas derrière les smokes de l'image racine.

Les pushes `main`Docker (y compris les commits de fusion) ne forcent pas le full path ; lorsque la logique de portée modifiée demanderait une couverture complète sur un push, le workflow conserve le smoke Docker rapide et laisse le smoke d'installation complet aux exécutions nocturnes ou à la validation de release.

Le smoke lent de provider d'image d'installation globale Bun est séparément conditionné par `run_bun_global_install_smoke`. Il s'exécute sur la planification nocturne et à partir du workflow des vérifications de release, et les répartitions manuelles `Install Smoke` peuvent l'activer, mais ce n'est pas le cas des pull requests et des pushes `main`. Le CI PR normal exécute toujours la voie de régression du lanceur BunDocker rapide pour les modifications pertinentes pour Node. Les tests Docker QR et d'installateur conservent leurs propres Dockerfiles axés sur l'installation.

## E2E Docker local

`pnpm test:docker:all`OpenClawnpm précompile une image live-test partagée, empaquette OpenClaw une fois sous forme de tarball npm, et construit deux images `scripts/e2e/Dockerfile` partagées :

- un exécuteur Node/Git nu pour les voies d'installation/mise à jour/dépendance de plugin ;
- une image fonctionnelle qui installe la même tarball dans `/app` pour les voies de fonctionnalité normales.

Les définitions de voies Docker résident dans Docker`scripts/lib/docker-e2e-scenarios.mjs`, la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs`, et l'exécuteur exécute uniquement le plan sélectionné. Le planificateur sélectionne l'image par voie avec `OPENCLAW_DOCKER_E2E_BARE_IMAGE` et `OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`, puis exécute les voies avec `OPENCLAW_SKIP_DOCKER_BUILD=1`.

### Paramètres ajustables

| Variable                               | Par défaut | Objet                                                                                                                                        |
| -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_DOCKER_ALL_PARALLELISM`      | 10         | Nombre d'emplacements du pool principal pour les voies normales.                                                                             |
| `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM` | 10         | Nombre d'emplacements du pool de fin sensible au fournisseur.                                                                                |
| `OPENCLAW_DOCKER_ALL_LIVE_LIMIT`       | 9          | Limite de voies simultanées live pour éviter la limitation par les fournisseurs.                                                             |
| `OPENCLAW_DOCKER_ALL_NPM_LIMIT`        | 10         | Limite de voies d'installation npm simultanées.                                                                                              |
| `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT`    | 7          | Limite de voies multi-services simultanées.                                                                                                  |
| `OPENCLAW_DOCKER_ALL_START_STAGGER_MS` | 2000       | Délai entre les débuts de voies pour éviter les tempêtes de création du démon Docker ; définissez Docker`0` pour aucun délai.                |
| `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`  | 7200000    | Délai de repli par voie (120 minutes) ; les voies live/tail sélectionnées utilisent des limites plus strictes.                               |
| `OPENCLAW_DOCKER_ALL_DRY_RUN`          | non défini | `1` affiche le plan du planificateur sans exécuter les voies.                                                                                |
| `OPENCLAW_DOCKER_ALL_LANES`            | non défini | Liste exacte de voies séparées par des virgules ; ignore le nettoyage (smoke) pour que les agents puissent reproduire une voie ayant échoué. |

Un canal plus lourd que sa limite effective peut tout de même démarrer depuis un pool vide, puis s'exécute seul jusqu'à ce qu'il libère de la capacité. L'agrégat local effectue des prévols sur Docker, supprime les conteneurs OpenClaw E2E obsolètes, émet le statut du canal actif, persiste les minutages des canaux pour le classement du plus long en premier, et arrête par défaut la planification de nouveaux canaux en pool après le premier échec.

### Workflow de live/E2E réutilisable

Le workflow de live/E2E réutilisable demande à `scripts/test-docker-all.mjs --plan-json` quel package, quel type d'image, quelle image live, quel canal et quelle couverture d'informations d'identification sont requis. `scripts/docker-e2e.mjs` convertit ensuite ce plan en sorties et résumés GitHub. Il empaquête OpenClaw via `scripts/package-openclaw-for-docker.mjs`, télécharge un artefact de package de l'exécution en cours, ou télécharge un artefact de package depuis `package_artifact_run_id` ; valide l'inventaire de l'archive tar ; construit et pousse les images E2E Docker nues/fonctionnelles taguées par digest de package via le cache de couche Docker de Blacksmith lorsque le plan nécessite des canaux avec package installé ; et réutilise les entrées `docker_e2e_bare_image`/`docker_e2e_functional_image` fournies ou les images existantes de digest de package au lieu de reconstruire. Les téléchargements d'images Docker sont réessayés avec un délai d'attente limité de 180 secondes par tentative, afin qu'un flux de registre/cache bloqué soit réessayé rapidement au lieu de consommer la majeure partie du chemin critique de l'IC.

### Segments du chemin de publication

La couverture Docker de publication exécute des tâches plus petites et segmentées avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, afin que chaque segment ne récupère que le type d'image dont il a besoin et exécute plusieurs canaux via le même planificateur pondéré :

- `OPENCLAW_DOCKER_ALL_PROFILE=release-path`
- `OPENCLAW_DOCKER_ALL_CHUNK=core | package-update-openai | package-update-anthropic | package-update-core | plugins-runtime-plugins | plugins-runtime-services | plugins-runtime-install-a..h`

Les fragments Docker de la version actuelle sont Docker`core`, `package-update-openai`, `package-update-anthropic`, `package-update-core`, `plugins-runtime-plugins`, `plugins-runtime-services` et `plugins-runtime-install-a` jusqu'à `plugins-runtime-install-h`. `package-update-openai`OpenClaw comprend la voie du paquet du plugin Codex en direct, qui installe le paquet candidat OpenClaw, installe le plugin Codex depuis `codex_plugin_spec`CLICLIOpenClawOpenAI ou une archive tar de même référence avec une approbation d'installation explicite de la CLI Codex, exécute les prévols de la CLI Codex, puis exécute plusieurs tours d'agent OpenClaw de même session contre OpenAI. `plugins-runtime-core`, `plugins-runtime` et `plugins-integrations` restent des alias agrégés de plugin/runtime. L'alias de voie `install-e2e` reste l'alias de réexécution manuelle agrégé pour les deux voies de l'installateur de fournisseur.

OpenWebUI est intégré dans `plugins-runtime-services` lorsque la couverture complète du chemin de version le demande, et conserve un fragment autonome `openwebui`npm uniquement pour les répartitions OpenWebUI exclusives. Les voies de mise à jour de canal groupé réessayent une fois en cas de pannes réseau transitoires npm.

Chaque chunk téléverse `.artifacts/docker-tests/` avec les journaux de voie, les minutages, `summary.json`, `failures.json`, les minutages de phase, le JSON du planificateur, les tables de voie lente et les commandes de réexécution par voie. L'entrée du workflow `docker_lanes`DockerDockerGitHub exécute les voies sélectionnées par rapport aux images préparées au lieu des tâches de chunk, ce qui maintient le débogage des voies échouées limité à une tâche Docker ciblée et prépare, télécharge ou réutilise l'artefact de paquet pour cette exécution ; si une voie sélectionnée est une voie Docker active, la tâche ciblée construit localement l'image de test actif pour cette réexécution. Les commandes de réexécution GitHub générées par voie incluent `package_artifact_run_id`, `package_artifact_name`, et les entrées d'image préparées lorsque ces valeurs existent, afin qu'une voie échouée puisse réutiliser le paquet et les images exacts de l'exécution échouée.

```bash
pnpm test:docker:rerun <run-id>      # download Docker artifacts and print combined/per-lane targeted rerun commands
pnpm test:docker:timings <summary>   # slow-lane and phase critical-path summaries
```

Le workflow planifié live/E2E exécute quotidiennement la suite complète Docker de chemin de publication.

## Prépublication de plugin

`Plugin Prerelease` est une couverture produit/paquet plus coûteuse, c'est donc un workflow distinct dispatché par `Full Release Validation` ou par un opérateur explicite. Les demandes de tirage normales, les poussées `main`DockerDocker, et les dispatches manuels autonomes de CI gardent cette suite désactivée. Il équilibre les tests de plugin groupés sur huit travailleurs d'extension ; ces tâches de shard d'extension exécutent jusqu'à deux groupes de configuration de plugin à la fois avec un travailleur Vitest par groupe et un tas Node plus important pour que les lots de plugin lourds en importations ne créent pas de tâches CI supplémentaires. Le chemin de prépublication Docker uniquement pour la publication regroupe les voies Docker ciblées en petits groupes pour éviter de réserver des dizaines de runners pour des tâches d'une à trois minutes. Le workflow téléverse également un artefact `plugin-inspector-advisory` informationnel à partir de `@openclaw/plugin-inspector` ; les résultats de l'inspecteur sont des entrées de triage et ne changent pas la barrière de prépublication de plugin bloquante.

## Labo QA

QA Lab dispose de voies CI dédiées en dehors du principal workflow à portée intelligente. La parité agentic est imbriquée sous les harnais QA et release plus larges, et non un workflow PR autonome. Utilisez `Full Release Validation` avec `rerun_group=qa-parity` lorsque la parité doit accompagner une exécution de validation large.

- Le workflow `QA-Lab - All Lanes` s'exécute chaque nuit sur `main`MatrixTelegramDiscord et lors d'un déclenchement manuel ; il déploie la voie de parité simulée, la voie Matrix active, et les voies Telegram et Discord actives en tant que tâches parallèles. Les tâches actives utilisent l'environnement `qa-live-shared`TelegramDiscord, et Telegram/Discord utilisent des baux Convex.

Les vérifications de version exécutent les voies de transport actives Matrix et Telegram avec le fournisseur simulé déterministe et des modèles qualifiés simulés (MatrixTelegram`mock-openai/gpt-5.5` et `mock-openai/gpt-5.5-alt`Docker) afin que le contrat de canal soit isolé de la latence du modèle actif et du démarrage normal du plugin fournisseur. La passerelle de transport active désactive la recherche mémoire car la parité QA couvre le comportement de la mémoire séparément ; la connectivité du fournisseur est couverte par les suites de modèle actif séparées, de fournisseur natif et de fournisseur Docker.

Matrix utilise Matrix`--profile fast` pour les portes planifiées et de version, en ajoutant `--fail-fast`CLICLI uniquement lorsque le CLI extrait le prend en charge. La valeur par défaut du CLI et l'entrée du workflow manuel restent `all` ; le déclenchement manuel `matrix_profile=all`Matrix fractionne toujours la couverture Matrix complète en tâches `transport`, `media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`.

`OpenClaw Release Checks` exécute également les voies critiques du QA Lab avant l'approbation de la version ; sa porte de parité QA exécute les packs candidat et de base en tant que tâches de voies parallèles, puis télécharge les deux artefacts dans une petite tâche de rapport pour la comparaison de parité finale.

Pour les PR normaux, suivez les preuves CI/vérification étendues au lieu de traiter la parité comme un statut requis.

## CodeQL

Le workflow `CodeQL` est intentionnellement un scanner de sécurité de premier passage étroit, et non le balayage complet du dépôt. Les exécutions quotidiennes, manuelles et de garde des pull requests non-brouillons scannent le code du workflow Actions ainsi que les surfaces JavaScript/TypeScript les plus à risque avec des requêtes de sécurité haute confiance filtrées pour les `security-severity` hautes/critiques.

La garde de la pull request reste légère : elle ne démarre que pour les modifications sous `.github/actions`, `.github/codeql`, `.github/workflows`, `packages` ou `src`, et elle exécute la même matrice de sécurité à haute confiance que le workflow planifié. AndroidmacOS et macOS CodeQL restent en dehors des paramètres par défaut des PR.

### Catégories de sécurité

| Catégorie                                         | Surface                                                                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-security-high/core-auth-secrets`         | Auth, secrets, sandbox, cron et base de référence de la passerelle                                                                                                               |
| `/codeql-security-high/channel-runtime-boundary`  | Contrats d'implémentation de channel de base plus le runtime du plugin channel, la passerelle, le SDK de plugin, les secrets et les points de contact d'audit                    |
| `/codeql-security-high/network-ssrf-boundary`     | Surfaces de politique SSRF, d'analyse IP, de garde réseau, de récupération web et SSRF du SDK de plugin de base                                                                  |
| `/codeql-security-high/mcp-process-tool-boundary` | Serveurs MCP, assistants d'exécution de processus, livraison sortante et portes d'exécution d'outil de l'agent                                                                   |
| `/codeql-security-high/plugin-trust-boundary`     | Installation de plugin, chargeur, manifeste, registre, installation du gestionnaire de paquets, chargement source et surfaces de confiance du contrat de paquet du SDK de plugin |

### Shards de sécurité spécifiques à la plateforme

- `CodeQL Android Critical Security` — shard de sécurité Android planifié. Construit manuellement l'application Android pour CodeQL sur le plus petit runner Blacksmith Linux accepté par la santé du workflow. Téléverse sous `/codeql-critical-security/android`.
- `CodeQL macOS Critical Security`macOSmacOSmacOS — fragment de sécurité macOS hebdomadaire/manuel. Compile manuellement l'application macOS pour CodeQL sur macOS Blacksmith, filtre les résultats de compilation des dépendances du SARIF téléchargé, et télécharge sous `/codeql-critical-security/macos`macOS. Conservé en dehors des valeurs par défaut quotidiennes car la compilation macOS domine le temps d'exécution même lorsqu'elle est propre.

### Catégories de qualité critique

`CodeQL Critical Quality`Linux est le fragment non-sécurité correspondant. Il exécute uniquement des requêtes de qualité JavaScript/TypeScript non-sécurité de gravité erreur sur des surfaces à forte valeur restreintes sur le runner Linux Blacksmith plus petit. Sa garde de pull request est intentionnellement plus petite que le profil planifié : les PR non-brouillon exécutent uniquement les fragments correspondants `agent-runtime-boundary`, `config-boundary`, `core-auth-secrets`, `channel-runtime-boundary`, `gateway-runtime-boundary`, `memory-runtime-boundary`, `mcp-process-runtime-boundary`, `provider-runtime-boundary`, `session-diagnostics-boundary`, `plugin-boundary`, `plugin-sdk-package-contract`, et `plugin-sdk-reply-runtime` pour le code d'exécution et de répartition de réponse de commande/model/tool d'agent, le code de schéma/migration/IO de configuration, le code d'auth/secrets/bac à sable/sécurité, le runtime du plugin channel principal et groupé, le protocole/méthode-serveur Gateway, la colle runtime/SDK mémoire, MCP/processus/livraison sortante, le catalogue model/runtime provider, les files de diagnostic/livraison session, le chargeur de plugin, le contrat-paquet/SDK Plugin, ou les modifications du runtime de réponse SDK Plugin. Les modifications de configuration CodeQL et du workflow de qualité exécutent les douze fragments de qualité PR.

La répartition manuelle accepte :

```
profile=all|agent-runtime-boundary|config-boundary|core-auth-secrets|channel-runtime-boundary|gateway-runtime-boundary|memory-runtime-boundary|mcp-process-runtime-boundary|plugin-boundary|plugin-sdk-package-contract|plugin-sdk-reply-runtime|provider-runtime-boundary|session-diagnostics-boundary
```

Les profils étroits sont des hooks d'enseignement/itération pour exécuter un fragment de qualité en isolation.

| Catégorie                                               | Surface                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/codeql-critical-quality/core-auth-secrets`            | Code de limite de sécurité Auth, secrets, bac à sable, cron et Gateway                                                                                                                                                                                |
| `/codeql-critical-quality/config-boundary`              | Schéma de configuration, migration, normalisation et contrats IO                                                                                                                                                                                      |
| `/codeql-critical-quality/gateway-runtime-boundary`     | Schémas de protocole Gateway et contrats de méthode serveur                                                                                                                                                                                           |
| `/codeql-critical-quality/channel-runtime-boundary`     | Contrats d'implémentation du plugin de canal principal et de canal groupé                                                                                                                                                                             |
| `/codeql-critical-quality/agent-runtime-boundary`       | Exécution de commandes, répartition model/provider, répartition et files d'attente de réponse automatique, et contrats d'exécution du plan de contrôle de l'ACP                                                                                       |
| `/codeql-critical-quality/mcp-process-runtime-boundary` | Serveurs MCP et ponts d'outils, assistants de supervision de processus, et contrats de livraison sortante                                                                                                                                             |
| `/codeql-critical-quality/memory-runtime-boundary`      | SDK hôte de mémoire, façades d'exécution de la mémoire, alias du SDK de plugin de mémoire, colle d'activation de l'exécution de la mémoire, et commandes du docteur de la mémoire                                                                     |
| `/codeql-critical-quality/session-diagnostics-boundary` | Fonctionnement interne de la file d'attente de réponses, files d'attente de livraison de session, assistants de liaison/livraison de session sortante, surfaces de bundles d'événements/journaux de diagnostic, et contrats CLI du docteur de session |
| `/codeql-critical-quality/plugin-sdk-reply-runtime`     | Répartition des réponses entrantes du SDK de plugin, assistants de payload/découpage/exécution des réponses, options de réponse de canal, files d'attente de livraison, et assistants de liaison session/thread                                       |
| `/codeql-critical-quality/provider-runtime-boundary`    | Normalisation du catalogue de modèles, authentification et découverte des providers, enregistrement de l'exécution du provider, valeurs par défaut/catalogues des providers, et registres web/recherche/récupération/intégration                      |
| `/codeql-critical-quality/ui-control-plane`             | Amorçage de l'interface de contrôle, persistance locale, flux de contrôle de passerelle, et contrats d'exécution du plan de contrôle des tâches                                                                                                       |
| `/codeql-critical-quality/web-media-runtime-boundary`   | Récupération/recherche web de base, E/S média, compréhension média, génération d'images, et contrats d'exécution de génération média                                                                                                                  |
| `/codeql-critical-quality/plugin-boundary`              | Chargeur, registre, surface publique, et contrats de point d'entrée du SDK de plugin                                                                                                                                                                  |
| `/codeql-critical-quality/plugin-sdk-package-contract`  | Source publiée du SDK de plugin côté package et assistants de contrat de package de plugin                                                                                                                                                            |

La qualité reste séparée de la sécurité afin que les résultats de qualité puissent être planifiés, mesurés, désactivés ou étendus sans obscurcir le signal de sécurité. L'extension CodeQL pour Swift, Python et les plugins groupés ne doit être réintégrée que sous forme de travail de suivi délimité ou fragmenté une fois que les profils étroits ont une exécution et un signal stables.

## Workflows de maintenance

### Docs Agent

Le workflow `Docs Agent` est une voie de maintenance Codex pilotée par les événements pour garder les documents existants alignés avec les modifications récemment intégrées. Il n'a pas de planification pure : une exécution CI de push non-bot réussie sur `main` peut la déclencher, et une répartition manuelle peut l'exécuter directement. Les invocations d'exécution de workflow sont ignorées lorsque `main` a avancé ou lorsqu'une autre exécution de Docs Agent non ignorée a été créée au cours de la dernière heure. Lorsqu'elle s'exécute, elle examine la plage de commits du SHA source Docs Agent non ignoré précédent jusqu'au `main` actuel, ainsi une exécution horaire peut couvrir toutes les modifications principales accumulées depuis le dernier passage de documentation.

### Test Performance Agent

Le workflow `Test Performance Agent` est une voie de maintenance Codex pilotée par les événements pour les tests lents. Il n'a pas de planification pure : une exécution CI de push non-bot réussie sur `main` peut la déclencher, mais elle est ignorée si une autre invocation d'exécution de workflow a déjà été exécutée ou est en cours ce jour-là (UTC). La répartition manuelle contourne cette porte d'activité quotidienne. La voie génère un rapport de performance Vitest groupé pour la suite complète, permet à Codex de n'apporter que de petites corrections de performance de tests préservant la couverture au lieu de refactorisations importantes, puis réexécute le rapport de la suite complète et rejette les modifications qui réduisent le nombre de tests de référence réussis. Le rapport groupé enregistre le temps d'horloge par configuration et le RSS maximal sur Linux et macOS, de sorte que la comparaison avant/après met en évidence les écarts de mémoire des tests à côté des écarts de durée. Si la référence contient des tests échouant, Codex peut ne corriger que les échecs évidents et le rapport de la suite complète après agent doit réussir avant que quoi que ce soit soit validé. Lorsque `main` avance avant que le push du bot ne soit intégré, la voie effectue un rebase du patch validé, réexécute `pnpm check:changed` et réessaie le push ; les patchs obsolètes en conflit sont ignorés. Il utilise Ubuntu hébergé par GitHub afin que l'action Codex puisse conserver la même posture de sécurité drop-sudo que l'agent de documentation.

### Duplicate PRs After Merge

Le workflow `Duplicate PRs After Merge` est un workflow manuel pour les mainteneurs effectuant le nettoyage des doublons après l'intégration. Il fonctionne par défaut en mode dry-run et ne ferme que les PR explicitement listés lorsque `apply=true`. Avant de modifier GitHub, il vérifie que le PR intégré a été fusionné et que chaque doublon possède soit un problème référencé commun, soit des hunks de modification qui se chevauchent.

```bash
gh workflow run duplicate-after-merge.yml \
  -f landed_pr=70532 \
  -f duplicate_prs='70530,70592' \
  -f apply=true
```

## Portes de vérification locale et routage modifié

La logique locale des voies modifiées (changed-lane) réside dans `scripts/changed-lanes.mjs` et est exécutée par `scripts/check-changed.mjs`. Cette porte de vérification locale est plus stricte quant aux limites de l'architecture que le périmètre large de la plateforme CI :

- les modifications de production du cœur exécutent core prod, core test typecheck ainsi que core lint/guards ;
- les modifications de test uniquement du cœur n'exécutent que core test typecheck ainsi que core lint ;
- les modifications de production d'extension exécutent extension prod, extension test typecheck ainsi que extension lint ;
- les modifications de test uniquement d'extension exécutent extension test typecheck ainsi que extension lint ;
- les modifications du Plugin SDK public ou des plugin-contracts s'étendent à extension typecheck car les extensions dépendent de ces contrats du cœur (les parcours Vitest d'extension restent un travail de test explicite) ;
- les augmentations de version uniquement de métadonnées de publication exécutent des vérifications ciblées sur la version, la configuration et les dépendances racines ;
- les modifications inconnues à la racine ou dans la configuration échouent en toute sécurité vers toutes les voies de vérification.

Le routage local des tests modifiés réside dans `scripts/test-projects.test-support.mjs` et est intentionnellement moins coûteux que `check:changed` : les modifications directes de tests s'exécutent elles-mêmes, les modifications de source préfèrent les mappages explicites, puis les tests frères et les dépendants du graphe d'importation. La configuration de livraison partagée pour les salles de groupe est l'un des mappages explicites : les modifications de la configuration de réponse visible du groupe, du mode de livraison de réponse source, ou du système de message-tool (system prompt) passent par les tests de réponse du cœur ainsi que par les régressions de livraison Discord et Slack afin qu'un changement par défaut partagé échoue avant le premier push de PR. N'utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` que lorsque le changement est suffisamment large à l'échelle du harnais pour que l'ensemble mappé bon marché ne soit pas un substitut fiable.

## Validation Testbox

Crabbox est l'enveloppe de boîte distante propriétaire du dépôt pour la preuve Linux des mainteneurs. Utilisez-la depuis la racine du dépôt lorsqu'une vérification est trop large pour une boucle d'édition locale, lorsque la parité CI est importante, ou lorsque la preuve nécessite des secrets, Docker, des voies de paquets, des boîtes réutilisables ou des journaux distants. Le backend OpenClaw normal est LinuxDockerOpenClaw`blacksmith-testbox`Hetzner ; la capacité AWS/Hetzner détenue est un repli pour les pannes de Blacksmith, les problèmes de quota ou les tests explicites de capacité détenue.

Les exécutions Blacksmith prises en charge par Crabbox effectuent les étapes warm, claim, sync, run, report et clean up sur des Testboxes à usage unique. La vérification de cohérence de synchronisation intégrée échoue rapidement lorsque les fichiers racine requis tels que `pnpm-lock.yaml` disparaissent ou lorsque `git status --short` affiche au moins 200 suppressions suivies. Pour les PR de grandes suppressions intentionnelles, définissez `OPENCLAW_TESTBOX_ALLOW_MASS_DELETIONS=1` pour la commande distante.

Crabbox termine également une invocation locale de la CLI Blacksmith qui reste dans la phase de synchronisation pendant plus de cinq minutes sans sortie post-synchronisation. Définissez CLI`CRABBOX_BLACKSMITH_SYNC_TIMEOUT_MS=0` pour désactiver cette garde, ou utilisez une valeur en millisecondes plus élevée pour les différences locales inhabituellement grandes.

Avant une première exécution, vérifiez l'enveloppe depuis la racine du dépôt :

```bash
pnpm crabbox:run -- --help | sed -n '1,120p'
```

L'enveloppe du dépôt refuse un binaire Crabbox obsolète qui n'annonce pas `blacksmith-testbox`. Passez le fournisseur explicitement même si `.crabbox.yaml` a des valeurs par défaut owned-cloud. Dans les arbres de travail Codex ou les extractions liées/partielles, évitez le script local `pnpm crabbox:run` car pnpm peut réconcilier les dépendances avant le démarrage de Crabbox ; invoquez plutôt directement l'enveloppe node :

```bash
node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox --timing-json --shell -- "pnpm test <path-or-filter>"
```

Les exécutions prises en charge par Blacksmith nécessitent Crabbox 0.22.0 ou plus récent afin que l'enveloppe obtienne le comportement actuel de synchronisation, de file d'attente et de nettoyage de Testbox. Lors de l'utilisation de l'extraction sœur, reconstruisez le binaire local ignoré avant le travail de chronométrage ou de preuve :

```bash
version="$(git -C ../crabbox describe --tags --always --dirty | sed 's/^v//')" \
  && go build -C ../crabbox -trimpath -ldflags "-s -w -X github.com/openclaw/crabbox/internal/cli.version=${version}" -o bin/crabbox ./cmd/crabbox
```

Changed gate :

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

Focused test rerun :

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

Full suite :

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

Lisez le résumé JSON final. Les champs utiles sont `provider`, `leaseId`, `syncDelegated`, `exitCode`, `commandMs` et `totalMs`. Les exécutions Crabbox ponctuelles soutenues par Blacksmith doivent arrêter le Testbox automatiquement ; si une exécution est interrompue ou si le nettoyage n'est pas clair, inspectez les boîtes actives et n'arrêtez que celles que vous avez créées :

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

Si Crabbox est la couche défaillante mais que Blacksmith lui-même fonctionne, utilisez Blacksmith en direct uniquement pour les diagnostics tels que `list`, `status` et le nettoyage. Corrigez le chemin Crabbox avant de considérer une exécution Blacksmith directe comme une preuve de maintenance.

Si `blacksmith testbox list --all` et `blacksmith testbox status` fonctionnent mais que les nouveaux échauffements restent `queued` sans IP ni d'URL d'exécution Actions après quelques minutes, considérez cela comme une pression du provider, de la file d'attente, de la facturation ou de la limite d'org de Blacksmith. Arrêtez les identifiants mis en file d'attente que vous avez créés, évitez de démarrer d'autres Testboxes, et déplacez la preuve vers le chemin de capacité Crabbox owned ci-dessous pendant que quelqu'un vérifie le tableau de bord Blacksmith, la facturation et les limites de l'organisation.

Passez à la capacité Crabbox owned uniquement lorsque Blacksmith est en panne, limité par le quota, qu'il lui manque l'environnement nécessaire, ou que la capacité owned est explicitement l'objectif :

```bash
CRABBOX_CAPACITY_REGIONS=eu-west-1,eu-west-2,eu-central-1,us-east-1,us-west-2 \
  pnpm crabbox:warmup -- --provider aws --class standard --market on-demand --idle-timeout 90m
pnpm crabbox:hydrate -- --id <cbx_id-or-slug>
pnpm crabbox:run -- --id <cbx_id-or-slug> --timing-json --shell -- "pnpm check:changed"
pnpm crabbox:stop -- <cbx_id-or-slug>
```

Sous pression AWS, évitez `class=beast` sauf si la tâche nécessite vraiment un processeur de classe 48xlarge. Une demande `beast` commence à 192 vCPUs et constitue le moyen le plus simple de déclencher le quota régional EC2 Spot ou On-Demand Standard. Le `.crabbox.yaml` appartenant au dépôt est configuré par défaut sur `standard`, plusieurs régions de capacité et `capacity.hints: true`, afin que les baux AWS négociés affichent la région/le marché sélectionné, la pression sur le quota, le repli Spot et les avertissements de classe haute pression. Utilisez `fast` pour les vérifications larges plus lourdes, `large` uniquement après que standard/fast ne suffisent plus, et `beast` uniquement pour les volets exceptionnellement liés au processeur, tels que les matrices Docker pour la suite complète ou tous les plugins, la validation explicite des versions/bloqueurs, ou le profilage des performances à cœur élevé. N'utilisez pas `beast` pour `pnpm check:changed`, les tests ciblés, le travail uniquement sur la documentation, le lint/typecheck ordinaire, les petites reproductions E2E ou le diagnostic des pannes de Blacksmith. Utilisez `--market on-demand` pour le diagnostic de la capacité afin que l'agitation du marché Spot ne soit pas mélangée au signal.

`.crabbox.yaml` définit les valeurs par défaut de fournisseur, de synchronisation et d'hydratation des GitHub Actions pour les volets owned-cloud. Il exclut le `.git` local afin que l'extraction Actions hydratée conserve ses propres métadonnées Git distantes au lieu de synchroniser les distants locaux du responsable et les magasins d'objets, et il exclut les artefacts d'exécution/de construction locaux qui ne doivent jamais être transférés. `.github/workflows/crabbox-hydrate.yml` gère l'extraction, la configuration Node/pnpm, la récupération `origin/main` et le transfert d'environnement non secret pour les commandes `crabbox run --id <cbx_id>` owned-cloud.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Canaux de développement](/fr/install/development-channels)

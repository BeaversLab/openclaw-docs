---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Kit de test complet (suites, live, Docker) : [Testing](/fr/help/testing)
- Validation des paquets de mises à jour et de plugins : [Testing updates and plugins](/fr/help/testing-updates-plugins)

- Ordre des tests locaux de routine :
  1. `pnpm test:changed` pour la preuve Vitest à portée modifiée.
  2. `pnpm test <path-or-filter>` pour un fichier, un répertoire ou une cible explicite.
  3. `pnpm test` uniquement lorsque vous avez intentionnellement besoin de la suite Vitest locale complète.
- `pnpm test:force` : Tue tout processus de passerelle résiduel tenant le port de contrôle par défaut, puis exécute la suite Vitest complète avec un port de passerelle isolé pour que les tests serveur n'entrent pas en collision avec une instance en cours d'exécution. Utilisez ceci lorsqu'une exécution de passerelle précédente a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Il s'agit d'une porte de couverture de voie unitaire par défaut, et non d'une couverture tous fichiers du dépôt entier. Les seuils sont de 70 % pour les lignes/fonctions/instructions et de 55 % pour les branches. Parce que `coverage.all` est faux et que les portées de couverture de la voie par défaut incluent les tests unitaires non rapides avec des fichiers source frères, la porte mesure le source appartenant à cette voie au lieu de chaque import transitif qu'il se trouve à charger.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : exécution intelligente et économique de tests modifiés. Il exécute des cibles précises à partir d'éditions directes de tests, de fichiers `*.test.ts` frères, de mappages source explicites et du graphe d'import local. Les modifications larges/config/paquet sont ignorées à moins qu'elles ne correspondent à des tests précis.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` : exécution explicite large de tests modifiés. Utilisez-le lorsqu'une modification de harnais de test/config/paquet doit revenir au comportement plus large de test modifié de Vitest.
- `pnpm changed:lanes` : affiche les voies architecturales déclenchées par la diff contre `origin/main`.
- `pnpm check:changed`: délègue à Crabbox/Testbox par défaut en dehors de CI, puis exécute la porte de contrôle intelligente des modifications pour le diff par rapport à `origin/main` à l'intérieur de l'enfant distant. Il exécute les commandes typecheck, lint et guard pour les volets architecturaux concernés, mais n'exécute pas les tests Vitest. Utilisez `pnpm test:changed` ou `pnpm test <target>` explicite pour la preuve de test.
- Arborescences de travail Codex et extraits liés/clairsemés: évitez les `pnpm test*`, `pnpm check*` et `pnpm crabbox:run` locaux directs, sauf si vous avez vérifié que pnpm ne réconciliera pas les dépendances. Pour une preuve minime de fichiers explicites, utilisez `node scripts/run-vitest.mjs <path-or-filter>`; pour les portes modifiées ou une preuve étendue, utilisez `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... -- env OPENCLAW_CHECK_CHANGED_REMOTE_CHILD=1 OPENCLAW_CHANGED_LANES_RAW_SYNC=1 corepack pnpm check:changed` afin que pnpm s'exécute à l'intérieur de Testbox.
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>` : conserve la sérialisation des vérifications lourdes à l'intérieur de l'arborescence de travail actuelle au lieu du répertoire commun Git pour des commandes telles que `pnpm check:changed` et `pnpm test ...` ciblées. Utilisez-le uniquement sur des hôtes locaux à haute capacité lorsque vous exécutez intentionnellement des vérifications indépendantes sur plusieurs arborescences de travail liées.
- `pnpm test` : achemine les cibles de fichiers/répertoires explicites via des voies Vitest délimitées. Les exécutions sans cible constituent une preuve complète de la suite : elles utilisent des groupes de partitions fixes, s'étendent aux configurations feuilles pour une exécution parallèle locale et impriment le déploiement attendu des partitions locales avant de commencer. Le groupe d'extensions s'étend toujours aux configurations de partition par extension au lieu d'un processus géant de projet racine.
- Les exécutions du wrapper de test se terminent par un bref résumé `[test] passed|failed|skipped ... in ...`. La ligne de durée propre de Vitest reste le détail par partition.
- État de test partagé OpenClaw : utilisez `src/test-utils/openclaw-test-state.ts` de Vitest lorsqu'un test a besoin d'un `HOME` isolé, d'un `OPENCLAW_STATE_DIR`, d'un `OPENCLAW_CONFIG_PATH`, d'une fixture de configuration, d'un espace de travail, d'un répertoire d'agent ou d'un magasin de profil d'authentification.
- Interface utilisateur de contrôle simulée E2E : utilisez `pnpm test:ui:e2e`Gateway pour la voie Vitest + Playwright qui démarre l'interface utilisateur de contrôle Vite et pilote une page Chromium réelle contre un WebSocket Gateway simulé. Les tests se trouvent dans `ui/src/**/*.e2e.test.ts` ; les simulacres partagés et les contrôles se trouvent dans `ui/src/test-helpers/control-ui-e2e.ts`. `pnpm test:e2e` inclut cette voie. Dans les arbres de travail Codex, préférez `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts` pour une preuve ciblée minime après l'installation des dépendances, ou Testbox/Crabbox pour une preuve GUI plus large.
- Assistants E2E de processus : utilisez `test/helpers/openclaw-test-instance.ts`GatewayCLI lorsqu'un test E2E au niveau du processus Vitest a besoin d'un Gateway en cours d'exécution, d'un environnement CLI, d'une capture de journal et d'un nettoyage en un seul endroit.
- Tests PTY TUI : utilisez TUI`node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` pour la voie PTY à faux backend rapide. Utilisez `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` ou `pnpm tui:pty:test:watch --mode local` pour le test de fumée `tui --local` plus lent, qui simule uniquement le point de terminaison du modèle externe. Assurez un texte visible stable ou des appels de fixtures, et non des instantanés ANSI bruts.
- Assistants E2E Docker/Bash : les voies qui sourcent Docker`scripts/lib/docker-e2e-image.sh` peuvent passer `docker_e2e_test_state_shell_b64 <label> <scenario>` dans le conteneur et le décoder avec `scripts/lib/openclaw-e2e-instance.sh` ; les scripts multi-domiciles peuvent passer `docker_e2e_test_state_function_b64` et appeler `openclaw_test_state_create <label> <scenario>` dans chaque flux. Les appelants de niveau inférieur peuvent utiliser `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` pour un extrait de shell dans le conteneur, ou `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` pour un fichier d'environnement hôte sourçable. Le `--` avant `create` empêche les nouveaux runtimes Node de traiter `--env-file`DockerGateway comme un indicateur Node. Les voies Docker/Bash qui lancent un Gateway peuvent sourcer `scripts/lib/openclaw-e2e-instance.sh`OpenAIGateway à l'intérieur du conteneur pour la résolution du point d'entrée, le démarrage simulé d'OpenAI, le démarrage Gateway en premier plan/arrière-plan, les sondes de disponibilité, l'export de l'état de l'environnement, les vidages de journaux et le nettoyage des processus.
- Les exécutions de shards complètes, d'extension et avec modèle d'inclusion mettent à jour les données de minutage locales dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures sur l'ensemble de la configuration utilisent ces minutages pour équilibrer les shards lents et rapides. Les shards CI avec modèle d'inclusion ajoutent le nom du shard à la clé de minutage, ce qui maintient les minutages des shards filtrés visibles sans remplacer les données de minutage de la configuration complète. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de minutage local.
- Les fichiers de test sélectionnés `plugin-sdk` et `commands` sont maintenant acheminés via des voies légères dédiées qui ne conservent que `test/setup.ts`, laissant les cas lourds en temps d'exécution sur leurs voies existantes.
- Les fichiers source avec des tests frères mappent vers ce frère avant de revenir aux globs de répertoires plus larges. Les modifications d'assistants sous `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` et `src/plugins/contracts` utilisent un graphe d'importation local pour exécuter les tests importants au lieu d'exécuter largement chaque shard lorsque le chemin de dépendance est précis.
- `auto-reply` se divise maintenant aussi en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests plus légers de statut/jeton/assistant de niveau supérieur.
- La configuration de base de Vitest utilise par défaut maintenant `pool: "threads"` et `isolate: false`, avec le moteur non isolé partagé activé dans les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les shards d'extension/plugin. Les plugins de canal lourds, le plugin navigateur et OpenAI s'exécutent en tant que shards dédiés ; les autres groupes de plugins restent regroupés. Utilisez `pnpm test extensions/<id>` pour une voie groupée de plugins.
- `pnpm test:perf:imports` : active le rapportage de la durée d'importation + de la répartition des importations de Vitest, tout en utilisant toujours le routage par voies délimitées pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les performances du chemin acheminé en mode modifié par rapport à l'exécution native du projet racine pour la même diff git validée.
- `pnpm test:perf:changed:bench -- --worktree` référence les modifications actuelles de l'arborescence de travail sans d'abord valider.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit des profils CPU + heap pour le lanceur d'unités (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json` : exécute chaque configuration de feuille Vitest de suite complète en série et écrit des données de durée groupées ainsi que des artefacts JSON/journaux par configuration. L'agent de performance des tests l'utilise comme ligne de base avant de tenter de corriger les tests lents.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` : compare les rapports groupés après une modification axée sur les performances.
- `pnpm test:docker:timings <summary.json>` inspecte les voies Docker lentes après une exécution complète de Docker ; utilisez `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées peu coûteuses à partir des mêmes artefacts.
- Intégration du Gateway : optionnel via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute l'agrégat E2E du dépôt : tests de fumée de bout en bout du gateway plus la voie E2E du navigateur simulé de l'interface de contrôle.
- `pnpm test:e2e:gateway` : Exécute des tests de fumée de bout en bout du gateway (appariement multi-instance WS/HTTP/node). Par défaut `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour des journaux détaillés.
- `pnpm test:live` : Exécute les tests en direct des providers (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au provider) pour ne pas être ignoré.
- `pnpm test:docker:all` : Construit l'image de test en direct partagée, conditionne OpenClaw une fois sous forme d'archive tar npm, construit/réutilise une image de runner Node/Git nue ainsi qu'une image fonctionnelle qui installe cette archive dans `/app`, puis exécute les pistes de test de fumée Docker avec `OPENCLAW_SKIP_DOCKER_BUILD=1` via un planificateur pondéré. L'image nue (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) est utilisée pour les pistes d'installation/de mise à jour/de dépendance de plugin ; ces pistes montent l'archive préconstruite au lieu d'utiliser les sources copiées du dépôt. L'image fonctionnelle (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) est utilisée pour les pistes de fonctionnalité d'application construite normales. `scripts/package-openclaw-for-docker.mjs` est l'outil unique d'empaquetage de paquets local/CI et valide l'archive ainsi que `dist/postinstall-inventory.json` avant que Docker ne la consomme. Les définitions des pistes Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. `node scripts/test-docker-all.mjs --plan-json` émet le plan CI propriétaire du planificateur pour les pistes sélectionnées, les types d'images, les besoins en paquets/images en direct, les scénarios d'état et les vérifications d'identification sans construire ni exécuter Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` contrôle les emplacements de processus et est par défaut à 10 ; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` contrôle le pool de file d'attente sensible au fournisseur et est par défaut à 10. Les limites des pistes lourdes sont par défaut `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; les limites des fournisseurs sont par défaut d'une piste lourde par fournisseur via `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` et `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Utilisez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` pour les hôtes plus volumineux. Si une piste dépasse le poids effectif ou la limite de ressources sur un hôte à faible parallélisme, elle peut toujours démarrer à partir d'un pool vide et s'exécutera seule jusqu'à ce qu'elle libère de la capacité. Les démarrages de pistes sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création du démon Docker local ; remplacez avec `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. Le runner effectue par défaut des vérifications préliminaires sur Docker, nettoie les conteneurs E2E OpenClaw obsolètes, émet le statut des pistes actives toutes les 30 secondes, partage les caches d'outils CLI du fournisseur entre les pistes compatibles, réessaie une fois par défaut les échecs transitoires du fournisseur en direct (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) et stocke les minutages des pistes dans `.artifacts/docker-tests/lane-timings.json` pour un ordre du plus long au plus court lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste des pistes sans exécuter Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` pour régler la sortie de statut, ou `OPENCLAW_DOCKER_ALL_TIMINGS=0` pour désactiver la réutilisation des minutages. Utilisez `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` pour les pistes déterministes/locales uniquement ou `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` pour les pistes de fournisseurs en direct uniquement ; les alias de paquets sont `pnpm test:docker:local:all` et `pnpm test:docker:live:all`. Le mode en direct uniquement fusionne les pistes en direct principales et de queue en un seul pool du plus long au plus grand afin que les compartiments de fournisseurs puissent regrouper le travail de Claude, Codex et Gemini. Le runner arrête de planifier de nouvelles pistes regroupées après le premier échec, sauf si `OPENCLAW_DOCKER_ALL_FAIL_FAST=0` est défini, et chaque piste a un délai d'attente de secours de 120 minutes remplaçable par `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les pistes en direct/de queue sélectionnées utilisent des limites plus strictes par piste. Les commandes de configuration CLI du backend Docker ont leur propre délai d'attente via `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (défaut 180). Les journaux par piste, `summary.json`, `failures.json` et les minutages de phase sont écrits sous `.artifacts/docker-tests/<run-id>/` ; utilisez `pnpm test:docker:timings <summary.json>` pour inspecter les pistes lentes et `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées peu coûteuses.
- `pnpm test:docker:browser-cdp-snapshot`Gateway: Construit un conteneur E2E source basé sur Chromium, démarre le CDP brut plus un Gateway isolé, exécute `browser doctor --deep`, et vérifie que les instantanés de rôle CDP incluent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- `pnpm test:docker:skill-install`OpenClawDocker: Installe l'archive tar d'OpenClaw empaquetée dans un runner Docker nu, désactive `skills.install.allowUploadedArchives`ClawHub, résout un slug de compétence actuel à partir de la recherche live ClawHub, l'installe via `openclaw skills install`, et vérifie `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json`, et `skills info --json`.
- Les sondes live Docker du backend CLI peuvent être exécutées sous forme de volets ciblés, par exemple CLIDocker`pnpm test:docker:live-cli-backend:claude`, `pnpm test:docker:live-cli-backend:claude:resume`, ou `pnpm test:docker:live-cli-backend:claude:mcp`. Gemini dispose des alias correspondants `:resume` et `:mcp`.
- `pnpm test:docker:openwebui`OpenClaw: Démarre OpenClaw et Open WebUI sous Docker, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel proxyé via `/api/chat/completions`. Nécessite une clé de modèle live utilisable, tire une image externe Open WebUI, et n'est pas censé être stable en CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels`Gateway: Démarre un conteneur Gateway amorcé et un second conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant, et les notifications de canal et d'autorisation de style Claude sur le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes, de sorte que le test reflète ce que le pont émet réellement.
- `pnpm test:docker:upgrade-survivor`OpenClawGatewayRPC : Installe l'archive tar OpenClaw empaquetée sur un appareil d'ancien utilisateur sale, exécute la mise à jour du package ainsi que le doctor non interactif sans clés de provider ou de channel en direct, puis démarre une Gateway en boucle et vérifie que les agents, la configuration du channel, les listes de permission des plugins, les fichiers d'espace de travail/session, l'état des dépendances de plugins hérités obsolètes, le démarrage et le statut RPC survivent.
- `pnpm test:docker:published-upgrade-survivor` : Installe `openclaw@latest` par défaut, sème des fichiers réalistes d'utilisateur existant sans clés de provider ou de channel en direct, configure cette ligne de base avec une recette de commande `openclaw config set`OpenClaw intégrée, met à jour cette installation publiée vers l'archive tar OpenClaw empaquetée, exécute le doctor non interactif, écrit `.artifacts/upgrade-survivor/summary.json`Gateway, puis démarre une Gateway en boucle et vérifie que les intentions configurées, les fichiers d'espace de travail/session, la configuration de plugin obsolète et l'état des dépendances héritées, le démarrage, `/healthz`, `/readyz`RPC et le statut RPC survivent ou sont réparés proprement. Remplacez une ligne de base par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, développez une matrice locale exacte avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telle que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, ou ajoutez des appareils de scénario avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` ; l'ensemble des problèmes signalés inclut `configured-plugin-installs`OpenClaw pour vérifier que les plugins externes OpenClaw configurés s'installent automatiquement lors de la mise à niveau et `stale-source-plugin-shadow` pour empêcher les ombres de plugins source-only de rompre le démarrage. Package Acceptance expose ceux-ci en tant que `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, et résout les jetons de méta-ligne de base tels que `last-stable-4` ou `all-since-2026.4.23`Docker avant de transmettre des spécifications de package exactes aux voies Docker.
- `pnpm test:docker:update-migration` : Exécute le harnais de survie de mise à niveau publiée dans le scénario `plugin-deps-cleanup` exigeant beaucoup de nettoyage, commençant par `openclaw@2026.4.23` par défaut. Le workflow séparé `Update Migration` étend cette voie avec `baselines=all-since-2026.4.23` afin que chaque package stable publié à partir de `.23` passe au candidat et prouve le nettoyage des dépendances des plugins configurés en dehors de l'CI de Full Release.
- `pnpm test:docker:plugins` : Exécute le test de fumée d'installation/mise à jour pour le chemin local, `file:`, les packages du registre npm avec des dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour du marketplace et l'activation/inspection du bundle Claude.

## Portail PR local

Pour les vérifications de portail/intégration PR locales, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes à mémoire limitée, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Bench de latence de modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `pnpm tsx scripts/bench-model.ts --runs 10`
- Env facultatif : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : "Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire."

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279ms (min 1114, max 2431)
- opus médiane 2454ms (min 1224, max 3170)

## Bench de démarrage CLI

Script : [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Utilisation :

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Préréglages :

- `startup` : `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real` : `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all` : les deux préréglages

La sortie inclut `sampleCount`, la moyenne, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. `--cpu-prof-dir` / `--heap-prof-dir` en option écrit les profils V8 par exécution afin que la capture du temps et du profil utilise le même harnais.

Conventions de sortie enregistrées :

- `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` actualise la fixture de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Actualiser avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture avec `pnpm test:startup:bench:check`

## Gateway startup bench

Script : [`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

Le benchmark utilise par défaut le point d'entrée du CLI compilé à `dist/entry.js` ; exécutez
`pnpm build` avant d'utiliser les commandes de script de package. Pour mesurer à la place le
runner source, passez `--entry scripts/run-node.mjs` et gardez ces résultats
séparés des lignes de base du point d'entrée compilé.

Usage :

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

Identifiants de cas :

- `default` : démarrage normal du Gateway.
- `skipChannels` : démarrage du Gateway avec le démarrage du canal ignoré.
- `oneInternalHook` : un hook interne configuré.
- `allInternalHooks` : tous les hooks internes.
- `fiftyPlugins` : 50 plugins de manifeste.
- `fiftyStartupLazyPlugins` : 50 plugins de manifeste startup-lazy.

La sortie comprend la première sortie de processus, `/healthz`, `/readyz`, l'heure du journal d'écoute HTTP,
l'heure du journal prêt du Gateway, le temps CPU, le ratio de cœurs CPU, le RSS max, le tas, les métriques de trace de
démarrage, le délai de boucle d'événements, et les métriques détaillées de la table de recherche des plugins. Le script
active `OPENCLAW_GATEWAY_STARTUP_TRACE=1` dans l'environnement du Gateway enfant.

Lisez `/healthz` comme la vivacité (liveness) : le serveur HTTP peut répondre. Lisez `/readyz` comme la
prêté utilisable : les sidecars des plugins de démarrage, les canaux, et le travail post-attach critique pour la disponibilité
se sont stabilisés. Les hooks de démarrage du Gateway sont distribués
de manière asynchrone et ne font pas partie de la garantie de disponibilité. L'heure du journal prêt est l'
horodatage interne du journal prêt du Gateway ; elle est utile pour l'attribution côté processus
mais ne remplace pas la sonde externe `/readyz`.

Utilisez la sortie JSON ou `--output` lors de la comparaison des modifications. N'utilisez `--cpu-prof-dir` qu'après que la sortie de trace a indiqué un travail d'importation, de compilation ou lié au CPU qui ne peut être expliqué par les seuls timings de phase. Ne comparez pas les résultats du source-runner avec les résultats `dist/entry.js` construits car ils n'ont pas la même base de référence.

## Bench de redémarrage du Gateway

Script : [`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

Le benchmark de redémarrage est pris en charge uniquement sur macOS et Linux. Il utilise SIGUSR1 pour les redémarrages en cours de processus et échoue immédiatement sur Windows.

Le benchmark utilise par défaut le point d'entrée CLI construit à `dist/entry.js` ; exécutez `pnpm build` avant d'utiliser les commandes de script de package. Pour mesurer plutôt le source-runner, passez `--entry scripts/run-node.mjs` et gardez ces résultats séparés des bases de référence des entrées construites.

Utilisation :

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

Identifiants de cas :

- `skipChannels` : redémarrage avec canaux ignorés.
- `skipChannelsAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX activée.
- `skipChannelsNoAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX désactivée.
- `default` : redémarrage normal.
- `fiftyPlugins` : redémarrage avec 50 plugins de manifeste.

La sortie inclut le `/healthz` suivant, le `/readyz` suivant, le temps d'arrêt, le timing de disponibilité du redémarrage, le CPU, le RSS, les métriques de trace de démarrage pour le processus de remplacement, et les métriques de trace de redémarrage pour la gestion des signaux, le vidage du travail actif, les phases de fermeture, le démarrage suivant, le timing de disponibilité et les instantanés mémoire. Le script active `OPENCLAW_GATEWAY_STARTUP_TRACE=1` et `OPENCLAW_GATEWAY_RESTART_TRACE=1` dans l'environnement du Gateway enfant.

Utilisez ce benchmark lorsqu'une modification touche au signal de redémarrage, aux gestionnaires de fermeture, au démarrage après redémarrage, à l'arrêt du sidecar, à la transmission de service, ou à l'état de prêt après redémarrage. Commencez par `skipChannels` lorsque vous isolez la mécanique du Gateway du démarrage du channel. Utilisez `default` ou des cas lourds en plugins uniquement après que le cas étroit a expliqué le chemin de redémarrage.

Les métriques de trace sont des indices d'attribution, pas des verdicts. Une modification de redémarrage doit être jugée à partir de plusieurs échantillons, du span de propriétaire correspondant, du comportement `/healthz` et `/readyz`, et du contrat de redémarrage visible par l'utilisateur.

## Onboarding E2E (Docker)

Docker est facultatif ; cela n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## QR import smoke (Docker)

S'assure que l'helper d'exécution QR maintenu se charge sous les runtimes Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

## Connexes

- [Testing](/fr/help/testing)
- [Testing live](/fr/help/testing-live)
- [Testing updates and plugins](/fr/help/testing-updates-plugins)

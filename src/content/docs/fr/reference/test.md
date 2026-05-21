---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Kit de test complet (suites, en direct, Docker) : [Tests](Docker/en/help/testing)
- Validation des packages de mises à jour et de plugins : [Tests des mises à jour et des plugins](/fr/help/testing-updates-plugins)

- `pnpm test:force` : Tue tout processus gateway résiduel utilisant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Il s'agit d'une barrière de couverture de la voie par défaut des unités (default-unit-lane), et non de la couverture de tous les fichiers du dépôt entier. Les seuils sont de 70 % pour les lignes/fonctions/énoncés et de 55 % pour les branches. Comme `coverage.all` est faux et que les étendues de couverture de la voie par défaut incluent les tests unitaires non rapides avec les fichiers source frères, la barrière mesure le code source possédé par cette voie au lieu de chaque import transitif qu'il se trouve qu'elle charge.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : exécution de test intelligente modifiée économique. Elle exécute des cibles précises à partir de modifications directes de tests, des fichiers `*.test.ts` frères, des mappages de source explicites et du graphe d'importation local. Les modifications larges/config/package sont ignorées à moins qu'elles ne mappent à des tests précis.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` : exécution de test modifiée large explicite. À utiliser lorsqu'une modification de harnais de test/config/package devrait revenir au comportement de test modifié plus large de Vitest.
- `pnpm changed:lanes` : affiche les voies architecturales déclenchées par la différence par rapport à `origin/main`.
- `pnpm check:changed` : exécute la barrière de contrôle modifié intelligent pour la différence par rapport à `origin/main`. Il exécute les commandes typecheck, lint et guard pour les voies architecturales affectées, mais n'exécute pas les tests Vitest. Utilisez `pnpm test:changed` ou un `pnpm test <target>` explicite pour la preuve de test.
- Arborescences de travail Codex et extractions liées/partielles (linked/sparse checkouts) : évitez `pnpm test*`, `pnpm check*` et `pnpm crabbox:run` locaux directs, sauf si vous avez vérifié que pnpm ne réconciliera pas les dépendances. Pour une preuve minime sur un fichier explicite, utilisez `node scripts/run-vitest.mjs <path-or-filter>` ; pour des portes modifiées ou une preuve étendue, utilisez `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... --shell -- "pnpm check:changed"` afin que pnpm s'exécute à l'intérieur de Testbox.
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>` : garde la sérialisation des vérifications lourdes (heavy-check) à l'intérieur de l'arborescence de travail actuelle au lieu du répertoire commun Git pour des commandes telles que `pnpm check:changed` et `pnpm test ...` ciblées. Utilisez-le uniquement sur des hôtes locaux à grande capacité lorsque vous exécutez intentionnellement des vérifications indépendantes sur plusieurs arborescences liées.
- `pnpm test` : achemine les cibles de fichiers/répertoires explicites via des voies (lanes) délimitées de Vitest. Les exécutions sans cible utilisent des groupes de fragments (shards) fixes et s'étendent aux configurations feuilles pour une exécution parallèle locale ; le groupe d'extension s'étend toujours aux configurations de fragments par extension au lieu d'un processus racine de projet géant.
- Les exécutions de wrapper de test se terminent par un bref résumé `[test] passed|failed|skipped ... in ...`. La ligne de durée propre de Vitest reste le détail par fragment.
- État de test OpenClaw partagé : utilisez `src/test-utils/openclaw-test-state.ts` depuis Vitest lorsqu'un test a besoin d'un `HOME`, d'un `OPENCLAW_STATE_DIR`, d'un `OPENCLAW_CONFIG_PATH`, d'une fixture de configuration, d'un espace de travail, d'un répertoire d'agent ou d'un magasin de profils d'authentification isolé.
- Assistants de processus E2E : utilisez `test/helpers/openclaw-test-instance.ts` lorsqu'un test E2E au niveau processus Vitest nécessite un Gateway en cours d'exécution, un environnement CLI, une capture de journaux et un nettoyage au même endroit.
- Docker/Bash E2E helpers : les lanes qui sourcent Docker`scripts/lib/docker-e2e-image.sh` peuvent passer `docker_e2e_test_state_shell_b64 <label> <scenario>` dans le conteneur et le décoder avec `scripts/lib/openclaw-e2e-instance.sh` ; les scripts multi-hébergeurs peuvent passer `docker_e2e_test_state_function_b64` et appeler `openclaw_test_state_create <label> <scenario>` dans chaque flux. Les appelants de niveau inférieur peuvent utiliser `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` pour un extrait de shell dans le conteneur, ou `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` pour un fichier d'environnement hôt pouvant être sourcé. Le `--` avant `create` empêche les runtimes Node plus récents de traiter `--env-file`DockerGateway comme un indicateur Node. Les lanes Docker/Bash qui lancent un Gateway peuvent sourcer `scripts/lib/openclaw-e2e-instance.sh`OpenAIGateway à l'intérieur du conteneur pour la résolution du point d'entrée, le démarrage simulé d'OpenAI, le démarrage en premier plan/arrière-plan du Gateway, les sondes de disponibilité, l'export de l'état de l'environnement, les vidages de journaux et le nettoyage des processus.
- Les exécutions complètes, d'extension et de fragment avec motif d'inclusion mettent à jour les données de minutage locales dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures de la configuration complète utilisent ces minutages pour équilibrer les fragments lents et rapides. Les fragments CI avec motif d'inclusion ajoutent le nom du fragment à la clé de minutage, ce qui permet de garder visibles les minutages des fragments filtrés sans remplacer les données de minutage de la configuration complète. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de minutage local.
- Les fichiers de test sélectionnés `plugin-sdk` et `commands` sont maintenant acheminés par des lanes légères dédiées qui ne conservent que `test/setup.ts`, laissant les cas lourds en runtime sur leurs lanes existantes.
- Les fichiers sources avec des tests frères mappent vers ce frère avant de revenir à des globs de répertoires plus larges. Les modifications d'assistants sous `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` et `src/plugins/contracts` utilisent un graphe d'importation local pour exécuter les tests importants au lieu d'exécuter largement chaque fragment lorsque le chemin de dépendance est précis.
- `auto-reply` se divise maintenant également en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests plus légers de statut/jeton/assistant de niveau supérieur.
- La configuration de base de Vitest utilise maintenant `pool: "threads"` et `isolate: false` par défaut, avec le runner partagé non isolé activé dans toutes les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les shards d'extension/plugin. Les plugins de canal lourds, le plugin navigateur et OpenAI s'exécutent en tant que shards dédiés ; les autres groupes de plugins restent groupés. Utilisez `pnpm test extensions/<id>` pour une voie groupée de plugin.
- `pnpm test:perf:imports` : active le rapportage de la durée d'importation + de la répartition des importations de Vitest, tout en utilisant toujours le routage par voies délimité pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les performances du chemin routé en mode modifié par rapport à l'exécution native du projet racine pour le même diff git validé.
- `pnpm test:perf:changed:bench -- --worktree` compare les performances de l'ensemble de modifications actuel de l'arbre de travail sans valider au préalable.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + tas pour le runner unitaire (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json` : exécute chaque configuration feuille de Vitest pour la suite complète en série et écrit les données de durée groupées ainsi que les artefacts JSON/journaux par configuration. L'Agent de Performance des Tests utilise ceci comme ligne de base avant de tenter des correctifs pour les tests lents.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` : compare les rapports groupés après un changement axé sur les performances.
- Intégration Gateway : opt-in via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute les tests de fumée de bout en bout de la passerelle (appariement WS/HTTP/nœud multi-instance). Par défaut à `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux verbeux.
- `pnpm test:live`API : Exécute les tests en direct du provider (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifiques au provider) pour ne pas les ignorer.
- `pnpm test:docker:all` : Génère l'image de test live partagée, emballe OpenClaw une fois sous forme d'archive npm, génère/réutilise une image d'exécution Node/Git nue ainsi qu'une image fonctionnelle qui installe cette archive dans `/app`, puis exécute les voies de test de fumée Docker avec `OPENCLAW_SKIP_DOCKER_BUILD=1` via un planificateur pondéré. L'image nue (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) est utilisée pour les voies d'installation/de mise à jour/de dépendance de plugin ; ces voies montent l'archive préconstruite au lieu d'utiliser les sources copiées du dépôt. L'image fonctionnelle (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) est utilisée pour les voies de fonctionnalité d'application construite normales. `scripts/package-openclaw-for-docker.mjs` est l'emballeur de paquets local/CI unique et valide l'archive ainsi que `dist/postinstall-inventory.json` avant que Docker ne la consomme. Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. `node scripts/test-docker-all.mjs --plan-json` émet le plan CI propriétaire du planificateur pour les voies, types d'images, besoins en paquets/images live, scénarios d'état et vérifications d'informations d'identification sélectionnés, sans générer ni exécuter Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` contrôle les emplacements de processus et par défaut à 10 ; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` contrôle le pool de queue sensible au provider et par défaut à 10. Les plafonds de voies lourdes par défaut sont `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; les plafonds de provider par défaut sont d'une voie lourde par provider via `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` et `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Utilisez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` pour les hôtes plus volumineux. Si une voie dépasse le poids effectif ou la plafond de ressources sur un hôte à faible parallélisme, elle peut toujours démarrer depuis un pool vide et s'exécutera seule jusqu'à ce qu'elle libère de la capacité. Les démarrages des voies sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création de démon Docker local ; remplacez avec `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. L'exécuteur effectue par défaut des vérifications préliminaires Docker, nettoie les conteneurs E2E OpenClaw périmés, émet le statut de voie active toutes les 30 secondes, partage les caches d'outils CLI du provider entre les voies compatibles, réessaie une fois par défaut les échecs transitoires de provider live (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) et stocke les chronométrages des voies dans `.artifacts/docker-tests/lane-timings.json` pour un ordre du plus long au plus premier lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste des voies sans exécuter Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` pour régler la sortie de statut, ou `OPENCLAW_DOCKER_ALL_TIMINGS=0` pour désactiver la réutilisation du chronométrage. Utilisez `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` pour les voies déterministes/uniquement locales ou `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` pour les voies de provider live uniquement ; les alias de paquets sont `pnpm test:docker:local:all` et `pnpm test:docker:live:all`. Le mode live uniquement fusionne les voies live principales et de queue en un seul pool du plus long au plus premier afin que les buckets de provider puissent regrouper le travail de Claude, Codex et Gemini. L'exécuteur arrête de planifier de nouvelles voies regroupées après le premier échec, sauf si `OPENCLAW_DOCKER_ALL_FAIL_FAST=0` est défini, et chaque voie a un délai d'attente de secours de 120 minutes remplaçable par `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les voies live/de queue sélectionnées utilisent des plafonds par voie plus stricts. Les commandes de configuration CLI du backend Docker ont leur propre délai d'attente via `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (par défaut 180). Les journaux par voie, `summary.json`, `failures.json` et les chronométrages de phase sont écrits sous `.artifacts/docker-tests/<run-id>/` ; utilisez `pnpm test:docker:timings <summary.json>` pour inspecter les voies lentes et `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées peu coûteuses.
- `pnpm test:docker:browser-cdp-snapshot` : Construit un conteneur E2E source basé sur Chromium, démarre le CDP brut ainsi qu'un Gateway isolé, exécute `browser doctor --deep` et vérifie que les instantanés de rôles CDP incluent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- `pnpm test:docker:skill-install` : Installe l'archive tar OpenClaw empaquetée dans un exécuteur Docker nu, désactive `skills.install.allowUploadedArchives`, résout un slug de compétence actuel à partir de la recherche ClawHub en direct, l'installe via `openclaw skills install` et vérifie `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` et `skills info --json`.
- Les sondes live CLI du backend Docker peuvent être exécutées en tant que volets focalisés, par exemple `pnpm test:docker:live-cli-backend:claude`, `pnpm test:docker:live-cli-backend:claude:resume` ou `pnpm test:docker:live-cli-backend:claude:mcp`. Gemini possède des alias correspondants `:resume` et `:mcp`.
- `pnpm test:docker:openwebui` : Démarre OpenClaw conteneurisé + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel avec proxy via `/api/chat/completions`. Nécessite une clé de modèle live utilisable, tire une image externe Open WebUI et n'est pas censé être stable en CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un deuxième conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'événements en direct, le routage d'envoi sortant et les notifications de style Claude pour les canaux et les permissions sur le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes, ainsi que le test reflète ce que le pont émet réellement.
- `pnpm test:docker:upgrade-survivor` : Installe l'archive tar OpenClaw empaquetée sur un appareil utilisateur existant sale, exécute la mise à jour du package ainsi que le médecin non interactif sans clés de provider ou de channel en direct, puis démarre un Gateway en boucle et vérifie que les agents, la configuration du channel, les listes d'autorisation des plugins, les fichiers d'espace de travail/session, l'état obsolète des dépendances des plugins hérités, le démarrage et le statut RPC survivent.
- `pnpm test:docker:published-upgrade-survivor` : Installe `openclaw@latest` par défaut, initialise des fichiers utilisateur existants réalistes sans clés de provider ou de channel en direct, configure cette ligne de base avec une recette de commande `openclaw config set` intégrée, met à jour cette installation publiée vers l'archive tar OpenClaw empaquetée, exécute le médecin non interactif, écrit `.artifacts/upgrade-survivor/summary.json`, puis démarre un Gateway en boucle et vérifie que les intentions configurées, les fichiers d'espace de travail/session, la configuration obsolète des plugins et l'état des dépendances héritées, le démarrage, `/healthz`, `/readyz`, et le statut RPC survivent ou sont réparés proprement. Remplacez une ligne de base par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, étendez une matrice locale exacte avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telle que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, ou ajoutez des appareils de scénario avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` ; l'ensemble des problèmes signalés inclut `configured-plugin-installs` pour vérifier que les plugins externes OpenClaw configurés s'installent automatiquement lors de la mise à niveau et `stale-source-plugin-shadow` pour empêcher les ombres de plugins source-only de casser le démarrage. Le package d'acceptation expose ceux-ci en tant que `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, et résout les jetons de méta-ligne de base tels que `last-stable-4` ou `all-since-2026.4.23` avant de transmettre les spécifications exactes de package aux lignes Docker.
- `pnpm test:docker:update-migration` : Exécute le harnais de survie de mise à niveau publiée dans le scénario `plugin-deps-cleanup` , qui nécessite beaucoup de nettoyage, en commençant à `openclaw@2026.4.23` par défaut. Le workflow séparé `Update Migration` étend ce couloir avec `baselines=all-since-2026.4.23` afin que chaque package stable publié à partir de `.23` effectue une mise à niveau vers le candidat et prouve le nettoyage des dépendances des plugins configurés en dehors de la CI de Full Release.
- `pnpm test:docker:plugins` : Exécute un test de fumée d'installation/mise à jour pour le chemin local, `file:`, les packages du registre npm avec des dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour de la place de marché et l'activation/inspection de Claude-bundle.

## Portail PR local

Pour les vérifications d'atterrissage/de portail de PR locaux, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes ayant des contraintes de mémoire, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Benchmark de latence de modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Usage :

- `pnpm tsx scripts/bench-model.ts --runs 10`
- Env optionnels : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : "Reply with a single word: ok. No punctuation or extra text."

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279ms (min 1114, max 2431)
- opus médiane 2454ms (min 1224, max 3170)

## Benchmark de démarrage CLI

Script : [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Usage :

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

La sortie inclut `sampleCount`, avg, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. L'option `--cpu-prof-dir` / `--heap-prof-dir` écrit les profils V8 par exécution, afin que la capture du chronométrage et du profil utilise le même harnais.

Conventions de sauvegarde de la sortie :

- `pnpm test:startup:bench:smoke` écrit l'artefact de test ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de la suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` rafraîchit le fichier de référence de base validé à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fichier de référence validé :

- `test/fixtures/cli-startup-bench.json`
- Rafraîchir avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec le fichier de référence avec `pnpm test:startup:bench:check`

## Benchmark de démarrage du Gateway

Script : [`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

Le benchmark utilise par défaut le point d'entrée CLI compilé à CLI`dist/entry.js` ; exécutez
`pnpm build` avant d'utiliser les commandes de script de package. Pour mesurer le lanceur
source à la place, passez `--entry scripts/run-node.mjs` et gardez ces résultats
séparés des lignes de base du point d'entrée compilé.

Utilisation :

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

IDs de cas :

- `default`Gateway : démarrage normal du Gateway.
- `skipChannels`Gateway : démarrage du Gateway avec le démarrage du canal ignoré.
- `oneInternalHook` : un hook interne configuré.
- `allInternalHooks` : tous les hooks internes.
- `fiftyPlugins` : 50 plugins de manifeste.
- `fiftyStartupLazyPlugins` : 50 plugins de manifeste différés au démarrage (startup-lazy).

La sortie inclut la première sortie de processus, `/healthz`, `/readyz`Gateway, l'heure du log d'écoute HTTP,
l'heure du log de disponibilité du Gateway, le temps CPU, le ratio de cœurs CPU, le RSS max, le heap,
les métriques de trace de démarrage, le délai de la boucle d'événements, et les métriques détaillées de la table de recherche des plugins. Le script
active `OPENCLAW_GATEWAY_STARTUP_TRACE=1`Gateway dans lvironment du Gateway enfant.

Lisez `/healthz` comme vivacité (liveness) : le serveur HTTP peut répondre. Lisez `/readyz`GatewayGateway comme disponibilité utilisable (usable readiness) : les sidecars des plugins de démarrage, les canaux et les travaux critiques de post-attach se sont stabilisés. Les hooks de démarrage du Gateway sont distribués de manière asynchrone et ne font pas partie de la garantie de disponibilité. L'heure du journal de disponibilité est l'horodatage interne du journal de disponibilité du Gateway ; elle est utile pour l'attribution côté processus mais ne remplace pas la sonde externe `/readyz`.

Utilisez la sortie JSON ou `--output` lors de la comparaison des modifications. Utilisez `--cpu-prof-dir` uniquement après que la sortie de trace pointe vers un travail d'importation, de compilation ou lié au CPU qui ne peut pas être expliqué par les timings de phase seul. Ne comparez pas les résultats du source-runner avec les résultats `dist/entry.js` construits comme la même base de référence.

## Benchmark de redémarrage du Gateway

Script : [`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

Le benchmark de redémarrage est pris en charge sur macOS et Linux uniquement. Il utilise SIGUSR1 pour les redémarrages en processus et échoue immédiatement sur Windows.

Le benchmark utilise par défaut l'entrée CLI construite à CLI`dist/entry.js` ; exécutez `pnpm build` avant d'utiliser les commandes de script de package. Pour mesurer le source-runner à la place, passez `--entry scripts/run-node.mjs` et gardez ces résultats séparés des lignes de base d'entrée construites.

Usage :

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

Ids de cas :

- `skipChannels` : redémarrage avec canaux ignorés.
- `skipChannelsAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX activée.
- `skipChannelsNoAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX désactivée.
- `default` : redémarrage normal.
- `fiftyPlugins` : redémarrage avec 50 plugins de manifeste.

La sortie inclut le prochain `/healthz`, le prochain `/readyz`, le temps d'arrêt, le moment de préparation au redémarrage,
le processeur, le RSS, les métriques de trace de démarrage pour le processus de remplacement, et les métriques de trace de
redémarrage pour la gestion des signaux, le drainage du travail actif, les phases de fermeture, le prochain démarrage, le moment de
préparation et les instantanés de mémoire. Le script active
`OPENCLAW_GATEWAY_STARTUP_TRACE=1` et `OPENCLAW_GATEWAY_RESTART_TRACE=1` dans
l'environnement du Gateway enfant.

Utilisez ce benchmark lorsqu'une modification touche à la signalisation de redémarrage, aux gestionnaires de fermeture,
au démarrage après redémarrage, à l'arrêt du sidecar, à la transmission de service, ou à l'état de préparation après
redémarrage. Commencez avec `skipChannels` lors de l'isolement des mécanismes du Gateway du démarrage du canal.
Utilisez `default` ou les cas avec de nombreux plugins uniquement après que le cas étroit a expliqué
le chemin de redémarrage.

Les métriques de trace sont des indices d'attribution, pas des verdicts. Une modification de redémarrage doit être
jugée à partir de plusieurs échantillons, de la span de propriétaire correspondante, du comportement `/healthz` et `/readyz`,
et du contrat de redémarrage visible par l'utilisateur.

## Onboarding E2E (Docker)

Docker est optionnel ; cela n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers de config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## QR import smoke (Docker)

S'assure que l'aide d'exécution QR maintenue se charge sous les environnements d'exécution Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

## Connexes

- [Testing](/fr/help/testing)
- [Testing live](/fr/help/testing-live)
- [Testing updates and plugins](/fr/help/testing-updates-plugins)

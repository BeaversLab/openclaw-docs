---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Kit de tests complet (suites, en direct, Docker) : [Tests](Docker/en/help/testing)
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
- E2E de l'interface de contrôle simulée : utilisez `pnpm test:ui:e2e`Gateway pour le lane Vitest + Playwright qui démarre l'interface de contrôle Vite et pilote une vraie page Chromium contre un WebSocket Gateway simulé. Les tests se trouvent dans `ui/src/**/*.e2e.test.ts` ; les simulations et contrôles partagés se trouvent dans `ui/src/test-helpers/control-ui-e2e.ts`. `pnpm test:e2e` inclut ce lane. Dans les arbres de travail Codex, préférez `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts` pour une petite preuve ciblée après l'installation des dépendances, ou Testbox/Crabbox pour une preuve GUI plus large.
- Helpers E2E de processus : utilisez `test/helpers/openclaw-test-instance.ts`GatewayCLI lorsqu'un test E2E au niveau du processus Vitest a besoin d'un Gateway, d'un environnement CLI, d'une capture de journaux et d'un nettoyage en un seul endroit.
- Tests PTY TUI : utilisez TUI`node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` pour le lane PTY à faux backend rapide. Utilisez `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` ou `pnpm tui:pty:test:watch --mode local` pour le test de fumée plus lent `tui --local`, qui simule uniquement le point de terminaison du modèle externe. Assertez un texte visible stable ou des appels de fixtures, et non des instantanés ANSI bruts.
- Aides E2E Docker/Bash : les voies qui sourcent Docker`scripts/lib/docker-e2e-image.sh` peuvent passer `docker_e2e_test_state_shell_b64 <label> <scenario>` dans le conteneur et le décoder avec `scripts/lib/openclaw-e2e-instance.sh` ; les scripts multi-hébergement peuvent passer `docker_e2e_test_state_function_b64` et appeler `openclaw_test_state_create <label> <scenario>` dans chaque flux. Les appelants de niveau inférieur peuvent utiliser `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` pour un extrait de shell dans le conteneur, ou `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` pour un fichier d'environnement histe sourçable. Le `--` avant `create` empêche les nouveaux runtimes Node de traiter `--env-file`DockerGateway comme un indicateur Node. Les voies Docker/Bash qui lancent un Gateway peuvent sourcer `scripts/lib/openclaw-e2e-instance.sh`OpenAIGateway à l'intérieur du conteneur pour la résolution du point d'entrée, le démarrage simulé d'OpenAI, le démarrage en premier plan/arrière-plan du Gateway, les sondes de disponibilité, l'export de l'état de l'environnement, les vidages de journaux et le nettoyage des processus.
- Les exécutions complètes, d'extension et de fragments de motifs d'inclusion mettent à jour les données de synchronisation locales dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures de la configuration complète utilisent ces synchronisations pour équilibrer les fragments lents et rapides. Les fragments CI de motifs d'inclusion ajoutent le nom du fragment à la clé de synchronisation, ce qui maintient les synchronisations de fragments filtrées visibles sans remplacer les données de synchronisation de la configuration complète. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de synchronisation local.
- Les fichiers de test `plugin-sdk` et `commands` sélectionnés sont désormais acheminés via des voies légères dédiées qui ne gardent que `test/setup.ts`, laissant les cas lourds en temps d'exécution sur leurs voies existantes.
- Les fichiers sources avec des tests frères mappent vers ce frère avant de revenir aux globs de répertoires plus larges. Les modifications d'assistants sous `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` et `src/plugins/contracts` utilisent un graphe d'importation local pour exécuter les tests d'importation au lieu d'exécuter largement chaque fragment lorsque le chemin de dépendance est précis.
- `auto-reply` se divise désormais également en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests de niveau supérieur plus légers (statut/jeton/assistant).
- La configuration de base de Vitest utilise désormais par défaut `pool: "threads"` et `isolate: false`, avec le runner partagé non isolé activé dans les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les shards d'extension/plugin. Les plugins channel lourds, le plugin navigateur et OpenAI s'exécutent en tant que shards dédiés ; les autres groupes de plugins restent regroupés. Utilisez `pnpm test extensions/<id>` pour une voie groupée de plugins.
- `pnpm test:perf:imports` : active les rapports de durée d'importation et de répartition des importations de Vitest, tout en utilisant toujours le routage de voies délimité pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les performances du chemin en mode modifié routé par rapport à l'exécution native du projet racine pour la même diff git validée.
- `pnpm test:perf:changed:bench -- --worktree` évalue les performances de l'ensemble des modifications actuelles de l'arborescence de travail sans valider au préalable.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + heap pour le runner unitaire (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json` : exécute chaque configuration de feuille Vitest de suite complète en série et écrit les données de durée groupées ainsi que les artefacts JSON/journaux par configuration. L'Agent de Performance de Test utilise ceci comme base de référence avant de tenter de corriger les tests lents.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` : compare les rapports groupés après un changement axé sur les performances.
- Intégration Gateway : opt-in via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute l'agrégat E2E du dépôt : tests de fumée de bout en bout de la passerelle plus la voie E2E du navigateur simulé de l'interface de contrôle.
- `pnpm test:e2e:gateway` : Exécute des tests de fumée de bout en bout de la passerelle (appariement WS/HTTP/nœud multi-instance). Par défaut `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux détaillés.
- `pnpm test:live` : Exécute des tests en direct du provider (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au provider) pour ne pas être ignoré.
- `pnpm test:docker:all` : Construit l'image live-test partagée, empaquète OpenClaw une fois en tant que tarball npm, construit/réutilise une image d'exécution Node/Git nue ainsi qu'une image fonctionnelle qui installe cette tarball dans `/app`, puis exécute les lanes de fumée Docker avec `OPENCLAW_SKIP_DOCKER_BUILD=1` via un ordonnanceur pondéré. L'image nue (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) est utilisée pour les lanes d'installation/de mise à jour/de dépendance de plugin ; ces lanes montent la tarball préconstruite au lieu d'utiliser les sources copiées du dépôt. L'image fonctionnelle (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) est utilisée pour les lanes de fonctionnalité d'application construite normale. `scripts/package-openclaw-for-docker.mjs` est l'empaqueteur de paquets local/CI unique et valide la tarball ainsi que `dist/postinstall-inventory.json` avant que Docker ne la consomme. Les définitions de lanes Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. `node scripts/test-docker-all.mjs --plan-json` émet le plan CI détenu par l'ordonnanceur pour les lanes sélectionnées, les types d'images, les besoins en paquets/images live, les scénarios d'état et les vérifications d'identification sans construire ou exécuter Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` contrôle les créneaux de processus et est par défaut à 10 ; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` contrôle le pool de queue sensible au fournisseur et est par défaut à 10. Les plafonds de lanes lourds sont par défaut `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; les plafonds de fournisseurs sont par défaut à une lane lourde par fournisseur via `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` et `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Utilisez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` pour des hôtes plus volumineux. Si une lane dépasse le poids effectif ou la limite de ressources sur un hôte à faible parallélisme, elle peut toujours démarrer à partir d'un pool vide et s'exécutera seule jusqu'à ce qu'elle libère la capacité. Les démarrages de lanes sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création du démon Docker local ; remplacer avec `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. Le runner effectue par défaut des pré-vols Docker, nettoie les conteneurs E2E OpenClaw périmés, émet le statut des lanes actives toutes les 30 secondes, partage les caches d'outils CLI du fournisseur entre les lanes compatibles, réessaie par défaut une fois les échecs transitoires du fournisseur en direct (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) et stocke les timings des lanes dans `.artifacts/docker-tests/lane-timings.json` pour un ordre du plus long au plus court lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste des lanes sans exécuter Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` pour régler la sortie de statut, ou `OPENCLAW_DOCKER_ALL_TIMINGS=0` pour désactiver la réutilisation du timing. Utilisez `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` pour les lanes déterministes/locale uniquement ou `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` pour les lanes de fournisseur en direct uniquement ; les alias de paquets sont `pnpm test:docker:local:all` et `pnpm test:docker:live:all`. Le mode live-only fusionne les lanes live principales et de queue en un seul pool du plus long au premier afin que les buckets de fournisseurs puissent regrouper Claude, Codex et Gemini ensemble. Le runner arrête de planifier de nouvelles lanes en pool après le premier échec à moins que `OPENCLAW_DOCKER_ALL_FAIL_FAST=0` ne soit défini, et chaque lane a un délai d'expiration de repli de 120 minutes remplaçable par `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les lanes live/de queue sélectionnées utilisent des plafonds plus serrés par lane. Les commandes de configuration CLI du backend Docker ont leur propre délai d'expiration via `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (défaut 180). Les journaux par lane, `summary.json`, `failures.json` et les timings de phase sont écrits sous `.artifacts/docker-tests/<run-id>/` ; utilisez `pnpm test:docker:timings <summary.json>` pour inspecter les lanes lentes et `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées bon marché.
- `pnpm test:docker:browser-cdp-snapshot`Gateway : Construit un conteneur E2E source basé sur Chromium, démarre le CDP brut ainsi qu'un Gateway isolé, exécute `browser doctor --deep` et vérifie que les instantanés de rôle CDP incluent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- `pnpm test:docker:skill-install`OpenClawDocker : Installe l'archive tar d'OpenClaw empaquetée dans un runner Docker nu, désactive `skills.install.allowUploadedArchives`ClawHub, résout un slug de compétence actuel à partir de la recherche en direct sur ClawHub, l'installe via `openclaw skills install` et vérifie `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` et `skills info --json`.
- Les sondes en direct Docker du backend CLI peuvent être exécutées sous forme de volets dédiés, par exemple CLIDocker`pnpm test:docker:live-cli-backend:claude`, `pnpm test:docker:live-cli-backend:claude:resume` ou `pnpm test:docker:live-cli-backend:claude:mcp`. Gemini dispose des alias correspondants `:resume` et `:mcp`.
- `pnpm test:docker:openwebui`OpenClaw : Démarre OpenClaw dockerisé + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel avec proxy via `/api/chat/completions`. Nécessite une clé de modèle en direct utilisable, tire une image externe Open WebUI et n'est pas censé être stable en CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels`Gateway : Démarre un conteneur Gateway amorcé et un second conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, la lecture de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'événements en direct, le routage des envois sortants et les notifications de style Claude concernant les canaux et les permissions via le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes, afin que le test reflète ce que le pont émet réellement.
- `pnpm test:docker:upgrade-survivor`OpenClawGatewayRPC : Installe l'archive tar OpenClaw empaquetée sur un appareil d'ancien utilisateur sale, exécute la mise à jour du package ainsi que le médecin non interactif sans clés de provider ou de channel actives, puis démarre une Gateway en boucle et vérifie que les agents, la configuration du channel, les listes de autorisation de plugins, les fichiers d'espace de work/session, l'état obsolète des dépendances des plugins hérités, le démarrage et le statut RPC survivent.
- `pnpm test:docker:published-upgrade-survivor` : Installe `openclaw@latest` par défaut, peuple des fichiers réalistes d'utilisateur existant sans clés de provider ou de channel actives, configure cette ligne de base avec une recette de commande `openclaw config set`OpenClaw intégrée, met à jour cette installation publiée vers l'archive tar OpenClaw empaquetée, exécute le médecin non interactif, écrit `.artifacts/upgrade-survivor/summary.json`Gateway, puis démarre une Gateway en boucle et vérifie que les intentions configurées, les fichiers d'espace de work/session, la configuration obsolète des plugins et l'état des dépendances héritées, le démarrage, `/healthz`, `/readyz`RPC et le statut RPC survivent ou sont réparés proprement. Remplacez une ligne de base par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, étendez une matrice locale exacte avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telle que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, ou ajoutez des appareils de scénario avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` ; l'ensemble des problèmes signalés inclut `configured-plugin-installs`OpenClaw pour vérifier que les plugins externes OpenClaw configurés s'installent automatiquement lors de la mise à niveau et `stale-source-plugin-shadow` pour empêcher les ombres de plugins source-only de briser le démarrage. Package Acceptance expose ces éléments sous la forme `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, et résout les jetons de ligne de base meta tels que `last-stable-4` ou `all-since-2026.4.23`Docker avant de transmettre les spécifications exactes de package aux voies Docker.
- `pnpm test:docker:update-migration`: Exécute le harnais de survie de mise à niveau publiée dans le scénario `plugin-deps-cleanup` avec un nettoyage intensif, en commençant à `openclaw@2026.4.23` par défaut. Le workflow séparé `Update Migration` étend cette voie avec `baselines=all-since-2026.4.23` afin que chaque package stable publié à partir de `.23` effectue une mise à jour vers le candidat et prouve le nettoyage des dépendances des plugins configurés en dehors de la CI de version complète.
- `pnpm test:docker:plugins`: Exécute des tests de fumée d'installation/mise à jour pour le chemin local, `file:`, les packages du registre npm avec des dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour de la place de marché et l'activation/inspection des bundles Claude.

## Portail PR local

Pour les vérifications de portail/landing PR locales, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes ayant peu de mémoire, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banc de test de latence du modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `pnpm tsx scripts/bench-model.ts --runs 10`
- Env optionnelle : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : "Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire."

Dernière exécution (2025-12-31, 20 exécutions) :

- médiane minimax 1279ms (min 1114, max 2431)
- médiane opus 2454ms (min 1224, max 3170)

## Banc de démarrage CLI

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

La sortie inclut `sampleCount`, la moyenne, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. `--cpu-prof-dir` / `--heap-prof-dir` en option écrit les profils V8 par exécution pour que la mesure du temps et la capture de profil utilisent le même harnais.

Conventions de sortie enregistrée :

- `pnpm test:startup:bench:smoke` écrit l'artefact de fumée ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` actualise la fixture de base de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Actualiser avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture avec `pnpm test:startup:bench:check`

## Gateway startup bench

Script : [`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

Le benchmark utilise par défaut le point d'entrée `dist/entry.js` du CLI compilé ; exécutez
`pnpm build` avant d'utiliser les commandes de script de package. Pour mesurer à la place le lanceur
de la source, passez `--entry scripts/run-node.mjs` et gardez ces résultats
séparés des lignes de base du point d'entrée compilé.

Utilisation :

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
- `fiftyStartupLazyPlugins` : 50 plugins de manifeste à chargement différé au démarrage (startup-lazy).

La sortie comprend la première sortie de processus, `/healthz`, `/readyz`, l'heure du journal d'écoute HTTP,
l'heure du journal prêt du Gateway, le temps CPU, le ratio de cœurs CPU, le RSS maximal, le tas, les métriques de trace de
démarrage, le délai de la boucle d'événements, et les métriques détaillées de la table de recherche des plugins. Le script
active `OPENCLAW_GATEWAY_STARTUP_TRACE=1` dans l'environnement du Gateway enfant.

Lisez `/healthz` comme la vivacité : le serveur HTTP peut répondre. Lisez `/readyz` comme la
prêt utilisable : les sidecars de plugins de démarrage, les canaux et le travail post-attachement critique pour la disponibilité
se sont stabilisés. Les hooks de démarrage du Gateway sont envoyés
de manière asynchrone et ne font pas partie de la garantie de disponibilité. L'heure du journal prêt est l'
horodatage du journal prêt interne du Gateway ; elle est utile pour l'
attribution du côté processus mais ne remplace pas la sonde externe `/readyz`.

Utilisez la sortie JSON ou `--output` lors de la comparaison des modifications. N'utilisez `--cpu-prof-dir` qu'après que la sortie de trace a indiqué un travail d'importation, de compilation ou limité par le processeur qui ne peut être expliqué par les seuls timings de phase. Ne comparez pas les résultats du source-runner avec les résultats `dist/entry.js` générés, car ils utilisent la même base de référence.

## Bench de redémarrage de Gateway

Script : [`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

Le benchmark de redémarrage est pris en charge uniquement sur macOS et Linux. Il utilise SIGUSR1 pour les redémarrages en cours de processus et échoue immédiatement sur Windows.

Le benchmark utilise par défaut le point d'entrée CLI généré à `dist/entry.js` ; exécutez `pnpm build` avant d'utiliser les commandes du script de package. Pour mesurer plutôt le source-runner, passez `--entry scripts/run-node.mjs` et gardez ces résultats séparés des lignes de base de l'entrée générée.

Usage :

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

ID des cas :

- `skipChannels` : redémarrage avec canaux ignorés.
- `skipChannelsAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX activée.
- `skipChannelsNoAcpxProbe` : redémarrage avec canaux ignorés et sonde de démarrage ACPX désactivée.
- `default` : redémarrage normal.
- `fiftyPlugins` : redémarrage avec 50 plugins de manifeste.

La sortie inclut le prochain `/healthz`, le prochain `/readyz`, le temps d'arrêt, le timing de préparation au redémarrage, le processeur, le RSS, les métriques de trace de démarrage pour le processus de remplacement, et les métriques de trace de redémarrage pour la gestion des signaux, le drainage du travail actif, les phases de fermeture, le prochain démarrage, le timing de préparation et les instantanés mémoire. Le script active `OPENCLAW_GATEWAY_STARTUP_TRACE=1` et `OPENCLAW_GATEWAY_RESTART_TRACE=1` dans l'environnement du Gateway enfant.

Utilisez ce benchmark lorsqu'une modification touche le signal de redémarrage, les gestionnaires de fermeture, le démarrage après redémarrage, l'arrêt du sidecar, le transfert de service, ou la disponibilité après redémarrage. Commencez par `skipChannels` lors de l'isolement de la mécanique du Gateway du démarrage du canal. Utilisez `default` ou les cas à forte charge de plugins uniquement une fois que le cas étroit a expliqué le chemin de redémarrage.

Les métriques de trace sont des indices d'attribution, pas des verdicts. Une modification de redémarrage doit être jugée à partir de plusieurs échantillons, de la portée du propriétaire correspondante, du comportement de `/healthz` et `/readyz`, et du contrat de redémarrage visible par l'utilisateur.

## Onboarding E2E (Docker)

Docker est facultatif ; cela n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'importation QR (Docker)

S'assure que l'helper d'exécution QR maintenu se charge sous les runtimes Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

## Connexes

- [Testing](/fr/help/testing)
- [Testing live](/fr/help/testing-live)
- [Testing updates and plugins](/fr/help/testing-updates-plugins)

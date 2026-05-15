---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Kit de tests complet (suites, en direct, Docker) : [Testing](/fr/help/testing)
- Validation des packages de mises à jour et de plugins : [Testing updates and plugins](/fr/help/testing-updates-plugins)

- `pnpm test:force` : Tue tout processus gateway résiduel utilisant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Il s'agit d'une barrière de couverture de la voie par défaut des unités (default-unit-lane), et non de la couverture de tous les fichiers du dépôt entier. Les seuils sont de 70 % pour les lignes/fonctions/énoncés et de 55 % pour les branches. Comme `coverage.all` est faux et que les étendues de couverture de la voie par défaut incluent les tests unitaires non rapides avec les fichiers source frères, la barrière mesure le code source possédé par cette voie au lieu de chaque import transitif qu'il se trouve qu'elle charge.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : exécution de test intelligente modifiée économique. Elle exécute des cibles précises à partir de modifications directes de tests, des fichiers `*.test.ts` frères, des mappages de source explicites et du graphe d'importation local. Les modifications larges/config/package sont ignorées à moins qu'elles ne mappent à des tests précis.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` : exécution de test modifiée large explicite. À utiliser lorsqu'une modification de harnais de test/config/package devrait revenir au comportement de test modifié plus large de Vitest.
- `pnpm changed:lanes` : affiche les voies architecturales déclenchées par la différence par rapport à `origin/main`.
- `pnpm check:changed` : exécute la barrière de contrôle modifié intelligent pour la différence par rapport à `origin/main`. Il exécute les commandes typecheck, lint et guard pour les voies architecturales affectées, mais n'exécute pas les tests Vitest. Utilisez `pnpm test:changed` ou un `pnpm test <target>` explicite pour la preuve de test.
- `pnpm test` : route les cibles de fichiers/répertoires explicites via des lanes Vitest délimitées. Les exécutions non ciblées utilisent des groupes de fragments fixes et s'étendent aux configurations feuilles pour une exécution parallèle locale ; le groupe d'extension s'étend toujours aux configurations de fragment par extension au lieu d'un seul processus géant de projet racine.
- Les exécutions du wrapper de test se terminent par un court résumé `[test] passed|failed|skipped ... in ...`. La ligne de durée propre de Vitest reste le détail par fragment.
- État de test partagé OpenClaw : utilisez `src/test-utils/openclaw-test-state.ts` depuis Vitest lorsqu'un test a besoin d'un `HOME`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`, de fixture de configuration, d'espace de travail, de répertoire d'agent ou de magasin de profils d'authentification isolés.
- Helpers E2E de processus : utilisez `test/helpers/openclaw-test-instance.ts` lorsqu'un test E2E au niveau du processus Vitest a besoin d'un Gateway en cours d'exécution, d'un env CLI, de la capture des journaux et du nettoyage en un seul endroit.
- Helpers E2E Docker/Bash : les lanes qui sourcent `scripts/lib/docker-e2e-image.sh` peuvent passer `docker_e2e_test_state_shell_b64 <label> <scenario>` dans le conteneur et le décoder avec `scripts/lib/openclaw-e2e-instance.sh` ; les scripts multi-home peuvent passer `docker_e2e_test_state_function_b64` et appeler `openclaw_test_state_create <label> <scenario>` dans chaque flux. Les appelants de niveau inférieur peuvent utiliser `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` pour un extrait de shell dans le conteneur, ou `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` pour un fichier d'environnement hôté sourçable. Le `--` avant `create` empêche les runtimes Node plus récents de traiter `--env-file` comme un indicateur Node. Les lanes Docker/Bash qui lancent un Gateway peuvent sourcer `scripts/lib/openclaw-e2e-instance.sh` à l'intérieur du conteneur pour la résolution du point d'entrée, le démarrage simulé de OpenAI, le démarrage en premier plan/arrière-plan du Gateway, les sondes de disponibilité, l'export de l'état de l'environnement, les vidages de journaux et le nettoyage des processus.
- Les exécutions complètes, d'extension et de fragments avec motif d'inclusion mettent à jour les données de synchronisation locales dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures de la configuration complète utilisent ces synchronisations pour équilibrer les fragments lents et rapides. Les fragments CI avec motif d'inclusion ajoutent le nom du fragment à la clé de synchronisation, ce qui permet de voir les synchronisations des fragments filtrés sans remplacer les données de synchronisation de la configuration complète. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de synchronisation local.
- Les fichiers de test sélectionnés `plugin-sdk` et `commands` sont désormais acheminés via des voies légères dédiées qui ne conservent que `test/setup.ts`, laissant les cas lourds en temps d'exécution sur leurs voies existantes.
- Les fichiers source avec des tests frères correspondent à ce frère avant de revenir aux motifs de répertoire plus larges. Les modifications d'assistants sous `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` et `src/plugins/contracts` utilisent un graphe d'importation local pour exécuter les tests importateurs au lieu d'exécuter largement chaque fragment lorsque le chemin de dépendance est précis.
- `auto-reply` se divise désormais également en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests plus légers de niveau supérieur de statut/jeton/assistant.
- La configuration de base de Vitest utilise désormais par défaut `pool: "threads"` et `isolate: false`, avec le lanceur non isolé partagé activé dans les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les fragments d'extension/plugin. Les plugins de canal lourds, le plugin navigateur et OpenAI s'exécutent en tant que fragments dédiés ; les autres groupes de plugins restent regroupés. Utilisez `pnpm test extensions/<id>` pour une voie de plugin groupée.
- `pnpm test:perf:imports` : active le rapport de durée d'importation + de répartition d'importation de Vitest, tout en utilisant toujours le routage de voie délimité pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare le chemin du mode modifié acheminé avec l'exécution native du projet racine pour le même diff git validé.
- `pnpm test:perf:changed:bench -- --worktree` teste les performances de l'ensemble des modifications de l'arborescence de travail sans valider au préalable.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + tas pour le lanceur de tests unitaires (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json` : exécute chaque configuration feuillet de suite complète Vitest en série et écrit les données de durée groupées ainsi que les artefacts JSON/journaux par configuration. L'Agent de Performance des Tests utilise ceci comme base de référence avant de tenter de corriger les tests lents.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` : compare les rapports groupés après un changement axé sur les performances.
- Intégration Gateway : optionnel via Gateway`OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute des tests de fumée de bout en bout pour la Gateway (appariement WS/HTTP/nœud multi-instance). Par défaut `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour des journaux verbeux.
- `pnpm test:live`API : Exécute les tests en direct des providers (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au provider) pour ne pas être ignoré.
- `pnpm test:docker:all` : Construit l'image de test en direct partagée, empaquète OpenClaw une fois sous forme de tarball npm, construit/réutilise une image de courseur Node/Git nue plus une image fonctionnelle qui installe cette tarball dans `/app`, puis exécute les voies de test de fumée Docker avec `OPENCLAW_SKIP_DOCKER_BUILD=1` via un planificateur pondéré. L'image nue (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) est utilisée pour les voies d'installateur/de mise à jour/de dépendance de plugin ; ces voies montent la tarball préconstruite au lieu d'utiliser les sources du dépôt copiées. L'image fonctionnelle (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) est utilisée pour les voies de fonctionnalité d'application construite normales. `scripts/package-openclaw-for-docker.mjs` est l'emballeur de paquets local/CI unique et valide la tarball plus `dist/postinstall-inventory.json` avant que Docker ne la consomme. Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. `node scripts/test-docker-all.mjs --plan-json` émet le plan CI détenu par le planificateur pour les voies sélectionnées, les types d'images, les besoins en paquets/images en direct, les scénarios d'état et les vérifications d'identification sans construire ni exécuter Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` contrôle les créneaux de processus et est par défaut à 10 ; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` contrôle le pool de queue sensible au fournisseur et est par défaut à 10. Les plafonds de voies lourds sont par défaut `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; les plafonds des fournisseurs sont par défaut à une voie lourde par fournisseur via `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` et `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Utilisez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` pour les hôtes plus volumineux. Si une voie dépasse le poids effectif ou la plafond de ressource sur un hôte à faible parallélisme, elle peut toujours démarrer à partir d'un pool vide et s'exécutera seule jusqu'à ce qu'elle libère la capacité. Les démarrages de voie sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création de démons Docker locaux ; remplacer avec `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. Le coureur effectue des prévols Docker par défaut, nettoie les conteneurs E2E OpenClaw obsolètes, émet le statut des voies actives toutes les 30 secondes, partage les caches d'outils CLI du fournisseur entre les voies compatibles, réessaie les échecs transitoires du fournisseur en direct une fois par défaut (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) et stocke les timings des voies dans `.artifacts/docker-tests/lane-timings.json` pour un ordre du plus long au premier lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste des voies sans exécuter Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` pour régler la sortie de statut, ou `OPENCLAW_DOCKER_ALL_TIMINGS=0` pour désactiver la réutilisation du timing. Utilisez `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` pour les voies déterministes/uniquement locales ou `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` pour les voies de fournisseur en direct uniquement ; les alias de paquet sont `pnpm test:docker:local:all` et `pnpm test:docker:live:all`. Le mode en direct uniquement fusionne les voies en direct principales et de queue en un seul pool du plus long au premier afin que les compartiments de fournisseurs puissent empaqueter Claude, Codex et Gemini ensemble. Le coureur arrête de planifier de nouvelles voies en pool après le premier échec à moins que `OPENCLAW_DOCKER_ALL_FAIL_FAST=0` ne soit défini, et chaque voie a un délai d'attente de repli de 120 minutes remplaçable par `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les voies en direct/de queue sélectionnées utilisent des plafonds plus stricts par voie. Les commandes de configuration Docker du backend CLIDocker ont leur propre délai d'attente via `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (par défaut 180). Les journaux par voie, `summary.json`, `failures.json` et les timings de phase sont écrits sous `.artifacts/docker-tests/<run-id>/` ; utilisez `pnpm test:docker:timings <summary.json>` pour inspecter les voies lentes et `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées bon marché.
- `pnpm test:docker:browser-cdp-snapshot` : Crée un conteneur E2E source basé sur Chromium, démarre le CDP brut plus un Gateway isolé, exécute `browser doctor --deep`, et vérifie que les instantanés de rôles CDP incluent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de trame.
- `pnpm test:docker:skill-install` : Installe l'archive tar OpenClaw empaquetée dans un exécuteur Docker nu, désactive `skills.install.allowUploadedArchives`, résout un slug de compétence actuel à partir de la recherche en direct sur ClawHub, l'installe via `openclaw skills install`, et vérifie `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` et `skills info --json`.
- Les sondes live CLI du backend Docker peuvent être exécutées sous forme de volets ciblés, par exemple `pnpm test:docker:live-cli-backend:codex`, `pnpm test:docker:live-cli-backend:codex:resume` ou `pnpm test:docker:live-cli-backend:codex:mcp`. Claude et Gemini disposent d'alias correspondants `:resume` et `:mcp`.
- `pnpm test:docker:openwebui` : Démarre OpenClaw Dockerisé + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat proxyé réel via `/api/chat/completions`. Nécessite une clé de modèle live utilisable (par exemple OpenAI dans `~/.profile`), tire une image externe Open WebUI, et n'est pas censé être stable en CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un second conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant et les notifications de channel + d'autorisation de style Claude sur le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes, de sorte que le smoke test reflète ce que le pont émet réellement.
- `pnpm test:docker:upgrade-survivor`OpenClawGatewayRPC : Installe l'archive tar OpenClaw empaquetée sur un appareil utilisateur sale existant, exécute la mise à jour du package ainsi que le médecin non interactif sans clés de provider ou de channel en direct, puis démarre une Gateway en boucle et vérifie que les agents, la configuration du channel, les listes d'autorisation des plugins, les fichiers d'espace de travail/session, l'état obsolète des dépendances des plugins hérités, le démarrage et le statut RPC survivent.
- `pnpm test:docker:published-upgrade-survivor` : Installe `openclaw@latest` par défaut, amorce des fichiers utilisateur existants réalistes sans clés de provider ou de channel en direct, configure cette base de référence avec une recette de commande `openclaw config set`OpenClaw intégrée, met à jour cette installation publiée vers l'archive tar OpenClaw empaquetée, exécute le médecin non interactif, écrit `.artifacts/upgrade-survivor/summary.json`Gateway, puis démarre une Gateway en boucle et vérifie que les intentions configurées, les fichiers d'espace de travail/session, la configuration obsolète des plugins et l'état des dépendances héritées, le démarrage, `/healthz`, `/readyz`RPC et le statut RPC survivent ou sont réparés proprement. Remplacez une base de référence par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, étendez une matrice locale exacte avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telle que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, ou ajoutez des appareils de scénario avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` ; l'ensemble des problèmes signalés inclut `configured-plugin-installs`OpenClaw pour vérifier que les plugins externes OpenClaw configurés s'installent automatiquement lors de la mise à niveau et `stale-source-plugin-shadow` pour empêcher les ombres de plugins source-only de rompre le démarrage. Package Acceptance expose ceux-ci en tant que `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, et résout les jetons de base de référence méta tels que `last-stable-4` ou `all-since-2026.4.23`Docker avant de transmettre les spécifications exactes de package aux voies Docker.
- `pnpm test:docker:update-migration` : Exécute le harnais de survie de mise à niveau publiée dans le scénario `plugin-deps-cleanup` très intensif en nettoyage, commençant à `openclaw@2026.4.23` par défaut. Le flux de travail séparé `Update Migration` étend cette voie avec `baselines=all-since-2026.4.23` afin que chaque package stable publié à partir de `.23` effectue une mise à niveau vers le candidat et prouve le nettoyage des dépendances des plugins configurés en dehors de l'CI de publication complète.
- `pnpm test:docker:plugins` : Exécute le test de fumée d'installation/mise à jour pour le chemin local, `file:`npmClawHub, les packages du registre npm avec des dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour de la place de marché, et l'activation/inspection du bundle Claude.

## Portail de PR local

Pour les vérifications d'atterrissage/de portail de PR locales, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes avec des contraintes de mémoire, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banc de test de latence de modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env facultatif : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Reply with a single word: ok. No punctuation or extra text. »

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279 ms (min 1114, max 2431)
- opus médiane 2454 ms (min 1224, max 3170)

## Banc de test de démarrage CLI

Script : [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Utilisation :

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

La sortie inclut `sampleCount`, la moyenne, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. Les options `--cpu-prof-dir` / `--heap-prof-dir` écrivent des profils V8 par exécution, de sorte que la capture du chronométrage et du profil utilise le même harnais.

Conventions de sortie enregistrée :

- `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` actualise le fixture de base de référence validé à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Actualiser avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels contre le fixture avec `pnpm test:startup:bench:check`

## E2E d'onboarding (Docker)

Docker est facultatif ; ceci n'est nécessaire que pour les tests de smoke d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers de configuration/espace de travail/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'importation QR (Docker)

S'assure que l'assistant d'exécution QR maintenu se charge sous les environnements d'exécution Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

## Connexes

- [Testing](/fr/help/testing)
- [Testing live](/fr/help/testing-live)
- [Testing updates and plugins](/fr/help/testing-updates-plugins)

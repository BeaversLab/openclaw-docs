---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

- Ensemble complet de tests (suites, live, Docker) : [Testing](/fr/help/testing)

- `pnpm test:force` : Tue tout processus de passerelle résiduel tenant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port de passerelle isolé pour que les tests serveur n'entrent pas en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la passerelle a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Il s'agit d'une barrière de couverture unitaire des fichiers chargés, et non d'une couverture de tous les fichiers du dépôt entier. Les seuils sont de 70 % pour les lignes/fonctions/énoncés et de 55 % pour les branches. Comme `coverage.all` est faux, la barrière mesure les fichiers chargés par la suite de couverture unitaire au lieu de traiter chaque fichier source split-lane comme non couvert.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : exécution intelligente de test modifié bon marché. Elle exécute des cibles précises à partir de modifications directes de tests, de fichiers `*.test.ts` frères, de mappages de source explicites et du graphe d'importation local. Les modifications larges/config/package sont ignorées sauf si elles correspondent à des tests précis.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` : exécution explicite large de test modifié. À utiliser lorsqu'une modification de harnais de test/config/package devrait revenir au comportement de test modifié plus large de Vitest.
- `pnpm changed:lanes` : affiche les volets architecturaux déclenchés par la diff par rapport à `origin/main`.
- `pnpm check:changed` : exécute la barrière de vérification intelligente modifiée pour la diff par rapport à `origin/main`. Elle exécute les commandes typecheck, lint et guard pour les volets architecturaux affectés, mais n'exécute pas les tests Vitest. Utilisez `pnpm test:changed` ou `pnpm test <target>` explicite pour la preuve de test.
- `pnpm test` : achemine des cibles de fichiers/répertoires explicites via des voies Vitest délimitées (scoped). Les exécutions sans cible utilisent des groupes de fragments fixes et s'étendent aux configurations feuilles pour l'exécution parallèle locale ; le groupe d'extension s'étend toujours aux configurations de fragments par extension au lieu d'un processus racine de projet géant.
- Les exécutions des wrappers de test se terminent par un bref résumé `[test] passed|failed|skipped ... in ...` . La ligne de durée propre à Vitest conserve les détails par fragment.
- Les exécutions de fragments complètes, d'extension et de motifs d'inclusion mettent à jour les données de chronométrage locales dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures de la configuration complète utilisent ces chronométrages pour équilibrer les fragments lents et rapides. Les fragments CI de motifs d'inclusion ajoutent le nom du fragment à la clé de chronométrage, ce qui maintient les chronométrages des fragments filtrés visibles sans remplacer les données de chronométrage de la configuration complète. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de chronométrage local.
- Les fichiers de test `plugin-sdk` et `commands` sélectionnés passent désormais par des voies légères dédiées qui ne conservent que `test/setup.ts` , laissant les cas lourds en exécution sur leurs voies existantes.
- Les fichiers sources avec des tests frères (sibling) sont mappés à ce frère avant de revenir à des motifs de répertoire plus larges. Les modifications d'assistants sous `test/helpers/channels` et `test/helpers/plugins` utilisent un graphe d'importation local pour exécuter les tests importateurs au lieu d'exécuter largement chaque fragment lorsque le chemin de dépendance est précis.
- `auto-reply` se divise maintenant également en trois configurations dédiées (`core` , `top-level` , `reply` ) afin que le harnais de réponse ne domine pas les tests plus légers de niveau supérieur (statut/jeton/assistant).
- La configuration de base Vitest utilise désormais par défaut `pool: "threads"` et `isolate: false` , avec le lanceur partagé non isolé activé dans toutes les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les fragments d'extension/plugin. Les plugins de channel lourds, le plugin navigateur et OpenAI s'exécutent en tant que fragments dédiés ; les autres groupes de plugins restent groupés. Utilisez `pnpm test extensions/<id>` pour une voie groupée de plugins unique.
- `pnpm test:perf:imports` : active le rapportage de la durée d'importation et de la répartition des importations de Vitest, tout en continuant d'utiliser le routage de voie délimité pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare le chemin du mode modifié routé avec l'exécution native du projet racine pour la même diff git validée.
- `pnpm test:perf:changed:bench -- --worktree` compare le jeu de modifications actuel de l'arbre de travail sans valider au préalable.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + tas pour le lanceur de tests unitaires (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json` : exécute chaque configuration de feuille Vitest de suite complète en série et écrit les données de durée groupées ainsi que les artefacts JSON/journaux par configuration. L'agent de performance des tests utilise cela comme ligne de base avant de tenter de corriger les tests lents.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json` : compare les rapports groupés après un changement axé sur les performances.
- Intégration Gateway : option via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute les tests de fumée de bout en bout de la passerelle (appariement WS/HTTP/nœud multi-instance). Par défaut `threads` + `isolate: false` avec des travailleurs adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux verbeux.
- `pnpm test:live` : Exécute les tests en direct des fournisseurs (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au fournisseur) pour ne pas être ignoré.
- `pnpm test:docker:all` : Construit l'image de test en direct partagée, empaquette OpenClaw une fois sous forme de tarball npm, construit/réutilise une image de runner Node/Git nue plus une image fonctionnelle qui installe cette tarball dans `/app`, puis exécute les voies de test de fumée Docker avec `OPENCLAW_SKIP_DOCKER_BUILD=1` via un ordonnanceur pondéré. L'image nue (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) est utilisée pour les voies d'installateur/de mise à jour/de dépendance de plugin ; ces voies montent la tarball préconstruite au lieu d'utiliser les sources de dépôt copiées. L'image fonctionnelle (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) est utilisée pour les voies de fonctionnalité d'application construite normales. `scripts/package-openclaw-for-docker.mjs` est l'empaqueteur de paquets local/CI unique et valide la tarball ainsi que `dist/postinstall-inventory.json` avant que Docker ne la consomme. Les définitions de voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. `node scripts/test-docker-all.mjs --plan-json` émet le plan CI appartenant à l'ordonnanceur pour les voies, types d'images, besoins d'image de paquet/en direct, et vérifications d'identifiants sélectionnés sans construire ou exécuter Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` contrôle les emplacements de processus et est par défaut à 10 ; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` contrôle le pool de queue sensible au fournisseur et est par défaut à 10. Les plafonds de voies lourds sont par défaut `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; les plafonds de fournisseurs sont par défaut à une voie lourde par fournisseur via `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` et `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Utilisez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` pour les hôtes plus volumineux. Si une voie dépasse le poids effectif ou la limite de ressources sur un hôte à faible parallélisme, elle peut toujours démarrer à partir d'un pool vide et s'exécutera seule jusqu'à ce qu'elle libère la capacité. Les démarrages de voie sont échelonnés de 2 secondes par défaut pour éviter les tempêtes de création de démon Docker local ; remplacez avec `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. Le runner effectue une pré-vérification de Docker par défaut, nettoie les conteneurs E2E OpenClaw obsolètes, émet le statut de voie active toutes les 30 secondes, partage les caches d'outil CLI de fournisseur entre les voies compatibles, réessaie une fois par défaut les échecs transitoires de fournisseur en direct (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) et stocke les timings de voie dans `.artifacts/docker-tests/lane-timings.json` pour un ordre du plus long au premier sur les exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste de voie sans exécuter Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` pour régler la sortie de statut, ou `OPENCLAW_DOCKER_ALL_TIMINGS=0` pour désactiver la réutilisation du timing. Utilisez `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` pour les voies déterministes/locale uniquement ou `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` pour les voies de fournisseur en direct uniquement ; les alias de paquet sont `pnpm test:docker:local:all` et `pnpm test:docker:live:all`. Le mode en direct uniquement fusionne les voies en direct principales et de queue en un pool du plus long au premier afin que les compartiments de fournisseur puissent regrouper le travail Claude, Codex et Gemini. Le runner arrête la planification de nouvelles voies regroupées après le premier échec à moins que `OPENCLAW_DOCKER_ALL_FAIL_FAST=0` ne soit défini, et chaque voie a un délai d'attente de repli de 120 minutes remplaçable avec `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS` ; les voies en direct/de queue sélectionnées utilisent des plafonds par voie plus stricts. Les commandes de configuration CLI du backend Docker ont leur propre délai d'attente via `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (défaut 180). Les journaux par voie, `summary.json`, `failures.json` et les timings de phase sont écrits sous `.artifacts/docker-tests/<run-id>/` ; utilisez `pnpm test:docker:timings <summary.json>` pour inspecter les voies lentes et `pnpm test:docker:rerun <run-id|summary.json|failures.json>` pour imprimer des commandes de réexécution ciblées bon marché.
- `pnpm test:docker:browser-cdp-snapshot` : Construit un conteneur E2E source basé sur Chromium, démarre le CDP brut ainsi qu'un Gateway isolé, exécute `browser doctor --deep` et vérifie que les instantanés de rôles CDP incluent les URL de liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Les sondages live Docker du backend CLI peuvent être exécutés sous forme de volets focalisés, par exemple `pnpm test:docker:live-cli-backend:codex`, `pnpm test:docker:live-cli-backend:codex:resume` ou `pnpm test:docker:live-cli-backend:codex:mcp`. Claude et Gemini possèdent des alias correspondants `:resume` et `:mcp`.
- `pnpm test:docker:openwebui` : Démarre OpenClaw et Open WebUI sous Docker, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel en mode proxy via `/api/chat/completions`. Nécessite une clé de model live fonctionnelle (par exemple OpenAI dans `~/.profile`), tire une image externe Open WebUI, et n'est pas censé être stable en CI comme les suites unit/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un second conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations routées, la lecture des transcriptions, les métadonnées des pièces jointes, le comportement de la file d'attente d'événements en direct, le routage des envois sortants et les notifications de style Claude sur le channel + les permissions via le pont stdio réel. L'assertion de notification Claude lit les trames MCP stdio brutes directement, afin que le test reflète ce que le pont émet réellement.

## Local PR gate

Pour les vérifications locales de gate/land de PR, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` échoue de manière intermittente sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes ayant des contraintes de mémoire, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Usage :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env facultatif : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire. »

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

La sortie inclut `sampleCount`, la moyenne, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. L'option facultative `--cpu-prof-dir` / `--heap-prof-dir` écrit les profils V8 par exécution afin que le chronométrage et la capture de profil utilisent le même harnais.

Conventions de sortie enregistrée :

- `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de la suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` rafraîchit la fixture de base de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Rafraîchir avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture avec `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker est facultatif ; cela n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'import QR (Docker)

Assure que l'assistant d'exécution QR maintenu se charge sous les environnements d'exécution Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

## Connexes

- [Tests](/fr/help/testing)
- [Tests en direct](/fr/help/testing-live)

---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

# Tests

- Kit de test complet (suites, en direct, Docker) : [Testing](/fr/help/testing)

- `pnpm test:force` : Tue tout processus gateway résiduel tenant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Il s'agit d'une porte de couverture unitaire des fichiers chargés, et non de la couverture de tous les fichiers du dépôt entier. Les seuils sont de 70 % pour les lignes/fonctions/instructions et de 55 % pour les branches. Comme `coverage.all` est faux, la porte mesure les fichiers chargés par la suite de couverture unitaire au lieu de traiter chaque fichier source de scission de voie comme non couvert.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : transforme les chemins git modifiés en voies Vitest délimitées lorsque la différence ne touche que les fichiers source/test routables. Les modifications de configuration/configuration reviennent toujours à l'exécution native des projets racine afin que les modifications de câblage soient réexécutées largement si nécessaire.
- `pnpm changed:lanes` : affiche les voies architecturales déclenchées par la diff par rapport à `origin/main`.
- `pnpm check:changed` : exécute la smart changed gate pour le diff par rapport à `origin/main`. Il exécute le travail principal avec les voies de test principales, le travail d'extension avec les voies de test d'extension, le travail de test uniquement avec la vérification de type de test/tests uniquement, étend les modifications du Plugin SDK public ou du plugin-contract à la validation d'extension, et maintient les incrémentations de version des métadonnées de release sur les vérifications de version/configuration/dépendance racine ciblées.
- `pnpm test` : achemine les cibles de fichiers/répertoires explicites via des voies Vitest délimitées. Les exécutions sans cible utilisent des groupes de shards fixes et s'étendent aux configurations feuilles pour l'exécution parallèle locale ; le groupe d'extension s'étend toujours aux configurations de shard par extension au lieu d'un processus géant de projet racine.
- Les exécutions complètes et par shard d'extension mettent à jour les données de minutage local dans `.artifacts/vitest-shard-timings.json` ; les exécutions ultérieures utilisent ces minutages pour équilibrer les shards lents et rapides. Définissez `OPENCLAW_TEST_PROJECTS_TIMINGS=0` pour ignorer l'artefact de minutage local.
- Les fichiers de test `plugin-sdk` et `commands` sélectionnés sont maintenant acheminés via des voies légères dédiées qui ne gardent que `test/setup.ts`, laissant les cas lourds au niveau de l'exécution sur leurs voies existantes.
- Certains fichiers source d'assistance `plugin-sdk` et `commands` mappent également `pnpm test:changed` à des tests frères explicites dans ces voies légères, afin que les petites modifications d'assistance évitent de relancer les suites lourdes basées sur le runtime.
- `auto-reply` se divise maintenant également en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests plus légers de niveau supérieur (statut, jeton, assistant).
- La configuration de base de Vitest utilise désormais par défaut `pool: "threads"` et `isolate: false`, avec le runner partagé non isolé activé dans les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` et `pnpm test extensions` exécutent tous les fragments d'extension/plugin. Les extensions de canal lourdes et OpenAI s'exécutent en tant que fragments dédiés ; les autres groupes d'extensions restent regroupés. Utilisez `pnpm test extensions/<id>` pour une voie groupée de plugin.
- `pnpm test:perf:imports` : active le rapport de durée d'importation et de répartition des importations de Vitest, tout en utilisant toujours le routage de voie délimité pour les cibles de fichiers/répertoires explicites.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les performances de la voie routée en mode modifié par rapport à l'exécution native du projet racine pour la même différence git validée.
- `pnpm test:perf:changed:bench -- --worktree` compare les performances de l'ensemble de modifications actuel de l'arbre de travail sans valider au préalable.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit des profils CPU + tas pour le runner unitaire (`.artifacts/vitest-runner-profile`).
- Intégration Gateway : optionnel via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute des tests de fumée de bout en bout du Gateway (appariement multi-instance WS/HTTP/node). Par défaut `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux détaillés.
- `pnpm test:live` : Exécute des tests en direct des providers (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifiques au provider) pour annuler le saut.
- `pnpm test:docker:openwebui` : Démarre OpenClaw sous Docker + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel via proxy à travers `/api/chat/completions`. Nécessite une clé de modèle en direct utilisable (par exemple OpenAI dans `~/.profile`), tire une image Open WebUI externe, et n'est pas censé être stable en CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un deuxième conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations routées, les lectures de transcripts, les métadonnées des pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant, et les notifications de canal + autorisations de style Claude sur le pont stdio réel. L'assertion de notification Claude lit les trames MCP stdio brutes directement pour que le test reflète ce que le pont émet réellement.

## Local PR gate

Pour les vérifications locales d'atterrissage/de porte (gate) de PR, exécutez :

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable (flake) sur un hôte chargé, relancez une fois avant de le considérer comme une régression, puis isolez avec `pnpm test <path/to/test>`. Pour les hôtes à mémoire limitée, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Model latency bench (local keys)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env optionnelle : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire. »

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279ms (min 1114, max 2431)
- opus médiane 2454ms (min 1224, max 3170)

## Benchmark de démarrage CLI

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Préréglages :

- `startup` : `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real` : `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all` : les deux préréglages

La sortie inclut `sampleCount`, la moyenne, p50, p95, min/max, la distribution des codes de sortie/signaux, et des résumés RSS max pour chaque commande. L'option `--cpu-prof-dir` / `--heap-prof-dir` écrit les profils V8 par exécution pour que le chronométrage et la capture de profil utilisent le même harnais.

Conventions de sortie enregistrée :

- `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de la suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` rafraîchit la fixture de base de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Rafraîchir avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture avec `pnpm test:startup:bench:check`

## E2E d'onboarding (Docker)

Docker est facultatif ; cela n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'importation QR (Docker)

S'assure que `qrcode-terminal` se charge sous les runtimes Docker Node pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

# Tests

- Kit de tests complet (suites, live, Docker) : [Tests](/en/help/testing)

- `pnpm test:force` : Tue tout processus gateway résiduel tenant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Les seuils globaux sont de 70 % pour les lignes/branches/fonctions/énoncés. La couverture exclut les points d'entrée lourds en intégration (câblage CLI, ponts gateway/telegram, serveur statique webchat) pour garder la cible concentrée sur la logic testable en unitaire.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : exécute le wrapper avec `--changed origin/main`. La configuration de base de Vitest traite les fichiers manifestes/config du wrapper comme `forceRerunTriggers`, de sorte que les modifications du planificateur (scheduler) déclenchent toujours une réexécution large si nécessaire.
- `pnpm test` : exécute le wrapper complet. Il ne conserve qu'un petit manifeste de remplacement comportemental dans git, puis utilise un instantané de synchronisation (timing snapshot) archivé pour isoler les fichiers unitaires les plus lourds dans des voies dédiées.
- Les fichiers unitaires sont réglés par défaut sur `threads` dans le wrapper ; gardez les exceptions fork-only documentées dans `test/fixtures/test-parallel.behavior.json`.
- `pnpm test:channels` utilise maintenant par défaut `threads` via `vitest.channels.config.ts` ; l'exécution de contrôle directe de la suite complète du 22 mars 2026 s'est déroulée sans erreur sans exceptions fork spécifiques au canal.
- `pnpm test:extensions` s'exécute via le wrapper et conserve les exceptions fork-only d'extension documentées dans `test/fixtures/test-parallel.behavior.json` ; la voie d'extension partagée utilise toujours par défaut `threads`.
- `pnpm test:extensions` : exécute les suites d'extensions/plugins.
- `pnpm test:perf:imports` : active le rapport de durée d'importation (import-duration) + de répartition d'importation (import-breakdown) Vitest pour le wrapper.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + tas (heap) pour l'exécuteur d'unités (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:update-timings` : actualise l'instantané de synchronisation des fichiers lents (slow-file timing snapshot) archivé utilisé par `scripts/test-parallel.mjs`.
- Intégration Gateway : activation (opt-in) via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute des tests de fumée de bout en bout de la passerelle (appariement multi-instance WS/HTTP/nœud). Par défaut `forks` + workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux détaillés.
- `pnpm test:live` : Exécute les tests en direct des fournisseurs (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au fournisseur) pour ne pas être ignoré.
- `pnpm test:docker:openwebui` : Démarre OpenClaw conteneurisé + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat proxyé réel via `/api/chat/completions`. Nécessite une clé de modèle en direct utilisable (par exemple OpenAI dans `~/.profile`), tire une image externe Open WebUI, et n'est pas censé être stable pour l'CI comme les suites unitaires/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un second conteneur client qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations acheminées, la lecture des transcriptions, les métadonnées des pièces jointes, le comportement de la file d'événements en direct, l'acheminement des envois sortants et les notifications de style Claude channel + permissions via le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes, de sorte que le smoke test reflète ce que le pont émet réellement.

## Portail de validation PR locale

Pour les vérifications de fusion/de validation de PR locales, exécutez :

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm vitest run <path/to/test>`. Pour les hôtes aux ressources mémoire limitées, utilisez :

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Bench de latence de modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env facultative : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire. »

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279 ms (min 1114, max 2431)
- opus médiane 2454ms (min 1224, max 3170)

## Bench de démarrage CLI

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Préréglages :

- `startup` : `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real` : `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all` : les deux préréglages

La sortie inclut `sampleCount`, avg, p50, p95, min/max, la distribution des codes de sortie/signaux, et les résumés RSS max pour chaque commande. `--cpu-prof-dir` / `--heap-prof-dir` en option écrit les profils V8 par exécution afin que la synchronisation et la capture de profil utilisent le même harnais.

Conventions de sortie enregistrées :

- `pnpm test:startup:bench:smoke` écrit l'artefact de fumée ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` actualise la fixture de base de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture archivé :

- `test/fixtures/cli-startup-bench.json`
- Actualiser avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture à l'aide de `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker est facultatif ; ceci n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers de configuration/espace de travail/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'import QR (Docker)

S'assure que `qrcode-terminal` se charge sous les environnements d'exécution Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

# Tests

- Kit de test complet (suites, live, Docker) : [Testing](/en/help/testing)

- `pnpm test:force` : Tue tout processus gateway résiduel tenant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Les seuils globaux sont de 70 % pour les lignes/branches/fonctions/énoncés. La couverture exclut les points d'entrée lourds en intégration (câblage CLI, ponts gateway/telegram, serveur statique webchat) pour garder la cible concentrée sur la logic testable en unitaire.
- `pnpm test:coverage:changed` : Exécute la couverture unitaire uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:changed` : étend les chemins git modifiés en pistes Vitest délimitées lorsque la diff ne touche que les fichiers source/test routables. Les modifications de config/setup reviennent toujours à l'exécution native des projets racine afin que les modifications de câblage soient réexécutées largement si nécessaire.
- `pnpm test` : achemine les cibles explicites de fichiers/répertoires via des pistes Vitest délimitées. Les exécutions non ciblées exécutent désormais onze configurations de shard séquentielles (`vitest.full-core-unit-src.config.ts`, `vitest.full-core-unit-security.config.ts`, `vitest.full-core-unit-ui.config.ts`, `vitest.full-core-unit-support.config.ts`, `vitest.full-core-support-boundary.config.ts`, `vitest.full-core-contracts.config.ts`, `vitest.full-core-bundled.config.ts`, `vitest.full-core-runtime.config.ts`, `vitest.full-agentic.config.ts`, `vitest.full-auto-reply.config.ts`, `vitest.full-extensions.config.ts`) au lieu d'un seul processus géant de projet racine.
- Les fichiers de test `plugin-sdk` et `commands` sélectionnés sont désormais acheminés via des pistes légères dédiées qui ne conservent que `test/setup.ts`, laissant les cas lourds au niveau de l'exécution sur leurs pistes existantes.
- Les fichiers source d'aide `plugin-sdk` et `commands` sélectionnés mappent également `pnpm test:changed` à des tests frères explicites dans ces pistes légères, afin que les petites modifications d'aide évitent de réexécuter les suites lourdes basées sur l'exécution.
- `auto-reply` se divise désormais également en trois configurations dédiées (`core`, `top-level`, `reply`) afin que le harnais de réponse ne domine pas les tests plus légers de statut/jeton/aide de niveau supérieur.
- La configuration de base de Vitest utilise désormais par défaut `pool: "threads"` et `isolate: false`, avec le runner partagé non isolé activé dans toutes les configurations du dépôt.
- `pnpm test:channels` exécute `vitest.channels.config.ts`.
- `pnpm test:extensions` exécute `vitest.extensions.config.ts`.
- `pnpm test:extensions` : exécute les suites d'extension/plugin.
- `pnpm test:perf:imports` : active les rapports Vitest sur la durée d'importation et la répartition des importations, tout en utilisant toujours le routage de piste délimité pour les cibles explicites de fichiers/répertoires.
- `pnpm test:perf:imports:changed` : même profilage d'importation, mais uniquement pour les fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les performances du chemin de routage en mode modifié par rapport à l'exécution native du projet racine pour la même diff git validée.
- `pnpm test:perf:changed:bench -- --worktree` compare les performances de l'ensemble des modifications actuelles de l'arbre de travail sans valider d'abord.
- `pnpm test:perf:profile:main` : écrit un profil CPU pour le thread principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner` : écrit les profils CPU + tas pour le lanceur d'unités (`.artifacts/vitest-runner-profile`).
- Intégration Gateway : optionnel via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute les tests de fumée de bout en bout de la passerelle (appariement multi-instance WS/HTTP/node). Par défaut `threads` + `isolate: false` avec des workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour les journaux détaillés.
- `pnpm test:live` : Exécute les tests en direct du provider (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au provider) pour ne pas être ignoré.
- `pnpm test:docker:openwebui` : Démarre OpenClaw Dockerisé + Open WebUI, se connecte via Open WebUI, vérifie `/api/models`, puis exécute un chat réel en mode proxy via `/api/chat/completions`. Nécessite une clé de modèle en direct utilisable (par exemple OpenAI dans `~/.profile`), tire une image externe Open WebUI, et n'est pas censé être stable comme les suites d'unités/e2e normales.
- `pnpm test:docker:mcp-channels` : Démarre un conteneur Gateway amorcé et un second conteneur client qui lance `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'événements en direct, le routage d'envoi sortant, et les notifications de style Claude (channel + permissions) via le pont stdio réel. L'assertion de notification Claude lit directement les trames MCP stdio brutes afin que le test reflète ce que le pont émet réellement.

## Porte PR locale

Pour les vérifications de porte/atterrissage PR locales, exécutez :

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm test <path/to/test>`. Pour les hôtes à mémoire limitée, utilisez :

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Benchmark de latence de modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env. optionnels : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire. »

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279 ms (min 1114, max 2431)
- opus médiane 2454 ms (min 1224, max 3170)

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

La sortie inclut `sampleCount`, avg, p50, p95, min/max, la distribution du code de sortie/signal, et les résumés RSS max pour chaque commande. L'option `--cpu-prof-dir` / `--heap-prof-dir` écrit les profils V8 par exécution afin que la capture du timing et du profil utilise le même harnais.

Conventions de sortie enregistrée :

- `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` écrit l'artefact de la suite complète à `.artifacts/cli-startup-bench-all.json` en utilisant `runs=5` et `warmup=1`
- `pnpm test:startup:bench:update` actualise la fixture de base de référence validée à `test/fixtures/cli-startup-bench.json` en utilisant `runs=5` et `warmup=1`

Fixture validée :

- `test/fixtures/cli-startup-bench.json`
- Actualiser avec `pnpm test:startup:bench:update`
- Comparer les résultats actuels avec la fixture avec `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker est facultatif ; cela n'est nécessaire que pour les tests de smoke d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## QR import smoke (Docker)

S'assure que `qrcode-terminal` se charge sous les runtimes Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

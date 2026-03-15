---
summary: "Comment exécuter des tests localement (vitest) et quand utiliser les modes force/coverage"
read_when:
  - Running or fixing tests
title: "Tests"
---

# Tests

- Ensemble complet de tests (suites, live, Docker) : [Testing](/fr/help/testing)

- `pnpm test:force` : Tue tout processus gateway résiduel tenant le port de contrôle par défaut, puis exécute la suite complète Vitest avec un port gateway isolé pour éviter que les tests serveur n'entrent en collision avec une instance en cours d'exécution. À utiliser lorsqu'une exécution précédente de la gateway a laissé le port 18789 occupé.
- `pnpm test:coverage` : Exécute la suite unitaire avec la couverture V8 (via `vitest.unit.config.ts`). Les seuils globaux sont de 70 % pour les lignes/branches/fonctions/énoncés. La couverture exclut les points d'entrée lourds en intégration (câblage CLI, ponts gateway/telegram, serveur statique webchat) pour garder la cible concentrée sur la logic testable en unitaire.
- `pnpm test` sur Node 22, 23 et 24 utilise Vitest `vmForks` par défaut pour un démarrage plus rapide. Node 25+ revient à `forks` jusqu'à nouvelle validation. Vous pouvez forcer le comportement avec `OPENCLAW_TEST_VM_FORKS=0|1`.
- `pnpm test` : exécute la voie unitaire du noyau rapide par défaut pour un retour local rapide.
- `pnpm test:channels` : exécute les suites lourdes en canaux.
- `pnpm test:extensions` : exécute les suites d'extensions/plugins.
- Intégration Gateway : opt-in via `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` ou `pnpm test:gateway`.
- `pnpm test:e2e` : Exécute des tests de fumée de bout en bout de la gateway (appariement multi-instance WS/HTTP/node). Par défaut `vmForks` + workers adaptatifs dans `vitest.e2e.config.ts` ; ajustez avec `OPENCLAW_E2E_WORKERS=<n>` et définissez `OPENCLAW_E2E_VERBOSE=1` pour des journaux verbeux.
- `pnpm test:live` : Exécute les tests live de provider (minimax/zai). Nécessite des clés API et `LIVE=1` (ou `*_LIVE_TEST=1` spécifique au provider) pour ne pas être ignoré.

## Local PR gate

Pour les vérifications locales d'atterrissage/filtrage de PR, exécutez :

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` est instable sur un hôte chargé, relancez-le une fois avant de le considérer comme une régression, puis isolez-le avec `pnpm vitest run <path/to/test>`. Pour les hôtes à mémoire limitée, utilisez :

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## Banc d'essai de latence du modèle (clés locales)

Script : [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Utilisation :

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Variables d'environnement facultatives : `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Invite par défaut : « Répondez par un seul mot : ok. Pas de ponctuation ni de texte supplémentaire. »

Dernière exécution (2025-12-31, 20 exécutions) :

- minimax médiane 1279ms (min 1114, max 2431)
- opus médiane 2454ms (min 1224, max 3170)

## Banc d'essai de démarrage CLI

Script : [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Utilisation :

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

Cela évalue ces commandes :

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

La sortie inclut la moyenne, p50, p95, min/max, et la distribution des codes de sortie/signaux pour chaque commande.

## E2E d'onboarding (Docker)

Docker est facultatif ; ceci n'est nécessaire que pour les tests de fumée d'onboarding conteneurisés.

Flux complet de démarrage à froid dans un conteneur Linux propre :

```bash
scripts/e2e/onboard-docker.sh
```

Ce script pilote l'assistant interactif via un pseudo-tty, vérifie les fichiers de config/workspace/session, puis démarre la passerelle et exécute `openclaw health`.

## Test de fumée d'import QR (Docker)

S'assure que `qrcode-terminal` se charge sous les runtimes Node Docker pris en charge (Node 24 par défaut, Node 22 compatible) :

```bash
pnpm test:docker:qr
```

import fr from '/components/footer/fr.mdx';

<fr />

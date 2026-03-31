---
title: "Flux de développement Pi"
summary: "Flux de travail développeur pour l'intégration Pi : build, test et validation en direct"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

# Flux de développement Pi

Ce guide résume un flux de travail sain pour travailler sur l'intégration pi dans OpenClaw.

## Vérification de type et Linting

- Vérification de type et build : `pnpm build`
- Lint : `pnpm lint`
- Vérification du formatage : `pnpm format`
- Passage complet avant le push : `pnpm lint && pnpm build && pnpm test`

## Exécution des tests Pi

Exécutez la série de tests axés sur Pi directement avec Vitest :

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-extensions/**/*.test.ts"
```

Pour inclure l'exercice du provider en direct :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

Cela couvre les principales suites unitaires Pi :

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-extensions/*.test.ts`

## Tests manuels

Flux recommandé :

- Lancez la passerelle en mode dev :
  - `pnpm gateway:dev`
- Déclenchez l'agent directement :
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Utilisez le TUI pour le débogage interactif :
  - `pnpm tui`

Pour le comportement des appels tool, demandez une action `read` ou `exec` afin de voir le streaming tool et la gestion des payloads.

## Réinitialisation complète

L'état réside dans le répertoire d'état OpenClaw. La valeur par défaut est `~/.openclaw`. Si `OPENCLAW_STATE_DIR` est défini, utilisez ce répertoire à la place.

Pour tout réinitialiser :

- `openclaw.json` pour la configuration
- `credentials/` pour les profils d'authentification et les jetons
- `agents/<agentId>/sessions/` pour l'historique des session agent
- `agents/<agentId>/sessions.json` pour l'index des sessions
- `sessions/` si des chemins hérités existent
- `workspace/` si vous souhaitez un espace de travail vierge

Si vous ne souhaitez réinitialiser que les sessions, supprimez `agents/<agentId>/sessions/` et `agents/<agentId>/sessions.json` pour cet agent. Conservez `credentials/` si vous ne souhaitez pas vous réauthentifier.

## Références

- [Tests](/en/help/testing)
- [Getting Started](/en/start/getting-started)

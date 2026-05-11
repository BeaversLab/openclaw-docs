---
summary: "Workflow de développeur pour l'intégration Pi : build, test et validation en direct"
title: "Workflow de développement Pi"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

Un workflow sain pour travailler sur l'intégration Pi dans OpenClaw.

## Vérification de type et linting

- Passerelle locale par défaut : `pnpm check`
- Passerelle de build : `pnpm build` lorsque le changement peut affecter la sortie de build, le packaging, ou les limites de lazy-loading/modules
- Passerelle complète d'atterrissage pour les changements lourds liés à Pi : `pnpm check && pnpm test`

## Exécution des tests Pi

Exécuter directement la suite de tests axés sur Pi avec Vitest :

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

Pour inclure l'exercice en direct du provider :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

Cela couvre les principales suites unitaires Pi :

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## Test manuel

Flux recommandé :

- Lancer la passerelle en mode dev :
  - `pnpm gateway:dev`
- Déclencher l'agent directement :
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Utiliser le TUI pour le débogage interactif :
  - `pnpm tui`

Pour le comportement des appels d'outils, demandez une action `read` ou `exec` afin de voir le streaming de l'outil et la gestion des payloads.

## Réinitialisation propre

L'état réside sous le répertoire d'état OpenClaw. La valeur par défaut est `~/.openclaw`. Si `OPENCLAW_STATE_DIR` est défini, utilisez ce répertoire à la place.

Pour tout réinitialiser :

- `openclaw.json` pour la configuration
- `agents/<agentId>/agent/auth-profiles.json` pour les profils d'auth de modèle (clés API + OAuth)
- `credentials/` pour l'état provider/channel qui réside toujours en dehors du magasin de profils d'auth
- `agents/<agentId>/sessions/` pour l'historique des sessions de l'agent
- `agents/<agentId>/sessions/sessions.json` pour l'index des sessions
- `sessions/` si les chemins hérités existent
- `workspace/` si vous souhaitez un espace de travail vierge

Si vous souhaitez uniquement réinitialiser les sessions, supprimez `agents/<agentId>/sessions/` pour cet agent. Si vous souhaitez conserver l'auth, laissez `agents/<agentId>/agent/auth-profiles.json` et tout état provider sous `credentials/` en place.

## Références

- [Tests](/fr/help/testing)
- [Getting Started](/fr/start/getting-started)

## Connexes

- [Architecture de l'intégration Pi](/fr/pi)

---
summary: "OpenClawWorkflow développeur pour le runtime d'agent OpenClaw : build, test et validation en direct"
title: "OpenClawWorkflow du runtime d'agent OpenClaw"
read_when:
  - Working on OpenClaw agent runtime code or tests
  - Running agent-runtime lint, typecheck, and live test flows
---

Un workflow cohérent pour travailler sur le runtime d'agent OpenClaw dans OpenClaw.

## Vérification des types et linting

- Portail local par défaut : `pnpm check`
- Portail de build : `pnpm build` lorsque le changement peut affecter la sortie du build, le packaging ou les limites de chargement différé/module
- Portail d'atterrissage complet pour les modifications de l'agent-runtime : `pnpm check && pnpm test`

## Exécution des tests du runtime d'agent

Exécutez directement la suite de tests de l'agent-runtime avec Vitest :

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-tools*.test.ts" \
  "src/agents/agent-settings.test.ts" \
  "src/agents/agent-tool-definition-adapter*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

Pour inclure l'exercice du provider en direct :

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/embedded-agent-runner-extraparams.live.test.ts
```

Cela couvre les principales suites de tests unitaires du runtime d'agent :

- `src/agents/agent-*.test.ts`
- `src/agents/embedded-agent-*.test.ts`
- `src/agents/agent-tools*.test.ts`
- `src/agents/agent-settings.test.ts`
- `src/agents/agent-tool-definition-adapter.test.ts`
- `src/agents/agent-hooks/*.test.ts`

## Tests manuels

Flux recommandé :

- Exécutez la passerelle en mode dev :
  - `pnpm gateway:dev`
- Déclenchez l'agent directement :
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Utilisez la TUI pour le débogage interactif :
  - `pnpm tui`

Pour le comportement d'appel d'outil, demandez une action `read` ou `exec` afin que vous puissiez voir le streaming de l'outil et la gestion des payloads.

## Réinitialisation à zéro

L'état réside dans le répertoire d'état OpenClaw. La valeur par défaut est OpenClaw`~/.openclaw`. Si `OPENCLAW_STATE_DIR` est défini, utilisez ce répertoire à la place.

Pour tout réinitialiser :

- `openclaw.json` pour la configuration
- `agents/<agentId>/agent/auth-profiles.json`APIOAuth pour les profils d'authentification de modèle (clés API + OAuth)
- `credentials/` pour l'état du provider/channel qui réside toujours en dehors du magasin de profils d'authentification
- `agents/<agentId>/sessions/` pour l'historique des sessions de l'agent
- `agents/<agentId>/sessions/sessions.json` pour l'index de session
- `sessions/` si des chemins hérités existent
- `workspace/` si vous voulez un espace de travail vierge

Si vous souhaitez uniquement réinitialiser les sessions, supprimez `agents/<agentId>/sessions/` pour cet agent. Si vous souhaitez conserver l'authentification, laissez `agents/<agentId>/agent/auth-profiles.json` et tout état de fournisseur sous `credentials/` en place.

## Références

- [Testing](/fr/help/testing)
- [Getting Started](/fr/start/getting-started)

## Connexes

- [OpenClaw agent runtime architecture](/fr/agent-runtime-architecture)

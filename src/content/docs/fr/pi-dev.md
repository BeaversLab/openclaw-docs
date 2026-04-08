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

- Default local gate: `pnpm check`
- Build gate: `pnpm build` when the change can affect build output, packaging, or lazy-loading/module boundaries
- Full landing gate for Pi-heavy changes: `pnpm check && pnpm test`

## Running Pi Tests

Run the Pi-focused test set directly with Vitest:

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

To include the live provider exercise:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

This covers the main Pi unit suites:

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## Manual Testing

Recommended flow:

- Run the gateway in dev mode:
  - `pnpm gateway:dev`
- Trigger the agent directly:
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Use the TUI for interactive debugging:
  - `pnpm tui`

For tool call behavior, prompt for a `read` or `exec` action so you can see tool streaming and payload handling.

## Clean Slate Reset

State lives under the OpenClaw state directory. Default is `~/.openclaw`. If `OPENCLAW_STATE_DIR` is set, use that directory instead.

To reset everything:

- `openclaw.json` for config
- `agents/<agentId>/agent/auth-profiles.json` for model auth profiles (API keys + OAuth)
- `credentials/` for provider/channel state that still lives outside the auth profile store
- `agents/<agentId>/sessions/` pour l'historique des session agent
- `agents/<agentId>/sessions/sessions.json` for the session index
- `sessions/` si des chemins hérités existent
- `workspace/` si vous souhaitez un espace de travail vierge

If you only want to reset sessions, delete `agents/<agentId>/sessions/` for that agent. If you want to keep auth, leave `agents/<agentId>/agent/auth-profiles.json` and any provider state under `credentials/` in place.

## Références

- [Tests](/en/help/testing)
- [Getting Started](/en/start/getting-started)

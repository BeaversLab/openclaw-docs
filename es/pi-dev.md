---
title: "Flujo de trabajo de desarrollo de Pi"
summary: "Flujo de trabajo del desarrollador para la integración de Pi: compilación, pruebas y validación en vivo"
read_when:
  - Working on Pi integration code or tests
  - Running Pi-specific lint, typecheck, and live test flows
---

# Flujo de trabajo de desarrollo de Pi

Esta guía resume un flujo de trabajo sensato para trabajar en la integración de pi en OpenClaw.

## Comprobación de tipos y Linting

- Comprobación de tipos y compilación: `pnpm build`
- Lint: `pnpm lint`
- Comprobación de formato: `pnpm format`
- Comprobación completa antes de enviar: `pnpm lint && pnpm build && pnpm test`

## Ejecución de pruebas de Pi

Ejecute el conjunto de pruebas centrado en Pi directamente con Vitest:

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-extensions/**/*.test.ts"
```

Para incluir el ejercicio del proveedor en vivo:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

Esto cubre las principales suites de unidades de Pi:

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-extensions/*.test.ts`

## Pruebas manuales

Flujo recomendado:

- Ejecute la puerta de enlace en modo de desarrollo:
  - `pnpm gateway:dev`
- Activar el agente directamente:
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Use la interfaz de usuario de terminal (TUI) para la depuración interactiva:
  - `pnpm tui`

Para el comportamiento de la llamada a herramientas, solicite una acción `read` o `exec` para que pueda ver la transmisión de herramientas y el manejo de cargas útiles.

## Restablecimiento limpio

El estado reside en el directorio de estado de OpenClaw. El valor predeterminado es `~/.openclaw`. Si `OPENCLAW_STATE_DIR` está configurado, use ese directorio en su lugar.

Para restablecer todo:

- `openclaw.json` para la configuración
- `credentials/` para los perfiles de autenticación y tokens
- `agents/<agentId>/sessions/` para el historial de sesiones del agente
- `agents/<agentId>/sessions.json` para el índice de sesiones
- `sessions/` si existen rutas heredadas
- `workspace/` si desea un espacio de trabajo en blanco

Si solo desea restablecer las sesiones, elimine `agents/<agentId>/sessions/` y `agents/<agentId>/sessions.json` para ese agente. Conserve `credentials/` si no desea volver a autenticarse.

## Referencias

- [https://docs.openclaw.ai/testing](https://docs.openclaw.ai/testing)
- [https://docs.openclaw.ai/start/getting-started](https://docs.openclaw.ai/start/getting-started)

import es from "/components/footer/es.mdx";

<es />

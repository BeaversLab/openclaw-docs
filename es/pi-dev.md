---
title: "Flujo de trabajo de desarrollo de Pi"
summary: "Flujo de trabajo del desarrollador para la integración de Pi: compilación, pruebas y validación en vivo"
read_when:
  - Trabajar en el código de integración de Pi o en las pruebas
  - Ejecutar flujos de lint, verificación de tipos y pruebas en vivo específicos de Pi
---

# Flujo de trabajo de desarrollo de Pi

Esta guía resume un flujo de trabajo lógico para trabajar en la integración de pi en OpenClaw.

## Verificación de tipos y Linting

- Verificación de tipos y compilación: `pnpm build`
- Lint: `pnpm lint`
- Verificación de formato: `pnpm format`
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

- Ejecute el gateway en modo de desarrollo:
  - `pnpm gateway:dev`
- Active el agente directamente:
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Use la interfaz de usuario de texto (TUI) para la depuración interactiva:
  - `pnpm tui`

Para el comportamiento de la llamada a la herramienta, solicite una acción `read` o `exec` para poder ver la transmisión de la herramienta y el manejo de la carga útil.

## Restablecimiento total

El estado se encuentra en el directorio de estado de OpenClaw. El valor predeterminado es `~/.openclaw`. Si se establece `OPENCLAW_STATE_DIR`, utilice ese directorio en su lugar.

Para restablecer todo:

- `openclaw.json` para la configuración
- `credentials/` para los perfiles de autenticación y tokens
- `agents/<agentId>/sessions/` para el historial de sesión del agente
- `agents/<agentId>/sessions.json` para el índice de sesión
- `sessions/` si existen rutas heredadas
- `workspace/` si desea un espacio de trabajo en blanco

Si solo desea restablecer las sesiones, elimine `agents/<agentId>/sessions/` y `agents/<agentId>/sessions.json` para ese agente. Mantenga `credentials/` si no desea volver a autenticarse.

## Referencias

- [Pruebas](/es/help/testing)
- [Comenzando](/es/start/getting-started)

import en from "/components/footer/en.mdx";

<en />

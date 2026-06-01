---
summary: "Flujo de trabajo del desarrollador para el tiempo de ejecución del agente OpenClaw: compilación, pruebas y validación en vivo"
title: "Flujo de trabajo del tiempo de ejecución del agente OpenClaw"
read_when:
  - Working on OpenClaw agent runtime code or tests
  - Running agent-runtime lint, typecheck, and live test flows
---

Un flujo de trabajo sensato para trabajar en el tiempo de ejecución del agente OpenClaw en OpenClaw.

## Verificación de tipos y linting

- Puerta de enlace local predeterminada: `pnpm check`
- Puerta de enlace de compilación: `pnpm build` cuando el cambio puede afectar la salida de la compilación, el empaquetado o la carga diferente/límites de módulos
- Puerta de enlace completa de aterrizaje para cambios en el tiempo de ejecución del agente: `pnpm check && pnpm test`

## Ejecución de pruebas del tiempo de ejecución del agente

Ejecute el conjunto de pruebas del tiempo de ejecución del agente directamente con Vitest:

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-tools*.test.ts" \
  "src/agents/agent-settings.test.ts" \
  "src/agents/agent-tool-definition-adapter*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

Para incluir el ejercicio del proveedor en vivo:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/embedded-agent-runner-extraparams.live.test.ts
```

Esto cubre las principales suites de pruebas unitarias del tiempo de ejecución del agente:

- `src/agents/agent-*.test.ts`
- `src/agents/embedded-agent-*.test.ts`
- `src/agents/agent-tools*.test.ts`
- `src/agents/agent-settings.test.ts`
- `src/agents/agent-tool-definition-adapter.test.ts`
- `src/agents/agent-hooks/*.test.ts`

## Pruebas manuales

Flujo recomendado:

- Ejecuta la puerta de enlace en modo de desarrollo:
  - `pnpm gateway:dev`
- Activa el agente directamente:
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Usa la interfaz de usuario de terminal (TUI) para la depuración interactiva:
  - `pnpm tui`

Para el comportamiento de las llamadas a herramientas, solicita una acción `read` o `exec` para que puedas ver la transmisión de herramientas y el manejo de cargas útiles.

## Restablecimiento total

El estado se encuentra en el directorio de estado de OpenClaw. El predeterminado es `~/.openclaw`. Si `OPENCLAW_STATE_DIR` está configurado, usa ese directorio en su lugar.

Para restablecer todo:

- `openclaw.json` para la configuración
- `agents/<agentId>/agent/auth-profiles.json` para los perfiles de autenticación de modelos (claves de API + OAuth)
- `credentials/` para el estado del proveedor/canal que aún reside fuera del almacén de perfiles de autenticación
- `agents/<agentId>/sessions/` para el historial de sesiones del agente
- `agents/<agentId>/sessions/sessions.json` para el índice de sesiones
- `sessions/` si existen rutas heredadas
- `workspace/` si desea un espacio de trabajo en blanco

Si solo desea restablecer las sesiones, elimine `agents/<agentId>/sessions/` de ese agente. Si desea mantener la autenticación, deje `agents/<agentId>/agent/auth-profiles.json` y cualquier estado del proveedor bajo `credentials/` en su lugar.

## Referencias

- [Pruebas](/es/help/testing)
- [Cómo empezar](/es/start/getting-started)

## Relacionado

- [Arquitectura del tiempo de ejecución del agente OpenClaw](/es/agent-runtime-architecture)

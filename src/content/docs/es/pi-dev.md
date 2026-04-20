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

- Puerta de enlace local predeterminada: `pnpm check`
- Puerta de enlace de compilación: `pnpm build` cuando el cambio puede afectar la salida de la compilación, el empaquetado o los límites de carga diferida/módulos
- Puerta de enlace de aterrizaje completa para cambios intensivos en Pi: `pnpm check && pnpm test`

## Ejecutar pruebas de Pi

Ejecute el conjunto de pruebas centrado en Pi directamente con Vitest:

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

Para incluir el ejercicio del proveedor en vivo:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

Esto cubre las suites principales de unidades de Pi:

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## Pruebas manuales

Flujo recomendado:

- Ejecute la puerta de enlace en modo de desarrollo:
  - `pnpm gateway:dev`
- Active el agente directamente:
  - `pnpm openclaw agent --message "Hello" --thinking low`
- Use la TUI para la depuración interactiva:
  - `pnpm tui`

Para el comportamiento de las llamadas a herramientas, solicite una acción `read` o `exec` para que pueda ver la transmisión de herramientas y el manejo de cargas útiles.

## Restablecimiento total

El estado se encuentra en el directorio de estado de OpenClaw. El valor predeterminado es `~/.openclaw`. Si `OPENCLAW_STATE_DIR` está configurado, use ese directorio en su lugar.

Para restablecer todo:

- `openclaw.json` para la configuración
- `agents/<agentId>/agent/auth-profiles.json` para los perfiles de autenticación del modelo (claves de API + OAuth)
- `credentials/` para el estado del proveedor/canal que aún reside fuera del almacén de perfiles de autenticación
- `agents/<agentId>/sessions/` para el historial de sesiones del agente
- `agents/<agentId>/sessions/sessions.json` para el índice de sesión
- `sessions/` si existen rutas heredadas
- `workspace/` si desea un espacio de trabajo en blanco

Si solo desea restablecer las sesiones, elimine `agents/<agentId>/sessions/` para ese agente. Si desea mantener la autenticación, deje `agents/<agentId>/agent/auth-profiles.json` y cualquier estado de proveedor en `credentials/` en su lugar.

## Referencias

- [Pruebas](/es/help/testing)
- [Para empezar](/es/start/getting-started)

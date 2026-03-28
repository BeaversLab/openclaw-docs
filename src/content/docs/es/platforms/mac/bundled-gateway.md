---
summary: "Gateway runtime en macOS (servicio launchd externo)"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "Gateway en macOS"
---

# Gateway en macOS (launchd externo)

OpenClaw.app ya no incluye Node/Bun ni el tiempo de ejecución de Gateway. La aplicación de macOS espera una instalación de la CLI `openclaw` **externa**, no inicia Gateway como proceso secundario y gestiona un servicio launchd por usuario para mantener Gateway en ejecución (o se conecta a un Gateway local existente si ya se está ejecutando).

## Instalar la CLI (necesario para el modo local)

Node 24 es el tiempo de ejecución predeterminado en Mac. Node 22 LTS, actualmente `22.14+`, todavía funciona por compatibilidad. Luego, instale `openclaw` globalmente:

```bash
npm install -g openclaw@<version>
```

El botón **Install CLI** de la aplicación de macOS ejecuta el mismo flujo a través de npm/pnpm (no se recomienda bun para el tiempo de ejecución de Gateway).

## Launchd (Gateway como LaunchAgent)

Etiqueta:

- `ai.openclaw.gateway` (o `ai.openclaw.<profile>`; `com.openclaw.*` antiguo puede permanecer)

Ubicación del plist (por usuario):

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (o `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

Gestor:

- La aplicación de macOS es responsable de la instalación/actualización de LaunchAgent en modo Local.
- La CLI también puede instalarlo: `openclaw gateway install`.

Comportamiento:

- “OpenClaw Active” habilita/deshabilita el LaunchAgent.
- Salir de la aplicación **no** detiene el gateway (launchd lo mantiene activo).
- Si ya hay un Gateway ejecutándose en el puerto configurado, la aplicación se conecta a él en lugar de iniciar uno nuevo.

Registro:

- launchd stdout/err: `/tmp/openclaw/openclaw-gateway.log`

## Compatibilidad de versiones

La aplicación de macOS verifica la versión del gateway con su propia versión. Si son incompatibles, actualice la CLI global para que coincida con la versión de la aplicación.

## Prueba rápida

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

Luego:

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

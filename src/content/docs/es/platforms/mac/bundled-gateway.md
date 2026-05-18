---
summary: "Gateway runtime en macOS (servicio launchd externo)"
read_when:
  - Packaging OpenClaw.app
  - Debugging the macOS gateway launchd service
  - Installing the gateway CLI for macOS
title: "Gateway en macOS"
---

OpenClaw.app ya no incluye Node/Bun ni el runtime de Gateway. La aplicación de
macOS espera una instalación de la CLI `openclaw` **externa**, no inicia Gateway
como un proceso secundario y gestiona un servicio launchd por usuario para mantener
Gateway en ejecución (o se conecta a un Gateway local existente si ya se está ejecutando).

## Instalar la CLI (necesario para el modo local)

Node 24 es el runtime predeterminado en Mac. Node 22 LTS, actualmente `22.16+`, todavía funciona por compatibilidad. Luego instale `openclaw` globalmente:

```bash
npm install -g openclaw@<version>
```

El botón **Install CLI** de la aplicación de macOS ejecuta el mismo flujo de
instalación global que la aplicación usa internamente: prefiere npm primero,
luego pnpm, luego bun si ese es el único gestor de paquetes detectado. Node
sigue siendo el runtime recomendado para Gateway.

## Launchd (Gateway como LaunchAgent)

Etiqueta:

- `ai.openclaw.gateway` (o `ai.openclaw.<profile>`; puede permanecer el `com.openclaw.*` heredado)

Ubicación del plist (por usuario):

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (o `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

Gestor:

- La aplicación de macOS gestiona la instalación/actualización de LaunchAgent en modo Local.
- La CLI también puede instalarlo: `openclaw gateway install`.

Comportamiento:

- "OpenClaw Active" activa/desactiva el LaunchAgent.
- Salir de la aplicación **no** detiene el gateway (launchd lo mantiene activo).
- Si un Gateway ya se está ejecutando en el puerto configurado, la aplicación se conecta a él en lugar de iniciar uno nuevo.

Registro:

- launchd stdout: `~/Library/Logs/openclaw/gateway.log` (los perfiles usan `gateway-<profile>.log`)
- launchd stderr: suprimido

## Compatibilidad de versiones

La aplicación de macOS verifica la versión de la puerta de enlace con su propia versión. Si son incompatibles, actualice la CLI global para que coincida con la versión de la aplicación.

## Verificación rápida

```bash
openclaw --version

OPENCLAW_SKIP_CHANNELS=1 \
OPENCLAW_SKIP_CANVAS_HOST=1 \
openclaw gateway --port 18999 --bind loopback
```

Entonces:

```bash
openclaw gateway call health --url ws://127.0.0.1:18999 --timeout 3000
```

## Relacionado

- [aplicación macOS](/es/platforms/macos)
- [manual de Gateway](/es/gateway)

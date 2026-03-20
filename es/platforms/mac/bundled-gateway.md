---
summary: "Gateway runtime en macOS (servicio launchd externo)"
read_when:
  - Empaquetado de OpenClaw.app
  - Depuración del servicio launchd de la puerta de enlace macOS
  - Instalación de la CLI de la puerta de enlace para macOS
title: "Gateway en macOS"
---

# Gateway en macOS (launchd externo)

OpenClaw.app ya no incluye Node/Bun ni el tiempo de ejecución de Gateway. La aplicación
de macOS espera una instalación de CLI `openclaw` **externa**, no inicia Gateway como un
proceso secundario y administra un servicio launchd por usuario para mantener Gateway
en ejecución (o se conecta a un Gateway local existente si ya se está ejecutando).

## Instalar la CLI (requerido para el modo local)

Node 24 es el tiempo de ejecución predeterminado en Mac. Node 22 LTS, actualmente `22.16+`, todavía funciona por compatibilidad. Luego instale `openclaw` globalmente:

```bash
npm install -g openclaw@<version>
```

El botón **Install CLI** de la aplicación macOS ejecuta el mismo flujo a través de npm/pnpm (no se recomienda bun para el tiempo de ejecución de Gateway).

## Launchd (Gateway como LaunchAgent)

Etiqueta:

- `ai.openclaw.gateway` (o `ai.openclaw.<profile>`; `com.openclaw.*` heredado puede permanecer)

Ubicación de Plist (por usuario):

- `~/Library/LaunchAgents/ai.openclaw.gateway.plist`
  (o `~/Library/LaunchAgents/ai.openclaw.<profile>.plist`)

Gestor:

- La aplicación macOS es propietaria de la instalación/actualización de LaunchAgent en modo Local.
- La CLI también puede instalarlo: `openclaw gateway install`.

Comportamiento:

- "OpenClaw Active" habilita/deshabilita el LaunchAgent.
- Salir de la aplicación **no** detiene la puerta de enlace (launchd la mantiene activa).
- Si ya se está ejecutando una Gateway en el puerto configurado, la aplicación se conecta a
  ella en lugar de iniciar una nueva.

Registro:

- launchd stdout/err: `/tmp/openclaw/openclaw-gateway.log`

## Compatibilidad de versiones

La aplicación macOS verifica la versión de la puerta de enlace contra su propia versión. Si son
incompatibles, actualice la CLI global para que coincida con la versión de la aplicación.

## Prueba rápida

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

import en from "/components/footer/en.mdx";

<en />

---
summary: "Cómo la aplicación de mac incrusta el WebChat de la puerta de enlace y cómo depurarlo"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat"
---

# WebChat (aplicación macOS)

La aplicación de la barra de menús de macOS incrusta la interfaz de usuario de WebChat como una vista nativa de SwiftUI. Se conecta a la puerta de enlace (Gateway) y, de forma predeterminada, utiliza la **sesión principal** para el agente seleccionado (con un selector de sesión para otras sesiones).

- **Modo local**: se conecta directamente al WebSocket de la puerta de enlace local.
- **Modo remoto**: reenvía el puerto de control de la puerta de enlace a través de SSH y utiliza ese túnel como el plano de datos.

## Lanzamiento y depuración

- Manual: menú Lobster → "Open Chat".
- Apertura automática para pruebas:

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- Registros: `./scripts/clawlog.sh` (subsistema `ai.openclaw`, categoría `WebChatSwiftUI`).

## Cómo está conectado

- Plano de datos: métodos WS de la puerta de enlace `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` y eventos `chat`, `agent`, `presence`, `tick`, `health`.
- Sesión: de forma predeterminada, la sesión principal (`main`, o `global` cuando el alcance es
  global). La interfaz de usuario puede cambiar entre sesiones.
- La incorporación (onboarding) utiliza una sesión dedicada para mantener la configuración de primera ejecución separada.

## Superficie de seguridad

- El modo remoto solo reenvía el puerto de control WebSocket de la puerta de enlace a través de SSH.

## Limitaciones conocidas

- La interfaz de usuario está optimizada para sesiones de chat (no es un sandbox de navegador completo).

import es from "/components/footer/es.mdx";

<es />

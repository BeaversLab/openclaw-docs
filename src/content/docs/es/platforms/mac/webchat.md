---
summary: "Cómo la aplicación de mac incrusta el WebChat de la puerta de enlace y cómo depurarlo"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

La aplicación de la barra de menús de macOS incorpora la interfaz de usuario de WebChat como una vista nativa de SwiftUI. Se conecta a la Gateway y por defecto utiliza la **sesión principal** para el agente seleccionado (con un selector de sesión para otras sesiones).

- **Modo local**: se conecta directamente al WebSocket de la Gateway local.
- **Modo remoto**: reenvía el puerto de control de la Gateway a través de SSH y utiliza ese túnel como el plano de datos.

## Lanzamiento y depuración

- Manual: menú Lobster → "Open Chat".
- Apertura automática para pruebas:

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- Registros: `./scripts/clawlog.sh` (subsistema `ai.openclaw`, categoría `WebChatSwiftUI`).

## Cómo está conectado

- Plano de datos: métodos WS de la Gateway `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` y eventos `chat`, `agent`, `presence`, `tick`, `health`.
- `chat.history` devuelve filas de transcripciones normalizadas para visualización: las etiquetas de directiva en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano
  (incluyendo `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`, y bloques de llamadas a herramientas truncados) y
  los tokens de control de modelo ASCII/ ancho filtrados se eliminan, las filas
  de asistente de token silencioso puro como `NO_REPLY` / `no_reply` exactas se
  omiten, y las filas excesivamente grandes pueden ser reemplazadas por marcadores de posición.
- Sesión: por defecto es la sesión principal (`main`, o `global` cuando el alcance es
  global). La interfaz puede cambiar entre sesiones.
- La incorporación utiliza una sesión dedicada para mantener separada la configuración de primera ejecución.

## Superficie de seguridad

- El modo remoto solo reenvía el puerto de control WebSocket de la puerta de enlace a través de SSH.

## Limitaciones conocidas

- La interfaz de usuario está optimizada para sesiones de chat (no es un sandbox de navegador completo).

## Relacionado

- [WebChat](/es/web/webchat)
- [macOS app](/es/platforms/macos)

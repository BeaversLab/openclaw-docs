---
summary: "Host estático de Loopback WebChat y uso de WS de Gateway para la interfaz de chat"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Interfaz de usuario de WebSocket de Gateway)

Estado: la interfaz de usuario de chat SwiftUI de macOS/iOS se comunica directamente con el WebSocket de Gateway.

## Qué es

- Una interfaz de usuario de chat nativa para la puerta de enlace (sin navegador incorporado y sin servidor estático local).
- Utiliza las mismas sesiones y reglas de enrutamiento que otros canales.
- Enrutamiento determinista: las respuestas siempre vuelven a WebChat.

## Inicio rápido

1. Inicie la puerta de enlace.
2. Abra la interfaz de usuario de WebChat (aplicación macOS/iOS) o la pestaña de chat de la interfaz de usuario de Control.
3. Asegúrese de que la autenticación de la puerta de enlace esté configurada (se requiere de forma predeterminada, incluso en loopback).

## Cómo funciona (comportamiento)

- La interfaz de usuario se conecta al WebSocket de Gateway y utiliza `chat.history`, `chat.send` y `chat.inject`.
- `chat.history` está limitado por estabilidad: Gateway puede truncar campos de texto largos, omitir metadatos pesados y reemplazar entradas demasiado grandes con `[chat.history omitted: message too large]`.
- `chat.inject` añade una nota de asistente directamente a la transcripción y la transmite a la interfaz de usuario (sin ejecución de agente).
- Las ejecuciones abortadas pueden mantener visible la salida parcial del asistente en la interfaz de usuario.
- Gateway guarda el texto parcial del asistente abortado en el historial de transcripciones cuando existe una salida almacenada en búfer y marca esas entradas con metadatos de aborto.
- El historial siempre se obtiene de la puerta de enlace (sin supervisión de archivos locales).
- Si la puerta de enlace no es accesible, WebChat es de solo lectura.

## Panel de herramientas de agentes de la interfaz de usuario de Control

- El panel de herramientas `/agents` del Control UI tiene dos vistas separadas:
  - **Disponible ahora** usa `tools.effective(sessionKey=...)` y muestra lo que la sesión
    actual puede usar realmente en tiempo de ejecución, incluyendo herramientas principales, de complemento y propias del canal.
  - **Configuración de herramientas** usa `tools.catalog` y se centra en los perfiles, anulaciones y
    semántica del catálogo.
- La disponibilidad en tiempo de ejecución está limitada a la sesión. Cambiar de sesiones en el mismo agente puede modificar la lista
  **Disponible ahora**.
- El editor de configuración no implica disponibilidad en tiempo de ejecución; el acceso efectivo aún sigue la precedencia de políticas
  (`allow`/`deny`, anulaciones por agente y proveedor/canal).

## Uso remoto

- El modo remoto realiza un túnel del WebSocket de la puerta de enlace a través de SSH/Tailscale.
- No necesita ejecutar un servidor WebChat separado.

## Referencia de configuración (WebChat)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones de canal:

- No hay un bloque `webchat.*` dedicado. WebChat usa el punto de conexión de la puerta de enlace + la configuración de autenticación a continuación.

Opciones globales relacionadas:

- `gateway.port`, `gateway.bind`: host/puerto del WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`: autenticación del WebSocket (token/contraseña).
- `gateway.auth.mode: "trusted-proxy"`: autenticación de proxy inverso para clientes del navegador (consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: destino de la puerta de enlace remota.
- `session.*`: almacenamiento de sesión y valores predeterminados de clave principal.

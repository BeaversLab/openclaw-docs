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
3. Asegúrese de que haya configurado una ruta de autenticación válida para la puerta de enlace (secreto compartido por defecto, incluso en loopback).

## Cómo funciona (comportamiento)

- La interfaz de usuario se conecta al WebSocket de Gateway y utiliza `chat.history`, `chat.send` y `chat.inject`.
- `chat.history` está limitado por estabilidad: Gateway puede truncar campos de texto largos, omitir metadatos pesados y reemplazar entradas demasiado grandes con `[chat.history omitted: message too large]`.
- `chat.history` también se normaliza para su visualización: se eliminan de el texto visible las etiquetas de directivas de entrega en línea como `[[reply_to_*]]` y `[[audio_as_voice]]`, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/ ancho completo filtrados, y se omiten las entradas del asistente cuyo texto visible completo es solo el token silencioso exacto `NO_REPLY` / `no_reply`.
- `chat.inject` añade una nota del asistente directamente a la transcripción y la transmite a la interfaz de usuario (sin ejecución de agente).
- Las ejecuciones abortadas pueden mantener visible la salida parcial del asistente en la interfaz de usuario.
- La puerta de enlace guarda el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida en el búfer y marca esas entradas con metadatos de anulación.
- El historial siempre se obtiene de la puerta de enlace (sin monitoreo de archivos locales).
- Si la puerta de enlace no está accesible, WebChat es de solo lectura.

## Panel de herramientas de agentes de la interfaz de control

- El panel de herramientas de la interfaz de control `/agents` tiene dos vistas separadas:
  - **Disponibles ahora mismo** utiliza `tools.effective(sessionKey=...)` y muestra lo que la sesión actual realmente puede usar en tiempo de ejecución, incluyendo herramientas principales, de complementos y propiedad del canal.
  - **Configuración de herramientas** utiliza `tools.catalog` y se centra en los perfiles, anulaciones y la semántica del catálogo.
- La disponibilidad en tiempo de ejecución está limitada a la sesión. Cambiar de sesiones en el mismo agente puede modificar la lista **Disponibles ahora mismo**.
- El editor de configuración no implica disponibilidad en tiempo de ejecución; el acceso efectivo todavía sigue la precedencia de la política (`allow`/`deny`, anulaciones por agente y proveedor/canal).

## Uso remoto

- El modo remoto realiza un túnel del WebSocket de la puerta de enlace a través de SSH/Tailscale.
- No necesita ejecutar un servidor WebChat separado.

## Referencia de configuración (WebChat)

Configuración completa: [Configuration](/en/gateway/configuration)

Opciones de WebChat:

- `gateway.webchat.chatHistoryMaxChars`: recuento máximo de caracteres para los campos de texto en las respuestas `chat.history`. Cuando una entrada de la transcripción supera este límite, Gateway trunca los campos de texto largos y puede reemplazar los mensajes excesivamente grandes con un marcador de posición. También se puede enviar un `maxChars` por solicitud desde el cliente para anular este valor predeterminado para una única llamada `chat.history`.

Opciones globales relacionadas:

- `gateway.port`, `gateway.bind`: host/puerto de WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`:
  autenticación WebSocket de secreto compartido.
- `gateway.auth.allowTailscale`: la pestaña de chat del Control UI del navegador puede usar los encabezados de identidad de Tailscale Serve
  cuando está habilitado.
- `gateway.auth.mode: "trusted-proxy"`: autenticación de proxy inverso para clientes del navegador detrás de una fuente de proxy **que no sea de bucle local** (loopback) con reconocimiento de identidad (consulte [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: destino de la puerta de enlace remota.
- `session.*`: valores predeterminados de almacenamiento de sesión y clave principal.

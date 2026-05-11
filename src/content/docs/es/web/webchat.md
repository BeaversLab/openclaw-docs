---
summary: "Host estático de Loopback WebChat y uso de WS de Gateway para la interfaz de chat"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

Estado: la interfaz de usuario de chat SwiftUI de macOS/iOS se comunica directamente con el WebSocket de Gateway.

## Qué es

- Una interfaz de usuario de chat nativa para la puerta de enlace (sin navegador incorporado y sin servidor estático local).
- Utiliza las mismas sesiones y reglas de enrutamiento que otros canales.
- Enrutamiento determinista: las respuestas siempre vuelven a WebChat.

## Inicio rápido

1. Inicie la puerta de enlace.
2. Abra la interfaz de usuario de WebChat (aplicación macOS/iOS) o la pestaña de chat de la interfaz de usuario de Control.
3. Asegúrese de que esté configurada una ruta de autenticación de puerta de enlace válida (secreto compartido de forma predeterminada,
   incluso en loopback).

## Cómo funciona (comportamiento)

- La interfaz de usuario se conecta al WebSocket de Gateway y usa `chat.history`, `chat.send` y `chat.inject`.
- `chat.history` está limitado por estabilidad: Gateway puede truncar campos de texto largos, omitir metadatos pesados y reemplazar entradas excesivamente grandes con `[chat.history omitted: message too large]`.
- `chat.history` también se normaliza para visualización: contexto de OpenClaw solo en tiempo de ejecución,
  contenedores de sobre entrantes, etiquetas de directivas de entrega en línea
  como `[[reply_to_*]]` y `[[audio_as_voice]]`, cargas útiles XML de llamadas a herramientas en texto plano
  (incluyendo `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`, y bloques de llamadas a herramientas truncados), y
  los tokens de control de modelo ASCII/de ancho completo filtrados se eliminan del texto visible,
  y se omiten las entradas del asistente cuyo texto visible completo es solo el token silencioso
  exacto `NO_REPLY` / `no_reply`.
- Las cargas útiles de respuesta marcadas como razonamiento (`isReasoning: true`) se excluyen del contenido del asistente de WebChat, el texto de reproducción de la transcripción y los bloques de contenido de audio, por lo que las cargas útiles solo de pensamiento no aparecen como mensajes visibles del asistente ni audio reproducible.
- `chat.inject` añade una nota del asistente directamente a la transcripción y la transmite a la interfaz de usuario (sin ejecución de agente).
- Las ejecuciones abortadas pueden mantener visible la salida parcial del asistente en la interfaz de usuario.
- La puerta de enlace guarda el texto parcial del asistente abortado en el historial de transcripciones cuando existe salida en el búfer y marca esas entradas con metadatos de anulación.
- El historial siempre se obtiene de la puerta de enlace (sin monitoreo de archivos locales).
- Si la puerta de enlace no está accesible, WebChat es de solo lectura.

## Panel de herramientas de agentes de la interfaz de control

- El panel de herramientas `/agents` de la interfaz de usuario de Control tiene dos vistas separadas:
  - **Disponible ahora mismo** usa `tools.effective(sessionKey=...)` y muestra lo que la sesión
    actual realmente puede usar en tiempo de ejecución, incluyendo herramientas principales, de complementos y propias del canal.
  - **Configuración de herramientas** usa `tools.catalog` y se mantiene enfocada en perfiles, anulaciones y
    semántica del catálogo.
- La disponibilidad en tiempo de ejecución está limitada a la sesión. Cambiar de sesiones en el mismo agente puede modificar la lista **Disponibles ahora mismo**.
- El editor de configuración no implica disponibilidad en tiempo de ejecución; el acceso efectivo aún sigue la precedencia de la política
  (`allow`/`deny`, anulaciones por agente y por proveedor/canal).

## Uso remoto

- El modo remoto realiza un túnel del WebSocket de la puerta de enlace a través de SSH/Tailscale.
- No necesita ejecutar un servidor WebChat separado.

## Referencia de configuración (WebChat)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones de WebChat:

- `gateway.webchat.chatHistoryMaxChars`: recuento máximo de caracteres para campos de texto en respuestas `chat.history`. Cuando una entrada de transcripción excede este límite, Gateway trunca los campos de texto largos y puede reemplazar los mensajes excesivamente grandes con un marcador de posición. El `maxChars` por solicitud también puede ser enviado por el cliente para anular este valor predeterminado para una única llamada `chat.history`.

Opciones globales relacionadas:

- `gateway.port`, `gateway.bind`: host/puerto WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`:
  autenticación WebSocket de secreto compartido.
- `gateway.auth.allowTailscale`: la pestaña de chat del Control UI del navegador puede usar encabezados de identidad de Tailscale
  Serve cuando está habilitado.
- `gateway.auth.mode: "trusted-proxy"`: autenticación de proxy inverso para clientes del navegador detrás de una fuente de proxy **que no sea de bucle invertido** (non-loopback) consciente de la identidad (consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: destino de puerta de enlace remota.
- `session.*`: almacenamiento de sesión y valores predeterminados de la clave principal.

## Relacionado

- [Control UI](/es/web/control-ui)
- [Dashboard](/es/web/dashboard)

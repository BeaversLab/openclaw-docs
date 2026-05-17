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
- `chat.history` sigue la rama de transcripción activa para los archivos de sesión de solo anexos modernos, por lo que las ramas de reescritura abandonadas y las copias de indicaciones superseded no se renderizan en WebChat.
- Las entradas de compactación se representan como un divisor de historial compactado explícito. El divisor explica que los turnos anteriores se conservan en un punto de control y vincula a los controles de punto de control de Sesiones, donde los operadores pueden bifurcar o restaurar la vista previa a la compactación cuando sus permisos lo permiten.
- La interfaz de usuario de control recuerda el `sessionId` de respaldo del Gateway devuelto por `chat.history` y lo incluye en las llamadas `chat.send` posteriores, por lo que las reconexiones y las actualizaciones de página continúan la misma conversación almacenada a menos que el usuario inicie o restablezca una sesión.
- La interfaz de usuario de control combina envíos duplicados en curso para la misma sesión, mensaje y archivos adjuntos antes de generar un nuevo id de ejecución `chat.send`; el Gateway todavía deduplica las solicitudes repetidas que reutilizan la misma clave de idempotencia.
- Los archivos de inicio del espacio de trabajo y las instrucciones `BOOTSTRAP.md` pendientes se proporcionan a través del Contexto del Proyecto del indicador del sistema del agente, no se copian en el mensaje de usuario de WebChat. La truncación de arranque solo agrega un aviso conciso de recuperación del indicador del sistema; los recuentos detallados y los controles de configuración permanecen en las superficies de diagnóstico.
- `chat.history` también se normaliza para su visualización: contexto de OpenClaw solo en tiempo de ejecución,
  contenedores de sobres entrantes, etiquetas de directivas de entrega en línea
  como `[[reply_to_*]]` y `[[audio_as_voice]]`, cargas útiles XML de llamadas a herramientas en texto plano
  (incluyendo `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`, y bloques de llamadas a herramientas truncados), y
  tokens de control de modelo ASCII/ ancho completo filtrados se eliminan del texto visible,
  y las entradas del asistente cuyo texto visible completo es solo el token silencioso
  exacto `NO_REPLY` / `no_reply` se omiten.
- Las cargas útiles de respuesta marcadas como razonamiento (`isReasoning: true`) se excluyen del contenido del asistente de WebChat, el texto de reproducción de la transcripción y los bloques de contenido de audio, por lo que las cargas útiles solo de pensamiento no aparecen como mensajes visibles del asistente ni audio reproducible.
- `chat.inject` anexa una nota del asistente directamente a la transcripción y la transmite a la interfaz de usuario (sin ejecución de agente).
- Las ejecuciones abortadas pueden mantener visible la salida parcial del asistente en la interfaz de usuario.
- El Gateway persiste el texto parcial del asistente abortado en el historial de transcripciones cuando existe una salida en el búfer y marca esas entradas con metadatos de aborto.
- El historial siempre se obtiene del Gateway (sin vigilancia de archivos locales).
- Si el Gateway es inalcanzable, WebChat es de solo lectura.

### Modelo de transcripción y entrega

WebChat tiene dos rutas de datos separadas:

- El archivo de sesión JSONL es la transcripción durable del modelo/tiempo de ejecución. Para ejecuciones de agente normales, Pi persiste los mensajes `user`, `assistant` y `toolResult` visibles para el modelo a través de su administrador de sesión. WebChat no escribe texto de entrega, estado o auxiliar arbitrario en esa transcripción.
- Los eventos `ReplyPayload` del Gateway son la proyección de entrega en vivo. Pueden normalizarse para la visualización de WebChat/canal, transmisión de bloques, etiquetas de directiva, incrustación de medios, indicadores de TTS/audio y comportamiento de reserva de la interfaz de usuario. Por sí mismos, no son el registro canónico de la sesión.
- Los arneses que requieren respuestas visibles a través de `tools.message` todavía usan WebChat como un receptor de respuestas de origen interno de la ejecución actual. Un `message.send` sin destino de esa ejecución activa de WebChat se proyecta en el mismo chat y se refleja en la transcripción de la sesión; WebChat no se convierte en un canal de salida reutilizable y nunca hereda `lastChannel`.
- WebChat inyecta entradas de transcripción del asistente solo cuando el Gateway posee un mensaje mostrado fuera de un turno normal del asistente Pi: `chat.inject`, respuestas de comandos no agente, salida parcial abortada y suplementos de transcripción de medios administrados por WebChat.
- `chat.history` lee la transcripción de la sesión almacenada y aplica la proyección de visualización de WebChat. Si el texto del asistente en vivo aparece durante una ejecución pero desaparece después de recargar el historial, primero verifique si el JSONL sin procesar contiene el texto del asistente, luego si la proyección de `chat.history` lo eliminó, y luego si la combinación optimista de cola (optimistic-tail) de la interfaz de usuario de Control reemplazó el estado de entrega local con la instantánea persistida.

Las respuestas finales de ejecución de agente normales deben ser duraderas porque Pi escribe el `message_end` del asistente. Cualquier mecanismo de respaldo que refleje una carga final entregada en la transcripción debe evitar primero duplicar un turno del asistente que Pi ya escribió.

## Panel de herramientas de agentes de la interfaz de usuario de Control

- El panel de herramientas `/agents` de la interfaz de usuario de Control tiene dos vistas separadas:
  - **Disponible ahora mismo** usa `tools.effective(sessionKey=...)` y muestra lo que la sesión actual realmente puede usar en tiempo de ejecución, incluyendo herramientas principales, de complemento y propiedad del canal.
  - **Configuración de herramientas** usa `tools.catalog` y se mantiene enfocado en perfiles, anulaciones y semántica del catálogo.
- La disponibilidad en tiempo de ejecución está limitada a la sesión. Cambiar de sesiones en el mismo agente puede cambiar la lista **Disponible ahora mismo**.
- El editor de configuración no implica disponibilidad en tiempo de ejecución; el acceso efectivo aún sigue la precedencia de política (`allow`/`deny`, anulaciones por agente y proveedor/canal).

## Uso remoto

- El modo remoto tuneliza el WebSocket de la puerta de enlace a través de SSH/Tailscale.
- No necesita ejecutar un servidor WebChat separado.

## Referencia de configuración (WebChat)

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones de WebChat:

- `gateway.webchat.chatHistoryMaxChars`: recuento máximo de caracteres para campos de texto en respuestas de `chat.history`. Cuando una entrada de transcripción supera este límite, Gateway trunca los campos de texto largos y puede reemplazar los mensajes excesivamente grandes con un marcador de posición. También se puede enviar un `maxChars` por solicitud desde el cliente para anular este valor predeterminado para una sola llamada de `chat.history`.

Opciones globales relacionadas:

- `gateway.port`, `gateway.bind`: host/puerto de WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`:
  autenticación WebSocket de secreto compartido.
- `gateway.auth.allowTailscale`: la pestaña de chat del Panel de control del navegador puede usar Tailscale
  Servir encabezados de identidad cuando está habilitado.
- `gateway.auth.mode: "trusted-proxy"`: autenticación de proxy inverso para clientes del navegador detrás de una fuente de proxy **no local** (non-loopback) con reconocimiento de identidad (consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`: destino de puerta de enlace remota.
- `session.*`: almacenamiento de sesión y valores predeterminados de clave principal.

## Relacionado

- [Control UI](/es/web/control-ui)
- [Dashboard](/es/web/dashboard)

---
summary: "El soporte de BlueBubbles se eliminó de OpenClaw. Utilice el complemento iMessage incluido con imsg para configuraciones de iMessage nuevas y migradas."
read_when:
  - You used the old BlueBubbles channel and need to move to iMessage
  - You are choosing the supported OpenClaw iMessage setup
  - You need a short explanation of the BlueBubbles removal
title: "Eliminación de BlueBubbles y la ruta iMessage de imsg"
---

# Eliminación de BlueBubbles y la ruta iMessage de imsg

OpenClaw ya no incluye el canal BlueBubbles. El soporte de iMessage ahora se ejecuta a través del complemento `imessage` incluido, que inicia [`imsg`](https://github.com/steipete/imsg) localmente o a través de un contenedor SSH y se comunica mediante JSON-RPC a través de stdin/stdout.

Si su configuración todavía contiene `channels.bluebubbles`, migre a `channels.imessage`. La URL de la documentación heredada de `/channels/bluebubbles` redirige a [Coming from BlueBubbles](/es/channels/imessage-from-bluebubbles), que contiene la tabla completa de traducción de configuración y la lista de verificación de transición.

## Qué cambió

- No hay servidor HTTP de BlueBubbles, ruta de webhook, contraseña REST o tiempo de ejecución del complemento BlueBubbles en la ruta OpenClaw iMessage compatible.
- OpenClaw lee y observa los mensajes a través de `imsg` en la Mac donde Messages.app ha iniciado sesión.
- El envío, recepción, historial y uso básico de medios utilizan las superficies normales `imsg` y los permisos de macOS.
- Las acciones avanzadas, como respuestas en hilo, tapbacks, edición, no enviar, efectos, confirmaciones de lectura, indicadores de escritura y gestión de grupos, requieren `imsg launch` con el puente de API privada disponible.
- Las puertas de enlace de Linux y Windows aún pueden usar iMessage configurando `channels.imessage.cliPath` en un contenedor SSH que ejecuta `imsg` en la Mac con sesión iniciada.

## Qué hacer

1. Instale y verifique `imsg` en la Mac de Messages:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   imsg rpc --help
   ```

2. Conceda permisos de Acceso total al disco y Automatización al contexto del proceso que ejecuta `imsg` y OpenClaw.

3. Traduzca la configuración anterior:

   ```json5
   {
     channels: {
       imessage: {
         enabled: true,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"],
         groupPolicy: "allowlist",
         groupAllowFrom: ["+15555550123"],
         groups: {
           "*": { requireMention: true },
         },
         includeAttachments: true,
       },
     },
   }
   ```

4. Reinicie la puerta de enlace y verifique:

   ```bash
   openclaw channels status --probe
   ```

5. Pruebe los MD, grupos, archivos adjuntos y cualquier acción de API privada de la que dependa antes de eliminar su antiguo servidor BlueBubbles.

## Notas de migración

- `channels.bluebubbles.serverUrl` y `channels.bluebubbles.password` no tienen equivalente en iMessage.
- `channels.bluebubbles.allowFrom`, `groupAllowFrom`, `groups`, `includeAttachments`, las raíces de los archivos adjuntos, los límites de tamaño de medios, la fragmentación y los interruptores de acción tienen equivalentes en iMessage.
- `channels.imessage.includeAttachments` sigue desactivado de forma predeterminada. Establézcalo explícitamente si espera que las fotos entrantes, las notas de voz, los videos o los archivos lleguen al agente.
- Con `groupPolicy: "allowlist"`, copie el bloque antiguo `groups`, incluyendo cualquier entrada de comodín `"*"`. Las listas de permitidos de remitentes de grupo y el registro de grupo son puertas de entrada separadas.
- Los enlaces ACP que coincidían con `channel: "bluebubbles"` deben cambiarse a `channel: "imessage"`.
- Las antiguas claves de sesión de BlueBubbles no se convierten en claves de sesión de iMessage. Las aprobaciones de emparejamiento se transfieren por identificador, pero el historial de conversaciones bajo las claves de sesión de BlueBubbles no.

## Véase también

- [Viniendo de BlueBubbles](/es/channels/imessage-from-bluebubbles)
- [iMessage](/es/channels/imessage)
- [Referencia de configuración - iMessage](/es/gateway/config-channels#imessage)

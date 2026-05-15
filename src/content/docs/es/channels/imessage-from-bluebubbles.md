---
summary: "Migre las configuraciones antiguas de BlueBubbles al complemento iMessage incluido sin perder el emparejamiento, las listas de permitidos o los enlaces de grupos."
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "Viniendo de BlueBubbles"
---

El complemento `imessage` incluido ahora alcanza la misma superficie de API privada que BlueBubbles (`react`, `edit`, `unsend`, `reply`, `sendWithEffect`, gestión de grupos, archivos adjuntos) mediante el uso de [`steipete/imsg`](https://github.com/steipete/imsg) a través de JSON-RPC. Si ya ejecuta una Mac con `imsg` instalado, puede dejar de usar el servidor BlueBubbles y permitir que el complemento hable directamente con Messages.app.

Se eliminó el soporte de BlueBubbles. OpenClaw admite iMessage solo a través de `imsg`. Esta guía es para migrar configuraciones antiguas de `channels.bluebubbles` a `channels.imessage`; no hay otra ruta de migración admitida.

## Cuándo tiene sentido esta migración

- Ya ejecuta `imsg` en la misma Mac (o una accesible a través de SSH) donde Messages.app tiene iniciada sesión.
- Desea tener una parte móvil menos: ningún servidor BlueBubbles separado, ningún punto final REST para autenticar, ni conexión de webhooks. Un solo binario CLI en lugar de un servidor + aplicación cliente + asistente.
- Está en una [compilación de macOS / `imsg` admitida](/es/channels/imessage#requirements-and-permissions-macos) donde el sondeo de la API privada informa `available: true`.

## Lo que hace imsg

`imsg` es una CLI de macOS local para Messages. OpenClaw inicia `imsg rpc` como un proceso secundario y se comunica a través de JSON-RPC en stdin/stdout. No hay servidor HTTP, URL de webhook, demonio en segundo plano, agente de inicio ni puerto que exponer.

- Las lecturas provienen de `~/Library/Messages/chat.db` utilizando un identificador SQLite de solo lectura.
- Los mensajes entrantes en vivo provienen de `imsg watch` / `watch.subscribe`, que sigue los eventos del sistema de archivos `chat.db` con un respaldo de sondeo.
- Los envíos utilizan la automatización de Messages.app para el envío normal de texto y archivos.
- Las acciones avanzadas usan `imsg launch` para inyectar el asistente `imsg` en Messages.app. Eso es lo que desbloquea las confirmaciones de lectura, los indicadores de escritura, los envíos enriquecidos, editar, cancelar envío, respuestas en hilos, reacciones y la gestión de grupos.
- Las compilaciones de Linux pueden inspeccionar un `chat.db` copiado, pero no pueden enviar, observar la base de datos en vivo de Mac ni controlar Messages.app. Para OpenClaw iMessage, ejecute `imsg` en el Mac conectado o a través de un contenedor SSH a ese Mac.

## Antes de empezar

1. Instale `imsg` en el Mac que ejecuta Messages.app:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   Si `imsg chats` falla con `unable to open database file`, salida vacía o `authorization denied`, conceda Acceso total al disco a la terminal, editor, proceso Node, servicio Gateway o proceso padre SSH que inicia `imsg`, luego vuelva a abrir ese proceso padre.

2. Verifique las superficies de lectura, observación, envío y RPC antes de cambiar la configuración de OpenClaw:

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   Reemplace `42` con un ID de chat real de `imsg chats`. El envío requiere permiso de Automatización para Messages.app. Si OpenClaw se ejecutará a través de SSH, ejecute estos comandos a través del mismo contenedor SSH o contexto de usuario que OpenClaw utilizará.

3. Habilite el puente de API privada cuando necesite acciones avanzadas:

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` requiere que SIP esté deshabilitado. El envío básico, el historial y la observación funcionan sin `imsg launch`; las acciones avanzadas no.

4. Verifique el puente a través de OpenClaw:

   ```bash
   openclaw channels status --probe
   ```

   Quiere `imessage.privateApi.available: true`. Si informa `false`, arregle eso primero — consulte [Detección de capacidades](/es/channels/imessage#private-api-actions).

5. Guarde una instantánea de su configuración:

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## Traducción de configuración

iMessage y BlueBubbles comparten mucha configuración a nivel de canal. Las claves que cambian son principalmente de transporte (servidor REST vs CLI local). Las claves de comportamiento (`dmPolicy`, `groupPolicy`, `allowFrom`, etc.) mantienen el mismo significado.

| BlueBubbles                                                | iMessage incluido                         | Notas                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | Misma semántica.                                                                                                                                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.serverUrl`                           | _(eliminado)_                             | No hay servidor REST: el complemento genera `imsg rpc` a través de stdio.                                                                                                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.password`                            | _(eliminado)_                             | No se necesita autenticación de webhook.                                                                                                                                                                                                                                                                                                                                                                      |
| _(implícito)_                                              | `channels.imessage.cliPath`               | Ruta a `imsg` (predeterminado `imsg`); use un script contenedor para SSH.                                                                                                                                                                                                                                                                                                                                     |
| _(implícito)_                                              | `channels.imessage.dbPath`                | Anulación opcional de `chat.db` de Messages.app; se detecta automáticamente si se omite.                                                                                                                                                                                                                                                                                                                      |
| _(implícito)_                                              | `channels.imessage.remoteHost`            | `host` o `user@host` — solo se necesita cuando `cliPath` es un contenedor SSH y desea obtener archivos adjuntos mediante SCP.                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | Mismos valores (`pairing` / `allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | Las aprobaciones de emparejamiento se transfieren por identificador (handle), no por token.                                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | Mismos valores (`allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                                           |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | Igual.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **Copie esto textualmente, incluyendo cualquier entrada de comodín `groups: { "*": { ... } }`.** Los valores `requireMention`, `tools`, `toolsBySender` por grupo se transfieren. Con `groupPolicy: "allowlist"`, un bloque `groups` vacío o ausente elimina silenciosamente todos los mensajes de grupo — consulte "Peligro del registro de grupos" a continuación.                                          |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | Predeterminado `true`. Con el complemento incluido, esto solo se activa cuando el sondeo de la API privada está activo.                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | Misma forma, **mismo desactivado por defecto**. Si tenías adjuntos fluyendo en BlueBubbles, debes restablecer esto explícitamente en el bloque iMessage; no se transfiere implícitamente, y las fotos/medios entrantes se descartarán silenciosamente sin ninguna línea de registro `Inbound message` hasta que lo hagas.                                                                                     |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | Raíces locales; mismas reglas de comodín.                                                                                                                                                                                                                                                                                                                                                                     |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | Solo se usa cuando `remoteHost` está configurado para recuperaciones SCP.                                                                                                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | Por defecto 16 MB en iMessage (el predeterminado de BlueBubbles era 8 MB). Establézcalo explícitamente si desea mantener el límite más bajo.                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | Por defecto 4000 en ambos.                                                                                                                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | Misma participación opcional. Solo para MD — los chats grupales mantienen el envío instantáneo por mensaje en ambos canales. Amplía el rebote entrante predeterminado a 2500 ms cuando se habilita sin un `messages.inbound.byChannel.imessage` explícito. Consulte [Documentación de iMessage § Coalescing split-send DMs](/es/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition). |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | iMessage ya lee los nombres para mostrar del remitente desde `chat.db`.                                                                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | Interruptores por acción: `reactions`, `edit`, `unsend`, `reply`, `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, `sendAttachment`.                                                                                                                                                                                                                     |

Las configuraciones multicuenta (`channels.bluebubbles.accounts.*`) se traducen uno a uno a `channels.imessage.accounts.*`.

## Peligro del registro de grupos

El complemento iMessage integrado ejecuta **dos** puertas de lista de permitidos de grupos separadas una tras otra. Ambas deben pasar para que un mensaje de grupo llegue al agente:

1. **Lista blanca de remitentes / destinos de chat** (`channels.imessage.groupAllowFrom`) — comprobada por `isAllowedIMessageSender`. Coincide con los mensajes entrantes por el identificador del remitente, `chat_guid`, `chat_identifier` o `chat_id`. La misma forma que BlueBubbles.
2. **Registro de grupos** (`channels.imessage.groups`) — comprobado por `resolveChannelGroupPolicy` de `inbound-processing.ts:199`. Con `groupPolicy: "allowlist"`, este filtro requiere:
   - una entrada de comodín `groups: { "*": { ... } }` (establece `allowAll = true`), o
   - una entrada explícita por `chat_id` bajo `groups`.

Si el filtro 1 pasa pero el filtro 2 falla, el mensaje se descarta. El complemento emite dos señales de nivel `warn` para que esto ya no sea silencioso en el nivel de registro predeterminado:

- Un `warn` de inicio único por cuenta cuando `groupPolicy: "allowlist"` está configurado pero `channels.imessage.groups` está vacío (sin comodín `"*"`, sin entradas por `chat_id`) — se activa antes de que lleguen mensajes.
- Un `warn` único por `chat_id` la primera vez que se descarta un grupo específico en tiempo de ejecución, nombrando el chat_id y la clave exacta para agregar a `groups` para permitirlo.

Los MDs continúan funcionando porque toman una ruta de código diferente.

Este es el modo de fallo más común en la migración de BlueBubbles → iMessage integrado: los operadores copian `groupAllowFrom` y `groupPolicy` pero omiten el bloque `groups`, porque el `groups: { "*": { "requireMention": true } }` de BlueBubbles parece una configuración de mención no relacionada. En realidad, es fundamental para el filtro del registro.

La configuración mínima para mantener el flujo de mensajes de grupo después de `groupPolicy: "allowlist"`:

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

`requireMention: true` bajo `*` es inofensivo cuando no se configuran patrones de mención: el tiempo de ejecución establece `canDetectMention = false` y cortocircuita la caída de mención en `inbound-processing.ts:512`. Con patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`), funciona como se espera.

Si la puerta de enlace registra `imessage: dropping group message from chat_id=<id>` o la línea de inicio `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`, el gate 2 se está eliminando — agregue el bloque `groups`.

## Paso a paso

1. Agregue un bloque iMessage junto al bloque BlueBubbles existente. Mantenga el bloque antiguo solo como una fuente de copia hasta que se verifique la nueva ruta:

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false, // turn on after the dry run below
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // copy from bluebubbles.allowFrom
         groupPolicy: "allowlist",
         groupAllowFrom: [], // copy from bluebubbles.groupAllowFrom
         groups: { "*": { requireMention: true } }, // copy from bluebubbles.groups — silently drops groups if missing, see "Group registry footgun" above
         actions: {
           reactions: true,
           edit: true,
           unsend: true,
           reply: true,
           sendWithEffect: true,
           sendAttachment: true,
         },
       },
     },
   }
   ```

2. **Prueba de simulación (dry-run)** — inicie la puerta de enlace y confirme que iMessage reporta buen estado:

   ```bash
   openclaw gateway
   openclaw channels status
   openclaw channels status --probe   # expect imessage.privateApi.available: true
   ```

   Debido a que `imessage.enabled` todavía es `false`, aún no se enruta ningún tráfico entrante de iMessage — pero `--probe` ejerce el puente para que detecte problemas de permisos/instalación antes del cambio.

3. **Realizar el cambio.** Elimine la configuración de BlueBubbles y habilite iMessage en una sola edición de configuración:

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   Reinicie la puerta de enlace. El tráfico entrante de iMessage ahora fluye a través del complemento incluido.

4. **Verifique los MD.** Envíe un mensaje directo al agente; confirme que la respuesta llegue.

5. **Verifique los grupos por separado.** Los MD y los grupos toman diferentes rutas de código — el éxito de los MD no prueba que los grupos se estén enrutando. Envíe al agente un mensaje en un chat de grupo vinculado y confirme que la respuesta llegue. Si el grupo se queda en silencio (sin respuesta del agente, sin error), verifique el registro de la puerta de enlace buscando `imessage: dropping group message from chat_id=<id>` o la línea de inicio `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` — ambos se activan en el nivel de registro predeterminado. Si aparece alguno, su bloque `groups` falta o está vacío — consulte "Peligro del registro de grupos" arriba.

6. **Verifique la superficie de acción** — desde un MD vinculado, pída al agente que reaccione, edite, elimine el envío, responda, envíe una foto y (en un grupo) cambie el nombre del grupo / agregue o elimine un participante. Cada acción debería aparecer de forma nativa en Messages.app. Si alguno lanza "iMessage `<action>` requiere el puente de API privada de imsg", ejecute `imsg launch` nuevamente y actualice `channels status --probe`.

7. **Elimine el servidor y la configuración de BlueBubbles** una vez que se hayan verificado los MD, grupos y acciones de iMessage. OpenClaw no usará `channels.bluebubbles`.

## Paridad de acciones de un vistazo

| Acción                                                                                | BlueBubbles heredado                                | iMessage incluido                                                                                                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Enviar texto / alternativa por SMS                                                    | ✅                                                  | ✅                                                                                                                          |
| Enviar medios (foto, video, archivo, voz)                                             | ✅                                                  | ✅                                                                                                                          |
| Respuesta en hilo (`reply_to_guid`)                                                   | ✅                                                  | ✅ (cierra [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                     |
| Tapback (`react`)                                                                     | ✅                                                  | ✅                                                                                                                          |
| Editar / no enviar (destinatarios con macOS 13+)                                      | ✅                                                  | ✅                                                                                                                          |
| Enviar con efecto de pantalla                                                         | ✅                                                  | ✅ (cierra parte de [#9394](https://github.com/openclaw/openclaw/issues/9394))                                              |
| Texto enriquecido negrita / cursiva / subrayado / tachado                             | ✅                                                  | ✅ (formato typed-run vía attributedBody)                                                                                   |
| Cambiar nombre del grupo / establecer icono del grupo                                 | ✅                                                  | ✅                                                                                                                          |
| Añadir / eliminar participante, abandonar grupo                                       | ✅                                                  | ✅                                                                                                                          |
| Confirmaciones de lectura e indicador de escritura                                    | ✅                                                  | ✅ (condicionado a sonda de API privada)                                                                                    |
| Agrupación de MD del mismo remitente                                                  | ✅                                                  | ✅ (solo MD; activación vía `channels.imessage.coalesceSameSenderDms`)                                                      |
| Puesta al día de mensajes entrantes recibidos mientras la puerta de enlace está caída | ✅ (repetición de webhook + obtención de historial) | ✅ (activación vía `channels.imessage.catchup.enabled`; cierra [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

La puesta al día de iMessage ya está disponible como función opcional en el plugin incluido. Al iniciar la puerta de enlace, si `channels.imessage.catchup.enabled` es `true`, la puerta de enlace ejecuta una pasada `chats.list` + `messages.history` por chat contra el mismo cliente JSON-RPC usado por `imsg watch`, reproduce cada fila entrante perdida a través de la ruta de envío en vivo (listas de permitidos, política de grupos, anti-rebotes, caché de eco), y persiste un cursor por cuenta para que los inicios posteriores retomen donde se quedaron. Consulte [Catching up after gateway downtime](/es/channels/imessage#catching-up-after-gateway-downtime) para ajustes.

## Emparejamiento, sesiones y enlaces ACP

- **Las aprobaciones de emparejamiento** se transfieren por identificador. No necesita volver a aprobar remitentes conocidos — `channels.imessage.allowFrom` reconoce las mismas cadenas `+15555550123` / `user@example.com` que usaba BlueBubbles.
- **Las sesiones** permanecen limitadas por agente + chat. Los MD se colapsan en la sesión principal del agente bajo el `session.dmScope=main` predeterminado; las sesiones de grupo permanecen aisladas por `chat_id`. Las claves de sesión difieren (`agent:<id>:imessage:group:<chat_id>` frente al equivalente de BlueBubbles) — el historial de conversación antiguo bajo las claves de sesión de BlueBubbles no se traslada a las sesiones de iMessage.
- **Los enlaces ACP** que hagan referencia a `match.channel: "bluebubbles"` deben actualizarse a `"imessage"`. Las formas de `match.peer.id` (`chat_id:`, `chat_guid:`, `chat_identifier:`, identificador simple) son idénticas.

## Sin canal de reversión

No hay un tiempo de ejecución de BlueBubbles compatible al que volver. Si la verificación de iMessage falla, establezca `channels.imessage.enabled: false`, reinicie el Gateway, corrija el bloqueador de `imsg` y reintente la transición.

La caché de respuestas se encuentra en `~/.openclaw/state/imessage/reply-cache.jsonl` (modo `0600`, directorio padre `0700`). Es seguro eliminarla si desea empezar de cero.

## Relacionado

- [iMessage](/es/channels/imessage) — referencia completa del canal iMessage, incluida la configuración de `imsg launch` y la detección de capacidades.
- `/channels/bluebubbles` — URL heredada que redirige a esta guía de migración.
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de DM.
- [Enrutamiento de canales](/es/channels/channel-routing) — cómo el gateway elige un canal para las respuestas salientes.

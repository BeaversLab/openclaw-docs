---
summary: "Migre las configuraciones antiguas de BlueBubbles al complemento iMessage incluido sin perder el emparejamiento, las listas de permitidos o los enlaces de grupos."
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "Viniendo de BlueBubbles"
---

El complemento `imessage` incluido ahora alcanza la misma superficie de API privada que BlueBubbles (`react`, `edit`, `unsend`, `reply`, `sendWithEffect`, gestión de grupos, archivos adjuntos) mediante el control de [`steipete/imsg`](https://github.com/steipete/imsg) a través de JSON-RPC. Si ya ejecuta una Mac con `imsg` instalado, puede dejar de usar el servidor de BlueBubbles y permitir que el complemento se comunique directamente con Messages.app.

Se eliminó el soporte de BlueBubbles. OpenClaw admite iMessage solo a través de `imsg`. Esta guía es para migrar configuraciones antiguas de `channels.bluebubbles` a `channels.imessage`; no hay otra ruta de migración admitida.

<Note>Para el anuncio breve y el resumen del operador, consulte [Eliminación de BlueBubbles y la ruta imsg iMessage](/es/announcements/bluebubbles-imessage).</Note>

## Lista de verificación de migración

Use esta lista de verificación cuando ya conozca su configuración anterior de BlueBubbles y desee la ruta más segura y corta:

1. Verifique `imsg` directamente en la Mac que ejecuta Messages.app (`imsg chats`, `imsg history`, `imsg send` y `imsg rpc --help`).
2. Copie las claves de comportamiento de `channels.bluebubbles` a `channels.imessage`: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `includeAttachments`, `attachmentRoots`, `mediaMaxMb`, `textChunkLimit`, `coalesceSameSenderDms` y `actions`.
3. Elimine las claves de transporte que ya no existen: `serverUrl`, `password`, URL de webhook y la configuración del servidor BlueBubbles.
4. Si la puerta de enlace (Gateway) no se está ejecutando en la Mac de Messages, configure `channels.imessage.cliPath` en un contenedor SSH y configure `remoteHost` para la recuperación remota de archivos adjuntos.
5. Con la puerta de enlace detenida, habilite `channels.imessage` y luego ejecute `openclaw channels status --probe --channel imessage`.
6. Pruebe un mensaje directo (DM), un grupo permitido, archivos adjuntos si están habilitados y cada acción de API privada que espere que use el agente.
7. Elimine el servidor de BlueBubbles y la configuración antigua de `channels.bluebubbles` después de verificar la ruta de iMessage.

## Cuándo tiene sentido esta migración

- Ya estás ejecutando `imsg` en el mismo Mac (o uno accesible por SSH) donde Messages.app tiene la sesión iniciada.
- Quieres tener una pieza móvil menos — ningún servidor BlueBubbles separado, ningún endpoint REST que autenticar, ninguna tubería de webhooks. Un único binario CLI en lugar de un servidor + aplicación cliente + asistente.
- Estás en una [compilación compatible de macOS / `imsg`](/es/channels/imessage#requirements-and-permissions-macos) donde la sonda de la API privada reporta `available: true`.

## Lo que hace imsg

`imsg` es una CLI local de macOS para Messages. OpenClaw inicia `imsg rpc` como un proceso hijo y se comunica a través de JSON-RPC usando stdin/stdout. No hay servidor HTTP, URL de webhook, demonio en segundo plano, agente de lanzamiento (launch agent) o puerto que exponer.

- Las lecturas provienen de `~/Library/Messages/chat.db` usando un manejador SQLite de solo lectura.
- Los mensajes entrantes en vivo provienen de `imsg watch` / `watch.subscribe`, que sigue los eventos del sistema de archivos `chat.db` con un respaldo de sondeo (polling).
- Los envíos utilizan la automatización de Messages.app para envíos de texto normal y archivos.
- Las acciones avanzadas usan `imsg launch` para inyectar el asistente `imsg` en Messages.app. Eso es lo que desbloquea las confirmaciones de lectura, indicadores de escritura, envíos enriquecidos, editar, no enviar, respuestas en hilos, reacciones y gestión de grupos.
- Las compilaciones de Linux pueden inspeccionar una `chat.db` copiada, pero no pueden enviar, vigilar la base de datos del Mac en vivo o controlar Messages.app. Para OpenClaw iMessage, ejecuta `imsg` en el Mac con la sesión iniciada o a través de un envoltorio (wrapper) SSH a ese Mac.

## Antes de empezar

1. Instala `imsg` en el Mac que ejecuta Messages.app:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   Si `imsg chats` falla con `unable to open database file`, salida vacía o `authorization denied`, concede Acceso total al disco (Full Disk Access) a la terminal, editor, proceso Node, servicio Gateway o proceso padre SSH que inicia `imsg`, y luego vuelve a abrir ese proceso padre.

2. Verifica las superficies de lectura, vigilancia, envío y RPC antes de cambiar la configuración de OpenClaw:

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   Reemplace `42` con un ID de chat real de `imsg chats`. El envío requiere permiso de Automatización para Messages.app. Si OpenClaw se ejecutará a través de SSH, ejecute estos comandos a través del mismo contenedor SSH o contexto de usuario que usará OpenClaw.

3. Habilite el puente de API privada cuando necesite acciones avanzadas:

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` requiere que SIP esté deshabilitado. El envío básico, el historial y la vigilancia funcionan sin `imsg launch`; las acciones avanzadas no.

4. Después de agregar una configuración `channels.imessage` habilitada, verifique el puente a través de OpenClaw:

   ```bash
   openclaw channels status --probe
   ```

   Usted quiere `imessage.privateApi.available: true`. Si informa `false`, arregle eso primero — consulte [Detección de capacidades](/es/channels/imessage#private-api-actions). `channels status --probe` solo sondea cuentas configuradas y habilitadas.

5. Haga una instantánea de su configuración:

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## Traducción de configuración

iMessage y BlueBubbles comparten mucha configuración a nivel de canal. Las claves que cambian son principalmente de transporte (servidor REST vs CLI local). Las claves de comportamiento (`dmPolicy`, `groupPolicy`, `allowFrom`, etc.) mantienen el mismo significado.

| BlueBubbles                                                | iMessage incluido                         | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | Misma semántica.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.serverUrl`                           | _(eliminado)_                             | Sin servidor REST: el complemento genera `imsg rpc` a través de stdio.                                                                                                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.password`                            | _(eliminado)_                             | No se requiere autenticación de webhook.                                                                                                                                                                                                                                                                                                                                                                                                  |
| _(implícito)_                                              | `channels.imessage.cliPath`               | Ruta a `imsg` (predeterminado `imsg`); use un script de contenedor para SSH.                                                                                                                                                                                                                                                                                                                                                              |
| _(implícito)_                                              | `channels.imessage.dbPath`                | Anulación opcional de `chat.db` de Messages.app; detectado automáticamente cuando se omite.                                                                                                                                                                                                                                                                                                                                               |
| _(implícito)_                                              | `channels.imessage.remoteHost`            | `host` o `user@host` — solo se necesita cuando `cliPath` es un contenedor SSH y desea recuperaciones de adjuntos SCP.                                                                                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | Mismos valores (`pairing` / `allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                                                           |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | Los aprobaciones de emparejamiento se transfieren por identificador, no por token.                                                                                                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | Mismos valores (`allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                                                                       |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | Igual.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **Copia esto textualmente, incluyendo cualquier entrada con comodín `groups: { "*": { ... } }`.** Los `requireMention`, `tools`, `toolsBySender` por grupo se transfieren. Con `groupPolicy: "allowlist"`, un bloque `groups` vacío o ausente descarta silenciosamente cada mensaje de grupo; consulta "Trampa del registro de grupos" a continuación.                                                                                    |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | Predeterminado `true`. Con el complemento incluido, esto solo se activa cuando el sondeo de API privada está activo.                                                                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | Misma forma, **mismo desactivado por defecto**. Si tenías adjuntos fluyendo en BlueBubbles, debes reestablecer esto explícitamente en el bloque iMessage; no se transfiere implícitamente, y las fotos/multimedia entrantes se descartarán silenciosamente sin ninguna línea de registro `Inbound message` hasta que lo hagas.                                                                                                            |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | Raíces locales; mismas reglas de comodín.                                                                                                                                                                                                                                                                                                                                                                                                 |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | Solo se usa cuando `remoteHost` está configurado para recuperaciones SCP.                                                                                                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | Predeterminado 16 MB en iMessage (el predeterminado de BlueBubbles era 8 MB). Establécelo explícitamente si deseas mantener el límite más bajo.                                                                                                                                                                                                                                                                                           |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | Predeterminado 4000 en ambos.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | Misma participación opcional. Solo mensajes directos — los chats grupales mantienen el envío instantáneo por mensaje en ambos canales. Amplía el anti-rebote predeterminado de entrada a 2500 ms cuando se habilita sin un `messages.inbound.byChannel.imessage` explícito. Consulte [Documentación de iMessage § Agrupación de envíos divididos de MD](/es/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition). |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | iMessage ya lee los nombres para mostrar del remitente desde `chat.db`.                                                                                                                                                                                                                                                                                                                                                                   |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | Interruptores por acción: `reactions`, `edit`, `unsend`, `reply`, `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, `sendAttachment`.                                                                                                                                                                                                                                                 |

Las configuraciones multicuenta (`channels.bluebubbles.accounts.*`) se traducen uno a uno a `channels.imessage.accounts.*`.

## Peligro del registro de grupos

El complemento iMessage integrado ejecuta **dos** puertas de lista de permitidos de grupos separadas una tras otra. Ambas deben pasar para que un mensaje de grupo llegue al agente:

1. **Lista de permitidos de remitente / destino de chat** (`channels.imessage.groupAllowFrom`) — verificada por `isAllowedIMessageSender`. Coincide con los mensajes entrantes por el identificador del remitente, `chat_guid`, `chat_identifier`, o `chat_id`. La misma forma que BlueBubbles.
2. **Registro de grupos** (`channels.imessage.groups`) — verificado por `resolveChannelGroupPolicy` desde `inbound-processing.ts:199`. Con `groupPolicy: "allowlist"`, esta puerta requiere:
   - una entrada de comodín `groups: { "*": { ... } }` (establece `allowAll = true`), o
   - una entrada explícita por `chat_id` bajo `groups`.

Si la puerta 1 pasa pero la puerta 2 falla, el mensaje se descarta. El complemento emite dos señales de nivel `warn` para que esto ya no sea silencioso en el nivel de registro predeterminado:

- Un `warn` de inicio único por cuenta cuando `groupPolicy: "allowlist"` está configurado pero `channels.imessage.groups` está vacío (sin comodín `"*"`, sin entradas por `chat_id`) — se activa antes de que lleguen mensajes.
- Un `warn` por `chat_id` la primera vez que se descarta un grupo específico en tiempo de ejecución, nombrando el chat_id y la clave exacta para añadir a `groups` para permitirlo.

Los MDs siguen funcionando porque toman una ruta de código diferente.

Este es el modo de fallo más común en la migración de BlueBubbles → iMessage integrado: los operadores copian `groupAllowFrom` y `groupPolicy` pero omiten el bloque `groups`, porque el `groups: { "*": { "requireMention": true } }` de BlueBubbles parece una configuración de mención no relacionada. En realidad, es fundamental para el registro de acceso.

La configuración mínima para mantener fluyendo los mensajes de grupo después de `groupPolicy: "allowlist"`:

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

`requireMention: true` bajo `*` es inofensivo cuando no hay patrones de mención configurados: el tiempo de ejecución establece `canDetectMention = false` y cortocircuita el descarte de mención en `inbound-processing.ts:512`. Con patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`), funciona como se espera.

Si el gateway registra `imessage: dropping group message from chat_id=<id>` o la línea de inicio `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`, el gate 2 está descartando — añada el bloque `groups`.

## Paso a paso

1. Añada un bloque iMessage junto al bloque BlueBubbles existente. Manténgalo deshabilitado mientras el Gateway siga enrutando el tráfico de BlueBubbles:

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false,
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

2. **Probar antes de que importe el tráfico** — detenga el Gateway, habilite temporalmente el bloque iMessage y confirme que iMessage reporta estado saludable desde la CLI:

   ```bash
   openclaw gateway stop
   # edit config: channels.imessage.enabled = true
   openclaw channels status --probe --channel imessage   # expect imessage.privateApi.available: true
   ```

   `channels status --probe` solo sondea cuentas configuradas y habilitadas. No reinicies el Gateway con BlueBubbles e iMessage habilitados a menos que quieras intencionalmente que ambos monitores de canales estén funcionando. Si no vas a realizar la transición inmediatamente, vuelve a establecer `channels.imessage.enabled` en `false` antes de reiniciar el Gateway. Usa los comandos directos de `imsg` en [Antes de empezar](#before-you-start) para validar el Mac antes de habilitar el tráfico de OpenClaw.

3. **Realiza la transición.** Una vez que la cuenta de iMessage habilitada informe que está sana, elimina la configuración de BlueBubbles y mantén iMessage habilitado:

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   Reinicia el gateway. El tráfico entrante de iMessage ahora fluye a través del complemento incluido.

4. **Verifica los MD.** Envía un mensaje directo al agente; confirma que la respuesta llegue.

5. **Verifica los grupos por separado.** Los MD y los grupos toman diferentes rutas de código; el éxito de los MD no prueba que los grupos se estén enrutando. Envía al agente un mensaje en un chat de grupo vinculado y confirma que la respuesta llegue. Si el grupo se queda en silencio (sin respuesta del agente, sin error), verifica el registro del gateway en busca de `imessage: dropping group message from chat_id=<id>` o de la línea de inicio `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`; ambos se disparan en el nivel de registro predeterminado. Si aparece cualquiera de los dos, tu bloque `groups` falta o está vacío; consulta "Trampa del registro de grupos" más arriba.

6. **Verifica la superficie de acción** — desde un MD vinculado, pide al agente que reaccione, edite, anule el envío, responda, envíe una foto y (en un grupo) cambie el nombre del grupo / agregue o elimine un participante. Cada acción debería aparecer de forma nativa en Messages.app. Si alguna arroja "iMessage `<action>` requiere el puente de la API privada de imsg", ejecuta `imsg launch` de nuevo y actualiza `channels status --probe`.

7. **Elimina el servidor y la configuración de BlueBubbles** una vez que se hayan verificado los MD, grupos y acciones de iMessage. OpenClaw no usará `channels.bluebubbles`.

## Paridad de acciones de un vistazo

| Acción                                                                                | BlueBubbles heredado                                | iMessage incluido                                                                                                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Enviar texto / respaldo SMS                                                           | ✅                                                  | ✅                                                                                                                                   |
| Enviar multimedia (foto, video, archivo, voz)                                         | ✅                                                  | ✅                                                                                                                                   |
| Respuesta en hilo (`reply_to_guid`)                                                   | ✅                                                  | ✅ (cierra [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                              |
| Tapback (`react`)                                                                     | ✅                                                  | ✅                                                                                                                                   |
| Editar / anular envío (destinatarios macOS 13+)                                       | ✅                                                  | ✅                                                                                                                                   |
| Enviar con efecto de pantalla                                                         | ✅                                                  | ✅ (cierra parte de [#9394](https://github.com/openclaw/openclaw/issues/9394))                                                       |
| Texto enriquecido negrita / cursiva / subrayado / tachado                             | ✅                                                  | ✅ (formato typed-run vía attributedBody)                                                                                            |
| Cambiar nombre de grupo / establecer icono de grupo                                   | ✅                                                  | ✅                                                                                                                                   |
| Añadir / eliminar participante, salir del grupo                                       | ✅                                                  | ✅                                                                                                                                   |
| Confirmaciones de lectura e indicador de escritura                                    | ✅                                                  | ✅ (condicionado a la sonda de API privada)                                                                                          |
| Agrupación de MD del mismo remitente                                                  | ✅                                                  | ✅ (solo MD; activación opcional vía `channels.imessage.coalesceSameSenderDms`)                                                      |
| Puesta al día de mensajes entrantes recibidos mientras la puerta de enlace está caída | ✅ (repetición de webhook + obtención de historial) | ✅ (activación opcional vía `channels.imessage.catchup.enabled`; cierra [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

La puesta al día de iMessage ya está disponible como función opcional en el complemento incluido. Al iniciarse la puerta de enlace, si `channels.imessage.catchup.enabled` es `true`, la puerta de enlace ejecuta un pase de `chats.list` + `messages.history` por chat contra el mismo cliente JSON-RPC utilizado por `imsg watch`, repite cada fila entrante perdida a través de la ruta de envío en vivo (listas de permitidos, política de grupos, antirrebote, caché de eco) y persiste un cursor por cuenta para que los inicios posteriores continúen donde se quedaron. Consulte [Puesta al día después del tiempo de inactividad de la puerta de enlace](/es/channels/imessage#catching-up-after-gateway-downtime) para el ajuste.

## Emparejamiento, sesiones y enlaces ACP

- **Las aprobaciones de emparejamiento** se transfieren por identificador. No es necesario volver a aprobar los remitentes conocidos — `channels.imessage.allowFrom` reconoce las mismas cadenas `+15555550123` / `user@example.com` que usaba BlueBubbles.
- **Las sesiones** permanecen limitadas por agente + chat. Los MDs se colapsan en la sesión principal del agente bajo `session.dmScope=main` predeterminado; las sesiones de grupo permanecen aisladas por `chat_id`. Las claves de sesión difieren (`agent:<id>:imessage:group:<chat_id>` vs el equivalente de BlueBubbles) — el historial de conversación anterior bajo las claves de sesión de BlueBubbles no se traslada a las sesiones de iMessage.
- **Los enlaces ACP** que hacen referencia a `match.channel: "bluebubbles"` deben actualizarse a `"imessage"`. Las formas `match.peer.id` (`chat_id:`, `chat_guid:`, `chat_identifier:`, identificador simple) son idénticas.

## Sin canal de reversión

No hay un tiempo de ejecución de BlueBubbles compatible al cual volver. Si la verificación de iMessage falla, establezca `channels.imessage.enabled: false`, reinicie el Gateway, solucione el bloqueador de `imsg` y reintente la transición.

La caché de respuestas se encuentra en `~/.openclaw/state/imessage/reply-cache.jsonl` (modo `0600`, directorio padre `0700`). Es seguro eliminarla si desea empezar de cero.

## Relacionado

- [Eliminación de BlueBubbles y la ruta iMessage de imsg](/es/announcements/bluebubbles-imessage) — breve anuncio y resumen para el operador.
- [iMessage](/es/channels/imessage) — referencia completa del canal iMessage, incluyendo la configuración de `imsg launch` y la detección de capacidades.
- `/channels/bluebubbles` — URL heredada que redirige a esta guía de migración.
- [Emparejamiento](/es/channels/pairing) — autenticación por DM y flujo de emparejamiento.
- [Enrutamiento de canales](/es/channels/channel-routing) — cómo el gateway elige un canal para las respuestas salientes.

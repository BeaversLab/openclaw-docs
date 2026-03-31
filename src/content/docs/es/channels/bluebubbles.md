---
summary: "iMessage a través del servidor macOS de BlueBubbles (REST enviar/recibir, escribir, reacciones, emparejamiento, acciones avanzadas)."
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

Estado: complemento incluido que se comunica con el servidor macOS de BlueBubbles a través de HTTP. **Recomendado para la integración de iMessage** debido a su API más rica y una configuración más fácil en comparación con el canal imsg heredado.

## Resumen

- Se ejecuta en macOS a través de la aplicación auxiliar de BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/probado: macOS Sequoia (15). macOS Tahoe (26) funciona; la edición actualmente falla en Tahoe, y las actualizaciones de iconos de grupo pueden reportar éxito pero no sincronizarse.
- OpenClaw se comunica con ella a través de su API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Los mensajes entrantes llegan a través de webhooks; las respuestas salientes, los indicadores de escritura, las confirmaciones de lectura y los tapbacks son llamadas REST.
- Los adjuntos y las pegatinas se ingieren como multimedia entrante (y se muestran al agente cuando es posible).
- El emparejamiento/lista blanca funciona de la misma manera que en otros canales (`/channels/pairing` etc.) con `channels.bluebubbles.allowFrom` + códigos de emparejamiento.
- Las reacciones se muestran como eventos del sistema, igual que en Slack/Telegram, para que los agentes puedan "mencionarlas" antes de responder.
- Características avanzadas: editar, no enviar, hilos de respuesta, efectos de mensaje, gestión de grupos.

## Inicio rápido

1. Instale el servidor BlueBubbles en su Mac (siga las instrucciones en [bluebubbles.app/install](https://bluebubbles.app/install)).
2. En la configuración de BlueBubbles, habilite la API web y establezca una contraseña.
3. Ejecute `openclaw onboard` y seleccione BlueBubbles, o configure manualmente:

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook",
       },
     },
   }
   ```

4. Apunte los webhooks de BlueBubbles a su puerta de enlace (ejemplo: `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`).
5. Inicie la puerta de enlace; esta registrará el controlador de webhooks y comenzará el emparejamiento.

Nota de seguridad:

- Establezca siempre una contraseña de webhook.
- La autenticación de webhook siempre es requerida. OpenClaw rechaza las solicitudes de webhook de BlueBubbles a menos que incluyan una contraseña/guid que coincida con `channels.bluebubbles.password` (por ejemplo `?password=<password>` o `x-password`), independientemente de la topología de bucle invertido/proxy.
- La autenticación por contraseña se verifica antes de leer/analizar los cuerpos completos del webhook.

## Mantener Messages.app activo (configuraciones de VM / sin cabeza)

Algunas configuraciones de macOS VM / siempre activas pueden terminar con Messages.app pasando a "inactivo" (los eventos entrantes se detienen hasta que la aplicación se abre/pone en primer plano). Una solución simple es **tocar Messages cada 5 minutos** usando un AppleScript + LaunchAgent.

### 1) Guardar el AppleScript

Guarde esto como:

- `~/Scripts/poke-messages.scpt`

Ejemplo de script (no interactivo; no roba el foco):

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- Touch the scripting interface to keep the process responsive.
    set _chatCount to (count of chats)
  end tell
on error
  -- Ignore transient failures (first-run prompts, locked session, etc).
end try
```

### 2) Instalar un LaunchAgent

Guarde esto como:

- `~/Library/LaunchAgents/com.user.poke-messages.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.poke-messages</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>-lc</string>
      <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/tmp/poke-messages.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poke-messages.err</string>
  </dict>
</plist>
```

Notas:

- Esto se ejecuta **cada 300 segundos** y **al iniciar sesión**.
- La primera ejecución puede activar las solicitudes de **Automatización** de macOS (`osascript` → Mensajes). Apruébelas en la misma sesión de usuario que ejecuta el LaunchAgent.

Cárguelo:

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## Incorporación

BlueBubbles está disponible en la incorporación interactiva:

```
openclaw onboard
```

El asistente solicita:

- **URL del servidor** (obligatorio): dirección del servidor BlueBubbles (p. ej., `http://192.168.1.100:1234`)
- **Contraseña** (requerido): contraseña de la API de la configuración del servidor BlueBubbles
- **Ruta del webhook** (opcional): Por defecto es `/bluebubbles-webhook`
- **Política de MD**: emparejamiento, lista blanca, abierto o deshabilitado
- **Lista blanca**: números de teléfono, correos electrónicos o destinos de chat

También puede agregar BlueBubbles a través de la CLI:

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Control de acceso (MD + grupos)

MDs:

- Predeterminado: `channels.bluebubbles.dmPolicy = "pairing"`.
- Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar a través de:
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/en/channels/pairing)

Grupos:

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controla quién puede activar en grupos cuando `allowlist` está configurado.

### Enriquecimiento del nombre de contacto (macOS, opcional)

Los webhooks de grupo de BlueBubbles a menudo solo incluyen direcciones de participantes sin procesar. Si desea que el contexto `GroupMembers` muestre nombres de contactos locales, puede optar por el enriquecimiento local de Contactos en macOS:

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` habilita la búsqueda. Predeterminado: `false`.
- Las búsquedas se ejecutan solo después de que el acceso al grupo, la autorización de comandos y el filtrado de menciones hayan permitido el paso del mensaje.
- Solo se enriquecen los participantes telefónicos sin nombre.
- Los números de teléfono sin procesar se mantienen como respaldo cuando no se encuentra ninguna coincidencia local.

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### Filtrado de menciones (grupos)

BlueBubbles admite el filtrado de menciones para chats grupales, coincidiendo con el comportamiento de iMessage/WhatsApp:

- Usa `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`) para detectar menciones.
- Cuando `requireMention` está habilitado para un grupo, el agente solo responde cuando se le menciona.
- Los comandos de control de remitentes autorizados omiten el filtrado de menciones.

Configuración por grupo:

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // default for all groups
        "iMessage;-;chat123": { requireMention: false }, // override for specific group
      },
    },
  },
}
```

### Filtrado de comandos

- Los comandos de control (por ejemplo, `/config`, `/model`) requieren autorización.
- Usa `allowFrom` y `groupAllowFrom` para determinar la autorización del comando.
- Los remitentes autorizados pueden ejecutar comandos de control incluso sin mencionar en grupos.

## Vinculaciones de conversaciones ACP

Los chats de BlueBubbles pueden convertirse en espacios de trabajo ACP duraderos sin cambiar la capa de transporte.

Flujo rápido del operador:

- Ejecuta `/acp spawn codex --bind here` dentro del MD o chat grupal permitido.
- Los mensajes futuros en esa misma conversación de BlueBubbles se enrutan a la sesión ACP iniciada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina la vinculación.

También se admiten vinculaciones persistentes configuradas a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "bluebubbles"`.

`match.peer.id` puede usar cualquier formato de objetivo de BlueBubbles compatible:

- identificador de MD normalizado, como `+15555550123` o `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Para vinculaciones de grupo estables, prefiere `chat_id:*` o `chat_identifier:*`.

Ejemplo:

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

Consulte [ACP Agents](/en/tools/acp-agents) para conocer el comportamiento de vinculación ACP compartido.

## Indicador de escritura + confirmaciones de lectura

- **Indicadores de escritura**: Se envían automáticamente antes y durante la generación de la respuesta.
- **Confirmaciones de lectura**: Controladas por `channels.bluebubbles.sendReadReceipts` (predeterminado: `true`).
- **Indicadores de escritura**: OpenClaw envía eventos de inicio de escritura; BlueBubbles borra el estado de escritura automáticamente al enviar o por tiempo de espera (la detención manual mediante DELETE no es confiable).

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## Acciones avanzadas

BlueBubbles admite acciones avanzadas de mensajes cuando se activan en la configuración:

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // edit sent messages (macOS 13+, broken on macOS 26 Tahoe)
        unsend: true, // unsend messages (macOS 13+)
        reply: true, // reply threading by message GUID
        sendWithEffect: true, // message effects (slam, loud, etc.)
        renameGroup: true, // rename group chats
        setGroupIcon: true, // set group chat icon/photo (flaky on macOS 26 Tahoe)
        addParticipant: true, // add participants to groups
        removeParticipant: true, // remove participants from groups
        leaveGroup: true, // leave group chats
        sendAttachment: true, // send attachments/media
      },
    },
  },
}
```

Acciones disponibles:

- **react**: Añadir/eliminar reacciones tapback (`messageId`, `emoji`, `remove`)
- **edit**: Editar un mensaje enviado (`messageId`, `text`)
- **unsend**: Enviar no enviado para un mensaje (`messageId`)
- **reply**: Responder a un mensaje específico (`messageId`, `text`, `to`)
- **sendWithEffect**: Enviar con efecto iMessage (`text`, `to`, `effectId`)
- **renameGroup**: Cambiar el nombre de un chat grupal (`chatGuid`, `displayName`)
- **setGroupIcon**: Establecer el icono/foto de un chat grupal (`chatGuid`, `media`) — inestable en macOS 26 Tahoe (la API puede devolver éxito pero el icono no se sincroniza).
- **addParticipant**: Añadir a alguien a un grupo (`chatGuid`, `address`)
- **removeParticipant**: Eliminar a alguien de un grupo (`chatGuid`, `address`)
- **leaveGroup**: Salir de un chat grupal (`chatGuid`)
- **upload-file**: Enviar medios/archivos (`to`, `buffer`, `filename`, `asVoice`)
  - Notas de voz: establezca `asVoice: true` con audio **MP3** o **CAF** para enviar como un mensaje de voz de iMessage. BlueBubbles convierte MP3 → CAF al enviar notas de voz.
- Alias heredado: `sendAttachment` todavía funciona, pero `upload-file` es el nombre canónico de la acción.

### IDs de mensaje (cortos vs completos)

OpenClaw puede mostrar IDs de mensaje _cortos_ (p. ej., `1`, `2`) para ahorrar tokens.

- `MessageSid` / `ReplyToId` pueden ser ID cortos.
- `MessageSidFull` / `ReplyToIdFull` contienen los ID completos del proveedor.
- Los ID cortos están en memoria; pueden caducar al reiniciar o al ser expulsados de la caché.
- Las acciones aceptan ID cortos o completos `messageId`, pero los ID cortos darán error si ya no están disponibles.

Utilice ID completos para automatizaciones y almacenamiento duraderos:

- Plantillas: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` en las cargas útiles entrantes

Consulte [Configuration](/en/gateway/configuration) para conocer las variables de plantilla.

## Bloquear streaming

Controle si las respuestas se envían como un solo mensaje o se transmiten en bloques:

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## Medios + límites

- Los archivos adjuntos entrantes se descargan y almacenan en la caché de medios.
- Límite de medios mediante `channels.bluebubbles.mediaMaxMb` para medios entrantes y salientes (predeterminado: 8 MB).
- El texto saliente se divide en fragmentos de `channels.bluebubbles.textChunkLimit` (predeterminado: 4000 caracteres).

## Referencia de configuración

Configuración completa: [Configuración](/en/gateway/configuration)

Opciones del proveedor:

- `channels.bluebubbles.enabled`: Habilitar/deshabilitar el canal.
- `channels.bluebubbles.serverUrl`: URL base de la API REST de BlueBubbles.
- `channels.bluebubbles.password`: Contraseña de la API.
- `channels.bluebubbles.webhookPath`: Ruta del endpoint del webhook (predeterminado: `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).
- `channels.bluebubbles.allowFrom`: Lista de permitidos de DM (identificadores, correos electrónicos, números E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom`: Lista de permitidos de remitentes de grupos.
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`: En macOS, opcionalmente enriquece a los participantes del grupo sin nombre desde los Contactos locales después de pasar el filtro. Predeterminado: `false`.
- `channels.bluebubbles.groups`: Configuración por grupo (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts`: Enviar confirmaciones de lectura (predeterminado: `true`).
- `channels.bluebubbles.blockStreaming`: Habilitar transmisión de bloques (predeterminado: `false`; necesario para respuestas en streaming).
- `channels.bluebubbles.textChunkLimit`: Tamaño del fragmento de salida en caracteres (predeterminado: 4000).
- `channels.bluebubbles.chunkMode`: `length` (predeterminado) divide solo cuando excede `textChunkLimit`; `newline` divide en líneas en blanco (límites de párrafos) antes de la fragmentación por longitud.
- `channels.bluebubbles.mediaMaxMb`: Límite de capacidad de medios entrantes/salientes en MB (predeterminado: 8).
- `channels.bluebubbles.mediaLocalRoots`: Lista de permitidos explícita de directorios locales absolutos permitidos para rutas de medios locales salientes. Los envíos de rutas locales se deniegan de manera predeterminada a menos que se configure esto. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.historyLimit`: Máximo de mensajes de grupo para el contexto (0 lo desactiva).
- `channels.bluebubbles.dmHistoryLimit`: Límite del historial de MD.
- `channels.bluebubbles.actions`: Habilitar/deshabilitar acciones específicas.
- `channels.bluebubbles.accounts`: Configuración multicuenta.

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Direcciones / objetivos de entrega

Prefiera `chat_guid` para un enrutamiento estable:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Identificadores directos: `+15555550123`, `user@example.com`
  - Si un identificador directo no tiene un chat MD existente, OpenClaw creará uno a través de `POST /api/v1/chat/new`. Esto requiere que la API privada de BlueBubbles esté habilitada.

## Seguridad

- Las solicitudes de webhook se autentican comparando los parámetros de consulta o encabezados `guid`/`password` contra `channels.bluebubbles.password`. También se aceptan solicitudes de `localhost`.
- Mantenga la contraseña de la API y el endpoint del webhook en secreto (trátelos como credenciales).
- La confianza de localhost significa que un proxy inverso en el mismo host puede eludir involuntariamente la contraseña. Si utiliza un proxy para la puerta de enlace, requiera autenticación en el proxy y configure `gateway.trustedProxies`. Consulte [Seguridad de la puerta de enlace](/en/gateway/security#reverse-proxy-configuration).
- Habilite HTTPS y las reglas del firewall en el servidor de BlueBubbles si lo expone fuera de su red LAN.

## Solución de problemas

- Si los eventos de escritura/lectura dejan de funcionar, verifique los registros de webhook de BlueBubbles y asegúrese de que la ruta de la puerta de enlace coincida con `channels.bluebubbles.webhookPath`.
- Los códigos de emparejamiento caducan después de una hora; utilice `openclaw pairing list bluebubbles` y `openclaw pairing approve bluebubbles <code>`.
- Las reacciones requieren la API privada de BlueBubbles (`POST /api/v1/message/react`); asegúrese de que la versión del servidor la exponga.
- La edición/eliminación requieren macOS 13+ y una versión compatible del servidor de BlueBubbles. En macOS 26 (Tahoe), la edición actualmente no funciona debido a cambios en la API privada.
- Las actualizaciones del icono del grupo pueden ser inestables en macOS 26 (Tahoe): la API puede devolver éxito, pero el nuevo icono no se sincroniza.
- OpenClaw oculta automáticamente las acciones conocidas como rotas según la versión de macOS del servidor BlueBubbles. Si la edición aún aparece en macOS 26 (Tahoe), desactívela manualmente con `channels.bluebubbles.actions.edit=false`.
- Para obtener información sobre el estado/salud: `openclaw status --all` o `openclaw status --deep`.

Para obtener una referencia general del flujo de trabajo del canal, consulte [Canales](/en/channels) y la guía de [Complementos](/en/tools/plugin).

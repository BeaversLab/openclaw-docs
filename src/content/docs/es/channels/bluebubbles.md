---
summary: "iMessage a través del servidor BlueBubbles macOS (REST envío/recepción, escritura, reacciones, emparejamiento, acciones avanzadas)."
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

Estado: complemento incluido que se comunica con el servidor macOS de BlueBubbles a través de HTTP. **Recomendado para la integración de iMessage** debido a su API más rica y una configuración más fácil en comparación con el canal imsg heredado.

## Complemento incluido

Las versiones actuales de OpenClaw incluyen BlueBubbles, por lo que las compilaciones empaquetadas normales no
necesitan un paso separado de `openclaw plugins install`.

## Resumen

- Se ejecuta en macOS a través de la aplicación auxiliar BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/probado: macOS Sequoia (15). macOS Tahoe (26) funciona; la edición actualmente está rota en Tahoe, y las actualizaciones de iconos de grupo pueden reportar éxito pero no sincronizarse.
- OpenClaw se comunica a través de su API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Los mensajes entrantes llegan a través de webhooks; las respuestas salientes, indicadores de escritura, confirmaciones de lectura y respuestas con reacciones son llamadas REST.
- Los adjuntos y pegatinas se ingieren como medios entrantes (y se muestran al agente cuando es posible).
- El emparejamiento/lista de permitidos funciona de la misma manera que otros canales (`/channels/pairing` etc.) con `channels.bluebubbles.allowFrom` + códigos de emparejamiento.
- Las reacciones se muestran como eventos del sistema, al igual que en Slack/Telegram, para que los agentes puedan "mencionarlas" antes de responder.
- Funciones avanzadas: editar, no enviar, hilos de respuesta, efectos de mensaje, gestión de grupos.

## Inicio rápido

1. Instale el servidor BlueBubbles en su Mac (siga las instrucciones en [bluebubbles.app/install](https://bluebubbles.app/install)).
2. En la configuración de BlueBubbles, habilite la API web y configure una contraseña.
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
5. Inicie la puerta de enlace; esta registrará el manejador de webhooks y comenzará el emparejamiento.

Nota de seguridad:

- Configure siempre una contraseña de webhook.
- La autenticación de webhook siempre es necesaria. OpenClaw rechaza las solicitudes de webhook de BlueBubbles a menos que incluyan una contraseña/guid que coincida con `channels.bluebubbles.password` (por ejemplo `?password=<password>` o `x-password`), independientemente de la topología de bucle de retorno/proxy.
- La autenticación por contraseña se verifica antes de leer/analizar los cuerpos completos del webhook.

## Mantener Messages.app activo (configuraciones de VM / sin pantalla)

Algunas configuraciones de macOS VM / siempre activas pueden terminar con Messages.app en “inactividad” (los eventos entrantes se detienen hasta que se abre la aplicación / se pone en primer plano). Una solución simple es **revivar Messages cada 5 minutos** usando un AppleScript + LaunchAgent.

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
- La primera ejecución puede desencadenar indicaciones de **Automatización** de macOS (`osascript` → Messages). Apruébalas en la misma sesión de usuario que ejecuta el LaunchAgent.

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

- **URL del servidor** (obligatorio): dirección del servidor BlueBubbles (por ejemplo, `http://192.168.1.100:1234`)
- **Contraseña** (obligatorio): contraseña de API de la configuración del servidor BlueBubbles
- **Ruta de Webhook** (opcional): el valor predeterminado es `/bluebubbles-webhook`
- **Política de DM**: emparejamiento, lista de permitidos, abierta o desactivada
- **Lista de permitidos**: números de teléfono, correos electrónicos o objetivos de chat

También puede agregar BlueBubbles a través de CLI:

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Control de acceso (DMs + grupos)

MDs:

- Predeterminado: `channels.bluebubbles.dmPolicy = "pairing"`.
- Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar vía:
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/en/channels/pairing)

Grupos:

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controla quién puede activar en grupos cuando se establece `allowlist`.

### Enriquecimiento de nombres de contactos (macOS, opcional)

Los webhooks de grupo de BlueBubbles a menudo incluyen solo direcciones de participantes sin procesar. Si desea que el contexto `GroupMembers` muestre nombres de contactos locales en su lugar, puede optar por el enriquecimiento local de Contactos en macOS:

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` habilita la búsqueda. Predeterminado: `false`.
- Las búsquedas se ejecutan solo después de que el acceso al grupo, la autorización de comandos y el filtrado de menciones hayan permitido el paso del mensaje.
- Solo se enriquecen los participantes telefónicos sin nombre.
- Los números de teléfono sin procesar se mantienen como alternativa cuando no se encuentra ninguna coincidencia local.

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

- Los comandos de control (p. ej., `/config`, `/model`) requieren autorización.
- Usa `allowFrom` y `groupAllowFrom` para determinar la autorización de comandos.
- Los remitentes autorizados pueden ejecutar comandos de control incluso sin mencionar en grupos.

## Vinculaciones de conversaciones ACP

Los chats de BlueBubbles pueden convertirse en espacios de trabajo ACP duraderos sin cambiar la capa de transporte.

Flujo rápido de operador:

- Ejecuta `/acp spawn codex --bind here` dentro del MD o chat grupal permitido.
- Los mensajes futuros en esa misma conversación de BlueBubbles se enrutan a la sesión ACP iniciada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

También se admiten vinculaciones persistentes configuradas a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "bluebubbles"`.

`match.peer.id` puede usar cualquier forma de destino de BlueBubbles admitida:

- identificador MD normalizado como `+15555550123` o `user@example.com`
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

Consulta [ACP Agents](/en/tools/acp-agents) para conocer el comportamiento de vinculación ACP compartida.

## Indicadores de escritura + confirmaciones de lectura

- **Indicadores de escritura**: Se envían automáticamente antes y durante la generación de respuestas.
- **Confirmaciones de lectura**: Controladas por `channels.bluebubbles.sendReadReceipts` (predeterminado: `true`).
- **Indicadores de escritura**: OpenClaw envía eventos de inicio de escritura; BlueBubbles borra el estado de escritura automáticamente al enviar o por tiempo de espera (la detención manual mediante DELETE no es fiable).

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

BlueBubbles admite acciones avanzadas de mensajes cuando se habilitan en la configuración:

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
- **unsend**: Desenviar un mensaje (`messageId`)
- **reply**: Responder a un mensaje específico (`messageId`, `text`, `to`)
- **sendWithEffect**: Enviar con efecto iMessage (`text`, `to`, `effectId`)
- **renameGroup**: Cambiar el nombre de un chat de grupo (`chatGuid`, `displayName`)
- **setGroupIcon**: Establecer el icono/foto de un chat de grupo (`chatGuid`, `media`) — inestable en macOS 26 Tahoe (la API puede devolver éxito pero el icono no se sincroniza).
- **addParticipant**: Añadir alguien a un grupo (`chatGuid`, `address`)
- **removeParticipant**: Eliminar a alguien de un grupo (`chatGuid`, `address`)
- **leaveGroup**: Abandonar un chat de grupo (`chatGuid`)
- **upload-file**: Enviar medios/archivos (`to`, `buffer`, `filename`, `asVoice`)
  - Notas de voz: establezca `asVoice: true` con audio **MP3** o **CAF** para enviar como mensaje de voz iMessage. BlueBubbles convierte MP3 → CAF al enviar notas de voz.
- Alias heredado: `sendAttachment` todavía funciona, pero `upload-file` es el nombre canónico de la acción.

### IDs de mensaje (cortos vs completos)

OpenClaw puede mostrar IDs de mensaje _cortos_ (p. ej., `1`, `2`) para guardar tokens.

- `MessageSid` / `ReplyToId` pueden ser IDs cortos.
- `MessageSidFull` / `ReplyToIdFull` contienen los IDs completos del proveedor.
- Los IDs cortos están en memoria; pueden caducar al reiniciar o al purgar la caché.
- Las acciones aceptan IDs cortos o completos `messageId`, pero los IDs cortos darán error si ya no están disponibles.

Use IDs completos para automatizaciones y almacenamiento duraderos:

- Plantillas: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` en cargas útiles entrantes

Consulte [Configuración](/en/gateway/configuration) para las variables de plantilla.

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
- Límite de medios a través de `channels.bluebubbles.mediaMaxMb` para medios entrantes y salientes (predeterminado: 8 MB).
- El texto de salida se divide en partes de `channels.bluebubbles.textChunkLimit` (predeterminado: 4000 caracteres).

## Referencia de configuración

Configuración completa: [Configuración](/en/gateway/configuration)

Opciones del proveedor:

- `channels.bluebubbles.enabled`: Habilitar/deshabilitar el canal.
- `channels.bluebubbles.serverUrl`: URL base de la API REST de BlueBubbles.
- `channels.bluebubbles.password`: Contraseña de la API.
- `channels.bluebubbles.webhookPath`: Ruta del endpoint del webhook (predeterminado: `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).
- `channels.bluebubbles.allowFrom`: Lista de permitidos para MD (identificadores, correos electrónicos, números E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom`: Lista de permitidos para remitentes de grupos.
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`: En macOS, opcionalmente enriquece los participantes de grupos sin nombre desde los Contactos locales después de pasar el filtrado. Predeterminado: `false`.
- `channels.bluebubbles.groups`: Configuración por grupo (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts`: Enviar confirmaciones de lectura (predeterminado: `true`).
- `channels.bluebubbles.blockStreaming`: Habilitar la transmisión por bloques (predeterminado: `false`; necesario para respuestas en streaming).
- `channels.bluebubbles.textChunkLimit`: Tamaño del fragmento de salida en caracteres (predeterminado: 4000).
- `channels.bluebubbles.chunkMode`: `length` (predeterminado) divide solo cuando excede `textChunkLimit`; `newline` divide en líneas en blanco (límites de párrafo) antes de la división por longitud.
- `channels.bluebubbles.mediaMaxMb`: Límite de medios entrantes/salientes en MB (predeterminado: 8).
- `channels.bluebubbles.mediaLocalRoots`: Lista de permitidos explícita de directorios locales absolutos permitidos para rutas de medios locales salientes. Los envíos de rutas locales se deniegan de forma predeterminada a menos que se configure esto. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.historyLimit`: Máximo de mensajes grupales para el contexto (0 lo desactiva).
- `channels.bluebubbles.dmHistoryLimit`: Límite de historial de MD.
- `channels.bluebubbles.actions`: Habilitar/deshabilitar acciones específicas.
- `channels.bluebubbles.accounts`: Configuración multicuenta.

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Direccionamiento / objetivos de entrega

Preferir `chat_guid` para un enrutamiento estable:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Identificadores directos: `+15555550123`, `user@example.com`
  - Si un identificador directo no tiene un chat MD existente, OpenClaw creará uno a través de `POST /api/v1/chat/new`. Esto requiere que la API privada de BlueBubbles esté habilitada.

## Seguridad

- Las solicitudes de webhook se autentican comparando los parámetros de consulta o encabezados `guid`/`password` contra `channels.bluebubbles.password`.
- Mantenga la contraseña de la API y el punto final del webhook en secreto (trátelos como credenciales).
- No hay una omisión de localhost para la autenticación por webhook de BlueBubbles. Si proxies el tráfico del webhook, mantén la contraseña de BlueBubbles en la solicitud de extremo a extremo. `gateway.trustedProxies` no reemplaza a `channels.bluebubbles.password` aquí. Consulta [Gateway security](/en/gateway/security#reverse-proxy-configuration).
- Habilita HTTPS + reglas de firewall en el servidor de BlueBubbles si lo expones fuera de tu LAN.

## Solución de problemas

- Si los eventos de escritura/lectura dejan de funcionar, revisa los registros del webhook de BlueBubbles y verifica que la ruta de la puerta de enlace coincida con `channels.bluebubbles.webhookPath`.
- Los códigos de emparejamiento caducan después de una hora; usa `openclaw pairing list bluebubbles` y `openclaw pairing approve bluebubbles <code>`.
- Las reacciones requieren la API privada de BlueBubbles (`POST /api/v1/message/react`); asegúrate de que la versión del servidor la exponga.
- Editar/desenviar requieren macOS 13+ y una versión compatible del servidor de BlueBubbles. En macOS 26 (Tahoe), editar está actualmente roto debido a cambios en la API privada.
- Las actualizaciones de los iconos de grupo pueden ser inestables en macOS 26 (Tahoe): la API puede devolver éxito, pero el nuevo icono no se sincroniza.
- OpenClaw oculta automáticamente las acciones conocidas como rotas según la versión de macOS del servidor de BlueBubbles. Si editar aún aparece en macOS 26 (Tahoe), desactívalo manualmente con `channels.bluebubbles.actions.edit=false`.
- Para obtener información de estado/salud: `openclaw status --all` o `openclaw status --deep`.

Para obtener una referencia general del flujo de trabajo del canal, consulta [Canales](/en/channels) y la guía de [Plugins](/en/tools/plugin).

## Relacionado

- [Descripción general de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación DM y flujo de emparejamiento
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y restricción de menciones
- [Enrutamiento de canal](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento

---
summary: "iMessage a través del servidor BlueBubbles macOS (REST envío/recepción, escritura, reacciones, emparejamiento, acciones avanzadas)."
read_when:
  - Configuración del canal BlueBubbles
  - Solución de problemas de emparejamiento de webhooks
  - Configurar iMessage en macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

Estado: complemento incluido que se comunica con el servidor BlueBubbles macOS a través de HTTP. **Recomendado para la integración de iMessage** debido a su API más rica y una configuración más fácil en comparación con el canal heredado imsg.

## Resumen

- Se ejecuta en macOS a través de la aplicación auxiliar BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/probado: macOS Sequoia (15). macOS Tahoe (26) funciona; la edición actualmente falla en Tahoe, y las actualizaciones de iconos de grupo pueden reportar éxito pero no sincronizarse.
- OpenClaw se comunica con él a través de su API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Los mensajes entrantes llegan a través de webhooks; las respuestas salientes, los indicadores de escritura, las confirmaciones de lectura y los tapbacks son llamadas REST.
- Los adjuntos y las pegatinas se ingieren como medios entrantes (y se muestran al agente cuando es posible).
- El emparejamiento/lista blanca funciona de la misma manera que otros canales (`/channels/pairing`, etc.) con `channels.bluebubbles.allowFrom` + códigos de emparejamiento.
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
5. Inicie la puerta de enlace; registrará el controlador de webhook y comenzará el emparejamiento.

Nota de seguridad:

- Establezca siempre una contraseña de webhook.
- La autenticación de webhook siempre es necesaria. OpenClaw rechaza las solicitudes de webhook de BlueBubbles a menos que incluyan una contraseña/guid que coincida con `channels.bluebubbles.password` (por ejemplo, `?password=<password>` o `x-password`), independientemente de la topología de bucle local/proxy.
- La autenticación por contraseña se verifica antes de leer/analizar los cuerpos completos de los webhooks.

## Mantener Mensajes.app activo (configuraciones de VM / sin cabeza)

Algunas configuraciones de macOS VM / siempre activas pueden terminar con Mensajes.app pasando a "inactivo" (los eventos entrantes se detienen hasta que la aplicación se abre/pone en primer plano). Una solución simple es **dar un toque a Mensajes cada 5 minutos** usando un AppleScript + LaunchAgent.

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
- La primera ejecución puede desencadenar indicaciones de **Automatización** de macOS (`osascript` → Mensajes). Apruébelas en la misma sesión de usuario que ejecuta el LaunchAgent.

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
- **Ruta de webhook** (opcional): el valor predeterminado es `/bluebubbles-webhook`
- **Política de MD**: emparejamiento, lista de permitidos, abierto o deshabilitado
- **Lista de permitidos**: números de teléfono, correos electrónicos o destinos de chat

También puede agregar BlueBubbles a través de CLI:

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Control de acceso (MDs + grupos)

MDs:

- Predeterminado: `channels.bluebubbles.dmPolicy = "pairing"`.
- Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
- Aprobar a través de:
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/es/channels/pairing)

Grupos:

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controla quién puede activar en grupos cuando se establece `allowlist`.

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

### Filtro de comandos

- Los comandos de control (por ejemplo, `/config`, `/model`) requieren autorización.
- Usa `allowFrom` y `groupAllowFrom` para determinar la autorización del comando.
- Los remitentes autorizados pueden ejecutar comandos de control incluso sin mencionar en grupos.

## Indicadores de escritura + confirmaciones de lectura

- **Indicadores de escritura**: Se envían automáticamente antes y durante la generación de la respuesta.
- **Confirmaciones de lectura**: Controladas por `channels.bluebubbles.sendReadReceipts` (predeterminado: `true`).
- **Indicadores de escritura**: OpenClaw envía eventos de inicio de escritura; BlueBubbles borra la escritura automáticamente al enviar o por tiempo de espera (la detención manual mediante DELETE no es confiable).

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
- **unsend**: Cancelar el envío de un mensaje (`messageId`)
- **reply**: Responder a un mensaje específico (`messageId`, `text`, `to`)
- **sendWithEffect**: Enviar con efecto de iMessage (`text`, `to`, `effectId`)
- **renameGroup**: Cambiar el nombre de un chat grupal (`chatGuid`, `displayName`)
- **setGroupIcon**: Establecer el icono/foto de un chat grupal (`chatGuid`, `media`) — inestable en macOS 26 Tahoe (la API puede devolver éxito pero el icono no se sincroniza).
- **addParticipant**: Añadir a alguien a un grupo (`chatGuid`, `address`)
- **removeParticipant**: Eliminar a alguien de un grupo (`chatGuid`, `address`)
- **leaveGroup**: Salir de un chat grupal (`chatGuid`)
- **sendAttachment**: Enviar medios/archivos (`to`, `buffer`, `filename`, `asVoice`)
  - Notas de voz: configure `asVoice: true` con audio **MP3** o **CAF** para enviar como un mensaje de voz de iMessage. BlueBubbles convierte MP3 → CAF al enviar notas de voz.

### ID de mensajes (cortos vs completos)

OpenClaw puede mostrar ID de mensajes _cortos_ (por ejemplo, `1`, `2`) para ahorrar tokens.

- `MessageSid` / `ReplyToId` pueden ser ID cortos.
- `MessageSidFull` / `ReplyToIdFull` contienen los ID completos del proveedor.
- Los ID cortos están en memoria; pueden expirar al reiniciar o al ser desalojados de la caché.
- Las acciones aceptan ID cortos o completos `messageId`, pero los ID cortos darán error si ya no están disponibles.

Use ID completos para automatizaciones y almacenamiento duraderos:

- Plantillas: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` en las cargas útiles entrantes

Consulte [Configuración](/es/gateway/configuration) para las variables de plantilla.

## Bloqueo de streaming

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
- El texto saliente se divide en partes de `channels.bluebubbles.textChunkLimit` (predeterminado: 4000 caracteres).

## Referencia de configuración

Configuración completa: [Configuración](/es/gateway/configuration)

Opciones del proveedor:

- `channels.bluebubbles.enabled`: Habilitar/deshabilitar el canal.
- `channels.bluebubbles.serverUrl`: URL base de la API REST de BlueBubbles.
- `channels.bluebubbles.password`: Contraseña de la API.
- `channels.bluebubbles.webhookPath`: Ruta del endpoint del webhook (predeterminado: `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).
- `channels.bluebubbles.allowFrom`: Lista de permitidos de DM (identificadores, correos electrónicos, números E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom`: Lista de permitidos de remitentes de grupos.
- `channels.bluebubbles.groups`: Configuración por grupo (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts`: Enviar confirmaciones de lectura (predeterminado: `true`).
- `channels.bluebubbles.blockStreaming`: Habilitar streaming de bloques (predeterminado: `false`; necesario para respuestas en streaming).
- `channels.bluebubbles.textChunkLimit`: Tamaño del fragmento de salida en caracteres (predeterminado: 4000).
- `channels.bluebubbles.chunkMode`: `length` (predeterminado) divide solo cuando supera `textChunkLimit`; `newline` divide en líneas en blanco (límites de párrafo) antes de la división por longitud.
- `channels.bluebubbles.mediaMaxMb`: Límite de medios de entrada/salida en MB (predeterminado: 8).
- `channels.bluebubbles.mediaLocalRoots`: Lista de permitidos explícita de directorios locales absolutos permitidos para rutas de medios locales de salida. El envío de rutas locales se deniega de forma predeterminada a menos que esto esté configurado. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.historyLimit`: Máximo de mensajes grupales para el contexto (0 lo deshabilita).
- `channels.bluebubbles.dmHistoryLimit`: Límite de historial de MD.
- `channels.bluebubbles.actions`: Habilitar/deshabilitar acciones específicas.
- `channels.bluebubbles.accounts`: Configuración multicuenta.

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Dirección / objetivos de entrega

Preferir `chat_guid` para un enrutamiento estable:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Manejadores directos: `+15555550123`, `user@example.com`
  - Si un manejador directo no tiene un chat MD existente, OpenClaw creará uno a través de `POST /api/v1/chat/new`. Esto requiere que la API privada de BlueBubbles esté habilitada.

## Seguridad

- Las solicitudes de webhook se autentican comparando los parámetros de consulta o encabezados `guid`/`password` contra `channels.bluebubbles.password`. También se aceptan solicitudes de `localhost`.
- Mantenga la contraseña de la API y el punto final del webhook en secreto (trátelos como credenciales).
- La confianza de localhost significa que un proxy inverso en el mismo host puede omitir inadvertidamente la contraseña. Si utiliza un proxy para la puerta de enlace, exija autenticación en el proxy y configure `gateway.trustedProxies`. Consulte [Seguridad de la puerta de enlace](/es/gateway/security#reverse-proxy-configuration).
- Active HTTPS y las reglas del firewall en el servidor de BlueBubbles si lo expone fuera de su red local (LAN).

## Solución de problemas

- Si los eventos de escritura/lectura dejan de funcionar, revise los registros de webhooks de BlueBubbles y verifique que la ruta de la puerta de enlace coincida con `channels.bluebubbles.webhookPath`.
- Los códigos de emparejamiento caducan después de una hora; use `openclaw pairing list bluebubbles` y `openclaw pairing approve bluebubbles <code>`.
- Las reacciones requieren la API privada de BlueBubbles (`POST /api/v1/message/react`); asegúrese de que la versión del servidor la exponga.
- Editar/desenviar requieren macOS 13+ y una versión compatible del servidor de BlueBubbles. En macOS 26 (Tahoe), la edición actualmente no funciona debido a cambios en la API privada.
- Las actualizaciones de los iconos de grupo pueden ser inestables en macOS 26 (Tahoe): la API puede devolver éxito pero el nuevo icono no se sincroniza.
- OpenClaw oculta automáticamente las acciones conocidas como rotas basándose en la versión de macOS del servidor de BlueBubbles. Si la edición aún aparece en macOS 26 (Tahoe), desactívela manualmente con `channels.bluebubbles.actions.edit=false`.
- Para obtener información de estado/salud: `openclaw status --all` o `openclaw status --deep`.

Para consultar la referencia general del flujo de trabajo del canal, consulte [Canales](/es/channels) y la guía de [Complementos](/es/tools/plugin).

import es from "/components/footer/es.mdx";

<es />

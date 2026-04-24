---
summary: "iMessage a través del servidor macOS BlueBubbles (REST enviar/recibir, escribiendo, reacciones, emparejamiento, acciones avanzadas)."
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
necesitan un paso `openclaw plugins install` separado.

## Resumen

- Se ejecuta en macOS a través de la aplicación auxiliar BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/probado: macOS Sequoia (15). macOS Tahoe (26) funciona; la edición actualmente está rota en Tahoe, y las actualizaciones de iconos de grupo pueden reportar éxito pero no sincronizarse.
- OpenClaw se comunica con él a través de su API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Los mensajes entrantes llegan a través de webhooks; las respuestas salientes, indicadores de escritura, confirmaciones de lectura y respuestas con reacciones son llamadas REST.
- Los adjuntos y pegatinas se ingieren como medios entrantes (y se muestran al agente cuando es posible).
- El emparejamiento/lista blanca funciona de la misma manera que en otros canales (`/channels/pairing` etc.) con `channels.bluebubbles.allowFrom` + códigos de emparejamiento.
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
- La autenticación del webhook siempre es obligatoria. OpenClaw rechaza las solicitudes de webhook de BlueBubbles a menos que incluyan una contraseña/guid que coincida con `channels.bluebubbles.password` (por ejemplo `?password=<password>` o `x-password`), independientemente de la topología de bucle invertido/proxy.
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
- La primera ejecución puede activar avisos de **Automatización** de macOS (`osascript` → Messages). Apruébelos en la misma sesión de usuario que ejecuta el LaunchAgent.

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
- **Contraseña** (obligatorio): contraseña de API de la configuración del servidor BlueBubbles
- **Ruta del webhook** (opcional): el valor predeterminado es `/bluebubbles-webhook`
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
- El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/es/channels/pairing)

Grupos:

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controla quién puede activar en grupos cuando `allowlist` está establecido.

### Enriquecimiento de nombres de contactos (macOS, opcional)

Los webhooks de grupo de BlueBubbles a menudo solo incluyen direcciones de participantes sin procesar. Si desea que el contexto `GroupMembers` muestre nombres de contactos locales en su lugar, puede optar por el enriquecimiento local de Contactos en macOS:

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

- Los comandos de control (por ejemplo, `/config`, `/model`) requieren autorización.
- Usa `allowFrom` y `groupAllowFrom` para determinar la autorización del comando.
- Los remitentes autorizados pueden ejecutar comandos de control incluso sin mencionar en grupos.

### Prompt del sistema por grupo

Cada entrada bajo `channels.bluebubbles.groups.*` acepta una cadena `systemPrompt` opcional. El valor se inyecta en el mensaje del sistema del agente en cada turno que maneja un mensaje en ese grupo, por lo que puedes establecer reglas de comportamiento o de personalización por grupo sin editar los mensajes del agente:

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

La clave coincide con lo que BlueBubbles informe como `chatGuid` / `chatIdentifier` / numérico `chatId` para el grupo, y una entrada comodín `"*"` proporciona un valor predeterminado para cada grupo sin una coincidencia exacta (el mismo patrón utilizado por `requireMention` y las políticas de herramientas por grupo). Las coincidencias exactas siempre ganan sobre el comodín. Los DM ignoran este campo; use la personalización del prompt a nivel de agente o de cuenta en su lugar.

#### Ejemplo práctico: respuestas en hilos y reacciones de tapback (API privada)

Con la API privada de BlueBubbles habilitada, los mensajes entrantes llegan con ID de mensajes cortos (por ejemplo `[[reply_to:5]]`) y el agente puede llamar a `action=reply` para responder a un mensaje específico o `action=react` para enviar una reacción tapback. Un `systemPrompt` por grupo es una forma confiable de mantener al agente eligiendo la herramienta correcta:

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "When replying in this group, always call action=reply with the",
            "[[reply_to:N]] messageId from context so your response threads",
            "under the triggering message. Never send a new unlinked message.",
            "",
            "For short acknowledgements ('ok', 'got it', 'on it'), use",
            "action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓)",
            "instead of sending a text reply.",
          ].join(" "),
        },
      },
    },
  },
}
```

Las reacciones Tapback y las respuestas en hilos requieren la API privada de BlueBubbles; consulte [Advanced actions](#advanced-actions) y [Message IDs](#message-ids-short-vs-full) para conocer la mecánica subyacente.

## Vínculos de conversación de ACP

Los chats de BlueBubbles pueden convertirse en espacios de trabajo ACP duraderos sin cambiar la capa de transporte.

Flujo rápido de operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD o del chat grupal permitido.
- Los mensajes futuros en esa misma conversación de BlueBubbles se dirigen a la sesión ACP generada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

También se admiten vínculos persistentes configurados a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "bluebubbles"`.

`match.peer.id` puede usar cualquier forma de destino de BlueBubbles compatible:

- identificador de MD normalizado, como `+15555550123` o `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Para enlaces de grupos estables, prefiera `chat_id:*` o `chat_identifier:*`.

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

Consulte [ACP Agents](/es/tools/acp-agents) para el comportamiento del enlace ACP compartido.

## Indicadores de escritura + confirmaciones de lectura

- **Indicadores de escritura**: Se envían automáticamente antes y durante la generación de la respuesta.
- **Confirmaciones de lectura**: Controladas por `channels.bluebubbles.sendReadReceipts` (predeterminado: `true`).
- **Indicadores de escritura**: OpenClaw envía eventos de inicio de escritura; BlueBubbles borra la escritura automáticamente al enviar o por tiempo de espera (la detención manual a través de DELETE no es confiable).

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

- **react**: Agregar/quitar reacciones de tapback (`messageId`, `emoji`, `remove`). El conjunto nativo de tapbacks de iMessage es `love`, `like`, `dislike`, `laugh`, `emphasize` y `question`. Cuando un agente elige un emoji fuera de ese conjunto (por ejemplo `👀`), la herramienta de reacción vuelve a `love` para que el tapback aún se represente en lugar de fallar toda la solicitud. Las reacciones de confirmación configuradas aún se validan estrictamente y generan un error en valores desconocidos.
- **edit**: Editar un mensaje enviado (`messageId`, `text`)
- **unsend**: Cancelar el envío de un mensaje (`messageId`)
- **reply**: Responder a un mensaje específico (`messageId`, `text`, `to`)
- **sendWithEffect**: Enviar con efecto de iMessage (`text`, `to`, `effectId`)
- **renameGroup**: Cambiar el nombre de un chat de grupo (`chatGuid`, `displayName`)
- **setGroupIcon**: Establecer el icono/foto de un chat de grupo (`chatGuid`, `media`) — inestable en macOS 26 Tahoe (la API puede devolver éxito pero el icono no se sincroniza).
- **addParticipant**: Añadir a alguien a un grupo (`chatGuid`, `address`)
- **removeParticipant**: Eliminar a alguien de un grupo (`chatGuid`, `address`)
- **leaveGroup**: Salir de un chat grupal (`chatGuid`)
- **upload-file**: Enviar medios/archivos (`to`, `buffer`, `filename`, `asVoice`)
  - Notas de voz: configure `asVoice: true` con audio **MP3** o **CAF** para enviarlas como un mensaje de voz de iMessage. BlueBubbles convierte MP3 → CAF al enviar notas de voz.
- Alias heredado: `sendAttachment` todavía funciona, pero `upload-file` es el nombre de la acción canónica.

### IDs de mensajes (cortos vs completos)

OpenClaw puede mostrar IDs de mensaje _cortos_ (por ejemplo, `1`, `2`) para ahorrar tokens.

- `MessageSid` / `ReplyToId` pueden ser IDs cortos.
- `MessageSidFull` / `ReplyToIdFull` contienen los IDs completos del proveedor.
- Los IDs cortos están en memoria; pueden caducar al reiniciar o al desalojar la caché.
- Las acciones aceptan `messageId` cortos o completos, pero los ID cortos darán error si ya no están disponibles.

Use IDs completos para automatizaciones y almacenamiento duraderos:

- Plantillas: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` en las cargas útiles entrantes

Consulte [Configuración](/es/gateway/configuration) para las variables de plantilla.

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusionar MDs de envío dividido (comando + URL en una sola composición)

Cuando un usuario escribe un comando y una URL juntos en iMessage (por ejemplo, `Dump https://example.com/article`), Apple divide el envío en **dos entregas de webhook separadas**:

1. Un mensaje de texto (`"Dump"`).
2. Un globo de vista previa de URL (`"https://..."`) con imágenes de vista previa OG como archivos adjuntos.

Los dos webhooks llegan a OpenClaw con ~0.8-2.0 s de diferencia en la mayoría de configuraciones. Sin la fusión, el agente recibe solo el comando en el turno 1, responde (a menudo "envíame la URL"), y solo ve la URL en el turno 2, momento en el cual el contexto del comando ya se ha perdido.

`channels.bluebubbles.coalesceSameSenderDms` opta por unir los webhooks consecutivos del mismo remitente en un solo turno de agente para un MD. Los chats de grupo continúan indexándose por mensaje para que se preserve la estructura de turnos multiusuario.

### Cuándo activar

Active cuando:

- Usted implementa habilidades que esperan `command + payload` en un solo mensaje (volcado, pegar, guardar, cola, etc.).
- Sus usuarios pegan URL, imágenes o contenido largo junto con los comandos.
- Puede aceptar la latencia adicional en el turno del MD (ver abajo).

Deje desactivado cuando:

- Necesita la latencia de comando mínima para activadores de MD de una sola palabra.
- Todos sus flujos son comandos de un solo disparo sin seguimientos de carga útil.

### Activación

```json5
{
  channels: {
    bluebubbles: {
      coalesceSameSenderDms: true, // opt in (default: false)
    },
  },
}
```

Con el indicador activado y sin un `messages.inbound.byChannel.bluebubbles` explícito, la ventana de anti-rebote se amplía a **2500 ms** (el valor predeterminado para la no agrupación es de 500 ms). Se requiere la ventana más amplia — el cadencia de envío dividido de Apple de 0.8-2.0 s no cabe en el valor predeterminado más ajustado.

Para ajustar la ventana usted mismo:

```json5
{
  messages: {
    inbound: {
      byChannel: {
        // 2500 ms works for most setups; raise to 4000 ms if your Mac is slow
        // or under memory pressure (observed gap can stretch past 2 s then).
        bluebubbles: 2500,
      },
    },
  },
}
```

### Compromisos

- **Latencia añadida para los comandos de control de MD.** Con el indicador activado, los mensajes de comandos de control de MD (como `Dump`, `Save`, etc.) ahora esperan hasta la ventana de anti-rebote antes de despacharse, por si llega un webhook de payload. Los comandos de chat de grupo mantienen el envío instantáneo.
- **La salida combinada está delimitada** — el texto combinado tiene un límite de 4000 caracteres con un marcador explícito `…[truncated]`; los adjuntos están limitados a 20; las entradas de origen están limitadas a 10 (se conservan la primera y la última más allá de eso). Cada `messageId` de origen todavía llega a la deduplicación de entrada, por lo que una repetición posterior de MessagePoller de cualquier evento individual se reconoce como un duplicado.
- **Optativo, por canal.** Otros canales (Telegram, WhatsApp, Slack, ...) no se ven afectados.

### Escenarios y lo que ve el agente

| Usuario compone                                                                         | Apple entrega                   | Indicador desactivado (predeterminado)           | Indicador activado + ventana de 2500 ms                                          |
| --------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envío)                                                   | 2 webhooks a ~1 s de diferencia | Dos turnos del agente: solo "Dump", luego la URL | Un turno: texto combinado `Dump https://example.com`                             |
| `Save this 📎image.jpg caption` (adjunto + texto)                                       | 2 webhooks                      | Dos turnos                                       | Un turno: texto + imagen                                                         |
| `/status` (comando independiente)                                                       | 1 webhook                       | Envío inmediato                                  | **Esperar hasta la ventana, luego enviar**                                       |
| URL pegada sola                                                                         | 1 webhook                       | Envío inmediato                                  | Envío inmediato (solo una entrada en el depósito)                                |
| Texto + URL enviados como dos mensajes separados deliberados, con minutos de diferencia | 2 webhooks fuera de la ventana  | Dos turnos                                       | Dos turnos (la ventana caduca entre ellos)                                       |
| Inundación rápida (>10 MD pequeños dentro de la ventana)                                | N webhooks                      | N turnos                                         | Un turno, salida limitada (primero + último, límites de texto/archivo aplicados) |

### Solución de problemas de agrupación de envíos divididos

Si el indicador está activo y los envíos divididos aún llegan como dos turnos, verifique cada capa:

1. **Configuración cargada realmente.**

   ```
   grep coalesceSameSenderDms ~/.openclaw/openclaw.json
   ```

   Entonces `openclaw gateway restart` — el indicador se lee en la creación del registro de debouncer.

2. **Ventana de debounce lo suficientemente amplia para su configuración.** Mire el registro del servidor BlueBubbles bajo `~/Library/Logs/bluebubbles-server/main.log`:

   ```
   grep -E "Dispatching event to webhook" main.log | tail -20
   ```

   Mida el intervalo entre el envío de texto de estilo `"Dump"` y el envío `"https://..."; Attachments:` que sigue. Aumente `messages.inbound.byChannel.bluebubbles` para cubrir cómodamente ese intervalo.

3. **Las marcas de tiempo de Session JSONL ≠ llegada del webhook.** Las marcas de tiempo de los eventos de sesión (`~/.openclaw/agents/<id>/sessions/*.jsonl`) reflejan cuándo la puerta de entrega entrega un mensaje al agente, **no** cuándo llegó el webhook. Un mensaje en cola en segundo lugar etiquetado como `[Queued messages while agent was busy]` significa que el primer turno todavía se estaba ejecutando cuando llegó el segundo webhook; el cubo de fusión ya se había vaciado. Ajuste la ventana basándose en el registro del servidor BB, no en el registro de sesión.

4. **Presión de memoria ralentizando el envío de respuestas.** En máquinas más pequeñas (8 GB), los turnos del agente pueden tardar lo suficiente para que el cubo de fusión (coalesce bucket) se vacíe antes de que finalice la respuesta, y la URL aterrice como un segundo turno en cola. Verifique `memory_pressure` y `ps -o rss -p $(pgrep openclaw-gateway)`; si la puerta de enlace supera los ~500 MB de RSS y el compresor está activo, cierre otros procesos pesados o cambie a un host más grande.

5. **Los envíos de respuesta-cita son una ruta diferente.** Si el usuario tocó `Dump` como una **respuesta** a un globo de URL existente (iMessage muestra una insignia "1 Respuesta" en el globo de Dump), la URL vive en `replyToBody`, no en un segundo webhook. La fusión (coalescing) no aplica — eso es una preocupación de habilidad/prompt, no una preocupación de antirrebote (debouncer).

## Transmisión en bloques

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

- Los archivos adjuntos entrantes se descargan y almacenan en el caché de medios.
- Límite de medios a través de `channels.bluebubbles.mediaMaxMb` para medios entrantes y salientes (predeterminado: 8 MB).
- El texto saliente se divide en `channels.bluebubbles.textChunkLimit` (predeterminado: 4000 caracteres).

## Referencia de configuración

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.bluebubbles.enabled`: Habilitar/deshabilitar el canal.
- `channels.bluebubbles.serverUrl`: URL base de la API REST de BlueBubbles.
- `channels.bluebubbles.password`: Contraseña de la API.
- `channels.bluebubbles.webhookPath`: Ruta del endpoint del webhook (predeterminado: `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).
- `channels.bluebubbles.allowFrom`: Lista de permitidos para MD (identificadores, correos electrónicos, números E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (predeterminado: `allowlist`).
- `channels.bluebubbles.groupAllowFrom`: Lista de permitidos para el remitente del grupo.
- `channels.bluebubbles.enrichGroupParticipantsFromContacts`: En macOS, opcionalmente enriquece los participantes del grupo sin nombre desde los Contactos locales después de pasar el filtrado. Predeterminado: `false`.
- `channels.bluebubbles.groups`: Configuración por grupo (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts`: Enviar confirmaciones de lectura (predeterminado: `true`).
- `channels.bluebubbles.blockStreaming`: Habilitar transmisión de bloques (predeterminado: `false`; requerido para respuestas continuas).
- `channels.bluebubbles.textChunkLimit`: Tamaño del fragmento de salida en caracteres (predeterminado: 4000).
- `channels.bluebubbles.sendTimeoutMs`: Tiempo de espera por solicitud en ms para envíos de texto salientes a través de `/api/v1/message/text` (predeterminado: 30000). Aumente en configuraciones de macOS 26 donde los envíos de iMessage de la API privada pueden detenerse durante 60+ segundos dentro del marco de iMessage; por ejemplo `45000` o `60000`. Las sondas, búsquedas de chat, reacciones, ediciones y verificaciones de estado actualmente mantienen el predeterminado más corto de 10s; se planea ampliar la cobertura a reacciones y ediciones como seguimiento. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`.
- `channels.bluebubbles.chunkMode`: `length` (predeterminado) divide solo cuando excede `textChunkLimit`; `newline` divide en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.bluebubbles.mediaMaxMb`: Límite de medios de entrada/salida en MB (predeterminado: 8).
- `channels.bluebubbles.mediaLocalRoots`: Lista de permitidos explícita de directorios locales absolutos permitidos para rutas de medios locales salientes. Los envíos de rutas locales se deniegan de manera predeterminada a menos que esto esté configurado. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.coalesceSameSenderDms`: Combinar webhooks de MD consecutivos del mismo remitente en un turno de agente para que el envío dividido de texto+URL de Apple llegue como un solo mensaje (predeterminado: `false`). Consulte [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) para ver escenarios, ajuste de ventana y compensaciones. Amplía la ventana de antirrebote de entrada predeterminada de 500 ms a 2500 ms cuando se habilita sin un `messages.inbound.byChannel.bluebubbles` explícito.
- `channels.bluebubbles.historyLimit`: Máximo de mensajes grupales para el contexto (0 lo desactiva).
- `channels.bluebubbles.dmHistoryLimit`: Límite de historial de MD.
- `channels.bluebubbles.actions`: Habilitar/deshabilitar acciones específicas.
- `channels.bluebubbles.accounts`: Configuración multicuenta.

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Destinos de direccionamiento / entrega

Prefiera `chat_guid` para un enrutamiento estable:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Identificadores directos: `+15555550123`, `user@example.com`
  - Si un identificador directo no tiene un chat MD existente, OpenClaw creará uno a través de `POST /api/v1/chat/new`. Esto requiere que la API privada de BlueBubbles esté habilitada.

### Enrutamiento iMessage vs SMS

Cuando el mismo identificador tiene tanto un chat iMessage como un chat SMS en el Mac (por ejemplo, un número de teléfono que está registrado en iMessage pero que también ha recibido respuestas alternativas de burbuja verde), OpenClaw prefiere el chat iMessage y nunca degrada silenciosamente a SMS. Para forzar el chat SMS, use un prefijo de destino explícito `sms:` (por ejemplo `sms:+15555550123`). Los identificadores sin un chat iMessage coincidente aún se envían a través del chat que BlueBubbles reporte.

## Seguridad

- Las solicitudes de webhook se autentican comparando los parámetros de consulta o encabezados `guid`/`password` contra `channels.bluebubbles.password`.
- Mantenga la contraseña de la API y el endpoint del webhook en secreto (trátelos como credenciales).
- No hay ningún bypass de localhost para la autenticación de webhook de BlueBubbles. Si haces un proxy del tráfico del webhook, mantén la contraseña de BlueBubbles en la solicitud de extremo a extremo. `gateway.trustedProxies` no reemplaza a `channels.bluebubbles.password` aquí. Consulta [Gateway security](/es/gateway/security#reverse-proxy-configuration).
- Activa HTTPS + las reglas del firewall en el servidor de BlueBubbles si lo expones fuera de tu red local (LAN).

## Solución de problemas

- Si los eventos de escritura/lectura dejan de funcionar, verifica los registros del webhook de BlueBubbles y asegúrate de que la ruta de la pasarela coincida con `channels.bluebubbles.webhookPath`.
- Los códigos de emparejamiento caducan después de una hora; utiliza `openclaw pairing list bluebubbles` y `openclaw pairing approve bluebubbles <code>`.
- Las reacciones requieren la API privada de BlueBubbles (`POST /api/v1/message/react`); asegúrate de que la versión del servidor la exponga.
- Editar/desenviar requiere macOS 13+ y una versión compatible del servidor BlueBubbles. En macOS 26 (Tahoe), editar actualmente está roto debido a cambios en la API privada.
- Las actualizaciones de iconos de grupo pueden ser inestables en macOS 26 (Tahoe): la API puede devolver éxito, pero el nuevo icono no se sincroniza.
- OpenClaw oculta automáticamente las acciones conocidas como rotas según la versión de macOS del servidor BlueBubbles. Si editar todavía aparece en macOS 26 (Tahoe), desactívelo manualmente con `channels.bluebubbles.actions.edit=false`.
- `coalesceSameSenderDms` habilitado, pero los envíos divididos (ej. `Dump` + URL) aún llegan como dos turnos: consulte la lista de verificación de [solución de problemas de combinación de envíos divididos](#split-send-coalescing-troubleshooting) — las causas comunes son una ventana de anti-rebote demasiado ajustada, marcas de tiempo de registro de sesión mal interpretadas como la llegada del webhook, o un envío de respuesta-cita (que usa `replyToBody`, no un segundo webhook).
- Para obtener información de estado/salud: `openclaw status --all` o `openclaw status --deep`.

Para obtener una referencia general del flujo de trabajo del canal, consulte [Canales](/es/channels) y la guía de [Complementos](/es/tools/plugin).

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación y flujo de emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canal](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y fortalecimiento

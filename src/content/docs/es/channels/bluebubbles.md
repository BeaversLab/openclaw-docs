---
summary: "iMessage a través del servidor macOS BlueBubbles (REST enviar/recibir, escribiendo, reacciones, emparejamiento, acciones avanzadas)."
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

Estado: complemento incluido que se comunica con el servidor macOS de BlueBubbles a través de HTTP. **Recomendado para la integración de iMessage** debido a su API más rica y una configuración más fácil en comparación con el canal imsg heredado.

<Note>Las versiones actuales de OpenClaw incluyen BlueBubbles, por lo que las versiones empaquetadas normales no necesitan un paso separado de `openclaw plugins install`.</Note>

## Descripción general

- Se ejecuta en macOS a través de la aplicación auxiliar de BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recomendado/probado: macOS Sequoia (15). macOS Tahoe (26) funciona; la edición actualmente está rota en Tahoe, y las actualizaciones de iconos de grupo pueden informar éxito pero no sincronizarse.
- OpenClaw se comunica con él a través de su API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Los mensajes entrantes llegan a través de webhooks; las respuestas salientes, indicadores de escritura, confirmaciones de lectura y reacciones (tapbacks) son llamadas REST.
- Los archivos adjuntos y las pegatinas se ingieren como medios entrantes (y se muestran al agente cuando es posible).
- Las respuestas de TTS automáticas que sintetizan audio MP3 o CAF se entregan como burbujas de memo de voz de iMessage en lugar de archivos adjuntos simples.
- El emparejamiento/lista blanca funciona de la misma manera que otros canales (`/channels/pairing` etc.) con `channels.bluebubbles.allowFrom` + códigos de emparejamiento.
- Las reacciones se muestran como eventos del sistema, al igual que en Slack/Telegram, para que los agentes puedan "mencionarlas" antes de responder.
- Funciones avanzadas: editar, no enviar, hilos de respuesta, efectos de mensaje, gestión de grupos.

## Inicio rápido

<Steps>
  <Step title="Instalar BlueBubbles">
    Instale el servidor BlueBubbles en su Mac (siga las instrucciones en [bluebubbles.app/install](https://bluebubbles.app/install)).
  </Step>
  <Step title="Habilitar la API web">
    En la configuración de BlueBubbles, habilite la API web y establezca una contraseña.
  </Step>
  <Step title="Configurar OpenClaw">
    Ejecute `openclaw onboard` y seleccione BlueBubbles, o configure manualmente:

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

  </Step>
  <Step title="Apuntar webhooks a la puerta de enlace">
    Apunte los webhooks de BlueBubbles a su puerta de enlace (ejemplo: `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`).
  </Step>
  <Step title="Iniciar la puerta de enlace">
    Inicie la puerta de enlace; esta registrará el controlador de webhooks y comenzará el emparejamiento.
  </Step>
</Steps>

<Warning>
**Seguridad**

- Configure siempre una contraseña de webhook.
- La autenticación de webhook siempre es necesaria. OpenClaw rechaza las solicitudes de webhook de BlueBubbles a menos que incluyan una contraseña/guid que coincida con `channels.bluebubbles.password` (por ejemplo `?password=<password>` o `x-password`), independientemente de la topología de bucle invertido/proxy.
- La autenticación por contraseña se verifica antes de leer/analizar los cuerpos completos del webhook.
  </Warning>

## Mantener Mensajes.app activo (configuraciones de VM / sin cabeza)

Algunas configuraciones de macOS VM / siempre activas pueden terminar con Mensajes.app pasando a "inactivo" (los eventos entrantes se detienen hasta que la aplicación se abre/pone en primer plano). Una solución sencilla es **hacer un toque a Messages cada 5 minutos** usando un AppleScript + LaunchAgent.

<Steps>
  <Step title="Guardar el AppleScript">
    Guárdelo como `~/Scripts/poke-messages.scpt`:

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

  </Step>
  <Step title="Instalar un LaunchAgent">
    Guárdelo como `~/Library/LaunchAgents/com.user.poke-messages.plist`:

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

    Esto se ejecuta **cada 300 segundos** y **al iniciar sesión**. La primera ejecución puede activar las indicaciones de **Automatización** de macOS (`osascript` → Messages). Apruébelas en la misma sesión de usuario que ejecuta el LaunchAgent.

  </Step>
  <Step title="Cargarlo">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## Incorporación

BlueBubbles está disponible en la incorporación interactiva:

```
openclaw onboard
```

El asistente solicita:

<ParamField path="Server URL" type="string" required>
  Dirección del servidor de BlueBubbles (p. ej., `http://192.168.1.100:1234`).
</ParamField>
<ParamField path="Password" type="string" required>
  Contraseña de API de la configuración del servidor BlueBubbles.
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Ruta del endpoint del webhook.
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`, `allowlist`, `open` o `disabled`.
</ParamField>
<ParamField path="Allow list" type="string[]">
  Números de teléfono, correos electrónicos o destinos de chat.
</ParamField>

También puedes añadir BlueBubbles a través de la CLI:

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Control de acceso (MDs + grupos)

<Tabs>
  <Tab title="MDs">
    - Predeterminado: `channels.bluebubbles.dmPolicy = "pairing"`.
    - Los remitentes desconocidos reciben un código de emparejamiento; los mensajes se ignoran hasta que se aprueban (los códigos caducan después de 1 hora).
    - Aprobar mediante:
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - El emparejamiento es el intercambio de tokens predeterminado. Detalles: [Emparejamiento](/es/channels/pairing)
  </Tab>
  <Tab title="Grupos">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (predeterminado: `allowlist`).
    - `channels.bluebubbles.groupAllowFrom` controla quién puede activar en grupos cuando `allowlist` está configurado.
  </Tab>
</Tabs>

### Enriquecimiento de nombres de contactos (macOS, opcional)

Los webhooks de grupo de BlueBubbles a menudo solo incluyen las direcciones brutas de los participantes. Si deseas que el contexto `GroupMembers` muestre los nombres de los contactos locales en su lugar, puedes optar por el enriquecimiento local de Contactos en macOS:

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` habilita la búsqueda. Predeterminado: `false`.
- Las búsquedas se ejecutan solo después de que el acceso al grupo, la autorización de comandos y el filtrado de menciones hayan permitido el paso del mensaje.
- Solo se enriquecen los participantes telefónicos sin nombre.
- Los números de teléfono brutos se mantienen como alternativa cuando no se encuentra ninguna coincidencia local.

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

BlueBubbles admite el filtrado de menciones para los chats grupales, coincidiendo con el comportamiento de iMessage/WhatsApp:

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

Cada entrada bajo `channels.bluebubbles.groups.*` acepta una cadena `systemPrompt` opcional. El valor se inyecta en el prompt del sistema del agente en cada turno que maneja un mensaje en ese grupo, por lo que puedes establecer reglas de comportamiento o persona por grupo sin editar los prompts del agente:

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

La clave coincide con lo que BlueBubbles reporte como `chatGuid` / `chatIdentifier` / numérico `chatId` para el grupo, y una entrada comodín `"*"` proporciona un valor predeterminado para cada grupo sin una coincidencia exacta (el mismo patrón usado por `requireMention` y las políticas de herramientas por grupo). Las coincidencias exactas siempre ganan sobre el comodín. Los MDs ignoran este campo; usa la personalización de prompt a nivel de agente o de cuenta en su lugar.

#### Ejemplo práctico: respuestas en hilo y reacciones de tapback (API privada)

Con la API privada de BlueBubbles habilitada, los mensajes entrantes llegan con ID de mensajes cortos (por ejemplo `[[reply_to:5]]`) y el agente puede llamar a `action=reply` para responder en hilo a un mensaje específico o `action=react` para enviar una tapback. Un `systemPrompt` por grupo es una forma confiable de mantener al agente eligiendo la herramienta correcta:

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

Las reacciones de tapback y las respuestas en hilo requieren la API privada de BlueBubbles; consulta [Advanced actions](#advanced-actions) y [Message IDs](#message-ids-short-vs-full) para conocer la mecánica subyacente.

## Vínculos de conversación ACP

Los chats de BlueBubbles pueden convertirse en espacios de trabajo de ACP duraderos sin cambiar la capa de transporte.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD o del chat de grupo permitido.
- Los mensajes futuros en esa misma conversación de BlueBubbles se enrutan a la sesión de ACP generada.
- `/new` y `/reset` restablecen la misma sesión de ACP vinculada en su lugar.
- `/acp close` cierra la sesión de ACP y elimina el vínculo.

También se admiten vínculos persistentes configurados a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "bluebubbles"`.

`match.peer.id` puede usar cualquier forma de destino de BlueBubbles admitida:

- identificador de MD normalizado, como `+15555550123` o `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Para vínculos de grupo estables, prefiera `chat_id:*` o `chat_identifier:*`.

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

Consulte [Agentes ACP](/es/tools/acp-agents) para obtener información sobre el comportamiento de vinculación de ACP compartida.

## Indicadores de escritura + confirmaciones de lectura

- **Indicadores de escritura**: Se envían automáticamente antes y durante la generación de la respuesta.
- **Confirmaciones de lectura**: Controladas por `channels.bluebubbles.sendReadReceipts` (predeterminado: `true`).
- **Indicadores de escritura**: OpenClaw envía eventos de inicio de escritura; BlueBubbles borra la escritura automáticamente al enviar o al tiempo de espera (la detención manual mediante DELETE no es confiable).

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

BlueBubbles admite acciones de mensajes avanzadas cuando se habilitan en la configuración:

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

<AccordionGroup>
  <Accordion title="Acciones disponibles">
    - **react**: Añadir/eliminar reacciones de tapback (`messageId`, `emoji`, `remove`). El conjunto nativo de tapbacks de iMessage es `love`, `like`, `dislike`, `laugh`, `emphasize` y `question`. Cuando un agente elige un emoji fuera de ese conjunto (por ejemplo `👀`), la herramienta de reacción recurre a `love` para que el tapback aún se represente en lugar de fallar toda la solicitud. Las
    reacciones de confirmación configuradas todavía se validan estrictamente y dan error en valores desconocidos. - **edit**: Editar un mensaje enviado (`messageId`, `text`). - **unsend**: Desenviar un mensaje (`messageId`). - **reply**: Responder a un mensaje específico (`messageId`, `text`, `to`). - **sendWithEffect**: Enviar con efecto de iMessage (`text`, `to`, `effectId`). - **renameGroup**:
    Cambiar el nombre de un chat grupal (`chatGuid`, `displayName`). - **setGroupIcon**: Establecer el icono/foto de un chat grupal (`chatGuid`, `media`) — inestable en macOS 26 Tahoe (la API puede devolver éxito pero el icono no se sincroniza). - **addParticipant**: Añadir a alguien a un grupo (`chatGuid`, `address`). - **removeParticipant**: Eliminar a alguien de un grupo (`chatGuid`,
    `address`). - **leaveGroup**: Abandonar un chat grupal (`chatGuid`). - **upload-file**: Enviar medios/archivos (`to`, `buffer`, `filename`, `asVoice`). - Notas de voz: establezca `asVoice: true` con audio **MP3** o **CAF** para enviar como un mensaje de voz de iMessage. BlueBubbles convierte MP3 → CAF al enviar notas de voz. - Alias heredado: `sendAttachment` todavía funciona, pero
    `upload-file` es el nombre canónico de la acción.
  </Accordion>
</AccordionGroup>

### IDs de mensajes (cortos vs completos)

OpenClaw puede mostrar IDs de mensajes _cortos_ (por ejemplo, `1`, `2`) para guardar tokens.

- `MessageSid` / `ReplyToId` pueden ser IDs cortos.
- `MessageSidFull` / `ReplyToIdFull` contienen los IDs completos del proveedor.
- Los IDs cortos están en memoria; pueden expirar al reiniciar o por la eliminación de la caché.
- Las acciones aceptan IDs cortos o completos `messageId`, pero los IDs cortos darán error si ya no están disponibles.

Use IDs completos para automatizaciones y almacenamiento duraderos:

- Plantillas: `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexto: `MessageSidFull` / `ReplyToIdFull` en las cargas útiles entrantes

Consulte [Configuración](/es/gateway/configuration) para las variables de plantilla.

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusión de MDs enviados por partes (comando + URL en una sola composición)

Cuando un usuario escribe un comando y una URL juntos en iMessage (por ejemplo, `Dump https://example.com/article`), Apple divide el envío en **dos entregas de webhook separadas**:

1. Un mensaje de texto (`"Dump"`).
2. Un globo de vista previa de URL (`"https://..."`) con imágenes de vista previa OG como archivos adjuntos.

Los dos webhooks llegan a OpenClaw con una diferencia de ~0,8-2,0 s en la mayoría de las configuraciones. Sin la fusión, el agente recibe el comando solo en el turno 1, responde (a menudo "envíame la URL") y solo ve la URL en el turno 2, momento en el cual el contexto del comando ya se ha perdido.

`channels.bluebubbles.coalesceSameSenderDms` activa la fusión de webhooks consecutivos del mismo remitente en un solo turno de agente para un MD. Los chats de grupo siguen clasificándose por mensaje para que se preserve la estructura de turnos de múltiples usuarios.

<Tabs>
  <Tab title="Cuándo habilitar">
    Habilite cuando:

    - Implemente habilidades que esperen `command + payload` en un solo mensaje (volcado, pegar, guardar, cola, etc.).
    - Sus usuarios peguen URL, imágenes o contenido largo junto con comandos.
    - Pueda aceptar la latencia adicional de turno de MD (ver abajo).

    Deje deshabilitado cuando:

    - Necesite una latencia mínima de comando para activadores de MD de una sola palabra.
    - Todos sus flujos sean comandos de un solo tiro sin seguimientos de carga útil.

  </Tab>
  <Tab title="Activación">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Con el indicador activado y sin un `messages.inbound.byChannel.bluebubbles` explícito, la ventana de antirrebote se amplía a **2500 ms** (el valor predeterminado para la no fusión es 500 ms). Se requiere la ventana más amplia: el ritmo de envío dividido de Apple de 0.8-2.0 s no encaja en el valor predeterminado más estricto.

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

  </Tab>
  <Tab title="Compensaciones">
    - **Latencia añadida para los comandos de control de MD.** Con el indicador activado, los mensajes de comandos de control de MD (como `Dump`, `Save`, etc.) ahora esperan hasta la ventana de antirrebote antes de despacharse, en caso de que llegue un webhook de carga útil. Los comandos de chat de grupo mantienen el despacho instantáneo.
    - **La salida fusionada está limitada** — el texto fusionado tiene un límite de 4000 caracteres con un marcador `…[truncated]` explícito; los archivos adjuntos tienen un límite de 20; las entradas de origen tienen un límite de 10 (se retienen la primera y la última más allá de eso). Cada `messageId` de origen todavía alcanza la deduplicación de entrada, por lo que una repetición posterior de MessagePoller de cualquier evento individual se reconoce como un duplicado.
    - **Optativo, por canal.** Otros canales (Telegram, WhatsApp, Slack, ...) no se ven afectados.
  </Tab>
</Tabs>

### Escenarios y lo que ve el agente

| Usuario compone                                                                            | Apple entrega                   | Indicador desactivado (predeterminado)           | Indicador activado + ventana de 2500 ms                                                     |
| ------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envío)                                                      | 2 webhooks a ~1 s de diferencia | Dos turnos del agente: "Dump" solo, luego la URL | Un turno: texto fusionado `Dump https://example.com`                                        |
| `Save this 📎image.jpg caption` (archivo adjunto + texto)                                  | 2 webhooks                      | Dos turnos                                       | Un turno: texto + imagen                                                                    |
| `/status` (comando independiente)                                                          | 1 webhook                       | Despacho instantáneo                             | **Esperar hasta la ventana y luego despachar**                                              |
| URL pegada sola                                                                            | 1 webhook                       | Despacho instantáneo                             | Despacho instantáneo (solo una entrada en el cubo)                                          |
| Texto + URL enviados como dos mensajes separados deliberados, a unos minutos de diferencia | 2 webhooks fuera de la ventana  | Dos turnos                                       | Dos turnos (la ventana caduca entre ellos)                                                  |
| Inundación rápida (>10 MD pequeños dentro de la ventana)                                   | N webhooks                      | N turnos                                         | Un turno, salida limitada (primero + último, se aplican límites de texto/archivos adjuntos) |

### Solución de problemas de la fusión de envíos divididos

Si el indicador está activado y los envíos divididos siguen llegando como dos turnos, verifique cada capa:

<AccordionGroup>
  <Accordion title="Configuración realmente cargada">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    Luego `openclaw gateway restart` — el indicador se lee en la creación del registro de debouncer.

  </Accordion>
  <Accordion title="Ventana de debouncer lo suficientemente ancha para tu configuración">
    Mira el registro del servidor BlueBubbles en `~/Library/Logs/bluebubbles-server/main.log`:

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    Mide la brecha entre el envío de texto estilo `"Dump"` y el envío `"https://..."; Attachments:` que sigue. Aumenta `messages.inbound.byChannel.bluebubbles` para cubrir cómodamente esa brecha.

  </Accordion>
  <Accordion title="Marcas de tiempo de JSONL de sesión ≠ llegada del webhook">
    Las marcas de tiempo de los eventos de sesión (`~/.openclaw/agents/<id>/sessions/*.jsonl`) reflejan cuándo la puerta de enlace entrega un mensaje al agente, **no** cuándo llegó el webhook. Un mensaje en cola segundo etiquetado como `[Queued messages while agent was busy]` significa que el primer turno aún se estaba ejecutando cuando llegó el segundo webhook — el cubo de fusión ya se había vaciado. Ajusta la ventana según el registro del servidor BB, no el registro de sesión.
  </Accordion>
  <Accordion title="Presión de memoria ralentizando el envío de respuestas">
    En máquinas más pequeñas (8 GB), los turnos del agente pueden tardar lo suficiente como para que el cubo de fusión se vacíe antes de que se complete la respuesta, y la URL llegue como un segundo turno en cola. Verifica `memory_pressure` y `ps -o rss -p $(pgrep openclaw-gateway)`; si la puerta de enlace supera los ~500 MB de RSS y el compresor está activo, cierra otros procesos pesados o cambia a un host más grande.
  </Accordion>
  <Accordion title="Los envíos de cita de respuesta son una ruta diferente">
    Si el usuario tocó `Dump` como una **respuesta** a un globo de URL existente (iMessage muestra una insignia "1 Reply" en el globo de Dump), la URL vive en `replyToBody`, no en un segundo webhook. La fusión no se aplica — eso es un asunto de habilidad/prompt, no un asunto de debouncer.
  </Accordion>
</AccordionGroup>

## Streaming por bloques

Controla si las respuestas se envían como un único mensaje o se transmiten en bloques:

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
- El texto saliente se divide en `channels.bluebubbles.textChunkLimit` (predeterminado: 4000 caracteres).

## Referencia de configuración

Configuración completa: [Configuration](/es/gateway/configuration)

<AccordionGroup>
  <Accordion title="Conexión y webhook">
    - `channels.bluebubbles.enabled`: Habilitar/deshabilitar el canal.
    - `channels.bluebubbles.serverUrl`: URL base de la API REST de BlueBubbles.
    - `channels.bluebubbles.password`: Contraseña de la API.
    - `channels.bluebubbles.webhookPath`: Ruta del endpoint del webhook (predeterminado: `/bluebubbles-webhook`).
  </Accordion>
  <Accordion title="Política de acceso">
    - `channels.bluebubbles.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).
    - `channels.bluebubbles.allowFrom`: Lista blanca de MD (identificadores, correos electrónicos, números E.164, `chat_id:*`, `chat_guid:*`).
    - `channels.bluebubbles.groupPolicy`: `open | allowlist | disabled` (predeterminado: `allowlist`).
    - `channels.bluebubbles.groupAllowFrom`: Lista blanca de remitentes de grupos.
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts`: En macOS, opcionalmente enriquecer a los participantes del grupo sin nombre desde los Contactos locales después de pasar el filtrado. Predeterminado: `false`.
    - `channels.bluebubbles.groups`: Configuración por grupo (`requireMention`, etc.).
  </Accordion>
  <Accordion title="Entrega y fragmentación">
    - `channels.bluebubbles.sendReadReceipts`: Enviar confirmaciones de lectura (predeterminado: `true`).
    - `channels.bluebubbles.blockStreaming`: Habilitar transmisión por bloques (predeterminado: `false`; necesario para respuestas en transmisión).
    - `channels.bluebubbles.textChunkLimit`: Tamaño de fragmento de salida en caracteres (predeterminado: 4000).
    - `channels.bluebubbles.sendTimeoutMs`: Tiempo de espera por solicitud en ms para envíos de texto de salida a través de `/api/v1/message/text` (predeterminado: 30000). Aumente en configuraciones de macOS 26 donde los envíos de iMessage de la API privada pueden detenerse durante más de 60 segundos dentro del marco de iMessage; por ejemplo `45000` o `60000`. Las sondas, búsquedas de chat, reacciones, ediciones y verificaciones de salud actualmente mantienen el predeterminado más corto de 10 s; se planea ampliar la cobertura a reacciones y ediciones como seguimiento. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`.
    - `channels.bluebubbles.chunkMode`: `length` (predeterminado) divide solo cuando excede `textChunkLimit`; `newline` divide en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
  </Accordion>
  <Accordion title="Medios e historial">
    - `channels.bluebubbles.mediaMaxMb`: Límite de medios de entrada/salida en MB (predeterminado: 8).
    - `channels.bluebubbles.mediaLocalRoots`: Lista de permitidos explícita de directorios locales absolutos permitidos para rutas de medios locales de salida. Los envíos de rutas locales se deniegan de forma predeterminada a menos que esto esté configurado. Anulación por cuenta: `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
    - `channels.bluebubbles.coalesceSameSenderDms`: Combinar webhooks consecutivos de MD del mismo remitente en una sola turno del agente para que el envío dividido de texto+URL de Apple llegue como un solo mensaje (predeterminado: `false`). Consulte [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) para ver escenarios, ajustes de ventana y compensaciones. Amplía la ventana de rebote de entrada predeterminada de 500 ms a 2500 ms cuando se habilita sin un `messages.inbound.byChannel.bluebubbles` explícito.
    - `channels.bluebubbles.historyLimit`: Máximo de mensajes de grupo para el contexto (0 deshabilita).
    - `channels.bluebubbles.dmHistoryLimit`: Límite de historial de MD.
  </Accordion>
  <Accordion title="Acciones y cuentas">
    - `channels.bluebubbles.actions`: Habilitar/deshabilitar acciones específicas.
    - `channels.bluebubbles.accounts`: Configuración multicuenta.
  </Accordion>
</AccordionGroup>

Opciones globales relacionadas:

- `agents.list[].groupChat.mentionPatterns` (o `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Direccionamiento / objetivos de entrega

Prefiera `chat_guid` para un enrutamiento estable:

- `chat_guid:iMessage;-;+15555550123` (preferido para grupos)
- `chat_id:123`
- `chat_identifier:...`
- Identificadores directos: `+15555550123`, `user@example.com`
  - Si un identificador directo no tiene un chat de MD existente, OpenClaw creará uno a través de `POST /api/v1/chat/new`. Esto requiere que la API privada de BlueBubbles esté habilitada.

### Enrutamiento iMessage vs SMS

Cuando el mismo identificador tiene tanto un chat de iMessage como uno de SMS en el Mac (por ejemplo, un número de teléfono que está registrado en iMessage pero también ha recibido respaldo de burbujas verdes), OpenClaw prefiere el chat de iMessage y nunca degrada silenciosamente a SMS. Para forzar el chat SMS, use un prefijo de destino `sms:` explícito (por ejemplo `sms:+15555550123`). Los identificadores sin un chat de iMessage coincidente aún se envían a través de cualquier chat que BlueBubbles reporte.

## Seguridad

- Las solicitudes de webhook se autentican comparando los parámetros de consulta o encabezados `guid`/`password` contra `channels.bluebubbles.password`.
- Mantenga la contraseña de la API y el punto final del webhook en secreto (trátelos como credenciales).
- No hay una derivación de localhost para la autenticación de webhook de BlueBubbles. Si proxea el tráfico del webhook, mantenga la contraseña de BlueBubbles en la solicitud de extremo a extremo. `gateway.trustedProxies` no reemplaza a `channels.bluebubbles.password` aquí. Consulte [Seguridad de la puerta de enlace](/es/gateway/security#reverse-proxy-configuration).
- Habilite HTTPS + reglas de firewall en el servidor BlueBubbles si lo expone fuera de su LAN.

## Solución de problemas

- Si los eventos de escritura/lectura dejan de funcionar, verifique los registros de webhook de BlueBubbles y verifique que la ruta de la puerta de enlace coincida con `channels.bluebubbles.webhookPath`.
- Los códigos de emparejamiento expiran después de una hora; use `openclaw pairing list bluebubbles` y `openclaw pairing approve bluebubbles <code>`.
- Las reacciones requieren la API privada de BlueBubbles (`POST /api/v1/message/react`); asegúrese de que la versión del servidor la exponga.
- Las funciones de editar/no enviar requieren macOS 13+ y una versión compatible del servidor BlueBubbles. En macOS 26 (Tahoe), la edición está actualmente rota debido a cambios en la API privada.
- Las actualizaciones del icono del grupo pueden ser inestables en macOS 26 (Tahoe): la API puede devolver éxito pero el nuevo icono no se sincroniza.
- OpenClaw oculta automáticamente las acciones conocidas como rotas según la versión de macOS del servidor BlueBubbles. Si la edición todavía aparece en macOS 26 (Tahoe), desactívela manualmente con `channels.bluebubbles.actions.edit=false`.
- `coalesceSameSenderDms` habilitado pero los envíos divididos (por ejemplo, `Dump` + URL) todavía llegan como dos turnos: consulte la lista de verificación de [solución de problemas de combinación de envíos divididos](#split-send-coalescing-troubleshooting) — las causas comunes son una ventana de antirrebote demasiado ajustada, marcas de tiempo del registro de sesión leídas incorrectamente como la llegada del webhook, o un envío de cita de respuesta (que usa `replyToBody`, no un segundo webhook).
- Para obtener información de estado/salud: `openclaw status --all` o `openclaw status --deep`.

Para obtener una referencia general del flujo de trabajo del canal, consulte [Canales](/es/channels) y la guía de [Complementos](/es/tools/plugin).

## Relacionado

- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y control de menciones
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento

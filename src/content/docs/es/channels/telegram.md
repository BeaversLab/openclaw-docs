---
summary: "Estado de soporte del bot de Telegram, capacidades y configuración"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

Estado: listo para producción para MDs de bots + grupos mediante grammY. El sondeo largo (long polling) es el modo predeterminado; el modo webhook es opcional.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política predeterminada de MD para Telegram es el emparejamiento.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card title="Configuración del gateway" icon="settings" href="/es/gateway/configuration">
    Patrones y ejemplos completos de configuración del canal.
  </Card>
</CardGroup>

## Configuración rápida

<Steps>
  <Step title="Crear el token del bot en BotFather">
    Abre Telegram y chatea con **@BotFather** (confirma que el identificador sea exactamente `@BotFather`).

    Ejecuta `/newbot`, sigue las instrucciones y guarda el token.

  </Step>

  <Step title="Configurar token y política de MD">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    Alternativa de entorno: `TELEGRAM_BOT_TOKEN=...` (solo cuenta predeterminada).
    Telegram **no** usa `openclaw channels login telegram`; configura el token en config/env, luego inicia la puerta de enlace.

  </Step>

  <Step title="Iniciar el gateway y aprobar el primer MD">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Los códigos de emparejamiento caducan después de 1 hora.

  </Step>

  <Step title="Añadir el bot a un grupo">
    Añade el bot a tu grupo, luego configura `channels.telegram.groups` y `groupPolicy` para que coincidan con tu modelo de acceso.
  </Step>
</Steps>

<Note>El orden de resolución de tokens es consciente de la cuenta. En la práctica, los valores de configuración tienen prioridad sobre la alternativa de entorno, y `TELEGRAM_BOT_TOKEN` solo se aplica a la cuenta predeterminada.</Note>

## Configuración del lado de Telegram

<AccordionGroup>
  <Accordion title="Modo de privacidad y visibilidad de grupos">
    Los bots de Telegram tienen por defecto el **Modo de privacidad**, que limita los mensajes de grupo que reciben.

    Si el bot debe ver todos los mensajes del grupo, haz lo siguiente:

    - desactiva el modo de privacidad mediante `/setprivacy`, o
    - convierte al bot en administrador del grupo.

    Al alternar el modo de privacidad, elimina y vuelve a añadir el bot en cada grupo para que Telegram aplique el cambio.

  </Accordion>

  <Accordion title="Permisos de grupo">
    El estado de administrador se controla en la configuración del grupo de Telegram.

    Los bots administradores reciben todos los mensajes del grupo, lo cual es útil para un comportamiento de grupo siempre activo.

  </Accordion>

  <Accordion title="Interruptores útiles de BotFather">

    - `/setjoingroups` para permitir/denegar adiciones a grupos
    - `/setprivacy` para el comportamiento de visibilidad de grupos

  </Accordion>
</AccordionGroup>

## Control de acceso y activación

<Tabs>
  <Tab title="Política de MD">
    `channels.telegram.dmPolicy` controla el acceso a mensajes directos:

    - `pairing` (predeterminado)
    - `allowlist` (requiere al menos un ID de remitente en `allowFrom`)
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` acepta IDs numéricos de usuarios de Telegram. Los prefijos `telegram:` / `tg:` se aceptan y normalizan.
    `dmPolicy: "allowlist"` con un `allowFrom` vacío bloquea todos los MD y es rechazado por la validación de la configuración.
    La configuración solicita solo IDs numéricos de usuario.
    Si actualizaste y tu configuración contiene entradas de lista blanca `@username`, ejecuta `openclaw doctor --fix` para resolverlas (mejor esfuerzo; requiere un token de bot de Telegram).
    Si anteriormente dependías de archivos de lista blanca de pairing-store, `openclaw doctor --fix` puede recuperar entradas en `channels.telegram.allowFrom` en flujos de lista blanca (por ejemplo, cuando `dmPolicy: "allowlist"` aún no tiene IDs explícitos).

    Para bots de un solo propietario, prefiere `dmPolicy: "allowlist"` con IDs numéricos explícitos de `allowFrom` para mantener la política de acceso duradera en la configuración (en lugar de depender de aprobaciones de emparejamiento previas).

    Confusión común: la aprobación de emparejamiento de MD no significa "este remitente está autorizado en todas partes".
    El emparejamiento otorga solo acceso a MD. La autorización de remitentes de grupos aún proviene de listas blancas explícitas de configuración.
    Si deseas "Estoy autorizado una vez y tanto los MD como los comandos de grupo funcionan", pon tu ID numérico de usuario de Telegram en `channels.telegram.allowFrom`.

    ### Encontrar tu ID de usuario de Telegram

    Más seguro (sin bot de terceros):

    1. Envía un MD a tu bot.
    2. Ejecuta `openclaw logs --follow`.
    3. Lee `from.id`.

    Método oficial de Bot API:

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    Método de terceros (menos privado): `@userinfobot` o `@getidsbot`.

  </Tab>

  <Tab title="Política de grupo y listas de permitidos">
    Dos controles se aplican juntos:

    1. **Qué grupos están permitidos** (`channels.telegram.groups`)
       - sin configuración `groups`:
         - con `groupPolicy: "open"`: cualquier grupo puede pasar las comprobaciones de ID de grupo
         - con `groupPolicy: "allowlist"` (predeterminado): los grupos están bloqueados hasta que añadas entradas `groups` (o `"*"`)
       - `groups` configurado: actúa como lista de permitidos (IDs explícitos o `"*"`)

    2. **Qué remitentes están permitidos en los grupos** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (predeterminado)
       - `disabled`

    `groupAllowFrom` se usa para el filtrado de remitentes de grupos. Si no se establece, Telegram recurre a `allowFrom`.
    Las entradas `groupAllowFrom` deben ser IDs numéricos de usuario de Telegram (los prefijos `telegram:` / `tg:` se normalizan).
    No pongas IDs de chat de grupo o supergrupo de Telegram en `groupAllowFrom`. Los IDs de chat negativos pertenecen a `channels.telegram.groups`.
    Las entradas no numéricas se ignoran para la autorización de remitentes.
    Límite de seguridad (`2026.2.25+`): la autorización de remitente de grupo **no** hereda las aprobaciones del almacenamiento de emparejamiento (pairing-store) de DM.
    El emparejamiento se mantiene solo para DM. Para grupos, establece `groupAllowFrom` o `allowFrom` por grupo/por tema.
    Si `groupAllowFrom` no está establecido, Telegram recurre a la configuración `allowFrom`, no al almacenamiento de emparejamiento.
    Patrón práctico para bots de un solo propietario: establece tu ID de usuario en `channels.telegram.allowFrom`, deja `groupAllowFrom` sin establecer y permite los grupos de destino en `channels.telegram.groups`.
    Nota de runtime: si `channels.telegram` falta completamente, el runtime usa por defecto `groupPolicy="allowlist"` de cierre seguro a menos que `channels.defaults.groupPolicy` se establezca explícitamente.

    Ejemplo: permitir cualquier miembro en un grupo específico:

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    Ejemplo: permitir solo usuarios específicos dentro de un grupo específico:

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      Error común: `groupAllowFrom` no es una lista de permitidos de grupos de Telegram.

      - Pon IDs de chat de grupo o supergrupo de Telegram negativos como `-1001234567890` bajo `channels.telegram.groups`.
      - Pon IDs de usuario de Telegram como `8734062810` bajo `groupAllowFrom` cuando quieras limitar qué personas dentro de un grupo permitido pueden activar el bot.
      - Usa `groupAllowFrom: ["*"]` solo cuando quieras que cualquier miembro de un grupo permitido pueda hablar con el bot.
    </Warning>

  </Tab>

  <Tab title="Mention behavior">
    Las respuestas en grupos requieren una mención de forma predeterminada.

    La mención puede provenir de:

    - mención nativa de `@botusername`, o
    - patrones de mención en:
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Interruptores de comandos a nivel de sesión:

    - `/activation always`
    - `/activation mention`

    Estos actualizan solo el estado de la sesión. Use la configuración para la persistencia.

    Ejemplo de configuración persistente:

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    Obtener el ID del chat del grupo:

    - reenviar un mensaje del grupo a `@userinfobot` / `@getidsbot`
    - o leer `chat.id` de `openclaw logs --follow`
    - o inspeccionar la Bot API `getUpdates`

  </Tab>
</Tabs>

## Comportamiento en tiempo de ejecución

- Telegram es propiedad del proceso de puerta de enlace.
- El enrutamiento es determinista: las respuestas entrantes de Telegram vuelven a Telegram (el modelo no elige canales).
- Los mensajes entrantes se normalizan en el sobre del canal compartido con metadatos de respuesta y marcadores de posición de medios.
- Las sesiones de grupo están aisladas por el ID del grupo. Los temas del foro agregan `:topic:<threadId>` para mantener los temas aislados.
- Los mensajes DM pueden llevar `message_thread_id`; OpenClaw los enruta con claves de sesión conscientes del hilo y conserva el ID del hilo para las respuestas.
- El sondeo largo utiliza el ejecutor grammY con secuenciación por chat/hilo. La concurrencia general del sumidero del ejecutor utiliza `agents.defaults.maxConcurrent`.
- Los reinicios del perro guardián de sondeo largo se activan después de 120 segundos sin actividad de `getUpdates` completada de forma predeterminada. Aumente `channels.telegram.pollingStallThresholdMs` solo si su implementación aún experimenta reinicios falsos por detención del sondeo durante trabajos de larga duración. El valor está en milisegundos y se permite desde `30000` hasta `600000`; se admiten anulaciones por cuenta.
- La Bot API de Telegram no es compatible con confirmaciones de lectura (`sendReadReceipts` no se aplica).

## Referencia de características

<AccordionGroup>
  <Accordion title="Vista previa de transmisión en vivo (ediciones de mensajes)">
    OpenClaw puede transmitir respuestas parciales en tiempo real:

    - chats directos: mensaje de vista previa + `editMessageText`
    - grupos/temas: mensaje de vista previa + `editMessageText`

    Requisitos:

    - `channels.telegram.streaming` es `off | partial | block | progress` (predeterminado: `partial`)
    - `progress` se asigna a `partial` en Telegram (compatibilidad con la nomenclatura entre canales)
    - `streaming.preview.toolProgress` controla si las actualizaciones de herramientas/progreso reutilizan el mismo mensaje de vista previa editado (predeterminado: `true`). Configure `false` para mantener mensajes de herramientas/progreso separados.
    - los valores heredados de `channels.telegram.streamMode` y booleanos de `streaming` se asignan automáticamente

    Para respuestas solo de texto:

    - MD: OpenClaw mantiene el mismo mensaje de vista previa y realiza una edición final en el lugar (sin segundo mensaje)
    - grupo/tema: OpenClaw mantiene el mismo mensaje de vista previa y realiza una edición final en el lugar (sin segundo mensaje)

    Para respuestas complejas (por ejemplo, cargas útiles de medios), OpenClaw recurre a la entrega final normal y luego limpia el mensaje de vista previa.

    La transmisión de vista previa es independiente de la transmisión de bloques. Cuando la transmisión de bloques está explícitamente habilitada para Telegram, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

    Si el transporte de borrador nativo no está disponible o es rechazado, OpenClaw recurre automáticamente a `sendMessage` + `editMessageText`.

    Flujo de razonamiento exclusivo de Telegram:

    - `/reasoning stream` envía el razonamiento a la vista previa en vivo mientras se genera
    - la respuesta final se envía sin el texto de razonamiento

  </Accordion>

  <Accordion title="Formato y respaldo HTML">
    El texto saliente utiliza el `parse_mode: "HTML"` de Telegram.

    - El texto tipo Markdown se procesa como HTML seguro para Telegram.
    - El modelo HTML sin procesar se escapa para reducir los fallos de análisis de Telegram.
    - Si Telegram rechaza el HTML analizado, OpenClaw vuelve a intentarlo como texto sin formato.

    Las vistas previas de enlaces están habilitadas de forma predeterminada y se pueden deshabilitar con `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Comandos nativos y comandos personalizados">
    El registro del menú de comandos de Telegram se maneja al inicio con `setMyCommands`.

    Valores predeterminados de comandos nativos:

    - `commands.native: "auto"` habilita los comandos nativos para Telegram

    Agregar entradas de comandos de menú personalizados:

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

    Reglas:

    - los nombres se normalizan (eliminar `/` inicial, minúsculas)
    - patrón válido: `a-z`, `0-9`, `_`, longitud `1..32`
    - los comandos personalizados no pueden anular los comandos nativos
    - los conflictos/duplicados se omiten y registran

    Notas:

    - los comandos personalizados son solo entradas de menú; no implementan automáticamente el comportamiento
    - los comandos de complemento/habilidad aún pueden funcionar al escribirse, incluso si no se muestran en el menú de Telegram

    Si los comandos nativos están deshabilitados, los integrados se eliminan. Los comandos personalizados/de complementos aún pueden registrarse si están configurados.

    Fallos comunes de configuración:

    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú de Telegram todavía se desbordó después de recortar; reduzca los comandos de complemento/habilidad/personalizados o deshabilite `channels.telegram.commands.native`.
    - `setMyCommands failed` con errores de red/recuperación generalmente significa que el DNS/HTTPS saliente a `api.telegram.org` está bloqueado.

    ### Comandos de emparejamiento de dispositivos (complemento `device-pair`)

    Cuando el complemento `device-pair` está instalado:

    1. `/pair` genera el código de configuración
    2. pegue el código en la aplicación de iOS
    3. `/pair pending` enumera las solicitudes pendientes (incluyendo rol/ámbitos)
    4. apruebe la solicitud:
       - `/pair approve <requestId>` para aprobación explícita
       - `/pair approve` cuando solo hay una solicitud pendiente
       - `/pair approve latest` para la más reciente

    El código de configuración lleva un token de arranque de corta duración. El traspaso de arranque integrado mantiene el token del nodo principal en `scopes: []`; cualquier token de operador traspasado permanece limitado a `operator.approvals`, `operator.read`, `operator.talk.secrets` y `operator.write`. Las comprobaciones de ámbito de arranque tienen prefijo de rol, por lo que la lista de permitidos de operador solo satisface las solicitudes de operador; los roles que no son operadores aún necesitan ámbitos bajo su propio prefijo de rol.

    Si un dispositivo reintenta con detalles de autenticación cambiados (por ejemplo, rol/ámbitos/clave pública), la solicitud pendiente anterior es reemplazada y la nueva solicitud usa un `requestId` diferente. Vuelva a ejecutar `/pair pending` antes de aprobar.

    Más detalles: [Emparejamiento](/es/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Botones en línea">
    Configurar el ámbito del teclado en línea:

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    Anulación por cuenta:

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    Ámbitos:

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (predeterminado)

    El parámetro heredado `capabilities: ["inlineButtons"]` se asigna a `inlineButtons: "all"`.

    Ejemplo de acción de mensaje:

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  buttons: [
    [
      { text: "Yes", callback_data: "yes" },
      { text: "No", callback_data: "no" },
    ],
    [{ text: "Cancel", callback_data: "cancel" }],
  ],
}
```

    Las pulsaciones de devolución de llamada se pasan al agente como texto:
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Acciones de mensajes de Telegram para agentes y automatización">
    Las acciones de herramientas de Telegram incluyen:

    - `sendMessage` (`to`, `content`, `mediaUrl` opcional, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, `iconColor` opcional, `iconCustomEmojiId`)

    Las acciones de mensajes del canal exponen alias ergonómicos (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Controles de acceso (Gating controls):

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (predeterminado: deshabilitado)

    Nota: `edit` y `topic-create` están habilitados por defecto actualmente y no tienen interruptores `channels.telegram.actions.*` separados.
    Los envíos en tiempo de ejecución utilizan la instantánea activa de configuración/secrets (inicio/recarga), por lo que las rutas de acción no realizan una re-resolución ad-hoc de SecretRef por cada envío.

    Semántica de eliminación de reacciones: [/tools/reactions](/es/tools/reactions)

  </Accordion>

  <Accordion title="Etiquetas de hilos de respuesta">
    Telegram admite etiquetas explícitas de hilos de respuesta en la salida generada:

    - `[[reply_to_current]]` responde al mensaje desencadenante
    - `[[reply_to:<id>]]` responde a un ID de mensaje específico de Telegram

    `channels.telegram.replyToMode` controla el manejo:

    - `off` (predeterminado)
    - `first`
    - `all`

    Nota: `off` deshabilita los hilos de respuesta implícitos. Las etiquetas `[[reply_to_*]]` explícitas todavía se respetan.

  </Accordion>

  <Accordion title="Temas del foro y comportamiento de los hilos">
    Supergrupos del foro:

    - las claves de sesión del tema añaden `:topic:<threadId>`
    - las respuestas y la escritura (typing) tienen como objetivo el hilo del tema
    - ruta de configuración del tema:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Caso especial del tema general (`threadId=1`):

    - los envíos de mensajes omiten `message_thread_id` (Telegram rechaza `sendMessage(...thread_id=1)`)
    - las acciones de escritura aún incluyen `message_thread_id`

    Herencia del tema: las entradas del tema heredan la configuración del grupo a menos que se anulen (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` es exclusivo del tema y no hereda de los valores predeterminados del grupo.

    **Enrutamiento de agente por tema**: Cada tema puede enrutar a un agente diferente estableciendo `agentId` en la configuración del tema. Esto da a cada tema su propio espacio de trabajo aislado, memoria y sesión. Ejemplo:

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // General topic → main agent
                "3": { agentId: "zu" },        // Dev topic → zu agent
                "5": { agentId: "coder" }      // Code review → coder agent
              }
            }
          }
        }
      }
    }
    ```

    Cada tema tiene entonces su propia clave de sesión: `agent:zu:telegram:group:-1001234567890:topic:3`

    **Vinculación persistente de ACP al tema**: Los temas del foro pueden fijar sesiones del arnés de ACP mediante vinculaciones ACP tipadas de nivel superior:

    - `bindings[]` con `type: "acp"` y `match.channel: "telegram"`

    Ejemplo:

    ```json5
    {
      agents: {
        list: [
          {
            id: "codex",
            runtime: {
              type: "acp",
              acp: {
                agent: "codex",
                backend: "acpx",
                mode: "persistent",
                cwd: "/workspace/openclaw",
              },
            },
          },
        ],
      },
      bindings: [
        {
          type: "acp",
          agentId: "codex",
          match: {
            channel: "telegram",
            accountId: "default",
            peer: { kind: "group", id: "-1001234567890:topic:42" },
          },
        },
      ],
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "42": {
                  requireMention: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    Esto actualmente está limitado a temas del foro en grupos y supergrupos.

    **Generación de ACP ligada al hilo desde el chat**:

    - `/acp spawn <agent> --thread here|auto` puede vincular el tema actual de Telegram a una nueva sesión de ACP.
    - Los mensajes posteriores del tema se enrutan directamente a la sesión de ACP vinculada (no se requiere `/acp steer`).
    - OpenClaw fija el mensaje de confirmación de generación en el tema después de una vinculación exitosa.
    - Requiere `channels.telegram.threadBindings.spawnAcpSessions=true`.

    El contexto de la plantilla incluye:

    - `MessageThreadId`
    - `IsForum`

    Comportamiento del hilo de MD:

    - los chats privados con `message_thread_id` mantienen el enrutamiento de MD pero usan claves de sesión/destinos de respuesta conscientes del hilo.

  </Accordion>

  <Accordion title="Audio, video y pegatinas">
    ### Mensajes de audio

    Telegram distingue entre notas de voz y archivos de audio.

    - predeterminado: comportamiento de archivo de audio
    - etiqueta `[[audio_as_voice]]` en la respuesta del agente para forzar el envío de nota de voz

    Ejemplo de acción de mensaje:

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### Mensajes de video

    Telegram distingue entre archivos de video y notas de video.

    Ejemplo de acción de mensaje:

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    Las notas de video no admiten subtítulos; el texto del mensaje proporcionado se envía por separado.

    ### Pegatinas

    Manejo de pegatinas entrantes:

    - WEBP estático: descargado y procesado (marcador de posición `<media:sticker>`)
    - TGS animado: omitido
    - WEBM de video: omitido

    Campos de contexto de pegatinas:

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Archivo de caché de pegatinas:

    - `~/.openclaw/telegram/sticker-cache.json`

    Las pegatinas se describen una vez (cuando es posible) y se almacenan en caché para reducir las llamadas de visión repetidas.

    Habilitar acciones de pegatinas:

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    Enviar acción de pegatina:

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Buscar pegatinas en caché:

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Notificaciones de reacciones">
    Las reacciones de Telegram llegan como actualizaciones `message_reaction` (separadas de las cargas útiles de mensajes).

    Cuando están habilitadas, OpenClaw pone en cola eventos del sistema como:

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Configuración:

    - `channels.telegram.reactionNotifications`: `off | own | all` (por defecto: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (por defecto: `minimal`)

    Notas:

    - `own` significa solo reacciones de los usuarios a mensajes enviados por el bot (mejor esfuerzo a través del caché de mensajes enviados).
    - Los eventos de reacción todavía respetan los controles de acceso de Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`); los remitentes no autorizados son descartados.
    - Telegram no proporciona IDs de hilo en las actualizaciones de reacción.
      - los grupos que no son foro se dirigen a la sesión de chat grupal
      - los grupos foro se dirigen a la sesión del tema general del grupo (`:topic:1`), no al tema de origen exacto

    `allowed_updates` para polling/webhook incluyen `message_reaction` automáticamente.

  </Accordion>

  <Accordion title="Reacciones de acuse">
    `ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

    Orden de resolución:

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - emoji de respaldo de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Telegram espera un emoji unicode (por ejemplo "👀").
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Escrituras de configuración desde eventos y comandos de Telegram">
    Las escrituras de configuración del canal están habilitadas por defecto (`configWrites !== false`).

    Las escrituras activadas por Telegram incluyen:

    - eventos de migración de grupo (`migrate_to_chat_id`) para actualizar `channels.telegram.groups`
    - `/config set` y `/config unset` (requiere habilitación de comandos)

    Deshabilitar:

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

<Accordion title="Autorización del selector de modelo en grupos">Los botones en línea del selector de modelo en el grupo requieren la misma autorización que `/models`. Los participantes no autorizados pueden navegar y pulsar los botones, pero OpenClaw rechaza la devolución de llamada antes de cambiar el modelo de la sesión.</Accordion>

  <Accordion title="Encuesta larga vs webhook">
    Por defecto: encuesta larga.

    Modo webhook:

    - establecer `channels.telegram.webhookUrl`
    - establecer `channels.telegram.webhookSecret` (requerido cuando se establece la URL del webhook)
    - opcional `channels.telegram.webhookPath` (por defecto `/telegram-webhook`)
    - opcional `channels.telegram.webhookHost` (por defecto `127.0.0.1`)
    - opcional `channels.telegram.webhookPort` (por defecto `8787`)

    El escucha local por defecto para el modo webhook se enlaza a `127.0.0.1:8787`.

    Si su punto final público difiere, coloque un proxy inverso delante y apunte `webhookUrl` a la URL pública.
    Establezca `webhookHost` (por ejemplo `0.0.0.0`) cuando intencionalmente necesite entrada externa.

    La devolución de llamada del webhook de grammY devuelve un 200 dentro de 5 segundos para que Telegram no reintente las actualizaciones de larga duración como tiempos de espera de lectura; el trabajo más largo continúa en segundo plano. La encuesta reconstruye el transporte HTTP después de `getUpdates` conflictos 409, por lo que los reintentos usan una conexión TCP nueva en lugar de hacer bucle en un socket keep-alive terminado por Telegram.

  </Accordion>

  <Accordion title="Límites, reintentos y destinos de CLI">
    - `channels.telegram.textChunkLimit` el valor predeterminado es 4000.
    - `channels.telegram.chunkMode="newline"` prefiere los límites de párrafo (líneas en blanco) antes de la división por longitud.
    - `channels.telegram.mediaMaxMb` (predeterminado 100) limita el tamaño de los medios de entrada y salida de Telegram.
    - `channels.telegram.timeoutSeconds` anula el tiempo de espera del cliente de la API de Telegram (si no se establece, se aplica el valor predeterminado de grammY).
    - `channels.telegram.pollingStallThresholdMs` el valor predeterminado es `120000`; ajústelo entre `30000` y `600000` solo para reinicios por detenciones de sondeo falsos positivos.
    - el historial de contexto de grupo usa `channels.telegram.historyLimit` o `messages.groupChat.historyLimit` (predeterminado 50); `0` lo desactiva.
    - el contexto complementario de respuesta/cita/reenvío se pasa actualmente tal como se recibe.
    - las listas de permitidos de Telegram controlan principalmente quién puede activar al agente, no un límite completo de redacción de contexto complementario.
    - controles de historial de MD:
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuración `channels.telegram.retry` se aplica a los asistentes de envío de Telegram (CLI/herramientas/acciones) para errores de API de salida recuperables.

    El destino de envío de CLI puede ser una ID de chat numérica o un nombre de usuario:

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Las encuestas de Telegram usan `openclaw message poll` y admiten temas del foro:

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Indicadores de encuesta solo para Telegram:

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` para temas del foro (o use un destino `:topic:`)

    El envío de Telegram también admite:

    - `--presentation` con bloques `buttons` para teclados en línea cuando `channels.telegram.capabilities.inlineButtons` lo permite
    - `--pin` o `--delivery '{"pin":true}'` para solicitar entrega fijada cuando el bot puede fijar en ese chat
    - `--force-document` para enviar imágenes y GIFs de salida como documentos en lugar de cargas de fotos comprimidas o medios animados

    Bloqueo de acciones:

    - `channels.telegram.actions.sendMessage=false` desactiva los mensajes de salida de Telegram, incluidas las encuestas
    - `channels.telegram.actions.poll=false` desactiva la creación de encuestas de Telegram mientras deja habilitados los envíos regulares

  </Accordion>

  <Accordion title="Aprobaciones de ejecución en Telegram">
    Telegram admite aprobaciones de ejecución en los MD de los aprobadores y, opcionalmente, puede publicar avisos de aprobación en el chat o tema de origen.

    Ruta de configuración:

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers` (opcional; recurre a los IDs numéricos de propietario inferidos de `allowFrom` y `defaultTo` directo cuando sea posible)
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
    - `agentFilter`, `sessionFilter`

    Los aprobadores deben ser los ID numéricos de usuario de Telegram. Telegram habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador, ya sea desde `execApprovals.approvers` o desde la configuración numérica de propietario de la cuenta (`allowFrom` y `defaultTo` de mensaje directo). Establezca `enabled: false` para deshabilitar explícitamente Telegram como cliente de aprobación nativo. De lo contrario, las solicitudes de aprobación recurren a otras rutas de aprobación configuradas o a la política alternativa de aprobación de ejecución.

    Telegram también renderiza los botones de aprobación compartidos utilizados por otros canales de chat. El adaptador nativo de Telegram principalmente añade enrutamiento de MD al aprobador, distribución a canales/temas e indicaciones de escritura antes de la entrega.
    Cuando esos botones están presentes, son la UX principal de aprobación; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que
    las aprobaciones de chat no están disponibles o la aprobación manual es el único camino.

    Reglas de entrega:

    - `target: "dm"` envía avisos de aprobación solo a los MD de aprobadores resueltos
    - `target: "channel"` envía el aviso de vuelta al chat/tema de Telegram de origen
    - `target: "both"` envía a los MD de aprobadores y al chat/tema de origen

    Solo los aprobadores resueltos pueden aprobar o denegar. Los no aprobadores no pueden usar `/approve` ni los botones de aprobación de Telegram.

    Comportamiento de resolución de aprobación:

    - Los ID con el prefijo `plugin:` siempre se resuelven a través de aprobaciones de complementos.
    - Otros ID de aprobación intentan `exec.approval.resolve` primero.
    - Si Telegram también está autorizado para aprobaciones de complementos y la puerta de enlace dice
      que la aprobación de ejecución es desconocida/expirada, Telegram reintenta una vez a través de
      `plugin.approval.resolve`.
    - Las denegaciones/errores reales de aprobación de ejecución no pasan silenciosamente a la
      resolución de aprobación de complementos.

    La entrega al canal muestra el texto del comando en el chat, así que solo habilite `channel` o `both` en grupos/temas de confianza. Cuando el aviso llega a un tema de foro, OpenClaw conserva el tema tanto para el aviso de aprobación como para el seguimiento posterior a la aprobación. Las aprobaciones de ejecución caducan después de 30 minutos de forma predeterminada.

    Los botones de aprobación en línea también dependen de que `channels.telegram.capabilities.inlineButtons` permita la superficie de destino (`dm`, `group` o `all`).

    Documentos relacionados: [Aprobaciones de ejecución](/es/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Controles de respuesta de error

Cuando el agente encuentra un error de entrega o del proveedor, Telegram puede responder con el texto del error o suprimirlo. Dos claves de configuración controlan este comportamiento:

| Clave                               | Valores           | Predeterminado | Descripción                                                                                                |
| ----------------------------------- | ----------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`        | `reply` envía un mensaje de error amigable al chat. `silent` suprime las respuestas de error por completo. |
| `channels.telegram.errorCooldownMs` | número (ms)       | `60000`        | Tiempo mínimo entre respuestas de error al mismo chat. Evita el spam de errores durante interrupciones.    |

Se admiten anulaciones por cuenta, por grupo y por tema (la misma herencia que otras claves de configuración de Telegram).

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // suppress errors in this group
        },
      },
    },
  },
}
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="El bot no responde a mensajes grupales sin mención">

    - Si `requireMention=false`, el modo de privacidad de Telegram debe permitir visibilidad completa.
      - BotFather: `/setprivacy` -> Desactivar
      - luego elimina y vuelve a agregar el bot al grupo
    - `openclaw channels status` advierte cuando la configuración espera mensajes grupales sin mención.
    - `openclaw channels status --probe` puede verificar IDs de grupo numéricos explícitos; el comodín `"*"` no puede sondearse para membresía.
    - prueba rápida de sesión: `/activation always`.

  </Accordion>

  <Accordion title="El bot no ve los mensajes grupales en absoluto">

    - cuando `channels.telegram.groups` existe, el grupo debe estar listado (o incluir `"*"`)
    - verificar la membresía del bot en el grupo
    - revisar registros: `openclaw logs --follow` para ver razones de omisión

  </Accordion>

  <Accordion title="Los comandos funcionan parcialmente o no funcionan">

    - autoriza tu identidad de remitente (emparejamiento y/o ID numérico `allowFrom`)
    - la autorización de comandos aún se aplica incluso cuando la política de grupo es `open`
    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú nativo tiene demasiadas entradas; reduce los complementos/habilidades/comandos personalizados o deshabilita los menús nativos
    - `setMyCommands failed` con errores de red/fetch generalmente indica problemas de accesibilidad DNS/HTTPS hacia `api.telegram.org`

  </Accordion>

  <Accordion title="Sondeo o inestabilidad de red">

    - Node 22+ + fetch/proxy personalizado puede activar un comportamiento de aborto inmediato si los tipos de AbortSignal no coinciden.
    - Algunos hosts resuelven `api.telegram.org` a IPv6 primero; un salida IPv6 rota puede causar fallas intermitentes de la API de Telegram.
    - Si los registros incluyen `TypeError: fetch failed` o `Network request for 'getUpdates' failed!`, OpenClaw ahora reintenta estos como errores de red recuperables.
    - Si los registros incluyen `Polling stall detected`, OpenClaw reinicia el sondeo y reconstruye el transporte de Telegram después de 120 segundos sin una actividad de sondeo prolongado completada de forma predeterminada.
    - Aumente `channels.telegram.pollingStallThresholdMs` solo cuando las llamadas `getUpdates` de larga duración están sanas pero su host aún informa reinicios por detenciones falsas del sondeo. Las detenciones persistentes generalmente apuntan a problemas de proxy, DNS, IPv6 o salida TLS entre el host y `api.telegram.org`.
    - En hosts VPS con salida/TLS directa inestable, enrute las llamadas a la API de Telegram a través de `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ usa por defecto `autoSelectFamily=true` (excepto WSL2) y `dnsResultOrder=ipv4first`.
    - Si su host es WSL2 o funciona explícitamente mejor con comportamiento solo IPv4, fuerce la selección de familia:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Las respuestas de rango de referencia RFC 2544 (`198.18.0.0/15`) ya están permitidas
      para descargas de medios de Telegram de forma predeterminada. Si una IP falsa de confianza o
      un proxy transparente reescribe `api.telegram.org` a alguna otra
      dirección privada/interna/de uso especial durante las descargas de medios, puede optar
      por la exclusiva para Telegram:

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La misma opción de participación está disponible por cuenta en
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si su proxy resuelve los hosts de medios de Telegram en `198.18.x.x`, deje la
      bandera peligrosa desactivada primero. Los medios de Telegram ya permiten el rango de referencia RFC 2544
      de forma predeterminada.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` debilita las protecciones
      SSRF de medios de Telegram. Úsela solo para entornos de proxy controlados por operadores de confianza
      como Clash, Mihomo o enrutamiento fake-IP de Surge cuando sintetizan
      respuestas privadas o de uso especial fuera del rango de referencia RFC 2544.
      Déjela desactivada para el acceso normal a Internet público de Telegram.
    </Warning>

    - anulaciones de entorno (temporales):
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - Valide las respuestas DNS:

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

Más ayuda: [Solución de problemas del canal](/es/channels/troubleshooting).

## Punteros de referencia de configuración de Telegram

Referencia principal:

- `channels.telegram.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.telegram.botToken`: token del bot (BotFather).
- `channels.telegram.tokenFile`: leer token desde una ruta de archivo normal. Se rechazan los enlaces simbólicos.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento).
- `channels.telegram.allowFrom`: lista de permitidos de DM (ID de usuario numéricos de Telegram). `allowlist` requiere al menos un ID de remitente. `open` requiere `"*"`. `openclaw doctor --fix` puede resolver entradas `@username` heredadas a IDs y puede recuperar entradas de lista de permitidos desde archivos de almacenamiento de emparejamiento en flujos de migración de lista de permitidos.
- `channels.telegram.actions.poll`: habilitar o deshabilitar la creación de encuestas de Telegram (predeterminado: habilitado; aún requiere `sendMessage`).
- `channels.telegram.defaultTo`: destino predeterminado de Telegram utilizado por la CLI `--deliver` cuando no se proporciona un `--reply-to` explícito.
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (predeterminado: lista de permitidos).
- `channels.telegram.groupAllowFrom`: lista de permitidos de remitentes de grupo (ID de usuario numéricos de Telegram). `openclaw doctor --fix` puede resolver entradas `@username` heredadas a IDs. Las entradas no numéricas se ignoran en el momento de la autenticación. La autenticación de grupo no utiliza la reserva de almacenamiento de emparejamiento de DM (`2026.2.25+`).
- Precedencia de cuentas múltiples:
  - Cuando se configuran dos o más ID de cuenta, establezca `channels.telegram.defaultAccount` (o incluya `channels.telegram.accounts.default`) para hacer explícito el enrutamiento predeterminado.
  - Si no se establece ninguno, OpenClaw recurre al primer ID de cuenta normalizado y `openclaw doctor` avisa.
  - `channels.telegram.accounts.default.allowFrom` y `channels.telegram.accounts.default.groupAllowFrom` solo se aplican a la cuenta `default`.
  - Las cuentas con nombre heredan `channels.telegram.allowFrom` y `channels.telegram.groupAllowFrom` cuando los valores a nivel de cuenta no están establecidos.
  - Las cuentas con nombre no heredan `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups`: valores predeterminados por grupo + lista de permitidos (use `"*"` para valores predeterminados globales).
  - `channels.telegram.groups.<id>.groupPolicy`: anulación por grupo para groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention`: valor predeterminado de filtrado de menciones.
  - `channels.telegram.groups.<id>.skills`: filtro de habilidades (omitir = todas las habilidades, vacío = ninguna).
  - `channels.telegram.groups.<id>.allowFrom`: anulación por grupo de la lista de permitidos de remitentes.
  - `channels.telegram.groups.<id>.systemPrompt`: prompt del sistema adicional para el grupo.
  - `channels.telegram.groups.<id>.enabled`: desactivar el grupo cuando `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: anulaciones por tema (campos de grupo + `agentId` solo de tema).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`: enrutar este tema a un agente específico (anula el enrutamiento a nivel de grupo y de vinculación).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`: anulación por tema para groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: anulación por tema del filtrado de menciones.
- `bindings[]` de nivel superior con `type: "acp"` e id de tema canónico `chatId:topic:topicId` en `match.peer.id`: campos de vinculación de temas ACP persistentes (ver [ACP Agents](/es/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`: enrutar temas de MD a un agente específico (mismo comportamiento que los temas del foro).
- `channels.telegram.execApprovals.enabled`: habilitar Telegram como cliente de aprobación de exec basado en chat para esta cuenta.
- `channels.telegram.execApprovals.approvers`: IDs de usuario de Telegram permitidos para aprobar o denegar solicitudes exec. Opcional cuando `channels.telegram.allowFrom` o un `channels.telegram.defaultTo` directo ya identifica al propietario.
- `channels.telegram.execApprovals.target`: `dm | channel | both` (predeterminado: `dm`). `channel` y `both` preservan el tema de Telegram de origen cuando está presente.
- `channels.telegram.execApprovals.agentFilter`: filtro opcional de ID de agente para prompts de aprobación reenviados.
- `channels.telegram.execApprovals.sessionFilter`: filtro opcional de clave de sesión (subcadena o expresión regular) para mensajes de aprobación reenviados.
- `channels.telegram.accounts.<account>.execApprovals`: anulación por cuenta para el enrutamiento de aprobación de ejecución de Telegram y la autorización del aprobador.
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist` (predeterminado: allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`: anulación por cuenta.
- `channels.telegram.commands.nativeSkills`: habilitar/deshabilitar comandos de habilidades nativas de Telegram.
- `channels.telegram.replyToMode`: `off | first | all` (predeterminado: `off`).
- `channels.telegram.textChunkLimit`: tamaño del fragmento de salida (caracteres).
- `channels.telegram.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.telegram.linkPreview`: alternar vistas previas de enlaces para mensajes salientes (predeterminado: true).
- `channels.telegram.streaming`: `off | partial | block | progress` (vista previa de transmisión en vivo; predeterminado: `partial`; `progress` se asigna a `partial`; `block` es compatibilidad con el modo de vista previa heredado). La transmisión de vista previa de Telegram utiliza un único mensaje de vista previa que se edita en su lugar.
- `channels.telegram.streaming.preview.toolProgress`: reutilizar el mensaje de vista previa en vivo para actualizaciones de herramientas/progreso cuando la transmisión de vista previa está activa (predeterminado: `true`). Establezca `false` para mantener mensajes de herramientas/progreso separados.
- `channels.telegram.mediaMaxMb`: límite de medios de Telegram entrantes/salientes (MB, predeterminado: 100).
- `channels.telegram.retry`: política de reintentos para los asistentes de envío de Telegram (CLI/herramientas/acciones) en errores de API salientes recuperables (intentos, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily`: anular Node autoSelectFamily (true=habilitar, false=deshabilitar). De forma predeterminada, está habilitado en Node 22+, con WSL2 configurado por defecto como deshabilitado.
- `channels.telegram.network.dnsResultOrder`: anular el orden de resultados DNS (`ipv4first` o `verbatim`). De forma predeterminada, es `ipv4first` en Node 22+.
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`: opción de participación peligrosa para entornos de IP falsa de confianza o proxy transparente donde las descargas de medios de Telegram resuelven `api.telegram.org` a direcciones privadas/internas/de uso especial fuera del permiso del rango de referencia RFC 2544 predeterminado.
- `channels.telegram.proxy`: URL del proxy para llamadas a la API de Bot (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: activar el modo webhook (requiere `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret`: secreto del webhook (requerido cuando se establece webhookUrl).
- `channels.telegram.webhookPath`: ruta local del webhook (predeterminado `/telegram-webhook`).
- `channels.telegram.webhookHost`: host de enlace local del webhook (predeterminado `127.0.0.1`).
- `channels.telegram.webhookPort`: puerto de enlace local del webhook (predeterminado `8787`).
- `channels.telegram.actions.reactions`: controlar las reacciones de las herramientas de Telegram.
- `channels.telegram.actions.sendMessage`: controlar los envíos de mensajes de las herramientas de Telegram.
- `channels.telegram.actions.deleteMessage`: controlar las eliminaciones de mensajes de las herramientas de Telegram.
- `channels.telegram.actions.sticker`: controlar las acciones de pegatinas de Telegram — enviar y buscar (predeterminado: false).
- `channels.telegram.reactionNotifications`: `off | own | all` — controlar qué reacciones activan eventos del sistema (predeterminado: `own` si no se establece).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — controlar la capacidad de reacción del agente (predeterminado: `minimal` si no se establece).
- `channels.telegram.errorPolicy`: `reply | silent` — controlar el comportamiento de respuesta de error (predeterminado: `reply`). Se admiten anulaciones por cuenta/grupo/tema.
- `channels.telegram.errorCooldownMs`: ms mínimos entre respuestas de error al mismo chat (predeterminado: `60000`). Evita el spam de errores durante interrupciones.

- [Referencia de configuración - Telegram](/es/gateway/configuration-reference#telegram)

Campos de alta señal específicos de Telegram:

- inicio de sesión/autorización: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` debe apuntar a un archivo regular; los enlaces simbólicos son rechazados)
- control de acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de nivel superior (`type: "acp"`)
- aprobaciones de ejecución: `execApprovals`, `accounts.*.execApprovals`
- comando/menú: `commands.native`, `commands.nativeSkills`, `customCommands`
- hilos/respuestas: `replyToMode`
- transmisión: `streaming` (vista previa), `streaming.preview.toolProgress`, `blockStreaming`
- formato/entrega: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- medios/red: `mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- acciones/capacidades: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reacciones: `reactionNotifications`, `reactionLevel`
- errores: `errorPolicy`, `errorCooldownMs`
- escritos/historial: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Seguridad](/es/gateway/security)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)

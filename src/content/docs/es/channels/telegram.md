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
    Telegram **no** usa `openclaw channels login telegram`; configura el token en config/env, luego inicia el gateway.

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

    - desactiva el modo de privacidad a través de `/setprivacy`, o
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

    `channels.telegram.allowFrom` acepta IDs numéricos de usuario de Telegram. Se aceptan y normalizan los prefijos `telegram:` / `tg:`.
    `dmPolicy: "allowlist"` con `allowFrom` vacío bloquea todos los MDs y es rechazado por la validación de configuración.
    El onboarding acepta entrada `@username` y la resuelve a IDs numéricos.
    Si actualizaste y tu configuración contiene entradas de lista blanca `@username`, ejecuta `openclaw doctor --fix` para resolverlas (mejor esfuerzo posible; requiere un token de bot de Telegram).
    Si anteriormente confiabas en archivos de lista blanca de pairing-store, `openclaw doctor --fix` puede recuperar entradas en `channels.telegram.allowFrom` en flujos de lista blanca (por ejemplo, cuando `dmPolicy: "allowlist"` aún no tiene IDs explícitos).

    Para bots de un solo propietario, prefiere `dmPolicy: "allowlist"` con IDs numéricos `allowFrom` explícitos para mantener la política de acceso duradera en la configuración (en lugar de depender de aprobaciones de emparejamiento anteriores).

    Confusión común: La aprobación de emparejamiento de MD no significa "este remitente está autorizado en todas partes".
    El emparejamiento otorga solo acceso a MDs. La autorización del remitente del grupo proviene aún de listas blancas de configuración explícitas.
    Si quieres "Estoy autorizado una vez y tanto los MDs como los comandos de grupo funcionan", pon tu ID numérico de usuario de Telegram en `channels.telegram.allowFrom`.

    ### Cómo encontrar tu ID de usuario de Telegram

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

  <Tab title="Política de grupos y listas de permitidos">
    Dos controles se aplican conjuntamente:

    1. **Qué grupos están permitidos** (`channels.telegram.groups`)
       - sin configuración `groups`:
         - con `groupPolicy: "open"`: cualquier grupo puede pasar las comprobaciones de ID de grupo
         - con `groupPolicy: "allowlist"` (predeterminado): los grupos están bloqueados hasta que añadas entradas `groups` (o `"*"`)
       - `groups` configurado: actúa como lista de permitidos (IDs explícitos o `"*"`)

    2. **Qué remitentes están permitidos en los grupos** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (predeterminado)
       - `disabled`

    `groupAllowFrom` se utiliza para el filtrado de remitentes en grupos. Si no se establece, Telegram recurre a `allowFrom`.
    Las entradas `groupAllowFrom` deben ser IDs numéricos de usuario de Telegram (los prefijos `telegram:` / `tg:` se normalizan).
    No pongas IDs de chat de grupo o supergrupo de Telegram en `groupAllowFrom`. Los IDs de chat negativos pertenecen a `channels.telegram.groups`.
    Las entradas no numéricas se ignoran para la autorización de remitentes.
    Límite de seguridad (`2026.2.25+`): la autenticación de remitentes de grupo **no** hereda las aprobaciones del almacén de emparejamiento (pairing) de MD.
    El emparejamiento se mantiene exclusivamente para MD. Para grupos, establece `groupAllowFrom` o `allowFrom` por grupo/por tema.
    Si `groupAllowFrom` no está establecido, Telegram recurre a la configuración `allowFrom`, no al almacén de emparejamiento.
    Patrón práctico para bots de un solo propietario: establece tu ID de usuario en `channels.telegram.allowFrom`, deja `groupAllowFrom` sin establecer y permite los grupos objetivo en `channels.telegram.groups`.
    Nota de ejecución: si `channels.telegram` falta completamente, el tiempo de ejecución predeterminado es `groupPolicy="allowlist"` (cerrado por fallo) a menos que `channels.defaults.groupPolicy` se establezca explícitamente.

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

  <Tab title="Comportamiento de mención">
    Las respuestas del grupo requieren una mención por defecto.

    La mención puede provenir de:

    - mención nativa `@botusername`, o
    - patrones de mención en:
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Interruptores de comandos a nivel de sesión:

    - `/activation always`
    - `/activation mention`

    Estos solo actualizan el estado de la sesión. Utilice la configuración para la persistencia.

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
    - o inspeccionar Bot API `getUpdates`

  </Tab>
</Tabs>

## Comportamiento en tiempo de ejecución

- Telegram es propiedad del proceso de puerta de enlace.
- El enrutamiento es determinista: las respuestas entrantes de Telegram vuelven a Telegram (el modelo no elige canales).
- Los mensajes entrantes se normalizan en el sobre del canal compartido con metadatos de respuesta y marcadores de posición de medios.
- Las sesiones de grupo están aisladas por el ID del grupo. Los temas del foro añaden `:topic:<threadId>` para mantener los temas aislados.
- Los mensajes DM pueden llevar `message_thread_id`; OpenClaw los enruta con claves de sesión conscientes de los hilos y preserva el ID del hilo para las respuestas.
- El sondeo largo utiliza el ejecutor grammY con secuenciación por chat/hilo. La concurrencia general del sumidero del ejecutor utiliza `agents.defaults.maxConcurrent`.
- La API de Bot de Telegram no tiene soporte de confirmación de lectura (`sendReadReceipts` no se aplica).

## Referencia de características

<AccordionGroup>
  <Accordion title="Vista previa de transmisión en vivo (ediciones de mensajes)">
    OpenClaw puede transmitir respuestas parciales en tiempo real:

    - chats directos: mensaje de vista previa + `editMessageText`
    - grupos/temas: mensaje de vista previa + `editMessageText`

    Requisitos:

    - `channels.telegram.streaming` es `off | partial | block | progress` (predeterminado: `partial`)
    - `progress` se asigna a `partial` en Telegram (compatibilidad con nombres entre canales)
    - los valores heredados `channels.telegram.streamMode` y los valores booleanos `streaming` se asignan automáticamente

    Para respuestas de solo texto:

    - DM: OpenClaw mantiene el mismo mensaje de vista previa y realiza una edición final en su lugar (sin segundo mensaje)
    - grupo/tema: OpenClaw mantiene el mismo mensaje de vista previa y realiza una edición final en su lugar (sin segundo mensaje)

    Para respuestas complejas (por ejemplo, cargas útiles de medios), OpenClaw recurre a la entrega final normal y luego elimina el mensaje de vista previa.

    La transmisión de vista previa es independiente de la transmisión de bloques. Cuando la transmisión de bloques está explícitamente habilitada para Telegram, OpenClaw omite la transmisión de vista previa para evitar la transmisión doble.

    Si el transporte de borrador nativo no está disponible o es rechazado, OpenClaw recurre automáticamente a `sendMessage` + `editMessageText`.

    Flujo de razonamiento exclusivo de Telegram:

    - `/reasoning stream` envía el razonamiento a la vista previa en vivo mientras se genera
    - la respuesta final se envía sin texto de razonamiento

  </Accordion>

  <Accordion title="Formato y alternativa HTML">
    El texto saliente usa `parse_mode: "HTML"` de Telegram.

    - El texto tipo Markdown se convierte a HTML seguro para Telegram.
    - El HTML del modelo sin procesar se escapa para reducir los fallos de análisis de Telegram.
    - Si Telegram rechaza el HTML analizado, OpenClaw lo reintenta como texto sin formato.

    Las vistas previas de enlaces están habilitadas de forma predeterminada y se pueden desactivar con `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Comandos nativos y comandos personalizados">
    El registro del menú de comandos de Telegram se maneja al inicio con `setMyCommands`.

    Valores predeterminados de comandos nativos:

    - `commands.native: "auto"` habilita los comandos nativos para Telegram

    Agregar entradas de menú de comandos personalizados:

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

    - los nombres se normalizan (eliminar `/` al inicio, minúsculas)
    - patrón válido: `a-z`, `0-9`, `_`, longitud `1..32`
    - los comandos personalizados no pueden anular los comandos nativos
    - los conflictos/duplicados se omiten y se registran

    Notas:

    - los comandos personalizados son solo entradas del menú; no implementan automáticamente el comportamiento
    - los comandos de complementos/habilidades aún pueden funcionar al escribirse, incluso si no se muestran en el menú de Telegram

    Si los comandos nativos están deshabilitados, los integrados se eliminan. Los comandos de complementos/personalizados aún pueden registrarse si están configurados.

    Fallos comunes de configuración:

    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú de Telegram aún se desbordó después del recorte; reduzca los comandos de complementos/habilidades/personalizados o deshabilite `channels.telegram.commands.native`.
    - `setMyCommands failed` con errores de red/obtención generalmente significa que el DNS/HTTPS saliente a `api.telegram.org` está bloqueado.

    ### Comandos de emparejamiento de dispositivos (complemento `device-pair`)

    Cuando el complemento `device-pair` está instalado:

    1. `/pair` genera el código de configuración
    2. pegue el código en la aplicación de iOS
    3. `/pair pending` enumera las solicitudes pendientes (incluidos los roles/alcances)
    4. apruebe la solicitud:
       - `/pair approve <requestId>` para aprobación explícita
       - `/pair approve` cuando solo hay una solicitud pendiente
       - `/pair approve latest` para la más reciente

    El código de configuración lleva un token de arranque de corta duración. El traspaso de arranque integrado mantiene el token del nodo principal en `scopes: []`; cualquier token de operador transferido permanece limitado a `operator.approvals`, `operator.read`, `operator.talk.secrets` y `operator.write`. Las comprobaciones de alcance de arranque tienen el prefijo del rol, por lo que la lista de permitidos del operador solo satisface las solicitudes del operador; los roles que no son operadores aún necesitan alcances bajo su propio prefijo de rol.

    Si un dispositivo vuelve a intentar con detalles de autenticación modificados (por ejemplo, rol/alcances/clave pública), la solicitud pendiente anterior se reemplaza y la nueva solicitud utiliza un `requestId` diferente. Vuelva a ejecutar `/pair pending` antes de aprobar.

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

    El elemento heredado `capabilities: ["inlineButtons"]` se asigna a `inlineButtons: "all"`.

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

    Los clics en las devoluciones de llamada se pasan al agente como texto:
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Acciones de mensajes de Telegram para agentes y automatización">
    Las acciones de herramienta de Telegram incluyen:

    - `sendMessage` (`to`, `content`, opcional `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, opcional `iconColor`, `iconCustomEmojiId`)

    Las acciones de mensajes del canal exponen alias ergonómicos (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Controles de filtrado:

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (predeterminado: deshabilitado)

    Nota: `edit` y `topic-create` actualmente están habilitados de forma predeterminada y no tienen interruptores `channels.telegram.actions.*` separados.
    Los envíos en tiempo de ejecución utilizan la instantánea activa de configuración/secrets (inicio/recarga), por lo que las rutas de acción no realizan una resolución ad-hoc de SecretRef por cada envío.

    Semántica de eliminación de reacciones: [/tools/reactions](/es/tools/reactions)

  </Accordion>

  <Accordion title="Etiquetas de hilos de respuesta">
    Telegram admite etiquetas explícitas de hilos de respuesta en la salida generada:

    - `[[reply_to_current]]` responde al mensaje desencadenante
    - `[[reply_to:<id>]]` responde a un ID de mensaje específico de Telegram

    `channels.telegram.replyToMode` controles de manejo:

    - `off` (predeterminado)
    - `first`
    - `all`

    Nota: `off` deshabilita los hilos de respuesta implícitos. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.

  </Accordion>

  <Accordion title="Temas del foro y comportamiento de los hilos">
    Supergrupos de foro:

    - las claves de sesión del tema añaden `:topic:<threadId>`
    - las respuestas y la escritura apuntan al hilo del tema
    - ruta de configuración del tema:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Caso especial del tema general (`threadId=1`):

    - los envíos de mensajes omiten `message_thread_id` (Telegram rechaza `sendMessage(...thread_id=1)`)
    - las acciones de escritura aún incluyen `message_thread_id`

    Herencia del tema: las entradas del tema heredan la configuración del grupo a menos que se anulen (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` es exclusivo del tema y no se hereda de los valores predeterminados del grupo.

    **Enrutamiento de agente por tema**: Cada tema puede enrutar a un agente diferente estableciendo `agentId` en la configuración del tema. Esto da a cada tema su propio espacio de trabajo, memoria y sesión aislados. Ejemplo:

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

    **Vinculación persistente del tema ACP**: Los temas del foro pueden fijar sesiones del arnés ACP a través de vinculaciones ACP tipadas de nivel superior:

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

    Actualmente, esto está limitado a los temas del foro en grupos y supergrupos.

    **Generación de ACP vinculada al hilo desde el chat**:

    - `/acp spawn <agent> --thread here|auto` puede vincular el tema de Telegram actual a una nueva sesión ACP.
    - Los mensajes de seguimiento del tema se enrutan directamente a la sesión ACP vinculada (no se requiere `/acp steer`).
    - OpenClaw fija el mensaje de confirmación de generación en el tema después de una vinculación exitosa.
    - Requiere `channels.telegram.threadBindings.spawnAcpSessions=true`.

    El contexto de la plantilla incluye:

    - `MessageThreadId`
    - `IsForum`

    Comportamiento del hilo de DM:

    - los chats privados con `message_thread_id` mantienen el enrutamiento de DM pero usan claves de sesión/destinos de respuesta conscientes del hilo.

  </Accordion>

  <Accordion title="Audio, video, and stickers">
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

    Las pegatinas se describen una vez (cuando es posible) y se almacenan en caché para reducir las llamadas repetidas a la visión.

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
    Las reacciones de Telegram llegan como actualizaciones `message_reaction` (separadas de las cargas útiles de los mensajes).

    Cuando están habilitadas, OpenClaw pone en cola eventos del sistema como:

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Configuración:

    - `channels.telegram.reactionNotifications`: `off | own | all` (predeterminado: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (predeterminado: `minimal`)

    Notas:

    - `own` significa solo reacciones de los usuarios a los mensajes enviados por el bot (mejor esfuerzo a través del caché de mensajes enviados).
    - Los eventos de reacción aún respetan los controles de acceso de Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`); los remitentes no autorizados se descartan.
    - Telegram no proporciona IDs de hilo en las actualizaciones de reacción.
      - los grupos que no son foro se redirigen a la sesión de chat del grupo
      - los grupos foro se redirigen a la sesión del tema general del grupo (`:topic:1`), no al tema de origen exacto

    `allowed_updates` para sondeo/webhook incluyen `message_reaction` automáticamente.

  </Accordion>

  <Accordion title="Reacciones de acuse de recibo">
    `ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

    Orden de resolución:

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - reserva de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Telegram espera emojis unicode (por ejemplo "👀").
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    Las escrituras de configuración del canal están habilitadas por defecto (`configWrites !== false`).

    Las escrituras activadas por Telegram incluyen:

    - eventos de migración de grupo (`migrate_to_chat_id`) para actualizar `channels.telegram.groups`
    - `/config set` y `/config unset` (requiere habilitación de comandos)

    Para deshabilitar:

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

  <Accordion title="Long polling vs webhook">
    Predeterminado: long polling.

    Modo webhook:

    - establecer `channels.telegram.webhookUrl`
    - establecer `channels.telegram.webhookSecret` (requerido cuando se configura la URL del webhook)
    - opcional `channels.telegram.webhookPath` (predeterminado `/telegram-webhook`)
    - opcional `channels.telegram.webhookHost` (predeterminado `127.0.0.1`)
    - opcional `channels.telegram.webhookPort` (predeterminado `8787`)

    El listener local predeterminado para el modo webhook se vincula a `127.0.0.1:8787`.

    Si su punto de acceso público es diferente, coloque un proxy inverso delante y apunte `webhookUrl` a la URL pública.
    Establezca `webhookHost` (por ejemplo `0.0.0.0`) cuando necesite intencionalmente ingress externo.

  </Accordion>

  <Accordion title="Límites, reintentos y objetivos de CLI">
    - `channels.telegram.textChunkLimit` el valor predeterminado es 4000.
    - `channels.telegram.chunkMode="newline"` prefiere los límites de párrafo (líneas en blanco) antes de dividir por longitud.
    - `channels.telegram.mediaMaxMb` (predeterminado 100) limita el tamaño de los medios de Telegram entrantes y salientes.
    - `channels.telegram.timeoutSeconds` anula el tiempo de espera del cliente de la API de Telegram (si no está configurado, se aplica el valor predeterminado de grammY).
    - el historial de contexto de grupo usa `channels.telegram.historyLimit` o `messages.groupChat.historyLimit` (predeterminado 50); `0` lo desactiva.
    - el contexto complementario de respuesta/cita/reenvío se pasa actualmente tal como se recibe.
    - las listas de permitidos de Telegram controlan principalmente quién puede activar al agente, no un límite completo de redacción de contexto complementario.
    - controles de historial de DM:
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuración `channels.telegram.retry` se aplica a los asistentes de envío de Telegram (CLI/herramientas/acciones) para errores de API salientes recuperables.

    El objetivo de envío de CLI puede ser una ID de chat numérica o un nombre de usuario:

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
    - `--thread-id` para temas del foro (o use un objetivo `:topic:`)

    El envío de Telegram también admite:

    - `--buttons` para teclados en línea cuando `channels.telegram.capabilities.inlineButtons` lo permite
    - `--force-document` para enviar imágenes y GIFs salientes como documentos en lugar de cargas de fotos comprimidas o medios animados

    Control de acciones:

    - `channels.telegram.actions.sendMessage=false` desactiva los mensajes salientes de Telegram, incluidas las encuestas
    - `channels.telegram.actions.poll=false` desactiva la creación de encuestas de Telegram mientras deja los envíos regulares activados

  </Accordion>

  <Accordion title="Aprobaciones de ejecución en Telegram">
    Telegram admite aprobaciones de ejecución en los MD de los aprobadores y, opcionalmente, puede publicar mensajes de solicitud de aprobación en el chat o tema de origen.

    Ruta de configuración:

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers` (opcional; recurre a los IDs numéricos de propietario inferidos de `allowFrom` y al `defaultTo` directo cuando sea posible)
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
    - `agentFilter`, `sessionFilter`

    Los aprobadores deben ser IDs numéricos de usuario de Telegram. Telegram habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador, ya sea desde `execApprovals.approvers` o desde la configuración numérica de propietario de la cuenta (`allowFrom` y `defaultTo` de mensaje directo). Establezca `enabled: false` para deshabilitar explícitamente Telegram como cliente de aprobación nativo. De lo contrario, las solicitudes de aprobación recurren a otras rutas de aprobación configuradas o a la política de reserva de aprobación de ejecución.

    Telegram también representa los botones de aprobación compartidos que utilizan otros canales de chat. El adaptador nativo de Telegram principalmente agrega el enrutamiento por MD al aprobador, la distribución por canal/tema y las indicaciones de escritura antes de la entrega.
    Cuando esos botones están presentes, son la experiencia de usuario (UX) de aprobación principal; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que
    las aprobaciones por chat no están disponibles o la aprobación manual es la única vía.

    Reglas de entrega:

    - `target: "dm"` envía mensajes de solicitud de aprobación solo a los MD de aprobadores resueltos
    - `target: "channel"` envía el mensaje de vuelta al chat/tema de Telegram de origen
    - `target: "both"` envía a los MD de aprobadores y al chat/tema de origen

    Solo los aprobadores resueltos pueden aprobar o denegar. Los no aprobadores no pueden usar `/approve` ni los botones de aprobación de Telegram.

    Comportamiento de resolución de aprobaciones:

    - Los IDs con el prefijo `plugin:` siempre se resuelven a través de aprobaciones de complementos.
    - Otros IDs de aprobación intentan `exec.approval.resolve` primero.
    - Si Telegram también está autorizado para aprobaciones de complementos y la puerta de enlace indica que
      la aprobación de ejecución es desconocida/caducada, Telegram reintenta una vez a través de
      `plugin.approval.resolve`.
    - Las denegaciones/errores reales de aprobación de ejecución no pasan silenciosamente a la resolución de
      aprobación de complementos.

    La entrega por canal muestra el texto del comando en el chat, por lo que solo habilite `channel` o `both` en grupos/temas de confianza. Cuando el mensaje aterriza en un tema de foro, OpenClaw conserva el tema tanto para el mensaje de solicitud de aprobación como para el seguimiento posterior a la aprobación. Las aprobaciones de ejecución caducan después de 30 minutos de forma predeterminada.

    Los botones de aprobación en línea también dependen de que `channels.telegram.capabilities.inlineButtons` permita la superficie de destino (`dm`, `group` o `all`).

    Documentos relacionados: [Aprobaciones de ejecución](/es/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Controles de respuesta de error

Cuando el agente encuentra un error de entrega o del proveedor, Telegram puede responder con el texto del error o suprimirlo. Dos claves de configuración controlan este comportamiento:

| Clave                               | Valores           | Predeterminado | Descripción                                                                                                 |
| ----------------------------------- | ----------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`        | `reply` envía un mensaje de error amigable al chat. `silent` suprime completamente las respuestas de error. |
| `channels.telegram.errorCooldownMs` | número (ms)       | `60000`        | Tiempo mínimo entre respuestas de error al mismo chat. Evita el spam de errores durante interrupciones.     |

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
  <Accordion title="El bot no responde a mensajes de grupo que no son menciones">

    - Si `requireMention=false`, el modo de privacidad de Telegram debe permitir visibilidad completa.
      - BotFather: `/setprivacy` -> Deshabilitar
      - luego elimina y vuelve a añadir el bot al grupo
    - `openclaw channels status` advierte cuando la configuración espera mensajes de grupo sin mención.
    - `openclaw channels status --probe` puede verificar IDs de grupo numéricos explícitos; el comodín `"*"` no puede tener su membresía verificada.
    - prueba rápida de sesión: `/activation always`.

  </Accordion>

  <Accordion title="El bot no ve los mensajes del grupo en absoluto">

    - cuando `channels.telegram.groups` existe, el grupo debe estar listado (o incluir `"*"`)
    - verifica la membresía del bot en el grupo
    - revisa los registros: `openclaw logs --follow` para conocer los motivos de omisión

  </Accordion>

  <Accordion title="Los comandos funcionan parcialmente o nada">

    - autoriza tu identidad de remitente (emparejamiento y/o ID numérico `allowFrom`)
    - la autorización de comandos aún se aplica incluso cuando la política de grupo es `open`
    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú nativo tiene demasiadas entradas; reduce los comandos de complemento/habilidad/personalizados o deshabilita los menús nativos
    - `setMyCommands failed` con errores de red/fetch suele indicar problemas de accesibilidad DNS/HTTPS hacia `api.telegram.org`

  </Accordion>

  <Accordion title="Sondeo o inestabilidad de la red">

    - Node 22+ + fetch/proxy personalizado puede activar un comportamiento de aborto inmediato si los tipos AbortSignal no coinciden.
    - Algunos hosts resuelven `api.telegram.org` primero a IPv6; una salida IPv6 rota puede causar fallos intermitentes en la API de Telegram.
    - Si los registros incluyen `TypeError: fetch failed` o `Network request for 'getUpdates' failed!`, OpenClaw ahora los reintenta como errores de red recuperables.
    - En hosts VPS con salida directa/TLS inestable, enrute las llamadas a la API de Telegram a través de `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ usa por defecto `autoSelectFamily=true` (excepto WSL2) y `dnsResultOrder=ipv4first`.
    - Si su host es WSL2 o funciona explícitamente mejor solo con IPv4, fuerce la selección de familia:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Las respuestas en el rango de referencia RFC 2544 (`198.18.0.0/15`) ya están permitidas
      de forma predeterminada para descargas de medios de Telegram. Si un fake-IP de confianza o
      un proxy transparente reescribe `api.telegram.org` a alguna otra
      dirección privada/interna/de uso especial durante las descargas de medios, puede optar
      por la desviación exclusiva para Telegram:

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La misma opción está disponible por cuenta en
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si su proxy resuelve los hosts de medios de Telegram en `198.18.x.x`, deje la
      bandera peligrosa desactivada primero. Los medios de Telegram ya permiten el rango de referencia
      RFC 2544 de forma predeterminada.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` debilita las protecciones SSRF
      de medios de Telegram. Úsela solo para entornos de proxy controlados por operadores de confianza
      como Clash, Mihomo, o enrutamiento fake-IP de Surge cuando sintetizan
      respuestas privadas o de uso especial fuera del rango de referencia RFC 2544.
      Déjela desactivada para el acceso normal a Telegram a través de Internet público.
    </Warning>

    - Sobrescrituras de entorno (temporales):
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - Validar respuestas DNS:

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

Más ayuda: [Solución de problemas de canales](/es/channels/troubleshooting).

## Punteros de referencia de configuración de Telegram

Referencia principal:

- `channels.telegram.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.telegram.botToken`: token del bot (BotFather).
- `channels.telegram.tokenFile`: lee el token de una ruta de archivo normal. Los enlaces simbólicos son rechazados.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (predeterminado: emparejamiento).
- `channels.telegram.allowFrom`: lista de permitidos de DM (IDs numéricos de usuario de Telegram). `allowlist` requiere al menos un ID de remitente. `open` requiere `"*"`. `openclaw doctor --fix` puede resolver entradas `@username` heredadas a IDs y puede recuperar entradas de lista de permitidos desde archivos de almacenamiento de emparejamiento en flujos de migración de lista de permitidos.
- `channels.telegram.actions.poll`: habilita o deshabilita la creación de encuestas de Telegram (predeterminado: habilitado; aún requiere `sendMessage`).
- `channels.telegram.defaultTo`: objetivo de Telegram predeterminado utilizado por la CLI `--deliver` cuando no se proporciona un `--reply-to` explícito.
- `channels.telegram.groupPolicy`: `open | allowlist | disabled` (predeterminado: allowlist).
- `channels.telegram.groupAllowFrom`: lista de permitidos de remitentes de grupo (IDs numéricos de usuario de Telegram). `openclaw doctor --fix` puede resolver entradas `@username` heredadas a IDs. Las entradas no numéricas se ignoran en el momento de la autenticación. La autenticación de grupo no utiliza la alternativa de almacenamiento de emparejamiento de DM (`2026.2.25+`).
- Precedencia multicuenta:
  - Cuando se configuran dos o más IDs de cuenta, establezca `channels.telegram.defaultAccount` (o incluya `channels.telegram.accounts.default`) para hacer explícito el enrutamiento predeterminado.
  - Si no se establece ninguno, OpenClaw recurre al primer ID de cuenta normalizado y `openclaw doctor` advierte.
  - `channels.telegram.accounts.default.allowFrom` y `channels.telegram.accounts.default.groupAllowFrom` se aplican solo a la cuenta `default`.
  - Las cuentas con nombre heredan `channels.telegram.allowFrom` y `channels.telegram.groupAllowFrom` cuando los valores a nivel de cuenta no están establecidos.
  - Las cuentas con nombre no heredan `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups`: valores predeterminados por grupo + lista de permitidos (use `"*"` para valores predeterminados globales).
  - `channels.telegram.groups.<id>.groupPolicy`: anulación por grupo para groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention`: valor predeterminado de filtrado de menciones.
  - `channels.telegram.groups.<id>.skills`: filtro de habilidades (omitir = todas las habilidades, vacío = ninguna).
  - `channels.telegram.groups.<id>.allowFrom`: anulación de la lista de permitidos de remitentes por grupo.
  - `channels.telegram.groups.<id>.systemPrompt`: prompt del sistema adicional para el grupo.
  - `channels.telegram.groups.<id>.enabled`: desactivar el grupo cuando `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*`: anulaciones por tema (campos de grupo + `agentId` exclusivos del tema).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId`: enrutar este tema a un agente específico (anula el enrutamiento a nivel de grupo y de vinculación).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy`: anulación por tema para groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention`: anulación por tema del filtrado de menciones.
- `bindings[]` de nivel superior con `type: "acp"` e id de tema canónico `chatId:topic:topicId` en `match.peer.id`: campos de vinculación de temas ACP persistentes (ver [ACP Agents](/es/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId`: enrutar temas de MD a un agente específico (mismo comportamiento que los temas del foro).
- `channels.telegram.execApprovals.enabled`: habilitar Telegram como cliente de aprobación de ejecución basado en chat para esta cuenta.
- `channels.telegram.execApprovals.approvers`: IDs de usuario de Telegram autorizados para aprobar o denegar solicitudes de ejecución. Opcional cuando `channels.telegram.allowFrom` o un `channels.telegram.defaultTo` directo ya identifican al propietario.
- `channels.telegram.execApprovals.target`: `dm | channel | both` (predeterminado: `dm`). `channel` y `both` conservan el tema de Telegram de origen cuando está presente.
- `channels.telegram.execApprovals.agentFilter`: filtro opcional de ID de agente para avisos de aprobación reenviados.
- `channels.telegram.execApprovals.sessionFilter`: filtro opcional de clave de sesión (subcadena o expresión regular) para avisos de aprobación reenviados.
- `channels.telegram.accounts.<account>.execApprovals`: anulación por cuenta del enrutamiento de aprobación de ejecución de Telegram y la autorización del aprobador.
- `channels.telegram.capabilities.inlineButtons`: `off | dm | group | all | allowlist` (predeterminado: lista de permitidos).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons`: anulación por cuenta.
- `channels.telegram.commands.nativeSkills`: activa/desactiva los comandos de habilidades nativas de Telegram.
- `channels.telegram.replyToMode`: `off | first | all` (predeterminado: `off`).
- `channels.telegram.textChunkLimit`: tamaño del fragmento de salida (caracteres).
- `channels.telegram.chunkMode`: `length` (predeterminado) o `newline` para dividir en líneas en blanco (límites de párrafo) antes de la fragmentación por longitud.
- `channels.telegram.linkPreview`: activa/desactiva las vistas previas de enlaces para los mensajes salientes (predeterminado: true).
- `channels.telegram.streaming`: `off | partial | block | progress` (vista previa de transmisión en vivo; predeterminado: `partial`; `progress` se asigna a `partial`; `block` es compatibilidad con el modo de vista previa heredado). La transmisión de vista previa de Telegram utiliza un único mensaje de vista previa que se edita en su lugar.
- `channels.telegram.mediaMaxMb`: límite de medios de Telegram entrantes/salientes (MB, predeterminado: 100).
- `channels.telegram.retry`: política de reintento para los asistentes de envío de Telegram (CLI/herramientas/acciones) en errores de API salientes recuperables (intentos, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily`: anula autoSelectFamily de Node (true=activar, false=desactivar). De forma predeterminada, está activado en Node 22+, con WSL2 predeterminado a desactivado.
- `channels.telegram.network.dnsResultOrder`: anula el orden de resultados DNS (`ipv4first` o `verbatim`). De forma predeterminada, es `ipv4first` en Node 22+.
- `channels.telegram.network.dangerouslyAllowPrivateNetwork`: opción de suscripción peligrosa para entornos de IP falsa de confianza o proxy transparente donde las descargas de medios de Telegram resuelven `api.telegram.org` a direcciones privadas/internas/de uso especial fuera del permiso de rango de referencia RFC 2544 predeterminado.
- `channels.telegram.proxy`: URL de proxy para llamadas a la API de Bot (SOCKS/HTTP).
- `channels.telegram.webhookUrl`: activa el modo webhook (requiere `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret`: secreto del webhook (obligatorio cuando se establece webhookUrl).
- `channels.telegram.webhookPath`: ruta local del webhook (predeterminado `/telegram-webhook`).
- `channels.telegram.webhookHost`: host de enlace del webhook local (predeterminado `127.0.0.1`).
- `channels.telegram.webhookPort`: puerto de enlace del webhook local (predeterminado `8787`).
- `channels.telegram.actions.reactions`: limitar las reacciones de la herramienta de Telegram.
- `channels.telegram.actions.sendMessage`: limitar los envíos de mensajes de la herramienta de Telegram.
- `channels.telegram.actions.deleteMessage`: limitar las eliminaciones de mensajes de la herramienta de Telegram.
- `channels.telegram.actions.sticker`: limitar las acciones de pegatinas de Telegram — enviar y buscar (predeterminado: false).
- `channels.telegram.reactionNotifications`: `off | own | all` — controlar qué reacciones activan eventos del sistema (predeterminado: `own` si no se establece).
- `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` — controlar la capacidad de reacción del agente (predeterminado: `minimal` si no se establece).
- `channels.telegram.errorPolicy`: `reply | silent` — controlar el comportamiento de respuesta de error (predeterminado: `reply`). Se admiten anulaciones por cuenta/grupo/tema.
- `channels.telegram.errorCooldownMs`: ms mínimos entre respuestas de error al mismo chat (predeterminado: `60000`). Evita el spam de errores durante interrupciones.

- [Referencia de configuración - Telegram](/es/gateway/configuration-reference#telegram)

Campos de alta señal específicos de Telegram:

- inicio/autenticación: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` debe apuntar a un archivo regular; se rechazan los enlaces simbólicos)
- control de acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de nivel superior (`type: "acp"`)
- aprobaciones de ejecución: `execApprovals`, `accounts.*.execApprovals`
- comando/menú: `commands.native`, `commands.nativeSkills`, `customCommands`
- hilos/respuestas: `replyToMode`
- transmisión: `streaming` (versión preliminar), `blockStreaming`
- formato/entrega: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/red: `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- acciones/capacidades: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reacciones: `reactionNotifications`, `reactionLevel`
- errores: `errorPolicy`, `errorCooldownMs`
- escrituras/historial: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Seguridad](/es/gateway/security)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)

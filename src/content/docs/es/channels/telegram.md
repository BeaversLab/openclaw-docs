---
summary: "Estado de soporte, capacidades y configuración del bot de Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

Listo para producción para mensajes directos (DM) de bots y grupos a través de grammY. El sondeo largo (long polling) es el modo predeterminado; el modo webhook es opcional.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política de MD predeterminada para Telegram es el emparejamiento.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card title="Configuración de la pasarela" icon="settings" href="/es/gateway/configuration">
    Patrones y ejemplos completos de configuración del canal.
  </Card>
</CardGroup>

## Configuración rápida

<Steps>
  <Step title="Crear el token del bot en BotFather">
    Abre Telegram y chatea con **@BotFather** (confirma que el identificador sea exactamente `@BotFather`).

    Ejecuta `/newbot`, sigue las indicaciones y guarda el token.

  </Step>

  <Step title="Configurar el token y la política de MD">

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
    Telegram **no** usa `openclaw channels login telegram`; configura el token en config/env y luego inicia la pasarela.

  </Step>

  <Step title="Iniciar la pasarela y aprobar el primer MD">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Los códigos de emparejamiento caducan después de 1 hora.

  </Step>

  <Step title="Add the bot to a group">
    Añade el bot a tu grupo y luego obtén ambos IDs que el acceso al grupo necesita:

    - tu ID de usuario de Telegram, utilizado en `allowFrom` / `groupAllowFrom`
    - el ID del chat del grupo de Telegram, utilizado como clave en `channels.telegram.groups`

    Para la configuración inicial, obtén el ID del chat del grupo desde `openclaw logs --follow`, un bot de ID reenviado, o la Bot API `getUpdates`. Después de que se permita el grupo, `/whoami@<bot_username>` puede confirmar los IDs de usuario y de grupo.

    Los IDs negativos de supergrupo de Telegram que comienzan con `-100` son IDs de chat de grupo. Ponlos en `channels.telegram.groups`, no en `groupAllowFrom`.

  </Step>
</Steps>

<Note>El orden de resolución de tokens es consciente de la cuenta. En la práctica, los valores de configuración tienen prioridad sobre el respaldo de variables de entorno, y `TELEGRAM_BOT_TOKEN` solo se aplica a la cuenta predeterminada.</Note>

## Configuración del lado de Telegram

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Los bots de Telegram tienen por defecto el **Modo de privacidad**, lo que limita los mensajes de grupo que reciben.

    Si el bot debe ver todos los mensajes del grupo, haz lo siguiente:

    - desactiva el modo de privacidad a través de `/setprivacy`, o
    - convierte al bot en administrador del grupo.

    Al alternar el modo de privacidad, elimina y vuelve a añadir el bot en cada grupo para que Telegram aplique el cambio.

  </Accordion>

  <Accordion title="Group permissions">
    El estado de administrador se controla en la configuración del grupo de Telegram.

    Los bots administradores reciben todos los mensajes del grupo, lo cual es útil para un comportamiento de grupo siempre activo.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` para permitir/denegar adiciones a grupos
    - `/setprivacy` para el comportamiento de visibilidad del grupo

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

    `dmPolicy: "open"` con `allowFrom: ["*"]` permite que cualquier cuenta de Telegram que encuentre o adivine el nombre de usuario del bot lo controle. Úselo solo para bots intencionalmente públicos con herramientas muy restringidas; los bots de un solo propietario deben usar `allowlist` con IDs de usuario numéricos.

    `channels.telegram.allowFrom` acepta IDs de usuario numéricos de Telegram. Se aceptan y normalizan los prefijos `telegram:` / `tg:`.
    En configuraciones multicuenta, un `channels.telegram.allowFrom` de nivel superior restrictivo se trata como un límite de seguridad: las entradas `allowFrom: ["*"]` a nivel de cuenta no hacen pública esa cuenta a menos que la lista blanca efectiva de la cuenta aún contenga un comodín explícito después de la fusión.
    `dmPolicy: "allowlist"` con `allowFrom` vacío bloquea todos los MDs y es rechazado por la validación de configuración.
    La configuración solicita solo IDs de usuario numéricos.
    Si actualizó y su configuración contiene entradas de lista blanca `@username`, ejecute `openclaw doctor --fix` para resolverlas (mejor esfuerzo; requiere un token de bot de Telegram).
    Si anteriormente dependía de archivos de lista blanca de emparejamiento (pairing-store), `openclaw doctor --fix` puede recuperar entradas en `channels.telegram.allowFrom` en flujos de lista blanca (por ejemplo, cuando `dmPolicy: "allowlist"` aún no tiene IDs explícitos).

    Para bots de un solo propietario, prefiera `dmPolicy: "allowlist"` con IDs numéricos `allowFrom` explícitos para mantener la política de acceso duradera en la configuración (en lugar de depender de aprobaciones de emparejamiento anteriores).

    Confusión común: la aprobación de emparejamiento de MD no significa "este remitente está autorizado en todas partes".
    El emparejamiento otorga acceso a MD. Si aún no existe ningún propietario de comando, el primer emparejamiento aprobado también establece `commands.ownerAllowFrom` para que los comandos solo para propietarios y las aprobaciones de ejecución tengan una cuenta de operador explícita.
    La autorización del remitente del grupo aún proviene de listas blancas de configuración explícitas.
    Si desea "Estoy autorizado una vez y tanto los MD como los comandos de grupo funcionan", coloque su ID de usuario numérico de Telegram en `channels.telegram.allowFrom`; para comandos solo para propietarios, asegúrese de que `commands.ownerAllowFrom` contenga `telegram:<your user id>`.

    ### Cómo encontrar su ID de usuario de Telegram

    Más seguro (sin bot de terceros):

    1. Envíe un MD a su bot.
    2. Ejecute `openclaw logs --follow`.
    3. Lea `from.id`.

    Método oficial de Bot API:

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    Método de terceros (menos privado): `@userinfobot` o `@getidsbot`.

  </Tab>

  <Tab title="Política de grupos y listas de permitidos">
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

    `groupAllowFrom` se utiliza para el filtrado de remitentes en grupos. Si no se establece, Telegram recurre a `allowFrom`.
    Las entradas `groupAllowFrom` deben ser IDs de usuario numéricos de Telegram (los prefijos `telegram:` / `tg:` se normalizan).
    No pongas IDs de chat de grupo o supergrupo de Telegram en `groupAllowFrom`. Los IDs de chat negativos pertenecen a `channels.telegram.groups`.
    Las entradas no numéricas se ignoran para la autorización de remitentes.
    Límite de seguridad (`2026.2.25+`): la autenticación de remitentes de grupo **no** hereda las aprobaciones del almacén de emparejamiento de MD.
    El emparejamiento se mantiene solo para MD. Para grupos, establece `groupAllowFrom` o `allowFrom` por grupo/por tema.
    Si `groupAllowFrom` no está establecido, Telegram recurre a la configuración `allowFrom`, no al almacén de emparejamiento.
    Patrón práctico para bots de un solo propietario: establece tu ID de usuario en `channels.telegram.allowFrom`, deja `groupAllowFrom` sin establecer y permite los grupos objetivo en `channels.telegram.groups`.
    Nota de ejecución: si `channels.telegram` falta completamente, la ejecución usa por defecto `groupPolicy="allowlist"` de cierre seguro a menos que `channels.defaults.groupPolicy` se establezca explícitamente.

    Configuración de grupo solo para propietario:

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    Pruébalo desde el grupo con `@<bot_username> ping`. Los mensajes de grupo normales no activan el bot mientras que `requireMention: true`.

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
    Las respuestas del grupo requieren mención por defecto.

    La mención puede provenir de:

    - mención nativa `@botusername`, o
    - patrones de mención en:
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Interruptores de comandos a nivel de sesión:

    - `/activation always`
    - `/activation mention`

    Estos solo actualizan el estado de la sesión. Use la configuración para la persistencia.

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

    Obteniendo el ID del chat del grupo:

    - reenvíe un mensaje del grupo a `@userinfobot` / `@getidsbot`
    - o lea `chat.id` de `openclaw logs --follow`
    - o inspeccione la API de Bot `getUpdates`
    - después de que el grupo sea permitido, ejecute `/whoami@<bot_username>` si los comandos nativos están habilitados

  </Tab>
</Tabs>

## Comportamiento en tiempo de ejecución

- Telegram es propiedad del proceso de puerta de enlace.
- El enrutamiento es determinista: las respuestas entrantes de Telegram vuelven a Telegram (el modelo no elige los canales).
- Los mensajes entrantes se normalizan en el sobre compartido del canal con metadatos de respuesta, marcadores de posición de medios y contexto de cadena de respuesta persistente para las respuestas de Telegram que la puerta de enlace ha observado.
- Las sesiones de grupo están aisladas por el ID del grupo. Los temas del foro añaden `:topic:<threadId>` para mantener los temas aislados.
- Los mensajes DM pueden llevar `message_thread_id`; OpenClaw conserva el ID del hilo para las respuestas pero mantiene los DM en la sesión plana por defecto. Configure `channels.telegram.dm.threadReplies: "inbound"`, `channels.telegram.direct.<chatId>.threadReplies: "inbound"`, `requireTopic: true`, o una configuración de tema coincidente cuando intencionalmente desee el aislamiento de sesión de tema DM.
- El sondeo largo (long polling) utiliza el ejecutor grammY con secuenciación por chat/hilo. La concurrencia general del sumidero del ejecutor utiliza `agents.defaults.maxConcurrent`.
- El sondeo largo está protegido dentro de cada proceso de puerta de enlace, por lo que solo un sondeador activo puede usar un token de bot a la vez. Si todavía ve conflictos `getUpdates` 409, es probable que otra puerta de enlace OpenClaw, script o sondeador externo esté usando el mismo token.
- Los reinicios del perro guardián de sondeo largo se activan después de 120 segundos sin actividad `getUpdates` completada por defecto. Aumente `channels.telegram.pollingStallThresholdMs` solo si su implementación todavía ve reinicios falsos por estancamiento del sondeo durante trabajos de larga duración. El valor está en milisegundos y se permite desde `30000` hasta `600000`; se admiten anulaciones por cuenta.
- La API de Bot de Telegram no tiene soporte de confirmación de lectura (`sendReadReceipts` no aplica).

## Referencia de características

<AccordionGroup>
  <Accordion title="Vista previa de transmisión en vivo (ediciones de mensajes)">
    OpenClaw puede transmitir respuestas parciales en tiempo real:

    - chats directos: mensaje de vista previa + `editMessageText`
    - grupos/temas: mensaje de vista previa + `editMessageText`

    Requisito:

    - `channels.telegram.streaming` es `off | partial | block | progress` (predeterminado: `partial`)
    - `progress` mantiene un borrador de estado editable para el progreso de la herramienta, lo borra al completarse y envía la respuesta final como un mensaje normal
    - `streaming.preview.toolProgress` controla si las actualizaciones de herramienta/progreso reutilizan el mismo mensaje de vista previa editado (predeterminado: `true` cuando la transmisión de vista previa está activa)
    - `streaming.preview.commandText` controla el detalle de comando/ejecución dentro de esas líneas de progreso de herramienta: `raw` (predeterminado, conserva el comportamiento publicado) o `status` (solo etiqueta de herramienta)
    - se detectan los valores heredados `channels.telegram.streamMode` y el booleano `streaming`; ejecute `openclaw doctor --fix` para migrarlos a `channels.telegram.streaming.mode`

    Las actualizaciones de vista previa de progreso de herramienta son las líneas de estado cortas que se muestran mientras se ejecutan las herramientas, por ejemplo, ejecución de comandos, lecturas de archivos, actualizaciones de planificación o resúmenes de parches. Telegram las mantiene habilitadas de forma predeterminada para coincidir con el comportamiento publicado de OpenClaw desde `v2026.4.22` y posteriores. Para mantener la vista previa editada para el texto de respuesta pero ocultar las líneas de progreso de herramienta, establezca:

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    Para mantener visible el progreso de la herramienta pero ocultar el texto de comando/ejecución, establezca:

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    Use el modo `progress` cuando desee un progreso de herramienta visible sin editar la respuesta final en ese mismo mensaje. Coloque la política de texto de comando bajo `streaming.progress`:

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    Use `streaming.mode: "off"` solo cuando desee la entrega solo final: las ediciones de vista previa de Telegram están deshabilitadas y el charla genérico de herramienta/progreso se suprime en lugar de enviarse como mensajes de estado independientes. Los avisos de aprobación, las cargas útiles de medios y los errores aún se enrutan a través de la entrega final normal. Use `streaming.preview.toolProgress: false` cuando solo desee mantener las ediciones de vista previa de la respuesta mientras oculta las líneas de estado de progreso de herramienta.

    <Note>
      Las respuestas de cita seleccionadas de Telegram son la excepción. Cuando `replyToMode` es `"first"`, `"all"` o `"batched"` y el mensaje entrante incluye texto de cita seleccionado, OpenClaw envía la respuesta final a través de la ruta de respuesta de cita nativa de Telegram en lugar de editar la vista previa de la respuesta, por lo que `streaming.preview.toolProgress` no puede mostrar las líneas de estado cortas para ese turno. Las respuestas al mensaje actual sin texto de cita seleccionado aún mantienen la transmisión de vista previa. Establezca `replyToMode: "off"` cuando la visibilidad del progreso de la herramienta sea más importante que las respuestas de cita nativas, o establezca `streaming.preview.toolProgress: false` para reconocer el compromiso.
    </Note>

    Para respuestas de solo texto:

    - vistas previas cortas de DM/grupo/tema: OpenClaw mantiene el mismo mensaje de vista previa y realiza la edición final en su lugar
    - los textos finales largos que se dividen en múltiples mensajes de Telegram reutilizan la vista previa existente como el primer fragmento final cuando es posible, y luego envían solo los fragmentos restantes
    - los finales en modo de progreso borran el borrador de estado y usan la entrega final normal en lugar de editar el borrador en la respuesta
    - si la edición final falla antes de que se confirme el texto completado, OpenClaw usa la entrega final normal y limpia la vista previa obsoleta

    Para respuestas complejas (por ejemplo, cargas útiles de medios), OpenClaw recurre a la entrega final normal y luego limpia el mensaje de vista previa.

    La transmisión de vista previa es independiente de la transmisión de bloques. Cuando la transmisión de bloques está explícitamente habilitada para Telegram, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

    Flujo de razonamiento solo para Telegram:

    - `/reasoning stream` envía el razonamiento a la vista previa en vivo mientras se genera
    - la vista previa de razonamiento se elimina después de la entrega final; use `/reasoning on` cuando el razonamiento debe permanecer visible
    - la respuesta final se envía sin texto de razonamiento

  </Accordion>

  <Accordion title="Formato y reserva HTML">
    El texto de salida usa Telegram `parse_mode: "HTML"`.

    - El texto estilo Markdown se renderiza como HTML seguro para Telegram.
    - Las etiquetas HTML compatibles con Telegram se conservan; el HTML no compatible se escapa.
    - Si Telegram rechaza el HTML analizado, OpenClaw reintenta como texto plano.

    Las vistas previas de enlaces están habilitadas por defecto y se pueden desactivar con `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Comandos nativos y comandos personalizados">
    El registro del menú de comandos de Telegram se maneja al inicio con `setMyCommands`.

    Valores predeterminados de comandos nativos:

    - `commands.native: "auto"` habilita los comandos nativos para Telegram

    Agregar entradas de comandos personalizados al menú:

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
    - los conflictos/duplicados se omiten y se registran

    Notas:

    - los comandos personalizados son solo entradas del menú; no implementan automáticamente el comportamiento
    - los comandos de complementos/habilidades aún pueden funcionar al escribirse incluso si no se muestran en el menú de Telegram

    Si los comandos nativos están deshabilitados, los integrados se eliminan. Los comandos personalizados/de complementos aún pueden registrarse si están configurados.

    Fallos comunes de configuración:

    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú de Telegram todavía se desbordó después de recortar; reduzca los comandos de complementos/habilidades/personalizados o deshabilite `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands` o `setMyCommands` fallando con `404: Not Found` mientras que los comandos curl directos de la API de Bot funcionan puede significar que `channels.telegram.apiRoot` se configuró en el endpoint `/bot<TOKEN>` completo. `apiRoot` debe ser solo la raíz de la API de Bot, y `openclaw doctor --fix` elimina una `/bot<TOKEN>` final accidental.
    - `getMe returned 401` significa que Telegram rechazó el token de bot configurado. Actualice `botToken`, `tokenFile` o `TELEGRAM_BOT_TOKEN` con el token actual de BotFather; OpenClaw se detiene antes del sondeo, por lo que esto no se informa como un error de limpieza de webhook.
    - `setMyCommands failed` con errores de red/obtención generalmente significa que el DNS/HTTPS saliente hacia `api.telegram.org` está bloqueado.

    ### Comandos de emparejamiento de dispositivos (complemento `device-pair`)

    Cuando el complemento `device-pair` está instalado:

    1. `/pair` genera el código de configuración
    2. pegar el código en la aplicación iOS
    3. `/pair pending` enumera las solicitudes pendientes (incluyendo roles/alcances)
    4. aprobar la solicitud:
       - `/pair approve <requestId>` para aprobación explícita
       - `/pair approve` cuando solo hay una solicitud pendiente
       - `/pair approve latest` para la más reciente

    El código de configuración lleva un token de inicio de sesión de corta duración. El traspaso de inicio de sesión integrado mantiene el token del nodo principal en `scopes: []`; cualquier token de operador transferido permanece limitado a `operator.approvals`, `operator.read`, `operator.talk.secrets` y `operator.write`. Las comprobaciones de alcance de inicio de sesión tienen prefijo de rol, de modo que la lista blanca de operadores solo satisface las solicitudes de operadores; los roles no operadores aún necesitan alcances bajo su propio prefijo de rol.

    Si un dispositivo vuelve a intentar con detalles de autenticación cambiados (por ejemplo, rol/alcances/clave pública), la solicitud pendiente anterior se reemplaza y la nueva solicitud usa un `requestId` diferente. Vuelva a ejecutar `/pair pending` antes de aprobar.

    Más detalles: [Emparejamiento](/es/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Inline buttons">
    Configure el ámbito del teclado en línea:

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

    Sobrescritura por cuenta:

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

    El `capabilities: ["inlineButtons"]` heredado se asigna a `inlineButtons: "all"`.

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
    Las acciones de la herramienta de Telegram incluyen:

    - `sendMessage` (`to`, `content`, opcional `mediaUrl`, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, opcional `iconColor`, `iconCustomEmojiId`)

    Las acciones de mensajes del canal exponen alias ergonómicos (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Controles de acceso:

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (predeterminado: desactivado)

    Nota: `edit` y `topic-create` están actualmente activados de forma predeterminada y no tienen interruptores `channels.telegram.actions.*` separados.
    Los envíos en tiempo de ejecución utilizan la instantánea activa de configuración/secrets (inicio/recarga), por lo que las rutas de acción no realizan una nueva resolución ad hoc de SecretRef por cada envío.

    Semántica de eliminación de reacciones: [/tools/reactions](/es/tools/reactions)

  </Accordion>

  <Accordion title="Etiquetas de hilos de respuesta">
    Telegram admite etiquetas explícitas de hilos de respuesta en la salida generada:

    - `[[reply_to_current]]` responde al mensaje desencadenante
    - `[[reply_to:<id>]]` responde a un ID de mensaje de Telegram específico

    `channels.telegram.replyToMode` controles de manejo:

    - `off` (predeterminado)
    - `first`
    - `all`

    Cuando el hilado de respuestas está activado y el texto o pie de foto original de Telegram está disponible, OpenClaw incluye automáticamente un extracto de cita nativo de Telegram. Telegram limita el texto de cita nativo a 1024 unidades de código UTF-16, por lo que los mensajes más largos se citan desde el principio y se recurre a una respuesta simple si Telegram rechaza la cita.

    Nota: `off` desactiva el hilado de respuestas implícito. Las etiquetas explícitas `[[reply_to_*]]` siguen siendo respetadas.

  </Accordion>

  <Accordion title="Temas del foro y comportamiento de los hilos">
    Supergrupos de foro:

    - las claves de sesión del tema agregan `:topic:<threadId>`
    - las respuestas y la escritura apuntan al hilo del tema
    - ruta de configuración del tema:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Caso especial del tema general (`threadId=1`):

    - el envío de mensajes omite `message_thread_id` (Telegram rechaza `sendMessage(...thread_id=1)`)
    - las acciones de escritura todavía incluyen `message_thread_id`

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

    Entonces, cada tema tiene su propia clave de sesión: `agent:zu:telegram:group:-1001234567890:topic:3`

    **Vinculación persistente de tema ACP**: Los temas del foro pueden fijar sesiones del arnés ACP a través de vinculaciones ACP tipadas de nivel superior (`bindings[]` con `type: "acp"` y `match.channel: "telegram"`, `peer.kind: "group"`, y un id calificado por tema como `-1001234567890:topic:42`). Actualmente limitado a temas de foro en grupos/supergrupos. Consulte [ACP Agents](/es/tools/acp-agents).

    **Generación de ACP vinculada al hilo desde el chat**: `/acp spawn <agent> --thread here|auto` vincula el tema actual a una nueva sesión ACP; las respuestas directas se enrutan allí. OpenClaw fija la confirmación de generación en el tema. Requiere que `channels.telegram.threadBindings.spawnSessions` permanezca habilitado (predeterminado: `true`).

    El contexto de la plantilla expone `MessageThreadId` y `IsForum`. Los chats de MD con `message_thread_id` mantienen el enrutamiento de MD y los metadatos de respuesta en sesiones planas de manera predeterminada; solo usan claves de sesión sensibles al hilo cuando se configuran con `threadReplies: "inbound"`, `threadReplies: "always"`, `requireTopic: true`, o una configuración de tema coincidente. Use `channels.telegram.dm.threadReplies` de nivel superior para el predeterminado de la cuenta, o `direct.<chatId>.threadReplies` para un MD.

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### Mensajes de audio

    Telegram distingue entre notas de voz y archivos de audio.

    - predeterminado: comportamiento de archivo de audio
    - etiqueta `[[audio_as_voice]]` en la respuesta del agente para forzar el envío de nota de voz
    - las transcripciones de notas de voz entrantes se enmarcan como texto generado por máquina,
      no confiable en el contexto del agente; la detección de menciones todavía usa la transcripción
      en bruto para que los mensajes de voz con restricción de mención continúen funcionando.

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

    Las notas de video no admiten leyendas; el texto del mensaje proporcionado se envía por separado.

    ### Stickers

    Manejo de stickers entrantes:

    - WEBP estático: descargado y procesado (marcador de posición `<media:sticker>`)
    - TGS animado: omitido
    - WEBM de video: omitido

    Campos de contexto del sticker:

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Archivo de caché de stickers:

    - `~/.openclaw/telegram/sticker-cache.json`

    Los stickers se describen una vez (cuando es posible) y se almacenan en caché para reducir las llamadas de visión repetidas.

    Habilitar acciones de stickers:

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

    Acción de enviar sticker:

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Buscar stickers en caché:

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
    Las reacciones de Telegram llegan como actualizaciones de `message_reaction` (separadas de las cargas útiles de mensajes).

    Cuando están habilitadas, OpenClaw pone en cola eventos del sistema como:

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Configuración:

    - `channels.telegram.reactionNotifications`: `off | own | all` (predeterminado: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (predeterminado: `minimal`)

    Notas:

    - `own` significa solo reacciones de los usuarios a mensajes enviados por el bot (mejor esfuerzo a través del caché de mensajes enviados).
    - Los eventos de reacción todavía respetan los controles de acceso de Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`); los remitentes no autorizados son descartados.
    - Telegram no proporciona IDs de hilo en las actualizaciones de reacción.
      - los grupos que no son foros se redirigen a la sesión de chat del grupo
      - los grupos de foro se redirigen a la sesión del tema general del grupo (`:topic:1`), no al tema de origen exacto

    `allowed_updates` para sondeo/webhook incluyen `message_reaction` automáticamente.

  </Accordion>

  <Accordion title="Reacciones de reconocimiento">
    `ackReaction` envía un emoji de reconocimiento mientras OpenClaw procesa un mensaje entrante.

    Orden de resolución:

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - reserva de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Telegram espera emoji unicode (por ejemplo "👀").
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    Las escrituras de configuración del canal están habilitadas de forma predeterminada (`configWrites !== false`).

    Las escrituras activadas por Telegram incluyen:

    - eventos de migración de grupo (`migrate_to_chat_id`) para actualizar `channels.telegram.groups`
    - `/config set` y `/config unset` (requiere habilitación de comandos)

    Desactivar:

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
    El valor predeterminado es sondeo largo (long polling). Para el modo webhook, configure `channels.telegram.webhookUrl` y `channels.telegram.webhookSecret`; opcional `webhookPath`, `webhookHost`, `webhookPort` (valores predeterminados `/telegram-webhook`, `127.0.0.1`, `8787`).

    En modo de sondeo largo, OpenClaw persiste su marca de agua de reinicio solo después de que una actualización se envíe correctamente. Si un controlador falla, esa actualización permanece reintentable en el mismo proceso y no se escribe como completada para la deduplicación de reinicio.

    El oyente local se enlaza a `127.0.0.1:8787`. Para el ingreso público, coloque un proxy inverso delante del puerto local o configure `webhookHost: "0.0.0.0"` intencionalmente.

    El modo webhook valida los guardianes de solicitud, el token secreto de Telegram y el cuerpo JSON antes de devolver `200` a Telegram.
    OpenClaw luego procesa la actualización de forma asíncrona a través de los mismos carriles de bot por chat/por tema utilizados por el sondeo largo, por lo que los turnos lentos del agente no retienen el ACK de entrega de Telegram.

  </Accordion>

  <Accordion title="Límites, reintentos y destinos de CLI">
    - `channels.telegram.textChunkLimit` el valor predeterminado es 4000.
    - `channels.telegram.chunkMode="newline"` prefiere los límites de párrafo (líneas en blanco) antes de la división por longitud.
    - `channels.telegram.mediaMaxMb` (predeterminado 100) limita el tamaño de los medios de Telegram entrantes y salientes.
    - `channels.telegram.mediaGroupFlushMs` (predeterminado 500) controla cuánto tiempo se almacenan en búfer los álbumes/grupos de medios de Telegram antes de que OpenClaw los envíe como un mensaje entrante. Auméntelo si las partes del álbum llegan tarde; disminúyalo para reducir la latencia de respuesta del álbum.
    - `channels.telegram.timeoutSeconds` anula el tiempo de espera del cliente de la API de Telegram (si no está configurado, se aplica el valor predeterminado de grammY). Los clientes del bot restringen los valores configurados por debajo del límite de solicitud de texto/digitación saliente de 60 segundos para que grammY no anule la entrega de respuestas visibles antes de que puedan ejecutarse el límite de transporte y la alternativa de OpenClaw. El sondeo largo todavía utiliza un límite de solicitud `getUpdates` de 45 segundos para que los sondeos inactivos no se abandonen indefinidamente.
    - `channels.telegram.pollingStallThresholdMs` el valor predeterminado es `120000`; ajústelo entre `30000` y `600000` solo para reinicios por detención de sondeo falsos positivos.
    - el historial de contexto de grupo utiliza `channels.telegram.historyLimit` o `messages.groupChat.historyLimit` (predeterminado 50); `0` lo desactiva.
    - el contexto complementario de respuesta/cita/reenvío se normaliza en una ventana de contexto de conversación seleccionada cuando la puerta de enlace ha observado los mensajes principales; la caché de mensajes observados se guarda junto con el almacén de sesiones. Telegram solo incluye un `reply_to_message` superficial en las actualizaciones, por lo que las cadenas más antiguas que la caché se limitan a la carga útil de actualización actual de Telegram.
    - las listas de permitidos de Telegram controlan principalmente quién puede activar el agente, no un límite completo de redacción de contexto complementario.
    - controles de historial de MD:
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuración `channels.telegram.retry` se aplica a los asistentes de envío de Telegram (CLI/herramientas/acciones) para errores de API salientes recuperables. La entrega de respuesta final entrante también utiliza un reintento de envío seguro limitado para fallos de preconexión de Telegram, pero no reintenta sobres de red posteriores al envío ambiguos que podrían duplicar los mensajes visibles.

    Los destinos de envío de CLI y herramientas de mensajes pueden ser ID de chat numérico, nombre de usuario o un destino de tema de foro:

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    Los sondeos de Telegram utilizan `openclaw message poll` y admiten temas de foro:

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Indicadores de sondeo solo para Telegram:

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` para temas de foro (o use un destino `:topic:`)

    El envío de Telegram también admite:

    - `--presentation` con bloques `buttons` para teclados en línea cuando `channels.telegram.capabilities.inlineButtons` lo permite
    - `--pin` o `--delivery '{"pin":true}'` para solicitar una entrega fijada cuando el bot puede fijar en ese chat
    - `--force-document` para enviar imágenes, GIF y videos salientes como documentos en lugar de fotos comprimidas, medios animados o cargas de video

    Control de acciones:

    - `channels.telegram.actions.sendMessage=false` desactiva los mensajes salientes de Telegram, incluidos los sondeos
    - `channels.telegram.actions.poll=false` desactiva la creación de sondeos de Telegram dejando activados los envíos normales

  </Accordion>

  <Accordion title="Aprobaciones de ejecución en Telegram">
    Telegram admite aprobaciones de ejecución en los MD de los aprobadores y, opcionalmente, puede publicar solicitudes en el chat o tema de origen. Los aprobadores deben ser IDs de usuario de Telegram numéricos.

    Ruta de configuración:

    - `channels.telegram.execApprovals.enabled` (se habilita automáticamente cuando al menos un aprobador es resoluble)
    - `channels.telegram.execApprovals.approvers` (recurre a IDs de propietarios numéricos de `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target`: `dm` (predeterminado) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` y `defaultTo` controlan quién puede hablar con el bot y dónde envía las respuestas normales. No convierten a alguien en aprobador de ejecución. El primer emparejamiento de MD aprobado inicializa `commands.ownerAllowFrom` cuando aún no existe un propietario de comando, por lo que la configuración de un solo propietario sigue funcionando sin duplicar IDs en `execApprovals.approvers`.

    La entrega del canal muestra el texto del comando en el chat; habilite `channel` o `both` solo en grupos/temas de confianza. Cuando la solicitud aterriza en un tema de foro, OpenClaw conserva el tema para la solicitud de aprobación y el seguimiento. Las aprobaciones de ejecución caducan después de 30 minutos de forma predeterminada.

    Los botones de aprobación en línea también requieren `channels.telegram.capabilities.inlineButtons` para permitir la superficie de destino (`dm`, `group` o `all`). Los IDs de aprobación con el prefijo `plugin:` se resuelven a través de aprobaciones de complementos; otros se resuelven primero a través de aprobaciones de ejecución.

    Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Controles de respuesta de error

Cuando el agente encuentra un error de entrega o del proveedor, Telegram puede responder con el texto del error o suprimirlo. Dos claves de configuración controlan este comportamiento:

| Clave                               | Valores           | Por defecto | Descripción                                                                                                 |
| ----------------------------------- | ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`     | `reply` envía un mensaje de error amigable al chat. `silent` suprime completamente las respuestas de error. |
| `channels.telegram.errorCooldownMs` | número (ms)       | `60000`     | Tiempo mínimo entre respuestas de error al mismo chat. Evita el spam de errores durante interrupciones.     |

Se admiten anulaciones por cuenta, por grupo y por tema (misma herencia que otras claves de configuración de Telegram).

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
    - `openclaw channels status` advierte cuando la configuración espera mensajes de grupo no mencionados.
    - `openclaw channels status --probe` puede verificar IDs numéricos de grupo explícitos; el comodín `"*"` no puede sondear la membresía.
    - prueba rápida de sesión: `/activation always`.

  </Accordion>

  <Accordion title="El bot no ve ningún mensaje del grupo">

    - cuando `channels.telegram.groups` existe, el grupo debe estar listado (o incluir `"*"`)
    - verificar la membresía del bot en el grupo
    - revisar los registros: `openclaw logs --follow` para ver los motivos de omisión

  </Accordion>

  <Accordion title="Los comandos funcionan parcialmente o no funcionan">

    - autoriza tu identidad de remitente (emparejamiento y/o ID numérico `allowFrom`)
    - la autorización de comandos aún se aplica incluso cuando la política de grupo es `open`
    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú nativo tiene demasiadas entradas; reduce los comandos de complemento/habilidad/personalizados o deshabilita los menús nativos
    - `deleteMyCommands` / `setMyCommands` llamadas de inicio y `sendChatAction` llamadas de escritura están limitadas y se reintentan una vez a través de la alternativa de transporte de Telegram en caso de tiempo de espera de solicitud. Los errores persistentes de red/recuperación generalmente indican problemas de alcance DNS/HTTPS hacia `api.telegram.org`

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` es un fallo de autenticación de Telegram para el token del bot configurado.
    - Vuelve a copiar o regenera el token del bot en BotFather y, a continuación, actualiza `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken` o `TELEGRAM_BOT_TOKEN` para la cuenta predeterminada.
    - `deleteWebhook 401 Unauthorized` durante el inicio también es un fallo de autenticación; tratarlo como "no existe ningún webhook" solo pospondría el mismo fallo de token incorrecto a llamadas a la API posteriores.

  </Accordion>

  <Accordion title="Sondeo o inestabilidad de la red">

    - Node 22+ + fetch/proxy personalizado puede desencadenar un comportamiento de aborto inmediato si los tipos de AbortSignal no coinciden.
    - Algunos hosts resuelven `api.telegram.org` a IPv6 primero; una salida IPv6 rota puede causar fallas intermitentes en la API de Telegram.
    - Si los registros incluyen `TypeError: fetch failed` o `Network request for 'getUpdates' failed!`, OpenClaw ahora los reintentará como errores de red recuperables.
    - Durante el inicio del sondeo, OpenClaw reutiliza el sondeo de inicio `getMe` exitoso para grammY para que el ejecutor no necesite un segundo `getMe` antes del primer `getUpdates`.
    - Si `deleteWebhook` falla con un error de red transitorio durante el inicio del sondeo, OpenClaw continúa con el sondeo largo en lugar de realizar otra llamada de plano de control previa al sondeo. Un webhook aún activo se manifiesta como un conflicto de `getUpdates`; OpenClaw luego reconstruye el transporte de Telegram y reintenta la limpieza del webhook.
    - Si los sockets de Telegram se reciclan en un cadencia fija corta, verifique si hay un `channels.telegram.timeoutSeconds` bajo; los clientes de bot limitan los valores configurados por debajo de los guardias de solicitudes de salida y `getUpdates`, pero las versiones anteriores podían abortar cada sondeo o respuesta cuando esto se configuraba por debajo de esos guardias.
    - Si los registros incluyen `Polling stall detected`, OpenClaw reinicia el sondeo y reconstruye el transporte de Telegram después de 120 segundos sin actividad de vida útil de sondeo largo completada de forma predeterminada.
    - `openclaw channels status --probe` y `openclaw doctor` avisan cuando una cuenta de sondeo en ejecución no ha completado `getUpdates` después del período de gracia de inicio, cuando una cuenta de webhook en ejecución no ha completado `setWebhook` después del período de gracia de inicio, o cuando la última actividad de transporte de sondeo exitosa está obsoleta.
    - Aumente `channels.telegram.pollingStallThresholdMs` solo cuando las llamadas `getUpdates` de larga duración estén saludables pero su host aún reporta reinicios por detención falsa de sondeo. Las detenciones persistentes generalmente indican problemas de proxy, DNS, IPv6 o salida TLS entre el host y `api.telegram.org`.
    - Telegram también respeta las variables de entorno de proxy de proceso para el transporte de Bot API, incluyendo `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, y sus variantes en minúsculas. `NO_PROXY` / `no_proxy` aún pueden omitir `api.telegram.org`.
    - Si el proxy administrado por OpenClaw está configurado a través de `OPENCLAW_PROXY_URL` para un entorno de servicio y no hay ninguna variable de entorno de proxy estándar presente, Telegram también usa esa URL para el transporte de Bot API.
    - En hosts VPS con salida/TLS directa inestable, enrute las llamadas a la API de Telegram a través de `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ usa por defecto `autoSelectFamily=true` (excepto WSL2). El orden de resultados de DNS de Telegram respeta `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, luego `channels.telegram.network.dnsResultOrder`, luego el predeterminado del proceso como `NODE_OPTIONS=--dns-result-order=ipv4first`; si no aplica ninguno, Node 22+ recurre a `ipv4first`.
    - Si su host es WSL2 o explícitamente funciona mejor con el comportamiento solo IPv4, fuerce la selección de familia:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Las respuestas del rango de referencia RFC 2544 (`198.18.0.0/15`) ya están permitidas
      de forma predeterminada para descargas de medios de Telegram. Si un proxy de IP falsa de confianza o
      transparente reescribe `api.telegram.org` a alguna otra
      dirección privada/interna/de uso especial durante las descargas de medios, puede optar
      por la omisión solo para Telegram:

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La misma opción de participación está disponible por cuenta en
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si su proxy resuelve los hosts de medios de Telegram en `198.18.x.x`, deje el
      indicador peligroso apagado primero. Los medios de Telegram ya permiten el rango de referencia RFC 2544
      de forma predeterminada.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` debilita las protecciones
      SSRF de medios de Telegram. Úselo solo para entornos de proxy controlados por operadores de confianza
      como Clash, Mihomo o enrutamiento de IP falsa de Surge cuando
      sinteticen respuestas privadas o de uso especial fuera del rango de referencia RFC 2544.
      Déjelo apagado para el acceso normal a Internet público de Telegram.
    </Warning>

    - Invalidaciones de entorno (temporales):
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

Más ayuda: [Solución de problemas del canal](/es/channels/troubleshooting).

## Referencia de configuración

Referencia principal: [Referencia de configuración - Telegram](/es/gateway/config-channels#telegram).

<Accordion title="Campos de Telegram de alta señal">

- inicio/autenticación: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` debe apuntar a un archivo regular; los enlaces simbólicos son rechazados)
- control de acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de nivel superior (`type: "acp"`)
- aprobaciones de ejecución: `execApprovals`, `accounts.*.execApprovals`
- comando/menú: `commands.native`, `commands.nativeSkills`, `customCommands`
- hilos/respuestas: `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- streaming: `streaming` (vista previa), `streaming.preview.toolProgress`, `blockStreaming`
- formato/entrega: `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- medios/red: `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- raíz de API personalizada: `apiRoot` (solo raíz de la API de Bot; no incluir `/bot<TOKEN>`)
- webhook: `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- acciones/capacidades: `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reacciones: `reactionNotifications`, `reactionLevel`
- errores: `errorPolicy`, `errorCooldownMs`
- escrituras/historial: `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>
  Precedencia de multicuenta: cuando se configuran dos o más ID de cuenta, configure `channels.telegram.defaultAccount` (o incluya `channels.telegram.accounts.default`) para hacer explícito el enrutamiento predeterminado. De lo contrario, OpenClaw recurre al primer ID de cuenta normalizado y `openclaw doctor` advierte. Las cuentas con nombre heredan `channels.telegram.allowFrom` /
  `groupAllowFrom`, pero no los valores de `accounts.default.*`.
</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Telegram con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de lista blanca de grupos y temas.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a los agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Enrutamiento multiagente" icon="sitemap" href="/es/concepts/multi-agent">
    Asignar grupos y temas a agentes.
  </Card>
  <Card title="Solución de problemas" icon="wrench" href="/es/channels/troubleshooting">
    Diagnósticos multicanales.
  </Card>
</CardGroup>

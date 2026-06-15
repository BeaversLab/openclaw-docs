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
  <Card title="Configuración de la puerta de enlace" icon="settings" href="/es/gateway/configuration">
    Patrones y ejemplos completos de configuración del canal.
  </Card>
</CardGroup>

## Configuración rápida

<Steps>
  <Step title="Crear el token del bot en BotFather">
    Abre Telegram y chatea con **@BotFather** (confirma que el identificador sea exactamente `@BotFather`).

    Ejecuta `/newbot`, sigue las indicaciones y guarda el token.

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

    Respaldo de entorno: `TELEGRAM_BOT_TOKEN=...` (solo cuenta predeterminada).
    Telegram **no** usa `openclaw channels login telegram`; configura el token en config/env y luego inicia la puerta de enlace.

  </Step>

  <Step title="Iniciar la puerta de enlace y aprobar el primer MD">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Los códigos de emparejamiento caducan después de 1 hora.

  </Step>

  <Step title="Añade el bot a un grupo">
    Añade el bot a tu grupo y luego obtén ambos IDs que el acceso al grupo necesita:

    - tu ID de usuario de Telegram, utilizado en `allowFrom` / `groupAllowFrom`
    - el ID del chat de grupo de Telegram, utilizado como clave bajo `channels.telegram.groups`

    Para la configuración inicial, obtén el ID del chat de grupo desde `openclaw logs --follow`, un bot de ID reenviado o la Bot API `getUpdates`. Después de que se permita el grupo, `/whoami@<bot_username>` puede confirmar los IDs de usuario y de grupo.

    Los IDs negativos de supergrupos de Telegram que comienzan con `-100` son IDs de chat de grupo. Ponlos bajo `channels.telegram.groups`, no bajo `groupAllowFrom`.

  </Step>
</Steps>

<Note>
  El orden de resolución de tokens es consciente de la cuenta. En la práctica, los valores de configuración tienen prioridad sobre el respaldo de variables de entorno, y `TELEGRAM_BOT_TOKEN` solo se aplica a la cuenta predeterminada. Después de un inicio exitoso, OpenClaw almacena en caché la identidad del bot en el directorio de estado hasta por 24 horas para que los reinicios puedan evitar una
  llamada adicional a la API de Telegram `getMe`; cambiar o eliminar el token borra esa caché.
</Note>

## Configuración del lado de Telegram

<AccordionGroup>
  <Accordion title="Modo de privacidad y visibilidad del grupo">
    Los bots de Telegram tienen por defecto el **Modo de privacidad**, lo que limita los mensajes de grupo que reciben.

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

    `dmPolicy: "open"` con `allowFrom: ["*"]` permite que cualquier cuenta de Telegram que encuentre o adivine el comando de nombre de usuario del bot controle el bot. Úsalo solo para bots intencionalmente públicos con herramientas muy restringidas; los bots de un solo propietario deben usar `allowlist` con IDs de usuario numéricos.

    `channels.telegram.allowFrom` acepta IDs de usuario de Telegram numéricos. Los prefijos `telegram:` / `tg:` se aceptan y normalizan.
    En configuraciones multicuenta, una `channels.telegram.allowFrom` de nivel superior restrictiva se trata como un límite de seguridad: las entradas `allowFrom: ["*"]` a nivel de cuenta no hacen que esa cuenta sea pública a menos que la lista de permitidos efectiva de la cuenta todavía contenga un comodín explícito después de la fusión.
    `dmPolicy: "allowlist"` con `allowFrom` vacío bloquea todos los MDs y es rechazado por la validación de configuración.
    La configuración solicita solo IDs de usuario numéricos.
    Si actualizaste y tu configuración contiene entradas de lista de permitidos `@username`, ejecuta `openclaw doctor --fix` para resolverlas (mejor esfuerzo; requiere un token de bot de Telegram).
    Si anteriormente dependías de archivos de lista de permitidos de almacén de emparejamiento, `openclaw doctor --fix` puede recuperar entradas en `channels.telegram.allowFrom` en flujos de lista de permitidos (por ejemplo, cuando `dmPolicy: "allowlist"` aún no tiene IDs explícitos).

    Para bots de un solo propietario, prefiere `dmPolicy: "allowlist"` con IDs numéricos `allowFrom` explícitos para mantener la política de acceso duradera en la configuración (en lugar de depender de aprobaciones de emparejamiento anteriores).

    Confusión común: la aprobación de emparejamiento de MD no significa "este remitente está autorizado en todas partes".
    El emparejamiento otorga acceso a MD. Si aún no existe ningún propietario de comando, el primer emparejamiento aprobado también establece `commands.ownerAllowFrom` para que los comandos solo para propietarios y las aprobaciones de ejecución tengan una cuenta de operador explícita.
    La autorización del remitente del grupo todavía proviene de listas de permitidas de configuración explícitas.
    Si deseas "Estoy autorizado una vez y tanto los MD como los comandos de grupo funcionan", pon tu ID de usuario de Telegram numérico en `channels.telegram.allowFrom`; para comandos solo para propietarios, asegúrate de que `commands.ownerAllowFrom` contenga `telegram:<your user id>`.

    ### Cómo encontrar tu ID de usuario de Telegram

    Más seguro (sin bot de terceros):

    1. Envía un MD a tu bot.
    2. Ejecuta `openclaw logs --follow`.
    3. Lee `from.id`.

    Método de la API de Bot oficial:

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

    `groupAllowFrom` se utiliza para el filtrado de remitentes de grupos. Si no se establece, Telegram recurre a `allowFrom`.
    Las entradas `groupAllowFrom` deben ser IDs numéricos de usuario de Telegram (los prefijos `telegram:` / `tg:` se normalizan).
    No pongas IDs de chat de grupo o supergrupo de Telegram en `groupAllowFrom`. Los IDs de chat negativos pertenecen a `channels.telegram.groups`.
    Las entradas no numéricas se ignoran para la autorización de remitentes.
    Límite de seguridad (`2026.2.25+`): la autenticación de remitentes de grupos **no** hereda las aprobaciones del almacén de emparejamiento (pairing-store) de MD.
    El emparejamiento se mantiene exclusivo para MD. Para grupos, establece `groupAllowFrom` o `allowFrom` por grupo/por tema.
    Si `groupAllowFrom` no está establecido, Telegram recurre a la configuración `allowFrom`, no al almacén de emparejamiento.
    Patrón práctico para bots de un solo propietario: establece tu ID de usuario en `channels.telegram.allowFrom`, deja `groupAllowFrom` sin establecer y permite los grupos objetivo en `channels.telegram.groups`.
    Nota de ejecución: si `channels.telegram` falta completamente, la ejecución usa por defecto `groupPolicy="allowlist"` de cierre seguro a menos que `channels.defaults.groupPolicy` se establezca explícitamente.

    Configuración de grupo solo para el propietario:

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

    Pruébalo desde el grupo con `@<bot_username> ping`. Los mensajes de grupo normales no activan el bot mientras `requireMention: true`.

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

  <Tab title="Comportamiento de las menciones">
    Las respuestas en grupos requieren una mención por defecto.

    La mención puede provenir de:

    - una mención nativa `@botusername`, o
    - patrones de mención en:
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Alternativas de comandos a nivel de sesión:

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

    Obtención del ID del chat de grupo:

    - reenvíe un mensaje de grupo a `@userinfobot` / `@getidsbot`
    - o lea `chat.id` desde `openclaw logs --follow`
    - o inspeccione la `getUpdates` de la Bot API
    - después de permitir el grupo, ejecute `/whoami@<bot_username>` si los comandos nativos están habilitados

  </Tab>
</Tabs>

## Comportamiento en tiempo de ejecución

- Telegram es propiedad del proceso de puerta de enlace.
- El enrutamiento es determinista: las respuestas entrantes de Telegram vuelven a Telegram (el modelo no elige los canales).
- Los mensajes entrantes se normalizan en el sobre compartido del canal con metadatos de respuesta, marcadores de posición de medios y contexto de cadena de respuesta persistente para las respuestas de Telegram que la puerta de enlace ha observado.
- Las sesiones de grupo están aisladas por el ID de grupo. Los temas del foro añaden `:topic:<threadId>` para mantener los temas aislados.
- Los mensajes DM pueden llevar `message_thread_id`; OpenClaw lo conserva para las respuestas. Las sesiones de temas DM solo se dividen cuando Telegram `getMe` informa `has_topics_enabled: true` para el bot; de lo contrario, los DM permanecen en la sesión plana.
- El sondeo largo (long polling) utiliza el ejecutor (runner) de grammY con secuenciación por chat/hilo. La concurrencia general del sumidero del ejecutor utiliza `agents.defaults.maxConcurrent`.
- El inicio multicuenta limita las sondas `getMe` de Telegram simultáneas para que las grandes flotas de bots no desplieguen todas las sondas de cuenta a la vez.
- El sondeo largo está protegido dentro de cada proceso de puerta de enlace (gateway) para que solo un sondeador activo pueda usar un token de bot a la vez. Si aún ves conflictos `getUpdates` 409, es probable que otra puerta de enlace de OpenClaw, script o sondeador externo esté usando el mismo token.
- Por defecto, los reinicios del perro guardián de sondeo largo (long-polling) se activan después de 120 segundos sin completar `getUpdates` de actividad. Aumente `channels.telegram.pollingStallThresholdMs` solo si su implementación todavía observa reinicios falsos por estancamiento del sondeo durante trabajos de larga duración. El valor está en milisegundos y se permite desde `30000` hasta `600000`; se admiten anulaciones por cuenta.
- La API de Bot de Telegram no admite confirmaciones de lectura (`sendReadReceipts` no se aplica).

<Note>
  `channels.telegram.dm.threadReplies` y `channels.telegram.direct.<chatId>.threadReplies` se eliminaron. Ejecute `openclaw doctor --fix` después de actualizar si su configuración todavía tiene esas claves. El enrutamiento de temas de DM ahora sigue la capacidad del bot de Telegram `getMe.has_topics_enabled`, que está controlada por el modo de hilos de BotFather: los bots con temas habilitados usan sesiones DM con ámbito de hilo cuando Telegram envía `message_thread_id`; los otros DM permanecen en la sesión plana.
</Note>

## Referencia de funciones

<AccordionGroup>
  <Accordion title="Live stream preview (message edits)">
    OpenClaw puede transmitir respuestas parciales en tiempo real:

    - chats directos: mensaje de vista previa + `editMessageText`
    - grupos/temas: mensaje de vista previa + `editMessageText`
    - progreso de herramientas de chat directo: vista previa de estado nativa opcional de `sendMessageDraft` cuando está habilitado y es compatible

    Requisitos:

    - `channels.telegram.streaming` es `off | partial | block | progress` (predeterminado: `partial`)
    - `progress` mantiene un borrador de estado editable para el progreso de la herramienta, lo borra al finalizar y envía la respuesta final como un mensaje normal
    - `streaming.preview.toolProgress` controla si las actualizaciones de herramienta/progreso reutilizan el mismo mensaje de vista previa editado (predeterminado: `true` cuando la transmisión de vista previa está activa)
    - `streaming.preview.commandText` controla el detalle de comando/exec dentro de esas líneas de progreso de herramienta: `raw` (predeterminado, preserva el comportamiento publicado) o `status` (solo etiqueta de herramienta)
    - se detectan los valores heredados de `channels.telegram.streamMode` y los valores booleanos de `streaming`; ejecute `openclaw doctor --fix` para migrarlos a `channels.telegram.streaming.mode`

    Las actualizaciones de vista previa del progreso de la herramienta son las líneas de estado cortas que se muestran mientras se ejecutan las herramientas, por ejemplo, la ejecución de comandos, la lectura de archivos, las actualizaciones de planificación, los resúmenes de parches o el texto de preámbulo/comentario de Codex en el modo de servidor de aplicaciones de Codex. Telegram los mantiene habilitados de forma predeterminada para coincidir con el comportamiento publicado de OpenClaw desde `v2026.4.22` y versiones posteriores.

    Los chats directos pueden usar los borradores nativos de Telegram para estas líneas de progreso de herramientas sin persistir el ruido de la herramienta en el historial del chat. Los borradores nativos se detienen antes de que comience el texto de la respuesta; las respuestas finales permanecen en la ruta de entrega persistente normal. Esta vía está desactivada de forma predeterminada y primero debe restringirse a IDs de MD de confianza:

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": true,
              "nativeToolProgress": true,
              "nativeToolProgressAllowFrom": ["123456789"]
            }
          }
        }
      }
    }
    ```

    Para mantener la vista previa editada para el texto de respuesta pero ocultar las líneas de progreso de la herramienta, configure:

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

    Para mantener el progreso de la herramienta visible pero ocultar el texto de comando/exec, configure:

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

    Use el modo `progress` cuando desee un progreso de herramienta visible sin editar la respuesta final en ese mismo mensaje. Coloque la política de texto de comando en `streaming.progress`:

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

    Use `streaming.mode: "off"` solo cuando desee la entrega solo final: las ediciones de vista previa de Telegram están deshabilitadas y el ruido genérico de herramienta/progreso se suprime en lugar de enviarse como mensajes de estado independientes. Las solicitudes de aprobación, las cargas útiles de medios y los errores aún se enrutan a través de la entrega final normal. Use `streaming.preview.toolProgress: false` cuando solo desee mantener las ediciones de vista previa de la respuesta mientras oculta las líneas de estado de progreso de la herramienta.

    <Note>
      Las respuestas de cita seleccionadas de Telegram son la excepción. Cuando `replyToMode` es `"first"`, `"all"` o `"batched"` y el mensaje entrante incluye texto de cita seleccionado, OpenClaw envía la respuesta final a través de la ruta de respuesta de cita nativa de Telegram en lugar de editar la vista previa de la respuesta, por lo que `streaming.preview.toolProgress` no puede mostrar las líneas de estado cortas para ese turno. Las respuestas de mensajes actuales sin texto de cita seleccionado aún mantienen la transmisión de vista previa. Establezca `replyToMode: "off"` cuando la visibilidad del progreso de la herramienta sea más importante que las respuestas de cita nativas, o establezca `streaming.preview.toolProgress: false` para reconocer el compromiso.
    </Note>

    Para respuestas solo de texto:

    - vistas previas cortas de DM/grupo/tema: OpenClaw mantiene el mismo mensaje de vista previa y realiza la edición final en su lugar
    - los textos finales largos que se dividen en múltiples mensajes de Telegram reutilizan la vista previa existente como el primer fragmento final cuando es posible, y luego envían solo los fragmentos restantes
    - los finales en modo de progreso borran el borrador de estado y usan la entrega final normal en lugar de editar el borrador en la respuesta
    - si la edición final falla antes de que se confirme el texto completado, OpenClaw usa la entrega final normal y limpia la vista previa obsoleta

    Para respuestas complejas (por ejemplo, cargas útiles de medios), OpenClaw vuelve a la entrega final normal y luego limpia el mensaje de vista previa.

    La transmisión de vista previa es independiente de la transmisión de bloques. Cuando la transmisión de bloques está explícitamente habilitada para Telegram, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

    Comportamiento de transmisión de razonamiento:

    - `/reasoning stream` usa la ruta de vista previa de razonamiento de un canal compatible; en Telegram, transmite el razonamiento a la vista previa en vivo mientras se genera
    - la vista previa de razonamiento se elimina después de la entrega final; use `/reasoning on` cuando el razonamiento debe permanecer visible
    - la respuesta final se envía sin texto de razonamiento

  </Accordion>

  <Accordion title="Formato y reserva HTML">
    El texto saliente utiliza Telegram `parse_mode: "HTML"`.

    - El texto tipo Markdown se convierte en HTML seguro para Telegram.
    - Las etiquetas HTML compatibles con Telegram se conservan; el HTML no compatible se escapa.
    - Si Telegram rechaza el HTML analizado, OpenClaw lo reintenta como texto plano.

    Las vistas previas de enlaces están habilitadas de forma predeterminada y se pueden deshabilitar con `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Comandos nativos y comandos personalizados">
    El registro del menú de comandos de Telegram se gestiona al inicio con `setMyCommands`.

    Valores predeterminados de comandos nativos:

    - `commands.native: "auto"` activa los comandos nativos para Telegram

    Añadir entradas de menú de comandos personalizados:

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
    - los comandos de complemento/habilidad aún pueden funcionar al escribirse incluso si no se muestran en el menú de Telegram

    Si los comandos nativos están desactivados, los integrados se eliminan. Los comandos personalizados/de complemento aún pueden registrarse si están configurados.

    Fallos comunes de configuración:

    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú de Telegram todavía se desbordó después de recortar; reduzca los comandos de complemento/habilidad/personalizados o desactive `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands` o `setMyCommands` fallando con `404: Not Found` mientras que los comandos directos de curl de la API de Bot funcionan puede significar que `channels.telegram.apiRoot` se estableció en el punto final `/bot<TOKEN>` completo. `apiRoot` debe ser solo la raíz de la API de Bot, y `openclaw doctor --fix` elimina una `/bot<TOKEN>` final accidental.
    - `getMe returned 401` significa que Telegram rechazó el token de bot configurado. Actualice `botToken`, `tokenFile` o `TELEGRAM_BOT_TOKEN` con el token actual de BotFather; OpenClaw se detiene antes del sondeo, por lo que esto no se reporta como un fallo de limpieza de webhook.
    - `setMyCommands failed` con errores de red/obtención generalmente significa que el DNS/HTTPS saliente a `api.telegram.org` está bloqueado.

    ### Comandos de emparejamiento de dispositivos (complemento `device-pair`)

    Cuando el complemento `device-pair` está instalado:

    1. `/pair` genera el código de configuración
    2. pegar el código en la aplicación de iOS
    3. `/pair pending` enumera las solicitudes pendientes (incluyendo rol/alcances)
    4. aprobar la solicitud:
       - `/pair approve <requestId>` para aprobación explícita
       - `/pair approve` cuando solo hay una solicitud pendiente
       - `/pair approve latest` para la más reciente

    El código de configuración lleva un token de arranque de corta duración. El arranque del código de configuración integrado es solo para nodos: la primera conexión crea una solicitud de nodo pendiente y, después de la aprobación, la puerta de enlace devuelve un token de nodo duradero con `scopes: []`. No devuelve un token de operador transferido; el acceso de operador requiere un flujo de token o emparejamiento de operador aprobado por separado.

    Si un dispositivo vuelve a intentar con detalles de autenticación modificados (por ejemplo, rol/alcances/clave pública), la solicitud pendiente anterior se reemplaza y la nueva solicitud usa un `requestId` diferente. Vuelva a ejecutar `/pair pending` antes de aprobar.

    Más detalles: [Emparejamiento](/es/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Botones en línea">
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

    Ejemplo de botón de Mini App:

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Open app:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [{ label: "Launch", web_app: { url: "https://example.com/app" } }],
      },
    ],
  },
}
```

    Los botones `web_app` de Telegram solo funcionan en chats privados entre un usuario y el
    bot.

    Los clics en las devoluciones de llamada se pasan al agente como texto:
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Acciones de mensajes de Telegram para agentes y automatización">
    Las acciones de herramientas de Telegram incluyen:

    - `sendMessage` (`to`, `content`, `mediaUrl` opcional, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content` o `caption`, `presentation` opcional de botones en línea; las ediciones solo de botones actualizan el marcado de respuesta)
    - `createForumTopic` (`chatId`, `name`, `iconColor` opcional, `iconCustomEmojiId`)

    Las acciones de mensajes del canal exponen alias ergonómicos (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Controles de puerta (Gating controls):

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (predeterminado: deshabilitado)

    Nota: `edit` y `topic-create` están habilitados actualmente de forma predeterminada y no tienen interruptores `channels.telegram.actions.*` separados.
    Los envíos en tiempo de ejecución utilizan la instantánea activa de configuración/secretos (inicio/recarga), por lo que las rutas de acción no realizan una re-resolución ad-hoc de SecretRef por cada envío.

    Semántica de eliminación de reacciones: [/tools/reactions](/es/tools/reactions)

  </Accordion>

  <Accordion title="Etiquetas de hilos de respuesta">
    Telegram admite etiquetas explícitas de hilos de respuesta en la salida generada:

    - `[[reply_to_current]]` responde al mensaje desencadenante
    - `[[reply_to:<id>]]` responde a un ID de mensaje específico de Telegram

    `channels.telegram.replyToMode` controles de manejo:

    - `off` (por defecto)
    - `first`
    - `all`

    Cuando los hilos de respuesta están habilitados y el texto o pie de foto original de Telegram está disponible, OpenClaw incluye automáticamente un extracto de cita nativo de Telegram. Telegram limita el texto de cita nativo a 1024 unidades de código UTF-16, por lo que los mensajes más largos se citan desde el principio y se recurre a una respuesta simple si Telegram rechaza la cita.

    Nota: `off` deshabilita el hilo de respuesta implícito. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.

  </Accordion>

  <Accordion title="Temas del foro y comportamiento de hilos">
    Supergrupos de foro:

    - las claves de sesión del tema agregan `:topic:<threadId>`
    - las respuestas y la escritura se dirigen al hilo del tema
    - ruta de configuración del tema:
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Caso especial del tema general (`threadId=1`):

    - el envío de mensajes omite `message_thread_id` (Telegram rechaza `sendMessage(...thread_id=1)`)
    - las acciones de escritura aún incluyen `message_thread_id`

    Herencia del tema: las entradas del tema heredan la configuración del grupo a menos que se anulen (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` es exclusivo del tema y no se hereda de los valores predeterminados del grupo.
    `topics."*"` establece los valores predeterminados para cada tema en ese grupo; los IDs de tema exactos tienen prioridad sobre `"*"`.

    **Enrutamiento de agente por tema**: Cada tema puede enrutar a un agente diferente estableciendo `agentId` en la configuración del tema. Esto otorga a cada tema su propio espacio de trabajo, memoria y sesión aislados. Ejemplo:

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

    **Vinculación persistente del tema ACP**: Los temas del foro pueden fijar sesiones del arnés ACP a través de vinculaciones ACP escritas de nivel superior (`bindings[]` con `type: "acp"` y `match.channel: "telegram"`, `peer.kind: "group"`, y un ID calificado por tema como `-1001234567890:topic:42`). Actualmente limitado a temas de foro en grupos/supergrupos. Consulte [ACP Agents](/es/tools/acp-agents).

    **Generación de ACP ligada al hilo desde el chat**: `/acp spawn <agent> --thread here|auto` vincula el tema actual a una nueva sesión ACP; las respuestas directas se enrutan allí. OpenClaw fija la confirmación de generación dentro del tema. Requiere que `channels.telegram.threadBindings.spawnSessions` permanezca habilitado (predeterminado: `true`).

    El contexto de la plantilla expone `MessageThreadId` y `IsForum`. Los chats de MD con `message_thread_id` mantienen los metadatos de respuesta; usan claves de sesión conscientes de los hilos solo cuando Telegram `getMe` informa `has_topics_enabled: true` para el bot.
    Las antiguas anulaciones `dm.threadReplies` y `direct.*.threadReplies` se han retirado intencionalmente; utilice el modo de hilos de BotFather como la única fuente de verdad y ejecute `openclaw doctor --fix` para eliminar las claves de configuración obsoletas.

  </Accordion>

  <Accordion title="Audio, video y pegatinas">
    ### Mensajes de audio

    Telegram distingue entre notas de voz y archivos de audio.

    - predeterminado: comportamiento de archivo de audio
    - etiqueta `[[audio_as_voice]]` en la respuesta del agente para forzar el envío de nota de voz
    - las transcripciones de notas de voz entrantes se enmarcan como texto generado por máquina y no confiable en el contexto del agente; la detección de menciones sigue utilizando la transcripción sin procesar, por lo que los mensajes de voz restringidos por menciones continúan funcionando.

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

    ### Mensajes de vídeo

    Telegram distingue entre archivos de vídeo y notas de vídeo.

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

    Las notas de vídeo no admiten subtítulos; el texto del mensaje proporcionado se envía por separado.

    ### Pegatinas

    Manejo de pegatinas entrantes:

    - WEBP estático: descargado y procesado (marcador de posición `<media:sticker>`)
    - TGS animado: omitido
    - WEBM de vídeo: omitido

    Campos de contexto de pegatinas:

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Las descripciones de las pegatinas se almacenan en caché en el estado del complemento SQLite de OpenClaw para reducir las llamadas de visión repetidas.

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

  <Accordion title="Reaction notifications">
    Las reacciones de Telegram llegan como actualizaciones de `message_reaction` (separadas de las cargas útiles de los mensajes).

    Cuando están habilitadas, OpenClaw pone en cola eventos del sistema como:

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Configuración:

    - `channels.telegram.reactionNotifications`: `off | own | all` (predeterminado: `own`)
    - `channels.telegram.reactionLevel`: `off | ack | minimal | extensive` (predeterminado: `minimal`)

    Notas:

    - `own` significa solo las reacciones de los usuarios a los mensajes enviados por el bot (mejor esfuerzo mediante el caché de mensajes enviados).
    - Los eventos de reacción todavía respetan los controles de acceso de Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`); los remitentes no autorizados se descartan.
    - Telegram no proporciona IDs de hilo en las actualizaciones de reacción.
      - los grupos que no son foro se dirigen a la sesión de chat del grupo
      - los grupos de foro se dirigen a la sesión del tema general del grupo (`:topic:1`), no al tema de origen exacto

    `allowed_updates` para sondeo/webhook incluyen `message_reaction` automáticamente.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` envía un emoji de reconocimiento mientras OpenClaw procesa un mensaje entrante. `ackReactionScope` decide *cuándo* se envía realmente ese emoji.

    **Orden de resolución del emoji (`ackReaction`):**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - emoji de respaldo de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Telegram espera emoji unicode (por ejemplo "👀").
    - Use `""` para desactivar la reacción para un canal o cuenta.

    **Ámbito (`messages.ackReactionScope`):**

    El proveedor de Telegram lee el ámbito desde `messages.ackReactionScope` (por defecto `"group-mentions"`). Hoy no hay una invalidación a nivel de cuenta de Telegram o de canal de Telegram.

    Valores: `"all"` (MDs + grupos), `"direct"` (solo MDs), `"group-all"` (cada mensaje de grupo, sin MDs), `"group-mentions"` (grupos cuando el bot es mencionado; **sin MDs** — este es el predeterminado), `"off"` / `"none"` (desactivado).

    <Note>
    El ámbito predeterminado (`"group-mentions"`) no dispara reacciones de reconocimiento en mensajes directos. Para obtener una reacción de reconocimiento en MDs entrantes de Telegram, establezca `messages.ackReactionScope` en `"direct"` o `"all"`. El valor se lee al inicio del proveedor de Telegram, por lo que se necesita un reinicio de la puerta de enlace para que el cambio surta efecto.
    </Note>

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    Las escrituras de configuración del canal están habilitadas por defecto (`configWrites !== false`).

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
    De forma predeterminada es long polling. Para el modo webhook establezca `channels.telegram.webhookUrl` y `channels.telegram.webhookSecret`; opcional `webhookPath`, `webhookHost`, `webhookPort` (predeterminados `/telegram-webhook`, `127.0.0.1`, `8787`).

    En modo long-polling, OpenClaw persiste su marca de agua de reinicio solo después de que una actualización se despache correctamente. Si un controlador falla, esa actualización permanece reintentable en el mismo proceso y no se escribe como completada para la deduplicación de reinicio.

    El oyente local se vincula a `127.0.0.1:8787`. Para el ingreso público, coloque un proxy inverso frente al puerto local o configure `webhookHost: "0.0.0.0"` intencionalmente.

    El modo webhook valida los guardias de solicitud, el token secreto de Telegram y el cuerpo JSON antes de devolver `200` a Telegram.
    OpenClaw luego procesa la actualización de forma asincrónica a través de los mismos carriles de bot por chat/por tema utilizados por long polling, por lo que los turnos lentos del agente no retienen el ACK de entrega de Telegram.

  </Accordion>

  <Accordion title="Límites, reintentos y objetivos de CLI">
    - `channels.telegram.textChunkLimit` el valor predeterminado es 4000.
    - `channels.telegram.chunkMode="newline"` prefiere los límites de párrafo (líneas en blanco) antes de la división por longitud.
    - `channels.telegram.mediaMaxMb` (valor predeterminado 100) limita el tamaño de los medios de Telegram entrantes y salientes.
    - `channels.telegram.mediaGroupFlushMs` (valor predeterminado 500) controla cuánto tiempo se almacenan en búfer los álbumes/grupos de medios de Telegram antes de que OpenClaw los envíe como un mensaje entrante. Auméntelo si las partes del álbum llegan tarde; disminúyalo para reducir la latencia de respuesta del álbum.
    - `channels.telegram.timeoutSeconds` anula el tiempo de espera del cliente de la API de Telegram (si no se establece, se aplica el valor predeterminado de grammY). Los clientes de bot restringen los valores configurados por debajo del protector de solicitud de texto/escritura saliente de 60 segundos para que grammY no cancele la entrega de respuestas visibles antes de que se ejecuten el protector de transporte y la reserva de OpenClaw. El sondeo largo aún utiliza un protector de solicitud `getUpdates` de 45 segundos para que las encuestas inactivas no se abandonen indefinidamente.
    - `channels.telegram.pollingStallThresholdMs` tiene como valor predeterminado `120000`; ajústelo entre `30000` y `600000` solo para reinicios por bloqueos de sondeo falsos positivos.
    - el historial de contexto de grupo utiliza `channels.telegram.historyLimit` o `messages.groupChat.historyLimit` (valor predeterminado 50); `0` lo deshabilita.
    - el contexto complementario de respuesta/cita/reenvío se normaliza en una ventana de contexto de conversación seleccionada cuando la puerta de enlace ha observado los mensajes principales; el caché de mensajes observados reside en el estado del complemento OpenClaw SQLite y `openclaw doctor --fix` importa sidecars heredados. Telegram solo incluye una `reply_to_message` superficial en las actualizaciones, por lo que las cadenas más antiguas que el caché se limitan a la carga útil de actualización actual de Telegram.
    - las listas de permitidos de Telegram controlan principalmente quién puede activar el agente, no un límite completo de redacción de contexto complementario.
    - controles de historial de MD:
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuración `channels.telegram.retry` se aplica a los asistentes de envío de Telegram (CLI/herramientas/acciones) para errores de API salientes recuperables. La entrega de respuesta final entrante también utiliza un reintento de envío seguro limitado para fallos de preconexión de Telegram, pero no reintenta sobres de red posteriores al envío ambiguos que podrían duplicar los mensajes visibles.

    Los objetivos de envío de CLI y herramientas de mensajes pueden ser una ID de chat numérica, un nombre de usuario o un objetivo de tema de foro:

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```

    Las encuestas de Telegram utilizan `openclaw message poll` y admiten temas de foro:

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Indicadores de encuesta solo de Telegram:

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` para temas de foro (o use un objetivo `:topic:`)

    El envío de Telegram también admite:

    - `--presentation` con bloques `buttons` para teclados en línea cuando `channels.telegram.capabilities.inlineButtons` lo permite
    - `--pin` o `--delivery '{"pin":true}'` para solicitar entrega fijada cuando el bot puede fijar en ese chat
    - `--force-document` para enviar imágenes, GIF y videos salientes como documentos en lugar de fotos comprimidas, medios animados o cargas de video

    Control de acciones:

    - `channels.telegram.actions.sendMessage=false` deshabilita los mensajes salientes de Telegram, incluidas las encuestas
    - `channels.telegram.actions.poll=false` deshabilita la creación de encuestas de Telegram mientras deja habilitados los envíos regulares

  </Accordion>

  <Accordion title="Aprobaciones de ejecución en Telegram">
    Telegram admite aprobaciones de ejecución en MD de aprobadores y, opcionalmente, puede publicar solicitudes en el chat o tema de origen. Los aprobadores deben ser ID de usuario numéricos de Telegram.

    Ruta de configuración:

    - `channels.telegram.execApprovals.enabled` (se habilita automáticamente cuando al menos un aprobador es resoluble)
    - `channels.telegram.execApprovals.approvers` (recurra a los ID de propietario numéricos de `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target`: `dm` (predeterminado) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` y `defaultTo` controlan quién puede hablar con el bot y dónde envía las respuestas normales. No convierten a alguien en un aprobador de ejecución. El primer emparejamiento de MD aprobado inicializa `commands.ownerAllowFrom` cuando aún no existe un propietario de comando, por lo que la configuración de un solo propietario aún funciona sin duplicar ID en `execApprovals.approvers`.

    La entrega del canal muestra el texto del comando en el chat; habilite `channel` o `both` solo en grupos/temas de confianza. Cuando la solicitud aterriza en un tema de foro, OpenClaw preserva el tema para la solicitud de aprobación y el seguimiento. Las aprobaciones de ejecución caducan después de 30 minutos de forma predeterminada.

    Los botones de aprobación en línea también requieren `channels.telegram.capabilities.inlineButtons` para permitir la superficie de destino (`dm`, `group` o `all`). Los ID de aprobación con el prefijo `plugin:` se resuelven a través de aprobaciones de complementos; otros se resuelven primero a través de aprobaciones de ejecución.

    Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Controles de respuesta de error

Cuando el agente encuentra un error de entrega o de proveedor, Telegram puede responder con el texto del error o suprimirlo. Dos claves de configuración controlan este comportamiento:

| Clave                               | Valores           | Predeterminado | Descripción                                                                                                 |
| ----------------------------------- | ----------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`        | `reply` envía un mensaje de error amigable al chat. `silent` suprime completamente las respuestas de error. |
| `channels.telegram.errorCooldownMs` | número (ms)       | `60000`        | Tiempo mínimo entre respuestas de error al mismo chat. Evita el spam de errores durante interrupciones.     |

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
    - `openclaw channels status` advierte cuando la configuración espera mensajes de grupo sin mención.
    - `openclaw channels status --probe` puede verificar IDs de grupo numéricos explícitos; el comodín `"*"` no puede sondearse para membresía.
    - prueba rápida de sesión: `/activation always`.

  </Accordion>

  <Accordion title="El bot no ve los mensajes del grupo en absoluto">

    - cuando `channels.telegram.groups` existe, el grupo debe estar listado (o incluir `"*"`)
    - verifica la membresía del bot en el grupo
    - revisa los registros: `openclaw logs --follow` para conocer las razones de omisión

  </Accordion>

  <Accordion title="Los comandos funcionan parcialmente o no funcionan en absoluto">

    - autoriza tu identidad de remitente (emparejamiento y/o `allowFrom` numérico)
    - la autorización de comandos todavía se aplica incluso cuando la política de grupo es `open`
    - `setMyCommands failed` con `BOT_COMMANDS_TOO_MUCH` significa que el menú nativo tiene demasiadas entradas; reduce los comandos de complemento/habilidad/personalizados o deshabilita los menús nativos
    - las llamadas de inicio `deleteMyCommands` / `setMyCommands` y las llamadas de escritura `sendChatAction` están limitadas y se reintentan una vez a través de la alternativa de transporte de Telegram en caso de tiempo de espera de solicitud. Los errores persistentes de red/obtención generalmente indican problemas de accesibilidad DNS/HTTPS a `api.telegram.org`

  </Accordion>

  <Accordion title="El inicio indica token no autorizado">

    - `getMe returned 401` es un error de autenticación de Telegram para el token del bot configurado.
    - Vuelve a copiar o regenera el token del bot en BotFather y, a continuación, actualiza `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken` o `TELEGRAM_BOT_TOKEN` para la cuenta predeterminada.
    - `deleteWebhook 401 Unauthorized` durante el inicio también es un error de autenticación; tratarlo como «no existe ningún webhook» solo pospondría el mismo error de token incorrecto a llamadas a la API posteriores.

  </Accordion>

  <Accordion title="Sondeo o inestabilidad de la red">

    - Node 22+ + fetch/proxy personalizado puede activar un comportamiento de cancelación inmediata si los tipos de AbortSignal no coinciden.
    - Algunos servidores resuelven `api.telegram.org` primero a IPv6; una salida IPv6 rota puede causar fallos intermitentes de la API de Telegram.
    - Si los registros incluyen `TypeError: fetch failed` o `Network request for 'getUpdates' failed!`, OpenClaw ahora los reintentos como errores de red recuperables.
    - Durante el inicio del sondeo, OpenClaw reutiliza el sondeo de inicio `getMe` exitoso para grammY, por lo que el ejecutor no necesita un segundo `getMe` antes del primer `getUpdates`.
    - Si `deleteWebhook` falla con un error de red transitorio durante el inicio del sondeo, OpenClaw continúa con el sondeo largo en lugar de realizar otra llamada de plano de control previa al sondeo. Un webhook aún activo surge como un conflicto de `getUpdates`; OpenClaw luego reconstruye el transporte de Telegram y reintenta la limpieza del webhook.
    - Si los sockets de Telegram se reciclan en un cadencia fija corta, verifique un `channels.telegram.timeoutSeconds` bajo; los clientes de bot limitan los valores configurados por debajo de los guardianes de solicitudes de salida y `getUpdates`, pero las versiones anteriores podrían abortar cada sondeo o respuesta cuando esto se configuraba por debajo de esos guardianes.
    - Si los registros incluyen `Polling stall detected`, OpenClaw reinicia el sondeo y reconstruye el transporte de Telegram después de 120 segundos sin actividad de sondeo largo completada de forma predeterminada.
    - `openclaw channels status --probe` y `openclaw doctor` advierten cuando una cuenta de sondeo en ejecución no ha completado `getUpdates` después del período de gracia de inicio, cuando una cuenta de webhook en ejecución no ha completado `setWebhook` después del período de gracia de inicio, o cuando la última actividad de transporte de sondeo exitosa está obsoleta.
    - Aumente `channels.telegram.pollingStallThresholdMs` solo cuando las llamadas `getUpdates` de larga duración están sanas pero su host aún informa reinicios falsos de estancamiento de sondeo. Los estancamientos persistentes generalmente apuntan a problemas de proxy, DNS, IPv6 o salida de TLS entre el host y `api.telegram.org`.
    - Telegram también respeta las variables de entorno de proxy del proceso para el transporte de la API de Bot, incluyendo `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` y sus variantes en minúsculas. `NO_PROXY` / `no_proxy` aún pueden omitir `api.telegram.org`.
    - Si el proxy gestionado por OpenClaw está configurado a través de `OPENCLAW_PROXY_URL` para un entorno de servicio y no hay una variable de entorno de proxy estándar presente, Telegram también usa esa URL para el transporte de la API de Bot.
    - En hosts VPS con salida/TLS directa inestable, enrute las llamadas a la API de Telegram a través de `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ usa por defecto `autoSelectFamily=true` (excepto WSL2). El orden de resultados de DNS de Telegram respeta `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, luego `channels.telegram.network.dnsResultOrder`, luego el predeterminado del proceso tal como `NODE_OPTIONS=--dns-result-order=ipv4first`; si no se aplica ninguno, Node 22+ recurre a `ipv4first`.
    - Si su host es WSL2 o explícitamente funciona mejor con el comportamiento solo IPv4, fuerce la selección de familia:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Las respuestas de rango de referencia RFC 2544 (`198.18.0.0/15`) ya están permitidas
      para las descargas de medios de Telegram de forma predeterminada. Si un proxy de IP falsa de confianza
      o transparente reescribe `api.telegram.org` a alguna otra
      dirección privada/interna/de uso especial durante las descargas de medios, puede optar
      por la omisión solo para Telegram:

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La misma opción está disponible por cuenta en
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si su proxy resuelve los hosts de medios de Telegram en `198.18.x.x`, deje la
      bandera peligrosa desactivada primero. Los medios de Telegram ya permiten el rango de referencia RFC 2544
      de forma predeterminada.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` debilita las protecciones
      SSRF de medios de Telegram. Úselo solo para entornos de proxy controlados por operadores de confianza
      como Clash, Mihomo o enrutamiento de IP falsa de Surge cuando
      sintetizan respuestas privadas o de uso especial fuera del rango de referencia RFC 2544.
      Déjela desactivada para el acceso normal a Telegram en el Internet público.
    </Warning>

    - Sobrescrituras de entorno (temporal):
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

- inicio/autenticación: `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` debe apuntar a un archivo regular; se rechazan los enlaces simbólicos)
- control de acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de nivel superior (`type: "acp"`)
- valores predeterminados de temas: `groups.<chatId>.topics."*"` se aplica a temas del foro no coincidentes; los ID de temas exactos lo anulan
- aprobaciones de ejecución: `execApprovals`, `accounts.*.execApprovals`
- comando/menú: `commands.native`, `commands.nativeSkills`, `customCommands`
- hilos/respuestas: `replyToMode`
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
  Precedencia de multicuenta: cuando se configuran dos o más identificadores de cuenta, establezca `channels.telegram.defaultAccount` (o incluya `channels.telegram.accounts.default`) para hacer que el enrutamiento predeterminado sea explícito. De lo contrario, OpenClaw recurre al primer identificador de cuenta normalizado y `openclaw doctor` avisa. Las cuentas con nombre heredan los valores
  `channels.telegram.allowFrom` / `groupAllowFrom`, pero no los valores `accounts.default.*`.
</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Telegram con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de lista blanca de grupos y temas.
  </Card>
  <Card title="Enrutamiento de canal" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Enrutamiento multi-agente" icon="sitemap" href="/es/concepts/multi-agent">
    Mapear grupos y temas a agentes.
  </Card>
  <Card title="Solución de problemas" icon="wrench" href="/es/channels/troubleshooting">
    Diagnósticos entre canales.
  </Card>
</CardGroup>

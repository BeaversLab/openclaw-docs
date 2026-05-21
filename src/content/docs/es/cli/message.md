---
summary: "Referencia de CLI para `openclaw message` (envío + acciones de canal)"
read_when:
  - Adding or modifying message CLI actions
  - Changing outbound channel behavior
title: "Mensaje"
---

# `openclaw message`

Comando único de salida para enviar mensajes y acciones de canal
(Discord/Google Chat/iMessage/Matrix/Mattermost (plugin)/Microsoft Teams/Signal/Slack/Telegram/WhatsApp).

## Uso

```
openclaw message <subcommand> [flags]
```

Selección de canal:

- `--channel` obligatorio si hay más de un canal configurado.
- Si exactamente un canal está configurado, se convierte en el predeterminado.
- Valores: `discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp` (Mattermost requiere complemento)
- `openclaw message` resuelve el canal seleccionado a su complemento propietario cuando `--channel` o un destino con prefijo de canal está presente; de lo contrario, carga los complementos de canal configurados para la inferencia del canal predeterminado.

Formatos de destino (`--target`):

- WhatsApp: E.164, JID de grupo o JID de canal/boletín de WhatsApp (`...@newsletter`)
- Telegram: id de chat, `@username` o destino de tema del foro (`-1001234567890:topic:42` o `--thread-id 42`)
- Discord: `channel:<id>` o `user:<id>` (o mención `<@id>`; los ids numéricos sin procesar se tratan como canales)
- Google Chat: `spaces/<spaceId>` o `users/<userId>`
- Slack: `channel:<id>` o `user:<id>` (se acepta el id de canal sin procesar)
- Mattermost (complemento): `channel:<id>`, `user:<id>` o `@username` (los ids simples se tratan como canales)
- Signal: `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>` o `username:<name>`/`u:<name>`
- iMessage: identificador, `chat_id:<id>`, `chat_guid:<guid>` o `chat_identifier:<id>`
- Matrix: `@user:server`, `!room:server` o `#alias:server`
- Microsoft Teams: id de conversación (`19:...@thread.tacv2`) o `conversation:<id>` o `user:<aad-object-id>`

Búsqueda de nombres:

- Para los proveedores compatibles (Discord/Slack/etc.), los nombres de canal como `Help` o `#help` se resuelven a través de la caché del directorio.
- En caso de fallo del caché, OpenClaw intentará una búsqueda en vivo en el directorio cuando el proveedor lo soporte.

## Opciones comunes

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (canal o usuario objetivo para send/poll/read/etc)
- `--targets <name>` (repetir; solo transmisión)
- `--json`
- `--dry-run`
- `--verbose`

## Comportamiento de SecretRef

- `openclaw message` resuelve los SecretRefs de canal compatibles antes de ejecutar la acción seleccionada.
- La resolución tiene el ámbito del objetivo de la acción activa cuando es posible:
  - con alcance de canal cuando se establece `--channel` (o se infiere de objetivos con prefijo como `discord:...`)
  - con alcance de cuenta cuando se establece `--account` (globales del canal + superficies de la cuenta seleccionada)
  - cuando se omite `--account`, OpenClaw no fuerza un alcance de SecretRef de cuenta `default`
- Los SecretRefs no resueltos en canales no relacionados no bloquean una acción de mensaje dirigida.
- Si el SecretRef del canal/cuenta seleccionado no está resuelto, el comando falla cerrado para esa acción.

## Acciones

### Principal

- `send`
  - Canales: WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix/Microsoft Teams
  - Obligatorio: `--target`, más `--message`, `--media` o `--presentation`
  - Opcional: `--media`, `--presentation`, `--delivery`, `--pin`, `--reply-to`, `--thread-id`, `--gif-playback`, `--force-document`, `--silent`
  - Cargas útiles de presentación compartidas: `--presentation` envía bloques semánticos (`text`, `context`, `divider`, `buttons`, `select`) que el núcleo representa a través de las capacidades declaradas del canal seleccionado. Consulte [Presentación de mensajes](/es/plugins/message-presentation).
  - Preferencias de entrega genéricas: `--delivery` acepta sugerencias de entrega como `{ "pin": true }`; `--pin` es una abreviatura para la entrega fijada cuando el canal lo admite.
  - Telegram + WhatsApp: `--force-document` (envíe imágenes, GIF y videos como documentos para evitar la compresión del canal)
  - Solo Telegram: `--thread-id` (id del tema del foro)
  - Solo para Slack: `--thread-id` (marca de tiempo del hilo; `--reply-to` usa el mismo campo)
  - Telegram + Discord: `--silent`
  - Solo para WhatsApp: `--gif-playback`; los Canales/Boletines de WhatsApp se direccionan con su `@newsletter` JID nativo.

- `poll`
  - Canales: WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - Obligatorio: `--target`, `--poll-question`, `--poll-option` (repetir)
  - Opcional: `--poll-multi`
  - Solo para Discord: `--poll-duration-hours`, `--silent`, `--message`
  - Solo para Telegram: `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Canales: Discord/Google Chat/Matrix/Nextcloud Talk/Signal/Slack/Telegram/WhatsApp
  - Obligatorio: `--message-id`, `--target`
  - Opcional: `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Nota: `--remove` requiere `--emoji` (omitir `--emoji` para borrar las propias reacciones donde esté soportado; ver /tools/reactions)
  - Solo para WhatsApp: `--participant`, `--from-me`
  - Reacciones de grupo de Signal: se requiere `--target-author` o `--target-author-uuid`
  - Nextcloud Talk: solo agregar reacciones; `--remove` se rechaza con un error claro (consulte /tools/reactions)

- `reactions`
  - Canales: Discord/Google Chat/Slack/Matrix
  - Obligatorio: `--message-id`, `--target`
  - Opcional: `--limit`

- `read`
  - Canales: Discord/Slack/Matrix
  - Obligatorio: `--target`
  - Opcional: `--limit`, `--message-id`, `--before`, `--after`
  - Solo Slack: `--message-id` lee una marca de tiempo específica del mensaje de Slack; combínelo con `--thread-id` para leer una respuesta de hilo exacta.
  - Solo Discord: `--around`

- `edit`
  - Canales: Discord/Slack/Matrix
  - Obligatorio: `--message-id`, `--message`, `--target`

- `delete`
  - Canales: Discord/Slack/Telegram/Matrix
  - Obligatorio: `--message-id`, `--target`

- `pin` / `unpin`
  - Canales: Discord/Slack/Matrix
  - Obligatorio: `--message-id`, `--target`

- `pins` (lista)
  - Canales: Discord/Slack/Matrix
  - Obligatorio: `--target`

- `permissions`
  - Canales: Discord/Matrix
  - Obligatorio: `--target`
  - Solo Matrix: disponible cuando el cifrado de Matrix está habilitado y se permiten las acciones de verificación

- `search`
  - Canales: Discord
  - Obligatorio: `--guild-id`, `--query`
  - Opcional: `--channel-id`, `--channel-ids` (repetir), `--author-id`, `--author-ids` (repetir), `--limit`

### Hilos

- `thread create`
  - Canales: Discord
  - Obligatorio: `--thread-name`, `--target` (id del canal)
  - Opcional: `--message-id`, `--message`, `--auto-archive-min`

- `thread list`
  - Canales: Discord
  - Obligatorio: `--guild-id`
  - Opcional: `--channel-id`, `--include-archived`, `--before`, `--limit`

- `thread reply`
  - Canales: Discord
  - Obligatorio: `--target` (id del hilo), `--message`
  - Opcional: `--media`, `--reply-to`

### Emojis

- `emoji list`
  - Discord: `--guild-id`
  - Slack: sin banderas adicionales

- `emoji upload`
  - Canales: Discord
  - Obligatorio: `--guild-id`, `--emoji-name`, `--media`
  - Opcional: `--role-ids` (repetir)

### Pegatinas

- `sticker send`
  - Canales: Discord
  - Obligatorio: `--target`, `--sticker-id` (repetir)
  - Opcional: `--message`

- `sticker upload`
  - Canales: Discord
  - Obligatorio: `--guild-id`, `--sticker-name`, `--sticker-desc`, `--sticker-tags`, `--media`

### Roles / Canales / Miembros / Voz

- `role info` (Discord): `--guild-id`
- `role add` / `role remove` (Discord): `--guild-id`, `--user-id`, `--role-id`
- `channel info` (Discord): `--target`
- `channel list` (Discord): `--guild-id`
- `member info` (Discord/Slack): `--user-id` (+ `--guild-id` para Discord)
- `voice status` (Discord): `--guild-id`, `--user-id`

### Eventos

- `event list` (Discord): `--guild-id`
- `event create` (Discord): `--guild-id`, `--event-name`, `--start-time`
  - Opcional: `--end-time`, `--desc`, `--channel-id`, `--location`, `--event-type`

### Moderación (Discord)

- `timeout`: `--guild-id`, `--user-id` (opcional `--duration-min` o `--until`; omita ambos para eliminar el tiempo de espera)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` también admite `--reason`

### Transmisión

- `broadcast`
  - Canales: cualquier canal configurado; use `--channel all` para apuntar a todos los proveedores
  - Requerido: `--targets <target...>`
  - Opcional: `--message`, `--media`, `--dry-run`

## Ejemplos

Enviar una respuesta de Discord:

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

Enviar un mensaje con botones semánticos:

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Approve","value":"approve","style":"success"},{"label":"Decline","value":"decline","style":"danger"}]}]}'
```

Core renderiza el mismo payload `presentation` en componentes de Discord, bloques de Slack, botones en línea de Telegram, props de Mattermost o tarjetas de Teams/Feishu dependiendo de la capacidad del canal. Consulte [Message Presentation](/es/plugins/message-presentation) para ver el contrato completo y las reglas de reserva.

Enviar un payload de presentación más rico:

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Choose a path"},{"type":"buttons","buttons":[{"label":"Approve","value":"approve"},{"label":"Decline","value":"decline"}]}]}'
```

Crear una encuesta de Discord:

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

Crear una encuesta de Telegram (cierre automático en 2 minutos):

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

Enviar un mensaje proactivo de Teams:

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

Crear una encuesta de Teams:

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

Reaccionar en Slack:

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

Reaccionar en un grupo de Signal:

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

Enviar botones en línea de Telegram mediante presentación genérica:

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Yes","value":"cmd:yes"},{"label":"No","value":"cmd:no"}]}]}'
```

Enviar un botón de Mini App de Telegram mediante presentación genérica:

```
openclaw message send --channel telegram --target 123456789 --message "Open app:" \
  --presentation '{"blocks":[{"type":"buttons","buttons":[{"label":"Launch","webApp":{"url":"https://example.com/app"}}]}]}'
```

Los botones de aplicación web de Telegram solo son compatibles con chats privados entre un usuario y el bot. Las cargas JSON antiguas que usan `web_app` todavía se analizan, pero `webApp` es el campo de presentación canónico.

Enviar una tarjeta de Teams mediante presentación genérica:

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --presentation '{"title":"Status update","blocks":[{"type":"text","text":"Build completed"}]}'
```

Enviar una imagen de Telegram o WhatsApp como documento para evitar la compresión:

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Envío de agente](/es/tools/agent-send)

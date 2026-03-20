---
summary: "Referencia de CLI para `openclaw message` (enviar + acciones de canal)"
read_when:
  - Agregar o modificar acciones de CLI de mensajes
  - Cambiar el comportamiento del canal de salida
title: "message"
---

# `openclaw message`

Comando único de salida para enviar mensajes y acciones de canal
(Discord/Google Chat/Slack/Mattermost (plugin)/Telegram/WhatsApp/Signal/iMessage/MS Teams).

## Uso

```
openclaw message <subcommand> [flags]
```

Selección de canal:

- `--channel` requerido si hay más de un canal configurado.
- Si hay exactamente un canal configurado, se convierte en el predeterminado.
- Valores: `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams` (Mattermost requiere plugin)

Formatos de destino (`--target`):

- WhatsApp: E.164 o JID de grupo
- Telegram: id de chat o `@username`
- Discord: `channel:<id>` o `user:<id>` (o mención `<@id>`; los ids numéricos sin procesar se tratan como canales)
- Google Chat: `spaces/<spaceId>` o `users/<userId>`
- Slack: `channel:<id>` o `user:<id>` (se acepta el id de canal sin procesar)
- Mattermost (plugin): `channel:<id>`, `user:<id>`, o `@username` (los ids simples se tratan como canales)
- Signal: `+E.164`, `group:<id>`, `signal:+E.164`, `signal:group:<id>`, o `username:<name>`/`u:<name>`
- iMessage: identificador, `chat_id:<id>`, `chat_guid:<guid>`, o `chat_identifier:<id>`
- MS Teams: id de conversación (`19:...@thread.tacv2`) o `conversation:<id>` o `user:<aad-object-id>`

Búsqueda por nombre:

- Para los proveedores compatibles (Discord/Slack/etc.), los nombres de canal como `Help` o `#help` se resuelven mediante el caché del directorio.
- Ante un error en el caché, OpenClaw intentará realizar una búsqueda en vivo en el directorio cuando el proveedor lo admita.

## Marcas comunes

- `--channel <name>`
- `--account <id>`
- `--target <dest>` (canal de destino o usuario para enviar/encuestar/leer/etc.)
- `--targets <name>` (repetir; solo transmisión)
- `--json`
- `--dry-run`
- `--verbose`

## Comportamiento de SecretRef

- `openclaw message` resuelve los SecretRefs de canal compatibles antes de ejecutar la acción seleccionada.
- La resolución se limita al objetivo de la acción activa cuando es posible:
  - con ámbito de canal cuando se establece `--channel` (o se infiere de objetivos con prefijo como `discord:...`)
  - con ámbito de cuenta cuando se establece `--account` (globales del canal + superficies de la cuenta seleccionada)
  - cuando se omite `--account`, OpenClaw no fuerza un ámbito de SecretRef de cuenta `default`
- Los SecretRef no resueltos en canales no relacionados no bloquean una acción de mensaje dirigida.
- Si el SecretRef del canal/cuenta seleccionado no está resuelto, el comando falla cerrado para esa acción.

## Acciones

### Núcleo

- `send`
  - Canales: WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (complemento)/Signal/iMessage/MS Teams
  - Obligatorio: `--target`, más `--message` o `--media`
  - Opcional: `--media`, `--reply-to`, `--thread-id`, `--gif-playback`
  - Solo Telegram: `--buttons` (requiere `channels.telegram.capabilities.inlineButtons` para permitirlo)
  - Solo Telegram: `--force-document` (envía imágenes y GIF como documentos para evitar la compresión de Telegram)
  - Solo Telegram: `--thread-id` (id del tema del foro)
  - Solo Slack: `--thread-id` (marca de tiempo del hilo; `--reply-to` usa el mismo campo)
  - Solo WhatsApp: `--gif-playback`

- `poll`
  - Canales: WhatsApp/Telegram/Discord/Matrix/MS Teams
  - Obligatorio: `--target`, `--poll-question`, `--poll-option` (repetir)
  - Opcional: `--poll-multi`
  - Solo Discord: `--poll-duration-hours`, `--silent`, `--message`
  - Solo Telegram: `--poll-duration-seconds` (5-600), `--silent`, `--poll-anonymous` / `--poll-public`, `--thread-id`

- `react`
  - Canales: Discord/Google Chat/Slack/Telegram/WhatsApp/Signal
  - Obligatorio: `--message-id`, `--target`
  - Opcional: `--emoji`, `--remove`, `--participant`, `--from-me`, `--target-author`, `--target-author-uuid`
  - Nota: `--remove` requiere `--emoji` (omite `--emoji` para borrar tus propias reacciones donde esté soportado; ver /tools/reactions)
  - Solo WhatsApp: `--participant`, `--from-me`
  - Reacciones de grupos de Signal: `--target-author` o `--target-author-uuid` obligatorios

- `reactions`
  - Canales: Discord/Google Chat/Slack
  - Obligatorio: `--message-id`, `--target`
  - Opcional: `--limit`

- `read`
  - Canales: Discord/Slack
  - Obligatorio: `--target`
  - Opcional: `--limit`, `--before`, `--after`
  - Solo Discord: `--around`

- `edit`
  - Canales: Discord/Slack
  - Obligatorio: `--message-id`, `--message`, `--target`

- `delete`
  - Canales: Discord/Slack/Telegram
  - Obligatorio: `--message-id`, `--target`

- `pin` / `unpin`
  - Canales: Discord/Slack
  - Obligatorio: `--message-id`, `--target`

- `pins` (lista)
  - Canales: Discord/Slack
  - Obligatorio: `--target`

- `permissions`
  - Canales: Discord
  - Obligatorio: `--target`

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

- `timeout`: `--guild-id`, `--user-id` (opcional `--duration-min` o `--until`; omita ambos para quitar el tiempo de espera)
- `kick`: `--guild-id`, `--user-id` (+ `--reason`)
- `ban`: `--guild-id`, `--user-id` (+ `--delete-days`, `--reason`)
  - `timeout` también soporta `--reason`

### Transmisión

- `broadcast`
  - Canales: cualquier canal configurado; use `--channel all` para apuntar a todos los proveedores
  - Requerido: `--targets` (repetir)
  - Opcional: `--message`, `--media`, `--dry-run`

## Ejemplos

Enviar una respuesta de Discord:

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

Enviar un mensaje de Discord con componentes:

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

Vea [Componentes de Discord](/es/channels/discord#interactive-components) para el esquema completo.

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

Enviar botones en línea de Telegram:

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

Enviar una imagen de Telegram como documento para evitar la compresión:

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```

import es from "/components/footer/es.mdx";

<es />

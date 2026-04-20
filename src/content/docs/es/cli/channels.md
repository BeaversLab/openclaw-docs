---
summary: "Referencia de la CLI para `openclaw channels` (cuentas, estado, inicio/cierre de sesión, registros)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "canales"
---

# `openclaw channels`

Administra las cuentas de los canales de chat y su estado de tiempo de ejecución en la Gateway.

Documentos relacionados:

- Guías de canales: [Canales](/es/channels/index)
- Configuración de Gateway: [Configuración](/es/gateway/configuration)

## Comandos comunes

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Estado / capacidades / resolución / registros

- `channels status`: `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (solo con `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` es la ruta en vivo: en un gateway accesible ejecuta `probeAccount` por cuenta y comprobaciones opcionales `auditAccount`, por lo que la salida puede incluir el estado de transporte más resultados de sondas como `works`, `probe failed`, `audit ok` o `audit failed`.
Si el gateway es inaccesible, `channels status` recurre a resúmenes solo de configuración en lugar de salida de sonda en vivo.

## Añadir / eliminar cuentas

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Sugerencia: `openclaw channels add --help` muestra indicadores por canal (token, clave privada, token de aplicación, rutas de signal-cli, etc.).

Las superficies de añadir no interactivas comunes incluyen:

- canales de token de bot: `--token`, `--bot-token`, `--app-token`, `--token-file`
- campos de transporte de Signal/iMessage: `--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Campos de Google Chat: `--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- Campos de Matrix: `--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- Campos de Nostr: `--private-key`, `--relay-urls`
- Campos de Tlon: `--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` para autenticación predeterminada basada en entorno donde sea compatible

Cuando ejecutas `openclaw channels add` sin marcas, el asistente interactivo puede solicitar:

- ids de cuenta por cada canal seleccionado
- nombres de visualización opcionales para esas cuentas
- `Bind configured channel accounts to agents now?`

Si confirmas el enlace ahora, el asistente pregunta qué agente debe ser propietario de cada cuenta de canal configurada y escribe enlaces de enrutamiento con ámbito de cuenta.

También puedes gestionar las mismas reglas de enrutamiento más adelante con `openclaw agents bindings`, `openclaw agents bind` y `openclaw agents unbind` (consulta [agents](/es/cli/agents)).

Cuando añades una cuenta no predeterminada a un canal que aún está usando configuraciones de nivel superior de una sola cuenta, OpenClaw promueve los valores de nivel superior con ámbito de cuenta al mapa de cuentas del canal antes de escribir la nueva cuenta. La mayoría de los canales colocan esos valores en `channels.<channel>.accounts.default`, pero los canales agrupados pueden preservar una cuenta promovida coincidente existente en su lugar. Matrix es el ejemplo actual: si ya existe una cuenta con nombre, o `defaultAccount` apunta a una cuenta con nombre existente, la promoción preserva esa cuenta en lugar de crear una nueva `accounts.default`.

El comportamiento de enrutamiento permanece constante:

- Los enlaces existentes solo de canal (sin `accountId`) continúan coincidiendo con la cuenta predeterminada.
- `channels add` no crea ni reescribe automáticamente los enlaces en modo no interactivo.
- La configuración interactiva puede añadir opcionalmente enlaces con ámbito de cuenta.

Si su configuración ya estaba en un estado mixto (cuentas con nombre presentes y valores de cuenta única de nivel superior aún establecidos), ejecute `openclaw doctor --fix` para mover los valores con ámbito de cuenta a la cuenta promovida elegida para ese canal. La mayoría de los canales promueven a `accounts.default`; Matrix puede preservar un objetivo con nombre/predeterminado existente en su lugar.

## Inicio de sesión / cierre de sesión (interactivo)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

Notas:

- `channels login` admite `--verbose`.
- `channels login` / `logout` pueden inferir el canal cuando solo hay configurado un objetivo de inicio de sesión admitido.

## Solución de problemas

- Ejecute `openclaw status --deep` para una prueba general.
- Use `openclaw doctor` para obtener correcciones guiadas.
- `openclaw channels list` imprime `Claude: HTTP 403 ... user:profile` → la instantánea de uso necesita el ámbito `user:profile`. Use `--no-usage`, proporcione una clave de sesión de claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`) o vuelva a autenticarse a través de Claude CLI.
- `openclaw channels status` recurre a resúmenes solo de configuración cuando la puerta de enlace es inalcanzable. Si una credencial de canal admitida está configurada a través de SecretRef pero no está disponible en la ruta de comando actual, informa esa cuenta como configurada con notas degradadas en lugar de mostrarla como no configurada.

## Sondeo de capacidades

Obtenga sugerencias de capacidades del proveedor (intenciones/alcances donde estén disponibles) más soporte de características estáticas:

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` es opcional; omítalo para listar cada canal (incluyendo extensiones).
- `--account` solo es válido con `--channel`.
- `--target` acepta `channel:<id>` o un ID numérico de canal sin procesar y solo se aplica a Discord.
- Los sondeos son específicos del proveedor: intenciones de Discord + permisos opcionales de canal; alcances de bot y usuario de Slack; indicadores de bot de Telegram + webhook; versión del demonio de Signal; token de aplicación de Microsoft Teams + roles/alcances de Graph (anotados donde se conocen). Los canales sin sondeos reportan `Probe: unavailable`.

## Resolver nombres a IDs

Resuelva nombres de canal/usuario a IDs usando el directorio del proveedor:

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notas:

- Use `--kind user|group|auto` para forzar el tipo de objetivo.
- La resolución prefiere coincidencias activas cuando varias entradas comparten el mismo nombre.
- `channels resolve` es de solo lectura. Si una cuenta seleccionada está configurada mediante SecretRef pero esa credencial no está disponible en la ruta de comando actual, el comando devuelve resultados degradados no resueltos con notas en lugar de abortar toda la ejecución.

---
summary: "Referencia de la CLI para `openclaw channels` (cuentas, estado, inicio/cierre de sesión, registros)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "Canales"
---

# `openclaw channels`

Administra las cuentas de los canales de chat y su estado de tiempo de ejecución en la Gateway.

Documentos relacionados:

- Guías de canales: [Canales](/es/channels)
- Configuración de Gateway: [Configuración](/es/gateway/configuration)

## Comandos comunes

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

`channels list` muestra solo canales de chat: cuentas configuradas de forma predeterminada, con etiquetas de estado `installed`, `configured` y `enabled` por cuenta. Pase `--all` para también mostrar canales empaquetados que aún no tienen cuenta configurada y canales de catálogo instalables que aún no están en el disco. Los proveedores de autenticación (OAuth + claves de API) y las instantáneas de uso/cuota del proveedor de modelos ya no se imprimen aquí; use `openclaw models auth list` para los perfiles de autenticación del proveedor y `openclaw status` o `openclaw models list` para el uso.

## Estado / capacidades / resolución / registros

- `channels status`: `--channel <name>`, `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (solo con `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` es la ruta en vivo: en una puerta de enlace accesible ejecuta `probeAccount` por cuenta y verificaciones opcionales `auditAccount`, por lo que la salida puede incluir el estado del transporte más resultados de la sonda como `works`, `probe failed`, `audit ok`, o `audit failed`.
Si la puerta de enlace es inalcanzable, `channels status` recurre a resúmenes solo de configuración
en lugar de la salida de la sonda en vivo.

No use `openclaw sessions`, Gateway `sessions.list`, o la herramienta del agente
`sessions_list` como una señal de salud del socket del canal. Esas superficies informan
filas de conversación almacenadas, no el estado de tiempo de ejecución del proveedor. Después de un reinicio del proveedor de Discord,
una cuenta conectada pero silenciosa puede estar sana mientras que ninguna fila de sesión de Discord
aparece hasta el siguiente evento de conversación entrante o saliente.

## Añadir / eliminar cuentas

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` muestra las banderas por canal (token, clave privada, token de aplicación, rutas de signal-cli, etc.).</Tip>

`channels remove` solo opera con complementos de canales instalados/configurados. Use `channels add` primero para los canales del catálogo instalables.
Para los complementos de canales respaldados por tiempo de ejecución, `channels remove` también le pide al Gateway en ejecución que detenga la cuenta seleccionada antes de actualizar la configuración, por lo que deshabilitar o eliminar una cuenta no deja el oyente antiguo activo hasta que se reinicie.

Las superficies de adición no interactivas comunes incluyen:

- canales de token de bot: `--token`, `--bot-token`, `--app-token`, `--token-file`
- campos de transporte Signal/iMessage: `--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- campos de Google Chat: `--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- campos de Matrix: `--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- campos de Nostr: `--private-key`, `--relay-urls`
- campos de Tlon: `--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` para la autenticación respaldada por entorno de cuenta predeterminada cuando sea compatible

Si es necesario instalar un complemento de canal durante un comando de adición impulsado por marcas, OpenClaw utiliza la fuente de instalación predeterminada del canal sin abrir el mensaje interactivo de instalación del complemento.

Cuando ejecuta `openclaw channels add` sin indicadores, el asistente interactivo puede solicitar:

- identificadores de cuenta por canal seleccionado
- nombres para mostrar opcionales para esas cuentas
- `Route these channel accounts to agents now?`

Si confirma vincular ahora, el asistente pregunta qué agente debe ser propietario de cada cuenta de canal configurada y escribe enlaces de enrutamiento con ámbito de cuenta.

También puede administrar las mismas reglas de enrutamiento más tarde con `openclaw agents bindings`, `openclaw agents bind` y `openclaw agents unbind` (ver [agents](/es/cli/agents)).

Cuando añades una cuenta no predeterminada a un canal que todavía está usando configuraciones de nivel superior de una sola cuenta, OpenClaw promueve los valores de nivel superior con ámbito de cuenta al mapa de cuentas del canal antes de escribir la nueva cuenta. La mayoría de los canales colocan esos valores en `channels.<channel>.accounts.default`, pero los canales integrados pueden conservar una cuenta promovida coincidente existente en su lugar. Matrix es el ejemplo actual: si ya existe una cuenta con nombre, o `defaultAccount` apunta a una cuenta con nombre existente, la promoción conserva esa cuenta en lugar de crear una nueva `accounts.default`.

El comportamiento de enrutamiento se mantiene consistente:

- Los enlaces existentes solo de canal (sin `accountId`) continúan coincidiendo con la cuenta predeterminada.
- `channels add` no crea ni reescribe automáticamente enlaces en modo no interactivo.
- La configuración interactiva opcionalmente puede agregar enlaces con ámbito de cuenta.

Si tu configuración ya estaba en un estado mixto (cuentas con nombre presentes y valores de nivel superior de una sola cuenta todavía establecidos), ejecuta `openclaw doctor --fix` para mover los valores con ámbito de cuenta a la cuenta promovida elegida para ese canal. La mayoría de los canales promueven a `accounts.default`; Matrix puede conservar un objetivo con nombre/predeterminado existente en su lugar.

## Inicio de sesión y cierre de sesión (interactivo)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` es compatible con `--verbose`.
- `channels login` y `logout` pueden inferir el canal cuando solo hay un objetivo de inicio de sesión compatible configurado.
- `channels logout` prefiere la ruta de la Gateway en vivo cuando es accesible, por lo que el cierre de sesión detiene cualquier escucha activa antes de borrar el estado de autenticación del canal. Si una Gateway local no es accesible, recurre a la limpieza de autenticación local.
- Ejecuta `channels login` desde una terminal en el host de la gateway. El agente `exec` bloquea este flujo de inicio de sesión interactivo; las herramientas de inicio de sesión del agente nativas del canal, como `whatsapp_login`, deben usarse desde el chat cuando estén disponibles.

## Solución de problemas

- Ejecuta `openclaw status --deep` para una sondea amplia.
- Usa `openclaw doctor` para correcciones guiadas.
- `openclaw channels list` ya no imprime instantáneas de uso/cuota del proveedor del modelo. Para eso, usa `openclaw status` (descripción general) o `openclaw models list` (por proveedor).
- `openclaw channels status` vuelve a los resúmenes solo de configuración cuando la puerta de enlace es inalcanzable. Si una credencial de canal compatible está configurada a través de SecretRef pero no está disponible en la ruta de comando actual, informa que esa cuenta está configurada con notas degradadas en lugar de mostrarla como no configurada.

## Sondeo de capacidades

Obtener pistas de capacidad del proveedor (intenciones/alcances cuando estén disponibles) más soporte de características estáticas:

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` es opcional; omítalo para listar cada canal (incluyendo extensiones).
- `--account` solo es válido con `--channel`.
- `--target` acepta `channel:<id>` o una ID de canal numérica sin procesar y solo se aplica a Discord. Para los canales de voz de Discord, las marcas de verificación de permisos indican que faltan `ViewChannel`, `Connect`, `Speak`, `SendMessages` y `ReadMessageHistory`.
- Las sondas son específicas del proveedor: intenciones de Discord + permisos opcionales de canal; ámbitos de bot y usuario de Slack; marcas de bot de Telegram + webhook; versión del demonio de Signal; token de aplicación de Microsoft Teams + roles/ámbitos de Graph (anotados cuando se conocen). Los canales sin sondas reportan `Probe: unavailable`.

## Resolver nombres a IDs

Resolver nombres de canal/usuario a IDs utilizando el directorio del proveedor:

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notas:

- Use `--kind user|group|auto` para forzar el tipo de destino.
- La resolución prefiere coincidencias activas cuando varias entradas comparten el mismo nombre.
- `channels resolve` es de solo lectura. Si una cuenta seleccionada está configurada a través de SecretRef pero esa credencial no está disponible en la ruta de comando actual, el comando devuelve resultados no resueltos degradados con notas en lugar de abortar toda la ejecución.
- `channels resolve` no instala complementos de canal. Use `channels add --channel <name>` antes de resolver nombres para un canal de catálogo instalable.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Descripción general de Canales](/es/channels)

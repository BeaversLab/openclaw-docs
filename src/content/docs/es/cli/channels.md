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

- `channels status`: `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (solo con `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` es la ruta en vivo: en una puerta de enlace accesible, ejecuta `probeAccount` por cuenta y verificaciones opcionales `auditAccount`, por lo que la salida puede incluir el estado de transporte más resultados de sondas como `works`, `probe failed`, `audit ok` o `audit failed`.
Si la puerta de enlace es inaccesible, `channels status` recurre a resúmenes solo de configuración
en lugar de resultados de sondas en vivo.

No use `openclaw sessions`, Gateway `sessions.list`, ni la herramienta del agente `sessions_list` como una señal de salud del socket del canal. Esas superficies reportan filas de conversaciones almacenadas, no el estado de tiempo de ejecución del proveedor. Después de un reinicio del proveedor de Discord, una cuenta conectada pero inactiva puede estar sana mientras que ninguna fila de sesión de Discord aparece hasta el próximo evento de conversación entrante o saliente.

## Añadir / eliminar cuentas

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` muestra las marcas por canal (token, clave privada, token de aplicación, rutas de signal-cli, etc.).</Tip>

`channels remove` solo opera con complementos de canal instalados/configurados. Use `channels add` primero para los canales del catálogo instalables.
Para los complementos de canal respaldados por tiempo de ejecución, `channels remove` también pide al Gateway en ejecución que detenga la cuenta seleccionada antes de actualizar la configuración, por lo que deshabilitar o eliminar una cuenta no deja el antiguo escuchador activo hasta el reinicio.

Las superficies de adición no interactivas comunes incluyen:

- canales de token de bot: `--token`, `--bot-token`, `--app-token`, `--token-file`
- campos de transporte Signal/iMessage: `--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- campos de Google Chat: `--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- campos de Matrix: `--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- campos de Nostr: `--private-key`, `--relay-urls`
- campos de Tlon: `--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` para autenticación respaldada por entorno de cuenta predeterminada cuando se admita

Si es necesario instalar un complemento de canal durante un comando de adición impulsado por marcas, OpenClaw utiliza la fuente de instalación predeterminada del canal sin abrir el mensaje interactivo de instalación del complemento.

Cuando ejecuta `openclaw channels add` sin marcas, el asistente interactivo puede solicitar:

- identificadores de cuenta por canal seleccionado
- nombres para mostrar opcionales para esas cuentas
- `Route these channel accounts to agents now?`

Si confirma vincular ahora, el asistente pregunta qué agente debe ser propietario de cada cuenta de canal configurada y escribe enlaces de enrutamiento con ámbito de cuenta.

También puede administrar las mismas reglas de enrutamiento más tarde con `openclaw agents bindings`, `openclaw agents bind` y `openclaw agents unbind` (consulte [agents](/es/cli/agents)).

Cuando agrega una cuenta no predeterminada a un canal que aún está utilizando configuraciones de nivel superior de cuenta única, OpenClaw promueve los valores de nivel superior con ámbito de cuenta al mapa de cuentas del canal antes de escribir la nueva cuenta. La mayoría de los canales ubican esos valores en `channels.<channel>.accounts.default`, pero los canales integrados pueden conservar una cuenta promovida existente coincidente. Matrix es el ejemplo actual: si ya existe una cuenta con nombre o `defaultAccount` apunta a una cuenta con nombre existente, la promoción conserva esa cuenta en lugar de crear una nueva `accounts.default`.

El comportamiento de enrutamiento se mantiene consistente:

- Los enlaces de solo canal existentes (sin `accountId`) continúan coincidiendo con la cuenta predeterminada.
- `channels add` no crea ni reescribe automáticamente los enlaces en modo no interactivo.
- La configuración interactiva opcionalmente puede agregar enlaces con ámbito de cuenta.

Si su configuración ya estaba en un estado mixto (cuentas con nombre presentes y valores de nivel superior de cuenta única aún establecidos), ejecute `openclaw doctor --fix` para mover los valores con ámbito de cuenta a la cuenta promovida elegida para ese canal. La mayoría de los canales promueven a `accounts.default`; Matrix puede conservar un objetivo con nombre/predeterminado existente en su lugar.

## Inicio de sesión y cierre de sesión (interactivo)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` admite `--verbose`.
- `channels login` y `logout` pueden inferir el canal cuando solo hay un objetivo de inicio de sesión compatible configurado.
- `channels logout` prefiere la ruta de Gateway en vivo cuando es accesible, por lo que el cierre de sesión detiene cualquier escucha activa antes de borrar el estado de autenticación del canal. Si no se puede acceder a un Gateway local, se recurre a la limpieza local de la autenticación.
- Ejecute `channels login` desde una terminal en el host de la puerta de enlace. El agente `exec` bloquea este flujo de inicio de sesión interactivo; las herramientas de inicio de sesión de agente nativas del canal, como `whatsapp_login`, deben usarse desde el chat cuando estén disponibles.

## Solución de problemas

- Ejecute `openclaw status --deep` para un sondeo general.
- Use `openclaw doctor` para obtener soluciones guiadas.
- `openclaw channels list` ya no imprime instantáneas de uso/cuota del proveedor del modelo. Para esos, use `openclaw status` (resumen) o `openclaw models list` (por proveedor).
- `openclaw channels status` recurre a resúmenes solo de configuración cuando la puerta de enlace es inalcanzable. Si una credencial de canal compatible está configurada a través de SecretRef pero no está disponible en la ruta de comando actual, informa esa cuenta como configurada con notas degradadas en lugar de mostrarla como no configurada.

## Sondeo de capacidades

Obtener pistas de capacidad del proveedor (intenciones/alcances cuando estén disponibles) más soporte de características estáticas:

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` es opcional; omítalo para listar todos los canales (incluidas las extensiones).
- `--account` solo es válido con `--channel`.
- `--target` acepta `channel:<id>` o una identificación numérica de canal sin formato y solo se aplica a Discord. Para los canales de voz de Discord, los indicadores de verificación de permisos que faltan `ViewChannel`, `Connect`, `Speak`, `SendMessages` y `ReadMessageHistory`.
- Los sondeos son específicos del proveedor: intenciones de Discord + permisos opcionales del canal; alcances de bot y usuario de Slack; indicadores de bot de Telegram + webhook; versión del demonio de Signal; token de aplicación de Microsoft Teams + roles/alcances de Graph (anotados cuando se conocen). Los canales sin sondeos reportan `Probe: unavailable`.

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
- [Descripción general de canales](/es/channels)

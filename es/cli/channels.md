---
summary: "Referencia de la CLI para `openclaw channels` (cuentas, estado, login/logout, registros)"
read_when:
  - Deseas agregar/eliminar cuentas de canal (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - Deseas verificar el estado del canal o seguir los registros del canal
title: "channels"
---

# `openclaw channels`

Gestiona las cuentas de los canales de chat y su estado de tiempo de ejecución en la Gateway.

Documentos relacionados:

- Guías de canales: [Canales](/es/channels/index)
- Configuración de la Gateway: [Configuración](/es/gateway/configuration)

## Comandos comunes

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Agregar / eliminar cuentas

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Sugerencia: `openclaw channels add --help` muestra las marcas por canal (token, clave privada, token de aplicación, rutas de signal-cli, etc.).

Cuando ejecutas `openclaw channels add` sin marcas, el asistente interactivo puede solicitar:

- IDs de cuenta por cada canal seleccionado
- nombres para mostrar opcionales para esas cuentas
- `Bind configured channel accounts to agents now?`

Si confirmas vincular ahora, el asistente pregunta qué agente debe ser propietario de cada cuenta de canal configurada y escribe enlaces de enrutamiento con alcance de cuenta.

También puedes gestionar las mismas reglas de enrutamiento más tarde con `openclaw agents bindings`, `openclaw agents bind` y `openclaw agents unbind` (consulta [agents](/es/cli/agents)).

Cuando agregas una cuenta no predeterminada a un canal que aún está utilizando configuraciones de nivel superior de cuenta única (sin entradas `channels.<channel>.accounts` aún), OpenClaw mueve los valores de nivel superior de cuenta única con alcance de cuenta a `channels.<channel>.accounts.default` y luego escribe la nueva cuenta. Esto preserva el comportamiento de la cuenta original al pasar a la estructura multicuenta.

El comportamiento del enrutamiento sigue siendo coherente:

- Los enlaces existentes solo de canal (sin `accountId`) continúan coincidiendo con la cuenta predeterminada.
- `channels add` no crea ni reescribe automáticamente los enlaces en modo no interactivo.
- La configuración interactiva puede agregar opcionalmente enlaces con alcance de cuenta.

Si tu configuración ya estaba en un estado mixto (cuentas con nombre presentes, `default` faltantes y valores de nivel superior de cuenta única aún establecidos), ejecuta `openclaw doctor --fix` para mover los valores con alcance de cuenta a `accounts.default`.

## Inicio de sesión / cierre de sesión (interactivo)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Solución de problemas

- Ejecute `openclaw status --deep` para un sondeo amplio.
- Use `openclaw doctor` para obtener soluciones guiadas.
- `openclaw channels list` imprime `Claude: HTTP 403 ... user:profile` → la instantánea de uso necesita el alcance `user:profile`. Use `--no-usage`, proporcione una clave de sesión de claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), o vuelva a autenticarse a través de Claude Code CLI.
- `openclaw channels status` recurre a resúmenes solo de configuración cuando la puerta de enlace es inalcanzable. Si una credencial de canal compatible está configurada a través de SecretRef pero no está disponible en la ruta de comando actual, informa esa cuenta como configurada con notas degradadas en lugar de mostrarla como no configurada.

## Sondeo de capacidades

Obtenga pistas de capacidades del proveedor (intenciones/alcances cuando estén disponibles) más soporte de características estáticas:

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` es opcional; omítalo para enumerar todos los canales (incluidas las extensiones).
- `--target` acepta `channel:<id>` o una identificación numérica de canal en bruto y solo se aplica a Discord.
- Los sondeos son específicos del proveedor: intenciones de Discord + permisos opcionales de canal; ámbitos de bot y usuario de Slack; indicadores de bot de Telegram + webhook; versión del demonio de Signal; token de aplicación de MS Teams + roles/alcances de Graph (anotados cuando se conocen). Los canales sin sondeos informan `Probe: unavailable`.

## Resolver nombres a identificadores

Resuelva nombres de canal/usuario a identificadores utilizando el directorio del proveedor:

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notas:

- Use `--kind user|group|auto` para forzar el tipo de destino.
- La resolución prefiere coincidencias activas cuando varias entradas comparten el mismo nombre.
- `channels resolve` es de solo lectura. Si una cuenta seleccionada está configurada a través de SecretRef pero esa credencial no está disponible en la ruta de comando actual, el comando devuelve resultados degradados sin resolver con notas en lugar de abortar toda la ejecución.

import es from "/components/footer/es.mdx";

<es />

---
summary: "Referencia de la CLI para `openclaw channels` (cuentas, estado, inicio/cierre de sesión, registros)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check channel status or tail channel logs
title: "canales"
---

# `openclaw channels`

Administra las cuentas de los canales de chat y su estado de tiempo de ejecución en la Gateway.

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

## Añadir / eliminar cuentas

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Consejo: `openclaw channels add --help` muestra las banderas por canal (token, clave privada, token de aplicación, rutas de signal-cli, etc).

Al ejecutar `openclaw channels add` sin marcas, el asistente interactivo puede solicitar:

- IDs de cuenta por canal seleccionado
- nombres para mostrar opcionales para esas cuentas
- `Bind configured channel accounts to agents now?`

Si confirmas el enlace ahora, el asistente pregunta qué agente debe ser dueño de cada cuenta de canal configurada y escribe enlaces de enrutamiento con ámbito de cuenta.

También puedes gestionar las mismas reglas de enrutamiento más tarde con `openclaw agents bindings`, `openclaw agents bind` y `openclaw agents unbind` (consulta [agents](/es/cli/agents)).

Cuando añades una cuenta no predeterminada a un canal que aún está usando configuraciones de nivel superior de cuenta única (sin entradas `channels.<channel>.accounts` todavía), OpenClaw mueve los valores de nivel superior de cuenta única con ámbito de cuenta a `channels.<channel>.accounts.default` y luego escribe la nueva cuenta. Esto preserva el comportamiento de la cuenta original al pasar a la estructura multicuenta.

El comportamiento del enrutamiento se mantiene constante:

- Los enlaces solo de canal existentes (sin `accountId`) siguen coincidiendo con la cuenta predeterminada.
- `channels add` no crea ni reescribe automáticamente los enlaces en el modo no interactivo.
- La configuración interactiva puede añadir opcionalmente enlaces con ámbito de cuenta.

Si tu configuración ya estaba en un estado mixto (cuentas con nombre presentes, falta `default` y valores de nivel superior de cuenta única aún establecidos), ejecuta `openclaw doctor --fix` para mover los valores con ámbito de cuenta a `accounts.default`.

## Inicio / cierre de sesión (interactivo)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Solución de problemas

- Ejecuta `openclaw status --deep` para un sondeo general.
- Usa `openclaw doctor` para reparaciones guiadas.
- `openclaw channels list` imprime `Claude: HTTP 403 ... user:profile` → la instantánea de uso necesita el alcance `user:profile`. Use `--no-usage`, proporcione una clave de sesión de claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`) o vuelva a autenticarse a través de Claude Code CLI.
- `openclaw channels status` recurre a resúmenes solo de configuración cuando la puerta de enlace no es accesible. Si una credencial de canal compatible está configurada a través de SecretRef pero no está disponible en la ruta de comando actual, informa que esa cuenta está configurada con notas degradadas en lugar de mostrarla como no configurada.

## Sonda de capacidades

Obtener sugerencias de capacidad del proveedor (intenciones/alcances cuando estén disponibles) más soporte de características estáticas:

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notas:

- `--channel` es opcional; omítalo para enumerar todos los canales (incluidas las extensiones).
- `--target` acepta `channel:<id>` o una identificación numérica de canal sin procesar y solo se aplica a Discord.
- Las sondas son específicas del proveedor: intenciones de Discord + permisos opcionales de canal; ámbitos de bot y usuario de Slack; indicadores de bot de Telegram + webhook; versión del demonio de Signal; token de aplicación de MS Teams + roles/alcances de Graph (anotados cuando se conocen). Los canales sin sondas reportan `Probe: unavailable`.

## Resolver nombres a identificadores

Resolver nombres de canal/usuario a identificadores utilizando el directorio del proveedor:

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notas:

- Use `--kind user|group|auto` para forzar el tipo de destino.
- La resolución prefiere coincidencias activas cuando varias entradas comparten el mismo nombre.
- `channels resolve` es de solo lectura. Si una cuenta seleccionada está configurada a través de SecretRef pero esa credencial no está disponible en la ruta de comando actual, el comando devuelve resultados no resueltos degradados con notas en lugar de abortar toda la ejecución.

import es from "/components/footer/es.mdx";

<es />

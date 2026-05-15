---
summary: "Reglas de enrutamiento por canal (WhatsApp, Telegram, Discord, Slack) y contexto compartido"
read_when:
  - Changing channel routing or inbox behavior
title: "Enrutamiento de canales"
---

# Canales y enrutamiento

OpenClaw enruta las respuestas **de vuelta al canal desde donde provino el mensaje**. El
modelo no elige un canal; el enrutamiento es determinista y está controlado por la
configuración del host.

## Términos clave

- **Canal**: `telegram`, `whatsapp`, `discord`, `irc`, `googlechat`, `slack`, `signal`, `imessage`, `line`, además de los canales de complementos. `webchat` es el canal de la interfaz de usuario interna de WebChat y no es un canal saliente configurable.
- **AccountId**: instancia de cuenta por canal (cuando es compatible).
- Cuenta predeterminada opcional del canal: `channels.<channel>.defaultAccount` elige
  qué cuenta se utiliza cuando una ruta de salida no especifica `accountId`.
  - En configuraciones multicuenta, establezca un valor predeterminado explícito (`defaultAccount` o `accounts.default`) cuando se configuran dos o más cuentas. Sin esto, el enrutamiento de respaldo puede elegir la primera ID de cuenta normalizada.
- **AgentId**: un espacio de trabajo aislado + almacén de sesiones ("cerebro").
- **SessionKey**: la clave de depósito utilizada para almacenar el contexto y controlar la concurrencia.

## Prefijos de destinos de salida

Los destinos de salida explícitos pueden incluir un prefijo de proveedor, como `telegram:123` o `tg:123`. Core trata ese prefijo como una sugerencia de selección de canal solo cuando el canal seleccionado es `last` o de otro modo no resuelto, y solo cuando el complemento cargado anuncia ese prefijo. Si el autor de la llamada ya seleccionó un canal explícito, el prefijo del proveedor debe coincidir con ese canal; las combinaciones entre canales, como la entrega de WhatsApp a `telegram:123`, fallan antes de la normalización de destinos específica del complemento.

Los prefijos de tipo de destino y de servicio, como `channel:<id>`, `user:<id>`, `room:<id>`, `thread:<id>`, `imessage:<handle>` y `sms:<number>`, permanecen dentro de la gramática del canal seleccionado. No seleccionan el proveedor por sí mismos.

## Formas de clave de sesión (ejemplos)

Los mensajes directos colapsan en la sesión **principal** del agente de manera predeterminada:

- `agent:<agentId>:<mainKey>` (predeterminado: `agent:main:main`)

Incluso cuando el historial de conversaciones de mensajes directos se comparte con el principal, las políticas de sandbox y herramientas utilizan una clave de tiempo de ejecución de chat directo derivada por cuenta para MD externos, de modo que los mensajes originados en el canal no se traten como ejecuciones de sesión principal local.

Los grupos y canales permanecen aislados por canal:

- Grupos: `agent:<agentId>:<channel>:group:<id>`
- Canales/salas: `agent:<agentId>:<channel>:channel:<id>`

Hilos:

- Los hilos de Slack/Discord añaden `:thread:<threadId>` a la clave base.
- Los temas de foro de Telegram incrustan `:topic:<topicId>` en la clave de grupo.

Ejemplos:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Fijación de ruta de MD principal

Cuando `session.dmScope` es `main`, los mensajes directos pueden compartir una sesión principal.
Para evitar que el `lastRoute` de la sesión sea sobrescrito por MD de no propietarios,
OpenClaw infiere un propietario fijado a partir de `allowFrom` cuando se cumplen todos estos:

- `allowFrom` tiene exactamente una entrada que no es un comodín.
- La entrada se puede normalizar a un ID de remitente concreto para ese canal.
- El remitente del MD entrante no coincide con ese propietario fijado.

En ese caso de falta de coincidencia, OpenClaw todavía registra los metadatos de la sesión entrante, pero omite la actualización de la sesión principal `lastRoute`.

## Grabación entrante protegida

Los complementos de canal pueden marcar un registro de sesión entrante como `createIfMissing: false` cuando una ruta protegida no debe crear una nueva sesión de OpenClaw. En ese modo, OpenClaw puede actualizar los metadatos y `lastRoute` para una sesión existente, pero no crea una entrada de sesión solo de ruta solo porque se observó un mensaje.

## Reglas de enrutamiento (cómo se elige un agente)

El enrutamiento elige **un agente** para cada mensaje entrante:

1. **Coincidencia exacta de pares** (`bindings` con `peer.kind` + `peer.id`).
2. **Coincidencia de pares principal** (herencia de hilo).
3. **Coincidencia de gremio + roles** (Discord) a través de `guildId` + `roles`.
4. **Coincidencia de gremio** (Discord) a través de `guildId`.
5. **Coincidencia de equipo** (Slack) a través de `teamId`.
6. **Coincidencia de cuenta** (`accountId` en el canal).
7. **Coincidencia de canal** (cualquier cuenta en ese canal, `accountId: "*"`).
8. **Agente predeterminado** (`agents.list[].default`, si no, la primera entrada de la lista, alternativamente `main`).

Cuando un enlace incluye varios campos de coincidencia (`peer`, `guildId`, `teamId`, `roles`), **todos los campos proporcionados deben coincidir** para que se aplique ese enlace.

El agente coincidente determina qué espacio de trabajo y almacén de sesiones se utilizan.

## Grupos de difusión (ejecutar múltiples agentes)

Los grupos de difusión le permiten ejecutar **múltiples agentes** para el mismo par **cuando OpenClaw normalmente respondería** (por ejemplo: en grupos de WhatsApp, después de filtrado por mención/activación).

Configuración:

```json5
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}
```

Ver: [Grupos de difusión](/es/channels/broadcast-groups).

## Resumen de configuración

- `agents.list`: definiciones de agente con nombre (espacio de trabajo, modelo, etc.).
- `bindings`: asignar canales/cuentas/pares entrantes a agentes.

Ejemplo:

```json5
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}
```

## Almacenamiento de sesiones

Los almacenes de sesiones residen bajo el directorio de estado (por defecto `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Las transcripciones JSONL residen junto al almacén

Puede anular la ruta del almacén mediante el uso de plantillas `session.store` y `{agentId}`.

El descubrimiento de sesiones de Gateway y ACP también escanea los almacenes de agentes respaldados en disco bajo la raíz `agents/` predeterminada y bajo las raíces de plantilla `session.store`. Los almacenes descubiertos deben permanecer dentro de esa raíz de agente resuelta y utilizar un archivo `sessions.json` normal. Se ignoran los enlaces simbólicos y las rutas fuera de la raíz.

## Comportamiento de WebChat

WebChat se adjunta al **agente seleccionado** y de forma predeterminada a la sesión principal del agente. Debido a esto, WebChat le permite ver el contexto entre canales para ese agente en un solo lugar.

## Contexto de respuesta

Las respuestas entrantes incluyen:

- `ReplyToId`, `ReplyToBody` y `ReplyToSender` cuando estén disponibles.
- El contexto citado se agrega a `Body` como un bloque `[Replying to ...]`.

Esto es consistente en todos los canales.

## Relacionado

- [Grupos](/es/channels/groups)
- [Grupos de difusión](/es/channels/broadcast-groups)
- [Emparejamiento](/es/channels/pairing)

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

- **Canal**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId**: instancia de cuenta por canal (cuando se admite).
- Cuenta predeterminada opcional del canal: `channels.<channel>.defaultAccount` elige
  qué cuenta se usa cuando una ruta de salida no especifica `accountId`.
  - En configuraciones multicuenta, establezca un predeterminado explícito (`defaultAccount` o `accounts.default`) cuando se configuran dos o más cuentas. Sin él, el enrutamiento de reserva podría elegir el primer ID de cuenta normalizado.
- **AgentId**: un espacio de trabajo aislado + almacén de sesiones ("cerebro").
- **SessionKey**: la clave de depósito utilizada para almacenar el contexto y controlar la concurrencia.

## Formas de clave de sesión (ejemplos)

Los mensajes directos colapsan en la sesión **main** del agente:

- `agent:<agentId>:<mainKey>` (predeterminado: `agent:main:main`)

Los grupos y canales permanecen aislados por canal:

- Grupos: `agent:<agentId>:<channel>:group:<id>`
- Canales/salas: `agent:<agentId>:<channel>:channel:<id>`

Hilos:

- Los hilos de Slack/Discord añaden `:thread:<threadId>` a la clave base.
- Los temas del foro de Telegram incrustan `:topic:<topicId>` en la clave de grupo.

Ejemplos:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Fijación de la ruta principal de MD

Cuando `session.dmScope` es `main`, los mensajes directos pueden compartir una sesión principal.
Para evitar que el `lastRoute` de la sesión sea sobrescrito por MDs no propietarios,
OpenClaw infiere un propietario fijado a partir de `allowFrom` cuando se cumplen todos estos:

- `allowFrom` tiene exactamente una entrada que no es comodín.
- La entrada se puede normalizar a un ID de remitente concreto para ese canal.
- El remitente del MD entrante no coincide con ese propietario anclado.

En ese caso de discrepancia, OpenClaw sigue registrando los metadatos de la sesión entrante, pero omite la actualización de la sesión principal `lastRoute`.

## Reglas de enrutamiento (cómo se elige un agente)

El enrutamiento elige **un agente** para cada mensaje entrante:

1. **Coincidencia exacta de par** (`bindings` con `peer.kind` + `peer.id`).
2. **Coincidencia de par principal** (herencia de hilo).
3. **Coincidencia de gremio + roles** (Discord) mediante `guildId` + `roles`.
4. **Coincidencia de gremio** (Discord) mediante `guildId`.
5. **Coincidencia de equipo** (Slack) mediante `teamId`.
6. **Coincidencia de cuenta** (`accountId` en el canal).
7. **Coincidencia de canal** (cualquier cuenta en ese canal, `accountId: "*"`).
8. **Agente predeterminado** (`agents.list[].default`, si no, la primera entrada de la lista, alternativa a `main`).

Cuando un enlace incluye varios campos de coincidencia (`peer`, `guildId`, `teamId`, `roles`), **todos los campos proporcionados deben coincidir** para que se aplique ese enlace.

El agente coincidente determina qué espacio de trabajo y almacén de sesiones se utilizan.

## Grupos de transmisión (ejecutar varios agentes)

Los grupos de transmisión le permiten ejecutar **múltiples agentes** para el mismo par **cuando OpenClaw normalmente respondería** (por ejemplo: en grupos de WhatsApp, después de filtrar por mención/activación).

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

Consulte: [Grupos de transmisión](/es/channels/broadcast-groups).

## Resumen de configuración

- `agents.list`: definiciones de agentes con nombre (espacio de trabajo, modelo, etc.).
- `bindings`: asigna canales/cuentas/pares entrantes a agentes.

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

## Almacenamiento de sesión

Los almacenes de sesiones residen en el directorio de estado (por defecto `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Las transcripciones JSONL residen junto al almacén

Puede anular la ruta del almacén mediante el procesamiento de plantillas `session.store` y `{agentId}`.

La detección de sesiones de Gateway y ACP también escanea los almacenes de agentes respaldados en disco bajo la raíz `agents/` predeterminada y bajo las raíces `session.store` con plantillas. Los almacenes descubiertos deben permanecer dentro de esa raíz de agente resuelta y usar un archivo `sessions.json` regular. Se ignoran los enlaces simbólicos y las rutas fuera de la raíz.

## Comportamiento de WebChat

WebChat se adjunta al **agente seleccionado** y, de forma predeterminada, a la sesión principal de ese agente. Debido a esto, WebChat le permite ver el contexto entre canales para ese agente en un solo lugar.

## Contexto de respuesta

Las respuestas entrantes incluyen:

- `ReplyToId`, `ReplyToBody` y `ReplyToSender` cuando estén disponibles.
- El contexto citado se agrega a `Body` como un bloque `[Replying to ...]`.

Esto es consistente en todos los canales.

import es from "/components/footer/es.mdx";

<es />

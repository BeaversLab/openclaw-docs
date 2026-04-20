---
summary: "Reglas de enrutamiento por canal (WhatsApp, Telegram, Discord, Slack) y contexto compartido"
read_when:
  - Changing channel routing or inbox behavior
title: "Enrutamiento de canales"
---

# Canales y enrutamiento

OpenClaw envía las respuestas **de vuelta al canal desde donde provino el mensaje**. El
modelo no elige un canal; el enrutamiento es determinista y está controlado por la
configuración del host.

## Términos clave

- **Canal**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.
- **AccountId**: instancia de cuenta por canal (cuando se admite).
- **AgentId**: un espacio de trabajo aislado + almacén de sesiones (“cerebro”).
- **SessionKey**: la clave de cubo utilizada para almacenar el contexto y controlar la concurrencia.

## Formas de clave de sesión (ejemplos)

Los mensajes directos se agrupan en la sesión **principal** del agente:

- `agent:<agentId>:<mainKey>` (por defecto: `agent:main:main`)

Los grupos y canales permanecen aislados por canal:

- Grupos: `agent:<agentId>:<channel>:group:<id>`
- Canales/salas: `agent:<agentId>:<channel>:channel:<id>`

Hilos:

- Los hilos de Slack/Discord añaden `:thread:<threadId>` a la clave base.
- Los temas del foro de Telegram incorporan `:topic:<topicId>` en la clave de grupo.

Ejemplos:

- `agent:main:telegram:group:-1001234567890:topic:42`
- `agent:main:discord:channel:123456:thread:987654`

## Reglas de enrutamiento (cómo se elige un agente)

El enrutamiento elige **un agente** para cada mensaje entrante:

1. **Coincidencia exacta de par** (`bindings` con `peer.kind` + `peer.id`).
2. **Coincidencia de gremio** (Discord) a través de `guildId`.
3. **Coincidencia de equipo** (Slack) a través de `teamId`.
4. **Coincidencia de cuenta** (`accountId` en el canal).
5. **Coincidencia de canal** (cualquier cuenta en ese canal).
6. **Agente predeterminado** (`agents.list[].default`, si no, primera entrada de la lista, retorno a `main`).

El agente coincidente determina qué espacio de trabajo y almacén de sesiones se utilizan.

## Grupos de difusión (ejecutar múltiples agentes)

Los grupos de difusión le permiten ejecutar **múltiples agentes** para el mismo par **cuando OpenClaw normalmente respondería** (por ejemplo: en grupos de WhatsApp, después de la filtración por mención/activación).

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

Ver: [Grupos de difusión](/es/broadcast-groups).

## Resumen de configuración

- `agents.list`: definiciones de agente con nombre (espacio de trabajo, modelo, etc.).
- `bindings`: asignar canales/cuentares/pares entrantes a agentes.

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

Los almacenes de sesión residen en el directorio de estado (por defecto `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Las transcripciones JSONL residen junto al almacén

Puede anular la ruta del almacén mediante el uso de plantillas `session.store` y `{agentId}`.

## Comportamiento de WebChat

WebChat se adjunta al **agente seleccionado** y de manera predeterminada a la sesión principal
del agente. Debido a esto, WebChat le permite ver el contexto entre canales para ese
agente en un solo lugar.

## Contexto de respuesta

Las respuestas entrantes incluyen:

- `ReplyToId`, `ReplyToBody` y `ReplyToSender` cuando están disponibles.
- El contexto citado se agrega a `Body` como un bloque `[Replying to ...]`.

Esto es consistente en todos los canales.

---
summary: "Comportamiento del chat grupal en diferentes superficies (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Grupos"
---

# Grupos

OpenClaw trata los chats de grupo de manera consistente en todas las superficies: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Microsoft Teams, Zalo.

## Introducción para principiantes (2 minutos)

OpenClaw “vive” en sus propias cuentas de mensajería. No hay un usuario bot de WhatsApp separado.
Si **usted** está en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactive explícitamente el filtrado por menciones.

Traducción: los remitentes en la lista permitida pueden activar OpenClaw mencionándolo.

> TL;DR
>
> - El **acceso por DM** está controlado por `*.allowFrom`.
> - El **acceso a grupos** está controlado por `*.groupPolicy` + listas permitidas (`*.groups`, `*.groupAllowFrom`).
> - La **activación de respuestas** está controlada por el filtrado por menciones (`requireMention`, `/activation`).

Flujo rápido (qué sucede con un mensaje de grupo):

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Flujo de mensajes de grupo](/images/groups-flow.svg)

Si desea...

| Objetivo                                                    | Qué configurar                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| Permitir todos los grupos pero responder solo en @menciones | `groups: { "*": { requireMention: true } }`                |
| Desactivar todas las respuestas de grupo                    | `groupPolicy: "disabled"`                                  |
| Solo grupos específicos                                     | `groups: { "<group-id>": { ... } }` (sin clave `"*"`)      |
| Solo usted puede activar en grupos                          | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Claves de sesión

- Las sesiones de grupo usan claves de sesión `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
- Los temas de foro de Telegram añaden `:topic:<threadId>` al ID del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Se omiten los latidos (heartbeats) para las sesiones de grupo.

## Patrón: MDs personales + grupos públicos (agente único)

Sí, esto funciona bien si su tráfico “personal” son **MDs** y su tráfico “público” son **grupos**.

Por qué: en modo de agente único, los MD normalmente llegan a la clave de sesión **principal** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no principales** (`agent:main:<channel>:group:<id>`). Si habilita el sandbox con `mode: "non-main"`, esas sesiones de grupo se ejecutan en Docker mientras que su sesión principal de MD se mantiene en el host.

Esto le da un “cerebro” de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **MD**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas (Docker)

> Si necesita espacios de trabajo/personas verdaderamente separados (“personal” y “público” nunca deben mezclarse), use un segundo agente + enlaces. Consulte [Enrutamiento multiagente](/es/concepts/multi-agent).

Ejemplo (MD en el host, grupos en sandbox y solo herramientas de mensajería):

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // groups/channels are non-main -> sandboxed
        scope: "session", // strongest isolation (one container per group/channel)
        workspaceAccess: "none",
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        // If allow is non-empty, everything else is blocked (deny still wins).
        allow: ["group:messaging", "group:sessions"],
        deny: ["group:runtime", "group:fs", "group:ui", "nodes", "cron", "gateway"],
      },
    },
  },
}
```

¿Quiere que “los grupos solo puedan ver la carpeta X” en lugar de “sin acceso al host”? Mantenga `workspaceAccess: "none"` y monte solo las rutas permitidas en el sandbox:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
        docker: {
          binds: [
            // hostPath:containerPath:mode
            "/home/user/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

Relacionado:

- Claves de configuración y valores predeterminados: [Configuración de puerta de enlace](/es/gateway/configuration-reference#agentsdefaultssandbox)
- Depurar por qué una herramienta está bloqueada: [Sandbox vs. Política de herramientas vs. Elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de montajes de enlace: [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, formateadas como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats grupales usan `g-<slug>` (minúsculas, espacios -> `-`, mantener `#@+._-`).

## Política de grupo

Controle cómo se manejan los mensajes de grupos/salas por canal:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789"], // numeric Telegram user id (wizard can resolve @username)
    },
    signal: {
      groupPolicy: "disabled",
      groupAllowFrom: ["+15551234567"],
    },
    imessage: {
      groupPolicy: "disabled",
      groupAllowFrom: ["chat_id:123"],
    },
    msteams: {
      groupPolicy: "disabled",
      groupAllowFrom: ["user@org.com"],
    },
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        GUILD_ID: { channels: { help: { allow: true } } },
      },
    },
    slack: {
      groupPolicy: "allowlist",
      channels: { "#general": { allow: true } },
    },
    matrix: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["@owner:example.org"],
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
    },
  },
}
```

| Política      | Comportamiento                                                                      |
| ------------- | ----------------------------------------------------------------------------------- |
| `"open"`      | Los grupos omiten las listas de permitidos; el filtrado de menciones aún se aplica. |
| `"disabled"`  | Bloquear todos los mensajes de grupos por completo.                                 |
| `"allowlist"` | Permitir solo grupos/salas que coincidan con la lista de permitidos configurada.    |

Notas:

- `groupPolicy` está separado del filtrado de menciones (que requiere @menciones).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo: use `groupAllowFrom` (alternativa: `allowFrom` explícito).
- Las aprobaciones de emparejamiento de MD (`*-allowFrom` store entries) se aplican solo al acceso MD; la autorización del remitente del grupo permanece explícita en las listas de permitidos del grupo.
- Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
- Slack: la lista de permitidos usa `channels.slack.channels`.
- Matrix: la lista de permitidos usa `channels.matrix.groups` (IDs de sala, alias o nombres). Use `channels.matrix.groupAllowFrom` para restringir los remitentes; también se admiten listas de permitidos `users` por sala.
- Los MD de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
- La lista de permitidos de Telegram puede coincidir con IDs de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
- El valor predeterminado es `groupPolicy: "allowlist"`; si su lista de permitidos de grupo está vacía, los mensajes de grupo están bloqueados.
- Seguridad en tiempo de ejecución: cuando falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupo recurre a un modo de falla cerrada (típicamente `allowlist`) en lugar de heredar `channels.defaults.groupPolicy`.

Modelo mental rápido (orden de evaluación para mensajes de grupo):

1. `groupPolicy` (abierto/desactivado/lista de permitidos)
2. listas de permitidos de grupo (`*.groups`, `*.groupAllowFrom`, lista de permitidos específica del canal)
3. filtrado de menciones (`requireMention`, `/activation`)

## Filtrado de menciones (predeterminado)

Los mensajes de grupo requieren una mención a menos que se anulen por grupo. Los valores predeterminados residen por subsistema bajo `*.groups."*"`.

Responder a un mensaje de bot cuenta como una mención implícita (cuando el canal admite metadatos de respuesta). Esto se aplica a Telegram, WhatsApp, Slack, Discord y Microsoft Teams.

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
        "123@g.us": { requireMention: false },
      },
    },
    telegram: {
      groups: {
        "*": { requireMention: true },
        "123456789": { requireMention: false },
      },
    },
    imessage: {
      groups: {
        "*": { requireMention: true },
        "123": { requireMention: false },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          mentionPatterns: ["@openclaw", "openclaw", "\\+15555550123"],
          historyLimit: 50,
        },
      },
    ],
  },
}
```

Notas:

- `mentionPatterns` son patrones de regex seguros que no distinguen mayúsculas de minúsculas; los patrones no válidos y las formas de repetición anidada inseguras se ignoran.
- Las superficies que proporcionan menciones explícitas aún pasan; los patrones son un respaldo.
- Anulación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
- El filtrado de menciones solo se aplica cuando es posible la detección de menciones (las menciones nativas o `mentionPatterns` están configuradas).
- Los valores predeterminados de Discord residen en `channels.discord.guilds."*"` (modificables por servidor/canal).
- El contexto del historial del grupo se ajusta de manera uniforme en todos los canales y es **solo pendiente** (mensajes omitidos debido al filtrado de menciones); use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para las anulaciones. Establezca `0` para desactivar.

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal permiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo.
  Use prefijos de clave explícitos:
  `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` y el comodín `"*"`.
  Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.

Orden de resolución (gana el más específico):

1. coincidencia de `toolsBySender` de grupo/canal
2. `tools` de grupo/canal
3. coincidencia de `toolsBySender` predeterminada (`"*"`)
4. `tools` predeterminada (`"*"`)

Ejemplo (Telegram):

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { tools: { deny: ["exec"] } },
        "-1001234567890": {
          tools: { deny: ["exec", "read", "write"] },
          toolsBySender: {
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

Notas:

- Las restricciones de herramientas de grupo/canal se aplican además de la política de herramientas global/del agente (la denegación sigue teniendo prioridad).
- Algunos canales utilizan una anidación diferente para las salas/canales (por ejemplo, Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).

## Listas de permitidos de grupos

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista de permitidos de grupos. Use `"*"` para permitir todos los grupos mientras se establece el comportamiento de mención predeterminado.

Intenciones comunes (copiar/pegar):

1. Desactivar todas las respuestas de grupo

```json5
{
  channels: { whatsapp: { groupPolicy: "disabled" } },
}
```

2. Permitir solo grupos específicos (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "123@g.us": { requireMention: true },
        "456@g.us": { requireMention: false },
      },
    },
  },
}
```

3. Permitir todos los grupos pero requerir mención (explícito)

```json5
{
  channels: {
    whatsapp: {
      groups: { "*": { requireMention: true } },
    },
  },
}
```

4. Solo el propietario puede activar en grupos (WhatsApp)

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
      groups: { "*": { requireMention: true } },
    },
  },
}
```

## Activación (solo propietario)

Los propietarios del grupo pueden alternar la activación por grupo:

- `/activation mention`
- `/activation always`

El propietario se determina por `channels.whatsapp.allowFrom` (o por el E.164 propio del bot cuando no esté configurado). Envíe el comando como un mensaje independiente. Otras superficies actualmente ignoran `/activation`.

## Campos de contexto

Las cargas útiles entrantes del grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado de filtrado de menciones)
- Los temas del foro de Telegram también incluyen `MessageThreadId` y `IsForum`.

El mensaje del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, que evite las tablas de Markdown y que evite escribir secuencias literales de `\n`.

## Especificaciones de iMessage

- Prefiera `chat_id:<id>` al enrutar o crear listas de permitidos.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas grupales siempre vuelven al mismo `chat_id`.

## Especificaciones de WhatsApp

Consulte [Mensajes grupales](/es/channels/group-messages) para obtener información sobre el comportamiento exclusivo de WhatsApp (inyección de historial, detalles del manejo de menciones).

import es from "/components/footer/es.mdx";

<es />

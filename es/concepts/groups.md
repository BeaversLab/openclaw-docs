---
summary: "Comportamiento del chat grupal en diferentes superficies (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams)"
read_when:
  - Cambiar el comportamiento del chat grupal o el filtrado de menciones
title: "Groups"
---

# Grupos

OpenClaw trata los chats de grupo de manera consistente en todas las plataformas: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Microsoft Teams.

## Introducción para principiantes (2 minutos)

OpenClaw “vive” en tus propias cuentas de mensajería. No hay un usuario bot de WhatsApp separado.
Si **tú** estás en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactives explícitamente el control de menciones.

Traducción: los remitentes en la lista de permitidos pueden activar OpenClaw mencionándolo.

> TL;DR
>
> - El **acceso a DM** se controla mediante `*.allowFrom`.
> - El **acceso a grupos** se controla mediante `*.groupPolicy` + listas de permitidos (`*.groups`, `*.groupAllowFrom`).
> - La **activación de respuestas** se controla mediante el filtrado de menciones (`requireMention`, `/activation`).

Flujo rápido (qué le sucede a un mensaje de grupo):

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

![Flujo de mensajes de grupo](/images/groups-flow.svg)

Si quieres...
| Objetivo | Qué configurar |
|------|-------------|
| Permitir todos los grupos pero responder solo en @menciones | `groups: { "*": { requireMention: true } }` |
| Desactivar todas las respuestas de grupo | `groupPolicy: "disabled"` |
| Solo grupos específicos | `groups: { "<group-id>": { ... } }` (sin clave `"*"`) |
| Solo tú puedes activar en grupos | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |

## Claves de sesión

- Las sesiones de grupo usan claves de sesión `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
- Los temas de foro de Telegram añaden `:topic:<threadId>` al ID del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Se omiten los latidos para las sesiones de grupo.

## Patrón: DMs personales + grupos públicos (agente único)

Sí — esto funciona bien si tu tráfico “personal” son **DMs** y tu tráfico “público” son **grupos**.

Por qué: en el modo de agente único, los DMs suelen llegar a la clave de sesión **principal** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no principales** (`agent:main:<channel>:group:<id>`). Si activas el sandbox con `mode: "non-main"`, esas sesiones de grupo se ejecutan en Docker mientras tu sesión principal de DM se mantiene en el host.

Esto te da un "cerebro" de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **MD**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas (Docker)

> Si necesitas espacios de trabajo/personas realmente separados (“personal” y “público” nunca deben mezclarse), usa un segundo agente + enlaces. Consulta [Enrutamiento multiagente](/es/concepts/multi-agent).

Ejemplo (MD en el host, grupos en sandbox con solo herramientas de mensajería):

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

¿Quieres que “los grupos solo puedan ver la carpeta X” en lugar de “sin acceso al host”? Mantén `workspaceAccess: "none"` y monta solo las rutas permitidas en el sandbox:

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
            "~/FriendsShared:/data:ro",
          ],
        },
      },
    },
  },
}
```

Relacionado:

- Claves de configuración y valores predeterminados: [Configuración de la pasarela](/es/gateway/configuration#agentsdefaultssandbox)
- Depuración de por qué se bloquea una herramienta: [Sandbox vs Política de herramientas vs Elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de montajes de enlace (bind mounts): [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, formateadas como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats de grupo usan `g-<slug>` (minúsculas, espacios -> `-`, conservar `#@+._-`).

## Política de grupo

Controlar cómo se manejan los mensajes de grupos/salas por canal:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "disabled", // "open" | "disabled" | "allowlist"
      groupAllowFrom: ["+15551234567"],
    },
    telegram: {
      groupPolicy: "disabled",
      groupAllowFrom: ["123456789", "@username"],
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

| Política        | Comportamiento                                                     |
| ------------- | ------------------------------------------------------------ |
| `"open"`      | Los grupos omiten las listas de permitidos; el filtrado de menciones todavía se aplica.      |
| `"disabled"`  | Bloquear todos los mensajes de grupo por completo.                           |
| `"allowlist"` | Permitir solo los grupos/salas que coincidan con la lista de permitidos configurada. |

Notas:

- `groupPolicy` es independiente del filtrado de menciones (que requiere @menciones).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams: usa `groupAllowFrom` (alternativa: `allowFrom` explícita).
- Discord: la lista blanca usa `channels.discord.guilds.<id>.channels`.
- Slack: la lista blanca usa `channels.slack.channels`.
- Matrix: la lista blanca usa `channels.matrix.groups` (IDs de sala, alias o nombres). Usa `channels.matrix.groupAllowFrom` para restringir remitentes; también se admiten listas blancas `users` por sala.
- Los MD de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
- La lista blanca de Telegram puede coincidir con IDs de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
- El valor predeterminado es `groupPolicy: "allowlist"`; si su lista blanca de grupos está vacía, los mensajes del grupo están bloqueados.

Modelo mental rápido (orden de evaluación para mensajes de grupo):

1. `groupPolicy` (abierto/desactivado/lista blanca)
2. listas blancas de grupos (`*.groups`, `*.groupAllowFrom`, lista blanca específica del canal)
3. filtrado de menciones (`requireMention`, `/activation`)

## Filtrado de menciones (predeterminado)

Los mensajes del grupo requieren una mención a menos que se anulen por grupo. Los valores predeterminados residen por subsistema bajo `*.groups."*"`.

Responder a un mensaje del bot cuenta como una mención implícita (cuando el canal admite metadatos de respuesta). Esto se aplica a Telegram, WhatsApp, Slack, Discord y Microsoft Teams.

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

- `mentionPatterns` son expresiones regulares que no distinguen entre mayúsculas y minúsculas.
- Las superficies que proporcionan menciones explícitas todavía pasan; los patrones son un respaldo.
- Anulación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
- El filtrado de menciones solo se aplica cuando la detección de menciones es posible (las menciones nativas o `mentionPatterns` están configuradas).
- Los valores predeterminados de Discord se encuentran en `channels.discord.guilds."*"` (modificables por servidor/canal).
- El contexto del historial del grupo se envuelve de manera uniforme en todos los canales y es **solo pendiente** (mensajes omitidos debido al filtrado de menciones); use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para las anulaciones. Establezca `0` para desactivar.

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal permiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo (las claves son ID de remitente/nombres de usuario/correos electrónicos/números de teléfono según el canal). Use `"*"` como comodín.

Orden de resolución (gana el más específico):

1. coincidencia `toolsBySender` de grupo/canal
2. `tools` de grupo/canal
3. coincidencia `toolsBySender` predeterminada (`"*"`)
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
            "123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

Notas:

- Las restricciones de herramientas de grupo/canal se aplican además de la política global de herramientas del agente (la denegación sigue ganando).
- Algunos canales usan una anidación diferente para salas/canales (por ejemplo, Discord `guilds.*.channels.*`, Slack `channels.*`, MS Teams `teams.*.channels.*`).

## Listas permitidas de grupos

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista de permitidos del grupo. Use `"*"` para permitir todos los grupos mientras se establece el comportamiento de mención predeterminado.

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

El propietario se determina por `channels.whatsapp.allowFrom` (o el E.164 propio del bot cuando no está establecido). Envíe el comando como un mensaje independiente. Otras superficies ignoran actualmente `/activation`.

## Campos de contexto

Las cargas útiles entrantes del grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado del filtrado de menciones)
- Los temas del foro de Telegram también incluyen `MessageThreadId` y `IsForum`.

El mensaje del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, evite tablas Markdown y evite escribir secuencias literales de `\n`.

## Especificaciones de iMessage

- Prefer `chat_id:<id>` al enrutar o permitir listas.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas grupales siempre regresan al mismo `chat_id`.

## Especificaciones de WhatsApp

Consulte [Group messages](/es/concepts/group-messages) para el comportamiento exclusivo de WhatsApp (inyección de historial, detalles de manejo de menciones).

import en from "/components/footer/en.mdx";

<en />

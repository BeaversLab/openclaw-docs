---
summary: "Comportamiento del chat en grupo en diferentes plataformas (WhatsApp/Telegram/Discord/Slack/Signal/iMessage/Microsoft Teams)"
read_when:
  - Changing group chat behavior or mention gating
title: "Grupos"
---

# Grupos

OpenClaw trata los chats de grupo de manera consistente en todas las plataformas: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Microsoft Teams.

## Introducción para principiantes (2 minutos)

OpenClaw “vive” en tus propias cuentas de mensajería. No hay un usuario de bot de WhatsApp separado.
Si **tú** estás en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactives explícitamente el control de menciones.

Traducción: los remitentes en la lista de permitidos pueden activar OpenClaw mencionándolo.

> TL;DR
>
> - El **acceso por DM** está controlado por `*.allowFrom`.
> - El **acceso a grupos** está controlado por `*.groupPolicy` + listas de permitidos (`*.groups`, `*.groupAllowFrom`).
> - La **activación de respuestas** está controlada por el control de menciones (`requireMention`, `/activation`).

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
- Los temas del foro de Telegram añaden `:topic:<threadId>` al ID del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Se omiten los latidos para las sesiones de grupo.

## Patrón: DMs personales + grupos públicos (agente único)

Sí — esto funciona bien si tu tráfico “personal” son **DMs** y tu tráfico “público” son **grupos**.

Por qué: en el modo de agente único, los MD suelen aterrizar en la clave de sesión **principal** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no principales** (`agent:main:<channel>:group:<id>`). Si habilitas el sandbox con `mode: "non-main"`, esas sesiones de grupo se ejecutan en Docker mientras que tu sesión de MD principal se mantiene en el host.

Esto te da un "cerebro" de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **MD**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas (Docker)

> Si necesitas espacios de trabajo/personas verdaderamente separados ("personal" y "público" nunca deben mezclarse), usa un segundo agente + enlaces. Consulta [Enrutamiento Multi-Agente](/es/concepts/multi-agent).

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

¿Quieres que "los grupos solo puedan ver la carpeta X" en lugar de "sin acceso al host"? Mantén `workspaceAccess: "none"` y monta solo las rutas permitidas en el sandbox:

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

- Claves de configuración y valores predeterminados: [Configuración de Gateway](/es/gateway/configuration#agentsdefaultssandbox)
- Depurar por qué una herramienta está bloqueada: [Sandbox vs Política de Herramientas vs Elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de montajes de enlace: [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, formateadas como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats grupales usan `g-<slug>` (minúsculas, espacios -> `-`, conservar `#@+._-`).

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

| Política      | Comportamiento                                                                          |
| ------------- | --------------------------------------------------------------------------------------- |
| `"open"`      | Los grupos omiten las listas de permitidos; el filtrado de menciones todavía se aplica. |
| `"disabled"`  | Bloquear todos los mensajes de grupo por completo.                                      |
| `"allowlist"` | Permitir solo los grupos/salas que coincidan con la lista de permitidos configurada.    |

Notas:

- `groupPolicy` está separado del filtrado de menciones (que requiere @menciones).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams: usa `groupAllowFrom` (alternativa: `allowFrom` explícito).
- Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
- Slack: la lista de permitidos usa `channels.slack.channels`.
- Matrix: la lista blanca usa `channels.matrix.groups` (IDs de sala, alias o nombres). Use `channels.matrix.groupAllowFrom` para restringir los remitentes; las listas blancas `users` por sala también son compatibles.
- Los mensajes directos de grupo (Group DMs) se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
- La lista blanca de Telegram puede coincidir con IDs de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
- El valor predeterminado es `groupPolicy: "allowlist"`; si su lista blanca de grupos está vacía, los mensajes de grupo se bloquean.

Modelo mental rápido (orden de evaluación para mensajes de grupo):

1. `groupPolicy` (abierta/desactivada/lista blanca)
2. listas blancas de grupo (`*.groups`, `*.groupAllowFrom`, lista blanca específica del canal)
3. filtrado de menciones (`requireMention`, `/activation`)

## Filtrado de menciones (predeterminado)

Los mensajes de grupo requieren una mención a menos que se anule por grupo. Los valores predeterminados viven por subsistema bajo `*.groups."*"`.

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
- Los valores predeterminados de Discord viven en `channels.discord.guilds."*"` ( anulables por gremio/canal).
- El contexto del historial de grupo se ajusta de manera uniforme en todos los canales y es **solo pendiente** (mensajes omitidos debido al filtrado de menciones); use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para anulaciones. Establezca `0` para desactivar.

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal permiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo (las claves son IDs de remitente/nombres de usuario/correos electrónicos/números de teléfono dependiendo del canal). Use `"*"` como comodín.

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

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista permitida de grupos. Use `"*"` para permitir todos los grupos mientras se establece el comportamiento de mención predeterminado.

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

El propietario se determina por `channels.whatsapp.allowFrom` (o el E.164 propio del bot cuando no está configurado). Envíe el comando como un mensaje independiente. Otras superficies actualmente ignoran `/activation`.

## Campos de contexto

Las cargas útiles entrantes del grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado de filtrado de menciones)
- Los temas del foro de Telegram también incluyen `MessageThreadId` y `IsForum`.

El mensaje del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, que evite tablas de Markdown y que evite escribir secuencias literales `\n`.

## Especificaciones de iMessage

- Prefiera `chat_id:<id>` al enrutar o crear listas de permitidos.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas grupales siempre vuelven al mismo `chat_id`.

## Especificaciones de WhatsApp

Consulte [Mensajes grupales](/es/concepts/group-messages) para conocer el comportamiento exclusivo de WhatsApp (inyección de historial, detalles del manejo de menciones).

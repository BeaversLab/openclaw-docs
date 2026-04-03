---
summary: "Comportamiento del chat en grupo en diferentes plataformas (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Grupos"
---

# Grupos

OpenClaw trata los chats grupales de manera consistente en todas las plataformas: Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

## Introducción para principiantes (2 minutos)

OpenClaw “vive” en sus propias cuentas de mensajería. No hay un usuario bot de WhatsApp separado.
Si **usted** está en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactive explícitamente el filtrado por menciones.

Traducción: los remitentes en la lista permitida pueden activar OpenClaw mencionándolo.

> TL;DR
>
> - El acceso a **DM** está controlado por `*.allowFrom`.
> - El acceso a **grupos** está controlado por `*.groupPolicy` + listas de permitidos (`*.groups`, `*.groupAllowFrom`).
> - La activación de **respuestas** está controlada por el filtrado de menciones (`requireMention`, `/activation`).

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

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Patrón: DMs personales + grupos públicos (agente único)

Sí: esto funciona bien si su tráfico “personal” son **DMs** y su tráfico “público” son **grupos**.

Por qué: en modo de agente único, las DMs generalmente llegan a la clave de sesión **principal** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no principales** (`agent:main:<channel>:group:<id>`). Si habilita el sandbox con `mode: "non-main"`, esas sesiones de grupo se ejecutan en Docker mientras su sesión principal de DMs permanece en el host.

Esto le da un “cerebro” de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **DMs**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas (Docker)

> Si necesita espacios de trabajo/personas verdaderamente separados (“personal” y “público” nunca deben mezclarse), use un segundo agente + enlaces. Consulte [Enrutamiento multiagente](/en/concepts/multi-agent).

Ejemplo (DMs en el host, grupos en sandbox + herramientas de solo mensajería):

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

- Claves y valores predeterminados de configuración: [Gateway configuration](/en/gateway/configuration-reference#agentsdefaultssandbox)
- Depuración de por qué se bloquea una herramienta: [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de los bind mounts: [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, formateadas como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats de grupo usan `g-<slug>` (minúsculas, espacios -> `-`, conservar `#@+._-`).

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

| Política      | Comportamiento                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"open"`      | Los grupos omiten las listas de permitidos (allowlists); el filtrado de menciones aún se aplica. |
| `"disabled"`  | Bloquear todos los mensajes de grupos por completo.                                              |
| `"allowlist"` | Permitir solo los grupos/salas que coincidan con la lista de permitidos configurada.             |

Notas:

- `groupPolicy` es independiente del filtrado de menciones (que requiere @menciones).
- WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo: use `groupAllowFrom` (alternativa: `allowFrom` explícito).
- Las aprobaciones de emparejamiento de DM (entradas de la tienda `*-allowFrom`) se aplican solo al acceso por DM; la autorización del remitente del grupo permanece explícita en las listas de permitidos del grupo.
- Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
- Slack: la lista de permitidos usa `channels.slack.channels`.
- Matrix: la lista de permitidos usa `channels.matrix.groups`. Se prefieren los IDs o alias de sala; la búsqueda por nombre de sala unida es de mejor esfuerzo posible y los nombres no resueltos se ignoran en tiempo de ejecución. Use `channels.matrix.groupAllowFrom` para restringir remitentes; las listas de permitidas `users` por sala también son compatibles.
- Los DMs de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
- La lista de permitidos de Telegram puede coincidir con IDs de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
- El valor predeterminado es `groupPolicy: "allowlist"`; si su lista de permitidos de grupos está vacía, los mensajes de grupo se bloquean.
- Seguridad en tiempo de ejecución: cuando falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupos recurre a un modo de fallo cerrado (típicamente `allowlist`) en lugar de heredar `channels.defaults.groupPolicy`.

Modelo mental rápido (orden de evaluación para mensajes de grupo):

1. `groupPolicy` (abierto/desactivado/lista de permitidos)
2. listas de permitidos de grupo (`*.groups`, `*.groupAllowFrom`, lista de permitidos específica del canal)
3. filtro de menciones (`requireMention`, `/activation`)

## Filtro de menciones (predeterminado)

Los mensajes de grupo requieren una mención a menos que se anule por grupo. Los valores predeterminados residen por subsistema bajo `*.groups."*"`.

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

- `mentionPatterns` son patrones de regex seguros que no distinguen entre mayúsculas y minúsculas; los patrones no válidos y las formas de repetición anidada inseguras se ignoran.
- Las superficies que proporcionan menciones explícitas aún pasan; los patrones son un respaldo.
- Anulación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
- El filtrado de menciones solo se aplica cuando la detección de menciones es posible (las menciones nativas o `mentionPatterns` están configuradas).
- Los valores predeterminados de Discord residen en `channels.discord.guilds."*"` (modificables por servidor/canal).
- El contexto del historial de grupos se ajusta de manera uniforme en todos los canales y es **solo pendiente** (mensajes omitidos debido al filtrado de menciones); use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para anulaciones. Establezca `0` para desactivar.

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal permiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo.
  Use prefijos de clave explícitos:
  `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>`, y el comodín `"*"`.
  Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.

Orden de resolución (gana el más específico):

1. coincidencia de grupo/canal `toolsBySender`
2. grupo/canal `tools`
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
            "id:123456789": { alsoAllow: ["exec"] },
          },
        },
      },
    },
  },
}
```

Notas:

- Las restricciones de herramientas de grupo/canal se aplican además de la política global/de herramientas del agente (denegar sigue ganando).
- Algunos canales usan una anidación diferente para salas/canales (p. ej., Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).

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

El propietario se determina por `channels.whatsapp.allowFrom` (o el propio E.164 del bot cuando no está configurado). Envíe el comando como un mensaje independiente. Otras superficies actualmente ignoran `/activation`.

## Campos de contexto

Las cargas útiles entrantes del grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado de filtrado de mención)
- Los temas del foro de Telegram también incluyen `MessageThreadId` y `IsForum`.

Notas específicas del canal:

- BlueBubbles opcionalmente puede enriquecer a los participantes de grupos de macOS sin nombre desde la base de datos de contactos locales antes de completar `GroupMembers`. Esto está desactivado por defecto y solo se ejecuta después de pasar el filtrado de grupo normal.

El mensaje del sistema del agente incluye una introducción de grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, evite tablas Markdown y evite escribir secuencias literales `\n`.

## Especificaciones de iMessage

- Prefiera `chat_id:<id>` al enrutar o crear listas de permitidos.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas grupales siempre vuelven al mismo `chat_id`.

## Especificaciones de WhatsApp

Consulte [Mensajes grupales](/en/channels/group-messages) para el comportamiento exclusivo de WhatsApp (inyección de historial, detalles del manejo de menciones).

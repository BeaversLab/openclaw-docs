---
summary: "Comportamiento del chat en grupo en diferentes superficies (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
  - Scoping mentionPatterns to specific group conversations
title: "Grupos"
sidebarTitle: "Grupos"
---

OpenClaw trata los chats grupales de manera consistente en todas las plataformas: Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Para salas permanentes que deben proporcionar un contexto silencioso a menos que el agente envíe explícitamente un mensaje visible, consulte [Eventos de sala ambiental](/es/channels/ambient-room-events).

## Introducción para principiantes (2 minutos)

OpenClaw "vive" en sus propias cuentas de mensajería. No hay un usuario de bot de WhatsApp separado. Si **usted** está en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactive explícitamente el filtrado de menciones.
- Las respuestas visibles en grupos/canales utilizan la herramienta `message` de manera predeterminada.

Traducción: los remitentes en la lista permitida pueden activar OpenClaw mencionándolo.

<Note>
**TL;DR**

- El **acceso a MD** está controlado por `*.allowFrom`.
- El **acceso a grupos** está controlado por `*.groupPolicy` + listas de permitidos (`*.groups`, `*.groupAllowFrom`).
- La **activación de respuestas** está controlada por el filtrado de menciones (`requireMention`, `/activation`).

</Note>

Flujo rápido (qué sucede con un mensaje de grupo):

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
mention/reply/command/DM -> user request
always-on group chatter -> user request, or room event when configured
```

## Respuestas visibles

Para solicitudes normales de grupos/canales, OpenClaw utiliza de forma predeterminada `messages.groupChat.visibleReplies: "automatic"`. El texto final del asistente se publica a través de la ruta de respuesta visible heredada, a menos que configure la sala para usar solo la salida de la herramienta de mensaje.

Use `messages.groupChat.visibleReplies: "message_tool"` cuando una sala compartida debe permitir que el agente decida cuándo hablar llamando a `message(action=send)`. Esto funciona mejor para salas grupales respaldadas por modelos de última generación confiables con herramientas, como GPT 5.5. Si el modelo omite esa herramienta y devuelve un texto final sustantivo, OpenClaw mantiene ese texto final como privado en lugar de publicarlo en la sala.

Use `"automatic"` para modelos más débiles o entornos de ejecución que no entienden de manera confiable la entrega solo a través de herramientas. En modo automático, el texto final del asistente es la ruta de respuesta fuente visible, por lo que un modelo que no pueda llamar consistentemente a `message(action=send)` aún puede responder con normalidad.

Si la herramienta de mensaje no está disponible bajo la política de herramientas activa, OpenClaw recurre
a respuestas visibles automáticas en lugar de suprimir silenciosamente la respuesta.
`openclaw doctor` advierte sobre esta incompatibilidad.

Para chats directos y cualquier otro evento de origen, use `messages.visibleReplies: "message_tool"` para aplicar globalmente el mismo comportamiento de respuesta visible solo para herramientas. Los turnos directos de WebChat interno por defecto entregan automáticamente la respuesta final para que Pi y Codex reciban el mismo contrato de respuesta visible. Establezca `messages.visibleReplies: "message_tool"` para requerir intencionalmente `message(action=send)` para la salida visible. `messages.groupChat.visibleReplies` sigue siendo la anulación más específica para salas de grupos/canales.

Esto reemplaza el antiguo patrón de forzar al modelo a responder `NO_REPLY` para la mayoría de los turnos en modo de observación. En el modo solo para herramientas, el prompt no define un contrato `NO_REPLY`. No hacer nada visible simplemente significa no llamar a la herramienta de mensaje.

Los enlaces de conversación propiedad del complemento son la excepción. Una vez que un complemento vincula un hilo y reclama el turno entrante, la respuesta devuelta por el complemento es la respuesta de vinculación visible; no necesita `message(action=send)`. Esa respuesta es la salida del tiempo de ejecución del complemento, no el texto final privado del modelo.

Los indicadores de escritura aún se envían para solicitudes directas de grupo. Los eventos ambiente de salas siempre activas, cuando están habilitados, se mantienen estrictos y silenciosos a menos que el agente llame a la herramienta de mensaje.

Las sesiones suprimen los resúmenes detallados de herramientas/progreso de forma predeterminada. Use `/verbose on`
para mostrar esos resúmenes para la sesión actual mientras depura, y
`/verbose off` para volver al comportamiento de solo respuesta final. El mismo estado detallado
se aplica a través de chats directos, grupos, canales y temas del foro.

Para enviar conversaciones de grupo siempre activas sin mención como contexto de sala silencioso en lugar de solicitudes de usuario, use [Ambient room events](/es/channels/ambient-room-events):

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
    },
  },
}
```

El valor predeterminado es `unmentionedInbound: "user_request"`.

Los mensajes mencionados, comandos, solicitudes de aborto y MDs se mantienen como solicitudes de usuario.

Para requerir que la salida visible pase a través de la herramienta de mensaje para solicitudes de grupo/canal:

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
}
```

La puerta de enlace recarga en caliente la configuración `messages` después de guardar el archivo. Reinicie solo
cuando la observación de archivos o la recarga de la configuración están deshabilitadas en el despliegue.

Para requerir que la salida visible pase a través de la herramienta de mensaje para cada chat de origen:

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Los comandos de barra nativos (Discord, Telegram y otras superficies con soporte de comandos nativos) omiten `visibleReplies: "message_tool"` y siempre responden de forma visible para que la interfaz de usuario de comandos nativa del canal reciba la respuesta que espera. Esto solo se aplica a los turnos de comandos nativos validados; los comandos `/...` escritos como texto y los turnos de chat ordinarios aún siguen el valor predeterminado del grupo configurado.

## Visibilidad del contexto y listas de permitidos

En la seguridad de los grupos intervienen dos controles diferentes:

- **Autorización de activación**: quién puede activar el agente (`groupPolicy`, `groups`, `groupAllowFrom`, listas de permitidos específicas del canal).
- **Visibilidad del contexto**: qué contexto complementario se inyecta en el modelo (texto de respuesta, citas, historial de hilos, metadatos reenviados).

De forma predeterminada, OpenClaw prioriza el comportamiento de chat normal y mantiene el contexto tal como se recibe en su mayoría. Esto significa que las listas de permitidos deciden principalmente quién puede activar acciones, y no un límite universal de redacción para cada fragmento citado o histórico.

<AccordionGroup>
  <Accordion title="El comportamiento actual es específico del canal">
    - Algunos canales ya aplican un filtrado basado en el remitente para el contexto complementario en rutas específicas (por ejemplo, siembra de hilos de Slack, búsquedas de respuestas/hilos de Matrix).
    - Otros canales siguen pasando el contexto de cita/respaldo/reenvío tal como se recibe.

  </Accordion>
  <Accordion title="Dirección de endurecimiento (planificada)">
    - `contextVisibility: "all"` (predeterminado) mantiene el comportamiento actual tal como se recibe.
    - `contextVisibility: "allowlist"` filtra el contexto complementario para los remitentes en la lista de permitidos.
    - `contextVisibility: "allowlist_quote"` es `allowlist` más una excepción explícita de cita/respaldo.

    Hasta que este modelo de endurecimiento se implemente de manera consistente en todos los canales, espere diferencias según la superficie.

  </Accordion>
</AccordionGroup>

![Flujo de mensajes de grupo](/images/groups-flow.svg)

Si desea...

| Objetivo                                                               | Qué configurar                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Permitir todos los grupos pero responder solo en @menciones            | `groups: { "*": { requireMention: true } }`                |
| Deshabilitar todas las respuestas de grupo                             | `groupPolicy: "disabled"`                                  |
| Solo grupos específicos                                                | `groups: { "<group-id>": { ... } }` (sin clave `"*"`)      |
| Solo usted puede activar en grupos                                     | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Reutilizar un conjunto de remitentes de confianza en todos los canales | `groupAllowFrom: ["accessGroup:operators"]`                |

Para listas de permitidos (allowlists) de remitentes reutilizables, consulte [Grupos de acceso](/es/channels/access-groups).

## Claves de sesión

- Las sesiones de grupo usan claves de sesión `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
- Los temas de foro de Telegram añaden `:topic:<threadId>` al ID del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Los latidos (heartbeats) se omiten para las sesiones de grupo.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Patrón: MDs personales + grupos públicos (agente único)

Sí; esto funciona bien si su tráfico "personal" son **MDs** y su tráfico "público" son **grupos**.

Por qué: en el modo de agente único, los MDs generalmente aterrizan en la clave de sesión **main** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no main** (`agent:main:<channel>:group:<id>`). Si habilita el sandbox (aislamiento) con `mode: "non-main"`, esas sesiones de grupo se ejecutan en el backend de sandbox configurado mientras que su sesión principal de MD se mantiene en el host. Docker es el backend predeterminado si no elige uno.

Esto le da un "cerebro" de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **MDs**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas

<Note>Si necesita espacios de trabajo/personajes verdaderamente separados ("personal" y "público" nunca deben mezclarse), use un segundo agente + enlaces. Consulte [Enrutamiento multiagente](/es/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="MDs en el host, grupos en sandbox">
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
  </Tab>
  <Tab title="Los grupos solo ven una carpeta en la lista de permitidos">
    ¿Quiere "los grupos solo pueden ver la carpeta X" en lugar de "sin acceso al host"? Mantenga `workspaceAccess: "none"` y monte solo las rutas permitidas en el sandbox:

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

  </Tab>
</Tabs>

Relacionado:

- Claves de configuración y valores predeterminados: [Configuración de Gateway](/es/gateway/config-agents#agentsdefaultssandbox)
- Depuración de por qué se bloquea una herramienta: [Sandbox frente a política de herramientas frente a elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de montajes de enlace (bind mounts): [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando está disponible, con formato como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats de grupo usan `g-<slug>` (minúsculas, espacios -> `-`, conservar `#@+._-`).

## Política de grupo

Controle cómo se manejan los mensajes de grupo/sala por canal:

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
        "!roomId:example.org": { enabled: true },
        "#alias:example.org": { enabled: true },
      },
    },
  },
}
```

| Política      | Comportamiento                                                                      |
| ------------- | ----------------------------------------------------------------------------------- |
| `"open"`      | Los grupos omiten las listas de permitidos; el filtrado de menciones aún se aplica. |
| `"disabled"`  | Bloquear todos los mensajes de grupo por completo.                                  |
| `"allowlist"` | Permitir solo grupos/salas que coincidan con la lista de permitidos configurada.    |

<AccordionGroup>
  <Accordion title="Notas por canal">
    - `groupPolicy` está separado del filtrado de menciones (que requiere @menciones).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo: use `groupAllowFrom` (alternativa: `allowFrom` explícito).
    - Signal: `groupAllowFrom` puede coincidir con el ID del grupo de Signal entrante o con el teléfono/UUID del remitente.
    - Las aprobaciones de emparejamiento de MD (entradas de la tienda `*-allowFrom`) se aplican solo al acceso de MD; la autorización del remitente del grupo permanece explícita en las listas permitidas del grupo.
    - Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
    - Slack: la lista de permitidos usa `channels.slack.channels`.
    - Matrix: la lista de permitidos usa `channels.matrix.groups`. Se prefieren los ID de sala o los alias; la búsqueda de nombres de salas unidas es de mejor esfuerzo, y los nombres no resueltos se ignoran en tiempo de ejecución. Use `channels.matrix.groupAllowFrom` para restringir remitentes; las listas permitidas `users` por sala también son compatibles.
    - Los MD de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La lista de permitidos de Telegram puede coincidir con los ID de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen mayúsculas de minúsculas.
    - El valor predeterminado es `groupPolicy: "allowlist"`; si su lista de permitidos de grupo está vacía, los mensajes del grupo se bloquean.
    - Seguridad en tiempo de ejecución: cuando falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupo vuelve a un modo de cierre seguro (típicamente `allowlist`) en lugar de heredar `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modelo mental rápido (orden de evaluación para mensajes de grupo):

<Steps>
  <Step title="groupPolicy">`groupPolicy` (open/disabled/allowlist).</Step>
  <Step title="Listas permitidas de grupo">Listas permitidas de grupo (`*.groups`, `*.groupAllowFrom`, lista permitida específica del canal).</Step>
  <Step title="Filtrado de menciones">Filtrado de menciones (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrado de menciones (predeterminado)

Los mensajes de grupo requieren una mención a menos que se anule para cada grupo. Los valores predeterminados residen por subsistema bajo `*.groups."*"`.

Responder a un mensaje de bot cuenta como una mención implícita cuando el canal admite metadatos de respuesta. Citar un mensaje de bot también puede contar como una mención implícita en los canales que exponen metadatos de cita. Los casos integrados actuales incluyen Telegram, WhatsApp, Slack, Discord, Microsoft Teams y ZaloUser.

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

## Alcance de los patrones de mención configurados

Los `mentionPatterns` configurados son disparadores alternativos de expresiones regulares. Úselos cuando
la plataforma no exponga una mención nativa del bot, o cuando desee que texto plano como
`openclaw:` cuente como una mención. Las menciones nativas de la plataforma son separadas:
cuando Discord, Slack, Telegram, Matrix u otro canal pueden probar que el mensaje
mencionó explícitamente al bot, esa mención nativa todavía se activa incluso si
los patrones de expresiones regulares configurados están denegados.

De forma predeterminada, los patrones de mención configurados se aplican en todas partes donde el canal pasa
los datos del proveedor y la conversación a la detección de menciones. Para evitar que los patrones amplios
activen el agente en cada grupo, delimítelos por canal con
`channels.<channel>.mentionPatterns`.

Use `mode: "deny"` cuando los patrones de mención de regex deben estar desactivados de forma predeterminada para un
canal, luego active salas específicas con `allowIn`:

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b", "\\bops bot\\b"],
    },
  },
  channels: {
    slack: {
      mentionPatterns: {
        mode: "deny",
        allowIn: ["C0123OPS"],
      },
    },
  },
}
```

Use el valor predeterminado `mode: "allow"` (u omita `mode`) cuando los patrones de mención de regex
deban aplicarse ampliamente, luego desactívelos en salas ruidosas con `denyIn`:

```json5
{
  messages: {
    groupChat: {
      mentionPatterns: ["\\bopenclaw\\b"],
    },
  },
  channels: {
    telegram: {
      mentionPatterns: {
        denyIn: ["-1001234567890", "-1001234567890:topic:42"],
      },
    },
  },
}
```

Resolución de políticas:

| Campo           | Efecto                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode: "allow"` | Los patrones de mención de regex están habilitados a menos que el ID de conversación esté en `denyIn`. Este es el valor predeterminado.                               |
| `mode: "deny"`  | Los patrones de mención de regex están deshabilitados a menos que el ID de conversación esté en `allowIn`.                                                            |
| `allowIn`       | ID de conversación donde los patrones de mención de regex están habilitados en modo de denegación.                                                                    |
| `denyIn`        | ID de conversación donde los patrones de mención de expresiones regulares están desactivados. `denyIn` tiene prioridad sobre `allowIn` si ambos incluyen el mismo ID. |

Política de expresión regular con ámbito admitida actualmente:

| Canal    | ID utilizados en `allowIn` / `denyIn`                              |
| -------- | ------------------------------------------------------------------ |
| Discord  | ID de canales de Discord.                                          |
| Matrix   | ID de salas de Matrix.                                             |
| Slack    | ID de canales de Slack.                                            |
| Telegram | ID de chat de grupo, o `chatId:topic:threadId` para temas de foro. |
| WhatsApp | ID de conversación de WhatsApp como `123@g.us`.                    |

Las configuraciones de canal a nivel de cuenta pueden establecer la misma política bajo
`channels.<channel>.accounts.<accountId>.mentionPatterns` cuando ese canal
admite múltiples cuentas. La política de cuenta tiene prioridad sobre la política
de canal de nivel superior para esa cuenta.

<AccordionGroup>
  <Accordion title="Notas sobre el filtrado de menciones">
    - `mentionPatterns` son patrones de regex seguros que no distinguen entre mayúsculas y minúsculas; los patrones no válidos y las formas de repetición anidada inseguras se ignoran.
    - Las superficies que proporcionan menciones explícitas todavía pasan; los patrones de regex configurados son un respaldo.
    - `channels.<channel>.mentionPatterns.mode: "deny"` deshabilita los patrones de mención configurados por defecto para ese canal; vuelva a activar las conversaciones seleccionadas con `allowIn`.
    - `channels.<channel>.mentionPatterns.denyIn` deshabilita los patrones de mención configurados para IDs de conversación específicos, mientras que las @menciones nativas de la plataforma todavía pasan.
    - Invalidación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
    - El filtrado de menciones solo se aplica cuando la detección de menciones es posible (las menciones nativas o `mentionPatterns` están configuradas).
    - Permitir un grupo o remitente no deshabilita el filtrado de menciones; establezca el `requireMention` de ese grupo en `false` cuando todos los mensajes deberían activarse.
    - El contexto del prompt de chat grupal automático lleva la instrucción de respuesta silenciosa resuelta en cada turno; los archivos del espacio de trabajo no deben duplicar la mecánica de `NO_REPLY`.
    - Los grupos donde se permiten respuestas silenciosas automáticas tratan los turnos de modelo vacíos limpios o solo de razonamiento como silenciosos, equivalente a `NO_REPLY`. Los chats directos nunca reciben la guía de `NO_REPLY`, y las respuestas grupales solo de herramienta de mensaje se mantienen silenciosas al no llamar a `message(action=send)`.
    - El chat ambiental siempre activo en grupos utiliza semántica de solicitud de usuario de forma predeterminada. Establezca `messages.groupChat.unmentionedInbound: "room_event"` para enviarlo como contexto silencioso en su lugar. Consulte [Ambient room events](/es/channels/ambient-room-events) para ver ejemplos de configuración.
    - Los eventos de sala no se almacenan como solicitudes de usuario falsas, y el texto del asistente privado de eventos de sala sin herramienta de mensaje no se reproduce como historial de chat.
    - Los valores predeterminados de Discord se encuentran en `channels.discord.guilds."*"` (modificables por gremio/canal).
    - El contexto del historial de grupos se envuelve de manera uniforme en todos los canales. Los grupos con filtrado de menciones mantienen los mensajes omitidos pendientes; los grupos siempre activos también pueden retener mensajes de sala procesados recientes cuando el canal lo admite. Use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para las invalidaciones. Establezca `0` para deshabilitar.

  </Accordion>
</AccordionGroup>

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal admiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo. Utilice prefijos de clave explícitos: `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` y el comodín `"*"`. Los identificadores de canal utilizan identificadores de canal canónicos de OpenClaw; los alias como `teams` se normalizan a `msteams`. Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.

Orden de resolución (gana el más específico):

<Steps>
  <Step title="Group toolsBySender">Coincidencia de `toolsBySender` de grupo/canal.</Step>
  <Step title="Group tools">`tools` de grupo/canal.</Step>
  <Step title="Default toolsBySender">Coincidencia de `toolsBySender` predeterminada (`"*"`).</Step>
  <Step title="Default tools">`tools` predeterminada (`"*"`).</Step>
</Steps>

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

<Note>Las restricciones de herramientas de grupo/canal se aplican además de la política de herramientas global/ del agente (la denegación aún tiene prioridad). Algunos canales utilizan una anidación diferente para salas/canales (p. ej., Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listas de permitidos de grupos

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista de permitidos de grupos. Utilice `"*"` para permitir todos los grupos mientras se establece el comportamiento de mención predeterminado.

<Warning>
  Confusión común: la aprobación del emparejamiento de MD no es lo mismo que la autorización de grupo. Para los canales que admiten el emparejamiento de MD, el almacén de emparejamiento solo desbloquea los MD. Los comandos de grupo aún requieren una autorización explícita del remitente del grupo de las listas de permitidos de configuración, como `groupAllowFrom` o la alternativa de configuración
  documentada para ese canal.
</Warning>

Intenciones comunes (copiar/pegar):

<Tabs>
  <Tab title="Desactivar todas las respuestas de grupo">
    ```json5
    {
      channels: { whatsapp: { groupPolicy: "disabled" } },
    }
    ```
  </Tab>
  <Tab title="Permitir solo grupos específicos (WhatsApp)">
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
  </Tab>
  <Tab title="Permitir todos los grupos pero requerir mención">
    ```json5
    {
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Activadores solo para propietarios (WhatsApp)">
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
  </Tab>
</Tabs>

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
- `WasMentioned` (resultado del filtrado de menciones)
- Los temas de los foros de Telegram también incluyen `MessageThreadId` y `IsForum`.

El mensaje del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, evite las tablas de Markdown, minimice las líneas vacías y siga el espaciado normal del chat, y evite escribir secuencias literales de `\n`. Los nombres de grupo y las etiquetas de los participantes originados del canal se representan como metadatos no confinados y cercados, no como instrucciones del sistema en línea.

## Especificidades de iMessage

- Prefiera `chat_id:<id>` al enrutar o permitir listas.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas del grupo siempre vuelven al mismo `chat_id`.

## Mensajes del sistema de WhatsApp

Consulte [WhatsApp](/es/channels/whatsapp#system-prompts) para conocer las reglas canónicas del sistema de instrucciones de WhatsApp, incluida la resolución de instrucciones grupales y directas, el comportamiento de los comodines y la semántica de anulación de la cuenta.

## Especificidades de WhatsApp

Consulte [Mensajes de grupo](/es/channels/group-messages) para conocer el comportamiento exclusivo de WhatsApp (inyección de historial, detalles del manejo de menciones).

## Relacionado

- [Grupos de difusión](/es/channels/broadcast-groups)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Mensajes de grupo](/es/channels/group-messages)
- [Emparejamiento](/es/channels/pairing)

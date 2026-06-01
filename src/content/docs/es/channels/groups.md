---
summary: "Comportamiento del chat grupal en diferentes plataformas (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Grupos"
sidebarTitle: "Grupos"
---

OpenClaw trata los chats grupales de manera consistente en todas las plataformas: Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

Para salas que siempre están activas y que deben proporcionar un contexto silencioso a menos que el agente envíe explícitamente un mensaje visible, consulte [Eventos de sala ambiente](/es/channels/ambient-room-events).

## Introducción para principiantes (2 minutos)

OpenClaw "vive" en sus propias cuentas de mensajería. No hay un usuario de bot de WhatsApp separado. Si **usted** está en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactive explícitamente el filtrado de menciones.
- Las respuestas visibles en grupos/canales usan la herramienta `message` de forma predeterminada.

Traducción: los remitentes en la lista permitida pueden activar OpenClaw mencionándolo.

<Note>
**TL;DR**

- El **acceso a MD** está controlado por `*.allowFrom`.
- El **acceso a grupos** está controlado por `*.groupPolicy` + listas permitidas (`*.groups`, `*.groupAllowFrom`).
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

Para solicitudes normales de grupos/canales, OpenClaw usa por defecto `messages.groupChat.visibleReplies: "automatic"`. El texto final del asistente se publica a través de la ruta heredada de respuesta visible a menos que opte por que la sala solo tenga salida de herramientas de mensaje.

Use `messages.groupChat.visibleReplies: "message_tool"` cuando una sala compartida debe permitir que el agente decida cuándo hablar llamando a `message(action=send)`. Esto funciona mejor para salas de grupo respaldadas por modelos de última generación confiables con herramientas, como GPT 5.5. Si el modelo no usa esa herramienta y devuelve un texto final sustantivo, OpenClaw mantiene ese texto final privado en lugar de publicarlo en la sala.

Si la herramienta de mensaje no está disponible bajo la política de herramientas activa, OpenClaw recurre
a respuestas visibles automáticas en lugar de suprimir silenciosamente la respuesta.
`openclaw doctor` advierte sobre esta incompatibilidad.

Para chats directos y cualquier otro evento de origen, use `messages.visibleReplies: "message_tool"` para aplicar el mismo comportamiento de respuesta visible solo para herramientas a nivel global. Los turnos directos de WebChat interno tienen como valor predeterminado la entrega automática de la respuesta final para que Pi y Codex reciban el mismo contrato de respuesta visible. Establezca `messages.visibleReplies: "message_tool"` para requerir intencionalmente `message(action=send)` para la salida visible. `messages.groupChat.visibleReplies` sigue siendo la sustitución más específica para salas de grupo/canal.

Esto reemplaza el antiguo patrón de forzar al modelo a responder `NO_REPLY` para la mayoría de los turnos en modo de observación. En el modo de solo herramientas, no hacer nada visible simplemente significa no llamar a la herramienta de mensaje.

Los indicadores de escritura todavía se envían para las solicitudes directas de grupo. Los eventos ambiente de salas siempre activas, cuando están habilitados, se mantienen estrictos y silenciosos a menos que el agente llame a la herramienta de mensaje.

Las sesiones suprimen los resúmenes detallados de herramientas/progreso de forma predeterminada. Use `/verbose on`
para mostrar esos resúmenes durante la sesión actual mientras se depura, y
`/verbose off` para volver al comportamiento de solo respuesta final. El mismo estado detallado
se aplica a chats directos, grupos, canales y temas de foros.

Para enviar charlas de grupo siempre activas no mencionadas como contexto de sala silencioso en lugar de solicitudes de usuario, use [Eventos de sala ambiente](/es/channels/ambient-room-events):

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

Los mensajes mencionados, comandos, solicitudes de anulación y los DMs siguen siendo solicitudes de usuario.

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

La puerta de enlace recarga en caliente la configuración de `messages` después de guardar el archivo. Reinicie solo
cuando la observación de archivos o la recarga de configuración está deshabilitada en el despliegue.

Para requerir que la salida visible pase a través de la herramienta de mensaje para cada chat de origen:

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Los comandos de barra nativos (Discord, Telegram y otras superficies con soporte de comandos nativos) omiten `visibleReplies: "message_tool"` y siempre responden visiblemente para que la interfaz de usuario de comandos nativa del canal reciba la respuesta que espera. Esto se aplica solo a turnos de comandos nativos validados; los comandos `/...` escritos como texto y los turnos de chat ordinarios todavía siguen el valor predeterminado del grupo configurado.

## Visibilidad del contexto y listas de permitidos

Están involucrados dos controles diferentes en la seguridad del grupo:

- **Autorización de activación**: quién puede activar al agente (`groupPolicy`, `groups`, `groupAllowFrom`, listas de permitidos específicas del canal).
- **Visibilidad del contexto**: qué contexto complementario se inyecta en el modelo (texto de respuesta, citas, historial de hilos, metadatos reenviados).

De forma predeterminada, OpenClaw prioriza el comportamiento de chat normal y mantiene el contexto principalmente tal como se recibe. Esto significa que las listas de permitidos deciden principalmente quién puede activar acciones, no un límite universal de redacción para cada fragmento citado o histórico.

<AccordionGroup>
  <Accordion title="El comportamiento actual es específico del canal">
    - Algunos canales ya aplican un filtrado basado en el remitente para el contexto suplementario en rutas específicas (por ejemplo, la propagación de hilos de Slack, búsquedas de respuestas/hilos de Matrix).
    - Otros canales aún pasan el contexto de cita/respuesta/reenvío tal como se recibe.

  </Accordion>
  <Accordion title="Dirección de endurecimiento (planificado)">
    - `contextVisibility: "all"` (predeterminado) mantiene el comportamiento actual tal como se recibe.
    - `contextVisibility: "allowlist"` filtra el contexto suplementario a los remitentes en la lista de permitidos.
    - `contextVisibility: "allowlist_quote"` es `allowlist` más una excepción de cita/respuesta explícita.

    Hasta que este modelo de endurecimiento se implemente de manera consistente en todos los canales, espere diferencias por superficie.

  </Accordion>
</AccordionGroup>

![Flujo de mensajes del grupo](/images/groups-flow.svg)

Si desea...

| Objetivo                                                            | Qué configurar                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Permitir todos los grupos pero responder solo en @menciones         | `groups: { "*": { requireMention: true } }`                |
| Deshabilitar todas las respuestas de grupo                          | `groupPolicy: "disabled"`                                  |
| Solo grupos específicos                                             | `groups: { "<group-id>": { ... } }` (sin clave `"*"`)      |
| Solo tú puedes activar en grupos                                    | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Reutilizar un conjunto de remitentes de confianza en varios canales | `groupAllowFrom: ["accessGroup:operators"]`                |

Para listas de permitidos de remitentes reutilizables, consulte [Grupos de acceso](/es/channels/access-groups).

## Claves de sesión

- Las sesiones de grupo usan claves de sesión `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
- Los temas del foro de Telegram añaden `:topic:<threadId>` al id del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Los latidos se omiten para las sesiones de grupo.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Patrón: MDs personales + grupos públicos (un solo agente)

Sí — esto funciona bien si su tráfico "personal" son **MDs** y su tráfico "público" son **grupos**.

Por qué: en el modo de agente único, los MDs generalmente aterrizan en la clave de sesión **main** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **non-main** (`agent:main:<channel>:group:<id>`). Si habilita el sandbox con `mode: "non-main"`, esas sesiones de grupo se ejecutan en el backend de sandbox configurado mientras que su sesión principal de MD se mantiene en el host. Docker es el backend predeterminado si no elige uno.

Esto te da un "cerebro" de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **MDs**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas

<Note>Si necesita espacios de trabajo/personas verdaderamente separados ("personal" y "público" nunca deben mezclarse), use un segundo agente + enlaces. Consulte [Enrutamiento multiagente](/es/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="MDs en host, grupos en sandbox">
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
  <Tab title="Los grupos ven solo una carpeta en la lista de permitidos">
    ¿Quiere que "los grupos solo puedan ver la carpeta X" en lugar de "sin acceso al host"? Mantenga `workspaceAccess: "none"` y monte solo las rutas permitidas en el sandbox:

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
- Depuración de por qué se bloquea una herramienta: [Sandbox vs Política de herramientas vs Elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de los montajes de enlace: [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, con el formato `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats grupales usan `g-<slug>` (minúsculas, espacios -> `-`, mantener `#@+._-`).

## Política de grupo

Controla cómo se manejan los mensajes de grupo/sala por canal:

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

| Política      | Comportamiento                                                                       |
| ------------- | ------------------------------------------------------------------------------------ |
| `"open"`      | Los grupos omiten las listas de permitidos; el filtrado de menciones aún se aplica.  |
| `"disabled"`  | Bloquear todos los mensajes de grupo por completo.                                   |
| `"allowlist"` | Permitir solo los grupos/salas que coincidan con la lista de permitidos configurada. |

<AccordionGroup>
  <Accordion title="Notas por canal">
    - `groupPolicy` es independiente del filtrado de menciones (que requiere @menciones).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo: use `groupAllowFrom` (alternativa: `allowFrom` explícito).
    - Signal: `groupAllowFrom` puede coincidir tanto con el ID de grupo de Signal entrante como con el teléfono/UUID del remitente.
    - Las aprobaciones de emparejamiento DM (entradas de almacenamiento `*-allowFrom`) se aplican solo al acceso DM; la autorización del remitente del grupo permanece explícita para las listas de permitidos del grupo.
    - Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
    - Slack: la lista de permitidos usa `channels.slack.channels`.
    - Matrix: la lista de permitidos usa `channels.matrix.groups`. Se prefieren los ID o alias de las salas; la búsqueda de nombres de salas unidas es de mejor esfuerzo, y los nombres no resueltos se ignoran en tiempo de ejecución. Use `channels.matrix.groupAllowFrom` para restringir remitentes; las listas de permitidos `users` por sala también son compatibles.
    - Los MD de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La lista de permitidos de Telegram puede coincidir con ID de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
    - El valor predeterminado es `groupPolicy: "allowlist"`; si su lista de permitidos del grupo está vacía, los mensajes del grupo se bloquean.
    - Seguridad en tiempo de ejecución: cuando falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupo vuelve a un modo de cierre por fallo (típicamente `allowlist`) en lugar de heredar `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modelo mental rápido (orden de evaluación para mensajes de grupo):

<Steps>
  <Step title="groupPolicy">`groupPolicy` (abierto/deshabilitado/lista de permitidos).</Step>
  <Step title="Listas de permitidos de grupo">Listas de permitidos de grupo (`*.groups`, `*.groupAllowFrom`, lista de permitidos específica del canal).</Step>
  <Step title="Mencionar puerta">Mencionar puerta (`requireMention`, `/activation`).</Step>
</Steps>

## Filtrado de menciones (predeterminado)

Los mensajes grupales requieren una mención a menos que se anule por grupo. Los valores predeterminados viven por subsistema bajo `*.groups."*"`.

Responder a un mensaje de bot cuenta como una mención implícita cuando el canal admite metadatos de respuesta. Citar un mensaje de bot también puede contar como una mención implícita en canales que exponen metadatos de cita. Los casos integrados actuales incluyen Telegram, WhatsApp, Slack, Discord, Microsoft Teams y ZaloUser.

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

<AccordionGroup>
  <Accordion title="Notas sobre el filtrado de menciones">
    - `mentionPatterns` son patrones de regex seguros que no distinguen mayúsculas de minúsculas; se ignoran los patrones no válidos y las formas de repetición anidadas inseguras.
    - Las superficies que proporcionan menciones explícitas aún pasan; los patrones son una alternativa.
    - Anulación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
    - El filtrado de menciones solo se aplica cuando la detección de menciones es posible (las menciones nativas o `mentionPatterns` están configuradas).
    - Permitir un grupo o remitente no desactiva el filtrado de menciones; establezca el `requireMention` de ese grupo en `false` cuando todos los mensajes deben activar.
    - El contexto del prompt de chat de grupo automático lleva la instrucción de respuesta silenciosa resuelta en cada turno; los archivos del espacio de trabajo no deben duplicar la mecánica de `NO_REPLY`.
    - Los grupos donde se permiten respuestas silenciosas automáticas tratan los turnos de modelo vacíos limpios o solo de razonamiento como silenciosos, equivalentes a `NO_REPLY`. Los chats directos nunca reciben orientación de `NO_REPLY`, y las respuestas de grupo solo con herramienta de mensaje se mantienen silenciosas al no llamar a `message(action=send)`.
    - El chat ambiente de grupo siempre activo utiliza semánticas de solicitud de usuario de forma predeterminada. Establezca `messages.groupChat.unmentionedInbound: "room_event"` para enviarlo como contexto silencioso en su lugar. Consulte [Ambient room events](/es/channels/ambient-room-events) para ver ejemplos de configuración.
    - Los eventos de sala no se almacenan como solicitudes de usuario falsas, y el texto privado del asistente de eventos de sala sin herramienta de mensaje no se reproduce como historial de chat.
    - Los valores predeterminados de Discord se encuentran en `channels.discord.guilds."*"` (modificables por gremio/canal).
    - El contexto del historial de grupo se ajusta uniformemente en todos los canales. Los grupos con filtrado de menciones mantienen los mensajes omitidos pendientes; los grupos siempre activos también pueden retener mensajes de sala procesados recientes cuando el canal lo admite. Use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para anulaciones. Establezca `0` para desactivar.

  </Accordion>
</AccordionGroup>

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canales permiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo. Use prefijos de clave explícitos: `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` y el comodín `"*"`. Los ids de canal usan los ids de canal canónicos de OpenClaw; los alias como `teams` se normalizan a `msteams`. Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.

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

<Note>Las restricciones de herramientas de grupo/canal se aplican además de la política de herramientas global/por agente (la denegación todavía tiene prioridad). Algunos canales usan una anidación diferente para salas/canales (p. ej., Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listas de permitidos de grupo

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista de permitidos de grupo. Use `"*"` para permitir todos los grupos mientras todavía configura el comportamiento de mención predeterminado.

<Warning>
  Confusión común: la aprobación del emparejamiento de MD no es lo mismo que la autorización de grupo. Para los canales que admiten el emparejamiento de MD, el almacén de emparejamiento solo desbloquea los MD. Los comandos de grupo todavía requieren una autorización explícita de remitente de grupo desde las listas de permitidos de configuración, como `groupAllowFrom` o la reserva de configuración
  documentada para ese canal.
</Warning>

Intenciones comunes (copiar/pegar):

<Tabs>
  <Tab title="Deshabilitar todas las respuestas de grupo">
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

Los propietarios del grupo pueden activar o desactivar el grupo:

- `/activation mention`
- `/activation always`

El propietario se determina mediante `channels.whatsapp.allowFrom` (o el propio E.164 del bot si no se establece). Envíe el comando como un mensaje independiente. Otras superficies ignoran actualmente `/activation`.

## Campos de contexto

Las cargas útiles entrantes de grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado de filtrado de menciones)
- Los temas de los foros de Telegram también incluyen `MessageThreadId` y `IsForum`.

El indicador del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión grupal. Recuerda al modelo que responda como un humano, que evite las tablas de Markdown, que minimice las líneas vacías y siga el espaciado normal del chat, y que evite escribir secuencias literales de `\n`. Los nombres de grupo y las etiquetas de los participantes procedentes del canal se representan como metadatos no confiables cercados, no como instrucciones del sistema en línea.

## Específicos de iMessage

- Se prefiere `chat_id:<id>` al enrutar o crear listas de permitidos.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas grupales siempre vuelven al mismo `chat_id`.

## Mensajes del sistema de WhatsApp

Consulte [WhatsApp](/es/channels/whatsapp#system-prompts) para conocer las reglas canónicas del indicador del sistema de WhatsApp, incluida la resolución de indicadores grupales y directos, el comportamiento de los comodines y la semántica de anulación de la cuenta.

## Especificidades de WhatsApp

Consulte [Mensajes grupales](/es/channels/group-messages) para conocer el comportamiento exclusivo de WhatsApp (inyección de historial, detalles del manejo de menciones).

## Relacionado

- [Grupos de difusión](/es/channels/broadcast-groups)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Mensajes grupales](/es/channels/group-messages)
- [Emparejamiento](/es/channels/pairing)

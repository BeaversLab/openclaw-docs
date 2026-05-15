---
summary: "Comportamiento del chat grupal en diferentes plataformas (Discord/iMessage/Matrix/Microsoft Teams/Signal/Slack/Telegram/WhatsApp/Zalo)"
read_when:
  - Changing group chat behavior or mention gating
title: "Grupos"
sidebarTitle: "Grupos"
---

OpenClaw trata los chats grupales de manera consistente en todas las plataformas: Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo.

## Introducción para principiantes (2 minutos)

OpenClaw "vive" en tus propias cuentas de mensajería. No hay un usuario de bot de WhatsApp separado. Si **tú** estás en un grupo, OpenClaw puede ver ese grupo y responder allí.

Comportamiento predeterminado:

- Los grupos están restringidos (`groupPolicy: "allowlist"`).
- Las respuestas requieren una mención a menos que desactive explícitamente el filtrado por menciones.
- Las respuestas finales normales en grupos/canales son privadas por defecto. La salida visible en la sala utiliza la herramienta `message`.

Traducción: los remitentes en la lista de permitidos pueden activar OpenClaw mencionándolo.

<Note>
**TL;DR**

- El **acceso a DM** está controlado por `*.allowFrom`.
- El **acceso a grupos** está controlado por `*.groupPolicy` + listas de permitidos (`*.groups`, `*.groupAllowFrom`).
- La **activación de respuestas** está controlada por el filtrado de menciones (`requireMention`, `/activation`).

</Note>

Flujo rápido (qué le sucede a un mensaje de grupo):

```
groupPolicy? disabled -> drop
groupPolicy? allowlist -> group allowed? no -> drop
requireMention? yes -> mentioned? no -> store for context only
otherwise -> reply
```

## Respuestas visibles

Para las salas de grupo/canal, OpenClaw por defecto es `messages.groupChat.visibleReplies: "message_tool"`.
`openclaw doctor --fix` escribe este valor predeterminado en las configuraciones de canales configurados que lo omiten.
Eso significa que el agente aún procesa el turno y puede actualizar el estado de memoria/sesión, pero su respuesta final normal no se publica automáticamente en la sala. Para hablar visiblemente, el agente utiliza `message(action=send)`.

Este valor predeterminado depende de un modelo/ejecución que llame a las herramientas de manera confiable. Si los registros muestran
texto del asistente pero `didSendViaMessagingTool: false`, el modelo respondió
privadamente en lugar de llamar a la herramienta de mensaje. Eso no es un
fallo de envío de Discord/Slack/Telegram. Utilice un modelo confiable en la llamada de herramientas para
sesiones de grupo/canal, o configure
`messages.groupChat.visibleReplies: "automatic"` para restaurar las respuestas finales
visibles heredadas.

Si la herramienta de mensaje no está disponible bajo la política de herramientas activa, OpenClaw recurre
a respuestas visibles automáticas en lugar de suprimir silenciosamente la respuesta.
`openclaw doctor` advierte sobre esta discrepancia.

Para chats directos y cualquier otro turno de origen, use `messages.visibleReplies: "message_tool"` para aplicar el mismo comportamiento de respuesta visible solo para herramientas globalmente. Losarness también pueden elegir esto como su predeterminado sin establecer; elarness Codex hace esto para los chats directos en modo Codex. `messages.groupChat.visibleReplies` sigue siendo la anulación más específica para salas de grupos/canales.

Esto reemplaza el patrón antiguo de forzar al modelo a responder `NO_REPLY` para la mayoría de los turnos en modo lurk. En modo de solo herramientas, no hacer nada visible simplemente significa no llamar a la herramienta de mensaje.

Los indicadores de escritura todavía se envían mientras el agente trabaja en modo de solo herramientas. El modo de escritura de grupo predeterminado se actualiza de "message" a "instant" para estos turnos porque puede que nunca haya texto de mensaje de asistente normal antes de que el agente decida si llamar a la herramienta de mensaje. La configuración explícita del modo de escritura aún tiene prioridad.

Para restaurar las respuestas finales automáticas heredadas para salas de grupos/canales:

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

La puerta de enlace recarga en caliente `messages` la configuración después de guardar el archivo. Reinicie solo
cuando el seguimiento de archivos o la recarga de configuración estén deshabilitados en el despliegue.

Para requerir que la salida visible pase a través de la herramienta de mensaje para cada chat de origen:

```json5
{
  messages: {
    visibleReplies: "message_tool",
  },
}
```

Los comandos de barra nativos (Discord, Telegram y otras superficies con soporte de comandos nativos) omiten `visibleReplies: "message_tool"` y siempre responden visiblemente para que la IU de comandos nativa del canal obtenga la respuesta que espera. Esto se aplica solo a los turnos de comandos nativos validados; los comandos `/...` escritos como texto y los turnos de chat ordinarios aún siguen el predeterminado de grupo configurado.

## Visibilidad del contexto y listas de permitidos

Dos controles diferentes están involucrados en la seguridad del grupo:

- **Autorización de disparo**: quién puede activar el agente (`groupPolicy`, `groups`, `groupAllowFrom`, listas de permitidos específicas del canal).
- **Visibilidad del contexto**: qué contexto suplementario se inyecta en el modelo (texto de respuesta, citas, historial de hilos, metadatos reenviados).

De forma predeterminada, OpenClaw prioriza el comportamiento de chat normal y mantiene el contexto tal como se recibe principalmente. Esto significa que las listas de permitidos deciden principalmente quién puede activar acciones, no un límite universal de redacción para cada fragmento citado o histórico.

<AccordionGroup>
  <Accordion title="El comportamiento actual es específico del canal">
    - Algunos canales ya aplican el filtrado basado en el remitente para el contexto complementario en rutas específicas (por ejemplo, la creación de hilos en Slack, las búsquedas de respuestas/hilos en Matrix).
    - Otros canales todavía pasan el contexto de cita/respuesta/reenvío tal como se recibe.

  </Accordion>
  <Accordion title="Dirección de endurecimiento (planeada)">
    - `contextVisibility: "all"` (predeterminado) mantiene el comportamiento actual tal como se recibe.
    - `contextVisibility: "allowlist"` filtra el contexto complementario a los remitentes en la lista de permitidos.
    - `contextVisibility: "allowlist_quote"` es `allowlist` más una excepción explícita de cita/respuesta.

    Hasta que este modelo de endurecimiento se implemente de manera consistente en todos los canales, espere diferencias según la plataforma.

  </Accordion>
</AccordionGroup>

![Flujo de mensajes de grupo](/images/groups-flow.svg)

Si desea...

| Objetivo                                                         | Qué configurar                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Permitir todos los grupos pero responder solo en @menciones      | `groups: { "*": { requireMention: true } }`                |
| Desactivar todas las respuestas de grupo                         | `groupPolicy: "disabled"`                                  |
| Solo grupos específicos                                          | `groups: { "<group-id>": { ... } }` (sin clave `"*"`)      |
| Solo tú puedes activar en grupos                                 | `groupPolicy: "allowlist"`, `groupAllowFrom: ["+1555..."]` |
| Reutilizar un conjunto de remitentes de confianza en los canales | `groupAllowFrom: ["accessGroup:operators"]`                |

Para listas de permitidos de remitentes reutilizables, consulte [Grupos de acceso](/es/channels/access-groups).

## Claves de sesión

- Las sesiones de grupo usan claves de sesión `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
- Los temas del foro de Telegram añaden `:topic:<threadId>` al ID del grupo para que cada tema tenga su propia sesión.
- Los chats directos usan la sesión principal (o por remitente si está configurado).
- Se omiten los latidos para las sesiones de grupo.

<a id="pattern-personal-dms-public-groups-single-agent"></a>

## Patrón: MDs personales + grupos públicos (agente único)

Sí; esto funciona bien si su tráfico "personal" son **MDs** y su tráfico "público" son **grupos**.

Por qué: en el modo de agente único, los mensajes privados (DM) generalmente aterrizan en la clave de sesión **principal** (`agent:main:main`), mientras que los grupos siempre usan claves de sesión **no principales** (`agent:main:<channel>:group:<id>`). Si habilitas el sandboxing con `mode: "non-main"`, esas sesiones de grupo se ejecutan en el backend de sandbox configurado mientras tu sesión de mensajes privados principal se mantiene en el host. Docker es el backend predeterminado si no eliges uno.

Esto te da un "cerebro" de agente (espacio de trabajo compartido + memoria), pero dos posturas de ejecución:

- **Mensajes privados**: herramientas completas (host)
- **Grupos**: sandbox + herramientas restringidas

<Note>Si necesitas espacios de trabajo/personas verdaderamente separados ("personal" y "público" nunca deben mezclarse), usa un segundo agente + enlaces. Consulta [Enrutamiento Multi-Agente](/es/concepts/multi-agent).</Note>

<Tabs>
  <Tab title="Mensajes privados en host, grupos en sandbox">
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
  <Tab title="Los grupos solo ven una carpeta permitida">
    ¿Quieres "los grupos solo pueden ver la carpeta X" en lugar de "sin acceso al host"? Mantén `workspaceAccess: "none"` y monta solo las rutas permitidas en el sandbox:

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
- Depuración de por qué se bloquea una herramienta: [Sandbox vs Política de Herramientas vs Elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated)
- Detalles de bind mounts: [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts)

## Etiquetas de visualización

- Las etiquetas de la interfaz de usuario usan `displayName` cuando están disponibles, formateadas como `<channel>:<token>`.
- `#room` está reservado para salas/canales; los chats de grupo usan `g-<slug>` (minúsculas, espacios -> `-`, conservar `#@+._-`).

## Política de grupo

Controlar cómo se manejan los mensajes de grupo/sala por canal:

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
    - `groupPolicy` es independiente del control de menciones (que requiere @menciones).
    - WhatsApp/Telegram/Signal/iMessage/Microsoft Teams/Zalo: usa `groupAllowFrom` (alternativa: `allowFrom` explícito).
    - Signal: `groupAllowFrom` puede coincidir con el ID del grupo de Signal entrante o con el teléfono/UUID del remitente.
    - Las aprobaciones de emparejamiento de DM (entradas del almacén `*-allowFrom`) se aplican solo al acceso DM; la autorización del remitente del grupo permanece explícita para las listas de permitidos del grupo.
    - Discord: la lista de permitidos usa `channels.discord.guilds.<id>.channels`.
    - Slack: la lista de permitidos usa `channels.slack.channels`.
    - Matrix: la lista de permitidos usa `channels.matrix.groups`. Se prefieren los ID o alias de las salas; la búsqueda por nombre de sala unida se hace con el mejor esfuerzo posible, y los nombres no resueltos se ignoran en tiempo de ejecución. Usa `channels.matrix.groupAllowFrom` para restringir remitentes; las listas de permitidas `users` por sala también son compatibles.
    - Los MD de grupo se controlan por separado (`channels.discord.dm.*`, `channels.slack.dm.*`).
    - La lista de permitidos de Telegram puede coincidir con ID de usuario (`"123456789"`, `"telegram:123456789"`, `"tg:123456789"`) o nombres de usuario (`"@alice"` o `"alice"`); los prefijos no distinguen entre mayúsculas y minúsculas.
    - El valor predeterminado es `groupPolicy: "allowlist"`; si tu lista de permitidos del grupo está vacía, los mensajes del grupo se bloquean.
    - Seguridad en tiempo de ejecución: cuando falta completamente un bloque de proveedor (`channels.<provider>` ausente), la política de grupo recurre a un modo de fallo cerrado (típicamente `allowlist`) en lugar de heredar `channels.defaults.groupPolicy`.

  </Accordion>
</AccordionGroup>

Modelo mental rápido (orden de evaluación para mensajes de grupo):

<Steps>
  <Step title="groupPolicy">`groupPolicy` (abierto/deshabilitado/lista de permitidos).</Step>
  <Step title="Listas de permitidos de grupo">Listas de permitidos de grupo (`*.groups`, `*.groupAllowFrom`, lista de permitidos específica del canal).</Step>
  <Step title="Mención obligatoria">Mención obligatoria (`requireMention`, `/activation`).</Step>
</Steps>

## Mención obligatoria (predeterminado)

Los mensajes de grupo requieren una mención a menos que se anule por grupo. Los valores predeterminados viven por subsistema bajo `*.groups."*"`.

Responder a un mensaje del bot cuenta como una mención implícita cuando el canal admite metadatos de respuesta. Citar un mensaje del bot también puede contar como una mención implícita en los canales que exponen metadatos de cita. Los casos integrados actuales incluyen Telegram, WhatsApp, Slack, Discord, Microsoft Teams y ZaloUser.

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
  <Accordion title="Notas sobre mención obligatoria">
    - `mentionPatterns` son patrones de expresiones regulares seguros que no distinguen mayúsculas de minúsculas; se ignoran los patrones no válidos y los formularios de repetición anidada no seguros.
    - Las superficies que proporcionan menciones explícitas aún pasan; los patrones son un respaldo.
    - Anulación por agente: `agents.list[].groupChat.mentionPatterns` (útil cuando varios agentes comparten un grupo).
    - La mención obligatoria solo se aplica cuando la detección de mención es posible (menciones nativas o `mentionPatterns` están configuradas).
    - Permitir un grupo o remitente no desactiva la mención obligatoria; establezca `requireMention` de ese grupo en `false` cuando todos los mensajes deben activarse.
    - El contexto del prompt del chat de grupo lleva la instrucción de respuesta silenciosa resuelta en cada turno; los archivos del espacio de trabajo no deben duplicar la mecánica de `NO_REPLY`.
    - Los grupos donde se permiten respuestas silenciosas tratan los turnos de modelo vacíos limpios o solo de razonamiento como silenciosos, equivalente a `NO_REPLY`. Los chats directos hacen lo mismo solo cuando las respuestas silenciosas directas están permitidas explícitamente; de lo contrario, las respuestas vacías siguen siendo turnos de agente fallidos.
    - Los valores predeterminados de Discord viven en `channels.discord.guilds."*"` (anulables por servidor/canal).
    - El contexto del historial del grupo se ajusta de manera uniforme en todos los canales y es **solo pendiente** (mensajes omitidos debido a la mención obligatoria); use `messages.groupChat.historyLimit` para el valor predeterminado global y `channels.<channel>.historyLimit` (o `channels.<channel>.accounts.*.historyLimit`) para anulaciones. Establezca `0` para desactivar.

  </Accordion>
</AccordionGroup>

## Restricciones de herramientas de grupo/canal (opcional)

Algunas configuraciones de canal admiten restringir qué herramientas están disponibles **dentro de un grupo/sala/canal específico**.

- `tools`: permitir/denegar herramientas para todo el grupo.
- `toolsBySender`: anulaciones por remitente dentro del grupo. Use prefijos de clave explícitos: `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` y el comodín `"*"`. Las claves heredadas sin prefijo todavía se aceptan y coinciden solo como `id:`.

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

<Note>Las restricciones de herramientas de grupo/canal se aplican además de la política de herramientas global/agente (la denegación aún gana). Algunos canales usan una anidación diferente para salas/canales (p. ej., Discord `guilds.*.channels.*`, Slack `channels.*`, Microsoft Teams `teams.*.channels.*`).</Note>

## Listas de permitidos de grupos

Cuando se configura `channels.whatsapp.groups`, `channels.telegram.groups` o `channels.imessage.groups`, las claves actúan como una lista de permitidos de grupos. Use `"*"` para permitir todos los grupos mientras se sigue estableciendo el comportamiento de mención predeterminado.

<Warning>
  Confusión común: la aprobación del emparejamiento de MD no es lo mismo que la autorización de grupo. Para los canales que admiten el emparejamiento de MD, el almacén de emparejamiento solo desbloquea los MD. Los comandos de grupo aún requieren una autorización explícita del remitente del grupo de las listas de permitidos de la configuración, como `groupAllowFrom` o la alternativa de
  configuración documentada para ese canal.
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

Los propietarios del grupo pueden alternar la activación por grupo:

- `/activation mention`
- `/activation always`

El propietario se determina por `channels.whatsapp.allowFrom` (o por el propio E.164 del bot cuando no está configurado). Envíe el comando como un mensaje independiente. Otras superficies actualmente ignoran `/activation`.

## Campos de contexto

Las cargas útiles entrantes del grupo establecen:

- `ChatType=group`
- `GroupSubject` (si se conoce)
- `GroupMembers` (si se conoce)
- `WasMentioned` (resultado del filtrado de mención)
- Los temas de foro de Telegram también incluyen `MessageThreadId` y `IsForum`.

El mensaje del sistema del agente incluye una introducción al grupo en el primer turno de una nueva sesión de grupo. Recuerda al modelo que responda como un humano, evite las tablas de Markdown, minimice las líneas vacías y siga el espaciado de chat normal, y evite escribir secuencias literales de `\n`. Los nombres de grupo y las etiquetas de los participantes originados del canal se representan como metadatos no confinados y cercados, no como instrucciones del sistema en línea.

## Especificaciones de iMessage

- Preferir `chat_id:<id>` al enrutar o crear listas de permitidos.
- Listar chats: `imsg chats --limit 20`.
- Las respuestas del grupo siempre vuelven al mismo `chat_id`.

## Prompts del sistema de WhatsApp

Consulte [WhatsApp](/es/channels/whatsapp#system-prompts) para conocer las reglas canónicas del sistema de indicaciones de WhatsApp, incluidas la resolución de indicaciones de grupos y directos, el comportamiento de los comodines y la semántica de anulación de cuentas.

## Especificidades de WhatsApp

Consulte [Mensajes de grupo](/es/channels/group-messages) para conocer el comportamiento exclusivo de WhatsApp (inyección del historial, detalles del manejo de menciones).

## Relacionado

- [Grupos de difusión](/es/channels/broadcast-groups)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Mensajes de grupo](/es/channels/group-messages)
- [Emparejamiento](/es/channels/pairing)

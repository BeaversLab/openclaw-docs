---
summary: "Permitir que las salas de grupo compatibles proporcionen contexto silencioso a menos que el agente envíe con la herramienta de mensaje"
read_when:
  - Configuring always-on group or channel rooms
  - You want the agent to watch room chatter without posting final text automatically
  - Debugging typing and token usage with no visible room message
title: "Eventos de sala ambiental"
sidebarTitle: "Eventos de sala ambiental"
---

Los eventos de sala ambiental permiten que OpenClaw procese las conversaciones no mencionadas de grupos o canales como contexto silencioso. El agente puede actualizar la memoria y el estado de la sesión, pero la sala permanece en silencio a menos que el agente llame explícitamente a la herramienta `message`.

Para chats de grupo siempre activos, este es el modo recomendado: combine `messages.groupChat.unmentionedInbound: "room_event"` con `messages.groupChat.visibleReplies: "message_tool"`. Úselo cuando el agente debe escuchar, decidir cuándo es útil una respuesta y evitar el antiguo patrón de prompt de responder `NO_REPLY`.

Compatible hoy: canales de gremios de Discord, canales y canales privados de Slack, mensajes directos multipersonales de Slack y grupos o supergrupos de Telegram. Otros canales de grupo mantienen su comportamiento de grupo existente a menos que su página de canal indique que admiten eventos de sala ambiental.

## Configuración recomendada

Establezca el comportamiento global del chat de grupo:

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
}
```

Luego configure la sala本身 como siempre activa deshabilitando el filtrado de menciones para esa sala. El canal aún debe estar permitido por su `groupPolicy` normal, lista de permitidos de salas y lista de permitidos de remitentes.

Después de guardar la configuración, el Gateway recarga en caliente la configuración `messages`. Reinicie solo cuando la observación de archivos o la recarga de configuración estén deshabilitadas.

## Qué cambia

Con `messages.groupChat.unmentionedInbound: "room_event"`:

- los mensajes permitidos de grupo o canal no mencionados se convierten en eventos de sala silenciosos
- los mensajes mencionados siguen siendo solicitudes de usuario
- los comandos de texto y los comandos nativos siguen siendo solicitudes de usuario
- las solicitudes de abortar o detener siguen siendo solicitudes de usuario
- los mensajes directos siguen siendo solicitudes de usuario

Los eventos de sala utilizan entrega estricta visible. El texto final del asistente es privado. El agente debe llamar a `message(action=send)` para publicar en la sala.

## Ejemplo de Discord

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "<DISCORD_SERVER_ID>": {
          requireMention: false,
          users: ["<YOUR_DISCORD_USER_ID>"],
        },
      },
    },
  },
}
```

Use la configuración de Discord por canal cuando solo un canal deba ser ambiental:

```json5
{
  channels: {
    discord: {
      guilds: {
        "<DISCORD_SERVER_ID>": {
          channels: {
            "<DISCORD_CHANNEL_ID_OR_NAME>": {
              allow: true,
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

## Ejemplo de Slack

Las listas de permitidos de canales de Slack son prioritarias por ID. Use ID de canal como `C12345678`, no `#channel-name`.

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    slack: {
      groupPolicy: "allowlist",
      channels: {
        "<SLACK_CHANNEL_ID>": {
          allow: true,
          requireMention: false,
        },
      },
    },
  },
}
```

## Ejemplo de Telegram

Para los grupos de Telegram, el bot debe poder ver los mensajes normales del grupo. Si `requireMention: false`, desactiva el modo de privacidad de BotFather o utiliza otra configuración de Telegram que entregue todo el tráfico del grupo al bot.

```json5
{
  messages: {
    groupChat: {
      unmentionedInbound: "room_event",
      visibleReplies: "message_tool",
      historyLimit: 50,
    },
  },
  channels: {
    telegram: {
      groups: {
        "<TELEGRAM_GROUP_CHAT_ID>": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

Los ID de grupo de Telegram suelen ser números negativos como `-1001234567890`. Lee `chat.id` de `openclaw logs --follow`, reenvía un mensaje del grupo a un bot auxiliar de ID, o inspecciona la `getUpdates` de la Bot API.

## Política específica del agente

Utiliza un override del agente cuando varios agentes compartan la misma sala pero solo uno deba tratar el chat sin mención como contexto ambiente:

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "message_tool",
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          unmentionedInbound: "room_event",
          mentionPatterns: ["@openclaw", "openclaw"],
        },
      },
    ],
  },
}
```

El valor `agents.list[].groupChat.unmentionedInbound` específico del agente anula `messages.groupChat.unmentionedInbound` para ese agente.

## Modos de respuesta visibles

`messages.groupChat.visibleReplies: "message_tool"` es el valor predeterminado recomendado para grupos y canales. Permite que el agente decida cuándo hablar llamando a la herramienta de mensaje. Si el modelo devuelve texto final sin llamar a la herramienta, OpenClaw mantiene ese texto final como privado y registra los metadatos de entrega suprimida.

Usa `messages.groupChat.visibleReplies: "automatic"` solo cuando desees el comportamiento heredado donde las solicitudes de grupo normales publican el texto final del asistente automáticamente.

Los eventos de sala se mantienen estrictos incluso cuando otras solicitudes de grupo usan respuestas automáticas. Los eventos de sala ambiente sin mención todavía requieren `message(action=send)` para una salida visible.

## Historial

`messages.groupChat.historyLimit` controla el valor predeterminado global del historial de grupos. Los canales pueden anularlo con `channels.<channel>.historyLimit`, y algunos canales también admiten límites de historial por cuenta.

Establece `historyLimit: 0` en para desactivar el contexto del historial de grupos.

Los canales compatibles con eventos de sala mantienen los mensajes de sala ambiente recientes como contexto. Discord mantiene el historial de eventos de sala hasta que tenga éxito un envío visible de Discord, por lo que el contexto silencioso no se pierde antes de la entrega de la herramienta de mensaje.

## Solución de problemas

Si la sala muestra actividad de escritura o uso de tokens pero ningún mensaje visible:

1. Confirma que la sala está permitida por la lista de permitidos de canales y la lista de permitidos de remitentes.
2. Confirma que `requireMention: false` está establecido en el nivel de sala que esperas.
3. Verifica si `messages.groupChat.unmentionedInbound` o el override del agente es `"room_event"`.
4. Inspecciona los registros en busca de metadatos de carga final suprimida o `didSendViaMessagingTool: false`.
5. Utilice un modelo/runtime que llame a las herramientas de forma fiable, o configure `messages.groupChat.visibleReplies: "automatic"` para respuestas finales heredadas en solicitudes de grupo normales.

Si las salas ambientales de Telegram no se activan en absoluto, verifique el modo de privacidad de BotFather y asegúrese de que el Gateway esté recibiendo mensajes de grupo normales.

Si las salas ambientales de Slack no se activan, verifique que la clave del canal sea el ID del canal de Slack y que la aplicación tenga el alcance `channels:history` o `groups:history` requerido para ese tipo de sala.

## Relacionado

- [Grupos](/es/channels/groups)
- [Discord](/es/channels/discord)
- [Slack](/es/channels/slack)
- [Telegram](/es/channels/telegram)
- [Solución de problemas de canales](/es/channels/troubleshooting)
- [Referencia de configuración de canales](/es/gateway/config-channels)

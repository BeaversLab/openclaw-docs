---
summary: "Configuración del canal de token de bot de ClickClack y sintaxis de objetivos"
read_when:
  - Connecting OpenClaw to a ClickClack workspace
  - Testing ClickClack bot identities
title: "ClickClack"
---

ClickClack conecta OpenClaw a un espacio de trabajo de ClickClack autohospedado mediante tokens de bot de ClickClack de primera clase.

Use esto cuando desee que un agente de OpenClack aparezca como un usuario bot de ClickClack. ClickClack es compatible con bots de servicio independientes y bots propiedad del usuario; los bots propiedad del usuario conservan un `owner_user_id` y solo reciben los alcances del token que usted otorga.

## Configuración rápida

Cree un token de bot en ClickClack:

```bash
clickclack admin bot create \
  --workspace <workspace_id_or_slug> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

Para un bot propiedad del usuario, agregue `--owner <user_id>`.

Configure OpenClaw:

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
      agentId: "clickclack-bot",
      replyMode: "model",
    },
  },
}
```

Luego ejecute:

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

## Múltiples bots

Cada cuenta abre su propia conexión en tiempo real de ClickClack y utiliza su propio token de bot.

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
          replyMode: "model",
        },
        peter: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_PETER_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "peter-bot",
          replyMode: "model",
        },
      },
    },
  },
}
```

`replyMode: "model"` usa `api.runtime.llm.complete` directamente para respuestas breves del bot.
Cuando una cuenta establece `agentId`, OpenClaw requiere el bit de confianza explícito
`plugins.entries.clickclack.llm.allowAgentIdOverride` para que el complemento
pueda ejecutar completados para ese agente bot. Déjelo desactivado si solo usa la ruta de agente predeterminada.

## Objetivos

- `channel:<name-or-id>` envía a un canal del espacio de trabajo. Los objetivos simples predeterminan a `channel:`.
- `dm:<user_id>` crea o reutiliza una conversación directa con ese usuario.
- `thread:<message_id>` responde en un hilo existente.

Ejemplos:

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## Permisos

Los alcances del token de ClickClack son aplicados por la API de ClickClack.

- `bot:read`: leer datos de espacio de trabajo/canal/mensaje/hilo/DM/tiempo real/perfil.
- `bot:write`: `bot:read` más mensajes de canal, respuestas de hilo, MD y cargas.
- `bot:admin`: `bot:write` más creación de canales.

OpenClaw solo necesita `bot:write` para el chat del agente normal.

## Solución de problemas

- `ClickClack is not configured`: configure `channels.clickclack.token` o `CLICKCLACK_BOT_TOKEN`.
- `workspace not found`: configure `workspace` en el identificador o slug del espacio de trabajo devuelto por ClickClack.
- Sin respuestas entrantes: confirme que el token tenga acceso de lectura en tiempo real y que el bot no esté respondiendo a sus propios mensajes.
- Fallo en el envío de canales: verifique que el bot sea miembro del espacio de trabajo y tenga `bot:write`.

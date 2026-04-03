---
summary: "Enrutamiento multiagente: agentes aislados, cuentas de canal y enlaces"
title: Enrutamiento multiagente
read_when: "Desea múltiples agentes aislados (espacios de trabajo + autenticación) en un solo proceso de puerta de enlace."
status: activo
---

# Enrutamiento multiagente

Objetivo: múltiples agentes _aislados_ (espacio de trabajo separado + `agentDir` + sesiones), además de múltiples cuentas de canal (por ejemplo, dos WhatsApps) en una sola puerta de enlace (Gateway) en ejecución. Las entradas se enrutan a un agente a través de enlaces.

## ¿Qué es "un agente"?

Un **agente** es un cerebro con un alcance completo con su propio:

- **Espacio de trabajo** (archivos, AGENTS.md/SOUL.md/USER.md, notas locales, reglas de personalidad).
- **Directorio de estado** (`agentDir`) para perfiles de autenticación, registro de modelos y configuración por agente.
- **Almacén de sesiones** (historial de chat + estado de enrutamiento) bajo `~/.openclaw/agents/<agentId>/sessions`.

Los perfiles de autenticación son **por agente**. Cada agente lee desde su propio:

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Las credenciales del agente principal **no** se comparten automáticamente. Nunca reutilice `agentDir`
en varios agentes (causa colisiones de autenticación/sesión). Si desea compartir credenciales,
copie `auth-profiles.json` en el `agentDir` del otro agente.

Las habilidades son por agente a través de la carpeta `skills/` de cada espacio de trabajo, con habilidades compartidas
disponibles desde `~/.openclaw/skills`. Consulte [Habilidades: por agente vs. compartidas](/en/tools/skills#per-agent-vs-shared-skills).

La Gateway puede alojar **un agente** (predeterminado) o **muchos agentes** simultáneamente.

**Nota sobre el espacio de trabajo:** el espacio de trabajo de cada agente es el **cwd predeterminado**, no un
sandbox estricto. Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden
alcanzar otras ubicaciones del host a menos que se habilite el sandboxing. Consulte
[Sandboxing](/en/gateway/sandboxing).

## Rutas (mapa rápido)

- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado: `~/.openclaw` (o `OPENCLAW_STATE_DIR`)
- Espacio de trabajo: `~/.openclaw/workspace` (o `~/.openclaw/workspace-<agentId>`)
- Directorio del agente: `~/.openclaw/agents/<agentId>/agent` (o `agents.list[].agentDir`)
- Sesiones: `~/.openclaw/agents/<agentId>/sessions`

### Modo de agente único (predeterminado)

Si no hace nada, OpenClaw ejecuta un solo agente:

- `agentId` toma como valor predeterminado **`main`**.
- Las sesiones se clavean como `agent:main:<mainKey>`.
- El espacio de trabajo toma como valor predeterminado `~/.openclaw/workspace` (o `~/.openclaw/workspace-<profile>` cuando se establece `OPENCLAW_PROFILE`).
- El estado toma como valor predeterminado `~/.openclaw/agents/main/agent`.

## Asistente de agente

Use el asistente para agregar un nuevo agente aislado:

```bash
openclaw agents add work
```

A continuación, añada `bindings` (o deje que el asistente lo haga) para enrutar los mensajes entrantes.

Verifique con:

```bash
openclaw agents list --bindings
```

## Inicio rápido

<Steps>
  <Step title="Crear cada espacio de trabajo del agente">

Use el asistente o cree los espacios de trabajo manualmente:

```bash
openclaw agents add coding
openclaw agents add social
```

Cada agente obtiene su propio espacio de trabajo con `SOUL.md`, `AGENTS.md` y `USER.md` opcional, además de un `agentDir` dedicado y un almacén de sesiones bajo `~/.openclaw/agents/<agentId>`.

  </Step>

  <Step title="Crear cuentas de canal">

Cree una cuenta por agente en sus canales preferidos:

- Discord: un bot por agente, habilite Message Content Intent, copie cada token.
- Telegram: un bot por agente a través de BotFather, copie cada token.
- WhatsApp: vincule cada número de teléfono por cuenta.

```bash
openclaw channels login --channel whatsapp --account work
```

Consulte las guías de canales: [Discord](/en/channels/discord), [Telegram](/en/channels/telegram), [WhatsApp](/en/channels/whatsapp).

  </Step>

  <Step title="Añadir agentes, cuentas y enlaces">

Añada agentes bajo `agents.list`, cuentas de canal bajo `channels.<channel>.accounts` y conéctelos con `bindings` (ejemplos a continuación).

  </Step>

  <Step title="Reiniciar y verificar">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## Múltiples agentes = múltiples personas, múltiples personalidades

Con **múltiples agentes**, cada `agentId` se convierte en una **personalidad totalmente aislada**:

- **Diferentes números de teléfono/cuentas** (por `accountId` de canal).
- **Diferentes personalidades** (archivos del espacio de trabajo por agente como `AGENTS.md` y `SOUL.md`).
- **Autenticación y sesiones separadas** (sin interferencias a menos que se habilite explícitamente).

Esto permite que **múltiples personas** compartan un servidor Gateway mientras mantienen sus "cerebros" de IA y datos aislados.

## Búsqueda de memoria QMD entre agentes

Si un agente debe buscar las transcripciones de sesión QMD de otro agente, añada
colecciones adicionales bajo `agents.list[].memorySearch.qmd.extraCollections`.
Use `agents.defaults.memorySearch.qmd.extraCollections` solo cuando cada agente
deba heredar las mismas colecciones de transcripciones compartidas.

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // resolves inside workspace -> collection named "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

La ruta de colección adicional puede compartirse entre agentes, pero el nombre de la colección
se mantiene explícito cuando la ruta está fuera del espacio de trabajo del agente. Las rutas dentro del
espacio de trabajo permanecen en el ámbito del agente, por lo que cada agente mantiene su propio conjunto de búsqueda de transcripciones.

## Un número de WhatsApp, múltiples personas (división de MD)

Puede enrutar **diferentes MD de WhatsApp** a diferentes agentes mientras permanece en **una cuenta de WhatsApp**. Haga coincidir con el E.164 del remitente (como `+15551234567`) con `peer.kind: "direct"`. Las respuestas aún provienen del mismo número de WhatsApp (sin identidad de remitente por agente).

Detalle importante: los chats directos se colapsan en la **clave de sesión principal** del agente, por lo que el aislamiento verdadero requiere **un agente por persona**.

Ejemplo:

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

Notas:

- El control de acceso de MD es **global por cuenta de WhatsApp** (emparejamiento/lista blanca), no por agente.
- Para grupos compartidos, vincule el grupo a un agente o use [Grupos de transmisión](/en/channels/broadcast-groups).

## Reglas de enrutamiento (cómo eligen los agentes los mensajes)

Las vinculaciones son **deterministas** y **gana la más específica**:

1. coincidencia `peer` (id exacto de MD/grupo/canal)
2. coincidencia `parentPeer` (herencia de hilos)
3. `guildId + roles` (enrutamiento por roles de Discord)
4. `guildId` (Discord)
5. `teamId` (Slack)
6. coincidencia `accountId` para un canal
7. coincidencia a nivel de canal (`accountId: "*"`)
8. retroceso al agente predeterminado (`agents.list[].default`, si no, la primera entrada de la lista, predeterminado: `main`)

Si varias vinculaciones coinciden en el mismo nivel, gana la primera en el orden de configuración.
Si una vinculación establece varios campos de coincidencia (por ejemplo `peer` + `guildId`), se requieren todos los campos especificados (semántica `AND`).

Detalle importante del alcance de la cuenta:

- Una vincación que omite `accountId` coincide solo con la cuenta predeterminada.
- Use `accountId: "*"` para un retroceso en todo el canal en todas las cuentas.
- Si luego agrega la misma vinculación para el mismo agente con un ID de cuenta explícito, OpenClaw actualiza la vinculación existente solo de canal a ámbito de cuenta en lugar de duplicarla.

## Múltiples cuentas / números de teléfono

Los canales que soportan **múltiples cuentas** (por ejemplo, WhatsApp) usan `accountId` para identificar
cada inicio de sesión. Cada `accountId` puede ser enrutado a un agente diferente, por lo que un servidor puede alojar
múltiples números de teléfono sin mezclar las sesiones.

Si deseas una cuenta predeterminada para todo el canal cuando se omite `accountId`, establece
`channels.<channel>.defaultAccount` (opcional). Cuando no está configurado, OpenClaw recurre a
`default` si está presente, de lo contrario a la primera id de cuenta configurada (ordenada).

Los canales comunes que soportan este patrón incluyen:

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## Conceptos

- `agentId`: un “cerebro” (espacio de trabajo, autenticación por agente, almacén de sesiones por agente).
- `accountId`: una instancia de cuenta de canal (por ejemplo, cuenta de WhatsApp `"personal"` vs `"biz"`).
- `binding`: enruta los mensajes entrantes a un `agentId` por `(channel, accountId, peer)` y opcionalmente ids de gremio/equipo.
- Los chats directos colapsan a `agent:<agentId>:<mainKey>` (“principal” por agente; `session.mainKey`).

## Ejemplos de plataformas

### Bots de Discord por agente

Cada cuenta de bot de Discord se asigna a un `accountId` único. Vincula cada cuenta a un agente y mantiene listas de permitidos por bot.

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
  ],
  channels: {
    discord: {
      groupPolicy: "allowlist",
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: {
            "123456789012345678": {
              channels: {
                "333333333333333333": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

Notas:

- Invita cada bot al gremio y habilita el Intent de contenido de mensajes.
- Los tokens residen en `channels.discord.accounts.<id>.token` (la cuenta predeterminada puede usar `DISCORD_BOT_TOKEN`).

### Bots de Telegram por agente

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "telegram", accountId: "default" } },
    { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
  ],
  channels: {
    telegram: {
      accounts: {
        default: {
          botToken: "123456:ABC...",
          dmPolicy: "pairing",
        },
        alerts: {
          botToken: "987654:XYZ...",
          dmPolicy: "allowlist",
          allowFrom: ["tg:123456789"],
        },
      },
    },
  },
}
```

Notas:

- Crea un bot por agente con BotFather y copia cada token.
- Los tokens viven en `channels.telegram.accounts.<id>.botToken` (la cuenta predeterminada puede usar `TELEGRAM_BOT_TOKEN`).

### Números de WhatsApp por agente

Vincule cada cuenta antes de iniciar la puerta de enlace:

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json` (JSON5):

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // Deterministic routing: first match wins (most-specific first).
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // Optional per-peer override (example: send a specific group to work agent).
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // Off by default: agent-to-agent messaging must be explicitly enabled + allowlisted.
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // Optional override. Default: ~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## Ejemplo: chat diario de WhatsApp + trabajo profundo de Telegram

Dividir por canal: enrutar WhatsApp a un agente rápido diario y Telegram a un agente Opus.

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

Notas:

- Si tiene varias cuentas para un canal, añada `accountId` al enlace (por ejemplo `{ channel: "whatsapp", accountId: "personal" }`).
- Para enrutar un solo DM/grupo a Opus mientras se mantiene el resto en el chat, añada un enlace `match.peer` para ese par; las coincidencias de pares siempre ganan sobre las reglas de todo el canal.

## Ejemplo: mismo canal, un par a Opus

Mantenga WhatsApp en el agente rápido, pero enrute un DM a Opus:

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    {
      agentId: "opus",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
    },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

Los enlaces de pares siempre ganan, así que manténgalos encima de la regla de todo el canal.

## Agente familiar vinculado a un grupo de WhatsApp

Vincule un agente familiar dedicado a un solo grupo de WhatsApp, con filtrado de menciones
y una política de herramientas más estricta:

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"],
        },
        sandbox: {
          mode: "all",
          scope: "agent",
        },
        tools: {
          allow: ["exec", "read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
        },
      },
    ],
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" },
      },
    },
  ],
}
```

Notas:

- Las listas de permitir/denegar herramientas son **herramientas**, no habilidades. Si una habilidad necesita ejecutar un
  binario, asegúrese de que `exec` esté permitido y de que el binario exista en el sandbox.
- Para un filtrado más estricto, configure `agents.list[].groupChat.mentionPatterns` y mantenga
  las listas de permitidos de grupo habilitadas para el canal.

## Sandbox y configuración de herramientas por agente

Cada agente puede tener su propio sandbox y restricciones de herramientas:

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // No sandbox for personal agent
        },
        // No tool restrictions - all tools available
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // Always sandboxed
          scope: "agent",  // One container per agent
          docker: {
            // Optional one-time setup after container creation
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // Only read tool
          deny: ["exec", "write", "edit", "apply_patch"],    // Deny others
        },
      },
    ],
  },
}
```

Nota: `setupCommand` vive bajo `sandbox.docker` y se ejecuta una vez al crear el contenedor.
Las anulaciones de `sandbox.docker.*` por agente se ignoran cuando el alcance resuelto es `"shared"`.

**Beneficios:**

- **Aislamiento de seguridad**: Restringir herramientas para agentes no confiables
- **Control de recursos**: Sandbox para agentes específicos mientras se mantienen otros en el host
- **Políticas flexibles**: Diferentes permisos por agente

Nota: `tools.elevated` es **global** y se basa en el remitente; no es configurable por agente.
Si necesita límites por agente, use `agents.list[].tools` para denegar `exec`.
Para la orientación de grupos, use `agents.list[].groupChat.mentionPatterns` para que las @menciones se asignen correctamente al agente deseado.

Consulte [Multi-Agent Sandbox & Tools](/en/tools/multi-agent-sandbox-tools) para ver ejemplos detallados.

## Relacionado

- [Channel Routing](/en/channels/channel-routing) — cómo se enrutan los mensajes a los agentes
- [Sub-Agents](/en/tools/subagents) — generar ejecuciones de agentes en segundo plano
- [ACP Agents](/en/tools/acp-agents) — ejecutar arneses de codificación externos
- [Presence](/en/concepts/presence) — presencia y disponibilidad del agente
- [Session](/en/concepts/session) — aislamiento y enrutamiento de sesiones

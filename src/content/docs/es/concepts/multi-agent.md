---
summary: "Enrutamiento multiagente: agentes aislados, cuentas de canal y enlaces"
title: "Enrutamiento multiagente"
sidebarTitle: "Enrutamiento multiagente"
read_when: "Deseas múltiples agentes aislados (espacios de trabajo + autenticación) en un solo proceso de puerta de enlace."
status: activo
---

Ejecuta múltiples agentes _aislados_ — cada uno con su propio espacio de trabajo, directorio de estado (`agentDir`) e historial de sesión — además de múltiples cuentas de canal (ej. dos WhatsApps) en una sola Gateway en ejecución. Los mensajes entrantes se enrutan al agente correcto a través de enlaces.

Un **agente** aquí es el alcance completo por personalidad: archivos del espacio de trabajo, perfiles de autenticación, registro de modelos y almacén de sesiones. `agentDir` es el directorio de estado en disco que mantiene esta configuración por agente en `~/.openclaw/agents/<agentId>/`. Un **enlace** asigna una cuenta de canal (ej. un espacio de trabajo de Slack o un número de WhatsApp) a uno de esos agentes.

## ¿Qué es "un agente"?

Un **agente** es un cerebro con alcance completo con su propio:

- **Espacio de trabajo** (archivos, AGENTS.md/SOUL.md/USER.md, notas locales, reglas de personalidad).
- **Directorio de estado** (`agentDir`) para perfiles de autenticación, registro de modelos y configuración por agente.
- **Almacén de sesiones** (historial de chat + estado de enrutamiento) bajo `~/.openclaw/agents/<agentId>/sessions`.

Los perfiles de autenticación son **por agente**. Cada agente lee de su propio:

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

<Note>
`sessions_history` es también la ruta de recuperación entre sesiones más segura aquí: devuelve una vista limitada y saneada, no un volcado de transcripción sin procesar. La recuperación del asistente elimina etiquetas de pensamiento, andamiaje `<relevant-memories>`, cargas XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), andamiaje de llamadas a herramientas degradados, tokens de control de modelo ASCII/ ancho filtrados y XML de llamadas a herramientas de MiniMax malformados antes de la redacción/truncamiento.
</Note>

<Warning>Las credenciales del agente principal **no** se comparten automáticamente. Nunca reutilices `agentDir` entre agentes (causa colisiones de autenticación/sesión). Si deseas compartir credenciales, copia `auth-profiles.json` en el `agentDir` del otro agente.</Warning>

Las habilidades se cargan desde el espacio de trabajo de cada agente más las raíces compartidas como `~/.openclaw/skills`, y luego se filtran por la lista de permisos de habilidades del agente efectivo cuando está configurado. Usa `agents.defaults.skills` para una base compartida y `agents.list[].skills` para el reemplazo por agente. Consulta [Habilidades: por agente vs compartidas](/es/tools/skills#per-agent-vs-shared-skills) y [Habilidades: listas de permisos de habilidades del agente](/es/tools/skills#agent-skill-allowlists).

El Gateway puede alojar **un agente** (predeterminado) o **muchos agentes** simultáneamente.

<Note>**Nota del espacio de trabajo:** el espacio de trabajo de cada agente es el **cwd predeterminado**, no un sandbox estricto. Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden alcanzar otras ubicaciones del host a menos que se habilite el sandbox. Consulta [Sandboxing](/es/gateway/sandboxing).</Note>

## Rutas (mapa rápido)

- Configuración: `~/.openclaw/openclaw.json` (o `OPENCLAW_CONFIG_PATH`)
- Directorio de estado: `~/.openclaw` (o `OPENCLAW_STATE_DIR`)
- Espacio de trabajo: `~/.openclaw/workspace` (o `~/.openclaw/workspace-<agentId>`)
- Directorio del agente: `~/.openclaw/agents/<agentId>/agent` (o `agents.list[].agentDir`)
- Sesiones: `~/.openclaw/agents/<agentId>/sessions`

### Modo de agente único (predeterminado)

Si no haces nada, OpenClaw ejecuta un solo agente:

- `agentId` por defecto es **`main`**.
- Las sesiones se clavean como `agent:main:<mainKey>`.
- El espacio de trabajo por defecto es `~/.openclaw/workspace` (o `~/.openclaw/workspace-<profile>` cuando se establece `OPENCLAW_PROFILE`).
- El estado por defecto es `~/.openclaw/agents/main/agent`.

## Asistente de agente

Usa el asistente de agente para agregar un nuevo agente aislado:

```bash
openclaw agents add work
```

Luego agrega `bindings` (o deja que el asistente lo haga) para enrutar los mensajes entrantes.

Verifica con:

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

    Cada agente obtiene su propio espacio de trabajo con `SOUL.md`, `AGENTS.md` y `USER.md` opcionales, además de un `agentDir` dedicado y un almacén de sesiones bajo `~/.openclaw/agents/<agentId>`.

  </Step>
  <Step title="Crear cuentas de canal">
    Cree una cuenta por agente en sus canales preferidos:

    - Discord: un bot por agente, habilite el Intento de Contenido de Mensajes, copie cada token.
    - Telegram: un bot por agente a través de BotFather, copie cada token.
    - WhatsApp: vincule cada número de teléfono por cuenta.

    ```bash
    openclaw channels login --channel whatsapp --account work
    ```

    Consulte las guías de canales: [Discord](/es/channels/discord), [Telegram](/es/channels/telegram), [WhatsApp](/es/channels/whatsapp).

  </Step>
  <Step title="Añadir agentes, cuentas y enlaces">
    Añada agentes en `agents.list`, cuentas de canal en `channels.<channel>.accounts` y conéctelos con `bindings` (ejemplos a continuación).
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
- **Diferentes personalidades** (archivos de espacio de trabajo por agente como `AGENTS.md` y `SOUL.md`).
- **Autenticación y sesiones separadas** (sin interferencias a menos que se habiliten explícitamente).

Esto permite que **múltiples personas** compartan un servidor Gateway mientras mantienen sus "cerebros" de IA y datos aislados.

## Búsqueda de memoria QMD entre agentes

Si un agente debe buscar las transcripciones de sesión QMD de otro agente, añada colecciones adicionales bajo `agents.list[].memorySearch.qmd.extraCollections`. Use `agents.defaults.memorySearch.qmd.extraCollections` solo cuando cada agente deba heredar las mismas colecciones de transcripciones compartidas.

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

La ruta de colección adicional se puede compartir entre agentes, pero el nombre de la colección se mantiene explícito cuando la ruta está fuera del espacio de trabajo del agente. Las rutas dentro del espacio de trabajo permanecen con ámbito de agente para que cada agente mantenga su propio conjunto de búsqueda de transcripciones.

## Un número de WhatsApp, múltiples personas (división de MD)

Puede enrutar **diferentes MD de WhatsApp** a diferentes agentes mientras permanece en **una cuenta de WhatsApp**. Coincida con el E.164 del remitente (como `+15551234567`) con `peer.kind: "direct"`. Las respuestas aún provienen del mismo número de WhatsApp (sin identidad de remitente por agente).

<Note>Los chats directos se colapsan en la **clave de sesión principal** del agente, por lo que el aislamiento verdadero requiere **un agente por persona**.</Note>

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

- El control de acceso de MD es **global por cuenta de WhatsApp** (vinculación/lista de permitidos), no por agente.
- Para grupos compartidos, vincule el grupo a un agente o use [Grupos de difusión](/es/channels/broadcast-groups).

## Reglas de enrutamiento (cómo los mensajes eligen un agente)

Las vinculaciones son **deterministas** y **gana la más específica**:

<Steps>
  <Step title="peer match">Id. de MD/grupo/canal exacto.</Step>
  <Step title="parentPeer match">Herencia de hilos.</Step>
  <Step title="guildId + roles">Enrutamiento por roles de Discord.</Step>
  <Step title="guildId">Discord.</Step>
  <Step title="teamId">Slack.</Step>
  <Step title="accountId match for a channel">Reserva por cuenta.</Step>
  <Step title="Channel-level match">`accountId: "*"`.</Step>
  <Step title="Default agent">Reserva a `agents.list[].default`, si no, la primera entrada de la lista, por defecto: `main`.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Tie-breaking and AND semantics">- Si varias vinculaciones coinciden en el mismo nivel, gana la primera en el orden de configuración. - Si una vinculación establece varios campos de coincidencia (por ejemplo `peer` + `guildId`), se requieren todos los campos especificados (semántica `AND`).</Accordion>
  <Accordion title="Account-scope detail">
    - Una vinculación que omite `accountId` coincide solo con la cuenta predeterminada. - Use `accountId: "*"` para una alternativa de todo el canal en todas las cuentas. - Si más tarde añade la misma vinculación para el mismo agente con una identificación de cuenta explícita, OpenClaw actualiza la vinculación existente de solo canal a ámbito de cuenta en lugar de duplicarla.
  </Accordion>
</AccordionGroup>

## Múltiples cuentas / números de teléfono

Los canales que soportan **múltiples cuentas** (por ejemplo, WhatsApp) usan `accountId` para identificar cada inicio de sesión. Cada `accountId` puede ser enrutado a un agente diferente, por lo que un servidor puede alojar múltiples números de teléfono sin mezclar sesiones.

Si desea una cuenta predeterminada para todo el canal cuando se omite `accountId`, establezca `channels.<channel>.defaultAccount` (opcional). Cuando no está configurado, OpenClaw recurre a `default` si está presente; de lo contrario, a la primera identificación de cuenta configurada (ordenada).

Los canales comunes que soportan este patrón incluyen:

- `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`
- `irc`, `line`, `googlechat`, `mattermost`, `matrix`, `nextcloud-talk`
- `bluebubbles`, `zalo`, `zalouser`, `nostr`, `feishu`

## Conceptos

- `agentId`: un "cerebro" (espacio de trabajo, autenticación por agente, almacenamiento de sesiones por agente).
- `accountId`: una instancia de cuenta de canal (por ejemplo, cuenta de WhatsApp `"personal"` vs `"biz"`).
- `binding`: enruta los mensajes entrantes a un `agentId` por `(channel, accountId, peer)` y opcionalmente por ids de gremio/equipo.
- Los chats directos colapsan a `agent:<agentId>:<mainKey>` ("principal" por agente; `session.mainKey`).

## Ejemplos de plataformas

<AccordionGroup>
  <Accordion title="Bots de Discord por agente">
    Cada cuenta de bot de Discord se asigna a un `accountId` único. Vincule cada cuenta a un agente y mantenga listas de permitidos por bot.

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

    - Invite cada bot al gremio y habilite el Intento de contenido de mensajes.
    - Los tokens viven en `channels.discord.accounts.<id>.token` (la cuenta predeterminada puede usar `DISCORD_BOT_TOKEN`).

  </Accordion>
  <Accordion title="Bots de Telegram por agente">
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

    - Cree un bot por agente con BotFather y copie cada token.
    - Los tokens viven en `channels.telegram.accounts.<id>.botToken` (la cuenta predeterminada puede usar `TELEGRAM_BOT_TOKEN`).

  </Accordion>
  <Accordion title="Números de WhatsApp por agente">
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

  </Accordion>
</AccordionGroup>

## Patrones comunes

<Tabs>
  <Tab title="WhatsApp diario + Telegram trabajo profundo">
    Dividir por canal: enrutar WhatsApp a un agente rápido de todos los días y Telegram a un agente Opus.

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

    - Si tiene varias cuentas para un canal, agregue `accountId` al enlace (por ejemplo `{ channel: "whatsapp", accountId: "personal" }`).
    - Para enrutar un solo MD/grupo a Opus manteniendo el resto en el chat, agregue un enlace `match.peer` para ese par; las coincidencias de pares siempre ganan sobre las reglas de todo el canal.

  </Tab>
  <Tab title="Mismo canal, un par a Opus">
    Mantén WhatsApp en el agente rápido, pero enruta un MD a Opus:

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

    Las vinculaciones de pares (peer) siempre ganan, así que manténelas por encima de la regla de todo el canal.

  </Tab>
  <Tab title="Agente familiar vinculado a un grupo de WhatsApp">
    Vincula un agente familiar dedicado a un solo grupo de WhatsApp, con filtrado de menciones y una política de herramientas más estricta:

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
              allow: [
                "exec",
                "read",
                "sessions_list",
                "sessions_history",
                "sessions_send",
                "sessions_spawn",
                "session_status",
              ],
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

    - Las listas de permitidos/denegados de herramientas son **herramientas**, no habilidades. Si una habilidad necesita ejecutar un binario, asegúrate de que `exec` esté permitido y de que el binario exista en el sandbox.
    - Para un filtrado más estricto, establece `agents.list[].groupChat.mentionPatterns` y mantén las listas de permitidos de grupos habilitadas para el canal.

  </Tab>
</Tabs>

## Configuración de sandbox y herramientas por agente

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

<Note>`setupCommand` vive bajo `sandbox.docker` y se ejecuta una vez al crear el contenedor. Las anulaciones de `sandbox.docker.*` por agente se ignoran cuando el ámbito resuelto es `"shared"`.</Note>

**Beneficios:**

- **Aislamiento de seguridad**: restringir herramientas para agentes no confiables.
- **Control de recursos**: sandbox para agentes específicos mientras se mantienen otros en el host.
- **Políticas flexibles**: diferentes permisos por agente.

<Note>`tools.elevated` es **global** y se basa en el remitente; no es configurable por agente. Si necesitas límites por agente, usa `agents.list[].tools` para denegar `exec`. Para la orientación por grupos, usa `agents.list[].groupChat.mentionPatterns` para que las @menciones se asignen claramente al agente deseado.</Note>

Consulta [Multi-agent sandbox and tools](/es/tools/multi-agent-sandbox-tools) para ver ejemplos detallados.

## Relacionado

- [ACP agents](/es/tools/acp-agents) — ejecución de arneses de codificación externos
- [Channel routing](/es/channels/channel-routing) — cómo se enrutan los mensajes a los agentes
- [Presence](/es/concepts/presence) — presencia y disponibilidad del agente
- [Session](/es/concepts/session) — aislamiento y enrutamiento de sesiones
- [Sub-agents](/es/tools/subagents) — generación de ejecuciones de agentes en segundo plano

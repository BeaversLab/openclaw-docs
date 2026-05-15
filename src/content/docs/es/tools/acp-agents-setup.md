---
summary: "Configuración de agentes ACP: configuración del arnés acpx, configuración del complemento, permisos"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "Agentes ACP — configuración"
---

Para obtener una descripción general, el manual del operador y los conceptos, consulte [Agentes ACP](/es/tools/acp-agents).

Las secciones a continuación cubren la configuración del arnés acpx, la configuración del complemento para los puentes MCP y la configuración de permisos.

Utilice esta página solo cuando esté configurando la ruta ACP/acpx. Para la configuración de tiempo de ejecución del servidor de aplicaciones nativo de Codex, use [Arnés de Codex](/es/plugins/codex-harness). Para
claves de API de OpenAI o configuración del proveedor de modelos OAuth de Codex, use
[OpenAI](/es/providers/openai).

Codex tiene dos rutas de OpenClaw:

| Ruta                                     | Configuración/comando                                  | Página de configuración                     |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Servidor de aplicaciones nativo de Codex | `/codex ...`, `openai/gpt-*` referencias de agente     | [Arnés de Codex](/es/plugins/codex-harness) |
| Adaptador ACP de Codex explícito         | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | Esta página                                 |

Prefiera la ruta nativa a menos que necesite explícitamente el comportamiento ACP/acpx.

## compatibilidad con el arnés acpx (actual)

Alias de arnés integrados actuales de acpx:

- `claude`
- `codex`
- `copilot`
- `cursor` (CLI de Cursor: `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

Cuando OpenClaw utiliza el backend acpx, prefiera estos valores para `agentId` a menos que su configuración de acpx defina alias de agente personalizados.
Si su instalación local de Cursor todavía expone ACP como `agent acp`, anule el comando de agente `cursor` en su configuración de acpx en lugar de cambiar el valor predeterminado integrado.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape cruda es una función de la CLI de acpx (no la ruta normal de `agentId` de OpenClaw).

El control del modelo depende de la capacidad del adaptador. Las referencias de modelo de ACP de Codex se
normalizan mediante OpenClaw antes del inicio. Otros arneses necesitan ACP `models` más
soporte `session/set_model`; si un arnés no expone esa capacidad de ACP
ni su propia marca de modelo de inicio, OpenClaw/acpx no puede forzar una selección de modelo.

## Configuración requerida

Línea base de ACP principal:

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

La configuración de vinculación de hilos es específica del adaptador del canal. Ejemplo para Discord:

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

Si la generación de ACP vinculada a hilos no funciona, verifique primero la bandera de características del adaptador:

- Discord: `channels.discord.threadBindings.spawnSessions=true`

Las vinculaciones de conversación actual no requieren la creación de hilos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga vinculaciones de conversación ACP.

Consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Las instalaciones empaquetadas utilizan el plugin de tiempo de ejecución oficial `@openclaw/acpx` para ACP.
Instálelo y actívelo antes de usar las sesiones del harness de ACP:

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Las checkouts del código fuente también pueden usar el plugin del espacio de trabajo local después de `pnpm install`.

Comience con:

```text
/acp doctor
```

Si deshabilitó `acpx`, lo denegó mediante `plugins.allow` / `plugins.deny`, o desea
volver al plugin empaquetado, use la ruta explícita del paquete:

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación local del espacio de trabajo durante el desarrollo:

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Luego verifique el estado del backend:

```text
/acp doctor
```

### configuración de comando y versión de acpx

Por defecto, el plugin `acpx` registra el backend ACP integrado sin
generar un agente ACP durante el inicio de Gateway. Ejecute `/acp doctor` para una prueba
explícita en vivo. Configure `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1` solo cuando necesite
que Gateway sondee el agente configurado al inicio.

Anule el comando o la versión en la configuración del plugin:

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command` acepta una ruta absoluta, ruta relativa (resuelta desde el espacio de trabajo de OpenClaw) o nombre de comando.
- `expectedVersion: "any"` deshabilita la coincidencia estricta de versiones.
- Las rutas personalizadas de `command` deshabilitan la autoinstalación local del plugin.

Anule un comando de agente ACP individual con argumentos estructurados cuando una ruta
o valor de bandera deba permanecer como un token argv:

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "agents": {
            "claude": {
              "command": "node",
              "args": ["/path/to/custom adapter.mjs", "--verbose"]
            }
          }
        }
      }
    }
  }
}
```

- `agents.<id>.command` es el ejecutable o la cadena de comando existente para ese agente ACP.
- `agents.<id>.args` es opcional. Cada elemento del array se entrecomilla en el shell antes de que OpenClaw lo pase a través del registro actual de cadenas de comandos acpx.

Consulte [Plugins](/es/tools/plugin).

### Instalación automática de dependencias

Cuando instala OpenClaw globalmente con `npm install -g openclaw`, las dependencias
de tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente
mediante un gancho de postinstalación. Si la instalación automática falla, la gateway aún se inicia
normalmente e informa la dependencia faltante a través de `openclaw acp doctor`.

### Puente MCP de herramientas de plugin

Por defecto, las sesiones ACPX **no** exponen las herramientas registradas por el plugin de OpenClaw al
harness de ACP.

Si deseas que agentes de ACP como Codex o Claude Code llamen a herramientas de
complementos de OpenClaw instaladas, como memory recall/store, habilita el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que hace esto:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en el arranque
  del ACPX.
- Expone las herramientas de complementos ya registradas por complementos de
  OpenClaw instalados y habilitados.
- Mantiene la función explícita y deshabilitada por defecto.

Notas de seguridad y confianza:

- Esto expande la superficie de herramientas del arnés ACP.
- Los agentes de ACP obtienen acceso solo a las herramientas de complementos ya
  activas en la pasarela.
- Trata esto con el mismo límite de confianza que permitir que esos complementos
  se ejecuten en OpenClaw mismo.
- Revisa los complementos instalados antes de habilitarlo.

Los `mcpServers` personalizados aún funcionan como antes. El puente de
plugin-tools integrado es una conveniencia opcional adicional, no un reemplazo
para la configuración genérica del servidor MCP.

### Puente MCP de herramientas de OpenClaw

De forma predeterminada, las sesiones de ACPX **no** exponen las herramientas
integradas de OpenClaw a través de MCP. Habilita el puente core-tools por
separado cuando un agente de ACP necesita herramientas integradas seleccionadas,
tales como `cron`:

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

Lo que hace esto:

- Inyecta un servidor MCP integrado llamado `openclaw-tools` en el arranque
  del ACPX.
- Expone herramientas integradas de OpenClaw seleccionadas. El servidor inicial
  expone `cron`.
- Mantiene la exposición de herramientas principales explícita y deshabilitada por
  defecto.

### Configuración del tiempo de espera de ejecución

El complemento `acpx` establece por defecto los tiempos de espera
de ejecución integrados en 120 segundos. Esto da tiempo suficiente a arneses más
lentos, como Gemini CLI, para completar el inicio y la inicialización de ACP.
Anúlalo si tu host necesita un límite de ejecución diferente:

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Reinicia la pasarela después de cambiar este valor.

### Configuración del agente de sondeo de estado

Cuando `/acp doctor` o el sondeo de inicio opcional comprueba el backend,
el complemento `acpx` incluido sondea un agente del arnés. Si se
establece `acp.allowedAgents`, el valor predeterminado es el primer agente
permitido; de lo contrario, el valor predeterminado es `codex`. Si tu
despliegue necesita un agente de ACP diferente para las comprobaciones de estado,
establece el agente de sondeo explícitamente:

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Reinicia la pasarela después de cambiar este valor.

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva: no hay una TTY para aprobar o denegar las solicitudes de permiso de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se gestionan los permisos:

Estos permisos del arnés ACPX son independientes de las aprobaciones de ejecución de OpenClaw e independientes de los indicadores de omisión del proveedor de backend de CLI, como Claude CLI `--permission-mode bypassPermissions`. ACPX `approve-all` es el interruptor de emergencia (break-glass) a nivel de arnés para las sesiones de ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente del arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y los comandos de shell.              |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay una TTY interactiva disponible (lo cual siempre es el caso para las sesiones de ACP).

| Valor  | Comportamiento                                                         |
| ------ | ---------------------------------------------------------------------- |
| `fail` | Abortar la sesión con `AcpRuntimeError`. **(predeterminado)**          |
| `deny` | Denegar silenciosamente el permiso y continuar (degradación elegante). |

### Configuración

Establecer a través de la configuración del complemento:

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Reinicie la puerta de enlace después de cambiar estos valores.

<Warning>
OpenClaw usa de forma predeterminada `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active una solicitud de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.

Si necesita restringir permisos, establezca `nonInteractivePermissions` en `deny` para que las sesiones se degraden elegantemente en lugar de fallar.

</Warning>

## Relacionado

- [ACP agents](/es/tools/acp-agents) — descripción general, manual del operador, conceptos
- [Sub-agentes](/es/tools/subagents)
- [Enrutamiento multiagente](/es/concepts/multi-agent)

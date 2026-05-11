---
summary: "Configuración de agentes ACP: configuración del arnés acpx, configuración del complemento, permisos"
read_when:
  - Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI
  - Enabling the plugin-tools or OpenClaw-tools MCP bridge
  - Configuring ACP permission modes
title: "Agentes ACP — configuración"
---

Para ver la descripción general, el manual del operador y los conceptos, consulte [Agentes ACP](/es/tools/acp-agents).

Las secciones a continuación cubren la configuración del arnés acpx, la configuración del complemento para los puentes MCP y la configuración de permisos.

Use esta página solo cuando esté configurando la ruta ACP/acpx. Para la configuración de tiempo de ejecución del servidor de aplicaciones nativo de Codex, use [Arnés de Codex](/es/plugins/codex-harness). Para
claves de API de OpenAI o configuración del proveedor de modelos OAuth de Codex, use
[OpenAI](/es/providers/openai).

Codex tiene dos rutas de OpenClaw:

| Ruta                                     | Configuración/comando                                  | Página de configuración                     |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Servidor de aplicaciones nativo de Codex | `/codex ...`, `agentRuntime.id: "codex"`               | [Arnés de Codex](/es/plugins/codex-harness) |
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

Cuando OpenClaw usa el backend acpx, prefiera estos valores para `agentId` a menos que su configuración de acpx defina alias de agentes personalizados.
Si su instalación local de Cursor todavía expone ACP como `agent acp`, anule el comando del agente `cursor` en su configuración de acpx en lugar de cambiar el valor predeterminado integrado.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape sin formato es una característica de la CLI de acpx (no la ruta normal de OpenClaw `agentId`).

El control del modelo depende de la capacidad del adaptador. Las referencias del modelo ACP de Codex se
normalizan mediante OpenClaw antes del inicio. Otros harnesses necesitan ACP `models` más
soporte para `session/set_model`; si un harness no expone esa capacidad de ACP
ni su propia bandera de modelo de inicio, OpenClaw/acpx no puede forzar una selección de modelo.

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
        spawnAcpSessions: true,
      },
    },
  },
}
```

Si la generación de ACP vinculada a hilos no funciona, verifique primero la bandera de características del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Las vinculaciones de conversación actual no requieren la creación de hilos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga vinculaciones de conversación ACP.

Consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Las instalaciones nuevas incluyen el complemento de tiempo de ejecución `acpx` integrado habilitado de forma predeterminada, por lo que ACP
generalmente funciona sin un paso de instalación manual del complemento.

Comience con:

```text
/acp doctor
```

Si deshabilitó `acpx`, lo denegó mediante `plugins.allow` / `plugins.deny`, o desea
cambiar a una copia de desarrollo local, use la ruta explícita del complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación en el espacio de trabajo local durante el desarrollo:

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Luego verifique el estado del backend:

```text
/acp doctor
```

### Configuración del comando y la versión de acpx

De forma predeterminada, el complemento `acpx` integrado registra el backend ACP integrado sin
generar un agente ACP durante el inicio de Gateway. Ejecute `/acp doctor` para una
sondeo en vivo explícito. Establezca `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=1` solo cuando necesite que
el Gateway sondee el agente configurado al inicio.

Anule el comando o la versión en la configuración del complemento:

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

- `command` acepta una ruta absoluta, una ruta relativa (resuelta desde el espacio de trabajo de OpenClaw) o un nombre de comando.
- `expectedVersion: "any"` deshabilita la coincidencia estricta de versiones.
- Las rutas `command` personalizadas deshabilitan la autoinstalación local del complemento.

Consulte [Complementos](/es/tools/plugin).

### Instalación automática de dependencias

Cuando instalas OpenClaw globalmente con `npm install -g openclaw`, las dependencias de tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente mediante un gancho de postinstalación. Si la instalación automática falla, la puerta de enlace se inicia con normalidad e informa de la dependencia que falta a través de `openclaw acp doctor`.

### Puente MCP de herramientas de complementos

De forma predeterminada, las sesiones de ACPX **no** exponen las herramientas registradas por el complemento de OpenClaw al arnés de ACP.

Si deseas que los agentes de ACP, como Codex o Claude Code, llamen a las herramientas de complementos de OpenClaw instaladas, como la recuperación/almacenamiento de memoria, habilita el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que esto hace:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en el arranque de la sesión de ACPX.
- Expone las herramientas de complementos ya registradas por los complementos de OpenClaw instalados y habilitados.
- Mantiene la función explícita y deshabilitada de forma predeterminada.

Notas de seguridad y confianza:

- Esto expande la superficie de herramientas del arnés de ACP.
- Los agentes de ACP obtienen acceso solo a las herramientas de complementos ya activas en la puerta de enlace.
- Trata esto con el mismo límite de confianza que permitir que esos complementos se ejecuten en el propio OpenClaw.
- Revisa los complementos instalados antes de habilitarlo.

Los `mcpServers` personalizados aún funcionan como antes. El puente de herramientas de complementos integrado es una convenencia opcional adicional, no un reemplazo para la configuración genérica del servidor MCP.

### Puente MCP de herramientas de OpenClaw

De forma predeterminada, las sesiones de ACPX tampoco **no** exponen las herramientas integradas de OpenClaw a través de MCP. Habilita el puente separado de herramientas principales (core-tools) cuando un agente de ACP necesita herramientas integradas seleccionadas, como `cron`:

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

Lo que esto hace:

- Inyecta un servidor MCP integrado llamado `openclaw-tools` en el arranque de la sesión de ACPX.
- Expone las herramientas integradas seleccionadas de OpenClaw. El servidor inicial expone `cron`.
- Mantiene la exposición de herramientas principales explícita y deshabilitada de forma predeterminada.

### Configuración del tiempo de espera de ejecución

El complemento `acpx` incluido establece de forma predeterminada los tiempos de ejecución integrados en un tiempo de espera de 120 segundos. Esto da a los arneses más lentos, como Gemini CLI, suficiente tiempo para completar el inicio y la inicialización de ACP. Anúlalo si tu host necesita un límite de tiempo de ejecución diferente:

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Reinicia la puerta de enlace después de cambiar este valor.

### Configuración del agente de sondas de estado

Cuando `/acp doctor` o la sonda de inicio opcional verifica el backend, el complemento `acpx` incluido sondea un agente de arnés. Si `acp.allowedAgents` está configurado, por defecto es el primer agente permitido; de lo contrario, por defecto es `codex`. Si su implementación necesita un agente ACP diferente para las verificaciones de salud, configure el agente de sonda explícitamente:

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Reinicie la puerta de enlace después de cambiar este valor.

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva: no hay TTY para aprobar o denegar las solicitudes de permiso de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

Estos permisos del arnés ACPX son independientes de las aprobaciones de ejecución de OpenClaw e independientes de los indicadores de omisión del proveedor del backend de CLI, como `--permission-mode bypassPermissions` de CLI de Claude. ACPX `approve-all` es el interruptor de emergencia a nivel de arnés para las sesiones de ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente de arnés sin solicitar permiso.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                  |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay un TTY interactivo disponible (lo cual siempre es el caso de las sesiones de ACP).

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
OpenClaw tiene como valores predeterminados `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active una solicitud de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.

Si necesita restringir los permisos, establezca `nonInteractivePermissions` en `deny` para que las sesiones se degraden elegantemente en lugar de fallar.

</Warning>

## Relacionado

- [ACP agents](/es/tools/acp-agents) — descripción general, manual del operador, conceptos
- [Subagentes](/es/tools/subagents)
- [Enrutamiento multiagente](/es/concepts/multi-agent)

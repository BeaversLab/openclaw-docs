---
summary: "Ejecuta el puente ACP para integraciones de IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

Ejecuta el puente del [Protocolo de Cliente de Agente (ACP)](https://agentclientprotocol.com/) que se comunica con una puerta de enlace de OpenClaw.

Este comando habla ACP a través de stdio para IDE y reenvía indicaciones a la puerta de enlace
a través de WebSocket. Mantiene las sesiones ACP asignadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por una puerta de enlace (Gateway), no un entorno de ejecución de editor nativo de ACP completo. Se centra en el enrutamiento de sesiones, la entrega de avisos y las actualizaciones básicas de streaming.

Si desea que un cliente MCP externo hable directamente con las conversaciones del canal de OpenClaw en lugar de alojar una sesión de arnés ACP, use [`openclaw mcp serve`](/es/cli/mcp) en su lugar.

## Lo que esto no es

Esta página a menudo se confunde con sesiones de arnés ACP.

`openclaw acp` significa:

- OpenClaw actúa como un servidor ACP
- un IDE o cliente ACP se conecta a OpenClaw
- OpenClaw reenvía ese trabajo a una sesión de puerta de enlace

Esto es diferente de los [Agentes ACP](/es/tools/acp-agents), donde OpenClaw ejecuta un arnés externo como Codex o Claude Code a través de `acpx`.

Regla rápida:

- el/editor cliente quiere hablar ACP con OpenClaw: use `openclaw acp`
- OpenClaw debería lanzar Codex/Claude/Gemini como un arnés ACP: use `/acp spawn` y [Agentes ACP](/es/tools/acp-agents)

## Matriz de compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo de puente central a través de stdio hacia el chat/envío de puerta de enlace + abortar.                                                                                                                                                                                                                      |
| `listSessions`, comandos de barra                                                       | Implementado  | La lista de sesiones funciona contra el estado de la sesión de la puerta de enlace con paginación de cursor limitada y filtrado `cwd` donde las filas de sesión de la puerta de enlace llevan metadatos del espacio de trabajo; los comandos se anuncian a través de `available_commands_update`.                 |
| `resumeSession`, `closeSession`                                                         | Implementado  | Reanudar (Resume) vuelve a vincular una sesión ACP a una sesión de puerta de enlace existente sin reproducir el historial. Cerrar (Close) cancela el trabajo activo del puente, resuelve los avisos pendientes como cancelados y libera el estado de la sesión del puente.                                        |
| `loadSession`                                                                           | Parcial       | Vincula de nuevo la sesión ACP a una clave de sesión de puerta de enlace y reproduce el historial del libro mayor de eventos ACP para las sesiones creadas por el puente. Las sesiones antiguas/sin libro mayor recurren al texto de usuario/asistente almacenado.                                                |
| Contenido del aviso (`text`, `resource` incrustado, imágenes)                           | Parcial       | Los textos/recursos se aplastan en la entrada de chat; las imágenes se convierten en archivos adjuntos de la puerta de enlace.                                                                                                                                                                                    |
| Modos de sesión                                                                         | Parcial       | `session/set_mode` es compatible y el puente expone controles de sesión iniciales respaldados por Gateway para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones elevadas. Las superficies de modo/configuración nativas de ACP más amplias siguen fuera del alcance. |
| Información de sesión y actualizaciones de uso                                          | Parcial       | El puente emite `session_info_update` y notificaciones de `usage_update` de mejor esfuerzo a partir de instantáneas de sesión de Gateway en caché. El uso es aproximado y solo se envía cuando los totales de tokens de Gateway están marcados como actualizados.                                                 |
| Transmisión de herramientas (Tool streaming)                                            | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de las herramientas de Gateway los exponen. Las terminales integradas y las salidas más ricas nativas de diferencias aún no se exponen.    |
| Aprobaciones de ejecución (Exec approvals)                                              | Parcial       | Las solicitudes de aprobación de ejecución de Gateway durante turnos de solicitud ACP activos se retransmiten al cliente ACP con `session/request_permission`.                                                                                                                                                    |
| Servidores MCP por sesión (`mcpServers`)                                                | No admitido   | El modo de puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace de OpenClaw o en el agente en su lugar.                                                                                                                                                                |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No admitido   | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                         |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite identificadores de terminal a través de llamadas a herramientas.                                                                                                                                                                                         |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | Actualmente, el puente emite texto de salida y estado de las herramientas, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                    |

## Limitaciones conocidas

- `loadSession` puede reproducir el historial completo del libro mayor de eventos ACP solo para
  sesiones creadas por el puente. Las sesiones más antiguas/sin libro mayor todavía usan la alternativa
  de transcripción y no reconstruyen llamadas a herramientas históricas ni avisos del sistema.
- Si varios clientes ACP comparten la misma clave de sesión de Gateway, el enrutamiento de eventos y cancelaciones
  es de mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las
  sesiones aisladas `acp:<uuid>` predeterminadas cuando necesite turnos
  limpios locales del editor.
- Los estados de detención de Gateway se traducen en motivos de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto enfocado de perillas de Gateway:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones
  elevadas. La selección del modelo y los controles de exec-host aún no están expuestos como opciones de
  configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión de
  Gateway, no de contabilidad en tiempo real nativa de ACP. El uso es aproximado,
  no contiene datos de costos y solo se emite cuando Gateway marca los datos totales de
  tokens como actualizados.
- Los datos de seguimiento de herramientas se realizan sobre la base del mejor esfuerzo posible. El puente puede exponer rutas de archivo que
  aparecen en argumentos/resultados de herramientas conocidas, pero aún no emite terminales ACP ni
  diffs de archivos estructurados.
- El relé de aprobación de ejecución está limitado al turno de aviso ACP activo; las aprobaciones de
  otras sesiones de Gateway se ignoran.

## Uso

```bash
openclaw acp

# Remote Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# Remote Gateway (token from file)
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Attach to an existing session key
openclaw acp --session agent:main:main

# Attach by label (must already exist)
openclaw acp --session-label "support inbox"

# Reset the session key before the first prompt
openclaw acp --session agent:main:main --reset-session
```

## Cliente ACP (depuración)

Use el cliente ACP incorporado para verificar el puente sin un IDE.
Genera el puente ACP y le permite escribir avisos de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en listas de permitidos y solo se aplica a IDs de herramientas centrales confiables.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando se establece).
- ACP solo aprueba automáticamente clases de solo lectura estrechas: llamadas `read` con ámbito bajo el cwd activo más herramientas de búsqueda de solo lectura (`search`, `web_search`, `memory_search`). Las herramientas desconocidas/no centrales, las lecturas fuera de ámbito, las herramientas con capacidad de ejecución, las herramientas del plano de control, las herramientas de mutación y los flujos interactivos siempre requieren aprobación explícita del aviso.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).
- Esta política de puente ACP es independiente de los permisos del arnés ACPX. Si ejecuta OpenClaw a través del backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` es el interruptor de emergencia "yolo" para esa sesión del arnés.

## Pruebas de humo del protocolo

Para la depuración a nivel de protocolo, inicie un Gateway con estado aislado y controle
`openclaw acp` a través de stdio con un cliente ACP JSON-RPC. Cubra `initialize`,
`session/new`, `session/list` con una `cwd` absoluta, `session/resume`,
`session/close`, cierre duplicado y reanudación faltante.

La prueba debe incluir las capacidades de ciclo de vida anunciadas, una fila de sesión respaldada por Gateway,
notificaciones de actualización y el registro `sessions.list` del Gateway:

```json
{
  "initialize": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "sessionCapabilities": {
        "list": {},
        "resume": {},
        "close": {}
      }
    }
  },
  "listSessions": {
    "sessions": [
      {
        "sessionId": "agent:main:acp-smoke",
        "cwd": "/path/to/workspace",
        "_meta": {
          "sessionKey": "agent:main:acp-smoke",
          "kind": "direct"
        }
      }
    ],
    "nextCursor": null
  },
  "notifications": ["session_info_update", "available_commands_update", "usage_update"],
  "gatewayLogTail": ["[gateway] ready", "[ws] ⇄ res ✓ sessions.list 305ms"]
}
```

Evite usar `openclaw gateway call sessions.list` como la única prueba de ACP. Esa ruta de CLI
puede solicitar una actualización de ámbito de operador con token nuevo; la corrección del puente ACP
se demuestra mediante los marcos stdio de ACP más el registro `sessions.list` del Gateway.

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable Agent Client Protocol y desee
que controle una sesión de OpenClaw Gateway.

1. Asegúrese de que el Gateway se esté ejecutando (local o remoto).
2. Configure el destino del Gateway (configuración o indicadores).
3. Configure su IDE para ejecutar `openclaw acp` a través de stdio.

Configuración de ejemplo (persistida):

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

Ejecución directa de ejemplo (sin escritura de configuración):

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## Seleccionar agentes

ACP no elige los agentes directamente. Se enruta mediante la clave de sesión del Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión ACP se asigna a una única clave de sesión del Gateway. Un agente puede tener muchas
sesiones; ACP usa por defecto una sesión `acp:<uuid>` aislada a menos que anule
la clave o la etiqueta.

Las `mcpServers` por sesión no son compatibles en modo puente. Si un cliente ACP
las envía durante `newSession` o `loadSession`, el puente devuelve un
error claro en lugar de ignorarlas silenciosamente.

Si desea que las sesiones respaldadas por ACPX vean las herramientas de complementos de OpenClaw o herramientas
integradas seleccionadas como `cron`, habilite los puentes MCP ACPX en el lado del Gateway
en lugar de intentar pasar `mcpServers` por sesión. Consulte
[ACP Agents](/es/tools/acp-agents-setup#plugin-tools-mcp-bridge) y
[OpenClaw tools MCP bridge](/es/tools/acp-agents-setup#openclaw-tools-mcp-bridge).

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si desea que un agente de codificación como Codex o Claude Code se comunique con su
bot de OpenClaw a través de ACP, use `acpx` con su objetivo `openclaw` integrado.

Flujo típico:

1. Ejecute el Gateway y asegúrese de que el puente ACP pueda alcanzarlo.
2. Apunte `acpx openclaw` a `openclaw acp`.
3. Seleccione la clave de sesión de OpenClaw que desee que use el agente de codificación.

Ejemplos:

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si desea que `acpx openclaw` apunte a un Gateway y una clave de sesión específicos cada
vez, anule el comando del agente `openclaw` en `~/.acpx/config.json`:

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Para una copia local de OpenClaw del repositorio, use el punto de entrada directo de la CLI en lugar del
ejecutor de desarrollo para que el flujo ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente de OpenClaw sin rastrear una terminal.

## Configuración del editor Zed

Agregue un agente ACP personalizado en `~/.config/zed/settings.json` (o use la interfaz de usuario de Configuración de Zed):

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Para apuntar a un Gateway o agente específico:

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp", "--url", "wss://gateway-host:18789", "--token", "<token>", "--session", "agent:design:main"],
      "env": {}
    }
  }
}
```

En Zed, abra el panel Agente y seleccione "OpenClaw ACP" para iniciar un hilo.

## Mapeo de sesión

De forma predeterminada, las sesiones ACP obtienen una clave de sesión aislada del Gateway con un prefijo `acp:`.
Para reutilizar una sesión conocida, pase una clave o etiqueta de sesión:

- `--session <key>`: use una clave de sesión específica del Gateway.
- `--session-label <label>`: resuelva una sesión existente por etiqueta.
- `--reset-session`: genere un nuevo id de sesión para esa clave (misma clave, nueva transcripción).

Si su cliente ACP es compatible con metadatos, puede anular por sesión:

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

Obtenga más información sobre las claves de sesión en [/concepts/session](/es/concepts/session).

## Opciones

- `--url <url>`: URL de WebSocket del Gateway (el valor predeterminado es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación del Gateway.
- `--token-file <path>`: lea el token de autenticación del Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación del Gateway.
- `--password-file <path>`: lea la contraseña de autenticación del Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada para resolver.
- `--require-existing`: fallar si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablezca la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no anteponga el directorio de trabajo a los indicadores (prompts).
- `--provenance <off|meta|meta+receipt>`: incluir metadatos de procedencia ACP o recibos.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` respaldo solo cuando `gateway.auth.*` no está configurado (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con respaldo de env/-config según las reglas de precedencia remota
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de configuración/entorno; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que puede usarse para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: habilitar registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Agentes ACP](/es/tools/acp-agents)

---
summary: "Ejecuta el puente ACP para integraciones de IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

Ejecute el puente del [Protocolo de Cliente de Agente (ACP)](https://agentclientprotocol.com/) que se comunica con una puerta de enlace OpenClaw Gateway.

Este comando habla ACP a través de stdio para IDE y reenvía indicaciones a la puerta de enlace
a través de WebSocket. Mantiene las sesiones ACP asignadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por una puerta de enlace (Gateway), no un entorno de ejecución de editor nativo de ACP completo. Se centra en el enrutamiento de sesiones, la entrega de avisos y las actualizaciones básicas de streaming.

Si desea que un cliente MCP externo hable directamente con las conversaciones del canal de OpenClaw en lugar de alojar una sesión de arnés ACP, utilice
[`openclaw mcp serve`](/es/cli/mcp) en su lugar.

## Lo que esto no es

Esta página a menudo se confunde con sesiones de arnés ACP.

`openclaw acp` significa:

- OpenClaw actúa como un servidor ACP
- un IDE o cliente ACP se conecta a OpenClaw
- OpenClaw reenvía ese trabajo a una sesión de puerta de enlace

Esto es diferente de los [Agentes ACP](/es/tools/acp-agents), donde OpenClaw ejecuta un
arnés externo como Codex o Claude Code a través de `acpx`.

Regla rápida:

- el/editor cliente quiere hablar ACP con OpenClaw: use `openclaw acp`
- OpenClaw debería iniciar Codex/Claude/Gemini como un arnés ACP: use `/acp spawn` y [Agentes ACP](/es/tools/acp-agents)

## Matriz de compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo de puente central a través de stdio hacia el chat/envío de puerta de enlace + abortar.                                                                                                                                                                                                                                |
| `listSessions`, comandos de barra                                                       | Implementado  | La lista de sesiones funciona contra el estado de la sesión de la puerta de enlace con paginación de cursor limitada y filtrado `cwd` donde las filas de sesión de la puerta de enlace llevan metadatos del espacio de trabajo; los comandos se anuncian a través de `available_commands_update`.                           |
| Metadatos de linaje de sesión                                                           | Implementado  | Los listados de sesiones y las instantáneas de información de sesión incluyen el linaje principal y secundario de OpenClaw en `_meta` para que los clientes ACP puedan representar gráficos de subagentes sin canales laterales privados de la puerta de enlace (Gateway).                                                  |
| `resumeSession`, `closeSession`                                                         | Implementado  | Resume vuelve a vincular una sesión ACP a una sesión existente de la puerta de enlace sin reproducir el historial. Close cancela el trabajo activo del puente, resuelve las solicitudes pendientes como canceladas y libera el estado de la sesión del puente.                                                              |
| `loadSession`                                                                           | Parcial       | Vincula nuevamente la sesión ACP a una clave de sesión de la puerta de enlace y reproduce el historial del libro mayor de eventos ACP para sesiones creadas por el puente. Las sesiones antiguas o sin libro mayor recurren al texto de usuario/asistente almacenado.                                                       |
| Contenido del prompt (`text`, `resource` incrustado, imágenes)                          | Parcial       | El texto/recursos se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos de la puerta de enlace (Gateway).                                                                                                                                                                                      |
| Modos de sesión                                                                         | Parcial       | Se admite `session/set_mode` y el puente expone controles iniciales de sesión respaldados por la puerta de enlace para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones elevadas. Las superficies de modo/configuración nativas de ACP más amplias aún están fuera del alcance. |
| Actualizaciones de información y uso de sesión                                          | Parcial       | El puente emite `session_info_update` y notificaciones de mejor esfuerzo `usage_update` a partir de instantáneas de sesión en caché de la puerta de enlace (Gateway). El uso es aproximado y solo se envía cuando los totales de tokens de la puerta de enlace están marcados como actualizados.                            |
| Transmisión de herramientas (Tool streaming)                                            | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo con el mejor esfuerzo cuando los argumentos/resultados de las herramientas del Gateway los exponen. Las terminales integradas y resultados más ricos nativos de diff aún no se exponen.                 |
| Aprobaciones de ejecución                                                               | Parcial       | Las solicitudes de aprobación de ejecución del Gateway durante turnos de aviso activos de ACP se retransmiten al cliente ACP con `session/request_permission`.                                                                                                                                                              |
| Servidores MCP por sesión (`mcpServers`)                                                | No admitido   | El modo puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace de OpenClaw o en el agente en su lugar.                                                                                                                                                                             |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                                   |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite ids de terminal a través de llamadas a herramientas.                                                                                                                                                                                                               |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | Actualmente, el puente emite texto de salida y estado de las herramientas, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                              |

## Limitaciones conocidas

- `loadSession` puede reproducir el historial completo del libro mayor de eventos ACP solo para
  sesiones creadas por el puente. Las sesiones más antiguas/sin libro mayor aún utilizan la alternativa
  de transcripción y no reconstruyen llamadas a herramientas históricas ni avisos del sistema.
- Si varios clientes ACP comparten la misma clave de sesión del Gateway, el enrutamiento de eventos y cancelación
  se hace con el mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las
  sesiones aisladas `acp:<uuid>` predeterminadas cuando necesite turnos limpios locales del editor.
- Los estados de detención del Gateway se traducen en motivos de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente muestran un subconjunto enfocado de perillas del Gateway:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones
  elevadas. La selección del modelo y los controles de ejecución (exec-host) aún no se exponen como opciones
  de configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión del Gateway,
  no de contabilidad en tiempo de ejecución nativa en vivo de ACP. El uso es aproximado,
  no lleva datos de costos y solo se emite cuando el Gateway marca los datos totales de tokens
  como recientes.
- Los datos de seguimiento de herramientas se realizan con el mejor esfuerzo posible. El puente puede mostrar rutas de archivo que aparecen en argumentos/resultados de herramientas conocidas, pero aún no emite terminales ACP ni diffs de archivos estructurados.
- El relé de aprobación de ejecución está limitado al turno de solicitud activo de ACP; se ignoran las aprobaciones de otras sesiones de Gateway.

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

Use el cliente ACP integrado para verificar el puente sin un IDE. Inicia el puente ACP y le permite escribir solicitudes de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La autoaprobación se basa en una lista de permitidos y solo se aplica a los IDs de herramientas principales confiables.
- La autoaprobación de `read` se limita al directorio de trabajo actual (`--cwd` cuando se establece).
- ACP solo autoaprueba clases de solo lectura estrechas: llamadas `read` limitadas bajo el cwd activo más herramientas de búsqueda de solo lectura (`search`, `web_search`, `memory_search`). Las herramientas desconocidas/no principales, las lecturas fuera de alcance, las herramientas con capacidad de ejecución, las herramientas del plano de control, las herramientas de mutación y los flujos interactivos siempre requieren aprobación explícita de la solicitud.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).
- Esta política de puente ACP es independiente de los permisos del arnés ACPX. Si ejecuta OpenClaw a través del backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` es el interruptor de emergencia "yolo" para esa sesión de arnés.

## Prueba de humo del protocolo

Para la depuración a nivel de protocolo, inicie un Gateway con estado aislado y controle `openclaw acp` a través de stdio con un cliente ACP JSON-RPC. Cubra `initialize`, `session/new`, `session/list` con un `cwd` absoluto, `session/resume`, `session/close`, cierre duplicado y reanudación faltante.

La prueba debe incluir las capacidades de ciclo de vida anunciadas, una fila de sesión respaldada por Gateway, notificaciones de actualización y el registro `sessions.list` de Gateway:

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

Evite usar `openclaw gateway call sessions.list` como la única prueba de ACP. Esa ruta de CLI puede solicitar una actualización del alcance del operador con un token nuevo; la corrección del puente ACP se demuestra mediante los marcos stdio de ACP más el registro `sessions.list` del Gateway.

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable el Protocolo de Cliente de Agente y desea que impulse una sesión de OpenClaw Gateway.

1. Asegúrese de que el Gateway se esté ejecutando (local o remoto).
2. Configure el destino del Gateway (configuración o indicadores).
3. Apunte su IDE para ejecutar `openclaw acp` a través de stdio.

Ejemplo de configuración (persistida):

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

Ejemplo de ejecución directa (sin escritura de configuración):

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## Selección de agentes

ACP no elige los agentes directamente. Enruta según la clave de sesión del Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión de ACP se asigna a una sola clave de sesión del Gateway. Un agente puede tener muchas sesiones; ACP usa por defecto una sesión aislada de `acp:<uuid>` a menos que anule la clave o la etiqueta.

Las `mcpServers` por sesión no son compatibles con el modo puente. Si un cliente ACP las envía durante `newSession` o `loadSession`, el puente devuelve un error claro en lugar de ignorarlas silenciosamente.

Si desea que las sesiones respaldadas por ACPX vean las herramientas del complemento OpenClaw o herramientas integradas seleccionadas como `cron`, habilite los puentes MCP de ACPX en el lado del Gateway en lugar de intentar pasar `mcpServers` por sesión. Consulte [Agentes ACP](/es/tools/acp-agents-setup#plugin-tools-mcp-bridge) y [Puente MCP de herramientas de OpenClaw](/es/tools/acp-agents-setup#openclaw-tools-mcp-bridge).

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si desea que un agente de codificación como Codex o Claude Code hable con su bot OpenClaw a través de ACP, use `acpx` con su destino `openclaw` integrado.

Flujo típico:

1. Ejecute el Gateway y asegúrese de que el puente ACP pueda alcanzarlo.
2. Apunte `acpx openclaw` a `openclaw acp`.
3. Seleccione la clave de sesión de OpenClaw que desea que use el agente de codificación.

Ejemplos:

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si desea que `acpx openclaw` apunte a un Gateway y una clave de sesión específicos cada vez, anule el comando del agente `openclaw` en `~/.acpx/config.json`:

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Para una copia local de OpenClaw en el repositorio, utilice el punto de entrada directo de la CLI en lugar del
ejecutor de desarrollo para que el flujo de ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente de OpenClaw sin raspar un terminal.

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

Para apuntar a una puerta de enlace (Gateway) o agente específico:

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

## Asignación de sesión

De manera predeterminada, las sesiones de ACP obtienen una clave de sesión de puerta de enlace (Gateway) aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pase una clave o etiqueta de sesión:

- `--session <key>`: use una clave de sesión de puerta de enlace específica.
- `--session-label <label>`: resuelva una sesión existente por etiqueta.
- `--reset-session`: genere un nuevo id de sesión para esa clave (misma clave, nueva transcripción).

Si su cliente ACP admite metadatos, puede anular por sesión:

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

- `--url <url>`: URL de WebSocket de la puerta de enlace (Gateway) (el valor predeterminado es gateway.remote.url cuando se configura).
- `--token <token>`: token de autenticación de la puerta de enlace (Gateway).
- `--token-file <path>`: lea el token de autenticación de la puerta de enlace (Gateway) desde un archivo.
- `--password <password>`: contraseña de autenticación de la puerta de enlace (Gateway).
- `--password-file <path>`: lea la contraseña de autenticación de la puerta de enlace (Gateway) desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada para resolver.
- `--require-existing`: falla si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablezca la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no anteponga el directorio de trabajo a los avisos.
- `--provenance <off|meta|meta+receipt>`: incluya metadatos o recibos de procedencia de ACP.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en los listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` fallback solo cuando `gateway.auth.*` no está establecido (los SecretRefs locales configurados pero no resuertos fallan cerrados)
  - modo remoto: `gateway.remote.*` con fallback de env/config según las reglas de precedencia remota
  - `--url` es seguro ante sobrescritura y no reutiliza credenciales implícitas de configuración/entorno; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que se puede usar para reglas específicas de contexto de shell/perfil.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### Opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Agentes ACP](/es/tools/acp-agents)

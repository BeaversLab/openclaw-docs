---
summary: "Ejecuta el puente ACP para integraciones con IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

Ejecute el puente [Agente de protocolo de cliente (ACP)](https://agentclientprotocol.com/) que habla con una puerta de enlace OpenClaw.

Este comando habla ACP a través de stdio para IDE y reenvía indicaciones a la puerta de enlace
a través de WebSocket. Mantiene las sesiones ACP asignadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por puerta de enlace, no un tiempo de ejecución de editor nativo completo de ACP.
Se centra en el enrutamiento de sesiones, la entrega de indicaciones y las actualizaciones básicas de
transmisión.

Si desea que un cliente MCP externo hable directamente con las conversaciones del canal OpenClaw
en lugar de alojar una sesión de arnés ACP, use
[`openclaw mcp serve`](/es/cli/mcp) en su lugar.

## Lo que esto no es

Esta página a menudo se confunde con sesiones de arnés ACP.

`openclaw acp` significa:

- OpenClaw actúa como un servidor ACP
- un IDE o cliente ACP se conecta a OpenClaw
- OpenClaw reenvía ese trabajo a una sesión de puerta de enlace

Esto es diferente de [Agentes ACP](/es/tools/acp-agents), donde OpenClaw ejecuta un
arnés externo como Codex o Claude Code a través de `acpx`.

Regla rápida:

- el/editor cliente quiere hablar ACP con OpenClaw: use `openclaw acp`
- OpenClaw debería iniciar Codex/Claude/Gemini como un arnés ACP: use `/acp spawn` y [Agentes ACP](/es/tools/acp-agents)

## Matriz de compatibilidad

| Área ACP                                                                               | Estado        | Notas                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                         | Implementado  | Flujo de puente central a través de stdio hacia el chat/envío de puerta de enlace + abortar.                                                                                                                                                                                                                        |
| `listSessions`, comandos de barra                                                      | Implementado  | La lista de sesiones funciona contra el estado de sesión de la puerta de enlace; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                  |
| `loadSession`                                                                          | Parcial       | Vincula la sesión ACP a una clave de sesión de puerta de enlace y reproduce el historial de texto de usuario/auxiliar almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                       |
| Contenido del indicador (`text`, `resource` incrustado, imágenes)                      | Parcial       | El texto/recursos se aplanan en la entrada de chat; las imágenes se convierten en archivos adjuntos de puerta de enlace.                                                                                                                                                                                            |
| Modos de sesión                                                                        | Parcial       | Se admite `session/set_mode` y el puente expone controles de sesión iniciales respaldados por el Gateway para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones elevadas. Las superficies de modo/configuración más amplias nativas de ACP aún están fuera del alcance. |
| Información de sesión y actualizaciones de uso                                         | Parcial       | El puente emite notificaciones `session_info_update` y `usage_update` de mejor esfuerzo a partir de instantáneas de sesión del Gateway en caché. El uso es aproximado y solo se envía cuando los totales de tokens del Gateway se marcan como recientes.                                                            |
| Transmisión de herramientas                                                            | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de las herramientas del Gateway los exponen. Las terminales integradas y resultados más ricos nativos de diff aún no se exponen.             |
| Servidores MCP por sesión (`mcpServers`)                                               | No compatible | El modo de puente rechaza las solicitudes de servidores MCP por sesión. Configure MCP en el gateway de OpenClaw o en el agente en su lugar.                                                                                                                                                                         |
| Métodos de sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No admitido   | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                           |
| Métodos de terminal del cliente (`terminal/*`)                                         | No admitido   | El puente no crea terminales de cliente ACP ni transmite identificadores de terminal a través de llamadas a herramientas.                                                                                                                                                                                           |
| Planes de sesión / transmisión de pensamientos                                         | No admitido   | Actualmente, el puente emite texto de salida y estado de las herramientas, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                      |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto del usuario y del asistente almacenado, pero no
  reconstruye llamadas históricas a herramientas, avisos del sistema ni tipos de eventos
  más ricos nativos de ACP.
- Si varios clientes ACP comparten la misma clave de sesión del Gateway, el enrutamiento de eventos y cancelaciones
  es de mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las
  sesiones aisladas `acp:<uuid>` por defecto cuando necesite turnos limpios
  locales del editor.
- Los estados de detención del Gateway se traducen en motivos de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto centrado de perillas del Gateway:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones
  elevadas. La selección del modelo y los controles de exec-host aún no se exponen como opciones de
  configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión del Gateway, no de la contabilidad en tiempo de ejecución nativa de ACP. El uso es aproximado, no contiene datos de costos y solo se emite cuando el Gateway marca los datos totales de tokens como actualizados.
- Los datos de seguimiento de herramientas se realizan con el mejor esfuerzo posible. El puente puede mostrar rutas de archivo que aparecen en argumentos/resultados de herramientas conocidas, pero aún no emite terminales ACP ni diferencias de archivo estructuradas.

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

Utilice el cliente ACP integrado para verificar el estado del puente sin un IDE. Inicia el puente ACP y le permite escribir indicadores de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en una lista de permitidos y solo se aplica a los ID de herramientas principales confiables.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando se establece).
- ACP solo aprueba automáticamente clases de solo lectura estrechas: llamadas `read` con alcance bajo el cwd activo más herramientas de búsqueda de solo lectura (`search`, `web_search`, `memory_search`). Las herramientas desconocidas/no principales, las lecturas fuera de alcance, las herramientas con capacidad de ejecución, las herramientas del plano de control, las herramientas de mutación y los flujos interactivos siempre requieren una aprobación explícita del indicador.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).
- Esta política del puente ACP es independiente de los permisos del arnés ACPX. Si ejecuta OpenClaw a través del backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` es el interruptor de emergencia "yolo" para esa sesión del arnés.

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable el Protocolo de cliente de agente y desee que impulse una sesión de OpenClaw Gateway.

1. Asegúrese de que el Gateway se esté ejecutando (local o remoto).
2. Configure el destino del Gateway (configuración o indicadores).
3. Señale su IDE para ejecutar `openclaw acp` a través de stdio.

Ejemplo de configuración (persistente):

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

## Seleccionar agentes

ACP no elige agentes directamente. Se enruta mediante la clave de sesión del Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión de ACP se asigna a una sola clave de sesión de Gateway. Un agente puede tener muchas sesiones; ACP usa por defecto una sesión `acp:<uuid>` aislada a menos que anules la clave o la etiqueta.

Las `mcpServers` por sesión no son compatibles en modo puente. Si un cliente ACP las envía durante `newSession` o `loadSession`, el puente devuelve un error claro en lugar de ignorarlas silenciosamente.

Si quieres que las sesiones respaldadas por ACPX vean las herramientas de complementos de OpenClaw o herramientas integradas seleccionadas como `cron`, habilita los puentes MCP de ACPX en el lado del gateway en lugar de intentar pasar `mcpServers` por sesión. Consulta [ACP Agents](/es/tools/acp-agents-setup#plugin-tools-mcp-bridge) y [OpenClaw tools MCP bridge](/es/tools/acp-agents-setup#openclaw-tools-mcp-bridge).

## Uso desde `acpx` (Codex, Claude u otros clientes ACP)

Si deseas que un agente de codificación como Codex o Claude Code se comunique con tu bot de OpenClaw a través de ACP, usa `acpx` con su destino `openclaw` integrado.

Flujo típico:

1. Ejecuta el Gateway y asegúrate de que el puente ACP pueda alcanzarlo.
2. Apunta `acpx openclaw` a `openclaw acp`.
3. Destina la clave de sesión de OpenClaw que deseas que use el agente de codificación.

Ejemplos:

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si deseas que `acpx openclaw` apunte a un Gateway y una clave de sesión específicos cada vez, anula el comando del agente `openclaw` en `~/.acpx/config.json`:

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Para una descarga local de OpenClaw en el repositorio, utiliza el punto de entrada directo de la CLI en lugar del ejecutor de desarrollo para que el flujo de ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP extraiga información contextual de un agente de OpenClaw sin raspar un terminal.

## Configuración del editor Zed

Agrega un agente ACP personalizado en `~/.config/zed/settings.json` (o usa la interfaz de usuario de Configuración de Zed):

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

En Zed, abre el panel Agente y selecciona "OpenClaw ACP" para iniciar un hilo.

## Asignación de sesión

De forma predeterminada, las sesiones de ACP obtienen una clave de sesión de Gateway aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pasa una clave o etiqueta de sesión:

- `--session <key>`: usa una clave de sesión de Gateway específica.
- `--session-label <label>`: resuelve una sesión existente por etiqueta.
- `--reset-session`: crea un nuevo id de sesión para esa clave (misma clave, nueva transcripción).

Si su cliente ACP soporta metadatos, puede anular por sesión:

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

Aprenda más sobre las claves de sesión en [/concepts/session](/es/concepts/session).

## Opciones

- `--url <url>`: URL de WebSocket del Gateway (por defecto es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación del Gateway.
- `--token-file <path>`: lee el token de autenticación del Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación del Gateway.
- `--password-file <path>`: lee la contraseña de autenticación del Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada a resolver.
- `--require-existing`: falla si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablece la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no prefija los prompts con el directorio de trabajo.
- `--provenance <off|meta|meta+receipt>`: incluye metadatos o recibos de procedencia de ACP.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en los listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` reserva solo cuando `gateway.auth.*` no está establecido (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con reserva de env/config según las reglas de precedencia remota
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de config/entorno; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que pueden usarse para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### Opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión de ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Agentes ACP](/es/tools/acp-agents)

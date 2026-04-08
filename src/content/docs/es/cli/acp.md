---
summary: "Ejecuta el puente ACP para integraciones con IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

Ejecuta el puente del [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) que se comunica con una puerta de enlace de OpenClaw.

Este comando habla ACP a través de stdio para los IDE y reenvía los mensajes a la puerta de enlace
a través de WebSocket. Mantiene las sesiones de ACP mapeadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por la puerta de enlace, no un tiempo de ejecución de editor completamente nativo de ACP.
Se centra en el enrutamiento de sesiones, la entrega de mensajes y las actualizaciones básicas de transmisión.

Si desea que un cliente MCP externo se comunique directamente con las conversaciones del canal de OpenClaw en lugar de alojar una sesión de arnés de ACP, utilice
[`openclaw mcp serve`](/en/cli/mcp) en su lugar.

## Lo que esto no es

A menudo se confunde esta página con sesiones de arnés de ACP.

`openclaw acp` significa:

- OpenClaw actúa como un servidor ACP
- un IDE o cliente ACP se conecta a OpenClaw
- OpenClaw reenvía ese trabajo a una sesión de Gateway

Esto es diferente de los [Agentes ACP](/en/tools/acp-agents), donde OpenClaw ejecuta un arnés externo como Codex o Claude Code a través de `acpx`.

Regla rápida:

- el/editor cliente quiere hablar ACP con OpenClaw: use `openclaw acp`
- OpenClaw debería iniciar Codex/Claude/Gemini como un arnés ACP: use `/acp spawn` y [ACP Agents](/en/tools/acp-agents)

## Matriz de compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo de puente principal a través de stdio hacia chat/envío de Gateway + abortar.                                                                                                                                                                                                                               |
| `listSessions`, comandos de barra diagonal                                              | Implementado  | La lista de sesiones funciona contra el estado de la sesión del Gateway; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                       |
| `loadSession`                                                                           | Parcial       | Vincula la sesión ACP a una clave de sesión del Gateway y reproduce el historial de texto de usuario/asistente almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                           |
| Contenido del prompt (`text`, `resource` incrustado, imágenes)                          | Parcial       | El texto/los recursos se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos del Gateway.                                                                                                                                                                                            |
| Modos de sesión                                                                         | Parcial       | Se admite `session/set_mode` y el puente expone controles de sesión iniciales respaldados por el Gateway para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones elevadas. Las superficies de modo/configuración nativas de ACP más amplias siguen fuera del alcance. |
| Información de sesión y actualizaciones de uso                                          | Parcial       | El puente emite notificaciones `session_info_update` y `usage_update` de mejor esfuerzo a partir de instantáneas de sesiones en caché del Gateway. El uso es aproximado y solo se envía cuando los totales de tokens del Gateway están marcados como recientes.                                                  |
| Transmisión de herramientas (Tool streaming)                                            | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de las herramientas del Gateway los exponen. Las terminales integradas y los resultados más ricos nativos de diff aún no están expuestos. |
| Servidores MCP por sesión (`mcpServers`)                                                | No compatible | El modo de puente rechaza las solicitudes de servidores MCP por sesión. Configure MCP en el gateway o agente de OpenClaw en su lugar.                                                                                                                                                                            |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                        |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite ids de terminal a través de llamadas a herramientas.                                                                                                                                                                                                    |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | Actualmente, el puente emite texto de salida y estado de las herramientas, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                   |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto almacenado del usuario y del asistente, pero no reconstruye las llamadas a herramientas históricas, avisos del sistema o tipos de eventos más ricos nativos de ACP.
- Si varios clientes ACP comparten la misma clave de sesión del Gateway, el enrutamiento de eventos y cancelaciones es de mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las sesiones `acp:<uuid>` aisladas predeterminadas cuando necesite turnos locales limpios del editor.
- Los estados de detención del Gateway se traducen en motivos de detención de ACP, pero esa asignación es menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión inicial actualmente exponen un subconjunto centrado de controles del Gateway: nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones elevadas. La selección del modelo y los controles de host de ejecución aún no están expuestos como opciones de configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesiones del Gateway, no de la contabilidad en tiempo de ejecución nativa de ACP en vivo. El uso es aproximado, no lleva datos de costos y solo se emite cuando el Gateway marca los datos totales de tokens como recientes.
- Los datos de seguimiento de herramientas se realizan sobre una base de mejor esfuerzo. El puente puede exponer rutas de archivo que
  aparecen en argumentos/resultados de herramientas conocidas, pero aún no emite terminales ACP o
  diffs de archivos estructurados.

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

Use el cliente ACP integrado para verificar el estado del puente sin un IDE.
Inicia el puente ACP y le permite escribir indicaciones de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en una lista de permitidos y solo se aplica a IDs de herramientas principales confiables.
- La aprobación automática de `read` tiene como ámbito el directorio de trabajo actual (`--cwd` cuando se establece).
- ACP solo aprueba automáticamente clases de solo lectura estrechas: llamadas `read` con ámbito bajo el cwd activo más herramientas de búsqueda de solo lectura (`search`, `web_search`, `memory_search`). Las herramientas desconocidas/no centrales, lecturas fuera de ámbito, herramientas con capacidad de ejecución, herramientas del plano de control, herramientas de mutación y flujos interactivos siempre requieren aprobación explícita del indicador.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).
- Esta política de puente ACP es separada de los permisos del arnés ACPX. Si ejecuta OpenClaw a través del backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` es el interruptor de emergencia "yolo" para esa sesión del arnés.

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable el Protocolo de Cliente de Agente y desee
que impulse una sesión de OpenClaw Gateway.

1. Asegúrese de que Gateway se esté ejecutando (local o remoto).
2. Configure el destino de Gateway (configuración o banderas).
3. Señale su IDE para ejecutar `openclaw acp` a través de stdio.

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

ACP no elige agentes directamente. Se enruta por la clave de sesión de Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión ACP se asigna a una única clave de sesión de Gateway. Un agente puede tener muchas
sesiones; ACP predetermina a una sesión `acp:<uuid>` aislada a menos que anule
la clave o la etiqueta.

Los `mcpServers` por sesión no son compatibles en modo puente. Si un cliente ACP
los envía durante `newSession` o `loadSession`, el puente devuelve un error
claro en lugar de ignorarlos silenciosamente.

Si quieres que las sesiones respaldadas por ACPX vean las herramientas del plugin de OpenClaw, habilita el
puente de plugin ACPX del lado del gateway en lugar de intentar pasar `mcpServers` por sesión.
Consulta [ACP Agents](/en/tools/acp-agents#plugin-tools-mcp-bridge).

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si quieres que un agente de codificación como Codex o Claude Code se comunique con tu
bot de OpenClaw a través de ACP, usa `acpx` con su objetivo `openclaw` incorporado.

Flujo típico:

1. Ejecuta el Gateway y asegúrate de que el puente ACP pueda alcanzarlo.
2. Apunta `acpx openclaw` a `openclaw acp`.
3. Apunta a la clave de sesión de OpenClaw que quieres que use el agente de codificación.

Ejemplos:

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si quieres que `acpx openclaw` apunte a un Gateway y una clave de sesión específicos cada
vez, anula el comando del agente `openclaw` en `~/.acpx/config.json`:

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

Para una copia local de OpenClaw en un repositorio, usa el punto de entrada directo de la CLI en lugar del
ejecutador de desarrollo para que el flujo ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente con capacidad ACP
extraiga información contextual de un agente de OpenClaw sin raspar una terminal.

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

## Mapeo de sesión

De forma predeterminada, las sesiones ACP obtienen una clave de sesión de Gateway aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pasa una clave de sesión o etiqueta:

- `--session <key>`: usa una clave de sesión de Gateway específica.
- `--session-label <label>`: resuelve una sesión existente por etiqueta.
- `--reset-session`: genera un nuevo ID de sesión para esa clave (misma clave, nueva transcripción).

Si tu cliente ACP admite metadatos, puedes anularlos por sesión:

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

Más información sobre las claves de sesión en [/concepts/session](/en/concepts/session).

## Opciones

- `--url <url>`: URL de WebSocket de Gateway (por defecto es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación de Gateway.
- `--token-file <path>`: leer token de autenticación de Gateway desde archivo.
- `--password <password>`: contraseña de autenticación de Gateway.
- `--password-file <path>`: leer contraseña de autenticación de Gateway desde archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada a resolver.
- `--require-existing`: fallar si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablecer la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no prefijar los prompts con el directorio de trabajo.
- `--provenance <off|meta|meta+receipt>`: incluir metadatos de procedencia ACP o recibos.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en listas de procesos locales en algunos sistemas.
- Se prefiere `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación de Gateway sigue el contrato compartido utilizado por otros clientes de Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` fallback solo cuando `gateway.auth.*` no está configurado (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con env/config fallback según reglas de precedencia remotas
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de config/env; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución ACP reciben `OPENCLAW_SHELL=acp`, que se puede usar para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activar el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

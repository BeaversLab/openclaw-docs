---
summary: "Ejecuta el puente ACP para integraciones con IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

Ejecuta el puente del [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) que se comunica con una puerta de enlace (Gateway) de OpenClaw.

Este comando habla ACP a través de stdio para los IDE y reenvía los mensajes a la puerta de enlace
a través de WebSocket. Mantiene las sesiones de ACP mapeadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por la puerta de enlace, no un tiempo de ejecución de editor completamente nativo de ACP.
Se centra en el enrutamiento de sesiones, la entrega de mensajes y las actualizaciones básicas de transmisión.

Si desea que un cliente MCP externo hable directamente con las conversaciones del canal de OpenClaw en lugar de alojar una sesión de arnés ACP, use
[`openclaw mcp serve`](/en/cli/mcp) en su lugar.

## Matriz de Compatibilidad

| Área ACP                                                                               | Estado        | Notas                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                         | Implementado  | Flujo de puente central a través de stdio hacia chat/envío + cancelación de Gateway.                                                                                                                                                                                                                                    |
| `listSessions`, comandos de barra diagonal                                             | Implementado  | La lista de sesiones funciona contra el estado de la sesión de Gateway; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                               |
| `loadSession`                                                                          | Parcial       | Vincula la sesión ACP a una clave de sesión de Gateway y reproduce el historial de texto de usuario/asistente almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                                   |
| Contenido del mensaje (`text`, `resource` incrustado, imágenes)                        | Parcial       | Los recursos/textos se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos de Gateway.                                                                                                                                                                                                      |
| Modos de sesión                                                                        | Parcial       | Se admite `session/set_mode` y el puente expone controles de sesión iniciales respaldados por Gateway para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones elevadas. Las superficies de modos/configuraciones nativas de ACP más amplias siguen estando fuera del alcance. |
| Información de sesión y actualizaciones de uso                                         | Parcial       | El puente emite `session_info_update` y notificaciones de mejor esfuerzo `usage_update` desde instantáneas de sesión de Gateway en caché. El uso es aproximado y solo se envía cuando los totales de tokens de Gateway están marcados como recientes.                                                                   |
| Transmisión de herramientas                                                            | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de herramientas de Gateway los exponen. Las terminales incrustadas y las salidas más ricas nativas de comparación (diff) aún no se exponen.      |
| Servidores MCP por sesión (`mcpServers`)                                               | No compatible | El modo puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace (gateway) de OpenClaw o en el agente en su lugar.                                                                                                                                                               |
| Métodos de sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                               |
| Métodos de terminal del cliente (`terminal/*`)                                         | No compatible | El puente no crea terminales de cliente ACP ni transmite ids de terminal a través de llamadas a herramientas.                                                                                                                                                                                                           |
| Planes de sesión / transmisión de pensamientos                                         | No compatible | El puente actualmente emite texto de salida y estado de la herramienta, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                             |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto almacenado del usuario y del asistente, pero no reconstruye las llamadas a herramientas históricas, avisos del sistema ni tipos de eventos nativos de ACP más enriquecidos.
- Si varios clientes ACP comparten la misma clave de sesión del Gateway, el enrutamiento de eventos y cancelaciones se realiza con el mejor esfuerzo posible en lugar de estar estrictamente aislado por cliente. Prefiera las sesiones aisladas `acp:<uuid>` predeterminadas cuando necesite turnos locales limpios en el editor.
- Los estados de detención del Gateway se traducen en motivos de detención de ACP, pero esa asignación es menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto enfocado de controles del Gateway: nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones elevadas. La selección del modelo y los controles de host de ejecución aún no se exponen como opciones de configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión del Gateway, no de la contabilidad en tiempo de ejecución nativa de ACP en vivo. El uso es aproximado, no lleva datos de costos y solo se emite cuando el Gateway marca los datos totales de tokens como actualizados.
- Los datos de seguimiento de herramientas se realizan con el mejor esfuerzo posible. El puente puede exponer rutas de archivo que aparecen en argumentos/resultados de herramientas conocidas, pero aún no emite terminales ACP ni diferencias de archivo estructuradas.

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

Use el cliente ACP integrado para verificar la cordura del puente sin un IDE. Genera el puente ACP y le permite escribir indicaciones de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en listas de permitidos y solo se aplica a IDs de herramientas centrales de confianza.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando se establece).
- ACP solo aprueba automáticamente clases de solo lectura estrechas: llamadas con alcance `read` bajo el directorio de trabajo actual además de herramientas de búsqueda de solo lectura (`search`, `web_search`, `memory_search`). Las herramientas desconocidas/no principales, las lecturas fuera de alcance, las herramientas con capacidad de ejecución, las herramientas del plano de control, las herramientas de mutación y los flujos interactivos siempre requieren una aprobación explícita del prompt.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).
- Esta política del puente ACP es separada de los permisos del arnés ACPX. Si ejecutas OpenClaw a través del backend `acpx`, `plugins.entries.acpx.config.permissionMode=approve-all` es el interruptor de emergencia "yolo" para esa sesión del arnés.

## Cómo usar esto

Usa ACP cuando un IDE (u otro cliente) hable el Protocolo de Cliente de Agente y quieras
que impulse una sesión de OpenClaw Gateway.

1. Asegúrate de que el Gateway se esté ejecutando (local o remoto).
2. Configura el destino del Gateway (configuración o flags).
3. Apunta tu IDE para ejecutar `openclaw acp` a través de stdio.

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

## Seleccionar agentes

ACP no elige agentes directamente. Se enruta por la clave de sesión del Gateway.

Usa claves de sesión con alcance de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión de ACP se asigna a una única clave de sesión del Gateway. Un agente puede tener muchas
sesiones; ACP por defecto a una sesión aislada `acp:<uuid>` a menos que anules
la clave o la etiqueta.

Los `mcpServers` por sesión no son compatibles en modo puente. Si un cliente ACP
los envía durante `newSession` o `loadSession`, el puente devuelve un error
claro en lugar de ignorarlos silenciosamente.

Si quieres que las sesiones respaldadas por ACPX vean las herramientas de complemento de OpenClaw, habilita el
puente de complementos ACPX del lado del gateway en lugar de intentar pasar `mcpServers`
por sesión. Consulta [ACP Agents](/en/tools/acp-agents#plugin-tools-mcp-bridge).

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si quieres que un agente de codificación como Codex o Claude Code hable con tu
bot de OpenClaw a través de ACP, usa `acpx` con su destino `openclaw`
incorporado.

Flujo típico:

1. Ejecuta el Gateway y asegúrate de que el puente ACP pueda alcanzarlo.
2. Apunte `acpx openclaw` a `openclaw acp`.
3. Apunte a la clave de sesión de OpenClaw que desea que use el agente de codificación.

Ejemplos:

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

Si desea que `acpx openclaw` apunte a una Gateway y clave de sesión específicas cada
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

Para una copia local de OpenClaw en el repositorio, use el punto de entrada directo de CLI en lugar del
ejecutor de desarrollo para que el flujo de ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente OpenClaw sin raspar un terminal.

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

Para apuntar a una Gateway o agente específico:

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

De forma predeterminada, las sesiones ACP obtienen una clave de sesión de Gateway aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pase una clave o etiqueta de sesión:

- `--session <key>`: use una clave de sesión de Gateway específica.
- `--session-label <label>`: resuelva una sesión existente por etiqueta.
- `--reset-session`: genere un nuevo ID de sesión para esa clave (misma clave, nueva transcripción).

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

Obtenga más información sobre las claves de sesión en [/concepts/session](/en/concepts/session).

## Opciones

- `--url <url>`: URL de WebSocket de Gateway (por defecto es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación de Gateway.
- `--token-file <path>`: leer el token de autenticación de Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación de Gateway.
- `--password-file <path>`: leer la contraseña de autenticación de Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada a resolver.
- `--require-existing`: falla si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablezca la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no prefije los prompts con el directorio de trabajo.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en los listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` reserva solo cuando `gateway.auth.*` no está establecido (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con reserva env/config según las reglas de precedencia remotas
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de config/env; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que puede usarse para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### Opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

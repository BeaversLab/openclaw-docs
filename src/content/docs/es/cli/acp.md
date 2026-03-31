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

Si desea que un cliente MCP externo se comunique directamente con las conversaciones del canal de OpenClaw en lugar de alojar una sesión de arnés ACP, use
[`openclaw mcp serve`](/en/cli/mcp) en su lugar.

## Matriz de Compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo de puente principal a través de stdio hacia el chat/envío de Gateway + abortar.                                                                                                                                                                                                                                 |
| `listSessions`, comandos de barra                                                       | Implementado  | La lista de sesiones funciona con el estado de la sesión de Gateway; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                                |
| `loadSession`                                                                           | Parcial       | Vincula la sesión ACP a una clave de sesión de Gateway y reproduce el historial de texto de usuario/assistente almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                                |
| Contenido del aviso (`text`, `resource` incrustado, imágenes)                           | Parcial       | Los recursos/texto se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos de Gateway.                                                                                                                                                                                                     |
| Modos de sesión                                                                         | Parcial       | Se admite `session/set_mode` y el puente expone controles de sesión respaldados por el Gateway iniciales para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalles de uso y acciones elevadas. Las superficies de modo/configuración nativas de ACP más amplias siguen fuera de alcance.       |
| Información de sesión y actualizaciones de uso                                          | Parcial       | El puente emite notificaciones `session_info_update` y `usage_update` de mejor esfuerzo a partir de instantáneas de sesión del Gateway en caché. El uso es aproximado y solo se envía cuando los totales de tokens del Gateway están marcados como recientes.                                                         |
| Transmisión de herramientas                                                             | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivos de mejor esfuerzo cuando los argumentos/resultados de las herramientas del Gateway los exponen. Las terminales integradas y la salida nativa de diferencias más rica todavía no están expuestas. |
| Servidores MCP por sesión (`mcpServers`)                                                | No compatible | El modo de puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace o agente de OpenClaw en su lugar.                                                                                                                                                                          |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                             |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite identificadores de terminal a través de llamadas a herramientas.                                                                                                                                                                                             |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | Actualmente, el puente emite texto de salida y el estado de las herramientas, no actualizaciones de planes o pensamientos de ACP.                                                                                                                                                                                     |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto almacenado del usuario y del asistente, pero no
  reconstruye las llamadas a herramientas históricas, los avisos del sistema ni los tipos de eventos
  nativos de ACP más completos.
- Si varios clientes ACP comparten la misma clave de sesión de Gateway, el enrutamiento de eventos y cancelaciones
  se realiza sobre una base de mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Se prefieren las
  sesiones `acp:<uuid>` aisladas predeterminadas cuando se necesiten turnos
  locales limpios en el editor.
- Los estados de detención de Gateway se traducen en motivos de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto centrado de perillas de Gateway:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones
  elevadas. La selección del modelo y los controles de host de ejecución aún no se exponen como opciones de
  configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas
  de sesión de Gateway, no de la contabilidad en tiempo de ejecución nativa en vivo de ACP. El uso es aproximado,
  no contiene datos de costos y solo se emite cuando Gateway marca los datos totales de
  tokens como recientes.
- Los datos de seguimiento de herramientas se realizan sobre una base de mejor esfuerzo. El puente puede mostrar rutas de archivo que
  aparecen en argumentos/resultados de herramientas conocidos, pero aún no emite terminales ACP ni
  diferencias de archivos estructuradas.

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

Use el cliente ACP integrado para realizar una comprobación de cordura del puente sin un IDE.
Genera el puente ACP y le permite escribir mensajes de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en listas de permitidos y solo se aplica a los ID de herramientas principales confiables.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando está configurado).
- Los nombres de herramientas desconocidos/no principales, las lecturas fuera del ámbito y las herramientas peligrosas siempre requieren una aprobación explícita del mensaje.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable el Protocolo de Cliente de Agente y desea
que dirija una sesión de OpenClaw Gateway.

1. Asegúrese de que Gateway se esté ejecutando (local o remoto).
2. Configure el objetivo de Gateway (configuración o indicadores).
3. Configure su IDE para ejecutar `openclaw acp` a través de stdio.

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

## Selección de agentes

ACP no elige agentes directamente. Se enruta por la clave de sesión de Gateway.

Use claves de sesión con alcance de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión ACP se asigna a una sola clave de sesión de Gateway. Un agente puede tener muchas
sesiones; ACP usa por defecto una sesión `acp:<uuid>` aislada a menos que anule
la clave o la etiqueta.

Los `mcpServers` por sesión no son compatibles en el modo puente. Si un cliente ACP
los envía durante `newSession` o `loadSession`, el puente devuelve un error
claro en lugar de ignorarlos silenciosamente.

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si desea que un agente de codificación como Codex o Claude Code se comunique con su
bot de OpenClaw a través de ACP, use `acpx` con su destino `openclaw` incorporado.

Flujo típico:

1. Ejecute el Gateway y asegúrese de que el puente ACP pueda alcanzarlo.
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

Para una copia local de OpenClaw en el repositorio, use el punto de entrada directo de la CLI en lugar del
ejecutor de desarrollo (dev runner) para que el flujo ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente de OpenClaw sin raspar un terminal.

## Configuración del editor Zed

Agregue un agente ACP personalizado en `~/.config/zed/settings.json` (o use la interfaz de usuario de configuración de Zed):

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

De forma predeterminada, las sesiones de ACP obtienen una clave de sesión de Gateway aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pase una clave de sesión o etiqueta:

- `--session <key>`: use una clave de sesión de Gateway específica.
- `--session-label <label>`: resuelva una sesión existente por etiqueta.
- `--reset-session`: genere un nuevo id. de sesión para esa clave (misma clave, nueva transcripción).

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

Obtenga más información sobre las claves de sesión en [/concepts/session](/en/concepts/session).

## Opciones

- `--url <url>`: URL de WebSocket de Gateway (el valor predeterminado es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación de Gateway.
- `--token-file <path>`: lea el token de autenticación de Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación de Gateway.
- `--password-file <path>`: leer la contraseña de autenticación del Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada para resolver.
- `--require-existing`: fallar si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablecer la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no prefijar los mensajes con el directorio de trabajo.
- `--verbose, -v`: registro detallado a stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en los listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` fallback solo cuando `gateway.auth.*` no está establecido (los SecretRefs locales configurados pero no resuertos fallan cerrados)
  - modo remoto: `gateway.remote.*` con fallback env/config según las reglas de precedencia remota
  - `--url` es seguro ante sobrescrituras y no reutiliza credenciales implícitas de config/env; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que puede usarse para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### Opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

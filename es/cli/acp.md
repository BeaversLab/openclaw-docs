---
summary: "Ejecuta el puente ACP para integraciones con IDE"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

Ejecuta el puente del [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) que se comunica con un OpenClaw Gateway.

Este comando habla ACP a través de stdio para los IDE y reenvía los mensajes a la puerta de enlace
a través de WebSocket. Mantiene las sesiones de ACP mapeadas a las claves de sesión de la puerta de enlace.

`openclaw acp` es un puente ACP respaldado por la puerta de enlace, no un tiempo de ejecución de editor completamente nativo de ACP.
Se centra en el enrutamiento de sesiones, la entrega de mensajes y las actualizaciones básicas de transmisión.

## Matriz de compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo de puente central a través de stdio hacia chat/envío de puerta de enlace + abortar.                                                                                                                                                                                                                                             |
| `listSessions`, comandos de barra diagonal                                              | Implementado  | La lista de sesiones funciona contra el estado de la sesión de la puerta de enlace; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                                 |
| `loadSession`                                                                           | Parcial       | Vincula la sesión ACP a una clave de sesión de la puerta de enlace y reproduce el historial de texto de usuario/asistente almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                                     |
| Contenido del mensaje (`text`, `resource` incrustado, imágenes)                         | Parcial       | Los textos/recursos se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos de la puerta de enlace.                                                                                                                                                                                                        |
| Modos de sesión                                                                         | Parcial       | `session/set_mode` es compatible y el puente expone controles de sesión iniciales respaldados por la puerta de enlace para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones elevadas. Las superficies de modos/configuración nativas más amplias de ACP siguen estando fuera del alcance. |
| Información de sesión y actualizaciones de uso                                          | Parcial       | El puente emite notificaciones `session_info_update` y `usage_update` de mejor esfuerzo a partir de instantáneas de sesión de la puerta de enlace en caché. El uso es aproximado y solo se envía cuando los totales de tokens de la puerta de enlace están marcados como recientes.                                                   |
| Transmisión de herramientas                                                             | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de la herramienta de la puerta de enlace los exponen. Las terminales incrustadas y una salida más rica nativa de diferencias aún no se exponen.                |
| Servidores MCP por sesión (`mcpServers`)                                                | No compatible | El modo puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace OpenClaw o en el agente.                                                                                                                                                                                                      |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                                             |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite IDs de terminal a través de llamadas a herramientas.                                                                                                                                                                                                                         |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | El puente actualmente emite texto de salida y estado de las herramientas, no actualizaciones de planes ni pensamientos de ACP.                                                                                                                                                                                                        |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto almacenado del usuario y del asistente, pero no
  reconstruye las llamadas a herramientas históricas, avisos del sistema ni tipos de eventos
  nativos más ricos de ACP.
- Si varios clientes ACP comparten la misma clave de sesión de Gateway, el enrutamiento de eventos y cancelaciones
  se realiza con el mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las
  sesiones `acp:<uuid>` aisladas predeterminadas cuando necesite turnos limpios y locales del editor.
- Los estados de detención del Gateway se traducen en motivos de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto centrado de controles del Gateway:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones
  elevadas. La selección del modelo y los controles de host de ejecución aún no están expuestos como opciones
  de configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión del
  Gateway, no de la contabilidad del tiempo de ejecución nativo de ACP en vivo. El uso es aproximado,
  no contiene datos de costos y solo se emite cuando el Gateway marca los datos totales de tokens
  como recientes.
- Los datos de seguimiento de herramientas se realizan con el mejor esfuerzo. El puente puede exponer rutas de archivo que
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

Use el cliente ACP integrado para verificar la cordura del puente sin un IDE.
Inicia el puente ACP y le permite escribir mensajes de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en listas permitidas y solo se aplica a IDs de herramientas centrales de confianza.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando se establece).
- Los nombres de herramientas desconocidos/no centrales, las lecturas fuera de alcance y las herramientas peligrosas siempre requieren aprobación explícita en el prompt.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) habla el Protocolo de Cliente de Agente (Agent Client Protocol) y desea
que controle una sesión de OpenClaw Gateway.

1. Asegúrese de que el Gateway se esté ejecutando (local o remoto).
2. Configure el destino del Gateway (configuración o indicadores).
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

ACP no elige los agentes directamente. Se enruta mediante la clave de sesión del Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión ACP se asigna a una sola clave de sesión del Gateway. Un agente puede tener muchas
sesiones; ACP usa de forma predeterminada una sesión `acp:<uuid>` aislada a menos que anule
la clave o la etiqueta.

Las `mcpServers` por sesión no son compatibles con el modo puente. Si un cliente ACP
las envía durante `newSession` o `loadSession`, el puente devuelve un error
claro en lugar de ignorarlas silenciosamente.

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si desea que un agente de codificación como Codex o Claude Code hable con su
bot de OpenClaw a través de ACP, use `acpx` con su destino `openclaw` integrado.

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

Para una copia local de OpenClaw en el repositorio, use el punto de entrada CLI directo en lugar del
ejecutor de desarrollo para que el flujo ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente de OpenClaw sin raspar un terminal.

## Configuración del editor Zed

Añada un agente ACP personalizado en `~/.config/zed/settings.json` (o use la Interfaz de usuario de Configuración de Zed):

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
      "args": [
        "acp",
        "--url",
        "wss://gateway-host:18789",
        "--token",
        "<token>",
        "--session",
        "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

En Zed, abra el panel Agente y seleccione "OpenClaw ACP" para iniciar un hilo.

## Mapeo de sesión

De forma predeterminada, las sesiones ACP obtienen una clave de sesión de Gateway aislada con un prefijo `acp:`.
Para reutilizar una sesión conocida, pase una clave de sesión o etiqueta:

- `--session <key>`: use una clave de sesión de Gateway específica.
- `--session-label <label>`: resuelva una sesión existente por etiqueta.
- `--reset-session`: genere un nuevo id de sesión para esa clave (misma clave, nueva transcripción).

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
- `--token-file <path>`: leer token de autenticación del Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación del Gateway.
- `--password-file <path>`: leer contraseña de autenticación del Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada a resolver.
- `--require-existing`: fallar si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablecer la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no prefijar los prompts con el directorio de trabajo.
- `--verbose, -v`: registro detallado a stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en listados de procesos locales en algunos sistemas.
- Prefiera `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación del Gateway sigue el contrato compartido utilizado por otros clientes del Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` fallback solo cuando `gateway.auth.*` no está configurado (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con respaldo env/config según las reglas de precedencia de cada remoto
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de configuración/entorno; pase `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que se puede usar para reglas específicas de contexto de shell/perfil.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### Opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

import es from "/components/footer/es.mdx";

<es />

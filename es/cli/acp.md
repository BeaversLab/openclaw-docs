---
summary: "Ejecuta el puente ACP para integraciones de IDE"
read_when:
  - Configurar integraciones de IDE basadas en ACP
  - Depuración del enrutamiento de sesiones ACP hacia la Gateway
title: "acp"
---

# acp

Ejecuta el puente del [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) que se comunica con una OpenClaw Gateway.

Este comando habla ACP a través de stdio para los IDE y reenvía los mensajes a la Gateway
a través de WebSocket. Mantiene las sesiones ACP asignadas a las claves de sesión de la Gateway.

`openclaw acp` es un puente ACP respaldado por Gateway, no un tiempo de ejecución completo de editor nativo de ACP.
Se centra en el enrutamiento de sesiones, la entrega de mensajes y las actualizaciones básicas de transmisión.

## Matriz de compatibilidad

| Área ACP                                                                                | Estado        | Notas                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                                          | Implementado  | Flujo del puente principal a través de stdio hacia chat/send + abort de la Gateway.                                                                                                                                                                                                                                   |
| `listSessions`, comandos de barra diagonal                                              | Implementado  | La lista de sesiones funciona sobre el estado de sesión de la Gateway; los comandos se anuncian a través de `available_commands_update`.                                                                                                                                                                              |
| `loadSession`                                                                           | Parcial       | Vincula la sesión ACP a una clave de sesión de Gateway y reproduce el historial de texto de usuario/asistente almacenado. El historial de herramientas/sistema aún no se reconstruye.                                                                                                                                 |
| Contenido del mensaje (`text`, `resource` incrustado, imágenes)                         | Parcial       | Los recursos/texto se aplanan en la entrada del chat; las imágenes se convierten en archivos adjuntos de la Gateway.                                                                                                                                                                                                  |
| Modos de sesión                                                                         | Parcial       | `session/set_mode` es compatible y el puente expone controles de sesión iniciales respaldados por Gateway para el nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones elevadas. Las superficies de modos/configuraciones nativas más amplias de ACP aún están fuera de alcance. |
| Información de sesión y actualizaciones de uso                                          | Parcial       | El puente emite notificaciones `session_info_update` y `usage_update` de mejor esfuerzo a partir de instantáneas de sesión de Gateway en caché. El uso es aproximado y solo se envía cuando los totales de tokens de Gateway se marcan como recientes.                                                                |
| Transmisión de herramientas                                                             | Parcial       | Los eventos `tool_call` / `tool_call_update` incluyen E/S sin procesar, contenido de texto y ubicaciones de archivo de mejor esfuerzo cuando los argumentos/resultados de las herramientas de la Gateway los exponen. Las terminales integradas y los resultados más ricos nativos de diferencias aún no se exponen.  |
| Servidores MCP por sesión (`mcpServers`)                                                | No compatible | El modo puente rechaza las solicitudes de servidor MCP por sesión. Configure MCP en la puerta de enlace OpenClaw o en el agente.                                                                                                                                                                                      |
| Métodos del sistema de archivos del cliente (`fs/read_text_file`, `fs/write_text_file`) | No compatible | El puente no llama a los métodos del sistema de archivos del cliente ACP.                                                                                                                                                                                                                                             |
| Métodos de terminal del cliente (`terminal/*`)                                          | No compatible | El puente no crea terminales de cliente ACP ni transmite IDs de terminal a través de llamadas a herramientas.                                                                                                                                                                                                         |
| Planes de sesión / transmisión de pensamientos                                          | No compatible | Actualmente, el puente emite texto de salida y estado de las herramientas, no actualizaciones de planes ni pensamientos de ACP.                                                                                                                                                                                       |

## Limitaciones conocidas

- `loadSession` reproduce el historial de texto almacenado del usuario y del asistente, pero no
  reconstruye las llamadas a herramientas históricas, avisos del sistema ni tipos de eventos
  más ricos nativos de ACP.
- Si varios clientes ACP comparten la misma clave de sesión de la puerta de enlace, el enrutamiento de eventos y cancelaciones
  se realiza sobre una base de mejor esfuerzo en lugar de estar estrictamente aislado por cliente. Prefiera las
  sesiones aisladas predeterminadas `acp:<uuid>` cuando necesite turnos limpios locales del editor.
- Los estados de detención de la puerta de enlace se traducen en razones de detención de ACP, pero esa asignación es
  menos expresiva que un tiempo de ejecución completamente nativo de ACP.
- Los controles de sesión iniciales actualmente exponen un subconjunto centrado de perillas de la puerta de enlace:
  nivel de pensamiento, verbosidad de herramientas, razonamiento, detalle de uso y acciones
  elevadas. Los controles de selección de modelo y host de ejecución aún no se exponen como opciones de configuración de ACP.
- `session_info_update` y `usage_update` se derivan de instantáneas de sesión de la
  puerta de enlace, no de la contabilidad en tiempo de ejecución nativa de ACP en vivo. El uso es aproximado,
  no contiene datos de costos y solo se emite cuando la puerta de enlace marca los datos totales de tokens
  como recientes.
- Los datos de seguimiento de herramientas son sobre una base de mejor esfuerzo. El puente puede exponer rutas de archivo que
  aparecen en argumentos/resultados de herramientas conocidos, pero aún no emite terminales ACP ni
  diferencias de archivo estructuradas.

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

Use el cliente ACP integrado para verificar la integridad del puente sin un IDE.
Genera el puente ACP y le permite escribir indicaciones de forma interactiva.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Modelo de permisos (modo de depuración del cliente):

- La aprobación automática se basa en listas de permitidos y solo se aplica a IDs de herramientas básicas confiables.
- La aprobación automática de `read` está limitada al directorio de trabajo actual (`--cwd` cuando se establece).
- Los nombres de herramientas desconocidos o no principales, las lecturas fuera del ámbito y las herramientas peligrosas siempre requieren una aprobación explícita del prompt.
- El `toolCall.kind` proporcionado por el servidor se trata como metadatos no confiables (no una fuente de autorización).

## Cómo usar esto

Use ACP cuando un IDE (u otro cliente) hable el Protocolo de Cliente de Agente y usted quiera
que impulse una sesión de OpenClaw Gateway.

1. Asegúrese de que Gateway se esté ejecutando (local o remoto).
2. Configure el destino de Gateway (configuración o marcas).
3. Dirija su IDE para ejecutar `openclaw acp` a través de stdio.

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

ACP no elige los agentes directamente. Enruta mediante la clave de sesión de Gateway.

Use claves de sesión con ámbito de agente para apuntar a un agente específico:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Cada sesión de ACP se asigna a una sola clave de sesión de Gateway. Un agente puede tener muchas
sesiones; ACP usa de forma predeterminada una sesión aislada `acp:<uuid>` a menos que anule
la clave o etiqueta.

Los `mcpServers` por sesión no son compatibles con el modo puente. Si un cliente ACP
los envía durante `newSession` o `loadSession`, el puente devuelve un
error claro en lugar de ignorarlos silenciosamente.

## Uso desde `acpx` (Codex, Claude, otros clientes ACP)

Si desea que un agente de codificación como Codex o Claude Code hable con su
bot OpenClaw a través de ACP, use `acpx` con su destino `openclaw` integrado.

Flujo típico:

1. Ejecute Gateway y asegúrese de que el puente ACP pueda alcanzarlo.
2. Apunte `acpx openclaw` a `openclaw acp`.
3. Apunte a la clave de sesión de OpenClaw que desee que use el agente de codificación.

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

Para una descarga local de OpenClaw en el repositorio, use el punto de entrada directo de la CLI en lugar del
ejecutor de desarrollo para que el flujo ACP se mantenga limpio. Por ejemplo:

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

Esta es la forma más fácil de permitir que Codex, Claude Code u otro cliente compatible con ACP
extraiga información contextual de un agente OpenClaw sin realizar scraping en una terminal.

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
- `--reset-session`: genere un nuevo ID de sesión para esa clave (misma clave, nueva transcripción).

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

- `--url <url>`: URL de WebSocket de Gateway (el valor predeterminado es gateway.remote.url cuando está configurado).
- `--token <token>`: token de autenticación de Gateway.
- `--token-file <path>`: lea el token de autenticación de Gateway desde un archivo.
- `--password <password>`: contraseña de autenticación de Gateway.
- `--password-file <path>`: lea la contraseña de autenticación de Gateway desde un archivo.
- `--session <key>`: clave de sesión predeterminada.
- `--session-label <label>`: etiqueta de sesión predeterminada a resolver.
- `--require-existing`: fallar si la clave/etiqueta de sesión no existe.
- `--reset-session`: restablezca la clave de sesión antes del primer uso.
- `--no-prefix-cwd`: no anteponer los avisos con el directorio de trabajo.
- `--verbose, -v`: registro detallado en stderr.

Nota de seguridad:

- `--token` y `--password` pueden ser visibles en listas de procesos locales en algunos sistemas.
- Preferiblemente use `--token-file`/`--password-file` o variables de entorno (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`).
- La resolución de autenticación de Gateway sigue el contrato compartido utilizado por otros clientes de Gateway:
  - modo local: env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` respaldo solo cuando `gateway.auth.*` no está establecido (los SecretRefs locales configurados pero no resueltos fallan cerrados)
  - modo remoto: `gateway.remote.*` con respaldo en env/config según las reglas de precedencia remota
  - `--url` es seguro ante anulaciones y no reutiliza credenciales implícitas de config/env; pasa `--token`/`--password` explícitos (o variantes de archivo)
- Los procesos secundarios del backend de tiempo de ejecución de ACP reciben `OPENCLAW_SHELL=acp`, que se pueden usar para reglas de shell/perfil específicas del contexto.
- `openclaw acp client` establece `OPENCLAW_SHELL=acp-client` en el proceso puente generado.

### opciones de `acp client`

- `--cwd <dir>`: directorio de trabajo para la sesión ACP.
- `--server <command>`: comando del servidor ACP (predeterminado: `openclaw`).
- `--server-args <args...>`: argumentos adicionales pasados al servidor ACP.
- `--server-verbose`: activa el registro detallado en el servidor ACP.
- `--verbose, -v`: registro detallado del cliente.

import es from "/components/footer/es.mdx";

<es />

---
summary: "Expone las conversaciones del canal de OpenClaw a través de MCP y gestiona las definiciones guardadas del servidor MCP"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "mcp"
---

# mcp

`openclaw mcp` tiene dos trabajos:

- ejecutar OpenClaw como un servidor MCP con `openclaw mcp serve`
- gestionar las definiciones de servidores MCP salientes propiedad de OpenClaw con `list`, `show`,
  `set` y `unset`

En otras palabras:

- `serve` es OpenClaw actuando como un servidor MCP
- `list` / `show` / `set` / `unset` es OpenClaw actuando como un registro del lado del cliente MCP
  para otros servidores MCP que sus runtimes pueden consumir más tarde

Use [`openclaw acp`](/es/cli/acp) cuando OpenClaw debe alojar una sesión de
arnés de codificación y enrutar ese tiempo de ejecución a través de ACP.

## OpenClaw como un servidor MCP

Esta es la ruta `openclaw mcp serve`.

## Cuándo usar `serve`

Use `openclaw mcp serve` cuando:

- Codex, Claude Code u otro cliente MCP debe hablar directamente con las
  conversaciones de canal respaldadas por OpenClaw
- ya tienes un Gateway de OpenClaw local o remoto con sesiones enrutadas
- quieres un servidor MCP que funcione en los backends de canal de OpenClaw en lugar
  de ejecutar puentes separados por canal

Use [`openclaw acp`](/es/cli/acp) en su lugar cuando OpenClaw debe alojar el tiempo de
ejecución de codificación y mantener la sesión del agente dentro de OpenClaw.

## Cómo funciona

`openclaw mcp serve` inicia un servidor MCP stdio. El cliente MCP posee ese
proceso. Mientras el cliente mantiene la sesión stdio abierta, el puente se conecta a un
Gateway de OpenClaw local o remoto a través de WebSocket y expone las conversaciones
de canal enrutadas a través de MCP.

Ciclo de vida:

1. el cliente MCP genera `openclaw mcp serve`
2. el puente se conecta al Gateway
3. las sesiones enrutadas se convierten en conversaciones MCP y herramientas de transcripción/historial
4. los eventos en vivo se ponen en cola en la memoria mientras el puente está conectado
5. si el modo de canal Claude está habilitado, la misma sesión también puede recibir
   notificaciones push específicas de Claude

Comportamiento importante:

- el estado en vivo de la cola comienza cuando el puente se conecta
- el historial de transcripciones antiguo se lee con `messages_read`
- las notificaciones push de Claude solo existen mientras la sesión MCP está activa
- cuando el cliente se desconecta, el puente se cierra y la cola en vivo desaparece

## Elija un modo de cliente

Use el mismo puente de dos formas diferentes:

- Clientes MCP genéricos: solo herramientas MCP estándar. Use `conversations_list`,
  `messages_read`, `events_poll`, `events_wait`, `messages_send` y las
  herramientas de aprobación.
- Claude Code: herramientas MCP estándar más el adaptador de canal específico de Claude.
  Habilite `--claude-channel-mode on` o deje el predeterminado `auto`.

Hoy, `auto` se comporta igual que `on`. Aún no hay detección de capacidades del cliente.

## Lo que expone `serve`

El puente utiliza los metadatos de ruta de sesión de Gateway existentes para exponer conversaciones
respaldadas por canales. Una conversación aparece cuando OpenClaw ya tiene el estado de sesión
con una ruta conocida como:

- `channel`
- metadatos de destinatario o destino
- opcional `accountId`
- opcional `threadId`

Esto da a los clientes MCP un lugar para:

- listar conversaciones enrutadas recientes
- leer el historial de transcripciones reciente
- esperar nuevos eventos entrantes
- enviar una respuesta a través de la misma ruta
- ver solicitudes de aprobación que llegan mientras el puente está conectado

## Uso

```bash
# Local Gateway
openclaw mcp serve

# Remote Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Remote Gateway with password auth
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# Enable verbose bridge logs
openclaw mcp serve --verbose

# Disable Claude-specific push notifications
openclaw mcp serve --claude-channel-mode off
```

## Herramientas del puente

El puente actual expone estas herramientas MCP:

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

Enumera las conversaciones recientes respaldadas por sesión que ya tienen metadatos de ruta en
el estado de sesión de Gateway.

Filtros útiles:

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

Devuelve una conversación por `session_key`.

### `messages_read`

Lee mensajes de transcripción recientes para una conversación respaldada por sesión.

### `attachments_fetch`

Extrae bloques de contenido de mensajes no textuales de un mensaje de transcripción. Esto es una
vista de metadatos sobre el contenido de la transcripción, no un almacenamiento de blobs de adjuntos
durables independiente.

### `events_poll`

Lee eventos en vivo en cola desde un cursor numérico.

### `events_wait`

Realiza un sondeo largo (long-poll) hasta que llega el siguiente evento en cola coincidente o expira el tiempo de espera.

Úselo cuando un cliente MCP genérico necesite una entrega casi en tiempo real sin un
protocolo de inserción específico de Claude.

### `messages_send`

Envía texto de vuelta a través de la misma ruta ya registrada en la sesión.

Comportamiento actual:

- requiere una ruta de conversación existente
- utiliza el canal, el destinatario, el id de cuenta y el id de hilo de la sesión
- envía solo texto

### `permissions_list_open`

Enumera las solicitudes de aprobación de ejecución/complemento pendientes que el puente ha observado desde que
se conectó a la Pasarela (Gateway).

### `permissions_respond`

Resuelve una solicitud de aprobación de ejecución/complemento pendiente con:

- `allow-once`
- `allow-always`
- `deny`

## Modelo de eventos

El puente mantiene una cola de eventos en memoria mientras está conectado.

Tipos de eventos actuales:

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

Límites importantes:

- la cola es solo en vivo; comienza cuando se inicia el puente MCP
- `events_poll` y `events_wait` no reproducen el historial antiguo de la Pasarela (Gateway)
  por sí mismos
- el histórico duradero debe leerse con `messages_read`

## Notificaciones de canal de Claude

El puente también puede exponer notificaciones de canal específicas de Claude. Este es el
equivalente de OpenClaw de un adaptador de canal de Claude Code: las herramientas MCP estándar permanecen
disponibles, pero los mensajes entrantes en vivo también pueden llegar como notificaciones MCP
específicas de Claude.

Opciones:

- `--claude-channel-mode off`: solo herramientas MCP estándar
- `--claude-channel-mode on`: activar notificaciones del canal Claude
- `--claude-channel-mode auto`: predeterminado actual; mismo comportamiento del puente que `on`

Cuando el modo de canal Claude está activado, el servidor anuncia capacidades
experimentales de Claude y puede emitir:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportamiento actual del puente:

- los mensajes de transcripción `user` entrantes se reenvían como
  `notifications/claude/channel`
- las solicitudes de permiso de Claude recibidas a través de MCP se rastrean en memoria
- si la conversación vinculada más tarde envía `yes abcde` o `no abcde`, el puente
  lo convierte a `notifications/claude/channel/permission`
- estas notificaciones son solo de sesión en vivo; si el cliente MCP se desconecta,
  no hay objetivo de envío

Esto es intencionalmente específico del cliente. Los clientes MCP genéricos deben confiar en las
herramientas de sondeo estándar.

## Configuración del cliente MCP

Ejemplo de configuración de cliente stdio:

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve", "--url", "wss://gateway-host:18789", "--token-file", "/path/to/gateway.token"]
    }
  }
}
```

Para la mayoría de los clientes MCP genéricos, comience con la superficie de herramienta estándar e ignore
el modo Claude. Active el modo Claude solo para clientes que realmente entiendan los
métodos de notificación específicos de Claude.

## Opciones

`openclaw mcp serve` soporta:

- `--url <url>`: URL del WebSocket de Gateway
- `--token <token>`: token de Gateway
- `--token-file <path>`: leer token desde archivo
- `--password <password>`: contraseña de Gateway
- `--password-file <path>`: leer contraseña desde archivo
- `--claude-channel-mode <auto|on|off>`: modo de notificación Claude
- `-v`, `--verbose`: registros detallados en stderr

Prefiera `--token-file` o `--password-file` sobre secretos en línea cuando sea posible.

## Límite de seguridad y confianza

El puente no inventa el enrutamiento. Solo expone conversaciones que Gateway
ya sabe cómo enrutar.

Esto significa:

- las listas de permitidos de remitentes, el emparejamiento y la confianza a nivel de canal aún pertenecen a la
  configuración subyacente del canal OpenClaw
- `messages_send` solo puede responder a través de una ruta almacenada existente
- el estado de aprobación es solo en vivo/en memoria para la sesión actual del puente
- bridge auth debe usar los mismos controles de token o contraseña de Gateway que
  confiaría para cualquier otro cliente remoto de Gateway

Si falta una conversación en `conversations_list`, la causa habitual no es
la configuración de MCP. Son metadatos de ruta faltantes o incompletos en la sesión
subyacente de Gateway.

## Pruebas

OpenClaw incluye una prueba de humo determinista de Docker para este puente:

```bash
pnpm test:docker:mcp-channels
```

Esa prueba de humo:

- inicia un contenedor Gateway sembrado
- inicia un segundo contenedor que genera `openclaw mcp serve`
- verifica el descubrimiento de conversaciones, lecturas de transcripciones, lecturas de metadatos de archivos adjuntos,
  el comportamiento de la cola de eventos en vivo y el enrutamiento de envío saliente
- valida las notificaciones de canal y permisos estilo Claude a través del
  puente MCP stdio real

Esta es la forma más rápida de demostrar que el puente funciona sin conectar una cuenta
real de Telegram, Discord o iMessage a la ejecución de la prueba.

Para un contexto de pruebas más amplio, consulte [Testing](/es/help/testing).

## Solución de problemas

### No se devolvieron conversaciones

Generalmente significa que la sesión de Gateway aún no es enrutable. Confirme que la
sesión subyacente ha almacenado metadatos de ruta de canal/proveedor, destinatario y opcionales de
cuenta/hilo.

### `events_poll` o `events_wait` pierde mensajes antiguos

Esperado. La cola en vivo comienza cuando se conecta el puente. Lea el historial de transcripciones
antiguo con `messages_read`.

### Las notificaciones de Claude no aparecen

Compruebe todo esto:

- el cliente mantuvo abierta la sesión MCP stdio
- `--claude-channel-mode` es `on` o `auto`
- el cliente realmente entiende los métodos de notificación específicos de Claude
- el mensaje entrante ocurrió después de que el puente se conectó

### Faltan aprobaciones

`permissions_list_open` solo muestra solicitudes de aprobación observadas mientras el puente
estaba conectado. No es una API de historial de aprobaciones duradera.

## OpenClaw como registro de clientes MCP

Esta es la ruta `openclaw mcp list`, `show`, `set` y `unset`.

Estos comandos no exponen OpenClaw a través de MCP. Administran definiciones de servidor MCP
propiedad de OpenClaw bajo `mcp.servers` en la configuración de OpenClaw.

Esas definiciones guardadas son para los tiempos de ejecución que OpenClaw inicia o configura más tarde, como Pi integrado y otros adaptadores de tiempo de ejecución. OpenClaw almacena las definiciones de forma centralizada para que esos tiempos de ejecución no necesiten mantener sus propias listas duplicadas de servidores MCP.

Comportamiento importante:

- estos comandos solo leen o escriben la configuración de OpenClaw
- no se conectan al servidor MCP de destino
- no validan si el comando, la URL o el transporte remoto son accesibles en este momento
- los adaptadores de tiempo de ejecución deciden qué formas de transporte admiten realmente en tiempo de ejecución
- Pi integrado expone las herramientas MCP configuradas en perfiles de herramientas `coding` y `messaging`
  normales; `minimal` todavía las oculta, y `tools.deny: ["bundle-mcp"]`
  las deshabilita explícitamente

## Definiciones de servidor MCP guardadas

OpenClaw también almacena un registro ligero de servidores MCP en la configuración para superficies
que desean definiciones MCP administradas por OpenClaw.

Comandos:

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

Notas:

- `list` ordena los nombres de los servidores.
- `show` sin un nombre imprime el objeto completo del servidor MCP configurado.
- `set` espera un valor de objeto JSON en la línea de comandos.
- `unset` falla si el servidor nombrado no existe.

Ejemplos:

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

Forma de configuración de ejemplo:

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

### Transporte Stdio

Lanza un proceso secundario local y se comunica a través de stdin/stdout.

| Campo                      | Descripción                               |
| -------------------------- | ----------------------------------------- |
| `command`                  | Ejecutable para generar (requerido)       |
| `args`                     | Matriz de argumentos de línea de comandos |
| `env`                      | Variables de entorno adicionales          |
| `cwd` / `workingDirectory` | Directorio de trabajo para el proceso     |

#### Filtro de seguridad de entorno Stdio

OpenClaw rechaza las claves de entorno de inicio del intérprete que pueden alterar cómo se inicia un servidor MCP stdio antes del primer RPC, incluso si aparecen en el bloque `env` de un servidor. Las claves bloqueadas incluyen `NODE_OPTIONS`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` y variables de control de tiempo de ejecución similares. El inicio rechaza estas con un error de configuración para que no puedan inyectar un preludio implícito, intercambiar el intérprete o habilitar un depurador contra el proceso stdio. Las variables de entorno habituales de credenciales, proxy y específicas del servidor (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personalizadas, etc.) no se ven afectadas.

Si su servidor MCP realmente necesita una de las variables bloqueadas, configúrela en el proceso host de la puerta de enlace en lugar de bajo el `env` del servidor stdio.

### Transporte SSE / HTTP

Se conecta a un servidor MCP remoto a través de eventos enviados por el servidor HTTP (Server-Sent Events).

| Campo                 | Descripción                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP o HTTPS del servidor remoto (requerido)                                              |
| `headers`             | Mapa opcional de pares clave-valor de encabezados HTTP (por ejemplo, tokens de autenticación) |
| `connectionTimeoutMs` | Tiempo de espera de conexión por servidor en ms (opcional)                                    |

Ejemplo:

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Los valores sensibles en `url` (userinfo) y `headers` se redactan en los registros y
en la salida de estado.

### Transporte HTTP fluido

`streamable-http` es una opción de transporte adicional junto con `sse` y `stdio`. Utiliza streaming HTTP para la comunicación bidireccional con servidores MCP remotos.

| Campo                 | Descripción                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP o HTTPS del servidor remoto (requerido)                                                              |
| `transport`           | Establézcalo en `"streamable-http"` para seleccionar este transporte; cuando se omite, OpenClaw utiliza `sse` |
| `headers`             | Mapa opcional de pares clave-valor de encabezados HTTP (por ejemplo, tokens de autenticación)                 |
| `connectionTimeoutMs` | Tiempo de espera de conexión por servidor en ms (opcional)                                                    |

Ejemplo:

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Estos comandos solo gestionan la configuración guardada. No inician el puente del canal,
abren una sesión en vivo del cliente MCP ni demuestran que el servidor de destino es alcanzable.

## Límites actuales

Esta página documenta el puente tal como se entrega hoy.

Límites actuales:

- el descubrimiento de conversaciones depende de los metadatos de la ruta de la sesión de Gateway existente
- ningún protocolo de inserción genérico más allá del adaptador específico de Claude
- aún no hay herramientas de edición o reacción de mensajes
- el transporte HTTP/SSE/streamable-http se conecta a un solo servidor remoto; aún no hay flujo ascendente multiplexado
- `permissions_list_open` solo incluye las aprobaciones observadas mientras el puente está
  conectado

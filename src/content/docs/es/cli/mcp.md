---
summary: "Expone las conversaciones del canal OpenClaw a través de MCP y gestiona las definiciones de servidores MCP guardadas"
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
- `list` / `show` / `set` / `unset` es OpenClaw actuando como un registro del lado del cliente
  MCP para otros servidores MCP que sus runtimes puedan consumir más tarde

Use [`openclaw acp`](/en/cli/acp) cuando OpenClaw debe alojar una sesión de arnés de codificación
y enrutar ese runtime a través de ACP.

## OpenClaw como un servidor MCP

Este es el camino `openclaw mcp serve`.

## Cuándo usar `serve`

Use `openclaw mcp serve` cuando:

- Codex, Claude Code u otro cliente MCP debe hablar directamente con
  conversaciones de canales respaldadas por OpenClaw
- ya tiene una Gateway OpenClaw local o remota con sesiones enrutadas
- desea un servidor MCP que funcione en los backends de canales de OpenClaw en lugar
  de ejecutar puentes separados por canal

Use [`openclaw acp`](/en/cli/acp) en su lugar cuando OpenClaw debe alojar el tiempo de ejecución de codificación y mantener la sesión del agente dentro de OpenClaw.

## Cómo funciona

`openclaw mcp serve` inicia un servidor MCP stdio. El cliente MCP es el propietario de ese proceso. Mientras el cliente mantiene la sesión stdio abierta, el puente se conecta a un OpenClaw Gateway local o remoto a través de WebSocket y expone las conversaciones del canal enrutadas a través de MCP.

Ciclo de vida:

1. el cliente MCP genera `openclaw mcp serve`
2. el puente se conecta a Gateway
3. las sesiones enrutadas se convierten en conversaciones MCP y herramientas de transcripción/historial
4. los eventos en vivo se ponen en cola en la memoria mientras el puente está conectado
5. si el modo de canal Claude está habilitado, la misma sesión también puede recibir
   notificaciones push específicas de Claude

Comportamiento importante:

- el estado de la cola en vivo comienza cuando el puente se conecta
- el historial de transcripciones anterior se lee con `messages_read`
- las notificaciones push de Claude solo existen mientras la sesión MCP está activa
- cuando el cliente se desconecta, el puente sale y la cola en vivo desaparece

## Elegir un modo de cliente

Use el mismo puente de dos maneras diferentes:

- Clientes MCP genéricos: solo herramientas MCP estándar. Use `conversations_list`,
  `messages_read`, `events_poll`, `events_wait`, `messages_send` y las
  herramientas de aprobación.
- Claude Code: herramientas MCP estándar más el adaptador de canal específico de Claude.
  Habilite `--claude-channel-mode on` o deje el predeterminado `auto`.

Hoy, `auto` se comporta igual que `on`. Aún no hay detección de capacidades del cliente.

## Lo que expone `serve`

El puente utiliza los metadatos de ruta de sesión existentes de Gateway para exponer conversaciones respaldadas por canales. Una conversación aparece cuando OpenClaw ya tiene el estado de sesión con una ruta conocida, como:

- `channel`
- metadatos del destinatario o destino
- opcional `accountId`
- opcional `threadId`

Esto da a los clientes MCP un solo lugar para:

- listar las conversaciones enrutadas recientes
- leer el historial de transcripciones recientes
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

Enumera las conversaciones recientes respaldadas por sesión que ya tienen metadatos de ruta en el estado de sesión de Gateway.

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

Extrae bloques de contenido de mensajes que no son de texto de un mensaje de transcripción. Esta es una
vista de metadatos sobre el contenido de la transcripción, no un almacén de blobs de adjuntos duradero
independiente.

### `events_poll`

Lee eventos en vivo en cola desde un cursor numérico.

### `events_wait`

Realiza un sondeo largo hasta que llega el siguiente evento en cola coincidente o expira un tiempo de espera.

Use esto cuando un cliente MCP genérico necesite entrega en tiempo casi real sin un
protocolo de inserción específico de Claude.

### `messages_send`

Envía texto de vuelta a través de la misma ruta ya registrada en la sesión.

Comportamiento actual:

- requiere una ruta de conversación existente
- usa el canal, el destinatario, el id de cuenta y el id de hilo de la sesión
- envía solo texto

### `permissions_list_open`

Lista las solicitudes de aprobación de ejecución/complementos pendientes que el puente ha observado desde que se conectó a la puerta de enlace.

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
- `events_poll` y `events_wait` no reproducen por sí mismos el historial antiguo de Gateway
- el historial duradero debe leerse con `messages_read`

## Notificaciones de canal de Claude

El puente también puede exponer notificaciones de canal específicas de Claude. Este es el equivalente en OpenClaw de un adaptador de canal de Claude Code: las herramientas MCP estándar siguen disponibles, pero los mensajes entrantes en vivo también pueden llegar como notificaciones MCP específicas de Claude.

Opciones:

- `--claude-channel-mode off`: solo herramientas MCP estándar
- `--claude-channel-mode on`: habilitar notificaciones de canal de Claude
- `--claude-channel-mode auto`: predeterminado actual; mismo comportamiento del puente que `on`

Cuando se habilita el modo de canal de Claude, el servidor anuncia capacidades experimentales de Claude y puede emitir:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportamiento actual del puente:

- los mensajes de transcripción `user` entrantes se reenvían como
  `notifications/claude/channel`
- las solicitudes de permisos de Claude recibidas a través de MCP se rastrean en memoria
- si la conversación vinculada más tarde envía `yes abcde` o `no abcde`, el puente
  lo convierte en `notifications/claude/channel/permission`
- estas notificaciones son solo para la sesión en vivo; si el cliente MCP se desconecta,
  no hay un objetivo de envío (push)

Esto es intencionalmente específico del cliente. Los clientes MCP genéricos deben confiar en las
herramientas de sondeo (polling) estándar.

## configuración del cliente MCP

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

Para la mayoría de los clientes MCP genéricos, comience con la superficie de herramientas estándar e ignore
el modo Claude. Active el modo Claude solo para clientes que realmente entiendan los
métodos de notificación específicos de Claude.

## Opciones

`openclaw mcp serve` admite:

- `--url <url>`: URL de WebSocket de puerta de enlace
- `--token <token>`: token de puerta de enlace
- `--token-file <path>`: leer token desde archivo
- `--password <password>`: contraseña de puerta de enlace
- `--password-file <path>`: leer contraseña del archivo
- `--claude-channel-mode <auto|on|off>`: modo de notificación de Claude
- `-v`, `--verbose`: registros detallados en stderr

Preferir `--token-file` o `--password-file` sobre secretos en línea cuando sea posible.

## Límite de seguridad y confianza

El puente no inventa el enrutamiento. Solo expone las conversaciones que Gateway
ya sabe cómo enrutar.

Eso significa:

- las listas de permitidos de remitentes, el emparejamiento y la confianza a nivel de canal aún pertenecen a la
  configuración del canal subyacente de OpenClaw
- `messages_send` solo puede responder a través de una ruta almacenada existente
- el estado de aprobación es solo en vivo/en memoria para la sesión actual del puente
- la autenticación del puente debe usar los mismos controles de token o contraseña de Gateway que
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
- verifica el descubrimiento de conversaciones, las lecturas de transcripciones, las lecturas de metadatos de archivos adjuntos,
  el comportamiento de la cola de eventos en vivo y el enrutamiento de envíos salientes
- valida las notificaciones de canal y permisos estilo Claude a través del
  puente MCP stdio real

Esta es la forma más rápida de demostrar que el puente funciona sin conectar una cuenta
real de Telegram, Discord o iMessage a la ejecución de prueba.

Para obtener un contexto de prueba más amplio, consulte [Pruebas](/en/help/testing).

## Solución de problemas

### No se devolvieron conversaciones

Generalmente significa que la sesión de Gateway aún no es enrutable. Confirme que la
sesión subyacente ha almacenado los metadatos de ruta de canal/proveedor, destinatario y cuenta/hilo opcionales.

### `events_poll` o `events_wait` pierde mensajes antiguos

Esperado. La cola en vivo comienza cuando se conecta el puente. Lea el historial de transcripciones
antiguo con `messages_read`.

### Las notificaciones de Claude no aparecen

Verifique todo esto:

- el cliente mantuvo abierta la sesión MCP stdio
- `--claude-channel-mode` es `on` o `auto`
- el cliente realmente entiende los métodos de notificación específicos de Claude
- el mensaje entrante ocurrió después de que se conectara el puente

### Faltan aprobaciones

`permissions_list_open` solo muestra las solicitudes de aprobación observadas mientras el puente estaba conectado. No es una API de historial de aprobaciones duradera.

## OpenClaw como registro de cliente MCP

Esta es la ruta `openclaw mcp list`, `show`, `set` y `unset`.

Estos comandos no exponen OpenClaw a través de MCP. Gestionan las definiciones de servidores MCP propiedad de OpenClaw bajo `mcp.servers` en la configuración de OpenClaw.

Esas definiciones guardadas son para tiempos de ejecución que OpenClaw inicia o configura más tarde, como Pi integrado y otros adaptadores de tiempo de ejecución. OpenClaw almacena las definiciones de forma centralizada para que esos tiempos de ejecución no necesiten mantener sus propias listas duplicadas de servidores MCP.

Comportamiento importante:

- estos comandos solo leen o escriben la configuración de OpenClaw
- no se conectan al servidor MCP de destino
- no validan si el comando, la URL o el transporte remoto son accesibles en este momento
- los adaptadores de tiempo de ejecución deciden qué formas de transporte admiten realmente en el momento de la ejecución

## Definiciones de servidor MCP guardadas

OpenClaw también almacena un registro ligero de servidores MCP en la configuración para superficies que desean definiciones MCP administradas por OpenClaw.

Comandos:

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

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

Campos típicos:

- `command`
- `args`
- `env`
- `cwd` o `workingDirectory`
- `url`

Estos comandos solo gestionan la configuración guardada. No inician el puente del canal,
abren una sesión de cliente MCP en vivo ni demuestran que el servidor objetivo sea accesible.

## Límites actuales

Esta página documenta el puente tal como se entrega hoy.

Límites actuales:

- el descubrimiento de conversaciones depende de los metadatos de la ruta de sesión del Gateway existentes
- ningún protocolo de envío genérico más allá del adaptador específico de Claude
- aún no hay herramientas de edición o reacción de mensajes
- aún no hay transporte MCP HTTP dedicado
- `permissions_list_open` solo incluye las aprobaciones observadas mientras el puente está
  conectado

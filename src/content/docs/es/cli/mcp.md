---
summary: "Expone las conversaciones de canales de OpenClaw a través de MCP y gestiona las definiciones de servidores MCP guardadas"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` tiene dos trabajos:

- ejecutar OpenClaw como servidor MCP con `openclaw mcp serve`
- gestionar las definiciones de servidores MCP salientes propiedad de OpenClaw con `list`, `show`, `set` y `unset`

En otras palabras:

- `serve` es OpenClaw actuando como servidor MCP
- `list` / `show` / `set` / `unset` es OpenClaw actuando como registro del lado del cliente MCP para otros servidores MCP que sus tiempos de ejecución pueden consumir más tarde

Use [`openclaw acp`](/es/cli/acp) cuando OpenClaw debería alojar él mismo una sesión de arnés de codificación y enrutar ese tiempo de ejecución a través de ACP.

## OpenClaw como un servidor MCP

Esta es la ruta `openclaw mcp serve`.

### Cuándo usar `serve`

Use `openclaw mcp serve` cuando:

- Codex, Claude Code u otro cliente MCP deben hablar directamente con las conversaciones de canales respaldadas por OpenClaw
- ya tienes un Gateway de OpenClaw local o remoto con sesiones enrutadas
- desea un servidor MCP que funcione en los backends de canales de OpenClaw en lugar de ejecutar puentes separados por canal

Use [`openclaw acp`](/es/cli/acp) en su lugar cuando OpenClaw debería alojar él mismo el tiempo de ejecución de codificación y mantener la sesión del agente dentro de OpenClaw.

### Cómo funciona

`openclaw mcp serve` inicia un servidor MCP stdio. El cliente MCP es dueño de ese proceso. Mientras el cliente mantiene la sesión stdio abierta, el puente se conecta a un OpenClaw Gateway local o remoto a través de WebSocket y expone conversaciones de canal enrutadas a través de MCP.

<Steps>
  <Step title="El cliente genera el puente">El cliente MCP genera `openclaw mcp serve`.</Step>
  <Step title="El puente se conecta a Gateway">El puente se conecta al OpenClaw Gateway a través de WebSocket.</Step>
  <Step title="Las sesiones enrutadas se convierten en conversaciones MCP">Las sesiones enrutadas se convierten en conversaciones MCP y herramientas de transcripción/historial.</Step>
  <Step title="Cola de eventos en vivo">Los eventos en vivo se ponen en cola en memoria mientras el puente está conectado.</Step>
  <Step title="Push opcional de Claude">Si el modo de canal de Claude está habilitado, la misma sesión también puede recibir notificaciones push específicas de Claude.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Comportamiento importante">
    - el estado de la cola en vivo comienza cuando se conecta el puente
    - el historial de transcripciones antiguo se lee con `messages_read`
    - las notificaciones push de Claude solo existen mientras la sesión MCP está activa
    - cuando el cliente se desconecta, el puente sale y la cola en vivo desaparece
    - los puntos de entrada de agentes de un solo uso, como `openclaw agent` y `openclaw infer model run`, retiran cualquier tiempo de ejecución MCP agrupado que abran cuando se completa la respuesta, por lo que las ejecuciones con secuencias de comandos repetidas no acumulan procesos secundarios MCP stdio
    - los servidores MCP stdio iniciados por OpenClaw (agrupados o configurados por el usuario) se desmantelan como un árbol de procesos al apagar, por lo que los subprocesos secundarios iniciados por el servidor no sobreviven después de que el cliente stdio principal sale
    - eliminar o restablecer una sesión elimina los clientes MCP de esa sesión a través de la ruta de limpieza del tiempo de ejecución compartido, por lo que no hay conexiones stdio persistentes vinculadas a una sesión eliminada

  </Accordion>
</AccordionGroup>

### Elegir un modo de cliente

Use el mismo puente de dos formas diferentes:

<Tabs>
  <Tab title="Clientes MCP genéricos">Solo herramientas MCP estándar. Use `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send` y las herramientas de aprobación.</Tab>
  <Tab title="Claude Code">Herramientas MCP estándar más el adaptador de canal específico de Claude. Habilite `--claude-channel-mode on` o deje el predeterminado `auto`.</Tab>
</Tabs>

<Note>Hoy, `auto` se comporta igual que `on`. Todavía no hay detección de capacidades del cliente.</Note>

### Lo que expone `serve`

El puente utiliza los metadatos de ruta de sesión existentes de Gateway para exponer conversaciones respaldadas por canales. Una conversación aparece cuando OpenClaw ya tiene el estado de la sesión con una ruta conocida, como:

- `channel`
- metadatos del destinatario o destino
- `accountId` opcional
- `threadId` opcional

Esto da a los clientes MCP un lugar para:

- listar las conversaciones enrutadas recientes
- leer el historial de transcripciones reciente
- esperar nuevos eventos entrantes
- enviar una respuesta a través de la misma ruta
- ver las solicitudes de aprobación que llegan mientras el puente está conectado

### Uso

<Tabs>
  <Tab title="Pasarela local">```bash openclaw mcp serve ```</Tab>
  <Tab title="Pasarela remota (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Pasarela remota (contraseña)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="Detallado / Claude desactivado">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### Herramientas del puente

El puente actual expone estas herramientas MCP:

<AccordionGroup>
  <Accordion title="conversations_list">
    Lista las conversaciones recientes respaldadas por sesión que ya tienen metadatos de ruta en el estado de sesión de Gateway.

    Filtros útiles:

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    Devuelve una conversación por `session_key` utilizando una búsqueda directa de sesión de Gateway.
  </Accordion>
  <Accordion title="messages_read">
    Lee los mensajes de transcripción recientes de una conversación respaldada por sesión.
  </Accordion>
  <Accordion title="attachments_fetch">
    Extrae bloques de contenido de mensajes que no son de texto de un mensaje de transcripción. Esta es una vista de metadatos sobre el contenido de la transcripción, no un almacenamiento de blobs de archivos adjuntos duradero e independiente.
  </Accordion>
  <Accordion title="events_poll">
    Lee los eventos en vivo en cola desde un cursor numérico.
  </Accordion>
  <Accordion title="events_wait">
    Realiza un sondeo largo (long-poll) hasta que llega el siguiente evento en cola coincidente o expira el tiempo de espera.

    Úselo cuando un cliente MCP genérico necesite entrega casi en tiempo real sin un protocolo de inserción específico de Claude.

  </Accordion>
  <Accordion title="messages_send">
    Envía texto de vuelta a través de la misma ruta ya registrada en la sesión.

    Comportamiento actual:

    - requiere una ruta de conversación existente
    - usa el canal, el destinatario, el id de cuenta y el id de hilo de la sesión
    - envía solo texto

  </Accordion>
  <Accordion title="permissions_list_open">
    Enumera las solicitudes de aprobación de exec/plugin pendientes que el puente ha observado desde que se conectó a la Gateway.
  </Accordion>
  <Accordion title="permissions_respond">
    Resuelve una solicitud de aprobación de exec/plugin pendiente con:

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### Modelo de eventos

El puente mantiene una cola de eventos en memoria mientras está conectado.

Tipos de eventos actuales:

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- la cola es solo en vivo; comienza cuando se inicia el puente MCP
- `events_poll` y `events_wait` no reproducen por sí mismos el historial antiguo de Gateway
- el registro duradero debe leerse con `messages_read`

</Warning>

### Notificaciones del canal de Claude

El puente también puede exponer notificaciones de canal específicas de Claude. Este es el equivalente de OpenClaw de un adaptador de canal de Claude Code: las herramientas MCP estándar siguen disponibles, pero los mensajes entrantes en vivo también pueden llegar como notificaciones MCP específicas de Claude.

<Tabs>
  <Tab title="off">`--claude-channel-mode off`: solo herramientas MCP estándar.</Tab>
  <Tab title="on">`--claude-channel-mode on`: habilitar notificaciones de canal de Claude.</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`: valor predeterminado actual; mismo comportamiento del puente que `on`.</Tab>
</Tabs>

Cuando el modo de canal de Claude está habilitado, el servidor anuncia capacidades experimentales de Claude y puede emitir:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportamiento actual del puente:

- los mensajes de transcripción entrantes de `user` se reenvían como `notifications/claude/channel`
- las solicitudes de permiso de Claude recibidas a través de MCP se rastrean en memoria
- si la conversación vinculada más adelante envía `yes abcde` o `no abcde`, el puente lo convierte a `notifications/claude/channel/permission`
- estas notificaciones son solo de sesión en vivo; si el cliente MCP se desconecta, no hay objetivo de envío

Esto es intencionalmente específico del cliente. Los clientes MCP genéricos deben confiar en las herramientas de sondeo estándar.

### Configuración del cliente MCP

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

Para la mayoría de los clientes MCP genéricos, comience con la superficie de herramientas estándar e ignore el modo Claude. Active el modo Claude solo para clientes que realmente entiendan los métodos de notificación específicos de Claude.

### Opciones

`openclaw mcp serve` admite:

<ParamField path="--url" type="string">
  URL del WebSocket de Gateway.
</ParamField>
<ParamField path="--token" type="string">
  Token de Gateway.
</ParamField>
<ParamField path="--token-file" type="string">
  Leer token desde archivo.
</ParamField>
<ParamField path="--password" type="string">
  Contraseña de Gateway.
</ParamField>
<ParamField path="--password-file" type="string">
  Leer contraseña desde archivo.
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Modo de notificación de Claude.
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  Registros detallados en stderr.
</ParamField>

<Tip>Prefiera `--token-file` o `--password-file` antes que secretos en línea cuando sea posible.</Tip>

### Seguridad y límite de confianza

El puente no inventa el enrutamiento. Solo expone las conversaciones que Gateway ya sabe cómo enrutar.

Esto significa:

- las listas de permitidos de remitentes, el emparejamiento y la confianza a nivel de canal todavía pertenecen a la configuración del canal subyacente de OpenClaw
- `messages_send` solo puede responder a través de una ruta almacenada existente
- el estado de aprobación es solo en vivo/en memoria para la sesión actual del puente
- la autenticación del puente debe usar los mismos controles de token o contraseña de Gateway que confiaría para cualquier otro cliente remoto de Gateway

Si falta una conversación en `conversations_list`, la causa habitual no es la configuración de MCP. Son metadatos de ruta faltantes o incompletos en la sesión subyacente de Gateway.

### Pruebas

OpenClaw incluye una prueba de humo determinista de Docker para este puente:

```bash
pnpm test:docker:mcp-channels
```

Dicha prueba:

- inicia un contenedor de Gateway semillado
- inicia un segundo contenedor que genera `openclaw mcp serve`
- verifica el descubrimiento de conversaciones, lecturas de transcripciones, lecturas de metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo y el enrutamiento de envío saliente
- valida las notificaciones de canal y permisos estilo Claude a través del puente MCP stdio real

Esta es la forma más rápida de demostrar que el puente funciona sin conectar una cuenta real de Telegram, Discord o iMessage a la ejecución de la prueba.

Para un contexto de pruebas más amplio, consulte [Pruebas](/es/help/testing).

### Solución de problemas

<AccordionGroup>
  <Accordion title="No conversations returned">
    Generalmente significa que la sesión de Gateway aún no es enrutable. Confirme que la sesión subyacente ha almacenado los metadatos de canal/proveedor, destinatario y ruta de cuenta/hilo opcionales.
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    Esperado. La cola en vivo comienza cuando se conecta el puente. Lea el historial de transcripciones más antiguo con `messages_read`.
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    Compruebe todo esto:

    - el cliente mantuvo abierta la sesión MCP stdio
    - `--claude-channel-mode` es `on` o `auto`
    - el cliente realmente entiende los métodos de notificación específicos de Claude
    - el mensaje entrante ocurrió después de que se conectara el puente

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` solo muestra solicitudes de aprobación observadas mientras el puente estaba conectado. No es una API de historial de aprobaciones duradera.
  </Accordion>
</AccordionGroup>

## OpenClaw como registro de clientes MCP

Esta es la ruta `openclaw mcp list`, `show`, `set` y `unset`.

Estos comandos no exponen OpenClaw a través de MCP. Gestionan las definiciones de servidores MCP propiedad de OpenClaw bajo `mcp.servers` en la configuración de OpenClaw.

Esas definiciones guardadas son para tiempos de ejecución que OpenClaw lanza o configura más tarde, como Pi integrado y otros adaptadores de tiempo de ejecución. OpenClaw almacena las definiciones centralmente para que esos tiempos de ejecución no necesiten mantener sus propias listas duplicadas de servidores MCP.

<AccordionGroup>
  <Accordion title="Comportamiento importante">
    - estos comandos solo leen o escriben la configuración de OpenClaw
    - no se conectan al servidor MCP de destino
    - no validan si el comando, la URL o el transporte remoto son accesibles en este momento
    - los adaptadores de tiempo de ejecución deciden qué formas de transporte admiten realmente en el momento de la ejecución
    - Pi integrado expone las herramientas MCP configuradas en perfiles de herramientas normales `coding` y `messaging`; `minimal` aún las oculta y `tools.deny: ["bundle-mcp"]` las desactiva explícitamente
    - los tiempos de ejecución de MCP agrupados con ámbito de sesión se eliminan después de `mcp.sessionIdleTtlMs` milisegundos de tiempo de inactividad (10 minutos por defecto; configure `0` para desactivar) y las ejecuciones integradas de un solo shot las limpian al final de la ejecución

  </Accordion>
</AccordionGroup>

Los adaptadores de tiempo de ejecución pueden normalizar este registro compartido en la forma que su cliente descendente espera. Por ejemplo, Pi integrado consume directamente los valores `transport` de OpenClaw, mientras que Claude Code y Gemini reciben valores nativos de CLI `type` tales como `http`, `sse` o `stdio`.

### Definiciones de servidor MCP guardadas

OpenClaw también almacena un registro ligero de servidores MCP en la configuración para superficies que desean definiciones MCP administradas por OpenClaw.

Comandos:

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

Notas:

- `list` ordena los nombres de los servidores.
- `show` sin un nombre imprime el objeto completo del servidor MCP configurado.
- `set` espera un valor de objeto JSON en la línea de comandos.
- Use `transport: "streamable-http"` para servidores MCP HTTP transmisibles. `openclaw mcp set` también normaliza los `type: "http"` nativos de CLI a la misma forma de configuración canónica para compatibilidad.
- `unset` falla si el servidor nombrado no existe.

Ejemplos:

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
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
        "url": "https://mcp.example.com",
        "transport": "streamable-http"
      }
    }
  }
}
```

### Transporte Stdio

Lanza un proceso hijo local y se comunica a través de stdin/stdout.

| Campo                      | Descripción                               |
| -------------------------- | ----------------------------------------- |
| `command`                  | Ejecutable para iniciar (obligatorio)     |
| `args`                     | Matriz de argumentos de línea de comandos |
| `env`                      | Variables de entorno adicionales          |
| `cwd` / `workingDirectory` | Directorio de trabajo para el proceso     |

<Warning>
**Filtro de seguridad de entorno de Stdio**

OpenClaw rechaza las claves de entorno de inicio del intérprete que pueden alterar la forma en que se inicia un servidor MCP stdio antes del primer RPC, incluso si aparecen en el bloque `env` de un servidor. Las claves bloqueadas incluyen `NODE_OPTIONS`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` y variables de control de ejecución similares. El inicio rechaza estas con un error de configuración para que no puedan inyectar un preludio implícito, intercambiar el intérprete o habilitar un depurador contra el proceso stdio. Las variables de entorno ordinarias de credenciales, proxy y específicas del servidor (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personalizadas, etc.) no se ven afectadas.

Si su servidor MCP realmente necesita una de las variables bloqueadas, configúrela en el proceso host de la puerta de enlace en lugar de en el `env` del servidor stdio.

</Warning>

### Transporte SSE / HTTP

Se conecta a un servidor MCP remoto a través de Eventos enviados por el servidor HTTP (HTTP Server-Sent Events).

| Campo                 | Descripción                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP o HTTPS del servidor remoto (obligatorio)                                      |
| `headers`             | Mapa de clave-valor opcional de encabezados HTTP (por ejemplo, tokens de autenticación) |
| `connectionTimeoutMs` | Tiempo de espera de conexión por servidor en ms (opcional)                              |

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

Los valores confidenciales en `url` (información de usuario) y `headers` se redactan en los registros y la salida de estado.

### Transporte HTTP transmisible

`streamable-http` es una opción de transporte adicional junto con `sse` y `stdio`. Utiliza transmisión HTTP para la comunicación bidireccional con servidores MCP remotos.

| Campo                 | Descripción                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `url`                 | URL HTTP o HTTPS del servidor remoto (obligatorio)                                                  |
| `transport`           | Establecer en `"streamable-http"` para seleccionar este transporte; al omitirse, OpenClaw usa `sse` |
| `headers`             | Mapa de clave-valor opcional de encabezados HTTP (por ejemplo, tokens de autenticación)             |
| `connectionTimeoutMs` | Tiempo de espera de conexión por servidor en ms (opcional)                                          |

La configuración de OpenClaw usa `transport: "streamable-http"` como la ortografía canónica. Los valores `type: "http"` de MCP nativos de la CLI se aceptan al guardar a través de `openclaw mcp set` y se reparan mediante `openclaw doctor --fix` en la configuración existente, pero `transport` es lo que el Pi integrado consume directamente.

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

<Note>Estos comandos solo administran la configuración guardada. No inician el puente del canal, abren una sesión de cliente MCP en vivo ni demuestran que el servidor de destino sea accesible.</Note>

## Límites actuales

Esta página documenta el puente tal como se envía hoy.

Límites actuales:

- el descubrimiento de conversaciones depende de los metadatos de ruta de sesión de Gateway existentes
- no hay protocolo de inserción genérico más allá del adaptador específico de Claude
- aún no hay herramientas de edición o reacción de mensajes
- el transporte HTTP/SSE/streamable-http se conecta a un solo servidor remoto; aún no hay flujo ascendente multiplexado
- `permissions_list_open` solo incluye las aprobaciones observadas mientras el puente está conectado

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Complementos](/es/cli/plugins)

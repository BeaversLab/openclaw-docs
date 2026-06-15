---
summary: "Expone las conversaciones de los canales de OpenClaw a través de MCP y gestiona las definiciones guardadas de servidores MCP"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` tiene dos trabajos:

- ejecutar OpenClaw como servidor MCP con `openclaw mcp serve`
- gestionar las definiciones de servidores MCP salientes propiedad de OpenClaw con `list`, `show`, `status`, `doctor`, `probe`, `add`, `set`, `configure`, `tools`, `login`, `logout`, `reload` y `unset`

En otras palabras:

- `serve` es OpenClaw actuando como servidor MCP
- los otros subcomandos son OpenClaw actuando como un registro del lado del cliente MCP para servidores MCP que sus runtimes pueden consumir más tarde

Use [`openclaw acp`](/es/cli/acp) cuando OpenClaw debe alojar una sesión de harness de codificación y enrutar ese runtime a través de ACP.

## Elija la ruta MCP adecuada

OpenClaw tiene varias superficies MCP. Elija la que coincida con quién es el propietario del runtime del agente y quién es el propietario de las herramientas.

| Objetivo                                                                                | Uso                                                                       | Por qué                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permitir que un cliente MCP externo lea/envíe conversaciones de canales de OpenClaw     | `openclaw mcp serve`                                                      | OpenClaw es el servidor MCP y expone las conversaciones respaldadas por Gateway a través de stdio.                                                   |
| Guardar servidores MCP de terceros para ejecuciones de agentes gestionadas por OpenClaw | `openclaw mcp add`, `set`, `configure`, `tools`, `login`                  | OpenClaw es el registro del lado del cliente MCP y luego proyecta esos servidores en los runtimes elegibles.                                         |
| Verificar un servidor guardado sin ejecutar un turno de agente                          | `openclaw mcp status`, `doctor`, `probe`                                  | `status` y `doctor` inspeccionan la configuración; `probe` abre una conexión MCP en vivo y enumera las capacidades.                                  |
| Editar la configuración de MCP desde un navegador                                       | Controlar la interfaz de usuario `/mcp`                                   | La página muestra el inventario, la habilitación, resúmenes de OAuth/filtros, sugerencias de comandos y un editor `mcp` con alcance.                 |
| Dar al servidor de aplicaciones Codex un servidor MCP nativo con alcance                | `mcp.servers.<name>.codex`                                                | El bloque `codex` solo afecta la proyección del hilo del servidor de aplicaciones Codex y se elimina antes de la entrega de la configuración nativa. |
| Ejecutar sesiones de arnés alojadas en ACP                                              | [`openclaw acp`](/es/cli/acp) y [Agentes ACP](/es/tools/acp-agents-setup) | El modo puente ACP no acepta la inyección de servidores MCP por sesión; configure en su lugar puentes de puerta de enlace/complementos.              |

<Tip>Si no está seguro de qué ruta necesita, comience con `openclaw mcp status --verbose`. Muestra lo que OpenClaw ha guardado sin iniciar ningún servidor MCP.</Tip>

## OpenClaw como un servidor MCP

Esta es la ruta `openclaw mcp serve`.

### Cuándo usar `serve`

Use `openclaw mcp serve` cuando:

- Codex, Claude Code u otro cliente MCP deben hablar directamente con las conversaciones de canal respaldadas por OpenClaw
- ya tiene una puerta de enlace OpenClaw local o remota con sesiones enrutadas
- desea un servidor MCP que funcione en los backends de canal de OpenClaw en lugar de ejecutar puentes separados por canal

Use [`openclaw acp`](/es/cli/acp) en su lugar cuando OpenClaw debería alojar el tiempo de ejecución de codificación en sí mismo y mantener la sesión del agente dentro de OpenClaw.

### Cómo funciona

`openclaw mcp serve` inicia un servidor MCP stdio. El cliente MCP posee ese proceso. Mientras el cliente mantiene la sesión stdio abierta, el puente se conecta a una puerta de enlace OpenClaw local o remota a través de WebSocket y expone conversaciones de canal enrutadas a través de MCP.

<Steps>
  <Step title="El cliente genera el puente">El cliente MCP genera `openclaw mcp serve`.</Step>
  <Step title="El puente se conecta a Gateway">El puente se conecta a OpenClaw Gateway a través de WebSocket.</Step>
  <Step title="Las sesiones se convierten en conversaciones MCP">Las sesiones enrutadas se convierten en conversaciones MCP y herramientas de transcripción/historial.</Step>
  <Step title="Cola de eventos en vivo">Los eventos en vivo se ponen en cola en memoria mientras el puente está conectado.</Step>
  <Step title="Envío opcional de Claude">Si el modo de canal Claude está habilitado, la misma sesión también puede recibir notificaciones push específicas de Claude.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Comportamiento importante">
    - el estado de la cola en vivo comienza cuando se conecta el puente
    - el historial de transcripciones anterior se lee con `messages_read`
    - las notificaciones push de Claude solo existen mientras la sesión de MCP está activa
    - cuando el cliente se desconecta, el puente se cierra y la cola en vivo desaparece
    - los puntos de entrada de agentes de un solo disparo, como `openclaw agent` y `openclaw infer model run`, cierran cualquier tiempo de ejecución de MCP incluido que abran cuando se complete la respuesta, por lo que las ejecuciones de scripts repetidas no acumulan procesos secundarios de MCP stdio
    - los servidores MCP stdio iniciados por OpenClaw (incluidos o configurados por el usuario) se derriban como un árbol de procesos al apagarse, por lo que los subprocesos secundarios iniciados por el servidor no sobreviven después de que el cliente stdio principal se cierra
    - eliminar o restablecer una sesión desecha los clientes MCP de esa sesión a través de la ruta de limpieza del tiempo de ejecución compartido, por lo que no quedan conexiones stdio persistentes vinculadas a una sesión eliminada

  </Accordion>
</AccordionGroup>

### Elige un modo de cliente

Usa el mismo puente de dos formas diferentes:

<Tabs>
  <Tab title="Clientes MCP genéricos">Solo herramientas MCP estándar. Usa `conversations_list`, `messages_read`, `events_poll`, `events_wait`, `messages_send` y las herramientas de aprobación.</Tab>
  <Tab title="Claude Code">Herramientas MCP estándar más el adaptador de canal específico de Claude. Habilita `--claude-channel-mode on` o deja el valor predeterminado `auto`.</Tab>
</Tabs>

<Note>Hoy, `auto` se comporta igual que `on`. Todavía no hay detección de capacidades del cliente.</Note>

### Lo que expone `serve`

El puente utiliza los metadatos de ruta de sesión de Gateway existentes para exponer conversaciones respaldadas por canales. Una conversación aparece cuando OpenClaw ya tiene el estado de la sesión con una ruta conocida, como:

- `channel`
- metadatos del destinatario o destino
- `accountId` opcional
- `threadId` opcional

Esto da a los clientes MCP un solo lugar para:

- enumerar las conversaciones enrutadas recientes
- leer el historial de transcripciones reciente
- esperar nuevos eventos entrantes
- enviar una respuesta a través de la misma ruta
- ver las solicitudes de aprobación que llegan mientras el puente está conectado

### Uso

<Tabs>
  <Tab title="Pasarela Local">```bash openclaw mcp serve ```</Tab>
  <Tab title="Pasarela Remota (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Pasarela Remota (contraseña)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="Detallado / Claude desactivado">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### Herramientas de puente

El puente actual expone estas herramientas MCP:

<AccordionGroup>
  <Accordion title="conversations_list">
    Enumera las conversaciones recientes respaldadas por sesiones que ya tienen metadatos de ruta en el estado de sesión de Gateway.

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
    Extrae bloques de contenido de mensajes que no son texto de un mensaje de transcripción. Esta es una vista de metadatos sobre el contenido de la transcripción, no un almacén de blobs de archivos adjuntos duradero independiente.
  </Accordion>
  <Accordion title="events_poll">
    Lee eventos en vivo en cola desde un cursor numérico.
  </Accordion>
  <Accordion title="events_wait">
    Realiza una espera larga hasta que llega el siguiente evento en cola coincidente o expira el tiempo de espera.

    Use esto cuando un cliente MCP genérico necesite entrega en tiempo casi real sin un protocolo de inserción específico de Claude.

  </Accordion>
  <Accordion title="messages_send">
    Envía texto de vuelta a través de la misma ruta ya registrada en la sesión.

    Comportamiento actual:

    - requiere una ruta de conversación existente
    - utiliza el canal, el destinatario, el id de cuenta y el id de hilo de la sesión
    - envía solo texto

  </Accordion>
  <Accordion title="permissions_list_open">
    Enumera las solicitudes de aprobación de ejecución/complemento pendientes que el puente ha observado desde que se conectó a la puerta de enlace.
  </Accordion>
  <Accordion title="permissions_respond">
    Resuelve una solicitud de aprobación de ejecución/complemento pendiente con:

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
- `events_poll` y `events_wait` no reproducen por sí mismos el historial anterior de Gateway
- el historial duradero debe leerse con `messages_read`

</Warning>

### Notificaciones del canal Claude

El puente también puede exponer notificaciones de canal específicas de Claude. Este es el equivalente de OpenClaw de un adaptador de canal Claude Code: las herramientas MCP estándar siguen disponibles, pero los mensajes entrantes en vivo también pueden llegar como notificaciones MCP específicas de Claude.

<Tabs>
  <Tab title="off">`--claude-channel-mode off`: solo herramientas MCP estándar.</Tab>
  <Tab title="on">`--claude-channel-mode on`: habilitar notificaciones del canal Claude.</Tab>
  <Tab title="auto (predeterminado)">`--claude-channel-mode auto`: predeterminado actual; mismo comportamiento del puente que `on`.</Tab>
</Tabs>

Cuando el modo de canal Claude está habilitado, el servidor anuncia capacidades experimentales de Claude y puede emitir:

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

Comportamiento actual del puente:

- los mensajes de transcripción entrantes de `user` se reenvían como `notifications/claude/channel`
- las solicitudes de permiso de Claude recibidas a través de MCP se rastrean en memoria
- si la conversación vinculada más tarde envía `yes abcde` o `no abcde`, el puente lo convierte a `notifications/claude/channel/permission`
- estas notificaciones son solo de sesión en vivo; si el cliente MCP se desconecta, no hay objetivo de envío (push)

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
  URL de WebSocket de Gateway.
</ParamField>
<ParamField path="--token" type="string">
  Token de Gateway.
</ParamField>
<ParamField path="--token-file" type="string">
  Leer token del archivo.
</ParamField>
<ParamField path="--password" type="string">
  Contraseña de Gateway.
</ParamField>
<ParamField path="--password-file" type="string">
  Leer contraseña del archivo.
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Modo de notificación de Claude.
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  Registros detallados en stderr.
</ParamField>

<Tip>Si es posible, prefiera `--token-file` o `--password-file` en lugar de secretos en línea.</Tip>

### Seguridad y límite de confianza

El puente no inventa el enrutamiento. Solo expone conversaciones que Gateway ya sabe cómo enrutar.

Eso significa:

- las listas de permitidos de remitentes, el emparejamiento y la confianza a nivel de canal siguen perteneciendo a la configuración del canal subyacente de OpenClaw
- `messages_send` solo puede responder a través de una ruta almacenada existente
- el estado de aprobación es solo en vivo/en memoria para la sesión actual del puente
- la autenticación del puente debe usar los mismos controles de token o contraseña de Gateway que confiaría para cualquier otro cliente remoto de Gateway

Si falta una conversación de `conversations_list`, la causa habitual no es la configuración de MCP. Son metadatos de ruta faltantes o incompletos en la sesión subyacente de Gateway.

### Pruebas

OpenClaw incluye una prueba de humo determinista de Docker para este puente:

```bash
pnpm test:docker:mcp-channels
```

Esa prueba de humo:

- inicia un contenedor Gateway sembrado
- inicia un segundo contenedor que genera `openclaw mcp serve`
- verifica el descubrimiento de conversaciones, las lecturas de transcripciones, las lecturas de metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo y el enrutamiento de envío saliente
- valida las notificaciones de canal y permisos estilo Claude a través del puente MCP stdio real

Esta es la forma más rápida de demostrar que el puente funciona sin conectar una cuenta real de Telegram, Discord o iMessage a la ejecución de la prueba.

Para un contexto de pruebas más amplio, consulte [Pruebas](/es/help/testing).

### Solución de problemas

<AccordionGroup>
  <Accordion title="No conversations returned">
    Por lo general, significa que la sesión del Gateway aún no es enrutable. Confirme que la sesión subyacente ha almacenado los metadatos de ruta de canal/proveedor, destinatario y cuenta/hilo opcionales.
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    Esperado. La cola en vivo comienza cuando se conecta el puente. Lea el historial de transcripciones antiguo con `messages_read`.
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    Compruebe todo lo siguiente:

    - el cliente mantuvo abierta la sesión MCP stdio
    - `--claude-channel-mode` es `on` o `auto`
    - el cliente realmente entiende los métodos de notificación específicos de Claude
    - el mensaje entrante ocurrió después de que se conectara el puente

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` solo muestra las solicitudes de aprobación observadas mientras el puente estaba conectado. No es una API de historial de aprobaciones duradera.
  </Accordion>
</AccordionGroup>

## OpenClaw como registro de cliente MCP

Esta es la ruta `openclaw mcp list`, `show`, `status`, `doctor`, `probe`, `add`, `set`,
`configure`, `tools`, `login`, `logout`, `reload` y `unset`.

Estos comandos no exponen OpenClaw a través de MCP. Gestionan las definiciones de servidores MCP propiedad de OpenClaw bajo `mcp.servers` en la configuración de OpenClaw.

Esas definiciones guardadas son para tiempos de ejecución que OpenClaw lanza o configura más tarde, como OpenClaw incrustado y otros adaptadores de tiempo de ejecución. OpenClaw almacena las definiciones de forma centralizada para que esos tiempos de ejecución no necesiten mantener sus propias listas duplicadas de servidores MCP.

<AccordionGroup>
  <Accordion title="Comportamiento importante">
    - estos comandos solo leen o escriben la configuración de OpenClaw
    - `status`, `list`, `show`, `doctor` sin `--probe`, `set`, `configure`, `tools`, `logout`, `reload`, y `unset` no se conectan al servidor MCP de destino
    - `login` realiza el flujo de red OAuth de MCP para el servidor HTTP configurado y guarda las credenciales locales resultantes
    - `status --verbose` imprime las pistas de transporte, autenticación, tiempo de espera, filtro y llamada de herramienta paralela resueltas sin conectarse
    - `doctor` comprueba las definiciones guardadas en busca de problemas de configuración local, como comandos stdio faltantes, directorios de trabajo no válidos, archivos TLS faltantes, servidores deshabilitados, valores de encabezado/entorno sensibles literales y autorización OAuth incompleta
    - `doctor --probe` añade la misma prueba de conexión en vivo que `probe` después de que pasen las comprobaciones estáticas
    - `probe` se conecta al servidor seleccionado o a todos los servidores configurados, enumera las herramientas e informa de las capacidades/diagnósticos
    - `add` crea una definición a partir de indicadores y sondeos antes de guardarla, a menos que se establezca `--no-probe` o primero se necesite autorización OAuth
    - los adaptadores de tiempo de ejecución deciden qué formas de transporte realmente soportan en tiempo de ejecución
    - `enabled: false` mantiene un servidor guardado pero lo excluye del descubrimiento del tiempo de ejecución incrustado
    - `timeout` y `connectTimeout` establecen tiempos de espera de solicitud y conexión por servidor en segundos
    - `supportsParallelToolCalls: true` marca los servidores que los adaptadores pueden llamar simultáneamente
    - los servidores HTTP pueden usar encabezados estáticos, inicio de sesión OAuth, control de verificación TLS y rutas de certificado/clave mTLS
    - OpenClaw incrustado expone las herramientas MCP configuradas en perfiles de herramientas `coding` y `messaging` normales; `minimal` todavía las oculta y `tools.deny: ["bundle-mcp"]` las deshabilita explícitamente
    - `toolFilter.include` y `toolFilter.exclude` por servidor filtran las herramientas MCP descubiertas antes de que se conviertan en herramientas de OpenClaw
    - los servidores que anuncian recursos o prompts también exponen herramientas de utilidad para enumerar/leer recursos y enumerar/obtener prompts; esos nombres de utilidad generados (`resources_list`, `resources_read`, `prompts_list`, `prompts_get`) usan el mismo filtro de inclusión/exclusión
    - los cambios dinámicos en la lista de herramientas MCP invalidan el catálogo en caché para esa sesión; el siguiente descubrimiento/uso se actualiza desde el servidor
    - fallos repetidos de solicitud/protocolo de herramienta MCP pausan brevemente ese servidor para que un servidor roto no consuma todo el turno
    - los tiempos de ejecución de MCP empaquetados con ámbito de sesión se recolectan después de `mcp.sessionIdleTtlMs` milisegundos de tiempo de inactividad (predeterminado 10 minutos; configure `0` para deshabilitar) y las ejecuciones incrustadas de un solo golpe las limpian al final de la ejecución

  </Accordion>
</AccordionGroup>

Los adaptadores de tiempo de ejecución pueden normalizar este registro compartido en la forma que su cliente descendente espera. Por ejemplo, OpenClaw integrado consume valores `transport` de OpenClaw directamente, mientras que Claude Code y Gemini reciben valores `type` nativos de la CLI, como `http`, `sse` o `stdio`.

El servidor de aplicaciones de Codex también respeta un bloque `codex` opcional en cada servidor. Estos son metadatos de proyección de OpenClaw solo para los hilos del servidor de aplicaciones de Codex; no cambia las sesiones de ACP, la configuración genérica del arnés de Codex u otros adaptadores de tiempo de ejecución. Use `codex.agents` no vacío para proyectar un servidor solo en IDs de agente específicos de OpenClaw. Las listas de agentes vacías, en blanco o no válidas son rechazadas por la validación de configuración y omitidas por la ruta de proyección en tiempo de ejecución en lugar de convertirse en globales. Use `codex.defaultToolsApprovalMode` (`auto`, `prompt` o `approve`) para emitir el `default_tools_approval_mode` nativo de Codex para un servidor de confianza. OpenClaw elimina los metadatos `codex` antes de entregar la configuración `mcp_servers` nativa a Codex.

### Definiciones de servidor MCP guardadas

OpenClaw también almacena un registro ligero de servidores MCP en la configuración para las superficies que desean definiciones MCP administradas por OpenClaw.

Comandos:

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status [--verbose]`
- `openclaw mcp doctor [name] [--probe]`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

Notas:

- `list` ordena los nombres de los servidores.
- `show` sin un nombre imprime el objeto completo del servidor MCP configurado.
- `status` clasifica los transportes configurados sin conectarse. `--verbose` incluye los detalles resueltos de inicio, tiempo de espera, OAuth, filtro y llamadas en paralelo.
- `doctor` realiza comprobaciones estáticas sin conectarse. Añada `--probe` cuando el comando también deba verificar que los servidores habilitados se conectan.
- `probe` se conecta e informa sobre el recuento de herramientas, soporte de recursos/indicaciones, soporte de cambios de lista y diagnósticos.
- `add` acepta indicadores stdio como `--command`, `--arg`, `--env` y `--cwd`, o indicadores HTTP como `--url`, `--transport`, `--header`, `--auth oauth`, TLS, tiempo de espera e indicadores de selección de herramientas.
- `set` espera un valor de objeto JSON en la línea de comandos.
- `configure` actualiza la habilitación, filtros de herramientas, tiempos de espera, OAuth, TLS e indicadores de llamadas a herramientas en paralelo sin reemplazar toda la definición del servidor.
- `tools` actualiza los filtros de herramientas por servidor. Las entradas de inclusión/exclusión son nombres de herramientas MCP y patrones glob `*` simples.
- `login` ejecuta el flujo OAuth para servidores HTTP configurados con `auth: "oauth"`. La primera ejecución imprime una URL de autorización; vuelva a ejecutar con `--code` después de la aprobación.
- `logout` borra las credenciales OAuth almacenadas para el servidor nombrado sin eliminar la definición del servidor guardada.
- `reload` elimina los tiempos de ejecución MCP en proceso almacenados en caché. Los procesos de puerta de enlace o agente en otro proceso aún necesitan su propia ruta de recarga o reinicio.
- Use `transport: "streamable-http"` para servidores MCP HTTP transmisibles. `openclaw mcp set` también normaliza `type: "http"` nativo de CLI a la misma forma de configuración canónica para compatibilidad.
- `unset` falla si el servidor nombrado no existe.

Ejemplos:

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### Recetas comunes de servidor

Estos ejemplos solo guardan las definiciones de servidor. Ejecute `openclaw mcp doctor --probe` después para demostrar que el servidor se inicia y expone las herramientas.

<Tabs>
  <Tab title="Sistema de archivos">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    Limite los servidores del sistema de archivos al árbol de directorios más pequeño que el agente debe leer o editar.

  </Tab>
  <Tab title="Memoria">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    Utilice un filtro de herramientas si el servidor expone herramientas de escritura que no deberían estar disponibles para los agentes normales.

  </Tab>
  <Tab title="Script local">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` verifica que `cwd` existe y que el comando se resuelve desde el entorno configurado.

  </Tab>
  <Tab title="HTTP remoto">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    Use OAuth cuando el servidor remoto lo admita. Si el servidor requiere encabezados estáticos, evite confirmar tokens de portador literales.

  </Tab>
  <Tab title="Escritorio/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,observe,click,type'
    openclaw mcp doctor cua-driver --probe
    ```

    Los servidores de control de escritorio directo heredan los permisos del proceso que inician. Utilice filtros de herramientas estrechos y mensajes de permisos a nivel de sistema operativo.

  </Tab>
</Tabs>

### Formas de salida JSON

Use `--json` para scripts y paneles. Los conjuntos de campos pueden crecer con el tiempo, por lo que los consumidores deben ignorar las claves desconocidas.

<AccordionGroup>
  <Accordion title="status --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion title="doctor --">
    ```json
    {
      "ok": false,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": false,
          "issues": [
            {
              "level": "error",
              "message": "OAuth credentials are not authorized; run openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    `doctor --json` sale con un valor distinto de cero cuando cualquier servidor verificado habilitado tiene un error. Las advertencias se reportan pero no hacen que el comando falle por sí mismas.

  </Accordion>
  <Accordion title="probe --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "resources": true,
          "prompts": false,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe` abre una sesión de cliente MCP en vivo. Úselo para demostrar accesibilidad y capacidad, no para auditorías de configuración estática.

  </Accordion>
</AccordionGroup>

Ejemplo de forma de configuración:

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
        "transport": "streamable-http",
        "timeout": 20,
        "connectTimeout": 5,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        }
      }
    }
  }
}
```

### Transporte Stdio

Inicia un proceso hijo local y se comunica a través de stdin/stdout.

| Campo                      | Descripción                               |
| -------------------------- | ----------------------------------------- |
| `command`                  | Ejecutable para iniciar (requerido)       |
| `args`                     | Matriz de argumentos de línea de comandos |
| `env`                      | Variables de entorno adicionales          |
| `cwd` / `workingDirectory` | Directorio de trabajo para el proceso     |

<Warning>
**Filtro de seguridad de variables de entorno de Stdio**

OpenClaw rechaza las claves de entorno de inicio del intérprete que pueden alterar cómo se inicia un servidor MCP stdio antes del primer RPC, incluso si aparecen en el bloque `env` de un servidor. Las claves bloqueadas incluyen `NODE_OPTIONS`, `NODE_REDIRECT_WARNINGS`, `NODE_REPL_EXTERNAL_MODULE`, `NODE_REPL_HISTORY`, `NODE_V8_COVERAGE`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4` y variables de control de tiempo de ejecución similares. El inicio rechaza estas con un error de configuración para que no puedan inyectar un preludio implícito, intercambiar el intérprete, habilitar un depurador o redirigir la salida de tiempo de ejecución contra el proceso stdio. Las variables de entorno ordinarias de credenciales, proxy y específicas del servidor (`GITHUB_TOKEN`, `HTTP_PROXY`, `*_API_KEY` personalizadas, etc.) no se ven afectadas.

Si su servidor MCP realmente necesita una de las variables bloqueadas, configúrela en el proceso host de la puerta de enlace en lugar de bajo el `env` del servidor stdio.

</Warning>

### Transporte SSE / HTTP

Se conecta a un servidor MCP remoto a través de eventos enviados por el servidor HTTP (HTTP SSE).

| Campo                          | Descripción                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `url`                          | URL HTTP o HTTPS del servidor remoto (requerido)                                            |
| `headers`                      | Mapa opcional de clave-valor de encabezados HTTP (por ejemplo, tokens de autenticación)     |
| `connectionTimeoutMs`          | Tiempo de espera de conexión por servidor en ms (opcional)                                  |
| `connectTimeout`               | Tiempo de espera de conexión por servidor en segundos (opcional)                            |
| `timeout` / `requestTimeoutMs` | Tiempo de espera de solicitud MCP por servidor en segundos o ms                             |
| `auth: "oauth"`                | Usar el almacenamiento de tokens OAuth de MCP y `openclaw mcp login`                        |
| `sslVerify`                    | Establecer en false solo para puntos de conexión HTTPS privados explícitamente de confianza |
| `clientCert` / `clientKey`     | Rutas de certificado y clave de cliente mTLS                                                |
| `supportsParallelToolCalls`    | Sugerencia de que las llamadas concurrentes son seguras para este servidor                  |

Ejemplo:

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "timeout": 20,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

Los valores confidenciales en `url` (userinfo) y `headers` se redactan en los registros y en la salida de estado. `openclaw mcp doctor` advierte cuando las entradas `headers` o `env` con aspecto confidencial contienen valores literales, para que los operadores puedan mover esos valores fuera de la configuración confirmada.

### Flujo de trabajo de OAuth

OAuth es para servidores MCP HTTP que anuncian el flujo de OAuth de MCP. Los encabezados estáticos `Authorization` se ignoran para un servidor mientras `auth: "oauth"` está habilitado.

<Steps>
  <Step title="Guardar el servidor">
    Agregue o actualice el servidor con `auth: "oauth"` y cualquier metadato opcional de OAuth.

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

  </Step>
  <Step title="Iniciar sesión">
    Ejecute login para crear la solicitud de autorización.

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw imprime la URL de autorización y almacena el estado temporal del verificador de OAuth en el directorio de estado de OpenClaw.

  </Step>
  <Step title="Finalizar con el código">
    Después de aprobar en el navegador, devuelva el código a OpenClaw.

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="Verificar autorización">
    Use status o doctor para confirmar que los tokens están presentes.

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step title="Borrar credenciales">
    Logout elimina las credenciales de OAuth almacenadas pero mantiene la definición del servidor guardada.

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

Si el proveedor rota los tokens o el estado de autorización se bloquea, ejecute `openclaw mcp logout <name>` y luego repita `login`. `logout` puede borrar las credenciales de un servidor HTTP guardado incluso después de que `auth: "oauth"` se haya eliminado de la configuración, siempre que el nombre del servidor y la URL sigan identificando la entrada en el almacén de credenciales.

### Transporte HTTP transmitible (streamable)

`streamable-http` es una opción de transporte adicional junto con `sse` y `stdio`. Utiliza transmisión HTTP para la comunicación bidireccional con servidores MCP remotos.

| Campo                          | Descripción                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `url`                          | URL HTTP o HTTPS del servidor remoto (obligatorio)                                                            |
| `transport`                    | Establézcalo en `"streamable-http"` para seleccionar este transporte; cuando se omite, OpenClaw utiliza `sse` |
| `headers`                      | Mapa opcional de clave-valor de encabezados HTTP (por ejemplo, tokens de autenticación)                       |
| `connectionTimeoutMs`          | Tiempo de espera de conexión por servidor en ms (opcional)                                                    |
| `connectTimeout`               | Tiempo de espera de conexión por servidor en segundos (opcional)                                              |
| `timeout` / `requestTimeoutMs` | Tiempo de espera de solicitud MCP por servidor en segundos o ms                                               |
| `auth: "oauth"`                | Usar almacenamiento de tokens de OAuth de MCP y `openclaw mcp login`                                          |
| `sslVerify`                    | Establecer en false solo para puntos finales HTTPS privados explícitamente confiables                         |
| `clientCert` / `clientKey`     | Rutas de certificado de cliente y clave mTLS                                                                  |
| `supportsParallelToolCalls`    | Sugerencia de que las llamadas concurrentes son seguras para este servidor                                    |

La configuración de OpenClaw utiliza `transport: "streamable-http"` como la ortografía canónica. Los valores `type: "http"` de MCP nativos de la CLI se aceptan cuando se guardan a través de `openclaw mcp set` y se reparan mediante `openclaw doctor --fix` en la configuración existente, pero `transport` es lo que OpenClaw integrado consume directamente.

Ejemplo:

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectTimeout": 10,
        "timeout": 30,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>Los comandos del registro no inician el puente del canal. Solo `probe` y `doctor --probe` abren una sesión en vivo del cliente MCP para probar que el servidor de destino es alcanzable.</Note>

## Interfaz de usuario de control

La interfaz de usuario de control del navegador incluye una página dedicada a la configuración de MCP en `/mcp`. Muestra los recuentos de servidores configurados, resúmenes de habilitados/OAuth/filtros, filas de transporte por servidor, controles de habilitar/deshabilitar, comandos comunes de CLI y un editor con alcance para la sección de configuración `mcp`.

Use la página para ediciones del operador e inventario rápido. Use `openclaw mcp doctor --probe` o `openclaw mcp probe` cuando necesite una prueba en vivo del servidor.

Flujo de trabajo del operador:

1. Abra la interfaz de usuario de control y elija **MCP**.
2. Revise las tarjetas de resumen para el total, habilitados, OAuth y servidores filtrados.
3. Use cada fila de servidor para el transporte, autenticación, filtros, tiempo de espera y sugerencias de comandos.
4. Alterne la habilitación cuando desee mantener una definición pero excluirla del descubrimiento en tiempo de ejecución.
5. Edite la sección de configuración `mcp` con alcance para cambios estructurales como nuevos servidores, encabezados, TLS, metadatos de OAuth o filtros de herramientas.
6. Elija **Guardar** para persistir solo la configuración, o **Guardar y publicar** para aplicar a través de la ruta de configuración de Gateway.
7. Ejecute `openclaw mcp doctor --probe` cuando necesite una prueba en vivo de que el servidor editado se inicia y enumera las herramientas.

Notas:

- los fragmentos de comando citan los nombres de los servidores para que los nombres inusuales puedan copiarse en un shell
- los valores tipo URL mostrados se redactan antes de renderizarse cuando contienen credenciales incrustadas
- la página no inicia los transportes MCP por sí sola
- los tiempos de ejecución activos pueden necesitar `openclaw mcp reload`, publicación de configuración de Gateway o reinicio del proceso, dependiendo de qué proceso sea dueño de los clientes MCP

## Límites actuales

Esta página documenta el puente tal como se entrega hoy.

Límites actuales:

- el descubrimiento de conversaciones depende de los metadatos de ruta de sesión de Gateway existentes
- no hay un protocolo de inserción genérico más allá del adaptador específico de Claude
- aún no hay herramientas de edición o reacción de mensajes
- el transporte HTTP/SSE/streamable-http se conecta a un solo servidor remoto; aún no hay multiplexación ascendente
- `permissions_list_open` solo incluye las aprobaciones observadas mientras el puente está conectado

## Relacionado

- [Referencia de CLI](/es/cli)
- [Complementos](/es/cli/plugins)

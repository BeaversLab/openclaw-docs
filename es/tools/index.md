---
summary: "Superficie de herramientas de agente para OpenClaw (navegador, lienzo, nodos, mensaje, cron) que reemplaza las habilidades `openclaw-*` heredadas"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "Herramientas"
---

# Herramientas (OpenClaw)

OpenClaw expone **herramientas de agente de primera clase** para navegador, lienzo, nodos y cron.
Estas reemplazan las antiguas habilidades `openclaw-*`: las herramientas están tipificadas, sin uso de shell,
y el agente debería depender de ellas directamente.

## Deshabilitar herramientas

Puedes permitir/denegar herramientas globalmente mediante `tools.allow` / `tools.deny` en `openclaw.json`
(la denegación prima). Esto evita que las herramientas no permitidas se envíen a los proveedores de modelos.

```json5
{
  tools: { deny: ["browser"] },
}
```

Notas:

- La coincidencia no distingue entre mayúsculas y minúsculas.
- Se admiten comodines `*` (`"*"` significa todas las herramientas).
- Si `tools.allow` solo hace referencia a nombres de herramientas de complementos desconocidos o no cargados, OpenClaw registra una advertencia e ignora la lista de permitidos para que las herramientas principales permanezcan disponibles.

## Perfiles de herramientas (lista de permitidos base)

`tools.profile` establece una **lista de permitidos de herramientas base** antes de `tools.allow`/`tools.deny`.
Anulación por agente: `agents.list[].tools.profile`.

Perfiles:

- `minimal`: solo `session_status`
- `coding`: `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging`: `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full`: sin restricción (igual que sin establecer)

Ejemplo (solo mensajería por defecto, también permitir herramientas de Slack + Discord):

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

Ejemplo (perfil de codificación, pero denegar exec/proceso en todas partes):

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

Ejemplo (perfil de codificación global, agente de soporte de solo mensajería):

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] },
      },
    ],
  },
}
```

## Política de herramientas específica del proveedor

Use `tools.byProvider` to **further restrict** tools for specific providers
(or a single `provider/model`) without changing your global defaults.
Per-agent override: `agents.list[].tools.byProvider`.

This is applied **after** the base tool profile and **before** allow/deny lists,
so it can only narrow the tool set.
Provider keys accept either `provider` (e.g. `google-antigravity`) or
`provider/model` (e.g. `openai/gpt-5.2`).

Example (keep global coding profile, but minimal tools for Google Antigravity):

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

Example (provider/model-specific allowlist for a flaky endpoint):

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

Example (agent-specific override for a single provider):

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] },
          },
        },
      },
    ],
  },
}
```

## Tool groups (shorthands)

Tool policies (global, agent, sandbox) support `group:*` entries that expand to multiple tools.
Use these in `tools.allow` / `tools.deny`.

Available groups:

- `group:runtime`: `exec`, `bash`, `process`
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:openclaw`: all built-in OpenClaw tools (excludes provider plugins)

Example (allow only file tools + browser):

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## Plugins + tools

Los complementos pueden registrar **herramientas adicionales** (y comandos de CLI) más allá del conjunto principal.
Consulte [Plugins](/es/tools/plugin) para la instalación y la configuración, y [Skills](/es/tools/skills) para saber cómo se inyecta la guía de uso de herramientas en los prompts. Algunos complementos incluyen sus propias habilidades junto con las herramientas (por ejemplo, el complemento de llamadas de voz).

Herramientas opcionales de complementos:

- [Lobster](/es/tools/lobster): tiempo de ejecución de flujo de trabajo tipado con aprobaciones reanudables (requiere la CLI de Lobster en el host de puerta de enlace).
- [LLM Task](/es/tools/llm-task): paso de LLM solo JSON para la salida de flujo de trabajo estructurado (validación de esquema opcional).
- [Diffs](/es/tools/diffs): visualizador de diferencias de solo lectura y renderizador de archivos PNG o PDF para texto antes/después o parches unificados.

## Inventario de herramientas

### `apply_patch`

Aplique parches estructurados en uno o más archivos. Úselo para ediciones de múltiples fragmentos.
Experimental: habilite mediante `tools.exec.applyPatch.enabled` (solo modelos de OpenAI).
`tools.exec.applyPatch.workspaceOnly` tiene como valor predeterminado `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si intencionalmente desea que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

### `exec`

Ejecute comandos de shell en el espacio de trabajo.

Parámetros principales:

- `command` (obligatorio)
- `yieldMs` (segundo plano automático después del tiempo de espera, predeterminado 10000)
- `background` (segundo plano inediato)
- `timeout` (segundos; finaliza el proceso si se excede, predeterminado 1800)
- `elevated` (bool; se ejecuta en el host si el modo elevado está habilitado/permitido; solo cambia el comportamiento cuando el agente está en modo sandbox)
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (id/nombre del nodo para `host=node`)
- ¿Necesita un TTY real? Establezca `pty: true`.

Notas:

- Devuelve `status: "running"` con un `sessionId` cuando está en segundo plano.
- Use `process` para sondear/registra/escribir/terminar/limpiar sesiones en segundo plano.
- Si `process` no está permitido, `exec` se ejecuta sincrónicamente e ignora `yieldMs`/`background`.
- `elevated` está controlado por `tools.elevated` más cualquier anulación de `agents.list[].tools.elevated` (ambos deben permitirlo) y es un alias para `host=gateway` + `security=full`.
- `elevated` solo cambia el comportamiento cuando el agente está en sandbox (de lo contrario, es una no-op).
- `host=node` puede dirigirse a una aplicación complementaria de macOS o a un host de nodo sin cabeza (`openclaw node run`).
- aprobaciones y listas permitidas de gateway/nodo: [Aprobaciones de ejecución](/es/tools/exec-approvals).

### `process`

Administrar sesiones de ejecución en segundo plano.

Acciones principales:

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

Notas:

- `poll` devuelve una nueva salida y el estado de salida cuando se completa.
- `log` admite `offset`/`limit` basados en líneas (omite `offset` para tomar las últimas N líneas).
- `process` está ámbito por agente; las sesiones de otros agentes no son visibles.

### `loop-detection` (guardarraíles del bucle de llamadas a herramientas)

OpenClaw rastrea el historial reciente de llamadas a herramientas y bloquea o advierte cuando detecta bucles repetitivos sin progreso.
Active con `tools.loopDetection.enabled: true` (el valor predeterminado es `false`).

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      historySize: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `genericRepeat`: patrón de llamada repetida de la misma herramienta + mismos parámetros.
- `knownPollNoProgress`: repetición de herramientas de tipo sondeo con salidas idénticas.
- `pingPong`: alternancia de patrones `A/B/A/B` sin progreso.
- Anulación por agente: `agents.list[].tools.loopDetection`.

### `web_search`

Busca en la web usando Perplexity, Brave, Gemini, Grok o Kimi.

Parámetros principales:

- `query` (obligatorio)
- `count` (1–10; predeterminado desde `tools.web.search.maxResults`)

Notas:

- Requiere una clave API para el proveedor elegido (recomendado: `openclaw configure --section web`).
- Activar mediante `tools.web.search.enabled`.
- Las respuestas se almacenan en caché (predeterminado 15 min).
- Consulte [Web tools](/es/tools/web) para la configuración.

### `web_fetch`

Obtiene y extrae contenido legible de una URL (HTML → markdown/texto).

Parámetros principales:

- `url` (obligatorio)
- `extractMode` (`markdown` | `text`)
- `maxChars` (truncar páginas largas)

Notas:

- Activar mediante `tools.web.fetch.enabled`.
- `maxChars` está limitado por `tools.web.fetch.maxCharsCap` (predeterminado 50000).
- Las respuestas se almacenan en caché (predeterminado 15 min).
- Para sitios con mucho JS, se prefiere la herramienta del navegador.
- Consulte [Web tools](/es/tools/web) para la configuración.
- Consulte [Firecrawl](/es/tools/firecrawl) para la alternativa opcional anti-bot.

### `browser`

Controla el navegador dedicado gestionado por OpenClaw.

Acciones principales:

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (devuelve bloque de imagen + `MEDIA:<path>`)
- `act` (acciones de IU: click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

Gestión de perfiles:

- `profiles` — enumera todos los perfiles del navegador con estado
- `create-profile` — crea un perfil nuevo con puerto asignado automáticamente (o `cdpUrl`)
- `delete-profile` — detener el navegador, eliminar los datos del usuario, quitar de la configuración (solo local)
- `reset-profile` — matar el proceso huérfano en el puerto del perfil (solo local)

Parámetros comunes:

- `profile` (opcional; el valor predeterminado es `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (opcional; selecciona un id/nombre de nodo específico)
  Notas:
- Requiere `browser.enabled=true` (el valor predeterminado es `true`; establezca `false` para desactivar).
- Todas las acciones aceptan el parámetro opcional `profile` para soporte de múltiples instancias.
- Omita `profile` para el valor predeterminado seguro: navegador aislado administrado por OpenClaw (`openclaw`).
- Use `profile="user"` para el navegador local real cuando importen los inicios de sesión/cookies existentes y el usuario esté presente para hacer clic/aprobar cualquier mensaje de adjuntar.
- Use `profile="chrome-relay"` solo para el flujo de adjuntar de la extensión de Chrome / botón de la barra de herramientas.
- `profile="user"` y `profile="chrome-relay"` son solo para el host; no los combine con objetivos de sandbox/nodo.
- Cuando se omite `profile`, se usa `browser.defaultProfile` (el valor predeterminado es `openclaw`).
- Nombres de perfil: solo alfanuméricos en minúsculas + guiones (máx. 64 caracteres).
- Rango de puertos: 18800-18899 (~100 perfiles máx.).
- Los perfiles remotos son solo para adjuntar (sin iniciar/detener/restablecer).
- Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente a él (a menos que fije `target`).
- `snapshot` tiene como valor predeterminado `ai` cuando Playwright está instalado; use `aria` para el árbol de accesibilidad.
- `snapshot` también admite opciones de instantánea de rol (`interactive`, `compact`, `depth`, `selector`) que devuelven referencias como `e12`.
- `act` requiere `ref` de `snapshot` (`12` numérico de las instantáneas de IA, o `e12` de las instantáneas de roles); use `evaluate` para necesidades raras de selector CSS.
- Evite `act` → `wait` de manera predeterminada; úselo solo en casos excepcionales (sin estado de interfaz de usuario confiable a la que esperar).
- `upload` puede opcionalmente pasar un `ref` para hacer clic automáticamente después de armar.
- `upload` también admite `inputRef` (ref aria) o `element` (selector CSS) para establecer `<input type="file">` directamente.

### `canvas`

Conduce el nodo Canvas (presentar, evaluar, instantánea, A2UI).

Acciones principales:

- `present`, `hide`, `navigate`, `eval`
- `snapshot` (devuelve bloque de imagen + `MEDIA:<path>`)
- `a2ui_push`, `a2ui_reset`

Notas:

- Usa el gateway `node.invoke` bajo el capó.
- Si no se proporciona ningún `node`, la herramienta elige uno predeterminado (nodo único conectado o nodo mac local).
- A2UI es solo v0.8 (sin `createSurface`); la CLI rechaza el JSONL v0.9 con errores de línea.
- Prueba rápida: `openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`.

### `nodes`

Descubrir y apuntar a nodos emparejados; enviar notificaciones; capturar cámara/pantalla.

Acciones principales:

- `status`, `describe`
- `pending`, `approve`, `reject` (emparejamiento)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

Notas:

- Los comandos de cámara/pantalla requieren que la aplicación del nodo esté en primer plano.
- Las imágenes devuelven bloques de imagen + `MEDIA:<path>`.
- Los videos devuelven `FILE:<path>` (mp4).
- Ubicación devuelve un payload JSON (lat/lon/precisión/marca de tiempo).
- `run` params: `command` argv array; opcional `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`.

Ejemplo (`run`):

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

Analizar una imagen con el modelo de imagen configurado.

Parámetros principales:

- `image` (ruta o URL requerida)
- `prompt` (opcional; por defecto es "Describe la imagen.")
- `model` (anulación opcional)
- `maxBytesMb` (límite de tamaño opcional)

Notas:

- Solo disponible cuando se configura `agents.defaults.imageModel` (primario o alternativos), o cuando se puede inferir un modelo de imagen implícito desde tu modelo predeterminado + autenticación configurada (emparejamiento de mejor esfuerzo).
- Usa el modelo de imagen directamente (independiente del modelo de chat principal).

### `pdf`

Analizar uno o más documentos PDF.

Para obtener el comportamiento completo, los límites, la configuración y los ejemplos, consulte [Herramienta PDF](/es/tools/pdf).

### `message`

Enviar mensajes y acciones de canal a través de Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams.

Acciones principales:

- `send` (texto + multimedia opcional; MS Teams también admite `card` para Tarjetas Adaptativas)
- `poll` (encuestas de WhatsApp/Discord/MS Teams)
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

Notas:

- `send` enruta WhatsApp a través de la Gateway; otros canales van directos.
- `poll` usa la Gateway para WhatsApp y MS Teams; las encuestas de Discord van directas.
- Cuando una llamada a la herramienta de mensajes está vinculada a una sesión de chat activa, los envíos se restringen al objetivo de esa sesión para evitar filtraciones entre contextos.

### `cron`

Gestionar trabajos cron y despertares de la Gateway.

Acciones principales:

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (poner en cola el evento del sistema + latido inmediato opcional)

Notas:

- `add` espera un objeto de trabajo cron completo (mismo esquema que el RPC `cron.add`).
- `update` usa `{ jobId, patch }` (`id` aceptado por compatibilidad).

### `gateway`

Reiniciar o aplicar actualizaciones al proceso Gateway en ejecución (in situ).

Acciones principales:

- `restart` (autoriza + envía `SIGUSR1` para el reinicio en proceso; `openclaw gateway` reinicio in situ)
- `config.schema.lookup` (inspeccionar una ruta de configuración a la vez sin cargar el esquema completo en el contexto del prompt)
- `config.get`
- `config.apply` (validar + escribir configuración + reiniciar + despertar)
- `config.patch` (fusionar actualización parcial + reiniciar + despertar)
- `update.run` (ejecutar actualización + reiniciar + despertar)

Notas:

- `config.schema.lookup` espera una ruta de configuración específica como `gateway.auth` o `agents.list.*.heartbeat`.
- Las rutas pueden incluir identificadores de complemento (plugins) separados por barras al dirigirse a `plugins.entries.<id>`, por ejemplo `plugins.entries.pack/one.config`.
- Use `delayMs` (por defecto es 2000) para evitar interrumpir una respuesta en curso.
- `config.schema` sigue disponible para los flujos internos de la Interfaz de Usuario de Control y no se expone a través de la herramienta del agente `gateway`.
- `restart` está habilitado de forma predeterminada; establezca `commands.restart: false` para deshabilitarlo.

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

Listar sesiones, inspeccionar el historial de transcripciones o enviar a otra sesión.

Parámetros principales:

- `sessions_list`: `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = ninguno)
- `sessions_history`: `sessionKey` (o `sessionId`), `limit?`, `includeTools?`
- `sessions_send`: `sessionKey` (o `sessionId`), `message`, `timeoutSeconds?` (0 = disparar y olvidar)
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (por defecto actual; acepta `sessionId`), `model?` (`default` borra la anulación)

Notas:

- `main` es la clave canónica de chat directo; global/unknown están ocultos.
- `messageLimit > 0` obtiene los últimos N mensajes por sesión (mensajes de herramientas filtrados).
- La orientación de la sesión está controlada por `tools.sessions.visibility` (por defecto `tree`: sesión actual + sesiones de subagentes generadas). Si ejecutas un agente compartido para varios usuarios, considera establecer `tools.sessions.visibility: "self"` para evitar la navegación entre sesiones.
- `sessions_send` espera la finalización completa cuando `timeoutSeconds > 0`.
- La entrega/anuncio ocurre después de la finalización y se realiza con el mejor esfuerzo; `status: "ok"` confirma que la ejecución del agente finalizó, no que el anuncio fue entregado.
- `sessions_spawn` admite `runtime: "subagent" | "acp"` (`subagent` por defecto). Para el comportamiento del tiempo de ejecución de ACP, consulta [ACP Agents](/es/tools/acp-agents).
- Para el tiempo de ejecución de ACP, `streamTo: "parent"` envía resúmenes de progreso de la ejecución inicial de vuelta a la sesión solicitante como eventos del sistema en lugar de entrega directa secundaria.
- `sessions_spawn` inicia una ejecución de subagente y publica una respuesta de anuncio de vuelta al chat solicitante.
  - Admite el modo de un solo uso (`mode: "run"`) y el modo persistente vinculado al hilo (`mode: "session"` con `thread: true`).
  - Si se omite `thread: true` y `mode`, el modo predeterminado es `session`.
  - `mode: "session"` requiere `thread: true`.
  - Si se omite `runTimeoutSeconds`, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` si está configurado; de lo contrario, el tiempo de espera predeterminado es `0` (sin tiempo de espera).
  - Los flujos vinculados al hilo de Discord dependen de `session.threadBindings.*` y `channels.discord.threadBindings.*`.
  - El formato de respuesta incluye `Status`, `Result` y estadísticas compactas.
  - `Result` es el texto de finalización del asistente; si falta, se usa el último `toolResult` como alternativa.
- El modo de finalización manual genera envíos directamente primero, con respaldo de cola y reintentos en fallas transitorias (`status: "ok"` significa que la ejecución finalizó, no que el anuncio se entregó).
- `sessions_spawn` admite archivos adjuntos en línea solo para el tiempo de ejecución del subagente (ACP los rechaza). Cada adjunto tiene `name`, `content` y `encoding` opcional (`utf8` o `base64`) y `mimeType`. Los archivos se materializan en el espacio de trabajo secundario en `.openclaw/attachments/<uuid>/` con un archivo de metadatos `.manifest.json`. La herramienta devuelve un recibo con `count`, `totalBytes`, `sha256` por archivo y `relDir`. El contenido de los adjuntos se redacta automáticamente de la persistencia de la transcripción.
  - Configure los límites mediante `tools.sessions_spawn.attachments` (`enabled`, `maxTotalBytes`, `maxFiles`, `maxFileBytes`, `retainOnSessionKeep`).
  - `attachAs.mountPath` es una sugerencia reservada para futuras implementaciones de montaje.
- `sessions_spawn` es no bloqueante y devuelve `status: "accepted"` inmediatamente.
- Las respuestas de ACP `streamTo: "parent"` pueden incluir `streamLogPath` (`*.acp-stream.jsonl` con ámbito de sesión) para seguir el historial de progreso.
- `sessions_send` ejecuta un ping-pong de respuesta (responda `REPLY_SKIP` para detener; máx. turnos vía `session.agentToAgent.maxPingPongTurns`, 0-5).
- Después del ping-pong, el agente de destino ejecuta un **paso de anuncio**; responda `ANNOUNCE_SKIP` para suprimir el anuncio.
- Fijación de sandbox: cuando la sesión actual está en sandbox y `agents.defaults.sandbox.sessionToolsVisibility: "spawned"`, OpenClaw fija `tools.sessions.visibility` a `tree`.

### `agents_list`

Enumere los ids de agente que la sesión actual puede apuntar con `sessions_spawn`.

Notas:

- El resultado está restringido a listas de permitidos por agente (`agents.list[].subagents.allowAgents`).
- Cuando se configura `["*"]`, la herramienta incluye todos los agentes configurados y marca `allowAny: true`.

## Parámetros (comunes)

Herramientas respaldadas por Gateway (`canvas`, `nodes`, `cron`):

- `gatewayUrl` (predeterminado `ws://127.0.0.1:18789`)
- `gatewayToken` (si auth está habilitado)
- `timeoutMs`

Nota: cuando se establece `gatewayUrl`, incluya `gatewayToken` explícitamente. Las herramientas no heredan credenciales de configuración
o del entorno para anulaciones, y la falta de credenciales explícitas es un error.

Herramienta de navegador:

- `profile` (opcional; el valor predeterminado es `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (opcional; fijar un id/nombre de nodo específico)
- Guías de solución de problemas:
  - Problemas de inicio/CDP en Linux: [Solución de problemas del navegador (Linux)](/es/tools/browser-linux-troubleshooting)
  - Gateway WSL2 + CDP de Chrome remoto en Windows: [Solución de problemas WSL2 + Windows + CDP de Chrome remoto](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## Flujos de agente recomendados

Automatización del navegador:

1. `browser` → `status` / `start`
2. `snapshot` (ai o aria)
3. `act` (clic/escribir/presionar)
4. `screenshot` si necesitas confirmación visual

Canvas render:

1. `canvas` → `present`
2. `a2ui_push` (opcional)
3. `snapshot`

Node targeting:

1. `nodes` → `status`
2. `describe` en el nodo elegido
3. `notify` / `run` / `camera_snap` / `screen_record`

## Seguridad

- Evita el `system.run` directo; usa `nodes` → `run` solo con el consentimiento explícito del usuario.
- Respeta el consentimiento del usuario para la captura de cámara/pantalla.
- Usa `status/describe` para asegurar los permisos antes de invocar comandos de medios.

## Cómo se presentan las herramientas al agente

Las herramientas se exponen en dos canales paralelos:

1. **Texto del prompt del sistema**: una lista legible por humanos + orientación.
2. **Esquema de herramienta**: las definiciones de funciones estructuradas enviadas a la API del modelo.

Eso significa que el agente ve tanto "qué herramientas existen" como "cómo llamarlas". Si una herramienta no aparece en el prompt del sistema o en el esquema, el modelo no puede invocarla.

import es from "/components/footer/es.mdx";

<es />

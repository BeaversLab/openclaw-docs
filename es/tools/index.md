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
Consulte [Complementos](/es/tools/plugin) para la instalación y la configuración, y [Habilidades](/es/tools/skills) para saber cómo
se inyecta la guía de uso de herramientas en los mensajes. Algunos complementos incluyen sus propias habilidades
junto con las herramientas (por ejemplo, el complemento de llamada de voz).

Herramientas opcionales de complementos:

- [Lobster](/es/tools/lobster): tiempo de ejecución de flujo de trabajo tipado con aprobaciones reanudables (requiere la CLI de Lobster en el host de la puerta de enlace).
- [LLM Task](/es/tools/llm-task): paso de LLM solo JSON para la salida de flujo de trabajo estructurada (validación de esquema opcional).
- [Diffs](/es/tools/diffs): visor de diferencias de solo lectura y renderizador de archivos PNG o PDF para texto antes/después o parches unificados.

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
- aprobaciones y listas de permisos de puerta de enlace/nodo: [Exec approvals](/es/tools/exec-approvals).

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

Busque en la web usando Brave, Firecrawl, Gemini, Grok, Kimi o Perplexity.

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
- `profile="user"` es solo para el host; no lo combine con objetivos de sandbox/nodo.
- Cuando se omite `profile`, se usa `browser.defaultProfile` (el valor predeterminado es `openclaw`).
- Nombres de perfil: solo alfanuméricos en minúsculas y guiones (máx. 64 caracteres).
- Rango de puertos: 18800-18899 (máx. ~100 perfiles).
- Los perfiles remotos son solo de conexión (sin iniciar/detener/restablecer).
- Si hay un nodo con capacidad de navegador conectado, la herramienta puede enrutar automáticamente a él (a menos que fije `target`).
- `snapshot` usa `ai` de forma predeterminada cuando Playwright está instalado; use `aria` para el árbol de accesibilidad.
- `snapshot` también admite opciones de instantánea de roles (`interactive`, `compact`, `depth`, `selector`) que devuelven referencias como `e12`.
- `act` requiere `ref` de `snapshot` (`12` numérico de las instantáneas de IA, o `e12` de las instantáneas de roles); use `evaluate` para necesidades raras de selector de CSS.
- Evite `act` → `wait` por defecto; úselo solo en casos excepcionales (sin estado de interfaz de usuario confiable en el que esperar).
- `upload` opcionalmente puede pasar un `ref` para hacer clic automáticamente después de armar.
- `upload` también soporta `inputRef` (ref aria) o `element` (selector CSS) para establecer `<input type="file">` directamente.

### `canvas`

Conducir el node Canvas (present, eval, snapshot, A2UI).

Acciones principales:

- `present`, `hide`, `navigate`, `eval`
- `snapshot` (devuelve bloque de imagen + `MEDIA:<path>`)
- `a2ui_push`, `a2ui_reset`

Notas:

- Usa el gateway `node.invoke` por debajo.
- Si no se proporciona ningún `node`, la herramienta elige una por defecto (único nodo conectado o nodo mac local).
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
- La ubicación devuelve una carga JSON (lat/lon/precisión/marca de tiempo).
- Parámetros `run`: matriz argv `command`; `cwd` opcional, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`.

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

Analiza una imagen con el modelo de imagen configurado.

Parámetros principales:

- `image` (ruta o URL requerida)
- `prompt` (opcional; el valor predeterminado es "Describe la imagen.")
- `model` (anulación opcional)
- `maxBytesMb` (límite de tamaño opcional)

Notas:

- Solo disponible cuando se configura `agents.defaults.imageModel` (principal o alternativas), o cuando se puede inferir un modelo de imagen implícito a partir de tu modelo predeterminado + autenticación configurada (emparejamiento con el mejor esfuerzo).
- Usa el modelo de imagen directamente (independiente del modelo de chat principal).

### `pdf`

Analiza uno o más documentos PDF.

Para obtener el comportamiento completo, los límites, la configuración y los ejemplos, consulta [Herramienta PDF](/es/tools/pdf).

### `message`

Envía mensajes y acciones de canal a través de Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams.

Acciones principales:

- `send` (texto + medios opcionales; MS Teams también admite `card` para tarjetas adaptables)
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

- `send` enruta WhatsApp a través del Gateway; otros canales van directos.
- `poll` usa el Gateway para WhatsApp y MS Teams; las encuestas de Discord van directas.
- Cuando una llamada a la herramienta de mensaje está vinculada a una sesión de chat activa, los envíos se limitan al objetivo de esa sesión para evitar fugas entre contextos.

### `cron`

Administrar trabajos cron y activaciones del Gateway.

Acciones principales:

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (poner en cola el evento del sistema + latido inmediato opcional)

Notas:

- `add` espera un objeto de trabajo cron completo (mismo esquema que el RPC `cron.add`).
- `update` usa `{ jobId, patch }` (`id` aceptado por compatibilidad).

### `gateway`

Reiniciar o aplicar actualizaciones al proceso del Gateway en ejecución (in situ).

Acciones principales:

- `restart` (autoriza + envía `SIGUSR1` para el reinicio en proceso; `openclaw gateway` reinicio in situ)
- `config.schema.lookup` (inspeccionar una ruta de configuración a la vez sin cargar el esquema completo en el contexto del prompt)
- `config.get`
- `config.apply` (validar + escribir configuración + reiniciar + despertar)
- `config.patch` (fusionar actualización parcial + reiniciar + despertar)
- `update.run` (ejecutar actualización + reiniciar + despertar)

Notas:

- `config.schema.lookup` espera una ruta de configuración específica como `gateway.auth` o `agents.list.*.heartbeat`.
- Las rutas pueden incluir ids de complementos delimitados por barras al dirigirse a `plugins.entries.<id>`, por ejemplo `plugins.entries.pack/one.config`.
- Use `delayMs` (por defecto 2000) para evitar interrumpir una respuesta en curso.
- `config.schema` sigue disponible para los flujos internos de la interfaz de usuario de Control y no se expone a través de la herramienta `gateway` del agente.
- `restart` está habilitado por defecto; establezca `commands.restart: false` para deshabilitarlo.

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
- `messageLimit > 0` obtiene los últimos N mensajes por sesión (mensajes de herramienta filtrados).
- La segmentación por sesión está controlada por `tools.sessions.visibility` (por defecto `tree`: sesión actual + sesiones de subagente generadas). Si ejecutas un agente compartido para varios usuarios, considera configurar `tools.sessions.visibility: "self"` para evitar la navegación entre sesiones.
- `sessions_send` espera a la finalización completa cuando `timeoutSeconds > 0`.
- La entrega/anuncio ocurre después de la finalización y es de mejor esfuerzo; `status: "ok"` confirma que la ejecución del agente finalizó, no que el anuncio fue entregado.
- `sessions_spawn` soporta `runtime: "subagent" | "acp"` (`subagent` por defecto). Para el comportamiento del tiempo de ejecución ACP, consulta [ACP Agents](/es/tools/acp-agents).
- Para el tiempo de ejecución ACP, `streamTo: "parent"` envía resúmenes de progreso de la ejecución inicial de vuelta a la sesión solicitante como eventos del sistema en lugar de entrega de hijo directo.
- `sessions_spawn` inicia una ejecución de subagente y publica una respuesta de anuncio de vuelta al chat solicitante.
  - Soporta el modo de un solo uso (`mode: "run"`) y el modo persistente ligado a hilos (`mode: "session"` con `thread: true`).
  - Si `thread: true` y `mode` se omiten, el modo predeterminado es `session`.
  - `mode: "session"` requiere `thread: true`.
  - Si `runTimeoutSeconds` se omite, OpenClaw usa `agents.defaults.subagents.runTimeoutSeconds` cuando está configurado; de lo contrario, el tiempo de espera predeterminado es `0` (sin tiempo de espera).
  - Los flujos vinculados a hilos de Discord dependen de `session.threadBindings.*` y `channels.discord.threadBindings.*`.
  - El formato de respuesta incluye `Status`, `Result` y estadísticas compactas.
  - `Result` es el texto de finalización del asistente; si falta, se usa el último `toolResult` como respaldo.
- El modo de finalización manual genera envíos primero directamente, con respaldo de cola y reintentos en fallos transitorios (`status: "ok"` significa que la ejecución finalizó, no que el anuncio se entregó).
- `sessions_spawn` admite archivos adjuntos en línea solo para el tiempo de ejecución del subagente (ACP los rechaza). Cada archivo adjunto tiene `name`, `content` y `encoding` opcional (`utf8` o `base64`) y `mimeType`. Los archivos se materializan en el espacio de trabajo secundario en `.openclaw/attachments/<uuid>/` con un archivo de metadatos `.manifest.json`. La herramienta devuelve un recibo con `count`, `totalBytes`, `sha256` por archivo y `relDir`. El contenido de los adjuntos se redacta automáticamente de la persistencia de la transcripción.
  - Configure los límites mediante `tools.sessions_spawn.attachments` (`enabled`, `maxTotalBytes`, `maxFiles`, `maxFileBytes`, `retainOnSessionKeep`).
  - `attachAs.mountPath` es una sugerencia reservada para futuras implementaciones de montaje.
- `sessions_spawn` es no bloqueante y devuelve `status: "accepted"` inmediatamente.
- Las respuestas de ACP `streamTo: "parent"` pueden incluir `streamLogPath` (`*.acp-stream.jsonl` con alcance de sesión) para seguir el historial de progreso.
- `sessions_send` ejecuta un ping‑pong de respuesta (responda `REPLY_SKIP` para detener; máx. turnos vía `session.agentToAgent.maxPingPongTurns`, 0–5).
- Después del ping‑pong, el agente objetivo ejecuta un **paso de anuncio**; responda `ANNOUNCE_SKIP` para suprimir el anuncio.
- Fijación de sandbox (sandbox clamp): cuando la sesión actual está en sandbox y `agents.defaults.sandbox.sessionToolsVisibility: "spawned"`, OpenClaw fija `tools.sessions.visibility` a `tree`.

### `agents_list`

Enumere los ids de agentes que la sesión actual puede objetivo con `sessions_spawn`.

Notas:

- El resultado está restringido a listas de permitidos por agente (`agents.list[].subagents.allowAgents`).
- Cuando se configura `["*"]`, la herramienta incluye todos los agentes configurados y marca `allowAny: true`.

## Parámetros (comunes)

Herramientas respaldadas por Gateway (`canvas`, `nodes`, `cron`):

- `gatewayUrl` (predeterminado `ws://127.0.0.1:18789`)
- `gatewayToken` (si la autenticación está habilitada)
- `timeoutMs`

Nota: cuando se establece `gatewayUrl`, incluya `gatewayToken` explícitamente. Las herramientas no heredan credenciales de configuración
ni de entorno para anulaciones, y la falta de credenciales explícitas es un error.

Herramienta de navegador:

- `profile` (opcional; el valor predeterminado es `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (opcional; fijar un id/nombre de nodo específico)
- Guías de solución de problemas:
  - Problemas de inicio/CDP en Linux: [Solución de problemas del navegador (Linux)](/es/tools/browser-linux-troubleshooting)
  - WSL2 Gateway + Chrome remoto de Windows CDP: [Solución de problemas de WSL2 + Windows + CDP de Chrome remoto](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## Flujos de agente recomendados

Automatización del navegador:

1. `browser` → `status` / `start`
2. `snapshot` (ai o aria)
3. `act` (clic/escribir/pulsar)
4. `screenshot` si necesita confirmación visual

Renderizado de lienzo (Canvas):

1. `canvas` → `present`
2. `a2ui_push` (opcional)
3. `snapshot`

Dirigirse a nodos:

1. `nodes` → `status`
2. `describe` en el nodo elegido
3. `notify` / `run` / `camera_snap` / `screen_record`

## Seguridad

- Evite el `system.run` directo; use `nodes` → `run` solo con el consentimiento explícito del usuario.
- Respete el consentimiento del usuario para la captura de cámara/pantalla.
- Use `status/describe` para garantizar los permisos antes de invocar comandos multimedia.

## Cómo se presentan las herramientas al agente

Las herramientas se exponen en dos canales paralelos:

1. **Texto del mensaje del sistema**: una lista legible por humanos + orientación.
2. **Esquema de herramienta (Tool schema)**: las definiciones de funciones estructuradas enviadas a la API del modelo.

Esto significa que el agente ve tanto “qué herramientas existen” como “cómo llamarlas”. Si una herramienta
no aparece en el mensaje del sistema ni en el esquema, el modelo no puede invocarla.

import es from "/components/footer/es.mdx";

<es />

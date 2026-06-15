---
summary: "Configuración de herramientas (política, interruptores experimentales, herramientas respaldadas por proveedores) y configuración de proveedores personalizados / URL base"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "Configuración: herramientas y proveedores personalizados"
sidebarTitle: "Herramientas y proveedores personalizados"
---

Claves de configuración de `tools.*` y configuración de proveedor personalizado / URL base. Para agentes, canales y otras claves de configuración de nivel superior, consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Herramientas

### Perfiles de herramientas

`tools.profile` establece una lista de permitidos (allowlist) base antes de `tools.allow`/`tools.deny`:

<Note>La incorporación local establece de forma predeterminada las nuevas configuraciones locales en `tools.profile: "coding"` cuando no están definidas (se preservan los perfiles explícitos existentes).</Note>

| Perfil      | Incluye                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | Solo `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Sin restricción (igual que sin configurar)                                                                                      |

### Grupos de herramientas

| Grupo              | Herramientas                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` se acepta como un alias para `exec`)                                                  |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                            |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`           |
| `group:memory`     | `memory_search`, `memory_get`                                                                                                     |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                             |
| `group:ui`         | `browser`, `canvas`                                                                                                               |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                            |
| `group:messaging`  | `message`                                                                                                                         |
| `group:nodes`      | `nodes`                                                                                                                           |
| `group:agents`     | `agents_list`, `update_plan`                                                                                                      |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                              |
| `group:openclaw`   | Todas las herramientas integradas (excluye los complementos de proveedores)                                                       |
| `group:plugins`    | Herramientas propiedad de los complementos cargados, incluidos los servidores MCP configurados expuestos a través de `bundle-mcp` |

### Herramientas MCP y de complementos dentro de la política de herramientas de sandbox

Los servidores MCP configurados se exponen como herramientas propiedad de complementos bajo el id de complemento `bundle-mcp`. Los perfiles de herramientas normales pueden permitirlos, pero `tools.sandbox.tools` es una puerta adicional para las sesiones en sandbox. Si el modo sandbox es `"all"` o `"non-main"`, incluya una de estas entradas en la lista de permitidos de herramientas sandbox cuando las herramientas MCP/de complementos deban ser visibles:

- `bundle-mcp` para servidores MCP administrados por OpenClaw de `mcp.servers`
- el id del complemento para un complemento nativo específico
- `group:plugins` para todas las herramientas propiedad de complementos cargados
- nombres exactos de herramientas del servidor MCP o globales del servidor como `outlook__send_mail` o `outlook__*` cuando solo desee un servidor

Los patrones glob del servidor utilizan el prefijo seguro para el proveedor del servidor MCP, no necesariamente la clave `mcp.servers` sin procesar. Los caracteres que no son `[A-Za-z0-9_-]` se convierten en `-`, los nombres que no comienzan con una letra obtienen un prefijo `mcp-`, y los prefijos largos o duplicados pueden truncarse o recibir un sufijo; por ejemplo, `mcp.servers["Outlook Graph"]` utiliza un patrón glob como `outlook-graph__*`.

```json5
{
  agents: { defaults: { sandbox: { mode: "all" } } },
  mcp: {
    servers: {
      outlook: { command: "node", args: ["./outlook-mcp.js"] },
    },
  },
  tools: {
    sandbox: {
      tools: {
        alsoAllow: ["web_search", "web_fetch", "memory_search", "memory_get", "bundle-mcp"],
      },
    },
  },
}
```

Sin esa entrada de nivel de sandbox, el servidor MCP aún puede cargarse correctamente mientras que sus herramientas se filtran antes de la solicitud del proveedor. Use `openclaw doctor` para detectar esta situación para los servidores administrados por OpenClaw en `mcp.servers`. Los servidores MCP cargados desde manifiestos de complementos agrupados o Claude `.mcp.json` utilizan la misma puerta de enlace de sandbox, pero este diagnóstico aún no enumera esas fuentes; use las mismas entradas de lista blanca si sus herramientas desaparecen en turnos en sandbox.

### `tools.codeMode`

`tools.codeMode` habilita la superficie genérica del modo de código de OpenClaw. Cuando está habilitado
para una ejecución con herramientas, el modelo solo ve `exec` y `wait`; las herramientas normales de
OpenClaw se mueven detrás del puente de catálogo `tools.*` dentro del sandbox, y las herramientas MCP están
availables a través del espacio de nombres generado `MCP`.

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

La forma abreviada también se acepta:

```json5
{
  tools: { codeMode: true },
}
```

Las declaraciones MCP se exponen a través de la superficie del archivo API virtual de solo lectura en
modo de código. El código invitado puede llamar a `API.list("mcp")` y
`API.read("mcp/<server>.d.ts")` para inspeccionar firmas de estilo TypeScript antes de
llamar a `MCP.<server>.<tool>()`. Consulte [Code mode](/es/reference/code-mode) para obtener el
contrato de tiempo de ejecución, los límites y los pasos de depuración.

### `tools.allow` / `tools.deny`

Política global de permitir/denegar herramientas (la denegación gana). No distingue entre mayúsculas y minúsculas, admite comodines `*`. Se aplica incluso cuando el sandbox de Docker está desactivado.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` y `apply_patch` son ids de herramientas separadas. `allow: ["write"]` también habilita `apply_patch` para modelos compatibles, pero `deny: ["write"]` no deniega `apply_patch`. Para bloquear todas las mutaciones de archivos, deniegue `group:fs` o enumere cada herramienta de mutación explícitamente:

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

Restrinja aún más las herramientas para proveedores o modelos específicos. Orden: perfil base → perfil del proveedor → permitir/denegar.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.toolsBySender`

Restringe las herramientas para una identidad de solicitante específica. Esto es defensa en profundidad además del control de acceso del canal; los valores del remitente deben provenir del adaptador del canal, no del texto del mensaje.

```json5
{
  tools: {
    toolsBySender: {
      "channel:discord:1234567890123": { alsoAllow: ["group:fs"] },
      "id:guest-user-id": { deny: ["group:runtime", "group:fs"] },
      "*": { deny: ["exec", "process", "write", "edit", "apply_patch"] },
    },
  },
}
```

Las claves usan prefijos explícitos: `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` o `"*"`. Los ids de canal son ids canónicos de OpenClaw; los alias como `teams` se normalizan a `msteams`. Las claves heredadas sin prefijo se aceptan solo como `id:`. El orden de coincidencia es canal+id, id, e164, nombre de usuario, nombre y luego comodín.

`agents.list[].tools.toolsBySender` por agente anula la coincidencia global del remitente cuando coincide, incluso con una política `{}` vacía.

### `tools.elevated`

Controla el acceso elevado de ejecución fuera del sandbox:

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- La anulación por agente (`agents.list[].tools.elevated`) solo puede restringir aún más.
- `/elevated on|off|ask|full` almacena el estado por sesión; las directivas en línea se aplican a un solo mensaje.
- `exec` elevado omite el sandboxing y usa la ruta de escape configurada (`gateway` por defecto, o `node` cuando el objetivo de ejecución es `node`).

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

Las comprobaciones de seguridad del bucle de herramientas están **deshabilitadas de forma predeterminada**. Establezca `enabled: true` para activar la detección. La configuración puede definirse globalmente en `tools.loopDetection` y modificarse por agente en `agents.list[].tools.loopDetection`.

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  Historial máximo de llamadas a herramientas retenido para el análisis de bucles.
</ParamField>
<ParamField path="warningThreshold" type="number">
  Umbral de patrón repetitivo sin progreso para advertencias.
</ParamField>
<ParamField path="criticalThreshold" type="number">
  Umbral de repetición más alto para bloquear bucles críticos.
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  Umbral de parada forzosa para cualquier ejecución sin progreso.
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  Advertir sobre llamadas repetidas de la misma herramienta/mismos argumentos.
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  Advertir/bloquear en herramientas de sondeo conocidas (`process.poll`, `command_status`, etc.).
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  Advertir/bloquear en patrones de pares alternantes sin progreso.
</ParamField>

<Warning>
Si `warningThreshold >= criticalThreshold` o `criticalThreshold >= globalCircuitBreakerThreshold`, la validación falla.
</Warning>

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // or BRAVE_API_KEY env
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

Configura la comprensión de medios entrantes (imagen/audio/video):

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // deprecated: completions stay agent-mediated
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      image: {
        enabled: true,
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "gemma4:26b", timeoutSeconds: 300 }],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Campos de entrada del modelo multimedia">
    **Entrada de proveedor** (`type: "provider"` u omitida):

    - `provider`: id del proveedor de API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
    - `model`: anulación del id del modelo
    - `profile` / `preferredProfile`: selección de perfil `auth-profiles.json`

    **Entrada de CLI** (`type: "cli"`):

    - `command`: ejecutable a ejecutar
    - `args`: argumentos con plantillas (soporta `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.; `openclaw doctor --fix` migra los marcadores de posición obsoletos `{input}` a `{{MediaPath}}`)

    **Campos comunes:**

    - `capabilities`: lista opcional (`image`, `audio`, `video`). Valores predeterminados: `openai`/`anthropic`/`minimax` → imagen, `google` → imagen+audio+video, `groq` → audio.
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: anulaciones por entrada.
    - `tools.media.image.timeoutSeconds` y las entradas coincidentes del modelo de imagen `timeoutSeconds` también se aplican cuando el agente llama a la herramienta explícita `image`.
    - Los fallos recurren a la siguiente entrada.

    La autenticación del proveedor sigue el orden estándar: `auth-profiles.json` → variables de entorno → `models.providers.*.apiKey`.

    **Campos de finalización asíncrona:**

    - `asyncCompletion.directSend`: indicador de compatibilidad obsoleto. Las tareas multimedia asíncronas completadas permanecen mediadas por la sesión del solicitante para que el agente reciba el resultado, decida cómo informar al usuario y use la herramienta de mensaje cuando la entrega de origen lo requiera.

  </Accordion>
</AccordionGroup>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

Controla qué sesiones pueden ser objetivo de las herramientas de sesión (`sessions_list`, `sessions_history`, `sessions_send`).

Predeterminado: `tree` (sesión actual + sesiones generadas por ella, como subagentes).

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Ámbitos de visibilidad">
    - `self`: solo la clave de sesión actual.
    - `tree`: sesión actual + sesiones generadas por la sesión actual (subagentes).
    - `agent`: cualquier sesión perteneciente al id de agente actual (puede incluir otros usuarios si ejecutas sesiones por remitente bajo el mismo id de agente).
    - `all`: cualquier sesión. La orientación entre agentes aún requiere `tools.agentToAgent`.
    - Restricción de sandbox: cuando la sesión actual está en sandbox y `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilidad se fuerza a `tree` incluso si `tools.sessions.visibility="all"`.
    - Cuando no es `all`, `sessions_list` incluye un campo compacto `visibility`
      que describe el modo efectivo y una advertencia de que algunas sesiones pueden ser
      omitidas fuera del ámbito actual.

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

Controla el soporte de archivos adjuntos en línea para `sessions_spawn`.

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Notas sobre adjuntos">
    - Los adjuntos requieren `enabled: true`.
    - Los adjuntos de subagentes se materializan en el área de trabajo secundaria en `.openclaw/attachments/<uuid>/` con un `.manifest.json`.
    - Los adjuntos de ACP son solo de imágenes y se reenvían en línea al tiempo de ejecución de ACP después de que pasen los mismos límites de conteo de archivos, bytes por archivo y bytes totales.
    - El contenido de los adjuntos se redacta automáticamente de la persistencia de la transcripción.
    - Las entradas Base64 se validan con comprobaciones estrictas de alfabeto/relleno y un protector de tamaño predecodificación.
    - Los permisos de archivo de adjuntos de subagente son `0700` para directorios y `0600` para archivos.
    - La limpieza de subagentes sigue la política `cleanup`: `delete` siempre elimina los adjuntos; `keep` los conserva solo cuando `retainOnSessionKeep: true`.

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

Marcadores de herramientas integradas experimentales. Están desactivados por defecto a menos que se aplique una regla de activación automática estricta de GPT-5.

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool`: habilita la herramienta estructurada `update_plan` para el seguimiento de trabajo multipaso no trivial.
- Predeterminado: `false` a menos que `agents.defaults.embeddedAgent.executionContract` (o una anulación por agente) se establezca en `"strict-agentic"` para una ejecución de la familia GPT-5 de OpenAI u OpenAI Codex. Establezca `true` para forzar la herramienta fuera de ese alcance, o `false` para mantenerla desactivada incluso para ejecuciones de GPT-5 estrictamente agentes.
- Cuando está habilitado, el prompt del sistema también agrega orientación de uso para que el modelo solo lo use para trabajo sustancial y mantenga como máximo un paso `in_progress`.

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        announceTimeoutMs: 120000,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`: modelo predeterminado para subagentes generados. Si se omite, los subagentes heredan el modelo del autor de la llamada.
- `allowAgents`: lista de permitidos predeterminada de IDs de agentes de destino configurados para `sessions_spawn` cuando el agente solicitante no establece su propio `subagents.allowAgents` (`["*"]` = cualquier destino configurado; predeterminado: solo el mismo agente). Las entradas obsoletas cuya configuración de agente se eliminó son rechazadas por `sessions_spawn` y se omiten de `agents_list`; ejecute `openclaw doctor --fix` para limpiarlas.
- `runTimeoutSeconds`: tiempo de espera predeterminado (segundos) para `sessions_spawn`. `0` significa sin tiempo de espera.
- `announceTimeoutMs`: tiempo de espera por llamada (milisegundos) para los intentos de entrega de anuncios `agent` de la puerta de enlace. Predeterminado: `120000`. Los reintentos transitorios pueden hacer que la espera total del anuncio sea mayor que un tiempo de espera configurado.
- Política de herramientas por subagente: `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Proveedores personalizados y URL base

Los complementos de proveedores publican sus propias filas de catálogo de modelos. Agregue proveedores personalizados a través de `models.providers` en la configuración o `~/.openclaw/agents/<agentId>/agent/models.json`.

Configurar un proveedor personalizado/local `baseUrl` también es la decisión de confianza de red restringida para las solicitudes HTTP del modelo: OpenClaw permite ese origen `scheme://host:port` exacto a través de la ruta de obtención protegida, sin agregar una opción de configuración separada ni confiar en otros orígenes privados.

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Autenticación y precedencia de fusión">
    - Use `authHeader: true` + `headers` para necesidades de autenticación personalizadas.
    - Anule la raíz de configuración del agente con `OPENCLAW_AGENT_DIR``models.json`.
    - Precedencia de fusión para IDs de proveedores coincidentes:
      - Los valores de `baseUrl` del agente no vacíos tienen prioridad.
      - Los valores de `apiKey` del agente no vacíos tienen prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
      - Los valores de `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec) en lugar de persistir los secretos resueltos.
      - Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/exec).
      - Los valores de `apiKey`/`baseUrl` del agente vacíos o ausentes recurren a `models.providers` en la configuración.
      - El `contextWindow`/`maxTokens` del modelo coincidente usa el valor más alto entre la configuración explícita y los valores implícitos del catálogo.
      - El `contextTokens` del modelo coincidente conserva un límite de tiempo de ejecución explícito cuando está presente; úselo para limitar el contexto efectivo sin cambiar los metadatos nativos del modelo.
      - Los catálogos de complementos de proveedores se almacenan como fragmentos de catálogo generados y propiedad del complemento bajo el estado del complemento del agente.
      - Use `models.mode: "replace"` cuando desee que la configuración reescriba completamente `models.json` y los fragmentos de catálogo de complementos activos.
      - La persistencia de marcadores es con autoridad de origen: los marcadores se escriben desde la instantánea de configuración de origen activa (pre-resolución), no desde los valores de secretos de tiempo de ejecución resueltos.

  </Accordion>
</AccordionGroup>

### Detalles de los campos del proveedor

<AccordionGroup>
  <Accordion title="Catálogo de nivel superior">
    - `models.mode`: comportamiento del catálogo de proveedores (`merge` o `replace`).
    - `models.providers`: mapa de proveedores personalizados claveados por ID de proveedor.
      - Ediciones seguras: use `openclaw config set models.providers.<id> '<json>' --strict-json --merge` o `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` para actualizaciones aditivas. `config set` rechaza reemplazos destructivos a menos que pase `--replace`.

  </Accordion>
  <Accordion title="Proveedor conexión y autenticación">
    - `models.providers.*.api`: adaptador de solicitud (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc.). Para backends `/v1/chat/completions` autohospedados como MLX, vLLM, SGLang y la mayoría de los servidores locales compatibles con OpenAI, use `openai-completions`. Un proveedor personalizado con `baseUrl` pero sin `api` tiene como valor predeterminado `openai-completions`; establezca `openai-responses` solo cuando el backend sea compatible con `/v1/responses`.
    - `models.providers.*.apiKey`: credencial del proveedor (se prefiere la sustitución de SecretRef/env).
    - `models.providers.*.auth`: estrategia de autenticación (`api-key`, `token`, `oauth`, `aws-sdk`).
    - `models.providers.*.contextWindow`: ventana de contexto nativa predeterminada para los modelos de este proveedor cuando la entrada del modelo no establece `contextWindow`.
    - `models.providers.*.contextTokens`: límite efectivo de contexto de tiempo de ejecución predeterminado para los modelos de este proveedor cuando la entrada del modelo no establece `contextTokens`.
    - `models.providers.*.maxTokens`: límite predeterminado de tokens de salida para los modelos de este proveedor cuando la entrada del modelo no establece `maxTokens`.
    - `models.providers.*.timeoutSeconds`: tiempo de espera opcional de solicitud HTTP del modelo por proveedor en segundos, que incluye la conexión, los encabezados, el cuerpo y el manejo total de interrupción de la solicitud.
    - `models.providers.*.injectNumCtxForOpenAICompat`: para Ollama + `openai-completions`, inyecte `options.num_ctx` en las solicitudes (predeterminado: `true`).
    - `models.providers.*.authHeader`: fuerce el transporte de credenciales en el encabezado `Authorization` cuando sea necesario.
    - `models.providers.*.baseUrl`: URL base de la API ascendente.
    - `models.providers.*.headers`: encabezados estáticos adicionales para el enrutamiento de proxy/inquilino.

  </Accordion>
  <Accordion title="Sobrescrituras de transporte de solicitudes">
    `models.providers.*.request`: sobrescrituras de transporte para las solicitudes HTTP del proveedor de modelos.

    - `request.headers`: encabezados adicionales (fusionados con los predeterminados del proveedor). Los valores aceptan SecretRef.
    - `request.auth`: sobrescritura de estrategia de autenticación. Modos: `"provider-default"` (usar la autenticación integrada del proveedor), `"authorization-bearer"` (con `token`), `"header"` (con `headerName`, `value`, `prefix` opcional).
    - `request.proxy`: sobrescritura de proxy HTTP. Modos: `"env-proxy"` (usar variables de entorno `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (con `url`). Ambos modos aceptan un subobjeto `tls` opcional.
    - `request.tls`: sobrescritura de TLS para conexiones directas. Campos: `ca`, `cert`, `key`, `passphrase` (todos aceptan SecretRef), `serverName`, `insecureSkipVerify`.
    - `request.allowPrivateNetwork`: cuando es `true`, permite solicitudes HTTP del proveedor de modelos a rangos privados, CGNAT o similares a través del guardia de recuperación HTTP del proveedor. Las URL base de proveedores personalizados/localeles ya confían en el origen configurado exacto, excepto los orígenes de metadatos/enlace local, que permanecen bloqueados sin una aceptación explícita. Establézcalo en `false` para no participar de la confianza de origen exacto. WebSocket usa el mismo `request` para encabezados/TLS, pero no esa puerta SSRF de recuperación. Predeterminado `false`.

  </Accordion>
  <Accordion title="Entradas del catálogo de modelos">
    - `models.providers.*.models`: entradas explícitas del catálogo de modelos del proveedor.
    - `models.providers.*.models.*.input`: modalidades de entrada del modelo. Use `["text"]` para modelos de solo texto y `["text", "image"]` para modelos de imagen/visión nativos. Los archivos adjuntos de imagen solo se inyectan en los turnos del agente cuando el modelo seleccionado está marcado como capaz de procesar imágenes.
    - `models.providers.*.models.*.contextWindow`: metadatos de la ventana de contexto nativa del modelo. Esto anula `contextWindow` a nivel de proveedor para ese modelo.
    - `models.providers.*.models.*.contextTokens`: límite opcional de contexto en tiempo de ejecución. Esto anula `contextTokens` a nivel de proveedor; úselo cuando desee un presupuesto de contexto efectivo menor que la `contextWindow` nativa del modelo; `openclaw models list` muestra ambos valores cuando difieren.
    - `models.providers.*.models.*.compat.supportsDeveloperRole`: sugerencia opcional de compatibilidad. Para `api: "openai-completions"` con un `baseUrl` no nativo no vacío (host no `api.openai.com`), OpenClaw fuerza esto a `false` en tiempo de ejecución. `baseUrl` vacío u omitido mantiene el comportamiento predeterminado de OpenAI.
    - `models.providers.*.models.*.compat.requiresStringContent`: sugerencia opcional de compatibilidad para puntos de conexión de chat compatibles con OpenAI solo de texto. Cuando `true`, OpenClaw convierte las matrices `messages[].content` de texto puro en cadenas planas antes de enviar la solicitud.
    - `models.providers.*.models.*.compat.strictMessageKeys`: sugerencia opcional de compatibilidad para puntos de conexión de chat estrictamente compatibles con OpenAI. Cuando `true`, OpenClaw reduce los objetos de mensaje de Chat Completions salientes a `role` y `content` antes de enviar la solicitud.
    - `models.providers.*.models.*.compat.thinkingFormat`: sugerencia opcional de carga de pensamiento. Use `"together"` para `reasoning.enabled` estilo Together, `"qwen"` para `enable_thinking` de nivel superior, o `"qwen-chat-template"` para `chat_template_kwargs.enable_thinking` en servidores compatibles con OpenAI de la familia Qwen que admiten kwargs de plantilla de chat a nivel de solicitud, como vLLM. Los modelos Qwen de vLLM configurados exponen opciones binarias `/think` (`off`, `on`) para estos formatos.

  </Accordion>
  <Accordion title="Descubrimiento de Amazon Bedrock">
    - `plugins.entries.amazon-bedrock.config.discovery`: raíz de la configuración de autodescubrimiento de Bedrock.
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`: activar/desactivar el descubrimiento implícito.
    - `plugins.entries.amazon-bedrock.config.discovery.region`: región de AWS para el descubrimiento.
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`: filtro opcional de provider-id para el descubrimiento dirigido.
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`: intervalo de sondeo para la actualización del descubrimiento.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`: ventana de contexto de respaldo para modelos descubiertos.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`: tokens máximos de salida de respaldo para modelos descubiertos.

  </Accordion>
</AccordionGroup>

La incorporación interactiva de proveedores personalizados infiere la entrada de imagen para ID de modelos de visión comunes como GPT-4o, Claude, Gemini, Qwen-VL, LLaVA, Pixtral, InternVL, Mllama, MiniCPM-V y GLM-4V, y omite la pregunta adicional para familias conocidas de solo texto. Los ID de modelos desconocidos aún solicitan soporte de imagen. La incorporación no interactiva utiliza la misma inferencia; pase `--custom-image-input` para forzar metadatos con capacidad de imagen o `--custom-text-input` para forzar metadatos de solo texto.

### Ejemplos de proveedores

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    El complemento del proveedor `cerebras` incluido puede configurar esto a través de `openclaw onboard --auth-choice cerebras-api-key`. Use la configuración explícita del proveedor solo al anular los valores predeterminados.

    ```json5
    {
      env: { CEREBRAS_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/zai-glm-4.7",
            fallbacks: ["cerebras/gpt-oss-120b"],
          },
          models: {
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B (Cerebras)" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    Use `cerebras/zai-glm-4.7` para Cerebras; `zai/glm-4.7` para Z.AI directo.

  </Accordion>
  <Accordion title="Kimi Coding">
    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-for-coding" },
          models: { "kimi/kimi-for-coding": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    Proveedor integrado compatible con Anthropic. Atajo: `openclaw onboard --auth-choice kimi-code-api-key`.

  </Accordion>
  <Accordion title="Modelos locales (LM Studio)">
    Consulte [Modelos locales](/es/gateway/local-models). TL;DR: ejecute un modelo local grande a través de la API de respuestas de LM Studio en hardware potente; mantenga los modelos alojados fusionados para respaldo.
  </Accordion>
  <Accordion title="MiniMax M3 (direct)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    Establezca `MINIMAX_API_KEY`. Atajos: `openclaw onboard --auth-choice minimax-global-api` o `openclaw onboard --auth-choice minimax-cn-api`. El catálogo de modelos por defecto es M3 y también incluye las variantes M2.7. En la ruta de transmisión compatible con Anthropic, OpenClaw deshabilita el pensamiento de MiniMax de forma predeterminada a menos que usted establezca explícitamente `thinking`. `/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.

  </Accordion>
  <Accordion title="Moonshot AI (Kimi)">
    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    Para el punto de conexión de China: `baseUrl: "https://api.moonshot.cn/v1"` o `openclaw onboard --auth-choice moonshot-api-key-cn`.

    Los puntos de conexión nativos de Moonshot anuncian compatibilidad de uso de transmisión en el transporte compartido `openai-completions`, y las claves de OpenClaw priorizan las capacidades del punto de conexión en lugar del ID del proveedor integrado únicamente.

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    Establezca `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`). Use referencias `opencode/...` para el catálogo Zen o referencias `opencode-go/...` para el catálogo Go. Atajo: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`.

  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M2.5",
                name: "MiniMax M2.5",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 192000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    La URL base debe omitir `/v1` (el cliente de Anthropic lo anexa). Atajo: `openclaw onboard --auth-choice synthetic-api-key`.

  </Accordion>
  <Accordion title="Z.AI (GLM-4.7)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    Establezca `ZAI_API_KEY`. Las referencias de modelos utilizan el ID de proveedor canónico `zai/*`. Atajo: `openclaw onboard --auth-choice zai-api-key`.

    - Endpoint general: `https://api.z.ai/api/paas/v4`
    - Endpoint de codificación (predeterminado): `https://api.z.ai/api/coding/paas/v4`
    - Para el endpoint general, defina un proveedor personalizado con la invalidación de la URL base.

  </Accordion>
</AccordionGroup>

---

## Relacionado

- [Configuración — agentes](/es/gateway/config-agents)
- [Configuración — canales](/es/gateway/config-channels)
- [Referencia de configuración](/es/gateway/configuration-reference) — otras claves de nivel superior
- [Herramientas y complementos](/es/tools)

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

`tools.profile` establece una lista de permitidos base antes de `tools.allow`/`tools.deny`:

<Note>La incorporación local establece de forma predeterminada las nuevas configuraciones locales en `tools.profile: "coding"` cuando no se establecen (se preservan los perfiles explícitos existentes).</Note>

| Perfil      | Incluye                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | Solo `session_status`                                                                                                           |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Sin restricción (igual que sin configurar)                                                                                      |

### Grupos de herramientas

| Grupo              | Herramientas                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` se acepta como alias de `exec`)                                             |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `update_plan`                                                                                            |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | Todas las herramientas integradas (excluye los complementos de proveedores)                                             |

### `tools.allow` / `tools.deny`

Política global de permiso/denegación de herramientas (prevalece la denegación). Distingue entre mayúsculas y minúsculas, admite comodines `*`. Se aplica incluso cuando el sandbox de Docker está desactivado.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` y `apply_patch` son identificadores de herramientas separados. `allow: ["write"]` también habilita `apply_patch` para modelos compatibles, pero `deny: ["write"]` no deniega `apply_patch`. Para bloquear todas las mutaciones de archivos, deniegue `group:fs` o enumere cada herramienta de mutación explícitamente:

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

Restringir aún más las herramientas para proveedores o modelos específicos. Orden: perfil base → perfil del proveedor → permitir/denegar.

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

Restringe las herramientas para una identidad de solicitante específica. Esto es una defensa en profundidad además del control de acceso del canal; los valores del remitente deben provenir del adaptador del canal, no del texto del mensaje.

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

Las claves usan prefijos explícitos: `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` o `"*"`. Los IDs de canal son IDs canónicos de OpenClaw; los alias como `teams` se normalizan a `msteams`. Las claves heredadas sin prefijo solo se aceptan como `id:`. El orden de coincidencia es canal+id, id, e164, nombre de usuario, nombre y luego comodín.

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
- `exec` elevado omite el sandboxing y usa la ruta de escape configurada (`gateway` de forma predeterminada, o `node` cuando el objetivo de ejecución es `node`).

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

Las comprobaciones de seguridad del bucle de herramientas están **desactivadas de forma predeterminada**. Establezca `enabled: true` para activar la detección. La configuración se puede definir globalmente en `tools.loopDetection` y anularse por agente en `agents.list[].tools.loopDetection`.

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
  Umbral de patrón de repetición sin progreso para advertencias.
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
  Advertir/bloquear herramientas de sondeo conocidas (`process.poll`, `command_status`, etc.).
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  Advertir/bloquear patrones de pares alternantes sin progreso.
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
  <Accordion title="Campos de entrada del modelo de medios">
    **Entrada de proveedor** (`type: "provider"` u omitida):

    - `provider`: id del proveedor de API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
    - `model`: anulación del id del modelo
    - `profile` / `preferredProfile`: selección de perfil `auth-profiles.json`

    **Entrada de CLI** (`type: "cli"`):

    - `command`: ejecutable a ejecutar
    - `args`: argumentos con plantilla (soporta `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.; `openclaw doctor --fix` migra los marcadores de posición obsoletos `{input}` a `{{MediaPath}}`)

    **Campos comunes:**

    - `capabilities`: lista opcional (`image`, `audio`, `video`). Valores predeterminados: `openai`/`anthropic`/`minimax` → imagen, `google` → imagen+audio+vídeo, `groq` → audio.
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: anulaciones por entrada.
    - `tools.media.image.timeoutSeconds` y las entradas coincidentes del modelo de imagen `timeoutSeconds` también se aplican cuando el agente llama a la herramienta explícita `image`.
    - Los fallos recurren a la siguiente entrada.

    La autenticación del proveedor sigue el orden estándar: `auth-profiles.json` → vars de entorno → `models.providers.*.apiKey`.

    **Campos de finalización asíncrona:**

    - `asyncCompletion.directSend`: indicador de compatibilidad obsoleto. Las tareas de medios asíncronos completas permanecen mediadas por la sesión del solicitante para que el agente reciba el resultado, decida cómo informar al usuario y use la herramienta de mensaje cuando la entrega de la fuente lo requiera.

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
    - `agent`: cualquier sesión que pertenezca al id del agente actual (puede incluir otros usuarios si ejecutas sesiones por remitente bajo el mismo id de agente).
    - `all`: cualquier sesión. La orientación entre agentes aún requiere `tools.agentToAgent`.
    - Restricción de sandbox: cuando la sesión actual está en sandbox y `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilidad se fuerza a `tree` incluso si `tools.sessions.visibility="all"`.

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

Controla la compatibilidad de archivos adjuntos en línea para `sessions_spawn`.

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
    - Los archivos adjuntos solo son compatibles con `runtime: "subagent"`. El tiempo de ejecución de ACP los rechaza.
    - Los archivos se materializan en el espacio de trabajo secundario en `.openclaw/attachments/<uuid>/` con un `.manifest.json`.
    - El contenido de los adjuntos se redacta automáticamente de la persistencia de la transcripción.
    - Las entradas Base64 se validan con verificaciones estrictas de alfabeto/relleno y una protección de tamaño previa a la decodificación.
    - Los permisos de archivo son `0700` para directorios y `0600` para archivos.
    - La limpieza sigue la política `cleanup`: `delete` siempre elimina los adjuntos; `keep` los retiene solo cuando `retainOnSessionKeep: true`.

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

Marcadores de herramientas integradas experimentales. Desactivado por defecto a menos que se aplique una regla de habilitación automática estrictamente agente de GPT-5.

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
- Predeterminado: `false` a menos que `agents.defaults.embeddedPi.executionContract` (o una invalidación por agente) esté establecido en `"strict-agentic"` para una ejecución de la familia GPT-5 de OpenAI u OpenAI Codex. Establezca `true` para forzar la herramienta fuera de ese ámbito, o `false` para mantenerla desactivada incluso para ejecuciones GPT-5 estrictamente de agente.
- Cuando está habilitado, el prompt del sistema también agrega orientación de uso para que el modelo solo lo use para trabajos sustanciales y mantenga como máximo un paso `in_progress`.

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

- `model`: modelo predeterminado para sub-agentes generados. Si se omite, los sub-agentes heredan el modelo de quien realiza la llamada.
- `allowAgents`: lista de permitidos predeterminada de IDs de agente objetivo para `sessions_spawn` cuando el agente solicitante no establece su propio `subagents.allowAgents` (`["*"]` = cualquiera; predeterminado: solo el mismo agente).
- `runTimeoutSeconds`: tiempo de espera predeterminado (segundos) para `sessions_spawn` cuando la llamada a la herramienta omite `runTimeoutSeconds`. `0` significa sin tiempo de espera.
- `announceTimeoutMs`: tiempo de espera por llamada (milisegundos) para los intentos de entrega de anuncios `agent` de la puerta de enlace. Predeterminado: `120000`. Los reintentos transitorios pueden hacer que la espera total del anuncio sea mayor que un tiempo de espera configurado.
- Política de herramientas por sub-agente: `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Proveedores personalizados y URL base

OpenClaw usa el catálogo de modelos integrado. Agregue proveedores personalizados mediante `models.providers` en la configuración o `~/.openclaw/agents/<agentId>/agent/models.json`.

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
    - Use `authHeader: true` + `headers` para necesidades personalizadas de autenticación.
    - Anule la raíz de configuración del agente con `OPENCLAW_AGENT_DIR` (o `PI_CODING_AGENT_DIR`, un alias de variable de entorno heredado).
    - Precedencia de fusión para IDs de proveedor coincidentes:
      - Los valores de `models.json` `baseUrl` del agente no vacíos tienen prioridad.
      - Los valores de `apiKey` del agente no vacíos tienen prioridad solo cuando ese proveedor no está gestionado por SecretRef en el contexto de configuración/perfil de autenticación actual.
      - Los valores de `apiKey` del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/ejec) en lugar de persistir los secretos resueltos.
      - Los valores de encabezado del proveedor gestionados por SecretRef se actualizan desde los marcadores de origen (`secretref-env:ENV_VAR_NAME` para referencias de entorno, `secretref-managed` para referencias de archivo/ejec).
      - Los `apiKey`/`baseUrl` del agente vacíos o ausentes recurren a `models.providers` en la configuración.
      - Los `contextWindow`/`maxTokens` del modelo coincidente usan el valor más alto entre la configuración explícita y los valores implícitos del catálogo.
      - Los `contextTokens` del modelo coincidente conservan un límite de tiempo de ejecución explícito cuando está presente; úselo para limitar el contexto efectivo sin cambiar los metadatos nativos del modelo.
      - Use `models.mode: "replace"` cuando desee que la configuración reescriba completamente `models.json`.
      - La persistencia de marcadores es con autoridad de origen: los marcadores se escriben desde la instantánea de configuración de origen activa (pre-resolución), no desde los valores de secretos de tiempo de ejecución resueltos.

  </Accordion>
</AccordionGroup>

### Detalles de los campos del proveedor

<AccordionGroup>
  <Accordion title="Catálogo de nivel superior">
    - `models.mode`: comportamiento del catálogo de proveedores (`merge` o `replace`).
    - `models.providers`: mapa de proveedores personalizados claveados por id de proveedor.
      - Ediciones seguras: use `openclaw config set models.providers.<id> '<json>' --strict-json --merge` o `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` para actualizaciones aditivas. `config set` rechaza reemplazos destructivos a menos que pase `--replace`.

  </Accordion>
  <Accordion title="Conexión y autenticación del proveedor">
    - `models.providers.*.api`: adaptador de solicitud (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc.). Para backends `/v1/chat/completions` autohospedados como MLX, vLLM, SGLang y la mayoría de los servidores locales compatibles con OpenAI, use `openai-completions`. Un proveedor personalizado con `baseUrl` pero sin `api` tiene como valor predeterminado `openai-completions`; configure `openai-responses` solo cuando el backend sea compatible con `/v1/responses`.
    - `models.providers.*.apiKey`: credencial del proveedor (se prefiere SecretRef/sustitución de variables de entorno).
    - `models.providers.*.auth`: estrategia de autenticación (`api-key`, `token`, `oauth`, `aws-sdk`).
    - `models.providers.*.contextWindow`: ventana de contexto nativa predeterminada para los modelos de este proveedor cuando la entrada del modelo no establece `contextWindow`.
    - `models.providers.*.contextTokens`: límite de contexto efectivo en tiempo de ejecución predeterminado para los modelos de este proveedor cuando la entrada del modelo no establece `contextTokens`.
    - `models.providers.*.maxTokens`: límite de tokens de salida predeterminado para los modelos de este proveedor cuando la entrada del modelo no establece `maxTokens`.
    - `models.providers.*.timeoutSeconds`: tiempo de espera opcional de solicitud HTTP del modelo por proveedor en segundos, que incluye la conexión, los encabezados, el cuerpo y el manejo total de cancelación de la solicitud.
    - `models.providers.*.injectNumCtxForOpenAICompat`: para Ollama + `openai-completions`, inyecte `options.num_ctx` en las solicitudes (predeterminado: `true`).
    - `models.providers.*.authHeader`: fuerce el transporte de credenciales en el encabezado `Authorization` cuando sea necesario.
    - `models.providers.*.baseUrl`: URL base de la API ascendente.
    - `models.providers.*.headers`: encabezados estáticos adicionales para el enrutamiento de proxy/inquilino.

  </Accordion>
  <Accordion title="Sobrescrituras del transporte de solicitudes">
    `models.providers.*.request`: sobrescrituras del transporte para las solicitudes HTTP del proveedor de modelos.

    - `request.headers`: encabezados adicionales (combinados con los predeterminados del proveedor). Los valores aceptan SecretRef.
    - `request.auth`: sobrescritura de la estrategia de autenticación. Modos: `"provider-default"` (usar la autenticación integrada del proveedor), `"authorization-bearer"` (con `token`), `"header"` (con `headerName`, `value`, `prefix` opcional).
    - `request.proxy`: sobrescritura del proxy HTTP. Modos: `"env-proxy"` (usar variables de entorno `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (con `url`). Ambos modos aceptan un subobjeto `tls` opcional.
    - `request.tls`: sobrescritura TLS para conexiones directas. Campos: `ca`, `cert`, `key`, `passphrase` (todos aceptan SecretRef), `serverName`, `insecureSkipVerify`.
    - `request.allowPrivateNetwork`: cuando es `true`, permite HTTPS a `baseUrl` cuando el DNS se resuelve a rangos privados, CGNAT o similares, mediante el guardia de obtención (fetch) HTTP del proveedor (opt-in del operador para puntos finales autohospedados compatibles con OpenAI de confianza). Las URL de transmisión (stream) del proveedor de modelos de bucle local como `localhost`, `127.0.0.1` y `[::1]` se permiten automáticamente a menos que esto se establezca explícitamente en `false`; los hosts de DNS LAN, tailnet y privados aún requieren opt-in. WebSocket utiliza el mismo `request` para encabezados/TLS pero no esa puerta de enlace SSRF de obtención. Valor predeterminado `false`.

  </Accordion>
  <Accordion title="Entradas del catálogo de modelos">
    - `models.providers.*.models`: entradas explícitas del catálogo de modelos del proveedor.
    - `models.providers.*.models.*.input`: modalidades de entrada del modelo. Use `["text"]` para modelos solo de texto y `["text", "image"]` para modelos de imagen/visión nativos. Los adjuntos de imagen solo se inyectan en los turnos del agente cuando el modelo seleccionado está marcado como capaz de manejar imágenes.
    - `models.providers.*.models.*.contextWindow`: metadatos nativos de la ventana de contexto del modelo. Esto anula el `contextWindow` a nivel de proveedor para ese modelo.
    - `models.providers.*.models.*.contextTokens`: límite de contexto opcional en tiempo de ejecución. Esto anula el `contextTokens` a nivel de proveedor; úselo cuando desee un presupuesto de contexto efectivo menor que la `contextWindow` nativa del modelo; `openclaw models list` muestra ambos valores cuando difieren.
    - `models.providers.*.models.*.compat.supportsDeveloperRole`: sugerencia de compatibilidad opcional. Para `api: "openai-completions"` con un `baseUrl` no nativo y no vacío (host no `api.openai.com`), OpenClaw fuerza esto a `false` en tiempo de ejecución. Un `baseUrl` vacío u omitido mantiene el comportamiento predeterminado de OpenAI.
    - `models.providers.*.models.*.compat.requiresStringContent`: sugerencia de compatibilidad opcional para endpoints de chat compatibles con OpenAI que solo aceptan cadenas. Cuando `true`, OpenClaw aplana las matrices `messages[].content` de texto puro en cadenas simples antes de enviar la solicitud.
    - `models.providers.*.models.*.compat.strictMessageKeys`: sugerencia de compatibilidad opcional para endpoints de chat estrictamente compatibles con OpenAI. Cuando `true`, OpenClaw reduce los objetos de mensaje de Chat Completions salientes a `role` y `content` antes de enviar la solicitud.
    - `models.providers.*.models.*.compat.thinkingFormat`: sugerencia opcional de carga de pensamiento (thinking). Use `"qwen"` para `enable_thinking` de nivel superior, o `"qwen-chat-template"` para `chat_template_kwargs.enable_thinking` en servidores compatibles con OpenAI de la familia Qwen que admiten kwargs de plantilla de chat a nivel de solicitud, como vLLM.

  </Accordion>
  <Accordion title="Descubrimiento de Amazon Bedrock">
    - `plugins.entries.amazon-bedrock.config.discovery`: raíz de configuración del autodescubrimiento de Bedrock.
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`: activar/desactivar el descubrimiento implícito.
    - `plugins.entries.amazon-bedrock.config.discovery.region`: región de AWS para el descubrimiento.
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`: filtro opcional de provider-id para el descubrimiento dirigido.
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`: intervalo de sondeo para la actualización del descubrimiento.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`: ventana de contexto de reserva para los modelos descubiertos.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`: tokens máximos de salida de reserva para los modelos descubiertos.

  </Accordion>
</AccordionGroup>

La incorporación interactiva de proveedores personalizados infiere la entrada de imagen para IDs de modelos de visión comunes como GPT-4o, Claude, Gemini, Qwen-VL, LLaVA, Pixtral, InternVL, Mllama, MiniCPM-V y GLM-4V, y omite la pregunta adicional para las familias conocidas de solo texto. Los IDs de modelos desconocidos aún preguntan por soporte de imagen. La incorporación no interactiva utiliza la misma inferencia; pase `--custom-image-input` para forzar metadatos con capacidad de imagen o `--custom-text-input` para forzar metadatos de solo texto.

### Ejemplos de proveedores

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    El complemento del proveedor `cerebras` incluido puede configurar esto a través de `openclaw onboard --auth-choice cerebras-api-key`. Utilice la configuración explícita del proveedor solo al anular los valores predeterminados.

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

    Proveedor integrado compatible con Anthropic. Acceso directo: `openclaw onboard --auth-choice kimi-code-api-key`.

  </Accordion>
  <Accordion title="Modelos locales (LM Studio)">
    Consulte [Local Models](/es/gateway/local-models). Resumen: ejecute un modelo local grande a través de LM Studio Responses API en hardware potente; mantenga los modelos alojados combinados para contingencia.
  </Accordion>
  <Accordion title="MiniMax M2.7 (direct)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "Minimax" },
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
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    Configure `MINIMAX_API_KEY`. Atajos: `openclaw onboard --auth-choice minimax-global-api` o `openclaw onboard --auth-choice minimax-cn-api`. El catálogo de modelos por defecto es solo M2.7. En la ruta de transmisión compatible con Anthropic, OpenClaw deshabilita el pensamiento de MiniMax por defecto a menos que configure explícitamente `thinking` usted mismo. `/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed`.

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

    Para el endpoint de China: `baseUrl: "https://api.moonshot.cn/v1"` o `openclaw onboard --auth-choice moonshot-api-key-cn`.

    Los endpoints nativos de Moonshot anuncian compatibilidad de uso de transmisión en el transporte compartido `openai-completions`, y las claves de OpenClaw priorizan las capacidades del endpoint en lugar del id del proveedor integrado solo.

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

    Configure `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`). Use referencias `opencode/...` para el catálogo Zen o referencias `opencode-go/...` para el catálogo Go. Atajo: `openclaw onboard --auth-choice opencode-zen` o `openclaw onboard --auth-choice opencode-go`.

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

    La URL base debe omitir `/v1` (el cliente de Anthropic lo agrega). Atajo: `openclaw onboard --auth-choice synthetic-api-key`.

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

    Configure `ZAI_API_KEY`. `z.ai/*` y `z-ai/*` son alias aceptados. Atajo: `openclaw onboard --auth-choice zai-api-key`.

    - Endpoint general: `https://api.z.ai/api/paas/v4`
    - Endpoint de codificación (predeterminado): `https://api.z.ai/api/coding/paas/v4`
    - Para el endpoint general, defina un proveedor personalizado con la sustitución de la URL base.

  </Accordion>
</AccordionGroup>

---

## Relacionado

- [Configuración: agentes](/es/gateway/config-agents)
- [Configuración: canales](/es/gateway/config-channels)
- [Referencia de configuración](/es/gateway/configuration-reference) — otras claves de nivel superior
- [Herramientas y complementos](/es/tools)

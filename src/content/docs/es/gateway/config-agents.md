---
summary: "Valores predeterminados de agentes, enrutamiento multiagente, sesión, mensajes y configuración de conversación"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuración — agentes"
---

Claves de configuración con ámbito de agente bajo `agents.*`, `multiAgent.*`, `session.*`,
`messages.*` y `talk.*`. Para canales, herramientas, tiempo de ejecución de la puerta de enlace y otras
claves de nivel superior, consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Valores predeterminados del agente

### `agents.defaults.workspace`

Predeterminado: `OPENCLAW_WORKSPACE_DIR` cuando se establece, de lo contrario `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Un valor explícito de `agents.defaults.workspace` tiene prioridad sobre
`OPENCLAW_WORKSPACE_DIR`. Use la variable de entorno para señalar a los agentes predeterminados
un espacio de trabajo montado cuando no desee escribir esa ruta en la configuración.

### `agents.defaults.repoRoot`

Raíz del repositorio opcional que se muestra en la línea de tiempo de ejecución del mensaje del sistema. Si no se establece, OpenClaw lo detecta automáticamente hacia arriba desde el espacio de trabajo.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Lista de permitidos (allowlist) de habilidades predeterminada opcional para agentes que no establecen
`agents.list[].skills`.

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

- Omita `agents.defaults.skills` para tener habilidades sin restricciones de forma predeterminada.
- Omita `agents.list[].skills` para heredar los valores predeterminados.
- Establezca `agents.list[].skills: []` para no tener habilidades.
- Una lista `agents.list[].skills` no vacía es el conjunto final para ese agente; no
  se fusiona con los valores predeterminados.

### `agents.defaults.skipBootstrap`

Deshabilita la creación automática de archivos de arranque del espacio de trabajo (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

Omite la creación de archivos opcionales seleccionados del espacio de trabajo mientras aún escribe los archivos de arranque necesarios. Valores válidos: `SOUL.md`, `USER.md`, `HEARTBEAT.md` y `IDENTITY.md`.

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

### `agents.defaults.contextInjection`

Controla cuándo se inyectan los archivos de arranque del espacio de trabajo en el mensaje del sistema. Predeterminado: `"always"`.

- `"continuation-skip"`: los turnos de continuación segura (después de una respuesta completada del asistente) omiten la reinyección del arranque del espacio de trabajo, reduciendo el tamaño del mensaje. Las ejecuciones de latido y los reintentos posteriores a la compactación todavía reconstruyen el contexto.
- `"never"`: deshabilita el arranque del espacio de trabajo y la inyección de archivos de contexto en cada turno. Use esto solo para agentes que posean completamente su ciclo de vida del mensaje (motores de contexto personalizados, tiempos de ejecución nativos que construyen su propio contexto o flujos de trabajo especializados sin arranque). Los turnos de latido y de recuperación por compactación también omiten la inyección.

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

Anulación por agente: `agents.list[].contextInjection`. Los valores omitidos heredan
`agents.defaults.contextInjection`.

### `agents.defaults.bootstrapMaxChars`

Máximo de caracteres por archivo de arranque del espacio de trabajo antes del truncamiento. Predeterminado: `12000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

Anulación por agente: `agents.list[].bootstrapMaxChars`. Los valores omitidos heredan
`agents.defaults.bootstrapMaxChars`.

### `agents.defaults.bootstrapTotalMaxChars`

Máximo total de caracteres inyectados en todos los archivos de arranque del espacio de trabajo. Predeterminado: `60000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

Anulación por agente: `agents.list[].bootstrapTotalMaxChars`. Los valores omitidos
heredan `agents.defaults.bootstrapTotalMaxChars`.

### Anulaciones del perfil de arranque por agente

Use las anulaciones del perfil de arranque por agente cuando un agente necesite un comportamiento de inyección de mensaje diferente al de los valores predeterminados compartidos. Los campos omitidos se heredan de `agents.defaults`.

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 12000,
      bootstrapTotalMaxChars: 60000,
    },
    list: [
      {
        id: "strict-worker",
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    ],
  },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Controla el aviso del mensaje del sistema visible para el agente cuando se trunca el contexto de arranque. Predeterminado: `"always"`.

- `"off"`: nunca inyectar texto de aviso de truncamiento en el mensaje del sistema.
- `"once"`: inyectar un aviso conciso una vez por firma de truncamiento única.
- `"always"`: inyectar un aviso conciso en cada ejecución cuando existe truncamiento (recomendado).

Los recuentos detallados brutos/inyectados y los campos de ajuste de configuración permanecen en diagnósticos como informes de contexto/estado y registros; el contexto de usuario/tiempo de ejecución de WebChat de rutina solo obtiene el aviso conciso de recuperación.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
}
```

### Mapa de propiedad del presupuesto de contexto

OpenClaw tiene múltiples presupuestos de alto volumen para prompt/contexto, y están
intencionalmente divididos por subsistema en lugar de fluir todos a través de una única
perilla genérica.

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  inyección de arranque normal del espacio de trabajo.
- `agents.defaults.startupContext.*`:
  preludio de ejecución del modelo de reset/inicio único, incluyendo archivos
  `memory/*.md` diarios recientes. Los comandos de chat `/new` y `/reset` desnudos son
  reconocidos sin invocar el modelo.
- `skills.limits.*`:
  la lista compacta de habilidades inyectada en el prompt del sistema.
- `agents.defaults.contextLimits.*`:
  extractos de tiempo de ejecución delimitados y bloques propiedad del tiempo de ejecución inyectados.
- `memory.qmd.limits.*`:
  tamaño del fragmento de búsqueda de memoria indexada y la inyección.

Use la anulación por agente coincidente solo cuando un agente necesite un
presupuesto diferente:

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

Controla el preludio de inicio del primer turno inyectado en las ejecuciones de modelo de reset/inicio.
Los comandos de chat `/new` y `/reset` desnudos reconocen el reset sin invocar
el modelo, por lo que no cargan este preludio.

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

Valores predeterminados compartidos para superficies de contexto de tiempo de ejecución delimitadas.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`: límite de extracto `memory_get` predeterminado antes de que se agreguen
  metadatos de truncamiento y el aviso de continuación.
- `memoryGetDefaultLines`: ventana de líneas `memory_get` predeterminada cuando se omite
  `lines`.
- `toolResultMaxChars`: límite de resultados de herramientas en vivo utilizado para resultados persistidos y
  recuperación de desbordamiento.
- `postCompactionMaxChars`: límite de extracto de AGENTS.md utilizado durante la inyección de
  actualización posterior a la compactación.

#### `agents.list[].contextLimits`

Anulación por agente para las perillas compartidas `contextLimits`. Los campos omitidos heredan
de `agents.defaults.contextLimits`.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

Límite global para la lista compacta de habilidades inyectada en el mensaje del sistema. Esto
no afecta la lectura de archivos `SKILL.md` bajo demanda.

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

Invalidación por agente para el presupuesto del mensaje de habilidades.

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

Tamaño máximo de píxeles para el lado más largo de la imagen en bloques de imagen de transcripción/herramienta antes de las llamadas al proveedor.
Predeterminado: `1200`.

Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil de la solicitud para ejecuciones con muchas capturas de pantalla.
Los valores más altos preservan más detalles visuales.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Zona horaria para el contexto del mensaje del sistema (no las marcas de tiempo de los mensajes). Se predetermina a la zona horaria del host.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Formato de hora en el mensaje del sistema. Predeterminado: `auto` (preferencia del SO).

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - La forma de cadena establece solo el modelo principal.
  - La forma de objeto establece el modelo principal más modelos de conmutación por error ordenados.
- `imageModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la ruta de herramienta `image` como su configuración de modelo de visión.
  - También se utiliza como enrutamiento de conmutación por error cuando el modelo predeterminado/seleccionado no puede aceptar entrada de imagen.
  - Se prefieren referencias `provider/model` explícitas. Se aceptan ID simples por compatibilidad; si un ID simple coincide únicamente con una entrada configurada capaz de manejar imágenes en `models.providers.*.models`, OpenClaw lo califica para ese proveedor. Las coincidencias configuradas ambiguas requieren un prefijo de proveedor explícito.
- `imageGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad compartida de generación de imágenes y cualquier superficie futura de herramienta/complemento que genere imágenes.
  - Valores típicos: `google/gemini-3.1-flash-image-preview` para la generación de imágenes nativa de Gemini, `fal/fal-ai/flux/dev` para fal, `openai/gpt-image-2` para OpenAI Images, o `openai/gpt-image-1.5` para salida PNG/WebP de OpenAI con fondo transparente.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación del proveedor correspondiente (por ejemplo `GEMINI_API_KEY` o `GOOGLE_API_KEY` para `google/*`, `OPENAI_API_KEY` o OpenAI Codex OAuth para `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` para `fal/*`).
  - Si se omite, `image_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de imágenes restantes en orden de id de proveedor.
- `musicGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad de generación de música compartida y la herramienta incorporada `music_generate`.
  - Valores típicos: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview`, o `minimax/music-2.6`.
  - Si se omite, `music_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de música restantes en orden de id de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor correspondiente.
- `videoGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad de generación de vídeo compartida y la herramienta incorporada `video_generate`.
  - Valores típicos: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, o `qwen/wan2.7-r2v`.
  - Si se omite, `video_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de vídeo restantes en orden de id de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor correspondiente.
  - El proveedor de generación de video Qwen incluido admite hasta 1 video de salida, 1 imagen de entrada, 4 videos de entrada, 10 segundos de duración y opciones de `size`, `aspectRatio`, `resolution`, `audio` y `watermark` a nivel de proveedor.
- `pdfModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la herramienta `pdf` para el enrutamiento de modelos.
  - Si se omite, la herramienta PDF recurre a `imageModel` y luego al modelo de sesión/predeterminado resuelto.
- `pdfMaxBytesMb`: límite de tamaño de PDF predeterminado para la herramienta `pdf` cuando no se pasa `maxBytesMb` en el momento de la llamada.
- `pdfMaxPages`: máximo de páginas predeterminado considerado por el modo de reserva de extracción en la herramienta `pdf`.
- `verboseDefault`: nivel de detalle predeterminado para los agentes. Valores: `"off"`, `"on"`, `"full"`. Predeterminado: `"off"`.
- `toolProgressDetail`: modo de detalle para los resúmenes de la herramienta `/verbose` y las líneas de la herramienta de borrador de progreso. Valores: `"explain"` (predeterminado, etiquetas humanas compactas) o `"raw"` (agregar comando/detalle sin procesar cuando esté disponible). El `agents.list[].toolProgressDetail` por agente anula este valor predeterminado.
- `reasoningDefault`: visibilidad de razonamiento predeterminada para los agentes. Valores: `"off"`, `"on"`, `"stream"`. El `agents.list[].reasoningDefault` por agente anula este valor predeterminado. Los valores predeterminados de razonamiento configurados solo se aplican para propietarios, remitentes autorizados o contextos de puerta de enlace de operador-administrador cuando no se establece ninguna anulación de razonamiento por mensaje o por sesión.
- `elevatedDefault`: nivel de salida elevado predeterminado para los agentes. Valores: `"off"`, `"on"`, `"ask"`, `"full"`. Predeterminado: `"on"`.
- `model.primary`: formato `provider/model` (p. ej., `openai/gpt-5.5` para la clave de API de OpenAI o el acceso OAuth de Codex). Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única de proveedor configurado para ese ID de modelo exacto, y solo entonces recurre al proveedor predeterminado configurado (comportamiento de compatibilidad obsoleto, por lo que se prefiere `provider/model` explícito). Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un predeterminado obsoleto de un proveedor eliminado.
- `models`: el catálogo de modelos configurado y la lista de permitidos para `/model`. Cada entrada puede incluir `alias` (acceso directo) y `params` (específico del proveedor, por ejemplo `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Use entradas `provider/*` como `"openai-codex/*": {}` o `"vllm/*": {}` para mostrar todos los modelos descubiertos para los proveedores seleccionados sin tener que listar manualmente cada ID de modelo.
  - Agregue `agentRuntime` a una entrada `provider/*` cuando cada modelo descubierto dinámicamente para ese proveedor deba usar el mismo tiempo de ejecución. La política de tiempo de ejecución `provider/model` exacta todavía tiene prioridad sobre el comodín.
  - Ediciones seguras: use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` para agregar entradas. `config set` rechaza los reemplazos que eliminarían las entradas existentes en la lista de permitidos a menos que pase `--replace`.
  - Los flujos de configuración/incorporación con ámbito de proveedor fusionan los modelos de proveedor seleccionados en este mapa y preservan los proveedores no relacionados ya configurados.
  - Para los modelos directos de OpenAI Responses, la compactación del lado del servidor se habilita automáticamente. Use `params.responsesServerCompaction: false` para dejar de inyectar `context_management`, o `params.responsesCompactThreshold` para anular el umbral. Consulte [Compactación del lado del servidor de OpenAI](/es/providers/openai#server-side-compaction-responses-api).
- `params`: parámetros globales predeterminados del proveedor aplicados a todos los modelos. Establézcalo en `agents.defaults.params` (por ejemplo, `{ cacheRetention: "long" }`).
- precedencia de fusión de `params` (configuración): `agents.defaults.params` (base global) es anulado por `agents.defaults.models["provider/model"].params` (por modelo), luego `agents.list[].params` (id de agente coincidente) anula por clave. Consulte [Caché de mensajes del sistema](/es/reference/prompt-caching) para obtener detalles.
- `params.extra_body`/`params.extraBody`: JSON de paso a través avanzado fusionado en los cuerpos de solicitud `api: "openai-completions"` para proxies compatibles con OpenAI. Si choca con claves de solicitud generadas, gana el cuerpo adicional; las rutas de completions no nativas aún eliminan `store` solo de OpenAI después.
- `params.chat_template_kwargs`: argumentos de plantilla de chat compatibles con vLLM/OpenAI fusionados en cuerpos de solicitud `api: "openai-completions"` de nivel superior. Para `vllm/nemotron-3-*` con el pensamiento desactivado, el complemento vLLM incluido envía automáticamente `enable_thinking: false` y `force_nonempty_content: true`; los `chat_template_kwargs` explícitos anulan los valores predeterminados generados, y `extra_body.chat_template_kwargs` todavía tiene precedencia final. Para los controles de pensamiento vLLM Qwen, establezca `params.qwenThinkingFormat` en `"chat-template"` o `"top-level"` en esa entrada de modelo.
- `compat.thinkingFormat`: estilo de carga útil de pensamiento compatible con OpenAI. Use `"together"` para `reasoning.enabled` estilo Together, `"qwen"` para `enable_thinking` de nivel superior estilo Qwen, o `"qwen-chat-template"` para `chat_template_kwargs.enable_thinking` en backends de la familia Qwen que soportan kwargs de chat-template a nivel de solicitud, como vLLM. OpenClaw asigna el pensamiento deshabilitado a `false` y el pensamiento habilitado a `true`.
- `compat.supportedReasoningEfforts`: lista de esfuerzo de razonamiento compatible con OpenAI por modelo. Incluya `"xhigh"` para puntos finales personalizados que realmente lo acepten; OpenClaw expone entonces `/think xhigh` en los menús de comandos, filas de sesión de Gateway, validación de parches de sesión, validación de CLI de agentes y validación `llm-task` para ese proveedor/modelo configurado. Use `compat.reasoningEffortMap` cuando el backend desea un valor específico del proveedor para un nivel canónico.
- `params.preserveThinking`: opt-in exclusivo de Z.AI para preservar el pensamiento. Cuando está habilitado y el pensamiento está activado, OpenClaw envía `thinking.clear_thinking: false` y reproduce `reasoning_content` anteriores; consulte [Z.AI thinking and preserved thinking](/es/providers/zai#thinking-and-preserved-thinking).
- `localService`: gestor de procesos a nivel de proveedor opcional para servidores de modelos locales/autoalojados. Cuando el modelo seleccionado pertenece a ese proveedor, OpenClaw sondea `healthUrl` (o `baseUrl + "/models"`), inicia `command` con `args` si el punto final está caído, espera hasta `readyTimeoutMs` y luego envía la solicitud del modelo. `command` debe ser una ruta absoluta. `idleStopMs: 0` mantiene el proceso vivo hasta que OpenClaw salga; un valor positivo detiene el proceso iniciado por OpenClaw después de esa cantidad de milisegundos inactivos. Consulte [Local model services](/es/gateway/local-model-services).
- La política de tiempo de ejecución pertenece a los proveedores o modelos, no a `agents.defaults`. Use `models.providers.<provider>.agentRuntime` para reglas de alcance de proveedor o `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` para reglas específicas del modelo. Los modelos de agente de OpenAI en el proveedor oficial de OpenAI seleccionan Codex por defecto.
- Los escritores de configuración que mutan estos campos (por ejemplo `/models set`, `/models set-image` y comandos de agregar/eliminar de respaldo) guardan el formulario de objeto canónico y preservan las listas de respaldo existentes cuando es posible.
- `maxConcurrent`: máximo de ejecuciones de agente paralelas entre sesiones (cada sesión todavía se serializa). Predeterminado: 4.

### Política de tiempo de ejecución

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: { id: "codex" },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "pi" },
        },
      },
    },
  },
}
```

- `id`: `"auto"`, `"pi"`, un id de arnés de plugin registrado o un alias de backend CLI compatible. El plugin Codex incluido registra `codex`; el plugin Anthropic incluido proporciona el backend CLI `claude-cli`.
- `id: "auto"` permite que los arneses de plugin registrados reclamen turnos compatibles y usa PI cuando ningún arnés coincide. Un tiempo de ejecución de plugin explícito como `id: "codex"` requiere ese arnés y falla de forma cerrada si no está disponible o falla.
- La precedencia del tiempo de ejecución es primero la política exacta del modelo (`agents.list[].models["provider/model"]`, `agents.defaults.models["provider/model"]` o `models.providers.<provider>.models[]`), luego `agents.list[]` / `agents.defaults.models["provider/*"]`, y luego la política de alcance de proveedor en `models.providers.<provider>.agentRuntime`.
- Las claves de tiempo de ejecución de agente completo son heredadas. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, pines de tiempo de ejecución de sesión y `OPENCLAW_AGENT_RUNTIME` son ignorados por la selección de tiempo de ejecución. Ejecute `openclaw doctor --fix` para eliminar valores obsoletos.
- Los modelos de agente de OpenAI usan el arnés Codex por defecto; el proveedor/modelo `agentRuntime.id: "codex"` sigue siendo válido cuando desea hacerlo explícito.
- Para los despliegues de Claude CLI, se prefiere `model: "anthropic/claude-opus-4-7"` además de `agentRuntime.id: "claude-cli"` con ámbito de modelo. Las referencias de modelo `claude-cli/claude-opus-4-7` heredadas todavía funcionan por compatibilidad, pero la nueva configuración debe mantener la selección de proveedor/modelo canónica y colocar el backend de ejecución en la política de tiempo de ejecución del proveedor/modelo.
- Esto solo controla la ejecución de turnos de agente de texto. La generación de medios, visión, PDF, música, video y TTS todavía usan su configuración de proveedor/modelo.

**Alias abreviados integrados** (solo se aplican cuando el modelo está en `agents.defaults.models`):

| Alias               | Modelo                                 |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.5`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

Sus alias configurados siempre tienen prioridad sobre los predeterminados.

Los modelos Z.AI GLM-4.x habilitan automáticamente el modo de pensamiento a menos que establezca `--thinking off` o defina `agents.defaults.models["zai/<model>"].params.thinking` usted mismo.
Los modelos Z.AI habilitan `tool_stream` de forma predeterminada para la transmisión de llamadas a herramientas. Establezca `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
Los modelos Anthropic Claude 4.6 son `adaptive` de forma predeterminada en cuanto al pensamiento cuando no se establece un nivel de pensamiento explícito.

### `agents.defaults.cliBackends`

Backends de CLI opcionales para ejecuciones de reserva solo de texto (sin llamadas a herramientas). Útiles como respaldo cuando fallan los proveedores de API.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          // Or use systemPromptFileArg when the CLI accepts a prompt file flag.
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- Los backends de CLI son primero de texto; las herramientas siempre están deshabilitadas.
- Sesiones admitidas cuando `sessionArg` está configurado.
- Passthrough de imagen admitido cuando `imageArg` acepta rutas de archivo.
- `reseedFromRawTranscriptWhenUncompacted: true` permite que un backend recupere sesiones invalidadas seguras desde una cola delimitada de transcripciones sin procesar de OpenClaw antes de que exista el primer resumen de compactación. Los cambios en el perfil de autenticación o en la época de credenciales nunca reinicializan en bruto.

### `agents.defaults.systemPromptOverride`

Reemplaza todo el prompt del sistema ensamblado por OpenClaw con una cadena fija. Se establece en el nivel predeterminado (`agents.defaults.systemPromptOverride`) o por agente (`agents.list[].systemPromptOverride`). Los valores por agente tienen prioridad; se ignora un valor vacío o que solo contenga espacios en blanco. Útil para experimentos controlados con prompts.

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

Capas superpuestas de prompts independientes del proveedor aplicadas por familia de modelos. Los IDs de modelos de la familia GPT-5 reciben el contrato de comportamiento compartido entre proveedores; `personality` controla solo la capa de estilo de interacción amigable.

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"` (predeterminado) y `"on"` activan la capa de estilo de interacción amigable.
- `"off"` desactiva solo la capa amigable; el contrato de comportamiento GPT-5 etiquetado permanece activado.
- El `plugins.entries.openai.config.personality` heredado todavía se lee cuando esta configuración compartida no está definida.

### `agents.defaults.heartbeat`

Ejecuciones periódicas de latido (heartbeat).

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`: cadena de duración (ms/s/m/h). Predeterminado: `30m` (autenticación con clave de API) o `1h` (autenticación OAuth). Establezca en `0m` para desactivar.
- `includeSystemPromptSection`: cuando es falso, omite la sección Heartbeat del prompt del sistema y omite la inyección de `HEARTBEAT.md` en el contexto de arranque. Predeterminado: `true`.
- `suppressToolErrorWarnings`: cuando es verdadero, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `timeoutSeconds`: tiempo máximo en segundos permitido para un turno de agente de latido antes de que se aborte. Déjelo sin definir para usar `agents.defaults.timeoutSeconds`.
- `directPolicy`: política de entrega directa/DM. `allow` (predeterminado) permite la entrega a objetivo directo. `block` suprime la entrega a objetivo directo y emite `reason=dm-blocked`.
- `lightContext`: cuando es verdadero, las ejecuciones de latido usan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es true, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Mismo patrón de aislamiento que cron `sessionTarget: "isolated"`. Reduce el costo de tokens por latido de ~100K a ~2-5K tokens.
- `skipWhenBusy`: cuando es true, las ejecuciones de latido se diferencian en los carriles adicionales ocupados de ese agente: su propio subagente con clave de sesión o trabajo de comandos anidados. Los carriles de Cron siempre difieren los latidos, incluso sin esta marca.
- Por agente: establecer `agents.list[].heartbeat`. Cuando cualquier agente define `heartbeat`, **solo esos agentes** ejecutan latidos.
- Los latidos ejecutan turnos completos del agente: los intervalos más cortos consumen más tokens.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // optional Pi tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        truncateAfterCompaction: true, // rotate to a smaller successor JSONL after compaction
        maxActiveTranscriptBytes: "20mb", // optional preflight local compaction trigger
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // optional memory-flush-only model override
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`: `default` o `safeguard` (resumen fragmentado para historiales largos). Consulte [Compaction](/es/concepts/compaction).
- `provider`: id de un complemento de proveedor de compactación registrado. Cuando se establece, se invoca el `summarize()` del proveedor en lugar del resumen LLM integrado. Se recurre al integrado en caso de fallo. Establecer un proveedor fuerza `mode: "safeguard"`. Consulte [Compaction](/es/concepts/compaction).
- `timeoutSeconds`: segundos máximos permitidos para una sola operación de compactación antes de que OpenClaw la aborte. Predeterminado: `900`.
- `keepRecentTokens`: presupuesto del punto de corte Pi para mantener la cola de transcripción más reciente literalmente. `/compact` manual respeta esto cuando se establece explícitamente; de lo contrario, la compactación manual es un punto de control fijo.
- `identifierPolicy`: `strict` (predeterminado), `off`, o `custom`. `strict` antepone la guía de retención de identificadores opacos integrada durante el resumen de compactación.
- `identifierInstructions`: texto de preservación de identificadores personalizado opcional que se utiliza cuando `identifierPolicy=custom`.
- `qualityGuard`: las comprobaciones de reintento en caso de salida con formato incorrecto buscan resúmenes de protección. Habilitado de forma predeterminada en modo de protección; establecer `enabled: false` para omitir la auditoría.
- `midTurnPrecheck`: verificación opcional de presión en el bucle de herramientas Pi. Cuando `enabled: true`, OpenClaw verifica la presión del contexto después de que se anexen los resultados de las herramientas y antes de la siguiente llamada al modelo. Si el contexto ya no cabe, aborta el intento actual antes de enviar el mensaje y reutiliza la ruta de recuperación de preverificación existente para truncar los resultados de las herramientas o compactar y reintentar. Funciona con los modos de compactación `default` y `safeguard`. Predeterminado: desactivado.
- `postCompactionSections`: nombres de secciones H2/H3 opcionales de AGENTS.md para reinyectar después de la compactación. Por defecto es `["Session Startup", "Red Lines"]`; establezca `[]` para desactivar la reinyección. Cuando no está establecido o se establece explícitamente en ese par predeterminado, también se aceptan los encabezados `Every Session`/`Safety` más antiguos como alternativa heredada.
- `model`: anulación opcional de `provider/model-id` solo para el resumen de compactación. Use esto cuando la sesión principal debe mantener un modelo pero los resúmenes de compactación deben ejecutarse en otro; cuando no está establecido, la compactación usa el modelo principal de la sesión.
- `maxActiveTranscriptBytes`: umbral de bytes opcional (`number` o cadenas como `"20mb"`) que activa la compactación local normal antes de una ejecución cuando el JSONL activo crece más allá del umbral. Requiere `truncateAfterCompaction` para que una compactación exitosa pueda rotar a una transcripción sucesora más pequeña. Desactivado cuando no está establecido o es `0`.
- `notifyUser`: cuando `true`, envía breves avisos al usuario cuando comienza y cuando termina la compactación (por ejemplo, "Compactando contexto..." y "Compactación completada"). Desactivado por defecto para mantener la compactación silenciosa.
- `memoryFlush`: turno agente silencioso antes de la auto-compactación para almacenar recuerdos duraderos. Establezca `model` en un proveedor/modelo exacto como `ollama/qwen3:8b` cuando este turno de mantenimiento debe permanecer en un modelo local; la anulación no hereda la cadena de respaldo de la sesión activa. Se omite cuando el espacio de trabajo es de solo lectura.

### `agents.defaults.runRetries`

Límites de iteración de reintento del bucle de ejecución externo para el ejecutor Pi integrado a fin de evitar bucles de ejecución infinitos durante la recuperación de fallos. Tenga en cuenta que esta configuración actualmente solo se aplica al runtime del agente integrado, no a los runtimes de ACP ni CLI.

```json5
{
  agents: {
    defaults: {
      runRetries: {
        base: 24,
        perProfile: 8,
        min: 32,
        max: 160,
      },
    },
    list: [
      {
        id: "main",
        runRetries: { max: 50 }, // optional per-agent overrides
      },
    ],
  },
}
```

- `base`: número base de iteraciones de reintento de ejecución para el bucle de ejecución externo. Predeterminado: `24`.
- `perProfile`: iteraciones de reintento de ejecución adicionales otorgadas por candidato de perfil de reserva (fallback). Predeterminado: `8`.
- `min`: límite absoluto mínimo para las iteraciones de reintento de ejecución. Predeterminado: `32`.
- `max`: límite absoluto máximo para las iteraciones de reintento de ejecución para evitar una ejecución descontrolada. Predeterminado: `160`.

### `agents.defaults.contextPruning`

Elimina **resultados de herramientas antiguos** del contexto en memoria antes de enviarlos al LLM. **No** modifica el historial de sesiones en el disco.

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="comportamiento del modo cache-ttl">

- `mode: "cache-ttl"` habilita los pases de eliminación (pruning).
- `ttl` controla la frecuencia con la que se puede volver a ejecutar la eliminación (después del último toque al caché).
- La eliminación realiza primero un recorte suave (soft-trim) de los resultados de herramientas excesivamente grandes y luego una limpieza dura (hard-clear) de los resultados de herramientas más antiguos si es necesario.

**Soft-trim** mantiene el principio + el final e inserta `...` en el medio.

**Hard-clear** reemplaza el resultado de la herramienta completa con el marcador de posición.

Notas:

- Los bloques de imagen nunca se recortan/limpian.
- Las proporciones se basan en caracteres (aproximadas), no en recuentos exactos de tokens.
- Si existen menos de `keepLastAssistants` mensajes del asistente, se omite la eliminación.

</Accordion>

Consulte [Session Pruning](/es/concepts/session-pruning) para obtener detalles sobre el comportamiento.

### Transmisión por bloques

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
    },
  },
}
```

- Los canales que no sean Telegram requieren un `*.blockStreaming: true` explícito para habilitar las respuestas por bloques.
- Anulaciones de canal: `channels.<channel>.blockStreamingCoalesce` (y variantes por cuenta). Signal/Slack/Discord/Google Chat predeterminan `minChars: 1500`.
- `humanDelay`: pausa aleatoria entre respuestas de bloque. `natural` = 800–2500ms. Anulación por agente: `agents.list[].humanDelay`.

Consulte [Streaming](/es/concepts/streaming) para obtener detalles sobre el comportamiento y la fragmentación.

### Indicadores de escritura

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- Valores predeterminados: `instant` para chats directos/menciones, `message` para chats grupales sin mención.
- Invalidaciones por sesión: `session.typingMode`, `session.typingIntervalSeconds`.

Consulte [Typing Indicators](/es/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandbox opcional para el agente incrustado. Consulte [Sandboxing](/es/gateway/sandboxing) para obtener la guía completa.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Detalles del sandbox">

**Backend:**

- `docker`: tiempo de ejecución de Docker local (predeterminado)
- `ssh`: tiempo de ejecución remoto genérico respaldado por SSH
- `openshell`: tiempo de ejecución de OpenShell

Cuando se selecciona `backend: "openshell"`, la configuración específica del tiempo de ejecución se mueve a
`plugins.entries.openshell.config`.

**Configuración del backend SSH:**

- `target`: destino SSH en formato `user@host[:port]`
- `command`: comando del cliente SSH (predeterminado: `ssh`)
- `workspaceRoot`: raíz remota absoluta utilizada para espacios de trabajo por alcance
- `identityFile` / `certificateFile` / `knownHostsFile`: archivos locales existentes pasados a OpenSSH
- `identityData` / `certificateData` / `knownHostsData`: contenidos en línea o SecretRefs que OpenClaw materializa en archivos temporales en tiempo de ejecución
- `strictHostKeyChecking` / `updateHostKeys`: controles de política de claves de host de OpenSSH

**Precedencia de autenticación SSH:**

- `identityData` tiene prioridad sobre `identityFile`
- `certificateData` tiene prioridad sobre `certificateFile`
- `knownHostsData` tiene prioridad sobre `knownHostsFile`
- los valores `*Data` respaldados por SecretRef se resuelven desde la instantánea activa del tiempo de ejecución de secretos antes de que comience la sesión del sandbox

**Comportamiento del backend SSH:**

- inicializa el espacio de trabajo remoto una vez después de crear o recrear
- luego mantiene el espacio de trabajo SSH remoto como canónico
- enruta `exec`, herramientas de archivo y rutas de medios a través de SSH
- no sincroniza los cambios remotos de vuelta al host automáticamente
- no soporta contenedores del navegador del sandbox

**Acceso al espacio de trabajo:**

- `none`: espacio de trabajo del sandbox por alcance bajo `~/.openclaw/sandboxes`
- `ro`: espacio de trabajo del sandbox en `/workspace`, espacio de trabajo del agente montado como solo lectura en `/agent`
- `rw`: espacio de trabajo del agente montado como lectura/escritura en `/workspace`

**Alcance:**

- `session`: contenedor + espacio de trabajo por sesión
- `agent`: un contenedor + espacio de trabajo por agente (predeterminado)
- `shared`: contenedor y espacio de trabajo compartidos (sin aislamiento entre sesiones)

**Configuración del complemento OpenShell:**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**Modo OpenShell:**

- `mirror`: inicializar remoto desde local antes de la ejecución, sincronizar de vuelta después de la ejecución; el espacio de trabajo local se mantiene canónico
- `remote`: inicializar remoto una vez cuando se crea el sandbox, luego mantener el espacio de trabajo remoto canónico

En el modo `remote`, las ediciones locales del host realizadas fuera de OpenClaw no se sincronizan en el sandbox automáticamente después del paso de inicialización.
El transporte es SSH hacia el sandbox OpenShell, pero el complemento posee el ciclo de vida del sandbox y la sincronización opcional de espejo.

**`setupCommand`** se ejecuta una vez después de la creación del contenedor (vía `sh -lc`). Requiere salida de red, raíz grabable, usuario root.

**Los contenedores tienen `network: "none"` de forma predeterminada** — configúrelo como `"bridge"` (o una red puente personalizada) si el agente necesita acceso de salida.
`"host"` está bloqueado. `"container:<id>"` está bloqueado de forma predeterminada a menos que establezca explícitamente
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (romper vidrio).

**Los archivos adjuntos entrantes** se organizan en `media/inbound/*` en el espacio de trabajo activo.

**`docker.binds`** monta directorios de host adicionales; los enlaces globales y por agente se combinan.

**Navegador en sandbox** (`sandbox.browser.enabled`): Chromium + CDP en un contenedor. URL noVNC inyectada en el prompt del sistema. No requiere `browser.enabled` en `openclaw.json`.
El acceso de observador noVNC usa autenticación VNC de forma predeterminada y OpenClaw emite una URL de token de corta duración (en lugar de exponer la contraseña en la URL compartida).

- `allowHostControl: false` (predeterminado) bloquea las sesiones en sandbox para que no apunten al navegador host.
- `network` tiene como valor predeterminado `openclaw-sandbox-browser` (red puente dedicada). Establézcalo en `bridge` solo cuando desee explícitamente conectividad de puente global.
- `cdpSourceRange` opcionalmente restringe el ingreso CDP en el borde del contenedor a un rango CIDR (por ejemplo `172.21.0.1/32`).
- `sandbox.browser.binds` monta directorios de host adicionales solo en el contenedor del navegador del sandbox. Cuando se establece (incluyendo `[]`), reemplaza `docker.binds` para el contenedor del navegador.
- Los valores predeterminados de lanzamiento se definen en `scripts/sandbox-browser-entrypoint.sh` y se ajustan para hosts de contenedor:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions` (habilitado de forma predeterminada)
  - `--disable-3d-apis`, `--disable-software-rasterizer` y `--disable-gpu` están
    habilitados de forma predeterminada y se pueden deshabilitar con
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si el uso de WebGL/3D lo requiere.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` vuelve a habilitar las extensiones si su flujo de trabajo
    depende de ellas.
  - `--renderer-process-limit=2` se puede cambiar con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`; establezca `0` para usar el
    límite de proceso predeterminado de Chromium.
  - más `--no-sandbox` cuando `noSandbox` está habilitado.
  - Los valores predeterminados son la línea base de la imagen del contenedor; use una imagen de navegador personalizada con un
    punto de entrada personalizado para cambiar los valores predeterminados del contenedor.

</Accordion>

El sandboxing del navegador y `sandbox.docker.binds` son exclusivos de Docker.

Construir imágenes (desde una copia del código fuente):

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

Para instalaciones de npm sin una copia del código fuente, consulte [Sandboxing § Images and setup](/es/gateway/sandboxing#images-and-setup) para comandos `docker build` en línea.

### `agents.list` (sobrescrituras por agente)

Use `agents.list[].tts` para dar a un agente su propio proveedor TTS, voz, modelo,
estilo o modo TTS automático. El bloque del agente se fusiona profundamente (deep-merge) sobre `messages.tts` globales,
por lo que las credenciales compartidas pueden permanecer en un solo lugar mientras los agentes individuales
sobrescriben solo los campos de voz o proveedor que necesitan. La sobrescritura del agente activo
se aplica a las respuestas habladas automáticas, `/tts audio`, `/tts status` y
la herramienta de agente `tts`. Consulte [Text-to-speech](/es/tools/tts#per-agent-voice-overrides)
para ver ejemplos de proveedores y precedencia.

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // replaces agents.defaults.skills when set
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`: id de agente estable (requerido).
- `default`: cuando se establecen varios, gana el primero (se registra una advertencia). Si no se establece ninguno, la primera entrada de la lista es la predeterminada.
- `model`: el formato de cadena establece un principal estricto por agente sin alternativa de modelo; el formato de objeto `{ primary }` también es estricto a menos que agregue `fallbacks`. Use `{ primary, fallbacks: [...] }` para optar por la alternativa para ese agente, o `{ primary, fallbacks: [] }` para hacer explícito el comportamiento estricto. Los trabajos de Cron que solo sobrescriben `primary` aún heredan las alternativas predeterminadas a menos que establezca `fallbacks: []`.
- `params`: parámetros de transmisión por agente fusionados sobre la entrada del modelo seleccionado en `agents.defaults.models`. Use esto para sobrescrituras específicas del agente como `cacheRetention`, `temperature` o `maxTokens` sin duplicar todo el catálogo de modelos.
- `tts`: anulaciones opcionales de texto a voz por agente. El bloque se fusiona profundamente (deep-merges) sobre `messages.tts`, por lo que mantenga las credenciales compartidas del proveedor y la política de respaldo en `messages.tts` y establezca solo valores específicos de la persona como proveedor, voz, modelo, estilo o modo automático aquí.
- `skills`: lista blanca de habilidades opcional por agente. Si se omite, el agente hereda `agents.defaults.skills` cuando está configurado; una lista explícita reemplaza los valores predeterminados en lugar de fusionarse, y `[]` significa ninguna habilidad.
- `thinkingDefault`: nivel de pensamiento predeterminado opcional por agente (`off | minimal | low | medium | high | xhigh | adaptive | max`). Anula `agents.defaults.thinkingDefault` para este agente cuando no se establece ninguna anulación por mensaje o sesión. El perfil de proveedor/modelo seleccionado controla qué valores son válidos; para Google Gemini, `adaptive` mantiene el pensamiento dinámico propiedad del proveedor (`thinkingLevel` omitido en Gemini 3/3.1, `thinkingBudget: -1` en Gemini 2.5).
- `reasoningDefault`: visibilidad de razonamiento predeterminada opcional por agente (`on | off | stream`). Anula `agents.defaults.reasoningDefault` para este agente cuando no se establece ninguna anulación de razonamiento por mensaje o sesión.
- `fastModeDefault`: valor predeterminado opcional por agente para el modo rápido (`true | false`). Se aplica cuando no se establece ninguna anulación de modo rápido por mensaje o sesión.
- `models`: anulaciones opcionales de catálogo de modelos/tiempo de ejecución por agente, clave por ids completos de `provider/model`. Use `models["provider/model"].agentRuntime` para excepciones de tiempo de ejecución por agente.
- `runtime`: descriptor de tiempo de ejecución opcional por agente. Use `type: "acp"` con los valores predeterminados de `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) cuando el agente deba usar por defecto sesiones de arnés ACP.
- `identity.avatar`: ruta relativa al espacio de trabajo, URL de `http(s)` o URI de `data:`.
- `identity` deriva los valores predeterminados: `ackReaction` de `emoji`, `mentionPatterns` de `name`/`emoji`.
- `subagents.allowAgents`: lista blanca de IDs de agentes para objetivos `sessions_spawn.agentId` explícitos (`["*"]` = cualquiera; predeterminado: solo el mismo agente). Incluya el ID del solicitante cuando se deben permitir llamadas `agentId` auto-dirigidas.
- Guarda de herencia del entorno de prueba (sandbox): si la sesión solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.
- `subagents.requireAgentId`: cuando es verdadero, bloquea las llamadas `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil; predeterminado: false).

---

## Enrutamiento multiagente

Ejecute múltiples agentes aislados dentro de una sola puerta de enlace (Gateway). Consulte [Multi-Agent](/es/concepts/multi-agent).

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### Campos de coincidencia de enlaces

- `type` (opcional): `route` para enrutamiento normal (el tipo faltante predetermina a route), `acp` para enlaces de conversación ACP persistentes.
- `match.channel` (requerido)
- `match.accountId` (opcional; `*` = cualquier cuenta; omitido = cuenta predeterminada)
- `match.peer` (opcional; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (opcional; específico del canal)
- `acp` (opcional; solo para `type: "acp"`): `{ mode, label, cwd, backend }`

**Orden de coincidencia determinista:**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exacto, sin par/gremio/equipo)
5. `match.accountId: "*"` (en todo el canal)
6. Agente predeterminado

Dentro de cada nivel, gana la primera entrada `bindings` coincidente.

Para las entradas de `type: "acp"`, OpenClaw se resuelve por la identidad exacta de la conversación (`match.channel` + cuenta + `match.peer.id`) y no utiliza el orden de nivel de enlace de ruta anterior.

### Perfiles de acceso por agente

<Accordion title="Acceso completo (sin espacio aislado)">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Herramientas de solo lectura + espacio de trabajo">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Sin acceso al sistema de archivos (solo mensajería)">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

</Accordion>

Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para obtener detalles sobre la precedencia.

---

## Sesión

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional hard budget
      highWaterBytes: "400mb", // optional cleanup target
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unfocus in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    mainKey: "main", // legacy (runtime always uses "main")
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="Detalles del campo de sesión">

- **`scope`**: estrategia de agrupación de sesiones base para contextos de chat grupal.
  - `per-sender` (predeterminado): cada remitente obtiene una sesión aislada dentro de un contexto de canal.
  - `global`: todos los participantes en un contexto de canal comparten una sola sesión (úsese solo cuando se pretenda un contexto compartido).
- **`dmScope`**: cómo se agrupan los MD.
  - `main`: todos los MD comparten la sesión principal.
  - `per-peer`: aislar por ID de remitente entre canales.
  - `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
  - `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para multicuenta).
- **`identityLinks`**: asignar IDs canónicos a pares con prefijo de proveedor para compartir sesiones entre canales. Los comandos de acoplamiento como `/dock_discord` utilizan el mismo mapa para cambiar la ruta de respuesta de la sesión activa a otro par de canal vinculado; consulte [Acoplamiento de canales](/es/concepts/channel-docking).
- **`reset`**: política de restablecimiento primaria. `daily` se restablece a la `atHour` hora local; `idle` se restablece después de `idleMinutes`. Cuando ambos están configurados, vence el que lo haga primero. La frescura del restablecimiento diario utiliza el `sessionStartedAt` de la fila de sesión; la frescura del restablecimiento por inactividad utiliza `lastInteractionAt`. Las escrituras de eventos en segundo plano/sistema, como latidos, despertares de cron, notificaciones de ejecución y mantenimiento de puerta de enlace, pueden actualizar `updatedAt`, pero no mantienen frescas las sesiones diarias/inactivas.
- **`resetByType`**: anulaciones por tipo (`direct`, `group`, `thread`). El antiguo `dm` se acepta como alias para `direct`.
- **`mainKey`**: campo heredado. El tiempo de ejecución siempre utiliza `"main"` para el depósito de chat directo principal.
- **`agentToAgent.maxPingPongTurns`**: máximo de turnos de respuesta entre agentes durante los intercambios de agente a agente (entero, rango: `0`-`20`, predeterminado: `5`). `0` desactiva la encadenación de ida y vuelta.
- **`sendPolicy`**: coincidir por `channel`, `chatType` (`direct|group|channel`, con el alias heredado `dm`), `keyPrefix` o `rawKeyPrefix`. La primera denegación gana.
- **`maintenance`**: controles de limpieza + retención del almacén de sesiones.
  - `mode`: `warn` emite solo advertencias; `enforce` aplica la limpieza.
  - `pruneAfter`: límite de antigüedad para entradas obsoletas (predeterminado `30d`).
  - `maxEntries`: número máximo de entradas en `sessions.json` (predeterminado `500`). Las escrituras del tiempo de ejecución aplican la limpieza por lotes con un pequeño búfer de nivel alto para límites de tamaño de producción; `openclaw sessions cleanup --enforce` aplica el límite inmediatamente.
  - `rotateBytes`: en desuso y se ignora; `openclaw doctor --fix` lo elimina de configuraciones antiguas.
  - `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>`. De forma predeterminada es `pruneAfter`; establezca `false` para desactivar.
  - `maxDiskBytes`: presupuesto de disco opcional del directorio de sesiones. En el modo `warn` registra advertencias; en el modo `enforce` elimina primero los artefactos/sesiones más antiguos.
  - `highWaterBytes`: objetivo opcional después de la limpieza del presupuesto. De forma predeterminada es `80%` de `maxDiskBytes`.
- **`threadBindings`**: valores predeterminados globales para funciones de sesión vinculadas a hilos.
  - `enabled`: interruptor maestro predeterminado (los proveedores pueden anular; Discord usa `channels.discord.threadBindings.enabled`)
  - `idleHours`: inactividad predeterminada de autoenfoque en horas (`0` desactiva; los proveedores pueden anular)
  - `maxAgeHours`: edad máxima dura predeterminada en horas (`0` desactiva; los proveedores pueden anular)
  - `spawnSessions`: puerta predeterminada para crear sesiones de trabajo vinculadas a hilos desde `sessions_spawn` y creaciones de hilos ACP. De forma predeterminada es `true` cuando los enlaces de hilo están activados; proveedores/cuentas pueden anular.
  - `defaultSpawnContext`: contexto de subagente nativo predeterminado para creaciones vinculadas a hilos (`"fork"` o `"isolated"`). De forma predeterminada es `"fork"`.

</Accordion>

---

## Mensajes

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "followup", // steer | followup | collect | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### Prefijo de respuesta

Invalidaciones por canal/cuenta: `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Resolución (gana el más específico): cuenta → canal → global. `""` desactiva y detiene la cascada. `"auto"` deriva `[{identity.name}]`.

**Variables de plantilla:**

| Variable          | Descripción                       | Ejemplo                     |
| ----------------- | --------------------------------- | --------------------------- |
| `{model}`         | Nombre corto del modelo           | `claude-opus-4-6`           |
| `{modelFull}`     | Identificador completo del modelo | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nombre del proveedor              | `anthropic`                 |
| `{thinkingLevel}` | Nivel de pensamiento actual       | `high`, `low`, `off`        |
| `{identity.name}` | Nombre de identidad del agente    | (igual que `"auto"`)        |

Las variables no distinguen entre mayúsculas y minúsculas. `{think}` es un alias de `{thinkingLevel}`.

### Reacción de acuse de recibo

- Por defecto es `identity.emoji` del agente activo, de lo contrario `"👀"`. Establezca `""` para desactivar.
- Invalidaciones por canal: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Orden de resolución: cuenta → canal → `messages.ackReaction` → reserva de identidad.
- Ámbito: `group-mentions` (predeterminado), `group-all`, `direct`, `all`.
- `removeAckAfterReply`: elimina el acuse de recibo después de la respuesta en canales con capacidad de reacción como Slack, Discord, Telegram, WhatsApp e iMessage.
- `messages.statusReactions.enabled`: habilita las reacciones de estado del ciclo de vida en Slack, Discord, Telegram y WhatsApp.
  En Slack y Discord, sin establecer mantiene las reacciones de estado habilitadas cuando las reacciones de acuse de recibo están activas.
  En Telegram y WhatsApp, establézcalo explícitamente en `true` para habilitar las reacciones de estado del ciclo de vida.
- `messages.statusReactions.emojis`: anula las claves de emoji del ciclo de vida:
  `queued`, `thinking`, `compacting`, `tool`, `coding`, `web`, `deploy`, `build`,
  `concierge`, `done`, `error`, `stallSoft` y `stallHard`.
  Telegram solo permite un conjunto fijo de reacciones, por lo que los emoji configurados no compatibles vuelven
  a la variante de estado admitida más cercana para ese chat.

### Anti-rebote de entrada

Agrupa mensajes rápidos de solo texto del mismo remitente en un solo turno del agente. Los medios/archivos adjuntos se envían inmediatamente. Los comandos de control omiten el anti-rebote.

### TTS (texto a voz)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
        microsoft: {
          voice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
      },
    },
  },
}
```

- `auto` controla el modo de auto-TTS predeterminado: `off`, `always`, `inbound` o `tagged`. `/tts on|off` puede anular las preferencias locales y `/tts status` muestra el estado efectivo.
- `summaryModel` anula `agents.defaults.model.primary` para el resumen automático.
- `modelOverrides` está habilitado de forma predeterminada; `modelOverrides.allowProvider` tiene como valor predeterminado `false` (opt-in).
- Las claves de API recurren a `ELEVENLABS_API_KEY`/`XI_API_KEY` y `OPENAI_API_KEY`.
- Los proveedores de voz incluidos son propiedad de los complementos. Si `plugins.allow` está configurado, incluya cada complemento de proveedor TTS que desee usar, por ejemplo `microsoft` para Edge TTS. El ID de proveedor `edge` heredado se acepta como alias de `microsoft`.
- `providers.openai.baseUrl` anula el punto de conexión de TTS de OpenAI. El orden de resolución es configuración, luego `OPENAI_TTS_BASE_URL`, luego `https://api.openai.com/v1`.
- Cuando `providers.openai.baseUrl` apunta a un punto de conexión que no es de OpenAI, OpenClaw lo trata como un servidor TTS compatible con OpenAI y relaja la validación de modelo/voz.

---

## Hablar

Valores predeterminados para el modo Talk (macOS/iOS/Android).

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    consultThinkingLevel: "low",
    consultFastMode: true,
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

- `talk.provider` debe coincidir con una clave en `talk.providers` cuando se configuran múltiples proveedores de Talk.
- Las claves planas heredadas de Talk (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) son solo por compatibilidad. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida en `talk.providers.<provider>`.
- Los IDs de voz recurren a `ELEVENLABS_VOICE_ID` o `SAG_VOICE_ID`.
- `providers.*.apiKey` acepta cadenas de texto sin formato u objetos SecretRef.
- La reserva de `ELEVENLABS_API_KEY` se aplica solo cuando no se configura ninguna clave de API de Talk.
- `providers.*.voiceAliases` permite que las directivas de Talk usen nombres amigables.
- `providers.mlx.modelId` selecciona el repositorio de Hugging Face que utiliza el asistente local de MLX en macOS. Si se omite, macOS usa `mlx-community/Soprano-80M-bf16`.
- La reproducción de MLX en macOS se ejecuta a través del asistente `openclaw-mlx-tts` incluido cuando está presente, o un ejecutable en `PATH`; `OPENCLAW_MLX_TTS_BIN` anula la ruta del asistente para el desarrollo.
- `consultThinkingLevel` controla el nivel de pensamiento para la ejecución completa del agente OpenClaw detrás de las llamadas en tiempo real `openclaw_agent_consult` de Talk en Control UI. Déjelo sin establecer para preservar el comportamiento normal de la sesión/modelo.
- `consultFastMode` establece una anulación de modo rápido de un solo uso para las consultas en tiempo real de Talk en Control UI sin cambiar la configuración normal de modo rápido de la sesión.
- `speechLocale` establece el ID de configuración regional BCP 47 utilizado por el reconocimiento de voz de Talk en iOS/macOS. Déjelo sin establecer para usar el valor predeterminado del dispositivo.
- `silenceTimeoutMs` controla cuánto tiempo espera el modo Talk después del silencio del usuario antes de enviar la transcripción. Sin configurar mantiene la ventana de pausa predeterminada de la plataforma (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions` añade instrucciones del sistema orientadas al proveedor al aviso en tiempo real integrado de OpenClaw, para que el estilo de voz se pueda configurar sin perder la orientación predeterminada de `openclaw_agent_consult`.

---

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference) — todas las demás claves de configuración
- [Configuración](/es/gateway/configuration) — tareas comunes y configuración rápida
- [Ejemplos de configuración](/es/gateway/configuration-examples)

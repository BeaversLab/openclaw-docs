---
summary: "Valores predeterminados de agentes, enrutamiento multiagente, sesión, mensajes y configuración de conversación"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuración — agentes"
---

Claves de configuración con ámbito de agente bajo `agents.*`, `multiAgent.*`, `session.*`,
`messages.*` y `talk.*`. Para canales, herramientas, tiempo de ejecución de la puerta de enlace (gateway) y otras
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
- `toolResultMaxChars`: límite máximo avanzado de resultados de herramientas en vivo utilizado para resultados
  persistidos y la recuperación de desbordamiento. Déjelo sin establecer para el límite automático del contexto del modelo:
  `16000` caracteres por debajo de 100K tokens, `32000` caracteres en 100K+ tokens, y `64000`
  caracteres en 200K+ tokens. El límite efectivo aún se restringe a aproximadamente el 30% de la
  ventana de contexto del modelo. `openclaw doctor --deep` imprime el límite efectivo, y
  el doctor (doctor) solo advierte cuando una anulación explícita está obsoleta o no tiene efecto.
- `postCompactionMaxChars`: límite de extractos de AGENTS.md utilizado durante la inyección de
  actualización posterior a la compactación.

#### `agents.list[].contextLimits`

Anulación por agente para los controles compartidos `contextLimits`. Los campos omitidos heredan
de `agents.defaults.contextLimits`.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000, // advanced ceiling for this agent
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

Tamaño máximo de píxeles para el lado más largo de la imagen en bloques de imagen de transcripción/herramientas antes de las llamadas al proveedor.
Predeterminado: `1200`.

Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de la carga útil de la solicitud para ejecuciones con muchas capturas de pantalla.
Los valores más altos preservan más detalles visuales.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

Preferencia de compresión/detalles de la herramienta de imagen para imágenes cargadas desde rutas de archivo, URL y referencias de medios.
Predeterminado: `auto`.

OpenClaw adapta la escala de redimensionamiento al modelo de imagen seleccionado. Por ejemplo, Claude Opus 4.8, OpenAI GPT-5.5, Qwen VL y los modelos de visión alojados de Llama 4 pueden usar imágenes más grandes que las rutas de visión de alta detalle antiguas/predeterminadas, mientras que los turnos con múltiples imágenes se comprimen más agresivamente en el modo `auto` para controlar el costo de tokens y latencia.

Valores:

- `auto`: adaptarse a los límites del modelo y al recuento de imágenes.
- `efficient`: preferir imágenes más pequeñas para un menor uso de tokens y bytes.
- `balanced`: utilice la escalera intermedia estándar.
- `high`: preserve más detalles para capturas de pantalla, diagramas e imágenes de documentos.

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

### `agents.defaults.userTimezone`

Zona horaria para el contexto del prompt del sistema (no las marcas de tiempo de los mensajes). Recurre a la zona horaria del host.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Formato de hora en el prompt del sistema. Predeterminado: `auto` (preferencia del SO).

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
  - La forma de objeto establece el modelo principal más los modelos de conmutación por error ordenados.
- `imageModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la ruta de herramienta `image` como su configuración de modelo de visión.
  - También se utiliza como enrutamiento de respaldo cuando el modelo predeterminado/seleccionado no puede aceptar entrada de imagen.
  - Se prefieren referencias `provider/model` explícitas. Se aceptan IDs simples por compatibilidad; si un ID simple coincide únicamente con una entrada con capacidad de imagen configurada en `models.providers.*.models`, OpenClaw lo califica para ese proveedor. Las coincidencias configuradas ambiguas requieren un prefijo de proveedor explícito.
- `imageGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Utilizado por la capacidad compartida de generación de imágenes y cualquier futura superficie de herramienta/complemento que genere imágenes.
  - Valores típicos: `google/gemini-3.1-flash-image-preview` para la generación de imágenes nativa de Gemini, `fal/fal-ai/flux/dev` para fal, `openai/gpt-image-2` para OpenAI Images, o `openai/gpt-image-1.5` para salida PNG/WebP de OpenAI con fondo transparente.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación del proveedor correspondiente (por ejemplo `GEMINI_API_KEY` o `GOOGLE_API_KEY` para `google/*`, `OPENAI_API_KEY` u OpenAI Codex OAuth para `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` para `fal/*`).
  - Si se omite, `image_generate` aún puede inferir un proveedor predeterminado con autenticación. Intenta primero el proveedor predeterminado actual y luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor.
- `musicGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la capacidad de generación de música compartida y la herramienta integrada `music_generate`.
  - Valores típicos: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` o `minimax/music-2.6`.
  - Si se omite, `music_generate` aún puede inferir un valor predeterminado de proveedor respaldado por autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de música registrados restantes en orden de ID de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor correspondiente.
- `videoGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la capacidad de generación de video compartida y la herramienta integrada `video_generate`.
  - Valores típicos: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash` o `qwen/wan2.7-r2v`.
  - Si se omite, `video_generate` aún puede inferir un valor predeterminado de proveedor respaldado por autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de video registrados restantes en orden de ID de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación del proveedor correspondiente o la clave API.
  - El proveedor de generación de video Qwen incluido admite hasta 1 video de salida, 1 imagen de entrada, 4 videos de entrada, una duración de 10 segundos y opciones a nivel de proveedor `size`, `aspectRatio`, `resolution`, `audio` y `watermark`.
- `pdfModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la herramienta `pdf` para el enrutamiento de modelos.
  - Si se omite, la herramienta PDF recurre a `imageModel` y luego al modelo de sesión/predeterminado resuelto.
- `pdfMaxBytesMb`: límite de tamaño de PDF predeterminado para la herramienta `pdf` cuando no se pasa `maxBytesMb` en el momento de la llamada.
- `pdfMaxPages`: máximo de páginas predeterminado considerado por el modo de reserva de extracción en la herramienta `pdf`.
- `verboseDefault`: nivel detallado predeterminado para los agentes. Valores: `"off"`, `"on"`, `"full"`. Predeterminado: `"off"`.
- `toolProgressDetail`: modo de detalle para los resúmenes de herramientas de `/verbose` y las líneas de herramientas de borrador de progreso. Valores: `"explain"` (predeterminado, etiquetas humanas compactas) o `"raw"` (agregar comando sin procesar/detalle cuando esté disponible). El `agents.list[].toolProgressDetail` por agente anula este valor predeterminado.
- `reasoningDefault`: visibilidad de razonamiento predeterminada para los agentes. Valores: `"off"`, `"on"`, `"stream"`. El `agents.list[].reasoningDefault` por agente anula este valor predeterminado. Los valores predeterminados de razonamiento configurados solo se aplican para propietarios, remitentes autorizados o contextos de puerta de enlace de operador-admin cuando no se establece ninguna anulación de razonamiento por mensaje o por sesión.
- `elevatedDefault`: nivel de salida elevado predeterminado para los agentes. Valores: `"off"`, `"on"`, `"ask"`, `"full"`. Predeterminado: `"on"`.
- `model.primary`: formato `provider/model` (por ejemplo, `openai/gpt-5.5` para clave de API de OpenAI o acceso OAuth de Codex). Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única de proveedor configurado para esa identificación de modelo exacta, y solo luego recurre al proveedor predeterminado configurado (comportamiento de compatibilidad obsoleto, por lo que se prefiere un `provider/model` explícito). Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de un proveedor eliminado.
- `models`: el catálogo de modelos configurado y la lista de permitidos para `/model`. Cada entrada puede incluir `alias` (acceso directo) y `params` (específico del proveedor, por ejemplo `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, enrutamiento OpenRouter `provider`, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Use entradas `provider/*` como `"openai-codex/*": {}` o `"vllm/*": {}` para mostrar todos los modelos descubiertos para los proveedores seleccionados sin listar manualmente cada ID de modelo.
  - Añada `agentRuntime` a una entrada `provider/*` cuando cada modelo descubierto dinámicamente para ese proveedor deba usar el mismo tiempo de ejecución. La política de tiempo de ejecución `provider/model` exacta todavía tiene prioridad sobre el comodín.
  - Ediciones seguras: use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` para añadir entradas. `config set` rechaza los reemplazos que eliminarían las entradas existentes en la lista de permitidos a menos que pase `--replace`.
  - Los flujos de configuración/integración con alcance de proveedor fusionan los modelos de proveedor seleccionados en este mapa y preservan los proveedores no relacionados ya configurados.
  - Para los modelos de OpenAI Responses directos, la compactación del lado del servidor se habilita automáticamente. Use `params.responsesServerCompaction: false` para dejar de inyectar `context_management`, o `params.responsesCompactThreshold` para anular el umbral. Consulte [OpenAI server-side compaction](/es/providers/openai#server-side-compaction-responses-api).
- `params`: parámetros globales predeterminados del proveedor aplicados a todos los modelos. Establézcalo en `agents.defaults.params` (ej. `{ cacheRetention: "long" }`).
- Precedencia de fusión de `params` (configuración): `agents.defaults.params` (base global) es anulada por `agents.defaults.models["provider/model"].params` (por modelo), luego `agents.list[].params` (id de agente coincidente) anula por clave. Consulte [Prompt Caching](/es/reference/prompt-caching) para obtener detalles.
- `models.providers.openrouter.params.provider`: política predeterminada de enrutamiento de proveedores en toda OpenRouter. OpenClaw reenvía esto al objeto de solicitud `provider` de OpenRouter; los parámetros `agents.defaults.models["openrouter/<model>"].params.provider` por modelo y por agente anulan por clave. Consulte [enrutamiento de proveedores de OpenRouter](/es/providers/openrouter#advanced-configuration).
- `params.extra_body`/`params.extraBody`: JSON de paso a través avanzado fusionado en los cuerpos de solicitud `api: "openai-completions"` para proxies compatibles con OpenAI. Si choca con claves de solicitud generadas, gana el cuerpo adicional; las rutas de finalizaciones no nativas aún eliminan `store` exclusivos de OpenAI posteriormente.
- `params.chat_template_kwargs`: argumentos de plantilla de chat compatibles con vLLM/OpenAI fusionados en los cuerpos de solicitud `api: "openai-completions"` de nivel superior. Para `vllm/nemotron-3-*` con el pensamiento desactivado, el complemento vLLM incluido envía automáticamente `enable_thinking: false` y `force_nonempty_content: true`; `chat_template_kwargs` explícitos anulan los valores predeterminados generados, y `extra_body.chat_template_kwargs` aún tiene precedencia final. Los modelos de pensamiento vLLM Qwen y Nemotron configurados exponen elecciones binarias `/think` (`off`, `on`) en lugar de la escalera de esfuerzo multinivel.
- `compat.thinkingFormat`: estilo de carga útil de pensamiento compatible con OpenAI. Use `"together"` para `reasoning.enabled` estilo Together, `"qwen"` para `enable_thinking` de nivel superior estilo Qwen, o `"qwen-chat-template"` para `chat_template_kwargs.enable_thinking` en backends de la familia Qwen que admiten kwargs de plantilla de chat a nivel de solicitud, como vLLM. OpenClaw asigna el pensamiento desactivado a `false` y el pensamiento activado a `true`, y los modelos vLLM Qwen configurados exponen elecciones binarias `/think` para estos formatos.
- `compat.supportedReasoningEfforts`: lista de esfuerzo de razonamiento compatible con OpenAI por modelo. Incluya `"xhigh"` para puntos de conexión personalizados que realmente lo acepten; OpenClaw luego expone `/think xhigh` en los menús de comandos, filas de sesión de Gateway, validación de parches de sesión, validación de CLI de agentes y validación `llm-task` para ese proveedor/modelo configurado. Use `compat.reasoningEffortMap` cuando el backend desea un valor específico del proveedor para un nivel canónico.
- `params.preserveThinking`: participación opcional exclusiva de Z.AI para el pensamiento preservado. Cuando está habilitado y el pensamiento está activo, OpenClaw envía `thinking.clear_thinking: false` y reproduce el `reasoning_content` anterior; consulte [Z.AI thinking and preserved thinking](/es/providers/zai#thinking-and-preserved-thinking).
- `localService`: gestor de procesos a nivel de proveedor opcional para servidores de modelos locales/autohospedados. Cuando el modelo seleccionado pertenece a ese proveedor, OpenClaw sondea `healthUrl` (o `baseUrl + "/models"`), inicia `command` con `args` si el punto de conexión está caído, espera hasta `readyTimeoutMs` y luego envía la solicitud del modelo. `command` debe ser una ruta absoluta. `idleStopMs: 0` mantiene el proceso vivo hasta que OpenClaw sale; un valor positivo detiene el proceso generado por OpenClaw después de esa cantidad de milisegundos inactivos. Consulte [Local model services](/es/gateway/local-model-services).
- La política de tiempo de ejecución pertenece a los proveedores o modelos, no a `agents.defaults`. Use `models.providers.<provider>.agentRuntime` para reglas de todo el proveedor o `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` para reglas específicas del modelo. Los modelos de agente de OpenAI en el proveedor oficial de OpenAI seleccionan Codex por defecto.
- Los escritores de configuración que mutan estos campos (por ejemplo, `/models set`, `/models set-image` y comandos de agregar/eliminar fallback) guardan el formulario de objeto canónico y preservan las listas de fallback existentes cuando es posible.
- `maxConcurrent`: máximo de ejecuciones paralelas de agentes a través de sesiones (cada sesión todavía serializada). Predeterminado: 4.

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
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "openclaw" },
        },
      },
    },
  },
}
```

- `id`: `"auto"`, `"openclaw"`, un id de arnés de complemento registrado o un alias de backend CLI compatible. El complemento Codex incluido registra `codex`; el complemento Anthropic incluido proporciona el backend CLI `claude-cli`.
- `id: "auto"` permite que los arneses de complementos registrados reclamen turnos compatibles y usa OpenClaw cuando ningún arnés coincide. Un tiempo de ejecución de complemento explícito como `id: "codex"` requiere ese arnés y falla de forma cerrada si no está disponible o falla.
- `id: "pi"` se acepta solo como un alias obsoleto para `openclaw` para preservar las configuraciones enviadas de v2026.5.22 y anteriores. La nueva configuración debe usar `openclaw`.
- La precedencia del tiempo de ejecución es primero la política exacta del modelo (`agents.list[].models["provider/model"]`, `agents.defaults.models["provider/model"]` o `models.providers.<provider>.models[]`), luego `agents.list[]` / `agents.defaults.models["provider/*"]`, y luego la política de todo el proveedor en `models.providers.<provider>.agentRuntime`.
- Las claves de tiempo de ejecución de todo el agente son heredadas. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, los pines de tiempo de ejecución de la sesión y `OPENCLAW_AGENT_RUNTIME` son ignorados por la selección del tiempo de ejecución. Ejecute `openclaw doctor --fix` para eliminar los valores obsoletos.
- Los modelos de agente OpenAI usan el arnés Codex por defecto; el proveedor/modelo `agentRuntime.id: "codex"` sigue siendo válido cuando desea que sea explícito.
- Para los despliegues de Claude CLI, prefiera `model: "anthropic/claude-opus-4-8"` más `agentRuntime.id: "claude-cli"` con alcance de modelo. Las referencias de modelo heredadas `claude-cli/claude-opus-4-7` todavía funcionan por compatibilidad, pero la nueva configuración debe mantener la selección de proveedor/modelo canónica y colocar el backend de ejecución en la política de tiempo de ejecución de proveedor/modelo.
- Esto solo controla la ejecución del turno de agente de texto. La generación de medios, la visión, PDF, música, video y TTS todavía usan su configuración de proveedor/modelo.

**Abreviaturas de alias integrados** (solo se aplican cuando el modelo está en `agents.defaults.models`):

| Alias               | Modelo                          |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`     |
| `sonnet`            | `anthropic/claude-sonnet-4-6`   |
| `gpt`               | `openai/gpt-5.5`                |
| `gpt-mini`          | `openai/gpt-5.4-mini`           |
| `gpt-nano`          | `openai/gpt-5.4-nano`           |
| `gemini`            | `google/gemini-3.1-pro-preview` |
| `gemini-flash`      | `google/gemini-3-flash-preview` |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite`  |

Tus alias configurados siempre tienen prioridad sobre los predeterminados.

Los modelos Z.AI GLM-4.x activan automáticamente el modo de pensamiento a menos que establezcas `--thinking off` o definas `agents.defaults.models["zai/<model>"].params.thinking` tú mismo.
Los modelos Z.AI activan `tool_stream` por defecto para la transmisión de llamadas a herramientas. Establece `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
Anthropic Claude Opus 4.8 mantiene el pensamiento desactivado por defecto en OpenClaw; cuando el pensamiento adaptativo se activa explícitamente, el esfuerzo predeterminado propiedad del proveedor de Anthropic es `high`. Los modelos Claude 4.6 tienen como valor predeterminado `adaptive` cuando no se establece ningún nivel de pensamiento explícito.

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

- Los backends de CLI son primero de texto; las herramientas siempre están desactivadas.
- Sesiones admitidas cuando `sessionArg` está establecido.
- Passthrough de imágenes admitido cuando `imageArg` acepta rutas de archivo.
- `reseedFromRawTranscriptWhenUncompacted: true` permite que un backend recupere sesiones
  invalidadas de forma segura desde una cola limitada de transcripciones sin procesar de OpenClaw antes de que
  exista el primer resumen de compactación. Los cambios en el perfil de autenticación o la época de credenciales
  todavía nunca volverán a sembrar en bruto.

### `agents.defaults.promptOverlays`

Superposiciones de prompts independientes del proveedor aplicadas por familia de modelos en superficies de prompts ensambladas por OpenClaw. Los ids de modelos de la familia GPT-5 reciben el contrato de comportamiento compartido a través de rutas OpenClaw/proveedor; `personality` controla solo la capa de estilo de interacción amigable. Las rutas del servidor de aplicaciones nativo de Codex mantienen las instrucciones base/modelo propiedad de Codex en lugar de esta superposición GPT-5 de OpenClaw, y OpenClaw desactiva la personalidad integrada de Codex para hilos nativos.

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
- `"off"` desactiva solo la capa amigable; el contrato de comportamiento de GPT-5 etiquetado permanece activado.
- El `plugins.entries.openai.config.personality` heredado todavía se lee cuando esta configuración compartida no está establecida.

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
- `includeSystemPromptSection`: cuando es false, omite la sección de latido del prompt del sistema y salta la inyección de `HEARTBEAT.md` en el contexto de arranque. Predeterminado: `true`.
- `suppressToolErrorWarnings`: cuando es true, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `timeoutSeconds`: tiempo máximo en segundos permitido para un turno de agente de latido antes de que se aborte. Déjelo sin establecer para usar `agents.defaults.timeoutSeconds`.
- `directPolicy`: política de entrega directa/DM. `allow` (predeterminado) permite la entrega a objetivo directo. `block` suprime la entrega a objetivo directo y emite `reason=dm-blocked`.
- `lightContext`: cuando es true, las ejecuciones de latido usan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es true, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. El mismo patrón de aislamiento que cron `sessionTarget: "isolated"`. Reduce el costo de tokens por latido de ~100K a ~2-5K tokens.
- `skipWhenBusy`: cuando es true, las ejecuciones de latido se aplazan en los carriles extra ocupados de ese agente: su propio subagente con clave de sesión o trabajo de comandos anidados. Los carriles cron siempre aplazan los latidos, incluso sin esta bandera.
- Por agente: establezca `agents.list[].heartbeat`. Cuando cualquier agente define `heartbeat`, **solo esos agentes** ejecutan latidos.
- Los latidos ejecutan turnos completos de agente: los intervalos más cortos consumen más tokens.

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
        midTurnPrecheck: { enabled: false }, // optional tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // opt in to AGENTS.md section reinjection
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
- `provider`: id de un complemento de proveedor de compactación registrado. Cuando se establece, se invoca el `summarize()` del proveedor en lugar del resumen LLM integrado. Ante fallos, vuelve al integrado. Establecer un proveedor fuerza `mode: "safeguard"`. Consulte [Compaction](/es/concepts/compaction).
- `timeoutSeconds`: segundos máximos permitidos para una única operación de compactación antes de que OpenClaw la aborte. Predeterminado: `900`.
- `keepRecentTokens`: presupuesto de punto de corte del agente para mantener la cola de la transcripción más reciente textualmente. La `/compact` manual respeta esto cuando se establece explícitamente; de lo contrario, la compactación manual es un punto de control fijo.
- `identifierPolicy`: `strict` (predeterminado), `off` o `custom`. `strict` antepone la guía de retención de identificadores opacos integrada durante el resumen de compactación.
- `identifierInstructions`: texto personalizado opcional de preservación de identificadores que se usa cuando `identifierPolicy=custom`.
- `qualityGuard`: las verificaciones de reintentos ante salida con errores detectan resúmenes de seguridad. Habilitado de forma predeterminada en modo de seguridad; establezca `enabled: false` para omitir la auditoría.
- `midTurnPrecheck`: verificación opcional de presión del bucle de herramientas. Cuando `enabled: true`, OpenClaw verifica la presión del contexto después de anexar los resultados de las herramientas y antes de la siguiente llamada al modelo. Si el contexto ya no cabe, aborta el intento actual antes de enviar el mensaje y reutiliza la ruta de recuperación de preverificación existente para truncar los resultados de las herramientas o compactar y reintentar. Funciona con los modos de compactación `default` y `safeguard`. Predeterminado: deshabilitado.
- `postCompactionSections`: nombres de secciones H2/H3 opcionales de AGENTS.md para volver a inyectar después de la compactación. La reinyección está deshabilitada cuando no está configurado o se establece en `[]`. Establecer explícitamente `["Session Startup", "Red Lines"]` habilita ese par y preserva el respaldo heredado `Every Session`/`Safety`. Habilite esto solo cuando el contexto adicional valga la pena el riesgo de duplicar la orientación del proyecto ya capturada en el resumen de compactación.
- `model`: override opcional de `provider/model-id` solo para el resumen de compactación. Úselo cuando la sesión principal debe mantener un modelo pero los resúmenes de compactación deben ejecutarse en otro; cuando no está configurado, la compactación usa el modelo principal de la sesión.
- `maxActiveTranscriptBytes`: umbral de bytes opcional (`number` o cadenas como `"20mb"`) que activa la compactación local normal antes de una ejecución cuando el JSONL activo crece más allá del umbral. Requiere `truncateAfterCompaction` para que una compactación exitosa pueda rotar a una transcripción sucesora más pequeña. Deshabilitado cuando no está configurado o es `0`.
- `notifyUser`: cuando es `true`, envía avisos breves al usuario cuando comienza la compactación y cuando se completa (por ejemplo, "Compactando contexto..." y "Compactación completada"). Deshabilitado por defecto para mantener la compactación silenciosa.
- `memoryFlush`: turno de agente silencioso antes de la auto-compactación para almacenar memorias duraderas. Establezca `model` en un proveedor/modelo exacto como `ollama/qwen3:8b` cuando este turno de mantenimiento debe permanecer en un modelo local; la anulación no hereda la cadena de respaldo de la sesión activa. Se omite cuando el espacio de trabajo es de solo lectura.

### `agents.defaults.runRetries`

Límites de iteración de reintentos del bucle de ejecución externo para el tiempo de ejecución del agente integrado a fin de evitar bucles de ejecución infinitos durante la recuperación de errores. Tenga en cuenta que esta configuración actualmente se aplica solo al tiempo de ejecución del agente integrado, no a los tiempos de ejecución de ACP o CLI.

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

- `base`: número base de iteraciones de reintentos de ejecución para el bucle de ejecución externo. Predeterminado: `24`.
- `perProfile`: iteraciones adicionales de reintentos de ejecución otorgadas por cada candidato de perfil de reserva. Predeterminado: `8`.
- `min`: límite absoluto mínimo para las iteraciones de reintentos de ejecución. Predeterminado: `32`.
- `max`: límite absoluto máximo para las iteraciones de reintentos de ejecución para evitar una ejecución descontrolada. Predeterminado: `160`.

### `agents.defaults.contextPruning`

Poda **los resultados de herramientas antiguos** del contexto en memoria antes de enviarlos al LLM. **No** modifica el historial de sesiones en disco.

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

- `mode: "cache-ttl"` habilita los pases de poda.
- `ttl` controla la frecuencia con la que se puede ejecutar la poda nuevamente (después del último acceso al caché).
- La poda realiza un recorte suave primero en los resultados de herramientas demasiado grandes, y luego un borrado duro de los resultados de herramientas más antiguos si es necesario.
- `softTrimRatio` y `hardClearRatio` aceptan valores de `0.0` a `1.0`; la validación de la configuración rechaza los valores fuera de ese rango.

**Soft-trim** mantiene el principio + el final e inserta `...` en el medio.

**Hard-clear** reemplaza todo el resultado de la herramienta con el marcador de posición.

Notas:

- Los bloques de imagen nunca se recortan/borran.
- Las proporciones se basan en caracteres (aproximados), no en conteos exactos de tokens.
- Si existen menos de `keepLastAssistants` mensajes del asistente, la poda se omite.

</Accordion>

Consulte [Poda de sesión](/es/concepts/session-pruning) para detalles sobre el comportamiento.

### Transmisión en bloques

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

- Los canales que no sean Telegram requieren `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
- anulaciones de canal: `channels.<channel>.blockStreamingCoalesce` (y variantes por cuenta). Signal/Slack/Discord/Google Chat predeterminado `minChars: 1500`.
- `humanDelay`: pausa aleatoria entre respuestas en bloque. `natural` = 800–2500ms. Anulación por agente: `agents.list[].humanDelay`.

Consulte [Transmisión](/es/concepts/streaming) para detalles sobre el comportamiento y la fragmentación.

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

- Valores predeterminados: `instant` para chats/menciones directos, `message` para chats grupales sin mención.
- Anulaciones por sesión: `session.typingMode`, `session.typingIntervalSeconds`.

Consulte [Indicadores de escritura](/es/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandbox opcional para el agente integrado. Consulte [Sandboxing](/es/gateway/sandboxing) para obtener la guía completa.

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

- `docker`: tiempo de ejecución local de Docker (predeterminado)
- `ssh`: tiempo de ejecución remoto genérico respaldado por SSH
- `openshell`: tiempo de ejecución de OpenShell

Cuando se selecciona `backend: "openshell"`, la configuración específica del tiempo de ejecución se mueve a
`plugins.entries.openshell.config`.

**Configuración del backend SSH:**

- `target`: destino SSH en forma `user@host[:port]`
- `command`: comando del cliente SSH (predeterminado: `ssh`)
- `workspaceRoot`: raíz remota absoluta utilizada para espacios de trabajo por ámbito
- `identityFile` / `certificateFile` / `knownHostsFile`: archivos locales existentes pasados a OpenSSH
- `identityData` / `certificateData` / `knownHostsData`: contenidos en línea o SecretRefs que OpenClaw materializa en archivos temporales en tiempo de ejecución
- `strictHostKeyChecking` / `updateHostKeys`: controles de política de claves de host de OpenSSH

**Precedencia de autenticación SSH:**

- `identityData` tiene prioridad sobre `identityFile`
- `certificateData` tiene prioridad sobre `certificateFile`
- `knownHostsData` tiene prioridad sobre `knownHostsFile`
- Los valores `*Data` respaldados por SecretRef se resuelven desde la instantánea activa del tiempo de ejecución de secretos antes de que inicie la sesión del sandbox

**Comportamiento del backend SSH:**

- siembra el espacio de trabajo remoto una vez después de crear o recrear
- luego mantiene el espacio de trabajo SSH remoto como canónico
- enruta `exec`, herramientas de archivo y rutas de medios a través de SSH
- no sincroniza los cambios remotos de vuelta al host automáticamente
- no soporta contenedores de navegador en sandbox

**Acceso al espacio de trabajo:**

- `none`: espacio de trabajo de sandbox por ámbito bajo `~/.openclaw/sandboxes`
- `ro`: espacio de trabajo de sandbox en `/workspace`, espacio de trabajo del agente montado como solo lectura en `/agent`
- `rw`: espacio de trabajo del agente montado como lectura/escritura en `/workspace`

**Ámbito:**

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

- `mirror`: sembrar remoto desde local antes de la ejecución, sincronizar de vuelta después de la ejecución; el espacio de trabajo local se mantiene canónico
- `remote`: sembrar remoto una vez cuando se crea el sandbox, luego mantener el espacio de trabajo remoto canónico

En el modo `remote`, las ediciones locales del host realizadas fuera de OpenClaw no se sincronizan en el sandbox automáticamente después del paso de siembra.
El transporte es SSH hacia el sandbox de OpenShell, pero el complemento posee el ciclo de vida del sandbox y la sincronización de espejo opcional.

**`setupCommand`** se ejecuta una vez después de la creación del contenedor (vía `sh -lc`). Necesita salida de red, raíz grabable, usuario root.

**Los contenedores por defecto son `network: "none"`** — establézcalo en `"bridge"` (o una red puente personalizada) si el agente necesita acceso de salida.
`"host"` está bloqueado. `"container:<id>"` está bloqueado de forma predeterminada a menos que establezca explícitamente
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (rompe-cristales).
El servidor de aplicaciones Codex que se ejecuta en un sandbox activo de OpenClaw utiliza esta misma configuración de salida para su acceso de red en modo de código nativo.

**Los archivos adjuntos entrantes** se preparan en `media/inbound/*` en el espacio de trabajo activo.

**`docker.binds`** monta directorios de host adicionales; los enlaces globales y por agente se combinan.

**Navegador en sandbox** (`sandbox.browser.enabled`): Chromium + CDP en un contenedor. URL de noVNC inyectada en el prompt del sistema. No requiere `browser.enabled` en `openclaw.json`.
El acceso del observador noVNC utiliza autenticación VNC de forma predeterminada y OpenClaw emite una URL de token de corta duración (en lugar de exponer la contraseña en la URL compartida).

- `allowHostControl: false` (predeterminado) bloquea las sesiones en sandbox para que no apunten al navegador host.
- `network` tiene como valor predeterminado `openclaw-sandbox-browser` (red puente dedicada). Establézcalo en `bridge` solo cuando desee explícitamente la conectividad de puente global.
- `cdpSourceRange` opcionalmente restringe el ingreso de CDP en el borde del contenedor a un rango CIDR (por ejemplo `172.21.0.1/32`).
- `sandbox.browser.binds` monta directorios de host adicionales solo en el contenedor del navegador en sandbox. Cuando se establece (incluyendo `[]`), reemplaza `docker.binds` para el contenedor del navegador.
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
    habilitados de forma predeterminada y se pueden desactivar con
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si el uso de WebGL/3D lo requiere.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` vuelve a habilitar las extensiones si su flujo de trabajo
    depende de ellas.
  - `--renderer-process-limit=2` se puede cambiar con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`; establezca `0` para usar el límite de proceso predeterminado de Chromium.
  - más `--no-sandbox` cuando `noSandbox` está habilitado.
  - Los valores predeterminados son la línea base de la imagen del contenedor; use una imagen de navegador personalizada con un
    punto de entrada personalizado para cambiar los valores predeterminados del contenedor.

</Accordion>

El aislamiento del navegador y `sandbox.docker.binds` son exclusivos de Docker.

Construir imágenes (desde una copia del código fuente):

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

Para instalaciones de npm sin una copia del código fuente, consulte [Sandboxing § Images and setup](/es/gateway/sandboxing#images-and-setup) para ver los comandos `docker build` en línea.

### `agents.list` (invalidaciones por agente)

Use `agents.list[].tts` para dar a un agente su propio proveedor de TTS, voz, modelo, estilo o modo de TTS automático. El bloque de agente se fusiona profundamente con el `messages.tts` global, por lo que las credenciales compartidas pueden permanecer en un solo lugar mientras los agentes individuales solo invalidan los campos de voz o proveedor que necesitan. La invalidación del agente activo se aplica a las respuestas habladas automáticas, `/tts audio`, `/tts status` y la herramienta de agente `tts`. Consulte [Text-to-speech](/es/tools/tts#per-agent-voice-overrides) para ver ejemplos de proveedores y precedencia.

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
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
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
- `model`: la forma de cadena establece un principal estricto por agente sin retroceso de modelo; la forma de objeto `{ primary }` también es estricta a menos que agregue `fallbacks`. Use `{ primary, fallbacks: [...] }` para optar por que ese agente tenga retroceso, o `{ primary, fallbacks: [] }` para hacer que el comportamiento estricto sea explícito. Los trabajos cron que solo invalidan `primary` todavía heredan los retrocesos predeterminados a menos que establezca `fallbacks: []`.
- `params`: parámetros de flujo por agente fusionados sobre la entrada de modelo seleccionada en `agents.defaults.models`. Use esto para invalidaciones específicas del agente como `cacheRetention`, `temperature` o `maxTokens` sin duplicar todo el catálogo de modelos.
- `tts`: anulaciones opcionales de texto a voz por agente. El bloque se fusiona profundamente sobre `messages.tts`, por lo que debe mantener las credenciales compartidas del proveedor y la política de reserva en `messages.tts` y establecer aquí solo los valores específicos de la persona, como el proveedor, la voz, el modelo, el estilo o el modo automático.
- `skills`: lista blanca de habilidades opcional por agente. Si se omite, el agente hereda `agents.defaults.skills` cuando está configurado; una lista explícita reemplaza los valores predeterminados en lugar de fusionarse, y `[]` significa ninguna habilidad.
- `thinkingDefault`: nivel de pensamiento predeterminado opcional por agente (`off | minimal | low | medium | high | xhigh | adaptive | max`). Anula `agents.defaults.thinkingDefault` para este agente cuando no se establece ninguna anulación por mensaje o sesión. El perfil de proveedor/modelo seleccionado controla qué valores son válidos; para Google Gemini, `adaptive` mantiene el pensamiento dinámico propiedad del proveedor (`thinkingLevel` omitido en Gemini 3/3.1, `thinkingBudget: -1` en Gemini 2.5).
- `reasoningDefault`: visibilidad de razonamiento predeterminada opcional por agente (`on | off | stream`). Anula `agents.defaults.reasoningDefault` para este agente cuando no se establece ninguna anulación de razonamiento por mensaje o sesión.
- `fastModeDefault`: valor predeterminado opcional por agente para el modo rápido (`true | false`). Se aplica cuando no se establece ninguna anulación de modo rápido por mensaje o sesión.
- `models`: anulaciones opcionales del catálogo de modelos/tiempo de ejecución por agente, clave por ids completos de `provider/model`. Use `models["provider/model"].agentRuntime` para excepciones de tiempo de ejecución por agente.
- `runtime`: descriptor de tiempo de ejecución opcional por agente. Use `type: "acp"` con valores predeterminados de `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) cuando el agente debe usar sesiones de arnés ACP de forma predeterminada.
- `identity.avatar`: ruta relativa al espacio de trabajo, URL de `http(s)` o URI de `data:`.
- `identity` deriva los valores predeterminados: `ackReaction` de `emoji`, `mentionPatterns` de `name`/`emoji`.
- `subagents.allowAgents`: lista blanca de ids de agentes configurados para objetivos `sessions_spawn.agentId` explícitos (`["*"]` = cualquier objetivo configurado; predeterminado: solo el mismo agente). Incluya el id del solicitante cuando se deban permitir llamadas `agentId` auto-dirigidas. Las entradas obsoletas cuya configuración de agente fue eliminada son rechazadas por `sessions_spawn` y se omiten de `agents_list`; ejecute `openclaw doctor --fix` para limpiarlas, o agregue una entrada `agents.list[]` mínima si ese objetivo debe permanecer iniciable mientras hereda los valores predeterminados.
- Protección de herencia de sandbox: si la sesión del solicitante está en sandbox, `sessions_spawn` rechaza los objetivos que se ejecutarían sin sandbox.
- `subagents.requireAgentId`: cuando es verdadero, bloquea las llamadas `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil; predeterminado: false).

---

## Enrutamiento multi-agente

Ejecute múltiples agentes aislados dentro de una sola Gateway. Consulte [Multi-Agent](/es/concepts/multi-agent).

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

### Campos de coincidencia de enlace

- `type` (opcional): `route` para enrutamiento normal (el tipo faltante predetermina a ruta), `acp` para enlaces de conversación ACP persistentes.
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
5. `match.accountId: "*"` (todo el canal)
6. Agente predeterminado

Dentro de cada nivel, gana la primera entrada `bindings` coincidente.

Para las entradas `type: "acp"`, OpenClaw resuelve por la identidad exacta de la conversación (`match.channel` + cuenta + `match.peer.id`) y no utiliza el orden de niveles de enlace de ruta anterior.

### Perfiles de acceso por agente

<Accordion title="Acceso completo (sin sandbox)">

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

- **`scope`**: estrategia base de agrupación de sesiones para contextos de chat grupal.
  - `per-sender` (predeterminado): cada remitente obtiene una sesión aislada dentro de un contexto de canal.
  - `global`: todos los participantes en un contexto de canal comparten una única sesión (usar solo cuando se pretenda un contexto compartido).
- **`dmScope`**: cómo se agrupan los MD.
  - `main`: todos los MD comparten la sesión principal.
  - `per-peer`: aislar por id de remitente entre canales.
  - `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
  - `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para multicuenta).
- **`identityLinks`**: mapea ids canónicos a pares con prefijo de proveedor para compartir sesiones entre canales. Los comandos de acoplamiento como `/dock_discord` usan el mismo mapa para cambiar la ruta de respuesta de la sesión activa a otro par de canal vinculado; consulte [Acoplamiento de canales](/es/concepts/channel-docking).
- **`reset`**: política de restablecimiento principal. `daily` restablece a la `atHour` hora local; `idle` restablece después de `idleMinutes`. Cuando ambos están configurados, gana el que expira primero. La frescura del restablecimiento diario usa el `sessionStartedAt` de la fila de sesión; la frescura del restablecimiento por inactividad usa `lastInteractionAt`. Las escrituras de eventos en segundo plano/sistema como latidos, activaciones de cron, notificaciones de exec y contabilidad de la puerta de enlace pueden actualizar `updatedAt`, pero no mantienen las sesiones diarias/inactivas frescas.
- **`resetByType`**: anulaciones por tipo (`direct`, `group`, `thread`). El `dm` heredado se acepta como alias para `direct`.
- **`mainKey`**: campo heredado. El tiempo de ejecución siempre usa `"main"` para el depósito de chat directo principal.
- **`agentToAgent.maxPingPongTurns`**: máximo de turnos de respuesta entre agentes durante los intercambios de agente a agente (entero, rango: `0`-`20`, predeterminado: `5`). `0` desactiva la encadenación de ping-pong.
- **`sendPolicy`**: coincidir por `channel`, `chatType` (`direct|group|channel`, con alias heredado `dm`), `keyPrefix`, o `rawKeyPrefix`. Primer denegado gana.
- **`maintenance`**: controles de limpieza + retención del almacén de sesiones.
  - `mode`: `warn` emite solo advertencias; `enforce` aplica la limpieza.
  - `pruneAfter`: límite de antigüedad para entradas obsoletas (predeterminado `30d`).
  - `maxEntries`: número máximo de entradas en `sessions.json` (predeterminado `500`). Las escrituras del tiempo de ejecución limpian por lotes con un pequeño búfer de marca de agua alta para límites de tamaño de producción; `openclaw sessions cleanup --enforce` aplica el límite inmediatamente.
  - `rotateBytes`: en desuso y se ignora; `openclaw doctor --fix` lo elimina de configuraciones antiguas.
  - `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>`. El valor predeterminado es `pruneAfter`; establezca `false` para desactivar.
  - `maxDiskBytes`: presupuesto de disco opcional del directorio de sesiones. En el modo `warn` registra advertencias; en el modo `enforce` elimina primero los artefactos/sesiones más antiguos.
  - `highWaterBytes`: objetivo opcional después de la limpieza del presupuesto. El valor predeterminado es `80%` de `maxDiskBytes`.
- **`threadBindings`**: valores predeterminados globales para funciones de sesión vinculadas a hilos.
  - `enabled`: interruptor predeterminado maestro (los proveedores pueden anular; Discord usa `channels.discord.threadBindings.enabled`)
  - `idleHours`: autoenfoque por inactividad predeterminado en horas (`0` desactiva; los proveedores pueden anular)
  - `maxAgeHours`: edad máxima dura predeterminada en horas (`0` desactiva; los proveedores pueden anular)
  - `spawnSessions`: puerta predeterminada para crear sesiones de trabajo vinculadas a hilos desde `sessions_spawn` y generaciones de hilos ACP. El valor predeterminado es `true` cuando los enlaces de hilo están activados; los proveedores/cuentas pueden anular.
  - `defaultSpawnContext`: contexto nativo predeterminado del subagente para generaciones vinculadas a hilos (`"fork"` o `"isolated"`). El valor predeterminado es `"fork"`.

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

Sobrescrituras por canal/cuenta: `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Resolución (gana el más específico): cuenta → canal → global. `""` deshabilita y detiene la cascada. `"auto"` deriva `[{identity.name}]`.

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

- Por defecto, el `identity.emoji` del agente activo; de lo contrario, `"👀"`. Establezca `""` para desactivar.
- Invalidaciones por canal: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Orden de resolución: cuenta → canal → `messages.ackReaction` → reserva de identidad.
- Ámbito: `group-mentions` (predeterminado), `group-all`, `direct`, `all`.
- `removeAckAfterReply`: elimina el acuse de recibo después de la respuesta en canales con capacidad de reacción, como Slack, Discord, Telegram, WhatsApp e iMessage.
- `messages.statusReactions.enabled`: habilita las reacciones de estado del ciclo de vida en Slack, Discord, Telegram y WhatsApp.
  En Slack y Discord, al dejarlo sin establecer, las reacciones de estado permanecen habilitadas cuando las reacciones de confirmación están activas.
  En Telegram y WhatsApp, establézcalo explícitamente en `true` para habilitar las reacciones de estado del ciclo de vida.
- `messages.statusReactions.emojis`: anula las claves de emoji de ciclo de vida:
  `queued`, `thinking`, `compacting`, `tool`, `coding`, `web`, `deploy`, `build`,
  `concierge`, `done`, `error`, `stallSoft`, y `stallHard`.
  Telegram solo permite un conjunto fijo de reacciones, por lo que los emoji configurados no compatibles vuelven
  a la variante de estado compatible más cercana para ese chat.

### Antirrebote de entrada

Agrupa mensajes rápidos de solo texto del mismo remitente en un solo turno de agente. Los medios/adjuntos se envían inmediatamente. Los comandos de control omiten el antirrebote.

### TTS (texto a voz)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-5.4-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          speakerVoiceId: "voice_id",
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
          speakerVoice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          speakerVoice: "alloy",
        },
      },
    },
  },
}
```

- `auto` controla el modo de auto-TTS predeterminado: `off`, `always`, `inbound`, o `tagged`. `/tts on|off` puede anular las preferencias locales, y `/tts status` muestra el estado efectivo.
- `summaryModel` anula `agents.defaults.model.primary` para el resumen automático.
- `modelOverrides` está habilitado de forma predeterminada; `modelOverrides.allowProvider` tiene como valor predeterminado `false` (opt-in).
- Las claves de API vuelven a `ELEVENLABS_API_KEY`/`XI_API_KEY` y `OPENAI_API_KEY`.
- Los proveedores de voz incluidos son propiedad de los complementos. Si se establece `plugins.allow`, incluya cada complemento de proveedor TTS que desee usar, por ejemplo `microsoft` para Edge TTS. El id de proveedor heredado `edge` se acepta como alias de `microsoft`.
- `providers.openai.baseUrl` anula el punto de conexión TTS de OpenAI. El orden de resolución es configuración, luego `OPENAI_TTS_BASE_URL`, luego `https://api.openai.com/v1`.
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
        speakerVoiceId: "elevenlabs_voice_id",
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
          speakerVoice: "cedar",
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

- `talk.provider` debe coincidir con una clave en `talk.providers` cuando hay varios proveedores de Talk configurados.
- Las claves planas heredadas de Talk (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) son solo para compatibilidad. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida en `talk.providers.<provider>`.
- Los IDs de voz vuelven a `ELEVENLABS_VOICE_ID` o `SAG_VOICE_ID`.
- `providers.*.apiKey` acepta cadenas de texto plano u objetos SecretRef.
- La alternativa de `ELEVENLABS_API_KEY` se aplica solo cuando no se ha configurado ninguna clave de API de Talk.
- `providers.*.voiceAliases` permite que las directivas de Talk usen nombres descriptivos.
- `providers.mlx.modelId` selecciona el repositorio de Hugging Face que usa el asistente local MLX de macOS. Si se omite, macOS usa `mlx-community/Soprano-80M-bf16`.
- La reproducción MLX de macOS se ejecuta a través del asistente `openclaw-mlx-tts` incluido cuando está presente, o un ejecutable en `PATH`; `OPENCLAW_MLX_TTS_BIN` anula la ruta del asistente para el desarrollo.
- `consultThinkingLevel` controla el nivel de pensamiento para la ejecución completa del agente OpenClaw detrás de las llamadas `openclaw_agent_consult` en tiempo real de Talk en Control UI. Déjelo sin configurar para preservar el comportamiento normal de la sesión/modelo.
- `consultFastMode` establece una anulación de modo rápido de un solo tiro para las consultas en tiempo real de Talk en Control UI sin cambiar la configuración normal de modo rápido de la sesión.
- `speechLocale` establece el ID de configuración regional BCP 47 que usa el reconocimiento de voz de Talk en iOS/macOS. Déjelo sin establecer para usar el valor predeterminado del dispositivo.
- `silenceTimeoutMs` controla cuánto tiempo espera el modo Talk después del silencio del usuario antes de enviar la transcripción. Sin establecer, mantiene la ventana de pausa predeterminada de la plataforma (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions` agrega instrucciones del sistema orientadas al proveedor al mensaje en tiempo real integrado de OpenClaw, para que el estilo de voz se pueda configurar sin perder la guía `openclaw_agent_consult` predeterminada.
- `realtime.consultRouting` controla la alternativa de retransmisión de Gateway cuando el proveedor en tiempo real produce una transcripción final del usuario sin `openclaw_agent_consult`: `provider-direct` conserva las respuestas directas del proveedor, mientras que `force-agent-consult` enruta la solicitud finalizada a través de OpenClaw.

---

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference) — todas las demás claves de configuración
- [Configuración](/es/gateway/configuration) — tareas comunes y configuración rápida
- [Ejemplos de configuración](/es/gateway/configuration-examples)

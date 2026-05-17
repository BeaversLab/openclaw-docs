---
summary: "Valores predeterminados de agente, enrutamiento multiagente, sesión, mensajes y configuración de conversación"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuración — agentes"
---

Claves de configuración con ámbito de agente bajo `agents.*`, `multiAgent.*`, `session.*`,
`messages.*` y `talk.*`. Para canales, herramientas, tiempo de ejecución de la pasarela y otras
claves de nivel superior, consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Valores predeterminados del agente

### `agents.defaults.workspace`

Predeterminado: `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

Raíz del repositorio opcional que se muestra en la línea de tiempo de ejecución del mensaje del sistema. Si no se establece, OpenClaw lo detecta automáticamente navegando hacia arriba desde el espacio de trabajo.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Lista de permitidos (allowlist) de habilidades predeterminada opcional para los agentes que no establecen
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

- Omita `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada.
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

Omite la creación de archivos opcionales seleccionados del espacio de trabajo mientras escribe los archivos de arranque requeridos. Valores válidos: `SOUL.md`, `USER.md`, `HEARTBEAT.md` y `IDENTITY.md`.

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

- `"continuation-skip"`: los turnos de continuación seguros (después de una respuesta completa del asistente) omiten la reinyección del arranque del espacio de trabajo, reduciendo el tamaño del mensaje. Las ejecuciones de latido y los reintentos posteriores a la compactación todavía reconstruyen el contexto.
- `"never"`: desactiva el arranque del espacio de trabajo y la inyección de archivos de contexto en cada turno. Use esto solo para agentes que poseen completamente su ciclo de vida del aviso (motores de contexto personalizados, tiempos de ejecución nativos que construyen su propio contexto o flujos de trabajo especializados sin arranque). Los turnos de latido y de recuperación de compactación también omiten la inyección.

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

Máximo de caracteres por archivo de arranque del espacio de trabajo antes del truncamiento. Predeterminado: `12000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

Máximo total de caracteres inyectados en todos los archivos de arranque del espacio de trabajo. Predeterminado: `60000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Controla el aviso del sistema del prompt visible para el agente cuando se trunca el contexto de arranque.
Predeterminado: `"once"`.

- `"off"`: nunca inyectar texto de aviso de truncamiento en el prompt del sistema.
- `"once"`: inyectar un aviso conciso una vez por firma de truncamiento única (recomendado).
- `"always"`: inyectar un aviso conciso en cada ejecución cuando existe truncamiento.

Los recuentos detallados brutos/inyectados y los campos de ajuste de configuración permanecen en diagnósticos como informes de contexto/estado y registros; el contexto de usuario/tiempo de ejecución de WebChat de rutina solo recibe el aviso conciso de recuperación.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### Mapa de propiedad del presupuesto de contexto

OpenClaw tiene múltiples presupuestos de alto volumen de prompts/contexto, y están intencionalmente divididos por subsistema en lugar de que todos fluyan a través de un control genérico.

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  inyección normal de arranque del espacio de trabajo.
- `agents.defaults.startupContext.*`:
  preámbulo de ejecución de modelo de restablecimiento/inicio de un solo disparo, incluidos los archivos `memory/*.md` diarios recientes. Los comandos `/new` y `/reset` de chat simple se reconocen sin invocar el modelo.
- `skills.limits.*`:
  la lista compacta de habilidades inyectada en el prompt del sistema.
- `agents.defaults.contextLimits.*`:
  extractos delimitados del tiempo de ejecución y bloques propiedad del tiempo de ejecución inyectados.
- `memory.qmd.limits.*`:
  fragmento de búsqueda de memoria indexado y tamaño de inyección.

Use la invalidación por agente correspondiente solo cuando un agente necesita un presupuesto diferente:

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

Controla el preludio de inicio del primer turno inyectado en ejecuciones de modelo de reinicio/inicio.
Los comandos de chat básicos `/new` y `/reset` reconocen el reinicio sin invocar
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

Valores predeterminados compartidos para superficies de contexto de tiempo de ejecución limitadas.

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

- `memoryGetMaxChars`: límite predeterminado de extracto de `memory_get` antes de que se agreguen
  metadatos y avisos de continuación por truncamiento.
- `memoryGetDefaultLines`: ventana de línea predeterminada de `memory_get` cuando se omite `lines`.
- `toolResultMaxChars`: límite de resultados de herramientas en vivo utilizado para resultados persistidos
  y recuperación de desbordamiento.
- `postCompactionMaxChars`: límite de extracto de AGENTS.md utilizado durante la inyección de actualización
  post-compacción.

#### `agents.list[].contextLimits`

Invalidación por agente para los controles compartidos `contextLimits`. Los campos omitidos heredan
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

Tamaño máximo de píxeles para el lado más largo de la imagen en bloques de imagen de transcripción/herramientas antes de las llamadas al proveedor.
Predeterminado: `1200`.

Los valores más bajos generalmente reducen el uso de tokens de visión y el tamaño de carga útil de la solicitud para ejecuciones con muchas capturas de pantalla.
Los valores más altos preservan más detalles visuales.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Zona horaria para el contexto del mensaje del sistema (no las marcas de tiempo de los mensajes). Se recurre a la zona horaria del host.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Formato de hora en el mensaje del sistema. Predeterminado: `auto` (preferencia del sistema operativo).

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
  - Lo utiliza la ruta de herramienta `image` como su configuración de modelo de visión.
  - También se utiliza como enrutamiento de reserva cuando el modelo predeterminado/seleccionado no puede aceptar entrada de imagen.
  - Se prefieren referencias `provider/model` explícitas. Se aceptan ID simples por compatibilidad; si un ID simple coincide únicamente con una entrada configurada con capacidad de imagen en `models.providers.*.models`, OpenClaw lo califica para ese proveedor. Las coincidencias configuradas ambiguas requieren un prefijo de proveedor explícito.
- `imageGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la capacidad de generación de imágenes compartida y cualquier superficie futura de herramienta/complemento que genere imágenes.
  - Valores típicos: `google/gemini-3.1-flash-image-preview` para la generación de imágenes nativa de Gemini, `fal/fal-ai/flux/dev` para fal, `openai/gpt-image-2` para OpenAI Images, o `openai/gpt-image-1.5` para salida PNG/WebP de OpenAI con fondo transparente.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación del proveedor correspondiente (por ejemplo, `GEMINI_API_KEY` o `GOOGLE_API_KEY` para `google/*`, `OPENAI_API_KEY` u OpenAI Codex OAuth para `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` para `fal/*`).
  - Si se omite, `image_generate` aún puede inferir un proveedor predeterminado con autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de imágenes registrados restantes en orden de ID de proveedor.
- `musicGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la capacidad de generación de música compartida y la herramienta integrada `music_generate`.
  - Valores típicos: `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` o `minimax/music-2.6`.
  - Si se omite, `music_generate` aún puede inferir un proveedor predeterminado con respaldo de autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de música registrados restantes en orden de id. de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor coincidente.
- `videoGenerationModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la capacidad compartida de generación de video y la herramienta integrada `video_generate`.
  - Valores típicos: `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash` o `qwen/wan2.7-r2v`.
  - Si se omite, `video_generate` aún puede inferir un proveedor predeterminado con respaldo de autenticación. Primero intenta el proveedor predeterminado actual y luego los proveedores de generación de video registrados restantes en orden de id. de proveedor.
  - Si selecciona un proveedor/modelo directamente, configure también la autenticación/clave de API del proveedor coincidente.
  - El proveedor de generación de video Qwen incluido admite hasta 1 video de salida, 1 imagen de entrada, 4 videos de entrada, una duración de 10 segundos y opciones a nivel de proveedor `size`, `aspectRatio`, `resolution`, `audio` y `watermark`.
- `pdfModel`: acepta una cadena (`"provider/model"`) o un objeto (`{ primary, fallbacks }`).
  - Lo utiliza la herramienta `pdf` para el enrutamiento de modelos.
  - Si se omite, la herramienta PDF recurre a `imageModel` y luego al modelo de sesión/predeterminado resuelto.
- `pdfMaxBytesMb`: límite de tamaño de PDF predeterminado para la herramienta `pdf` cuando no se pasa `maxBytesMb` en el momento de la llamada.
- `pdfMaxPages`: número máximo de páginas predeterminado consideradas por el modo de reserva de extracción en la herramienta `pdf`.
- `verboseDefault`: nivel detallado predeterminado para los agentes. Valores: `"off"`, `"on"`, `"full"`. Predeterminado: `"off"`.
- `toolProgressDetail`: modo de detalle para los resúmenes de herramientas `/verbose` y las líneas de herramientas de borrador de progreso. Valores: `"explain"` (predeterminado, etiquetas humanas compactas) o `"raw"` (agregar comando/detalle en bruto cuando esté disponible). El `agents.list[].toolProgressDetail` por agente anula este valor predeterminado.
- `reasoningDefault`: visibilidad predeterminada del razonamiento para los agentes. Valores: `"off"`, `"on"`, `"stream"`. El `agents.list[].reasoningDefault` por agente anula este valor predeterminado. Los valores predeterminados de razonamiento configurados solo se aplican para propietarios, remitentes autorizados o contextos de puerta de enlace de operador-administrador cuando no se ha establecido ninguna anulación de razonamiento por mensaje o sesión.
- `elevatedDefault`: nivel de salida elevado predeterminado para los agentes. Valores: `"off"`, `"on"`, `"ask"`, `"full"`. Predeterminado: `"on"`.
- `model.primary`: formato `provider/model` (p. ej., `openai/gpt-5.5` para clave de API de OpenAI o acceso OAuth de Codex). Si omite el proveedor, OpenClaw intenta primero un alias, luego una coincidencia única de proveedor configurado para esa identificación de modelo exacta, y solo luego recurre al proveedor predeterminado configurado (comportamiento de compatibilidad obsoleto, por lo que se prefiere un `provider/model` explícito). Si ese proveedor ya no expone el modelo predeterminado configurado, OpenClaw recurre al primer proveedor/modelo configurado en lugar de mostrar un valor predeterminado obsoleto de proveedor eliminado.
- `models`: el catálogo de modelos configurado y la lista de permitidos para `/model`. Cada entrada puede incluir `alias` (atajo) y `params` (específico del proveedor, por ejemplo `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Use entradas `provider/*` como `"openai-codex/*": {}` o `"vllm/*": {}` para mostrar todos los modelos descubiertos para los proveedores seleccionados sin listar manualmente cada id de modelo.
  - Ediciones seguras: use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` para agregar entradas. `config set` rechaza los reemplazos que eliminarían las entradas existentes en la lista de permitidos a menos que pase `--replace`.
  - Los flujos de configuración/integración con alcance de proveedor fusionan los modelos de proveedor seleccionados en este mapa y conservan los proveedores no relacionados ya configurados.
  - Para modelos de OpenAI Responses directos, la compactación del lado del servidor se habilita automáticamente. Use `params.responsesServerCompaction: false` para dejar de inyectar `context_management`, o `params.responsesCompactThreshold` para anular el umbral. Consulte [Compactación del lado del servidor de OpenAI](/es/providers/openai#server-side-compaction-responses-api).
- `params`: parámetros globales predeterminados del proveedor aplicados a todos los modelos. Establézcalo en `agents.defaults.params` (por ejemplo, `{ cacheRetention: "long" }`).
- Precedencia de fusión de `params` (configuración): `agents.defaults.params` (base global) se anula por `agents.defaults.models["provider/model"].params` (por modelo), luego `agents.list[].params` (id de agente coincidente) anula por clave. Consulte [Caché de indicaciones (Prompt Caching)](/es/reference/prompt-caching) para obtener detalles.
- `params.extra_body`/`params.extraBody`: JSON de paso avanzado fusionado en los cuerpos de las solicitudes `api: "openai-completions"` para proxies compatibles con OpenAI. Si colisiona con claves de solicitud generadas, gana el cuerpo adicional; las rutas de completions no nativas todavía eliminan `store` solo de OpenAI después.
- `params.chat_template_kwargs`: argumentos de plantilla de chat compatibles con vLLM/OpenAI fusionados en los cuerpos de solicitudes `api: "openai-completions"` de nivel superior. Para `vllm/nemotron-3-*` con el pensamiento desactivado, el complemento vLLM incluido automáticamente envía `enable_thinking: false` y `force_nonempty_content: true`; los `chat_template_kwargs` explícitos anulan los valores predeterminados generados, y `extra_body.chat_template_kwargs` todavía tiene precedencia final. Para los controles de pensamiento de vLLM Qwen, establezca `params.qwenThinkingFormat` en `"chat-template"` o `"top-level"` en esa entrada de modelo.
- `compat.thinkingFormat`: estilo de carga útil de pensamiento compatible con OpenAI. Use `"qwen"` para `enable_thinking` de nivel superior estilo Qwen, o `"qwen-chat-template"` para `chat_template_kwargs.enable_thinking` en backends de la familia Qwen que admiten kwargs de plantilla de chat a nivel de solicitud, como vLLM. OpenClaw asigna el pensamiento desactivado a `false` y el pensamiento activado a `true`.
- `compat.supportedReasoningEfforts`: lista de esfuerzo de razonamiento compatible con OpenAI por modelo. Incluya `"xhigh"` para puntos de conexión personalizados que realmente lo acepten; OpenClaw entonces expone `/think xhigh` en los menús de comandos, filas de sesión de Gateway, validación de parches de sesión, validación de CLI de agentes y validación `llm-task` para ese proveedor/modelo configurado. Use `compat.reasoningEffortMap` cuando el backend quiere un valor específico del proveedor para un nivel canónico.
- `params.preserveThinking`: opt-in exclusivo de Z.AI para el pensamiento preservado. Cuando está habilitado y el pensamiento está activo, OpenClaw envía `thinking.clear_thinking: false` y reproduce `reasoning_content` anteriores; consulte [Pensamiento de Z.AI y pensamiento preservado](/es/providers/zai#thinking-and-preserved-thinking).
- `localService`: administrador de procesos a nivel de proveedor opcional para servidores de modelos locales/autohospedados. Cuando el modelo seleccionado pertenece a ese proveedor, OpenClaw sondea `healthUrl` (o `baseUrl + "/models"`), inicia `command` con `args` si el punto de conexión está inactivo, espera hasta `readyTimeoutMs` y luego envía la solicitud del modelo. `command` debe ser una ruta absoluta. `idleStopMs: 0` mantiene el proceso vivo hasta que OpenClaw sale; un valor positivo detiene el proceso generado por OpenClaw después de esa cantidad de milisegundos inactivos. Consulte [Servicios de modelos locales](/es/gateway/local-model-services).
- La política de tiempo de ejecución pertenece a los proveedores o modelos, no a `agents.defaults`. Use `models.providers.<provider>.agentRuntime` para reglas de todo el proveedor o `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` para reglas específicas del modelo. Los modelos de agentes de OpenAI en el proveedor oficial de OpenAI seleccionan Codex de manera predeterminada.
- Los escritores de configuración que mutan estos campos (por ejemplo `/models set`, `/models set-image`, y comandos de agregar/eliminar respaldo) guardan el formulario de objeto canónico y preservan las listas de respaldo existentes cuando es posible.
- `maxConcurrent`: máx. de ejecuciones de agentes paralelas entre sesiones (cada sesión todavía serializada). Predeterminado: 4.

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
      },
    },
  },
}
```

- `id`: `"auto"`, `"pi"`, un id de arnés de plugin registrado, o un alias de backend CLI soportado. El plugin Codex incluido registra `codex`; el plugin Anthropic incluido proporciona el backend CLI `claude-cli`.
- `id: "auto"` permite a los arneses de plugins registrados reclamar turnos soportados y usa PI cuando ningún arnés coincide. Un tiempo de ejecución de plugin explícito como `id: "codex"` requiere ese arnés y falla de forma cerrada si no está disponible o falla.
- Las claves de tiempo de ejecución de todo el agente son heredadas. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, pines de tiempo de ejecución de sesión y `OPENCLAW_AGENT_RUNTIME` son ignorados por la selección de tiempo de ejecución. Ejecute `openclaw doctor --fix` para eliminar valores obsoletos.
- Los modelos de agentes de OpenAI usan el arnés Codex de manera predeterminada; `agentRuntime.id: "codex"` proveedor/modelo permanece válido cuando desea hacer esto explícito.
- Para los despliegues de CLI de Claude, prefiera `model: "anthropic/claude-opus-4-7"` más `agentRuntime.id: "claude-cli"` con ámbito de modelo. Las referencias de modelos `claude-cli/claude-opus-4-7` heredadas todavía funcionan por compatibilidad, pero la nueva configuración debe mantener la selección de proveedor/modelo canónica y poner el backend de ejecución en la política de tiempo de ejecución de proveedor/modelo.
- Esto solo controla la ejecución de turnos de agentes de texto. La generación de medios, visión, PDF, música, video y TTS todavía usan su configuración de proveedor/modelo.

**Alias abreviados integrados** (solo aplican cuando el modelo está en `agents.defaults.models`):

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

Los modelos Z.AI GLM-4.x activan automáticamente el modo de pensamiento a menos que establezca `--thinking off` o defina `agents.defaults.models["zai/<model>"].params.thinking` usted mismo.
Los modelos Z.AI activan `tool_stream` de forma predeterminada para la transmisión de llamadas a herramientas. Establezca `agents.defaults.models["zai/<model>"].params.tool_stream` en `false` para desactivarlo.
Los modelos Anthropic Claude 4.6 son predeterminados en pensamiento `adaptive` cuando no se establece ningún nivel de pensamiento explícito.

### `agents.defaults.cliBackends`

Backends de CLI opcionales para ejecuciones de reserva solo de texto (sin llamadas a herramientas). Útil como respaldo cuando fallan los proveedores de API.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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
- Sesiones compatibles cuando se establece `sessionArg`.
- Transferencia de imagen compatible cuando `imageArg` acepta rutas de archivo.
- `reseedFromRawTranscriptWhenUncompacted: true` permite que un backend recupere sesiones
  invalidadas seguras de una cola limitada de transcripciones sin procesar de OpenClaw antes de que
  exista el primer resumen de compactación. Los cambios en el perfil de autenticación o en la época de credenciales
  nunca se resembrarán en bruto.

### `agents.defaults.systemPromptOverride`

Reemplace todo el prompt del sistema ensamblado por OpenClaw con una cadena fija. Establézcalo en el nivel predeterminado (`agents.defaults.systemPromptOverride`) o por agente (`agents.list[].systemPromptOverride`). Los valores por agente tienen prioridad; se ignora un valor vacío o que contenga solo espacios en blanco. Útil para experimentos controlados de prompts.

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

Superposiciones de indicaciones (prompt overlays) independientes del proveedor aplicadas por familia de modelos. Los identificadores de modelos de la familia GPT-5 reciben el contrato de comportamiento compartido entre proveedores; `personality` controla solo la capa de estilo de interacción amigable.

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
- `"off"` desactiva solo la capa amigable; el contrato de comportamiento etiquetado de GPT-5 permanece activado.
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
        skipWhenBusy: false, // default: false; true also waits for subagent/nested lanes
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

- `every`: cadena de duración (ms/s/m/h). Predeterminado: `30m` (autenticación por clave de API) o `1h` (autenticación OAuth). Establezca en `0m` para desactivar.
- `includeSystemPromptSection`: cuando es false, omite la sección Heartbeat del indicador del sistema (system prompt) y salta la inyección de `HEARTBEAT.md` en el contexto de arranque. Predeterminado: `true`.
- `suppressToolErrorWarnings`: cuando es true, suprime las cargas útiles de advertencia de errores de herramientas durante las ejecuciones de latido.
- `timeoutSeconds`: tiempo máximo en segundos permitido para un turno de agente de latido antes de que se aborte. Déjelo sin establecer para usar `agents.defaults.timeoutSeconds`.
- `directPolicy`: política de entrega directa/DM. `allow` (predeterminado) permite la entrega a objetivo directo. `block` suprime la entrega a objetivo directo y emite `reason=dm-blocked`.
- `lightContext`: cuando es true, las ejecuciones de latido usan un contexto de arranque ligero y mantienen solo `HEARTBEAT.md` de los archivos de arranque del espacio de trabajo.
- `isolatedSession`: cuando es true, cada latido se ejecuta en una sesión nueva sin historial de conversación previo. Mismo patrón de aislamiento que cron `sessionTarget: "isolated"`. Reduce el costo de tokens por latido de ~100K a ~2-5K tokens.
- `skipWhenBusy`: cuando es true, las ejecuciones de latido se difieren en carriles额外 ocupados: trabajo de subagente o comandos anidados. Los carriles de cron siempre difieren los latidos, incluso sin esta marca.
- Por agente: establezca `agents.list[].heartbeat`. Cuando cualquier agente define `heartbeat`, **solo esos agentes** ejecutan latidos.
- Los latidos ejecutan turnos completos del agente: intervalos más cortos consumen más tokens.

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
- `provider`: id de un plugin proveedor de compactación registrado. Cuando se establece, se invoca el `summarize()` del proveedor en lugar del resumen LLM integrado. Ante fallos, vuelve al sistema integrado. Establecer un proveedor fuerza `mode: "safeguard"`. Consulte [Compaction](/es/concepts/compaction).
- `timeoutSeconds`: segundos máximos permitidos para una sola operación de compactación antes de que OpenClaw la aborte. Predeterminado: `900`.
- `keepRecentTokens`: presupuesto de punto de corte Pi para mantener la cola de la transcripción más reciente textualmente. La `/compact` manual respeta esto cuando se establece explícitamente; de lo contrario, la compactación manual es un punto de control fijo.
- `identifierPolicy`: `strict` (predeterminado), `off` o `custom`. `strict` antepone orientación de retención de identificadores opacos integrada durante la compactación del resumen.
- `identifierInstructions`: texto personalizado opcional de preservación de identificadores que se usa cuando `identifierPolicy=custom`.
- `qualityGuard`: reintentar-si-salida-incorrecta verifica resúmenes de salvaguarda. Habilitado de forma predeterminada en modo salvaguarda; establezca `enabled: false` para omitir la auditoría.
- `midTurnPrecheck`: verificación de presión opcional del bucle de herramientas Pi. Cuando es `enabled: true`, OpenClaw verifica la presión del contexto después de que se anexan los resultados de las herramientas y antes de la siguiente llamada al modelo. Si el contexto ya no cabe, aborta el intento actual antes de enviar el prompt y reutiliza la ruta de recuperación de preverificación existente para truncar los resultados de las herramientas o compactar y reintentar. Funciona con los modos de compactación `default` y `safeguard`. Predeterminado: deshabilitado.
- `postCompactionSections`: nombres de sección H2/H3 opcionales de AGENTS.md para reinyectar después de la compactación. El valor predeterminado es `["Session Startup", "Red Lines"]`; establezca `[]` para deshabilitar la reinyección. Cuando no está configurado o se establece explícitamente en ese par predeterminado, también se aceptan los encabezados `Every Session`/`Safety` anteriores como reserva heredada.
- `model`: sobrescritura opcional de `provider/model-id` solo para el resumen de compactación. Use esto cuando la sesión principal debe mantener un modelo pero los resúmenes de compactación deben ejecutarse en otro; cuando no está configurado, la compactación usa el modelo principal de la sesión.
- `maxActiveTranscriptBytes`: umbral de bytes opcional (`number` o cadenas como `"20mb"`) que activa la compactación local normal antes de una ejecución cuando el JSONL activo crece más allá del umbral. Requiere `truncateAfterCompaction` para que la compactación exitosa pueda rotar a una transcripción sucesora más pequeña. Deshabilitado cuando no está configurado o es `0`.
- `notifyUser`: cuando es `true`, envía breves avisos al usuario cuando comienza la compactación y cuando se completa (por ejemplo, "Compactando contexto..." y "Compactación completada"). Deshabilitado de forma predeterminada para mantener la compactación silenciosa.
- `memoryFlush`: turno agente silencioso antes de la auto-compactación para almacenar recuerdos duraderos. Establezca `model` en un proveedor/modelo exacto como `ollama/qwen3:8b` cuando este turno de mantenimiento debe permanecer en un modelo local; la sobrescritura no hereda la cadena de reserva de la sesión activa. Se omite cuando el espacio de trabajo es de solo lectura.

### `agents.defaults.contextPruning`

Elimina **los antiguos resultados de herramientas** del contexto en memoria antes de enviarlos al LLM. **No** modifica el historial de sesiones en el disco.

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
- `ttl` controla la frecuencia con la que se puede volver a ejecutar la poda (después del último toque al caché).
- La poda recorta suavemente primero los resultados de herramientas sobredimensionados y luego borra por completo los resultados de herramientas más antiguos si es necesario.

**Soft-trim** (recorte suave) mantiene el principio + el final e inserta `...` en el medio.

**Hard-clear** (borrado completo) reemplaza el resultado de la herramienta completa con el marcador de posición.

Notas:

- Los bloques de imagen nunca se recortan/borran.
- Las proporciones se basan en caracteres (aproximadas), no en recuentos exactos de tokens.
- Si existen menos de `keepLastAssistants` mensajes del asistente, se omite la poda.

</Accordion>

Consulte [Poda de sesiones](/es/concepts/session-pruning) para conocer los detalles del comportamiento.

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

- Los canales que no sean Telegram requieren `*.blockStreaming: true` explícito para habilitar las respuestas en bloque.
- Anulaciones de canal: `channels.<channel>.blockStreamingCoalesce` (y variantes por cuenta). Signal/Slack/Discord/Google Chat predeterminado `minChars: 1500`.
- `humanDelay`: pausa aleatoria entre respuestas en bloque. `natural` = 800–2500ms. Anulación por agente: `agents.list[].humanDelay`.

Consulte [Transmisión](/es/concepts/streaming) para conocer los detalles del comportamiento y la fragmentación.

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

- Predeterminados: `instant` para chats directos/menciones, `message` para chats grupales sin mención.
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

- `docker`: tiempo de ejecución de Docker local (predeterminado)
- `ssh`: tiempo de ejecución remoto genérico respaldado por SSH
- `openshell`: tiempo de ejecución de OpenShell

Cuando se selecciona `backend: "openshell"`, la configuración específica del tiempo de ejecución se mueve a
`plugins.entries.openshell.config`.

**Configuración del backend SSH:**

- `target`: destino SSH en formato `user@host[:port]`
- `command`: comando del cliente SSH (predeterminado: `ssh`)
- `workspaceRoot`: raíz remota absoluta utilizada para espacios de trabajo por ámbito
- `identityFile` / `certificateFile` / `knownHostsFile`: archivos locales existentes pasados a OpenSSH
- `identityData` / `certificateData` / `knownHostsData`: contenido en línea o SecretRefs que OpenClaw materializa en archivos temporales en tiempo de ejecución
- `strictHostKeyChecking` / `updateHostKeys`: controles de política de clave de host de OpenSSH

**Precedencia de autenticación SSH:**

- `identityData` tiene prioridad sobre `identityFile`
- `certificateData` tiene prioridad sobre `certificateFile`
- `knownHostsData` tiene prioridad sobre `knownHostsFile`
- Los valores `*Data` respaldados por SecretRef se resuelven desde la instantánea del tiempo de ejecución de secretos activos antes de que comience la sesión del sandbox

**Comportamiento del backend SSH:**

- siembra el espacio de trabajo remoto una vez después de crear o recrear
- luego mantiene el espacio de trabajo SSH remoto como canónico
- enruta `exec`, herramientas de archivos y rutas de medios a través de SSH
- no sincroniza los cambios remotos con el host automáticamente
- no admite contenedores del navegador sandbox

**Acceso al espacio de trabajo:**

- `none`: espacio de trabajo sandbox por ámbito bajo `~/.openclaw/sandboxes`
- `ro`: espacio de trabajo sandbox en `/workspace`, espacio de trabajo del agente montado como de solo lectura en `/agent`
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

- `mirror`: sembrar remoto desde local antes de ejecutar, sincronizar de vuelta después de ejecutar; el espacio de trabajo local se mantiene canónico
- `remote`: sembrar remoto una vez cuando se crea el sandbox, luego mantener el espacio de trabajo remoto canónico

En el modo `remote`, las ediciones locales del host realizadas fuera de OpenClaw no se sincronizan en el sandbox automáticamente después del paso de siembra.
El transporte es SSH hacia el sandbox OpenShell, pero el complemento posee el ciclo de vida del sandbox y la sincronización opcional del espejo.

**`setupCommand`** se ejecuta una vez después de la creación del contenedor (a través de `sh -lc`). Necesita salida de red, raíz grabable, usuario root.

**Los contenedores usan por defecto `network: "none"`** — establézcalo en `"bridge"` (o una red de puente personalizada) si el agente necesita acceso de salida.
`"host"` está bloqueado. `"container:<id>"` está bloqueado de forma predeterminada a menos que establezca explícitamente
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (romper cristal).

**Los archivos adjuntos entrantes** se preparan en `media/inbound/*` en el espacio de trabajo activo.

**`docker.binds`** monta directorios de host adicionales; los enlaces globales y por agente se combinan.

**Navegador en sandbox** (`sandbox.browser.enabled`): Chromium + CDP en un contenedor. URL noVNC inyectada en el prompt del sistema. No requiere `browser.enabled` en `openclaw.json`.
El acceso del observador noVNC utiliza autenticación VNC de forma predeterminada y OpenClaw emite una URL de token de corta duración (en lugar de exponer la contraseña en la URL compartida).

- `allowHostControl: false` (predeterminado) bloquea las sesiones en sandbox para que no apunten al navegador del host.
- `network` usa por defecto `openclaw-sandbox-browser` (red de puente dedicada). Establézcalo en `bridge` solo cuando desee explícitamente la conectividad de puente global.
- `cdpSourceRange` opcionalmente restringe el ingreso CDP en el borde del contenedor a un rango CIDR (por ejemplo `172.21.0.1/32`).
- `sandbox.browser.binds` monta directorios de host adicionales solo en el contenedor del navegador sandbox. Cuando se establece (incluyendo `[]`), reemplaza `docker.binds` para el contenedor del navegador.
- Los valores predeterminados de lanzamiento se definen en `scripts/sandbox-browser-entrypoint.sh` y se ajustan para hosts de contenedores:
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
  - `--disable-extensions` (habilitado por defecto)
  - `--disable-3d-apis`, `--disable-software-rasterizer` y `--disable-gpu` están
    habilitados por defecto y se pueden desactivar con
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si el uso de WebGL/3D lo requiere.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` vuelve a habilitar las extensiones si su flujo de trabajo
    depende de ellas.
  - `--renderer-process-limit=2` se puede cambiar con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>`; establezca `0` para usar el límite de
    procesos predeterminado de Chromium.
  - más `--no-sandbox` cuando `noSandbox` está habilitado.
  - Los valores predeterminados son la línea base de la imagen del contenedor; use una imagen de navegador personalizada con un
    punto de entrada personalizado para cambiar los valores predeterminados del contenedor.

</Accordion>

El aislamiento del navegador y `sandbox.docker.binds` son exclusivos de Docker.

Construir imágenes (desde una fuente obtenida):

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

Para instalaciones de npm sin una fuente obtenida, consulte [Sandboxing § Images and setup](/es/gateway/sandboxing#images-and-setup) para los comandos `docker build` en línea.

### `agents.list` (anulaciones por agente)

Use `agents.list[].tts` para darle a un agente su propio proveedor de TTS, voz, modelo, estilo o modo de TTS automático. El bloque del agente se fusiona profundamente con `messages.tts` global, por lo que las credenciales compartidas pueden permanecer en un solo lugar mientras que los agentes individuales anulan solo los campos de voz o proveedor que necesitan. La anulación del agente activo se aplica a las respuestas habladas automáticas, `/tts audio`, `/tts status` y la herramienta de agente `tts`. Consulte [Text-to-speech](/es/tools/tts#per-agent-voice-overrides) para ver ejemplos de proveedores y precedencia.

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

- `id`: id de agente estable (obligatorio).
- `default`: cuando se establecen varios, gana el primero (se registra una advertencia). Si no se establece ninguno, la primera entrada de la lista es la predeterminada.
- `model`: la forma de cadena establece un principal estricto por agente sin reserva de modelo; la forma de objeto `{ primary }` también es estricta a menos que agregue `fallbacks`. Use `{ primary, fallbacks: [...] }` para que ese agente acepte la reserva, o `{ primary, fallbacks: [] }` para hacer explícito el comportamiento estricto. Los trabajos cron que solo anulan `primary` aún heredan las reservas predeterminadas a menos que establezca `fallbacks: []`.
- `params`: parámetros de flujo por agente fusionados sobre la entrada del modelo seleccionado en `agents.defaults.models`. Úselo para anulaciones específicas del agente como `cacheRetention`, `temperature` o `maxTokens` sin duplicar todo el catálogo de modelos.
- `tts`: anulaciones opcionales de texto a voz por agente. El bloque se fusiona profundamente sobre `messages.tts`, por lo que debe mantener las credenciales compartidas del proveedor y la política de reserva en `messages.tts` y establecer aquí solo los valores específicos de la personalidad, como el proveedor, la voz, el modelo, el estilo o el modo automático.
- `skills`: lista de permisos de habilidades opcional por agente. Si se omite, el agente hereda `agents.defaults.skills` cuando está configurado; una lista explícita reemplaza los valores predeterminados en lugar de fusionarlos, y `[]` significa que no hay habilidades.
- `thinkingDefault`: nivel de pensamiento predeterminado opcional por agente (`off | minimal | low | medium | high | xhigh | adaptive | max`). Anula `agents.defaults.thinkingDefault` para este agente cuando no se establece ninguna anulación por mensaje o sesión. El perfil de proveedor/modelo seleccionado controla qué valores son válidos; para Google Gemini, `adaptive` mantiene el pensamiento dinámico propiedad del proveedor (`thinkingLevel` omitido en Gemini 3/3.1, `thinkingBudget: -1` en Gemini 2.5).
- `reasoningDefault`: visibilidad de razonamiento predeterminada opcional por agente (`on | off | stream`). Anula `agents.defaults.reasoningDefault` para este agente cuando no se establece ninguna anulación de razonamiento por mensaje o sesión.
- `fastModeDefault`: valor predeterminado opcional por agente para el modo rápido (`true | false`). Se aplica cuando no se establece ninguna anulación de modo rápido por mensaje o sesión.
- `models`: anulaciones opcionales de catálogo de modelos/tiempo de ejecución por agente, clave por ids completos de `provider/model`. Use `models["provider/model"].agentRuntime` para excepciones de tiempo de ejecución por agente.
- `runtime`: descriptor de tiempo de ejecución opcional por agente. Use `type: "acp"` con los valores predeterminados de `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) cuando el agente deba usar por defecto sesiones de arnés ACP.
- `identity.avatar`: ruta relativa al espacio de trabajo, URL de `http(s)` o URI de `data:`.
- `identity` deriva los valores predeterminados: `ackReaction` de `emoji`, `mentionPatterns` de `name`/`emoji`.
- `subagents.allowAgents`: lista blanca de identificadores de agentes para destinos `sessions_spawn.agentId` explícitos (`["*"]` = cualquiera; predeterminado: solo el mismo agente). Incluya el identificador del solicitante cuando se deban permitir llamadas `agentId` dirigidas a sí mismo.
- Protector de herencia del sandbox: si la sesión del solicitante está en sandbox, `sessions_spawn` rechaza los destinos que se ejecutarían sin sandbox.
- `subagents.requireAgentId`: cuando es true, bloquea las llamadas `sessions_spawn` que omiten `agentId` (fuerza la selección explícita de perfil; predeterminado: false).

---

## Enrutamiento multiagente

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

### Campos de coincidencia de enlaces

- `type` (opcional): `route` para el enrutamiento normal (el tipo faltante predetermina a route), `acp` para enlaces de conversación ACP persistentes.
- `match.channel` (requerido)
- `match.accountId` (opcional; `*` = cualquier cuenta; omitido = cuenta predeterminada)
- `match.peer` (opcional; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (opcional; específico del canal)
- `acp` (opcional; solo para `type: "acp"`): `{ mode, label, cwd, backend }`

**Orden de coincidencia determinista:**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exacto, sin peer/guild/team)
5. `match.accountId: "*"` (todo el canal)
6. Agente predeterminado

Dentro de cada nivel, gana la primera entrada `bindings` coincidente.

Para las entradas de `type: "acp"`, OpenClaw se resuelve por la identidad exacta de la conversación (`match.channel` + cuenta + `match.peer.id`) y no utiliza el orden de nivel de enlace de ruta anterior.

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

- **`scope`**: estrategia de agrupación de sesiones base para contextos de chat en grupo.
  - `per-sender` (predeterminado): cada remitente obtiene una sesión aislada dentro de un contexto de canal.
  - `global`: todos los participantes en un contexto de canal comparten una sola sesión (usar solo cuando se pretenda un contexto compartido).
- **`dmScope`**: cómo se agrupan los mensajes directos.
  - `main`: todos los mensajes directos comparten la sesión principal.
  - `per-peer`: aislar por id de remitente a través de canales.
  - `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
  - `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para multicuenta).
- **`identityLinks`**: asignar ids canónicos a pares con prefijo de proveedor para compartir sesiones entre canales. Los comandos de acoplamiento como `/dock_discord` usan el mismo mapa para cambiar la ruta de respuesta de la sesión activa a otro par de canal vinculado; consulte [Acoplamiento de canales](/es/concepts/channel-docking).
- **`reset`**: política de restablecimiento principal. `daily` restablece a la `atHour` hora local; `idle` restablece después de `idleMinutes`. Cuando ambos están configurados, gana el que expire primero. La frescura del restablecimiento diario usa `sessionStartedAt` de la fila de sesión; la frescura del restablecimiento por inactividad usa `lastInteractionAt`. Las escrituras de eventos en segundo plano/sistema como latido, activaciones de cron, notificaciones de exec y contabilidad de gateway pueden actualizar `updatedAt`, pero no mantienen frescas las sesiones diarias/inactivas.
- **`resetByType`**: anulaciones por tipo (`direct`, `group`, `thread`). Se acepta `dm` heredado como alias para `direct`.
- **`mainKey`**: campo heredado. El tiempo de ejecución siempre usa `"main"` para el depósito principal de chat directo.
- **`agentToAgent.maxPingPongTurns`**: máximo de turnos de respuesta entre agentes durante los intercambios de agente a agente (entero, rango: `0`-`20`, predeterminado: `5`). `0` desactiva la encadenación ping-pong.
- **`sendPolicy`**: coincidir por `channel`, `chatType` (`direct|group|channel`, con alias heredado `dm`), `keyPrefix`, o `rawKeyPrefix`. La primera denegación gana.
- **`maintenance`**: controles de limpieza + retención del almacén de sesiones.
  - `mode`: `warn` emite solo advertencias; `enforce` aplica la limpieza.
  - `pruneAfter`: límite de antigüedad para entradas obsoletas (predeterminado `30d`).
  - `maxEntries`: número máximo de entradas en `sessions.json` (predeterminado `500`). Las escrituras del tiempo de ejecución limpian por lotes con un pequeño búfer de nivel alto alto para límites de tamaño de producción; `openclaw sessions cleanup --enforce` aplica el límite inmediatamente.
  - `rotateBytes`: obsoleto e ignorado; `openclaw doctor --fix` lo elimina de configuraciones antiguas.
  - `resetArchiveRetention`: retención para archivos de transcripciones `*.reset.<timestamp>`. El valor predeterminado es `pruneAfter`; establezca `false` para desactivar.
  - `maxDiskBytes`: presupuesto de disco opcional del directorio de sesiones. En modo `warn` registra advertencias; en modo `enforce` elimina primero los artefactos/sesiones más antiguos.
  - `highWaterBytes`: objetivo opcional después de la limpieza del presupuesto. El valor predeterminado es `80%` de `maxDiskBytes`.
- **`threadBindings`**: valores predeterminados globales para características de sesión vinculadas a hilos.
  - `enabled`: interruptor predeterminado maestro (los proveedores pueden anular; Discord usa `channels.discord.threadBindings.enabled`)
  - `idleHours`: inactividad predeterminada para desenfoque automático en horas (`0` desactiva; los proveedores pueden anular)
  - `maxAgeHours`: edad máxima estricta predeterminada en horas (`0` desactiva; los proveedores pueden anular)
  - `spawnSessions`: puerta predeterminada para crear sesiones de trabajo vinculadas a hilos desde `sessions_spawn` y generaciones de hilos ACP. El valor predeterminado es `true` cuando los enlaces de hilo están activados; proveedores/cuentas pueden anular.
  - `defaultSpawnContext`: contexto de subagente nativo predeterminado para generaciones vinculadas a hilos (`"fork"` o `"isolated"`). El valor predeterminado es `"fork"`.

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
      mode: "steer", // steer | queue (legacy one-at-a-time) | followup | collect | steer-backlog | steer+backlog | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "steer",
        telegram: "steer",
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

Las variables no distinguen entre mayúsculas y minúsculas. `{think}` es un alias para `{thinkingLevel}`.

### Reacción de acuse de recibo

- Por defecto es el `identity.emoji` del agente activo, de lo contrario `"👀"`. Establezca `""` para deshabilitar.
- Sobrescrituras por canal: `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Orden de resolución: cuenta → canal → `messages.ackReaction` → alternativa de identidad.
- Ámbito: `group-mentions` (predeterminado), `group-all`, `direct`, `all`.
- `removeAckAfterReply`: elimina el acuse de recibo después de la respuesta en canales con capacidad de reacción como Slack, Discord, Telegram, WhatsApp e iMessage.
- `messages.statusReactions.enabled`: habilita las reacciones de estado del ciclo de vida en Slack, Discord y Telegram.
  En Slack y Discord, sin establecer mantiene las reacciones de estado habilitadas cuando las reacciones de acuse de recibo están activas.
  En Telegram, establézcalo explícitamente en `true` para habilitar las reacciones de estado del ciclo de vida.

### Antirrebote de entrada

Agrupa mensajes rápidos de solo texto del mismo remitente en un solo turno de agente. Los medios/archivos adjuntos se envían inmediatamente. Los comandos de control omiten el antirrebote.

### TTS (conversión de texto a voz)

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

- `auto` controla el modo de TTS automático predeterminado: `off`, `always`, `inbound` o `tagged`. `/tts on|off` puede anular las preferencias locales y `/tts status` muestra el estado efectivo.
- `summaryModel` anula `agents.defaults.model.primary` para el resumen automático.
- `modelOverrides` está habilitado de forma predeterminada; `modelOverrides.allowProvider` tiene como valor predeterminado `false` (opcional).
- Las claves de API vuelven a `ELEVENLABS_API_KEY`/`XI_API_KEY` y `OPENAI_API_KEY`.
- Los proveedores de voz incluidos son propiedad del complemento. Si `plugins.allow` está configurado, incluya cada complemento de proveedor de TTS que desee usar, por ejemplo `microsoft` para Edge TTS. El ID de proveedor heredado `edge` se acepta como alias de `microsoft`.
- `providers.openai.baseUrl` anula el punto de conexión de TTS de OpenAI. El orden de resolución es configuración, luego `OPENAI_TTS_BASE_URL`, luego `https://api.openai.com/v1`.
- Cuando `providers.openai.baseUrl` apunta a un punto de conexión que no es de OpenAI, OpenClaw lo trata como un servidor TTS compatible con OpenAI y relaja la validación de modelo/voz.

---

## Hablar

Valores predeterminados para el modo Hablar (macOS/iOS/Android).

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

- `talk.provider` debe coincidir con una clave en `talk.providers` cuando hay varios proveedores de Talk configurados.
- Las claves planas heredadas de Talk (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) son solo de compatibilidad. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida en `talk.providers.<provider>`.
- Los ID de voz vuelven a `ELEVENLABS_VOICE_ID` o `SAG_VOICE_ID`.
- `providers.*.apiKey` acepta cadenas de texto sin formato u objetos SecretRef.
- La alternativa a `ELEVENLABS_API_KEY` se aplica solo cuando no se ha configurado ninguna clave de API de Talk.
- `providers.*.voiceAliases` permite que las directivas de Talk usen nombres descriptivos.
- `providers.mlx.modelId` selecciona el repositorio de Hugging Face utilizado por el asistente local de MLX en macOS. Si se omite, macOS usa `mlx-community/Soprano-80M-bf16`.
- La reproducción de MLX en macOS se ejecuta a través del asistente incluido `openclaw-mlx-tts` cuando está presente, o un ejecutable en `PATH`; `OPENCLAW_MLX_TTS_BIN` anula la ruta del asistente para el desarrollo.
- `consultThinkingLevel``openclaw_agent_consult` controla el nivel de pensamiento para la ejecución completa del agente OpenClaw detrás de las llamadas en tiempo real de Talk en la Control UI. Deje sin establecer para preservar el comportamiento normal de la sesión/modelo.
- `consultFastMode` establece una anulación de modo rápido de un solo disparo para las consultas en tiempo real de Talk en la Control UI sin cambiar la configuración normal de modo rápido de la sesión.
- `speechLocale` establece el identificador de configuración regional BCP 47 utilizado por el reconocimiento de voz de Talk en iOS/macOS. Deje sin establecer para usar el predeterminado del dispositivo.
- `silenceTimeoutMs` controla cuánto tiempo espera el modo Talk después del silencio del usuario antes de enviar la transcripción. Sin establecer mantiene la ventana de pausa predeterminada de la plataforma (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions` añade instrucciones del sistema orientadas al proveedor al mensaje en tiempo real incorporado de OpenClaw, para que el estilo de voz se pueda configurar sin perder la orientación predeterminada de `openclaw_agent_consult`.

---

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference) — todas las demás claves de configuración
- [Configuración](/es/gateway/configuration) — tareas comunes y configuración rápida
- [Ejemplos de configuración](/es/gateway/configuration-examples)

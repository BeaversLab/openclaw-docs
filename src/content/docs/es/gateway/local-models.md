---
summary: "Ejecutar OpenClaw en LLM locales (LM Studio, vLLM, LiteLLM, puntos de conexión personalizados de OpenAI)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modelos locales"
---

Lo local es viable, pero OpenClaw espera un contexto grande + defensas sólidas contra la inyección de prompts. Las tarjetas pequeñas truncan el contexto y filtran la seguridad. Apunta alto: **≥2 Mac Studios al máximo o un equipo GPU equivalente (~$30k+)**. Una sola **GPU de 24 GB** solo funciona para prompts más ligeros con mayor latencia. Usa la **variante de modelo más grande / de tamaño completo que puedas ejecutar**; los puntos de control cuantificados de forma agresiva o los modelos "pequeños" aumentan el riesgo de inyección de prompts (consulta [Seguridad](/es/gateway/security)).

Si deseas la configuración local con menos fricción, comienza con [LM Studio](/es/providers/lmstudio) u [Ollama](/es/providers/ollama) y `openclaw onboard`. Esta página es la guía con opiniones para pilas locales de gama alta y servidores locales compatibles con OpenAI personalizados.

<Warning>
  **Usuarios de WSL2 + Ollama + NVIDIA/CUDA:** El instalador oficial de Ollama para Linux habilita un servicio systemd con `Restart=always`. En configuraciones de GPU con WSL2, el inicio automático puede recargar el último modelo durante el arranque y anclar la memoria del host. Si tu máquina virtual WSL2 se reinicia repetidamente después de habilitar Ollama, consulta [bucle de bloqueo de
  WSL2](/es/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recomendado: LM Studio + modelo local grande (Responses API)

La mejor pila local actual. Carga un modelo grande en LM Studio (por ejemplo, una compilación Qwen, DeepSeek o Llama de tamaño completo), habilita el servidor local (predeterminado `http://127.0.0.1:1234`) y usa la API de Respuestas para mantener el razonamiento separado del texto final.

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "Local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**Lista de verificación de configuración**

- Instala LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- En LM Studio, descarga la **compilación de modelo más grande disponible** (evita las variantes "pequeñas"/muy cuantificadas), inicia el servidor, confirma que `http://127.0.0.1:1234/v1/models` lo enumera.
- Reemplaza `my-local-model` con el ID de modelo real que se muestra en LM Studio.
- Mantén el modelo cargado; la carga en frío añade latencia de inicio.
- Ajusta `contextWindow`/`maxTokens` si tu compilación de LM Studio es diferente.
- Para WhatsApp, mantente en Responses API para que solo se envíe el texto final.

Mantén los modelos alojados configurados incluso cuando se ejecuten localmente; usa `models.mode: "merge"` para que las alternativas de respaldo permanezcan disponibles.

### Configuración híbrida: alojado principal, respaldo local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### Local primero con red de seguridad alojada

Intercambie el orden principal y de respaldo; mantenga el mismo bloque de proveedores y `models.mode: "merge"` para que pueda recurrir a Sonnet u Opus cuando el cuadro local esté caído.

### Alojamiento regional / enrutamiento de datos

- Las variantes alojadas de MiniMax/Kimi/GLM también existen en OpenRouter con puntos finales anclados a regiones (por ejemplo, alojados en EE. UU.). Elija la variante regional allí para mantener el tráfico en su jurisdicción elegida mientras sigue usando `models.mode: "merge"` para respaldos de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más sólida; el enrutamiento regional alojado es el término medio cuando necesitas funciones del proveedor pero quieres controlar el flujo de datos.

## Otros servidores proxy locales compatibles con OpenAI

MLX (`mlx_lm.server`), vLLM, SGLang, LiteLLM, OAI-proxy o puertas de enlace personalizadas funcionan si exponen un punto final estilo OpenAI `/v1/chat/completions`. Use el adaptador de Chat Completions a menos que el backend documente explícitamente el soporte `/v1/responses`. Reemplace el bloque de proveedor anterior con su punto final e ID de modelo:

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Si se omite `api` en un proveedor personalizado con un `baseUrl`, OpenClaw usa por defecto `openai-completions`. Los puntos finales de bucle invertido como `127.0.0.1` son de confianza automática; los puntos finales LAN, tailnet y DNS privados aún necesitan `request.allowPrivateNetwork: true`.

El valor de `models.providers.<id>.models[].id` es local del proveedor. No incluya el prefijo del proveedor allí. Por ejemplo, un servidor MLX iniciado con `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` debería usar este ID de catálogo y referencia de modelo:

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Mantenga `models.mode: "merge"` para que los modelos alojados permanezcan disponibles como respaldos. Use `models.providers.<id>.timeoutSeconds` para servidores de modelos locales o remotos lentos antes de generar `agents.defaults.timeoutSeconds`. El tiempo de espera del proveedor se aplica solo a las solicitudes HTTP del modelo, incluyendo conexión, encabezados, transmisión del cuerpo y la cancelación total de la búsqueda protegida.

<Note>
  Para proveedores personalizados compatibles con OpenAI, se acepta persistir un marcador local no secreto como `apiKey: "ollama-local"` cuando `baseUrl` se resuelve a bucle invertido, una LAN privada, `.local` o un nombre de host simple. OpenClaw lo trata como una credencial local válida en lugar de informar una clave faltante. Use un valor real para cualquier proveedor que acepte un nombre de
  host público.
</Note>

Nota de comportamiento para backends locales/proxied `/v1`:

- OpenClaw trata estas como rutas compatibles con OpenAI estilo proxy, no como
  endpoints nativos de OpenAI
- la configuración de solicitudes nativa solo de OpenAI no se aplica aquí: sin
  `service_tier`, sin Responses `store`, sin configuración de carga
  compatible con el razonamiento de OpenAI
  y sin sugerencias de caché de mensajes
- los encabezados ocultos de atribución de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en estas URL de proxy personalizadas

Notas de compatibilidad para backends compatibles con OpenAI más estrictos:

- Algunos servidores aceptan solo cadena `messages[].content` en Completaciones de Chat, no
  matrices de partes de contenido estructuradas. Establezca
  `models.providers.<provider>.models[].compat.requiresStringContent: true` para
  esos endpoints.
- Algunos modelos locales emiten solicitudes de herramientas entre corchetes independientes como texto, tales como
  `[tool_name]` seguido de JSON y `[END_TOOL_REQUEST]`. OpenClaw las promueve
  a llamadas de herramientas reales solo cuando el nombre coincide exactamente con una herramienta
  registrada para el turno; de lo contrario, el bloque se trata como texto no admitido y se
  oculta de las respuestas visibles para el usuario.
- Si un modelo emite texto JSON, XML o estilo ReAct que parece una llamada a herramienta
  pero el proveedor no emitió una invocación estructurada, OpenClaw lo deja como
  texto y registra una advertencia con el id de ejecución, proveedor/modelo, patrón detectado y
  nombre de la herramienta cuando esté disponible. Trátelo como incompatibilidad de llamadas a herramientas
  del proveedor/modelo, no como una ejecución de herramienta completada.
- Si las herramientas aparecen como texto del asistente en lugar de ejecutarse, por ejemplo JSON sin procesar,
  sintaxis XML, ReAct, o una matriz `tool_calls` vacía en la respuesta del proveedor,
  primero verifique que el servidor esté usando una plantilla/parser de chat capaz de llamadas a herramientas. Para
  backends de Completaciones de Chat compatibles con OpenAI cuyo parser solo funciona cuando el uso
  de herramientas es forzado, establezca una anulación de solicitud por modelo en lugar de confiar en el análisis de texto:

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  Use esto solo para modelos/sesiones donde cada turno normal deba llamar a una herramienta.
  Anula el valor de proxy predeterminado de OpenClaw de `tool_choice: "auto"`.
  Reemplace `local/my-local-model` con la referencia exacta de proveedor/modelo que muestra
  `openclaw models list`.

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- Algunos backends locales más pequeños o más estrictos son inestables con la forma completa del prompt del agent-runtime de OpenClaw, especialmente cuando se incluyen esquemas de herramientas. Si el backend funciona para pequeñas llamadas directas `/v1/chat/completions` pero falla en turnos normales del agente de OpenClaw, primero intente `agents.defaults.experimental.localModelLean: true` para eliminar herramientas predeterminadas pesadas como `browser`, `cron` y `message`; esto es una marca experimental, no una configuración predeterminada estable. Consulte [Experimental Features](/es/concepts/experimental-features). Si eso aún falla, intente `models.providers.<provider>.models[].compat.supportsTools: false`.
- Si el backend todavía falla solo en ejecuciones grandes de OpenClaw, el problema restante suele ser la capacidad del modelo/servidor ascendente o un error del backend, no la capa de transporte de OpenClaw.

## Solución de problemas

- ¿Puede el Gateway alcanzar el proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Vuelva a cargarlo; el inicio en frío es una causa común de "bloqueo".
- ¿El servidor local dice `terminated`, `ECONNRESET` o cierra el stream a mitad de un turno? OpenClaw registra un `model.call.error.failureKind` de baja cardinalidad más la instantánea RSS/heap del proceso de OpenClaw en los diagnósticos. Para la presión de memoria de LM Studio/Ollama, coincida esa marca de tiempo con el registro del servidor o el registro de fallos/jetsam de macOS para confirmar si el servidor del modelo fue terminado.
- OpenClaw advierte cuando la ventana de contexto detectada es inferior a **32k** y bloquea si es inferior a **16k**. Si encuentra ese previo, aumente el límite de contexto del servidor/modelo o elija un modelo más grande.
- ¿Errores de contexto? Reduzca `contextWindow` o aumente su límite del servidor.
- ¿El servidor compatible con OpenAI devuelve `messages[].content ... expected a string`? Añada `compat.requiresStringContent: true` en esa entrada de modelo.
- ¿Las llamadas directas pequeñas `/v1/chat/completions` funcionan, pero `openclaw infer model run` falla en Gemma u otro modelo local? Desactive primero los esquemas de herramientas con `compat.supportsTools: false`, luego vuelva a probar. Si el servidor todavía falla solo con prompts grandes de OpenClaw, trátelo como una limitación del servidor/modelo ascendente.
- ¿Las llamadas a herramientas aparecen como texto JSON/XML/ReAct sin procesar, o el proveedor devuelve una matriz `tool_calls` vacía? No agregues un proxy que convierta ciegamente el texto del asistente en ejecución de herramientas. Primero corrige la plantilla de chat o el analizador del servidor. Si el modelo solo funciona cuando se fuerza el uso de herramientas, agrega la anulación `params.extra_body.tool_choice: "required"` por modelo anterior y usa esa entrada de modelo solo para sesiones donde se espera una llamada a herramientas en cada turno.
- Seguridad: los modelos locales omiten los filtros del lado del proveedor; mantén los agentes limitados y la compactación activa para limitar el radio de explosión de la inyección de indicaciones.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Conmutación por error de modelos](/es/concepts/model-failover)

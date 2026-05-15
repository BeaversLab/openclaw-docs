---
summary: "Ejecutar OpenClaw en LLM locales (LM Studio, vLLM, LiteLLM, endpoints personalizados de OpenAI)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modelos locales"
---

Los modelos locales son viables. También elevan el listón en cuanto a hardware, tamaño del contexto y defensa contra la inyección de prompts: las tarjetas pequeñas o con cuantización agresiva truncan el contexto y filtran la seguridad. Esta página es la guía con opiniones para stacks locales de alta gama y servidores locales compatibles con OpenAI personalizados. Para una incorporación con la menor fricción, comience con [LM Studio](/es/providers/lmstudio) u [Ollama](/es/providers/ollama) y `openclaw onboard`.

## Requisitos mínimos de hardware

Apunte alto: **≥2 Mac Studios al máximo o una configuración de GPU equivalente (~$30k+)** para un bucle de agente cómodo. Una sola **GPU de 24 GB** funciona solo para prompts más ligeros con mayor latencia. Ejecute siempre la **variante más grande / de tamaño completo que pueda alojar**; los puntos de control pequeños o muy cuantizados aumentan el riesgo de inyección de prompts (consulte [Seguridad](/es/gateway/security)).

## Elegir un backend

| Backend                                                         | Usar cuando                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [LM Studio](/es/providers/lmstudio)                             | Configuración local por primera vez, cargador GUI, API de Responses nativa          |
| [Ollama](/es/providers/ollama)                                  | Flujo de trabajo CLI, biblioteca de modelos, servicio systemd sin intervención      |
| MLX / vLLM / SGLang                                             | Servicio autoalojado de alto rendimiento con un endpoint HTTP compatible con OpenAI |
| LiteLLM / OAI-proxy / proxy personalizado compatible con OpenAI | Usted frente a otra API de modelo y necesita que OpenClaw la trate como OpenAI      |

Use la API de Responses (`api: "openai-responses"`) cuando el backend la soporte (LM Studio lo hace). De lo contrario, manténgase en Chat Completions (`api: "openai-completions"`).

<Warning>
  **Usuarios de WSL2 + Ollama + NVIDIA/CUDA:** El instalador oficial de Ollama para Linux habilita un servicio systemd con `Restart=always`. En configuraciones de GPU con WSL2, el inicio automático puede recargar el último modelo durante el arranque y fijar la memoria del host. Si su máquina virtual WSL2 se reinicia repetidamente después de habilitar Ollama, consulte [bucle de bloqueo de
  WSL2](/es/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recomendado: LM Studio + modelo local grande (API de Responses)

Mejor pila local actual. Cargue un modelo grande en LM Studio (por ejemplo, una versión completa de Qwen, DeepSeek o Llama), habilite el servidor local (predeterminado `http://127.0.0.1:1234`) y use Responses API para mantener el razonamiento separado del texto final.

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

- Instalar LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- En LM Studio, descargue la **versión de modelo más grande disponible** (evite las variantes "pequeñas" o muy cuantizadas), inicie el servidor, confirme que `http://127.0.0.1:1234/v1/models` lo liste.
- Reemplace `my-local-model` con el ID del modelo real que se muestra en LM Studio.
- Mantenga el modelo cargado; la carga en frío añade latencia de inicio.
- Ajuste `contextWindow`/`maxTokens` si su compilación de LM Studio es diferente.
- Para WhatsApp, manténgase en Responses API para que solo se envíe el texto final.

Mantenga los modelos alojados configurados incluso cuando se ejecute localmente; use `models.mode: "merge"` para que los respaldos sigan disponibles.

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

Invierta el orden principal y de respaldo; mantenga el mismo bloque de proveedores y `models.mode: "merge"` para que pueda recurrir a Sonnet u Opus cuando el cuadro local esté caído.

### Alojamiento regional / enrutamiento de datos

- Las variantes alojadas de MiniMax/Kimi/GLM también existen en OpenRouter con puntos finales fijados por región (p. ej., alojados en EE. UU.). Elija la variante regional allí para mantener el tráfico en su jurisdicción elegida mientras se usa `models.mode: "merge"` para los respaldos de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más fuerte; el enrutamiento regional alojado es el término medio cuando necesita funciones del proveedor pero desea controlar el flujo de datos.

## Otros proxies locales compatibles con OpenAI

MLX (`mlx_lm.server`), vLLM, SGLang, LiteLLM, OAI-proxy o puertas de enlace personalizadas funcionan si exponen un punto final estilo OpenAI `/v1/chat/completions`. Use el adaptador Chat Completions a menos que el backend documente explícitamente el soporte de `/v1/responses`. Reemplace el bloque de proveedor anterior con su punto final e ID de modelo:

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

Si se omite `api` en un proveedor personalizado con un `baseUrl`, OpenClaw usa por defecto
`openai-completions`. Los puntos de conexión de bucle invertido como `127.0.0.1` son de confianza
automática; los puntos de conexión de LAN, tailnet y DNS privados aún necesitan
`request.allowPrivateNetwork: true`.

El valor `models.providers.<id>.models[].id` es local del proveedor. No
incluya allí el prefijo del proveedor. Por ejemplo, un servidor MLX iniciado con
`mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` debería usar este
id de catálogo y referencia de modelo:

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Establezca `input: ["text", "image"]` en modelos de visión locales o a través de proxy para que los archivos adjuntos de imagen
se inyecten en los turnos del agente. La incorporación interactiva de proveedores personalizados
infiere identificadores comunes de modelos de visión y solo solicita nombres desconocidos.
La incorporación no interactiva usa la misma inferencia; use `--custom-image-input`
para identificadores de visión desconocidos o `--custom-text-input` cuando un modelo de apariencia conocida es
de solo texto detrás de su punto de conexión.

Mantenga `models.mode: "merge"` para que los modelos alojados sigan disponibles como respaldo.
Use `models.providers.<id>.timeoutSeconds` para servidores de modelos locales o remotos lentos
antes de aumentar `agents.defaults.timeoutSeconds`. El tiempo de espera del proveedor
se aplica solo a las solicitudes HTTP del modelo, incluyendo conexión, encabezados, transmisión del cuerpo
y la cancelación total de la recuperación protegida.

<Note>
  Para proveedores personalizados compatibles con OpenAI, se acepta guardar un marcador local no secreto como `apiKey: "ollama-local"` cuando `baseUrl` se resuelve a un bucle invertido, una LAN privada, `.local`, o un nombre de host simple. OpenClaw lo trata como una credencial local válida en lugar de reportar una clave faltante. Use un valor real para cualquier proveedor que acepte un nombre de
  host público.
</Note>

Nota de comportamiento para los backends `/v1` locales/proxied:

- OpenClaw trata estos como rutas compatibles con estilo proxy OpenAI, no como puntos de conexión
  nativos de OpenAI
- aquí no se aplica el modelado de solicitudes solo nativas de OpenAI: sin
  `service_tier`, sin Responses `store`, sin modelado de carga de compatibilidad de razonamiento de OpenAI
  y sin sugerencias de caché de instrucciones
- los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en estas URLs de proxy personalizadas

Notas de compatibilidad para backends compatibles con OpenAI más estrictos:

- Algunos servidores solo aceptan cadenas `messages[].content` en Chat Completions, no
  matrices de partes de contenido estructuradas. Establezca
  `models.providers.<provider>.models[].compat.requiresStringContent: true` para
  esos endpoints.
- Algunos modelos locales emiten solicitudes de herramientas independientes entre corchetes como texto, como
  `[tool_name]` seguido de JSON y `[END_TOOL_REQUEST]`. OpenClaw las promueve
  a llamadas de herramientas reales solo cuando el nombre coincide exactamente con una herramienta
  registrada para el turno; de lo contrario, el bloque se trata como texto no compatible y se
  oculta de las respuestas visibles para el usuario.
- Si un modelo emite texto JSON, XML o estilo ReAct que parece una llamada de herramienta
  pero el proveedor no emitió una invocación estructurada, OpenClaw lo deja como
  texto y registra una advertencia con el id de ejecución, proveedor/modelo, patrón detectado y
  nombre de la herramienta cuando esté disponible. Trátelo como una incompatibilidad de llamada de herramienta
  del proveedor/modelo, no como una ejecución de herramienta completada.
- Si las herramientas aparecen como texto del asistente en lugar de ejecutarse, por ejemplo JSON sin procesar,
  sintaxis XML o ReAct, o una matriz `tool_calls` vacía en la respuesta del proveedor,
  primero verifique que el servidor esté utilizando una plantilla/parser de chat capaz de llamar herramientas. Para
  backends de Chat Completions compatibles con OpenAI cuyo parser solo funciona cuando el uso de herramientas
  está forzado, establezca una anulación de solicitud por modelo en lugar de confiar en el análisis de texto:

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
  Reemplace `local/my-local-model` con la referencia exacta del proveedor/modelo mostrada por
  `openclaw models list`.

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- Si un modelo personalizado compatible con OpenAI acepta esfuerzos de razonamiento de OpenAI más allá
  del perfil integrado, declárelos en el bloque de compatibilidad del modelo. Agregar `"xhigh"`
  aquí hace que `/think xhigh`, selectores de sesión, validación de Gateway y validación de `llm-task`
  expongan el nivel para esa referencia de proveedor/modelo configurada:

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "GPT 5.4 via local proxy",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## Backends más pequeños o más estrictos

Si el modelo se carga correctamente pero los turnos completos del agente fallan, trabaje de arriba hacia abajo: confirme primero el transporte y luego reduzca la superficie.

1. **Confirme que el modelo local responde.** Sin herramientas, sin contexto del agente:

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **Confirme el enrutamiento de Gateway.** Envía solo el mensaje proporcionado: omite la transcripción, el arranque de AGENTS, el ensamblaje del motor de contexto, las herramientas y los servidores MCP incluidos, pero todavía ejercita el enrutamiento, la autenticación y la selección del proveedor de Gateway:

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **Intente el modo lean (ligero).** Si ambas pruebas pasan pero los turnos reales del agente fallan con llamadas a herramientas malformadas o mensajes demasiado grandes, habilite `agents.defaults.experimental.localModelLean: true`. Elimina las tres herramientas predeterminadas más pesadas (`browser`, `cron`, `message`) para que la forma del mensaje sea más pequeña y menos frágil. Consulte [Experimental Features → Local model lean mode](/es/concepts/experimental-features#local-model-lean-mode) para obtener la explicación completa, cuándo usarlo y cómo confirmar que está activado.

4. **Desactive las herramientas por completo como último recurso.** Si el modo lean no es suficiente, configure `models.providers.<provider>.models[].compat.supportsTools: false` para esa entrada del modelo. El agente entonces operará sin llamadas a herramientas en ese modelo.

5. **Después de eso, el cuello de botella está aguas arriba.** Si el backend sigue fallando solo en ejecuciones más grandes de OpenClaw después del modo lean y `supportsTools: false`, el problema restante suele ser la capacidad del modelo o del servidor aguas arriba: ventana de contexto, memoria de GPU, desalojo de caché kv o un error del backend. En ese punto, no es la capa de transporte de OpenClaw.

## Solución de problemas

- ¿Puede Gateway acceder al proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Cárguelo de nuevo; el arranque en frío es una causa común de "cuelgue".
- ¿El servidor local dice `terminated`, `ECONNRESET`, o cierra la transmisión a mitad de un turno?
  OpenClaw registra un `model.call.error.failureKind` de baja cardinalidad más la
  instantánea RSS/heap del proceso OpenClaw en los diagnósticos. Para la presión
  de memoria de LM Studio/Ollama, coincida esa marca de tiempo con el registro del
  servidor o el registro de fallos/jetsam de macOS para confirmar si el servidor del
  modelo fue terminado.
- OpenClaw deriva los umbrales de verificación previa de la ventana de contexto a partir de la ventana del modelo detectada, o de la ventana del modelo sin límite cuando `agents.defaults.contextTokens` reduce la ventana efectiva. Advierte por debajo del 20% con un límite inferior de **8k**. Los bloqueos duros utilizan el umbral del 10% con un límite inferior de **4k**, limitado a la ventana de contexto efectiva para que los metadatos del modelo excesivamente grandes no puedan rechazar un límite de usuario que, por lo demás, sea válido. Si encuentras esa verificación previa, aumenta el límite de contexto del servidor/modelo o elige un modelo más grande.
- ¿Errores de contexto? Reduce `contextWindow` o aumenta el límite de tu servidor.
- ¿El servidor compatible con OpenAI devuelve `messages[].content ... expected a string`?
  Agrega `compat.requiresStringContent: true` en esa entrada de modelo.
- ¿Las llamadas directas pequeñas `/v1/chat/completions` funcionan, pero `openclaw infer model run --local`
  falla en Gemma u otro modelo local? Primero verifica la URL del proveedor, la referencia del modelo, el marcador
  de autenticación y los registros del servidor; el `model run` local
  no incluye herramientas de agente. Si el `model run` local tiene éxito pero fallan los turnos de agente más grandes, reduce la superficie de
  herramientas del agente con `localModelLean` o `compat.supportsTools: false`.
- ¿Las llamadas a herramientas aparecen como texto sin formato JSON/XML/ReAct, o el proveedor devuelve una
  matriz `tool_calls` vacía? No agregues un proxy que convierta ciegamente el texto
  del asistente en ejecución de herramientas. Primero corrige la plantilla/parser de chat del servidor. Si el
  modelo solo funciona cuando se fuerza el uso de herramientas, agrega la invalidación
  `params.extra_body.tool_choice: "required"` por modelo arriba y usa esa entrada de
  modelo solo para sesiones donde se espera una llamada a herramienta en cada turno.
- Seguridad: los modelos locales omiten los filtros del lado del proveedor; mantén los agentes estrechos y la compactación activa para limitar el radio de explosión de la inyección de avisos.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Conmutación por error de modelo](/es/concepts/model-failover)

---
summary: "Ejecutar OpenClaw en LLM locales (LM Studio, vLLM, LiteLLM, endpoints personalizados de OpenAI)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modelos locales"
---

Los modelos locales son viables. También elevan el listón en cuanto a hardware, tamaño del contexto y defensa contra la inyección de prompts: las tarjetas pequeñas o con cuantización agresiva truncan el contexto y filtran seguridad. Esta página es la guía con opiniones para stacks locales de gama alta y servidores locales compatibles con OpenAI personalizados. Para una incorporación con la menor fricción posible, comience con [LM Studio](/es/providers/lmstudio) u [Ollama](/es/providers/ollama) y `openclaw onboard`.

Para servidores locales que deben iniciarse solo cuando un modelo seleccionado los necesite, consulte
[Servicios de modelos locales](/es/gateway/local-model-services).

## Requisitos mínimos de hardware

Apunte alto: **≥2 Mac Studios al máximo o un equipo GPU equivalente (~$30k+)** para un bucle de agente cómodo. Una sola **GPU de 24 GB** funciona solo para prompts más ligeros con mayor latencia. Ejecute siempre el **variante más grande / de tamaño completo que pueda alojar**; los puntos de control pequeños o muy cuantizados aumentan el riesgo de inyección de prompts (consulte [Seguridad](/es/gateway/security)).

## Elegir un backend

| Backend                                                         | Usar cuando                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [ds4](/es/providers/ds4)                                        | DeepSeek V4 Flash local en macOS Metal con llamadas a herramientas compatibles con OpenAI |
| [LM Studio](/es/providers/lmstudio)                             | Configuración local por primera vez, cargador GUI, API de respuestas nativa               |
| LiteLLM / OAI-proxy / proxy personalizado compatible con OpenAI | Usted pone al frente otra API de modelo y necesita que OpenClaw la trate como OpenAI      |
| MLX / vLLM / SGLang                                             | Servicio autoalojado de alto rendimiento con un punto final HTTP compatible con OpenAI    |
| [Ollama](/es/providers/ollama)                                  | Flujo de trabajo CLI, biblioteca de modelos, servicio systemd sin intervención            |

Use la Responses API (`api: "openai-responses"`) cuando el backend la admita (LM Studio lo hace). De lo contrario, manténgase en Chat Completions (`api: "openai-completions"`).

<Warning>
  **Usuarios de WSL2 + Ollama + NVIDIA/CUDA:** El instalador oficial de Ollama para Linux habilita un servicio systemd con `Restart=always`. En configuraciones de GPU con WSL2, el inicio automático puede recargar el último modelo durante el arranque y fijar la memoria del host. Si su máquina virtual WSL2 se reinicia repetidamente después de habilitar Ollama, consulte [Bucle de bloqueo de
  WSL2](/es/providers/ollama#wsl2-crash-loop-repeated-reboots).
</Warning>

## Recomendado: LM Studio + modelo local grande (Responses API)

Mejor pila local actual. Cargue un modelo grande en LM Studio (por ejemplo, una versión de tamaño completo de Qwen, DeepSeek o Llama), habilite el servidor local (por defecto `http://127.0.0.1:1234`) y use Responses API para mantener el razonamiento separado del texto final.

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
- En LM Studio, descargue la **versión del modelo más grande disponible** (evite las variantes "pequeñas" o muy cuantificadas), inicie el servidor, confirme que `http://127.0.0.1:1234/v1/models` lo lista.
- Reemplace `my-local-model` con el ID del modelo real que se muestra en LM Studio.
- Mantenga el modelo cargado; la carga en frío añade latencia de inicio.
- Ajuste `contextWindow`/`maxTokens` si su versión de LM Studio difiere.
- Para WhatsApp, manténgase en Responses API para que solo se envíe el texto final.

Mantenga los modelos alojados configurados incluso cuando se ejecute localmente; use `models.mode: "merge"` para que las alternativas de respaldo sigan disponibles.

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

### Primero local con red de seguridad alojada

Invierta el orden principal y de respaldo; mantenga el mismo bloque de proveedores y `models.mode: "merge"` para que pueda recurrir a Sonnet u Opus cuando el cuadro local esté caído.

### Alojamiento regional / enrutamiento de datos

- También existen variantes alojadas de MiniMax/Kimi/GLM en OpenRouter con endpoints fijos por región (por ejemplo, alojados en EE. UU.). Elija la variante regional allí para mantener el tráfico en su jurisdicción elegida mientras aún usa `models.mode: "merge"` para alternativas de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más fuerte; el enrutamiento regional alojado es el término medio cuando necesita funciones del proveedor pero quiere control sobre el flujo de datos.

## Otros proxies locales compatibles con OpenAI

MLX (`mlx_lm.server`), vLLM, SGLang, LiteLLM, OAI-proxy o puertas de enlace personalizadas
funcionan si exponen un endpoint estilo OpenAI `/v1/chat/completions`.
Use el adaptador de Chat Completions a menos que el backend documente explícitamente
soporte para `/v1/responses`. Reemplace el bloque de proveedor de arriba con su
endpoint e ID de modelo:

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
`openai-completions`. Las entradas de proveedores personalizados/localeles confían en su origen `baseUrl`
configurado exacto para las solicitudes de modelos protegidas, incluyendo loopback, LAN, tailnet
y hosts DNS privados. Las solicitudes a otros orígenes privados aún necesitan
`request.allowPrivateNetwork: true`; los orígenes de metadatos/link-local siguen bloqueados
sin la inclusión explícita. Establézcalo en `false` para no participar de la confianza del origen exacto.

El valor `models.providers.<id>.models[].id` es local del proveedor. No
incluya allí el prefijo del proveedor. Por ejemplo, un servidor MLX iniciado con
`mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` debe usar este
catalog id y model ref:

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

Establezca `input: ["text", "image"]` en modelos de visión locales o mediante proxy para que los archivos adjuntos
de imagen se inyecten en los turnos del agente. La incorporación interactiva de proveedores personalizados
deduce los ID comunes de modelos de visión y solo pregunta por nombres desconocidos.
La incorporación no interactiva utiliza la misma deducción; use `--custom-image-input`
para ID de visión desconocidos o `--custom-text-input` cuando un modelo con apariencia conocida es
de solo texto detrás de su punto final.

Mantenga `models.mode: "merge"` para que los modelos alojados sigan disponibles como respaldo.
Use `models.providers.<id>.timeoutSeconds` para servidores de modelos locales o remotos lentos
antes de aumentar `agents.defaults.timeoutSeconds`. El tiempo de espera del proveedor
se aplica solo a las solicitudes HTTP del modelo, incluyendo conexión, encabezados, transmisión del cuerpo
y la cancelación total de la búsqueda protegida. Si el tiempo de espera del agente o de la ejecución es menor, aumente
también ese límite porque los tiempos de espera del proveedor no pueden extender toda la ejecución del agente.

<Note>
  Para proveedores personalizados compatibles con OpenAI, se acepta persistir un marcador local no secreto como `apiKey: "ollama-local"` cuando `baseUrl` se resuelve a loopback, una LAN privada, `.local` o un nombre de host simple. OpenClaw lo trata como una credencial local válida en lugar de reportar una clave faltante. Use un valor real para cualquier proveedor que acepte un nombre de host
  público.
</Note>

Nota de comportamiento para backends `/v1` locales/proxied:

- OpenClaw trata estas como rutas compatibles con OpenAI de estilo proxy, no como
  endpoints nativos de OpenAI
- aquí no se aplica el modelado de solicitudes exclusivo de OpenAI nativo: sin
  `service_tier`, sin Responses `store`, sin modelado
  de payload compatible con el razonamiento de OpenAI
  y sin sugerencias de caché de indicaciones (prompt-cache)
- los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en estas URLs de proxy personalizadas

Notas de compatibilidad para backends compatibles con OpenAI más estrictos:

- Algunos servidores aceptan solo cadenas `messages[].content` en Chat Completions, no
  matrices de partes de contenido estructuradas. Establezca
  `models.providers.<provider>.models[].compat.requiresStringContent: true` para
  esos endpoints.
- Algunos modelos locales emiten solicitudes de herramientas entre corchetes independientes como texto, como
  `[tool_name]` seguido de JSON y `[END_TOOL_REQUEST]`. OpenClaw las promueve
  a llamadas de herramientas reales solo cuando el nombre coincide exactamente con una herramienta
  registrada para el turno; de lo contrario, el bloque se trata como texto no compatible y se
  oculta de las respuestas visibles para el usuario.
- Si un modelo emite texto JSON, XML o estilo ReAct que parece una llamada a herramienta
  pero el proveedor no emitió una invocación estructurada, OpenClaw lo deja como
  texto y registra una advertencia con el id de ejecución, proveedor/modelo, patrón detectado y
  nombre de la herramienta cuando está disponible. Trátelo como una incompatibilidad de
  llamadas a herramientas del proveedor/modelo, no como una ejecución de herramienta completada.
- Si las herramientas aparecen como texto del asistente en lugar de ejecutarse, por ejemplo JSON sin formato,
  sintaxis XML o ReAct, o una matriz `tool_calls` vacía en la respuesta del proveedor,
  primero verifique que el servidor esté usando una plantilla/parser de chat capaz de llamadas a herramientas. Para
  backends de Chat Completions compatibles con OpenAI cuyo parser solo funciona cuando el uso
  de herramientas se fuerza, establezca una anulación de solicitud por modelo en lugar de confiar en el análisis
  de texto:

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

- Si un modelo personalizado compatible con OpenAI acepta esfuerzos de razonamiento de OpenAI más allá del perfil integrado, declárelos en el bloque de compatibilidad del modelo. Agregar `"xhigh"` aquí hace que `/think xhigh`, los selectores de sesión, la validación de Gateway y la validación de `llm-task` expongan el nivel para esa referencia de proveedor/modelo configurada:

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

Si el modelo se carga correctamente pero los turnos completos del agente fallan, trabaje de arriba hacia abajo: primero confirme el transporte y luego reduzca la superficie.

1. **Confirme que el modelo local responde por sí mismo.** Sin herramientas, sin contexto de agente:

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **Confirme el enrutamiento de Gateway.** Envía solo el mensaje proporcionado: omite la transcripción, el arranque de AGENTS, el ensamblaje del motor de contexto, las herramientas y los servidores MCP incluidos, pero aún ejercita el enrutamiento, la autenticación y la selección del proveedor de Gateway:

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **Intente el modo lean.** Si ambas pruebas pasan pero los turnos reales del agente fallan con llamadas a herramientas malformadas o mensajes demasiado grandes, habilite `agents.defaults.experimental.localModelLean: true`. Esto elimina las tres herramientas predeterminadas más pesadas (`browser`, `cron`, `message`) para que la forma del mensaje sea más pequeña y menos frágil. Consulte [Experimental Features → Local model lean mode](/es/concepts/experimental-features#local-model-lean-mode) para obtener la explicación completa, cuándo usarlo y cómo confirmar que está activado.

4. **Desactive las herramientas por completo como último recurso.** Si el modo lean no es suficiente, establezca `models.providers.<provider>.models[].compat.supportsTools: false` para esa entrada de modelo. El agente entonces operará sin llamadas a herramientas en ese modelo.

5. **Más allá de eso, el cuello de botella es aguas arriba.** Si el backend aún falla solo en ejecuciones más grandes de OpenClaw después del modo lean y `supportsTools: false`, el problema restante suele ser la capacidad del modelo o del servidor aguas arriba: ventana de contexto, memoria de GPU, expulsión de caché kv o un error del backend. En ese punto, no es la capa de transporte de OpenClaw.

## Solución de problemas

- ¿Gateway puede alcanzar el proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Vuelva a cargarlo; el inicio en frío es una causa común de "bloqueo".
- ¿El servidor local indica `terminated`, `ECONNRESET` o cierra el flujo a mitad de turno?
  OpenClaw registra un `model.call.error.failureKind` de baja cardinalidad junto con la
  instantánea RSS/heap del proceso de OpenClaw en los diagnósticos. Para la presión de memoria de LM Studio/Ollama,
  compare esa marca de tiempo con el registro del servidor o el registro de fallos de macOS /
  jetsam para confirmar si el servidor del modelo fue terminado.
- OpenClaw deriva los umbrales de verificación previa de la ventana de contexto a partir de la ventana del modelo detectada, o de la ventana del modelo sin límite cuando `agents.defaults.contextTokens` reduce la ventana efectiva. Advierte por debajo del 20% con un mínimo de **8k**. Los bloqueos duros utilizan el umbral del 10% con un mínimo de **4k**, limitado a la ventana de contexto efectiva para que los metadatos del modelo sobredimensionados no puedan rechazar un límite de usuario válido por lo demás. Si alcanza esa verificación previa, aumente el límite de contexto del servidor/modelo o elija un modelo más grande.
- ¿Errores de contexto? Reduzca `contextWindow` o aumente el límite de su servidor.
- ¿El servidor compatible con OpenAI devuelve `messages[].content ... expected a string`?
  Añada `compat.requiresStringContent: true` en esa entrada del modelo.
- ¿El servidor compatible con OpenAI devuelve `validation.keys` o indica que las entradas de mensajes solo permiten `role` y `content`?
  Añada `compat.strictMessageKeys: true` en esa entrada del modelo.
- ¿Las llamadas `/v1/chat/completions` diminutas directas funcionan, pero `openclaw infer model run --local`
  falla en Gemma u otro modelo local? Compruebe primero la URL del proveedor, la referencia del modelo, el marcador de autenticación
  y los registros del servidor; el `model run` local no incluye herramientas de agente.
  Si el `model run` local tiene éxito pero fallan los turnos de agente más grandes, reduzca la superficie de herramientas del agente
  con `localModelLean` o `compat.supportsTools: false`.
- ¿Las llamadas a herramientas aparecen como texto JSON/XML/ReAct sin procesar, o el proveedor devuelve una
  matriz `tool_calls` vacía? No añada un proxy que convierta ciegamente el texto
  del asistente en ejecución de herramientas. Corrija primero la plantilla/analizador de chat del servidor. Si el
  modelo solo funciona cuando se fuerza el uso de herramientas, añada la invalidación
  `params.extra_body.tool_choice: "required"` por modelo anterior y use esa entrada del modelo
  solo para sesiones donde se espera una llamada a herramienta en cada turno.
- Seguridad: los modelos locales omiten los filtros del proveedor; mantenga los agentes limitados y la compactación activa para limitar el radio de explosión de la inyección de avisos.

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Conmutación por error de modelos](/es/concepts/model-failover)

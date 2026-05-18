---
summary: "Ejecutar OpenClaw con vLLM (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM puede servir modelos de código abierto (y algunos personalizados) a través de una API HTTP **compatible con OpenAI**. OpenClaw se conecta a vLLM utilizando la API `openai-completions`.

OpenClaw también puede **detectar automáticamente** los modelos disponibles en vLLM cuando activa la opción con `VLLM_API_KEY` (cualquier valor funciona si su servidor no aplica autenticación). Use `vllm/*` en `agents.defaults.models` para mantener la detección dinámica cuando también configura una URL base personalizada de vLLM.

OpenClaw trata `vllm` como un proveedor local compatible con OpenAI que admite
contabilidad de uso en streaming, por lo que los recuentos de tokens de estado/contexto pueden actualizarse desde
las respuestas `stream_options.include_usage`.

| Propiedad               | Valor                                        |
| ----------------------- | -------------------------------------------- |
| ID del proveedor        | `vllm`                                       |
| API                     | `openai-completions` (compatible con OpenAI) |
| Autenticación           | variable de entorno `VLLM_API_KEY`           |
| URL base predeterminada | `http://127.0.0.1:8000/v1`                   |

## Para empezar

<Steps>
  <Step title="Iniciar vLLM con un servidor compatible con OpenAI">
    Su URL base debe exponer endpoints `/v1` (p. ej., `/v1/models`, `/v1/chat/completions`). vLLM comúnmente se ejecuta en:

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="Establecer la variable de entorno de la clave de API">
    Cualquier valor funciona si su servidor no aplica autenticación:

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="Seleccionar un modelo">
    Reemplace con uno de sus IDs de modelo vLLM:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vllm/your-model-id" },
        },
      },
    }
    ```

  </Step>
  <Step title="Verificar que el modelo está disponible">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## Descubrimiento de modelos (proveedor implícito)

Cuando `VLLM_API_KEY` está establecida (o existe un perfil de autenticación) y **no** define `models.providers.vllm`, OpenClaw consulta:

```
GET http://127.0.0.1:8000/v1/models
```

y convierte los IDs devueltos en entradas de modelo.

<Note>Si configura `models.providers.vllm` explícitamente, OpenClaw usa sus modelos declarados por defecto. Añada `"vllm/*": {}` a `agents.defaults.models` cuando quiera que OpenClaw consulte el endpoint `/models` de ese proveedor configurado e incluya todos los modelos vLLM anunciados.</Note>

## Configuración explícita (modelos manuales)

Use la configuración explícita cuando:

- vLLM se ejecuta en un host o puerto diferente
- Quiere fijar los valores `contextWindow` o `maxTokens`
- Su servidor requiere una clave API real (o desea controlar los encabezados)
- Te conectas a un punto final vLLM de loopback, LAN o Tailscale confiable

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300, // Optional: extend connect/header/body/request timeout for slow local models
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Para mantener este proveedor dinámico sin listar manualmente cada modelo, añada un
comodín de proveedor al catálogo de modelos visible:

```json5
{
  agents: {
    defaults: {
      models: {
        "vllm/*": {},
      },
    },
  },
}
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comportamiento de estilo proxy">
    vLLM se trata como un backend `/v1` compatible con OpenAI de estilo proxy, no como un
    endpoint nativo de OpenAI. Esto significa:

    | Comportamiento | ¿Aplicado? |
    |----------|----------|
    | Formación de solicitudes nativa de OpenAI | No |
    | `service_tier` | No enviado |
    | Respuestas `store` | No enviado |
    | Sugerencias de caché de solicitudes (prompt-cache) | No enviado |
    | Formación de cargas útiles compatibles con razonamiento de OpenAI | No aplicado |
    | Cabeceras de atribución ocultas de OpenClaw | No inyectadas en URL base personalizadas |

  </Accordion>

  <Accordion title="Controles de pensamiento Qwen">
    Para los modelos Qwen servidos a través de vLLM, establezca
    `params.qwenThinkingFormat: "chat-template"` en la entrada del modelo cuando el
    servidor espere kwargs de plantilla de chat de Qwen. OpenClaw asigna `/think off` a:

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    Los niveles de pensamiento no `off` envían `enable_thinking: true`. Si su endpoint
    espera indicadores de nivel superior estilo DashScope en su lugar, use
    `params.qwenThinkingFormat: "top-level"` para enviar `enable_thinking` en la
    raíz de la solicitud. También se acepta `params.qwen_thinking_format` en snake_case.

  </Accordion>

  <Accordion title="Controles de pensamiento de Nemotron 3">
    vLLM/Nemotron 3 puede usar los kwargs de plantilla de chat para controlar si el razonamiento se
    devuelve como razonamiento oculto o como texto de respuesta visible. Cuando una sesión de OpenClaw
    usa `vllm/nemotron-3-*` con el pensamiento desactivado, el complemento vLLM incluido envía:

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "force_nonempty_content": true
      }
    }
    ```

    Para personalizar estos valores, establezca `chat_template_kwargs` en los parámetros del modelo.
    Si también establece `params.extra_body.chat_template_kwargs`, ese valor tiene
    precedencia final porque `extra_body` es la última anulación del cuerpo de la solicitud.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/nemotron-3-super": {
              params: {
                chat_template_kwargs: {
                  enable_thinking: false,
                  force_nonempty_content: true,
                },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Las llamadas a herramientas de Qwen aparecen como texto">
    Primero asegúrese de que vLLM se haya iniciado con el analizador de llamadas a herramientas y la plantilla de
    chat correctos para el modelo. Por ejemplo, la documentación de vLLM `hermes` para los modelos
    Qwen2.5 y `qwen3_xml` para los modelos Qwen3-Coder.

    Síntomas:

    - las habilidades o herramientas nunca se ejecutan
    - el asistente imprime JSON/XML sin formato, como `{"name":"read","arguments":...}`
    - vLLM devuelve una matriz `tool_calls` vacía cuando OpenClaw envía
      `tool_choice: "auto"`

    Algunas combinaciones de Qwen/vLLM devuelven llamadas a herramientas estructuradas solo cuando la
    solicitud usa `tool_choice: "required"`. Para esas entradas de modelo, fuerce el
    campo de solicitud compatible con OpenAI con `params.extra_body`:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "vllm/Qwen-Qwen2.5-Coder-32B-Instruct": {
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

    Reemplace `Qwen-Qwen2.5-Coder-32B-Instruct` con el id exacto devuelto por:

    ```bash
    openclaw models list --provider vllm
    ```

    Puede aplicar la misma anulación desde la CLI:

    ```bash
    openclaw config set agents.defaults.models '{"vllm/Qwen-Qwen2.5-Coder-32B-Instruct":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
    ```

    Esta es una solución de compatibilidad opcional. Hace que cada turno del modelo con
    herramientas requiera una llamada a herramienta, así que úsela solo para una entrada de modelo local dedicada
    donde ese comportamiento sea aceptable. No la use como predeterminado global para todos
    los modelos vLLM, y no use un proxy que convierta ciegamente texto
    arbitrario del asistente en llamadas a herramientas ejecutables.

  </Accordion>

  <Accordion title="URL base personalizada">
    Si su servidor vLLM se ejecuta en un host o puerto no predeterminado, configure `baseUrl` en la configuración explícita del proveedor:

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:9000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [
              {
                id: "my-custom-model",
                name: "Remote vLLM Model",
                reasoning: false,
                input: ["text"],
                contextWindow: 64000,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Primera respuesta lenta o tiempo de espera del servidor remoto">
    Para modelos locales grandes, hosts de LAN remotos o enlaces de tailnet, establezca un
    tiempo de espera de solicitud con ámbito de proveedor:

    ```json5
    {
      models: {
        providers: {
          vllm: {
            baseUrl: "http://192.168.1.50:8000/v1",
            apiKey: "${VLLM_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [{ id: "your-model-id", name: "Local vLLM Model" }],
          },
        },
      },
    }
    ```

    `timeoutSeconds` se aplica solo a las solicitudes HTTP del modelo vLLM, incluyendo
    la configuración de conexión, los encabezados de respuesta, la transmisión del cuerpo y la interrupción
    total de guarded-fetch. Prefiera esto antes de aumentar
    `agents.defaults.timeoutSeconds`, que controla toda la ejecución del agente.

  </Accordion>

  <Accordion title="Servidor no accesible">
    Compruebe que el servidor vLLM se esté ejecutando y sea accesible:

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si ve un error de conexión, verifique el host, el puerto y que vLLM se haya iniciado con el modo de servidor compatible con OpenAI.
    Para endpoints de loopback explícitos, LAN o Tailscale, OpenClaw confía en el
    origen `models.providers.vllm.baseUrl` configurado exacto para las solicitudes de modelos
    protegidas. Los orígenes de metadatos/enlace local permanecen bloqueados sin una
    autorización explícita. Establezca `models.providers.vllm.request.allowPrivateNetwork: true` solo
    cuando las solicitudes de vLLM deban alcanzar otro origen privado, y establézcalo en `false`
    para no participar en la confianza de origen exacto.

  </Accordion>

  <Accordion title="Errores de autenticación en las solicitudes">
    Si las solicitudes fallan con errores de autenticación, configure un `VLLM_API_KEY` real que coincida con la configuración de su servidor, o configure el proveedor explícitamente bajo `models.providers.vllm`.

    <Tip>
    Si su servidor vLLM no aplica autenticación, cualquier valor no vacío para `VLLM_API_KEY` funciona como una señal de participación para OpenClaw.
    </Tip>

  </Accordion>

<Accordion title="No se descubrieron modelos">El descubrimiento automático requiere que se establezca `VLLM_API_KEY`. Si ha definido `models.providers.vllm`, OpenClaw usa solo sus modelos declarados a menos que `agents.defaults.models` incluya `"vllm/*": {}`.</Accordion>

  <Accordion title="Las herramientas se muestran como texto sin formato">
    Si un modelo Qwen imprime la sintaxis de herramientas JSON/XML en lugar de ejecutar una habilidad,
    consulte la guía de Qwen en Configuración avanzada anteriormente. La solución habitual es:

    - iniciar vLLM con el analizador/plantilla correcto para ese modelo
    - confirmar el ID exacto del modelo con `openclaw models list --provider vllm`
    - añadir una anulación dedicada por modelo de `params.extra_body.tool_choice: "required"`
      solo si `tool_choice: "auto"` todavía devuelve llamadas a herramientas vacías o solo de texto

  </Accordion>
</AccordionGroup>

<Warning>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OpenAI" href="/es/providers/openai" icon="bolt">
    Proveedor nativo de OpenAI y comportamiento de ruta compatible con OpenAI.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y cómo resolverlos.
  </Card>
</CardGroup>

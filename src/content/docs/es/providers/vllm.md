---
summary: "Ejecuta OpenClaw con vLLM (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

vLLM puede servir modelos de código abierto (y algunos personalizados) a través de una API HTTP **compatible con OpenAI**. OpenClaw se conecta a vLLM utilizando la API `openai-completions`.

OpenClaw también puede **descubrir automáticamente** los modelos disponibles en vLLM cuando se habilita con `VLLM_API_KEY` (cualquier valor funciona si tu servidor no impone autenticación). Usa `vllm/*` en `agents.defaults.models` para mantener el descubrimiento dinámico cuando también configuras una URL base personalizada de vLLM.

OpenClaw trata `vllm` como un proveedor local compatible con OpenAI que admite
el contabilidad de uso en streaming, por lo que los recuentos de tokens de estado/contexto pueden actualizarse desde
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
    Tu URL base debe exponer endpoints `/v1` (por ejemplo, `/v1/models`, `/v1/chat/completions`). vLLM comúnmente se ejecuta en:

    ```
    http://127.0.0.1:8000/v1
    ```

  </Step>
  <Step title="Establecer la variable de entorno de la clave API">
    Cualquier valor funciona si tu servidor no impone autenticación:

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="Seleccionar un modelo">
    Reemplaza con uno de tus IDs de modelo vLLM:

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
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider vllm
    ```
  </Step>
</Steps>

## Descubrimiento de modelos (proveedor implícito)

Cuando `VLLM_API_KEY` está configurada (o existe un perfil de autenticación) y **no** defines `models.providers.vllm`, OpenClaw consulta:

```
GET http://127.0.0.1:8000/v1/models
```

y convierte los IDs devueltos en entradas de modelo.

<Note>Si establece `models.providers.vllm` explícitamente, OpenClaw usa sus modelos declarados por defecto. Añada `"vllm/*": {}` a `agents.defaults.models` cuando quiera que OpenClaw consulte el punto final `/models` de ese proveedor configurado e incluya todos los modelos vLLM anunciados.</Note>

## Configuración explícita (modelos manuales)

Use la configuración explícita cuando:

- vLLM se ejecuta en un host o puerto diferente
- Desea fijar los valores de `contextWindow` o `maxTokens`
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
    vLLM se trata como un backend `/v1` compatible con OpenAI de estilo proxy, no como un punto final
    OpenAI nativo. Esto significa:

    | Comportamiento | ¿Aplicado? |
    |----------|----------|
    | Formación de solicitudes nativa de OpenAI | No |
    | `service_tier` | No enviado |
    | Respuestas `store` | No enviadas |
    | Sugerencias de caché de avisos | No enviadas |
    | Formación de carga útil de compatibilidad de razonamiento de OpenAI | No aplicada |
    | Cabeceras de atribución ocultas de OpenClaw | No inyectadas en URL base personalizadas |

  </Accordion>

  <Accordion title="Controles de pensamiento de Qwen">
    Para los modelos Qwen servidos a través de vLLM, establezca
    `compat.thinkingFormat: "qwen-chat-template"` en la fila del modelo del proveedor
    configurado cuando el servidor espere kwargs de plantilla de chat de Qwen. Los modelos
    configurados de esta manera exponen un perfil `/think` binario (`off`, `on`) porque
    el pensamiento de la plantilla Qwen es una bandera de solicitud activada/desactivada, no una escalera de esfuerzo
    estilo OpenAI.

    ```json5
    {
      models: {
        providers: {
          vllm: {
            models: [
              {
                id: "Qwen/Qwen3-8B",
                name: "Qwen3 8B",
                reasoning: true,
                compat: { thinkingFormat: "qwen-chat-template" },
              },
            ],
          },
        },
      },
    }
    ```

    OpenClaw asigna `/think off` a:

    ```json
    {
      "chat_template_kwargs": {
        "enable_thinking": false,
        "preserve_thinking": true
      }
    }
    ```

    Los niveles de pensamiento no `off` envían `enable_thinking: true`. Si su punto final
    espera banderas de nivel superior estilo DashScope en su lugar, use
    `compat.thinkingFormat: "qwen"` para enviar `enable_thinking` en la raíz de la
    solicitud.

  </Accordion>

  <Accordion title="Controles de pensamiento de Nemotron 3">
    vLLM/Nemotron 3 puede usar kwargs de plantilla de chat (chat-template kwargs) para controlar si el razonamiento se
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

    Para personalizar estos valores, configure `chat_template_kwargs` bajo los parámetros del modelo.
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
    chat correctos para el modelo. Por ejemplo, la documentación de vLLM indica `hermes` para los modelos Qwen2.5
    y `qwen3_xml` para los modelos Qwen3-Coder.

    Síntomas:

    - las habilidades o herramientas nunca se ejecutan
    - el asistente imprime JSON/XML sin procesar, como `{"name":"read","arguments":...}`
    - vLLM devuelve un array `tool_calls` vacío cuando OpenClaw envía
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
    donde ese comportamiento sea aceptable. No la use como valor predeterminado global para todos
    los modelos vLLM, y no use un proxy que convierta a ciegas texto
    arbitrario del asistente en llamadas a herramientas ejecutables.

  </Accordion>

  <Accordion title="URL base personalizada">
    Si su servidor vLLM se ejecuta en un host o puerto no predeterminado, establezca `baseUrl` en la configuración explícita del proveedor:

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
  <Accordion title="Respuesta lenta primera o tiempo de espera agotado del servidor remoto">
    Para modelos locales grandes, hosts de LAN remotos o enlaces tailnet, establezca un
    tiempo de espera de solicitud con alcance de proveedor:

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

    `timeoutSeconds` se aplica únicamente a las solicitudes HTTP del modelo vLLM, incluyendo
    la configuración de conexión, los encabezados de respuesta, la transmisión del cuerpo y la interrupción
    total de la búsqueda protegida (guarded-fetch). Prefiera esto antes de aumentar
    `agents.defaults.timeoutSeconds`, que controla toda la ejecución del agente.

  </Accordion>

  <Accordion title="Servidor no accesible">
    Compruebe que el servidor vLLM se esté ejecutando y sea accesible:

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si ve un error de conexión, verifique el host, el puerto y que vLLM se haya iniciado con el modo de servidor compatible con OpenAI.
    Para endpoints de loopback explícito, LAN o Tailscale, OpenClaw confía en el
    origen `models.providers.vllm.baseUrl` configurado exacto para las solicitudes
    de modelo protegidas. Los orígenes de metadatos/enlace local permanecen bloqueados sin una
    aceptación explícita. Establezca `models.providers.vllm.request.allowPrivateNetwork: true` solo
    cuando las solicitudes vLLM deban alcanzar otro origen privado, y establézcalo en `false`
    para rechazar la confianza de origen exacto.

  </Accordion>

  <Accordion title="Errores de autenticación en las solicitudes">
    Si las solicitudes fallan con errores de autenticación, establezca un `VLLM_API_KEY` real que coincida con la configuración de su servidor, o configure el proveedor explícitamente bajo `models.providers.vllm`.

    <Tip>
    Si su servidor vLLM no impone autenticación, cualquier valor no vacío para `VLLM_API_KEY` funciona como una señal de aceptación para OpenClaw.
    </Tip>

  </Accordion>

<Accordion title="No se descubrieron modelos">El descubrimiento automático requiere que `VLLM_API_KEY` esté establecido. Si ha definido `models.providers.vllm`, OpenClaw usa solo sus modelos declarados a menos que `agents.defaults.models` incluya `"vllm/*": {}`.</Accordion>

  <Accordion title="Tools render as raw text">
    Si un modelo Qwen imprime la sintaxis de herramientas JSON/XML en lugar de ejecutar una habilidad,
    consulta la guía de Qwen en la Configuración avanzada anterior. La solución habitual es:

    - iniciar vLLM con el analizador/plantilla correcto para ese modelo
    - confirmar el ID exacto del modelo con `openclaw models list --provider vllm`
    - añadir una invalidación `params.extra_body.tool_choice: "required"` dedicada por modelo
      solo si `tool_choice: "auto"` aún devuelve llamadas a herramientas vacías o solo de texto

  </Accordion>
</AccordionGroup>

<Warning>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OpenAI" href="/es/providers/openai" icon="bolt">
    Proveedor nativo de OpenAI y comportamiento de rutas compatibles con OpenAI.
  </Card>
  <Card title="OAuth and auth" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
  <Card title="Troubleshooting" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y cómo resolverlos.
  </Card>
</CardGroup>

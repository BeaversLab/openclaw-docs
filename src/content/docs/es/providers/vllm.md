---
summary: "Ejecutar OpenClaw con vLLM (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM puede servir modelos de código abierto (y algunos personalizados) a través de una API HTTP **compatible con OpenAI**. OpenClaw se conecta a vLLM utilizando la API `openai-completions`.

OpenClaw también puede **detectar automáticamente** los modelos disponibles en vLLM cuando optas por esto con `VLLM_API_KEY` (cualquier valor funciona si tu servidor no aplica autenticación) y no defines una entrada `models.providers.vllm` explícita.

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
  <Step title="Establezca la variable de entorno de la clave de API">
    Cualquier valor funciona si su servidor no exige autenticación:

    ```bash
    export VLLM_API_KEY="vllm-local"
    ```

  </Step>
  <Step title="Seleccione un modelo">
    Reemplácelo con uno de sus IDs de modelo vLLM:

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

Cuando `VLLM_API_KEY` está configurado (o existe un perfil de autenticación) y **no** define `models.providers.vllm`, OpenClaw consulta:

```
GET http://127.0.0.1:8000/v1/models
```

y convierte los IDs devueltos en entradas de modelo.

<Note>Si establece `models.providers.vllm` explícitamente, se omite el descubrimiento automático y debe definir los modelos manualmente.</Note>

## Configuración explícita (modelos manuales)

Use la configuración explícita cuando:

- vLLM se ejecuta en un host o puerto diferente
- Desea fijar los valores de `contextWindow` o `maxTokens`
- Su servidor requiere una clave API real (o desea controlar los encabezados)

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
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

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Comportamiento tipo proxy">
    vLLM se trata como un backend `/v1` compatible con OpenAI de tipo proxy, no como un
    endpoint nativo de OpenAI. Esto significa:

    | Comportamiento | ¿Aplicado? |
    |----------|----------|
    | Formación de solicitudes nativa de OpenAI | No |
    | `service_tier` | No enviado |
    | Respuestas `store` | No enviado |
    | Sugerencias de caché de prompt | No enviadas |
    | Formación de carga útil de compatibilidad de razonamiento de OpenAI | No aplicada |
    | Encabezados de atribución ocultos de OpenClaw | No inyectados en URLs base personalizadas |

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
  <Accordion title="Servidor no alcanzable">
    Verifique que el servidor vLLM se esté ejecutando y sea accesible:

    ```bash
    curl http://127.0.0.1:8000/v1/models
    ```

    Si ve un error de conexión, verifique el host, el puerto y que vLLM se haya iniciado con el modo de servidor compatible con OpenAI.

  </Accordion>

  <Accordion title="Errores de autenticación en las solicitudes">
    Si las solicitudes fallan con errores de autenticación, establezca una `VLLM_API_KEY` real que coincida con la configuración de su servidor, o configure el proveedor explícitamente bajo `models.providers.vllm`.

    <Tip>
    Si su servidor vLLM no exige autenticación, cualquier valor no vacío para `VLLM_API_KEY` funciona como una señal de aceptación para OpenClaw.
    </Tip>

  </Accordion>

  <Accordion title="No se descubrieron modelos">
    El autodescubrimiento requiere que `VLLM_API_KEY` esté establecido **y** que no haya una entrada de configuración explícita de `models.providers.vllm`. Si ha definido el proveedor manualmente, OpenClaw omite el descubrimiento y usa solo los modelos que declaró.
  </Accordion>
</AccordionGroup>

<Warning>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OpenAI" href="/es/providers/openai" icon="bolt">
    Proveedor nativo de OpenAI y comportamiento de rutas compatibles con OpenAI.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y cómo resolverlos.
  </Card>
</CardGroup>

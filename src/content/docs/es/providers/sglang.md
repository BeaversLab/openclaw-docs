---
summary: "Ejecutar OpenClaw con SGLang (servidor autohospedado compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

SGLang sirve modelos de pesos abiertos a través de una API HTTP compatible con OpenAI. OpenClaw se conecta a SGLang utilizando la familia de proveedores `openai-completions` con descubrimiento automático de modelos disponibles.

| Propiedad                                     | Valor                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| ID del proveedor                              | `sglang`                                                                          |
| Complemento                                   | incluido, `enabledByDefault: true`                                                |
| Var. de entorno de autenticación              | `SGLANG_API_KEY` (cualquier valor no vacío si el servidor no tiene autenticación) |
| Indicador de incorporación                    | `--auth-choice sglang`                                                            |
| API                                           | Compatible con OpenAI (`openai-completions`)                                      |
| URL base predeterminada                       | `http://127.0.0.1:30000/v1`                                                       |
| Marcador de posición de modelo predeterminado | `sglang/Qwen/Qwen3-8B`                                                            |
| Uso en streaming                              | Sí (`supportsStreamingUsage: true`)                                               |
| Precios                                       | Marcado como externo gratuito (`modelPricing.external: false`)                    |

OpenClaw también **descubre automáticamente** los modelos disponibles de SGLang cuando aceptas con `SGLANG_API_KEY` y no defines una entrada `models.providers.sglang` explícita — consulte [Descubrimiento de modelos (proveedor implícito)](#model-discovery-implicit-provider) a continuación.

## Para empezar

<Steps>
  <Step title="Iniciar SGLang">
    Inicie SGLang con un servidor compatible con OpenAI. Su URL base debe exponer
    endpoints `/v1` (por ejemplo `/v1/models`, `/v1/chat/completions`). SGLang
    se ejecuta comúnmente en:

    - `http://127.0.0.1:30000/v1`

  </Step>
  <Step title="Establecer una clave de API">
    Cualquier valor funciona si no hay autenticación configurada en su servidor:

    ```bash
    export SGLANG_API_KEY="sglang-local"
    ```

  </Step>
  <Step title="Ejecutar la incorporación o establecer un modelo directamente">
    ```bash
    openclaw onboard
    ```

    O configure el modelo manualmente:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "sglang/your-model-id" },
        },
      },
    }
    ```

  </Step>
</Steps>

## Descubrimiento de modelos (proveedor implícito)

Cuando `SGLANG_API_KEY` está configurado (o existe un perfil de autenticación) y usted **no**
define `models.providers.sglang`, OpenClaw consultará:

- `GET http://127.0.0.1:30000/v1/models`

y convertirá los IDs devueltos en entradas de modelos.

<Note>Si establece `models.providers.sglang` explícitamente, se omite el descubrimiento automático y debes definir los modelos manualmente.</Note>

## Configuración explícita (modelos manuales)

Use configuración explícita cuando:

- SGLang se ejecuta en un host/puerto diferente.
- Deseas fijar los valores de `contextWindow`/`maxTokens`.
- Tu servidor requiere una clave API real (o deseas controlar los encabezados).

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
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

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comportamiento de estilo proxy">
    SGLang se trata como un backend `/v1` compatible con OpenAI de estilo proxy, no como
    un endpoint nativo de OpenAI.

    | Comportamiento | SGLang |
    |----------|--------|
    | Formación de solicitudes solo para OpenAI | No aplicado |
    | `service_tier`, Respuestas `store`, sugerencias de caché de prompts | No enviados |
    | Formación de carga útil compat. con razonamiento | No aplicado |
    | Encabezados de atribución ocultos (`originator`, `version`, `User-Agent`) | No inyectados en URLs base personalizadas de SGLang |

  </Accordion>

  <Accordion title="Solución de problemas">
    **Servidor no accesible**

    Verifica que el servidor esté ejecutándose y respondiendo:

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **Errores de autenticación**

    Si las solicitudes fallan con errores de autenticación, establece un `SGLANG_API_KEY` real que coincida
    con la configuración de tu servidor, o configura el proveedor explícitamente bajo
    `models.providers.sglang`.

    <Tip>
    Si ejecutas SGLang sin autenticación, cualquier valor no vacío para
    `SGLANG_API_KEY` es suficiente para optar por el descubrimiento de modelos.
    </Tip>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo incluyendo las entradas del proveedor.
  </Card>
</CardGroup>

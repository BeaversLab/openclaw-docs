---
summary: "Ejecutar OpenClaw con SGLang (servidor autohospedado compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

SGLang puede servir modelos de código abierto a través de una API HTTP compatible con **OpenAI**.
OpenClaw puede conectarse a SGLang utilizando la API `openai-completions`.

OpenClaw también puede **descubrir automáticamente** los modelos disponibles en SGLang cuando se activa con `SGLANG_API_KEY` (cualquier valor funciona si su servidor no exige autenticación)
y no define una entrada explícita de `models.providers.sglang`.

OpenClaw trata `sglang` como un proveedor local compatible con OpenAI que admite
la contabilidad de uso en streaming, por lo que los recuentos de tokens de estado/contexto pueden actualizarse desde
las respuestas `stream_options.include_usage`.

## Cómo empezar

<Steps>
  <Step title="Iniciar SGLang">
    Inicie SGLang con un servidor compatible con OpenAI. Su URL base debe exponer
    los endpoints `/v1` (por ejemplo `/v1/models`, `/v1/chat/completions`). SGLang
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

Cuando `SGLANG_API_KEY` está configurado (o existe un perfil de autenticación) y **no**
define `models.providers.sglang`, OpenClaw consultará:

- `GET http://127.0.0.1:30000/v1/models`

y convertirá los IDs devueltos en entradas de modelos.

<Note>Si configura `models.providers.sglang` explícitamente, se omite el descubrimiento automático y debe definir los modelos manualmente.</Note>

## Configuración explícita (modelos manuales)

Use la configuración explícita cuando:

- SGLang se ejecuta en un host/puerto diferente.
- Desea fijar los valores de `contextWindow`/`maxTokens`.
- Su servidor requiere una clave de API real (o desea controlar los encabezados).

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
    | Formación de solicitudes exclusivas de OpenAI | No aplicado |
    | `service_tier`, Respuestas `store`, sugerencias de caché de prompt | No enviados |
    | Formación de payload compatible con razonamiento | No aplicado |
    | Cabeceras de atribución ocultas (`originator`, `version`, `User-Agent`) | No inyectadas en URLs base personalizadas de SGLang |

  </Accordion>

  <Accordion title="Solución de problemas">
    **Servidor no accesible**

    Verifique que el servidor se esté ejecutando y respondiendo:

    ```bash
    curl http://127.0.0.1:30000/v1/models
    ```

    **Errores de autenticación**

    Si las solicitudes fallan con errores de autenticación, establezca un `SGLANG_API_KEY` real que coincida
    con la configuración de su servidor, o configure el proveedor explícitamente en
    `models.providers.sglang`.

    <Tip>
    Si ejecuta SGLang sin autenticación, cualquier valor no vacío para
    `SGLANG_API_KEY` es suficiente para optar por el descubrimiento de modelos.
    </Tip>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo que incluye las entradas del proveedor.
  </Card>
</CardGroup>

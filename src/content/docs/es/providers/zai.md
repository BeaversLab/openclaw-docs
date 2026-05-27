---
summary: "Usa Z.AI (modelos GLM) con OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI es la plataforma de API para modelos **GLM**. Proporciona API REST para GLM y
usa claves de API para la autenticación. Crea tu clave de API en la consola de Z.AI.
OpenClaw usa el proveedor `zai` con una clave de API de Z.AI.

| Propiedad     | Valor                                          |
| ------------- | ---------------------------------------------- |
| Proveedor     | `zai`                                          |
| Autenticación | `ZAI_API_KEY` (alias heredado: `Z_AI_API_KEY`) |
| API           | Z.AI Chat Completions (autenticación Bearer)   |

## Modelos GLM

GLM es una familia de modelos, no un proveedor separado. En OpenClaw, los modelos GLM usan
referencias como `zai/glm-5.1`: proveedor `zai`, id de modelo `glm-5.1`.

## Primeros pasos

<Tabs>
  <Tab title="Detectar endpoint automáticamente">
    **Lo mejor para:** la mayoría de los usuarios. OpenClaw sondea los endpoints de Z.AI compatibles con tu clave de API y aplica la URL base correcta automáticamente.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Verificar que el modelo esté listado">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Endpoint regional explícito">
    **Lo mejor para:** usuarios que deseen forzar un Plan de Codificación específico o una superficie de API general.

    <Steps>
      <Step title="Elegir la opción de incorporación correcta">
        ```bash
        # Coding Plan Global (recommended for Coding Plan users)
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN (China region)
        openclaw onboard --auth-choice zai-coding-cn

        # General API
        openclaw onboard --auth-choice zai-global

        # General API CN (China region)
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="Verificar que el modelo esté listado">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Ejemplo de configuración

<Tip>`zai-api-key` permite a OpenClaw detectar el endpoint de Z.AI coincidente a partir de la clave y aplicar la URL base correcta automáticamente. Usa las elecciones regionales explícitas cuando quieras forzar un Plan de Codificación específico o una superficie de API general.</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // Example value. Onboarding writes the matching baseUrl for your endpoint.
        baseUrl: "https://api.z.ai/api/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

## Catálogo integrado

OpenClaw incluye el catálogo del proveedor `zai` en el manifiesto del complemento, por lo que el listado de solo lectura
puede mostrar filas GLM conocidas sin cargar el tiempo de ejecución del proveedor:

```bash
openclaw models list --all --provider zai
```

El catálogo respaldado por manifiesto actualmente incluye:

| Referencia del modelo | Notas                 |
| --------------------- | --------------------- |
| `zai/glm-5.1`         | Modelo predeterminado |
| `zai/glm-5`           |                       |
| `zai/glm-5-turbo`     |                       |
| `zai/glm-5v-turbo`    |                       |
| `zai/glm-4.7`         |                       |
| `zai/glm-4.7-flash`   |                       |
| `zai/glm-4.7-flashx`  |                       |
| `zai/glm-4.6`         |                       |
| `zai/glm-4.6v`        |                       |
| `zai/glm-4.5`         |                       |
| `zai/glm-4.5-air`     |                       |
| `zai/glm-4.5-flash`   |                       |
| `zai/glm-4.5v`        |                       |

<Tip>
Los modelos GLM están disponibles como `zai/<model>` (ejemplo: `zai/glm-5`).
</Tip>

<Note>La referencia del modelo incluida por defecto es `zai/glm-5.1`. Las versiones y disponibilidad de GLM cambian; ejecute `openclaw models list --all --provider zai` para ver el catálogo conocido por su versión instalada.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Resolución directa de modelos GLM-5 desconocidos">
    Los IDs `glm-5*` desconocidos aún se resuelven directamente en la ruta del proveedor incluido
    sintetizando metadatos propiedad del proveedor a partir de la plantilla `glm-4.7` cuando el ID
    coincide con la forma actual de la familia GLM-5.
  </Accordion>

  <Accordion title="Streaming de llamadas a herramientas">
    `tool_stream` está habilitado por defecto para el streaming de llamadas a herramientas de Z.AI. Para deshabilitarlo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Thinking and preserved thinking">
    Z.AI thinking sigue los controles de `/think` de OpenClaw. Con el pensamiento desactivado,
    OpenClaw envía `thinking: { type: "disabled" }` para evitar respuestas que
    gasten el presupuesto de salida en `reasoning_content` antes del texto visible.

    El pensamiento preservado es opcional porque Z.AI requiere que se reproduzca el
    `reasoning_content` histórico completo, lo que aumenta los tokens de aviso. Actívelo
    por modelo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```

    Cuando está activado y el pensamiento está activado, OpenClaw envía
    `thinking: { type: "enabled", clear_thinking: false }` y reproduce el
    `reasoning_content` anterior para la misma transcripción compatible con OpenAI.

    Los usuarios avanzados aún pueden anular la carga útil exacta del proveedor con
    `params.extra_body.thinking`.

  </Accordion>

  <Accordion title="Image understanding">
    El complemento Z.AI incluido registra el entendimiento de imágenes.

    | Property      | Value       |
    | ------------- | ----------- |
    | Model         | `glm-4.6v`  |

    El entendimiento de imágenes se resuelve automáticamente desde la autenticación de Z.AI configurada; no se
    necesita configuración adicional.

  </Accordion>

  <Accordion title="Auth details">
    - Z.AI utiliza autenticación Bearer con su clave de API.
    - La opción de incorporación `zai-api-key` detecta automáticamente el endpoint de Z.AI coincidente sondeando los endpoints compatibles con su clave.
    - Utilice las opciones regionales explícitas (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) cuando desee forzar una superficie de API específica.
    - La variable de entorno heredada `Z_AI_API_KEY` todavía se acepta; OpenClaw la copia a `ZAI_API_KEY` al inicio si `ZAI_API_KEY` no está establecida.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema completo de configuración de OpenClaw, incluyendo la configuración del proveedor y del modelo.
  </Card>
</CardGroup>

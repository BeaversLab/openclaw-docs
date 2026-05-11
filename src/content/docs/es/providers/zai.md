---
summary: "Usar Z.AI (modelos GLM) con OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI es la plataforma de API para los modelos **GLM**. Proporciona las API REST para GLM y utiliza claves de API
para la autenticación. Cree su clave de API en la consola de Z.AI. OpenClaw utiliza el proveedor `zai`
con una clave de API de Z.AI.

- Proveedor: `zai`
- Autenticación: `ZAI_API_KEY`
- API: Z.AI Chat Completions (autenticación Bearer)

## Para empezar

<Tabs>
  <Tab title="Detectar endpoint automáticamente">
    **Lo mejor para:** la mayoría de los usuarios. OpenClaw detecta el endpoint de Z.AI coincidente a partir de la clave y aplica la URL base correcta automáticamente.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider zai
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
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Catálogo integrado

OpenClaw actualmente inicializa el proveedor `zai` incluido con:

| Ref. del modelo      | Notas                 |
| -------------------- | --------------------- |
| `zai/glm-5.1`        | Modelo predeterminado |
| `zai/glm-5`          |                       |
| `zai/glm-5-turbo`    |                       |
| `zai/glm-5v-turbo`   |                       |
| `zai/glm-4.7`        |                       |
| `zai/glm-4.7-flash`  |                       |
| `zai/glm-4.7-flashx` |                       |
| `zai/glm-4.6`        |                       |
| `zai/glm-4.6v`       |                       |
| `zai/glm-4.5`        |                       |
| `zai/glm-4.5-air`    |                       |
| `zai/glm-4.5-flash`  |                       |
| `zai/glm-4.5v`       |                       |

<Tip>
Los modelos GLM están disponibles como `zai/<model>` (ejemplo: `zai/glm-5`). La referencia del modelo incluido por defecto es `zai/glm-5.1`.
</Tip>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Resolución de modelos GLM-5 desconocidos">
    Los ids de `glm-5*` desconocidos aún se resuelven hacia adelante en la ruta del proveedor incluido
    sintetizando metadatos propiedad del proveedor a partir de la plantilla `glm-4.7` cuando el id
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

  <Accordion title="Pensamiento y pensamiento preservado">
    El pensamiento de Z.AI sigue los controles `/think` de OpenClaw. Con el pensamiento desactivado,
    OpenClaw envía `thinking: { type: "disabled" }` para evitar respuestas que
    gasten el presupuesto de salida en `reasoning_content` antes del texto visible.

    El pensamiento preservado es opcional porque Z.AI requiere que se reproduzca
    el `reasoning_content` histórico completo, lo que aumenta los tokens del prompt. Actívelo
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

    Cuando está activado y el pensamiento está encendido, OpenClaw envía
    `thinking: { type: "enabled", clear_thinking: false }` y reproduce el `reasoning_content` anterior
    para la misma transcripción compatible con OpenAI.

    Los usuarios avanzados aún pueden anular la carga útil exacta del proveedor con
    `params.extra_body.thinking`.

  </Accordion>

  <Accordion title="Comprensión de imágenes">
    El plugin Z.AI incluido registra la comprensión de imágenes.

    | Propiedad     | Valor       |
    | ------------- | ----------- |
    | Modelo        | `glm-4.6v`  |

    La comprensión de imágenes se resuelve automáticamente desde la autenticación de Z.AI configurada — no
    se necesita configuración adicional.

  </Accordion>

  <Accordion title="Detalles de autenticación">
    - Z.AI utiliza autenticación Bearer con su clave de API.
    - La opción de incorporación `zai-api-key` detecta automáticamente el punto final de Z.AI coincidente a partir del prefijo de la clave.
    - Utilice las opciones regionales explícitas (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) cuando desee forzar una superficie de API específica.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Familia de modelos GLM" href="/es/providers/glm" icon="microchip">
    Resumen de la familia de modelos para GLM.
  </Card>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>

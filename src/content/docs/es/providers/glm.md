---
summary: "Resumen de la familia de modelos GLM y cómo usarla en OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (Zhipu)"
---

GLM es una familia de modelos (no una empresa) disponible a través de la plataforma [Z.AI](https://z.ai). En OpenClaw, los modelos GLM se acceden mediante el proveedor `zai` incluido con referencias como `zai/glm-5.1`.

| Propiedad                             | Valor                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| ID del proveedor                      | `zai`                                                                       |
| Complemento                           | incluido, `enabledByDefault: true`                                          |
| Variables de entorno de autenticación | `ZAI_API_KEY` o `Z_AI_API_KEY`                                              |
| Opciones de incorporación             | `zai-api-key`, `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn` |
| API                                   | Compatible con OpenAI                                                       |
| URL base predeterminada               | `https://api.z.ai/api/paas/v4`                                              |
| Predeterminado sugerido               | `zai/glm-5.1`                                                               |
| Modelo de imagen predeterminado       | `zai/glm-4.6v`                                                              |

## Primeros pasos

<Steps>
  <Step title="Elige una ruta de autenticación y ejecuta la incorporación">
    Elija la opción de incorporación que coincida con su plan y región de Z.AI. La opción genérica `zai-api-key` detecta automáticamente el punto de conexión correspondiente a partir de la forma de la clave; use las opciones regionales explícitas cuando desee forzar un Plan de Codificación específico o una superficie de API general.

    | Opción de autenticación         | Lo mejor para                                            |
    | ------------------- | --------------------------------------------------- |
    | `zai-api-key`       | Clave de API genérica con detección automática de punto final        |
    | `zai-coding-global` | Usuarios del Plan de Codificación (global)                          |
    | `zai-coding-cn`     | Usuarios del Plan de Codificación (región de China)                    |
    | `zai-global`        | API general (global)                                |
    | `zai-cn`            | API general (región de China)                          |

    <CodeGroup>

```bash Auto-detect
openclaw onboard --auth-choice zai-api-key
```

```bash Coding Plan (global)
openclaw onboard --auth-choice zai-coding-global
```

```bash Coding Plan (China)
openclaw onboard --auth-choice zai-coding-cn
```

```bash General API (global)
openclaw onboard --auth-choice zai-global
```

```bash General API (China)
openclaw onboard --auth-choice zai-cn
```

    </CodeGroup>

  </Step>
  <Step title="Establecer GLM como el modelo predeterminado">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="Verificar que los modelos estén disponibles">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## Ejemplo de configuración

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>`zai-api-key` permite que OpenClaw detecte el punto final de Z.AI coincidente a partir de la forma de la clave y aplique la URL base correcta automáticamente. Utilice las elecciones regionales explícitas cuando desee fijar un Plan de Codificación específico o una superficie de API general.</Tip>

## Catálogo integrado

El proveedor `zai` incluido inicializa 13 referencias de modelos GLM. Todas las entradas admiten razonamiento a menos que se indique lo contrario; `glm-5v-turbo` y `glm-4.6v` aceptan entrada de imagen además de texto.

| Referencia del modelo | Notas                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `zai/glm-5.1`         | Modelo predeterminado. Razonamiento, solo texto, contexto de 202k. |
| `zai/glm-5`           | Razonamiento, solo texto, contexto de 202k.                        |
| `zai/glm-5-turbo`     | Razonamiento, solo texto, contexto de 202k.                        |
| `zai/glm-5v-turbo`    | Razonamiento, texto + imagen, contexto de 202k.                    |
| `zai/glm-4.7`         | Razonamiento, solo texto, contexto de 204k.                        |
| `zai/glm-4.7-flash`   | Razonamiento, solo texto, contexto de 200k.                        |
| `zai/glm-4.7-flashx`  | Razonamiento, solo texto.                                          |
| `zai/glm-4.6`         | Razonamiento, solo texto.                                          |
| `zai/glm-4.6v`        | Razonamiento, texto + imagen. Modelo de imagen predeterminado.     |
| `zai/glm-4.5`         | Razonamiento, solo texto.                                          |
| `zai/glm-4.5-air`     | Razonamiento, solo texto.                                          |
| `zai/glm-4.5-flash`   | Razonamiento, solo texto.                                          |
| `zai/glm-4.5v`        | Razonamiento, texto + imagen.                                      |

<Note>Las versiones y disponibilidad de GLM pueden cambiar. Ejecute `openclaw models list --provider zai` para ver las filas del catálogo conocidas por su versión instalada y consulte la documentación de Z.AI para modelos nuevos o obsoletos.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Detección automática de punto final">
    Cuando usa la opción de autenticación `zai-api-key`, OpenClaw inspecciona la forma de la clave para determinar la URL base correcta de Z.AI. Las opciones regionales explícitas (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) anulan la detección automática y fijan el punto final directamente.
  </Accordion>

  <Accordion title="Detalles del proveedor">
    Los modelos GLM son servidos por el proveedor de tiempo de ejecución `zai`. Para ver la configuración completa del proveedor, los puntos finales regionales y las capacidades adicionales, consulte la [página del proveedor Z.AI](/es/providers/zai).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedor Z.AI" href="/es/providers/zai" icon="server">
    Configuración completa del proveedor Z.AI y puntos finales regionales.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Modos de pensamiento" href="/es/tools/thinking" icon="brain">
    Niveles de `/think` para la familia GLM capaz de razonar.
  </Card>
  <Card title="Preguntas frecuentes sobre modelos" href="/es/help/faq-models" icon="circle-question">
    Perfiles de autenticación, cambio de modelos y resolución de errores "no profile".
  </Card>
</CardGroup>

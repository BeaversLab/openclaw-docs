---
summary: "Resumen de la familia de modelos GLM + cómo usarla en OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (Zhipu)"
---

# Modelos GLM

GLM es una **familia de modelos** (no una empresa) disponible a través de la plataforma Z.AI. En OpenClaw, los modelos GLM
se accede mediante el proveedor `zai` e IDs de modelo como `zai/glm-5`.

## Cómo empezar

<Steps>
  <Step title="Elige una ruta de autenticación y ejecuta el onboarding">
    Elige la opción de onboarding que coincida con tu plan y región de Z.AI:

    | Opción de autenticación | Mejor para |
    | ----------- | -------- |
    | `zai-api-key` | Configuración genérica de clave API con detección automática de endpoint |
    | `zai-coding-global` | Usuarios del Coding Plan (global) |
    | `zai-coding-cn` | Usuarios del Coding Plan (región China) |
    | `zai-global` | API General (global) |
    | `zai-cn` | API General (región China) |

    ```bash
    # Example: generic auto-detect
    openclaw onboard --auth-choice zai-api-key

    # Example: Coding Plan global
    openclaw onboard --auth-choice zai-coding-global
    ```

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

<Tip>`zai-api-key` permite que OpenClaw detecte el endpoint Z.AI coincidente a partir de la clave y aplique la URL base correcta automáticamente. Usa las opciones regionales explícitas cuando quieras forzar un Coding Plan específico o una superficie de API general.</Tip>

## Modelos GLM incluidos

OpenClaw actualmente inicializa el proveedor `zai` incluido con estas referencias GLM:

| Modelo          | Modelo           |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>La referencia del modelo incluido por defecto es `zai/glm-5.1`. Las versiones y disponibilidad de GLM pueden cambiar; consulta la documentación de Z.AI para obtener la más reciente.</Note>

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Detección automática de endpoint">
    Cuando usas la opción de autenticación `zai-api-key`, OpenClaw inspecciona el formato de la clave
    para determinar la URL base correcta de Z.AI. Las opciones regionales explícitas
    (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) anulan
    la detección automática y fijan el endpoint directamente.
  </Accordion>

  <Accordion title="Detalles del proveedor">
    Los modelos GLM son servidos por el proveedor de tiempo de ejecución `zai`. Para ver la configuración completa del proveedor,
    endpoints regionales y capacidades adicionales, consulta
    [documentación del proveedor Z.AI](/es/providers/zai).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedor Z.AI" href="/es/providers/zai" icon="server">
    Configuración completa del proveedor Z.AI y endpoints regionales.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>

---
summary: "Usar modelos de MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

El proveedor MiniMax de OpenClaw utiliza por defecto **MiniMax M2.7**.

MiniMax también proporciona:

- Síntesis de voz incluida a través de T2A v2
- Comprensión de imágenes incluida a través de `MiniMax-VL-01`
- Generación de música incluida a través de `music-2.5+`
- `web_search` incluido a través de la API de búsqueda de MiniMax Coding Plan

División del proveedor:

| ID del proveedor | Autenticación | Capacidades                                                               |
| ---------------- | ------------- | ------------------------------------------------------------------------- |
| `minimax`        | Clave de API  | Texto, generación de imágenes, comprensión de imágenes, voz, búsqueda web |
| `minimax-portal` | OAuth         | Texto, generación de imágenes, comprensión de imágenes                    |

## Línea de modelos

| Modelo                   | Tipo                   | Descripción                                    |
| ------------------------ | ---------------------- | ---------------------------------------------- |
| `MiniMax-M2.7`           | Chat (razonamiento)    | Modelo de razonamiento alojado predeterminado  |
| `MiniMax-M2.7-highspeed` | Chat (razonamiento)    | Nivel de razonamiento M2.7 más rápido          |
| `MiniMax-VL-01`          | Visión                 | Modelo de comprensión de imágenes              |
| `image-01`               | Generación de imágenes | Texto a imagen y edición de imagen a imagen    |
| `music-2.5+`             | Generación de música   | Modelo de música predeterminado                |
| `music-2.5`              | Generación de música   | Nivel anterior de generación de música         |
| `music-2.0`              | Generación de música   | Nivel heredado de generación de música         |
| `MiniMax-Hailuo-2.3`     | Generación de video    | Flujos de texto a video y referencia de imagen |

## Primeros pasos

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="OAuth (Plan de Codificación)">
    **Lo mejor para:** configuración rápida con el MiniMax Coding Plan mediante OAuth, no se requiere clave de API.

    <Tabs>
      <Tab title="Internacional">
        <Steps>
          <Step title="Ejecutar incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            Esto se autentica contra `api.minimax.io`.
          </Step>
          <Step title="Verificar que el modelo está disponible">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Ejecutar incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            Esto se autentica contra `api.minimaxi.com`.
          </Step>
          <Step title="Verificar que el modelo está disponible">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    Las configuraciones de OAuth utilizan el id del proveedor `minimax-portal`. Las referencias de los modelos siguen la forma `minimax-portal/MiniMax-M2.7`.
    </Note>

    <Tip>
    Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="Clave de API">
    **Mejor para:** MiniMax alojado con API compatible con Anthropic.

    <Tabs>
      <Tab title="Internacional">
        <Steps>
          <Step title="Ejecutar incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            Esto configura `api.minimax.io` como la URL base.
          </Step>
          <Step title="Verificar que el modelo esté disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Ejecutar incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            Esto configura `api.minimaxi.com` como la URL base.
          </Step>
          <Step title="Verificar que el modelo esté disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### Ejemplo de configuración

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    En la ruta de transmisión (streaming) compatible con Anthropic, OpenClaw deshabilita el pensamiento de MiniMax de forma predeterminada a menos que establezca explícitamente `thinking` usted mismo. El endpoint de transmisión de MiniMax emite `reasoning_content` en fragmentos delta estilo OpenAI en lugar de bloques de pensamiento nativos de Anthropic, lo que puede filtrar el razonamiento interno en la salida visible si se deja habilitado implícitamente.
    </Warning>

    <Note>
    Las configuraciones con clave de API utilizan el id del proveedor `minimax`. Las referencias de los modelos siguen el formato `minimax/MiniMax-M2.7`.
    </Note>

  </Tab>
</Tabs>

## Configurar vía `openclaw configure`

Use el asistente de configuración interactivo para configurar MiniMax sin editar JSON:

<Steps>
  <Step title="Launch the wizard">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="Seleccionar Modelo/autenticación">
    Elija **Model/auth** en el menú.
  </Step>
  <Step title="Elija una opción de autenticación de MiniMax">
    Elija una de las opciones de MiniMax disponibles:

    | Opción de autenticación | Descripción |
    | --- | --- |
    | `minimax-global-oauth` | OAuth internacional (Plan de codificación) |
    | `minimax-cn-oauth` | OAuth de China (Plan de codificación) |
    | `minimax-global-api` | Clave de API internacional |
    | `minimax-cn-api` | Clave de API de China |

  </Step>
  <Step title="Elija su modelo predeterminado">
    Seleccione su modelo predeterminado cuando se le solicite.
  </Step>
</Steps>

## Capacidades

### Generación de imágenes

El complemento MiniMax registra el modelo `image-01` para la herramienta `image_generate`. Admite:

- **Generación de texto a imagen** con control de relación de aspecto
- **Edición de imagen a imagen** (referencia de sujeto) con control de relación de aspecto
- Hasta **9 imágenes de salida** por solicitud
- Hasta **1 imagen de referencia** por solicitud de edición
- Relaciones de aspecto compatibles: `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

Para usar MiniMax para la generación de imágenes, configúrelo como proveedor de generación de imágenes:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

El complemento utiliza la misma autenticación `MINIMAX_API_KEY` u OAuth que los modelos de texto. No se necesita configuración adicional si MiniMax ya está configurado.

Tanto `minimax` como `minimax-portal` registran `image_generate` con el mismo
modelo `image-01`. Las configuraciones de clave de API usan `MINIMAX_API_KEY`; las configuraciones de OAuth pueden usar
la ruta de autenticación `minimax-portal` incluida en su lugar.

Cuando la incorporación o la configuración de clave de API escribe entradas explícitas de `models.providers.minimax`,
OpenClaw materializa `MiniMax-M2.7` y
`MiniMax-M2.7-highspeed` con `input: ["text", "image"]`.

El catálogo de texto de MiniMax incluido integrado permanece como metadatos solo de texto hasta
que exista esa configuración explícita del proveedor. La comprensión de imágenes se expone por separado
a través del proveedor de medios `MiniMax-VL-01` propiedad del complemento.

<Note>Consulte [Generación de imágenes](/en/tools/image-generation) para ver los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.</Note>

### Generación de música

El complemento `minimax` incluido también registra la generación de música a través de la herramienta compartida
`music_generate`.

- Modelo de música predeterminado: `minimax/music-2.5+`
- También admite `minimax/music-2.5` y `minimax/music-2.0`
- Controles de prompt: `lyrics`, `instrumental`, `durationSeconds`
- Formato de salida: `mp3`
- Las ejecuciones respaldadas por sesión se desacoplan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

Para usar MiniMax como proveedor de música predeterminado:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

<Note>Consulte [Generación de música](/en/tools/music-generation) para ver los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.</Note>

### Generación de video

El complemento `minimax` incluido también registra la generación de video a través de la herramienta compartida
`video_generate`.

- Modelo de video predeterminado: `minimax/MiniMax-Hailuo-2.3`
- Modos: flujos de texto a video y de referencia de imagen única
- Admite `aspectRatio` y `resolution`

Para usar MiniMax como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>Consulte [Generación de video](/en/tools/video-generation) para ver los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.</Note>

### Comprensión de imágenes

El complemento de MiniMax registra la comprensión de imágenes por separado del catálogo
de texto:

| ID del proveedor | Modelo de imagen predeterminado |
| ---------------- | ------------------------------- |
| `minimax`        | `MiniMax-VL-01`                 |
| `minimax-portal` | `MiniMax-VL-01`                 |

Es por eso que el enrutamiento automático de medios puede usar la comprensión de imágenes de MiniMax incluso
cuando el catálogo de proveedores de texto incluido todavía muestra referencias de chat M2.7 solo de texto.

### Búsqueda web

El complemento MiniMax también registra `web_search` a través de la API de búsqueda del Plan de Codificación de MiniMax.

- Id. de proveedor: `minimax`
- Resultados estructurados: títulos, URL, fragmentos, consultas relacionadas
- Variable de entorno preferida: `MINIMAX_CODE_PLAN_KEY`
- Alias de entorno aceptado: `MINIMAX_CODING_API_KEY`
- Respaldo de compatibilidad: `MINIMAX_API_KEY` cuando ya apunta a un token de coding-plan
- Reutilización de región: `plugins.entries.minimax.config.webSearch.region`, luego `MINIMAX_API_HOST`, luego las URL base del proveedor MiniMax
- La búsqueda permanece en el id. de proveedor `minimax`; la configuración de OAuth CN/global aún puede dirigir la región indirectamente a través de `models.providers.minimax-portal.baseUrl`

La configuración reside bajo `plugins.entries.minimax.config.webSearch.*`.

<Note>Consulte [Búsqueda de MiniMax](/en/tools/minimax-search) para obtener la configuración y el uso completos de la búsqueda web.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Opciones de configuración">
    | Opción | Descripción |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | Prefiera `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.api` | Prefiera `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.apiKey` | Clave de API de MiniMax (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | Defina `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost` |
    | `agents.defaults.models` | Asigne alias a los modelos que desee en la lista de permitidos |
    | `models.mode` | Mantenga `merge` si desea agregar MiniMax junto con los integrados |
  </Accordion>

  <Accordion title="Valores predeterminados de pensamiento">
    En `api: "anthropic-messages"`, OpenClaw inyecta `thinking: { type: "disabled" }` a menos que el pensamiento ya esté establecido explícitamente en los parámetros/configuración.

    Esto evita que el punto de conexión de transmisión de MiniMax emita `reasoning_content` en fragmentos delta estilo OpenAI, lo cual filtraría el razonamiento interno en la salida visible.

  </Accordion>

<Accordion title="Modo rápido">`/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed` en la ruta de transmisión compatible con Anthropic.</Accordion>

  <Accordion title="Ejemplo de respaldo">
    **Lo mejor para:** mantener tu modelo más fuerte de última generación como primario, cambiar a MiniMax M2.7 como respaldo. El ejemplo de abajo usa Opus como un primario concreto; cámbialo a tu modelo primario de última generación preferido.

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Detalles de uso del Coding Plan">
    - API de uso de Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de plan de código).
    - OpenClaw normaliza el uso del plan de código de MiniMax al mismo `% left` que utilizan otros proveedores. Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax son cuota restante, no cuota consumida, por lo que OpenClaw los invierte. Los campos basados en conteo tienen prioridad cuando están presentes.
    - Cuando la API devuelve `model_remains`, OpenClaw prefiere la entrada del modelo de chat, deriva la etiqueta de ventana de `start_time` / `end_time` cuando es necesario, e incluye el nombre del modelo seleccionado en la etiqueta del plan para que las ventanas del plan de código sean más fáciles de distinguir.
    - Las instantáneas de uso tratan `minimax`, `minimax-cn` y `minimax-portal` como la misma superficie de cuota de MiniMax, y prefieren el OAuth de MiniMax almacenado antes de recurrir a las variables de entorno de clave de Coding Plan.
  </Accordion>
</AccordionGroup>

## Notas

- Las referencias de modelos siguen la ruta de autenticación:
  - Configuración de clave de API: `minimax/<model>`
  - Configuración de OAuth: `minimax-portal/<model>`
- Modelo de chat predeterminado: `MiniMax-M2.7`
- Modelo de chat alternativo: `MiniMax-M2.7-highspeed`
- La incorporación y la configuración directa de la clave de API escriben definiciones de modelo explícitas con `input: ["text", "image"]` para ambas variantes de M2.7
- El catálogo de proveedores incluido actualmente expone las referencias de chat como metadatos de solo texto hasta que exista una configuración explícita del proveedor MiniMax
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de costos
- Use `openclaw models list` para confirmar el ID del proveedor actual, luego cambie con `openclaw models set minimax/MiniMax-M2.7` o `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>Enlace de referencia para el Plan de Coding de MiniMax (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>Consulte [Model providers](/en/concepts/model-providers) para conocer las reglas del proveedor.</Note>

## Solución de problemas

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M2.7"'>
    Esto generalmente significa que **el proveedor MiniMax no está configurado** (no se encontró ninguna entrada de proveedor coincidente ni ninguna clave de perfil/entorno de autenticación de MiniMax). Una corrección para esta detección está en **2026.1.12**. Solución:

    - Actualizando a **2026.1.12** (o ejecutando desde la fuente `main`) y luego reiniciando la puerta de enlace.
    - Ejecutando `openclaw configure` y seleccionando una opción de autenticación **MiniMax**, o
    - Agregando el bloque `models.providers.minimax` o `models.providers.minimax-portal` coincidente manualmente, o
    - Configurando `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN`, o un perfil de autenticación MiniMax para que se pueda inyectar el proveedor coincidente.

    Asegúrese de que el ID del modelo distinga entre mayúsculas y minúsculas:

    - Ruta de clave de API: `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed`
    - Ruta de OAuth: `minimax-portal/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7-highspeed`

    Luego verifique nuevamente con:

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Troubleshooting](/en/help/troubleshooting) y [FAQ](/en/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/en/tools/image-generation" icon="image">
    Parámetros de la herramienta de imágenes compartidos y selección del proveedor.
  </Card>
  <Card title="Generación de música" href="/en/tools/music-generation" icon="music">
    Parámetros de la herramienta de música compartidos y selección del proveedor.
  </Card>
  <Card title="Generación de vídeo" href="/en/tools/video-generation" icon="video">
    Parámetros de la herramienta de vídeo compartidos y selección del proveedor.
  </Card>
  <Card title="Búsqueda MiniMax" href="/en/tools/minimax-search" icon="magnifying-glass">
    Configuración de búsqueda web mediante MiniMax Coding Plan.
  </Card>
  <Card title="Solución de problemas" href="/en/help/troubleshooting" icon="wrench">
    Solución de problemas generales y preguntas frecuentes.
  </Card>
</CardGroup>

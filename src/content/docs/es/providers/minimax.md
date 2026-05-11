---
summary: "Usar modelos de MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

El proveedor MiniMax de OpenClaw usa por defecto **MiniMax M2.7**.

MiniMax también proporciona:

- Síntesis de voz integrada a través de T2A v2
- Comprensión de imágenes integrada a través de `MiniMax-VL-01`
- Generación de música integrada a través de `music-2.6`
- `web_search` integrado a través de la API de búsqueda MiniMax Coding Plan

División del proveedor:

| ID del proveedor | Autenticación | Capacidades                                                                                                          |
| ---------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `minimax`        | Clave de API  | Texto, generación de imágenes, generación de música, generación de video, comprensión de imágenes, voz, búsqueda web |
| `minimax-portal` | OAuth         | Texto, generación de imágenes, generación de música, generación de video, comprensión de imágenes, voz               |

## Catálogo integrado

| Modelo                   | Tipo                   | Descripción                                    |
| ------------------------ | ---------------------- | ---------------------------------------------- |
| `MiniMax-M2.7`           | Chat (razonamiento)    | Modelo de razonamiento alojado por defecto     |
| `MiniMax-M2.7-highspeed` | Chat (razonamiento)    | Nivel de razonamiento M2.7 más rápido          |
| `MiniMax-VL-01`          | Visión                 | Modelo de comprensión de imágenes              |
| `image-01`               | Generación de imágenes | Edición de texto a imagen e imagen a imagen    |
| `music-2.6`              | Generación de música   | Modelo de música por defecto                   |
| `music-2.5`              | Generación de música   | Nivel anterior de generación de música         |
| `music-2.0`              | Generación de música   | Nivel heredado de generación de música         |
| `MiniMax-Hailuo-2.3`     | Generación de video    | Flujos de texto a video y referencia de imagen |

## Para comenzar

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="OAuth (Plan de Código)">
    **Lo mejor para:** configuración rápida con el Plan de Código de MiniMax a través de OAuth, no se requiere clave de API.

    <Tabs>
      <Tab title="Internacional">
        <Steps>
          <Step title="Ejecutar incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            Esto se autentica contra `api.minimax.io`.
          </Step>
          <Step title="Verificar que el modelo esté disponible">
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
          <Step title="Verificar que el modelo esté disponible">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    Las configuraciones de OAuth utilizan el id de proveedor `minimax-portal`. Las referencias de modelos siguen el formato `minimax-portal/MiniMax-M2.7`.
    </Note>

    <Tip>
    Enlace de referido para el Plan de Código de MiniMax (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="Clave de API">
    **Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

    <Tabs>
      <Tab title="Internacional">
        <Steps>
          <Step title="Ejecutar la incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            Esto configura `api.minimax.io` como la URL base.
          </Step>
          <Step title="Verificar que el modelo está disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Ejecutar la incorporación">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            Esto configura `api.minimaxi.com` como la URL base.
          </Step>
          <Step title="Verificar que el modelo está disponible">
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
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text"],
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
    En la ruta de transmisión (streaming) compatible con Anthropic, OpenClaw desactiva el pensamiento de MiniMax de forma predeterminada a menos que usted establezca explícitamente `thinking` por su cuenta. El punto de conexión de transmisión de MiniMax emite `reasoning_content` en fragmentos delta de estilo OpenAI en lugar de bloques de pensamiento nativos de Anthropic, lo que puede filtrar el razonamiento interno en la salida visible si se deja habilitado implícitamente.
    </Warning>

    <Note>
    Las configuraciones con clave de API utilizan el id de proveedor `minimax`. Las referencias de modelos siguen la forma `minimax/MiniMax-M2.7`.
    </Note>

  </Tab>
</Tabs>

## Configurar vía `openclaw configure`

Use el asistente de configuración interactivo para establecer MiniMax sin editar JSON:

<Steps>
  <Step title="Iniciar el asistente">
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

La generación de imágenes siempre utiliza el punto de conexión dedicado de imágenes de MiniMax
(`/v1/image_generation`) e ignora `models.providers.minimax.baseUrl`,
ya que ese campo configura la URL base del chat/compatible con Anthropic. Establezca
`MINIMAX_API_HOST=https://api.minimaxi.com` para enrutar la generación de imágenes
a través del punto de conexión de CN; el punto de conexión global predeterminado es
`https://api.minimax.io`.

Cuando la incorporación o la configuración de la clave API escribe entradas explícitas de `models.providers.minimax`, OpenClaw materializa `MiniMax-M2.7` y `MiniMax-M2.7-highspeed` como modelos de chat de solo texto. La comprensión de imágenes se expone por separado a través del proveedor de medios `MiniMax-VL-01` propiedad del complemento.

<Note>Vea [Generación de imágenes](/es/tools/image-generation) para los parámetros de herramientas compartidas, la selección del proveedor y el comportamiento de conmutación por error.</Note>

### Texto a voz

El complemento incluido `minimax` registra MiniMax T2A v2 como proveedor de voz para `messages.tts`.

- Modelo TTS predeterminado: `speech-2.8-hd`
- Voz predeterminada: `English_expressive_narrator`
- Los ids de modelos incluidos compatibles incluyen `speech-2.8-hd`, `speech-2.8-turbo`, `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`, `speech-01-hd` y `speech-01-turbo`.
- La resolución de autenticación es `messages.tts.providers.minimax.apiKey`, luego perfiles de autenticación OAuth/token de `minimax-portal`, luego claves de entorno del Plan de Token (`MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`), y luego `MINIMAX_API_KEY`.
- Si no se configura ningún host TTS, OpenClaw reutiliza el host OAuth configurado `minimax-portal` y elimina los sufijos de ruta compatibles con Anthropic como `/anthropic`.
- Los archivos de audio normales se mantienen como MP3.
- Los objetivos de notas de voz como Feishu y Telegram se transcodifican de MiniMax MP3 a Opus de 48 kHz con `ffmpeg`, porque la API de archivos de Feishu/Lark solo acepta `file_type: "opus"` para mensajes de audio nativos.
- MiniMax T2A acepta `speed` y `vol` fraccionarios, pero `pitch` se envía como un entero; OpenClaw trunca los valores `pitch` fraccionarios antes de la solicitud a la API.

| Configuración                            | Var. de entorno        | Predeterminado                | Descripción                                  |
| ---------------------------------------- | ---------------------- | ----------------------------- | -------------------------------------------- |
| `messages.tts.providers.minimax.baseUrl` | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | Host de la API T2A de MiniMax.               |
| `messages.tts.providers.minimax.model`   | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | ID del modelo TTS.                           |
| `messages.tts.providers.minimax.voiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | ID de voz utilizada para la salida de audio. |
| `messages.tts.providers.minimax.speed`   |                        | `1.0`                         | Velocidad de reproducción, `0.5..2.0`.       |
| `messages.tts.providers.minimax.vol`     |                        | `1.0`                         | Volumen, `(0, 10]`.                          |
| `messages.tts.providers.minimax.pitch`   |                        | `0`                           | Cambio de tono entero, `-12..12`.            |

### Generación de música

El plugin MiniMax incluido registra la generación de música a través de la herramienta compartida
`music_generate` tanto para `minimax` como para `minimax-portal`.

- Modelo de música predeterminado: `minimax/music-2.6`
- Modelo de música OAuth: `minimax-portal/music-2.6`
- También admite `minimax/music-2.5` y `minimax/music-2.0`
- Controles del prompt: `lyrics`, `instrumental`, `durationSeconds`
- Formato de salida: `mp3`
- Las ejecuciones respaldadas por sesión se desprenden a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

Para usar MiniMax como proveedor de música predeterminado:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.6",
      },
    },
  },
}
```

<Note>Vea [Generación de música](/es/tools/music-generation) para parámetros de herramientas compartidas, selección de proveedor y comportamiento de conmutación por error.</Note>

### Generación de video

El plugin MiniMax incluido registra la generación de video a través de la herramienta compartida
`video_generate` tanto para `minimax` como para `minimax-portal`.

- Modelo de video predeterminado: `minimax/MiniMax-Hailuo-2.3`
- Modelo de video OAuth: `minimax-portal/MiniMax-Hailuo-2.3`
- Modos: texto a video y flujos de referencia de imagen única
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

<Note>Vea [Generación de video](/es/tools/video-generation) para parámetros de herramientas compartidas, selección de proveedor y comportamiento de conmutación por error.</Note>

### Comprensión de imágenes

El complemento MiniMax registra el reconocimiento de imágenes por separado del catálogo de texto:

| ID del proveedor | Modelo de imagen predeterminado |
| ---------------- | ------------------------------- |
| `minimax`        | `MiniMax-VL-01`                 |
| `minimax-portal` | `MiniMax-VL-01`                 |

Es por eso que el enrutamiento automático de medios puede utilizar el reconocimiento de imágenes de MiniMax incluso cuando el catálogo de proveedores de texto incluido aún muestra referencias de chat M2.7 solo de texto.

### Búsqueda web

El complemento MiniMax también registra `web_search` a través de la API de búsqueda MiniMax Coding Plan.

- ID del proveedor: `minimax`
- Resultados estructurados: títulos, URL, fragmentos, consultas relacionadas
- Variable de entorno preferida: `MINIMAX_CODE_PLAN_KEY`
- Alias de entorno aceptado: `MINIMAX_CODING_API_KEY`
- Respaldo de compatibilidad: `MINIMAX_API_KEY` cuando ya apunta a un token de plan de código (coding-plan)
- Reutilización de región: `plugins.entries.minimax.config.webSearch.region`, luego `MINIMAX_API_HOST`, luego las URL base del proveedor MiniMax
- La búsqueda se mantiene en el ID del proveedor `minimax`; la configuración de OAuth CN/global aún puede dirigir la región indirectamente a través de `models.providers.minimax-portal.baseUrl`

La configuración reside bajo `plugins.entries.minimax.config.webSearch.*`.

<Note>Consulte [Búsqueda MiniMax](/es/tools/minimax-search) para obtener la configuración y el uso completo de la búsqueda web.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Opciones de configuración">
    | Opción | Descripción |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | Prefiera `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.api` | Prefiera `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.apiKey` | Clave de API de MiniMax (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | Definir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost` |
    | `agents.defaults.models` | Poner alias a los modelos que desee en la lista de permitidos |
    | `models.mode` | Mantenga `merge` si desea agregar MiniMax junto con los integrados |
  </Accordion>

  <Accordion title="Valores predeterminados de pensamiento">
    En `api: "anthropic-messages"`, OpenClaw inyecta `thinking: { type: "disabled" }` a menos que el pensamiento ya esté establecido explícitamente en los parámetros/configuración.

    Esto evita que el punto de conexión de transmisión de MiniMax emita `reasoning_content` en fragmentos delta estilo OpenAI, lo que filtraría el razonamiento interno en la salida visible.

  </Accordion>

<Accordion title="Modo rápido">`/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed` en la ruta de transmisión compatible con Anthropic.</Accordion>

  <Accordion title="Ejemplo de respaldo">
    **Lo mejor para:** mantener su modelo más potente de última generación como principal, pasar a MiniMax M2.7 como respaldo. El ejemplo de abajo usa Opus como un principal concreto; cámbielo a su modelo principal de última generación preferido.

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

  <Accordion title="Detalles del uso del Coding Plan">
    - API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de coding plan).
    - OpenClaw normaliza el uso del coding plan de MiniMax al mismo `% left` que utilizan otros proveedores. Los campos `usage_percent` / `usagePercent` de MiniMax son cuota restante, no cuota consumida, por lo que OpenClaw los invierte. Los campos basados en conteo tienen prioridad cuando están presentes.
    - Cuando la API devuelve `model_remains`, OpenClaw prefiere la entrada del modelo de chat, deriva la etiqueta de la ventana de `start_time` / `end_time` cuando es necesario, e incluye el nombre del modelo seleccionado en la etiqueta del plan para que las ventanas del coding plan sean más fáciles de distinguir.
    - Las instantáneas de uso tratan `minimax`, `minimax-cn` y `minimax-portal` como la misma superficie de cuota de MiniMax, y prefieren el OAuth de MiniMax almacenado antes de recurrir a las variables de entorno de la clave del Coding Plan.
  </Accordion>
</AccordionGroup>

## Notas

- Las referencias de modelos siguen la ruta de autenticación:
  - Configuración de clave de API: `minimax/<model>`
  - Configuración de OAuth: `minimax-portal/<model>`
- Modelo de chat predeterminado: `MiniMax-M2.7`
- Modelo de chat alternativo: `MiniMax-M2.7-highspeed`
- La incorporación y la configuración directa de la clave de API escriben definiciones de modelos de solo texto para ambas variantes de M2.7
- La comprensión de imágenes utiliza el proveedor de medios `MiniMax-VL-01` propiedad del complemento
- Actualice los valores de precios en `models.json` si necesita un seguimiento de costos exacto
- Use `openclaw models list` para confirmar el ID del proveedor actual, luego cambie con `openclaw models set minimax/MiniMax-M2.7` o `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>Consulte [Proveedores de modelos](/es/concepts/model-providers) para conocer las reglas del proveedor.</Note>

## Solución de problemas

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M2.7"'>
    Esto generalmente significa que **el proveedor MiniMax no está configurado** (no se encontró ninguna entrada de proveedor coincidente ni ninguna clave de perfil/entorno de autenticación de MiniMax). Una corrección para esta detección está en **2026.1.12**. Solución:

    - Actualizar a **2026.1.12** (o ejecutar desde el código fuente `main`) y luego reiniciar la puerta de enlace.
    - Ejecutar `openclaw configure` y seleccionar una opción de autenticación **MiniMax**, o
    - Agregar el bloque `models.providers.minimax` o `models.providers.minimax-portal` coincidente manualmente, o
    - Configurar `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN` o un perfil de autenticación MiniMax para que se pueda inyectar el proveedor coincidente.

    Asegúrese de que el ID del modelo distinga entre mayúsculas y minúsculas (**case-sensitive**):

    - Ruta de clave de API: `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed`
    - Ruta de OAuth: `minimax-portal/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7-highspeed`

    Luego vuelva a verificar con:

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Image generation" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección de proveedor.
  </Card>
  <Card title="Music generation" href="/es/tools/music-generation" icon="music">
    Parámetros compartidos de la herramienta de música y selección de proveedor.
  </Card>
  <Card title="Video generation" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedor.
  </Card>
  <Card title="Búsqueda de MiniMax" href="/es/tools/minimax-search" icon="magnifying-glass">
    Configuración de búsqueda web a través de MiniMax Coding Plan.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas general y preguntas frecuentes.
  </Card>
</CardGroup>

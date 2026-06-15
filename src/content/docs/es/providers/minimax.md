---
summary: "Usar modelos de MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

El proveedor MiniMax de OpenClaw usa por defecto **MiniMax M3**.

MiniMax también proporciona:

- Síntesis de voz integrada a través de T2A v2
- Comprensión de imágenes integrada a través de `MiniMax-VL-01`
- Generación de música integrada a través de `music-2.6`
- Búsqueda agrupada `web_search` a través de la API de búsqueda del MiniMax Token Plan

División del proveedor:

| ID del proveedor | Autenticación | Capacidades                                                                                                          |
| ---------------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `minimax`        | Clave de API  | Texto, generación de imágenes, generación de música, generación de video, comprensión de imágenes, voz, búsqueda web |
| `minimax-portal` | OAuth         | Texto, generación de imágenes, generación de música, generación de video, comprensión de imágenes, voz               |

## Catálogo integrado

| Modelo                   | Tipo                   | Descripción                                    |
| ------------------------ | ---------------------- | ---------------------------------------------- |
| `MiniMax-M3`             | Chat (razonamiento)    | Modelo de razonamiento alojado por defecto     |
| `MiniMax-M2.7`           | Chat (razonamiento)    | Modelo de razonamiento alojado anterior        |
| `MiniMax-M2.7-highspeed` | Chat (razonamiento)    | Nivel de razonamiento M2.7 más rápido          |
| `MiniMax-VL-01`          | Visión                 | Modelo de comprensión de imágenes              |
| `image-01`               | Generación de imágenes | Edición de texto a imagen e imagen a imagen    |
| `music-2.6`              | Generación de música   | Modelo de música predeterminado                |
| `music-2.5`              | Generación de música   | Nivel de generación de música anterior         |
| `music-2.0`              | Generación de música   | Nivel de generación de música heredado         |
| `MiniMax-Hailuo-2.3`     | Generación de video    | Flujos de texto a video y referencia de imagen |

## Comenzando

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="OAuth (Plan de desarrollo)">
    **Lo mejor para:** configuración rápida con el Plan de desarrollo de MiniMax a través de OAuth, no se requiere clave de API.

    <Tabs>
      <Tab title="Internacional">
        <Steps>
          <Step title="Ejecutar integración">
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
          <Step title="Ejecutar integración">
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
    Las configuraciones de OAuth usan el ID de proveedor `minimax-portal`. Las referencias de modelos siguen el formato `minimax-portal/MiniMax-M3`.
    </Note>

    <Tip>
    Enlace de referencia para el Plan de desarrollo de MiniMax (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="API key">
    **Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

    <Tabs>
      <Tab title="International">
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
      agents: { defaults: { model: { primary: "minimax/MiniMax-M3" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
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
    En la ruta de transmisión (streaming) compatible con Anthropic, OpenClaw deshabilita el pensamiento de MiniMax de forma predeterminada a menos que usted establezca explícitamente `thinking`. El endpoint de transmisión de MiniMax emite `reasoning_content` en fragmentos delta estilo OpenAI en lugar de bloques de pensamiento nativos de Anthropic, lo que puede filtrar el razonamiento interno en la salida visible si se deja habilitado implícitamente.
    </Warning>

    <Note>
    Las configuraciones con API key usan el id de proveedor `minimax`. Las referencias de modelos siguen la forma `minimax/MiniMax-M3`.
    </Note>

  </Tab>
</Tabs>

## Configurar vía `openclaw configure`

Use el asistente de configuración interactivo para configurar MiniMax sin editar JSON:

<Steps>
  <Step title="Iniciar el asistente">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="Seleccionar Modelo/auth">
    Elija **Modelo/auth** del menú.
  </Step>
  <Step title="Elija una opción de autenticación de MiniMax">
    Elija una de las opciones disponibles de MiniMax:

    | Elección de autenticación | Descripción |
    | --- | --- |
    | `minimax-global-oauth` | OAuth internacional (Coding Plan) |
    | `minimax-cn-oauth` | OAuth China (Coding Plan) |
    | `minimax-global-api` | Clave de API internacional |
    | `minimax-cn-api` | Clave de API China |

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

El complemento utiliza el mismo `MINIMAX_API_KEY` o autenticación OAuth que los modelos de texto. No se necesita configuración adicional si MiniMax ya está configurado.

Tanto `minimax` como `minimax-portal` registran `image_generate` con el mismo
modelo `image-01`. Las configuraciones de clave de API usan `MINIMAX_API_KEY`; las configuraciones de OAuth pueden usar
la ruta de autenticación `minimax-portal` integrada en su lugar.

La generación de imágenes siempre utiliza el endpoint dedicado de imágenes de MiniMax
(`/v1/image_generation`) e ignora `models.providers.minimax.baseUrl`,
ya que este campo configura la URL base compatible con chat/Anthropic. Establezca
`MINIMAX_API_HOST=https://api.minimaxi.com` para enrutar la generación de imágenes
a través del endpoint CN; el endpoint global predeterminado es
`https://api.minimax.io`.

Cuando el proceso de incorporación o la configuración de la clave de API escribe entradas explícitas de `models.providers.minimax`, OpenClaw materializa `MiniMax-M3`, `MiniMax-M2.7` y `MiniMax-M2.7-highspeed` como modelos de chat. M3 anuncia entrada de texto e imagen; la comprensión de imágenes sigue expuesta por separado a través del proveedor de medios `MiniMax-VL-01` propiedad del complemento.

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para conocer los parámetros de herramientas compartidos, la selección del proveedor y el comportamiento de conmutación por error.</Note>

### Texto a voz

El complemento `minimax` incluido registra MiniMax T2A v2 como proveedor de voz para `messages.tts`.

- Modelo TTS predeterminado: `speech-2.8-hd`
- Voz predeterminada: `English_expressive_narrator`
- Los identificadores de modelos incluidos admitidos incluyen `speech-2.8-hd`, `speech-2.8-turbo`,
  `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`,
  `speech-02-turbo`, `speech-01-hd` y `speech-01-turbo`.
- La resolución de autenticación es `messages.tts.providers.minimax.apiKey`, luego
  los perfiles de autenticación OAuth/token de `minimax-portal`, luego las claves de entorno del Plan de Token
  (`MINIMAX_OAUTH_TOKEN`, `MINIMAX_CODE_PLAN_KEY`,
  `MINIMAX_CODING_API_KEY`), y luego `MINIMAX_API_KEY`.
- Si no se configura ningún host TTS, OpenClaw reutiliza el host OAuth configurado
  `minimax-portal` y elimina los sufijos de ruta compatibles con Anthropic
  como `/anthropic`.
- Los archivos de audio adjuntos normales se mantienen como MP3.
- Los objetivos de notas de voz como Feishu y Telegram se transcodifican desde MiniMax
  MP3 a Opus de 48kHz con `ffmpeg`, porque la API de archivos de Feishu/Lark solo
  acepta `file_type: "opus"` para mensajes de audio nativos.
- MiniMax T2A acepta `speed` y `vol` fraccionarios, pero `pitch` se envía como un
  entero; OpenClaw trunca los valores fraccionarios de `pitch` antes de la solicitud a la API.

| Configuración                                   | Var. de entorno        | Predeterminado                | Descripción                                  |
| ----------------------------------------------- | ---------------------- | ----------------------------- | -------------------------------------------- |
| `messages.tts.providers.minimax.baseUrl`        | `MINIMAX_API_HOST`     | `https://api.minimax.io`      | Host de la API de MiniMax T2A.               |
| `messages.tts.providers.minimax.model`          | `MINIMAX_TTS_MODEL`    | `speech-2.8-hd`               | ID del modelo TTS.                           |
| `messages.tts.providers.minimax.speakerVoiceId` | `MINIMAX_TTS_VOICE_ID` | `English_expressive_narrator` | ID de voz utilizada para la salida de audio. |
| `messages.tts.providers.minimax.speed`          |                        | `1.0`                         | Velocidad de reproducción, `0.5..2.0`.       |
| `messages.tts.providers.minimax.vol`            |                        | `1.0`                         | Volumen, `(0, 10]`.                          |
| `messages.tts.providers.minimax.pitch`          |                        | `0`                           | Desplazamiento de tono entero, `-12..12`.    |

### Generación de música

El complemento incluido de MiniMax registra la generación de música a través de la herramienta compartida `music_generate` para tanto `minimax` como `minimax-portal`.

- Modelo de música predeterminado: `minimax/music-2.6`
- Modelo de música OAuth: `minimax-portal/music-2.6`
- También soporta `minimax/music-2.5` y `minimax/music-2.0`
- Controles de prompt: `lyrics`, `instrumental`
- Formato de salida: `mp3`
- Las ejecuciones respaldadas por sesión se desvinculan a través del flujo compartido de tarea/estado, incluyendo `action: "status"`

Para usar MiniMax como el proveedor de música predeterminado:

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

<Note>Consulte [Music Generation](/es/tools/music-generation) para ver los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.</Note>

### Generación de video

El complemento incluido de MiniMax registra la generación de video a través de la herramienta compartida `video_generate` para tanto `minimax` como `minimax-portal`.

- Modelo de video predeterminado: `minimax/MiniMax-Hailuo-2.3`
- Modelo de video OAuth: `minimax-portal/MiniMax-Hailuo-2.3`
- Modos: flujos de texto a video y referencia de imagen única
- Soporta `aspectRatio` y `resolution`

Para usar MiniMax como el proveedor de video predeterminado:

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

<Note>Consulte [Video Generation](/es/tools/video-generation) para ver los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.</Note>

### Comprensión de imágenes

El complemento MiniMax registra la comprensión de imágenes por separado del catálogo de texto:

| ID del proveedor | Modelo de imagen predeterminado |
| ---------------- | ------------------------------- |
| `minimax`        | `MiniMax-VL-01`                 |
| `minimax-portal` | `MiniMax-VL-01`                 |

Es por eso que el enrutamiento automático de medios puede utilizar la comprensión de imágenes de MiniMax incluso cuando el catálogo de proveedores de texto incluido también contiene referencias de chat con capacidades de imagen M3.

### Búsqueda web

El complemento MiniMax también registra `web_search` a través de la API de búsqueda del plan de tokens de MiniMax.

- ID del proveedor: `minimax`
- Resultados estructurados: títulos, URL, fragmentos, consultas relacionadas
- Variable de entorno preferida: `MINIMAX_CODE_PLAN_KEY`
- Alias de entorno aceptados: `MINIMAX_CODING_API_KEY`, `MINIMAX_OAUTH_TOKEN`
- Alternativa de compatibilidad: `MINIMAX_API_KEY` cuando ya apunta a una credencial de plan de tokens
- Reutilización de región: `plugins.entries.minimax.config.webSearch.region`, luego `MINIMAX_API_HOST`, luego las URL base del proveedor MiniMax
- La búsqueda se mantiene en el ID del proveedor `minimax`; la configuración de OAuth CN/global puede dirigir la región indirectamente a través de `models.providers.minimax-portal.baseUrl` y puede proporcionar autenticación de portador a través de `MINIMAX_OAUTH_TOKEN`

La configuración reside bajo `plugins.entries.minimax.config.webSearch.*`.

<Note>Consulte [Búsqueda de MiniMax](/es/tools/minimax-search) para obtener la configuración y el uso completo de la búsqueda web.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Opciones de configuración">
    | Opción | Descripción |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | Se prefiere `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.api` | Se prefiere `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI |
    | `models.providers.minimax.apiKey` | Clave de API de MiniMax (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | Definir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost` |
    | `agents.defaults.models` | Alias de modelos que deseas en la lista de permitidos |
    | `models.mode` | Mantén `merge` si deseas agregar MiniMax junto a los integrados |
  </Accordion>

  <Accordion title="Valores predeterminados de razonamiento">
    En `api: "anthropic-messages"`, OpenClaw inyecta `thinking: { type: "disabled" }` a menos que el razonamiento ya esté establecido explícitamente en los parámetros/configuración.

    Esto evita que el endpoint de transmisión de MiniMax emita `reasoning_content` en fragmentos delta estilo OpenAI, lo que filtraría el razonamiento interno en la salida visible.

  </Accordion>

<Accordion title="Modo rápido">`/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a `MiniMax-M2.7-highspeed` en la ruta de transmisión compatible con Anthropic.</Accordion>

  <Accordion title="Ejemplo de respaldo">
    **Lo mejor para:** mantener tu modelo de última generación más potente como principal, recurrir a MiniMax M2.7. El ejemplo de abajo usa Opus como principal concreto; cámbialo a tu modelo principal de última generación preferido.

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
    - API de uso del Coding Plan: `https://api.minimaxi.com/v1/token_plan/remains` o `https://api.minimax.io/v1/token_plan/remains` (requiere una clave de coding plan).
    - La consulta de uso deriva el host de `models.providers.minimax-portal.baseUrl` o `models.providers.minimax.baseUrl` cuando está configurado, por lo que las configuraciones globales que usan `https://api.minimax.io/anthropic` consultan `api.minimax.io`. Las URL base faltantes o malformadas mantienen la alternativa de CN por compatibilidad.
    - OpenClaw normaliza el uso del coding plan de MiniMax al mismo formato de visualización `% left` que utilizan otros proveedores. Los campos `usage_percent` / `usagePercent` sin procesar de MiniMax son cuota restante, no cuota consumida, por lo que OpenClaw los invierte. Los campos basados en conteo tienen prioridad cuando están presentes.
    - Cuando la API devuelve `model_remains`, OpenClaw prefiere la entrada del modelo de chat, deriva la etiqueta de la ventana de `start_time` / `end_time` cuando es necesario, e incluye el nombre del modelo seleccionado en la etiqueta del plan para que las ventanas del coding plan sean más fáciles de distinguir.
    - Las instantáneas de uso tratan `minimax`, `minimax-cn` y `minimax-portal` como la misma superficie de cuota de MiniMax, y prefieren el OAuth de MiniMax almacenado antes de recurrir a las variables de entorno de la clave del Coding Plan.

  </Accordion>
</AccordionGroup>

## Notas

- Las referencias de modelos siguen la ruta de autenticación:
  - Configuración de clave de API: `minimax/<model>`
  - Configuración de OAuth: `minimax-portal/<model>`
- Modelo de chat predeterminado: `MiniMax-M3`
- Modelos de chat alternativos: `MiniMax-M2.7`, `MiniMax-M2.7-highspeed`
- La incorporación y la configuración directa de la clave de API escriben las definiciones de los modelos para M3 y ambas variantes de M2.7
- La comprensión de imágenes utiliza el proveedor de medios `MiniMax-VL-01` propiedad del complemento
- Actualice los valores de precios en `models.json` si necesita un seguimiento exacto de los costos
- Use `openclaw models list` para confirmar el id del proveedor actual, luego cambie con `openclaw models set minimax/MiniMax-M3` o `openclaw models set minimax-portal/MiniMax-M3`

<Tip>Enlace de referencia para el MiniMax Coding Plan (10% de descuento): [MiniMax Coding Plan](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>Consulte [Proveedores de modelos](/es/concepts/model-providers) para conocer las reglas de los proveedores.</Note>

## Solución de problemas

<AccordionGroup>
  <Accordion title='"Unknown model: minimax/MiniMax-M3"'>
    Esto generalmente significa que **el proveedor de MiniMax no está configurado** (no se encontró una entrada de proveedor coincidente ni una clave de perfil/entorno de autenticación de MiniMax). Una corrección para esta detección está en **2026.1.12**. Solución:

    - Actualizar a **2026.1.12** (o ejecutar desde el código fuente `main`) y luego reiniciar la puerta de enlace.
    - Ejecutar `openclaw configure` y seleccionar una opción de autenticación de **MiniMax**, o
    - Agregar manualmente el bloque `models.providers.minimax` o `models.providers.minimax-portal` correspondiente, o
    - Establecer `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN` o un perfil de autenticación de MiniMax para que se pueda inyectar el proveedor correspondiente.

    Asegúrese de que el ID del modelo sea **sensible a mayúsculas y minúsculas**:

    - Ruta de clave de API: `minimax/MiniMax-M3`, `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed`
    - Ruta de OAuth: `minimax-portal/MiniMax-M3`, `minimax-portal/MiniMax-M2.7` o `minimax-portal/MiniMax-M2.7-highspeed`

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
    Selección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Image generation" href="/es/tools/image-generation" icon="image">
    Parámetros de herramienta de imagen compartida y selección de proveedor.
  </Card>
  <Card title="Music generation" href="/es/tools/music-generation" icon="music">
    Parámetros de herramienta de música compartida y selección de proveedor.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Búsqueda de MiniMax" href="/es/tools/minimax-search" icon="magnifying-glass">
    Configuración de búsqueda web a través del MiniMax Token Plan.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución general de problemas y preguntas frecuentes.
  </Card>
</CardGroup>

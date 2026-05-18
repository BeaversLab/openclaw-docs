---
summary: "Usar los modelos Grok de xAI en OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw incluye un complemento de proveedor `xai` para los modelos Grok.

## Para empezar

<Steps>
  <Step title="Elegir autenticación">
    Use una clave API de la [consola de xAI](https://console.x.ai/) o
    xAI Grok OAuth con una suscripción SuperGrok.
  </Step>
  <Step title="Iniciar sesión">
    Establezca `XAI_API_KEY`, ejecute el asistente de clave API o inicie el flujo OAuth:

    ```bash
    openclaw onboard --auth-choice xai-api-key
    openclaw onboard --auth-choice xai-oauth
    openclaw models auth login --provider xai --method oauth
    ```

  </Step>
  <Step title="Elija un modelo">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utiliza la API de Responses de xAI como el transporte xAI incluido. La misma credencial de `openclaw onboard --auth-choice xai-api-key` o `openclaw onboard --auth-choice xai-oauth` también puede potenciar `x_search` de primera clase, `code_execution` remota y la generación de imágenes/vídeo de xAI. El habla y la transcripción actualmente requieren `XAI_API_KEY` o configuración del
  proveedor. `XAI_API_KEY` o la configuración de búsqueda web del complemento también pueden potenciar `web_search` con Grok. Si almacena una clave de xAI en `plugins.entries.xai.config.webSearch.apiKey`, el proveedor de modelos xAI incluido reutiliza esa clave como alternativa. Establezca `plugins.entries.xai.config.webSearch.baseUrl` para enrutar `web_search` de Grok y, por defecto, `x_search` a
  través de un proxy de Responses de xAI del operador. El ajuste de `code_execution` se encuentra en `plugins.entries.xai.config.codeExecution`.
</Note>

## Catálogo integrado

OpenClaw incluye los modelos de chat actuales de xAI de serie, ordenados de los más
recientes a los más antiguos en los selectores de modelos:

| Familia        | IDs de modelo                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

El complemento todavía resuelve hacia adelante los slugs antiguos de Grok 3, Grok 4, Grok 4 Fast, Grok 4.1
Fast y Grok Code para configuraciones existentes, pero OpenClaw ya no muestra
esos slugs ascendentes retirados en el catálogo seleccionable.

<Tip>Use `grok-4.3` para nuevas cargas de trabajo de chat y codificación a menos que necesite explícitamente un alias beta de Grok 4.20.</Tip>

## Cobertura de características de OpenClaw

El complemento incluido asigna la superficie de la API pública actual de xAI a los contratos
compartidos de proveedor y herramientas de OpenClaw. Las capacidades que no se ajustan al contrato compartido
(por ejemplo, TTS en tiempo real y voz en tiempo real) no están expuestas: consulte la tabla
a continuación.

| Capacidad de xAI                          | Superficie de OpenClaw                             | Estado                                                                       |
| ----------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Chat / Responses                          | proveedor de modelo `xai/<model>`                  | Sí                                                                           |
| Búsqueda web del lado del servidor        | proveedor `web_search` `grok`                      | Sí                                                                           |
| Búsqueda X del lado del servidor          | herramienta `x_search`                             | Sí                                                                           |
| Ejecución de código del lado del servidor | herramienta `code_execution`                       | Sí                                                                           |
| Imágenes                                  | `image_generate`                                   | Sí                                                                           |
| Videos                                    | `video_generate`                                   | Sí                                                                           |
| Conversión de texto a voz por lotes       | `messages.tts.provider: "xai"` / `tts`             | Sí                                                                           |
| TTS en transmisión                        | -                                                  | No expuesto; el contrato TTS de OpenClaw devuelve búferes de audio completos |
| Conversión de voz a texto por lotes       | `tools.media.audio` / comprensión de medios        | Sí                                                                           |
| Conversión de voz a texto en transmisión  | Llamada de voz `streaming.provider: "xai"`         | Sí                                                                           |
| Voz en tiempo real                        | -                                                  | Aún no expuesto; contrato de sesión/WebSocket diferente                      |
| Archivos / lotes                          | Solo compatibilidad con la API genérica de modelos | No es una herramienta de primera clase de OpenClaw                           |

<Note>
  OpenClaw utiliza las API REST de imagen/video/TTS/STT de xAI para la generación de medios, voz y transcripción por lotes, el WebSocket STT en transmisión de xAI para la transcripción en vivo de llamadas de voz, y la API Responses para el modelo, búsqueda y herramientas de ejecución de código. Las funciones que necesitan contratos diferentes de OpenClaw, como las sesiones de voz en tiempo real,
  se documentan aquí como capacidades de origen en lugar de como comportamiento oculto del complemento.
</Note>

### Asignaciones de modo rápido

`/fast on` o `agents.defaults.models["xai/<model>"].params.fastMode: true`
reescribe las solicitudes nativas de xAI de la siguiente manera:

| Modelo de origen | Destino de modo rápido |
| ---------------- | ---------------------- |
| `grok-3`         | `grok-3-fast`          |
| `grok-3-mini`    | `grok-3-mini-fast`     |
| `grok-4`         | `grok-4-fast`          |
| `grok-4-0709`    | `grok-4-fast`          |

### Alias de compatibilidad heredados

Los alias heredados aún se normalizan a los identificadores canónicos incluidos:

| Alias heredado            | Id. canónico                          |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Características

<AccordionGroup>
  <Accordion title="Búsqueda web">
    El proveedor de búsqueda web `grok` incluido puede usar `XAI_API_KEY` o una
    clave de búsqueda web de complemento:

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Generación de video">
    El complemento `xai` incluido registra la generación de video a través de la herramienta
    compartida `video_generate`.

    - Modelo de video predeterminado: `xai/grok-imagine-video`
    - Modos: texto a video, imagen a video, generación de imagen de referencia, edición
      de video remota y extensión de video remota
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Resoluciones: `480P`, `720P`
    - Duración: 1-15 segundos para generación/imagen a video, 1-10 segundos al
      usar roles `reference_image`, 2-10 segundos para extensión
    - Generación de imagen de referencia: establezca `imageRoles` en `reference_image` para
      cada imagen proporcionada; xAI acepta hasta 7 imágenes de este tipo

    <Warning>
    No se aceptan búferes de video locales. Utilice URL `http(s)` remotas para
    entradas de edición/extensión de video. Imagen a video acepta búferes de imagen locales porque
    OpenClaw puede codificarlos como URL de datos para xAI.
    </Warning>

    Para usar xAI como proveedor de video predeterminado:

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    Consulte [Video Generation](/es/tools/video-generation) para ver los parámetros de la herramienta compartida,
    la selección del proveedor y el comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="Generación de imágenes">
    El complemento incluido `xai` registra la generación de imágenes a través de la herramienta
    compartida `image_generate`.

    - Modelo de imagen predeterminado: `xai/grok-imagine-image`
    - Modelo adicional: `xai/grok-imagine-image-quality`
    - Modos: texto a imagen y edición de imagen de referencia
    - Entradas de referencia: una `image` o hasta cinco `images`
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resoluciones: `1K`, `2K`
    - Cantidad: hasta 4 imágenes

    OpenClaw solicita a xAI respuestas de imagen `b64_json` para que los medios generados puedan ser
    almacenados y entregados a través de la ruta normal de archivos adjuntos del canal. Las imágenes de
    referencia locales se convierten a URL de datos; las referencias remotas `http(s)` se
    pasan directamente.

    Para usar xAI como proveedor de imágenes predeterminado:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "xai/grok-imagine-image",
          },
        },
      },
    }
    ```

    <Note>
    xAI también documenta `quality`, `mask`, `user`, y relaciones nativas adicionales
    tales como `1:2`, `2:1`, `9:20`, y `20:9`. OpenClaw reenvía hoy solo los
    controles de imagen compartidos entre proveedores; los controles nativos no soportados
    intencionalmente no se exponen a través de `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Texto a voz">
    El complemento `xai` incluido registra la conversión de texto a voz a través de la superficie del proveedor `tts` compartida.

    - Voces: `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voz predeterminada: `eve`
    - Formatos: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Idioma: código BCP-47 o `auto`
    - Velocidad: anulación de velocidad nativa del proveedor
    - El formato de nota de voz nativo Opus no es compatible

    Para usar xAI como el proveedor de TTS predeterminado:

    ```json5
    {
      messages: {
        tts: {
          provider: "xai",
          providers: {
            xai: {
              voiceId: "eve",
            },
          },
        },
      },
    }
    ```

    <Note>
    OpenClaw utiliza el endpoint por lotes `/v1/tts` de xAI. xAI también ofrece TTS en streaming
    a través de WebSocket, pero el contrato del proveedor de voz de OpenClaw actualmente espera
    un búfer de audio completo antes de la entrega de la respuesta.
    </Note>

  </Accordion>

  <Accordion title="Voz a texto">
    El complemento `xai` incluido registra la transcripción de voz a texto por lotes a través de la superficie de
    transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `grok-stt`
    - Endpoint: xAI REST `/v1/stt`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw dondequiera que se use la transcripción de audio entrante
      `tools.media.audio`, incluidos los segmentos del canal de voz de Discord y
      los archivos de audio adjuntos del canal

    Para forzar xAI para la transcripción de audio entrante:

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "xai",
                model: "grok-stt",
              },
            ],
          },
        },
      },
    }
    ```

    El idioma se puede proporcionar a través de la configuración de medios de audio compartida o por solicitud de
    transcripción por llamada. Las sugerencias de prompt son aceptadas por la superficie compartida de OpenClaw,
    pero la integración xAI REST STT solo reenvía archivo, modelo e
    idioma porque esos se asignan limpiamente al endpoint público actual de xAI.

  </Accordion>

  <Accordion title="Transmisión de voz a texto">
    El complemento `xai` incluido también registra un proveedor de transcripción en tiempo real
    para el audio de llamadas de voz en vivo.

    - Endpoint: WebSocket `wss://api.x.ai/v1/stt` de xAI
    - Codificación predeterminada: `mulaw`
    - Tasa de muestreo predeterminada: `8000`
    - Segmentación de endpoint predeterminada: `800ms`
    - Transcripciones provisionales: habilitadas de forma predeterminada

    El flujo de medios de Twilio de Voice Call envía tramas de audio G.711 µ-law, por lo que
    el proveedor de xAI puede reenviar esas tramas directamente sin transcodificación:

    ```json5
    {
      plugins: {
        entries: {
          "voice-call": {
            config: {
              streaming: {
                enabled: true,
                provider: "xai",
                providers: {
                  xai: {
                    apiKey: "${XAI_API_KEY}",
                    endpointingMs: 800,
                    language: "en",
                  },
                },
              },
            },
          },
        },
      },
    }
    ```

    La configuración propiedad del proveedor reside en
    `plugins.entries.voice-call.config.streaming.providers.xai`. Las claves admitidas
    son `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw` o
    `alaw`), `interimResults`, `endpointingMs` y `language`.

    <Note>
    Este proveedor de transmisión es para la ruta de transcripción en tiempo real de Voice Call.
    La voz de Discord actualmente graba segmentos cortos y utiliza la ruta de transcripción por lotes
    `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="configuración de x_search">
    El complemento xAI incluido expone `x_search` como una herramienta de OpenClaw para buscar
    contenido de X (anteriormente Twitter) a través de Grok.

    Ruta de configuración: `plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | Habilitar o deshabilitar x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes x_search     |
    | `baseUrl`          | string  | -                  | Sobrescritura de la URL base de xAI Responses      |
    | `inlineCitations`  | boolean | -                  | Incluir citas entre líneas en los resultados  |
    | `maxTurns`         | number  | -                  | Máximo de turnos de conversación           |
    | `timeoutSeconds`   | number  | -                  | Tiempo de espera de la solicitud en segundos           |
    | `cacheTtlMinutes`  | number  | -                  | Tiempo de vida de la caché en minutos        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                baseUrl: "https://api.x.ai/v1",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuración de ejecución de código">
    El complemento xAI incluido expone `code_execution` como una herramienta de OpenClaw para
    la ejecución remota de código en el entorno de espacio aislado (sandbox) de xAI.

    Ruta de configuración: `plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si la clave está disponible) | Habilitar o deshabilitar la ejecución de código  |
    | `model`           | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes de ejecución de código   |
    | `maxTurns`        | number  | -                  | Máximo de turnos de conversación               |
    | `timeoutSeconds`  | number  | -                  | Tiempo de espera de la solicitud en segundos               |

    <Note>
    Esta es ejecución remota en el espacio aislado (sandbox) de xAI, no [`exec`](/es/tools/exec) local.
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Límites conocidos">
  - La autenticación de xAI puede usar una clave de API, una variable de entorno, una configuración alternativa del complemento, o xAI Grok OAuth con una suscripción SuperGrok. OAuth utiliza una devolución de llamada local en `127.0.0.1:56121`; para hosts remotos, reenvíe ese puerto antes de abrir la URL de inicio de sesión. - `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la
  ruta normal del proveedor xAI porque requiere una superficie de API ascendente diferente que el transporte estándar de xAI en OpenClaw. - La voz en tiempo real de xAI aún no está registrada como proveedor de OpenClaw. Necesita un contrato de sesión de voz bidireccional diferente que la transcripción STT por lotes o la transcripción en streaming. - La imagen `quality` de xAI, la imagen `mask` y
  las relaciones de aspecto adicionales solo nativas no están expuestas hasta que la herramienta compartida `image_generate` tenga los controles correspondientes entre proveedores.
</Accordion>

  <Accordion title="Notas avanzadas">
    - OpenClaw aplica correcciones de compatibilidad específicas de xAI para el esquema de herramientas y las llamadas a herramientas
      automáticamente en la ruta del ejecutor compartido.
    - Las solicitudes nativas de xAI usan `tool_stream: true` de forma predeterminada. Establezca
      `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
      desactivarlo.
    - El contenedor xAI incluido elimina las marcas no compatibles de esquema de herramientas estrictas
      y las claves de carga útil de razonamiento antes de enviar solicitudes nativas de xAI.
    - `web_search`, `x_search` y `code_execution` se exponen como herramientas de OpenClaw.
      OpenClaw activa la función integrada específica de xAI que necesita dentro de cada solicitud de herramienta
      en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
    - Grok `web_search` lee `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lee `plugins.entries.xai.config.xSearch.baseUrl` y luego
      vuelve a la URL base de búsqueda web de Grok.
    - `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar de
      estar codificados en el tiempo de ejecución del modelo central.
    - `code_execution` es la ejecución en sandbox remota de xAI, no la ejecución local
      [`exec`](/es/tools/exec).
  </Accordion>
</AccordionGroup>

## Pruebas en vivo

Las rutas de medios de xAI están cubiertas por pruebas unitarias y conjuntos de pruebas en vivo opcionales. Exporte `XAI_API_KEY` en el entorno del proceso antes de ejecutar sondas en vivo.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

El archivo en vivo específico del proveedor sintetiza TTS normal, TTS PCM apto para telefonía, transcribe audio a través del STT por lotes de xAI, transmite el mismo PCM a través del STT en tiempo real de xAI, genera salida de texto a imagen y edita una imagen de referencia. El archivo de imagen compartido en vivo verifica el mismo proveedor xAI a través de la selección en tiempo de ejecución, el respaldo, la normalización y la ruta de archivos adjuntos de medios de OpenClaw.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros de la herramienta de video compartida y selección del proveedor.
  </Card>
  <Card title="Todos los proveedores" href="/es/providers/index" icon="grid-2">
    La visión general general de proveedores.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y soluciones.
  </Card>
</CardGroup>

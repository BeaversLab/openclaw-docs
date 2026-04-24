---
summary: "Usar los modelos Grok de xAI en OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw incluye un complemento de proveedor `xai` para modelos Grok.

## Introducción

<Steps>
  <Step title="Crear una clave de API">
    Cree una clave de API en la [consola de xAI](https://console.x.ai/).
  </Step>
  <Step title="Configure su clave de API">
    Establezca `XAI_API_KEY` o ejecute:

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="Elija un modelo">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utiliza la API de Respuestas de xAI como el transporte xAI incluido. La misma `XAI_API_KEY` también puede potenciar `web_search` con respaldo de Grok, `x_search` de primera clase y `code_execution` remotos. Si almacena una clave de xAI en `plugins.entries.xai.config.webSearch.apiKey`, el proveedor de modelos xAI incluido también reutiliza esa clave como alternativa. El ajuste de
  `code_execution` se encuentra en `plugins.entries.xai.config.codeExecution`.
</Note>

## Catálogo de modelos incluidos

OpenClaw incluye estas familias de modelos xAI de fábrica:

| Familia        | IDs de modelo                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

El complemento también resuelve hacia adelante los IDs de `grok-4*` y `grok-code-fast*` más recientes cuando
siguen la misma forma de API.

<Tip>`grok-4-fast`, `grok-4-1-fast` y las variantes `grok-4.20-beta-*` son las referencias de Grok con capacidad de imagen actuales en el catálogo incluido.</Tip>

## Cobertura de características de OpenClaw

El complemento incluido asigna la superficie de la API pública actual de xAI a los contratos
compartidos de proveedor y herramientas de OpenClaw donde el comportamiento se ajusta correctamente.

| Capacidad de xAI                            | Superficie de OpenClaw                            | Estado                                                                       |
| ------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Chat / Respuestas                           | proveedor de modelos `xai/<model>`                | Sí                                                                           |
| Búsqueda web en el lado del servidor        | proveedor `web_search` `grok`                     | Sí                                                                           |
| Búsqueda en X en el lado del servidor       | herramienta `x_search`                            | Sí                                                                           |
| Ejecución de código en el lado del servidor | herramienta `code_execution`                      | Sí                                                                           |
| Imágenes                                    | `image_generate`                                  | Sí                                                                           |
| Videos                                      | `video_generate`                                  | Sí                                                                           |
| Conversión de texto a voz por lotes         | `messages.tts.provider: "xai"` / `tts`            | Sí                                                                           |
| TTS en streaming                            | —                                                 | No expuesto; el contrato TTS de OpenClaw devuelve búferes de audio completos |
| Conversión de voz a texto por lotes         | `tools.media.audio` / comprensión de medios       | Sí                                                                           |
| Conversión de voz a texto en streaming      | Llamada de voz `streaming.provider: "xai"`        | Sí                                                                           |
| Voz en tiempo real                          | —                                                 | Aún no expuesto; diferente contrato de sesión/WebSocket                      |
| Archivos / lotes                            | Solo compatibilidad con la API de modelo genérico | No es una herramienta de primera clase de OpenClaw                           |

<Note>
  OpenClaw utiliza las API REST de imagen/video/TTS/STT de xAI para la generación de medios, voz y transcripción por lotes, el WebSocket STT en streaming de xAI para la transcripción en vivo de llamadas de voz, y la API Responses para modelo, búsqueda y herramientas de ejecución de código. Las características que necesitan diferentes contratos de OpenClaw, como las sesiones de voz en tiempo real,
  se documentan aquí como capacidades ascendentes en lugar de comportamiento de complemento oculto.
</Note>

### Asignaciones en modo rápido

`/fast on` o `agents.defaults.models["xai/<model>"].params.fastMode: true`
reescribe las solicitudes nativas de xAI de la siguiente manera:

| Modelo de origen | Objetivo en modo rápido |
| ---------------- | ----------------------- |
| `grok-3`         | `grok-3-fast`           |
| `grok-3-mini`    | `grok-3-mini-fast`      |
| `grok-4`         | `grok-4-fast`           |
| `grok-4-0709`    | `grok-4-fast`           |

### Alias de compatibilidad heredados

Los alias heredados aún se normalizan a los ids integrados canónicos:

| Alias heredado            | Id canónico                           |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Características

<AccordionGroup>
  <Accordion title="Búsqueda web">
    El proveedor de búsqueda web `grok` incluido también usa `XAI_API_KEY`:

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Generación de video">
    El complemento `xai` incluido registra la generación de video a través de la herramienta compartida
    `video_generate`.

    - Modelo de video predeterminado: `xai/grok-imagine-video`
    - Modos: texto a video, imagen a video, edición remota de video y extensión remota de
      video
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Resoluciones: `480P`, `720P`
    - Duración: 1-15 segundos para generación/imagen a video, 2-10 segundos para
      extensión

    <Warning>
    No se aceptan búferes de video locales. Utilice URLs `http(s)` remotas para
    entradas de edición/extensión de video. Imagen a video acepta búferes de imagen locales porque
    OpenClaw puede codificarlos como URLs de datos para xAI.
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
    Consulte [Video Generation](/es/tools/video-generation) para obtener parámetros de herramientas compartidas,
    selección de proveedor y comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="Generación de imágenes">
    El complemento `xai` incluido registra la generación de imágenes a través de la herramienta compartida
    `image_generate`.

    - Modelo de imagen predeterminado: `xai/grok-imagine-image`
    - Modelo adicional: `xai/grok-imagine-image-pro`
    - Modos: texto a imagen y edición de imagen de referencia
    - Entradas de referencia: una `image` o hasta cinco `images`
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resoluciones: `1K`, `2K`
    - Recuento: hasta 4 imágenes

    OpenClaw solicita a xAI respuestas de imagen `b64_json` para que los medios generados puedan ser
    almacenados y entregados a través de la ruta normal de archivos adjuntos del canal. Las imágenes de referencia locales se
    convierten a URL de datos; las referencias remotas `http(s)` se pasan tal cual.

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
    xAI también documenta `quality`, `mask`, `user` y relaciones de aspecto nativas adicionales
    tales como `1:2`, `2:1`, `9:20` y `20:9`. OpenClaw reenvía hoy solo los
    controles de imagen compartidos entre proveedores; los controles nativos no compatibles
    intencionalmente no se exponen a través de `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Texto a voz">
    El complemento `xai` incluido registra texto a voz a través de la superficie del proveedor compartida `tts`.

    - Voces: `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voz predeterminada: `eve`
    - Formatos: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Idioma: código BCP-47 o `auto`
    - Velocidad: anulación de velocidad nativa del proveedor
    - El formato nativo de notas de voz Opus no es compatible

    Para usar xAI como proveedor de TTS predeterminado:

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
    El complemento `xai` incluido registra voz a texto por lotes a través de la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `grok-stt`
    - Endpoint: xAI REST `/v1/stt`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw donde sea que la transcripción de audio entrante use
      `tools.media.audio`, incluidos los segmentos del canal de voz de Discord y
      los archivos de audio del canal

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
    transcripción por llamada. Las sugerencias de aviso (prompt hints) son aceptadas por la superficie compartida de OpenClaw,
    pero la integración xAI REST STT solo reenvía archivo, modelo e
    idioma porque esos se asignan limpiamente al endpoint público actual de xAI.

  </Accordion>

  <Accordion title="Transmisión de voz a texto">
    El complemento `xai` incluido también registra un proveedor de transcripción en tiempo real
    para el audio de llamadas de voz en vivo.

    - Endpoint: xAI WebSocket `wss://api.x.ai/v1/stt`
    - Codificación predeterminada: `mulaw`
    - Tasa de muestreo predeterminada: `8000`
    - Detección de finalización de palabra predeterminada: `800ms`
    - Transcripciones provisionales: habilitadas de forma predeterminada

    El flujo de medios de Twilio de Voice Call envía tramas de audio G.711 µ-law, por lo que
    el proveedor xAI puede reenviar esas tramas directamente sin transcodificación:

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

    La configuración propiedad del proveedor se encuentra bajo
    `plugins.entries.voice-call.config.streaming.providers.xai`. Las claves admitidas
    son `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw`, o
    `alaw`), `interimResults`, `endpointingMs` y `language`.

    <Note>
    Este proveedor de transmisión es para la ruta de transcripción en tiempo real de Voice Call.
    La voz de Discord actualmente graba segmentos cortos y utiliza la ruta de transcripción
    por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="configuración de x_search">
    El complemento xAI incluido expone `x_search` como una herramienta de OpenClaw para buscar
    contenido de X (anteriormente Twitter) mediante Grok.

    Ruta de configuración: `plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | Habilitar o deshabilitar x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes de x_search     |
    | `inlineCitations`  | boolean | —                  | Incluir citas en línea en los resultados  |
    | `maxTurns`         | number  | —                  | Máximo de turnos de conversación           |
    | `timeoutSeconds`   | number  | —                  | Tiempo de espera de solicitud en segundos           |
    | `cacheTtlMinutes`  | number  | —                  | Tiempo de vida de caché en minutos        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
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
    la ejecución remota de código en el entorno sandbox de xAI.

    Ruta de configuración: `plugins.entries.xai.config.codeExecution`

    | Key               | Type    | Default            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si la clave está disponible) | Habilitar o deshabilitar la ejecución de código  |
    | `model`           | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes de ejecución de código   |
    | `maxTurns`        | number  | —                  | Máximo de turnos de conversación               |
    | `timeoutSeconds`  | number  | —                  | Tiempo de espera de solicitud en segundos               |

    <Note>
    Esta es ejecución en sandbox remota de xAI, no [`exec`](/es/tools/exec) local.
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
  - La autenticación hoy es solo mediante clave de API. Aún no hay flujo OAuth o de código de dispositivo de xAI en OpenClaw. - `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta normal del proveedor xAI porque requiere una superficie API upstream diferente que el transporte estándar de xAI de OpenClaw. - La voz en tiempo real de xAI aún no está registrada como proveedor
  de OpenClaw. Necesita un contrato de sesión de voz bidireccional diferente que la transcripción STT por lotes o la transcripción en streaming. - La imagen de xAI `quality`, la imagen `mask` y las relaciones de aspecto adicionales solo nativas no están expuestas hasta que la herramienta compartida `image_generate` tenga los controles correspondientes entre proveedores.
</Accordion>

  <Accordion title="Notas avanzadas">
    - OpenClaw aplica correcciones de compatibilidad de esquemas de herramientas y llamadas a herramientas específicas de xAI
      automáticamente en la ruta de ejecución compartida.
    - Las solicitudes nativas de xAI usan `tool_stream: true` por defecto. Establezca
      `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
      desactivarlo.
    - El wrapper incluido de xAI elimina las banderas de esquema de herramientas estrictas no compatibles y las
      claves de carga útil de razonamiento antes de enviar solicitudes nativas de xAI.
    - `web_search`, `x_search` y `code_execution` se exponen como herramientas de OpenClaw.
      OpenClaw habilita la herramienta integrada específica de xAI que necesita dentro de cada solicitud de
      herramienta en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
    - `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar de
      estar codificadas en el tiempo de ejecución del modelo principal.
    - `code_execution` es la ejecución remota en sandbox de xAI, no la
      [`exec`](/es/tools/exec) local.
  </Accordion>
</AccordionGroup>

## Pruebas en vivo

Las rutas de medios de xAI están cubiertas por pruebas unitarias y suites en vivo opcionales. Los comandos
en vivo cargan secretos desde su shell de inicio de sesión, incluyendo `~/.profile`, antes de
sondear `XAI_API_KEY`.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

El archivo en vivo específico del proveedor sintetiza TTS normal, TTS PCM amigable para telefonía,
transcribe audio a través de STT por lotes de xAI, transmite el mismo PCM a través de STT en
tiempo real de xAI, genera resultados de texto a imagen y edita una imagen de referencia. El
archivo de imagen compartido en vivo verifica el mismo proveedor xAI a través de la selección
de tiempo de ejecución, conmutación por error, normalización y la ruta de archivos adjuntos de medios de OpenClaw.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Todos los proveedores" href="/es/providers/index" icon="grid-2">
    La descripción general más amplia de proveedores.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y soluciones.
  </Card>
</CardGroup>

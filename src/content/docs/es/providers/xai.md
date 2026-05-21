---
summary: "Usa los modelos Grok de xAI en OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

OpenClaw incluye un complemento de proveedor `xai` integrado para los modelos Grok. Para la mayoría
de los usuarios, la ruta recomendada es Grok OAuth con una suscripción elegible a SuperGrok o X Premium.
OpenClaw se mantiene con prioridad local: la puerta de enlace (Gateway), la configuración, el enrutamiento y
las herramientas se ejecutan en su máquina, mientras que las solicitudes de modelo Grok se autentican a través de xAI
y se envían a la API de xAI.

OAuth no requiere una clave de API de xAI y no requiere la aplicación
Grok Build. xAI aún puede mostrar Grok Build en la pantalla de consentimiento porque OpenClaw utiliza
el cliente OAuth compartido de xAI.

## Elige tu ruta de configuración

Utilice la ruta que coincida con el estado de su instalación de OpenClaw:

<Steps>
  <Step title="Nueva instalación de OpenClaw">
    Ejecute la incorporación con la instalación del demonio cuando esté configurando una nueva
    puerta de enlace (Gateway) local, luego elija la opción xAI/Grok OAuth en el paso de modelo/autenticación:

    ```bash
    openclaw onboard --install-daemon
    ```

    En un VPS o a través de SSH, use device-code durante la incorporación:

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    OAuth no requiere una clave de API de xAI. OpenClaw no requiere la aplicación
    Grok Build. xAI aún puede etiquetar la aplicación de consentimiento como Grok Build porque
    OpenClaw usa el cliente OAuth compartido de xAI.

  </Step>
  <Step title="Instalación existente de OpenClaw">
    Si OpenClaw ya está configurado, inicie sesión solo en xAI. No vuelva a ejecutar la incorporación
    completa o reinstale el demonio solo para conectar Grok:

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    Utilice el flujo de device-code en su lugar cuando la puerta de enlace (Gateway) se ejecuta a través de SSH, Docker o
    un VPS y una devolución de llamada del navegador localhost es incómoda:

    ```bash
    openclaw models auth login --provider xai --device-code
    ```

    Para establecer Grok como el modelo predeterminado después de iniciar sesión, aplíquelo por separado:

    ```bash
    openclaw models set xai/grok-4.3
    ```

    Vuelva a ejecutar la incorporación completa solo si intencionalmente desea cambiar la puerta de enlace,
    demonio, canal, espacio de trabajo u otras opciones de configuración.

  </Step>
  <Step title="Ruta con clave de API">
    La configuración con clave de API todavía funciona para las claves de xAI Console y para las superficies de medios que
    requieren configuración de proveedor respaldada por clave:

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

  </Step>
  <Step title="Elige un modelo">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4.3" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utiliza la API de xAI Responses como el transporte xAI incluido. La misma credencial de `openclaw models auth login --provider xai --method oauth`, `openclaw models auth login --provider xai --device-code` o `openclaw models auth login --provider xai --method api-key` también puede potenciar la `x_search` de primera clase, `code_execution` remota y la generación de imágenes/vídeo de
  xAI. El habla y la transcripción actualmente requieren `XAI_API_KEY` o configuración del proveedor. `XAI_API_KEY` o la configuración de búsqueda web del complemento también pueden potenciar `web_search` con respaldo de Grok. Si almacena una clave xAI bajo `plugins.entries.xai.config.webSearch.apiKey`, el proveedor de modelos xAI incluido también reutiliza esa clave como alternativa. Configure
  `plugins.entries.xai.config.webSearch.baseUrl` para enrutar `web_search` de Grok y, por defecto, `x_search` a través de un proxy xAI Responses del operador. El ajuste de `code_execution` se encuentra bajo `plugins.entries.xai.config.codeExecution`.
</Note>

## Solución de problemas de OAuth

- Si el OAuth del navegador no puede alcanzar `127.0.0.1:56121`, use
  `openclaw models auth login --provider xai --device-code`.
- Si el inicio de sesión tiene éxito pero Grok no es el modelo predeterminado, ejecute
  `openclaw models set xai/grok-4.3`.
- Para inspeccionar los perfiles de autenticación xAI guardados, ejecute:

  ```bash
  openclaw models auth list --provider xai
  openclaw models status
  ```

- xAI decide qué cuentas pueden recibir tokens de API de OAuth. Si una cuenta no es
  elegible, intente la ruta de clave de API o verifique la suscripción en el lado de xAI.

<Tip>Use `xai-device-code` al iniciar sesión desde SSH, Docker o un VPS. OpenClaw imprime una URL xAI y un código corto; finalice el inicio de sesión en cualquier navegador local mientras el proceso remoto sondea a xAI para el intercambio de token completado.</Tip>

## Catálogo integrado

OpenClaw incluye los modelos de chat xAI actuales de fábrica, ordenados de los más
nuevos a los más antiguos en los selectores de modelos:

| Familia        | IDs de modelo                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok 4.3       | `grok-4.3`                                                               |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |

El complemento todavía resuelve hacia adelante los slug de Grok 3, Grok 4, Grok 4 Fast, Grok 4.1
Fast y Grok Code más antiguos para configuraciones existentes, pero OpenClaw ya no muestra
esos slug upstream retirados en el catálogo seleccionable.

<Tip>Use `grok-4.3` para nuevas cargas de trabajo de chat y codificación, a menos que explícitamente necesite un alias beta de Grok 4.20.</Tip>

## Cobertura de características de OpenClaw

El complemento integrado asigna la superficie de la API pública actual de xAI a los contratos compartidos de proveedor y herramienta de OpenClaw. Las capacidades que no se ajustan al contrato compartido (por ejemplo, transmisión de TTS y voz en tiempo real) no están expuestas; consulte la tabla a continuación.

| Capacidad de xAI                    | Superficie de OpenClaw                            | Estado                                                                       |
| ----------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Chat / Respuestas                   | proveedor de modelos `xai/<model>`                | Sí                                                                           |
| Búsqueda web en el servidor         | proveedor `web_search` `grok`                     | Sí                                                                           |
| Búsqueda de X en el servidor        | herramienta `x_search`                            | Sí                                                                           |
| Ejecución de código en el servidor  | herramienta `code_execution`                      | Sí                                                                           |
| Imágenes                            | `image_generate`                                  | Sí                                                                           |
| Videos                              | `video_generate`                                  | Sí                                                                           |
| Conversión de texto a voz por lotes | `messages.tts.provider: "xai"` / `tts`            | Sí                                                                           |
| Transmisión de TTS                  | -                                                 | No expuesto; el contrato TTS de OpenClaw devuelve búferes de audio completos |
| Conversión de voz a texto por lotes | `tools.media.audio` / comprensión de medios       | Sí                                                                           |
| Transmisión de voz a texto          | Llamada de voz `streaming.provider: "xai"`        | Sí                                                                           |
| Voz en tiempo real                  | -                                                 | Aún no expuesto; contrato de sesión/WebSocket diferente                      |
| Archivos / lotes                    | Solo compatibilidad con la API de modelo genérico | No es una herramienta de primera clase de OpenClaw                           |

<Note>
  OpenClaw utiliza las API REST de imagen/video/TTS/STT de xAI para la generación de medios, voz y transcripción por lotes, el WebSocket de STT en transmisión de xAI para la transcripción en vivo de llamadas de voz, y la API de Respuestas para modelos, búsqueda y herramientas de ejecución de código. Las funciones que requieren diferentes contratos de OpenClaw, como las sesiones de voz en tiempo
  real, se documentan aquí como capacidades de flujo superior (upstream) en lugar de comportamiento oculto del complemento.
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
    El proveedor de búsqueda web `grok` incluido puede usar `XAI_API_KEY` o una clave de búsqueda web de complemento:

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Generación de video">
    El complemento `xai` incluido registra la generación de video a través de la herramienta compartida `video_generate`.

    - Modelo de video predeterminado: `xai/grok-imagine-video`
    - Modos: texto a video, imagen a video, generación de imagen de referencia, edición remota de video y extensión remota de video
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`
    - Resoluciones: `480P`, `720P`
    - Duración: 1-15 segundos para generación/imagen a video, 1-10 segundos al usar roles `reference_image`, 2-10 segundos para extensión
    - Generación de imagen de referencia: establezca `imageRoles` en `reference_image` para cada imagen proporcionada; xAI acepta hasta 7 imágenes de este tipo

    <Warning>
    No se aceptan búferes de video locales. Use URLs `http(s)` remotas para entradas de edición/extensión de video. Imagen a video acepta búferes de imagen locales porque OpenClaw puede codificarlos como URL de datos para xAI.
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
    Consulte [Video Generation](/es/tools/video-generation) para parámetros de herramientas compartidas, selección de proveedor y comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="Generación de imágenes">
    El complemento `xai` incluido registra la generación de imágenes a través de la herramienta compartida `image_generate`.

    - Modelo de imagen predeterminado: `xai/grok-imagine-image`
    - Modelo adicional: `xai/grok-imagine-image-quality`
    - Modos: texto a imagen y edición de imagen de referencia
    - Entradas de referencia: una `image` o hasta cinco `images`
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resoluciones: `1K`, `2K`
    - Cantidad: hasta 4 imágenes

    OpenClaw solicita a xAI respuestas de imagen `b64_json` para que los medios generados puedan ser almacenados y entregados a través de la ruta normal de archivos adjuntos del canal. Las imágenes de referencia locales se convierten en URL de datos; las referencias `http(s)` remotas se pasan tal cual.

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
    xAI también documenta `quality`, `mask`, `user` y relaciones nativas adicionales como `1:2`, `2:1`, `9:20` y `20:9`. OpenClaw reenvía hoy solo los controles de imagen compartidos entre proveedores; los controles nativos no compatibles no se exponen intencionalmente a través de `image_generate`.
    </Note>

  </Accordion>

  <Accordion title="Conversión de texto a voz">
    El complemento incluido `xai` registra la conversión de texto a voz a través de la superficie del proveedor compartida `tts`.

    - Voces: `eve`, `ara`, `rex`, `sal`, `leo`, `una`
    - Voz predeterminada: `eve`
    - Formatos: `mp3`, `wav`, `pcm`, `mulaw`, `alaw`
    - Idioma: código BCP-47 o `auto`
    - Velocidad: sobrescritura de velocidad nativa del proveedor
    - El formato de nota de voz Opus nativo no es compatible

    Para usar xAI como proveedor TTS predeterminado:

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
    OpenClaw utiliza el endpoint por lotes `/v1/tts` de xAI. xAI también ofrece TTS en streaming a través de WebSocket, pero el contrato del proveedor de voz de OpenClaw actualmente espera un búfer de audio completo antes de entregar la respuesta.
    </Note>

  </Accordion>

  <Accordion title="Conversión de voz a texto">
    El complemento incluido `xai` registra la conversión de voz a texto por lotes a través de la superficie de transcripción de comprensión multimedia de OpenClaw.

    - Modelo predeterminado: `grok-stt`
    - Endpoint: xAI REST `/v1/stt`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw donde sea que la transcripción de audio entrante utilice `tools.media.audio`, incluyendo los segmentos del canal de voz de Discord y los adjuntos de audio del canal

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

    El idioma se puede proporcionar a través de la configuración compartida de medios de audio o por solicitud de transcripción por llamada. Las sugerencias de prompt son aceptadas por la superficie compartida de OpenClaw, pero la integración xAI REST STT solo reenvía el archivo, el modelo y el idioma porque esos se asignan limpiamente al endpoint público actual de xAI.

  </Accordion>

  <Accordion title="Transcripción de voz a texto en tiempo real">
    El complemento `xai` incluido también registra un proveedor de transcripción en tiempo real
    para el audio de llamadas de voz en vivo.

    - Endpoint: xAI WebSocket `wss://api.x.ai/v1/stt`
    - Codificación predeterminada: `mulaw`
    - Tasa de muestreo predeterminada: `8000`
    - Segmentación de punto final predeterminada: `800ms`
    - Transcripciones provisionales: habilitadas de forma predeterminada

    El flujo de medios de Twilio de Voice Call envía tramas de audio G.711 µ-law, por lo que
    el proveedor xAI puede reenviar esas tramas directamente sin transcodificar:

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

    La configuración propiedad del proveedor se encuentra en
    `plugins.entries.voice-call.config.streaming.providers.xai`. Las claves admitidas
    son `apiKey`, `baseUrl`, `sampleRate`, `encoding` (`pcm`, `mulaw` o
    `alaw`), `interimResults`, `endpointingMs`, y `language`.

    <Note>
    Este proveedor de streaming es para la ruta de transcripción en tiempo real de Voice Call.
    La voz de Discord actualmente registra segmentos cortos y utiliza la ruta de transcripción
    por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Configuración de x_search">
    El complemento xAI incluido expone `x_search` como una herramienta de OpenClaw para buscar
    contenido de X (anteriormente Twitter) mediante Grok.

    Ruta de configuración: `plugins.entries.xai.config.xSearch`

    | Clave                | Tipo    | Predeterminado            | Descripción                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | -                  | Habilitar o deshabilitar x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes x_search     |
    | `baseUrl`          | string  | -                  | Anulación de la URL base de xAI Responses      |
    | `inlineCitations`  | boolean | -                  | Incluir citas en línea en los resultados  |
    | `maxTurns`         | number  | -                  | Máximo de turnos de conversación           |
    | `timeoutSeconds`   | number  | -                  | Tiempo de espera de la solicitud en segundos           |
    | `cacheTtlMinutes`  | number  | -                  | Tiempo de vida de caché en minutos        |

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
    la ejecución remota de código en el entorno sandbox de xAI.

    Ruta de configuración: `plugins.entries.xai.config.codeExecution`

    | Clave               | Tipo    | Predeterminado            | Descripción                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si la clave está disponible) | Habilitar o deshabilitar la ejecución de código  |
    | `model`           | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes de ejecución de código   |
    | `maxTurns`        | number  | -                  | Máximo de turnos de conversación               |
    | `timeoutSeconds`  | number  | -                  | Tiempo de espera de la solicitud en segundos               |

    <Note>
    Esta es una ejecución sandbox remota de xAI, no [`exec`](/es/tools/exec) local.
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

<Accordion title="Limitaciones conocidas">
  - La autenticación de xAI puede usar una clave de API, variable de entorno, reserva de configuración del complemento, OAuth del navegador o OAuth con código de dispositivo con una cuenta xAI elegible. El OAuth del navegador usa una devolución de llamada local en `127.0.0.1:56121`; para hosts remotos, use `xai-device-code` a menos que desee reenviar ese puerto antes de abrir la URL de inicio de
  sesión. xAI decide qué cuentas pueden recibir tokens de API OAuth, y la página de consentimiento puede mostrar Grok Build aunque OpenClaw no requiera la aplicación Grok Build. - `grok-4.20-multi-agent-experimental-beta-0304``quality` no es compatible con la ruta del proveedor xAI normal porque requiere una superficie de API upstream diferente al transporte xAI estándar de OpenClaw. - xAI
  Realtime voice aún no está registrado como proveedor de OpenClaw. Necesita un contrato de sesión de voz bidireccional diferente a la STT por lotes o la transcripción en streaming. - La imagen %%PH:INLINE_CODE:224:b4eb94a%%, la imagen `mask` y las relaciones de aspecto adicionales solo nativas no se exponen hasta que la herramienta compartida `image_generate` tenga los controles correspondientes
  entre proveedores.
</Accordion>

  <Accordion title="Notas avanzadas">
    - OpenClaw aplica correcciones de compatibilidad específicas de xAI para esquemas de herramientas y llamadas a herramientas
      automáticamente en la ruta compartida del ejecutor.
    - Las solicitudes nativas de xAI usan `tool_stream: true` de forma predeterminada. Establezca
      `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
      desactivarlo.
    - El contenedor xAI incluido elimina las marcas no compatibles de esquemas estrictos de herramientas y
      las claves de carga útil de razonamiento antes de enviar solicitudes nativas de xAI.
    - `web_search`, `x_search` y `code_execution` están expuestos como herramientas de OpenClaw.
      OpenClaw activa la herramienta integrada específica de xAI que necesita dentro de cada solicitud
      de herramienta en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
    - Grok `web_search` lee `plugins.entries.xai.config.webSearch.baseUrl`.
      `x_search` lee `plugins.entries.xai.config.xSearch.baseUrl` y luego
      recurre a la URL base de búsqueda web de Grok.
    - `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar de
      estar codificados en el tiempo de ejecución del modelo principal.
    - `code_execution` es la ejecución remota en el entorno seguro (sandbox) de xAI, no la ejecución local
      [`exec`](/es/tools/exec).
  </Accordion>
</AccordionGroup>

## Pruebas en vivo

Las rutas de medios de xAI están cubiertas por pruebas unitarias y suites en vivo opcionales. Exporte
`XAI_API_KEY` en el entorno del proceso antes de ejecutar sondas en vivo.

```bash
pnpm test extensions/xai
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 pnpm test:live -- extensions/xai/xai.live.test.ts
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_TEST_QUIET=1 OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS=xai pnpm test:live -- test/image-generation.runtime.live.test.ts
```

El archivo en vivo específico del proveedor sintetiza TTS normal, TTS PCM amigable con telefonía,
transcribe audio a través de STT por lotes de xAI, transmite el mismo PCM a través de STT en tiempo real de xAI,
genera salida de texto a imagen y edita una imagen de referencia. El
archivo de imagen compartida en vivo verifica el mismo proveedor xAI a través de la selección en tiempo
de ejecución, la recuperación, la normalización y la ruta de adjunto de medios de OpenClaw.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="capas">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Todos los proveedores" href="/es/providers/index" icon="grid-2">
    La visión general general de los proveedores.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y soluciones.
  </Card>
</CardGroup>

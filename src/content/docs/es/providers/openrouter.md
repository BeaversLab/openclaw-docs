---
summary: "Usa la API unificada de OpenRouter para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You want to run models via OpenRouter in OpenClaw
  - You want to use OpenRouter for image generation
  - You want to use OpenRouter for video generation
title: "OpenRouter"
---

OpenRouter proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

## Introducción

<Steps>
  <Step title="Obtén tu clave de API">
    Crea una clave de API en [openrouter.ai/keys](https://openrouter.ai/keys).
  </Step>
  <Step title="Ejecuta el onboarding">
    ```bash
    openclaw onboard --auth-choice openrouter-api-key
    ```
  </Step>
  <Step title="(Opcional) Cambiar a un modelo específico">
    El onboarding usa por defecto `openrouter/auto`. Elige un modelo concreto más tarde:

    ```bash
    openclaw models set openrouter/<provider>/<model>
    ```

  </Step>
</Steps>

## Ejemplo de configuración

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## Referencias de modelos

<Note>
Las referencias de modelos siguen el patrón `openrouter/<provider>/<model>`. Para ver la lista completa de
proveedores y modelos disponibles, consulta [/concepts/model-providers](/es/concepts/model-providers).
</Note>

Ejemplos de reserva agrupados:

| Referencia de modelo              | Notas                                 |
| --------------------------------- | ------------------------------------- |
| `openrouter/auto`                 | Enrutamiento automático de OpenRouter |
| `openrouter/moonshotai/kimi-k2.6` | Kimi K2.6 vía MoonshotAI              |
| `openrouter/moonshotai/kimi-k2.5` | Kimi K2.5 vía MoonshotAI              |

## Generación de imágenes

OpenRouter también puede respaldar la herramienta `image_generate`. Usa un modelo de imagen de OpenRouter bajo `agents.defaults.imageGenerationModel`:

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openrouter/google/gemini-3.1-flash-image-preview",
        timeoutMs: 180_000,
      },
    },
  },
}
```

OpenClaw envía solicitudes de imagen a la API de imagen de completaciones de chat de OpenRouter con `modalities: ["image", "text"]`. Los modelos de imagen Gemini reciben pistas compatibles de `aspectRatio` y `resolution` a través de la `image_config` de OpenRouter. Usa `agents.defaults.imageGenerationModel.timeoutMs` para modelos de imagen de OpenRouter más lentos; el parámetro `timeoutMs` por llamada de la herramienta `image_generate` sigue teniendo prioridad.

## Generación de video

OpenRouter también puede respaldar la herramienta `video_generate` a través de su API asíncrona `/videos`. Usa un modelo de video de OpenRouter bajo `agents.defaults.videoGenerationModel`:

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openrouter/google/veo-3.1-fast",
      },
    },
  },
}
```

OpenClaw envía trabajos de texto a vídeo e imagen a vídeo a OpenRouter, sondea
el `polling_url` devuelto y descarga el vídeo completado desde
el `unsigned_urls` de OpenRouter o el endpoint de contenido del trabajo documentado.
Las imágenes de referencia se envían como imágenes del primer/último fotograma por defecto; las imágenes
etiquetadas con `reference_image` se envían como referencias de entrada de OpenRouter. El
`google/veo-3.1-fast` predeterminado incluido anuncia las duraciones de 4/6/8
segundos actualmente admitidas, resoluciones `720P`/`1080P` y relaciones de aspecto
`16:9`/`9:16`. Video-to-video no está registrado para OpenRouter porque la API
de generación de vídeo ascendente actualmente acepta referencias de texto e imagen.

## Texto a voz

OpenRouter también se puede utilizar como proveedor TTS a través de su endpoint
`/audio/speech` compatible con OpenAI.

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openrouter",
      providers: {
        openrouter: {
          model: "hexgrad/kokoro-82m",
          voice: "af_alloy",
          responseFormat: "mp3",
        },
      },
    },
  },
}
```

Si se omite `messages.tts.providers.openrouter.apiKey`, TTS reutiliza
`models.providers.openrouter.apiKey` y luego `OPENROUTER_API_KEY`.

## Speech-to-text (audio entrante)

OpenRouter puede transcribir archivos adjuntos de voz/audio entrantes a través de la ruta compartida
`tools.media.audio` utilizando su endpoint STT (`/audio/transcriptions`).
Esto se aplica a cualquier complemento de canal que reenvíe voz/audio entrante al
preflight de comprensión de medios.

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "openrouter", model: "openai/whisper-large-v3-turbo" }],
      },
    },
  },
}
```

OpenClaw envía solicitudes STT de OpenRouter como JSON con audio en base64 bajo
`input_audio` (contrato STT de OpenRouter), no como cargas de formulario multiparte de OpenAI.

## Autenticación y encabezados

OpenRouter utiliza un token Bearer con su clave de API entre bastidores.

En solicitudes reales de OpenRouter (`https://openrouter.ai/api/v1`), OpenClaw también añade
los encabezados de atribución de la aplicación documentados por OpenRouter:

| Encabezado                | Valor                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `HTTP-Referer`            | `https://openclaw.ai`                                                                                  |
| `X-OpenRouter-Title`      | `OpenClaw`                                                                                             |
| `X-OpenRouter-Categories` | `cli-agent,cloud-agent,programming-app,creative-writing,writing-assistant,general-chat,personal-agent` |

<Warning>Si redirige el proveedor OpenRouter a algún otro proxy o URL base, OpenClaw **no** inyecta esos encabezados específicos de OpenRouter ni los marcadores de caché de Anthropic.</Warning>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Almacenamiento en caché de respuestas">
    El almacenamiento en caché de respuestas de OpenRouter es opcional. Actívelo para cada modelo de OpenRouter con
    parámetros del modelo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openrouter/auto": {
              params: {
                responseCache: true,
                responseCacheTtlSeconds: 300,
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw envía `X-OpenRouter-Cache: true` y, cuando está configurado,
    `X-OpenRouter-Cache-TTL`. `responseCacheClear: true` fuerza una actualización para
    la solicitud actual y almacena la respuesta de reemplazo. Los alias en snake_case
    (`response_cache`, `response_cache_ttl_seconds` y
    `response_cache_clear`) también se aceptan.

    Esto está separado del almacenamiento en caché de avisos del proveedor y de los marcadores
    `cache_control` de Anthropic de OpenRouter. Solo se aplica en rutas
    `openrouter.ai` verificadas, no en URLs base de proxy personalizadas.

  </Accordion>

<Accordion title="Marcadores de caché de Anthropic">En las rutas verificadas de OpenRouter, las referencias de modelos de Anthropic conservan los marcadores `cache_control` específicos de OpenRouter que OpenClaw utiliza para un mejor reúso del caché de avisos en bloques de avisos del sistema/desarrollador.</Accordion>

<Accordion title="Relleno previo de razonamiento de Anthropic">
  En las rutas verificadas de OpenRouter, las referencias de modelos de Anthropic con el razonamiento activado omiten los turnos de relleno previo del asistente finales antes de que la solicitud llegue a OpenRouter, cumpliendo con el requisito de Anthropic de que las conversaciones de razonamiento terminen con un turno de usuario.
</Accordion>

<Accordion title="Inyección de pensamiento/razonamiento">
  En las rutas compatibles que no son de `auto`, OpenClaw asigna el nivel de pensamiento seleccionado a las cargas útiles de razonamiento de proxy de OpenRouter. Las sugerencias de modelo no compatibles y `openrouter/auto` omiten esa inyección de razonamiento. Hunter Alpha también omite el razonamiento de proxy para referencias de modelos configuradas obsoletas porque OpenRouter podría devolver
  texto de respuesta final en campos de razonamiento para esa ruta retirada.
</Accordion>

<Accordion title="DeepSeek V4 reasoning replay">
  En rutas verificadas de OpenRouter, `openrouter/deepseek/deepseek-v4-flash` y `openrouter/deepseek/deepseek-v4-pro` rellenan `reasoning_content` faltantes en los turnos del asistente reproducidos para que las conversaciones de pensamiento/herramientas mantengan la forma de seguimiento requerida por DeepSeek V4. OpenClaw envía valores `reasoning_effort` admitidos por OpenRouter para estas rutas;
  `xhigh` es el nivel más alto anunciado, y las anulaciones obsoletas de `max` se asignan a `xhigh`.
</Accordion>

<Accordion title="OpenAI-only request shaping">OpenRouter aún se ejecuta a través de la ruta compatible con OpenAI de estilo proxy, por lo que el modelado de solicitudes exclusivo de OpenAI nativo, como `serviceTier`, Responses `store`, las cargas útiles compatibles con el razonamiento de OpenAI y las sugerencias de caché de solicitudes no se reenvían.</Accordion>

<Accordion title="Gemini-backed routes">Las referencias de OpenRouter respaldadas por Gemini se mantienen en la ruta proxy-Gemini: OpenClaw mantiene allí la saneamiento de firmas de pensamiento de Gemini, pero no habilita la validación de reproducción nativa de Gemini ni las reescrituras de arranque.</Accordion>

  <Accordion title="Provider routing metadata">
    Si pasa el enrutamiento del proveedor de OpenRouter bajo los parámetros del modelo, OpenClaw lo reenvía
    como metadatos de enrutamiento de OpenRouter antes de que se ejecuten los contenedores de flujo compartidos.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuration reference" href="/es/gateway/configuration-reference" icon="gear">
    Referencia de configuración completa para agentes, modelos y proveedores.
  </Card>
</CardGroup>

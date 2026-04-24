---
summary: "Conversión de texto a voz (TTS) para respuestas salientes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Texto a Voz"
---

# Conversión de texto a voz (TTS)

OpenClaw puede convertir respuestas salientes en audio utilizando ElevenLabs, Google Gemini, Microsoft, MiniMax, OpenAI o xAI.
Funciona en cualquier lugar donde OpenClaw pueda enviar audio.

## Servicios compatibles

- **ElevenLabs** (proveedor principal o de reserva)
- **Google Gemini** (proveedor principal o de respaldo; usa TTS de la API de Gemini)
- **Microsoft** (proveedor principal o de reserva; la implementación incluida actualmente usa `node-edge-tts`)
- **MiniMax** (proveedor principal o de respaldo; usa la API T2A v2)
- **OpenAI** (proveedor principal o de respaldo; también se usa para resúmenes)
- **xAI** (proveedor principal o de reserva; utiliza la API de TTS de xAI)

### Notas sobre el reconocimiento de voz de Microsoft

El proveedor de voz de Microsoft incluido actualmente utiliza el servicio TTS neuronal
en línea de Microsoft Edge a través de la biblioteca `node-edge-tts`. Es un servicio alojado (no
local), utiliza puntos finales de Microsoft y no requiere una clave de API.
`node-edge-tts` expone opciones de configuración de voz y formatos de salida, pero
no todas las opciones son compatibles con el servicio. La configuración heredada y la entrada de directivas
usando `edge` todavía funcionan y se normalizan a `microsoft`.

Debido a que esta ruta es un servicio web público sin un SLA publicado ni cuota,
trátelo como de mejor esfuerzo. Si necesita límites garantizados y soporte, use OpenAI
o ElevenLabs.

## Claves opcionales

Si desea OpenAI, ElevenLabs, Google Gemini, MiniMax o xAI:

- `ELEVENLABS_API_KEY` (o `XI_API_KEY`)
- `GEMINI_API_KEY` (o `GOOGLE_API_KEY`)
- `MINIMAX_API_KEY`
- `OPENAI_API_KEY`
- `XAI_API_KEY`

El reconocimiento de voz de Microsoft **no** requiere una clave de API.

Si se configuran varios proveedores, el proveedor seleccionado se usa primero y los otros son opciones de reserva.
El resumen automático utiliza el `summaryModel` configurado (o `agents.defaults.model.primary`),
por lo que ese proveedor también debe estar autenticado si habilita los resúmenes.

## Enlaces de servicios

- [Guía de conversión de texto a voz de OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Referencia de la API de audio de OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [Conversión de texto a voz de ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Autenticación de ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [API MiniMax T2A v2](https://platform.minimaxi.com/document/T2A%20V2)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formatos de salida de voz de Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)
- [Conversión de texto a voz de xAI](https://docs.x.ai/developers/rest-api-reference/inference/voice#text-to-speech-rest)

## ¿Está habilitado por defecto?

No. La TTS automática está **desactivada** por defecto. Actívela en la configuración con
`messages.tts.auto` o localmente con `/tts on`.

Cuando `messages.tts.provider` no está establecido, OpenClaw selecciona el primer proveedor
de voz configurado en el orden de selección automática del registro.

## Configuración

La configuración de TTS se encuentra en `messages.tts` en `openclaw.json`.
El esquema completo está en [Configuración de Gateway](/es/gateway/configuration).

### Configuración mínima (habilitar + proveedor)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "elevenlabs",
    },
  },
}
```

### OpenAI principal con ElevenLabs de respaldo

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "openai",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: {
        enabled: true,
      },
      providers: {
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
      },
    },
  },
}
```

### Microsoft principal (sin clave API)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
      providers: {
        microsoft: {
          enabled: true,
          voice: "en-US-MichelleNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          rate: "+10%",
          pitch: "-5%",
        },
      },
    },
  },
}
```

### MiniMax principal

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "minimax",
      providers: {
        minimax: {
          apiKey: "minimax_api_key",
          baseUrl: "https://api.minimax.io",
          model: "speech-2.8-hd",
          voiceId: "English_expressive_narrator",
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
      },
    },
  },
}
```

### Google Gemini principal

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "google",
      providers: {
        google: {
          apiKey: "gemini_api_key",
          model: "gemini-3.1-flash-tts-preview",
          voiceName: "Kore",
        },
      },
    },
  },
}
```

La TTS de Google Gemini utiliza la ruta de la clave API de Gemini. Una clave API de Google Cloud Console
restringida a la API de Gemini es válida aquí y es el mismo estilo de clave utilizada
por el proveedor de generación de imágenes de Google incluido. El orden de resolución es
`messages.tts.providers.google.apiKey` -> `models.providers.google.apiKey` ->
`GEMINI_API_KEY` -> `GOOGLE_API_KEY`.

### xAI principal

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xai",
      providers: {
        xai: {
          apiKey: "xai_api_key",
          voiceId: "eve",
          language: "en",
          responseFormat: "mp3",
          speed: 1.0,
        },
      },
    },
  },
}
```

La TTS de xAI utiliza la misma ruta `XAI_API_KEY` que el proveedor del modelo Grok incluido.
El orden de resolución es `messages.tts.providers.xai.apiKey` -> `XAI_API_KEY`.
Las voces activas actuales son `ara`, `eve`, `leo`, `rex`, `sal` y `una`; `eve` es
la predeterminada. `language` acepta una etiqueta BCP-47 o `auto`.

### Desactivar la voz de Microsoft

```json5
{
  messages: {
    tts: {
      providers: {
        microsoft: {
          enabled: false,
        },
      },
    },
  },
}
```

### Límites personalizados + ruta de preferencias

```json5
{
  messages: {
    tts: {
      auto: "always",
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
    },
  },
}
```

### Responder con audio solo después de un mensaje de voz entrante

```json5
{
  messages: {
    tts: {
      auto: "inbound",
    },
  },
}
```

### Desactivar el resumen automático para respuestas largas

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

Luego ejecute:

```
/tts summary off
```

### Notas sobre los campos

- `auto`: modo TTS automático (`off`, `always`, `inbound`, `tagged`).
  - `inbound` solo envía audio después de un mensaje de voz entrante.
  - `tagged` solo envía audio cuando la respuesta incluye directivas `[[tts:key=value]]` o un bloque `[[tts:text]]...[[/tts:text]]`.
- `enabled`: interruptor heredado (doctor migra esto a `auto`).
- `mode`: `"final"` (predeterminado) o `"all"` (incluye respuestas de herramientas/bloques).
- `provider`: id del proveedor de voz como `"elevenlabs"`, `"google"`, `"microsoft"`, `"minimax"` o `"openai"` (el respaldo es automático).
- Si `provider` no está **configurado**, OpenClaw utiliza el primer proveedor de voz configurado en el orden de selección automática del registro.
- El `provider: "edge"` heredado aún funciona y se normaliza a `microsoft`.
- `summaryModel`: modelo económico opcional para auto-resumen; por defecto es `agents.defaults.model.primary`.
  - Acepta `provider/model` o un alias de modelo configurado.
- `modelOverrides`: permite que el modelo emita directivas TTS (activado por defecto).
  - `allowProvider` por defecto es `false` (el cambio de proveedor es opcional).
- `providers.<id>`: configuración propiedad del proveedor, clave por id del proveedor de voz.
- Los bloques heredados de proveedores directos (`messages.tts.openai`, `messages.tts.elevenlabs`, `messages.tts.microsoft`, `messages.tts.edge`) se migran automáticamente a `messages.tts.providers.<id>` al cargar.
- `maxTextLength`: límite estricto para la entrada TTS (caracteres). `/tts audio` falla si se excede.
- `timeoutMs`: tiempo de espera de la solicitud (ms).
- `prefsPath`: anula la ruta JSON de preferencias locales (proveedor/límite/resumen).
- Los valores de `apiKey` recurren a variables de entorno (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `MINIMAX_API_KEY`, `OPENAI_API_KEY`).
- `providers.elevenlabs.baseUrl`: sobrescribe la URL base de la API de ElevenLabs.
- `providers.openai.baseUrl`: sobrescribe el endpoint de TTS de OpenAI.
  - Orden de resolución: `messages.tts.providers.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Los valores no predeterminados se tratan como endpoints de TTS compatibles con OpenAI, por lo que se aceptan nombres de modelo y voz personalizados.
- `providers.elevenlabs.voiceSettings`:
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = normal)
- `providers.elevenlabs.applyTextNormalization`: `auto|on|off`
- `providers.elevenlabs.languageCode`: ISO 639-1 de 2 letras (p. ej. `en`, `de`)
- `providers.elevenlabs.seed`: entero `0..4294967295` (determinismo de mejor esfuerzo)
- `providers.minimax.baseUrl`: sobrescribe la URL base de la API de MiniMax (por defecto `https://api.minimax.io`, env: `MINIMAX_API_HOST`).
- `providers.minimax.model`: modelo de TTS (por defecto `speech-2.8-hd`, env: `MINIMAX_TTS_MODEL`).
- `providers.minimax.voiceId`: identificador de voz (por defecto `English_expressive_narrator`, env: `MINIMAX_TTS_VOICE_ID`).
- `providers.minimax.speed`: velocidad de reproducción `0.5..2.0` (por defecto 1.0).
- `providers.minimax.vol`: volumen `(0, 10]` (por defecto 1.0; debe ser mayor que 0).
- `providers.minimax.pitch`: cambio de tono `-12..12` (por defecto 0).
- `providers.google.model`: modelo de TTS de Gemini (por defecto `gemini-3.1-flash-tts-preview`).
- `providers.google.voiceName`: nombre de voz preconstruida de Gemini (por defecto `Kore`; `voice` también se acepta).
- `providers.google.baseUrl`: sobrescribe la URL base de la API de Gemini. Solo se acepta `https://generativelanguage.googleapis.com`.
  - Si se omite `messages.tts.providers.google.apiKey`, TTS puede reutilizar `models.providers.google.apiKey` antes de recurrir a las variables de entorno.
- `providers.xai.apiKey`: clave de API de TTS de xAI (entorno: `XAI_API_KEY`).
- `providers.xai.baseUrl`: anula la URL base de TTS de xAI (por defecto `https://api.x.ai/v1`, entorno: `XAI_BASE_URL`).
- `providers.xai.voiceId`: ID de voz de xAI (por defecto `eve`; voces en vivo actuales: `ara`, `eve`, `leo`, `rex`, `sal`, `una`).
- `providers.xai.language`: código de idioma BCP-47 o `auto` (por defecto `en`).
- `providers.xai.responseFormat`: `mp3`, `wav`, `pcm`, `mulaw` o `alaw` (por defecto `mp3`).
- `providers.xai.speed`: anulación de velocidad nativa del proveedor.
- `providers.microsoft.enabled`: permitir el uso de voz de Microsoft (por defecto `true`; sin clave de API).
- `providers.microsoft.voice`: nombre de la voz neuronal de Microsoft (p. ej., `en-US-MichelleNeural`).
- `providers.microsoft.lang`: código de idioma (p. ej., `en-US`).
- `providers.microsoft.outputFormat`: formato de salida de Microsoft (p. ej., `audio-24khz-48kbitrate-mono-mp3`).
  - Consulte los formatos de salida de voz de Microsoft para conocer los valores válidos; no todos los formatos son compatibles con el transporte Edge incluido.
- `providers.microsoft.rate` / `providers.microsoft.pitch` / `providers.microsoft.volume`: cadenas de porcentaje (p. ej., `+10%`, `-5%`).
- `providers.microsoft.saveSubtitles`: escribe subtítulos JSON junto con el archivo de audio.
- `providers.microsoft.proxy`: URL del proxy para las solicitudes de voz de Microsoft.
- `providers.microsoft.timeoutMs`: anulación del tiempo de espera de solicitud (ms).
- `edge.*`: alias heredado para la misma configuración de Microsoft.

## Invalidaciones impulsadas por el modelo (activadas por defecto)

Por defecto, el modelo **puede** emitir directivas TTS para una sola respuesta.
Cuando `messages.tts.auto` es `tagged`, estas directivas son necesarias para activar el audio.

Cuando está activado, el modelo puede emitir directivas `[[tts:...]]` para anular la voz
para una sola respuesta, además de un bloque `[[tts:text]]...[[/tts:text]]` opcional para
proporcionar etiquetas expresivas (risas, indicaciones de canto, etc.) que solo deben aparecer en
el audio.

Las directivas `provider=...` se ignoran a menos que `modelOverrides.allowProvider: true`.

Ejemplo de carga útil de respuesta:

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Claves de directivas disponibles (cuando están activadas):

- `provider` (id de proveedor de voz registrado, por ejemplo `openai`, `elevenlabs`, `google`, `minimax` o `microsoft`; requiere `allowProvider: true`)
- `voice` (voz de OpenAI), `voiceName` / `voice_name` / `google_voice` (voz de Google) o `voiceId` (ElevenLabs / MiniMax / xAI)
- `model` (modelo TTS de OpenAI, id de modelo de ElevenLabs o modelo de MiniMax) o `google_model` (modelo TTS de Google)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `vol` / `volume` (volumen de MiniMax, 0-10)
- `pitch` (tono de MiniMax, -12 a 12)
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

Desactivar todas las invalidaciones del modelo:

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: false,
      },
    },
  },
}
```

Lista de permitidos opcional (permitir el cambio de proveedor mientras se mantienen otros controles configurables):

```json5
{
  messages: {
    tts: {
      modelOverrides: {
        enabled: true,
        allowProvider: true,
        allowSeed: false,
      },
    },
  },
}
```

## Preferencias por usuario

Los comandos de barra escriben invalidaciones locales en `prefsPath` (predeterminado:
`~/.openclaw/settings/tts.json`, anular con `OPENCLAW_TTS_PREFS` o
`messages.tts.prefsPath`).

Campos almacenados:

- `enabled`
- `provider`
- `maxLength` (umbral de resumen; 1500 caracteres por defecto)
- `summarize` (predeterminado `true`)

Esto anula `messages.tts.*` para ese host.

## Formatos de salida (fijos)

- **Feishu / Matrix / Telegram / WhatsApp**: mensaje de voz Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48kHz / 64kbps es un buen equilibrio para mensajes de voz.
- **Otros canales**: MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44.1kHz / 128kbps es el equilibrio predeterminado para la claridad del habla.
- **MiniMax**: MP3 (modelo `speech-2.8-hd`, frecuencia de muestreo de 32kHz). El formato de nota de voz no es compatible de forma nativa; use OpenAI o ElevenLabs para garantizar mensajes de voz Opus.
- **Google Gemini**: La API TTS de Gemini devuelve PCM sin procesar de 24kHz. OpenClaw lo envuelve como WAV para archivos de audio adjuntos y devuelve PCM directamente para Talk/telefonía. El formato nativo de nota de voz Opus no es compatible con esta ruta.
- **xAI**: MP3 por defecto; `responseFormat` puede ser `mp3`, `wav`, `pcm`, `mulaw`, o `alaw`. OpenClaw utiliza el endpoint REST TTS por lotes de xAI y devuelve un archivo de audio completo; el WebSocket TTS de transmisión de xAI no se utiliza en esta ruta del proveedor. El formato nativo de nota de voz Opus no es compatible con esta ruta.
- **Microsoft**: usa `microsoft.outputFormat` (predeterminado `audio-24khz-48kbitrate-mono-mp3`).
  - El transporte incluido acepta un `outputFormat`, pero no todos los formatos están disponibles en el servicio.
  - Los valores del formato de salida siguen los formatos de salida de Microsoft Speech (incluyendo Ogg/WebM Opus).
  - Telegram `sendVoice` acepta OGG/MP3/M4A; use OpenAI/ElevenLabs si necesita
    mensajes de voz Opus garantizados.
  - Si falla el formato de salida de Microsoft configurado, OpenClaw reintenta con MP3.

Los formatos de salida de OpenAI/ElevenLabs son fijos por canal (ver más arriba).

## Comportamiento de TTS automático

Cuando está habilitado, OpenClaw:

- omite TTS si la respuesta ya contiene medios o una directiva `MEDIA:`.
- omite las respuestas muy cortas (< 10 caracteres).
- resume las respuestas largas cuando está habilitado usando `agents.defaults.model.primary` (o `summaryModel`).
- adjunta el audio generado a la respuesta.

Si la respuesta supera `maxLength` y el resumen está desactivado (o no hay clave API para el
modelo de resumen), el audio
se omite y se envía la respuesta de texto normal.

## Diagrama de flujo

```
Reply -> TTS enabled?
  no  -> send text
  yes -> has media / MEDIA: / short?
          yes -> send text
          no  -> length > limit?
                   no  -> TTS -> attach audio
                   yes -> summary enabled?
                            no  -> send text
                            yes -> summarize (summaryModel or agents.defaults.model.primary)
                                      -> TTS -> attach audio
```

## Uso de comandos de barra

Hay un solo comando: `/tts`.
Consulte [Comandos de barra](/es/tools/slash-commands) para obtener detalles de habilitación.

Nota de Discord: `/tts` es un comando integrado de Discord, por lo que OpenClaw registra
`/voice` como el comando nativo allí. El texto `/tts ...` todavía funciona.

```
/tts off
/tts on
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

Notas:

- Los comandos requieren un remitente autorizado (las reglas de lista blanca/propietario todavía se aplican).
- `commands.text` o el registro de comandos nativos deben estar habilitados.
- La configuración `messages.tts.auto` acepta `off|always|inbound|tagged`.
- `/tts on` escribe la preferencia local de TTS en `always`; `/tts off` la escribe en `off`.
- Use la configuración cuando desee valores predeterminados `inbound` o `tagged`.
- `limit` y `summary` se almacenan en preferencias locales, no en la configuración principal.
- `/tts audio` genera una respuesta de audio única (no activa el TTS).
- `/tts status` incluye visibilidad de reserva para el último intento:
  - reserva de éxito: `Fallback: <primary> -> <used>` más `Attempts: ...`
  - fallo: `Error: ...` más `Attempts: ...`
  - diagnósticos detallados: `Attempt details: provider:outcome(reasonCode) latency`
- Los fallos de la API de OpenAI y ElevenLabs ahora incluyen el detalle del error analizado del proveedor y el ID de solicitud (cuando lo devuelve el proveedor), que se muestra en los errores/registros de TTS.

## Herramienta de agente

La herramienta `tts` convierte texto a voz y devuelve un archivo de audio para
la entrega de la respuesta. Cuando el canal es Feishu, Matrix, Telegram o WhatsApp,
el audio se entrega como un mensaje de voz en lugar de un archivo adjunto.

## RPC de puerta de enlace

Métodos de la pasarela:

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

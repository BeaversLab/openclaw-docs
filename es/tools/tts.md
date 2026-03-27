---
summary: "Conversión de texto a voz (TTS) para respuestas salientes"
read_when:
  - Enabling text-to-speech for replies
  - Configuring TTS providers or limits
  - Using /tts commands
title: "Conversión de texto a voz"
---

# Conversión de texto a voz (TTS)

OpenClaw puede convertir las respuestas salientes en audio utilizando ElevenLabs, Microsoft u OpenAI.
Funciona en cualquier lugar donde OpenClaw pueda enviar audio.

## Servicios compatibles

- **ElevenLabs** (proveedor principal o de reserva)
- **Microsoft** (proveedor principal o de reserva; la implementación empaquetada actual usa `node-edge-tts`, predeterminado cuando no hay claves API)
- **OpenAI** (proveedor principal o de reserva; también se usa para resúmenes)

### Notas sobre el voz de Microsoft

El proveedor de voz de Microsoft empaquetado actualmente utiliza el servicio de TTS neuronal en línea de Microsoft Edge a través de la biblioteca `node-edge-tts`. Es un servicio alojado (no local), utiliza puntos de conexión de Microsoft y no requiere una clave API.
`node-edge-tts` expone opciones de configuración de voz y formatos de salida, pero no todas las opciones son compatibles con el servicio. La configuración heredada y la entrada de directivas mediante `edge` todavía funcionan y se normalizan a `microsoft`.

Debido a que esta ruta es un servicio web público sin un SLA o cuota publicados, trátelo como mejor esfuerzo. Si necesita límites garantizados y soporte, use OpenAI o ElevenLabs.

## Claves opcionales

Si desea OpenAI o ElevenLabs:

- `ELEVENLABS_API_KEY` (o `XI_API_KEY`)
- `OPENAI_API_KEY`

El voz de Microsoft **no** requiere una clave API. Si no se encuentran claves API, OpenClaw usa Microsoft de forma predeterminada (a menos que esté deshabilitado mediante `messages.tts.microsoft.enabled=false` o `messages.tts.edge.enabled=false`).

Si se configuran varios proveedores, el proveedor seleccionado se usa primero y los otros son opciones de reserva.
El resumen automático usa el `summaryModel` configurado (o `agents.defaults.model.primary`), por lo que ese proveedor también debe estar autenticado si habilita los resúmenes.

## Enlaces de servicios

- [Guía de texto a voz de OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Referencia de la API de audio de OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [Texto a voz de ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Autenticación de ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formatos de salida de voz de Microsoft](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## ¿Está habilitado por defecto?

No. Auto‑TTS está **desactivado** por defecto. Actívalo en la configuración con
`messages.tts.auto` o por sesión con `/tts always` (alias: `/tts on`).

La voz de Microsoft **sí** está habilitada por defecto una vez que TTS está activado y se usa automáticamente
cuando no hay claves de API de OpenAI o ElevenLabs disponibles.

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
}
```

### Microsoft principal (sin clave API)

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "microsoft",
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
}
```

### Desactivar voz de Microsoft

```json5
{
  messages: {
    tts: {
      microsoft: {
        enabled: false,
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

### Desactivar auto-resumen para respuestas largas

```json5
{
  messages: {
    tts: {
      auto: "always",
    },
  },
}
```

A continuación, ejecute:

```
/tts summary off
```

### Notas sobre los campos

- `auto`: modo de TTS automático (`off`, `always`, `inbound`, `tagged`).
  - `inbound` solo envía audio después de un mensaje de voz entrante.
  - `tagged` solo envía audio cuando la respuesta incluye etiquetas `[[tts]]`.
- `enabled`: interruptor heredado (el médico lo migra a `auto`).
- `mode`: `"final"` (predeterminado) o `"all"` (incluye respuestas de herramientas/bloques).
- `provider`: id del proveedor de voz, como `"elevenlabs"`, `"microsoft"` o `"openai"` (el retorno automático es automático).
- Si `provider` está **sin establecer**, OpenClaw prefiere `openai` (si hay clave), luego `elevenlabs` (si hay clave),
  de lo contrario `microsoft`.
- El `provider: "edge"` heredado todavía funciona y se normaliza a `microsoft`.
- `summaryModel`: modelo barato opcional para el resumen automático; por defecto es `agents.defaults.model.primary`.
  - Acepta `provider/model` o un alias de modelo configurado.
- `modelOverrides`: permite al modelo emitir directivas TTS (activado por defecto).
  - `allowProvider` por defecto es `false` (el cambio de proveedor es opcional).
- `maxTextLength`: límite absoluto para la entrada TTS (caracteres). `/tts audio` falla si se excede.
- `timeoutMs`: tiempo de espera de la solicitud (ms).
- `prefsPath`: anula la ruta JSON de las preferencias locales (proveedor/límite/resumen).
- Los valores de `apiKey` recurren a las variables de entorno (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.baseUrl`: anula la URL base de la API de ElevenLabs.
- `openai.baseUrl`: anula el punto final de TTS de OpenAI.
  - Orden de resolución: `messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Los valores no predeterminados se tratan como puntos finales de TTS compatibles con OpenAI, por lo que se aceptan nombres de modelo y de voz personalizados.
- `elevenlabs.voiceSettings`:
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = normal)
- `elevenlabs.applyTextNormalization`: `auto|on|off`
- `elevenlabs.languageCode`: código de 2 letras ISO 639-1 (p. ej., `en`, `de`)
- `elevenlabs.seed`: entero `0..4294967295` (determinismo con el mejor esfuerzo)
- `microsoft.enabled`: permitir el uso de la voz de Microsoft (predeterminado `true`; sin clave de API).
- `microsoft.voice`: nombre de la voz neuronal de Microsoft (p. ej., `en-US-MichelleNeural`).
- `microsoft.lang`: código de idioma (p. ej., `en-US`).
- `microsoft.outputFormat`: formato de salida de Microsoft (p. ej., `audio-24khz-48kbitrate-mono-mp3`).
  - Consulte los formatos de salida de voz de Microsoft para conocer los valores válidos; no todos los formatos son compatibles con el transporte Edge respaldo incluido.
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`: cadenas de porcentaje (ej. `+10%`, `-5%`).
- `microsoft.saveSubtitles`: escribe subtítulos JSON junto con el archivo de audio.
- `microsoft.proxy`: URL de proxy para las solicitudes de voz de Microsoft.
- `microsoft.timeoutMs`: anulación del tiempo de espera de solicitud (ms).
- `edge.*`: alias heredado para la misma configuración de Microsoft.

## Anulaciones basadas en modelos (activadas de forma predeterminada)

De forma predeterminada, el modelo **puede** emitir directivas de TTS para una única respuesta.
Cuando `messages.tts.auto` es `tagged`, estas directivas son necesarias para activar el audio.

Cuando está habilitado, el modelo puede emitir directivas `[[tts:...]]` para anular la voz
para una sola respuesta, más un bloque opcional `[[tts:text]]...[[/tts:text]]` para
proporcionar etiquetas expresivas (risas, indicaciones de canto, etc.) que solo deben aparecer en
el audio.

Las directivas `provider=...` se ignoran a menos que `modelOverrides.allowProvider: true`.

Ejemplo de carga útil de respuesta:

```
Here you go.

[[tts:voiceId=pMsXgVXv3BLzUgSXRplE model=eleven_v3 speed=1.1]]
[[tts:text]](laughs) Read the song once more.[[/tts:text]]
```

Claves de directiva disponibles (cuando están habilitadas):

- `provider` (id de proveedor de voz registrado, por ejemplo `openai`, `elevenlabs`, o `microsoft`; requiere `allowProvider: true`)
- `voice` (voz de OpenAI) o `voiceId` (ElevenLabs)
- `model` (modelo TTS de OpenAI o id de modelo de ElevenLabs)
- `stability`, `similarityBoost`, `style`, `speed`, `useSpeakerBoost`
- `applyTextNormalization` (`auto|on|off`)
- `languageCode` (ISO 639-1)
- `seed`

Desactivar todas las anulaciones del modelo:

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

Lista de permitidos opcional (permite cambiar de proveedor mientras se mantienen otros controles configurables):

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

Los comandos de barra escriben anulaciones locales en `prefsPath` (predeterminado:
`~/.openclaw/settings/tts.json`, anular con `OPENCLAW_TTS_PREFS` o
`messages.tts.prefsPath`).

Campos almacenados:

- `enabled`
- `provider`
- `maxLength` (umbral de resumen; 1500 caracteres por defecto)
- `summarize` (predeterminado `true`)

Estos sobrescriben `messages.tts.*` para ese host.

## Formatos de salida (fijos)

- **Feishu / Matrix / Telegram / WhatsApp**: mensaje de voz Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48kHz / 64kbps es un buen compromiso para mensajes de voz.
- **Otros canales**: MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44.1kHz / 128kbps es el equilibrio predeterminado para la claridad del habla.
- **Microsoft**: usa `microsoft.outputFormat` (predeterminado `audio-24khz-48kbitrate-mono-mp3`).
  - El transporte incluido acepta un `outputFormat`, pero no todos los formatos están disponibles desde el servicio.
  - Los valores de formato de salida siguen los formatos de salida de Microsoft Speech (incluyendo Ogg/WebM Opus).
  - Telegram `sendVoice` acepta OGG/MP3/M4A; use OpenAI/ElevenLabs si necesita
    mensajes de voz Opus garantizados.
  - Si falla el formato de salida de Microsoft configurado, OpenClaw vuelve a intentar con MP3.

Los formatos de salida de OpenAI/ElevenLabs son fijos por canal (ver arriba).

## Comportamiento de TTS automático

Cuando está habilitado, OpenClaw:

- omite TTS si la respuesta ya contiene medios o una directiva `MEDIA:`.
- omite respuestas muy cortas (< 10 caracteres).
- resume las respuestas largas cuando se habilita usando `agents.defaults.model.primary` (o `summaryModel`).
- adjunta el audio generado a la respuesta.

Si la respuesta excede `maxLength` y el resumen está desactivado (o no hay clave API para el
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
Consulte [Comandos de barra](/es/tools/slash-commands) para obtener detalles sobre la habilitación.

Nota de Discord: `/tts` es un comando integrado de Discord, por lo que OpenClaw registra
`/voice` como el comando nativo allí. El texto `/tts ...` todavía funciona.

```
/tts off
/tts always
/tts inbound
/tts tagged
/tts status
/tts provider openai
/tts limit 2000
/tts summary off
/tts audio Hello from OpenClaw
```

Notas:

- Los comandos requieren un remitente autorizado (las reglas de lista blanca/propietario todavía se aplican).
- Debe estar habilitado `commands.text` o el registro de comandos nativos.
- `off|always|inbound|tagged` son interruptores por sesión (`/tts on` es un alias de `/tts always`).
- `limit` y `summary` se almacenan en las preferencias locales, no en la configuración principal.
- `/tts audio` genera una respuesta de audio única (no activa TTS).

## Herramienta de agente

La herramienta `tts` convierte texto a voz y devuelve un archivo de audio para
la entrega de la respuesta. Cuando el canal es Feishu, Matrix, Telegram o WhatsApp,
el audio se entrega como un mensaje de voz en lugar de como un archivo adjunto.

## RPC de puerta de enlace

Métodos de la puerta de enlace:

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import es from "/components/footer/es.mdx";

<es />

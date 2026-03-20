---
summary: "Conversión de texto a voz (TTS) para respuestas salientes"
read_when:
  - Habilitar la conversión de texto a voz para respuestas
  - Configurar proveedores o límites de TTS
  - Usar comandos /tts
title: "Conversión de texto a voz"
---

# Conversión de texto a voz (TTS)

OpenClaw puede convertir las respuestas salientes en audio usando ElevenLabs, Microsoft u OpenAI.
Funciona en cualquier lugar donde OpenClaw pueda enviar audio; Telegram recibe una burbuja de nota de voz redonda.

## Servicios compatibles

- **ElevenLabs** (proveedor principal o de respaldo)
- **Microsoft** (proveedor principal o de respaldo; la implementación empaquetada actual usa `node-edge-tts`, predeterminado cuando no hay claves API)
- **OpenAI** (proveedor principal o de respaldo; también se usa para resúmenes)

### Notas sobre el speech de Microsoft

El proveedor de speech de Microsoft empaquetado actualmente usa el servicio TTS neuronal
en línea de Microsoft Edge a través de la biblioteca `node-edge-tts`. Es un servicio hospedado (no
local), usa puntos de conexión de Microsoft y no requiere una clave API.
`node-edge-tts` expone opciones de configuración de voz y formatos de salida, pero
no todas las opciones son compatibles con el servicio. La configuración heredada y la entrada de directivas
usando `edge` todavía funcionan y se normalizan a `microsoft`.

Debido a que esta ruta es un servicio web público sin un SLA o cuota publicados,
trátelo como mejor esfuerzo. Si necesita límites y soporte garantizados, use OpenAI
o ElevenLabs.

## Claves opcionales

Si quiere OpenAI o ElevenLabs:

- `ELEVENLABS_API_KEY` (o `XI_API_KEY`)
- `OPENAI_API_KEY`

El speech de Microsoft **no** requiere una clave API. Si no se encuentran claves API,
OpenClaw usa Microsoft de forma predeterminada (a menos que se deshabilite a través de
`messages.tts.microsoft.enabled=false` o `messages.tts.edge.enabled=false`).

Si se configuran varios proveedores, el proveedor seleccionado se usa primero y los demás son opciones de respaldo.
El resumen automático usa el `summaryModel` configurado (o `agents.defaults.model.primary`),
por lo que ese proveedor también debe autenticarse si habilita los resúmenes.

## Enlaces de servicios

- [Guía de conversión de texto a voz de OpenAI](https://platform.openai.com/docs/guides/text-to-speech)
- [Referencia de la API de audio de OpenAI](https://platform.openai.com/docs/api-reference/audio)
- [Conversión de texto a voz de ElevenLabs](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [Autenticación de ElevenLabs](https://elevenlabs.io/docs/api-reference/authentication)
- [node-edge-tts](https://github.com/SchneeHertz/node-edge-tts)
- [Formatos de salida de Microsoft Speech](https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech#audio-outputs)

## ¿Está habilitado por defecto?

No. El TTS automático está **desactivado** por defecto. Actívalo en la configuración con
`messages.tts.auto` o por sesión con `/tts always` (alias: `/tts on`).

El discurso de Microsoft **sí** está habilitado por defecto una vez que el TTS está activado y se usa automáticamente
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

### OpenAI principal con respaldo de ElevenLabs

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

### Desactivar el discurso de Microsoft

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

### Responder solo con audio después de una nota de voz entrante

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
  - `inbound` solo envía audio después de una nota de voz entrante.
  - `tagged` solo envía audio cuando la respuesta incluye etiquetas `[[tts]]`.
- `enabled`: interruptor heredado (doctor migra esto a `auto`).
- `mode`: `"final"` (predeterminado) o `"all"` (incluye respuestas de herramientas/bloques).
- `provider`: id del proveedor de voz como `"elevenlabs"`, `"microsoft"` o `"openai"` (el respaldo es automático).
- Si `provider` no está **definido**, OpenClaw prefiere `openai` (si hay clave), luego `elevenlabs` (si hay clave),
  de lo contrario `microsoft`.
- El `provider: "edge"` heredado todavía funciona y se normaliza a `microsoft`.
- `summaryModel`: modelo económico opcional para el resumen automático; por defecto es `agents.defaults.model.primary`.
  - Acepta `provider/model` o un alias de modelo configurado.
- `modelOverrides`: permite que el modelo emita directivas TTS (activado por defecto).
  - `allowProvider` es por defecto `false` (el cambio de proveedor es opt-in).
- `maxTextLength`: límite máximo para la entrada TTS (caracteres). `/tts audio` falla si se excede.
- `timeoutMs`: tiempo de espera de la solicitud (ms).
- `prefsPath`: anula la ruta JSON de las preferencias locales (proveedor/límite/resumen).
- Los valores de `apiKey` recurren a las variables de entorno (`ELEVENLABS_API_KEY`/`XI_API_KEY`, `OPENAI_API_KEY`).
- `elevenlabs.baseUrl`: anula la URL base de la API de ElevenLabs.
- `openai.baseUrl`: anula el punto final de TTS de OpenAI.
  - Orden de resolución: `messages.tts.openai.baseUrl` -> `OPENAI_TTS_BASE_URL` -> `https://api.openai.com/v1`
  - Los valores no predeterminados se tratan como puntos finales TTS compatibles con OpenAI, por lo que se aceptan nombres de modelo y voz personalizados.
- `elevenlabs.voiceSettings`:
  - `stability`, `similarityBoost`, `style`: `0..1`
  - `useSpeakerBoost`: `true|false`
  - `speed`: `0.5..2.0` (1.0 = normal)
- `elevenlabs.applyTextNormalization`: `auto|on|off`
- `elevenlabs.languageCode`: ISO 639-1 de 2 letras (p. ej., `en`, `de`)
- `elevenlabs.seed`: `0..4294967295` entero (determinismo de mejor esfuerzo)
- `microsoft.enabled`: permite el uso de voz de Microsoft (por defecto `true`; sin clave de API).
- `microsoft.voice`: nombre de la voz neuronal de Microsoft (p. ej., `en-US-MichelleNeural`).
- `microsoft.lang`: código de idioma (p. ej., `en-US`).
- `microsoft.outputFormat`: formato de salida de Microsoft (p. ej., `audio-24khz-48kbitrate-mono-mp3`).
  - Consulte los formatos de salida de Microsoft Speech para ver los valores válidos; no todos los formatos son compatibles con el transporte Edge incluido.
- `microsoft.rate` / `microsoft.pitch` / `microsoft.volume`: cadenas de porcentaje (por ejemplo, `+10%`, `-5%`).
- `microsoft.saveSubtitles`: escribe subtítulos JSON junto al archivo de audio.
- `microsoft.proxy`: URL de proxy para las solicitudes de Microsoft Speech.
- `microsoft.timeoutMs`: anulación del tiempo de espera de la solicitud (ms).
- `edge.*`: alias heredado para la misma configuración de Microsoft.

## Anulaciones controladas por el modelo (activadas por defecto)

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

Claves de directiva disponibles (cuando están activadas):

- `provider` (id de proveedor de voz registrado, por ejemplo `openai`, `elevenlabs` o `microsoft`; requiere `allowProvider: true`)
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

Lista de permitidos opcional (activar el cambio de proveedor manteniendo los otros controles configurables):

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

Estos anulan `messages.tts.*` para ese host.

## Formatos de salida (fijos)

- **Telegram**: nota de voz Opus (`opus_48000_64` de ElevenLabs, `opus` de OpenAI).
  - 48kHz / 64kbps es un buen equilibrio para notas de voz y es necesario para el bocadillo redondo.
- **Otros canales**: MP3 (`mp3_44100_128` de ElevenLabs, `mp3` de OpenAI).
  - 44.1kHz / 128kbps es el equilibrio predeterminado para la claridad del habla.
- **Microsoft**: usa `microsoft.outputFormat` (predeterminado `audio-24khz-48kbitrate-mono-mp3`).
  - El transporte incluido acepta un `outputFormat`, pero no todos los formatos están disponibles desde el servicio.
  - Los valores del formato de salida siguen los formatos de salida de Microsoft Speech (incluyendo Ogg/WebM Opus).
  - El `sendVoice` de Telegram acepta OGG/MP3/M4A; usa OpenAI/ElevenLabs si necesitas
    notas de voz Opus garantizadas.
  - Si falla el formato de salida de Microsoft configurado, OpenClaw reintenta con MP3.

Los formatos de OpenAI/ElevenLabs son fijos; Telegram espera Opus para la experiencia de usuario de notas de voz.

## Comportamiento de TTS automática

Cuando está habilitado, OpenClaw:

- omite TTS si la respuesta ya contiene medios o una directiva `MEDIA:`.
- omite respuestas muy cortas (< 10 caracteres).
- resume respuestas largas cuando está habilitado usando `agents.defaults.model.primary` (o `summaryModel`).
- adjunta el audio generado a la respuesta.

Si la respuesta excede `maxLength` y el resumen está desactivado (o no hay clave de API para el
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
Consulta [Slash commands](/es/tools/slash-commands) para detalles de habilitación.

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
- Se debe habilitar `commands.text` o el registro de comandos nativos.
- `off|always|inbound|tagged` son interruptores por sesión (`/tts on` es un alias para `/tts always`).
- `limit` y `summary` se almacenan en las preferencias locales, no en la configuración principal.
- `/tts audio` genera una respuesta de audio única (no activa el TTS).

## Herramienta de agente

La herramienta `tts` convierte texto a voz y devuelve una ruta de `MEDIA:`. Cuando el
resultado es compatible con Telegram, la herramienta incluye `[[audio_as_voice]]` para que
Telegram envíe una burbuja de voz.

## RPC de puerta de enlace

Métodos de puerta de enlace:

- `tts.status`
- `tts.enable`
- `tts.disable`
- `tts.convert`
- `tts.setProvider`
- `tts.providers`

import es from "/components/footer/es.mdx";

<es />

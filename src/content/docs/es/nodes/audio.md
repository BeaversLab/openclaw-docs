---
summary: "Cómo se descargan, transcriben e inyectan las notas de audio/voz entrantes en las respuestas"
read_when:
  - Changing audio transcription or media handling
title: "Notas de audio y voz"
---

# Audio / Voice Notes (2026-01-17)

## Lo que funciona

- **Comprensión de medios (audio)**: Si la comprensión de audio está habilitada (o se detecta automáticamente), OpenClaw:
  1. Localiza el primer archivo de audio adjunto (ruta local o URL) y lo descarga si es necesario.
  2. Fuerza `maxBytes` antes de enviarlo a cada entrada de modelo.
  3. Ejecuta la primera entrada de modelo elegible en orden (proveedor o CLI).
  4. Si falla o se omite (tamaño/timeout), intenta con la siguiente entrada.
  5. Si tiene éxito, reemplaza `Body` con un bloque `[Audio]` y establece `{{Transcript}}`.
- **Análisis de comandos**: Cuando la transcripción tiene éxito, `CommandBody`/`RawBody` se establecen en la transcripción para que los comandos de barra inclinada sigan funcionando.
- **Registro detallado**: En `--verbose`, registramos cuándo se ejecuta la transcripción y cuándo reemplaza el cuerpo.

## Detección automática (predeterminado)

Si **no configuras modelos** y `tools.media.audio.enabled` **no** está establecido en `false`,
OpenClaw se autodetecta en este orden y se detiene en la primera opción que funcione:

1. **Modelo de respuesta activo** cuando su proveedor admite la comprensión de audio.
2. **CLIs locales** (si están instalados)
   - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unidor/tokens)
   - `whisper-cli` (de `whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo pequeño incluido)
   - `whisper` (CLI de Python; descarga modelos automáticamente)
3. **Gemini CLI** (`gemini`) usando `read_many_files`
4. **Autenticación del proveedor**
   - Las entradas `models.providers.*` configuradas que soportan audio se prueban primero
   - Orden de reserva incluido: OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

Para desactivar la autodetección, establece `tools.media.audio.enabled: false`.
Para personalizar, establece `tools.media.audio.models`.
Nota: La detección de binarios es de mejor esfuerzo en macOS/Linux/Windows; asegúrate de que la CLI esté en `PATH` (nosotros expandimos `~`), o establece un modelo CLI explícito con una ruta de comando completa.

## Ejemplos de configuración

### Proveedor + reserva de CLI (OpenAI + Whisper CLI)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### Solo proveedor con control de ámbito (scope gating)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### Solo proveedor (Deepgram)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### Solo proveedor (Mistral Voxtral)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### Solo proveedor (SenseAudio)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "senseaudio", model: "senseaudio-asr-pro-1.5-260319" }],
      },
    },
  },
}
```

### Eco de la transcripción al chat (opcional)

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // default is false
        echoFormat: '📝 "{transcript}"', // optional, supports {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## Notas y límites

- La autenticación del proveedor sigue el orden estándar de autenticación de modelos (perfiles de autenticación, variables de entorno, `models.providers.*.apiKey`).
- Detalles de configuración de Groq: [Groq](/es/providers/groq).
- Deepgram recoge `DEEPGRAM_API_KEY` cuando se usa `provider: "deepgram"`.
- Detalles de configuración de Deepgram: [Deepgram (transcripción de audio)](/es/providers/deepgram).
- Detalles de configuración de Mistral: [Mistral](/es/providers/mistral).
- SenseAudio detecta `SENSEAUDIO_API_KEY` cuando se usa `provider: "senseaudio"`.
- Detalles de configuración de SenseAudio: [SenseAudio](/es/providers/senseaudio).
- Los proveedores de audio pueden anular `baseUrl`, `headers` y `providerOptions` a través de `tools.media.audio`.
- El límite de tamaño predeterminado es de 20 MB (`tools.media.audio.maxBytes`). Se omite el audio de tamaño excesivo para ese modelo y se prueba la siguiente entrada.
- Los archivos de audio pequeños/vacíos de menos de 1024 bytes se omiten antes de la transcripción del proveedor/CLI.
- El `maxChars` predeterminado para el audio está **sin establecer** (transcripción completa). Establezca `tools.media.audio.maxChars` o `maxChars` por entrada para recortar la salida.
- El valor automático predeterminado de OpenAI es `gpt-4o-mini-transcribe`; establezca `model: "gpt-4o-transcribe"` para mayor precisión.
- Use `tools.media.audio.attachments` para procesar varias notas de voz (`mode: "all"` + `maxAttachments`).
- La transcripción está disponible para las plantillas como `{{Transcript}}`.
- `tools.media.audio.echoTranscript` está desactivado de forma predeterminada; actívelo para enviar la confirmación de la transcripción de vuelta al chat de origen antes del procesamiento del agente.
- `tools.media.audio.echoFormat` personaliza el texto de eco (marcador de posición: `{transcript}`).
- La salida estándar de la CLI está limitada (5 MB); mantenga la salida de la CLI concisa.
- La `args` de la CLI debe usar `{{MediaPath}}` para la ruta del archivo de audio local. Ejecute `openclaw doctor --fix` para migrar los marcadores de posición `{input}` en desuso de configuraciones `audio.transcription.command` más antiguas.

### Soporte de entorno de proxy

La transcripción de audio basada en proveedores respeta las variables de entorno de proxy de salida estándar:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

Si no se establecen variables de entorno de proxy, se utiliza una salida directa. Si la configuración del proxy está malformada, OpenClaw registra una advertencia y recurre a una obtención directa.

## Detección de menciones en grupos

Cuando `requireMention: true` está establecido para un chat grupal, OpenClaw ahora transcribe el audio **antes** de verificar si hay menciones. Esto permite que las notas de voz se procesen incluso si contienen menciones.

**Cómo funciona:**

1. Si un mensaje de voz no tiene cuerpo de texto y el grupo requiere menciones, OpenClaw realiza una transcripción "previa al vuelo".
2. Se verifica si la transcripción contiene patrones de mención (ej., `@BotName`, disparadores de emoji).
3. Si se encuentra una mención, el mensaje continúa por la canalización completa de respuesta.
4. La transcripción se utiliza para la detección de menciones para que las notas de voz puedan pasar el filtro de menciones.

**Comportamiento de reserva:**

- Si la transcripción falla durante la etapa previa al vuelo (tiempo de espera, error de API, etc.), el mensaje se procesa basándose solo en la detección de menciones por texto.
- Esto garantiza que los mensajes mixtos (texto + audio) nunca se descarten incorrectamente.

**Opt-out por grupo/tema de Telegram:**

- Establezca `channels.telegram.groups.<chatId>.disableAudioPreflight: true` para omitir las verificaciones de mención en la transcripción previa al vuelo para ese grupo.
- Establezca `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` para anular por tema (`true` para omitir, `false` para forzar la habilitación).
- El valor predeterminado es `false` (previo al vuelo habilitado cuando coinciden las condiciones de filtrado por mención).

**Ejemplo:** Un usuario envía una nota de voz diciendo "Oye @Claude, ¿cuál es el clima?" en un grupo de Telegram con `requireMention: true`. La nota de voz se transcribe, se detecta la mención y el agente responde.

## Consideraciones

- Las reglas de alcance utilizan el primer partido ganador. `chatType` se normaliza a `direct`, `group`, o `room`.
- Asegúrese de que su CLI salga con 0 e imprima texto plano; el JSON debe ser procesado a través de `jq -r .text`.
- Para `parakeet-mlx`, si pasa `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando `--output-format` es `txt` (u omitido); los formatos de salida que no son `txt` recurren al análisis de stdout.
- Mantenga los tiempos de espera razonables (`timeoutSeconds`, 60s por defecto) para evitar bloquear la cola de respuesta.
- La transcripción previa al vuelo solo procesa el **primer** archivo de audio adjunto para la detección de menciones. El audio adicional se procesa durante la fase principal de comprensión de medios.

## Relacionado

- [Comprensión de medios](/es/nodes/media-understanding)
- [Modo de conversación](/es/nodes/talk)
- [Activación por voz](/es/nodes/voicewake)

---
summary: "Cómo se descargan, transcriben e inyectan las notas de audio/voz entrantes en las respuestas"
read_when:
  - Changing audio transcription or media handling
title: "Notas de audio y voz"
---

## Lo que funciona

- **Comprensión de medios (audio)**: Si la comprensión de audio está habilitada (o se detecta automáticamente), OpenClaw:
  1. Localiza el primer archivo de audio adjunto (ruta local o URL) y lo descarga si es necesario.
  2. Fuerza `maxBytes` antes de enviarlo a cada entrada del modelo.
  3. Ejecuta la primera entrada de modelo elegible en orden (proveedor o CLI).
  4. Si falla o se omite (tamaño/tiempo de espera), intenta con la siguiente entrada.
  5. Si tiene éxito, reemplaza `Body` con un bloque `[Audio]` y establece `{{Transcript}}`.
- **Análisis de comandos**: Cuando la transcripción tiene éxito, `CommandBody`/`RawBody` se establecen en la transcripción para que los comandos de barra diagonal sigan funcionando.
- **Registro detallado**: En `--verbose`, registramos cuándo se ejecuta la transcripción y cuándo reemplaza el cuerpo.

## Detección automática (predeterminada)

Si **no configura modelos** y `tools.media.audio.enabled` **no** está establecido en `false`,
OpenClaw detecta automáticamente en este orden y se detiene en la primera opción que funcione:

1. **Modelo de respuesta activo** cuando su proveedor admite la comprensión de audio.
2. **CLIs locales** (si están instaladas)
   - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unidor/tokens)
   - `whisper-cli` (de `whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo pequeño incluido)
   - `whisper` (CLI de Python; descarga modelos automáticamente)
3. **CLI de Gemini** (`gemini`) usando `read_many_files`
4. **Autenticación del proveedor**
   - Las entradas `models.providers.*` configuradas que admiten audio se prueban primero
   - Orden de reserva incluido: OpenAI → Groq → xAI → Deepgram → Google → SenseAudio → ElevenLabs → Mistral

Para desactivar la detección automática, configure `tools.media.audio.enabled: false`.
Para personalizar, configure `tools.media.audio.models`.
Nota: La detección de binarios se realiza con el mejor esfuerzo posible en macOS/Linux/Windows; asegúrese de que la CLI esté en `PATH` (nosotros expandimos `~`), o configure un modelo CLI explícito con una ruta de comando completa.

## Ejemplos de configuración

### Proveedor + respaldo CLI (OpenAI + Whisper CLI)

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

### Solo proveedor con control de ámbito

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

### Hacer eco de la transcripción en el chat (opcional)

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

- La autenticación del proveedor sigue el orden estándar de autenticación del modelo (perfiles de autenticación, variables de entorno, `models.providers.*.apiKey`).
- Detalles de configuración de Groq: [Groq](/es/providers/groq).
- Deepgram detecta `DEEPGRAM_API_KEY` cuando se usa `provider: "deepgram"`.
- Detalles de configuración de Deepgram: [Deepgram (transcripción de audio)](/es/providers/deepgram).
- Detalles de configuración de Mistral: [Mistral](/es/providers/mistral).
- SenseAudio detecta `SENSEAUDIO_API_KEY` cuando se usa `provider: "senseaudio"`.
- Detalles de configuración de SenseAudio: [SenseAudio](/es/providers/senseaudio).
- Los proveedores de audio pueden anular `baseUrl`, `headers` y `providerOptions` a través de `tools.media.audio`.
- El límite de tamaño predeterminado es de 20MB (`tools.media.audio.maxBytes`). El audio excesivo se omite para ese modelo y se prueba la siguiente entrada.
- Los archivos de audio pequeños o vacíos de menos de 1024 bytes se omiten antes de la transcripción del proveedor/CLI.
- El `maxChars` predeterminado para el audio está **sin establecer** (transcripción completa). Configure `tools.media.audio.maxChars` o `maxChars` por entrada para recortar la salida.
- El valor predeterminado automático de OpenAI es `gpt-4o-mini-transcribe`; configure `model: "gpt-4o-transcribe"` para obtener una mayor precisión.
- Use `tools.media.audio.attachments` para procesar múltiples notas de voz (`mode: "all"` + `maxAttachments`).
- La transcripción está disponible para las plantillas como `{{Transcript}}`.
- `tools.media.audio.echoTranscript` está desactivado de forma predeterminada; actívelo para enviar la confirmación de la transcripción de vuelta al chat de origen antes del procesamiento del agente.
- `tools.media.audio.echoFormat` personaliza el texto de eco (marcador de posición: `{transcript}`).
- La salida estándar de la CLI está limitada (5 MB); mantenga la salida de la CLI concisa.
- La CLI `args` debe usar `{{MediaPath}}` para la ruta del archivo de audio local. Ejecute `openclaw doctor --fix` para migrar los marcadores de posición `{input}` obsoletos de las configuraciones `audio.transcription.command` anteriores.

### Soporte de entorno de proxy

La transcripción de audio basada en proveedores respeta las variables de entorno de proxy de salida estándar:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

Si no se configuran variables de entorno de proxy, se utiliza una salida directa. Si la configuración del proxy tiene un formato incorrecto, OpenClaw registra una advertencia y recurre a una recuperación directa.

## Detección de menciones en grupos

Cuando `requireMention: true` está configurado para un chat grupal, OpenClaw ahora transcribe el audio **antes** de verificar las menciones. Esto permite que las notas de voz se procesen incluso cuando contienen menciones.

**Cómo funciona:**

1. Si un mensaje de voz no tiene cuerpo de texto y el grupo requiere menciones, OpenClaw realiza una transcripción de "prevuelo".
2. Se verifica la transcripción en busca de patrones de mención (por ejemplo, `@BotName`, activadores de emoji).
3. Si se encuentra una mención, el mensaje continúa a través de la canalización completa de respuesta.
4. La transcripción se utiliza para la detección de menciones, de modo que las notas de voz puedan pasar el filtro de menciones.

**Comportamiento de reserva:**

- Si la transcripción falla durante el prevuelo (tiempo de espera, error de API, etc.), el mensaje se procesa basándose únicamente en la detección de menciones por texto.
- Esto garantiza que los mensajes mixtos (texto + audio) nunca se descarten incorrectamente.

**Opt-out por grupo/tema de Telegram:**

- Establezca `channels.telegram.groups.<chatId>.disableAudioPreflight: true` para omitir las comprobaciones de mención de transcripción previa al vuelo para ese grupo.
- Establezca `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` para anular por tema (`true` para omitir, `false` para forzar la habilitación).
- El valor predeterminado es `false` (preparación previa habilitada cuando coinciden las condiciones de mención limitada).

**Ejemplo:** Un usuario envía una nota de voz diciendo "Hola @Claude, ¿cómo está el clima?" en un grupo de Telegram con `requireMention: true`. La nota de voz se transcribe, se detecta la mención y el agente responde.

## Trampas

- Las reglas de alcance usan el primer partido gana. `chatType` se normaliza a `direct`, `group` o `room`.
- Asegúrese de que su CLI salga con 0 e imprima texto sin formato; JSON debe ser procesado a través de `jq -r .text`.
- Para `parakeet-mlx`, si pasas `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando `--output-format` es `txt` (o se omite); los formatos de salida que no son `txt` vuelven al análisis de stdout.
- Mantén los tiempos de espera razonables (`timeoutSeconds`, 60s por defecto) para evitar bloquear la cola de respuestas.
- La transcripción previa solo procesa el **primer** archivo de audio para la detección de menciones. El audio adicional se procesa durante la fase principal de comprensión de medios.

## Relacionado

- [Comprensión de medios](/es/nodes/media-understanding)
- [Modo de conversación](/es/nodes/talk)
- [Activación por voz](/es/nodes/voicewake)

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
  2. Hace cumplir `maxBytes` antes de enviarlo a cada entrada de modelo.
  3. Ejecuta la primera entrada de modelo elegible en orden (proveedor o CLI).
  4. Si falla o se omite (tamaño/timeout), intenta con la siguiente entrada.
  5. Si tiene éxito, reemplaza `Body` con un bloque `[Audio]` y establece `{{Transcript}}`.
- **Análisis de comandos**: Cuando la transcripción tiene éxito, `CommandBody`/`RawBody` se establecen en la transcripción para que los comandos de barra diagonal sigan funcionando.
- **Registro detallado**: En `--verbose`, registramos cuándo se ejecuta la transcripción y cuándo reemplaza el cuerpo.

## Detección automática (predeterminado)

Si **no configuras modelos** y `tools.media.audio.enabled` **no** está establecido en `false`,
OpenClaw detecta automáticamente en este orden y se detiene en la primera opción funcional:

1. **CLIs locales** (si están instaladas)
   - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unidor/tokens)
   - `whisper-cli` (de `whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo tiny incluido)
   - `whisper` (CLI de Python; descarga modelos automáticamente)
2. **CLI de Gemini** (`gemini`) usando `read_many_files`
3. **Claves de proveedor** (OpenAI → Groq → Deepgram → Google)

Para desactivar la detección automática, establece `tools.media.audio.enabled: false`.
Para personalizar, establece `tools.media.audio.models`.
Nota: La detección de binarios es de mejor esfuerzo en macOS/Linux/Windows; asegúrate de que la CLI esté en `PATH` (expandimos `~`), o establece un modelo CLI explícito con una ruta de comando completa.

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

### Solo proveedor con filtrado de ámbito (scope gating)

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

### Repetir transcripción en el chat (opcional)

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

- La autenticación del proveedor sigue el orden de autenticación estándar del modelo (perfiles de autenticación, variables de entorno, `models.providers.*.apiKey`).
- Deepgram detecta `DEEPGRAM_API_KEY` cuando se usa `provider: "deepgram"`.
- Detalles de configuración de Deepgram: [Deepgram (transcripción de audio)](/es/providers/deepgram).
- Detalles de configuración de Mistral: [Mistral](/es/providers/mistral).
- Los proveedores de audio pueden anular `baseUrl`, `headers` y `providerOptions` a través de `tools.media.audio`.
- El límite de tamaño predeterminado es de 20 MB (`tools.media.audio.maxBytes`). El audio de tamaño excesivo se omite para ese modelo y se prueba la siguiente entrada.
- Los archivos de audio pequeños/vacíos de menos de 1024 bytes se omiten antes de la transcripción del proveedor/CLI.
- El `maxChars` predeterminado para el audio está **sin establecer** (transcripción completa). Establezca `tools.media.audio.maxChars` o `maxChars` por entrada para recortar la salida.
- El valor automático predeterminado de OpenAI es `gpt-4o-mini-transcribe`; establezca `model: "gpt-4o-transcribe"` para mayor precisión.
- Use `tools.media.audio.attachments` para procesar varias notas de voz (`mode: "all"` + `maxAttachments`).
- La transcripción está disponible para las plantillas como `{{Transcript}}`.
- `tools.media.audio.echoTranscript` está desactivado de forma predeterminada; actívelo para enviar la confirmación de la transcripción de vuelta al chat de origen antes del procesamiento del agente.
- `tools.media.audio.echoFormat` personaliza el texto de eco (marcador de posición: `{transcript}`).
- La salida estándar de CLI está limitada (5 MB); mantenga la salida de CLI concisa.

### Soporte de entorno de proxy

La transcripción de audio basada en proveedores respeta las variables de entorno de proxy de salida estándar:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si no se establecen variables de entorno de proxy, se usa una salida directa. Si la configuración del proxy está mal formada, OpenClaw registra una advertencia y vuelve a una obtención directa.

## Detección de menciones en grupos

Cuando `requireMention: true` está configurado para un chat de grupo, OpenClaw ahora transcribe el audio **antes** de verificar las menciones. Esto permite que las notas de voz se procesen incluso cuando contienen menciones.

**Cómo funciona:**

1. Si un mensaje de voz no tiene cuerpo de texto y el grupo requiere menciones, OpenClaw realiza una transcripción de "preverificación".
2. Se verifica si la transcripción contiene patrones de mención (ej., `@BotName`, activadores de emoji).
3. Si se encuentra una mención, el mensaje continúa a través de la tubería completa de respuesta.
4. La transcripción se utiliza para la detección de menciones para que las notas de voz puedan pasar el filtro de menciones.

**Comportamiento alternativo:**

- Si la transcripción falla durante la preverificación (tiempo de espera agotado, error de API, etc.), el mensaje se procesa basándose únicamente en la detección de menciones por texto.
- Esto asegura que los mensajes mixtos (texto + audio) nunca se descarten incorrectamente.

**Opt-out por grupo/tema de Telegram:**

- Establezca `channels.telegram.groups.<chatId>.disableAudioPreflight: true` para omitir las verificaciones de mención en la transcripción de preverificación para ese grupo.
- Establezca `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` para anular por tema (`true` para omitir, `false` para forzar la habilitación).
- El valor predeterminado es `false` (preverificación habilitada cuando coinciden las condiciones de filtrado por menciones).

**Ejemplo:** Un usuario envía una nota de voz diciendo "Oye @Claude, ¿cuál es el clima?" en un grupo de Telegram con `requireMention: true`. La nota de voz se transcribe, se detecta la mención y el agente responde.

## Gotchas

- Las reglas de alcance usan el primero que coincida. `chatType` se normaliza a `direct`, `group` o `room`.
- Asegúrese de que su CLI salga con 0 e imprima texto plano; el JSON necesita ser procesado mediante `jq -r .text`.
- Para `parakeet-mlx`, si pasa `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando `--output-format` es `txt` (u omitido); los formatos de salida que no sean `txt` recurren al análisis de stdout.
- Mantenga los tiempos de espera razonables (`timeoutSeconds`, predeterminado 60s) para evitar bloquear la cola de respuesta.
- La transcripción previa solo procesa el **primer** archivo de audio adjunto para la detección de menciones. El audio adicional se procesa durante la fase principal de comprensión de medios.

import es from "/components/footer/es.mdx";

<es />

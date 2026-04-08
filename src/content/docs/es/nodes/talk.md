---
summary: "Modo de charla: conversaciones continuas de voz con TTS de ElevenLabs"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Modo de charla"
---

# Modo de charla

El modo de charla es un bucle continuo de conversación por voz:

1. Escuchar el habla
2. Enviar la transcripción al modelo (sesión principal, chat.send)
3. Esperar la respuesta
4. Lo pronuncia mediante el proveedor de Talk configurado (`talk.speak`)

## Comportamiento (macOS)

- **Superposición siempre activa** mientras el modo de charla está habilitado.
- Transiciones de fase **Escuchar → Pensar → Hablar**.
- En una **pausa corta** (ventana de silencio), se envía la transcripción actual.
- Las respuestas se **escriben en WebChat** (igual que al escribir).
- **Interrumpir al hablar** (activado por defecto): si el usuario empieza a hablar mientras el asistente está hablando, detenemos la reproducción y anotamos la marca de tiempo de la interrupción para el siguiente mensaje.

## Directivas de voz en las respuestas

El asistente puede prefijar su respuesta con una **única línea JSON** para controlar la voz:

```json
{ "voice": "<voice-id>", "once": true }
```

Reglas:

- Solo la primera línea no vacía.
- Las claves desconocidas se ignoran.
- `once: true` se aplica solo a la respuesta actual.
- Sin `once`, la voz se convierte en la nueva predeterminada para el modo Talk.
- La línea JSON se elimina antes de la reproducción TTS.

Claves compatibles:

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Config (`~/.openclaw/openclaw.json`)

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

Valores predeterminados:

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: cuando no está establecido, Talk mantiene la ventana de pausa predeterminada de la plataforma antes de enviar la transcripción (`700 ms on macOS and Android, 900 ms on iOS`)
- `voiceId`: recurre a `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (o a la primera voz de ElevenLabs cuando la clave API está disponible)
- `modelId`: por defecto es `eleven_v3` cuando no está establecido
- `apiKey`: recurre a `ELEVENLABS_API_KEY` (o al perfil de shell de la puerta de enlace si está disponible)
- `outputFormat`: por defecto es `pcm_44100` en macOS/iOS y `pcm_24000` en Android (establezca `mp3_*` para forzar el streaming MP3)

## Interfaz de usuario de macOS

- Interruptor de la barra de menús: **Hablar**
- Pestaña Config: grupo **Modo Hablar** (id. de voz + interruptor de interrupción)
- Superposición:
  - **Escuchando**: la nube pulsa con el nivel del micrófono
  - **Pensando**: animación de hundimiento
  - **Hablando**: anillos radiantes
  - Clic en la nube: detener habla
  - Clic en X: salir del modo Hablar

## Notas

- Requiere permisos de Voz + Micrófono.
- Usa `chat.send` contra la clave de sesión `main`.
- La puerta de enlace resuelve la reproducción de Talk a través de `talk.speak` usando el proveedor de Talk activo. Android recurre al TTS del sistema local solo cuando ese RPC no está disponible.
- `stability` para `eleven_v3` se valida como `0.0`, `0.5` o `1.0`; otros modelos aceptan `0..1`.
- `latency_tier` se valida como `0..4` cuando se establece.
- Android admite los formatos de salida `pcm_16000`, `pcm_22050`, `pcm_24000` y `pcm_44100` para la transmisión AudioTrack de baja latencia.

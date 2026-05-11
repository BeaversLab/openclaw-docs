---
summary: "Modo de conversación: conversaciones continuas por voz con proveedores de TTS configurados"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Modo de conversación"
---

El modo de conversación es un bucle continuo de conversación por voz:

1. Escuchar el habla
2. Enviar la transcripción al modelo (sesión principal, chat.send)
3. Esperar la respuesta
4. Reproducirla mediante el proveedor de Talk configurado (`talk.speak`)

## Comportamiento (macOS)

- **Superposición siempre activa** mientras el modo de conversación está habilitado.
- Transiciones de fase **Escuchando → Pensando → Hablando**.
- En una **pausa corta** (ventana de silencio), se envía la transcripción actual.
- Las respuestas se **escriben en WebChat** (igual que al escribir).
- **Interrumpir al hablar** (activado por defecto): si el usuario comienza a hablar mientras el asistente está hablando, detenemos la reproducción y anotamos la marca de tiempo de interrupción para el siguiente aviso.

## Directivas de voz en las respuestas

El asistente puede prefijar su respuesta con una **única línea JSON** para controlar la voz:

```json
{ "voice": "<voice-id>", "once": true }
```

Reglas:

- Solo la primera línea no vacía.
- Se ignoran las claves desconocidas.
- `once: true` se aplica solo a la respuesta actual.
- Sin `once`, la voz se convierte en el nuevo predeterminado para el modo de conversación.
- La línea JSON se elimina antes de la reproducción de TTS.

Claves compatibles:

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`, `rate` (PPM), `stability`, `similarity`, `style`, `speakerBoost`
- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`
- `once`

## Configuración (`~/.openclaw/openclaw.json`)

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

Valores predeterminados:

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: cuando no está configurado, Talk mantiene la ventana de pausa predeterminada de la plataforma antes de enviar la transcripción (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`: selecciona el proveedor de Talk activo. Use `elevenlabs`, `mlx` o `system` para las rutas de reproducción local de macOS.
- `providers.<provider>.voiceId`: vuelve a `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` para ElevenLabs (o a la primera voz de ElevenLabs cuando la clave de API está disponible).
- `providers.elevenlabs.modelId`: por defecto es `eleven_v3` si no se establece.
- `providers.mlx.modelId`: por defecto es `mlx-community/Soprano-80M-bf16` si no se establece.
- `providers.elevenlabs.apiKey`: vuelve a `ELEVENLABS_API_KEY` (o al perfil de shell de la puerta de enlace si está disponible).
- `speechLocale`: id de configuración regional BCP 47 opcional para el reconocimiento de voz de Talk en el dispositivo en iOS/macOS. Déjelo sin establecer para usar el predeterminado del dispositivo.
- `outputFormat`: por defecto es `pcm_44100` en macOS/iOS y `pcm_24000` en Android (establezca `mp3_*` para forzar el streaming MP3)

## Interfaz de usuario de macOS

- Alternar barra de menús: **Talk**
- Pestaña Config: grupo **Talk Mode** (id de voz + alternar interrupción)
- Superposición:
  - **Escuchando**: la nube pulsa con el nivel del micrófono
  - **Pensando**: animación de hundimiento
  - **Hablando**: anillos radiantes
  - Hacer clic en la nube: dejar de hablar
  - Hacer clic en X: salir del modo Talk

## Interfaz de usuario de Android

- Alternar pestaña Voz: **Talk**
- El **Micrófono** manual y **Talk** son modos de captura en tiempo de ejecución mutuamente excluyentes.
- El micrófono manual se detiene cuando la aplicación sale del primer plano o el usuario sale de la pestaña Voz.
- El modo Talk sigue ejecutándose hasta que se desactiva o el nodo de Android se desconecta, y utiliza el tipo de servicio en primer plano del micrófono de Android mientras está activo.

## Notas

- Requiere permisos de Voz + Micrófono.
- Usa `chat.send` contra la clave de sesión `main`.
- La puerta de enlace resuelve la reproducción de Talk a través de `talk.speak` usando el proveedor de Talk activo. Android vuelve al sistema TTS local solo cuando ese RPC no está disponible.
- La reproducción local MLX de macOS usa el asistente incluido `openclaw-mlx-tts` cuando está presente, o un ejecutable en `PATH`. Establezca `OPENCLAW_MLX_TTS_BIN` para apuntar a un asistente binario personalizado durante el desarrollo.
- `stability` para `eleven_v3` se valida como `0.0`, `0.5` o `1.0`; otros modelos aceptan `0..1`.
- `latency_tier` se valida como `0..4` cuando se establece.
- Android admite los formatos de salida `pcm_16000`, `pcm_22050`, `pcm_24000` y `pcm_44100` para la transmisión AudioTrack de baja latencia.

## Relacionado

- [Activación por voz](/es/nodes/voicewake)
- [Notas de audio y voz](/es/nodes/audio)
- [Comprensión de medios](/es/nodes/media-understanding)

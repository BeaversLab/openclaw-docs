---
summary: "Modo Talk: conversaciones de voz continua a través de STT/TTS local y voz en tiempo real"
read_when:
  - Implementing Talk mode on macOS/iOS/Android
  - Changing voice/TTS/interrupt behavior
title: "Modo de conversación"
---

El modo Talk tiene dos formas de ejecución:

- El modo Talk nativo de macOS/iOS/Android utiliza reconocimiento de voz local, chat de Gateway y TTS `talk.speak`. Los nodos anuncian la capacidad `talk` y declaran los comandos `talk.*` que admiten.
- El modo Talk en el navegador utiliza `talk.client.create` para sesiones `webrtc` y `provider-websocket` propiedad del cliente, o `talk.session.create` para sesiones `gateway-relay` propiedad del Gateway. `managed-room` está reservado para el traspaso del Gateway y las salas de walkie-talkie.
- Android Talk puede optar por sesiones de retransmisión en tiempo real propiedad de Gateway con `talk.realtime.mode: "realtime"` y `talk.realtime.transport: "gateway-relay"`. De lo contrario, se mantiene en el reconocimiento de voz nativo, chat de Gateway y `talk.speak`.
- Los clientes de solo transcripción usan `talk.session.create({ mode: "transcription", transport: "gateway-relay", brain: "none" })`, luego `talk.session.appendAudio`, `talk.session.cancelTurn` y `talk.session.close` cuando necesitan subtítulos o dictado sin una respuesta de voz del asistente.

Native Talk es un bucle continuo de conversación de voz:

1. Escuchar el habla
2. Enviar la transcripción al modelo a través de la sesión activa
3. Esperar la respuesta
4. Reproducirla a través del proveedor de Talk configurado (`talk.speak`)

El Talk en tiempo real del navegador reenvía las llamadas a herramientas del proveedor a través de `talk.client.toolCall`; los clientes del navegador no llaman a `chat.send` directamente para consultas en tiempo real.
Mientras una consulta en tiempo real está activa, los clientes Talk pueden usar `talk.client.steer` o
`talk.session.steer` para clasificar la entrada hablada como `status`, `steer`, `cancel`, o
`followup`. La dirección aceptada se pone en cola en la ejecución integrada activa; la dirección
descartada devuelve una razón estructurada como `no_active_run`, `not_streaming`,
o `compacting`.

El Talk de solo transcripción emite el mismo sobre de evento común de Talk que las sesiones en tiempo real y STT/TTS, pero usa `mode: "transcription"` y `brain: "none"`. Es para subtítulos, dictado y captura de voz solo de observación; las notas de voz cargadas de un solo uso aún usan la ruta multimedia/de audio.

## Comportamiento (macOS)

- **Superposición siempre activa** mientras el modo Talk está habilitado.
- Transiciones de fase **Escuchando → Pensando → Hablando**.
- En una **pausa corta** (ventana de silencio), se envía la transcripción actual.
- Las respuestas se **escriben en WebChat** (igual que al escribir).
- **Interrumpir al hablar** (activado por defecto): si el usuario empieza a hablar mientras el asistente está hablando, detenemos la reproducción y anotamos la marca de tiempo de interrupción para el siguiente aviso.

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

Claves admitidas:

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
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          apiKey: "openai_api_key",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

Valores predeterminados:

- `interruptOnSpeech`: true
- `silenceTimeoutMs`: cuando no está establecido, Talk mantiene la ventana de pausa predeterminada de la plataforma antes de enviar la transcripción (`700 ms on macOS and Android, 900 ms on iOS`)
- `provider`: selecciona el proveedor Talk activo. Use `elevenlabs`, `mlx` o `system` para las rutas de reproducción locales de macOS.
- `providers.<provider>.voiceId`: vuelve a `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` para ElevenLabs (o la primera voz de ElevenLabs cuando la clave API está disponible).
- `providers.elevenlabs.modelId`: por defecto es `eleven_v3` cuando no está establecido.
- `providers.mlx.modelId`: por defecto es `mlx-community/Soprano-80M-bf16` cuando no está establecido.
- `providers.elevenlabs.apiKey`: vuelve a `ELEVENLABS_API_KEY` (o al perfil de shell de la puerta de enlace si está disponible).
- `consultThinkingLevel`: anulación opcional del nivel de pensamiento para la ejecución completa del agente OpenClaw detrás de las llamadas en tiempo real `openclaw_agent_consult`.
- `consultFastMode`: anulación opcional del modo rápido para llamadas en tiempo real `openclaw_agent_consult`.
- `realtime.provider`: selecciona el proveedor de voz en tiempo real del navegador/servidor activo. Use `openai` para WebRTC, `google` para el WebSocket del proveedor, o un proveedor solo de puente a través del relé de la puerta de enlace.
- `realtime.providers.<provider>` almacena la configuración en tiempo real propiedad del proveedor. El navegador recibe solo credenciales de sesión efímeras o restringidas, nunca una clave API estándar.
- `realtime.providers.openai.voice`: id de voz integrado de OpenAI Realtime. Las voces actuales de `gpt-realtime-2` son `alloy`, `ash`, `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin` y `cedar`; `marin` y `cedar` se recomiendan para la mejor calidad.
- `realtime.transport`: `webrtc` y `provider-websocket` son transportes en tiempo real del navegador. Android usa el relé en tiempo real solo cuando esto es `gateway-relay`; de lo contrario, Talk de Android usa su bucle nativo de STT/TTS.
- `realtime.brain`: `agent-consult` enruta las llamadas a herramientas en tiempo real a través de la política de Gateway; `direct-tools` es el comportamiento de compatibilidad heredado de herramienta directa; `none` es para transcripción orquestación externa.
- `realtime.consultRouting`: `provider-direct` conserva la respuesta directa del proveedor cuando omite `openclaw_agent_consult`; `force-agent-consult` hace que el relay de Gateway enrute las transcripciones de usuario finalizadas a través de OpenClaw en su lugar.
- `realtime.instructions`: añade instrucciones del sistema orientadas al proveedor al prompt en tiempo real integrado de OpenClaw. Úselo para el estilo y el tono de voz; OpenClaw mantiene la guía `openclaw_agent_consult` predeterminada.
- `talk.catalog` expone los modos válidos, transportes, estrategias cerebrales, formatos de audio en tiempo real y banderas de capacidad de cada proveedor para que los clientes de Talk de primera parte eviten combinaciones no admitidas.
- Los proveedores de transcripción en streaming se descubren a través de `talk.catalog.transcription`. El relay de Gateway actual utiliza la configuración del proveedor de streaming de Voice Call hasta que se añada la superficie de configuración de transcripción de Talk dedicada.
- `speechLocale`: id de configuración regional BCP 47 opcional para el reconocimiento de voz de Talk en el dispositivo en iOS/macOS. Déjelo sin establecer para usar el predeterminado del dispositivo.
- `outputFormat`: el valor predeterminado es `pcm_44100` en macOS/iOS y `pcm_24000` en Android (establezca `mp3_*` para forzar el streaming MP3)

## Interfaz de usuario de macOS

- Alternar de la barra de menús: **Talk**
- Pestaña Config: grupo **Talk Mode** (id de voz + alternar interrumpir)
- Superposición:
  - **Escuchando**: la nube pulsa con el nivel del micrófono
  - **Pensando**: animación de hundimiento
  - **Hablando**: anillos radiantes
  - Clic en la nube: dejar de hablar
  - Clic en X: salir del modo Talk

## Interfaz de usuario de Android

- Alternar de la pestaña Voice: **Talk**
- El **Micrófono** manual y **Talk** son modos de captura en tiempo de ejecución mutuamente excluyentes.
- El micrófono manual se detiene cuando la aplicación sale del primer plano o el usuario abandona la pestaña Voice.
- El modo Talk sigue ejecutándose hasta que se desactiva o se desconecta el nodo de Android, y utiliza el tipo de servicio en primer plano del micrófono de Android mientras está activo.

## Notas

- Requiere permisos de Speech + Microphone.
- Talk nativo utiliza la sesión activa del Gateway y solo recurre al sondeo del historial cuando los eventos de respuesta no están disponibles.
- Talk en tiempo real del navegador utiliza `talk.client.toolCall` para `openclaw_agent_consult` en lugar de exponer `chat.send` a las sesiones del navegador propiedad del proveedor.
- Talk de solo transcripción utiliza `talk.session.create`, `talk.session.appendAudio`, `talk.session.cancelTurn` y `talk.session.close`; los clientes se suscriben a `talk.event` para actualizaciones parciales/finales de la transcripción.
- El gateway resuelve la reproducción de Talk a través de `talk.speak` utilizando el proveedor de Talk activo. Android solo recurre al TTS del sistema local cuando esa RPC no está disponible.
- La reproducción local MLX de macOS utiliza el asistente `openclaw-mlx-tts` incluido cuando está presente, o un ejecutable en `PATH`. Establezca `OPENCLAW_MLX_TTS_BIN` para apuntar a un binario de asistente personalizado durante el desarrollo.
- `stability` para `eleven_v3` se valida para `0.0`, `0.5` o `1.0`; otros modelos aceptan `0..1`.
- `latency_tier` se valida para `0..4` cuando se establece.
- Android admite los formatos de salida `pcm_16000`, `pcm_22050`, `pcm_24000` y `pcm_44100` para streaming de baja latencia en AudioTrack.

## Relacionado

- [Activación por voz](/es/nodes/voicewake)
- [Notas de audio y voz](/es/nodes/audio)
- [Comprensión de medios](/es/nodes/media-understanding)

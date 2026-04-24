---
summary: "Página de aterrizaje unificada para capacidades de generación, comprensión y voz multimedia"
read_when:
  - Looking for an overview of media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "Resumen de medios"
---

# Generación y comprensión de medios

OpenClaw genera imágenes, videos y música, comprende los medios entrantes (imágenes, audio, video) y pronuncia las respuestas en voz alta con conversión de texto a voz. Todas las capacidades multimedia están impulsadas por herramientas: el agente decide cuándo usarlas basándose en la conversación, y cada herramienta solo aparece cuando está configurado al menos un proveedor de respaldo.

## Capacidades de un vistazo

| Capacidad                       | Herramienta      | Proveedores                                                                                  | Lo que hace                                                            |
| ------------------------------- | ---------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Generación de imágenes          | `image_generate` | ComfyUI, fal, Google, MiniMax, OpenAI, Vydra, xAI                                            | Crea o edita imágenes a partir de instrucciones de texto o referencias |
| Generación de video             | `video_generate` | Alibaba, BytePlus, ComfyUI, fal, Google, MiniMax, OpenAI, Qwen, Runway, Together, Vydra, xAI | Crea videos a partir de texto, imágenes o videos existentes            |
| Generación de música            | `music_generate` | ComfyUI, Google, MiniMax                                                                     | Crea música o pistas de audio a partir de instrucciones de texto       |
| Conversión de texto a voz (TTS) | `tts`            | ElevenLabs, Microsoft, MiniMax, OpenAI, xAI                                                  | Convierte las respuestas salientes en audio hablado                    |
| Comprensión de medios           | (automático)     | Cualquier proveedor de modelos con capacidad de visión/audio, además de alternativas de CLI  | Resumen de imágenes, audio y video entrantes                           |

## Matriz de capacidades del proveedor

Esta tabla muestra qué proveedores soportan qué capacidades multimedia en toda la plataforma.

| Proveedor  | Imagen | Video | Música | TTS | STT / Transcripción | Comprensión de medios |
| ---------- | ------ | ----- | ------ | --- | ------------------- | --------------------- |
| Alibaba    |        | Sí    |        |     |                     |                       |
| BytePlus   |        | Sí    |        |     |                     |                       |
| ComfyUI    | Sí     | Sí    | Sí     |     |                     |                       |
| Deepgram   |        |       |        |     | Sí                  |                       |
| ElevenLabs |        |       |        | Sí  | Sí                  |                       |
| fal        | Sí     | Sí    |        |     |                     |                       |
| Google     | Sí     | Sí    | Sí     |     |                     | Sí                    |
| Microsoft  |        |       |        | Sí  |                     |                       |
| MiniMax    | Sí     | Sí    | Sí     | Sí  |                     |                       |
| Mistral    |        |       |        |     | Sí                  |                       |
| OpenAI     | Sí     | Sí    |        | Sí  | Sí                  | Sí                    |
| Qwen       |        | Sí    |        |     |                     |                       |
| Runway     |        | Sí    |        |     |                     |                       |
| Together   |        | Sí    |        |     |                     |                       |
| Vydra      | Sí     | Sí    |        |     |                     |                       |
| xAI        | Sí     | Sí    |        | Sí  | Sí                  | Sí                    |

<Note>
  La comprensión de medios utiliza cualquier modelo con capacidad de visión o de audio registrado en la configuración de su proveedor. La tabla anterior destaca a los proveedores con soporte dedicado para la comprensión de medios; la mayoría de los proveedores de LLM con modelos multimodales (Anthropic, Google, OpenAI, etc.) también pueden entender los medios entrantes cuando se configuran como el
  modelo de respuesta activo.
</Note>

## Cómo funciona la generación asíncrona

La generación de video y música se ejecuta como tareas en segundo plano porque el procesamiento del proveedor generalmente tarda entre 30 segundos y varios minutos. Cuando el agente llama a `video_generate` o `music_generate`, OpenClaw envía la solicitud al proveedor, devuelve un ID de tarea inmediatamente y rastrea el trabajo en el libro de tareas. El agente continúa respondiendo a otros mensajes mientras se ejecuta el trabajo. Cuando el proveedor termina, OpenClaw despierta al agente para que pueda publicar el medio terminado de nuevo en el canal original. La generación de imágenes y el TTS son síncronos y se completan en línea con la respuesta.

Deepgram, ElevenLabs, Mistral, OpenAI y xAI pueden todos transcribir audio entrante
a través de la ruta por lotes `tools.media.audio` cuando están configurados. Deepgram,
ElevenLabs, Mistral, OpenAI y xAI también registran proveedores de STT de
streaming de Llamadas de Voz, por lo que el audio telefónico en vivo se puede reenviar
al proveedor seleccionado sin esperar una grabación completa.

OpenAI se asigna a las superficies de imagen, video, TTS por lotes, STT por lotes, STT de streaming de Llamadas de Voz, voz en tiempo real e incrustaciones de memoria de OpenClaw. xAI actualmente
se asigna a las superficies de imagen, video, búsqueda, ejecución de código, TTS por lotes, STT por lotes
y STT de streaming de Llamadas de Voz de OpenClaw. La voz en tiempo real de xAI es una
capacidad ascendente, pero no se registra en OpenClaw hasta que el contrato compartido de
voz en tiempo real pueda representarla.

## Enlaces rápidos

- [Generación de imágenes](/es/tools/image-generation) -- generar y editar imágenes
- [Generación de video](/es/tools/video-generation) -- texto a video, imagen a video y video a video
- [Generación de música](/es/tools/music-generation) -- crear música y pistas de audio
- [Texto a voz](/es/tools/tts) -- convertir respuestas a audio hablado
- [Comprensión de medios](/es/nodes/media-understanding) -- comprender imágenes, audio y videos entrantes

---
summary: "Resumen de las capacidades de imagen, video, música, voz y comprensión de medios a primera vista"
read_when:
  - Looking for an overview of OpenClaw's media capabilities
  - Deciding which media provider to configure
  - Understanding how async media generation works
title: "Descripción general de medios"
sidebarTitle: "Descripción general de medios"
---

OpenClaw genera imágenes, videos y música, comprende medios entrantes
(imágenes, audio, video) y pronuncia las respuestas en voz alta con texto a voz. Todas
las capacidades de medios son impulsadas por herramientas: el agente decide cuándo usarlas basándose
en la conversación, y cada herramienta solo aparece cuando al menos un proveedor
de respaldo está configurado.

## Capacidades

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Cree y edite imágenes a partir de indicaciones de texto o imágenes de referencia a través de `image_generate`. Sincrónico — se completa en línea con la respuesta.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Texto a video, imagen a video y video a video a través de `video_generate`. Asíncrono: se ejecuta en segundo plano y publica el resultado cuando está listo.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Genere música o pistas de audio a través de `music_generate`. Asíncrono en proveedores compartidos; la ruta de flujo de trabajo de ComfyUI se ejecuta de forma síncrona.
  </Card>
  <Card title="Texto a voz" href="/es/tools/tts" icon="microphone">
    Convierta las respuestas salientes a audio hablado a través de la herramienta `tts` más la configuración `messages.tts`. Sincrónico.
  </Card>
  <Card title="Comprensión de medios" href="/es/nodes/media-understanding" icon="eye">
    Resuma imágenes, audio y video entrantes utilizando proveedores de modelos con capacidad de visión y complementos dedicados de comprensión de medios.
  </Card>
  <Card title="Conversión de voz a texto" href="/es/nodes/audio" icon="ear-listen">
    Transcriba mensajes de voz entrantes a través de proveedores de STT por lotes o proveedores de STT por streaming para Voice Call.
  </Card>
</CardGroup>

## Matriz de capacidades del proveedor

| Proveedor   | Imagen | Video | Música | TTS | STT | Voz en tiempo real | Comprensión de medios |
| ----------- | :----: | :---: | :----: | :-: | :-: | :----------------: | :-------------------: |
| Alibaba     |        |   ✓   |        |     |     |                    |                       |
| BytePlus    |        |   ✓   |        |     |     |                    |                       |
| ComfyUI     |   ✓    |   ✓   |   ✓    |     |     |                    |                       |
| Deepgram    |        |       |        |     |  ✓  |         ✓          |                       |
| ElevenLabs  |        |       |        |  ✓  |  ✓  |                    |                       |
| fal         |   ✓    |   ✓   |        |     |     |                    |                       |
| Google      |   ✓    |   ✓   |   ✓    |  ✓  |     |         ✓          |           ✓           |
| Gradium     |        |       |        |  ✓  |     |                    |                       |
| CLI local   |        |       |        |  ✓  |     |                    |                       |
| Microsoft   |        |       |        |  ✓  |     |                    |                       |
| MiniMax     |   ✓    |   ✓   |   ✓    |  ✓  |     |                    |                       |
| Mistral     |        |       |        |     |  ✓  |                    |                       |
| OpenAI      |   ✓    |   ✓   |        |  ✓  |  ✓  |         ✓          |           ✓           |
| Qwen        |        |   ✓   |        |     |     |                    |                       |
| Runway      |        |   ✓   |        |     |     |                    |                       |
| SenseAudio  |        |       |        |     |  ✓  |                    |                       |
| Together    |        |   ✓   |        |     |     |                    |                       |
| Vydra       |   ✓    |   ✓   |        |  ✓  |     |                    |                       |
| xAI         |   ✓    |   ✓   |        |  ✓  |  ✓  |                    |           ✓           |
| Xiaomi MiMo |   ✓    |       |        |  ✓  |     |                    |           ✓           |

<Note>
  La comprensión de medios utiliza cualquier modelo con capacidad de visión o audio registrado en su configuración de proveedor. La matriz anterior enumera los proveedores con soporte dedicado de comprensión de medios; la mayoría de los proveedores de LLM multimodales (Anthropic, Google, OpenAI, etc.) también pueden entender los medios entrantes cuando se configuran como el modelo de respuesta
  activo.
</Note>

## Asíncrono vs. síncrono

| Capacidad                 | Modo      | Por qué                                                                                   |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Imagen                    | Síncrono  | Las respuestas del proveedor regresan en segundos; se completa en línea con la respuesta. |
| Conversión de texto a voz | Síncrono  | Las respuestas del proveedor regresan en segundos; se adjuntan al audio de respuesta.     |
| Video                     | Asíncrono | El procesamiento del proveedor tarda de 30 s a varios minutos.                            |
| Música (compartida)       | Asíncrono | La misma característica de procesamiento del proveedor que el video.                      |
| Música (ComfyUI)          | Síncrono  | El flujo de trabajo local se ejecuta en línea contra el servidor ComfyUI configurado.     |

Para herramientas asíncronas, OpenClaw envía la solicitud al proveedor, devuelve un id
de tarea inmediatamente y rastrea el trabajo en el libro de tareas. El agente continúa
respondiendo a otros mensajes mientras se ejecuta el trabajo. Cuando el proveedor termina,
OpenClaw despierta al agente para que pueda publicar el medio terminado de nuevo en el
canal original.

## Conversión de voz a texto y llamada de voz

Deepgram, ElevenLabs, Mistral, OpenAI, SenseAudio y xAI pueden todos transcribir
audio entrante a través de la ruta `tools.media.audio` por lotes cuando están configurados.
Los complementos de canal que realizan una verificación previa de una nota de voz para el filtrado de menciones o el análisis
de comandos marcan el archivo transcrito en el contexto entrante, por lo que el paso compartido
de comprensión de medios reutiliza esa transcripción en lugar de hacer una segunda
llamada STT para el mismo audio.

Deepgram, ElevenLabs, Mistral, OpenAI y xAI también registran proveedores de STT
de transmisión para llamadas de voz, por lo que el audio telefónico en vivo se puede reenviar al proveedor
seleccionado sin esperar una grabación completa.

## Asignaciones de proveedores (cómo se dividen los proveedores en las superficies)

<AccordionGroup>
  <Accordion title="Google">Superficies de imagen, video, música, TTS por lotes, voz en tiempo real de backend y comprensión de medios.</Accordion>
  <Accordion title="OpenAI">Superficies de imagen, video, TTS por lotes, STT por lotes, STT de transmisión de llamadas de voz, voz en tiempo real de backend e incrustación de memoria.</Accordion>
  <Accordion title="xAI">Imagen, video, búsqueda, ejecución de código, TTS por lotes, STT por lotes y STT de transmisión de llamadas de voz. La voz en tiempo real de xAI es una capacidad ascendente, pero no está registrada en OpenClaw hasta que el contrato compartido de voz en tiempo real pueda representarla.</Accordion>
</AccordionGroup>

## Relacionado

- [Generación de imágenes](/es/tools/image-generation)
- [Generación de video](/es/tools/video-generation)
- [Generación de música](/es/tools/music-generation)
- [Conversión de texto a voz](/es/tools/tts)
- [Comprensión de medios](/es/nodes/media-understanding)
- [Nodos de audio](/es/nodes/audio)

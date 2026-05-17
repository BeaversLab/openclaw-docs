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

El habla en vivo utiliza el contrato de sesión Talk en lugar de la ruta de la herramienta de medios de un solo uso. Talk tiene tres modos: proveedor nativo `realtime`, local o streaming `stt-tts`, y `transcription` para la captura de habla solo de observación. Esos modos comparten catálogos de proveedores, sobres de eventos y semánticas de cancelación con telefonía, reuniones, tiempo real del navegador y clientes nativos de pulsar para hablar.

## Capacidades

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Cree y edite imágenes a partir de mensajes de texto o imágenes de referencia a través de `image_generate`. Sincrónico: se completa en línea con la respuesta.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Texto a video, imagen a video y video a video a través de `video_generate`. Asíncrono: se ejecuta en segundo plano y publica el resultado cuando está listo.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Genere música o pistas de audio a través de `music_generate`. Asíncrono en proveedores compartidos; la ruta del flujo de trabajo de ComfyUI se ejecuta de forma sincrónica.
  </Card>
  <Card title="Texto a voz" href="/es/tools/tts" icon="microphone">
    Convierta las respuestas salientes a audio hablado a través de la herramienta `tts` más la configuración `messages.tts`. Sincrónico.
  </Card>
  <Card title="Comprensión de medios" href="/es/nodes/media-understanding" icon="eye">
    Resuma imágenes, audio y video entrantes utilizando proveedores de modelos con capacidad de visión y complementos dedicados de comprensión de medios.
  </Card>
  <Card title="Speech-to-text" href="/es/nodes/audio" icon="ear-listen">
    Transcribe mensajes de voz entrantes a través de proveedores STT por lotes o STT de streaming Voice Call.
  </Card>
</CardGroup>

## Matriz de capacidades del proveedor

| Proveedor   | Imagen | Vídeo | Música | TTS | STT | Voz en tiempo real | Comprensión de medios |
| ----------- | :----: | :---: | :----: | :-: | :-: | :----------------: | :-------------------: |
| Alibaba     |        |   ✓   |        |     |     |                    |                       |
| BytePlus    |        |   ✓   |        |     |     |                    |                       |
| ComfyUI     |   ✓    |   ✓   |   ✓    |     |     |                    |                       |
| DeepInfra   |   ✓    |   ✓   |        |  ✓  |  ✓  |                    |           ✓           |
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
| OpenRouter  |   ✓    |   ✓   |        |  ✓  |  ✓  |                    |           ✓           |
| Qwen        |        |   ✓   |        |     |     |                    |                       |
| Runway      |        |   ✓   |        |     |     |                    |                       |
| SenseAudio  |        |       |        |     |  ✓  |                    |                       |
| Together    |        |   ✓   |        |     |     |                    |                       |
| Vydra       |   ✓    |   ✓   |        |  ✓  |     |                    |                       |
| xAI         |   ✓    |   ✓   |        |  ✓  |  ✓  |                    |           ✓           |
| Xiaomi MiMo |   ✓    |       |        |  ✓  |     |                    |           ✓           |

<Note>
  La comprensión de medios utiliza cualquier modelo con capacidad de visión o audio registrado en la configuración de su proveedor. La matriz anterior enumera los proveedores con soporte dedicado para la comprensión de medios; la mayoría de los proveedores de LLM multimodales (Anthropic, Google, OpenAI, etc.) también pueden entender los medios entrantes cuando se configuran como el modelo de
  respuesta activo.
</Note>

## Asíncrono vs. síncrono

| Capacidad                 | Modo      | Por qué                                                                                                                             |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Imagen                    | Síncrono  | Las respuestas del proveedor regresan en segundos; se completan en línea con la respuesta.                                          |
| Conversión de texto a voz | Síncrono  | Las respuestas del proveedor regresan en segundos; adjuntas al audio de respuesta.                                                  |
| Vídeo                     | Asíncrono | El procesamiento del proveedor tarda de 30 s a varios minutos; las colas lentas pueden durar hasta el tiempo de espera configurado. |
| Música (compartida)       | Asíncrono | La misma característica de procesamiento del proveedor que el vídeo.                                                                |
| Música (ComfyUI)          | Síncrono  | El flujo de trabajo local se ejecuta en línea contra el servidor ComfyUI configurado.                                               |

Para herramientas asíncronas, OpenClaw envía la solicitud al proveedor, devuelve un
identificador de tarea inmediatamente y rastrea el trabajo en el registro de tareas. El agente continúa
respondiendo a otros mensajes mientras se ejecuta el trabajo. Cuando el proveedor termina,
OpenClaw despierta al agente con las rutas de los medios generados para que pueda informar al
usuario y, cuando lo exige la política de entrega de origen, retransmitir el resultado a través
de la herramienta de mensaje. Para rutas de grupo/canal solo con herramienta de mensaje, OpenClaw trata
la evidencia de entrega faltante de la herramienta de mensaje como un intento de finalización fallido y envía
la alternativa de medios generados directamente al canal original.

## Conversión de voz a texto y llamada de voz

Deepgram, DeepInfra, ElevenLabs, Mistral, OpenAI, OpenRouter, SenseAudio y xAI pueden todos transcribir
audio entrante a través de la ruta por lotes `tools.media.audio` cuando están configurados.
Los complementos de canal que realizan un verificación previa de una nota de voz para el bloqueo de menciones o el análisis de comandos
marcan el archivo adjunto transcrito en el contexto entrante, por lo que el pase compartido de comprensión de medios reutiliza esa transcripción en lugar de hacer una segunda
llamada STT para el mismo audio.

Deepgram, ElevenLabs, Mistral, OpenAI y xAI también registran proveedores
STT de transmisión para llamada de voz, por lo que el audio telefónico en vivo puede reenviarse al proveedor
seleccionado sin esperar a que se complete la grabación.

Para conversaciones de usuario en vivo, prefiera el [modo Talk](/es/nodes/talk). Los archivos adjuntos de audio
por lotes se mantienen en la ruta de medios; el tiempo real del navegador, la pulsación para hablar nativa,
la telefonía y el audio de reuniones deben usar los eventos Talk y los catálogos con alcance de sesión
devueltos por el Gateway.

## Asignaciones de proveedores (cómo se dividen los proveedores entre superficies)

<AccordionGroup>
  <Accordion title="Google">Imagen, video, música, TTS por lotes, voz en tiempo real del backend y superficies de comprensión de medios.</Accordion>
  <Accordion title="OpenAI">Imagen, video, TTS por lotes, STT por lotes, STT de transmisión de llamada de voz, voz en tiempo real del backend y superficies de incrustación de memoria.</Accordion>
  <Accordion title="DeepInfra">Enrutamiento de chat/modelo, generación/edición de imágenes, texto a video, TTS por lotes, STT por lotes, comprensión de medios de imagen y superficies de incrustación de memoria. Los modelos de reranking/clasificación/detección de objetos nativos de DeepInfra no se registran hasta que OpenClaw tenga contratos de proveedor dedicados para esas categorías.</Accordion>
  <Accordion title="xAI">Imagen, video, búsqueda, ejecución de código, TTS por lotes, STT por lotes y STT de streaming en Voice Call. La voz en tiempo real de xAI es una capacidad ascendente, pero no se registra en OpenClaw hasta que el contrato de voz en tiempo real compartido pueda representarla.</Accordion>
</AccordionGroup>

## Relacionado

- [Generación de imágenes](/es/tools/image-generation)
- [Generación de video](/es/tools/video-generation)
- [Generación de música](/es/tools/music-generation)
- [Conversión de texto a voz](/es/tools/tts)
- [Comprensión de medios](/es/nodes/media-understanding)
- [Nodos de audio](/es/nodes/audio)
- [Modo Talk](/es/nodes/talk)

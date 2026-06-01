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
    Cree y edite imágenes a partir de mensajes de texto o imágenes de referencia mediante `image_generate`. Asíncrono en sesiones de chat: se ejecuta en segundo plano y publica el resultado cuando está listo.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Texto a video, imagen a video y video a video a través de `video_generate`. Asíncrono: se ejecuta en segundo plano y publica el resultado cuando está listo.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Genere música o pistas de audio mediante `music_generate`. Asíncrono en sesiones de chat en el ciclo de vida compartido de generación de medios.
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
| fal         |   ✓    |   ✓   |   ✓    |     |     |                    |                       |
| Google      |   ✓    |   ✓   |   ✓    |  ✓  |     |         ✓          |           ✓           |
| Gradium     |        |       |        |  ✓  |     |                    |                       |
| CLI local   |        |       |        |  ✓  |     |                    |                       |
| Microsoft   |        |       |        |  ✓  |     |                    |                       |
| MiniMax     |   ✓    |   ✓   |   ✓    |  ✓  |     |                    |                       |
| Mistral     |        |       |        |     |  ✓  |                    |                       |
| OpenAI      |   ✓    |   ✓   |        |  ✓  |  ✓  |         ✓          |           ✓           |
| OpenRouter  |   ✓    |   ✓   |   ✓    |  ✓  |  ✓  |                    |           ✓           |
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

| Capacidad                 | Modo      | Por qué                                                                                                                                        |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen                    | Asíncrono | El procesamiento del proveedor puede durar más que un turno de chat; los datos adjuntos generados utilizan la ruta de finalización compartida. |
| Conversión de texto a voz | Síncrono  | Las respuestas del proveedor regresan en segundos; adjuntas al audio de respuesta.                                                             |
| Vídeo                     | Asíncrono | El procesamiento del proveedor tarda de 30 s a varios minutos; las colas lentas pueden durar hasta el tiempo de espera configurado.            |
| Música                    | Asíncrono | La misma característica de procesamiento del proveedor que el vídeo.                                                                           |

Para herramientas asíncronas, OpenClaw envía la solicitud al proveedor, devuelve un
di de tarea inmediatamente y rastrea el trabajo en el libro mayor de tareas. El agente continúa
respondiendo a otros mensajes mientras se ejecuta el trabajo. Cuando el proveedor termina,
OpenClaw despierta al agente con las rutas de los medios generados para que pueda informar al
usuario y retransmitir el resultado a través de la herramienta de mensaje. Si la sesión solicitante
está inactiva o su activación falla, y falta algún medio generado
del envío de la herramienta de mensaje, OpenClaw envía un retorno directo
dempotente con solo los medios faltantes. Los medios ya enviados a través de la
herramienta de mensaje no se publican nuevamente.

## Conversión de voz a texto y llamada de voz

Deepgram, DeepInfra, ElevenLabs, Mistral, OpenAI, OpenRouter, SenseAudio y xAI pueden todos transcribir
audio entrante a través de la ruta por lotes `tools.media.audio` cuando están configurados.
Los complementos de canal que realizan un reconocimiento previo de una nota de voz para la filtración de menciones o el análisis
de comandos marcan los datos adjuntos transcritos en el contexto entrante, por lo que el pase
compartido de comprensión de medios reutiliza esa transcripción en lugar de realizar una segunda
llamada STT para el mismo audio.

Deepgram, ElevenLabs, Mistral, OpenAI y xAI también registran proveedores de STT en
streaming para Voice Call, por lo que el audio telefónico en vivo se puede reenviar al proveedor
seleccionado sin esperar a que se complete la grabación.

Para conversaciones de usuario en vivo, prefiera el [modo Talk](/es/nodes/talk). Los datos adjuntos
de audio por lotes permanecen en la ruta de medios; el tiempo real del navegador, el pulsar para hablar nativo,
la telefonía y el audio de reuniones deben usar los eventos de Talk y los catálogos con ámbito de sesión
devueltos por el Gateway.

## Asignaciones de proveedores (cómo se dividen los proveedores en las distintas superficies)

<AccordionGroup>
  <Accordion title="Google">Superficies de imagen, video, música, TTS por lotes, voz en tiempo real del backend y comprensión de medios.</Accordion>
  <Accordion title="OpenAI">Superficies de imagen, video, TTS por lotes, STT por lotes, STT por streaming en Voice Call, voz en tiempo real del backend e incrustación de memoria.</Accordion>
  <Accordion title="DeepInfra">Enrutamiento de chat/modelo, generación/edición de imágenes, texto a video, TTS por lotes, STT por lotes, comprensión de medios de imagen e incrustación de memoria. Los modelos de reordenamiento/clasificación/detección de objetos nativos de DeepInfra no se registran hasta que OpenClaw tenga contratos de proveedor dedicados para esas categorías.</Accordion>
  <Accordion title="xAI">Imagen, video, búsqueda, ejecución de código, TTS por lotes, STT por lotes y STT por streaming en Voice Call. La voz en tiempo real de xAI es una capacidad superior, pero no se registra en OpenClaw hasta que el contrato compartido de voz en tiempo real pueda representarla.</Accordion>
</AccordionGroup>

## Relacionado

- [Generación de imágenes](/es/tools/image-generation)
- [Generación de videos](/es/tools/video-generation)
- [Generación de música](/es/tools/music-generation)
- [Conversión de texto a voz](/es/tools/tts)
- [Comprensión de medios](/es/nodes/media-understanding)
- [Nodos de audio](/es/nodes/audio)
- [Modo Talk](/es/nodes/talk)

---
summary: "Reglas de manejo de imágenes y medios para envíos, puerta de enlace y respuestas de agente"
read_when:
  - Modifying media pipeline or attachments
title: "Soporte de imágenes y medios"
---

El canal de WhatsApp se ejecuta a través de **Baileys Web**. Este documento captura las reglas actuales de manejo de medios para envíos, respuestas de puerta de enlace y agente.

## Objetivos

- Enviar medios con subtítulos opcionales a través de `openclaw message send --media`.
- Permitir que las respuestas automáticas desde la bandeja de entrada web incluyan medios junto con texto.
- Mantener los límites por tipo razonables y predecibles.

## Superficie de CLI

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` opcional; el subtítulo puede estar vacío para envíos solo de medios.
  - `--dry-run` imprime el payload resuelto; `--json` emite `{ channel, to, messageId, mediaUrl, caption }`.

## Comportamiento del canal de WhatsApp Web

- Entrada: ruta de archivo local **o** URL HTTP(S).
- Flujo: cargar en un búfer (Buffer), detectar el tipo de medio y construir el payload correcto:
  - **Imágenes:** redimensionar y recomprimir a JPEG (lado máximo 2048px) apuntando a `channels.whatsapp.mediaMaxMb` (predeterminado: 50 MB).
  - **Audio/Voz/Video:** transferencia directa de hasta 16 MB; el audio se envía como nota de voz (`ptt: true`).
  - **Documentos:** cualquier otra cosa, hasta 100 MB, con el nombre de archivo conservado cuando esté disponible.
- Reproducción estilo GIF de WhatsApp: envíe un MP4 con `gifPlayback: true` (CLI: `--gif-playback`) para que los clientes móviles reproduzcan en bucle en línea.
- La detección MIME prefiere los bytes mágicos, luego los encabezados y finalmente la extensión del archivo.
- El pie de foto proviene de `--message` o `reply.text`; se permite un pie de foto vacío.
- Registro: no detallado muestra `↩️`/`✅`; el detallado incluye el tamaño y la ruta/URL de origen.

## Canalización de respuesta automática

- `getReplyFromConfig` devuelve `{ text?, mediaUrl?, mediaUrls? }`.
- Cuando hay medios presentes, el remitente web resuelve las rutas locales o las URL utilizando la misma canalización que `openclaw message send`.
- Si se proporcionan varias entradas de medios, se envían secuencialmente.

## Medios entrantes a comandos (Pi)

- Cuando los mensajes web entrantes incluyen medios, OpenClaw los descarga en un archivo temporal y expone variables de plantilla:
  - `{{MediaUrl}}` pseudo-URL para los medios entrantes.
  - `{{MediaPath}}` ruta temporal local escrita antes de ejecutar el comando.
- Cuando se habilita un sandbox de Docker por sesión, los medios entrantes se copian en el espacio de trabajo del sandbox y `MediaPath`/`MediaUrl` se reescriben en una ruta relativa como `media/inbound/<filename>`.
- La comprensión de medios (si está configurada mediante `tools.media.*` o `tools.media.models` compartido) se ejecuta antes de la plantilla y puede insertar bloques `[Image]`, `[Audio]` y `[Video]` en `Body`.
  - El audio establece `{{Transcript}}` y utiliza la transcripción para el análisis de comandos, por lo que los comandos de barra diagonal siguen funcionando.
  - Las descripciones de video e imagen conservan cualquier texto de leyenda para el análisis de comandos.
  - Si el modelo de imagen primario activo ya admite la visión de forma nativa, OpenClaw omite el bloque de resumen `[Image]` y, en su lugar, pasa la imagen original al modelo.
- De forma predeterminada, solo se procesa el primer archivo adjunto de imagen/audio/video coincidente; configure `tools.media.<cap>.attachments` para procesar varios archivos adjuntos.

## Límites y errores

**Límites de envío saliente (envío web de WhatsApp)**

- Imágenes: hasta `channels.whatsapp.mediaMaxMb` (predeterminado: 50 MB) después de la recompresión.
- Audio/voz/video: límite de 16 MB; documentos: límite de 100 MB.
- Medio excesivamente grande o ilegible → error claro en los registros y la respuesta se omite.

**Límites de comprensión de medios (transcripción/descripción)**

- Predeterminado de imagen: 10 MB (`tools.media.image.maxBytes`).
- Predeterminado de audio: 20 MB (`tools.media.audio.maxBytes`).
- Predeterminado de video: 50 MB (`tools.media.video.maxBytes`).
- El medio excesivamente grande omite la comprensión, pero las respuestas aún se envían con el cuerpo original.

## Notas para las pruebas

- Cubra los flujos de envío + respuesta para casos de imagen/audio/documento.
- Valide la recompresión para imágenes (límite de tamaño) y el indicador de nota de voz para audio.
- Asegúrese de que las respuestas multimedia se distribuyan como envíos secuenciales.

## Relacionado

- [Captura de cámara](/es/nodes/camera)
- [Comprensión de medios](/es/nodes/media-understanding)
- [Audio y notas de voz](/es/nodes/audio)

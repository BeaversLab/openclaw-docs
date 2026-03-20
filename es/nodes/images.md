---
summary: "Reglas de manejo de imágenes y medios para envíos, respuestas de puerta de enlace y de agente"
read_when:
  - Modificación de canalización de medios o archivos adjuntos
title: "Soporte de imágenes y medios"
---

# Soporte de imágenes y medios (2025-12-05)

El canal de WhatsApp se ejecuta a través de **Baileys Web**. Este documento captura las reglas actuales de manejo de medios para envíos, puerta de enlace y respuestas de agente.

## Objetivos

- Envíe medios con subtítulos opcionales a través de `openclaw message send --media`.
- Permitir que las respuestas automáticas desde la bandeja de entrada web incluyan medios junto con texto.
- Mantener los límites por tipo de manera razonable y predecible.

## Interfaz de línea de comandos (CLI)

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` opcional; el subtítulo puede estar vacío para envíos de solo medios.
  - `--dry-run` imprime la carga útil resuelta; `--json` emite `{ channel, to, messageId, mediaUrl, caption }`.

## Comportamiento del canal de WhatsApp Web

- Entrada: ruta de archivo local **o** URL HTTP(S).
- Flujo: cargar en un búfer, detectar el tipo de medio y construir la carga útil correcta:
  - **Imágenes:** cambiar tamaño y recomprimir a JPEG (lado máximo 2048px) apuntando a `agents.defaults.mediaMaxMb` (predeterminado 5 MB), limitado a 6 MB.
  - **Audio/Voz/Video:** paso directo hasta 16 MB; el audio se envía como nota de voz (`ptt: true`).
  - **Documentos:** cualquier otra cosa, hasta 100 MB, con el nombre de archivo preservado cuando esté disponible.
- Reproducción estilo GIF de WhatsApp: envíe un MP4 con `gifPlayback: true` (CLI: `--gif-playback`) para que los clientes móviles se repitan en línea.
- La detección MIME prefiere los bytes mágicos, luego los encabezados y finalmente la extensión del archivo.
- El subtítulo proviene de `--message` o `reply.text`; se permite un subtítulo vacío.
- Registro: no detallado muestra `↩️`/`✅`; detallado incluye el tamaño y la ruta/URL de origen.

## Canalización de respuesta automática

- `getReplyFromConfig` devuelve `{ text?, mediaUrl?, mediaUrls? }`.
- Cuando hay medios presentes, el remitente web resuelve las rutas locales o las URL utilizando la misma canalización que `openclaw message send`.
- Se envían varias entradas de medios secuencialmente si se proporcionan.

## Medios entrantes a comandos (Pi)

- Cuando los mensajes web entrantes incluyen medios, OpenClaw los descarga a un archivo temporal y expone variables de plantilla:
  - Pseudo-URL `{{MediaUrl}}` para los medios entrantes.
  - Ruta temporal local `{{MediaPath}}` escrita antes de ejecutar el comando.
- Cuando se habilita un sandbox de Docker por sesión, los medios entrantes se copian en el espacio de trabajo del sandbox y `MediaPath`/`MediaUrl` se reescriben en una ruta relativa como `media/inbound/<filename>`.
- La comprensión de medios (si se configura a través de `tools.media.*` o compartida `tools.media.models`) se ejecuta antes de la plantilla y puede insertar bloques `[Image]`, `[Audio]` y `[Video]` en `Body`.
  - El audio establece `{{Transcript}}` y utiliza la transcripción para el análisis de comandos, por lo que los comandos de barra diagonal siguen funcionando.
  - Las descripciones de video e imagen preservan cualquier texto de leyenda para el análisis de comandos.
- De forma predeterminada, solo se procesa el primer archivo adjunto coincidente de imagen/audio/vídeo; establezca `tools.media.<cap>.attachments` para procesar varios archivos adjuntos.

## Límites y errores

**Límites de envío saliente (envío web de WhatsApp)**

- Imágenes: límite de ~6 MB después de la recompresión.
- Audio/voz/video: límite de 16 MB; documentos: límite de 100 MB.
- Medio excesivamente grande o ilegible → error claro en los registros y la respuesta se omite.

**Límites de comprensión de medios (transcripción/descripción)**

- Imagen predeterminada: 10 MB (`tools.media.image.maxBytes`).
- Audio predeterminado: 20 MB (`tools.media.audio.maxBytes`).
- Vídeo predeterminado: 50 MB (`tools.media.video.maxBytes`).
- El medio excesivamente grande omite la comprensión, pero las respuestas aún se envían con el cuerpo original.

## Notas para las pruebas

- Cubra los flujos de envío + respuesta para casos de imagen/audio/documento.
- Valide la recompresión para imágenes (límite de tamaño) y el indicador de nota de voz para audio.
- Asegúrese de que las respuestas multimedia se distribuyan como envíos secuenciales.

import es from "/components/footer/es.mdx";

<es />

---
summary: "Reglas de manejo de imágenes y medios para envíos, puerta de enlace y respuestas de agente"
read_when:
  - Modifying media pipeline or attachments
title: "Soporte de imágenes y medios"
---

# Soporte de imágenes y medios — 2025-12-05

El canal de WhatsApp se ejecuta a través de **Baileys Web**. Este documento captura las reglas actuales de manejo de medios para envíos, puerta de enlace y respuestas de agente.

## Objetivos

- Enviar medios con subtítulos opcionales a través de `openclaw message send --media`.
- Permitir que las respuestas automáticas desde la bandeja de entrada web incluyan medios junto con texto.
- Mantener los límites por tipo de manera razonable y predecible.

## Interfaz de línea de comandos (CLI)

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` opcional; el subtítulo puede estar vacío para envíos de solo medios.
  - `--dry-run` imprime la carga útil resuelta; `--json` emite `{ channel, to, messageId, mediaUrl, caption }`.

## Comportamiento del canal de WhatsApp Web

- Entrada: ruta de archivo local **o** URL HTTP(S).
- Flujo: cargar en un búfer, detectar el tipo de medio y construir la carga útil correcta:
  - **Imágenes:** redimensionar y recomprimir a JPEG (lado máximo 2048px) apuntando a `agents.defaults.mediaMaxMb` (predeterminado 5 MB), limitado a 6 MB.
  - **Audio/Voz/Vídeo:** paso directo hasta 16 MB; el audio se envía como nota de voz (`ptt: true`).
  - **Documentos:** cualquier otra cosa, hasta 100 MB, con el nombre de archivo preservado cuando esté disponible.
- Reproducción estilo GIF de WhatsApp: enviar un MP4 con `gifPlayback: true` (CLI: `--gif-playback`) para que los clientes móviles se repitan en línea.
- La detección MIME prefiere los bytes mágicos, luego los encabezados y finalmente la extensión del archivo.
- El subtítulo proviene de `--message` o `reply.text`; se permite un subtítulo vacío.
- Registro: el modo no detallado muestra `↩️`/`✅`; el modo detallado incluye el tamaño y la ruta de origen o URL.

## Canalización de respuesta automática

- `getReplyFromConfig` devuelve `{ text?, mediaUrl?, mediaUrls? }`.
- Cuando hay medios presentes, el remitente web resuelve las rutas locales o las URL utilizando la misma canalización que `openclaw message send`.
- Se envían varias entradas de medios secuencialmente si se proporcionan.

## Medios entrantes a comandos (Pi)

- Cuando los mensajes web entrantes incluyen medios, OpenClaw los descarga a un archivo temporal y expone variables de plantilla:
  - `{{MediaUrl}}` pseudo-URL para el medio entrante.
  - `{{MediaPath}}` ruta temporal local escrita antes de ejecutar el comando.
- Cuando se habilita un sandbox de Docker por sesión, el medio entrante se copia en el espacio de trabajo del sandbox y `MediaPath`/`MediaUrl` se reescriben a una ruta relativa como `media/inbound/<filename>`.
- La comprensión de medios (si se configura mediante `tools.media.*` o `tools.media.models` compartido) se ejecuta antes de la plantilla y puede insertar bloques `[Image]`, `[Audio]` y `[Video]` en `Body`.
  - El audio establece `{{Transcript}}` y utiliza la transcripción para el análisis de comandos, por lo que los comandos de barra diagonal aún funcionan.
  - Las descripciones de video e imagen preservan cualquier texto de leyenda para el análisis de comandos.
- De forma predeterminada, solo se procesa el primer archivo adjunto de imagen/audio/video coincidente; establezca `tools.media.<cap>.attachments` para procesar varios archivos adjuntos.

## Límites y errores

**Límites de envío saliente (envío web de WhatsApp)**

- Imágenes: límite de ~6 MB después de la recompresión.
- Audio/voz/video: límite de 16 MB; documentos: límite de 100 MB.
- Medio excesivamente grande o ilegible → error claro en los registros y la respuesta se omite.

**Límites de comprensión de medios (transcripción/descripción)**

- Imagen predeterminada: 10 MB (`tools.media.image.maxBytes`).
- Audio predeterminado: 20 MB (`tools.media.audio.maxBytes`).
- Video predeterminado: 50 MB (`tools.media.video.maxBytes`).
- El medio excesivamente grande omite la comprensión, pero las respuestas aún se envían con el cuerpo original.

## Notas para las pruebas

- Cubra los flujos de envío + respuesta para casos de imagen/audio/documento.
- Valide la recompresión para imágenes (límite de tamaño) y el indicador de nota de voz para audio.
- Asegúrese de que las respuestas multimedia se distribuyan como envíos secuenciales.

import es from "/components/footer/es.mdx";

<es />

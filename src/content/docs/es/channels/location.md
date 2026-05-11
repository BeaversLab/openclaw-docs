---
summary: "Análisis de ubicaciones de canales entrantes (Telegram/WhatsApp/Matrix) y campos de contexto"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "Análisis de ubicación del canal"
---

OpenClaw normaliza las ubicaciones compartidas desde los canales de chat en:

- texto de coordenadas conciso anexado al cuerpo entrante, y
- campos estructurados en la carga útil del contexto de respuesta automática. Las etiquetas proporcionadas por el canal, direcciones y leyendas/comentarios se representan en el mensaje mediante el bloque JSON de metadatos no confiables compartido, no en línea dentro del cuerpo del usuario.

Actualmente compatible con:

- **Telegram** (pines de ubicación + lugares + ubicaciones en vivo)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` con `geo_uri`)

## Formato de texto

Las ubicaciones se representan como líneas amigables sin corchetes:

- Pin:
  - `📍 48.858844, 2.294351 ±12m`
- Lugar con nombre:
  - `📍 48.858844, 2.294351 ±12m`
- Uso compartido en vivo:
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Si el canal incluye una etiqueta, dirección o leyenda/comentario, se conserva en la carga útil del contexto y aparece en el mensaje como JSON no confiable cercado:

````text
Location (untrusted metadata):
```
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
}
```
```

## Campos de contexto

Cuando hay una ubicación presente, se añaden estos campos a `ctx`:

- `LocationLat` (número)
- `LocationLon` (número)
- `LocationAccuracy` (número, metros; opcional)
- `LocationName` (cadena; opcional)
- `LocationAddress` (cadena; opcional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booleano)
- `LocationCaption` (cadena; opcional)

El renderizador de mensajes trata `LocationName`, `LocationAddress` y `LocationCaption` como metadatos no confiables y los serializa a través de la misma ruta JSON delimitada que se utiliza para otros contextos de canal.

## Notas del canal

- **Telegram**: los lugares se mapean a `LocationName/LocationAddress`; las ubicaciones en vivo usan `live_period`.
- **WhatsApp**: `locationMessage.comment` y `liveLocationMessage.caption` rellenan `LocationCaption`.
- **Matrix**: `geo_uri` se analiza como una ubicación de marcador; se ignora la altitud y `LocationIsLive` siempre es falso.

## Relacionado

- [Comando de ubicación (nodos)](/es/nodes/location-command)
- [Captura de cámara](/es/nodes/camera)
- [Comprensión de medios](/es/nodes/media-understanding)
````

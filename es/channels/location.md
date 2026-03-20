---
summary: "Análisis de ubicaciones de canales entrantes (Telegram + WhatsApp) y campos de contexto"
read_when:
  - Agregar o modificar el análisis de ubicaciones de canales
  - Usar campos de contexto de ubicación en mensajes o herramientas del agente
title: "Análisis de ubicaciones de canales"
---

# Análisis de ubicaciones de canales

OpenClaw normaliza las ubicaciones compartidas de los canales de chat en:

- texto legible por humanos anexado al cuerpo del mensaje entrante, y
- campos estructurados en la carga útil del contexto de respuesta automática.

Actualmente compatible:

- **Telegram** (pines de ubicación + lugares + ubicaciones en vivo)
- **WhatsApp** (locationMessage + liveLocationMessage)
- **Matrix** (`m.location` con `geo_uri`)

## Formato de texto

Las ubicaciones se representan como líneas amigables sin corchetes:

- Pin:
  - `📍 48.858844, 2.294351 ±12m`
- Lugar con nombre:
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- Uso compartido en vivo:
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

Si el canal incluye un pie de foto/comentario, se anexa en la siguiente línea:

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## Campos de contexto

Cuando hay una ubicación presente, estos campos se añaden a `ctx`:

- `LocationLat` (número)
- `LocationLon` (número)
- `LocationAccuracy` (número, metros; opcional)
- `LocationName` (cadena; opcional)
- `LocationAddress` (cadena; opcional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booleano)

## Notas del canal

- **Telegram**: los lugares se mapean a `LocationName/LocationAddress`; las ubicaciones en vivo usan `live_period`.
- **WhatsApp**: `locationMessage.comment` y `liveLocationMessage.caption` se anexan como la línea de pie de foto.
- **Matrix**: `geo_uri` se analiza como una ubicación de pin; la altitud se ignora y `LocationIsLive` siempre es falso.

import en from "/components/footer/en.mdx";

<en />

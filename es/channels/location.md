---
summary: "Análisis de ubicaciones de canales entrantes (Telegram + WhatsApp) y campos de contexto"
read_when:
  - Adding or modifying channel location parsing
  - Using location context fields in agent prompts or tools
title: "Análisis de ubicación de canal"
---

# Análisis de ubicación de canal

OpenClaw normaliza las ubicaciones compartidas de los canales de chat en:

- texto legible por humanos anexado al cuerpo entrante, y
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

Si el canal incluye un título/comentario, se anexa en la siguiente línea:

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## Campos de contexto

Cuando hay una ubicación presente, estos campos se agregan a `ctx`:

- `LocationLat` (número)
- `LocationLon` (número)
- `LocationAccuracy` (número, metros; opcional)
- `LocationName` (cadena; opcional)
- `LocationAddress` (cadena; opcional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (booleano)

## Notas del canal

- **Telegram**: los lugares se asignan a `LocationName/LocationAddress`; las ubicaciones en vivo usan `live_period`.
- **WhatsApp**: `locationMessage.comment` y `liveLocationMessage.caption` se anexan como la línea del título.
- **Matrix**: `geo_uri` se analiza como una ubicación de pin; se ignora la altitud y `LocationIsLive` siempre es falso.

import es from "/components/footer/es.mdx";

<es />

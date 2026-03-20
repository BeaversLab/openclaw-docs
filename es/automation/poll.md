---
summary: "Envío de encuestas mediante gateway + CLI"
read_when:
  - Agregar o modificar la compatibilidad con encuestas
  - Depuración de envíos de encuestas desde la CLI o el gateway
title: "Encuestas"
---

# Encuestas

## Canales compatibles

- Telegram
- WhatsApp (canal web)
- Discord
- MS Teams (Tarjetas adaptables)

## CLI

```bash
# Telegram
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300

# WhatsApp
openclaw message poll --target +15555550123 \
  --poll-question "Lunch today?" --poll-option "Yes" --poll-option "No" --poll-option "Maybe"
openclaw message poll --target 123456789@g.us \
  --poll-question "Meeting time?" --poll-option "10am" --poll-option "2pm" --poll-option "4pm" --poll-multi

# Discord
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Snack?" --poll-option "Pizza" --poll-option "Sushi"
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Plan?" --poll-option "A" --poll-option "B" --poll-duration-hours 48

# MS Teams
openclaw message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" --poll-option "Pizza" --poll-option "Sushi"
```

Opciones:

- `--channel`: `whatsapp` (predeterminado), `telegram`, `discord` o `msteams`
- `--poll-multi`: permite seleccionar varias opciones
- `--poll-duration-hours`: solo para Discord (predeterminado a 24 si se omite)
- `--poll-duration-seconds`: solo para Telegram (5-600 segundos)
- `--poll-anonymous` / `--poll-public`: visibilidad de la encuesta solo para Telegram

## Gateway RPC

Método: `poll`

Parámetros:

- `to` (cadena, obligatorio)
- `question` (cadena, obligatorio)
- `options` (cadena[], obligatorio)
- `maxSelections` (número, opcional)
- `durationHours` (número, opcional)
- `durationSeconds` (número, opcional, solo para Telegram)
- `isAnonymous` (booleano, opcional, solo para Telegram)
- `channel` (cadena, opcional, predeterminado: `whatsapp`)
- `idempotencyKey` (cadena, obligatorio)

## Diferencias de canal

- Telegram: 2-10 opciones. Admite temas del foro mediante destinos `threadId` o `:topic:`. Usa `durationSeconds` en lugar de `durationHours`, limitado a 5-600 segundos. Admite encuestas anónimas y públicas.
- WhatsApp: 2-12 opciones, `maxSelections` debe estar dentro del conteo de opciones, ignora `durationHours`.
- Discord: 2-10 opciones, `durationHours` limitado a 1-768 horas (predeterminado 24). `maxSelections > 1` habilita la selección múltiple; Discord no admite un conteo de selección estricto.
- MS Teams: Encuestas de Tarjetas adaptables (administradas por OpenClaw). Sin API de encuestas nativa; se ignora `durationHours`.

## Herramienta de agente (Mensaje)

Use la herramienta `message` con la acción `poll` (`to`, `pollQuestion`, `pollOption`, opcional `pollMulti`, `pollDurationHours`, `channel`).

Para Telegram, la herramienta también acepta `pollDurationSeconds`, `pollAnonymous` y `pollPublic`.

Use `action: "poll"` para la creación de encuestas. Los campos de encuesta pasados con `action: "send"` son rechazados.

Nota: Discord no tiene modo de "elegir exactamente N"; `pollMulti` se asigna a selección múltiple.
Las encuestas de Teams se representan como tarjetas adaptables (Adaptive Cards) y requieren que la puerta de enlace se mantenga en línea
para registrar los votos en `~/.openclaw/msteams-polls.json`.

import es from "/components/footer/es.mdx";

<es />

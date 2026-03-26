---
summary: "Endurecimiento de la lista de permitidos de Telegram: prefijo + normalización de espacios en blanco"
read_when:
  - Reviewing historical Telegram allowlist changes
title: "Endurecimiento de la lista de permitidos de Telegram"
---

# Endurecimiento de la lista de permitidos de Telegram

**Fecha**: 2026-01-05  
**Estado**: Completado  
**PR**: #216

## Resumen

Las listas de permitidos de Telegram ahora aceptan los prefijos `telegram:` y `tg:` sin distinguir mayúsculas de minúsculas, y toleran
espacios en blanco accidentales. Esto alinea las comprobaciones de entrada de la lista de permitidos con la normalización del envío de salida.

## Qué cambió

- Los prefijos `telegram:` y `tg:` se tratan igual (sin distinción de mayúsculas y minúsculas).
- Las entradas de la lista de permitidos se recortan; se ignoran las entradas vacías.

## Ejemplos

Todos estos se aceptan para el mismo ID:

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## Por qué es importante

Copiar/pegar de registros o IDs de chat a menudo incluye prefijos y espacios en blanco. La normalización evita
falsos negativos al decidir si responder en MDs o grupos.

## Documentos relacionados

- [Chats de grupo](/es/concepts/groups)
- [Proveedor de Telegram](/es/channels/telegram)

import es from "/components/footer/es.mdx";

<es />

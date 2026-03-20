---
summary: "Endurecimiento de la lista blanca de Telegram: normalización de prefijos + espacios en blanco"
read_when:
  - Revisar los cambios históricos en la lista blanca de Telegram
title: "Endurecimiento de la lista blanca de Telegram"
---

# Endurecimiento de la lista de permitidos de Telegram

**Fecha**: 2026-01-05  
**Estado**: Completado  
**PR**: #216

## Resumen

Las listas blancas de Telegram ahora aceptan prefijos `telegram:` y `tg:` sin distinción entre mayúsculas y minúsculas, y toleran
espacios en blanco accidentales. Esto alinea las comprobaciones de listas blancas entrantes con la normalización del envío saliente.

## Qué cambió

- Los prefijos `telegram:` y `tg:` se tratan de la misma manera (sin distinción entre mayúsculas y minúsculas).
- Las entradas de la lista de permitidos se recortan; se ignoran las entradas vacías.

## Ejemplos

Todos estos se aceptan para el mismo ID:

- `telegram:123456`
- `TG:123456`
- `tg:123456`

## Por qué es importante

Copiar/pegar de registros o ID de chat a menudo incluye prefijos y espacios en blanco. La normalización evita
falsos negativos al decidir si responder en MD o grupos.

## Documentos relacionados

- [Chats de grupo](/es/concepts/groups)
- [Proveedor de Telegram](/es/channels/telegram)

import es from "/components/footer/es.mdx";

<es />

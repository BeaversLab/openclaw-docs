---
summary: "Referencia de la CLI para `openclaw pairing` (aprobar/listar solicitudes de emparejamiento)"
read_when:
  - Estás usando DMs en modo de emparejamiento y necesitas aprobar remitentes
title: "pairing"
---

# `openclaw pairing`

Aprobar o inspeccionar solicitudes de emparejamiento de MD (para canales que admiten emparejamiento).

Relacionado:

- Flujo de emparejamiento: [Emparejamiento](/es/channels/pairing)

## Comandos

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## Notas

- Entrada de canal: pásalo posicionalmente (`pairing list telegram`) o con `--channel <channel>`.
- `pairing list` admite `--account <accountId>` para canales multicuenta.
- `pairing approve` admite `--account <accountId>` y `--notify`.
- Si solo hay un canal con capacidad de emparejamiento configurado, se permite `pairing approve <code>`.

import en from "/components/footer/en.mdx";

<en />

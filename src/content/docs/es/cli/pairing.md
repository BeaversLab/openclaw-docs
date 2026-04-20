---
summary: "Referencia de la CLI para `openclaw pairing` (aprobar/listar solicitudes de emparejamiento)"
read_when:
  - You’re using pairing-mode DMs and need to approve senders
title: "emparejamiento"
---

# `openclaw pairing`

Aprobar o inspeccionar solicitudes de emparejamiento de MD (para canales que admiten emparejamiento).

Relacionado:

- Flujo de vinculación: [Vinculación](/es/channels/pairing)

## Comandos

```bash
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve <code>
openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify
```

## `pairing list`

Lista las solicitudes de vinculación pendientes para un canal.

Opciones:

- `[channel]`: id de canal posicional
- `--channel <channel>`: id de canal explícito
- `--account <accountId>`: id de cuenta para canales multi-cuenta
- `--json`: salida legible por máquina

Notas:

- Si hay configurados múltiples canales con capacidad de vinculación, debes proporcionar un canal de forma posicional o con `--channel`.
- Se permiten canales de extensión siempre que el id del canal sea válido.

## `pairing approve`

Aprueba un código de vinculación pendiente y permite a ese remitente.

Uso:

- `openclaw pairing approve <channel> <code>`
- `openclaw pairing approve --channel <channel> <code>`
- `openclaw pairing approve <code>` cuando exactamente hay un canal con capacidad de vinculación configurado

Opciones:

- `--channel <channel>`: id de canal explícito
- `--account <accountId>`: id de cuenta para canales multi-cuenta
- `--notify`: envía una confirmación de vuelta al solicitante en el mismo canal

## Notas

- Entrada de canal: pásalo de forma posicional (`pairing list telegram`) o con `--channel <channel>`.
- `pairing list` soporta `--account <accountId>` para canales multi-cuenta.
- `pairing approve` soporta `--account <accountId>` y `--notify`.
- Si solo hay configurado un canal con capacidad de vinculación, se permite `pairing approve <code>`.

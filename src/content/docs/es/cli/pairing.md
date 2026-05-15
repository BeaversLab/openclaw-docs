---
summary: "Referencia de la CLI para `openclaw pairing` (aprobar/listar solicitudes de emparejamiento)"
read_when:
  - You're using pairing-mode DMs and need to approve senders
title: "Emparejamiento"
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

Inicialización del propietario:

- Si `commands.ownerAllowFrom` está vacío cuando apruebas un código de emparejamiento, OpenClaw también registra el remitente aprobado como el propietario del comando, utilizando una entrada con alcance de canal como `telegram:123456789`.
- Esto solo inicializa el primer propietario. Las aprobaciones de emparejamiento posteriores no reemplazan ni expanden `commands.ownerAllowFrom`.
- El propietario del comando es la cuenta de operador humano autorizada a ejecutar comandos solo para propietarios y aprobar acciones peligrosas como `/diagnostics`, `/export-trajectory`, `/config` y aprobaciones de ejecución.

## Notas

- Entrada de canal: pásalo posicionalmente (`pairing list telegram`) o con `--channel <channel>`.
- `pairing list` admite `--account <accountId>` para canales multicuenta.
- `pairing approve` admite `--account <accountId>` y `--notify`.
- Si solo hay un canal compatible con emparejamiento configurado, se permite `pairing approve <code>`.
- Si aprobaste un remitente antes de que existiera esta inicialización, ejecuta `openclaw doctor`; advierte cuando no hay ningún propietario de comando configurado y muestra el comando `openclaw config set commands.ownerAllowFrom ...` para solucionarlo.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Emparejamiento de canales](/es/channels/pairing)

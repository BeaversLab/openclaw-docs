---
summary: "Referencia de CLI para `openclaw proxy`, el proxy de depuración local e inspector de capturas"
read_when:
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

Ejecuta el proxy de depuración explícito local e inspecciona el tráfico capturado.

Este es un comando de depuración para la investigación a nivel de transporte. Puede iniciar un
proxy local, ejecutar un comando secundario con la captura habilitada, listar sesiones de
captura, consultar patrones de tráfico comunes, leer blobs capturados y purgar datos de
captura locales.

## Comandos

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## Consultas predefinidas

`openclaw proxy query --preset <name>` acepta:

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## Notas

- `start` por defecto es `127.0.0.1` a menos que se establezca `--host`.
- `run` inicia un proxy de depuración local y luego ejecuta el comando después de `--`.
- Las capturas son datos de depuración locales; use `openclaw proxy purge` cuando termine.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth)

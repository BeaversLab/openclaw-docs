---
summary: "Referencia de CLI para `openclaw logs` (ver registros de gateway a través de RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "registros"
---

# `openclaw logs`

Ver los registros de archivo de Gateway a través de RPC (funciona en modo remoto).

Relacionado:

- Resumen de registro: [Registro](/es/logging)

## Ejemplos

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
```

Use `--local-time` para renderizar las marcas de tiempo en su zona horaria local.

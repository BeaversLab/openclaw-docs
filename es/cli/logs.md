---
summary: "Referencia de CLI para `openclaw logs` (seguir registros de la puerta de enlace a través de RPC)"
read_when:
  - Necesitas seguir los registros de la puerta de enlace de forma remota (sin SSH)
  - Quieres líneas de registro JSON para herramientas
title: "logs"
---

# `openclaw logs`

Sigue los registros de archivo de la puerta de enlace a través de RPC (funciona en modo remoto).

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

Usa `--local-time` para mostrar las marcas de tiempo en tu zona horaria local.

import es from "/components/footer/es.mdx";

<es />

---
summary: "Referencia de CLI para `openclaw tui` (interfaz de usuario de terminal conectada a la Gateway)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
title: "tui"
---

# `openclaw tui`

Abre la interfaz de usuario de terminal conectada a la Gateway.

Relacionado:

- Guía de TUI: [TUI](/es/web/tui)

Notas:

- `tui` resuelve los SecretRefs de autenticación de la puerta de enlace configurados para la autenticación por token/contraseña cuando es posible (proveedores `env`/`file`/`exec`).
- Cuando se inicia desde dentro de un directorio del espacio de trabajo de un agente configurado, la TUI selecciona automáticamente ese agente como predeterminado para la clave de sesión (a menos que `--session` se establezca explícitamente en `agent:<id>:...`).

## Ejemplos

```bash
openclaw tui
openclaw tui --url ws://127.0.0.1:18789 --token <token>
openclaw tui --session main --deliver
# when run inside an agent workspace, infers that agent automatically
openclaw tui --session bugfix
```

import es from "/components/footer/es.mdx";

<es />

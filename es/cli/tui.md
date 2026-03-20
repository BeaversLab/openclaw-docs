---
summary: "Referencia de la CLI para `openclaw tui` (interfaz de terminal conectada a la Gateway)"
read_when:
  - Deseas una interfaz de terminal para la Gateway (compatible con control remoto)
  - Deseas pasar url/token/sesión desde scripts
title: "tui"
---

# `openclaw tui`

Abre la interfaz de terminal conectada a la Gateway.

Relacionado:

- Guía de TUI: [TUI](/es/web/tui)

Notas:

- `tui` resuelve los SecretRefs de autenticación de la gateway configurados para la autenticación por token/contraseña cuando es posible (proveedores `env`/`file`/`exec`).
- Cuando se inicia desde dentro de un directorio de espacio de trabajo del agente configurado, la TUI selecciona automáticamente ese agente para el valor predeterminado de la clave de sesión (a menos que `--session` sea explícitamente `agent:<id>:...`).

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

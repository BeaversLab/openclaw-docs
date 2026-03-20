---
summary: "Referencia de la CLI para `openclaw approvals` (aprobaciones de ejecución para hosts de puerta de enlace o nodos)
read_when:
  - Deseas editar las aprobaciones de ejecución desde la CLI
  - Necesitas gestionar las listas de permitidos (allowlists) en hosts de puerta de enlace o nodos
title: "approvals"
---

# `openclaw approvals`

Gestiona las aprobaciones de ejecución para el **host local**, el **host de la puerta de enlace** o un **host de nodo**.
De forma predeterminada, los comandos tienen como objetivo el archivo de aprobaciones local en el disco. Usa `--gateway` para apuntar a la puerta de enlace o `--node` para apuntar a un nodo específico.

Relacionado:

- Aprobaciones de ejecución: [Aprobaciones de ejecución](/es/tools/exec-approvals)
- Nodos: [Nodos](/es/nodes)

## Comandos comunes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## Reemplazar aprobaciones desde un archivo

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## Auxiliares de lista de permitidos

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## Notas

- `--node` usa el mismo solucionador que `openclaw nodes` (id, nombre, ip o prefijo de id).
- `--agent` por defecto es `"*"`, lo cual se aplica a todos los agentes.
- El host del nodo debe anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo headless).
- Los archivos de aprobaciones se almacenan por host en `~/.openclaw/exec-approvals.json`.

import es from "/components/footer/es.mdx";

<es />

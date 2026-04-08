---
summary: "Referencia de la CLI para `openclaw uninstall` (eliminar servicio de puerta de enlace + datos locales)"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "desinstalar"
---

# `openclaw uninstall`

Desinstale el servicio de puerta de enlace + los datos locales (la CLI permanece).

Opciones:

- `--service`: elimina el servicio de puerta de enlace
- `--state`: elimina el estado y la configuración
- `--workspace`: elimina los directorios del espacio de trabajo
- `--app`: elimina la aplicación de macOS
- `--all`: elimina el servicio, el estado, el espacio de trabajo y la aplicación
- `--yes`: omite las solicitudes de confirmación
- `--non-interactive`: desactiva las solicitudes; requiere `--yes`
- `--dry-run`: imprime las acciones sin eliminar archivos

Ejemplos:

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

Notas:

- Ejecuta `openclaw backup create` primero si deseas una instantánea restaurable antes de eliminar el estado o los espacios de trabajo.
- `--all` es una abreviatura para eliminar el servicio, el estado, el espacio de trabajo y la aplicación juntos.
- `--non-interactive` requiere `--yes`.

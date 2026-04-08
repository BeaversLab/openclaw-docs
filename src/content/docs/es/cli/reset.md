---
summary: "Referencia de la CLI para `openclaw reset` (restablecer el estado/configuración local)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "restablecer"
---

# `openclaw reset`

Restablecer la configuración/estado local (mantiene la CLI instalada).

Opciones:

- `--scope <scope>`: `config`, `config+creds+sessions` o `full`
- `--yes`: omitir los mensajes de confirmación
- `--non-interactive`: desactivar los mensajes; requiere `--scope` y `--yes`
- `--dry-run`: imprimir las acciones sin eliminar archivos

Ejemplos:

```bash
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

Notas:

- Ejecute primero `openclaw backup create` si desea una instantánea restaurable antes de eliminar el estado local.
- Si omite `--scope`, `openclaw reset` usa un mensaje interactivo para elegir qué eliminar.
- `--non-interactive` solo es válido cuando se establecen tanto `--scope` como `--yes`.

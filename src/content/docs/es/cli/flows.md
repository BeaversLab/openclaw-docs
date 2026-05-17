---
summary: "Redirección: los comandos de flujo se encuentran en `openclaw tasks flow`"
read_when:
  - You encounter `openclaw flows` in older docs or release notes
  - You want a quick TaskFlow inspection reference
title: "Flujos (redirección)"
---

# `openclaw tasks flow`

No existe un comando `openclaw flows` de nivel superior. La inspección de TaskFlow duradera se encuentra en `openclaw tasks flow`.

## Subcomandos

```bash
openclaw tasks flow list   [--json] [--status <name>]
openclaw tasks flow show   <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

| Subcomando | Descripción                        | Argumentos / opciones                                                                                 |
| ---------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `list`     | Listar TaskFlows rastreados.       | `--json` salida legible por máquina; `--status <name>` filtro (ver valores de estado a continuación). |
| `show`     | Mostrar un TaskFlow.               | `<lookup>` id de flujo o clave de propietario; `--json` salida legible por máquina.                   |
| `cancel`   | Cancelar un TaskFlow en ejecución. | `<lookup>` id de flujo o clave de propietario.                                                        |

`<lookup>` acepta un id de flujo (devuelto por `list` / `show`) o la clave de propietario del flujo (el identificador estable que el subsistema propietario utiliza para rastrear el flujo).

### Valores de filtro de estado

`--status` en `list` acepta uno de:

`queued`, `running`, `waiting`, `blocked`, `succeeded`, `failed`, `cancelled`, `lost`

## Ejemplos

```bash
openclaw tasks flow list
openclaw tasks flow list --status running
openclaw tasks flow list --json
openclaw tasks flow show flow_abc123
openclaw tasks flow show flow_abc123 --json
openclaw tasks flow cancel flow_abc123
```

Para obtener conceptos completos y creación de TaskFlow, consulte [TaskFlow](/es/automation/taskflow). Para el comando `tasks` principal, consulte [referencia de la CLI de tareas](/es/cli/tasks).

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Automatización](/es/automation)
- [TaskFlow](/es/automation/taskflow)

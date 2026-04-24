---
summary: "Referencia de CLI para `openclaw tasks` (libro mayor de tareas en segundo plano y estado del flujo de tareas)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

# `openclaw tasks`

Inspeccione las tareas en segundo plano duraderas y el estado del flujo de tareas. Sin un subcomando,
`openclaw tasks` es equivalente a `openclaw tasks list`.

Consulte [Tareas en segundo plano](/es/automation/tasks) para obtener información sobre el ciclo de vida y el modelo de entrega.

## Uso

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## Opciones raíz

- `--json`: salida JSON.
- `--runtime <name>`: filtrar por tipo: `subagent`, `acp`, `cron` o `cli`.
- `--status <name>`: filtrar por estado: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled` o `lost`.

## Subcomandos

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

Enumera las tareas en segundo plano rastreadas comenzando por las más recientes.

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

Muestra una tarea por ID de tarea, ID de ejecución o clave de sesión.

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

Cambia la política de notificación de una tarea en ejecución.

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

Cancela una tarea en segundo plano en ejecución.

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

Muestra registros de tareas y flujos de tareas obsoletos, perdidos, con fallos de entrega o inconsistentes.

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

Vista previa o aplica la conciliación de tareas y flujos de tareas, el sellado de limpieza y la poda.

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

Inspecciona o cancela el estado duradero del flujo de tareas bajo el libro mayor de tareas.

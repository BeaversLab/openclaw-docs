---
summary: "Referencia de CLI para `openclaw tasks` (libro mayor de tareas en segundo plano y estado del flujo de tareas)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

Inspeccione tareas en segundo plano duraderas y el estado de Task Flow. Sin un subcomando,
`openclaw tasks` es equivalente a `openclaw tasks list`.

Consulte [Tareas en segundo plano](/es/automation/tasks) para conocer el ciclo de vida y el modelo de entrega.

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

Lista las tareas en segundo plano rastreadas, primero las más recientes.

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

Muestra una tarea por ID de tarea, ID de ejecución o clave de sesión.

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

Cambia la política de notificación para una tarea en ejecución.

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

Cancela una tarea en segundo plano en ejecución.

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

Muestra registros de tareas y flujos de tareas obsoletos, perdidos, con fallas de entrega o inconsistentes. Las tareas perdidas conservadas hasta `cleanupAfter` son advertencias; las tareas perdidas caducadas o sin marca son errores.

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

Vista previa o aplica la conciliación de tareas y flujos de tareas, la limpieza de marcas y la poda.
Para las tareas cron, la conciliación utiliza los registros de ejecución/estado del trabajo persistidos antes de marcar una
tarea activa antigua como `lost`, por lo que las ejecuciones cron completadas no se convierten en errores de auditoría falsos
solo porque el estado de ejecución en memoria de Gateway se ha ido. La auditoría de CLI sin conexión no
es autorizada para el conjunto de trabajos activos de cron local del proceso de Gateway.

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

Inspecciona o cancela el estado duradero del flujo de tareas bajo el libro mayor de tareas.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Tareas en segundo plano](/es/automation/tasks)

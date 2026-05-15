---
summary: "Referencia de CLI para `openclaw tasks` (libro mayor de tareas en segundo plano y estado del flujo de tareas)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

Inspeccione tareas en segundo plano duraderas y el estado de Task Flow. Sin un subcomando,
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

Obtiene una vista previa o aplica la conciliación de tareas y de flujos de tareas (Task Flow), el sellado de limpieza, la poda y la limpieza del registro de sesiones de ejecuciones de cron obsoletas.
Para las tareas de cron, la conciliación utiliza los registros de ejecución o el estado del trabajo persistidos antes de marcar una tarea activa antigua como `lost`, de modo que las ejecuciones de cron completadas no se conviertan en errores de auditoría falsos simplemente porque el estado de ejecución en memoria de Gateway se ha ido. La auditoría de CLI sin conexión no es autorizada para el conjunto de trabajos activos de cron local al proceso de Gateway. Las tareas de CLI con un id de ejecución/id de fuente se marcan como `lost` cuando su contexto de ejecución de Gateway en vivo ha desaparecido, incluso si permanece una fila de sesión secundaria antigua.
Cuando se aplica, el mantenimiento también poda las filas del registro de sesiones `cron:<jobId>:run:<uuid>` de más de 7 días de antigüedad, conservando al mismo tiempo los trabajos de cron que se están ejecutando actualmente y dejando sin tocar las filas de sesiones que no son de cron.

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

Inspecciona o cancela el estado duradero del flujo de tareas bajo el libro mayor de tareas.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Tareas en segundo plano](/es/automation/tasks)

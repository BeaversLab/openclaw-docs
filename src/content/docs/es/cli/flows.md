---
summary: "Nota de compatibilidad para el comando `openclaw flows` documentado erróneamente"
read_when:
  - You encounter openclaw flows in older release notes, issue threads, or search results
  - You want to know what command replaced openclaw flows
title: "flows"
---

# `openclaw flows`

`openclaw flows` **no** es un comando actual de la CLI de OpenClaw.

Algunas notas de la versión y documentación antiguas documentaron erróneamente una superficie de comando `flows`. La superficie de operador admitida es [`openclaw tasks`](/en/automation/tasks).

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## Usar en su lugar

- `openclaw tasks list` — lista las tareas en segundo plano rastreadas
- `openclaw tasks show <lookup>` — inspecciona una tarea por id. de tarea, id. de ejecución o clave de sesión
- `openclaw tasks cancel <lookup>` — cancela una tarea en segundo plano en ejecución
- `openclaw tasks notify <lookup> <policy>` — cambia el comportamiento de notificación de tareas
- `openclaw tasks audit` — muestra ejecuciones de tareas obsoletas o rotas

## Por qué existe esta página

Esta página se mantiene para que los enlaces existentes de entradas antiguas del registro de cambios, hilos de problemas y resultados de búsqueda tengan una corrección clara en lugar de un camino sin salida.

## Relacionado

- [Tareas en segundo plano](/en/automation/tasks) — libro de trabajo desacoplado
- [Referencia de la CLI](/en/cli/index) — árbol de comandos completo

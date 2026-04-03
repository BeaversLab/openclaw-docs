---
summary: "Nota de compatibilidad para referencias antiguas de ClawFlow en notas de la versión y documentos"
read_when:
  - You encounter ClawFlow or openclaw flows in older release notes or docs
  - You want to understand what ClawFlow terminology maps to in the current CLI
  - You want to translate older flow references into the supported task commands
title: "ClawFlow"
---

# ClawFlow

`ClawFlow` aparece en algunas notas de la versión y documentación antiguas de OpenClaw como si fuera un tiempo de ejecución orientado al usuario con su propia superficie de comando `openclaw flows`.

Esa no es la superficie actual orientada al operador en este repositorio.

Hoy en día, la superficie de la CLI compatible para inspeccionar y gestionar el trabajo desacoplado es [`openclaw tasks`](/en/automation/tasks).

## Qué usar hoy

- `openclaw tasks list` muestra las ejecuciones desacopladas rastreadas
- `openclaw tasks show <lookup>` muestra una tarea por id de tarea, id de ejecución o clave de sesión
- `openclaw tasks cancel <lookup>` cancela una tarea en ejecución
- `openclaw tasks audit` muestra ejecuciones de tareas obsoletas o rotas

```bash
openclaw tasks list
openclaw tasks show <lookup>
openclaw tasks cancel <lookup>
```

## Qué significa esto para las referencias antiguas

Si ves `ClawFlow` o `openclaw flows` en:

- notas de la versión antiguas
- hilos de problemas
- resultados de búsqueda obsoletos
- notas locales obsoletas

traduzca esas instrucciones a la CLI de tareas actual:

- `openclaw flows list` -> `openclaw tasks list`
- `openclaw flows show <lookup>` -> `openclaw tasks show <lookup>`
- `openclaw flows cancel <lookup>` -> `openclaw tasks cancel <lookup>`

## Relacionado

- [Tareas en segundo plano](/en/automation/tasks) — registro de trabajo desacoplado
- [CLI: flujos](/en/cli/flows) — nota de compatibilidad para el nombre de comando incorrecto
- [Trabajos de Cron](/en/automation/cron-jobs) — trabajos programados que pueden crear tareas

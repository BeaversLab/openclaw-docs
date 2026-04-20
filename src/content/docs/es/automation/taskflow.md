---
summary: "Capa de orquestación de flujos de Task Flow sobre tareas en segundo plano"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task Flow"
---

# Task Flow

Task Flow es el sustrato de orquestación de flujos que se sitúa por encima de las [tareas en segundo plano](/es/automation/tasks). Gestiona flujos multipaso duraderos con su propio estado, seguimiento de revisiones y semántica de sincronización, mientras que las tareas individuales siguen siendo la unidad de trabajo desacoplado.

## Cuándo usar Task Flow

Use Task Flow cuando el trabajo abarque varios pasos secuenciales o de ramificación y necesite un seguimiento duradero del progreso a través de reinicios de la puerta de enlace. Para operaciones individuales en segundo plano, una simple [tarea](/es/automation/tasks) es suficiente.

| Escenario                                  | Uso                      |
| ------------------------------------------ | ------------------------ |
| Trabajo en segundo plano único             | Tarea simple             |
| Canalización multipaso (A luego B luego C) | Task Flow (administrado) |
| Observar tareas creadas externamente       | Task Flow (reflejado)    |
| Recordatorio de un solo uso                | Trabajo de Cron          |

## Modos de sincronización

### Modo administrado

Task Flow posee el ciclo de vida de principio a fin. Crea tareas como pasos de flujo, las impulsa hasta su finalización y avanza el estado del flujo automáticamente.

Ejemplo: un flujo de informe semanal que (1) recopila datos, (2) genera el informe y (3) lo entrega. Task Flow crea cada paso como una tarea en segundo plano, espera a que se complete y luego pasa al siguiente paso.

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### Modo reflejado

Task Flow observa las tareas creadas externamente y mantiene el estado del flujo sincronizado sin hacerse cargo de la creación de tareas. Esto es útil cuando las tareas se originan en trabajos de Cron, comandos de CLI u otras fuentes y desea una vista unificada de su progreso como un flujo.

Ejemplo: tres trabajos de Cron independientes que juntos forman una rutina de "operaciones matutinas". Un flujo reflejado realiza un seguimiento de su progreso colectivo sin controlar cuándo o cómo se ejecutan.

## Estado duradero y seguimiento de revisiones

Cada flujo conserva su propio estado y realiza un seguimiento de las revisiones, por lo que el progreso sobrevive a los reinicios de la puerta de enlace. El seguimiento de revisiones permite la detección de conflictos cuando múltiples fuentes intentan avanzar el mismo flujo simultáneamente.

## Comportamiento de cancelación

`openclaw tasks flow cancel` establece una intención de cancelación persistente en el flujo. Las tareas activas dentro del flujo se cancelan y no se inician nuevos pasos. La intención de cancelación persiste a través de los reinicios, por lo que un flujo cancelado permanece cancelado incluso si la puerta de enlace se reinicia antes de que todas las tareas secundarias hayan terminado.

## Comandos de CLI

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| Comando                           | Descripción                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `openclaw tasks flow list`        | Muestra los flujos rastreados con estado y modo de sincronización |
| `openclaw tasks flow show <id>`   | Inspecciona un flujo por ID de flujo o clave de búsqueda          |
| `openclaw tasks flow cancel <id>` | Cancela un flujo en ejecución y sus tareas activas                |

## Cómo se relacionan los flujos con las tareas

Los flujos coordinan las tareas, no las reemplazan. Un solo flujo puede impulsar múltiples tareas en segundo plano durante su vida útil. Use `openclaw tasks` para inspeccionar registros de tareas individuales y `openclaw tasks flow` para inspeccionar el flujo de orquestación.

## Relacionado

- [Tareas en segundo plano](/es/automation/tasks) — el libro mayor de trabajo desacoplado que coordinan los flujos
- [CLI: tareas](/es/cli/index#tasks) — referencia de comandos CLI para `openclaw tasks flow`
- [Descripción general de automatización](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Trabajos de Cron](/es/automation/cron-jobs) — trabajos programados que pueden alimentarse en los flujos

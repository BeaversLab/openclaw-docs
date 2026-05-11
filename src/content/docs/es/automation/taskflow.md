---
summary: "Capa de orquestación de flujo de Task Flow por encima de las tareas en segundo plano"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Flujo de tareas"
---

Task Flow es el sustrato de orquestación de flujos que se sitúa por encima de las [tareas en segundo plano](/es/automation/tasks). Gestiona flujos multipaso duraderos con su propio estado, seguimiento de revisiones y semántica de sincronización, mientras que las tareas individuales siguen siendo la unidad de trabajo desacoplado.

## Cuándo usar Task Flow

Use Task Flow cuando el trabajo abarque varios pasos secuenciales o ramificados y necesite un seguimiento del progreso duradero a través de reinicios de la puerta de enlace. Para operaciones en segundo plano únicas, una [tarea](/es/automation/tasks) sencilla es suficiente.

| Escenario                                  | Uso                    |
| ------------------------------------------ | ---------------------- |
| Trabajo en segundo plano único             | Tarea sencilla         |
| Canalización multipaso (A luego B luego C) | Task Flow (gestionado) |
| Observar tareas creadas externamente       | Task Flow (reflejado)  |
| Recordatorio de un solo uso                | Trabajo de Cron        |

## Patrón de flujo de trabajo programado confiable

Para los flujos de trabajo recurrentes, como los resúmenes de inteligencia de mercado, trate la programación, la orquestación y las comprobaciones de fiabilidad como capas separadas:

1. Use [Tareas programadas](/es/automation/cron-jobs) para la temporización.
2. Use una sesión de cron persistente cuando el flujo de trabajo debe basarse en el contexto anterior.
3. Use [Lobster](/es/tools/lobster) para pasos deterministas, puertas de aprobación y tokens de reanudación.
4. Use Task Flow para rastrear la ejecución multipaso a través de tareas secundarias, esperas, reintentos y reinicios de la puerta de enlace.

Forma de cron de ejemplo:

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "Run the market-intel Lobster workflow. Verify source freshness before summarizing." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

Use `session:<id>` en lugar de `isolated` cuando el flujo de trabajo recurrente necesite un historial deliberado, resúmenes de ejecuciones anteriores o un contexto permanente. Use `isolated` cuando cada ejecución deba comenzar de cero y todo el estado necesario esté explícito en el flujo de trabajo.

Dentro del flujo de trabajo, coloque las comprobaciones de fiabilidad antes del paso de resumen del LLM:

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

Comprobaciones previas al vuelo recomendadas:

- Disponibilidad del navegador y elección del perfil, por ejemplo `openclaw` para el estado gestionado o `user` cuando se requiere una sesión de Chrome iniciada. Consulte [Navegador](/es/tools/browser).
- Credenciales de API y cuota para cada fuente.
- Accesibilidad de red para los endpoints requeridos.
- Herramientas requeridas habilitadas para el agente, como `lobster`, `browser` y `llm-task`.
- Destino de fallo configurado para cron, de modo que los fallos de preflight sean visibles. Consulte [Tareas programadas](/es/automation/cron-jobs#delivery-and-output).

Campos de procedencia de datos recomendados para cada elemento recopilado:

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

Haga que el flujo de trabajo rechace o marque los elementos obsoletos antes del resumen. El paso LLM debe recibir solo JSON estructurado y se le debe pedir que preserve `sourceUrl`, `retrievedAt` y `asOf` en su salida. Use [LLM Task](/es/tools/llm-task) cuando necesite un paso de modelo validado por esquema dentro del flujo de trabajo.

Para flujos de trabajo reutilizables de equipo o comunidad, empaquete la CLI, los archivos `.lobster` y cualquier nota de configuración como una habilidad o complemento y publíquelo a través de [ClawHub](/es/tools/clawhub). Mantenga las salvaguardas específicas del flujo de trabajo en ese paquete, a menos que la API del complemento carezca de una capacidad genérica necesaria.

## Modos de sincronización

### Modo administrado

Task Flow es propietario del ciclo de vida de extremo a extremo. Crea tareas como pasos del flujo, las impulsa hasta su finalización y avanza el estado del flujo automáticamente.

Ejemplo: un flujo de informe semanal que (1) recopila datos, (2) genera el informe y (3) lo entrega. Task Flow crea cada paso como una tarea en segundo plano, espera a que se complete y luego pasa al siguiente paso.

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### Modo reflejado

Task Flow observa las tareas creadas externamente y mantiene el estado del flujo sincronizado sin asumir la propiedad de la creación de tareas. Esto es útil cuando las tareas se originan en trabajos cron, comandos de CLI u otras fuentes y desea una vista unificada de su progreso como un flujo.

Ejemplo: tres trabajos cron independientes que juntos forman una rutina de "operaciones matutinas". Un flujo reflejado rastrea su progreso colectivo sin controlar cuándo o cómo se ejecutan.

## Estado duradero y seguimiento de revisiones

Cada flujo conserva su propio estado y rastrea las revisiones, por lo que el progreso sobrevive a los reinicios de la puerta de enlace. El seguimiento de revisiones permite la detección de conflictos cuando múltiples fuentes intentan avanzar el mismo flujo simultáneamente.
El registro de flujos utiliza SQLite con mantenimiento de registro de escritura anticipada (write-ahead-log) limitado, que incluye puntos de control periódicos y de apagado, de modo que las puertas de enlace de larga ejecución no retienen archivos sidecar `registry.sqlite-wal` ilimitados.

## Comportamiento de cancelación

`openclaw tasks flow cancel` establece una intención de cancelación persistente en el flujo. Las tareas activas dentro del flujo se cancelan y no se inician nuevos pasos. La intención de cancelación persiste a través de los reinicios, por lo que un flujo cancelado permanece cancelado incluso si la puerta de enlace se reinicia antes de que todas las tareas secundarias hayan terminado.

## Comandos de la CLI

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

Los flujos coordinan tareas, no las reemplazan. Un solo flujo puede ejecutar múltiples tareas en segundo plano durante su vida útil. Use `openclaw tasks` para inspeccionar registros de tareas individuales y `openclaw tasks flow` para inspeccionar el flujo de orquestación.

## Relacionado

- [Tareas en segundo plano](/es/automation/tasks) — el libro mayor de trabajo desacoplado que coordinan los flujos
- [CLI: tareas](/es/cli/tasks) — referencia de comandos de la CLI para `openclaw tasks flow`
- [Descripción general de la automatización](/es/automation) — todos los mecanismos de automatización de un vistazo
- [Trabajos de Cron](/es/automation/cron-jobs) — trabajos programados que pueden alimentar flujos

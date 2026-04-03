---
summary: "Guía para elegir entre latido y trabajos cron para la automatización"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat: Cuándo usar cada uno

Tanto los latidos como los trabajos cron te permiten ejecutar tareas en un programa. Esta guía te ayuda a elegir el mecanismo adecuado para tu caso de uso.

Una distinción importante:

- **Heartbeat** es un **turno de sesión principal** programado — no se crea ningún registro de tarea.
- **Cron (main)** es un **evento del sistema en la sesión principal** programado — crea un registro de tarea con la política de notificación `silent`.
- **Cron (isolated)** es una **ejecución en segundo plano** programada — crea un registro de tarea rastreado en `openclaw tasks`.

Todas las ejecuciones de trabajos cron (principal y aisladas) crean [registros de tareas](/en/automation/tasks). Los turnos de Heartbeat no. Las tareas cron de sesión principal usan la política de notificación `silent` de manera predeterminada para que no generen notificaciones.

## Guía rápida de decisión

| Caso de uso                                         | Recomendado         | Por qué                                                     |
| --------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Revisar bandeja de entrada cada 30 min              | Heartbeat           | Se agrupa con otros verificaciones, consciente del contexto |
| Enviar informe diario a las 9am en punto            | Cron (isolated)     | Se necesita un momento exacto                               |
| Monitorear el calendario para próximos eventos      | Heartbeat           | Adecuado natural para la conciencia periódica               |
| Ejecutar análisis profundo semanal                  | Cron (isolated)     | Tarea independiente, puede usar un modelo diferente         |
| Recordármelo en 20 minutos                          | Cron (main, `--at`) | Un solo disparo con momento preciso                         |
| Verificación de salud del proyecto en segundo plano | Heartbeat           | Aprovecha el ciclo existente                                |

## Heartbeat: Conciencia Periódica

Los heartbeats se ejecutan en la **sesión principal** a intervalos regulares (predeterminado: 30 min). Están diseñados para que el agente verifique las cosas y destaque cualquier cosa importante.

### Cuándo usar heartbeat

- **Múltiples verificaciones periódicas**: En lugar de 5 trabajos cron separados verificando bandeja de entrada, calendario, clima, notificaciones y estado del proyecto, un solo heartbeat puede agrupar todas estas.
- **Decisiones conscientes del contexto**: El agente tiene el contexto completo de la sesión principal, por lo que puede tomar decisiones inteligentes sobre qué es urgente y qué puede esperar.
- **Continuidad conversacional**: Las ejecuciones de heartbeat comparten la misma sesión, por lo que el agente recuerda las conversaciones recientes y puede hacer seguimiento de manera natural.
- **Monitoreo de baja sobrecarga**: Un heartbeat reemplaza muchas pequeñas tareas de sondeo.

### Ventajas de Heartbeat

- **Agrupa múltiples verificaciones**: Un turno de agente puede revisar bandeja de entrada, calendario y notificaciones juntos.
- **Reduce las llamadas a la API**: Un solo heartbeat es más barato que 5 trabajos cron aislados.
- **Consciente del contexto**: El agente sabe en qué has estado trabajando y puede priorizar en consecuencia.
- **Supresión inteligente**: Si no hay nada que requiera atención, el agente responde `HEARTBEAT_OK` y no se entrega ningún mensaje.
- **Sincronización natural**: Varía ligeramente según la carga de la cola, lo cual es aceptable para la mayoría del monitoreo.
- **Sin registro de tareas**: los turnos de latido (heartbeat) permanecen en el historial de la sesión principal (consulte [Tareas en segundo plano](/en/automation/tasks)).

### Ejemplo de latido: lista de verificación HEARTBEAT.md

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

El agente lee esto en cada latido y maneja todos los elementos en un solo turno.

### Configurar el latido (heartbeat)

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // interval
        target: "last", // explicit alert delivery target (default is "none")
        activeHours: { start: "08:00", end: "22:00" }, // optional
      },
    },
  },
}
```

Consulte [Latido](/en/gateway/heartbeat) para obtener la configuración completa.

## Cron: Programación precisa

Las tareas de Cron se ejecutan en momentos precisos y pueden ejecutarse en sesiones aisladas sin afectar el contexto principal.
Las programaciones recurrentes al inicio de la hora se distribuyen automáticamente mediante un desfase determinista
por trabajo en una ventana de 0 a 5 minutos.

### Cuándo usar cron

- **Se requiere una sincronización exacta**: "Enviar esto a las 9:00 a.m. todos los lunes" (no "alrededor de las 9").
- **Tareas independientes**: Tareas que no necesitan un contexto de conversación.
- **Modelo/pensamiento diferente**: Análisis pesado que justifica un modelo más potente.
- **Recordatorios únicos**: "Recuérdamelo en 20 minutos" con `--at`.
- **Tareas ruidosas/frecuentes**: Tareas que ensuciarían el historial de la sesión principal.
- **Disparadores externos**: Tareas que deben ejecutarse independientemente de si el agente está activo por otros motivos.

### Ventajas de Cron

- **Sincronización precisa**: Expresiones cron de 5 o 6 campos (segundos) con soporte de zona horaria.
- **Distribución de carga integrada**: las programaciones recurrentes al inicio de la hora se escalonan hasta 5 minutos por defecto.
- **Control por trabajo**: anular el escalonamiento con `--stagger <duration>` o forzar la sincronización exacta con `--exact`.
- **Aislamiento de sesión**: Se ejecuta en `cron:<jobId>` sin contaminar el historial principal.
- **Anulaciones de modelo**: Utilizar un modelo más barato o más potente por trabajo.
- **Control de entrega**: Los trabajos aislados por defecto usan `announce` (resumen); elija `none` según sea necesario.
- **Entrega inmediata**: El modo de anuncio publica directamente sin esperar el latido (heartbeat).
- **No se necesita contexto del agente**: Se ejecuta incluso si la sesión principal está inactiva o compactada.
- **Soporte de un solo disparo**: `--at` para marcas de tiempo futuras precisas.
- **Seguimiento de tareas**: los trabajos aislados crean registros de [tareas en segundo plano](/en/automation/tasks) visibles en `openclaw tasks` y `openclaw tasks audit`.

### Ejemplo de Cron: Resumen diario de la mañana

```bash
openclaw cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Esto se ejecuta exactamente a las 7:00 AM, hora de Nueva York, usa Opus para la calidad y anuncia un resumen directamente a WhatsApp.

### Ejemplo de Cron: Recordatorio de un solo uso

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

Consulte [Trabajos Cron](/en/automation/cron-jobs) para obtener la referencia completa de la CLI.

## Diagrama de flujo de decisión

```
Does the task need to run at an EXACT time?
  YES -> Use cron
  NO  -> Continue...

Does the task need isolation from main session?
  YES -> Use cron (isolated)
  NO  -> Continue...

Can this task be batched with other periodic checks?
  YES -> Use heartbeat (add to HEARTBEAT.md)
  NO  -> Use cron

Is this a one-shot reminder?
  YES -> Use cron with --at
  NO  -> Continue...

Does it need a different model or thinking level?
  YES -> Use cron (isolated) with --model/--thinking
  NO  -> Use heartbeat
```

## Combinar ambos

La configuración más eficiente usa **ambos**:

1. **Heartbeat** maneja el monitoreo rutinario (bandeja de entrada, calendario, notificaciones) en un turno por lotes cada 30 minutos.
2. **Cron** maneja horarios precisos (informes diarios, revisiones semanales) y recordatorios de un solo uso.

### Ejemplo: Configuración de automatización eficiente

**HEARTBEAT.md** (verificado cada 30 min):

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Trabajos Cron** (sincronización precisa):

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster: Flujos de trabajo deterministas con aprobaciones

Lobster es el tiempo de ejecución del flujo de trabajo para **canalizaciones de herramientas de varios pasos** que necesitan ejecución determinista y aprobaciones explícitas.
Úselo cuando la tarea sea más que un solo turno de agente y desee un flujo de trabajo reanudable con puntos de control humanos.

### Cuándo es adecuado Lobster

- **Automatización de varios pasos**: Necesitas una canalización fija de llamadas a herramientas, no un mensaje único.
- **Puertas de aprobación**: Los efectos secundarios deben detenerse hasta que apruebe y luego reanudarse.
- **Ejecuciones reanudables**: Continúe un flujo de trabajo pausado sin volver a ejecutar los pasos anteriores.

### Cómo se combina con heartbeat y cron

- **Heartbeat/cron** decide _cuándo_ ocurre una ejecución.
- **Lobster** define _qué pasos_ ocurren una vez que comienza la ejecución.

Para flujos de trabajo programados, use cron o heartbeat para activar un turno de agente que llame a Lobster.
Para flujos de trabajo ad hoc, llame a Lobster directamente.

### Notas operativas (del código)

- Lobster se ejecuta como un **subproceso local** (CLI `lobster`) en modo herramienta y devuelve un **sobre JSON**.
- Si la herramienta devuelve `needs_approval`, reanudas con una marca `resumeToken` y la opción `approve`.
- La herramienta es un **complemento opcional**; habilítelo de manera aditiva a través de `tools.alsoAllow: ["lobster"]` (recomendado).
- Lobster espera que la CLI `lobster` esté disponible en `PATH`.

Consulte [Lobster](/en/tools/lobster) para ver el uso completo y los ejemplos.

## Sesión principal vs Sesión aislada

Tanto el heartbeat como el cron pueden interactuar con la sesión principal, pero de manera diferente:

|                                | Heartbeat                         | Cron (principal)                   | Cron (aislado)                                                  |
| ------------------------------ | --------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Sesión                         | Principal                         | Principal (vía evento del sistema) | `cron:<jobId>` o sesión personalizada                           |
| Historial                      | Compartido                        | Compartido                         | Nuevo en cada ejecución (aislado) / Persistente (personalizado) |
| Contexto                       | Completo                          | Completo                           | Ninguno (aislado) / Acumulativo (personalizado)                 |
| Modelo                         | Modelo de sesión principal        | Modelo de sesión principal         | Puede anular                                                    |
| Salida                         | Entregado si no es `HEARTBEAT_OK` | Prompt de heartbeat + evento       | Anunciar resumen (predeterminado)                               |
| [Tareas](/en/automation/tasks) | Sin registro de tarea             | Registro de tarea (silencioso)     | Registro de tarea (visible en `openclaw tasks`)                 |

### Cuándo usar cron de sesión principal

Use `--session main` con `--system-event` cuando quiera:

- Que el recordatorio/evento aparezca en el contexto de la sesión principal
- Que el agente lo maneje durante el próximo heartbeat con contexto completo
- Sin ejecución aislada separada

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### Cuándo usar cron aislado

Use `--session isolated` cuando quiera:

- Un lienzo limpio sin contexto previo
- Diferente modelo o configuraciones de pensamiento
- Anunciar resúmenes directamente a un canal
- Historial que no sature la sesión principal

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --announce
```

## Consideraciones de costo

| Mecanismo        | Perfil de costo                                                          |
| ---------------- | ------------------------------------------------------------------------ |
| Heartbeat        | Un turno cada N minutos; escala con el tamaño de HEARTBEAT.md            |
| Cron (principal) | Añade evento al siguiente heartbeat (sin turno aislado)                  |
| Cron (aislado)   | Turno completo de agente por trabajo; puede usar un modelo más económico |

**Consejos**:

- Mantenga `HEARTBEAT.md` pequeño para minimizar la sobrecarga de tokens.
- Agrupe comprobaciones similares en el heartbeat en lugar de usar múltiples trabajos cron.
- Use `target: "none"` en el heartbeat si solo quiere procesamiento interno.
- Use cron aislado con un modelo más económico para tareas rutinarias.

## Relacionado

- [Resumen de automatización](/en/automation) — todos los mecanismos de automatización a simple vista
- [Heartbeat](/en/gateway/heartbeat) — configuración completa de heartbeat
- [Trabajos cron](/en/automation/cron-jobs) — referencia completa de CLI y API de cron
- [Tareas en segundo plano](/en/automation/tasks) — libro mayor de tareas, auditoría y ciclo de vida
- [Sistema](/en/cli/system) — eventos del sistema + controles de heartbeat

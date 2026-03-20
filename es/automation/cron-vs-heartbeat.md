---
summary: "Guía para elegir entre latidos (heartbeat) y trabajos cron para la automatización"
read_when:
  - Decidir cómo programar tareas recurrentes
  - Configurar el monitoreo en segundo plano o las notificaciones
  - Optimizar el uso de tokens para comprobaciones periódicas
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat: Cuándo usar cada uno

Tanto los latidos (heartbeats) como los trabajos cron te permiten ejecutar tareas en un horario. Esta guía te ayuda a elegir el mecanismo adecuado para tu caso de uso.

## Guía rápida de decisión

| Caso de uso                                         | Recomendado              | Por qué                                                         |
| --------------------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| Revisar bandeja de entrada cada 30 min              | Heartbeat                | Se agrupa con otras comprobaciones, con conciencia del contexto |
| Enviar informe diario a las 9 en punto              | Cron (aislado)           | Se necesita un momento exacto                                   |
| Monitorear el calendario para próximos eventos      | Heartbeat                | Encaja naturalmente para la conciencia periódica                |
| Ejecutar análisis profundo semanal                  | Cron (aislado)           | Tarea independiente, puede usar un modelo diferente             |
| Recordármelo en 20 minutos                          | Cron (principal, `--at`) | Un solo disparo con cronometraje preciso                        |
| Comprobación de salud del proyecto en segundo plano | Heartbeat                | Aprovecha el ciclo existente                                    |

## Heartbeat: Conciencia periódica

Los latidos (heartbeats) se ejecutan en la **sesión principal** a intervalos regulares (predeterminado: 30 min). Están diseñados para que el agente verifique las cosas y destaque cualquier cosa importante.

### Cuándo usar heartbeat

- **Múltiples comprobaciones periódicas**: En lugar de 5 trabajos cron separados revisando bandeja de entrada, calendario, clima, notificaciones y estado del proyecto, un solo latido puede procesar todo esto por lotes.
- **Decisiones con conciencia del contexto**: El agente tiene el contexto completo de la sesión principal, por lo que puede tomar decisiones inteligentes sobre qué es urgente y qué puede esperar.
- **Continuidad conversacional**: Las ejecuciones de latido comparten la misma sesión, por lo que el agente recuerda las conversaciones recientes y puede dar seguimiento de manera natural.
- **Monitoreo de baja sobrecarga**: Un latido reemplaza muchas pequeñas tareas de sondeo.

### Ventajas de Heartbeat

- **Agrupa múltiples comprobaciones**: Un turno del agente puede revisar la bandeja de entrada, el calendario y las notificaciones juntas.
- **Reduce las llamadas a la API**: Un solo latido es más barato que 5 trabajos cron aislados.
- **Consciente del contexto**: El agente sabe en qué has estado trabajando y puede priorizar en consecuencia.
- **Supresión inteligente**: Si no hay nada que requiera atención, el agente responde `HEARTBEAT_OK` y no se entrega ningún mensaje.
- **Cronometraje natural**: Deriva ligeramente según la carga de la cola, lo cual está bien para la mayoría del monitoreo.

### Ejemplo de Heartbeat: lista de verificación HEARTBEAT.md

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

El agente lee esto en cada latido y maneja todos los elementos en una sola vuelta.

### Configurar el latido

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

Consulte [Heartbeat](/es/gateway/heartbeat) para obtener la configuración completa.

## Cron: Programación precisa

Los trabajos de cron se ejecutan en momentos precisos y pueden ejecutarse en sesiones aisladas sin afectar el contexto principal.
Las programaciones recurrentes en la hora se extienden automáticamente mediante un desfase
determinista por trabajo en una ventana de 0 a 5 minutos.

### Cuándo usar cron

- **Sincronización exacta requerida**: "Enviar esto a las 9:00 AM todos los lunes" (no "alrededor de las 9").
- **Tareas independientes**: Tareas que no necesitan contexto conversacional.
- **Modelo/pensamiento diferente**: Análisis pesado que justifica un modelo más potente.
- **Recordatorios de un solo uso**: "Recuérdame en 20 minutos" con `--at`.
- **Tareas ruidosas/frecuentes**: Tareas que ensuciarían el historial de la sesión principal.
- **Disparadores externos**: Tareas que deben ejecutarse independientemente de si el agente está activo por otros motivos.

### Ventajas de Cron

- **Sincronización precisa**: Expresiones cron de 5 campos o 6 campos (segundos) con soporte de zona horaria.
- **Distribución de carga integrada**: las programaciones recurrentes en la hora se escalonan hasta 5 minutos de manera predeterminada.
- **Control por trabajo**: anular el escalonamiento con `--stagger <duration>` o forzar la sincronización exacta con `--exact`.
- **Aislamiento de sesión**: Se ejecuta en `cron:<jobId>` sin contaminar el historial principal.
- **Anulaciones de modelo**: Use un modelo más barato o más potente por trabajo.
- **Control de entrega**: Los trabajos aislados tienen `announce` (resumen) de manera predeterminada; elija `none` según sea necesario.
- **Entrega inmediata**: El modo de anuncio publica directamente sin esperar el latido.
- **No se necesita contexto de agente**: Se ejecuta incluso si la sesión principal está inactiva o compactada.
- **Soporte de un solo uso**: `--at` para marcas de tiempo futuras precisas.

### Ejemplo de Cron: Informe matutino diario

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

Esto se ejecuta exactamente a las 7:00 AM hora de Nueva York, usa Opus para la calidad y anuncia un resumen directamente a WhatsApp.

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

Consulte [Cron jobs](/es/automation/cron-jobs) para obtener la referencia completa de la CLI.

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

Lobster es el tiempo de ejecución del flujo de trabajo para **tuberías de herramientas de varios pasos** que necesitan ejecución determinista y aprobaciones explícitas.
Úselo cuando la tarea sea más que un solo turno de agente y desee un flujo de trabajo reanudable con puntos de control humanos.

### Cuándo encaja Lobster

- **Automatización de varios pasos**: Necesitas una tubería fija de llamadas a herramientas, no un aviso puntual.
- **Puertas de aprobación**: Los efectos secundarios deben pausarse hasta que apruebe, luego reanudar.
- **Ejecuciones reanudables**: Continuar un flujo de trabajo pausado sin volver a ejecutar los pasos anteriores.

### Cómo se empareja con heartbeat y cron

- **Heartbeat/cron** deciden _cuándo_ ocurre una ejecución.
- **Lobster** define _qué pasos_ ocurren una vez que se inicia la ejecución.

Para flujos de trabajo programados, use cron o heartbeat para activar un turno de agente que llame a Lobster.
Para flujos de trabajo ad hoc, llame a Lobster directamente.

### Notas operativas (del código)

- Lobster se ejecuta como un **subproceso local** (CLI `lobster`) en modo de herramienta y devuelve un **sobre JSON**.
- Si la herramienta devuelve `needs_approval`, reanudas con una `resumeToken` y el indicador `approve`.
- La herramienta es un **complemento opcional**; actívelo de manera aditiva a través de `tools.alsoAllow: ["lobster"]` (recomendado).
- Lobster espera que la CLI `lobster` esté disponible en `PATH`.

Consulte [Lobster](/es/tools/lobster) para ver el uso completo y los ejemplos.

## Sesión principal vs. Sesión aislada

Tanto el heartbeat como el cron pueden interactuar con la sesión principal, pero de manera diferente:

|           | Heartbeat                      | Cron (principal)                   | Cron (aislado)                                                  |
| --------- | ------------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| Sesión    | Principal                      | Principal (vía evento del sistema) | `cron:<jobId>` o sesión personalizada                           |
| Historial | Compartido                     | Compartido                         | Nuevo en cada ejecución (aislado) / Persistente (personalizado) |
| Contexto  | Completo                       | Completo                           | Ninguno (aislado) / Acumulativo (personalizado)                 |
| Modelo    | Modelo de sesión principal     | Modelo de sesión principal         | Se puede anular                                                 |
| Salida    | Entregado si no `HEARTBEAT_OK` | Aviso de heartbeat + evento        | Anunciar resumen (predeterminado)                               |

### Cuándo usar el cron de sesión principal

Use `--session main` con `--system-event` cuando desee:

- Que el recordatorio/evento aparezca en el contexto de la sesión principal
- Que el agente lo maneje durante el próximo latido con el contexto completo
- Sin ejecución aislada separada

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### Cuándo usar el cron aislado

Use `--session isolated` cuando desee:

- Una página en blanco sin contexto previo
- Un modelo diferente o configuraciones de pensamiento
- Anunciar resúmenes directamente a un canal
- Un historial que no sature la sesión principal

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

## Consideraciones de coste

| Mecanismo        | Perfil de coste                                                       |
| ---------------- | --------------------------------------------------------------------- |
| Latido           | Un turno cada N minutos; escala con el tamaño de HEARTBEAT.md         |
| Cron (principal) | Añade un evento al próximo latido (sin turno aislado)                 |
| Cron (aislado)   | Turno completo de agente por trabajo; puede usar un modelo más barato |

**Consejos**:

- Mantenga `HEARTBEAT.md` pequeño para minimizar la sobrecarga de tokens.
- Agrupe comprobaciones similares en el latido en lugar de varios trabajos cron.
- Use `target: "none"` en el latido si solo desea procesamiento interno.
- Use el cron aislado con un modelo más barato para tareas rutinarias.

## Relacionado

- [Latido](/es/gateway/heartbeat) - configuración completa del latido
- [Trabajos Cron](/es/automation/cron-jobs) - referencia completa de la CLI y API de cron
- [Sistema](/es/cli/system) - eventos del sistema + controles de latido

import es from "/components/footer/es.mdx";

<es />

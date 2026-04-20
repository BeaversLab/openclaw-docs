---
summary: "Resumen de los mecanismos de automatización: tareas, cron, hooks, órdenes permanentes y flujo de tareas"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, hooks, and standing orders
  - Looking for the right automation entry point
title: "Automatización y Tareas"
---

# Automatización y Tareas

OpenClaw ejecuta el trabajo en segundo plano a través de tareas, trabajos programados, hooks de eventos e instrucciones permanentes. Esta página te ayuda a elegir el mecanismo adecuado y a entender cómo encajan juntos.

## Guía rápida de decisión

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
```

| Caso de uso                                               | Recomendado               | Por qué                                                          |
| --------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| Enviar informe diario a las 9:00 en punto                 | Tareas programadas (Cron) | Sincronización exacta, ejecución aislada                         |
| Recordármelo en 20 minutos                                | Tareas programadas (Cron) | Un solo disparo con sincronización precisa (`--at`)              |
| Ejecutar análisis profundo semanal                        | Tareas programadas (Cron) | Tarea independiente, puede usar un modelo diferente              |
| Revisar bandeja de entrada cada 30 min                    | Latido (Heartbeat)        | Agrupado con otras comprobaciones, con conocimiento del contexto |
| Monitorear el calendario para eventos próximos            | Latido (Heartbeat)        | Adecuado para la conciencia periódica                            |
| Inspeccionar el estado de un subagente o ejecución de ACP | Tareas en segundo plano   | El registro de tareas rastrea todo el trabajo desvinculado       |
| Auditar qué se ejecutó y cuándo                           | Tareas en segundo plano   | `openclaw tasks list` y `openclaw tasks audit`                   |
| Investigación de varios pasos y luego resumir             | Flujo de tareas           | Orquestación duradera con seguimiento de revisiones              |
| Ejecutar un script al restablecer la sesión               | Ganchos (Hooks)           | Impulsado por eventos, se activa en eventos del ciclo de vida    |
| Ejecutar código en cada llamada de herramienta            | Ganchos (Hooks)           | Los ganchos pueden filtrar por tipo de evento                    |
| Verificar siempre el cumplimiento antes de responder      | Órdenes permanentes       | Inyectado automáticamente en cada sesión                         |

### Tareas programadas (Cron) vs. Latido (Heartbeat)

| Dimensión           | Tareas programadas (Cron)                          | Latido (Heartbeat)                                           |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Sincronización      | Exacta (expresiones cron, un solo disparo)         | Aproximada (por defecto cada 30 min)                         |
| Contexto de sesión  | Nuevo (aislado) o compartido                       | Contexto completo de la sesión principal                     |
| Registros de tareas | Siempre creados                                    | Nunca creados                                                |
| Entrega             | Canal, webhook o silencioso                        | En línea en la sesión principal                              |
| Lo mejor para       | Informes, recordatorios, trabajos en segundo plano | Revisiones de bandeja de entrada, calendario, notificaciones |

Utilice Tareas programadas (Cron) cuando necesite una sincronización precisa o una ejecución aislada. Utilice Latido (Heartbeat) cuando el trabajo se beneficie del contexto completo de la sesión y la sincronización aproximada sea aceptable.

## Conceptos clave

### Tareas programadas (cron)

Cron es el planificador integrado de Gateway para una temporización precisa. Persiste los trabajos, despierta al agente en el momento adecuado y puede entregar la salida a un canal de chat o un punto final de webhook. Admite recordatorios de un solo uso, expresiones recurrentes y activadores de webhooks entrantes.

Consulte [Tareas programadas](/es/automation/cron-jobs).

### Tareas

El libro mayor de tareas en segundo plano rastrea todo el trabajo desacoplado: ejecuciones de ACP, generaciones de subagentes, ejecuciones de cron aisladas y operaciones de CLI. Las tareas son registros, no planificadores. Use `openclaw tasks list` y `openclaw tasks audit` para inspeccionarlas.

Consulte [Tareas en segundo plano](/es/automation/tasks).

### Flujo de tareas

El flujo de tareas es el sustrato de orquestación de flujos por encima de las tareas en segundo plano. Gestiona flujos multipaso duraderos con modos de sincronización administrados y reflejados, seguimiento de revisiones e `openclaw tasks flow list|show|cancel` para su inspección.

Consulte [Flujo de tareas](/es/automation/taskflow).

### Órdenes permanentes

Las órdenes permanentes otorgan al agente autoridad operativa permanente para programas definidos. Residen en archivos del espacio de trabajo (típicamente `AGENTS.md`) y se inyectan en cada sesión. Combine con cron para hacer cumplir el tiempo.

Consulte [Órdenes permanentes](/es/automation/standing-orders).

### Ganchos

Los ganchos son scripts controlados por eventos activados por eventos del ciclo de vida del agente (`/new`, `/reset`, `/stop`), compactación de sesión, inicio de gateway, flujo de mensajes y llamadas a herramientas. Los ganchos se descubren automáticamente desde los directorios y se pueden gestionar con `openclaw hooks`.

Consulte [Ganchos](/es/automation/hooks).

### Latido

Latido es un turno de sesión principal periódico (por defecto cada 30 minutos). Agrupa múltiples comprobaciones (bandeja de entrada, calendario, notificaciones) en un solo turno de agente con el contexto completo de la sesión. Los turnos de latido no crean registros de tareas. Use `HEARTBEAT.md` para una pequeña lista de verificación, o un bloque `tasks:` cuando desee comprobaciones periódicas solo vencidas dentro del propio latido. Los archivos de latido vacíos se omiten como `empty-heartbeat-file`; el modo de tarea solo vencida se omite como `no-tasks-due`.

Consulte [Latido](/es/gateway/heartbeat).

## Cómo funcionan juntos

- **Cron** gestiona horarios precisos (informes diarios, revisiones semanales) y recordatorios de un solo uso. Todas las ejecuciones de cron crean registros de tareas.
- **Heartbeat** gestiona el monitoreo de rutina (bandeja de entrada, calendario, notificaciones) en un turno por lotes cada 30 minutos.
- **Hooks** reaccionan a eventos específicos (llamadas a herramientas, restablecimientos de sesión, compactación) con scripts personalizados.
- **Standing orders** otorgan al agente contexto persistente y límites de autoridad.
- **Task Flow** coordina flujos de varios pasos por encima de las tareas individuales.
- **Tasks** rastrean automáticamente todo el trabajo separado para que puedas inspeccionarlo y auditarlo.

## Relacionado

- [Tareas programadas](/es/automation/cron-jobs) — programación precisa y recordatorios de un solo uso
- [Tareas en segundo plano](/es/automation/tasks) — libro mayor de tareas para todo el trabajo separado
- [Flujo de tareas](/es/automation/taskflow) — orquestación de flujo duradero de varios pasos
- [Hooks](/es/automation/hooks) — scripts de ciclo de vida impulsados por eventos
- [Standing Orders](/es/automation/standing-orders) — instrucciones persistentes del agente
- [Heartbeat](/es/gateway/heartbeat) — turnos periódicos de sesión principal
- [Referencia de configuración](/es/gateway/configuration-reference) — todas las claves de configuración

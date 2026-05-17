---
doc-schema-version: 1
summary: "Resumen de los mecanismos de automatización: tareas, cron, hooks, órdenes permanentes y Flujo de tareas"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, commitments, hooks, and standing orders
  - Looking for the right automation entry point
title: "Automatización"
---

OpenClaw ejecuta el trabajo en segundo plano a través de tareas, trabajos programados, compromisos
derivados, hooks de eventos e instrucciones permanentes. Esta página le ayuda a elegir
el mecanismo adecuado y a entender cómo se integran.

## Guía rápida de decisión

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}
    START --> Q6{Remember a natural follow-up?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
    Q6 -->|Yes| COMMITMENTS[Inferred Commitments]
```

| Caso de uso                                                   | Recomendado                           | Por qué                                                         |
| ------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| Enviar informe diario a las 9 en punto                        | Tareas programadas (Cron)             | Sincronización exacta, ejecución aislada                        |
| Recordármelo en 20 minutos                                    | Tareas programadas (Cron)             | Única ejecución con sincronización precisa (`--at`)             |
| Ejecutar análisis profundo semanal                            | Tareas programadas (Cron)             | Tarea independiente, puede usar un modelo diferente             |
| Revisar bandeja de entrada cada 30 min                        | Latido (Heartbeat)                    | Agrupado con otras comprobaciones, con contexto                 |
| Supervisar calendario para próximos eventos                   | Latido (Heartbeat)                    | Adecuado para la concienciación periódica                       |
| Seguimiento después de una entrevista mencionada              | Compromisos derivados                 | Seguimiento tipo memoria, sin solicitud exacta de recordatorio  |
| Seguimiento de cuidado suave después del contexto del usuario | Compromisos derivados                 | Limitado al mismo agente y canal                                |
| Inspeccionar estado de un subagente o ejecución ACP           | Tareas en segundo plano               | El libro de tareas rastrea todo el trabajo desvinculado         |
| Auditar qué se ejecutó y cuándo                               | Tareas en segundo plano               | `openclaw tasks list` y `openclaw tasks audit`                  |
| Investigación de varios pasos y luego resumir                 | Flujo de tareas (Task Flow)           | Orquestación duradera con seguimiento de revisiones             |
| Ejecutar un script al restablecer la sesión                   | Hooks                                 | Impulsado por eventos, se activa en eventos del ciclo de vida   |
| Ejecutar código en cada llamada a herramienta                 | Hooks de complementos                 | Los hooks en proceso pueden interceptar llamadas a herramientas |
| Verificar siempre el cumplimiento antes de responder          | Órdenes permanentes (Standing Orders) | Inyectado en cada sesión automáticamente                        |

### Tareas programadas (Cron) vs Latido (Heartbeat)

| Dimensión           | Tareas programadas (Cron)                          | Latido (Heartbeat)                                           |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Sincronización      | Exacta (expresiones cron, única ejecución)         | Aproximada (por defecto cada 30 min)                         |
| Contexto de sesión  | Nuevo (aislado) o compartido                       | Contexto completo de la sesión principal                     |
| Registros de tareas | Siempre creados                                    | Nunca creados                                                |
| Entrega             | Canal, webhook o silencioso                        | En línea en la sesión principal                              |
| Mejor para          | Informes, recordatorios, trabajos en segundo plano | Revisiones de bandeja de entrada, calendario, notificaciones |

Use Tareas programadas (Cron) cuando necesite una sincronización precisa o una ejecución aislada. Use Heartbeat cuando el trabajo se beneficie del contexto completo de la sesión y una sincronización aproximada sea aceptable.

## Conceptos clave

### Tareas programadas (cron)

Cron es el programador integrado de Gateway para una sincronización precisa. Persiste los trabajos, despierta al agente en el momento adecuado y puede entregar el resultado a un canal de chat o a un endpoint de webhook. Admite recordatorios de un solo uso, expresiones recurrentes y activadores de webhook entrantes.

Consulte [Tareas programadas](/es/automation/cron-jobs).

### Tareas

El libro mayor de tareas en segundo plano rastrea todo el trabajo separado: ejecuciones de ACP, generaciones de subagentes, ejecuciones aisladas de cron y operaciones de CLI. Las tareas son registros, no programadores. Use `openclaw tasks list` y `openclaw tasks audit` para inspeccionarlas.

Consulte [Tareas en segundo plano](/es/automation/tasks).

### Compromisos inferidos

Los compromisos son memorias de seguimiento opcionales y de corta duración. OpenClaw los infiere
desde conversaciones normales, los limita al mismo agente y canal, y
entrega los controles de vencimiento a través de heartbeat. Los recordatorios exactos solicitados por el usuario aún
pertenecen a cron.

Consulte [Compromisos inferidos](/es/concepts/commitments).

### Flujo de tareas

Task Flow es el sustrato de orquestación de flujos por encima de las tareas en segundo plano. Gestiona flujos multipaso duraderos con modos de sincronización gestionados y reflejados, seguimiento de revisiones y `openclaw tasks flow list|show|cancel` para inspección.

Consulte [Flujo de tareas](/es/automation/taskflow).

### Órdenes permanentes

Las órdenes permanentes otorgan al agente autoridad operativa permanente para programas definidos. Residen en archivos del espacio de trabajo (típicamente `AGENTS.md`) y se inyectan en cada sesión. Combinar con cron para el cumplimiento basado en tiempo.

Consulte [Órdenes permanentes](/es/automation/standing-orders).

### Ganchos (Hooks)

Los ganchos internos son scripts controlados por eventos activados por eventos del ciclo de vida del agente
(`/new`, `/reset`, `/stop`), compactación de sesiones, inicio de gateway y flujo de
mensajes. Se descubren automáticamente desde directorios y se pueden gestionar
con `openclaw hooks`. Para la intercepción de llamadas a herramientas en proceso, use
[Ganchos de complemento](/es/plugins/hooks).

Consulte [Ganchos](/es/automation/hooks).

### Heartbeat

Heartbeat es un turno de sesión principal periódico (por defecto cada 30 minutos). Agrupa múltiples comprobaciones (bandeja de entrada, calendario, notificaciones) en un solo turno del agente con el contexto completo de la sesión. Los turnos de Heartbeat no crean registros de tareas y no extienden la frescura del restablecimiento de la sesión diaria/inactiva. Use `HEARTBEAT.md` para una pequeña lista de verificación, o un bloque `tasks:` cuando desee comprobaciones periódicas solo vencidas dentro del propio heartbeat. Los archivos de heartbeat vacíos se omiten como `empty-heartbeat-file`; el modo de tarea solo vencida se omite como `no-tasks-due`. Los heartbeats se difieren mientras el trabajo cron está activo o en cola, y `heartbeat.skipWhenBusy` también puede diferirlos mientras los subagentes o carriles anidados están ocupados.

Consulte [Heartbeat](/es/gateway/heartbeat).

## Cómo funcionan juntos

- **Cron** maneja horarios precisos (informes diarios, revisiones semanales) y recordatorios de una sola vez. Todas las ejecuciones de cron crean registros de tareas.
- **Heartbeat** maneja la monitorización de rutina (bandeja de entrada, calendario, notificaciones) en un solo turno agrupado cada 30 minutos.
- **Hooks** reaccionan a eventos específicos (restablecimientos de sesión, compactación, flujo de mensajes) con scripts personalizados. Los hooks de complementos cubren llamadas a herramientas.
- **Standing orders** dan al agente contexto persistente y límites de autoridad.
- **Task Flow** coordina flujos de múltiples pasos por encima de las tareas individuales.
- **Tasks** rastrean automáticamente todo el trabajo desacoplado para que pueda inspeccionarlo y auditarlo.

## Relacionado

- [Scheduled Tasks](/es/automation/cron-jobs) — programación precisa y recordatorios de una sola vez
- [Inferred Commitments](/es/concepts/commitments) — seguimientos de tipo memoria
- [Background Tasks](/es/automation/tasks) — libro mayor de tareas para todo el trabajo desacoplado
- [Task Flow](/es/automation/taskflow) — orquestación de flujo de múltiples pasos duradero
- [Hooks](/es/automation/hooks) — scripts del ciclo de vida impulsados por eventos
- [Plugin hooks](/es/plugins/hooks) — hooks de herramientas, avisos, mensajes y ciclo de vida en proceso
- [Standing Orders](/es/automation/standing-orders) — instrucciones persistentes del agente
- [Heartbeat](/es/gateway/heartbeat) — turnos de sesión principal periódicos
- [Configuration Reference](/es/gateway/configuration-reference) — todas las claves de configuración

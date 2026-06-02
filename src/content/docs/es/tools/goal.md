---
doc-schema-version: 1
summary: "Objetivos de sesión: objetivos duraderos por sesión, controles /goal, herramientas de objetivo del modelo, presupuestos de tokens y estado de TUI"
read_when:
  - You want OpenClaw to keep one objective visible across a long session
  - You need to pause, resume, block, complete, or clear a session goal
  - You want to understand the get_goal, create_goal, and update_goal tools
  - You want to see how goals appear in the TUI
title: "Objetivo"
---

# Objetivo

Un **objetivo** es un objetivo duradero adjunto a la sesión actual de OpenClaw.
Proporciona al agente y al operador un objetivo compartido para el trabajo de larga duración,
sin convertir ese objetivo en una tarea en segundo plano, recordatorio, trabajo cron u
orden permanente.

Los objetivos son el estado de la sesión. Se mueven con la clave de sesión, sobreviven a los reinicios
del proceso, aparecen en `/goal`, están disponibles para el modelo a través de las herramientas
de objetivo y aparecen en el pie de página de la TUI cuando la sesión activa tiene uno.

## Inicio rápido

Establezca un objetivo:

```text
/goal start get CI green for PR 87469 and push the fix
```

Verifíquelo:

```text
/goal
```

Páuselo cuando el trabajo esté esperando intencionalmente:

```text
/goal pause waiting for CI
```

Reáudelo:

```text
/goal resume
```

Márquelo como completado:

```text
/goal complete pushed and verified
```

Bórrelo:

```text
/goal clear
```

## Para qué sirven los objetivos

Use un objetivo cuando una sesión tenga un resultado concreto que debe permanecer visible
a lo largo de muchos turnos:

- Un cierre de PR: corregir, verificar, autorevisar, enviar y abrir o actualizar la PR.
- Una ejecución de depuración: reproducir el error, identificar la superficie propietaria, parchear y probar
  la solución.
- Un pase de documentación: leer los documentos relevantes, escribir la nueva página, vincularla y
  verificar la compilación de los documentos.
- Una tarea de mantenimiento: inspeccionar el estado actual, realizar cambios limitados, ejecutar las comprobaciones
  correctas e informar qué cambió.

Un objetivo no es una cola de tareas. Use [Flujo de tareas](/es/automation/taskflow),
[tareas](/es/automation/tasks), [trabajos cron](/es/automation/cron-jobs) u
[órdenes permanentes](/es/automation/standing-orders) cuando el trabajo debe ejecutarse separado,
repetirse en un horario, dividirse en subtrabajos administrados o persistir como una política.

## Referencia de comandos

`/goal` sin argumentos imprime el resumen del objetivo actual:

```text
Goal
Status: active
Objective: get CI green for PR 87469 and push the fix
Tokens used: 12k
Token budget: 12k/50k

Commands: /goal pause, /goal complete, /goal clear
```

Comandos:

- `/goal` o `/goal status` muestra el objetivo actual.
- `/goal start <objective>` crea un nuevo objetivo para la sesión actual.
- `/goal set <objective>` y `/goal create <objective>` son alias de
  `start`.
- `/goal pause [note]` pausa un objetivo activo.
- `/goal resume [note]` reanuda un objetivo en pausa, bloqueado, limitado por uso o
  limitado por presupuesto.
- `/goal complete [note]` marca el objetivo como logrado.
- `/goal done [note]` es un alias de `complete`.
- `/goal block [note]` marca el objetivo como bloqueado.
- `/goal blocked [note]` es un alias de `block`.
- `/goal clear` elimina el objetivo de la sesión.

Solo puede existir un objetivo a la vez en una sesión. Iniciar un segundo objetivo falla
hasta que se borre el actual.

## Estados

Los objetivos utilizan un pequeño conjunto de estados:

- `active`: la sesión está persiguiendo el objetivo.
- `paused`: el operador pausó el objetivo; `/goal resume` lo hace activo de nuevo.
- `blocked`: el agente o el operador reportó un bloqueo real; `/goal resume`
  lo hace activo de nuevo cuando hay nueva información o estado disponible.
- `budget_limited`: se alcanzó el presupuesto de tokens configurado; `/goal resume`
  reinicia la persecución desde el mismo objetivo.
- `usage_limited`: reservado para estados de detención por límite de uso; `/goal resume`
  reinicia la persecución cuando se permite.
- `complete`: el objetivo se logró. Los objetivos completados son terminales; use
  `/goal clear` antes de comenzar otro objetivo.

`/new` y `/reset` borran el objetivo de la sesión actual porque intencionalmente
inician un contexto de sesión nuevo.

## Presupuestos de tokens

Los objetivos pueden tener un presupuesto de tokens positivo opcional. El presupuesto se guarda con el
objetivo y se mide a partir del recuento de tokens nuevos de la sesión en el momento de la creación. Si la
sesión actual solo tiene uso de tokens obsoleto o desconocido cuando comienza el objetivo,
OpenClaw espera a la siguiente instantánea de tokens nuevos de la sesión y la usa como
línea base, por lo que los tokens gastados antes de que existiera el objetivo no se cargan al objetivo.

Cuando el uso de tokens alcanza el presupuesto, el objetivo cambia a `budget_limited`. Esto
no borra el objetivo ni borra el objetivo. Le indica al operador y al
agente que el objetivo ya no se está persiguiendo activamente hasta que se reanude o
se borre.

Los presupuestos de tokens son una barrera de seguridad para el objetivo de la sesión, no un límite de facturación. La cuota del proveedor,
el informe de costos y el comportamiento de la ventana de contexto aún usan el uso normal de OpenClaw
y los controles del modelo.

## Herramientas del modelo

OpenClaw expone tres herramientas de objetivo principales a los arneses del agente:

- `get_goal`: lee el objetivo de la sesión actual, incluido el estado, el objetivo, el uso de tokens y el presupuesto de tokens.
- `create_goal`: crea un objetivo solo cuando el usuario, el sistema o las instrucciones del desarrollador lo soliciten explícitamente. Falla si la sesión ya tiene un objetivo.
- `update_goal`: marca el objetivo como `complete` o `blocked`.

El modelo no puede pausar, reanudar, borrar ni reemplazar silenciosamente un objetivo. Esos son controles del operador/de la sesión a través de `/goal` y comandos de reinicio. Esto evita que el agente mueva el objetivo silenciosamente mientras se conserva una ruta limpia para que el agente informe sobre un logro o un bloqueo genuino.

La herramienta `update_goal` debe marcar un objetivo como `complete` solo cuando el objetivo se haya logrado realmente. Debe marcar un objetivo como `blocked` solo cuando la misma condición de bloqueo se haya repetido y el agente no pueda realizar progresos significativos sin una nueva entrada del usuario o un cambio en el estado externo.

## TUI

La TUI mantiene visible el objetivo de la sesión activa en el pie de página, junto al agente, la sesión, el modelo, los controles de ejecución y los recuentos de tokens.

Ejemplos de pie de página:

- `Pursuing goal (12k/50k)` para un objetivo activo con un presupuesto de tokens.
- `Goal paused (/goal resume)` para un objetivo pausado.
- `Goal blocked (/goal resume)` para un objetivo bloqueado.
- `Goal hit usage limits (/goal resume)` para un objetivo limitado por uso.
- `Goal unmet (50k/50k)` para un objetivo limitado por presupuesto.
- `Goal achieved (42k)` para un objetivo completado.

El pie de página es intencionalmente compacto. Use `/goal` para ver el objetivo completo, la nota, el presupuesto de tokens y los comandos disponibles.

## Comportamiento del canal

El comando `/goal` funciona en sesiones de OpenClaw con capacidad de comandos, incluyendo la TUI y las superficies de chat que permiten comandos de texto. El estado del objetivo está adjunto a la clave de sesión, no al transporte. Si dos superficies usan la misma sesión, ven el mismo objetivo.

El estado del objetivo no es una directiva de entrega. No fuerza respuestas a través de un canal, cambia el comportamiento de la cola, aprueba herramientas ni programa trabajo.

## Solución de problemas

`Goal error: goal already exists` significa que la sesión ya tiene un objetivo. Use
`/goal` para inspeccionarlo, `/goal complete` si está terminado, o `/goal clear` antes
de comenzar un objetivo diferente.

`Goal error: goal not found` significa que la sesión aún no tiene un objetivo. Inicie uno con
`/goal start <objective>`.

`Goal error: goal is already complete` significa que el objetivo es terminal. Límpielo
antes de comenzar o reanudar otro objetivo.

Si el uso de tokens parece `0` o obsoleto, es posible que la sesión activa aún no tenga una
instantánea de tokens reciente. El uso se actualiza a medida que OpenClaw registra el uso de la sesión y
los totales derivados de la transcripción.

## Relacionado

- [Comandos de barra](/es/tools/slash-commands)
- [TUI](/es/web/tui)
- [Herramienta de sesión](/es/concepts/session-tool)
- [Compactación](/es/concepts/compaction)
- [Flujo de tareas](/es/automation/taskflow)
- [Órdenes permanentes](/es/automation/standing-orders)

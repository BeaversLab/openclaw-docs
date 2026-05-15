---
summary: "Ejecutar agentes especialistas en paralelo sin saturar la capacidad compartida del modelo y las herramientas"
title: "Carriles especializados paralelos"
sidebarTitle: "Carriles especializados"
read_when:
  - You route group chats to dedicated agents
  - You want parallel work without one long task blocking every chat
  - You are designing a multi-agent operations setup
status: active
---

Los carriles especializados paralelos permiten que una Gateway enrute diferentes chats o salas a diferentes agentes, manteniendo al mismo tiempo una experiencia de usuario rápida. El truco consiste en tratar el paralelismo como un problema de diseño de recursos escasos, no simplemente como "más agentes".

## Primeros principios

Un carril especializado solo mejora el rendimiento cuando reduce la contención por los verdaderos cuellos de botella:

- **Bloqueos de sesión**: solo una ejecución debe mutar una sesión dada a la vez.
- **Capacidad global del modelo**: todas las ejecuciones de chat visibles todavía comparten los límites del proveedor.
- **Capacidad de herramientas**: el trabajo de shell, navegador, red y repositorio puede ser más lento que el turno del modelo en sí.
- **Presupuesto de contexto**: las transcripciones largas hacen que cada turno futuro sea más lento y menos enfocado.
- **Ambigüedad de propiedad**: los agentes duplicados que realizan el mismo trabajo desperdician capacidad.

OpenClaw ya serializa las ejecuciones por sesión y limita el paralelismo global a través de la [cola de comandos](/es/concepts/queue). Los carriles especializados añaden una política por encima: qué agente es propietario de qué trabajo, qué permanece en el chat y qué se convierte en trabajo en segundo plano.

## Implementación recomendada

### Fase 1: contratos de carril + trabajo pesado en segundo plano

Asigne a cada carril un contrato escrito en su espacio de trabajo y en su mensaje del sistema:

- **Propósito**: el trabajo del que es propietario este carril.
- **No objetivos**: el trabajo que debe delegar en lugar de intentar realizar.
- **Presupuesto de chat**: las respuestas rápidas permanecen en el chat; las tareas largas deben reconocerse brevemente y luego ejecutarse en un subagente o tarea en segundo plano.
- **Regla de delegación**: cuando otro carril es propietario del trabajo, indique a dónde debe ir y proporcione un resumen de delegación compacto.
- **Regla de riesgo de herramientas**: prefiera la superficie de herramienta más pequeña que pueda realizar el trabajo.

Esta es la fase más económica y soluciona la mayor parte de la saturación: un trabajo de codificación ya no convierte al carril de investigación en un proceso lento, y cada chat mantiene su propio contexto limpio.

### Fase 2: controles de prioridad y concurrencia

Ajuste la capacidad de la cola y del modelo en función del valor empresarial de cada carril:

```json5
{
  agents: {
    defaults: {
      maxConcurrent: 4,
      subagents: { maxConcurrent: 8, delegationMode: "prefer" },
    },
  },
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
    },
  },
}
```

Use chats directos/personales y agentes de operaciones de producción para trabajos de alta prioridad. Deje que la investigación, la redacción y la codificación por lotes pasen a tareas en segundo plano cuando el sistema esté ocupado.

### Fase 3: coordinador / controlador de tráfico

Agregue un pequeño patrón de coordinador una vez que varios carriles estén activos:

- Rastree las tareas y propietarios de carriles activos.
- Detecte solicitudes duplicadas entre grupos.
- Enríe resúmenes de entrega entre carriles.
- Muestre solo los bloqueadores, los resultados completados y las decisiones que el humano debe tomar.

No comience aquí. Un coordinador sin contratos de carril simplemente coordina el caos.

## Plantilla mínima de contrato de carril

```md
# Lane contract

## Owns

- <job this lane is responsible for>

## Does not own

- <work to hand off>

## Chat budget

- Answer quick questions directly.
- For multi-step, slow, or tool-heavy work: acknowledge briefly, spawn/background
  the work, then return the result when complete.

## Handoff

If another lane owns the request, reply with:

- target lane
- objective
- relevant context
- exact next action

## Tool posture

Use the smallest tool surface that can complete the task. Avoid broad shell or
network work unless this lane explicitly owns it.
```

## Relacionado

- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Cola de comandos](/es/concepts/queue)
- [Subagentes](/es/tools/subagents)

---
summary: "Dirigir una ejecución activa sin cambiar el modo de cola"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "Dirigir"
sidebarTitle: "Dirigir"
---

`/steer` primero intenta enviar instrucciones a una ejecución ya activa. Es para
momentos de "ajustar esta ejecución mientras todavía está trabajando". Si el tiempo de
ejecución actual no puede aceptar la dirección, OpenClaw envía el mensaje como un
prompt normal en lugar de descartarlo.

## Sesión actual

Use `/steer` de nivel superior para dirigirse a la ejecución activa de la sesión actual:

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

Comportamiento:

- Apunta solo a la ejecución activa de la sesión actual.
- Funciona independientemente del modo `/queue` de la sesión.
- Inicia un turno normal con el mismo mensaje cuando la sesión está inactiva o la
  ejecución activa no puede aceptar la dirección.
- Utiliza la ruta de dirección del tiempo de ejecución activo, de modo que el modelo
  vea las instrucciones en el siguiente límite de tiempo de ejecución compatible.

## Steer vs queue

`/queue steer` hace que los mensajes entrantes normales intenten dirigir la ejecución
activa cuando llegan mientras una ejecución está activa. `/steer <message>` es un comando
explícito que intenta inyectar el mensaje de ese comando en la ejecución activa en el
siguiente límite de tiempo de ejecución compatible, independientemente de la configuración
`/queue` almacenada. Cuando esa inyección no está disponible, el prefijo del
comando se elimina y `<message>` continúa como un prompt normal.

Uso:

- `/steer <message>` cuando quieras guiar la ejecución activa ahora mismo.
- `/queue steer` cuando quieras que los mensajes normales futuros dirijan las ejecuciones
  activas de forma predeterminada.
- `/queue collect` o `/queue followup` cuando los mensajes normales futuros deban esperar
  un turno posterior en lugar de dirigir la ejecución activa.
- `/queue interrupt` cuando el mensaje más reciente debe reemplazar la ejecución activa
  en lugar de dirigirla.

Para ver los modos de cola y los límites de dirección, consulte [Command queue](/es/concepts/queue) y
[Steering queue](/es/concepts/queue-steering).

## Subagentes

Use `/subagents steer` cuando el objetivo es una ejecución secundaria:

```text
/subagents steer 2 focus only on the API surface
```

`/steer` de nivel superior no selecciona un subagente por id o índice de lista.
Siempre apunta a la ejecución activa de la sesión actual. Consulte [Sub-agents](/es/tools/subagents)
para obtener ids, etiquetas y comandos de control de subagentes.

## Sesiones de ACP

Use `/acp steer` cuando el objetivo es una sesión de arnés ACP:

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

Consulte [ACP agents](/es/tools/acp-agents) para obtener información sobre la selección de sesiones de ACP
y el comportamiento del tiempo de ejecución.

## Relacionado

- [Slash commands](/es/tools/slash-commands)
- [Command queue](/es/concepts/queue)
- [Steering queue](/es/concepts/queue-steering)
- [Sub-agentes](/es/tools/subagents)

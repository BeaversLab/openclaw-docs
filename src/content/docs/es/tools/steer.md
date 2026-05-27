---
summary: "Dirigir una ejecución activa sin cambiar el modo de cola"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue modes
  - Deciding whether to steer the current run or an ACP session
title: "Dirigir"
sidebarTitle: "Dirigir"
---

`/steer` primero intenta enviar orientación a una ejecución ya activa. Es para
momentos de "ajustar esta ejecución mientras aún está trabajando". Si el tiempo de ejecución
actual no acepta la dirección, OpenClaw envía el mensaje como un prompt normal
en lugar de descartarlo.

## Sesión actual

Use `/steer` de nivel superior para apuntar a la ejecución activa para la sesión actual:

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

`/queue steer` hace que los mensajes entrantes normales intenten dirigir la ejecución activa cuando llegan mientras una ejecución está activa. `/steer <message>` es un comando explícito que intenta inyectar el mensaje de ese comando en la ejecución activa en el siguiente límite de tiempo de ejecución admitido, independientemente de la configuración almacenada `/queue`. Cuando esa inyección no está disponible, se elimina el prefijo del comando y `<message>` continúa como un mensaje normal.

Uso:

- `/steer <message>` cuando quieras guiar la ejecución activa ahora mismo.
- `/queue steer` cuando quieras que los mensajes normales futuros dirijan las ejecuciones activas de forma predeterminada.
- `/queue collect` o `/queue followup` cuando los mensajes normales futuros deban esperar a un turno posterior en lugar de dirigir la ejecución activa.
- `/queue interrupt` cuando el mensaje más reciente debe reemplazar la ejecución activa en lugar de dirigirla.

Para los modos de cola y los límites de dirección, consulte [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).

## Subagentes

El `/steer` de nivel superior apunta a la ejecución activa de la sesión actual. Los subagentes informan a su sesión principal/solicitante; `/subagents` es solo para visibilidad.

## Sesiones de ACP

Use `/acp steer` cuando el objetivo sea una sesión de arnés de ACP:

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

Consulte [Agentes ACP](/es/tools/acp-agents) para obtener información sobre la selección de sesiones de ACP y el comportamiento del tiempo de ejecución.

## Relacionado

- [Comandos de barra](/es/tools/slash-commands)
- [Cola de comandos](/es/concepts/queue)
- [Cola de dirección](/es/concepts/queue-steering)
- [Subagentes](/es/tools/subagents)

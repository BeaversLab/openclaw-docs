---
summary: "Dirigir una ejecución activa sin cambiar el modo de cola"
read_when:
  - Using /steer or /tell while an agent is already running
  - Comparing /steer with /queue steer
  - Deciding whether to steer the current run, a sub-agent, or an ACP session
title: "Dirigir"
sidebarTitle: "Dirigir"
---

`/steer` envía orientación a una ejecución ya activa. Es para esos momentos de "ajustar esta
ejecución mientras aún está trabajando", no para iniciar un nuevo turno.

## Sesión actual

Use `/steer` de nivel superior para dirigirse a la ejecución activa de la sesión actual:

```text
/steer prefer the smaller patch and keep the tests focused
/tell summarize before making the next tool call
```

Comportamiento:

- Apunta solo a la ejecución activa de la sesión actual.
- Funciona independientemente del modo `/queue` de la sesión.
- No inicia una nueva ejecución cuando la sesión está inactiva.
- Responde con una advertencia cuando no hay una ejecución activa a la que dirigir.
- Utiliza la ruta de dirección (steering path) del tiempo de ejecución activo, por lo que el modelo ve la orientación en
  el siguiente límite de tiempo de ejecución compatible.

## Dirigir vs. cola

`/queue steer` cambia el comportamiento de los mensajes entrantes normales cuando llegan
mientras una ejecución está activa. `/steer <message>` es un comando explícito que intenta
inyectar el mensaje de ese comando en la ejecución activa en el siguiente límite de tiempo de ejecución
compatible, independientemente de la configuración `/queue` almacenada.

Uso:

- `/steer <message>` cuando desee guiar la ejecución activa ahora mismo.
- `/queue steer` cuando desee que los mensajes normales futuros dirijan las ejecuciones activas
  de forma predeterminada.
- `/queue collect` o `/queue followup` cuando los nuevos mensajes deban esperar a un
  turno posterior en lugar de dirigir la ejecución activa.

Para conocer los modos de cola y el comportamiento de reserva, consulte [Cola de comandos](/es/concepts/queue) y
[Cola de dirección](/es/concepts/queue-steering).

## Subagentes

Use `/subagents steer` cuando el objetivo es una ejecución secundaria:

```text
/subagents steer 2 focus only on the API surface
```

El `/steer` de nivel superior no selecciona un subagente por ID o índice de lista. Siempre
apunta a la ejecución activa de la sesión actual. Consulte [Subagentes](/es/tools/subagents) para obtener
los IDs, etiquetas y comandos de control de subagentes.

## Sesiones de ACP

Use `/acp steer` cuando el objetivo es una sesión de arnés de ACP:

```text
/acp steer --session agent:main:acp:codex tighten the repro
```

Consulte [Agentes de ACP](/es/tools/acp-agents) para obtener información sobre la selección de sesiones de ACP y el comportamiento
de tiempo de ejecución.

## Relacionado

- [Comandos de barra](/es/tools/slash-commands)
- [Cola de comandos](/es/concepts/queue)
- [Cola de dirección](/es/concepts/queue-steering)
- [Subagentes](/es/tools/subagents)

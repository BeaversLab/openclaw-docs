---
summary: "Background exec execution and process management"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Background Exec and Process Tool"
---

# Background Exec + Process Tool

OpenClaw runs shell commands through the `exec` tool and keeps long‑running tasks in memory. The `process` tool manages those background sessions.

## exec tool

Key parameters:

- `command` (required)
- `yieldMs` (default 10000): auto‑background after this delay
- `background` (bool): background immediately
- `timeout` (seconds, default 1800): kill the process after this timeout
- `elevated` (bool): run on host if elevated mode is enabled/allowed
- Need a real TTY? Set `pty: true`.
- `workdir`, `env`

Behavior:

- Foreground runs return output directly.
- When backgrounded (explicit or timeout), the tool returns `status: "running"` + `sessionId` and a short tail.
- Output is kept in memory until the session is polled or cleared.
- If the `process` tool is disallowed, `exec` runs synchronously and ignores `yieldMs`/`background`.
- Spawned exec commands receive `OPENCLAW_SHELL=exec` for context-aware shell/profile rules.

## Child process bridging

When spawning long-running child processes outside the exec/process tools (for example, CLI respawns or gateway helpers), attach the child-process bridge helper so termination signals are forwarded and listeners are detached on exit/error. This avoids orphaned processes on systemd and keeps shutdown behavior consistent across platforms.

Environment overrides:

- `PI_BASH_YIELD_MS`: default yield (ms)
- `PI_BASH_MAX_OUTPUT_CHARS`: in‑memory output cap (chars)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: pending stdout/stderr cap per stream (chars)
- `PI_BASH_JOB_TTL_MS`: TTL for finished sessions (ms, bounded to 1m–3h)

Config (preferred):

- `tools.exec.backgroundMs` (predeterminado 10000)
- `tools.exec.timeoutSec` (predeterminado 1800)
- `tools.exec.cleanupMs` (predeterminado 1800000)
- `tools.exec.notifyOnExit` (predeterminado true): pone en cola un evento del sistema + solicita latido cuando un exec en segundo plano termina.
- `tools.exec.notifyOnExitEmptySuccess` (predeterminado false): cuando es true, también pone en cola eventos de finalización para ejecuciones en segundo plano exitosas que no produjeron salida.

## process tool

Acciones:

- `list`: sesiones en ejecución + finalizadas
- `poll`: drenar la nueva salida de una sesión (también reporta el estado de salida)
- `log`: leer la salida agregada (soporta `offset` + `limit`)
- `write`: enviar stdin (`data`, `eof` opcional)
- `kill`: terminar una sesión en segundo plano
- `clear`: eliminar una sesión finalizada de la memoria
- `remove`: matar si se está ejecutando, de lo contrario limpiar si está terminada

Notas:

- Solo se enumeran/persisten en memoria las sesiones en segundo plano.
- Las sesiones se pierden al reiniciar el proceso (sin persistencia en disco).
- Los registros de sesión solo se guardan en el historial de chat si ejecutas `process poll/log` y se registra el resultado de la herramienta.
- `process` tiene ámbito por agente; solo ve las sesiones iniciadas por ese agente.
- `process list` incluye un `name` derivado (verbo de comando + objetivo) para escaneos rápidos.
- `process log` usa `offset`/`limit` basados en líneas.
- Cuando se omiten tanto `offset` como `limit`, devuelve las últimas 200 líneas e incluye una sugerencia de paginación.
- Cuando se proporciona `offset` y se omite `limit`, devuelve desde `offset` hasta el final (sin limitar a 200).

## Ejemplos

Ejecutar una tarea larga y sondear más tarde:

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

Iniciar inmediatamente en segundo plano:

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

Enviar stdin:

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

import es from "/components/footer/es.mdx";

<es />

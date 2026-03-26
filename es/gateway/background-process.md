---
summary: "Ejecución en segundo plano y gestión de procesos"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Herramienta de ejecución en segundo plano y de procesos"
---

# Herramienta de ejecución en segundo plano y de procesos

OpenClaw ejecuta comandos de shell a través de la herramienta `exec` y mantiene las tareas de larga duración en memoria. La herramienta `process` gestiona esas sesiones en segundo plano.

## herramienta exec

Parámetros clave:

- `command` (obligatorio)
- `yieldMs` (predeterminado 10000): segundo plano automático después de este retraso
- `background` (bool): poner en segundo plano inmediatamente
- `timeout` (segundos, predeterminado 1800): terminar el proceso después de este tiempo de espera
- `elevated` (bool): ejecutar en el host si el modo elevado está habilitado/permitido
- ¿Necesita un TTY real? Establezca `pty: true`.
- `workdir`, `env`

Comportamiento:

- Las ejecuciones en primer plano devuelven la salida directamente.
- Cuando se pone en segundo plano (explícito o por tiempo de espera), la herramienta devuelve `status: "running"` + `sessionId` y una cola corta.
- La salida se mantiene en memoria hasta que se sondea o se borra la sesión.
- Si no se permite la herramienta `process`, `exec` se ejecuta de forma síncrona e ignora `yieldMs`/`background`.
- Los comandos exec generados reciben `OPENCLAW_SHELL=exec` para reglas de shell/perfil con reconocimiento de contexto.

## Puente de procesos secundarios

Al generar procesos secundarios de larga duración fuera de las herramientas exec/process (por ejemplo, reinicios de CLI o asistentes de puerta de enlace), adjunte el asistente de puente de procesos secundarios para que las señales de terminación se reenvíen y los oyentes se desconecten al salir/error. Esto evita procesos huérfanos en systemd y mantiene el comportamiento de apagado consistente entre plataformas.

Sobrescrituras de entorno:

- `PI_BASH_YIELD_MS`: rendimiento predeterminado (ms)
- `PI_BASH_MAX_OUTPUT_CHARS`: límite de salida en memoria (caracteres)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: límite de stdout/stderr pendiente por flujo (caracteres)
- `PI_BASH_JOB_TTL_MS`: TTL para sesiones finalizadas (ms, limitado a 1m–3h)

Configuración (preferida):

- `tools.exec.backgroundMs` (predeterminado 10000)
- `tools.exec.timeoutSec` (predeterminado 1800)
- `tools.exec.cleanupMs` (predeterminado 1800000)
- `tools.exec.notifyOnExit` (predeterminado true): pone en cola un evento del sistema + solicita latido cuando finaliza un exec en segundo plano.
- `tools.exec.notifyOnExitEmptySuccess` (predeterminado false): cuando es true, también pone en cola eventos de finalización para ejecuciones en segundo plano exitosas que no produjeron salida.

## herramienta de proceso

Acciones:

- `list`: sesiones en ejecución + finalizadas
- `poll`: drenar la nueva salida de una sesión (también reporta el estado de salida)
- `log`: leer la salida agregada (soporta `offset` + `limit`)
- `write`: enviar stdin (`data`, `eof` opcional)
- `kill`: terminar una sesión en segundo plano
- `clear`: eliminar una sesión finalizada de la memoria
- `remove`: matar si se está ejecutando, de lo contrario limpiar si ha finalizado

Notas:

- Solo se listan/persisten en memoria las sesiones en segundo plano.
- Las sesiones se pierden al reiniciar el proceso (sin persistencia en disco).
- Los registros de sesión solo se guardan en el historial de chat si ejecutas `process poll/log` y se registra el resultado de la herramienta.
- `process` tiene ámbito por agente; solo ve las sesiones iniciadas por ese agente.
- `process list` incluye un `name` derivado (verbo de comando + objetivo) para escaneos rápidos.
- `process log` usa `offset`/`limit` basado en líneas.
- Cuando se omiten tanto `offset` como `limit`, devuelve las últimas 200 líneas e incluye una sugerencia de paginación.
- Cuando se proporciona `offset` y se omite `limit`, devuelve desde `offset` hasta el final (no limitado a 200).

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

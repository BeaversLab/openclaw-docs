---
summary: "Ejecución en segundo plano de exec y gestión de procesos"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Exec en segundo plano y herramienta de proceso"
---

OpenClaw ejecuta comandos de shell a través de la herramienta `exec` y mantiene las tareas de larga ejecución en memoria. La herramienta `process` gestiona esas sesiones en segundo plano.

## herramienta exec

Parámetros clave:

- `command` (obligatorio)
- `yieldMs` (predeterminado 10000): pasar automáticamente a segundo plano después de este retraso
- `background` (bool): pasar a segundo plano inmediatamente
- `timeout` (segundos, predeterminado `tools.exec.timeoutSec`): eliminar el proceso después de este tiempo de espera; establecer `timeout: 0` únicamente para desactivar el tiempo de espera del proceso exec para esa llamada
- `elevated` (bool): ejecutar fuera del sandbox si el modo elevado está habilitado/permitido (`gateway` de forma predeterminada, o `node` cuando el objetivo de exec es `node`)
- ¿Necesita un TTY real? Establezca `pty: true`.
- `workdir`, `env`

Comportamiento:

- Las ejecuciones en primer plano devuelven la salida directamente.
- Cuando está en segundo plano (explícito o por tiempo de espera), la herramienta devuelve `status: "running"` + `sessionId` y una cola corta.
- Las ejecuciones en segundo plano y `yieldMs` heredan `tools.exec.timeoutSec` a menos que la llamada proporcione un `timeout` explícito.
- La salida se mantiene en memoria hasta que se sondea o se borra la sesión.
- Si la herramienta `process` no está permitida, `exec` se ejecuta sincrónicamente e ignora `yieldMs`/`background`.
- Los comandos exec generados reciben `OPENCLAW_SHELL=exec` para reglas de shell/perfil con reconocimiento de contexto.
- Para trabajos de larga ejecución que comienzan ahora, inícielos una vez y confíe en la activación de finalización automática cuando esté habilitada y el comando emita resultados o falle.
- Si la activación automática de finalización no está disponible, o necesita confirmación de éxito silencioso
  para un comando que salió limpiamente sin salida, use `process`
  para confirmar la finalización.
- No emule recordatorios o seguimientos retrasados con bucles `sleep` o sondeos
  repetidos; use cron para trabajo futuro.

## Puentes de procesos secundarios

Al generar procesos secundarios de larga ejecución fuera de las herramientas exec/process (por ejemplo, reinicios de CLI o asistentes de puerta de enlace), adjunte el asistente de puente de procesos secundarios (child-process bridge) para que las señales de terminación se reenvían y los oyentes se desvinculen al salir/error. Esto evita procesos huérfanos en systemd y mantiene el comportamiento de apagado consistente entre plataformas.

Sobrescrituras de entorno:

- `PI_BASH_YIELD_MS`: cedencia predeterminada (ms)
- `PI_BASH_MAX_OUTPUT_CHARS`: límite de salida en memoria (caracteres)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: límite de stdout/stderr pendiente por flujo (caracteres)
- `PI_BASH_JOB_TTL_MS`: TTL para sesiones finalizadas (ms, limitado entre 1m y 3h)
- `OPENCLAW_PROCESS_INPUT_WAIT_IDLE_MS`: umbral de salida inactiva antes de que las sesiones en segundo plano escribibles se marquen como probablemente esperando entrada (por defecto 15000 ms)

Configuración (preferida):

- `tools.exec.backgroundMs` (por defecto 10000)
- `tools.exec.timeoutSec` (por defecto 1800)
- `tools.exec.cleanupMs` (por defecto 1800000)
- `tools.exec.notifyOnExit` (por defecto true): pone en cola un evento del sistema + solicita latido cuando un exec en segundo plano sale.
- `tools.exec.notifyOnExitEmptySuccess` (por defecto false): cuando es true, también pone en cola eventos de finalización para ejecuciones en segundo plano exitosas que no produjeron salida.

## herramienta de proceso

Acciones:

- `list`: sesiones en ejecución + finalizadas
- `poll`: drenar la nueva salida de una sesión (también informa el estado de salida)
- `log`: leer la salida agregada y mostrar pistas de recuperación de entrada (soporta `offset` + `limit`)
- `write`: enviar stdin (`data`, `eof` opcional)
- `send-keys`: enviar tokens de clave explícitos o bytes a una sesión respaldada por PTY
- `submit`: enviar Enter / retorno de carro a una sesión respaldada por PTY
- `paste`: enviar texto literal, opcionalmente envuelto en modo de pegado entre corchetes
- `kill`: terminar una sesión en segundo plano
- `clear`: eliminar una sesión finalizada de la memoria
- `remove`: matar si se está ejecutando, de lo contrario limpiar si ha finalizado

Notas:

- Solo se listan/persisten en memoria las sesiones en segundo plano.
- Las sesiones se pierden al reiniciar el proceso (sin persistencia en disco).
- Los registros de sesión solo se guardan en el historial de chat si ejecutas `process poll/log` y se registra el resultado de la herramienta.
- `process` está limitado por agente; solo ve las sesiones iniciadas por ese agente.
- Use `poll` / `log` para el estado, los registros, la confirmación silenciosa de éxito o la confirmación de finalización cuando la activación automática de finalización no esté disponible.
- Use `log` antes de recuperar una CLI interactiva para que la transcripción actual, el estado de stdin y la sugerencia de espera de entrada sean visibles juntos.
- Use `write` / `send-keys` / `submit` / `paste` / `kill` cuando necesite entrada o intervención.
- `process list` incluye un `name` derivado (verbo de comando + objetivo) para escaneos rápidos.
- `process list`, `poll` y `log` informan `waitingForInput` solo cuando la sesión todavía tiene stdin escribible y ha estado inactiva por más tiempo que el umbral de espera de entrada.
- `process log` usa `offset`/`limit` basados en líneas.
- Cuando se omiten tanto `offset` como `limit`, devuelve las últimas 200 líneas e incluye una sugerencia de paginación.
- Cuando se proporciona `offset` y se omite `limit`, devuelve desde `offset` hasta el final (no limitado a 200).
- El sondeo es para el estado bajo demanda, no para la programación de bucles de espera. Si el trabajo debe ocurrir más tarde, use cron en su lugar.

## Ejemplos

Ejecute una tarea larga y sondee más tarde:

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

Inspeccione una sesión interactiva antes de enviar entrada:

```json
{ "tool": "process", "action": "log", "sessionId": "<id>" }
```

Inicie inmediatamente en segundo plano:

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

Enviar stdin:

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

Enviar teclas PTY:

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

Enviar línea actual:

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

Pegar texto literal:

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## Relacionado

- [Herramienta Exec](/es/tools/exec)
- [Aprobaciones Exec](/es/tools/exec-approvals)

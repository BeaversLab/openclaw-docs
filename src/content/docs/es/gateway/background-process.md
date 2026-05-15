---
summary: "Ejecución en segundo plano y gestión de procesos"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Herramienta de ejecución en segundo plano y de proceso"
---

OpenClaw ejecuta comandos de shell a través de la herramienta `exec` y mantiene las tareas de larga ejecución en memoria. La herramienta `process` gestiona esas sesiones en segundo plano.

## herramienta exec

Parámetros clave:

- `command` (obligatorio)
- `yieldMs` (predeterminado 10000): segundo plano automático después de este retraso
- `background` (bool): segundo plano inmediato
- `timeout` (segundos, predeterminado `tools.exec.timeoutSec`): elimina el proceso después de este tiempo de espera; establece `timeout: 0` solo para desactivar el tiempo de espera del proceso exec para esa llamada
- `elevated` (bool): se ejecuta fuera del sandbox si el modo elevado está activado/permitido (`gateway` de forma predeterminada, o `node` cuando el destino de exec es `node`)
- ¿Necesitas un TTY real? Establece `pty: true`.
- `workdir`, `env`

Comportamiento:

- Las ejecuciones en primer plano devuelven la salida directamente.
- Cuando se pone en segundo plano (explícito o tiempo de espera), la herramienta devuelve `status: "running"` + `sessionId` y una cola corta.
- Las ejecuciones en segundo plano y de `yieldMs` heredan `tools.exec.timeoutSec` a menos que la llamada proporcione un `timeout` explícito.
- La salida se mantiene en memoria hasta que se sondea o se borra la sesión.
- Si la herramienta `process` no está permitida, `exec` se ejecuta de forma síncrona e ignora `yieldMs`/`background`.
- Los comandos exec generados reciben `OPENCLAW_SHELL=exec` para las reglas de shell/perfil contextuales.
- Para trabajos de larga ejecución que comienzan ahora, inícielos una vez y confíe en la activación de finalización automática cuando esté habilitada y el comando emita resultados o falle.
- Si la activación de finalización automática no está disponible, o necesitas una confirmación de éxito silencioso
  para un comando que salió limpiamente sin salida, usa `process`
  para confirmar la finalización.
- No emules recordatorios o seguimientos retrasados con bucles `sleep` o sondeos
  repetidos; usa cron para el trabajo futuro.

## Puentes de procesos secundarios

Al generar procesos secundarios de larga ejecución fuera de las herramientas exec/process (por ejemplo, reinicios de CLI o asistentes de puerta de enlace), adjunte el asistente de puente de procesos secundarios (child-process bridge) para que las señales de terminación se reenvían y los oyentes se desvinculen al salir/error. Esto evita procesos huérfanos en systemd y mantiene el comportamiento de apagado consistente entre plataformas.

Sobrescrituras de entorno:

- `PI_BASH_YIELD_MS`: cesión predeterminada (ms)
- `PI_BASH_MAX_OUTPUT_CHARS`: límite de salida en memoria (caracteres)
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`: límite de stdout/stderr pendiente por flujo (caracteres)
- `PI_BASH_JOB_TTL_MS`: TTL para sesiones finalizadas (ms, limitado a 1m–3h)

Configuración (preferida):

- `tools.exec.backgroundMs` (predeterminado 10000)
- `tools.exec.timeoutSec` (predeterminado 1800)
- `tools.exec.cleanupMs` (predeterminado 1800000)
- `tools.exec.notifyOnExit` (predeterminado true): pone en cola un evento del sistema + solicita latido cuando sale un exec en segundo plano.
- `tools.exec.notifyOnExitEmptySuccess` (predeterminado false): cuando es true, también pone en cola eventos de finalización para ejecuciones en segundo plano exitosas que no produjeron salida.

## herramienta de proceso

Acciones:

- `list`: sesiones en ejecución + finalizadas
- `poll`: drena la nueva salida de una sesión (también reporta el estado de salida)
- `log`: lee la salida agregada (soporta `offset` + `limit`)
- `write`: envía stdin (`data`, `eof` opcional)
- `send-keys`: envía tokens de clave explícitos o bytes a una sesión respaldada por PTY
- `submit`: envía Enter / retorno de carro a una sesión respaldada por PTY
- `paste`: envía texto literal, opcionalmente envuelto en modo de pegado entre corchetes
- `kill`: termina una sesión en segundo plano
- `clear`: elimina una sesión finalizada de la memoria
- `remove`: mata si se está ejecutando, de lo contrario borra si está finalizado

Notas:

- Solo se listan/persisten en memoria las sesiones en segundo plano.
- Las sesiones se pierden al reiniciar el proceso (sin persistencia en disco).
- Los registros de sesión solo se guardan en el historial de chat si ejecutas `process poll/log` y se registra el resultado de la herramienta.
- `process` tiene ámbito por agente; solo ve las sesiones iniciadas por ese agente.
- Usa `poll` / `log` para estado, registros, confirmación de éxito silencioso o
  confirmación de finalización cuando no está disponible el despertar de finalización automática.
- Usa `write` / `send-keys` / `submit` / `paste` / `kill` cuando necesitas entrada
  o intervención.
- `process list` incluye un `name` derivado (verbo de comando + objetivo) para escaneos rápidos.
- `process log` utiliza `offset`/`limit` basado en líneas.
- Cuando se omiten tanto `offset` como `limit`, devuelve las últimas 200 líneas e incluye una sugerencia de paginación.
- Cuando se proporciona `offset` y se omite `limit`, devuelve desde `offset` hasta el final (sin limitar a 200).
- El sondeo es para el estado bajo demanda, no para la programación de bucles de espera. Si el trabajo debe
  ocurrir más tarde, use cron en su lugar.

## Ejemplos

Ejecute una tarea larga y sondee más tarde:

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
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

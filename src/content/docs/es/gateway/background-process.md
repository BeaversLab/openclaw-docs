---
summary: "Ejecución en segundo plano y gestión de procesos"
read_when:
  - Adding or modifying background exec behavior
  - Debugging long-running exec tasks
title: "Herramienta de ejecución en segundo plano y de proceso"
---

# Herramienta de ejecución en segundo plano y de procesos

OpenClaw ejecuta comandos de shell a través de la herramienta `exec` y mantiene las tareas de larga ejecución en memoria. La herramienta `process` gestiona esas sesiones en segundo plano.

## herramienta exec

Parámetros clave:

- `command` (obligatorio)
- `yieldMs` (predeterminado 10000): pasar automáticamente a segundo plano después de este retraso
- `background` (bool): pasar a segundo plano inmediatamente
- `timeout` (segundos, por defecto `tools.exec.timeoutSec`): elimina el proceso después de este tiempo de espera; establece `timeout: 0` solo para desactivar el tiempo de espera del proceso exec para esa llamada
- `elevated` (bool): se ejecuta fuera del sandbox si el modo elevado está activado/permitido (`gateway` por defecto, o `node` cuando el objetivo de exec es `node`)
- ¿Necesitas un TTY real? Establece `pty: true`.
- `workdir`, `env`

Comportamiento:

- Las ejecuciones en primer plano devuelven la salida directamente.
- Cuando se pone en segundo plano (explícito o por tiempo de espera), la herramienta devuelve `status: "running"` + `sessionId` y una cola corta.
- Las ejecuciones en segundo plano y `yieldMs` heredan `tools.exec.timeoutSec` a menos que la llamada proporcione un `timeout` explícito.
- La salida se mantiene en memoria hasta que la sesión es consultada o borrada.
- Si la herramienta `process` no está permitida, `exec` se ejecuta sincrónicamente e ignora `yieldMs`/`background`.
- Los comandos exec generados reciben `OPENCLAW_SHELL=exec` para reglas de shell/perfil con contexto.
- Para trabajos de larga duración que comienzan ahora, inícialos una vez y confía en la reactivación
  de finalización automática cuando está habilitada y el comando emite salida o falla.
- Si la reactivación de finalización automática no está disponible, o necesitas confirmación de éxito silencioso
  para un comando que salió limpiamente sin salida, usa `process`
  para confirmar la finalización.
- No emules recordatorios o seguimientos retrasados con bucles `sleep` o sondeos
  repetidos; usa cron para el trabajo futuro.

## Puente de procesos secundarios

Al generar procesos secundarios de larga duración fuera de las herramientas exec/process (por ejemplo, reactivaciones de CLI o asistentes de puerta de enlace), adjunta el asistente de puente de procesos secundarios para que las señales de terminación se reenvíen y los escuchadores se desvinculen al salir/error. Esto evita procesos huérfanos en systemd y mantiene el comportamiento de apagado consistente entre plataformas.

Sobrescrituras de entorno:

- `PI_BASH_YIELD_MS`: yield predeterminado (ms)
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

- Solo se enumeran/persisten en memoria las sesiones en segundo plano.
- Las sesiones se pierden al reiniciar el proceso (sin persistencia en disco).
- Los registros de sesión solo se guardan en el historial de chat si ejecutas `process poll/log` y se registra el resultado de la herramienta.
- `process` tiene alcance por agente; solo ve las sesiones iniciadas por ese agente.
- Use `poll` / `log` para estado, registros, confirmación de éxito silencioso o
  confirmación de finalización cuando el despertar de finalización automática no está disponible.
- Use `write` / `send-keys` / `submit` / `paste` / `kill` cuando necesite entrada
  o intervención.
- `process list` incluye un `name` derivado (verbo de comando + destino) para escaneos rápidos.
- `process log` usa `offset`/`limit` basados en líneas.
- Cuando se omiten tanto `offset` como `limit`, devuelve las últimas 200 líneas e incluye una sugerencia de paginación.
- Cuando se proporciona `offset` y se omite `limit`, devuelve desde `offset` hasta el final (sin limitar a 200).
- El sondeo (polling) es para el estado bajo demanda, no para la programación de bucles de espera. Si el trabajo debe
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
- [Aprobaciones de Exec](/es/tools/exec-approvals)

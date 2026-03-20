---
summary: "Use ACP runtime sessions for Pi, Claude Code, Codex, OpenCode, Gemini CLI, and other harness agents"
read_when:
  - Ejecutando arneses de codificación a través de ACP
  - Configuración de sesiones ACP ligadas a hilos en canales compatibles con hilos
  - Vinculación de canales de Discord o temas de foros de Telegram a sesiones ACP persistentes
  - Solución de problemas del cableado del backend y los complementos de ACP
  - Operando comandos /acp desde el chat
title: "ACP Agents"
---

# Agentes ACP

Las sesiones del [Protocolo de Cliente de Agente (ACP)](https://agentclientprotocol.com/) permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, OpenCode y Gemini CLI) a través de un complemento de backend ACP.

Si pides a OpenClaw en lenguaje sencillo que "ejecute esto en Codex" o "inicie Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución nativo de sub-agente).

## Flujo de operador rápido

Use esto cuando desee un manual operativo práctico `/acp`:

1. Generar una sesión:
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabajar en el hilo vinculado (o apunte a esa clave de sesión explícitamente).
3. Verificar el estado de tiempo de ejecución:
   - `/acp status`
4. Ajustar las opciones de tiempo de ejecución según sea necesario:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Empujar una sesión activa sin reemplazar el contexto:
   - `/acp steer tighten logging and continue`
6. Detener trabajo:
   - `/acp cancel` (detener turno actual), o
   - `/acp close` (cerrar sesión + eliminar vinculaciones)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Inicie una sesión persistente de Codex en un hilo aquí y manténgala enfocada."
- "Ejecute esto como una sesión ACP de Claude Code de un solo uso y resuma el resultado."
- "Use Gemini CLI para esta tarea en un hilo, luego mantenga los seguimientos en ese mismo hilo."

Lo que OpenClaw debe hacer:

1. Elija `runtime: "acp"`.
2. Resuelva el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita la vinculación de hilo y el canal actual lo admite, vincule la sesión ACP al hilo.
4. Enrutar los mensajes de seguimiento del hilo a esa misma sesión ACP hasta que se desenfoque/cierre/expire.

## ACP frente a sub-agentes

Use ACP cuando desee un tiempo de ejecución de arnés externo. Use sub-agentes cuando desee ejecuciones delegadas nativas de OpenClaw.

| Área                                   | Sesión ACP                                     | Ejecución de sub-agente                               |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución                    | Complemento de backend ACP (por ejemplo, acpx) | Tiempo de ejecución nativo de subagente de OpenClaw   |
| Clave de sesión                        | `agent:<agentId>:acp:<uuid>`                   | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales                   | `/acp ...`                                     | `/subagents ...`                                      |
| Herramienta de generación (Spawn tool) | `sessions_spawn` con `runtime:"acp"`           | `sessions_spawn` (tiempo de ejecución predeterminado) |

Consulte también [Sub-agentes](/es/tools/subagents).

## Sesiones vinculadas a hilos (independientes del canal)

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones de ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión de ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión de ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- Desenfocar/cerrar/archivar/timeout de inactividad o caducidad por antigüedad máxima elimina el vínculo.

La compatibilidad con la vinculación de hilos es específica del adaptador. Si el adaptador de canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no compatibilidad o indisponibilidad.

Marcadores de características requeridas para ACP vinculado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado de forma predeterminada (establezca `false` para pausar el despacho de ACP)
- Marcador de generación de hilos ACP del adaptador de canal habilitado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales que admiten hilos

- Cualquier adaptador de canal que exponga capacidad de vinculación de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas de foro en grupos/supergrupos y temas de mensajes directos)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

## Configuración específica del canal

Para flujos de trabajo no efímeros, configure vinculaciones persistentes de ACP en entradas de nivel superior `bindings[]`.

### Modelo de vinculación

- `bindings[].type="acp"` marca una vinculación de conversación persistente de ACP.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema de foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` es el id del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran en `bindings[].acp`:
  - `mode` (`persistent` o `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Valores predeterminados de tiempo de ejecución por agente

Use `agents.list[].runtime` para definir valores predeterminados de ACP una vez por agente:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (id de arnés, por ejemplo `codex` o `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

Precedencia de anulación para sesiones vinculadas a ACP:

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. valores predeterminados globales de ACP (por ejemplo `acp.backend`)

Ejemplo:

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

Comportamiento:

- OpenClaw asegura que exista la sesión de ACP configurada antes de su uso.
- Los mensajes en ese canal o tema se enrutan a la sesión de ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión de ACP en su lugar.
- Los enlaces temporales de tiempo de ejecución (por ejemplo, los creados por flujos de enfoque en hilos) todavía se aplican donde están presentes.

## Iniciar sesiones de ACP (interfaces)

### Desde `sessions_spawn`

Use `runtime: "acp"` para iniciar una sesión de ACP desde un turno de agente o una llamada de herramienta.

```json
{
  "task": "Open the repo and summarize failing tests",
  "runtime": "acp",
  "agentId": "codex",
  "thread": true,
  "mode": "session"
}
```

Notas:

- `runtime` tiene como valor predeterminado `subagent`, por lo que debe establecer `runtime: "acp"` explícitamente para las sesiones de ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión de ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Recurre a `acp.defaultAgent` si está establecido.
- `thread` (opcional, valor predeterminado `false`): solicita el flujo de vinculación de hilo donde sea compatible.
- `mode` (opcional): `run` (único) o `session` (persistente).
  - el valor predeterminado es `run`
  - si `thread: true` y se omite el modo, OpenClaw puede adoptar el comportamiento persistente según la ruta de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo de ejecución solicitado (validado por la política de backend/ejecución).
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación mediante `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de la ejecución ACP inicial a la sesión solicitante como eventos del sistema.
  - Cuando esté disponible, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) que puedes seguir para ver el historial completo de retransmisión.

### Reanudar una sesión existente

Usa `resumeSessionId` para continuar una sesión ACP anterior en lugar de comenzar de nuevo. El agente reproduce su historial de conversación mediante `session/load`, por lo que continúa con el contexto completo de lo que sucedió antes.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transferir una sesión de Codex de tu portátil a tu teléfono — dile a tu agente que continúe donde lo dejaste
- Continuar una sesión de codificación que iniciaste de forma interactiva en la CLI, ahora sin interfaz gráfica a través de tu agente
- Reanudar el trabajo que se interrumpió por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución del subagente.
- `resumeSessionId` restaura el historial de conversación ACP ascendente; `thread` y `mode` todavía se aplican normalmente a la nueva sesión OpenClaw que estás creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la creación falla con un error claro; no hay una reserva silenciosa a una nueva sesión.

### Prueba de humo del operador

Úselo después de una implementación de gateway cuando desee una verificación rápida en vivo de que la creación de ACP
funciona realmente de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta recomendada:

1. Verifique la versión/confirmación del gateway implementado en el host de destino.
2. Confirme que la fuente implementada incluye la aceptación de linaje ACP en
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`).
3. Abra una sesión de puente ACPX temporal a un agente en vivo (por ejemplo,
   `razor(main)` en `jpclawhq`).
4. Pida a ese agente que llame a `sessions_spawn` con:
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - tarea: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. Verifique que el agente informe:
   - `accepted=yes`
   - un `childSessionKey` real
   - sin error de validador
6. Limpie la sesión del puente ACPX temporal.

Ejemplo de prompt para el agente en vivo:

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notas:

- Mantenga esta prueba de humo en `mode: "run"` a menos que esté probando intencionalmente
  sesiones ACP persistentes ligadas a hilos.
- No exija `streamTo: "parent"` para la puerta básica. Esa ruta depende de
  las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate las pruebas de `mode: "session"` ligadas a hilos como una segunda pasada de integración más rica
  desde un hilo real de Discord o un tema de Telegram.

## Compatibilidad con Sandbox

Las sesiones de ACP actualmente se ejecutan en el tiempo de ejecución del host, no dentro del sandbox OpenClaw.

Limitaciones actuales:

- Si la sesión del solicitante está en sandbox, las creaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución forzada por sandbox.

### Desde el comando `/acp`

Use `/acp spawn` para un control explícito del operador desde el chat cuando sea necesario.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

Opciones clave:

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Consulte [Comandos de barra](/es/tools/slash-commands).

## Resolución del objetivo de la sesión

La mayoría de las acciones de `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - clave de intentos
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Vinculación al hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Reserva de sesión del solicitante actual

Si ningún objetivo se resuelve, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de creación de hilos

`/acp spawn` admite `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando sea compatible. |
| `here` | Requiere un hilo activo actual; falla si no está en uno.                                                         |
| `off`  | Sin vinculación. La sesión comienza sin vincular.                                                                |

Notas:

- En superficies sin vinculación a hilos, el comportamiento predeterminado es efectivamente `off`.
- La creación de hilos vinculados requiere compatibilidad con la política del canal:
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

## Controles de ACP

Familia de comandos disponible:

- `/acp spawn`
- `/acp cancel`
- `/acp steer`
- `/acp close`
- `/acp status`
- `/acp set-mode`
- `/acp set`
- `/acp cwd`
- `/acp permissions`
- `/acp timeout`
- `/acp model`
- `/acp reset-options`
- `/acp sessions`
- `/acp doctor`
- `/acp install`

`/acp status` muestra las opciones efectivas del tiempo de ejecución y, cuando están disponibles, los identificadores de sesión tanto a nivel de tiempo de ejecución como a nivel de backend.

Algunos controles dependen de las capacidades del backend. Si un backend no admite un control, OpenClaw devuelve un error claro de control no admitido.

## Libro de recetas de comandos de ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                        |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación de subproceso opcional.                        | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | Cancelar turno en curso para la sesión de destino.                           | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | Cerrar sesión y desvincular objetivos de subproceso.                         | `/acp close`                                                   |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                  |
| `/acp set-mode`      | Establecer el modo de tiempo de ejecución para la sesión de destino.         | `/acp set-mode plan`                                           |
| `/acp set`           | Escritura de opción de configuración de tiempo de ejecución genérica.        | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | Establecer la anulación del directorio de trabajo de tiempo de ejecución.    | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | Establecer el perfil de política de aprobación.                              | `/acp permissions strict`                                      |
| `/acp timeout`       | Establecer tiempo de espera de tiempo de ejecución (segundos).               | `/acp timeout 120`                                             |
| `/acp model`         | Establecer la anulación del modelo de tiempo de ejecución.                   | `/acp model anthropic/claude-opus-4-5`                         |
| `/acp reset-options` | Quitar anulaciones de opciones de tiempo de ejecución de la sesión.          | `/acp reset-options`                                           |
| `/acp sessions`      | Enumerar sesiones recientes de ACP del almacén.                              | `/acp sessions`                                                |
| `/acp doctor`        | Estado del backend, capacidades, correcciones accionables.                   | `/acp doctor`                                                  |
| `/acp install`       | Imprimir pasos determinantes de instalación y habilitación.                  | `/acp install`                                                 |

`/acp sessions` lee el almacén para la sesión vinculada actual o la sesión solicitante. Los comandos que aceptan tokens `session-key`, `session-id` o `session-label` resuelven los objetivos a través del descubrimiento de sesiones de puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un establecedor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza la invalidación de cwd de tiempo de ejecución directamente.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de invalidación de cwd.
- `/acp reset-options` borra todas las invalidaciones de tiempo de ejecución para la sesión de destino.

## soporte de arnés acpx (actual)

Alias de arnés integrados de acpx actuales:

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

Cuando OpenClaw usa el backend acpx, prefiera estos valores para `agentId` a menos que su configuración de acpx defina alias de agente personalizados.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape sin formato es una característica de la CLI de acpx (no la ruta normal `agentId` de OpenClaw).

## Configuración requerida

Línea base de ACP principal:

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["pi", "claude", "codex", "opencode", "gemini", "kimi"],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

La configuración de enlace de subprocesos es específica del adaptador de canal. Ejemplo para Discord:

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnAcpSessions: true,
      },
    },
  },
}
```

Si la generación de ACP vinculada a subprocesos no funciona, verifique primero el indicador de características del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Instale y habilite el complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación del espacio de trabajo local durante el desarrollo:

```bash
openclaw plugins install ./extensions/acpx
```

Luego verifique el estado del backend:

```text
/acp doctor
```

### comando y configuración de versión de acpx

De forma predeterminada, el complemento acpx (publicado como `@openclaw/acpx`) usa el binario anclado local del complemento:

1. El comando predeterminado es `extensions/acpx/node_modules/.bin/acpx`.
2. La versión esperada predeterminada es el anclaje de la extensión.
3. El inicio registra el backend de ACP inmediatamente como no listo.
4. Un trabajo de aseguramiento en segundo plano verifica `acpx --version`.
5. Si falta o no coincide el binario local del complemento, ejecuta:
   `npm install --omit=dev --no-save acpx@<pinned>` y vuelve a verificar.

Puedes anular el comando/versión en la configuración del complemento:

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

Notas:

- `command` acepta una ruta absoluta, una ruta relativa o un nombre de comando (`acpx`).
- Las rutas relativas se resuelven desde el directorio del espacio de trabajo de OpenClaw.
- `expectedVersion: "any"` desactiva la coincidencia estricta de versiones.
- Cuando `command` apunta a un binario/ruta personalizado, se desactiva la instalación automática local del complemento.
- El inicio de OpenClaw sigue sin bloqueo mientras se ejecuta la verificación de estado del backend.

Consulte [Complementos](/es/tools/plugin).

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva: no hay ninguna TTY para aprobar o denegar las solicitudes de permisos de escritura en archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se gestionan los permisos:

### `permissionMode`

Controla qué operaciones puede realizar el agente de arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                  |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permisos.                                                     |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay ninguna TTY interactiva disponible (lo cual siempre es el caso de las sesiones de ACP).

| Valor  | Comportamiento                                                         |
| ------ | ---------------------------------------------------------------------- |
| `fail` | Abortar la sesión con `AcpRuntimeError`. **(predeterminado)**          |
| `deny` | Denegar silenciosamente el permiso y continuar (degradación correcta). |

### Configuración

Establecer mediante la configuración del complemento:

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Reinicie la puerta de enlace después de cambiar estos valores.

> **Importante:** Actualmente, OpenClaw tiene como valores predeterminados `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active una solicitud de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesitas restringir los permisos, establece `nonInteractivePermissions` en `deny` para que las sesiones se degraden correctamente en lugar de bloquearse.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                      | Solución                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el complemento de backend o está deshabilitado.                                               | Instale y habilite el complemento de backend, luego ejecute `/acp doctor`.                                                                                                                                       |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                      | Establezca `acp.enabled=true`.                                                                                                                                                                                   |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | El envío desde mensajes de hilos normales está deshabilitado.                                       | Establezca `acp.dispatch.enabled=true`.                                                                                                                                                                          |
| `ACP agent "<id>" is not allowed by policy`                                 | El agente no está en la lista de permitidos.                                                        | Use `agentId` permitidos o actualice `acp.allowedAgents`.                                                                                                                                                        |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                              | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, vuelva a intentarlo.                                                                                                                                    |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                 | Mueva al hilo de destino o use `--thread auto`/`off`.                                                                                                                                                            |
| `Only <user-id> can rebind this thread.`                                    | Otro usuario es propietario del enlace del hilo.                                                    | Vincúlese como propietario o use un hilo diferente.                                                                                                                                                              |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de vinculación de hilos.                                           | Use `--thread off` o muévase a un adaptador/canal compatible.                                                                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en modo sandbox. | Use `runtime="subagent"` desde sesiones en modo sandbox, o ejecute el inicio de ACP desde una sesión que no esté en modo sandbox.                                                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                                  | Use `runtime="subagent"` para el modo sandbox requerido, o use ACP con `sandbox="inherit"` desde una sesión que no esté en modo sandbox.                                                                         |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión de ACP obsoletos/eliminados.                                                    | Vuelva a crear con `/acp spawn`, luego vincule/enfoque el hilo.                                                                                                                                                  |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejecuciones en una sesión de ACP no interactiva.                | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Consulte [Configuración de permisos](#permission-configuration).                                        |
| La sesión de ACP falla temprano con poco resultado                          | Las solicitudes de permiso están bloqueadas por `permissionMode`/`nonInteractivePermissions`.       | Compruebe los registros de la puerta de enlace para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión de ACP se bloquea indefinidamente después de completar el trabajo | El proceso del arnés finalizó, pero la sesión de ACP no informó la finalización.                    | Monitoree con `ps aux \| grep acpx`; mate manualmente los procesos estancados.                                                                                                                                   |

import es from "/components/footer/es.mdx";

<es />

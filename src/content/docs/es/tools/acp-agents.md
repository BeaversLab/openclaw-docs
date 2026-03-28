---
summary: "Use ACP runtime sessions for Pi, Claude Code, Codex, OpenCode, Gemini CLI, and other harness agents"
read_when:
  - Running coding harnesses through ACP
  - Setting up thread-bound ACP sessions on thread-capable channels
  - Binding Discord channels or Telegram forum topics to persistent ACP sessions
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP Agents"
---

# Agentes ACP

Las sesiones del [Protocolo de cliente de agente (ACP)](https://agentclientprotocol.com/) permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, OpenCode y Gemini CLI) a través de un complemento de backend ACP.

Si le pides a OpenClaw en lenguaje sencillo que "ejecute esto en Codex" o "inicie Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución del subagente nativo).

## Flujo de operación rápida

Use esto cuando desee un `/acp` manual práctico:

1. Iniciar una sesión:
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabajar en el hilo enlazado (o oriente esa clave de sesión explícitamente).
3. Verificar el estado de ejecución:
   - `/acp status`
4. Ajustar las opciones de ejecución según sea necesario:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Impulsar una sesión activa sin reemplazar el contexto:
   - `/acp steer tighten logging and continue`
6. Detener el trabajo:
   - `/acp cancel` (detener el turno actual), o
   - `/acp close` (cerrar sesión + eliminar enlaces)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Inicie una sesión persistente de Codex en un hilo aquí y manténgala enfocada".
- "Ejecute esto como una sesión ACP de Claude Code de un solo uso y resuma el resultado".
- "Use Gemini CLI para esta tarea en un hilo y luego mantenga las respuestas en ese mismo hilo".

Lo que OpenClaw debe hacer:

1. Elija `runtime: "acp"`.
2. Resuelva el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita el enlace de hilos y el canal actual lo admite, vincule la sesión ACP al hilo.
4. Enrutar los mensajes de seguimiento del hilo a esa misma sesión ACP hasta que se desenfoque/cierre/expiere.

## ACP versus subagentes

Use ACP cuando desee un tiempo de ejecución de arnés externo. Use subagentes cuando desee ejecuciones delegadas nativas de OpenClaw.

| Área                                   | Sesión ACP                                     | Ejecución de subagente                              |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Tiempo de ejecución                    | Complemento de backend ACP (por ejemplo, acpx) | Tiempo de ejecución de subagente nativo de OpenClaw |
| Clave de sesión                        | `agent:<agentId>:acp:<uuid>`                   | `agent:<agentId>:subagent:<uuid>`                   |
| Comandos principales                   | `/acp ...`                                     | `/subagents ...`                                    |
| Herramienta de generación (Spawn tool) | `sessions_spawn` con `runtime:"acp"`           | `sessions_spawn` (runtime predeterminado)           |

Consulte también [Subagentes](/es/tools/subagents).

## Sesiones vinculadas a hilos (agnósticas al canal)

Cuando los enlaces de hilos están activados para un adaptador de canal, las sesiones de ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- Perder el foco/cerrar/archivar/expiración por tiempo de inactividad o antigüedad máxima elimina el vínculo.

La compatibilidad con la vinculación de hilos es específica del adaptador. Si el adaptador de canal activo no admite vinculaciones de hilos, OpenClaw devuelve un mensaje claro de no admitido/no disponible.

Marcadores de características requeridas para ACP vinculado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado de forma predeterminada (establezca `false` para pausar el despacho de ACP)
- Marcador de generación de hilos ACP del adaptador de canal activado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales compatibles con hilos

- Cualquier adaptador de canal que exponga capacidad de vinculación de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas de foro en grupos/supergrupos y temas de mensajes directos)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

## Configuración específica del canal

Para flujos de trabajo no efímeros, configure vinculaciones ACP persistentes en entradas `bindings[]` de nivel superior.

### Modelo de vinculación

- `bindings[].type="acp"` marca una vinculación de conversación ACP persistente.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema de foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- `bindings[].agentId` es el ID del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran bajo `bindings[].acp`:
  - `mode` (`persistent` o `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Valores predeterminados de tiempo de ejecución por agente

Use `agents.list[].runtime` para definir los valores predeterminados de ACP una vez por agente:

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

- OpenClaw asegura que la sesión de ACP configurada exista antes de su uso.
- Los mensajes en ese canal o tema se enrutan a la sesión de ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión de ACP en su lugar.
- Las vinculaciones temporales de tiempo de ejecución (por ejemplo, las creadas por flujos de enfoque de hilos) aún se aplican donde están presentes.

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

- `runtime` por defecto es `subagent`, así que configure `runtime: "acp"` explícitamente para las sesiones de ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión de ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Se recurre a `acp.defaultAgent` si está configurado.
- `thread` (opcional, predeterminado `false`): solicita el flujo de vinculación de hilos donde sea compatible.
- `mode` (opcional): `run` (un solo uso) o `session` (persistente).
  - el valor predeterminado es `run`
  - si se omiten `thread: true` y el modo, OpenClaw puede adoptar por defecto un comportamiento persistente por ruta de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo de ejecución solicitado (validado por la política de backend/ejecución).
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de ejecución ACP inicial de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando está disponible, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) que puedes monitorear para el historial completo de retransmisión.

### Reanudar una sesión existente

Usa `resumeSessionId` para continuar una sesión ACP anterior en lugar de empezar de nuevo. El agente reproduce su historial de conversación a través de `session/load`, por lo que continúa con el contexto completo de lo que sucedió antes.

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
- Continuar una sesión de codificación que iniciaste de forma interactiva en la CLI, ahora sin interfaz a través de tu agente
- Retomar el trabajo que fue interrumpido por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversación ACP aguas arriba; `thread` y `mode` todavía se aplican normalmente a la nueva sesión OpenClaw que estás creando, así que `mode: "session"` todavía requiere `thread: true`.
- El agente objetivo debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la generación falla con un error claro; no hay retroceso silencioso a una nueva sesión.

### Prueba de humo del operador

Use esto después de un despliegue de puerta de enlace cuando quiera una verificación rápida en vivo de que la generación de ACP
está realmente funcionando de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta de enlace recomendada:

1. Verifique la versión/confirmación de la puerta de enlace desplegada en el host de destino.
2. Confirme que el código fuente desplegado incluye la aceptación del linaje de ACP en
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`).
3. Abra una sesión de puente ACPX temporal a un agente en vivo (por ejemplo
   `razor(main)` en `jpclawhq`).
4. Pida a ese agente que llame a `sessions_spawn` con:
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - tarea: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. Verifique que el agente informe:
   - `accepted=yes`
   - un `childSessionKey` real
   - sin error de validación
6. Limpie la sesión del puente ACPX temporal.

Ejemplo de instrucción para el agente en vivo:

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notas:

- Mantenga esta prueba de humo en `mode: "run"` a menos que esté intencionalmente probando
  sesiones ACP persistentes vinculadas a hilos.
- No requiera `streamTo: "parent"` para la puerta de enlace básica. Esa ruta depende de
  las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate las pruebas de `mode: "session"` vinculadas a hilos como un segundo pase de integración
  más rico desde un hilo de Discord real o un tema de Telegram.

## Compatibilidad con el espacio aislado (sandbox)

Las sesiones de ACP se ejecutan actualmente en el tiempo de ejecución del host, no dentro del espacio aislado de OpenClaw.

Limitaciones actuales:

- Si la sesión del solicitante está en un espacio aislado, las generaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no es compatible con `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución aplicada por espacio aislado.

### Desde el comando `/acp`

Use `/acp spawn` para un control explícito del operador desde el chat cuando sea necesario.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --thread here
```

Indicadores clave:

- `--mode persistent|oneshot`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Consulte [Comandos de barra diagonal](/es/tools/slash-commands).

## Resolución del objetivo de la sesión

La mayoría de las acciones de `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - clave de intentos
   - luego id de sesión con forma de UUID
   - luego etiqueta
2. Vinculación del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Alternativa de sesión del solicitante actual

Si ningún objetivo se resuelve, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de generación de hilos

`/acp spawn` soporta `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando sea compatible. |
| `here` | Requiere un hilo activo actual; falla si no se está en uno.                                                      |
| `off`  | Sin vinculación. La sesión se inicia sin vincular.                                                               |

Notas:

- En superficies sin vinculación de hilos, el comportamiento predeterminado es efectivamente `off`.
- La generación vinculada a hilos requiere soporte de política de canal:
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

`/acp status` muestra las opciones de tiempo de ejecución efectivas y, cuando están disponibles, los identificadores de sesión tanto a nivel de tiempo de ejecución como a nivel de backend.

Algunos controles dependen de las capacidades del backend. Si un backend no admite un control, OpenClaw devuelve un error claro de control no admitido.

## Libro de recetas de comandos ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                        |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación de hilo opcional.                              | `/acp spawn codex --mode persistent --thread auto --cwd /repo` |
| `/acp cancel`        | Cancelar el turno en curso para la sesión de destino.                        | `/acp cancel agent:codex:acp:<uuid>`                           |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests`  |
| `/acp close`         | Cerrar sesión y desvincular objetivos de hilo.                               | `/acp close`                                                   |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                  |
| `/acp set-mode`      | Establecer el modo de tiempo de ejecución para la sesión de destino.         | `/acp set-mode plan`                                           |
| `/acp set`           | Escritura genérica de opción de configuración de tiempo de ejecución.        | `/acp set model openai/gpt-5.2`                                |
| `/acp cwd`           | Establecer la anulación del directorio de trabajo de tiempo de ejecución.    | `/acp cwd /Users/user/Projects/repo`                           |
| `/acp permissions`   | Establecer el perfil de política de aprobación.                              | `/acp permissions strict`                                      |
| `/acp timeout`       | Establecer el tiempo de espera de tiempo de ejecución (segundos).            | `/acp timeout 120`                                             |
| `/acp model`         | Establecer la anulación del modelo de tiempo de ejecución.                   | `/acp model anthropic/claude-opus-4-6`                         |
| `/acp reset-options` | Eliminar anulaciones de opciones de tiempo de ejecución de la sesión.        | `/acp reset-options`                                           |
| `/acp sessions`      | Enumerar sesiones recientes de ACP del almacén.                              | `/acp sessions`                                                |
| `/acp doctor`        | Salud del backend, capacidades, correcciones accionables.                    | `/acp doctor`                                                  |
| `/acp install`       | Imprimir pasos de instalación y habilitación deterministas.                  | `/acp install`                                                 |

`/acp sessions` lee el almacén para la sesión vinculada actual o la sesión solicitante. Los comandos que aceptan tokens `session-key`, `session-id` o `session-label` resuelven los objetivos mediante el descubrimiento de sesiones de la puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un definidor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza directamente la anulación del cwd de tiempo de ejecución.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de anulación de cwd.
- `/acp reset-options` borra todas las anulaciones de tiempo de ejecución para la sesión de destino.

## soporte de harness acpx (actual)

Alias de harness integrados actuales de acpx:

- `pi`
- `claude`
- `codex`
- `opencode`
- `gemini`
- `kimi`

Cuando OpenClaw usa el backend acpx, prefiere estos valores para `agentId` a menos que tu configuración de acpx defina alias de agente personalizados.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de emergencia sin procesar es una función de la CLI de acpx (no la ruta normal `agentId` de OpenClaw).

## Configuración requerida

Línea base base de ACP:

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

La configuración de enlace de subprocesos es específica del adaptador del canal. Ejemplo para Discord:

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

Si la generación de ACP vinculada a subprocesos no funciona, verifique primero el indicador de función del adaptador:

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

### comando y versión de acpx configuración

De manera predeterminada, el complemento de backend acpx incluido (`acpx`) utiliza el binario anclado local del complemento:

1. El comando predeterminado es `extensions/acpx/node_modules/.bin/acpx`.
2. La versión esperada predeterminada es la ancla de la extensión.
3. El inicio registra el backend ACP inmediatamente como no listo.
4. Un trabajo de fondo de aseguramiento verifica `acpx --version`.
5. Si falta o no coincide el binario local del complemento, ejecuta:
   `npm install --omit=dev --no-save acpx@<pinned>` y vuelve a verificar.

Puede anular el comando/versión en la configuración del complemento:

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
- `expectedVersion: "any"` deshabilita la coincidencia estricta de versiones.
- Cuando `command` apunta a un binario/ruta personalizado, la autoinstalación local del complemento se deshabilita.
- El inicio de OpenClaw no se bloquea mientras se ejecuta la verificación de salud del backend.

Consulte [Plugins](/es/tools/plugin).

## Configuración de permisos

Las sesiones de ACP se ejecutan de manera no interactiva: no hay una TTY para aprobar o denegar los avisos de permisos de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

### `permissionMode`

Controla qué operaciones puede realizar el agente de arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                            |
| --------------- | ----------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.             |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren avisos. |
| `deny-all`      | Denegar todos los avisos de permisos.                                                     |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría un aviso de permiso pero no hay ninguna TTY interactiva disponible (lo cual siempre es el caso para las sesiones de ACP).

| Valor  | Comportamiento                                                         |
| ------ | ---------------------------------------------------------------------- |
| `fail` | Abortar la sesión con `AcpRuntimeError`. **(predeterminado)**          |
| `deny` | Denegar silenciosamente el permiso y continuar (degradación elegante). |

### Configuración

Establecer a través de la configuración del complemento:

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Reinicie la puerta de enlace después de cambiar estos valores.

> **Importante:** Actualmente, OpenClaw tiene como valor predeterminado `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active un aviso de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesita restringir permisos, establezca `nonInteractivePermissions` en `deny` para que las sesiones se degraden elegantemente en lugar de fallar.

## Solución de problemas

| Síntoma                                                                  | Causa probable                                                                                 | Solución                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                  | Falta el complemento de backend o está deshabilitado.                                          | Instale y habilite el complemento de backend, luego ejecute `/acp doctor`.                                                                                                                            |
| `ACP is disabled by policy (acp.enabled=false)`                          | ACP deshabilitado globalmente.                                                                 | Establezca `acp.enabled=true`.                                                                                                                                                                        |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`        | Despacho desde mensajes de hilos normales deshabilitado.                                       | Establezca `acp.dispatch.enabled=true`.                                                                                                                                                               |
| `ACP agent "<id>" is not allowed by policy`                              | Agente no está en la lista de permitidos.                                                      | Use `agentId` permitidos o actualice `acp.allowedAgents`.                                                                                                                                             |
| `Unable to resolve session target: ...`                                  | Token de clave/id/etiqueta incorrecto.                                                         | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, vuelva a intentar.                                                                                                                           |
| `--thread here requires running /acp spawn inside an active ... thread`  | `--thread here` usado fuera de un contexto de hilo.                                            | Mueva al hilo de destino o use `--thread auto`/`off`.                                                                                                                                                 |
| `Only <user-id> can rebind this thread.`                                 | Otro usuario posee el enlace del hilo.                                                         | Vuelva a vincular como propietario o use un hilo diferente.                                                                                                                                           |
| `Thread bindings are unavailable for <channel>.`                         | El adaptador carece de capacidad de vinculación de hilos.                                      | Use `--thread off` o muévase a un adaptador/canal compatible.                                                                                                                                         |
| `Sandboxed sessions cannot spawn ACP sessions ...`                       | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en sandbox. | Use `runtime="subagent"` desde sesiones en sandbox, o ejecute el spawn de ACP desde una sesión que no esté en sandbox.                                                                                |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`  | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                             | Use `runtime="subagent"` para el sandboxing requerido, o use ACP con `sandbox="inherit"` desde una sesión que no esté en sandbox.                                                                     |
| Faltan metadatos de ACP para la sesión vinculada                         | Metadatos de sesión de ACP obsoletos/eliminados.                                               | Vuelva a crear con `/acp spawn`, luego vuelva a vincular/enfocar el hilo.                                                                                                                             |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode` | `permissionMode` bloquea escrituras/ejecuciones en una sesión ACP no interactiva.              | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie el gateway. Consulte [Configuración de permisos](#permission-configuration).                                      |
| La sesión ACP falla temprano con poca salida                             | Los mensajes de permiso están bloqueados por `permissionMode`/`nonInteractivePermissions`.     | Verifique los registros del gateway para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión ACP se detiene indefinidamente después de completar el trabajo | El proceso del arnés finalizó pero la sesión ACP no reportó la finalización.                   | Supervisar con `ps aux \| grep acpx`; finalizar manualmente los procesos obsoletos.                                                                                                                   |

---
summary: "Use sesiones de tiempo de ejecución de ACP para Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP y otros agentes de arnés"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "Agentes ACP"
---

# Agentes ACP

Las sesiones del [Protocolo de cliente de agente (ACP)](https://agentclientprotocol.com/) permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI y otros arneses ACPX compatibles) a través de un complemento de backend de ACP.

Si le pides a OpenClaw en lenguaje sencillo que "ejecuta esto en Codex" o "inicia Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución del subagente nativo). Cada inicio de sesión de ACP se rastrea como una [tarea en segundo plano](/en/automation/tasks).

Si deseas que Codex o Claude Code se conecten como cliente MCP externo directamente
a las conversaciones del canal OpenClaw existentes, usa [`openclaw mcp serve`](/en/cli/mcp)
en lugar de ACP.

## Flujo de operador rápido

Use esto cuando desee un manual de operaciones `/acp` práctico:

1. Iniciar una sesión:
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabaja en la conversación o hilo vinculado (u objetivo esa clave de sesión explícitamente).
3. Verificar el estado de tiempo de ejecución:
   - `/acp status`
4. Ajustar las opciones de tiempo de ejecución según sea necesario:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Empujar una sesión activa sin reemplazar el contexto:
   - `/acp steer tighten logging and continue`
6. Detener el trabajo:
   - `/acp cancel` (detener el turno actual), o
   - `/acp close` (cerrar sesión + eliminar enlaces)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Vincula este canal de Discord a Codex".
- "Inicia una sesión persistente de Codex en un hilo aquí y manténla enfocada".
- "Ejecuta esto como una sesión ACP de Claude Code de un solo uso y resume el resultado".
- "Vincula este chat de iMessage a Codex y mantén los seguimientos en el mismo espacio de trabajo".
- "Usa Gemini CLI para esta tarea en un hilo y luego mantén los seguimientos en ese mismo hilo".

Lo que OpenClaw debe hacer:

1. Elegir `runtime: "acp"`.
2. Resolver el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita el enlace de conversación actual y el canal activo lo admite, vincule la sesión de ACP a esa conversación.
4. De lo contrario, si se solicita el enlace de hilo y el canal actual lo admite, vincule la sesión de ACP al hilo.
5. Envíe los mensajes de seguimiento vinculados a esa misma sesión de ACP hasta que se desenfoque/cierre/expires.

## ACP versus sub-agentes

Use ACP cuando desee un tiempo de ejecución de arnés externo. Use sub-agentes cuando desee ejecuciones delegadas nativas de OpenClaw.

| Área                      | Sesión ACP                                     | Ejecución de sub-agente                               |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución       | Complemento de backend ACP (por ejemplo, acpx) | Tiempo de ejecución de sub-agente nativo de OpenClaw  |
| Clave de sesión           | `agent:<agentId>:acp:<uuid>`                   | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales      | `/acp ...`                                     | `/subagents ...`                                      |
| Herramienta de generación | `sessions_spawn` con `runtime:"acp"`           | `sessions_spawn` (tiempo de ejecución predeterminado) |

Véase también [Sub-agentes](/en/tools/subagents).

## Sesiones vinculadas

### Vínculos de conversación actual

Use `/acp spawn <harness> --bind here` cuando desee que la conversación actual se convierta en un espacio de trabajo ACP duradero sin crear un hilo secundario.

Comportamiento:

- OpenClaw sigue siendo el propietario del transporte, la autenticación, la seguridad y la entrega del canal.
- La conversación actual está fijada a la clave de sesión de ACP generada.
- Los mensajes de seguimiento en esa conversación se envían a la misma sesión de ACP.
- `/new` y `/reset` restablecen la misma sesión de ACP vinculada en su lugar.
- `/acp close` cierra la sesión y elimina el enlace de conversación actual.

Lo que esto significa en la práctica:

- `--bind here` mantiene la misma superficie de chat. En Discord, el canal actual sigue siendo el canal actual.
- `--bind here` todavía puede crear una nueva sesión de ACP si está generando un trabajo nuevo. El enlace adjunta esa sesión a la conversación actual.
- `--bind here` no crea un hilo secundario de Discord ni un tema de Telegram por sí solo.
- El tiempo de ejecución de ACP todavía puede tener su propio directorio de trabajo (`cwd`) o un espacio de trabajo administrado por el backend en el disco. Ese espacio de trabajo de tiempo de ejecución es independiente de la superficie de chat y no implica un nuevo hilo de mensajería.

Modelo mental:

- superficie de chat: donde la gente sigue hablando (`Discord channel`, `Telegram topic`, `iMessage chat`)
- sesión ACP: el estado de ejecución duradero de Codex/Claude/Gemini al que OpenClaw enruta
- hilo/tema secundario: una superficie de mensajería adicional opcional creada solo por `--thread ...`
- espacio de trabajo de tiempo de ejecución: la ubicación del sistema de archivos donde se ejecuta el arnés (`cwd`, repo checkout, backend workspace)

Ejemplos:

- `/acp spawn codex --bind here`: mantener este chat, generar o adjuntar una sesión ACP de Codex y enrutar los mensajes futuros aquí hacia ella
- `/acp spawn codex --thread auto`: OpenClaw puede crear un hilo/tema secundario y vincular la sesión ACP allí
- `/acp spawn codex --bind here --cwd /workspace/repo`: mismo enlace de chat que el anterior, pero Codex se ejecuta en `/workspace/repo`

Soporte de enlace de conversación actual:

- Los canales de chat/mensajes que anuncian soporte de enlace de conversación actual pueden usar `--bind here` a través de la ruta compartida de enlace de conversación.
- Los canales con semántica de hilo/tema personalizada aún pueden proporcionar canonización específica del canal detrás de la misma interfaz compartida.
- `--bind here` siempre significa "vincular la conversación actual en su lugar".
- Los enlaces de conversación actuales genéricos utilizan el almacenamiento de enlaces compartido de OpenClaw y sobreviven a los reinicios normales de la puerta de enlace.

Notas:

- `--bind here` y `--thread ...` son mutuamente excluyentes en `/acp spawn`.
- En Discord, `--bind here` vincula el canal o hilo actual en su lugar. `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear un hilo secundario para `--thread auto|here`.
- Si el canal activo no expone enlaces ACP de conversación actual, OpenClaw devuelve un mensaje claro de no soportado.
- Las preguntas `resume` y de "nueva sesión" son preguntas de sesión ACP, no preguntas del canal. Puede reutilizar o reemplazar el estado de tiempo de ejecución sin cambiar la superficie de chat actual.

### Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- Desenfocar/cerrar/archivar/expiración por tiempo de inactividad o antigüedad máxima elimina el enlace.

La compatibilidad con enlaces de hilos es específica del adaptador. Si el adaptador de canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no compatible/no disponible.

Marcadores de función obligatorios para ACP ligado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado por defecto (establezca `false` para pausar el despacho de ACP)
- Marcador de creación de hilos ACP del adaptador de canal activado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales compatibles con hilos

- Cualquier adaptador de canal que exponga capacidad de enlace de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas de foro en grupos/supergrupos y temas de MD)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de enlace.

## Configuración específica del canal

Para flujos de trabajo no efímeros, configure enlaces ACP persistentes en las entradas `bindings[]` de nivel superior.

### Modelo de enlace

- `bindings[].type="acp"` marca un enlace de conversación ACP persistente.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema de foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - Chat de grupo/MD de BlueBubbles: `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefieren `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
  - Chat de grupo/MD de iMessage: `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` para enlaces de grupo estables.
- `bindings[].agentId` es el id del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran bajo `bindings[].acp`:
  - `mode` (`persistent` o `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Valores predeterminados de ejecución por agente

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

- OpenClaw asegura que la sesión ACP configurada exista antes de su uso.
- Los mensajes en ese canal o tema se enrutan a la sesión ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión ACP en su lugar.
- Los enlaces temporales de tiempo de ejecución (por ejemplo, creados por flujos de enfoque de hilos) aún se aplican donde están presentes.

## Iniciar sesiones ACP (interfaces)

### Desde `sessions_spawn`

Use `runtime: "acp"` para iniciar una sesión ACP desde un turno de agente o una llamada de herramienta.

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

- `runtime` se predetermina a `subagent`, así que establezca `runtime: "acp"` explícitamente para sesiones ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Recurre a `acp.defaultAgent` si está establecido.
- `thread` (opcional, predeterminado `false`): solicitar flujo de vinculación de hilo donde sea compatible.
- `mode` (opcional): `run` (único) o `session` (persistente).
  - el valor predeterminado es `run`
  - si `thread: true` y el modo se omiten, OpenClaw puede predeterminar al comportamiento persistente por ruta de tiempo de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo de tiempo de ejecución solicitado (validado por la política de backend/tiempo de ejecución).
- `label` (opcional): etiqueta orientada al operador que se usa en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de ejecución ACP inicial de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando están disponibles, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) del cual puedes hacer un seguimiento para ver el historial de retransmisión completo.

### Reanudar una sesión existente

Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de comenzar desde cero. El agente reproduce su historial de conversación a través de `session/load`, por lo que continúa con el contexto completo de lo que sucedió antes.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transferir una sesión de Codex de tu computadora portátil a tu teléfono: dile a tu agente que continúe donde lo dejaste
- Continuar una sesión de codificación que iniciaste de forma interactiva en la CLI, ahora de forma desatendida a través de tu agente
- Retomar el trabajo que se interrumpió por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversación ACP aguas arriba; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que estás creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la creación falla con un error claro; no hay una reserva silenciosa a una nueva sesión.

### Prueba de humo del operador

Use esto después de un despliegue de puerta de enlace cuando desee una verificación rápida en vivo de que la creación de ACP
está funcionando realmente de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta de enlace recomendada:

1. Verifique la versión/confirmación (commit) implementada de la puerta de enlace en el host de destino.
2. Confirme que el código fuente implementado incluye la aceptación del linaje de ACP en
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
   - ningún error de validación
6. Limpie la sesión del puente ACPX temporal.

Ejemplo de aviso (prompt) para el agente en vivo:

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notas:

- Mantenga esta prueba de humo en `mode: "run"` a menos que esté probando intencionalmente
  sesiones ACP persistentes vinculadas a hilos.
- No requiera `streamTo: "parent"` para la puerta de enlace básica. Esa ruta depende de
  las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate las pruebas de `mode: "session"` vinculadas a hilos como una segunda pasada de integración
  más rica desde un hilo real de Discord o tema de Telegram.

## Compatibilidad con el sandbox

Las sesiones de ACP actualmente se ejecutan en el tiempo de ejecución del host, no dentro del sandbox de OpenClaw.

Limitaciones actuales:

- Si la sesión solicitante está en sandbox, las generaciones de ACP están bloqueadas tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución impuesta por el sandbox.

### Desde el comando `/acp`

Use `/acp spawn` para el control explícito del operador desde el chat cuando sea necesario.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --bind here
/acp spawn codex --thread here
```

Indicadores clave:

- `--mode persistent|oneshot`
- `--bind here|off`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Consulte [Comandos de barra](/en/tools/slash-commands).

## Resolución del objetivo de la sesión

La mayoría de las acciones de `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta la clave
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Enlace del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Reserva de sesión del solicitante actual

Los enlaces de conversación actual y los enlaces de hilos participan ambos en el paso 2.

Si no se resuelve ningún objetivo, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de enlace de generación

`/acp spawn` es compatible con `--bind here|off`.

| Modo   | Comportamiento                                                                   |
| ------ | -------------------------------------------------------------------------------- |
| `here` | Vincula la conversación activa actual en su lugar; falla si ninguna está activa. |
| `off`  | No cree un enlace de conversación actual.                                        |

Notas:

- `--bind here` es la ruta de operador más simple para "hacer que este canal o chat sea compatible con Codex".
- `--bind here` no crea un hilo secundario.
- `--bind here` solo está disponible en canales que exponen soporte de enlace de conversación actual.
- `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

## Modos de hilo de generación

`/acp spawn` es compatible con `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: vincula ese hilo. Fuera de un hilo: crea/vincula un hilo secundario cuando sea compatible. |
| `here` | Requiere hilo activo actual; falla si no está en uno.                                                         |
| `off`  | Sin enlace. La sesión comienza sin vincular.                                                                  |

Notas:

- En superficies sin enlace de hilos, el comportamiento predeterminado es efectivamente `off`.
- La generación vinculada a hilos requiere el soporte de la política del canal:
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
- Use `--bind here` cuando desee fijar la conversación actual sin crear un hilo secundario.

## Controles ACP

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

| Comando              | Lo que hace                                                                  | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación actual opcional o vinculación de hilo.         | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar el turno en curso para la sesión de destino.                        | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos de hilo.                               | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer el modo de tiempo de ejecución para la sesión de destino.         | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura genérica de opción de configuración de tiempo de ejecución.        | `/acp set model openai/gpt-5.2`                               |
| `/acp cwd`           | Establecer la anulación del directorio de trabajo de tiempo de ejecución.    | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer el perfil de política de aprobación.                              | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer el tiempo de espera de tiempo de ejecución (segundos).            | `/acp timeout 120`                                            |
| `/acp model`         | Establecer la anulación del modelo de tiempo de ejecución.                   | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Quitar anulaciones de opciones de tiempo de ejecución de la sesión.          | `/acp reset-options`                                          |
| `/acp sessions`      | Listar las sesiones recientes de ACP desde el almacén.                       | `/acp sessions`                                               |
| `/acp doctor`        | Estado del backend, capacidades, correcciones accionables.                   | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos de instalación y habilitación deterministas.                  | `/acp install`                                                |

`/acp sessions` lee el almacén para la sesión vinculada actual o solicitante. Los comandos que aceptan tokens `session-key`, `session-id` o `session-label` resuelven los objetivos a través del descubrimiento de sesiones de la puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un establecedor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza la anulación de cwd del tiempo de ejecución directamente.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de anulación de cwd.
- `/acp reset-options` borra todas las anulaciones de tiempo de ejecución para la sesión de destino.

## soporte de arnés acpx (actual)

Alias de arnés integrados actuales de acpx:

- `claude`
- `codex`
- `copilot`
- `cursor` (Cursor CLI: `cursor-agent acp`)
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

Cuando OpenClaw usa el backend acpx, prefiera estos valores para `agentId` a menos que su configuración de acpx defina alias de agente personalizados.
Si su instalación local de Cursor todavía expone ACP como `agent acp`, anule el comando de agente `cursor` en su configuración de acpx en lugar de cambiar el valor predeterminado integrado.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape raw es una característica de la CLI de acpx (no la ruta normal `agentId` de OpenClaw).

## Configuración requerida

Línea base básica de ACP:

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: ["claude", "codex", "copilot", "cursor", "droid", "gemini", "iflow", "kilocode", "kimi", "kiro", "openclaw", "opencode", "pi", "qwen"],
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

La configuración de enlace de hilo (thread binding) es específica del adaptador del canal. Ejemplo para Discord:

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

Si la generación de ACP vinculada al hilo (thread-bound) no funciona, verifique primero el indicador de característica del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Los enlaces de conversación actual (current-conversation binds) no requieren la creación de hilos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga enlaces de conversión ACP.

Consulte [Referencia de configuración](/en/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Instalar y habilitar el complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación del espacio de trabajo local durante el desarrollo:

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Luego verifique el estado del backend:

```text
/acp doctor
```

### comando y configuración de versión de acpx

De forma predeterminada, el complemento del backend acpx incluido (`acpx`) usa el binario fijado local del complemento:

1. El comando usa de forma predeterminada el `node_modules/.bin/acpx` local del complemento dentro del paquete del complemento ACPX.
2. La versión esperada usa de forma predeterminada la fijación de la extensión.
3. El inicio registra el backend ACP inmediatamente como no listo.
4. Un trabajo de segundo plano de aseguramiento verifica `acpx --version`.
5. Si falta el binario local del complemento o no coincide, ejecuta:
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
- `expectedVersion: "any"` desactiva la coincidencia estricta de versiones.
- Cuando `command` apunta a un binario/ruta personalizado, la autoinstalación local del complemento se desactiva.
- El inicio de OpenClaw permanece sin bloqueo mientras se ejecuta la verificación de estado del backend.

Consulte [Plugins](/en/tools/plugin).

### Instalación automática de dependencias

Cuando instala OpenClaw globalmente con `npm install -g openclaw`, las dependencias
del tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente
mediante un gancho de postinstalación. Si la instalación automática falla, la puerta de enlace aún se inicia
normalmente e informa la dependencia faltante a través de `openclaw acp doctor`.

### Puente MCP de herramientas de complementos

De manera predeterminada, las sesiones de ACPX **no** exponen las herramientas registradas por complementos de OpenClaw al
arnés de ACP.

Si desea que los agentes de ACP, como Codex o Claude Code, llamen a las herramientas de complementos
de OpenClaw instaladas, como recuperación/almacenamiento de memoria, habilite el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que esto hace:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en el arranque de
  la sesión ACPX.
- Expone las herramientas de complementos ya registradas por los complementos
  de OpenClaw instalados y habilitados.
- Mantiene la función explícita y deshabilitada de forma predeterminada.

Notas de seguridad y confianza:

- Esto expande la superficie de herramientas del arnés de ACP.
- Los agentes de ACP obtienen acceso solo a las herramientas de complementos ya activas en la puerta de enlace.
- Trate esto con el mismo límite de confianza que permitir que esos complementos se ejecuten en
  OpenClaw mismo.
- Revise los complementos instalados antes de habilitarlo.

Las `mcpServers` personalizadas todavía funcionan como antes. El puente de herramientas de complementos integrado es una
conveniencia opcional adicional, no un reemplazo para la configuración genérica del servidor MCP.

## Configuración de permisos

Las sesiones de ACP se ejecutan de manera no interactiva: no hay TTY para aprobar o denegar las solicitudes de permiso de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

Estos permisos del arnés ACPX son independientes de las aprobaciones de ejecución de OpenClaw e independientes de los indicadores de omisión del proveedor de backend de CLI, como `--permission-mode bypassPermissions` de Claude CLI. `approve-all` de ACPX es el interruptor de emergencia a nivel de arnés para las sesiones de ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente del arnés sin preguntar.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y los comandos de shell.              |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla lo que sucede cuando se mostraría un mensaje de permiso pero no hay ningún TTY interactivo disponible (lo cual siempre es el caso de las sesiones de ACP).

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

> **Importante:** OpenClaw actualmente tiene como valores predeterminados `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active un mensaje de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesita restringir permisos, establezca `nonInteractivePermissions` en `deny` para que las sesiones se degraden elegantemente en lugar de bloquearse.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                         | Solución                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                     | Falta el complemento de backend o está deshabilitado.                                                  | Instale y habilite el complemento de backend, luego ejecute `/acp doctor`.                                                                                                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                         | Establezca `acp.enabled=true`.                                                                                                                                                                                           |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho desde mensajes de hilos normales deshabilitado.                                               | Establezca `acp.dispatch.enabled=true`.                                                                                                                                                                                  |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                                   | Use un `agentId` permitido o actualice `acp.allowedAgents`.                                                                                                                                                              |
| `Unable to resolve session target: ...`                                     | Token de clave/ID/etiqueta incorrecto.                                                                 | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, reintente.                                                                                                                                                      |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación vinculable activa.                                            | Mueva al chat/canal de destino y reintente, o use un inicio no vinculado.                                                                                                                                                |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de vinculación ACP de conversación actual.                            | Use `/acp spawn ... --thread ...` donde sea compatible, configure `bindings[]` de nivel superior, o muévase a un canal compatible.                                                                                       |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                    | Mueva al hilo de destino o use `--thread auto`/`off`.                                                                                                                                                                    |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es el propietario del objetivo de vinculación activo.                                     | Vuelva a vincular como propietario o utilice una conversación o hilo diferente.                                                                                                                                          |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de vinculación de hilos.                                              | Use `--thread off` o cambie a un adaptador/canal compatible.                                                                                                                                                             |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en espacio aislado. | Use `runtime="subagent"` desde sesiones en espacio aislado, o ejecute el inicio de ACP desde una sesión que no esté en espacio aislado.                                                                                  |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                                     | Use `runtime="subagent"` para el aislamiento requerido, o use ACP con `sandbox="inherit"` desde una sesión que no esté en espacio aislado.                                                                               |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión de ACP obsoletos/eliminados.                                                       | Vuelva a crear con `/acp spawn` y luego vuelva a vincular/enfocar el hilo.                                                                                                                                               |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejecuciones en una sesión de ACP no interactiva.                   | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Consulte [Configuración de permisos](#permission-configuration).                                                |
| La sesión de ACP falla poco después con poca salida                         | Las solicitudes de permiso están bloqueadas por `permissionMode`/`nonInteractivePermissions`.          | Verifique los registros de la puerta de enlace para ver `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para una degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión de ACP se detiene indefinidamente después de completar el trabajo | El proceso del arnés finalizó pero la sesión de ACP no reportó la finalización.                        | Monitoree con `ps aux \| grep acpx`; elimine los procesos obsoletos manualmente.                                                                                                                                         |

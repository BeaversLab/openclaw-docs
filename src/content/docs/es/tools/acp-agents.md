---
summary: "Utilice sesiones del runtime ACP para Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP y otros agentes de arnés"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP Agents"
---

# Agentes ACP

Las sesiones del [Protocolo de cliente de agente (ACP)](https://agentclientprotocol.com/) permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI y otros arneses ACPX compatibles) a través de un complemento de backend ACP.

Si le pides a OpenClaw en lenguaje sencillo que "ejecute esto en Codex" o "inicie Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución del subagente nativo).

Si desea que Codex o Claude Code se conecten como cliente MCP externo directamente
a las conversaciones del canal OpenClaw existentes, use [`openclaw mcp serve`](/en/cli/mcp)
en lugar de ACP.

## Flujo de operador rápido

Use esto cuando quiera un manual de procedimientos `/acp` práctico:

1. Iniciar una sesión:
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabaje en la conversación o hilo enlazado (o diríjase explícitamente a esa clave de sesión).
3. Verificar el estado del runtime:
   - `/acp status`
4. Ajustar las opciones del runtime según sea necesario:
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

- "Vincula este canal de Discord a Codex."
- "Inicie una sesión persistente de Codex en un hilo aquí y manténgala enfocada."
- "Ejecute esto como una sesión ACP de Claude Code de un solo uso y resuma el resultado."
- "Vincule este chat de iMessage a Codex y mantenga las seguimientos en el mismo espacio de trabajo."
- "Use Gemini CLI para esta tarea en un hilo, luego mantenga las seguimientos en ese mismo hilo."

Lo que OpenClaw debe hacer:

1. Elija `runtime: "acp"`.
2. Resuelva el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita el enlace de la conversación actual y el canal activo lo admite, vincule la sesión ACP a esa conversación.
4. De lo contrario, si se solicita el enlace de hilo y el canal actual lo admite, vincule la sesión ACP al hilo.
5. Enrute los mensajes vinculados de seguimiento a esa misma sesión ACP hasta que deje de estar enfocada/cerrada/expirada.

## ACP versus sub-agentes

Use ACP cuando desee un tiempo de ejecución de arnés externo. Use sub-agentes cuando desee ejecuciones delegadas nativas de OpenClaw.

| Área                                   | Sesión ACP                                    | Ejecución de sub-agente                               |
| -------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución                    | Complemento de backend ACP (por ejemplo acpx) | Tiempo de ejecución de sub-agente nativo de OpenClaw  |
| Clave de sesión                        | `agent:<agentId>:acp:<uuid>`                  | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales                   | `/acp ...`                                    | `/subagents ...`                                      |
| Herramienta de generación (Spawn tool) | `sessions_spawn` con `runtime:"acp"`          | `sessions_spawn` (tiempo de ejecución predeterminado) |

Véase también [Sub-agentes](/en/tools/subagents).

## Sesiones vinculadas

### Vinculaciones de conversación actual

Use `/acp spawn <harness> --bind here` cuando desee que la conversación actual se convierta en un espacio de trabajo ACP duradero sin crear un hilo secundario.

Comportamiento:

- OpenClaw sigue siendo propietario del transporte del canal, la autenticación, la seguridad y la entrega.
- La conversación actual se fija a la clave de sesión ACP generada.
- Los mensajes de seguimiento en esa conversación se dirigen a la misma sesión ACP.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión y elimina la vinculación de la conversación actual.

Lo que esto significa en la práctica:

- `--bind here` mantiene la misma superficie de chat. En Discord, el canal actual sigue siendo el canal actual.
- `--bind here` aún puede crear una nueva sesión ACP si está generando trabajo nuevo. La vinculación adjunta esa sesión a la conversación actual.
- `--bind here` no crea por sí mismo un hilo secundario de Discord o un tema de Telegram.
- El tiempo de ejecución de ACP aún puede tener su propio directorio de trabajo (`cwd`) o un espacio de trabajo gestionado por el backend en el disco. Ese espacio de trabajo de tiempo de ejecución es independiente de la superficie de chat y no implica un nuevo hilo de mensajería.

Modelo mental:

- superficie de chat: donde la gente sigue hablando (`Discord channel`, `Telegram topic`, `iMessage chat`)
- sesión ACP: el estado de ejecución duradero de Codex/Claude/Gemini al que OpenClaw dirige
- hilo/tema secundario: una superficie de mensajería adicional opcional creada solo por `--thread ...`
- espacio de trabajo de tiempo de ejecución: la ubicación del sistema de archivos donde se ejecuta el arnés (`cwd`, repositorio checkout, espacio de trabajo del backend)

Ejemplos:

- `/acp spawn codex --bind here`: mantén este chat, inicia o adjunta una sesión ACP de Codex y enruta los mensajes futuros aquí hacia ella
- `/acp spawn codex --thread auto`: OpenClaw puede crear un hilo/tema hijo y vincular la sesión ACP allí
- `/acp spawn codex --bind here --cwd /workspace/repo`: mismo vínculo de chat que el anterior, pero Codex se ejecuta en `/workspace/repo`

Soporte de vinculación de conversación actual:

- Los canales de chat/mensajes que anuncian soporte de vinculación de conversación actual pueden usar `--bind here` a través de la ruta compartida de vinculación de conversación.
- Los canales con semánticas personalizadas de hilo/tema aún pueden proporcionar canonicalización específica del canal detrás de la misma interfaz compartida.
- `--bind here` siempre significa "vincular la conversación actual en su lugar".
- Los vínculos genéricos de conversación actual usan el almacén de vinculación compartido de OpenClaw y sobreviven a los reinicios normales de la puerta de enlace.

Notas:

- `--bind here` y `--thread ...` son mutuamente excluyentes en `/acp spawn`.
- En Discord, `--bind here` vincula el canal o hilo actual en su lugar. `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear un hilo hijo para `--thread auto|here`.
- Si el canal activo no expone vínculos ACP de conversación actual, OpenClaw devuelve un mensaje claro de no soportado.
- `resume` y las preguntas de "nueva sesión" son preguntas de sesión ACP, no preguntas del canal. Puedes reutilizar o reemplazar el estado de tiempo de ejecución sin cambiar la superficie de chat actual.

### Sesiones ligadas a hilos

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- El desenfoque/cierre/archivamiento/tiempo de espera de inactividad o la expiración por antigüedad máxima eliminan el enlace.

La compatibilidad con la vinculación de hilos es específica del adaptador. Si el adaptador del canal activo no admite la vinculación de hilos, OpenClaw devuelve un mensaje claro de no admitido/no disponible.

Marcadores de función requeridos para ACP ligado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado de forma predeterminada (establece `false` para pausar el envío de ACP)
- Marcador de generación de hilos ACP del adaptador de canal habilitado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales compatibles con hilos

- Cualquier adaptador de canal que exponga capacidad de vinculación de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas del foro en grupos/supergrupos y temas de MD)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

## Configuración específica del canal

Para flujos de trabajo no efímeros, configura enlaces ACP persistentes en entradas de `bindings[]` de nivel superior.

### Modelo de vinculación

- `bindings[].type="acp"` marca una vinculación de conversación ACP persistente.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema del foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - Chat privado/grupo de BlueBubbles: `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
  - Chat privado/grupo de iMessage: `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` para enlaces de grupo estables.
- `bindings[].agentId` es el ID del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran en `bindings[].acp`:
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

- OpenClaw garantiza que la sesión de ACP configurada exista antes de su uso.
- Los mensajes en ese canal o tema se enrutan a la sesión de ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión ACP en su lugar.
- Los enlaces de tiempo de ejecución temporales (por ejemplo, los creados por flujos de enfoque de hilos) todavía se aplican donde están presentes.

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

- `runtime` por defecto es `subagent`, así que establezca `runtime: "acp"` explícitamente para sesiones ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Recurre a `acp.defaultAgent` si está configurado.
- `thread` (opcional, por defecto `false`): solicita el flujo de enlace de hilo donde sea compatible.
- `mode` (opcional): `run` (un solo disparo) o `session` (persistente).
  - por defecto es `run`
  - si se omiten `thread: true` y el modo, OpenClaw puede tener un comportamiento persistente por defecto según la ruta de tiempo de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo en tiempo de ejecución solicitado (validado por la política del backend/tiempo de ejecución).
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de ejecución ACP iniciales de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando están disponibles, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) del cual puedes seguir el historial de retransmisión completo.

### Reanudar una sesión existente

Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de comenzar de nuevo. El agente reproduce su historial de conversación a través de `session/load`, por lo que reanuda con el contexto completo de lo que ocurrió anteriormente.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transfiere una sesión de Codex de tu laptop a tu teléfono — dile a tu agente que reanude donde lo dejaste
- Continúa una sesión de codificación que iniciaste de forma interactiva en la CLI, ahora sin interfaz gráfica a través de tu agente
- Reanuda el trabajo que se vio interrumpido por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversaciones ACP ascendente; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que estás creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la generación falla con un error claro; no hay una reserva silenciosa a una nueva sesión.

### Prueba de humo del operador

Úsalo después de un despliegue de puerta de enlace cuando quieras una verificación rápida en vivo de que la generación de ACP
realmente está funcionando de extremo a extremo, no solo pasando pruebas unitarias.

Puerta de enlace recomendada:

1. Verifica la versión/confirmación de la puerta de enlace desplegada en el host de destino.
2. Confirme que la fuente implementada incluye la aceptación del linaje ACP en
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

Ejemplo de aviso para el agente en vivo:

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notas:

- Mantenga esta prueba de humo en `mode: "run"` a menos que esté probando intencionalmente
  sesiones ACP persistentes vinculadas a hilos.
- No exija `streamTo: "parent"` para la puerta de enlace básica. Esa ruta depende de
  las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate las pruebas `mode: "session"` vinculadas a hilos como una segunda pasada de integración
  más rica desde un hilo de Discord real o un tema de Telegram.

## Compatibilidad con el entorno limitado (sandbox)

Las sesiones ACP se ejecutan actualmente en el tiempo de ejecución del host, no dentro del entorno limitado (sandbox) de OpenClaw.

Limitaciones actuales:

- Si la sesión del solicitante está en un entorno limitado (sandbox), las creaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` when you need sandbox-enforced execution.

### Desde el comando `/acp`

Use `/acp spawn` para un control explícito del operador desde el chat cuando sea necesario.

```text
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --bind here
/acp spawn codex --thread here
```

Key flags:

- `--mode persistent|oneshot`
- `--bind here|off`
- `--thread auto|here|off`
- `--cwd <absolute-path>`
- `--label <name>`

Consulte [Slash Commands](/en/tools/slash-commands).

## Resolución del destino de la sesión

La mayoría de las acciones de `/acp` aceptan un destino de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de destino explícito (o `--session` para `/acp steer`)
   - intenta clave
   - luego el id de sesión con forma de UUID
   - luego etiqueta
2. Vinculación del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Reserva de sesión del solicitante actual

Los enlaces de conversación actual y los enlaces de hilo participan ambos en el paso 2.

Si no se resuelve ningún destino, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de vinculación de generación

`/acp spawn` admite `--bind here|off`.

| Modo   | Comportamiento                                                                   |
| ------ | -------------------------------------------------------------------------------- |
| `here` | Vincula la conversación activa actual en su lugar; falla si ninguna está activa. |
| `off`  | No crear un vinculación de conversación actual.                                  |

Notas:

- `--bind here` es la ruta de operador más simple para "hacer que este canal o chat tenga soporte de Codex".
- `--bind here` no crea un hilo secundario.
- `--bind here` solo está disponible en canales que exponen soporte de vinculación de conversación actual.
- `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

## Modos de generación de hilos

`/acp spawn` admite `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando sea compatible. |
| `here` | Requiere el hilo activo actual; falla si no se está en uno.                                                      |
| `off`  | Sin vinculación. La sesión se inicia sin vincular.                                                               |

Notas:

- En superficies sin vinculación de hilos, el comportamiento predeterminado es efectivamente `off`.
- La generación vinculada a hilos requiere soporte de política de canal:
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
- Use `--bind here` when you want to pin the current conversation without creating a child thread.

## ACP controls

Available command family:

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

`/acp status` muestra las opciones efectivas de tiempo de ejecución y, cuando están disponibles, los identificadores de sesión tanto a nivel de tiempo de ejecución como a nivel de backend.

Algunos controles dependen de las capacidades del backend. Si un backend no soporta un control, OpenClaw devuelve un error claro de control no soportado.

## ACP command cookbook

| Command              | What it does                                                                 | Example                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación opcional actual o de hilo.                     | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión objetivo.                             | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de guía a la sesión en ejecución.                         | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos de hilo.                               | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer el modo de tiempo de ejecución para la sesión de destino.         | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura de opción de configuración genérica de tiempo de ejecución.        | `/acp set model openai/gpt-5.2`                               |
| `/acp cwd`           | Establecer la anulación del directorio de trabajo de tiempo de ejecución.    | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer el perfil de política de aprobación.                              | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer el tiempo de espera de tiempo de ejecución (segundos).            | `/acp timeout 120`                                            |
| `/acp model`         | Establecer la anulación del modelo de tiempo de ejecución.                   | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar las anulaciones de opciones de tiempo de ejecución de la sesión.    | `/acp reset-options`                                          |
| `/acp sessions`      | Listar las sesiones recientes de ACP del almacenamiento.                     | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, correcciones prácticas.                      | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos deterministas de instalación y habilitación.                  | `/acp install`                                                |

`/acp sessions` lee el almacenamiento para la sesión vinculada actual o solicitante. Los comandos que aceptan tokens `session-key`, `session-id` o `session-label` resuelven los objetivos mediante el descubrimiento de sesiones de puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Mapeo de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un establecedor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza la anulación del cwd de tiempo de ejecución directamente.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de anulación de cwd.
- `/acp reset-options` borra todas las anulaciones de tiempo de ejecución para la sesión de destino.

## soporte de arnés acpx (actual)

Alias de arnés integrados de acpx actuales:

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

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape sin procesar es una función de la CLI de acpx (no la ruta normal de OpenClaw `agentId`).

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

La configuración de vinculación de hilos (thread binding) es específica del adaptador del canal. Ejemplo para Discord:

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

Si la generación de ACP vinculada a un hilo no funciona, verifique primero el indicador de características del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Los enlaces de conversación actual no requieren la creación de hilos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga enlaces de conversación ACP.

Consulte [Referencia de configuración](/en/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Instale y habilite el complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación local del espacio de trabajo durante el desarrollo:

```bash
openclaw plugins install ./extensions/acpx
```

Luego verifique el estado del backend:

```text
/acp doctor
```

### comando y configuración de versión de acpx

De forma predeterminada, el complemento de backend acpx incluido (`acpx`) utiliza el binario anclado local del complemento:

1. El comando predeterminado es `extensions/acpx/node_modules/.bin/acpx`.
2. La versión esperada predeterminada es la anclada de la extensión.
3. El inicio registra el backend de ACP inmediatamente como no listo.
4. Un trabajo de segundo plano (ensure job) verifica `acpx --version`.
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
- Cuando `command` apunta a un binario/ruta personalizado, la autoinstalación local del complemento está deshabilitada.
- El inicio de OpenClaw sigue siendo no bloqueante mientras se ejecuta la verificación de salud del backend.

Consulte [Complementos](/en/tools/plugin).

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva; no hay una TTY para aprobar o denegar las solicitudes de permiso de escritura en archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

### `permissionMode`

Controla qué operaciones puede realizar el agente de arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                  |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla lo que sucede cuando se mostraría un mensaje de permiso pero no hay un TTY interactivo disponible (lo cual siempre es el caso para las sesiones de ACP).

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

> **Importante:** Actualmente, OpenClaw tiene como valores predeterminados `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En las sesiones de ACP no interactivas, cualquier escritura o ejecución que active un aviso de permisos puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesitas restringir los permisos, establece `nonInteractivePermissions` en `deny` para que las sesiones se degraden con elegancia en lugar de fallar.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                                        | Solución                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el plugin de backend o está deshabilitado.                                                                      | Instala y habilita el plugin de backend, y luego ejecuta `/acp doctor`.                                                                                                                                          |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                                        | Establece `acp.enabled=true`.                                                                                                                                                                                    |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho desde mensajes de hilos normales deshabilitado.                                                              | Establece `acp.dispatch.enabled=true`.                                                                                                                                                                           |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                                                  | Usa un `agentId` permitido o actualiza `acp.allowedAgents`.                                                                                                                                                      |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                                                | Ejecuta `/acp sessions`, copia la clave/etiqueta exacta y vuelve a intentarlo.                                                                                                                                   |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` se usó sin una conversación vinculable activa.                                                          | Ve al chat/canal de destino y vuelve a intentarlo, o usa un inicio (spawn) no vinculado.                                                                                                                         |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de vinculación ACP de la conversación actual.                                        | Use `/acp spawn ... --thread ...` donde sea compatible, configure `bindings[]` de nivel superior, o vaya a un canal compatible.                                                                                  |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                                   | Ve al hilo de destino o usa `--thread auto`/`off`.                                                                                                                                                               |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es propietario del objetivo de vinculación activo.                                                       | Vuelve a vincular como propietario o usa una conversación o hilo diferente.                                                                                                                                      |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de vinculación de hilo.                                                              | Use `--thread off` o vaya a un adaptador/canal compatible.                                                                                                                                                       |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en el espacio aislado (sandboxed). | Use `runtime="subagent"` desde sesiones en el espacio aislado, o ejecute el inicio (spawn) de ACP desde una sesión sin espacio aislado.                                                                          |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                                                    | Use `runtime="subagent"` para el aislamiento (sandbox) requerido, o use ACP con `sandbox="inherit"` desde una sesión sin aislamiento.                                                                            |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión ACP obsoletos/eliminados.                                                                         | Recrear con `/acp spawn`, luego volver a vincular/enfocar el hilo.                                                                                                                                               |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión ACP no interactiva.                                                | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Consulte [Configuración de permisos](#permission-configuration).                                        |
| La sesión ACP falla pronto con poca salida                                  | Los avisos de permiso están bloqueados por `permissionMode`/`nonInteractivePermissions`.                              | Verifique los registros de la puerta de enlace para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión ACP se detiene indefinidamente después de completar el trabajo    | El proceso del arnés terminó pero la sesión ACP no reportó la finalización.                                           | Monitorear con `ps aux \| grep acpx`; mate procesos obsoletos manualmente.                                                                                                                                       |

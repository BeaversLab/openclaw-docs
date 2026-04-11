---
summary: "Use ACP runtime sessions for Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP, and other harness agents"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Operating /acp commands from chat
title: "ACP Agents"
---

# Agentes ACP

Las sesiones de [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permiten que OpenClaw ejecute arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI y otros arneses ACPX compatibles) a través de un complemento de backend ACP.

Si le pides a OpenClaw en lenguaje sencillo que "ejecute esto en Codex" o "inicie Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución del subagente nativo). Cada inicio de sesión de ACP se rastrea como una [tarea en segundo plano](/en/automation/tasks).

Si quieres que Codex o Claude Code se conecten como cliente MCP externo directamente
a las conversaciones de canales existentes de OpenClaw, usa [`openclaw mcp serve`](/en/cli/mcp)
en lugar de ACP.

## ¿Qué página quiero?

Hay tres superficies cercanas que son fáciles de confundir:

| Quieres...                                                                          | Usa esto                                 | Notas                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ejecutar Codex, Claude Code, Gemini CLI u otro arnés externo _a través_ de OpenClaw | Esta página: Agentes ACP                 | Sesiones vinculadas al chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tareas en segundo plano, controles de tiempo de ejecución |
| Exponer una sesión de OpenClaw Gateway _como_ servidor ACP para un editor o cliente | [`openclaw acp`](/en/cli/acp)            | Modo puente. El IDE/cliente habla ACP con OpenClaw a través de stdio/WebSocket                                                             |
| Reutilizar una CLI de IA local como modelo alternativo de solo texto                | [CLI Backends](/en/gateway/cli-backends) | No es ACP. Sin herramientas de OpenClaw, sin controles ACP, sin tiempo de ejecución de arnés                                               |

## ¿Esto funciona fuera de la caja?

Por lo general, sí.

- Las instalaciones nuevas ahora envían el complemento de tiempo de ejecución `acpx` incluido habilitado de forma predeterminada.
- El complemento `acpx` incluido prefiere su binario `acpx` anclado local al complemento.
- Al iniciarse, OpenClaw sondea ese binario y se repara a sí mismo si es necesario.
- Comienza con `/acp doctor` si quieres una verificación rápida de preparación.

Lo que aún puede suceder en el primer uso:

- Un adaptador de arnés de destino puede obtenerse bajo demanda con `npx` la primera vez que uses ese arnés.
- La autenticación del proveedor aún debe existir en el host para ese arnés.
- Si el host no tiene acceso a npm/red, las recuperaciones del adaptador en la primera ejecución pueden fallar hasta que las cachés se precarguen o el adaptador se instale de otra manera.

Ejemplos:

- `/acp spawn codex`: OpenClaw debería estar listo para iniciar `acpx`, pero el adaptador ACP de Codex aún podría necesitar una recuperación de primera ejecución.
- `/acp spawn claude`: la misma historia para el adaptador ACP de Claude, además de la autenticación del lado de Claude en ese host.

## Flujo de operador rápido

Use esto cuando quiera un manual de procedimientos `/acp` práctico:

1. Iniciar una sesión:
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabaje en la conversación o hilo enlazado (o apunte explícitamente a esa clave de sesión).
3. Verificar el estado de ejecución:
   - `/acp status`
4. Ajustar las opciones de ejecución según sea necesario:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Empujar una sesión activa sin reemplazar el contexto:
   - `/acp steer tighten logging and continue`
6. Detener el trabajo:
   - `/acp cancel` (detener turno actual), o
   - `/acp close` (cerrar sesión + eliminar enlaces)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Vincula este canal de Discord a Codex."
- "Inicia una sesión persistente de Codex en un hilo aquí y manténla enfocada."
- "Ejecuta esto como una sesión ACP de Claude Code de un solo disparo y resume el resultado."
- "Vincula este chat de iMessage a Codex y mantén las respuestas de seguimiento en el mismo espacio de trabajo."
- "Usa Gemini CLI para esta tarea en un hilo, luego mantiene las respuestas de seguimiento en ese mismo hilo."

Lo que OpenClaw debe hacer:

1. Elegir `runtime: "acp"`.
2. Resolver el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita el enlace de conversación actual y el canal activo lo admite, vincule la sesión ACP a esa conversación.
4. De lo contrario, si se solicita el enlace de hilo y el canal actual lo admite, vincule la sesión ACP al hilo.
5. Enruta los mensajes enlazados de seguimiento a esa misma sesión ACP hasta que se desenfoque/cierre/expire.

## ACP versus sub-agentes

Use ACP cuando desee un tiempo de ejecución de arnés externo. Use sub-agentes cuando desee ejecuciones delegadas nativas de OpenClaw.

| Área                                   | Sesión ACP                                    | Ejecución de sub-agente                               |
| -------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución                    | Complemento de backend ACP (por ejemplo acpx) | Tiempo de ejecución de sub-agente nativo de OpenClaw  |
| Clave de sesión                        | `agent:<agentId>:acp:<uuid>`                  | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales                   | `/acp ...`                                    | `/subagents ...`                                      |
| Herramienta de generación (Spawn tool) | `sessions_spawn` con `runtime:"acp"`          | `sessions_spawn` (tiempo de ejecución predeterminado) |

Consulte también [Sub-agentes](/en/tools/subagents).

## Cómo ACP ejecuta Claude Code

Para Claude Code a través de ACP, la pila es:

1. Plano de control de sesión ACP de OpenClaw
2. complemento de tiempo de ejecución `acpx` incluido
3. Adaptador ACP de Claude
4. Maquinaria de tiempo de ejecución/sesión del lado de Claude

Distinción importante:

- ACP Claude es una sesión de arnés con controles ACP, reanudación de sesión, seguimiento de tareas en segundo plano y enlace opcional de conversación/hilo.
- Los backends de CLI son tiempos de ejecución alternativos locales de solo texto separados. Consulte [Backends de CLI](/en/gateway/cli-backends).

Para los operadores, la regla práctica es:

- quiere `/acp spawn`, sesiones vinculables, controles de tiempo de ejecución o trabajo de arnés persistente: use ACP
- quiere una alternativa de texto local simple a través de la CLI sin procesar: use backends de CLI

## Sesiones vinculadas

### Vínculos de conversación actual

Use `/acp spawn <harness> --bind here` cuando desee que la conversación actual se convierta en un espacio de trabajo ACP duradero sin crear un hilo secundario.

Comportamiento:

- OpenClaw sigue siendo el propietario del transporte del canal, la autenticación, la seguridad y la entrega.
- La conversación actual está fijada a la clave de sesión ACP generada.
- Los mensajes de seguimiento en esa conversación se enrutan a la misma sesión ACP.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión y elimina el vínculo de conversación actual.

Lo que esto significa en la práctica:

- `--bind here` mantiene la misma superficie de chat. En Discord, el canal actual sigue siendo el canal actual.
- `--bind here` aún puede crear una nueva sesión ACP si está generando trabajo nuevo. El vínculo adjunta esa sesión a la conversación actual.
- `--bind here` no crea por sí solo un hilo secundario de Discord ni un tema de Telegram.
- El tiempo de ejecución de ACP aún puede tener su propio directorio de trabajo (`cwd`) o espacio de trabajo administrado por el backend en el disco. Ese espacio de trabajo de tiempo de ejecución es independiente de la superficie de chat y no implica un nuevo hilo de mensajería.
- Si haces spawn a un agente ACP diferente y no pasas `--cwd`, OpenClaw hereda el espacio de trabajo del **agente de destino** por defecto, no el del solicitante.
- Si falta esa ruta de espacio de trabajo heredada (`ENOENT`/`ENOTDIR`), OpenClaw vuelve al cwd predeterminado del backend en lugar de reutilizar silenciosamente el árbol incorrecto.
- Si el espacio de trabajo heredado existe pero no se puede acceder (por ejemplo `EACCES`), spawn devuelve el error de acceso real en lugar de omitir `cwd`.

Modelo mental:

- superficie de chat: donde la gente sigue hablando (`Discord channel`, `Telegram topic`, `iMessage chat`)
- sesión ACP: el estado de ejecución duradero de Codex/Claude/Gemini al que OpenClaw enruta
- hilo/tema secundario: una superficie de mensajería adicional opcional creada solo por `--thread ...`
- espacio de trabajo de ejecución: la ubicación del sistema de archivos donde se ejecuta el arnés (`cwd`, repositorio, espacio de trabajo del backend)

Ejemplos:

- `/acp spawn codex --bind here`: mantener este chat, generar o adjuntar una sesión ACP de Codex, y enrutar mensajes futuros aquí a ella
- `/acp spawn codex --thread auto`: OpenClaw puede crear un hilo/tema secundario y vincular la sesión ACP allí
- `/acp spawn codex --bind here --cwd /workspace/repo`: mismo enlace de chat que arriba, pero Codex se ejecuta en `/workspace/repo`

Soporte de enlace de conversación actual:

- Los canales de chat/mensajes que anuncian soporte de enlace de conversación actual pueden usar `--bind here` a través de la ruta compartida de enlace de conversación.
- Los canales con semánticas personalizadas de hilo/tema aún pueden proporcionar canonización específica del canal detrás de la misma interfaz compartida.
- `--bind here` siempre significa "vincular la conversación actual en su lugar".
- Los enlaces genéricos de conversación actual usan el almacén de enlaces compartido de OpenClaw y sobreviven a reinicios normales de la puerta de enlace.

Notas:

- `--bind here` y `--thread ...` son mutuamente excluyentes en `/acp spawn`.
- En Discord, `--bind here` vincula el canal o hilo actual en su lugar. `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear un hilo secundario para `--thread auto|here`.
- Si el canal activo no expone enlaces de ACP de conversación actual, OpenClaw devuelve un mensaje claro de no soportado.
- Las preguntas de `resume` y de "nueva sesión" son preguntas de sesión de ACP, no preguntas de canal. Puedes reutilizar o reemplazar el estado de ejecución sin cambiar la superficie de chat actual.

### Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones de ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión de ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión de ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- La pérdida de enfoque/cierre/archivación/ tiempo de espera de inactividad o la caducidad por antigüedad máxima elimina el enlace.

La compatibilidad con enlaces de hilos es específica del adaptador. Si el adaptador del canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no soportado/no disponible.

Marcadores de características necesarios para ACP vinculado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado de forma predeterminada (establezca `false` para pausar el despacho de ACP)
- Marcador de creación de hilos de ACP del adaptador de canal habilitado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales compatibles con hilos

- Cualquier adaptador de canal que exponga la capacidad de vinculación de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas de foro en grupos/supergrupos y temas de MD)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

## Configuraciones específicas del canal

Para flujos de trabajo no efímeros, configure enlaces persistentes de ACP en entradas `bindings[]` de nivel superior.

### Modelo de vinculación

- `bindings[].type="acp"` marca un enlace de conversación persistente de ACP.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema de foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles DM/grupo de chat: `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
  - iMessage DM/grupo de chat: `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` para enlaces de grupo estables.
- `bindings[].agentId` es el id del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran en `bindings[].acp`:
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

Precedencia de anulación para sesiones ACP vinculadas:

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
- Los mensajes en ese canal o tema se dirigen a la sesión ACP configurada.
- En conversaciones vinculadas, `/new` y `/reset` restablecen la misma clave de sesión ACP en su lugar.
- Los enlaces temporales de tiempo de ejecución (por ejemplo, los creados por flujos de enfoque de hilos) todavía se aplican donde están presentes.
- Para generaciones de ACP entre agentes sin un `cwd` explícito, OpenClaw hereda el espacio de trabajo del agente de destino desde la configuración del agente.
- Las rutas de espacio de trabajo heredadas que faltan vuelven al cwd predeterminado del backend; los fallos de acceso que no faltan se muestran como errores de generación.

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

- `runtime` el valor predeterminado es `subagent`, así que establece `runtime: "acp"` explícitamente para las sesiones de ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión de ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino de ACP. Recurre a `acp.defaultAgent` si está establecido.
- `thread` (opcional, predeterminado `false`): solicita el flujo de vinculación de hilos donde sea compatible.
- `mode` (opcional): `run` (un solo uso) o `session` (persistente).
  - el valor predeterminado es `run`
  - si `thread: true` y el modo se omiten, OpenClaw puede adoptar el comportamiento persistente según la ruta de tiempo de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo del tiempo de ejecución solicitado (validado por la política de backend/tiempo de ejecución). Si se omite, la generación de ACP hereda el espacio de trabajo del agente de destino cuando está configurado; las rutas heredadas que faltan recurren a los valores predeterminados del backend, mientras que los errores de acceso reales se devuelven.
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión de ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite los resúmenes de progreso de la ejecución inicial de ACP de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando están disponibles, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) que puedes seguir para ver el historial completo de retransmisión.

### Reanudar una sesión existente

Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de comenzar de nuevo. El agente reproduce su historial de conversación a través de `session/load`, por lo que continúa con el contexto completo de lo que sucedió antes.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transferir una sesión de Codex de su portátil a su teléfono: dígale a su agente que continúe donde lo dejó
- Continuar una sesión de codificación que inició de forma interactiva en la CLI, ahora de forma desatendida a través de su agente
- Reanudar el trabajo que se interrumpió por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversación ACP ascendente; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que está creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la generación falla con un error claro; no hay una reserva silenciosa a una sesión nueva.

### Prueba de humo del operador

Use esto después de una implementación de puerta de enlace cuando desee una verificación rápida en vivo de que la generación de ACP
realmente está funcionando de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta recomendada:

1. Verifique la versión/confirmación de la puerta de enlace implementada en el host de destino.
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
   - sin error de validador
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
- No se requiere `streamTo: "parent"` para la puerta básica. Esa ruta depende de
  las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate la prueba de `mode: "session"` vinculada a un hilo como una segunda pasada de integración
  más rica desde un hilo real de Discord o tema de Telegram.

## Compatibilidad con el espacio aislado

Las sesiones de ACP se ejecutan actualmente en el tiempo de ejecución del host, no dentro del espacio aislado de OpenClaw.

Limitaciones actuales:

- Si la sesión del solicitante está en un espacio aislado, las generaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución imponible por el espacio aislado.

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

Vea [Slash Commands](/en/tools/slash-commands).

## Resolución del objetivo de sesión

La mayoría de las acciones de `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta clave
   - luego el id de sesión con forma de UUID
   - luego etiqueta
2. Vinculación de hilo actual (si esta conversación/hilo está vinculada a una sesión ACP)
3. Respaldo de la sesión del solicitante actual

Las vinculaciones de conversación actual y las vinculaciones de hilo participan en el paso 2.

Si no se resuelve ningún objetivo, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de vinculación de generación

`/acp spawn` admite `--bind here|off`.

| Modo   | Comportamiento                                                                   |
| ------ | -------------------------------------------------------------------------------- |
| `here` | Vincula la conversación activa actual en su lugar; falla si ninguna está activa. |
| `off`  | No cree una vinculación de conversación actual.                                  |

Notas:

- `--bind here` es la ruta de operador más simple para "hacer que este canal o chat esté respaldado por Codex".
- `--bind here` no crea un hilo secundario.
- `--bind here` solo está disponible en canales que exponen soporte de vinculación de conversación actual.
- `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

## Modos de generación de hilos

`/acp spawn` admite `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: vincular ese hilo. Fuera de un hilo: crear/vincular un hilo secundario cuando se admita. |
| `here` | Requiere un hilo activo actual; falla si no está en uno.                                                    |
| `off`  | Sin vinculación. La sesión se inicia sin vincular.                                                          |

Notas:

- En superficies sin vinculación de hilos, el comportamiento predeterminado es efectivamente `off`.
- La generación vinculada a hilos requiere soporte de política de canal:
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`
- Use `--bind here` cuando desee fijar la conversación actual sin crear un hilo secundario.

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

## Libro de recetas de comandos ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación actual opcional o vinculación de hilo.         | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión de destino.                           | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos del hilo.                              | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer modo de tiempo de ejecución para la sesión de destino.            | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura genérica de opción de configuración de tiempo de ejecución.        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Establecer anulación del directorio de trabajo de tiempo de ejecución.       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer perfil de política de aprobación.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer tiempo de espera de tiempo de ejecución (segundos).               | `/acp timeout 120`                                            |
| `/acp model`         | Establecer anulación del modelo de tiempo de ejecución.                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar anulaciones de opciones de tiempo de ejecución de la sesión.        | `/acp reset-options`                                          |
| `/acp sessions`      | Enumerar sesiones recientes de ACP del almacenamiento.                       | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, soluciones aplicables.                       | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos de instalación y activación deterministas.                    | `/acp install`                                                |

`/acp sessions` lee el almacenamiento para la sesión vinculada actual o la sesión solicitante. Los comandos que aceptan tokens `session-key`, `session-id` o `session-label` resuelven los objetivos a través del descubrimiento de sesiones de puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Mapeo de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un establecedor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza directamente la sobrescritura del cwd de tiempo de ejecución.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de sobrescritura del cwd.
- `/acp reset-options` borra todas las sobrescrituras de tiempo de ejecución para la sesión de destino.

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

Cuando OpenClaw usa el backend acpx, prefiere estos valores para `agentId` a menos que tu configuración de acpx defina alias de agente personalizados.
Si tu instalación local de Cursor todavía expone ACP como `agent acp`, anula el comando de agente `cursor` en tu configuración de acpx en lugar de cambiar el valor predeterminado integrado.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa vía de escape sin procesar es una característica de la CLI de acpx (no la ruta normal de OpenClaw `agentId`).

## Configuración requerida

Línea base principal de ACP:

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

La configuración de enlace de hilos es específica del adaptador del canal. Ejemplo para Discord:

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

Si la creación de ACP ligado a hilos no funciona, verifica primero el indicador de función del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Los enlaces de conversación actual no requieren la creación de hilos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga enlaces de conversación ACP.

Consulta [Referencia de configuración](/en/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Las instalaciones nuevas incluyen el complemento de tiempo de ejecución `acpx` empaquetado y habilitado de forma predeterminada, por lo que ACP
por lo general funciona sin un paso de instalación manual del complemento.

Comienza con:

```text
/acp doctor
```

Si deshabilitaste `acpx`, lo denegaste a través de `plugins.allow` / `plugins.deny`, o quieres
cambiar a una versión local de desarrollo, usa la ruta explícita del complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación del espacio de trabajo local durante el desarrollo:

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Luego verifica el estado del backend:

```text
/acp doctor
```

### comando acpx y configuración de versión

De forma predeterminada, el complemento del backend acpx incluido (`acpx`) usa el binario fijado local del complemento:

1. El comando por defecto es el `node_modules/.bin/acpx` local del complemento dentro del paquete del complemento ACPX.
2. La versión esperada por defecto es la fijación de la extensión.
3. Al inicio, el backend de ACP se registra inmediatamente como no listo.
4. Un trabajo de verificación en segundo plano verifica `acpx --version`.
5. Si falta el binario local del complemento o no coincide, ejecuta:
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

- `command` acepta una ruta absoluta, ruta relativa o nombre de comando (`acpx`).
- Las rutas relativas se resuelven desde el directorio del espacio de trabajo de OpenClaw.
- `expectedVersion: "any"` deshabilita la coincidencia estricta de versiones.
- Cuando `command` apunta a un binario/ruta personalizado, la autoinstalación local del complemento se deshabilita.
- El inicio de OpenClaw sigue sin bloqueo mientras se ejecuta la verificación de estado del backend.

Consulta [Complementos](/en/tools/plugin).

### Instalación automática de dependencias

Cuando instalas OpenClaw globalmente con `npm install -g openclaw`, las dependencias
en tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente
a través de un gancho de postinstalación. Si la instalación automática falla, la puerta de enlace aún se inicia
normalmente e informa la dependencia faltante a través de `openclaw acp doctor`.

### Puente MCP de herramientas de complementos

De forma predeterminada, las sesiones ACPX **no** exponen las herramientas registradas por el complemento de OpenClaw a
el arnés ACP.

Si deseas que los agentes de ACP, como Codex o Claude Code, llamen a las herramientas de complementos de
OpenClaw instaladas, como recuperación/almacenamiento de memoria, habilita el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que hace esto:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en el arranque de la sesión
  de ACPX.
- Expone las herramientas de complementos ya registradas por los complementos de OpenClaw
  instalados y habilitados.
- Mantiene la función explícita y desactivada por defecto.

Notas de seguridad y confianza:

- Esto expande la superficie de herramientas del arnés ACP.
- Los agentes ACP solo obtienen acceso a las herramientas de complementos ya activas en la puerta de enlace.
- Trate esto con el mismo límite de confianza que permitir que esos complementos se ejecuten en
  OpenClaw mismo.
- Revise los complementos instalados antes de habilitarlo.

Los `mcpServers` personalizados aún funcionan como antes. El puente de herramientas de complementos integrado es una
opción de conveniencia adicional, no un reemplazo para la configuración genérica del servidor MCP.

### Configuración del tiempo de espera de ejecución

El complemento `acpx` incluido establece por defecto los giros de tiempo de ejecución integrados en un tiempo de espera
de 120 segundos. Esto da a los arneses más lentos, como Gemini CLI, suficiente tiempo para completar
el inicio y la inicialización de ACP. Anúlelo si su host necesita un límite de
tiempo de ejecución diferente:

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Reinicie la puerta de enlace después de cambiar este valor.

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva: no hay TTY para aprobar o denegar las solicitudes de permisos de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

Estos permisos de arnés ACPX son independientes de las aprobaciones de ejecución de OpenClaw e independientes de los indicadores de omisión del proveedor de backend de CLI, como Claude CLI `--permission-mode bypassPermissions`. ACPX `approve-all` es el interruptor de emergencia a nivel de arnés para las sesiones ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente del arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                    |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y la ejecución requieren confirmación. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                        |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay un TTY interactivo disponible (que siempre es el caso de las sesiones ACP).

| Valor  | Comportamiento                                                         |
| ------ | ---------------------------------------------------------------------- |
| `fail` | Abortar la sesión con `AcpRuntimeError`. **(por defecto)**             |
| `deny` | Denegar silenciosamente el permiso y continuar (degradación elegante). |

### Configuración

Establecer a través de la configuración del complemento:

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

Reinicie la puerta de enlace después de cambiar estos valores.

> **Importante:** OpenClaw actualmente utiliza por defecto `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active un aviso de permisos puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesitas restringir permisos, establece `nonInteractivePermissions` en `deny` para que las sesiones se degraden con elegancia en lugar de fallar.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                         | Solución                                                                                                                                                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el plugin del backend o está deshabilitado.                                                      | Instala y habilita el plugin del backend, luego ejecuta `/acp doctor`.                                                                                                                                        |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                         | Establece `acp.enabled=true`.                                                                                                                                                                                 |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho desde mensajes de hilos normales deshabilitado.                                               | Establece `acp.dispatch.enabled=true`.                                                                                                                                                                        |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                                   | Usa `agentId` permitido o actualiza `acp.allowedAgents`.                                                                                                                                                      |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                                 | Ejecuta `/acp sessions`, copia la clave/etiqueta exacta, reintenta.                                                                                                                                           |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación enlazable activa.                                             | Ve al chat/canal de destino y reintenta, o usa una generación no enlazada.                                                                                                                                    |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de enlace ACP de conversación actual.                                 | Usa `/acp spawn ... --thread ...` donde sea compatible, configura `bindings[]` de nivel superior, o ve a un canal compatible.                                                                                 |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                    | Ve al hilo de destino o usa `--thread auto`/`off`.                                                                                                                                                            |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario posee el objetivo de enlace activo.                                                       | Vuelve a enlazar como propietario o usa una conversación o hilo diferente.                                                                                                                                    |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de enlace de hilo.                                                    | Usa `--thread off` o ve a un adaptador/canal compatible.                                                                                                                                                      |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en espacio aislado. | Usa `runtime="subagent"` desde sesiones en espacio aislado, o ejecuta una generación de ACP desde una sesión no aislada.                                                                                      |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                                     | Use `runtime="subagent"` para el sandboxing requerido, o use ACP con `sandbox="inherit"` desde una sesión sin sandbox.                                                                                        |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión de ACP obsoletos/eliminados.                                                       | Recrear con `/acp spawn`, luego volver a vincular/enfocar el hilo.                                                                                                                                            |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión ACP no interactiva.                                 | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Consulte [Configuración de permisos](#permission-configuration).                                     |
| La sesión ACP falla temprano con poca salida                                | Las solicitudes de permisos están bloqueadas por `permissionMode`/`nonInteractivePermissions`.         | Revise los registros de la puerta de enlace para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión ACP se detiene indefinidamente después de completar el trabajo    | El proceso del arnés terminó pero la sesión ACP no reportó la finalización.                            | Monitorear con `ps aux \| grep acpx`; eliminar procesos obsoletos manualmente.                                                                                                                                |

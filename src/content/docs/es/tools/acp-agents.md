---
summary: "Utiliza sesiones del tiempo de ejecución de ACP para Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP y otros agentes de arnés"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message channel conversation to a persistent ACP session
  - Troubleshooting ACP backend and plugin wiring
  - Debugging ACP completion delivery or agent-to-agent loops
  - Operating /acp commands from chat
title: "Agentes ACP"
---

# Agentes ACP

Las sesiones del [Protocolo de Cliente de Agente (ACP)](https://agentclientprotocol.com/) permiten a OpenClaw ejecutar arneses de codificación externos (por ejemplo, Pi, Claude Code, Codex, Cursor, Copilot, OpenClaw ACP, OpenCode, Gemini CLI y otros arneses ACPX compatibles) a través de un complemento de backend de ACP.

Si le pides a OpenClaw en lenguaje plano que "ejecuta esto en Codex" o "inicia Claude Code en un hilo", OpenClaw debería enrutar esa solicitud al tiempo de ejecución de ACP (no al tiempo de ejecución del subagente nativo). Cada generación de sesión de ACP se rastrea como una [tarea en segundo plano](/es/automation/tasks).

Si deseas que Codex o Claude Code se conecten como cliente MCP externo directamente
a las conversaciones existentes del canal de OpenClaw, usa [`openclaw mcp serve`](/es/cli/mcp)
en lugar de ACP.

## ¿Qué página quiero?

Hay tres superficies cercanas que son fáciles de confundir:

| Quieres...                                                                          | Usa esto                                    | Notas                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ejecutar Codex, Claude Code, Gemini CLI u otro arnés externo _a través_ de OpenClaw | Esta página: Agentes ACP                    | Sesiones vinculadas al chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tareas en segundo plano, controles de tiempo de ejecución |
| Exponer una sesión de OpenClaw Gateway _como_ servidor ACP para un editor o cliente | [`openclaw acp`](/es/cli/acp)               | Modo puente. El IDE/cliente habla ACP con OpenClaw a través de stdio/WebSocket                                                             |
| Reutilizar una CLI de IA local como modelo alternativo de solo texto                | [Backends de CLI](/es/gateway/cli-backends) | No es ACP. Sin herramientas de OpenClaw, sin controles ACP, sin tiempo de ejecución de arnés                                               |

## ¿Esto funciona fuera de la caja?

Por lo general, sí.

- Las instalaciones nuevas ahora incluyen el complemento del tiempo de ejecución `acpx` incluido habilitado de forma predeterminada.
- El complemento `acpx` incluido prefiere su binario `acpx` anclado local al complemento.
- Al iniciarse, OpenClaw sondea ese binario y se repara a sí mismo si es necesario.
- Comienza con `/acp doctor` si deseas una verificación rápida de preparación.

Lo que aún puede suceder en el primer uso:

- Un adaptador de arnés de destino puede obtenerse bajo demanda con `npx` la primera vez que uses ese arnés.
- La autenticación del proveedor aún debe existir en el host para ese arnés.
- Si el host no tiene acceso a npm/red, las recuperaciones del adaptador en la primera ejecución pueden fallar hasta que las cachés se precarguen o el adaptador se instale de otra manera.

Ejemplos:

- `/acp spawn codex`: OpenClaw debería estar listo para arrancar `acpx`, pero el adaptador ACP de Codex aún puede necesitar una obtención de primera ejecución.
- `/acp spawn claude`: la misma historia para el adaptador ACP de Claude, además de la autenticación del lado de Claude en ese host.

## Flujo de operador rápido

Usa esto cuando desees un manual de procedimientos `/acp` práctico:

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
   - `/acp cancel` (detener el turno actual), o
   - `/acp close` (cerrar sesión + eliminar enlaces)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Vincula este canal de Discord a Codex."
- "Inicia una sesión persistente de Codex en un hilo aquí y manténla enfocada."
- "Ejecuta esto como una sesión ACP de Claude Code de un solo disparo y resume el resultado."
- "Vincula este chat de iMessage a Codex y mantén las respuestas de seguimiento en el mismo espacio de trabajo."
- "Usa Gemini CLI para esta tarea en un hilo, luego mantiene las respuestas de seguimiento en ese mismo hilo."

Lo que OpenClaw debe hacer:

1. Elija `runtime: "acp"`.
2. Resuelva el objetivo de arnés solicitado (`agentId`, por ejemplo `codex`).
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

Consulte también [Sub-agentes](/es/tools/subagents).

## Cómo ACP ejecuta Claude Code

Para Claude Code a través de ACP, la pila es:

1. Plano de control de sesión ACP de OpenClaw
2. complemento de tiempo de ejecución `acpx` incluido
3. Adaptador ACP de Claude
4. Maquinaria de tiempo de ejecución/sesión del lado de Claude

Distinción importante:

- ACP Claude es una sesión de arnés con controles ACP, reanudación de sesión, seguimiento de tareas en segundo plano y enlace opcional de conversación/hilo.
- Los backends de CLI son tiempos de ejecución de reserva local separados de solo texto. Consulte [Backends de CLI](/es/gateway/cli-backends).

Para los operadores, la regla práctica es:

- desea `/acp spawn`, sesiones enlazables, controles de tiempo de ejecución o trabajo de arnés persistente: use ACP
- quiere una alternativa de texto local simple a través de la CLI sin procesar: use backends de CLI

## Sesiones vinculadas

### Vínculos de conversación actual

Use `/acp spawn <harness> --bind here` cuando desee que la conversación actual se convierta en un espacio de trabajo de ACP duradero sin crear un hilo secundario.

Comportamiento:

- OpenClaw sigue siendo el propietario del transporte del canal, la autenticación, la seguridad y la entrega.
- La conversación actual está fijada a la clave de sesión ACP generada.
- Los mensajes de seguimiento en esa conversación se enrutan a la misma sesión ACP.
- `/new` y `/reset` restablecen la misma sesión de ACP enlazada en su lugar.
- `/acp close` cierra la sesión y elimina el enlace de la conversación actual.

Lo que esto significa en la práctica:

- `--bind here` mantiene la misma superficie de chat. En Discord, el canal actual sigue siendo el canal actual.
- `--bind here` todavía puede crear una nueva sesión de ACP si está generando trabajo nuevo. El enlace adjunta esa sesión a la conversación actual.
- `--bind here` no crea un hilo secundario de Discord ni un tema de Telegram por sí mismo.
- El tiempo de ejecución de ACP aún puede tener su propio directorio de trabajo (`cwd`) o espacio de trabajo administrado por el backend en el disco. Ese espacio de trabajo de tiempo de ejecución es independiente de la superficie de chat y no implica un nuevo hilo de mensajería.
- Si genera en un agente ACP diferente y no pasa `--cwd`, OpenClaw hereda el espacio de trabajo **del agente de destino** de forma predeterminada, no el del solicitante.
- Si falta esa ruta de espacio de trabajo heredada (`ENOENT`/`ENOTDIR`), OpenClaw recurre al cwd predeterminado del backend en lugar de reutilizar silenciosamente el árbol incorrecto.
- Si el espacio de trabajo heredado existe pero no se puede acceder (por ejemplo `EACCES`), spawn devuelve el error de acceso real en lugar de omitir `cwd`.

Modelo mental:

- superficie de chat: donde la gente sigue hablando (`Discord channel`, `Telegram topic`, `iMessage chat`)
- sesión ACP: el estado de ejecución duradero de Codex/Claude/Gemini al que OpenClaw enruta
- hilo/tema secundario: una superficie de mensajería adicional opcional creada solo por `--thread ...`
- espacio de trabajo de tiempo de ejecución: la ubicación del sistema de archivos donde se ejecuta el arnés (`cwd`, repo checkout, backend workspace)

Ejemplos:

- `/acp spawn codex --bind here`: mantener este chat, generar o adjuntar una sesión ACP de Codex y enrutar mensajes futuros aquí hacia ella
- `/acp spawn codex --thread auto`: OpenClaw puede crear un hilo/tema secundario y vincular la sesión ACP allí
- `/acp spawn codex --bind here --cwd /workspace/repo`: mismo vínculo de chat que arriba, pero Codex se ejecuta en `/workspace/repo`

Soporte de enlace de conversación actual:

- Los canales de chat/mensajes que anuncian soporte de vinculación de conversación actual pueden usar `--bind here` a través de la ruta compartida de vinculación de conversación.
- Los canales con semánticas personalizadas de hilo/tema aún pueden proporcionar canonización específica del canal detrás de la misma interfaz compartida.
- `--bind here` siempre significa "vincular la conversación actual en su lugar".
- Los enlaces genéricos de conversación actual usan el almacén de enlaces compartido de OpenClaw y sobreviven a reinicios normales de la puerta de enlace.

Notas:

- `--bind here` y `--thread ...` son mutuamente excluyentes en `/acp spawn`.
- En Discord, `--bind here` vincula el canal o hilo actual en su lugar. `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear un hilo secundario para `--thread auto|here`.
- Si el canal activo no expone enlaces de ACP de conversación actual, OpenClaw devuelve un mensaje claro de no soportado.
- `resume` y las preguntas de "nueva sesión" son preguntas de sesión ACP, no preguntas de canal. Puedes reutilizar o reemplazar el estado de tiempo de ejecución sin cambiar la superficie de chat actual.

### Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones de ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión de ACP de destino.
- Los mensajes de seguimiento en ese hilo se enrutan a la sesión de ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- La pérdida de enfoque/cierre/archivación/ tiempo de espera de inactividad o la caducidad por antigüedad máxima elimina el enlace.

La compatibilidad con enlaces de hilos es específica del adaptador. Si el adaptador del canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no soportado/no disponible.

Marcadores de características necesarios para ACP vinculado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado por defecto (establezca `false` para pausar el despacho de ACP)
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

Para flujos de trabajo no efímeros, configure enlaces ACP persistentes en las entradas de nivel superior `bindings[]`.

### Modelo de vinculación

- `bindings[].type="acp"` marca un enlace de conversación ACP persistente.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema del foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - Chat de DM/grupo de BlueBubbles: `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
  - Chat de DM/grupo de iMessage: `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
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
- `agents.list[].runtime.acp.agent` (id del arnés, por ejemplo `codex` o `claude`)
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
- Para inicios de ACP entre agentes sin un `cwd` explícito, OpenClaw hereda el espacio de trabajo del agente de destino desde la configuración del agente.
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

- `runtime` tiene como valor predeterminado `subagent`, así que configure `runtime: "acp"` explícitamente para las sesiones ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): prompt inicial enviado a la sesión ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Se retrocede a `acp.defaultAgent` si está establecido.
- `thread` (opcional, por defecto `false`): solicita el flujo de vinculación de hilo donde sea compatible.
- `mode` (opcional): `run` (un solo uso) o `session` (persistente).
  - el valor predeterminado es `run`
  - si se omiten `thread: true` y el modo, OpenClaw puede adoptar por defecto un comportamiento persistente según la ruta de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo de ejecución solicitado (validado por la política de backend/ejecución). Si se omite, la generación de ACP hereda el espacio de trabajo del agente de destino cuando está configurado; las rutas heredadas faltantes retroceden a los valores predeterminados del backend, mientras que los errores de acceso reales se devuelven.
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de ejecución ACP inicial de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando estén disponibles, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con ámbito de sesión (`<sessionId>.acp-stream.jsonl`) que puedes monitorear para obtener el historial de retransmisión completo.
- `model` (opcional): anulación explícita del modelo para la sesión secundaria de ACP. Se respeta para `runtime: "acp"` para que la secundaria use el modelo solicitado en lugar de volver silenciosamente al predeterminado del agente objetivo.

## Modelo de entrega

Las sesiones de ACP pueden ser espacios de trabajo interactivos o trabajo en propiedad del padre en segundo plano. La ruta de entrega depende de esa forma.

### Sesiones de ACP interactivas

Las sesiones interactivas están destinadas a seguir hablando en una superficie de chat visible:

- `/acp spawn ... --bind here` vincula la conversación actual a la sesión de ACP.
- `/acp spawn ... --thread ...` vincula un hilo/tema de canal a la sesión de ACP.
- Los `bindings[].type="acp"` configurados persistentes enrutan las conversaciones coincidentes a la misma sesión de ACP.

Los mensajes de seguimiento en la conversación vinculada se enrutan directamente a la sesión de ACP, y la salida de ACP se entrega de vuelta a ese mismo canal/hilo/tema.

### Sesiones de ACP de un solo uso propiedad del padre

Las sesiones de ACP de un solo uso generadas por otra ejecución de agente son secundarias en segundo plano, similares a los subagentes:

- El padre solicita trabajo con `sessions_spawn({ runtime: "acp", mode: "run" })`.
- El hijo se ejecuta en su propia sesión de arnés ACP.
- La finalización se informa a través de la ruta interna de anuncio de finalización de tareas.
- El padre reescribe el resultado del hijo con la voz normal del asistente cuando una respuesta orientada al usuario es útil.

No trate esta ruta como un chat punto a punto entre padre e hijo. El hijo ya tiene un canal de finalización de vuelta al padre.

### `sessions_send` y entrega A2A

`sessions_send` puede apuntar a otra sesión después de generarse. Para sesiones entre pares normales, OpenClaw usa una ruta de seguimiento de agente a agente (A2A) después de inyectar el mensaje:

- esperar la respuesta de la sesión objetivo
- opcionalmente permitir que el solicitante y el objetivo intercambien un número limitado de turnos de seguimiento
- pedir al objetivo que produzca un mensaje de anuncio
- entregar ese anuncio al canal o hilo visible

Esa ruta A2A es un respaldo para envíos entre pares donde el remitente necesita un seguimiento visible. Permanece habilitada cuando una sesión no relacionada puede ver y enviar un mensaje a un objetivo de ACP, por ejemplo bajo configuraciones `tools.sessions.visibility` amplias.

OpenClaw omite el seguimiento A2A solo cuando el solicitante es el padre de su propio hijo ACP de un solo uso propiedad del padre. En ese caso, ejecutar A2A sobre la finalización de la tarea puede activar al padre con el resultado del hijo, reenviar la respuesta del padre de vuelta al hijo y crear un bucle de eco padre/hijo. El resultado `sessions_send` informa `delivery.status="skipped"` para ese caso de hijo propio porque la ruta de finalización ya es responsable del resultado.

### Reanudar una sesión existente

Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de comenzar una nueva. El agente reproduce su historial de conversación a través de `session/load`, por lo que reanuda con el contexto completo de lo que ocurrió anteriormente.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transferir una sesión de Codex de su computadora portátil a su teléfono — dígale a su agente que continúe donde lo dejó
- Continuar una sesión de codificación que inició interactivamente en la CLI, ahora sin interfaz a través de su agente
- Reanudar el trabajo que fue interrumpido por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversación ACP aguas arriba; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que está creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la creación falla con un error claro; no hay una reserva silenciosa a una nueva sesión.

### Prueba de humo del operador

Use esto después de un despliegue de puerta de enlace cuando desee una verificación rápida en vivo de que la creación de ACP
realmente está funcionando de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta de enlace recomendada:

1. Verifique la versión/commit de la puerta de enlace desplegada en el host de destino.
2. Confirme que la fuente desplegada incluye la aceptación del linaje ACP en
   `src/gateway/sessions-patch.ts` (`subagent:* or acp:* sessions`).
3. Abra una sesión de puente ACPX temporal a un agente en vivo (por ejemplo
   `razor(main)` en `jpclawhq`).
4. Pídale a ese agente que llame `sessions_spawn` con:
   - `runtime: "acp"`
   - `agentId: "codex"`
   - `mode: "run"`
   - tarea: `Reply with exactly LIVE-ACP-SPAWN-OK`
5. Verifique los informes del agente:
   - `accepted=yes`
   - un `childSessionKey` real
   - ningún error de validación
6. Limpie la sesión temporal del puente ACPX.

Ejemplo de mensaje para el agente en vivo:

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
- Trate la prueba `mode: "session"` vinculada a hilos como un segundo pase de integración
  más rico desde un hilo real de Discord o un tema de Telegram.

## Compatibilidad con sandbox

Las sesiones de ACP se ejecutan actualmente en el tiempo de ejecución del host, no dentro del sandbox de OpenClaw.

Limitaciones actuales:

- Si la sesión solicitante está en sandbox, las generaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución aplicada por sandbox.

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

Consulte [Slash Commands](/es/tools/slash-commands).

## Resolución del objetivo de la sesión

La mayoría de las acciones `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta la clave
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Vinculación del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Reserva de la sesión solicitante actual

Los enlaces de conversación actual y los enlaces de hilos participan en el paso 2.

Si no se resuelve ningún destino, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de enlace de generación

`/acp spawn` admite `--bind here|off`.

| Modo   | Comportamiento                                                                  |
| ------ | ------------------------------------------------------------------------------- |
| `here` | Enlaza la conversación activa actual en su lugar; falla si ninguna está activa. |
| `off`  | No crear un enlace de conversación actual.                                      |

Notas:

- `--bind here` es la ruta de operador más simple para "hacer que este canal o chat sea compatible con Codex".
- `--bind here` no crea un hilo secundario.
- `--bind here` solo está disponible en canales que exponen soporte de enlace de conversación actual.
- `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

## Modos de hilo de generación

`/acp spawn` admite `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------ |
| `auto` | En un hilo activo: enlaza ese hilo. Fuera de un hilo: crea/enlaza un hilo secundario cuando se admite. |
| `here` | Requiere un hilo activo actual; falla si no se está en uno.                                            |
| `off`  | Sin enlace. La sesión se inicia sin enlazar.                                                           |

Notas:

- En superficies sin enlace de hilo, el comportamiento predeterminado es efectivamente `off`.
- La generación de enlace de hilo requiere soporte de política de canal:
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

`/acp status` muestra las opciones efectivas de tiempo de ejecución y, cuando están disponibles, los identificadores de sesión tanto a nivel de tiempo de ejecución como a nivel de backend.

Algunos controles dependen de las capacidades del backend. Si un backend no admite un control, OpenClaw devuelve un error claro de control no admitido.

## Libro de recetas de comandos de ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; vinculación opcional actual o de hilo.                     | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión de destino.                           | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos de hilo.                               | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer el modo de tiempo de ejecución para la sesión de destino.         | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura genérica de opciones de configuración de tiempo de ejecución.      | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Establecer la invalidación del directorio de trabajo de tiempo de ejecución. | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer el perfil de política de aprobación.                              | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer el tiempo de espera de tiempo de ejecución (segundos).            | `/acp timeout 120`                                            |
| `/acp model`         | Establecer la invalidación del modelo de tiempo de ejecución.                | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar las invalidaciones de opciones de tiempo de ejecución de la sesión. | `/acp reset-options`                                          |
| `/acp sessions`      | Listar las sesiones recientes de ACP del almacén.                            | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, soluciones accionables.                      | `/acp doctor`                                                 |
| `/acp install`       | Imprimir los pasos deterministas de instalación y habilitación.              | `/acp install`                                                |

`/acp sessions` lee el almacén para la sesión vinculada actual o la sesión solicitante. Los comandos que aceptan los tokens `session-key`, `session-id` o `session-label` resuelven los objetivos a través del descubrimiento de sesiones de la puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Mapeo de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un definidor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza directamente la invalidación del cwd del tiempo de ejecución.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` usa la ruta de invalidación de cwd.
- `/acp reset-options` borra todas las invalidaciones de tiempo de ejecución para la sesión de destino.

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

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa salida de escape sin formato es una característica de la CLI de acpx (no la ruta normal de `agentId` de OpenClaw).

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

La configuración de vinculación de hilos es específica del adaptador de canal. Ejemplo para Discord:

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

Si la generación de ACP vinculada a hilos no funciona, verifique primero el indicador de características del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Las vinculaciones de conversación actual no requieren la creación de un hilo secundario. Requieren un contexto de conversación activo y un adaptador de canal que exponga vinculaciones de conversación ACP.

Consulte [Referencia de configuración](/es/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Las instalaciones nuevas incluyen el complemento de tiempo de ejecución `acpx` habilitado de forma predeterminada, por lo que ACP
generalmente funciona sin un paso de instalación manual del complemento.

Comience con:

```text
/acp doctor
```

Si deshabilitó `acpx`, lo negó mediante `plugins.allow` / `plugins.deny` o desea
cambiar a una copia de desarrollo local, use la ruta explícita del complemento:

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

### comando acpx y configuración de versión

De forma predeterminada, el complemento del backend acpx incluido (`acpx`) usa el binario anclado local del complemento:

1. El comando se predetermina al `node_modules/.bin/acpx` local del complemento dentro del paquete del complemento ACPX.
2. La versión esperada se predetermina a la ancla de la extensión.
3. El inicio registra el backend ACP inmediatamente como no listo.
4. Un trabajo de fondo de garantía verifica `acpx --version`.
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
- El inicio de OpenClaw permanece sin bloqueo mientras se ejecuta la verificación de estado del backend.

Consulte [Complementos](/es/tools/plugin).

### Instalación automática de dependencias

Cuando instalas OpenClaw globalmente con `npm install -g openclaw`, las dependencias
del tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente
mediante un hook de postinstalación. Si la instalación automática falla, la puerta de enlace aún se inicia
normalmente e informa de la dependencia faltante a través de `openclaw acp doctor`.

### Puente MCP de herramientas de complementos

De forma predeterminada, las sesiones de ACPX **no** exponen las herramientas registradas por complementos de OpenClaw
al arnés de ACP.

Si deseas que los agentes de ACP, como Codex o Claude Code, llamen a las herramientas de complementos
de OpenClaw instaladas, como el recordatorio/almacenamiento de memoria, habilita el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que hace esto:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en la carga inicial
  de la sesión de ACPX.
- Expone las herramientas de complementos ya registradas por los complementos
  de OpenClaw instalados y habilitados.
- Mantiene la función explícita y deshabilitada de forma predeterminada.

Notas de seguridad y confianza:

- Esto amplía la superficie de herramientas del arnés de ACP.
- Los agentes de ACP solo obtienen acceso a las herramientas de complementos ya activas en la puerta de enlace.
- Trata esto con el mismo límite de confianza que permitir que esos complementos se ejecuten en
  el propio OpenClaw.
- Revisa los complementos instalados antes de habilitarlo.

Las `mcpServers` personalizadas siguen funcionando como antes. El puente de herramientas de complementos integrado es una
comodidad opcional adicional, no un reemplazo para la configuración genérica del servidor MCP.

### Puente MCP de herramientas de OpenClaw

De forma predeterminada, las sesiones de ACPX tampoco **no** exponen las herramientas integradas de OpenClaw a través de
MCP. Habilita el puente separado de herramientas principales cuando un agente de ACP necesita herramientas
integradas seleccionadas, como `cron`:

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

Lo que hace esto:

- Inyecta un servidor MCP integrado llamado `openclaw-tools` en la carga inicial
  de la sesión de ACPX.
- Expone las herramientas integradas seleccionadas de OpenClaw. El servidor inicial expone `cron`.
- Mantiene la exposición de herramientas principales explícita y deshabilitada de forma predeterminada.

### Configuración del tiempo de espera de ejecución

El complemento `acpx` incluido establece de forma predeterminada los tiempos de ejecución integrados en un tiempo de espera
de 120 segundos. Esto da a los arneses más lentos, como Gemini CLI, tiempo suficiente para completar
el inicio y la inicialización de ACP. Anúlalo si tu host necesita un límite de tiempo de ejecución
diferente:

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

Reinicia la puerta de enlace después de cambiar este valor.

### Configuración del agente de sondas de estado

El complemento `acpx` incluido sondea un agente de arnés mientras decide si el
backend del tiempo de ejecución integrado está listo. Por defecto es `codex`. Si su implementación
usa un agente ACP predeterminado diferente, establezca el agente de sonda en el mismo id:

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

Reinicie la puerta de enlace después de cambiar este valor.

## Configuración de permisos

Las sesiones de ACP se ejecutan de forma no interactiva; no hay una TTY para aprobar o denegar las solicitudes de permiso de escritura de archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

Estos permisos del arnés ACPX son independientes de las aprobaciones de ejecución de OpenClaw e independientes de los indicadores de omisión del proveedor del backend de CLI, como `--permission-mode bypassPermissions` de Claude CLI. `approve-all` de ACPX es el interruptor de emergencia a nivel de arnés para las sesiones de ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente del arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                  |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay ninguna TTY interactiva disponible (lo cual siempre es el caso para las sesiones de ACP).

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

> **Importante:** Actualmente, OpenClaw tiene como valor predeterminado `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier escritura o ejecución que active una solicitud de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesita restringir los permisos, establezca `nonInteractivePermissions` en `deny` para que las sesiones se degraden elegantemente en lugar de fallar.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                         | Solución                                                                                                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ACP runtime backend is not configured`                                     | Complemento de backend faltante o deshabilitado.                                                       | Instale y habilite el complemento de backend, luego ejecute `/acp doctor`.                                                                                                                                         |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                         | Configure `acp.enabled=true`.                                                                                                                                                                                      |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho desde mensajes de hilo normales deshabilitado.                                                | Configure `acp.dispatch.enabled=true`.                                                                                                                                                                             |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no en la lista de permitidos.                                                                   | Use `agentId` permitidos o actualice `acp.allowedAgents`.                                                                                                                                                          |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                                 | Ejecute `/acp sessions`, copie la clave/etiqueta exacta, reintente.                                                                                                                                                |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación enlazable activa.                                             | Muévase al chat/canal de destino y reintente, o use generación no enlazada.                                                                                                                                        |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de enlace ACP de conversación actual.                                 | Use `/acp spawn ... --thread ...` donde sea compatible, configure `bindings[]` de nivel superior, o muévase a un canal compatible.                                                                                 |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                                    | Muévase al hilo de destino o use `--thread auto`/`off`.                                                                                                                                                            |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es propietario del objetivo de enlace activo.                                             | Vuelva a enlazar como propietario o use una conversación o hilo diferente.                                                                                                                                         |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de enlace de hilo.                                                    | Use `--thread off` o muévase a un adaptador/canal compatible.                                                                                                                                                      |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en zona de pruebas. | Use `runtime="subagent"` desde sesiones en zona de pruebas, o ejecute la generación de ACP desde una sesión sin zona de pruebas.                                                                                   |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | Se solicitó `sandbox="require"` para el tiempo de ejecución de ACP.                                    | Use `runtime="subagent"` para el aislamiento necesario, o use ACP con `sandbox="inherit"` desde una sesión sin zona de pruebas.                                                                                    |
| Faltan metadatos de ACP para la sesión enlazada                             | Metadatos de sesión de ACP obsoletos/eliminados.                                                       | Recrear con `/acp spawn`, luego volver a enlazar/enfocar hilo.                                                                                                                                                     |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión ACP no interactiva.                                 | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la puerta de enlace. Consulte [Configuración de permisos](#permission-configuration).                                          |
| La sesión ACP falla temprano con poca salida                                | Las solicitudes de permiso están bloqueadas por `permissionMode`/`nonInteractivePermissions`.          | Revise los registros de la puerta de enlace para buscar `AcpRuntimeError`. Para permisos completos, configure `permissionMode=approve-all`; para degradación elegante, configure `nonInteractivePermissions=deny`. |
| La sesión ACP se bloquea indefinidamente después de completar el trabajo    | El proceso del arnés terminó pero la sesión ACP no reportó la finalización.                            | Monitoree con `ps aux \| grep acpx`; mate manualmente los procesos estancados.                                                                                                                                     |

---
summary: "Usa sesiones del runtime de ACP para Codex, Claude Code, Cursor, Gemini CLI, OpenClaw ACP y otros agentes de arnés"
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

Si pides a OpenClaw en lenguaje sencillo que "ejecuta esto en Codex" o "inicia Claude Code en un hilo", OpenClaw debe enrutar esa solicitud al runtime de ACP (no al runtime nativo de subagente). Cada generación de sesión de ACP se rastrea como una [tarea en segundo plano](/en/automation/tasks).

Si deseas que Codex o Claude Code se conecten como un cliente MCP externo directamente
a las conversaciones de canales existentes de OpenClaw, usa [`openclaw mcp serve`](/en/cli/mcp)
en lugar de ACP.

## ¿Qué página quiero?

Hay tres superficies cercanas que son fáciles de confundir:

| Quieres...                                                                          | Usa esto                      | Notas                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ejecutar Codex, Claude Code, Gemini CLI u otro arnés externo _a través_ de OpenClaw | Esta página: Agentes ACP      | Sesiones vinculadas al chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tareas en segundo plano, controles de tiempo de ejecución |
| Exponer una sesión de OpenClaw Gateway _como_ servidor ACP para un editor o cliente | [`openclaw acp`](/en/cli/acp) | Modo puente. El IDE/cliente habla ACP con OpenClaw a través de stdio/WebSocket                                                             |

## ¿Esto funciona de inmediato?

Por lo general, sí.

- Las instalaciones nuevas ahora incluyen el complemento de tiempo de ejecución `acpx` incluido habilitado de forma predeterminada.
- El complemento `acpx` incluido prefiere su binario `acpx` anclado local al complemento.
- Al iniciarse, OpenClaw sondea ese binario y se repara automáticamente si es necesario.
- Comienza con `/acp doctor` si deseas una verificación rápida de preparación.

Lo que aún puede suceder en el primer uso:

- Un adaptador de arnés de destino puede obtenerse a pedido con `npx` la primera vez que uses ese arnés.
- La autenticación del proveedor aún debe existir en el host para ese arnés.
- Si el host no tiene acceso a npm/red, las recuperaciones de adaptadores en la primera ejecución pueden fallar hasta que las cachés se precarguen o el adaptador se instale de otra manera.

Ejemplos:

- `/acp spawn codex`: OpenClaw debería estar listo para iniciar `acpx`, pero el adaptador ACP de Codex aún puede necesitar una recuperación en la primera ejecución.
- `/acp spawn claude`: la misma historia para el adaptador ACP de Claude, además de la autenticación del lado de Claude en ese host.

## Flujo de operación rápida

Use esto cuando quiera un manual de procedimientos `/acp` práctico:

1. Iniciar una sesión:
   - `/acp spawn codex --bind here`
   - `/acp spawn codex --mode persistent --thread auto`
2. Trabaje en la conversación o hilo vinculado (o diríjase explícitamente a esa clave de sesión).
3. Verificar el estado de tiempo de ejecución:
   - `/acp status`
4. Ajustar las opciones de tiempo de ejecución según sea necesario:
   - `/acp model <provider/model>`
   - `/acp permissions <profile>`
   - `/acp timeout <seconds>`
5. Empujar una sesión activa sin reemplazar el contexto:
   - `/acp steer tighten logging and continue`
6. Detener el trabajo:
   - `/acp cancel` (detener turno actual), o
   - `/acp close` (cerrar sesión + eliminar vinculaciones)

## Inicio rápido para humanos

Ejemplos de solicitudes naturales:

- "Vincula este canal de Discord a Codex."
- "Inicia una sesión persistente de Codex en un hilo aquí y manténla enfocada."
- "Ejecuta esto como una sesión ACP de Claude Code de un solo disparo y resume el resultado."
- "Vincula este chat de iMessage a Codex y mantén las respuestas de seguimiento en el mismo espacio de trabajo."
- "Usa Gemini CLI para esta tarea en un hilo y luego mantén las respuestas de seguimiento en ese mismo hilo."

Lo que OpenClaw debe hacer:

1. Elegir `runtime: "acp"`.
2. Resolver el objetivo del arnés solicitado (`agentId`, por ejemplo `codex`).
3. Si se solicita la vinculación a la conversación actual y el canal activo lo admite, vincule la sesión ACP a esa conversación.
4. De lo contrario, si se solicita la vinculación a un hilo y el canal actual lo admite, vincule la sesión ACP al hilo.
5. Enrutar los mensajes vinculados de seguimiento a esa misma sesión ACP hasta que deje de estar enfocada/cerrada/caducada.

## ACP versus sub-agentes

Use ACP cuando quiera un tiempo de ejecución de arnés externo. Use sub-agentes cuando quiera ejecuciones delegadas nativas de OpenClaw.

| Área                      | Sesión ACP                                     | Ejecución de sub-agente                               |
| ------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Tiempo de ejecución       | Complemento de backend ACP (por ejemplo, acpx) | Tiempo de ejecución de sub-agente nativo de OpenClaw  |
| Clave de sesión           | `agent:<agentId>:acp:<uuid>`                   | `agent:<agentId>:subagent:<uuid>`                     |
| Comandos principales      | `/acp ...`                                     | `/subagents ...`                                      |
| Herramienta de generación | `sessions_spawn` con `runtime:"acp"`           | `sessions_spawn` (tiempo de ejecución predeterminado) |

Consulte también [Sub-agentes](/en/tools/subagents).

## Cómo ACP ejecuta Claude Code

Para Claude Code a través de ACP, la pila es:

1. Plano de control de sesión ACP de OpenClaw
2. complemento de tiempo de ejecución `acpx` incluido
3. Adaptador ACP de Claude
4. Mecanismo de tiempo de ejecución/sesión del lado de Claude

Distinción importante:

- ACP Claude es una sesión de arnés con controles ACP, reanudación de sesión, seguimiento de tareas en segundo plano y vinculación opcional de conversación/hilo.
  Para los operadores, la regla práctica es:

- desea `/acp spawn`, sesiones vinculables, controles de tiempo de ejecución o trabajo de arnés persistente: use ACP

## Sesiones vinculadas

### Vínculos de conversación actual

Use `/acp spawn <harness> --bind here` cuando desee que la conversación actual se convierta en un espacio de trabajo ACP duradero sin crear un hilo secundario.

Comportamiento:

- OpenClaw sigue siendo el propietario del transporte del canal, la autenticación, la seguridad y la entrega.
- La conversación actual está fijada a la clave de sesión ACP generada.
- Los mensajes de seguimiento en esa conversación se enrutan a la misma sesión ACP.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión y elimina el vínculo de la conversación actual.

Lo que esto significa en la práctica:

- `--bind here` mantiene la misma superficie de chat. En Discord, el canal actual sigue siendo el canal actual.
- `--bind here` aún puede crear una nueva sesión ACP si está generando trabajo nuevo. El vínculo adjunta esa sesión a la conversación actual.
- `--bind here` no crea un hilo secundario de Discord o un tema de Telegram por sí solo.
- El tiempo de ejecución de ACP aún puede tener su propio directorio de trabajo (`cwd`) o un espacio de trabajo administrado por el backend en el disco. Ese espacio de trabajo de tiempo de ejecución es independiente de la superficie de chat y no implica un nuevo hilo de mensajería.
- Si generas un agente ACP diferente y no pasas `--cwd`, OpenClaw hereda el espacio de trabajo del **agente de destino** de forma predeterminada, no el del solicitante.
- Si falta esa ruta de espacio de trabajo heredada (`ENOENT`/`ENOTDIR`), OpenClaw vuelve al cwd predeterminado del backend en lugar de reutilizar silenciosamente el árbol incorrecto.
- Si el espacio de trabajo heredado existe pero no se puede acceder (por ejemplo, `EACCES`), la generación devuelve el error de acceso real en lugar de omitir `cwd`.

Modelo mental:

- superficie de chat: donde la gente sigue hablando (`Discord channel`, `Telegram topic`, `iMessage chat`)
- sesión ACP: el estado de ejecución duradero de Codex/Claude/Gemini al que OpenClaw enruta
- hilo/tema secundario: una superficie de mensajería adicional opcional creada solo por `--thread ...`
- espacio de trabajo de ejecución: la ubicación del sistema de archivos donde se ejecuta el arnés (`cwd`, repositorio checkout, espacio de trabajo del backend)

Ejemplos:

- `/acp spawn codex --bind here`: mantener este chat, generar o adjuntar una sesión ACP de Codex y enrutar los mensajes futuros aquí a ella
- `/acp spawn codex --thread auto`: OpenClaw puede crear un hilo/tema secundario y vincular la sesión ACP allí
- `/acp spawn codex --bind here --cwd /workspace/repo`: mismo vínculo de chat que arriba, pero Codex se ejecuta en `/workspace/repo`

Soporte de vinculación de conversación actual:

- Los canales de chat/mensajes que anuncian soporte de vinculación de conversación actual pueden usar `--bind here` a través de la ruta compartida de vinculación de conversación.
- Los canales con semánticas de hilo/tema personalizadas aún pueden proporcionar canonicalización específica del canal detrás de la misma interfaz compartida.
- `--bind here` siempre significa "vincular la conversación actual en su lugar".
- Los vínculos de conversación actuales genéricos usan el almacén de vinculación compartido de OpenClaw y sobreviven a los reinicios normales de la puerta de enlace.

Notas:

- `--bind here` y `--thread ...` son mutuamente excluyentes en `/acp spawn`.
- En Discord, `--bind here` vincula el canal o hilo actual en su lugar. `spawnAcpSessions` solo es necesario cuando OpenClaw necesita crear un hilo secundario para `--thread auto|here`.
- Si el canal activo no expone enlaces de ACP de conversación actual, OpenClaw devuelve un mensaje claro de no soportado.
- `resume` y las preguntas de "nueva sesión" son preguntas de sesión de ACP, no preguntas de canal. Puedes reutilizar o reemplazar el estado de ejecución sin cambiar la superficie de chat actual.

### Sesiones vinculadas a hilos

Cuando los enlaces de hilos están habilitados para un adaptador de canal, las sesiones de ACP pueden vincularse a hilos:

- OpenClaw vincula un hilo a una sesión de ACP de destino.
- Los mensajes de seguimiento en ese hilo se dirigen a la sesión de ACP vinculada.
- La salida de ACP se entrega de vuelta al mismo hilo.
- Desenfocar/cerrar/archivar/expiración por inactividad o expiración por antigüedad máxima elimina el enlace.

El soporte de enlace de hilos es específico del adaptador. Si el adaptador del canal activo no admite enlaces de hilos, OpenClaw devuelve un mensaje claro de no soportado/no disponible.

Marcadores de función requeridos para ACP vinculado a hilos:

- `acp.enabled=true`
- `acp.dispatch.enabled` está activado de forma predeterminada (establezca `false` para pausar el despacho de ACP)
- Marcador de creación de hilos de ACP del adaptador de canal habilitado (específico del adaptador)
  - Discord: `channels.discord.threadBindings.spawnAcpSessions=true`
  - Telegram: `channels.telegram.threadBindings.spawnAcpSessions=true`

### Canales con soporte de hilos

- Cualquier adaptador de canal que exponga capacidad de vinculación de sesión/hilo.
- Soporte integrado actual:
  - Hilos/canales de Discord
  - Temas de Telegram (temas de foro en grupos/supergrupos y temas de MD)
- Los canales de complementos pueden agregar soporte a través de la misma interfaz de vinculación.

## Configuración específica del canal

Para flujos de trabajo no efímeros, configure enlaces persistentes de ACP en entradas `bindings[]` de nivel superior.

### Modelo de vinculación

- `bindings[].type="acp"` marca un enlace de conversación persistente de ACP.
- `bindings[].match` identifica la conversación de destino:
  - Canal o hilo de Discord: `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
  - Tema del foro de Telegram: `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
  - BlueBubbles chat de grupo/DM: `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` o `chat_identifier:*` para enlaces de grupo estables.
  - iMessage chat de grupo/DM: `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`
    Se prefiere `chat_id:*` para enlaces de grupo estables.
- `bindings[].agentId` es el id del agente propietario de OpenClaw.
- Las anulaciones opcionales de ACP se encuentran bajo `bindings[].acp`:
  - `mode` (`persistent` o `oneshot`)
  - `label`
  - `cwd`
  - `backend`

### Valores predeterminados de tiempo de ejecución por agente

Use `agents.list[].runtime` para definir los valores predeterminados de ACP una vez por agente:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (id del arnés, por ejemplo `codex` o `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

Precedencia de anulación para sesiones enlazadas de ACP:

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
- En conversaciones enlazadas, `/new` y `/reset` restablecen la misma clave de sesión de ACP en su lugar.
- Los enlaces temporales de tiempo de ejecución (por ejemplo, los creados por flujos de enfoque de hilos) todavía se aplican donde están presentes.
- Para apariciones de ACP entre agentes sin un `cwd` explícito, OpenClaw hereda el espacio de trabajo del agente de destino desde la configuración del agente.
- Las rutas de espacio de trabajo heredadas que faltan vuelven al cwd predeterminado del backend; los fallos de acceso que no faltan aparecen como errores de generación.

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

- `runtime` tiene como valor predeterminado `subagent`, así que establezca `runtime: "acp"` explícitamente para las sesiones de ACP.
- Si se omite `agentId`, OpenClaw usa `acp.defaultAgent` cuando está configurado.
- `mode: "session"` requiere `thread: true` para mantener una conversación vinculada persistente.

Detalles de la interfaz:

- `task` (obligatorio): mensaje inicial enviado a la sesión de ACP.
- `runtime` (obligatorio para ACP): debe ser `"acp"`.
- `agentId` (opcional): id del arnés de destino ACP. Recurre a `acp.defaultAgent` si está establecido.
- `thread` (opcional, predeterminado `false`): solicita el flujo de vinculación de subprocesos cuando sea compatible.
- `mode` (opcional): `run` (único) o `session` (persistente).
  - el valor predeterminado es `run`
  - si se omiten `thread: true` y el modo, OpenClaw puede adoptar un comportamiento persistente según la ruta de tiempo de ejecución
  - `mode: "session"` requiere `thread: true`
- `cwd` (opcional): directorio de trabajo del tiempo de ejecución solicitado (validado por la política del backend/tiempo de ejecución). Si se omite, el inicio de ACP hereda el espacio de trabajo del agente de destino cuando está configurado; las rutas heredadas que faltan recurren a los valores predeterminados del backend, mientras que se devuelven los errores reales de acceso.
- `label` (opcional): etiqueta orientada al operador utilizada en el texto de sesión/banner.
- `resumeSessionId` (opcional): reanuda una sesión de ACP existente en lugar de crear una nueva. El agente reproduce su historial de conversación a través de `session/load`. Requiere `runtime: "acp"`.
- `streamTo` (opcional): `"parent"` transmite resúmenes de progreso de ejecución de ACP iniciales de vuelta a la sesión solicitante como eventos del sistema.
  - Cuando esté disponible, las respuestas aceptadas incluyen `streamLogPath` que apunta a un registro JSONL con alcance de sesión (`<sessionId>.acp-stream.jsonl`) que puede monitorear para obtener el historial completo de retransmisión.

### Reanudar una sesión existente

Use `resumeSessionId` para continuar una sesión ACP anterior en lugar de empezar de nuevo. El agente reproduce su historial de conversación a través de `session/load`, por lo que reanuda con el contexto completo de lo que ocurrió anteriormente.

```json
{
  "task": "Continue where we left off — fix the remaining test failures",
  "runtime": "acp",
  "agentId": "codex",
  "resumeSessionId": "<previous-session-id>"
}
```

Casos de uso comunes:

- Transferir una sesión de Codex de su portátil a su teléfono — diga a su agente que continúe donde lo dejó
- Continuar una sesión de codificación que inició interactivamente en la CLI, ahora sin interfaz a través de su agente
- Reanudar el trabajo que se interrumpió por un reinicio de la puerta de enlace o un tiempo de espera de inactividad

Notas:

- `resumeSessionId` requiere `runtime: "acp"` — devuelve un error si se usa con el tiempo de ejecución de subagente.
- `resumeSessionId` restaura el historial de conversación ACP aguas arriba; `thread` y `mode` todavía se aplican normalmente a la nueva sesión de OpenClaw que está creando, por lo que `mode: "session"` todavía requiere `thread: true`.
- El agente de destino debe admitir `session/load` (Codex y Claude Code lo hacen).
- Si no se encuentra el ID de sesión, la creación falla con un error claro; no hay reserva silenciosa a una nueva sesión.

### Prueba de humo del operador

Use esto después de un despliegue de puerta de enlace cuando desee una verificación rápida en vivo de que la creación de ACP
realmente está funcionando de extremo a extremo, no solo pasando las pruebas unitarias.

Puerta recomendada:

1. Verifique la versión/confirmación de la puerta de enlace desplegada en el host de destino.
2. Confirme que la fuente desplegada incluye la aceptación de linaje ACP en
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

Ejemplo de mensaje para el agente en vivo:

```text
Use the sessions_spawn tool now with runtime: "acp", agentId: "codex", and mode: "run".
Set the task to: "Reply with exactly LIVE-ACP-SPAWN-OK".
Then report only: accepted=<yes/no>; childSessionKey=<value or none>; error=<exact text or none>.
```

Notas:

- Mantenga esta prueba de humo en `mode: "run"` a menos que esté probando intencionalmente
  sesiones ACP persistentes vinculadas a hilos.
- No exija `streamTo: "parent"` para la puerta de enlace básica. Esa ruta depende de las capacidades del solicitante/sesión y es una verificación de integración separada.
- Trate las pruebas `mode: "session"` vinculadas al hilo como una segunda y más rica pasada de integración desde un hilo real de Discord o tema de Telegram.

## Compatibilidad con el espacio aislado

Las sesiones de ACP se ejecutan actualmente en el tiempo de ejecución del host, no dentro del espacio aislado de OpenClaw.

Limitaciones actuales:

- Si la sesión del solicitante está en espacio aislado, las creaciones de ACP se bloquean tanto para `sessions_spawn({ runtime: "acp" })` como para `/acp spawn`.
  - Error: `Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host. Use runtime="subagent" from sandboxed sessions.`
- `sessions_spawn` con `runtime: "acp"` no admite `sandbox: "require"`.
  - Error: `sessions_spawn sandbox="require" is unsupported for runtime="acp" because ACP sessions run outside the sandbox. Use runtime="subagent" or sandbox="inherit".`

Use `runtime: "subagent"` cuando necesite ejecución forzada por el espacio aislado.

### Desde el comando `/acp`

Use `/acp spawn` para un control explícito del operador desde el chat cuando sea necesario.

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

Consulte [Slash Commands](/en/tools/slash-commands).

## Resolución del objetivo de la sesión

La mayoría de las acciones `/acp` aceptan un objetivo de sesión opcional (`session-key`, `session-id` o `session-label`).

Orden de resolución:

1. Argumento de objetivo explícito (o `--session` para `/acp steer`)
   - intenta la clave
   - luego el id de sesión con forma de UUID
   - luego la etiqueta
2. Vinculación del hilo actual (si esta conversación/hilo está vinculado a una sesión ACP)
3. Reserva de sesión del solicitante actual

Las vinculaciones de conversación actual y las vinculaciones de hilo participan ambas en el paso 2.

Si no se resuelve ningún objetivo, OpenClaw devuelve un error claro (`Unable to resolve session target: ...`).

## Modos de vinculación de creación

`/acp spawn` admite `--bind here|off`.

| Modo   | Comportamiento                                                                   |
| ------ | -------------------------------------------------------------------------------- |
| `here` | Vincula la conversación activa actual en su lugar; falla si ninguna está activa. |
| `off`  | No cree una vinculación de conversación actual.                                  |

Notas:

- `--bind here` es la ruta de operador más simple para "hacer que este canal o chat esté respaldado por Codex".
- `--bind here` no crea un hilo secundario.
- `--bind here` solo está disponible en canales que exponen soporte de enlace de conversación actual.
- `--bind` y `--thread` no se pueden combinar en la misma llamada `/acp spawn`.

## Modos de generación de hilos

`/acp spawn` admite `--thread auto|here|off`.

| Modo   | Comportamiento                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `auto` | En un hilo activo: enlazar ese hilo. Fuera de un hilo: crear/enlazar un hilo secundario cuando sea compatible. |
| `here` | Requiere un hilo activo actual; falla si no hay uno.                                                           |
| `off`  | Sin enlace. La sesión se inicia sin vincular.                                                                  |

Notas:

- En superficies sin enlace de hilos, el comportamiento predeterminado es efectivamente `off`.
- La generación vinculada a hilos requiere el soporte de la política del canal:
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

`/acp status` muestra las opciones de tiempo de ejecución efectivas y, cuando están disponibles, los identificadores de sesión tanto a nivel de tiempo de ejecución como a nivel de backend.

Algunos controles dependen de las capacidades del backend. Si un backend no admite un control, OpenClaw devuelve un error claro de control no admitido.

## Libro de recetas de comandos ACP

| Comando              | Lo que hace                                                                  | Ejemplo                                                       |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Crear sesión ACP; enlace actual opcional o enlace de hilo.                   | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Cancelar turno en curso para la sesión de destino.                           | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Enviar instrucción de dirección a la sesión en ejecución.                    | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Cerrar sesión y desvincular objetivos del hilo.                              | `/acp close`                                                  |
| `/acp status`        | Mostrar backend, modo, estado, opciones de tiempo de ejecución, capacidades. | `/acp status`                                                 |
| `/acp set-mode`      | Establecer modo de tiempo de ejecución para la sesión de destino.            | `/acp set-mode plan`                                          |
| `/acp set`           | Escritura genérica de opción de configuración de tiempo de ejecución.        | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Establecer anulación del directorio de trabajo de tiempo de ejecución.       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Establecer perfil de política de aprobación.                                 | `/acp permissions strict`                                     |
| `/acp timeout`       | Establecer tiempo de espera de tiempo de ejecución (segundos).               | `/acp timeout 120`                                            |
| `/acp model`         | Establecer anulación de modelo de tiempo de ejecución.                       | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Eliminar anulaciones de opciones de tiempo de ejecución de la sesión.        | `/acp reset-options`                                          |
| `/acp sessions`      | Listar sesiones ACP recientes del almacenamiento.                            | `/acp sessions`                                               |
| `/acp doctor`        | Salud del backend, capacidades, correcciones realizables.                    | `/acp doctor`                                                 |
| `/acp install`       | Imprimir pasos deterministas de instalación y habilitación.                  | `/acp install`                                                |

`/acp sessions` lee el almacenamiento para la sesión vinculada actual o la sesión solicitante. Los comandos que aceptan `session-key`, `session-id` o `session-label` tokens resuelven los objetivos a través del descubrimiento de sesiones de puerta de enlace, incluidas las raíces `session.store` personalizadas por agente.

## Asignación de opciones de tiempo de ejecución

`/acp` tiene comandos de conveniencia y un definidor genérico.

Operaciones equivalentes:

- `/acp model <id>` se asigna a la clave de configuración de tiempo de ejecución `model`.
- `/acp permissions <profile>` se asigna a la clave de configuración de tiempo de ejecución `approval_policy`.
- `/acp timeout <seconds>` se asigna a la clave de configuración de tiempo de ejecución `timeout`.
- `/acp cwd <path>` actualiza directamente la anulación del cwd de tiempo de ejecución.
- `/acp set <key> <value>` es la ruta genérica.
  - Caso especial: `key=cwd` utiliza la ruta de anulación del cwd.
- `/acp reset-options` borra todas las anulaciones de tiempo de ejecución para la sesión de destino.

## soporte de arnés acpx (actual)

Alias de arnés integrados actuales de acpx:

- `claude`
- `codex`
- `copilot`
- `cursor` (CLI de Cursor: `cursor-agent acp`)
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

Cuando OpenClaw utiliza el backend acpx, prefiera estos valores para `agentId` a menos que su configuración de acpx defina alias de agentes personalizados.
Si su instalación local de Cursor todavía expone ACP como `agent acp`, anule el comando del agente `cursor` en su configuración de acpx en lugar de cambiar el valor predeterminado integrado.

El uso directo de la CLI de acpx también puede apuntar a adaptadores arbitrarios a través de `--agent <command>`, pero esa escapa de acceso sin formato es una característica de la CLI de acpx (no la ruta normal de OpenClaw `agentId`).

## Configuración requerida

Línea base de ACP central:

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

Si la creación de ACP ligada a subprocesos no funciona, verifique primero el indicador de función del adaptador:

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

Los enlaces de conversación actual no requieren la creación de subprocesos secundarios. Requieren un contexto de conversación activo y un adaptador de canal que exponga enlaces de conversación ACP.

Consulte [Referencia de configuración](/en/gateway/configuration-reference).

## Configuración del complemento para el backend acpx

Las instalaciones nuevas incluyen el complemento de tiempo de ejecución `acpx` incluido habilitado de forma predeterminada, por lo que ACP
generalmente funciona sin un paso de instalación manual del complemento.

Comience con:

```text
/acp doctor
```

Si deshabilitaste `acpx`, lo denegaste a través de `plugins.allow` / `plugins.deny`, o deseas
cambiar a una versión de desarrollo local, usa la ruta explícita del complemento:

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

Instalación en el espacio de trabajo local durante el desarrollo:

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

Luego verifica el estado del backend:

```text
/acp doctor
```

### comando y configuración de versión de acpx

De manera predeterminada, el complemento del backend acpx incluido (`acpx`) utiliza el binario fijado local del complemento:

1. El comando usa por defecto el `node_modules/.bin/acpx` local del complemento dentro del paquete del complemento ACPX.
2. La versión esperada utiliza por defecto la fijación de la extensión.
3. Al iniciarse, registra el backend ACP inmediatamente como no listo.
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

- `command` acepta una ruta absoluta, una ruta relativa o un nombre de comando (`acpx`).
- Las rutas relativas se resuelven desde el directorio del espacio de trabajo de OpenClaw.
- `expectedVersion: "any"` deshabilita la coincidencia estricta de versiones.
- Cuando `command` apunta a un binario/ruta personalizado, se deshabilita la autoinstalación local del complemento.
- El inicio de OpenClaw sigue sin bloquearse mientras se ejecuta la verificación de estado del backend.

Consulte [Complementos](/en/tools/plugin).

### Instalación automática de dependencias

Cuando instalas OpenClaw globalmente con `npm install -g openclaw`, las dependencias
del tiempo de ejecución de acpx (binarios específicos de la plataforma) se instalan automáticamente
mediante un gancho postinstall. Si la instalación automática falla, la puerta de enlace aún se inicia
normalmente e informa la dependencia faltante a través de `openclaw acp doctor`.

### Puente MCP de herramientas de complementos

De forma predeterminada, las sesiones ACPX **no** exponen las herramientas registradas en el complemento de OpenClaw al
arnés ACP.

Si deseas que los agentes de ACP, como Codex o Claude Code, llamen a las herramientas de
complementos de OpenClaw instaladas, como recuperación/almacenamiento de memoria, habilita el puente dedicado:

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

Lo que esto hace:

- Inyecta un servidor MCP integrado llamado `openclaw-plugin-tools` en la sesión
  de ACPX.
- Expone las herramientas de complementos ya registradas por los complementos de OpenClaw
  instalados y habilitados.
- Mantiene la función explícita y desactivada por defecto.

Notas de seguridad y confianza:

- Esto expande la superficie de herramientas del arnés ACP.
- Los agentes ACP obtienen acceso solo a las herramientas de complementos ya activas en la puerta de enlace.
- Trate esto con el mismo límite de confianza que permitir que esos complementos se ejecuten en OpenClaw mismo.
- Revise los complementos instalados antes de habilitarlo.

Los `mcpServers` personalizados siguen funcionando como antes. El puente de herramientas de complementos integrado es una conveniencia opcional adicional, no un reemplazo para la configuración genérica del servidor MCP.

## Configuración de permisos

Las sesiones ACP se ejecutan de forma no interactiva: no hay ninguna TTY para aprobar o denegar las solicitudes de permiso de escritura en archivos y ejecución de shell. El complemento acpx proporciona dos claves de configuración que controlan cómo se manejan los permisos:

Estos permisos de arnés ACPX están separados de las aprobaciones de ejecución de OpenClaw y separados de las banderas de omisión del proveedor del backend de CLI, como el `--permission-mode bypassPermissions` de Claude CLI. El `approve-all` de ACPX es el interruptor de emergencia (break-glass) a nivel de arnés para sesiones ACP.

### `permissionMode`

Controla qué operaciones puede realizar el agente del arnés sin solicitar confirmación.

| Valor           | Comportamiento                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `approve-all`   | Aprobar automáticamente todas las escrituras de archivos y comandos de shell.                  |
| `approve-reads` | Aprobar automáticamente solo las lecturas; las escrituras y ejecuciones requieren solicitudes. |
| `deny-all`      | Denegar todas las solicitudes de permiso.                                                      |

### `nonInteractivePermissions`

Controla qué sucede cuando se mostraría una solicitud de permiso pero no hay ninguna TTY interactiva disponible (lo cual siempre es el caso para las sesiones ACP).

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

> **Importante:** OpenClaw actualmente usa por defecto `permissionMode=approve-reads` y `nonInteractivePermissions=fail`. En sesiones de ACP no interactivas, cualquier operación de escritura o ejecución que active un mensaje de permiso puede fallar con `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`.
>
> Si necesitas restringir permisos, establece `nonInteractivePermissions` en `deny` para que las sesiones se degraden con gracia en lugar de fallar.

## Solución de problemas

| Síntoma                                                                     | Causa probable                                                                                 | Solución                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                     | Falta el complemento de backend o está deshabilitado.                                          | Instala y habilita el complemento de backend, luego ejecuta `/acp doctor`.                                                                                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                             | ACP deshabilitado globalmente.                                                                 | Establece `acp.enabled=true`.                                                                                                                                                                            |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`           | Despacho desde mensajes de hilos normales deshabilitado.                                       | Establece `acp.dispatch.enabled=true`.                                                                                                                                                                   |
| `ACP agent "<id>" is not allowed by policy`                                 | Agente no está en la lista de permitidos.                                                      | Usa `agentId` permitidos o actualiza `acp.allowedAgents`.                                                                                                                                                |
| `Unable to resolve session target: ...`                                     | Token de clave/id/etiqueta incorrecto.                                                         | Ejecuta `/acp sessions`, copia la clave/etiqueta exacta, reintenta.                                                                                                                                      |
| `--bind here requires running /acp spawn inside an active ... conversation` | `--bind here` usado sin una conversación enlazable activa.                                     | Muévete al chat/canal objetivo y reintenta, o usa una generación sin enlace.                                                                                                                             |
| `Conversation bindings are unavailable for <channel>.`                      | El adaptador carece de capacidad de enlace ACP de conversación actual.                         | Usa `/acp spawn ... --thread ...` cuando sea compatible, configura `bindings[]` de nivel superior, o muévete a un canal compatible.                                                                      |
| `--thread here requires running /acp spawn inside an active ... thread`     | `--thread here` usado fuera de un contexto de hilo.                                            | Muévete al hilo objetivo o usa `--thread auto`/`off`.                                                                                                                                                    |
| `Only <user-id> can rebind this channel/conversation/thread.`               | Otro usuario es propietario del objetivo de enlace activo.                                     | Vincula nuevamente como propietario o usa una conversación o hilo diferente.                                                                                                                             |
| `Thread bindings are unavailable for <channel>.`                            | El adaptador carece de capacidad de enlace de hilo.                                            | Usa `--thread off` o muévete a un adaptador/canal compatible.                                                                                                                                            |
| `Sandboxed sessions cannot spawn ACP sessions ...`                          | El tiempo de ejecución de ACP está en el lado del host; la sesión solicitante está en sandbox. | Usa `runtime="subagent"` desde sesiones en sandbox, o ejecuta la generación de ACP desde una sesión sin sandbox.                                                                                         |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`     | `sandbox="require"` solicitado para el tiempo de ejecución de ACP.                             | Use `runtime="subagent"` para el sandboxing requerido, o use ACP con `sandbox="inherit"` desde una sesión sin sandbox.                                                                                   |
| Faltan metadatos de ACP para la sesión vinculada                            | Metadatos de sesión de ACP obsoletos/eliminados.                                               | Vuelva a crear con `/acp spawn`, luego vuelva a vincular/enfocar el hilo.                                                                                                                                |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`    | `permissionMode` bloquea escrituras/ejec en sesión de ACP no interactiva.                      | Establezca `plugins.entries.acpx.config.permissionMode` en `approve-all` y reinicie la pasarela. Consulte [Configuración de permisos](#permission-configuration).                                        |
| La sesión de ACP falla temprano con poca salida                             | Los avisos de permiso están bloqueados por `permissionMode`/`nonInteractivePermissions`.       | Verifique los registros de la pasarela para `AcpRuntimeError`. Para permisos completos, establezca `permissionMode=approve-all`; para degradación elegante, establezca `nonInteractivePermissions=deny`. |
| La sesión de ACP se detiene indefinidamente después de completar el trabajo | El proceso del arnés finalizó pero la sesión de ACP no reportó la finalización.                | Monitoree con `ps aux \| grep acpx`; elimine manualmente los procesos obsoletos.                                                                                                                         |

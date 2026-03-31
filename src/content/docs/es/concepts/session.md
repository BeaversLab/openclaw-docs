---
summary: "Reglas, claves y persistencia de la gestión de sesiones para chats"
read_when:
  - Modifying session handling or storage
title: "Gestión de Sesiones"
---

# Gestión de Sesiones

OpenClaw trata **una sesión de chat directo por agente** como principal. Los chats directos se colapsan en `agent:<agentId>:<mainKey>` (predeterminado `main`), mientras que los chats de grupo/canal obtienen sus propias claves. Se respeta `session.mainKey`.

Use `session.dmScope` para controlar cómo se agrupan los **mensajes directos**:

- `main` (predeterminado): todos los DM comparten la sesión principal para la continuidad.
- `per-peer`: aislar por id de remitente a través de canales.
- `per-channel-peer`: aislar por canal + remitente (recomendado para bandejas de entrada multiusuario).
- `per-account-channel-peer`: aislar por cuenta + canal + remitente (recomendado para bandejas de entrada multicuenta).
  Use `session.identityLinks` para asignar ids de pares con prefijo de proveedor a una identidad canónica para que la misma persona comparta una sesión de DM a través de canales cuando use `per-peer`, `per-channel-peer` o `per-account-channel-peer`.

## Modo DM seguro (recomendado para configuraciones multiusuario)

> **Advertencia de Seguridad:** Si su agente puede recibir DM de **múltiples personas**, debería considerar encarecidamente habilitar el modo DM seguro. Sin él, todos los usuarios comparten el mismo contexto de conversación, lo que puede filtrar información privada entre usuarios.

**Ejemplo del problema con la configuración predeterminada:**

- Alice (`<SENDER_A>`) envía un mensaje a su agente sobre un tema privado (por ejemplo, una cita médica)
- Bob (`<SENDER_B>`) envía un mensaje a su agente preguntando "¿De qué estábamos hablando?"
- Debido a que ambos DM comparten la misma sesión, el modelo puede responder a Bob usando el contexto previo de Alice.

**La solución:** Establezca `dmScope` para aislar las sesiones por usuario:

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    // Secure DM mode: isolate DM context per channel + sender.
    dmScope: "per-channel-peer",
  },
}
```

**Cuándo habilitar esto:**

- Tiene aprobaciones de emparejamiento para más de un remitente
- Usa una lista de permitidos de DM con múltiples entradas
- Establece `dmPolicy: "open"`
- Múltiples números de teléfono o cuentas pueden enviar mensajes a su agente

Notas:

- El valor predeterminado es `dmScope: "main"` para continuidad (todos los MD comparten la sesión principal). Esto es adecuado para configuraciones de un solo usuario.
- El proceso de incorporación de la CLI local escribe `session.dmScope: "per-channel-peer"` de forma predeterminada cuando no está establecido (se conservan los valores explícitos existentes).
- Para bandejas de entrada multi-cuenta en el mismo canal, se prefiere `per-account-channel-peer`.
- Si la misma persona te contacta en múltiples canales, usa `session.identityLinks` para colapsar sus sesiones de MD en una identidad canónica.
- Puedes verificar tus configuraciones de MD con `openclaw security audit` (consulte [seguridad](/en/cli/security)).

## El Gateway es la fuente de verdad

Todo el estado de la sesión es **propiedad del gateway** (el OpenClaw "maestro"). Los clientes de la interfaz de usuario (aplicación macOS, WebChat, etc.) deben consultar al gateway para obtener las listas de sesiones y los recuentos de tokens en lugar de leer archivos locales.

- En el **modo remoto**, el almacén de sesiones que te importa reside en el host del gateway remoto, no en tu Mac.
- Los recuentos de tokens que se muestran en las interfaces de usuario provienen de los campos del almacén del gateway (`inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`). Los clientes no analizan las transcripciones JSONL para "corregir" los totales.

## Dónde reside el estado

- En el **host del gateway**:
  - Archivo de almacén: `~/.openclaw/agents/<agentId>/sessions/sessions.json` (por agente).
- Transcripciones: `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl` (las sesiones de temas de Telegram usan `.../<SessionId>-topic-<threadId>.jsonl`).
- El almacén es un mapa `sessionKey -> { sessionId, updatedAt, ... }`. Eliminar entradas es seguro; se vuelven a crear bajo demanda.
- Las entradas de grupo pueden incluir `displayName`, `channel`, `subject`, `room` y `space` para etiquetar sesiones en las interfaces de usuario.
- Las entradas de sesión incluyen metadatos `origin` (etiqueta + sugerencias de enrutamiento) para que las interfaces de usuario puedan explicar de dónde proviene una sesión.
- OpenClaw **no** lee las carpetas de sesión heredadas de Pi/Tau.

## Mantenimiento

OpenClaw aplica el mantenimiento del almacén de sesiones para mantener `sessions.json` y los artefactos de transcripción limitados a lo largo del tiempo.

### Valores predeterminados

- `session.maintenance.mode`: `warn`
- `session.maintenance.pruneAfter`: `30d`
- `session.maintenance.maxEntries`: `500`
- `session.maintenance.rotateBytes`: `10mb`
- `session.maintenance.resetArchiveRetention`: el valor predeterminado es `pruneAfter` (`30d`)
- `session.maintenance.maxDiskBytes`: sin establecer (desactivado)
- `session.maintenance.highWaterBytes`: el valor predeterminado es `80%` de `maxDiskBytes` cuando la asignación de presupuesto está habilitada

### Cómo funciona

El mantenimiento se ejecuta durante las escrituras en el almacén de sesiones y puedes activarlo bajo demanda con `openclaw sessions cleanup`.

- `mode: "warn"`: informa qué se eliminaría pero no modifica las entradas/transcripciones.
- `mode: "enforce"`: aplica la limpieza en este orden:
  1. poda las entradas obsoletas más antiguas que `pruneAfter`
  2. limita el recuento de entradas a `maxEntries` (primero las más antiguas)
  3. archiva los archivos de transcripción de las entradas eliminadas que ya no están referenciadas
  4. purga los archivos `*.deleted.<timestamp>` y los archivos `*.reset.<timestamp>` antiguos según la política de retención
  5. rota `sessions.json` cuando excede `rotateBytes`
  6. si `maxDiskBytes` está establecido, aplica el presupuesto de disco hacia `highWaterBytes` (primero los artefactos más antiguos, luego las sesiones más antiguas)

### Advertencia de rendimiento para grandes almacenes

Los grandes almacenes de sesiones son comunes en configuraciones de alto volumen. El trabajo de mantenimiento es trabajo de la ruta de escritura, por lo que los almacenes muy grandes pueden aumentar la latencia de escritura.

Lo que más aumenta el costo:

- valores muy altos de `session.maintenance.maxEntries`
- ventanas largas de `pruneAfter` que mantienen las entradas obsoletas
- muchos artefactos de transcripción/archivo en `~/.openclaw/agents/<agentId>/sessions/`
- habilitar presupuestos de disco (`maxDiskBytes`) sin límites razonables de poda/recuento máximo

Qué hacer:

- usa `mode: "enforce"` en producción para que el crecimiento se limite automáticamente
- establece tanto los límites de tiempo como de recuento (`pruneAfter` + `maxEntries`), no solo uno
- establece `maxDiskBytes` + `highWaterBytes` para límites superiores estrictos en grandes despliegues
- mantén `highWaterBytes` significativamente por debajo de `maxDiskBytes` (el valor predeterminado es el 80%)
- ejecute `openclaw sessions cleanup --dry-run --json` después de los cambios de configuración para verificar el impacto proyectado antes de forzar
- para sesiones activas frecuentes, pase `--active-key` al ejecutar la limpieza manual

### Ejemplos de personalización

Use una política de aplicación forzosa conservadora:

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "45d",
      maxEntries: 800,
      rotateBytes: "20mb",
      resetArchiveRetention: "14d",
    },
  },
}
```

Habilite un presupuesto de disco duro para el directorio de sesiones:

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      maxDiskBytes: "1gb",
      highWaterBytes: "800mb",
    },
  },
}
```

Ajuste para instalaciones más grandes (ejemplo):

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "14d",
      maxEntries: 2000,
      rotateBytes: "25mb",
      maxDiskBytes: "2gb",
      highWaterBytes: "1.6gb",
    },
  },
}
```

Vista previa o forzar mantenimiento desde la CLI:

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

## Poda de sesiones

OpenClaw recorta **los resultados de herramientas antiguos** del contexto en memoria justo antes de las llamadas al LLM de forma predeterminada.
Esto **no** reescribe el historial JSONL. Consulte [/concepts/session-pruning](/en/concepts/session-pruning).

## Vaciado de memoria antes de la compactación

Cuando una sesión está cerca de la compactación automática, OpenClaw puede ejecutar un **vaciado silencioso de memoria**
turno que recuerda al modelo escribir notas duraderas en el disco. Esto solo se ejecuta cuando
el espacio de trabajo es escribible. Consulte [Memory](/en/concepts/memory) y
[Compaction](/en/concepts/compaction).

## Mapeo de transportes → claves de sesión

- Los chats directos siguen `session.dmScope` (predeterminado `main`).
  - `main`: `agent:<agentId>:<mainKey>` (continuidad a través de dispositivos/canales).
    - Múltiples números de teléfono y canales pueden asignarse a la misma clave principal del agente; actúan como transportes hacia una sola conversación.
  - `per-peer`: `agent:<agentId>:direct:<peerId>`.
  - `per-channel-peer`: `agent:<agentId>:<channel>:direct:<peerId>`.
  - `per-account-channel-peer`: `agent:<agentId>:<channel>:<accountId>:direct:<peerId>` (accountId por defecto es `default`).
  - Si `session.identityLinks` coincide con un id de par con prefijo de proveedor (por ejemplo `telegram:123`), la clave canónica reemplaza `<peerId>` para que la misma persona comparta una sesión a través de canales.
- Los chats de grupo aíslan el estado: `agent:<agentId>:<channel>:group:<id>` (las salas/canales usan `agent:<agentId>:<channel>:channel:<id>`).
  - Los temas del foro de Telegram agregan `:topic:<threadId>` al id del grupo para el aislamiento.
  - Las claves `group:<id>` heredadas todavía se reconocen para la migración.
- Los contextos entrantes aún pueden usar `group:<id>`; el canal se infiere de `Provider` y se normaliza a la forma canónica `agent:<agentId>:<channel>:group:<id>`.
- Otras fuentes:
  - Trabajos Cron: `cron:<job.id>` (aislado) o `session:<custom-id>` personalizado (persistente)
  - Webhooks: `hook:<uuid>` (a menos que se establezca explícitamente por el hook)
  - Ejecuciones de nodos: `node-<nodeId>`

## Ciclo de vida

- Política de restablecimiento: las sesiones se reutilizan hasta que caducan, y la caducidad se evalúa en el siguiente mensaje entrante.
- Restablecimiento diario: por defecto a las **4:00 AM hora local en el host de puerta de enlace**. Una sesión está obsoleta una vez que su última actualización es anterior a la hora de restablecimiento diario más reciente.
- Restablecimiento por inactividad (opcional): `idleMinutes` añade una ventana de inactividad deslizante. Cuando se configuran ambos restablecimientos, diario y por inactividad, **el que caduque primero** fuerza una nueva sesión.
- Solo inactividad heredado: si establece `session.idleMinutes` sin ninguna configuración `session.reset`/`resetByType`, OpenClaw se mantiene en modo solo inactividad por compatibilidad con versiones anteriores.
- Anulaciones por tipo (opcional): `resetByType` le permite anular la política para sesiones `direct`, `group` y `thread` (thread = hilos de Slack/Discord, temas de Telegram, hilos de Matrix cuando son proporcionados por el conector).
- Anulaciones por canal (opcional): `resetByChannel` anula la política de restablecimiento para un canal (se aplica a todos los tipos de sesión para ese canal y tiene prioridad sobre `reset`/`resetByType`).
- Disparadores de restablecimiento: `/new` o `/reset` exactos (más cualquier extra en `resetTriggers`) inician un id de sesión nuevo y pasan el resto del mensaje a través. `/new <model>` acepta un alias de modelo, `provider/model`, o nombre de proveedor (coincidencia aproximada) para establecer el modelo de la nueva sesión. Si se envía `/new` o `/reset` solo, OpenClaw ejecuta un corto turno de saludo "hola" para confirmar el restablecimiento.
- Restablecimiento manual: elimina claves específicas del almacén o elimina la transcripción JSONL; el siguiente mensaje las vuelve a crear.
- Los trabajos cron aislados siempre generan un `sessionId` nuevo por cada ejecución (sin reutilización en inactividad).

## Política de envío (opcional)

Bloquear la entrega para tipos de sesión específicos sin enumerar ids individuales.

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } },
        { action: "deny", match: { keyPrefix: "cron:" } },
        // Match the raw session key (including the `agent:<id>:` prefix).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ],
      default: "allow",
    },
  },
}
```

Anulación en tiempo de ejecución (solo propietario):

- `/send on` → permitir para esta sesión
- `/send off` → denegar para esta sesión
- `/send inherit` → borrar la anulación y usar las reglas de configuración
  Envía estos como mensajes independientes para que se registren.

## Configuración (ejemplo de cambio de nombre opcional)

```json5
// ~/.openclaw/openclaw.json
{
  session: {
    scope: "per-sender", // keep group keys separate
    dmScope: "main", // DM continuity (set per-channel-peer/per-account-channel-peer for shared inboxes)
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      // Defaults: mode=daily, atHour=4 (gateway host local time).
      // If you also set idleMinutes, whichever expires first wins.
      mode: "daily",
      atHour: 4,
      idleMinutes: 120,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetByChannel: {
      discord: { mode: "idle", idleMinutes: 10080 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    mainKey: "main",
  },
}
```

## Inspección

- `openclaw status` — muestra la ruta del almacén y las sesiones recientes.
- `openclaw sessions --json` — vuelca cada entrada (filtra con `--active <minutes>`).
- `openclaw gateway call sessions.list --params '{}'` — obtiene las sesiones del gateway en ejecución (usa `--url`/`--token` para acceso remoto al gateway).
- Envía `/status` como un mensaje independiente en el chat para ver si el agente es alcanzable, cuánto del contexto de sesión se usa, los interruptores actuales de thinking/fast/verbose, y cuándo se actualizaron por última vez tus credenciales de WhatsApp web (ayuda a detectar necesidades de revinculación).
- Envía `/context list` o `/context detail` para ver qué hay en el prompt del sistema y los archivos del espacio de trabajo inyectados (y los mayores contribuyentes del contexto).
- Envía `/stop` (o frases de anulación independientes como `stop`, `stop action`, `stop run`, `stop openclaw`) para abortar la ejecución actual, limpiar los seguimientos en cola para esa sesión y detener cualquier ejecución de sub-agente generada desde ella (la respuesta incluye el contador de detenciones).
- Envía `/compact` (instrucciones opcionales) como un mensaje independiente para resumir el contexto anterior y liberar espacio en la ventana. Consulta [/concepts/compaction](/en/concepts/compaction).
- Las transcripciones JSONL se pueden abrir directamente para revisar las turnos completos.

## Consejos

- Mantén la clave primaria dedicada al tráfico 1:1; deja que los grupos mantengan sus propias claves.
- Al automatizar la limpieza, elimina claves individuales en lugar de todo el almacén para preservar el contexto en otros lugares.

## Metadatos de origen de la sesión

Cada entrada de sesión registra de dónde procede (con el mejor esfuerzo posible) en `origin`:

- `label`: etiqueta humana (resuelta a partir de la etiqueta de conversación + asunto de grupo/canal)
- `provider`: id de canal normalizado (incluyendo extensiones)
- `from`/`to`: ids de enrutamiento sin procesar del sobre entrante
- `accountId`: id de cuenta del proveedor (cuando es multicuenta)
- `threadId`: id de hilo/tema cuando el canal lo soporta
  Los campos de origen se rellenan para mensajes directos, canales y grupos. Si un
  conector solo actualiza el enrutamiento de entrega (por ejemplo, para mantener
  la sesión principal de un DM actualizada), aún debe proporcionar contexto
  entrante para que la sesión conserve sus metadatos explicativos. Las
  extensiones pueden hacerlo enviando `ConversationLabel`,
  `GroupSubject`, `GroupChannel`, `GroupSpace` y `SenderName` en el contexto
  entrante y llamando a `recordSessionMetaFromInbound` (o pasando el mismo contexto
  a `updateLastRoute`).

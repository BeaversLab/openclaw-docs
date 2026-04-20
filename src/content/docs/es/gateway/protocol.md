---
summary: "Protocolo de Gateway WebSocket: protocolo de enlace, tramas, versionado"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocolo de Gateway"
---

# Protocolo de Gateway (WebSocket)

El protocolo WS de Gateway es el **único plano de control + transporte de nodos** para
OpenClaw. Todos los clientes (CLI, interfaz web, aplicación macOS, nodos iOS/Android, nodos
sin cabeza) se conectan a través de WebSocket y declaran su **rol** + **alcance** en el
momento del handshake.

## Transporte

- WebSocket, tramas de texto con payloads JSON.
- La primera trama **debe** ser una solicitud `connect`.

## Handshake (conexión)

Gateway → Cliente (desafío previo a la conexión):

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Cliente → Gateway:

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Cliente:

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

`server`, `features`, `snapshot` y `policy` son todos obligatorios según el esquema
(`src/gateway/protocol/schema/frames.ts`). `canvasHostUrl` es opcional. `auth`
reporta el rol/ámbitos negociados cuando están disponibles, e incluye `deviceToken`
cuando el gateway emite uno.

Cuando no se emite ningún token de dispositivo, `hello-ok.auth` aún puede reportar los
permisos negociados:

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Cuando se emite un token de dispositivo, `hello-ok` también incluye:

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Durante el traspaso de arranque confiable (trusted bootstrap), `hello-ok.auth` también puede incluir entradas
adicionales de rol delimitadas en `deviceTokens`:

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

Para el flujo de arranque de nodo/operador integrado, el token de nodo principal permanece
`scopes: []` y cualquier token de operador traspasado permanece delimitado a la lista blanca
de operadores de arranque (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Las comprobaciones de ámbito de arranque
se mantienen con prefijo de rol: las entradas de operador solo satisfacen solicitudes de operador, y los roles
que no son operadores aún necesitan ámbitos bajo su propio prefijo de rol.

### Ejemplo de nodo

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## Tramas

- **Solicitud**: `{type:"req", id, method, params}`
- **Respuesta**: `{type:"res", id, ok, payload|error}`
- **Evento**: `{type:"event", event, payload, seq?, stateVersion?}`

Los métodos con efectos secundarios requieren **claves de idempotencia** (ver esquema).

## Roles + ámbitos

### Roles

- `operator` = cliente del plano de control (CLI/UI/automatización).
- `node` = host de capacidades (cámara/pantalla/lienzo/system.run).

### Ámbitos (operador)

Ámbitos comunes:

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

`talk.config` con `includeSecrets: true` requiere `operator.talk.secrets`
(o `operator.admin`).

Los métodos RPC de gateway registrados por plugins pueden solicitar su propio alcance de operador, pero
los prefijos de administrador central reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se resuelven en `operator.admin`.

El alcance del método es solo la primera barrera. Algunos comandos de barra alcanzados a través de
`chat.send` aplican verificaciones más estrictas a nivel de comando encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

`node.pair.approve` también tiene una verificación de alcance adicional en el momento de la aprobación encima del
alcance del método base:

- solicitudes sin comandos: `operator.pairing`
- solicitudes con comandos de nodo no ejecutivos: `operator.pairing` + `operator.write`
- solicitudes que incluyen `system.run`, `system.run.prepare` o `system.which`:
  `operator.pairing` + `operator.admin`

### Caps/comandos/permisos (nodo)

Los nodos declaran reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista blanca de comandos para invocar.
- `permissions`: interruptores granulares (p. ej., `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y hace cumplir las listas blancas del lado del servidor.

## Presencia

- `system-presence` devuelve entradas claveadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta como **operador** y **nodo**.

## Familias de métodos RPC comunes

Esta página no es un volcado completo generado, pero la superficie pública de WS es más amplia
que los ejemplos de handshake/auth anteriores. Estas son las principales familias de métodos que
el Gateway expone hoy.

`hello-ok.features.methods` es una lista de descubrimiento conservadora construida a partir de
`src/gateway/server-methods-list.ts` más las exportaciones de métodos de complementos/canales cargados.
Trátelo como descubrimiento de características, no como un volcado generado de cada asistente invocable
implementado en `src/gateway/server-methods/*.ts`.

### Sistema e identidad

- `health` devuelve la instantánea de salud de la puerta de enlace en caché o sondeada recientemente.
- `status` devuelve el resumen de la puerta de enlace al estilo `/status`; los campos sensibles se
  incluyen solo para clientes de operador con ámbito de administrador.
- `gateway.identity.get` devuelve la identidad del dispositivo de puerta de enlace utilizada por los flujos de
  retransmisión y emparejamiento.
- `system-presence` devuelve la instantánea de presencia actual para los dispositivos de
  operador/nodo conectados.
- `system-event` agrega un evento del sistema y puede actualizar/difundir el contexto
  de presencia.
- `last-heartbeat` devuelve el último evento de latido persistido.
- `set-heartbeats` alterna el procesamiento de latidos en la puerta de enlace.

### Modelos y uso

- `models.list` devuelve el catálogo de modelos permitidos en tiempo de ejecución.
- `usage.status` devuelve ventanas de uso del proveedor/resúmenes de cuota restante.
- `usage.cost` devuelve resúmenes de uso de costos agregados para un rango de fechas.
- `doctor.memory.status` devuelve la preparación de memoria vectorial/incrustación para el
  espacio de trabajo del agente predeterminado activo.
- `sessions.usage` devuelve resúmenes de uso por sesión.
- `sessions.usage.timeseries` devuelve el uso de series temporales para una sesión.
- `sessions.usage.logs` devuelve entradas de registro de uso para una sesión.

### Canales y ayudantes de inicio de sesión

- `channels.status` devuelve resúmenes de estado de complementos/canales integrados y empaquetados.
- `channels.logout` cierra la sesión en un canal/cuenta específico donde el canal
  soporta cerrar sesión.
- `web.login.start` inicia un flujo de inicio de sesión QR/web para el proveedor de canal web
  capaz de QR actual.
- `web.login.wait` espera a que ese flujo de inicio de sesión QR/web se complete e inicia el
  canal si tiene éxito.
- `push.test` envía una push de prueba de APNs a un nodo iOS registrado.
- `voicewake.get` devuelve los disparadores de palabras de activación almacenados.
- `voicewake.set` actualiza los disparadores de la palabra de activación y difunde el cambio.

### Mensajería y registros

- `send` es el RPC de entrega saliente directa para envíos dirigidos a canal/cuenta/hilo
  fuera del chat runner.
- `logs.tail` devuelve la cola configurada del archivo de registro de la puerta de enlace con control de cursor/límite
  y de bytes máximos.

### Habla y TTS

- `talk.config` devuelve la carga útil de configuración efectiva de Talk; `includeSecrets`
  requiere `operator.talk.secrets` (o `operator.admin`).
- `talk.mode` establece/difunde el estado actual del modo Talk para los clientes
  WebChat/Control UI.
- `talk.speak` sintetiza voz a través del proveedor de voz Talk activo.
- `tts.status` devuelve el estado habilitado de TTS, el proveedor activo, los proveedores de respaldo
  y el estado de configuración del proveedor.
- `tts.providers` devuelve el inventario visible de proveedores de TTS.
- `tts.enable` y `tts.disable` alternan el estado de preferencias de TTS.
- `tts.setProvider` actualiza el proveedor de TTS preferido.
- `tts.convert` ejecuta una conversión de texto a voz de un solo uso.

### Secretos, configuración, actualización y asistente

- `secrets.reload` resuelve nuevamente los SecretRefs activos e intercambia el estado del secreto en tiempo de ejecución
  solo si tiene éxito completo.
- `secrets.resolve` resuelve las asignaciones de secretos de objetivo de comando para un conjunto
  de comando/objetivo específico.
- `config.get` devuelve la instantánea y el hash de la configuración actual.
- `config.set` escribe una carga útil de configuración validada.
- `config.patch` combina una actualización parcial de configuración.
- `config.apply` valida y reemplaza la carga útil completa de configuración.
- `config.schema` devuelve el payload del esquema de configuración en vivo utilizado por la Interfaz de Control y
  herramientas de CLI: esquema, `uiHints`, versión y metadatos de generación, incluyendo
  metadatos del esquema de complementos y canales cuando el tiempo de ejecución puede cargarlo. El esquema
  incluye metadatos `title` / `description` de campo derivados de las mismas etiquetas
  y texto de ayuda utilizados por la interfaz, incluyendo ramas de composición de objeto anidado, comodín, elemento de matriz,
  y `anyOf` / `oneOf` / `allOf` cuando existe la documentación del campo coincidente.
- `config.schema.lookup` devuelve un payload de búsqueda con alcance de ruta para una ruta de
  configuración: ruta normalizada, un nodo de esquema superficial, sugerencia coincidente + `hintPath`, y
  resúmenes secundarios inmediatos para la exploración detallada en Interfaz/CLI.
  - Los nodos de esquema de búsqueda mantienen la documentación orientada al usuario y los campos comunes de validación:
    `title`, `description`, `type`, `enum`, `const`, `format`, `pattern`,
    límites numéricos/de cadena/de matriz/de objeto, y banderas booleanas como
    `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`.
  - Los resúmenes secundarios exponen `key`, `path` normalizado, `type`, `required`,
    `hasChildren`, más la `hint` / `hintPath` coincidente.
- `update.run` ejecuta el flujo de actualización de la puerta de enlace y programa un reinicio solo cuando
  la actualización en sí tuvo éxito.
- `wizard.start`, `wizard.next`, `wizard.status` y `wizard.cancel` exponen el
  asistente de incorporación a través de WS RPC.

### Familias principales existentes

#### Auxiliares de agente y espacio de trabajo

- `agents.list` devuelve las entradas de agente configuradas.
- `agents.create`, `agents.update` y `agents.delete` gestionan los registros de agentes y
  el cableado del espacio de trabajo.
- `agents.files.list`, `agents.files.get` y `agents.files.set` gestionan los
  archivos del espacio de trabajo de inicio expuestos para un agente.
- `agent.identity.get` devuelve la identidad del asistente efectivo para un agente o
  sesión.
- `agent.wait` espera a que termine una ejecución y devuelve la instantánea del terminal cuando
  está disponible.

#### Control de sesión

- `sessions.list` devuelve el índice de la sesión actual.
- `sessions.subscribe` y `sessions.unsubscribe` activan/desactivan las suscripciones a eventos de
  cambio de sesión para el cliente WS actual.
- `sessions.messages.subscribe` y `sessions.messages.unsubscribe` activan/desactivan
  las suscripciones a eventos de transcripción/mensajes para una sesión.
- `sessions.preview` devuelve vistas previas de transcripciones delimitadas para claves de
  sesión específicas.
- `sessions.resolve` resuelve o canonaliza un objetivo de sesión.
- `sessions.create` crea una nueva entrada de sesión.
- `sessions.send` envía un mensaje a una sesión existente.
- `sessions.steer` es la variante de interrupción y dirección para una sesión activa.
- `sessions.abort` aborta el trabajo activo de una sesión.
- `sessions.patch` actualiza los metadatos/sustituciones de la sesión.
- `sessions.reset`, `sessions.delete` y `sessions.compact` realizan el
  mantenimiento de la sesión.
- `sessions.get` devuelve la fila de sesión almacenada completa.
- la ejecución del chat todavía usa `chat.history`, `chat.send`, `chat.abort` y
  `chat.inject`.
- `chat.history` se normaliza para mostrar en clientes de UI: las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/ancho completo filtrados se eliminan, se omiten las filas del asistente de tokens silenciosos puros como `NO_REPLY` / `no_reply` exactas, y las filas excesivamente grandes pueden ser reemplazadas por marcadores de posición.

#### Emparejamiento de dispositivos y tokens de dispositivos

- `device.pair.list` devuelve los dispositivos emparejados pendientes y aprobados.
- `device.pair.approve`, `device.pair.reject` y `device.pair.remove` gestionan los registros de emparejamiento de dispositivos.
- `device.token.rotate` rota un token de dispositivo emparejado dentro de sus límites de rol y alcance aprobados.
- `device.token.revoke` revoca un token de dispositivo emparejado.

#### Emparejamiento de nodos, invocación y trabajo pendiente

- `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject` y `node.pair.verify` cubren el emparejamiento de nodos y la verificación de inicio (bootstrap).
- `node.list` y `node.describe` devuelven el estado del nodo conocido/conectado.
- `node.rename` actualiza una etiqueta de nodo emparejado.
- `node.invoke` reenvía un comando a un nodo conectado.
- `node.invoke.result` devuelve el resultado de una solicitud de invocación.
- `node.event` transporta eventos originados por el nodo de vuelta a la puerta de enlace.
- `node.canvas.capability.refresh` actualiza los tokens de capacidad de ámbito (scoped canvas-capability tokens).
- `node.pending.pull` y `node.pending.ack` son las APIs de cola de nodos conectados.
- `node.pending.enqueue` y `node.pending.drain` gestionan el trabajo pendiente duradero para nodos fuera de línea/desconectados.

#### Familias de aprobación

- `exec.approval.request`, `exec.approval.get`, `exec.approval.list` y
  `exec.approval.resolve` cubren solicitudes de aprobación de ejecución únicas, además de la
  búsqueda y repetición de aprobaciones pendientes.
- `exec.approval.waitDecision` espera una aprobación de ejecución pendiente y devuelve
  la decisión final (o `null` en caso de tiempo de espera).
- `exec.approvals.get` y `exec.approvals.set` gestionan instantáneas de
  políticas de aprobación de ejecución de puerta de enlace.
- `exec.approvals.node.get` y `exec.approvals.node.set` gestionan la política de
  aprobación de ejecución local del nodo a través de comandos de retransmisión de nodo.
- `plugin.approval.request`, `plugin.approval.list`,
  `plugin.approval.waitDecision` y `plugin.approval.resolve` cubren
  flujos de aprobación definidos por complementos.

#### Otras familias principales

- automatización:
  - `wake` programa una inyección de texto de activación inmediata o en el siguiente latido
  - `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`,
    `cron.run`, `cron.runs`
- habilidades/herramientas: `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`

### Familias de eventos comunes

- `chat`: actualizaciones del chat de la interfaz de usuario, como `chat.inject` y otros eventos de chat
  solo de transcripción.
- `session.message` y `session.tool`: actualizaciones de la transcripción/flujo de eventos para una
  sesión suscrita.
- `sessions.changed`: índice de sesión o metadatos cambiados.
- `presence`: actualizaciones de instantáneas de presencia del sistema.
- `tick`: evento periódico de mantenimiento de conexión / actividad.
- `health`: actualización de instantánea de estado de la puerta de enlace.
- `heartbeat`: actualización del flujo de eventos de latido.
- `cron`: evento de cambio de ejecución/trabajo de cron.
- `shutdown`: notificación de apagado de la puerta de enlace.
- `node.pair.requested` / `node.pair.resolved`: ciclo de vida del emparejamiento de nodos.
- `node.invoke.request`: difusión de solicitud de invocación de nodo.
- `device.pair.requested` / `device.pair.resolved`: ciclo de vida del dispositivo vinculado.
- `voicewake.changed`: cambió la configuración del disparador de palabra de activación.
- `exec.approval.requested` / `exec.approval.resolved`: ciclo de vida
  de aprobación de ejecución.
- `plugin.approval.requested` / `plugin.approval.resolved`: ciclo de vida
  de aprobación de complemento.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades
  para verificaciones de permiso automático.

### Métodos auxiliares del operador

- Los operadores pueden llamar a `commands.list` (`operator.read`) para obtener el inventario
  de comandos de tiempo de ejecución de un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - `scope` controla a qué superficie se dirige el `name` principal:
    - `text` devuelve el token del comando de texto principal sin el `/` inicial
    - `native` y la ruta `both` predeterminada devuelven nombres nativos compatibles con el proveedor
      cuando están disponibles
  - `textAliases` lleva alias de barra exactos como `/model` y `/m`.
  - `nativeName` lleva el nombre del comando nativo compatible con el proveedor cuando existe uno.
  - `provider` es opcional y solo afecta la nomenclatura nativa además de la disponibilidad
    de comandos de complementos nativos.
  - `includeArgs=false` omite los metadatos de argumentos serializados de la respuesta.
- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas de tiempo de ejecución para un
  agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivo en tiempo de ejecución para una sesión.
  - Se requiere `sessionKey`.
  - La puerta de enlace deriva el contexto de tiempo de ejecución de confianza del servidor de sesión en lugar de aceptar el contexto de autenticación o entrega proporcionado por el autor de la llamada.
  - La respuesta está limitada a la sesión y refleja lo que la conversación activa puede usar ahora mismo, incluyendo herramientas principales, de complementos y de canal.
- Los operadores pueden llamar a `skills.status` (`operator.read`) para obtener el inventario de habilidades visible para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - La respuesta incluye elegibilidad, requisitos faltantes, comprobaciones de configuración y opciones de instalación sanitizadas sin exponer valores brutos de secretos.
- Los operadores pueden llamar a `skills.search` y `skills.detail` (`operator.read`) para obtener metadatos de descubrimiento de ClawHub.
- Los operadores pueden llamar a `skills.install` (`operator.admin`) en dos modos:
  - Modo ClawHub: `{ source: "clawhub", slug, version?, force? }` instala una carpeta de habilidad en el directorio `skills/` del espacio de trabajo del agente predeterminado.
  - Modo de instalador de puerta de enlace: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` ejecuta una acción `metadata.openclaw.install` declarada en el host de la puerta de enlace.
- Los operadores pueden llamar a `skills.update` (`operator.admin`) en dos modos:
  - El modo ClawHub actualiza un slug rastreado o todas las instalaciones de ClawHub rastreadas en el espacio de trabajo del agente predeterminado.
  - El modo de configuración parchea valores `skills.entries.<skillKey>` tales como `enabled`, `apiKey` y `env`.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, la puerta de enlace transmite `exec.approval.requested`.
- Los clientes del operador resuelven llamando a `exec.approval.resolve` (requiere alcance `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que carecen de `systemRunPlan` son rechazadas.
- Tras la aprobación, las llamadas reenviadas de `node.invoke system.run` reutilizan ese `systemRunPlan` canónico como el contexto de comando/cwd/sesión autoritativo.
- Si un autor modifica `command`, `rawCommand`, `cwd`, `agentId` o `sessionKey` entre la preparación y el reenvío final aprobado de `system.run`, la puerta de enlace rechaza la ejecución en lugar de confiar en el payload modificado.

## Respaldo de entrega de agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar la entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los destinos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite retroceder a la ejecución solo de sesión cuando no se puede resolver una ruta de entrega externa (por ejemplo, sesiones internas/de webchat o configuraciones multicanal ambiguas).

## Versionado

- `PROTOCOL_VERSION` reside en `src/gateway/protocol/schema/protocol-schemas.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discrepancias.
- Los esquemas y modelos se generan a partir de definiciones TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes de cliente

El cliente de referencia en `src/gateway/client.ts` utiliza estos valores predeterminados. Los valores son estables en la versión 3 del protocolo y constituyen la base esperada para clientes de terceros.

| Constante                                                               | Predeterminado                                               | Fuente                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                                                      | `3`                                                          | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| Tiempo de espera de solicitud (por RPC)                                 | `30_000` ms                                                  | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Tiempo de espera de preautenticación / desafío de conexión              | `10_000` ms                                                  | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| Tiempo de espera inicial de reconexión                                  | `1_000` ms                                                   | `src/gateway/client.ts` (`backoffMs`)                      |
| Tiempo máximo de espera de reconexión                                   | `30_000` ms                                                  | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Límite de reintento rápido después del cierre del token del dispositivo | `250` ms                                                     | `src/gateway/client.ts`                                    |
| Período de gracia de detención forzada antes de `terminate()`           | `250` ms                                                     | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| Tiempo de espera predeterminado de `stopAndWait()`                      | `1_000` ms                                                   | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Intervalo de tick predeterminado (antes de `hello-ok`)                  | `30_000` ms                                                  | `src/gateway/client.ts`                                    |
| Cierre por tiempo de espera de tick                                     | código `4000` cuando el silencio exceda `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                                                     | `25 * 1024 * 1024` (25 MB)                                   | `src/gateway/server-constants.ts`                          |

El servidor anuncia el `policy.tickIntervalMs`, `policy.maxPayload`
y `policy.maxBufferedBytes` efectivos en `hello-ok`; los clientes deben respetar esos valores
en lugar de los valores predeterminados previos al protocolo de enlace.

## Auth

- La autenticación de puerta de enlace de secreto compartido usa `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sea de bucle invertido,
  satisfacen la verificación de autenticación de conexión a partir de
  los encabezados de solicitud en lugar de `connect.params.auth.*`.
- El `gateway.auth.mode: "none"` de entrada privada omite la autenticación de conexión de secreto compartido
  por completo; no exponga ese modo en entradas públicas/no confiables.
- Después del emparejamiento, la puerta de enlace emite un **token de dispositivo** con ámbito para el rol
  - ámbitos de conexión. Se devuelve en `hello-ok.auth.deviceToken` y el cliente debe
    conservarlo para futuras conexiones.
- Los clientes deben persistir el `hello-ok.auth.deviceToken` primario después de cualquier conexión exitosa.
- Volver a conectarse con ese token de dispositivo **almacenado** también debe reutilizar el conjunto de ámbitos aprobados almacenados para ese token. Esto preserva el acceso de lectura/sondeo/estado que ya se había otorgado y evita colapsar silenciosamente las reconexiones a un ámbito implícito más restringido solo de administrador.
- Ensamblaje de autenticación de conexión del lado del cliente (`selectConnectAuth` en `src/gateway/client.ts`):
  - `auth.password` es ortogonal y siempre se reenvía cuando se establece.
  - `auth.token` se completa en orden de prioridad: primero el token compartido explícito, luego un `deviceToken` explícito, y luego un token almacenado por dispositivo (claveado por `deviceId` + `role`).
  - `auth.bootstrapToken` se envía solo cuando ninguno de los anteriores resolvió un `auth.token`. Un token compartido o cualquier token de dispositivo resuelto lo suprime.
  - La promoción automática de un token de dispositivo almacenado en el reintento de una sola vez `AUTH_TOKEN_MISMATCH` está limitada a **solo endpoints de confianza**: bucle local, o `wss://` con un `tlsFingerprint` anclado. `wss://` público sin anclaje no califica.
- Las entradas adicionales de `hello-ok.auth.deviceTokens` son tokens de entrega de arranque (bootstrap). Persistalas solo cuando la conexión usó autenticación de arranque en un transporte de confianza como `wss://` o emparejamiento de bucle local/local.
- Si un cliente proporciona un `deviceToken` **explícito** o un `scopes` explícito, ese conjunto de ámbitos solicitado por el llamador permanece como autoridad; los ámbitos en caché solo se reutilizan cuando el cliente está reutilizando el token por dispositivo almacenado.
- Los tokens de dispositivo pueden ser rotados/revocados a través de `device.token.rotate` y `device.token.revoke` (requiere ámbito `operator.pairing`).
- La emisión/rotación de tokens permanece limitada al conjunto de roles aprobados registrado en la entrada de emparejamiento de ese dispositivo; rotar un token no puede expandir el dispositivo a un rol que la aprobación de emparejamiento nunca otorgó.
- Para sesiones de token de dispositivo emparejado, la gestión de dispositivos es de ámbito propio a menos que
  el llamador también tenga `operator.admin`: los llamadores no administradores pueden eliminar/revocar/rotar
  solo su entrada de dispositivo **propia**.
- `device.token.rotate` también verifica el conjunto de ámbitos de operador solicitado contra los
  ámbitos de sesión actuales del llamador. Los llamadores no administradores no pueden rotar un token a
  un conjunto de ámbitos de operador más amplio del que ya poseen.
- Los fallos de autenticación incluyen `error.details.code` más pistas de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token por dispositivo en caché.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar orientación de acción del operador.

## Identidad de dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital de un par de claves.
- Las puertas de enlace (Gateways) emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para nuevos ID de dispositivo a menos que la autoaprobación
  local esté habilitada.
- La autoaprobación de emparejamiento se centra en conexiones locales directas de bucle invertido (loopback).
- OpenClaw también tiene una ruta estrecha de autoconexión local de backend/contenedor para
  flujos de ayuda de secreto compartido de confianza.
- Las conexiones tailnet o LAN en el mismo host aún se tratan como remotas para el emparejamiento y
  requieren aprobación.
- Todos los clientes WS deben incluir la identidad `device` durante `connect` (operador + nodo).
  La interfaz de usuario de control puede omitirla solo en estos modos:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo para localhost.
  - autenticación de interfaz de usuario de control de operador `gateway.auth.mode: "trusted-proxy"` exitosa.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (ruptura de cristal, degradación de seguridad grave).
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivo

Para los clientes heredados que todavía utilizan el comportamiento de firma previa al desafío, `connect` ahora devuelve
códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

Fallos comunes de migración:

| Mensaje                     | details.code                     | details.reason           | Significado                                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | El cliente omitió `device.nonce` (o envió uno en blanco).          |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | El cliente firmó con un nonce obsoleto/incorrecto.                 |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | El payload de la firma no coincide con el payload v2.              |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | La marca de tiempo firmada está fuera del sesgo permitido.         |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` no coincide con la huella digital de la clave pública. |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Falló el formato/canonicalización de la clave pública.             |

Objetivo de migración:

- Espere siempre `connect.challenge`.
- Firme el payload v2 que incluye el nonce del servidor.
- Envíe el mismo nonce en `connect.params.device.nonce`.
- El payload de firma preferido es `v3`, que vincula `platform` y `deviceFamily`
  además de los campos device/client/role/scopes/token/nonce.
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación de
  metadatos del dispositivo emparejado todavía controla la política de comandos al reconectar.

## TLS + fijación (pinning)

- TLS es compatible con conexiones WS.
- Los clientes pueden opcionalmente fijar la huella digital del certificado de la puerta de enlace (ver config `gateway.tls`
  más `gateway.remote.tlsFingerprint` o CLI `--tls-fingerprint`).

## Ámbito (Scope)

Este protocolo expone la **API completa de la puerta de enlace** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define mediante los
esquemas TypeBox en `src/gateway/protocol/schema.ts`.

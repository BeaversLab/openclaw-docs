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
- Los marcos previos a la conexión tienen un límite de 64 KiB. Después de un protocolo de enlace exitoso, los clientes
  deben seguir los límites de `hello-ok.policy.maxPayload` y
  `hello-ok.policy.maxBufferedBytes`. Con el diagnóstico habilitado,
  los marcos entrantes demasiado grandes y los búferes de salida lentos emiten eventos de `payload.large`
  antes de que la puerta de enlace cierre o descarte el marco afectado. Estos eventos mantienen
  tamaños, límites, superficies y códigos de razón seguros. No mantienen el cuerpo del mensaje,
  el contenido de los archivos adjuntos, el cuerpo del marco sin procesar, los tokens, las cookies o los valores secretos.

## Protocolo de enlace (conectar)

Puerta de enlace → Cliente (desafío previo a la conexión):

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Cliente → Puerta de enlace:

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

Puerta de enlace → Cliente:

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
informa los roles/alcances negociados cuando están disponibles, e incluye `deviceToken`
cuando la puerta de enlace emite uno.

Cuando no se emite ningún token de dispositivo, `hello-ok.auth` aún puede informar los permisos
negociados:

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

Durante la transferencia de inicio de confianza (trusted bootstrap handoff), `hello-ok.auth` también puede incluir entradas
de rol delimitadas adicionales en `deviceTokens`:

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

Para el flujo de inicio de sesión de nodo/operador integrado, el token del nodo principal permanece
`scopes: []` y cualquier token de operador transferido permanece delimitado a la lista de permitidos
del operador de inicio de sesión (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Las comprobaciones de alcance de inicio de sesión mantienen
el prefijo de rol: las entradas de operador solo satisfacen las solicitudes de operador y los roles que no son operadores
aún necesitan alcances bajo su propio prefijo de rol.

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

Los métodos con efectos secundarios requieren **claves de idempotencia** (consulte el esquema).

## Roles y alcances

### Roles

- `operator` = cliente del plano de control (CLI/UI/automatización).
- `node` = host de capacidad (cámara/pantalla/lienzo/system.run).

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

Los métodos RPC de gateway registrados por complementos pueden solicitar su propio ámbito de operador, pero
los prefijos de administrador central reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se resuelven a `operator.admin`.

El ámbito del método es solo la primera puerta. Algunos comandos de barra alcanzados a través de
`chat.send` aplican verificaciones más estrictas a nivel de comando encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

`node.pair.approve` también tiene una verificación de ámbito adicional en el momento de la aprobación encima del
ámbito del método base:

- solicitudes sin comandos: `operator.pairing`
- solicitudes con comandos de nodo no ejecutables: `operator.pairing` + `operator.write`
- solicitudes que incluyen `system.run`, `system.run.prepare` o `system.which`:
  `operator.pairing` + `operator.admin`

### Capacidades/comandos/permisos (nodo)

Los nodos declaran reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista de permitidos de comandos para invocar.
- `permissions`: interruptores granulares (p. ej., `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y aplica listas de permitidos del lado del servidor.

## Presencia

- `system-presence` devuelve entradas claveadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta como **operador** y **nodo**.

## Ámbito de los eventos de difusión

Los eventos de difusión WebSocket enviados por el servidor están restringidos por ámbito para que las sesiones con ámbito de emparejamiento o solo de nodo no reciban pasivamente el contenido de la sesión.

- **Las tramas de chat, agente y resultado de herramienta** (incluidos los eventos `agent` transmitidos y los resultados de llamadas a herramientas) requieren al menos `operator.read`. Las sesiones sin `operator.read` omiten estas tramas por completo.
- **Las difusiones `plugin.*` definidas por el complemento** están restringidas a `operator.write` o `operator.admin`, dependiendo de cómo el complemento las haya registrado.
- **Los eventos de estado y transporte** (`heartbeat`, `presence`, `tick`, ciclo de vida de conexión/desconexión, etc.) permanecen sin restricciones para que el estado del transporte sea observable para cada sesión autenticada.
- **Las familias de eventos de difusión desconocidos** están restringidas por ámbito de manera predeterminada (cerrado por fallo) a menos que un controlador registrado las relaje explícitamente.

Cada conexión de cliente mantiene su propio número de secuencia por cliente para que las difusiones preserven el orden monótono en ese socket, incluso cuando diferentes clientes vean subconjuntos diferentes filtrados por ámbito del flujo de eventos.

## Familias comunes de métodos RPC

Esta página no es un volcado completo generado, pero la superficie WS pública es más amplia
que los ejemplos de protocolo de enlace/autenticación anteriores. Estas son las principales familias de métodos que
el Gateway expone hoy.

`hello-ok.features.methods` es una lista de descubrimiento conservadora construida a partir de
`src/gateway/server-methods-list.ts` más las exportaciones de métodos de complementos/canales cargados.
Trátela como descubrimiento de características, no como un volcado generado de cada asistente invocable
implementado en `src/gateway/server-methods/*.ts`.

### Sistema e identidad

- `health` devuelve la instantánea de estado del gateway en caché o sondeada recientemente.
- `diagnostics.stability` devuelve el registrador de estabilidad diagnóstica acotada reciente. Mantiene metadatos operativos como nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de cola/sesión, nombres de canal/complemento e identificadores de sesión. No mantiene texto de chat, cuerpos de webhook, salidas de herramientas, cuerpos de solicitudes o respuestas sin procesar, tokens, cookies ni valores secretos. Se requiere el alcance de lectura del operador.
- `status` devuelve el resumen de puerta de enlace estilo `/status`; los campos sensibles solo se incluyen para clientes operadores con alcance de administrador.
- `gateway.identity.get` devuelve la identidad del dispositivo de puerta de enlace utilizada por los flujos de retransmisión y emparejamiento.
- `system-presence` devuelve la instantánea de presencia actual para los dispositivos de operador/nodo conectados.
- `system-event` agrega un evento del sistema y puede actualizar/transmitir el contexto de presencia.
- `last-heartbeat` devuelve el último evento de latido persistente.
- `set-heartbeats` alterna el procesamiento de latidos en la puerta de enlace.

### Modelos y uso

- `models.list` devuelve el catálogo de modelos permitidos en tiempo de ejecución.
- `usage.status` devuelve ventanas de uso del proveedor/resúmenes de cuota restante.
- `usage.cost` devuelve resúmenes de uso de costos agregados para un rango de fechas.
- `doctor.memory.status` devuelve la preparación de memoria vectorial / incrustación para el espacio de trabajo del agente predeterminado activo.
- `sessions.usage` devuelve resúmenes de uso por sesión.
- `sessions.usage.timeseries` devuelve el uso de series temporales para una sesión.
- `sessions.usage.logs` devuelve entradas de registro de uso para una sesión.

### Canales y ayudantes de inicio de sesión

- `channels.status` devuelve resúmenes de estado de canales/complementos integrados e incluidos.
- `channels.logout` cierra la sesión de una cuenta/canal específica cuando el canal admite el cierre de sesión.
- `web.login.start` inicia un flujo de inicio de sesión QR/web para el proveedor de canal web actual con capacidad QR.
- `web.login.wait` espera a que se complete ese flujo de inicio de sesión QR/web e inicia el canal si tiene éxito.
- `push.test` envía una notificación push de prueba de APNs a un nodo iOS registrado.
- `voicewake.get` devuelve los disparadores de palabras de activación almacenados.
- `voicewake.set` actualiza los disparadores de palabra de activación y transmite el cambio.

### Mensajería y registros

- `send` es el RPC de entrega saliente directa para envíos dirigidos a canal/cuenta/hilo
  fuera del chat runner.
- `logs.tail` devuelve la cola del registro de archivos de la puerta de enlace configurada con controles de cursor/límite y
  de bytes máximos.

### Habla y TTS

- `talk.config` devuelve la carga útil de configuración de Talk efectiva; `includeSecrets`
  requiere `operator.talk.secrets` (o `operator.admin`).
- `talk.mode` establece/transmite el estado actual del modo Talk para los clientes
  de WebChat/Control UI.
- `talk.speak` sintetiza voz a través del proveedor de voz Talk activo.
- `tts.status` devuelve el estado habilitado de TTS, el proveedor activo, los proveedores de reserva
  y el estado de configuración del proveedor.
- `tts.providers` devuelve el inventario visible de proveedores TTS.
- `tts.enable` y `tts.disable` alternan el estado de preferencias de TTS.
- `tts.setProvider` actualiza el proveedor TTS preferido.
- `tts.convert` ejecuta una conversión de texto a voz de un solo disparo.

### Secretos, configuración, actualización y asistente

- `secrets.reload` resuelve nuevamente los SecretRefs activos e intercambia el estado del secreto en tiempo de ejecución
  solo con éxito total.
- `secrets.resolve` resuelve las asignaciones de secretos de destino de comando para un conjunto
  específico de comando/destino.
- `config.get` devuelve la instantánea y el hash de la configuración actual.
- `config.set` escribe una carga útil de configuración validada.
- `config.patch` combina una actualización parcial de configuración.
- `config.apply` valida + reemplaza la carga útil completa de configuración.
- `config.schema` devuelve el payload del esquema de configuración en vivo utilizado por la interfaz de usuario de Control y las herramientas de CLI: esquema, `uiHints`, versión y metadatos de generación, incluidos los metadatos del esquema de complemento y canal cuando el tiempo de ejecución puede cargarlo. El esquema incluye metadatos de campo `title` / `description` derivados de las mismas etiquetas y texto de ayuda que utiliza la interfaz de usuario, incluidas las ramas de composición de objeto anidado, comodín, elemento de matriz y `anyOf` / `oneOf` / `allOf` cuando existe documentación de campo coincidente.
- `config.schema.lookup` devuelve un payload de búsqueda con ámbito de ruta para una ruta de configuración: ruta normalizada, un nodo de esquema superficial, sugerencia coincidente + `hintPath`, y resúmenes de hijos inmediatos para la exploración detallada de la interfaz de usuario/CLI.
  - Los nodos de esquema de búsqueda mantienen la documentación orientada al usuario y los campos comunes de validación: `title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, límites numéricos/de cadena/de matriz/de objeto y indicadores booleanos como `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`.
  - Los resúmenes secundarios exponen `key`, `path` normalizado, `type`, `required`, `hasChildren`, además de la sugerencia coincidente `hint` / `hintPath`.
- `update.run` ejecuta el flujo de actualización de la puerta de enlace y programa un reinicio solo cuando la actualización en sí ha tenido éxito.
- `wizard.start`, `wizard.next`, `wizard.status` y `wizard.cancel` exponen el asistente de incorporación a través de WS RPC.

### Familias principales existentes

#### Ayudantes de agente y espacio de trabajo

- `agents.list` devuelve las entradas de agente configuradas.
- `agents.create`, `agents.update` y `agents.delete` gestionan los registros de agentes y el cableado del área de trabajo.
- `agents.files.list`, `agents.files.get` y `agents.files.set` gestionan los archivos de área de trabajo de arranque expuestos para un agente.
- `agent.identity.get` devuelve la identidad del asistente efectivo para un agente o sesión.
- `agent.wait` espera a que finalice una ejecución y devuelve la instantánea del terminal cuando está disponible.

#### Control de sesión

- `sessions.list` devuelve el índice de la sesión actual.
- `sessions.subscribe` y `sessions.unsubscribe` activan/desactivan las suscripciones a eventos de cambio de sesión para el cliente WS actual.
- `sessions.messages.subscribe` y `sessions.messages.unsubscribe` activan/desactivan las suscripciones a eventos de transcripción/mensajes para una sesión.
- `sessions.preview` devuelve vistas previas delimitadas de la transcripción para claves de sesión específicas.
- `sessions.resolve` resuelve o canonaliza un objetivo de sesión.
- `sessions.create` crea una nueva entrada de sesión.
- `sessions.send` envía un mensaje a una sesión existente.
- `sessions.steer` es la variante de interrupción y dirección para una sesión activa.
- `sessions.abort` aborta el trabajo activo de una sesión.
- `sessions.patch` actualiza los metadatos/sobrescrituras de la sesión.
- `sessions.reset`, `sessions.delete` y `sessions.compact` realizan el mantenimiento de la sesión.
- `sessions.get` devuelve la fila completa de la sesión almacenada.
- la ejecución del chat todavía usa `chat.history`, `chat.send`, `chat.abort` y `chat.inject`.
- `chat.history` se normaliza para visualización en clientes de interfaz de usuario: las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo filtrados ASCII/anchura completa se eliminan, se omiten las filas del asistente de tokens silenciosos puros como `NO_REPLY` / `no_reply` exactos, y las filas excesivamente grandes pueden ser reemplazadas por marcadores de posición.

#### Emparejamiento de dispositivos y tokens de dispositivo

- `device.pair.list` devuelve los dispositivos emparejados pendientes y aprobados.
- `device.pair.approve`, `device.pair.reject` y `device.pair.remove` gestionan los registros de emparejamiento de dispositivos.
- `device.token.rotate` rota un token de dispositivo emparejado dentro de sus límites de rol y ámbito aprobados.
- `device.token.revoke` revoca un token de dispositivo emparejado.

#### Emparejamiento de nodos, invocación y trabajo pendiente

- `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject` y `node.pair.verify` cubren el emparejamiento de nodos y la verificación de arranque.
- `node.list` y `node.describe` devuelven el estado de los nodos conocidos/conectados.
- `node.rename` actualiza una etiqueta de nodo emparejado.
- `node.invoke` reenvía un comando a un nodo conectado.
- `node.invoke.result` devuelve el resultado de una solicitud de invocación.
- `node.event` transporta eventos originados por el nodo de vuelta a la puerta de enlace.
- `node.canvas.capability.refresh` actualiza los tokens de capacidad de lienza con ámbito.
- `node.pending.pull` y `node.pending.ack` son las APIs de cola de nodos conectados.
- `node.pending.enqueue` y `node.pending.drain` gestionan el trabajo pendiente duradero para nodos fuera de línea/desconectados.

#### Familias de aprobación

- `exec.approval.request`, `exec.approval.get`, `exec.approval.list` y
  `exec.approval.resolve` cubren solicitudes de aprobación de ejecución únicas más la búsqueda
  y repetición de aprobaciones pendientes.
- `exec.approval.waitDecision` espera a una aprobación de ejecución pendiente y devuelve
  la decisión final (o `null` en caso de tiempo de espera agotado).
- `exec.approvals.get` y `exec.approvals.set` gestionan instantáneas de la política de
  aprobación de ejecución de la puerta de enlace.
- `exec.approvals.node.get` y `exec.approvals.node.set` gestionan la política de aprobación
  de ejecución local del nodo a través de comandos de retransmisión del nodo.
- `plugin.approval.request`, `plugin.approval.list`,
  `plugin.approval.waitDecision` y `plugin.approval.resolve` cubren
  flujos de aprobación definidos por complementos.

#### Otras familias principales

- automatización:
  - `wake` programa una inyección de texto de activación inmediata o en el próximo latido
  - `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`,
    `cron.run`, `cron.runs`
- habilidades/herramientas: `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`

### Familias de eventos comunes

- `chat`: actualizaciones de chat de la IU como `chat.inject` y otros eventos de chat
  solo de transcripción.
- `session.message` y `session.tool`: actualizaciones de la transcripción o del flujo de eventos para una
  sesión suscrita.
- `sessions.changed`: índice de sesión o metadatos cambiados.
- `presence`: actualizaciones de instantáneas de presencia del sistema.
- `tick`: evento periódico de mantenimiento de actividad/vida.
- `health`: actualización de instantánea de estado de la puerta de enlace.
- `heartbeat`: actualización del flujo de eventos de latido.
- `cron`: evento de cambio de ejecución/trabajo de cron.
- `shutdown`: notificación de apagado de la puerta de enlace.
- `node.pair.requested` / `node.pair.resolved`: ciclo de vida del emparejamiento de nodos.
- `node.invoke.request`: emisión de solicitud de invocación de nodo.
- `device.pair.requested` / `device.pair.resolved`: ciclo de vida del dispositivo emparejado.
- `voicewake.changed`: configuración de activación por palabra de despertador cambiada.
- `exec.approval.requested` / `exec.approval.resolved`: ciclo de vida
  de aprobación de ejecución.
- `plugin.approval.requested` / `plugin.approval.resolved`: ciclo de vida
  de aprobación de complemento.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades
  para verificaciones de permiso automático.

### Métodos auxiliares de operador

- Los operadores pueden llamar a `commands.list` (`operator.read`) para obtener el inventario
  de comandos en tiempo de ejecución para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - `scope` controla a qué superficie se destina el `name` principal:
    - `text` devuelve el token del comando de texto principal sin el `/` inicial
    - `native` y la ruta `both` predeterminada devuelven nombres nativos conscientes del proveedor
      cuando están disponibles
  - `textAliases` lleva alias de barra exactos como `/model` y `/m`.
  - `nativeName` lleva el nombre del comando nativo consciente del proveedor cuando existe uno.
  - `provider` es opcional y solo afecta la nomenclatura nativa más la disponibilidad
    de comandos de complementos nativos.
  - `includeArgs=false` omite los metadatos de argumentos serializados de la respuesta.
- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas en tiempo de ejecución para un
  agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivo en tiempo de ejecución para una sesión.
  - Se requiere `sessionKey`.
  - La puerta de enlace deriva el contexto de tiempo de ejecución confiable de la sesión del lado del servidor en lugar de aceptar el contexto de autenticación o entrega proporcionado por el llamador.
  - La respuesta está limitada a la sesión y refleja lo que la conversación activa puede usar en este momento, incluyendo herramientas principales, de complementos y de canal.
- Los operadores pueden llamar a `skills.status` (`operator.read`) para obtener el inventario de habilidades visible para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - La respuesta incluye la elegibilidad, los requisitos faltantes, las verificaciones de configuración y las opciones de instalación saneadas sin exponer los valores de los secretos sin procesar.
- Los operadores pueden llamar a `skills.search` y `skills.detail` (`operator.read`) para obtener metadatos de descubrimiento de ClawHub.
- Los operadores pueden llamar a `skills.install` (`operator.admin`) en dos modos:
  - Modo ClawHub: `{ source: "clawhub", slug, version?, force? }` instala una carpeta de habilidad en el espacio de trabajo del agente predeterminado `skills/`.
  - Modo instalador de puerta de enlace: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` ejecuta una acción `metadata.openclaw.install` declarada en el host de la puerta de enlace.
- Los operadores pueden llamar a `skills.update` (`operator.admin`) en dos modos:
  - El modo ClawHub actualiza un slug rastreado o todas las instalaciones rastreadas de ClawHub en el espacio de trabajo del agente predeterminado.
  - El modo Config aplica parches a los valores `skills.entries.<skillKey>` tales como `enabled`, `apiKey` y `env`.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, la puerta de enlace transmite `exec.approval.requested`.
- Los clientes del operador resuelven llamando a `exec.approval.resolve` (requiere el ámbito `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que carecen de `systemRunPlan` son rechazadas.
- Después de la aprobación, las llamadas reenviadas de `node.invoke system.run` reutilizan ese `systemRunPlan` canónico como el contexto autoritativo de comando/cwd/sesión.
- Si un cliente muta `command`, `rawCommand`, `cwd`, `agentId` o
  `sessionKey` entre la preparación y el reenvío final aprobado de `system.run`, la
  puerta de enlace rechaza la ejecución en lugar de confiar en la carga útil mutada.

## Respaldo de entrega del agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar la entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los objetivos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite el respaldo a la ejecución solo de sesión cuando no se puede resolver una ruta de entrega externa (por ejemplo, sesiones internas/webchat o configuraciones multicanal ambiguas).

## Versionado

- `PROTOCOL_VERSION` reside en `src/gateway/protocol/schema/protocol-schemas.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los esquemas y modelos se generan a partir de definiciones TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes del cliente

El cliente de referencia en `src/gateway/client.ts` utiliza estos valores predeterminados. Los valores son
estables en la versión v3 del protocolo y son la línea base esperada para clientes de terceros.

| Constante                                                     | Predeterminado                                               | Fuente                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `PROTOCOL_VERSION`                                            | `3`                                                          | `src/gateway/protocol/schema/protocol-schemas.ts`          |
| Tiempo de espera de solicitud (por RPC)                       | `30_000` ms                                                  | `src/gateway/client.ts` (`requestTimeoutMs`)               |
| Tiempo de espera de preautenticación/desafío de conexión      | `10_000` ms                                                  | `src/gateway/handshake-timeouts.ts` (clamp `250`–`10_000`) |
| Retroceso inicial de reconexión                               | `1_000` ms                                                   | `src/gateway/client.ts` (`backoffMs`)                      |
| Retroceso máximo de reconexión                                | `30_000` ms                                                  | `src/gateway/client.ts` (`scheduleReconnect`)              |
| Límite de reintento rápido después del cierre de device-token | `250` ms                                                     | `src/gateway/client.ts`                                    |
| Gracia de detención forzada antes de `terminate()`            | `250` ms                                                     | `FORCE_STOP_TERMINATE_GRACE_MS`                            |
| Tiempo de espera predeterminado de `stopAndWait()`            | `1_000` ms                                                   | `STOP_AND_WAIT_TIMEOUT_MS`                                 |
| Intervalo de tick predeterminado (pre `hello-ok`)             | `30_000` ms                                                  | `src/gateway/client.ts`                                    |
| Cierre por tiempo de espera de tick                           | código `4000` cuando el silencio excede `tickIntervalMs * 2` | `src/gateway/client.ts`                                    |
| `MAX_PAYLOAD_BYTES`                                           | `25 * 1024 * 1024` (25 MB)                                   | `src/gateway/server-constants.ts`                          |

El servidor anuncia el `policy.tickIntervalMs`, `policy.maxPayload`
y `policy.maxBufferedBytes` efectivos en `hello-ok`; los clientes deben respetar esos valores
en lugar de los valores predeterminados previos al handshake.

## Autenticación

- La autenticación de puerta de enlace de secreto compartido usa `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sea de bucle invertido
  satisfacen la verificación de autenticación de conexión desde
  los encabezados de solicitud en lugar de `connect.params.auth.*`.
- El ingreso privado `gateway.auth.mode: "none"` omite la autenticación de conexión de secreto compartido
  por completo; no exponga ese modo en ingresos públicos/no confiables.
- Después del emparejamiento, la Gateway emite un **device token** con ámbito al rol
  de conexión + ámbitos. Se devuelve en `hello-ok.auth.deviceToken` y debe ser
  persistido por el cliente para futuras conexiones.
- Los clientes deben persistir el token principal `hello-ok.auth.deviceToken` después de cualquier conexión exitosa.
- Volver a conectarse con ese token de dispositivo **almacenado** también debe reutilizar el conjunto de alcances aprobados y almacenados para ese token. Esto preserva el acceso de lectura/sondeo/estado que ya se había otorgado y evita colapsar silenciosamente las reconexiones a un alcance implícito más limitado de solo administrador.
- Ensamblaje de autenticación de conexión del lado del cliente (`selectConnectAuth` en `src/gateway/client.ts`):
  - `auth.password` es ortogonal y siempre se reenvía cuando está configurado.
  - `auth.token` se completa en orden de prioridad: primero el token compartido explícito, luego un `deviceToken` explícito, y luego un token por dispositivo almacenado (claveado por `deviceId` + `role`).
  - `auth.bootstrapToken` se envía solo cuando ninguno de los anteriores resolvió un `auth.token`. Un token compartido o cualquier token de dispositivo resuelto lo suprime.
  - La autopromoción de un token de dispositivo almacenado en el reintento de un solo disparo `AUTH_TOKEN_MISMATCH` está limitada a **solo endpoints de confianza**: bucle local (loopback), o `wss://` con un `tlsFingerprint` anclado. `wss://` públicos sin anclaje no califican.
- Las entradas adicionales `hello-ok.auth.deviceTokens` son tokens de entrega de arranque (bootstrap). Guárdelas solo cuando la conexión usó autenticación de arranque en un transporte de confianza como `wss://` o emparejamiento local/bucle local.
- Si un cliente proporciona un `deviceToken` **explícito** o un `scopes` explícito, ese conjunto de alcances solicitado por el llamador sigue siendo el autoritativo; los alcances en caché solo se reutilizan cuando el cliente está reutilizando el token por dispositivo almacenado.
- Los tokens de dispositivo se pueden rotar/revocar mediante `device.token.rotate` y `device.token.revoke` (requiere alcance `operator.pairing`).
- La emisión/rotación de tokens permanece limitada al conjunto de roles aprobados registrado en la entrada de emparejamiento de ese dispositivo; rotar un token no puede expandir el dispositivo a un rol que la aprobación de emparejamiento nunca otorgó.
- Para sesiones de token de dispositivo emparejado, la administración de dispositivos tiene su propio ámbito a menos que
  el llamador también tenga `operator.admin`: los llamadores que no son administradores pueden eliminar/revocar/rotar
  solo su **propia** entrada de dispositivo.
- `device.token.rotate` también verifica el conjunto de ámbitos de operador solicitados frente a los
  ámbitos de sesión actuales del llamador. Los llamadores que no son administradores no pueden rotar un token a
  un conjunto de ámbitos de operador más amplio del que ya tienen.
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token por dispositivo en caché.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar la guía de acción del operador.

## Identidad del dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital de un par de claves.
- Las puertas de enlace (Gateways) emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para nuevos IDs de dispositivo a menos que la autoaprobación
  local esté habilitada.
- La autoaprobación de emparejamiento se centra en conexiones de bucle invertido (loopback) local directo.
- OpenClaw también tiene una ruta de autoconexión estrecha y local de contenedor/backend para
  flujos de ayuda de secreto compartido de confianza.
- Las conexiones tailnet o LAN del mismo host todavía se tratan como remotas para el emparejamiento y
  requieren aprobación.
- Todos los clientes WS deben incluir la identidad `device` durante `connect` (operador + nodo).
  La interfaz de usuario de control puede omitirla solo en estos modos:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo para localhost.
  - autenticación exitosa de la interfaz de usuario de control del operador `gateway.auth.mode: "trusted-proxy"`.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (romper cristal, degradación de seguridad grave).
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivo

Para clientes heredados que todavía utilizan el comportamiento de firma previa al desafío, `connect` ahora devuelve
códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

Fallos comunes de migración:

| Mensaje                     | details.code                     | details.reason           | Significado                                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | El cliente omitió `device.nonce` (o lo envió en blanco).           |
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

## TLS + fijación

- TLS es compatible con conexiones WS.
- Los clientes opcionalmente pueden fijar la huella digital del certificado de la puerta de enlace (ver configuración `gateway.tls`
  más `gateway.remote.tlsFingerprint` o CLI `--tls-fingerprint`).

## Ámbito

Este protocolo expone la **API de puerta de enlace completa** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define por los
esquemas TypeBox en `src/gateway/protocol/schema.ts`.

---
summary: "Protocolo WebSocket de Gateway: enlace (handshake), tramas, versionado"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocolo de Gateway"
---

El protocolo WS de la puerta de enlace es el **único plano de control + transporte de nodos** para
OpenClaw. Todos los clientes (CLI, interfaz web, aplicación macOS, nodos iOS/Android, nodos
sin cabeza) se conectan a través de WebSocket y declaran su **rol** + **alcance** en el
momento del handshake.

## Transporte

- WebSocket, tramas de texto con cargas JSON.
- La primera trama **debe** ser una solicitud `connect`.
- Las tramas de preconexión están limitadas a 64 KiB. Después de un enlace exitoso, los clientes
  deben seguir los límites de `hello-ok.policy.maxPayload` y
  `hello-ok.policy.maxBufferedBytes`. Con el diagnóstico habilitado,
  las tramas entrantes excesivamente grandes y los búferes de salida lentos emiten eventos `payload.large`
  antes de que el gateway cierre o descarte la trama afectada. Estos eventos conservan
  tamaños, límites, superficies y códigos de motivo seguros. No conservan el cuerpo del
  mensaje, el contenido de los archivos adjuntos, el cuerpo de la trama sin procesar, tokens, cookies ni valores secretos.

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
    "maxProtocol": 4,
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
    "protocol": 4,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000
    }
  }
}
```

Mientras el Gateway aún está finalizando los sidecars de inicio, la solicitud `connect` puede
devolver un error `UNAVAILABLE` reintentable con `details.reason` establecido en
`"startup-sidecars"` y `retryAfterMs`. Los clientes deben reintentar esa respuesta
dentro de su presupuesto general de conexión en lugar de exponerla como un error de
enlace terminal.

`server`, `features`, `snapshot` y `policy` son todos obligatorios según el esquema
(`packages/gateway-protocol/src/schema/frames.ts`). `auth` también es obligatorio e informa
los roles/alcances negociados. `pluginSurfaceUrls` es opcional y asigna los nombres de
las superficies de los complementos, como `canvas`, a URL alojadas con alcance.

Las URL de superficies de complementos con ámbito pueden caducar. Los nodos pueden llamar a
`node.pluginSurface.refresh` con `{ "surface": "canvas" }` para recibir una entrada
nueva en `pluginSurfaceUrls`. La refactorización experimental del complemento Canvas no
admite la ruta de compatibilidad obsoleta `canvasHostUrl`, `canvasCapability` o
`node.canvas.capability.refresh`; los clientes nativos y
gateways actuales deben usar superficies de complementos.

Cuando no se emite ningún token de dispositivo, `hello-ok.auth` informa de los permisos
negociados sin campos de token:

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Los clientes de backend de mismo proceso de confianza (`client.id: "gateway-client"`,
`client.mode: "backend"`) pueden omitir `device` en conexiones directas de bucle invertido cuando
se autentican con el token/contraseña compartida de la puerta de enlace. Esta ruta está reservada
para RPCs del plano de control interno y evita que las líneas base de emparejamiento CLI/dispositivo obsoletas
bloqueen el trabajo del backend local, como las actualizaciones de sesión de subagente. Los clientes remotos,
clientes de origen del navegador, clientes de nodo y clientes explícitos de token de dispositivo/identidad de dispositivo
todavía usan las verificaciones normales de emparejamiento y actualización de ámbito.

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

El arranque mediante QR/código de configuración integrado es una ruta nueva de entrega móvil. Una conexión exitosa con un código de configuración de línea base devuelve un token de nodo principal más un token de operador limitado:

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

La entrega del operador se limita intencionalmente para que la incorporación mediante QR pueda iniciar el
bucle del operador móvil sin otorgar `operator.admin` o `operator.pairing`.
Incluye `operator.talk.secrets` para que el cliente nativo pueda leer la configuración
de Talk que necesita después del arranque. Los alcances administrativos y de emparejamiento más amplios requieren
un flujo de emparejamiento o token de operador aprobado por separado. Los clientes deben persistir
`hello-ok.auth.deviceTokens` solo
cuando la conexión use autenticación de arranque en un transporte confiable, como `wss://` o
emparejamiento local/bucle de retorno.

### Ejemplo de nodo

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
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

## Estructura (Framing)

- **Solicitud**: `{type:"req", id, method, params}`
- **Respuesta**: `{type:"res", id, ok, payload|error}`
- **Evento**: `{type:"event", event, payload, seq?, stateVersion?}`

Los métodos con efectos secundarios requieren **claves de idempotencia** (ver esquema).

## Roles + ámbitos

Para conocer el modelo completo de alcances del operador, las comprobaciones en el momento de la aprobación y la semántica
de los secretos compartidos, consulte [Operator scopes](/es/gateway/operator-scopes).

### Roles

- `operator` = cliente del plano de control (CLI/UI/automatización).
- `node` = host de capacidad (cámara/pantalla/lien/system.run).

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

Los métodos RPC de puerta de enlace registrados por complementos pueden solicitar su propio alcance de operador, pero los prefijos administrativos centrales reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se resuelven como `operator.admin`.

El alcance del método es solo la primera puerta. Algunos comandos de barra reached a través de
`chat.send` aplican comprobaciones más estrictas a nivel de comando además. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

`node.pair.approve` también tiene una verificación de alcance adicional en el momento de la aprobación además del
alcance del método base:

- solicitudes sin comando: `operator.pairing`
- solicitudes con comandos de nodo no ejecutables: `operator.pairing` + `operator.write`
- solicitudes que incluyen `system.run`, `system.run.prepare`, o `system.which`:
  `operator.pairing` + `operator.admin`

### Caps/commands/permissions (nodo)

Los nodos declaran reclamos de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel como `camera`, `canvas`, `screen`,
  `location`, `voice` y `talk`.
- `commands`: lista blanca de comandos para invocar.
- `permissions`: interruptores granulares (ej. `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamos** y hace cumplir las listas de permitidos del lado del servidor.

## Presencia

- `system-presence` devuelve entradas claveadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta tanto como **operador** como **nodo**.
- `node.list` incluye campos opcionales `lastSeenAtMs` y `lastSeenReason`. Los nodos conectados reportan
  su tiempo de conexión actual como `lastSeenAtMs` con el motivo `connect`; los nodos emparejados también pueden reportar
  presencia duradera en segundo plano cuando un evento de nodo de confianza actualiza sus metadatos de emparejamiento.

### Evento de actividad en segundo plano del nodo

Los nodos pueden llamar `node.event` con `event: "node.presence.alive"` para registrar que un nodo emparejado estaba
vivo durante una activación en segundo plano sin marcarlo como conectado.

```json
{
  "event": "node.presence.alive",
  "payloadJSON": "{\"trigger\":\"silent_push\",\"sentAtMs\":1737264000000,\"displayName\":\"Peter's iPhone\",\"version\":\"2026.4.28\",\"platform\":\"iOS 18.4.0\",\"deviceFamily\":\"iPhone\",\"modelIdentifier\":\"iPhone17,1\",\"pushTransport\":\"relay\"}"
}
```

`trigger` es un enumerado cerrado: `background`, `silent_push`, `bg_app_refresh`,
`significant_location`, `manual` o `connect`. Las cadenas de activador desconocidas se normalizan a
`background` por el puerta de enlace antes de la persistencia. El evento es duradero solo para sesiones de dispositivo de nodo
autenticadas; las sesiones sin dispositivo o no emparejadas devuelven `handled: false`.

Las pasarelas exitosas devuelven un resultado estructurado:

```json
{
  "ok": true,
  "event": "node.presence.alive",
  "handled": true,
  "reason": "persisted"
}
```

Las puertas de enlace (gateways) antiguas todavía pueden devolver `{ "ok": true }` para `node.event`; los clientes deben tratar eso como un
RPC reconocido, no como una persistencia de presencia duradera.

## Ámbito de eventos de difusión

Los eventos de difusión WebSocket enviados por el servidor están restringidos por ámbito para que las sesiones con ámbito de emparejamiento o solo de nodo no reciban pasivamente el contenido de la sesión.

- **Los marcos de chat, agente y resultado de herramienta** (incluidos los eventos `agent` transmitidos y los resultados de llamadas a herramientas) requieren al menos `operator.read`. Las sesiones sin `operator.read` omiten estos marcos por completo.
- **Las transmisiones `plugin.*` definidas por el complemento** están limitadas a `operator.write` o `operator.admin`, dependiendo de cómo el complemento las haya registrado.
- **Los eventos de estado y transporte** (`heartbeat`, `presence`, `tick`, ciclo de vida de conexión/desconexión, etc.) permanecen sin restricciones para que la salud del transporte siga siendo observable para cada sesión autenticada.
- **Las familias de eventos de difusión desconocidas** están restringidas por ámbito de forma predeterminada (fail-closed) a menos que un controlador registrado las relaje explícitamente.

Cada conexión de cliente mantiene su propio número de secuencia por cliente para que las difusiones preserven el orden monótono en ese socket, incluso cuando diferentes clientes vean subconjuntos diferentes del flujo de eventos filtrados por ámbito.

## Familias comunes de métodos RPC

La superficie pública de WS es más amplia que los ejemplos de enlace/autenticación anteriores. Esto
no es un volcado generado — `hello-ok.features.methods` es una lista de descubrimiento conservadora construida a partir de `src/gateway/server-methods-list.ts` además de las exportaciones de métodos de complemento/canal cargados. Trátelo como descubrimiento de características, no como una enumeración completa de `src/gateway/server-methods/*.ts`.

<AccordionGroup>
  <Accordion title="Sistema e identidad">
    - `health` devuelve la instantánea de estado del gateway almacenada en caché o recién sondeada.
    - `diagnostics.stability` devuelve el grabador de estabilidad de diagnóstico reciente y limitado. Mantiene metadatos operativos como nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de cola/sesión, nombres de canal/complemento e identificadores de sesión. No mantiene texto de chat, cuerpos de webhook, salidas de herramientas, cuerpos de solicitudes o respuestas sin procesar, tokens, cookies o valores secretos. Se requiere el alcance de lectura del operador.
    - `status` devuelve el resumen del gateway estilo `/status`; los campos confidenciales se incluyen solo para clientes de operador con alcance de administrador.
    - `gateway.identity.get` devuelve la identidad del dispositivo del gateway utilizada por los flujos de retransmisión y emparejamiento.
    - `system-presence` devuelve la instantánea de presencia actual para los dispositivos de operador/nodo conectados.
    - `system-event` agrega un evento del sistema y puede actualizar/transmitir el contexto de presencia.
    - `last-heartbeat` devuelve el evento de latido persistido más reciente.
    - `set-heartbeats` alterna el procesamiento de latidos en el gateway.

  </Accordion>

  <Accordion title="Modelos y uso">
    - `models.list` devuelve el catálogo de modelos permitidos en tiempo de ejecución. Pase `{ "view": "configured" }` para modelos configurados de tamaño de selector (`agents.defaults.models` primero, luego `models.providers.*.models`), o `{ "view": "all" }` para el catálogo completo.
    - `usage.status` devuelve resúmenes de ventanas de uso del proveedor/cuota restante.
    - `usage.cost` devuelve resúmenes de uso de costos agregados para un rango de fechas.
      Pase `agentId` para un agente, o `agentScope: "all"` para agregar los agentes configurados.
    - `doctor.memory.status` devuelve la preparación de memoria vectorial / incrustaciones en caché para el espacio de trabajo del agente predeterminado activo. Pase `{ "probe": true }` o `{ "deep": true }` solo cuando la persona que llama desea explícitamente un ping del proveedor de incrustaciones en vivo.
    - `doctor.memory.remHarness` devuelve una vista previa limitada y de solo controle del arnés REM para clientes remotos del plano de control. Puede incluir rutas del espacio de trabajo, fragmentos de memoria, markdown grounded renderizado y candidatos de promoción profunda, por lo que las personas que llaman necesitan `operator.read`.
    - `sessions.usage` devuelve resúmenes de uso por sesión. Pase `agentId` para un
      agente, o `agentScope: "all"` para listar juntos los agentes configurados.
    - `sessions.usage.timeseries` devuelve uso de series temporales para una sesión.
    - `sessions.usage.logs` devuelve entradas de registro de uso para una sesión.

  </Accordion>

  <Accordion title="Canales y asistentes de inicio de sesión">
    - `channels.status` devuelve resúmenes de estado del canal/complemento integrados y empaquetados.
    - `channels.logout` cierra la sesión en un canal/cuenta específico siempre que el canal admita el cierre de sesión.
    - `web.login.start` inicia un flujo de inicio de sesión QR/web para el proveedor de canal web actual compatible con QR.
    - `web.login.wait` espera a que ese flujo de inicio de sesión QR/web se complete e inicia el canal si se realiza correctamente.
    - `push.test` envía una notificación push de prueba de APNs a un nodo iOS registrado.
    - `voicewake.get` devuelve los desencadenadores de palabra de activación almacenados.
    - `voicewake.set` actualiza los desencadenadores de palabra de activación y difunde el cambio.

  </Accordion>

  <Accordion title="Mensajería y registros">
    - `send` es el RPC de entrega directa saliente para envíos dirigidos a canal/cuenta/hilo fuera del chat runner.
    - `logs.tail` devuelve la cola de registro de archivos del gateway configurada con controles de cursor/límite y bytes máximos.

  </Accordion>

  <Accordion title="Talk and TTS">
    - `talk.catalog` devuelve el catálogo de proveedores de Talk de solo lectura para voz, transcripción en tiempo real y voz en tiempo real. Incluye ids de proveedores, etiquetas, estado configurado, ids de modelos/voz expuestos, modos canónicos, transportes, estrategias cerebrales y indicadores de audio/capacidad en tiempo real sin devolver secretos de proveedores ni mutar la configuración global.
    - `talk.config` devuelve la carga útil de configuración efectiva de Talk; `includeSecrets` requiere `operator.talk.secrets` (o `operator.admin`).
    - `talk.session.create` crea una sesión de Talk propiedad de Gateway para `realtime/gateway-relay`, `transcription/gateway-relay` o `stt-tts/managed-room`. Para `stt-tts/managed-room`, los llamadores `operator.write` que pasan `sessionKey` también deben pasar `spawnedBy` para la visibilidad de la clave de sesión con alcance; la creación sin alcance de `sessionKey` y `brain: "direct-tools"` requieren `operator.admin`.
    - `talk.session.join` valida un token de sesión de sala administrada, emite eventos `session.ready` o `session.replaced` según sea necesario, y devuelve metadatos de sala/sesión más eventos recientes de Talk sin el token en texto plano ni el hash del token almacenado.
    - `talk.session.appendAudio` añade audio de entrada PCM en base64 a sesiones de retransmisión en tiempo real y transcripción propiedad de Gateway.
    - `talk.session.startTurn`, `talk.session.endTurn` y `talk.session.cancelTurn` controlan el ciclo de vida de los turnos de sala administrada con rechazo de turnos obsoletos antes de que se borre el estado.
    - `talk.session.cancelOutput` detiene la salida de audio del asistente, principalmente para interrupciones controladas por VAD en sesiones de retransmisión de Gateway.
    - `talk.session.submitToolResult` completa una llamada a herramienta de proveedor emitida por una sesión de retransmisión en tiempo real propiedad de Gateway. Pase `options: { willContinue: true }` para la salida de herramienta interina cuando seguirá un resultado final, o `options: { suppressResponse: true }` cuando el resultado de la herramienta debe satisfacer la llamada al proveedor sin iniciar otra respuesta de asistente en tiempo real.
    - `talk.session.steer` envía control de voz de ejecución activa a una sesión de Talk respaldada por agente propiedad de Gateway. Acepta `{ sessionId, text, mode? }`, donde `mode` es `status`, `steer`, `cancel` o `followup`; el modo omitido se clasifica a partir del texto hablado.
    - `talk.session.close` cierra una sesión de retransmisión, transcripción o sala administrada propiedad de Gateway y emite eventos terminales de Talk.
    - `talk.mode` establece/difunde el estado actual del modo Talk para los clientes WebChat/Control UI.
    - `talk.client.create` crea una sesión de proveedor en tiempo real propiedad del cliente usando `webrtc` o `provider-websocket` mientras Gateway posee la configuración, las credenciales, las instrucciones y la política de herramientas.
    - `talk.client.toolCall` permite que los transportes en tiempo real propiedad del cliente reenvíen las llamadas a herramientas de proveedor a la política de Gateway. La primera herramienta compatible es `openclaw_agent_consult`; los clientes reciben un id de ejecución y esperan eventos normales del ciclo de vida del chat antes de enviar el resultado específico del proveedor.
    - `talk.client.steer` envía control de voz de ejecución activa para transportes en tiempo real propiedad del cliente. Gateway resuelve la ejecución incrustada activa desde `sessionKey` y devuelve un resultado estructurado aceptado/rechazado en lugar de descartar silenciosamente la dirección.
    - `talk.event` es el único canal de eventos de Talk para adaptadores en tiempo real, transcripción, STT/TTS, sala administrada, telefonía y reuniones.
    - `talk.speak` sintetiza voz a través del proveedor de voz Talk activo.
    - `tts.status` devuelve el estado de TTS habilitado, el proveedor activo, los proveedores de reserva y el estado de configuración del proveedor.
    - `tts.providers` devuelve el inventario visible de proveedores de TTS.
    - `tts.enable` y `tts.disable` alternan el estado de preferencias de TTS.
    - `tts.setProvider` actualiza el proveedor de TTS preferido.
    - `tts.convert` ejecuta una conversión de texto a voz de un solo disparo.

  </Accordion>

  <Accordion title="Secretos, configuración, actualización y asistente">
    - `secrets.reload` resuelve nuevamente los SecretRefs activos e intercambia el estado de secretos en tiempo de ejecución solo si tiene éxito completo.
    - `secrets.resolve` resuelve las asignaciones de secretos de comando-destino para un conjunto específico de comando/destino.
    - `config.get` devuelve la instantánea y el hash de la configuración actual.
    - `config.set` escribe una carga útil de configuración validada.
    - `config.patch` fusiona una actualización parcial de la configuración.
    - `config.apply` valida y reemplaza la carga útil completa de la configuración.
    - `config.schema` devuelve la carga útil del esquema de configuración en vivo utilizada por la interfaz de usuario de Control y las herramientas de CLI: esquema, `uiHints`, versión y metadatos de generación, incluidos los metadatos del esquema de complemento y canal cuando el tiempo de ejecución puede cargarlo. El esquema incluye metadatos de campo `title` / `description` derivados de las mismas etiquetas y texto de ayuda utilizados por la interfaz de usuario, incluidas las ramas de composición de objeto anidado, comodín, elemento de matriz y `anyOf` / `oneOf` / `allOf` cuando existe la documentación del campo coincidente.
    - `config.schema.lookup` devuelve una carga útil de búsqueda con ámbito de ruta para una ruta de configuración: ruta normalizada, un nodo de esquema superficial, hint coincidente + `hintPath`, `reloadKind` opcional, y resúmenes secundarios inmediatos para la exploración de la interfaz de usuario/CLI. `reloadKind` es uno de `restart`, `hot` o `none` y refleja el planificador de recarga de configuración de Gateway para la ruta solicitada. Los nodos de esquema de búsqueda mantienen los documentos orientados al usuario y los campos de validación comunes (`title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, límites numéricos/cadena/matriz/objeto y marcas como `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`). Los resúmenes secundarios exponen `key`, `path` normalizado, `type`, `required`, `hasChildren`, `reloadKind` opcional, además del `hint` / `hintPath` coincidente.
    - `update.run` ejecuta el flujo de actualización de la puerta de enlace y programa un reinicio solo cuando la actualización en sí tuvo éxito; los llamadores con una sesión pueden incluir `continuationMessage` para que el inicio se reanude un turno de agente de seguimiento a través de la cola de continuación de reinicio. Las actualizaciones del administrador de paquetes desde el plano de control utilizan una transferencia de servicio administrado separada en lugar de reemplazar el árbol de paquetes dentro de la puerta de enlace en vivo. Una transferencia iniciada devuelve `ok: true` con `result.reason: "managed-service-handoff-started"` y `handoff.status: "started"`; las transferencias no disponibles o fallidas devuelven `ok: false` con `managed-service-handoff-unavailable` o `managed-service-handoff-failed`, más `handoff.command` cuando se requiere una actualización manual del shell. Durante una transferencia iniciada, el centinela de reinicio puede informar brevemente `stats.reason: "restart-health-pending"`; la continuación se retrasa hasta que la CLI verifica la puerta de enlace reiniciada y escribe el centinela final `ok`.
    - `update.status` devuelve el centinela de reinicio de actualización en caché más reciente, incluida la versión en ejecución posterior al reinicio cuando esté disponible.
    - `wizard.start`, `wizard.next`, `wizard.status` y `wizard.cancel` exponen el asistente de incorporación a través de WS RPC.

  </Accordion>

  <Accordion title="Agent and workspace helpers">
    - `agents.list` devuelve las entradas de agentes configuradas, incluidos los metadatos del modelo efectivo y del tiempo de ejecución.
    - `agents.create`, `agents.update` y `agents.delete` gestionan los registros de agentes y la conexión del espacio de trabajo.
    - `agents.files.list`, `agents.files.get` y `agents.files.set` gestionan los archivos de inicio del espacio de trabajo expuestos para un agente.
    - `tasks.list`, `tasks.get` y `tasks.cancel` exponen el libro de tareas de Gateway a clientes de SDK y operadores.
    - `artifacts.list`, `artifacts.get` y `artifacts.download` exponen resúmenes y descargas de artefactos derivados de transcripciones para un `sessionKey`, `runId` o `taskId` explícito. Las consultas de ejecuciones y tareas resuelven la sesión propietaria en el servidor y solo devuelven medios de transcripción con procedencia coincidente; las fuentes de URL inseguras o locales devuelven descargas no compatibles en lugar de recuperarlas del lado del servidor.
    - `environments.list` y `environments.status` exponen el descubrimiento de entorno local de Gateway y de nodo de solo lectura para clientes de SDK.
    - `agent.identity.get` devuelve la identidad efectiva del asistente para un agente o sesión.
    - `agent.wait` espera a que finalice una ejecución y devuelve la instantánea terminal cuando está disponible.

  </Accordion>

  <Accordion title="Control de sesión">
    - `sessions.list` devuelve el índice de sesión actual, incluyendo metadatos `agentRuntime` por fila cuando se configura un backend de tiempo de ejecución del agente.
    - `sessions.subscribe` y `sessions.unsubscribe` alternan las suscripciones a eventos de cambio de sesión para el cliente WS actual.
    - `sessions.messages.subscribe` y `sessions.messages.unsubscribe` alternan las suscripciones a eventos de transcripción/mensaje para una sesión.
    - `sessions.preview` devuelve vistas previas de transcripción delimitadas para claves de sesión específicas.
    - `sessions.describe` devuelve una fila de sesión de Gateway para una clave de sesión exacta.
    - `sessions.resolve` resuelve o canonaliza un objetivo de sesión.
    - `sessions.create` crea una nueva entrada de sesión.
    - `sessions.send` envía un mensaje a una sesión existente.
    - `sessions.steer` es la variante de interrupción y dirección para una sesión activa.
    - `sessions.abort` aborta el trabajo activo de una sesión. El autor de la llamada puede pasar `key` más `runId` opcional, o pasar solo `runId` para ejecuciones activas que el Gateway puede resolver a una sesión.
    - `sessions.patch` actualiza los metadatos/sustituciones de sesión e informa el modelo canónico resuelto más el `agentRuntime` efectivo.
    - `sessions.reset`, `sessions.delete` y `sessions.compact` realizan el mantenimiento de la sesión.
    - `sessions.get` devuelve la fila de sesión almacenada completa.
    - La ejecución del chat aún usa `chat.history`, `chat.send`, `chat.abort` y `chat.inject`. `chat.history` se normaliza para su visualización en clientes de IU: las etiquetas de directiva en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/anchura completa filtrados se eliminan, se omiten las filas del asistente de tokens silenciosos puros como `NO_REPLY` / `no_reply` exactos, y las filas demasiado grandes pueden reemplazarse con marcadores de posición.

  </Accordion>

  <Accordion title="Emparejamiento de dispositivos y tokens de dispositivo">
    - `device.pair.list` devuelve los dispositivos emparejados pendientes y aprobados.
    - `device.pair.approve`, `device.pair.reject` y `device.pair.remove` gestionan los registros de emparejamiento de dispositivos.
    - `device.token.rotate` rota un token de dispositivo emparejado dentro de su rol aprobado y los límites del ámbito de la llamada.
    - `device.token.revoke` revoca un token de dispositivo emparejado dentro de su rol aprobado y los límites del ámbito de la llamada.

  </Accordion>

  <Accordion title="Emparejamiento de nodos, invocación y trabajo pendiente">
    - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove` y `node.pair.verify` cubren el emparejamiento de nodos y la verificación de inicio.
    - `node.list` y `node.describe` devuelven el estado de los nodos conocidos/conectados.
    - `node.rename` actualiza una etiqueta de nodo emparejado.
    - `node.invoke` reenvía un comando a un nodo conectado.
    - `node.invoke.result` devuelve el resultado de una solicitud de invocación.
    - `node.event` transporta eventos originados en el nodo de vuelta a la puerta de enlace.
    - `node.pending.pull` y `node.pending.ack` son las API de cola de nodos conectados.
    - `node.pending.enqueue` y `node.pending.drain` gestionan el trabajo pendiente duradero para nodos fuera de línea/desconectados.

  </Accordion>

  <Accordion title="Familias de aprobaciones">
    - `exec.approval.request`, `exec.approval.get`, `exec.approval.list` y `exec.approval.resolve` cubren solicitudes de aprobación de ejecución de un solo uso más la búsqueda/reproducción de aprobaciones pendientes.
    - `exec.approval.waitDecision` espera una aprobación de ejecución pendiente y devuelve la decisión final (o `null` si se agota el tiempo).
    - `exec.approvals.get` y `exec.approvals.set` administran instantáneas de la política de aprobación de ejecución de la puerta de enlace.
    - `exec.approvals.node.get` y `exec.approvals.node.set` administran la política de aprobación de ejecución local del nodo a través de comandos de retransmisión del nodo.
    - `plugin.approval.request`, `plugin.approval.list`, `plugin.approval.waitDecision` y `plugin.approval.resolve` cubren flujos de aprobación definidos por complementos.

  </Accordion>

  <Accordion title="Automatización, habilidades y herramientas">
    - Automatización: `wake` programa una inyección de texto de activación inmediata o en el próximo latido; `cron.get`, `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run` y `cron.runs` administran el trabajo programado.
    - `cron.run` sigue siendo un RPC estilo enqueue para ejecuciones manuales. Los clientes que necesiten semántica de finalización deben leer el `runId` devuelto y sondear `cron.runs`.
    - `cron.runs` acepta un filtro `runId` opcional no vacío para que los clientes puedan seguir una ejecución manual en cola sin competir con otras entradas de historial para el mismo trabajo.
    - Habilidades y herramientas: `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`, `tools.invoke`.

  </Accordion>
</AccordionGroup>

### Familias de eventos comunes

- `chat`: actualizaciones de chat de la interfaz de usuario como `chat.inject` y otros eventos de chat solo de transcripción. En el protocolo v4, las cargas útiles delta llevan `deltaText`; `message` sigue siendo la instantánea acumulativa del asistente. Los reemplazos que no son de prefijo establecen `replace=true` y usan `deltaText` como el texto de reemplazo.
- `session.message`, `session.operation` y `session.tool`: actualizaciones de transcripción, operación de sesión en curso y de flujo de eventos para una sesión suscrita.
- `sessions.changed`: índice de sesión o metadatos cambiados.
- `presence`: actualizaciones de instantáneas de presencia del sistema.
- `tick`: evento periódico de mantenimiento de actividad / estado vivo.
- `health`: actualización de instantánea de estado de salud de la puerta de enlace.
- `heartbeat`: actualización del flujo de eventos de latido.
- `cron`: evento de cambio de ejecución/trabajo de cron.
- `shutdown`: notificación de apagado de la puerta de enlace.
- `node.pair.requested` / `node.pair.resolved`: ciclo de vida del emparejamiento de nodos.
- `node.invoke.request`: difusión de solicitud de invocación de nodo.
- `device.pair.requested` / `device.pair.resolved`: ciclo de vida del dispositivo emparejado.
- `voicewake.changed`: configuración de activación por palabra de despertador cambiada.
- `exec.approval.requested` / `exec.approval.resolved`: ciclo de vida de
  aprobación de ejecución.
- `plugin.approval.requested` / `plugin.approval.resolved`: ciclo de vida de
  aprobación de complementos.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades
  para comprobaciones de autorización automática.

### RPC del libro de tareas (Task ledger)

Los clientes operadores pueden inspeccionar y cancelar registros de tareas en segundo plano de la Gateway a través
del libro de tareas (task ledger) RPC. Estos métodos devuelven resúmenes de tareas saneados, no el estado
en tiempo de ejecución sin procesar.

- `tasks.list` requiere `operator.read`.
  - Parámetros: `status` opcional (`"queued"`, `"running"`, `"completed"`,
    `"failed"`, `"cancelled"`, o `"timed_out"`) o un array de esos estados,
    `agentId` opcional, `sessionKey` opcional, `limit` opcional desde `1` hasta
    `500`, y string `cursor` opcional.
  - Resultado: `{ "tasks": TaskSummary[], "nextCursor"?: string }`.
- `tasks.get` requiere `operator.read`.
  - Parámetros: `{ "taskId": string }`.
  - Resultado: `{ "task": TaskSummary }`.
  - Los ids de tareas faltantes devuelven la forma de error no encontrado de la Gateway.
- `tasks.cancel` requiere `operator.write`.
  - Parámetros: `{ "taskId": string, "reason"?: string }`.
  - Resultado:
    `{ "found": boolean, "cancelled": boolean, "reason"?: string, "task"?: TaskSummary }`.
  - `found` indica si el ledger tenía una tarea coincidente. `cancelled`
    indica si el tiempo de ejecución aceptó o registró la cancelación.

`TaskSummary` incluye `id`, `status` y metadatos opcionales como `kind`,
`runtime`, `title`, `agentId`, `sessionKey`, `childSessionKey`, `ownerKey`,
`runId`, `taskId`, `flowId`, `parentTaskId`, `sourceId`, marcas de tiempo, progreso,
resumen terminal y texto de error saneado.

### Métodos auxiliares del operador

- Los operadores pueden llamar a `commands.list` (`operator.read`) para obtener el inventario
  de comandos en tiempo de ejecución de un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - `scope` controla qué superficie objetivo el `name` primario:
    - `text` devuelve el token de comando de texto primario sin el `/` inicial
    - `native` y la ruta `both` predeterminada devuelven nombres nativos conscientes del proveedor
      cuando están disponibles
  - `textAliases` contiene alias de barra exactos como `/model` y `/m`.
  - `nativeName` contiene el nombre de comando nativo consciente del proveedor cuando existe uno.
  - `provider` es opcional y solo afecta la nomenclatura nativa más la disponibilidad
    de comandos de complementos nativos.
  - `includeArgs=false` omite los metadatos de argumentos serializados de la respuesta.
- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas de tiempo de ejecución de un
  agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivas en tiempo de ejecución para una sesión.
  - Se requiere `sessionKey`.
  - La puerta de enlace deriva el contexto de tiempo de ejecución confiable de la sesión en el lado del servidor en lugar de aceptar
    el contexto de autenticación o entrega proporcionado por el llamador.
  - La respuesta es una proyección derivada del servidor con alcance de sesión del inventario activo,
    que incluye herramientas principales, de complemento, de canal y de servidores MCP ya descubiertos.
  - `tools.effective` es de solo lectura para MCP: puede proyectar un catálogo MCP de sesión activa a través de la política de herramienta final, pero no crea tiempos de ejecución MCP, conecta transportes ni emite `tools/list`. Si no existe ningún catálogo activo coincidente, la respuesta puede incluir un aviso como `mcp-not-yet-connected`, `mcp-not-yet-listed` o `mcp-stale-catalog`.
  - Las entradas de herramientas efectivas usan `source="core"`, `source="plugin"`, `source="channel"` o `source="mcp"`.
- Los operadores pueden llamar a `tools.invoke` (`operator.write`) para invocar una herramienta disponible a través de la misma ruta de política de puerta de enlace que `/tools/invoke`.
  - Se requiere `name`. `args`, `sessionKey`, `agentId`, `confirm` y
    `idempotencyKey` son opcionales.
  - Si están presentes tanto `sessionKey` como `agentId`, el agente de sesión resuelto debe coincidir
    con `agentId`.
  - La respuesta es un sobre orientado al SDK con campos `ok`, `toolName`, `output` opcionales y `error` tipados.
    Las aprobaciones o rechazos de política devuelven `ok:false` en la carga útil en lugar de
    omitir la canalización de políticas de herramientas de la puerta de enlace.
- Los operadores pueden llamar a `skills.status` (`operator.read`) para obtener el inventario
  de habilidades visible para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - La respuesta incluye la elegibilidad, los requisitos faltantes, las comprobaciones de configuración y
    las opciones de instalación saneadas sin exponer valores de secretos sin procesar.
- Los operadores pueden llamar a `skills.search` y `skills.detail` (`operator.read`) para
  obtener metadatos de descubrimiento de ClawHub.
- Los operadores pueden llamar a `skills.upload.begin`, `skills.upload.chunk` y
  `skills.upload.commit` (`operator.admin`) para preparar un archivo de habilidades privado
  antes de instalarlo. Esta es una ruta de carga de administrador separada para clientes de confianza,
  no el flujo normal de instalación de habilidades de ClawHub, y está deshabilitada por defecto a menos que
  `skills.install.allowUploadedArchives` esté habilitado.
  - `skills.upload.begin({ kind: "skill-archive", slug, sizeBytes, sha256?, force?, idempotencyKey? })`
    crea una carga vinculada a ese slug y valor de forzado.
  - `skills.upload.chunk({ uploadId, offset, dataBase64 })` añade bytes en
    el desplazamiento decodificado exacto.
  - `skills.upload.commit({ uploadId, sha256? })` verifica el tamaño final y
    el SHA-256. La confirmación solo finaliza la carga; no instala la habilidad.
  - Los archivos de habilidades cargados son archivos zip que contienen una raíz `SKILL.md`. El
    nombre del directorio interno del archivo nunca selecciona el objetivo de instalación.
- Los operadores pueden llamar a `skills.install` (`operator.admin`) en tres modos:
  - Modo ClawHub: `{ source: "clawhub", slug, version?, force? }` instala una
    carpeta de skill en el directorio del espacio de trabajo del agente predeterminado `skills/`.
  - Modo de carga: `{ source: "upload", uploadId, slug, force?, sha256?, timeoutMs? }`
    instala una carga confirmada en el directorio del espacio de trabajo del agente predeterminado `skills/<slug>`.
    El slug y el valor de fuerza deben coincidir con la solicitud
    `skills.upload.begin` original. Este modo se rechaza a menos que
    `skills.install.allowUploadedArchives` esté habilitado. La configuración no
    afecta las instalaciones de ClawHub.
  - Modo de instalador de Gateway: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    ejecuta una acción `metadata.openclaw.install` declarada en el host de la puerta de enlace.
- Los operadores pueden llamar a `skills.update` (`operator.admin`) en dos modos:
  - El modo ClawHub actualiza un slug rastreado o todas las instalaciones de ClawHub rastreadas en
    el espacio de trabajo del agente predeterminado.
  - El modo Config modifica los valores `skills.entries.<skillKey>` como `enabled`,
    `apiKey` y `env`.

### Vistas `models.list`

`models.list` acepta un parámetro opcional `view`:

- Omitido o `"default"`: comportamiento del tiempo de ejecución actual. Si `agents.defaults.models` está configurado, la respuesta es el catálogo permitido, incluidos los modelos descubiertos dinámicamente para las entradas `provider/*`. De lo contrario, la respuesta es el catálogo completo de Gateway.
- `"configured"`: comportamiento de tamaño de selector. Si `agents.defaults.models` está configurado, todavía tiene prioridad, incluido el descubrimiento con ámbito de proveedor para las entradas `provider/*`. Sin una lista de permitidos, la respuesta utiliza entradas `models.providers.*.models` explícitas, recurriendo al catálogo completo solo cuando no existen filas de modelo configuradas.
- `"all"`: catálogo completo de Gateway, omitiendo `agents.defaults.models`. Use esto para diagnósticos e interfaces de usuario de descubrimiento, no para selectores de modelos normales.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, la puerta de enlace transmite `exec.approval.requested`.
- Los clientes del operador resuelven llamando a `exec.approval.resolve` (requiere el ámbito `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que carecen de `systemRunPlan` son rechazadas.
- Tras la aprobación, las llamadas reenviadas de `node.invoke system.run` reutilizan ese `systemRunPlan` canónico como contexto autoritativo de comando/cwd/sesión.
- Si un autor muta `command`, `rawCommand`, `cwd`, `agentId` o
  `sessionKey` entre la preparación y el reenvío final aprobado de `system.run`, la
  puerta de enlace rechaza la ejecución en lugar de confiar en la carga útil mutada.

## Respaldo de entrega del agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar la entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los destinos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite volver a la ejecución solo de sesión cuando no se puede resolver ninguna ruta de entrega externa (por ejemplo, sesiones internas/de webchat o configuraciones ambiguas de múltiples canales).
- Los resultados finales de `agent` pueden incluir `result.deliveryStatus` cuando se solicitó
  entrega, utilizando los mismos estados `sent`, `suppressed`, `partial_failed` y `failed`
  documentados para [`openclaw agent --json --deliver`](/es/cli/agent#json-delivery-status).

## Versionado

- `PROTOCOL_VERSION` reside en `packages/gateway-protocol/src/version.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza los rangos que
  no incluyen su protocolo actual. Los clientes y servidores actuales requieren
  el protocolo v4.
- Los esquemas y modelos se generan a partir de definiciones TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes del cliente

El cliente de referencia en `src/gateway/client.ts` utiliza estos valores predeterminados. Los valores son estables en la versión v4 del protocolo y constituyen la base esperada para clientes de terceros.

| Constante                                                           | Predeterminado                                               | Fuente                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                                                  | `4`                                                          | `packages/gateway-protocol/src/version.ts`                                                                                   |
| `MIN_CLIENT_PROTOCOL_VERSION`                                       | `4`                                                          | `packages/gateway-protocol/src/version.ts`                                                                                   |
| Tiempo de espera de solicitud (por RPC)                             | `30_000` ms                                                  | `src/gateway/client.ts` (`requestTimeoutMs`)                                                                                 |
| Tiempo de espera de preautenticación / desafío de conexión          | `15_000` ms                                                  | `src/gateway/handshake-timeouts.ts` (la configuración/entorno puede aumentar el presupuesto del servidor/cliente emparejado) |
| Retroceso inicial de reconexión                                     | `1_000` ms                                                   | `src/gateway/client.ts` (`backoffMs`)                                                                                        |
| Retroceso máximo de reconexión                                      | `30_000` ms                                                  | `src/gateway/client.ts` (`scheduleReconnect`)                                                                                |
| Límite de reintento rápido tras el cierre del token del dispositivo | `250` ms                                                     | `src/gateway/client.ts`                                                                                                      |
| Período de gracia de parada forzada antes de `terminate()`          | `250` ms                                                     | `FORCE_STOP_TERMINATE_GRACE_MS`                                                                                              |
| Tiempo de espera predeterminado `stopAndWait()`                     | `1_000` ms                                                   | `STOP_AND_WAIT_TIMEOUT_MS`                                                                                                   |
| Intervalo de tick predeterminado (pre `hello-ok`)                   | `30_000` ms                                                  | `src/gateway/client.ts`                                                                                                      |
| Cierre por tiempo de espera de tick                                 | código `4000` cuando el silencio excede `tickIntervalMs * 2` | `src/gateway/client.ts`                                                                                                      |
| `MAX_PAYLOAD_BYTES`                                                 | `25 * 1024 * 1024` (25 MB)                                   | `src/gateway/server-constants.ts`                                                                                            |

El servidor anuncia el `policy.tickIntervalMs` efectivo, `policy.maxPayload`
y `policy.maxBufferedBytes` en `hello-ok`; los clientes deben respetar esos valores
en lugar de los valores predeterminados previos al handshake.

## Auth

- La autenticación de puerta de enlace de secreto compartido usa `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sean de bucle local (loopback),
  satisfacen la verificación de autenticación de conexión desde
  los encabezados de la solicitud en lugar de `connect.params.auth.*`.
- El `gateway.auth.mode: "none"` de ingreso privado (private-ingress) omite la autenticación de conexión
  de secreto compartido por completo; no exponga ese modo en un ingreso público o no confiable.
- Después del emparejamiento, el Gateway emite un **token de dispositivo** con ámbito limitado al rol + alcances de la conexión. Se devuelve en `hello-ok.auth.deviceToken` y el cliente debe almacenarlo de forma persistente para futuras conexiones.
- Los clientes deben almacenar de forma persistente el `hello-ok.auth.deviceToken` principal después de cualquier conexión exitosa.
- Volver a conectarse con ese token de dispositivo **almacenado** también debe reutilizar el conjunto de alcances aprobados almacenados para dicho token. Esto preserva el acceso de lectura/sondeo/estado que ya se había otorgado y evita colapsar silenciosamente las reconexiones a un alcance implícito más limitado de solo administrador.
- Ensamblaje de autenticación de conexión en el lado del cliente (`selectConnectAuth` en `src/gateway/client.ts`):
  - `auth.password` es ortogonal y siempre se reenvía cuando está configurado.
  - `auth.token` se rellena en orden de prioridad: primero un token compartido explícito,
    luego un `deviceToken` explícito, y luego un token almacenado por dispositivo (claveado por
    `deviceId` + `role`).
  - `auth.bootstrapToken` se envía solo cuando ninguno de los anteriores resolvió un
    `auth.token`. Un token compartido o cualquier token de dispositivo resuelto lo suprime.
  - La promoción automática de un token de dispositivo almacenado en el reintento
    `AUTH_TOKEN_MISMATCH` de un solo shot está limitada a **solo endpoints de confianza** —
    loopback, o `wss://` con un `tlsFingerprint` fijado. El `wss://`
    público sin fijación no califica.
- El código de configuración de arranque integrado devuelve el nodo principal
  `hello-ok.auth.deviceToken` más un token de operador limitado en
  `hello-ok.auth.deviceTokens` para el traspaso confiable a dispositivos móviles. El token de operador
  incluye `operator.talk.secrets` para lecturas de configuración nativa de Talk y
  excluye `operator.admin` y `operator.pairing`.
- Mientras un código de configuración de arranque no basal está esperando aprobación, los detalles de `PAIRING_REQUIRED`
  incluyen `recommendedNextStep: "wait_then_retry"`, `retryable: true`
  y `pauseReconnect: false`. Los clientes deben seguir reconectándose con el mismo
  token de arranque hasta que la solicitud sea aprobada o el token se vuelva inválido.
- Persista `hello-ok.auth.deviceTokens` solo cuando la conexión haya usado autenticación de arranque
  en un transporte de confianza como `wss://` o emparejamiento local/bucle.
- Si un cliente proporciona un `deviceToken` o `scopes` **explícito**, ese
  conjunto de alcances solicitado por el llamante sigue siendo autoritativo; los alcances en caché solo se
  reutilizan cuando el cliente está reutilizando el token almacenado por dispositivo.
- Los tokens de dispositivo se pueden rotar/revocar mediante `device.token.rotate` y
  `device.token.revoke` (requiere el alcance `operator.pairing`). Rotar o
  revocar un nodo u otro rol que no sea operador también requiere `operator.admin`.
- `device.token.rotate` devuelve metadatos de rotación. Devuelve el token
  de portador de reemplazo solo para llamadas del mismo dispositivo que ya están autenticadas con
  ese token de dispositivo, para que los clientes solo con token puedan persistir su reemplazo antes
  de volver a conectarse. Las rotaciones compartidas/de administrador no devuelven el token de portador.
- La emisión, rotación y revocación de tokens permanecen limitadas al conjunto de roles aprobado
  registrado en la entrada de emparejamiento de ese dispositivo; la mutación del token no puede expandir ni
  dirigirse a un rol de dispositivo que la aprobación de emparejamiento nunca otorgó.
- Para las sesiones de token de dispositivos emparejados, la gestión de dispositivos está auto-alcanceada a menos que el
  llamador también tenga `operator.admin`: los llamadores que no son administradores solo pueden gestionar el
  token de operador para su **propia** entrada de dispositivo. La gestión de tokens de nodo y otros no operadores
  es exclusiva de administradores, incluso para el propio dispositivo del llamador.
- `device.token.rotate` y `device.token.revoke` también verifican el conjunto de alcances del token de operador
  objetivo frente a los alcances de la sesión actual del llamador. Los llamadores que no son administradores
  no pueden rotar ni revocar un token de operador más amplio del que ya poseen.
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token almacenado en caché por dispositivo.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar orientación de acción para el operador.
- `AUTH_SCOPE_MISMATCH` significa que el token del dispositivo fue reconocido pero no cubre
  los roles/ámbitos solicitados. Los clientes no deben presentar esto como un token incorrecto;
  solicite al operador que vuelva a emparejar o apruebe el contrato de ámbito más estrecho/amplio.

## Identidad del dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital de un par de claves.
- Las gateways emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para los nuevos ID de dispositivo a menos que se habilite la autoaprobación
  local.
- La autoaprobación de emparejamiento se centra en conexiones directas de bucle invertido local.
- OpenClaw también tiene una ruta estrecha de autoconexión local de backend/contenedor para
  flujos de ayuda de secreto compartido de confianza.
- Las conexiones tailnet o LAN del mismo host aún se tratan como remotas para el emparejamiento y
  requieren aprobación.
- Los clientes WS normalmente incluyen la identidad `device` durante `connect` (operador +
  nodo). Las únicas excepciones de operador sin dispositivo son rutas de confianza explícitas:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo para localhost.
  - autenticación `gateway.auth.mode: "trusted-proxy"` exitosa de la interfaz de usuario de control del operador.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (ruptura de cristal, degradación de seguridad grave).
  - RPC de backend `gateway-client` de bucle invertido directo autenticados con el
    token/contraseña de puerta de enlace compartida.
- Omitir la identidad del dispositivo tiene consecuencias en el ámbito. Cuando una conexión de UI de Control carece de identidad del dispositivo, `shouldClearUnboundScopesForMissingDeviceIdentity` borra los ámbitos autodeclarados dejándolos en un conjunto vacío para la autenticación por token, contraseña y proxy de confianza. La conexión se permite en rutas de confianza explícitas, pero los métodos restringidos por ámbito fallan. La excepción son las sesiones locales de token/contraseña de UI de Control con `allowInsecureAuth`, que conservan los ámbitos. Para otros casos, configure `gateway.controlUi.dangerouslyDisableDeviceAuth=true` solo como una ruta de conservación de ámbito de emergencia.
- Todas las conexiones deben firmar el nonce proporcionado por el servidor `connect.challenge`.

### Diagnósticos de migración de autenticación de dispositivos

Para clientes heredados que aún utilizan el comportamiento de firma previa al desafío, `connect` ahora devuelve códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

Fallos comunes de migración:

| Mensaje                     | details.code                     | details.reason           | Significado                                                        |
| --------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | El cliente omitió `device.nonce` (o lo envió en blanco).           |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | El cliente firmó con un nonce obsoleto/incorrecto.                 |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | El payload de la firma no coincide con el payload v2.              |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | La marca de tiempo firmada está fuera de la desviación permitida.  |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` no coincide con la huella digital de la clave pública. |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | Falló el formato/canonicalización de la clave pública.             |

Objetivo de migración:

- Espere siempre `connect.challenge`.
- Firme el payload v2 que incluye el nonce del servidor.
- Envíe el mismo nonce en `connect.params.device.nonce`.
- El payload de firma preferido es `v3`, que vincula `platform` y `deviceFamily`
  además de los campos device/client/role/scopes/token/nonce.
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación de metadatos del dispositivo emparejado aún controla la política de comandos al reconectar.

## TLS + fijación

- TLS es compatible para conexiones WS.
- Los clientes pueden fijar opcionalmente la huella digital del certificado de la puerta de enlace (ver configuración `gateway.tls`
  más `gateway.remote.tlsFingerprint` o CLI `--tls-fingerprint`).

## Alcance

Este protocolo expone la **API completa de la puerta de enlace** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define mediante los esquemas TypeBox en `packages/gateway-protocol/src/schema.ts`.

## Relacionado

- [Protocolo puente](/es/gateway/bridge-protocol)
- [Manual de la puerta de enlace](/es/gateway)

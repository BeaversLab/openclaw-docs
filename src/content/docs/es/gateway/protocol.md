---
summary: "Protocolo WebSocket de puerta de enlace: handshake, tramas, versionado"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocolo de puerta de enlace"
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
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
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

Durante el traspaso de arranque confiable (trusted bootstrap), `hello-ok.auth` también puede incluir entradas de rol adicionales delimitadas en `deviceTokens`:

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

Para el flujo de arranque de nodo/operador integrado, el token de nodo principal permanece `scopes: []` y cualquier token de operador traspasado permanece delimitado a la lista de permitidos (allowlist) del operador de arranque (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Las comprobaciones de ámbito de arranque se mantienen con prefijo de rol: las entradas de operador solo satisfacen solicitudes de operador, y los roles que no son operador todavía necesitan ámbitos bajo su propio prefijo de rol.

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

## Roles y ámbitos

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

Los métodos RPC de puerta de enlace registrados por complementos pueden solicitar su propio ámbito de operador, pero los prefijos de administración central reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se resuelven como `operator.admin`.

El alcance del método es solo la primera puerta. Algunos comandos de barra alcanzados a través de
`chat.send` aplican verificaciones de nivel de comando más estrictas encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

`node.pair.approve` también tiene una verificación de alcance adicional en el momento de la aprobación encima del
alcance base del método:

- solicitudes sin comandos: `operator.pairing`
- solicitudes con comandos de nodo no ejecutivos: `operator.pairing` + `operator.write`
- solicitudes que incluyen `system.run`, `system.run.prepare` o `system.which`:
  `operator.pairing` + `operator.admin`

### Caps/comandos/permisos (nodo)

Los nodos declaran reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista de permitidos (allowlist) de comandos para invocar.
- `permissions`: interruptores granulares (p. ej., `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y aplica listas de permitidos (allowlists) del lado del servidor.

## Presencia

- `system-presence` devuelve entradas claveadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces de usuario puedan mostrar una sola fila por dispositivo
  incluso cuando se conecta tanto como **operador** como **nodo**.

## Familias de métodos RPC comunes

Esta página no es un volcado completo generado, pero la superficie pública WS es más amplia
que los ejemplos de handshake/auth anteriores. Estas son las principales familias de métodos que el
Gateway expone hoy.

`hello-ok.features.methods` es una lista de descubrimiento conservadora construida a partir de
`src/gateway/server-methods-list.ts` más las exportaciones de métodos de complementos/canales cargados.
Trátela como descubrimiento de características, no como un volcado generado de cada asistente invocable
implementado en `src/gateway/server-methods/*.ts`.

### Sistema e identidad

- `health` devuelve la instantánea de salud del gateway en caché o sondeada fresca.
- `status` devuelve el resumen de la puerta de enlace estilo `/status`; los campos confidenciales se incluyen solo para clientes operadores con alcance de administrador.
- `gateway.identity.get` devuelve la identidad del dispositivo de puerta de enlace utilizada por los flujos de retransmisión y emparejamiento.
- `system-presence` devuelve la instantánea de presencia actual para los dispositivos de operador/nodo conectados.
- `system-event` agrega un evento del sistema y puede actualizar/transmitir el contexto de presencia.
- `last-heartbeat` devuelve el evento de latido persistido más reciente.
- `set-heartbeats` alterna el procesamiento de latidos en la puerta de enlace.

### Modelos y uso

- `models.list` devuelve el catálogo de modelos permitidos en tiempo de ejecución.
- `usage.status` devuelve ventanas de uso del proveedor/resúmenes de cuota restante.
- `usage.cost` devuelve resúmenes de uso de costos agregados para un rango de fechas.
- `doctor.memory.status` devuelve el estado de preparación de memoria vectorial/incrustación para el espacio de trabajo del agente predeterminado activo.
- `sessions.usage` devuelve resúmenes de uso por sesión.
- `sessions.usage.timeseries` devuelve el uso de series temporales para una sesión.
- `sessions.usage.logs` devuelve entradas de registro de uso para una sesión.

### Canales y auxiliares de inicio de sesión

- `channels.status` devuelve resúmenes de estado de canales/complementos integrados + empaquetados.
- `channels.logout` cierra la sesión en un canal/cuenta específico donde el canal admite cerrar sesión.
- `web.login.start` inicia un flujo de inicio de sesión QR/web para el proveedor de canal web actual con capacidad QR.
- `web.login.wait` espera a que se complete ese flujo de inicio de sesión QR/web e inicia el canal si tiene éxito.
- `push.test` envía una notificación push de prueba de APNs a un nodo iOS registrado.
- `voicewake.get` devuelve los disparadores de palabra de activación almacenados.
- `voicewake.set` actualiza los disparadores de palabra de activación y transmite el cambio.

### Mensajería y registros

- `send` es el RPC de entrega de salida directa para envíos dirigidos a canal/cuenta/hilo fuera del ejecutor de chat.
- `logs.tail` devuelve la cola del registro de archivos de la puerta de enlace configurada con controles de cursor/límite y bytes máximos.

### Hablar y TTS

- `talk.config` devuelve la carga útil de configuración efectiva de Talk; `includeSecrets`
  requiere `operator.talk.secrets` (o `operator.admin`).
- `talk.mode` establece/transmite el estado actual del modo Talk para los clientes
  de WebChat/Control UI.
- `talk.speak` sintetiza voz a través del proveedor de voz Talk activo.
- `tts.status` devuelve el estado de TTS habilitado, proveedor activo, proveedores alternativos,
  y el estado de configuración del proveedor.
- `tts.providers` devuelve el inventario visible de proveedores TTS.
- `tts.enable` y `tts.disable` alternan el estado de preferencias de TTS.
- `tts.setProvider` actualiza el proveedor TTS preferido.
- `tts.convert` ejecuta una conversión de texto a voz de un solo uso.

### Secretos, configuración, actualización y asistente

- `secrets.reload` vuelve a resolver los SecretRefs activos e intercambia el estado de
  secretos en tiempo de ejecución solo con éxito total.
- `secrets.resolve` resuelve las asignaciones de secretos comando-objetivo para un conjunto
  comando/objetivo específico.
- `config.get` devuelve la instantánea y el hash de la configuración actual.
- `config.set` escribe una carga útil de configuración validada.
- `config.patch` fusiona una actualización parcial de la configuración.
- `config.apply` valida y reemplaza la carga útil completa de la configuración.
- `config.schema` devuelve la carga útil del esquema de configuración en vivo utilizada por Control UI y
  herramientas de CLI: esquema, `uiHints`, versión y metadatos de generación, incluyendo
  metadatos de esquema de complemento + canal cuando el tiempo de ejecución puede cargarlo. El esquema
  incluye metadatos de campo `title` / `description` derivados de las mismas etiquetas
  y textos de ayuda utilizados por la UI, incluyendo objetos anidados, comodines, elementos de matriz,
  y ramas de composición `anyOf` / `oneOf` / `allOf` cuando existe
  documentación de campo coincidente.
- `config.schema.lookup` devuelve una carga útil de búsqueda con ámbito de ruta para una ruta de configuración: ruta normalizada, un nodo de esquema superficial, sugerencia coincidente + `hintPath`, y resúmenes secundarios inmediatos para la exploración en la interfaz de usuario/línea de comandos.
  - Los nodos de esquema de búsqueda mantienen la documentación orientada al usuario y los campos de validación comunes: `title`, `description`, `type`, `enum`, `const`, `format`, `pattern`, límites numéricos/cadena/matriz/objeto, y banderas booleanas como `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`.
  - Los resúmenes secundarios exponen `key`, `path` normalizado, `type`, `required`, `hasChildren`, además de la `hint` / `hintPath` coincidente.
- `update.run` ejecuta el flujo de actualización de la puerta de enlace y programa un reinicio solo cuando la actualización en sí tuvo éxito.
- `wizard.start`, `wizard.next`, `wizard.status` y `wizard.cancel` exponen el asistente de incorporación a través de RPC WS.

### Familias principales existentes

#### Auxiliares de agente y espacio de trabajo

- `agents.list` devuelve las entradas de agente configuradas.
- `agents.create`, `agents.update` y `agents.delete` gestionan los registros de agentes y la conexión del espacio de trabajo.
- `agents.files.list`, `agents.files.get` y `agents.files.set` gestionan los archivos de espacio de trabajo de arranque expuestos para un agente.
- `agent.identity.get` devuelve la identidad efectiva del asistente para un agente o sesión.
- `agent.wait` espera a que finalice una ejecución y devuelve la instantánea terminal cuando está disponible.

#### Control de sesión

- `sessions.list` devuelve el índice de la sesión actual.
- `sessions.subscribe` y `sessions.unsubscribe` activan/desactivan las suscripciones a eventos de cambio de sesión para el cliente WS actual.
- `sessions.messages.subscribe` y `sessions.messages.unsubscribe` activan/desactivan las suscripciones a eventos de transcripción/mensajes para una sesión.
- `sessions.preview` devuelve vistas previas de transcripción limitadas para claves de sesión específicas.
- `sessions.resolve` resuelve o canonaliza un objetivo de sesión.
- `sessions.create` crea una nueva entrada de sesión.
- `sessions.send` envía un mensaje a una sesión existente.
- `sessions.steer` es la variante de interrupción y dirección para una sesión activa.
- `sessions.abort` aborta el trabajo activo de una sesión.
- `sessions.patch` actualiza los metadatos/sustituciones de la sesión.
- `sessions.reset`, `sessions.delete` y `sessions.compact` realizan el mantenimiento de la sesión.
- `sessions.get` devuelve la fila completa de la sesión almacenada.
- la ejecución del chat todavía usa `chat.history`, `chat.send`, `chat.abort` y `chat.inject`.
- `chat.history` se normaliza para visualización en clientes de interfaz de usuario: las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/ ancho completo filtrados se eliminan, las filas de asistente de token silencioso puro como `NO_REPLY` / `no_reply` exactos se omiten, y las filas demasiado grandes pueden ser reemplazadas por marcadores de posición.

#### Emparejamiento de dispositivos y tokens de dispositivo

- `device.pair.list` devuelve los dispositivos emparejados pendientes y aprobados.
- `device.pair.approve`, `device.pair.reject` y `device.pair.remove` gestionan los registros de emparejamiento de dispositivos.
- `device.token.rotate` rota un token de dispositivo emparejado dentro de sus límites de rol y alcance aprobados.
- `device.token.revoke` revoca un token de dispositivo emparejado.

#### Emparejamiento de nodos, invocación y trabajo pendiente

- `node.pair.request`, `node.pair.list`, `node.pair.approve`,
  `node.pair.reject` y `node.pair.verify` cubren el emparejamiento de nodos y la verificación
  de arranque.
- `node.list` y `node.describe` devuelven el estado de los nodos conocidos/conectados.
- `node.rename` actualiza la etiqueta de un nodo emparejado.
- `node.invoke` reenvía un comando a un nodo conectado.
- `node.invoke.result` devuelve el resultado de una solicitud de invocación.
- `node.event` transporta eventos originados por el nodo de vuelta a la puerta de enlace.
- `node.canvas.capability.refresh` actualiza los tokens de capacidad de ámbito de lienzo.
- `node.pending.pull` y `node.pending.ack` son las APIs de cola de nodos conectados.
- `node.pending.enqueue` y `node.pending.drain` gestionan el trabajo pendiente duradero
  para nodos desconectados/fuera de línea.

#### Familias de aprobación

- `exec.approval.request` y `exec.approval.resolve` cubren solicitudes de aprobación
  de ejecución única.
- `exec.approval.waitDecision` espera una aprobación de ejecución pendiente y devuelve
  la decisión final (o `null` en caso de tiempo de espera agotado).
- `exec.approvals.get` y `exec.approvals.set` gestionan instantáneas
  de política de aprobación de ejecución de la puerta de enlace.
- `exec.approvals.node.get` y `exec.approvals.node.set` gestionan la política de aprobación
  de ejecución local del nodo a través de comandos de retransmisión de nodo.
- `plugin.approval.request`, `plugin.approval.waitDecision` y
  `plugin.approval.resolve` cubren flujos de aprobación definidos por complementos.

#### Otras familias importantes

- automatización:
  - `wake` programa una inyección de texto de activación inmediata o en el próximo latido
  - `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`,
    `cron.run`, `cron.runs`
- habilidades/herramientas: `skills.*`, `tools.catalog`, `tools.effective`

### Familias de eventos comunes

- `chat`: actualizaciones de chat de la interfaz de usuario como `chat.inject` y otros eventos de chat solo de transcripción.
- `session.message` y `session.tool`: actualizaciones de transcripción/flujo de eventos para una sesión suscrita.
- `sessions.changed`: índice de sesión o metadatos cambiados.
- `presence`: actualizaciones de instantánea de presencia del sistema.
- `tick`: evento periódico de keepalive/estado activo.
- `health`: actualización de instantánea de estado de la puerta de enlace.
- `heartbeat`: actualización del flujo de eventos de latido.
- `cron`: evento de cambio de ejecución/trabajo de cron.
- `shutdown`: notificación de apagado de la puerta de enlace.
- `node.pair.requested` / `node.pair.resolved`: ciclo de vida del emparejamiento de nodos.
- `node.invoke.request`: difusión de solicitud de invocación de nodo.
- `device.pair.requested` / `device.pair.resolved`: ciclo de vida del dispositivo emparejado.
- `voicewake.changed`: configuración del disparador de palabra de activación cambiada.
- `exec.approval.requested` / `exec.approval.resolved`: ciclo de vida de aprobación de exec.
- `plugin.approval.requested` / `plugin.approval.resolved`: ciclo de vida de aprobación de complemento.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades para comprobaciones de permiso automático.

### Métodos auxiliares de operador

- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas en tiempo de ejecución para un agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivo en tiempo de ejecución para una sesión.
  - Se requiere `sessionKey`.
  - La puerta de enlace deriva el contexto de tiempo de ejecución confiable de la sesión del lado del servidor en lugar de aceptar el contexto de autenticación o entrega proporcionado por la persona que llama.
  - La respuesta está limitada a la sesión y refleja lo que la conversación activa puede usar en este momento,
    incluyendo herramientas principales, de complementos y de canales.
- Los operadores pueden llamar a `skills.status` (`operator.read`) para obtener el inventario
  de habilidades visible para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - La respuesta incluye elegibilidad, requisitos faltantes, comprobaciones de configuración y
    opciones de instalación saneadas sin exponer valores de secretos sin procesar.
- Los operadores pueden llamar a `skills.search` y `skills.detail` (`operator.read`) para
  obtener metadatos de descubrimiento de ClawHub.
- Los operadores pueden llamar a `skills.install` (`operator.admin`) en dos modos:
  - Modo ClawHub: `{ source: "clawhub", slug, version?, force? }` instala una
    carpeta de habilidades en el espacio de trabajo del agente predeterminado, directorio `skills/`.
  - Modo instalador de puerta de enlace: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    ejecuta una acción `metadata.openclaw.install` declarada en el host de la puerta de enlace.
- Los operadores pueden llamar a `skills.update` (`operator.admin`) en dos modos:
  - El modo ClawHub actualiza un slug rastreado o todas las instalaciones rastreadas de ClawHub en
    el espacio de trabajo del agente predeterminado.
  - El modo Config parchea valores `skills.entries.<skillKey>` tales como `enabled`,
    `apiKey` y `env`.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, la puerta de enlace transmite `exec.approval.requested`.
- Los clientes operadores resuelven llamando a `exec.approval.resolve` (requiere alcance `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que carecen de `systemRunPlan` se rechazan.
- Después de la aprobación, las llamadas `node.invoke system.run` reenviadas reutilizan ese `systemRunPlan` canónico
  como el contexto de autoridad de comando/cwd/sesión.
- Si un autor de la llamada muta `command`, `rawCommand`, `cwd`, `agentId` o
  `sessionKey` entre la preparación y el reenvío `system.run` final aprobado,
  la puerta de enlace rechaza la ejecución en lugar de confiar en la carga útil mutada.

## Respaldo de entrega de agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los objetivos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite el respaldo a la ejecución solo de sesión cuando no se puede resolver una ruta entregable externa (por ejemplo, sesiones internas/de chat web o configuraciones multicanal ambiguas).

## Versionado

- `PROTOCOL_VERSION` se encuentra en `src/gateway/protocol/schema.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los esquemas y modelos se generan a partir de definiciones TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## Autenticación

- La autenticación de puerta de enlace de secreto compartido usa `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sea de bucle local,
  satisfacen la verificación de autenticación de conexión desde
  los encabezados de solicitud en lugar de `connect.params.auth.*`.
- El `gateway.auth.mode: "none"` de entrada privada omite la autenticación de conexión
  de secreto compartido por completo; no exponga ese modo en entradas públicas/no confiables.
- Después del emparejamiento, la puerta de enlace emite un **token de dispositivo** con ámbito al rol
  - alcances de la conexión. Se devuelve en `hello-ok.auth.deviceToken` y debe ser
    persistido por el cliente para futuras conexiones.
- Los clientes deben persistir el `hello-ok.auth.deviceToken` principal después de cualquier
  conexión exitosa.
- Volver a conectarse con ese token de dispositivo **almacenado** también debería reutilizar el conjunto de alcances aprobados almacenado para ese token. Esto preserva el acceso de lectura/sondeo/estado que ya se había otorgado y evita colapsar silenciosamente las reconexiones a un ámbito implícito de solo administrador más limitado.
- La precedencia de autenticación de conexión normal es primero el token/contraseña compartido explícito, luego `deviceToken` explícito, luego el token almacenado por dispositivo, y luego el token de inicio.
- Las entradas adicionales `hello-ok.auth.deviceTokens` son tokens de traspaso de inicio. Guárdelas solo cuando la conexión usó autenticación de inicio en un transporte confiable como `wss://` o emparejamiento local/bucle.
- Si un cliente proporciona un `deviceToken` **explícito** o un `scopes` explícito, ese conjunto de alcances solicitado por el llamador sigue siendo autoritativo; los alcances en caché solo se reutilizan cuando el cliente está reutilizando el token almacenado por dispositivo.
- Los tokens de dispositivo se pueden rotar/revocar mediante `device.token.rotate` y `device.token.revoke` (requiere el alcance `operator.pairing`).
- La emisión/rotación de tokens permanece limitada al conjunto de roles aprobados registrado en la entrada de emparejamiento de ese dispositivo; rotar un token no puede expandir el dispositivo a un rol que la aprobación de emparejamiento nunca otorgó.
- Para las sesiones de token de dispositivo emparejado, la gestión del dispositivo está auto-alcanzada a menos que el llamador también tenga `operator.admin`: los llamadores que no son administradores solo pueden eliminar/revocar/rotar su **propia** entrada de dispositivo.
- `device.token.rotate` también verifica el conjunto de alcances de operador solicitado contra los alcances de la sesión actual del llamador. Los llamadores que no son administradores no pueden rotar un token a un conjunto de alcances de operador más amplio del que ya tienen.
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token por dispositivo en caché.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar la guía de acción del operador.

## Identidad del dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una huella digital de un par de claves.
- Las puertas de enlace (gateways) emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para los nuevos ID de dispositivo a menos que la autoaprobación local esté habilitada.
- La autoaprobación de emparejamiento se centra en conexiones locales de bucle invertido (loopback) directo.
- OpenClaw también tiene una ruta de autoconexión local de backend/contenedor estrecha para flujos de ayuda de secreto compartido confiable.
- Las conexiones de tailnet o LAN en el mismo host todavía se tratan como remotas para el emparejamiento y requieren aprobación.
- Todos los clientes WS deben incluir la identidad `device` durante `connect` (operador + nodo).
  La interfaz de usuario de control puede omitirla solo en estos modos:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad HTTP insegura solo para localhost.
  - autenticación exitosa de la interfaz de usuario de control del operador `gateway.auth.mode: "trusted-proxy"`.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (romper-cristal, degradación de seguridad grave).
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivos

Para los clientes heredados que todavía usan el comportamiento de firma previa al desafío, `connect` ahora devuelve
códigos de detalle `DEVICE_AUTH_*` bajo `error.details.code` con un `error.details.reason` estable.

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
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación
  de metadatos del dispositivo emparejado aún controla la política de comandos al reconectar.

## TLS + pinning

- TLS es compatible con conexiones WS.
- Los clientes pueden fijar opcionalmente la huella digital del certificado de la puerta de enlace (consulte `gateway.tls`
  config más `gateway.remote.tlsFingerprint` o CLI `--tls-fingerprint`).

## Ámbito

Este protocolo expone la **API completa de la puerta de enlace** (estado, canales, modelos, chat,
agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define mediante los
esquemas TypeBox en `src/gateway/protocol/schema.ts`.

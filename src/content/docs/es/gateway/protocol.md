---
summary: "Protocolo de Gateway WebSocket: protocolo de enlace, tramas, versionado"
read_when:
  - Implementing or updating gateway WS clients
  - Debugging protocol mismatches or connect failures
  - Regenerating protocol schema/models
title: "Protocolo de puerta de enlace"
---

El protocolo WS de la puerta de enlace es el **único plano de control + transporte de nodos** para
OpenClaw. Todos los clientes (CLI, interfaz web, aplicación macOS, nodos iOS/Android, nodos
sin cabeza) se conectan a través de WebSocket y declaran su **rol** + **alcance** en el
momento del handshake.

## Transporte

- WebSocket, tramas de texto con cargas JSON.
- La primera trama **debe** ser una solicitud `connect`.
- Las tramas de preconexión están limitadas a 64 KiB. Después de un handshake exitoso, los clientes
  deben seguir los límites `hello-ok.policy.maxPayload` y
  `hello-ok.policy.maxBufferedBytes`. Con el diagnóstico habilitado,
  las tramas entrantes excesivamente grandes y los búferes de salida lentos emiten eventos `payload.large`
  antes de que la puerta de enlace cierre o elimine la trama afectada. Estos eventos mantienen
  tamaños, límites, superficies y códigos de motivo seguros. No mantienen el cuerpo del
  mensaje, el contenido de los archivos adjuntos, el cuerpo de la trama sin procesar, tokens, cookies o valores secretos.

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

`server`, `features`, `snapshot` y `policy` son todos obligatorios por el esquema
(`src/gateway/protocol/schema/frames.ts`). `auth` también es obligatorio e informa
el rol/alcance negociado. `canvasHostUrl` es opcional.

Cuando no se emite ningún token de dispositivo, `hello-ok.auth` informa los permisos
negociados sin campos de token:

```json
{
  "auth": {
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

Los clientes de backend confiables del mismo proceso (`client.id: "gateway-client"`,
`client.mode: "backend"`) pueden omitir `device` en conexiones directas de bucle invertido cuando
se autentican con el token/contraseña compartida de la puerta de enlace. Esta ruta está reservada
para RPC del plano de control interno y evita que las líneas base de emparejamiento obsoletas de CLI/dispositivos bloqueen
el trabajo de backend local, como las actualizaciones de sesión de subagente. Los clientes remotos,
clientes de origen del navegador, clientes de nodos y clientes explícitos de token de dispositivo/identidad de dispositivo
todavía usan las comprobaciones normales de emparejamiento y actualización de alcance.

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

Durante la transferencia de arranque confiable, `hello-ok.auth` también puede incluir entradas de
rol delimitadas adicionales en `deviceTokens`:

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

Para el flujo de arranque integrado de nodo/operador, el token del nodo principal se
mantiene `scopes: []` y cualquier token de operador transferido permanece limitado a la lista blanca de
operadores de arranque (`operator.approvals`, `operator.read`,
`operator.talk.secrets`, `operator.write`). Las comprobaciones de ámbito de arranque se
mantienen con prefijo de rol: las entradas de operador solo satisfacen solicitudes de operador y los roles
que no son de operador aún necesitan ámbitos bajo su propio prefijo de rol.

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

Los métodos RPC de gateway registrados por complementos pueden solicitar su propio ámbito de operador, pero
los prefijos administrativos principales reservados (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) siempre se resuelven como `operator.admin`.

El ámbito del método es solo la primera barrera. Algunos comandos de barra alcanzados a través de
`chat.send` aplican comprobaciones de nivel de comando más estrictas encima. Por ejemplo, las escrituras persistentes de
`/config set` y `/config unset` requieren `operator.admin`.

`node.pair.approve` también tiene una comprobación de ámbito adicional en el momento de la aprobación encima del
ámbito del método base:

- solicitudes sin comandos: `operator.pairing`
- solicitudes con comandos de nodo que no son de ejecución: `operator.pairing` + `operator.write`
- solicitudes que incluyen `system.run`, `system.run.prepare` o `system.which`:
  `operator.pairing` + `operator.admin`

### Capacidades/comandos/permisos (nodo)

Los nodos declaran reclamaciones de capacidad en el momento de la conexión:

- `caps`: categorías de capacidades de alto nivel.
- `commands`: lista blanca de comandos para invocar.
- `permissions`: interruptores granulares (por ej., `screen.record`, `camera.capture`).

El Gateway trata estos como **reclamaciones** y aplica listas de permitidos del lado del servidor.

## Presencia

- `system-presence` devuelve entradas indexadas por la identidad del dispositivo.
- Las entradas de presencia incluyen `deviceId`, `roles` y `scopes` para que las interfaces puedan mostrar una sola fila por dispositivo
  incluso cuando se conecte tanto como **operador** como como **nodo**.

## Ámbito de los eventos de difusión

Los eventos de difusión WebSocket enviados por el servidor están restringidos por ámbito para que las sesiones con ámbito de emparejamiento o solo de nodo no reciban pasivamente el contenido de la sesión.

- Las **tramas de chat, agente y resultado de herramienta** (incluyendo eventos `agent` transmitidos y resultados de llamadas a herramientas) requieren al menos `operator.read`. Las sesiones sin `operator.read` omiten estas tramas por completo.
- Las **transmisiones `plugin.*` definidas por complementos** están limitadas a `operator.write` o `operator.admin`, dependiendo de cómo el complemento las registró.
- Los **eventos de estado y de transporte** (`heartbeat`, `presence`, `tick`, ciclo de vida de conexión/desconexión, etc.) permanecen sin restricciones para que la salud del transporte siga siendo observable para cada sesión autenticada.
- **Las familias de eventos de difusión desconocidos** están restringidas por ámbito de manera predeterminada (cerrado por fallo) a menos que un controlador registrado las relaje explícitamente.

Cada conexión de cliente mantiene su propio número de secuencia por cliente para que las difusiones preserven el orden monótono en ese socket, incluso cuando diferentes clientes vean subconjuntos diferentes filtrados por ámbito del flujo de eventos.

## Familias comunes de métodos RPC

La superficie pública WS es más amplia que los ejemplos de protocolo de enlace/autenticación anteriores. Esto
no es un volcado generado — `hello-ok.features.methods` es una lista de descubrimiento conservadora construida a partir de `src/gateway/server-methods-list.ts` más las exportaciones de métodos de complementos/canales cargados. Trátelo como descubrimiento de características, no como una enumeración completa de `src/gateway/server-methods/*.ts`.

<AccordionGroup>
  <Accordion title="Sistema e identidad">
    - `health` devuelve la instantánea de estado del gateway en caché o sondeada recientemente.
    - `diagnostics.stability` devuelve el grabador de estabilidad de diagnóstico acotado reciente. Mantiene metadatos operativos como nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de cola/sesión, nombres de canal/complemento e identificadores de sesión. No mantiene texto de chat, cuerpos de webhook, salidas de herramientas, cuerpos de solicitudes o respuestas sin procesar, tokens, cookies ni valores secretos. Se requiere el ámbito de lectura del operador.
    - `status` devuelve el resumen del gateway estilo `/status`; los campos sensibles solo se incluyen para clientes operadores con ámbito de administrador.
    - `gateway.identity.get` devuelve la identidad del dispositivo del gateway utilizada por los flujos de retransmisión y emparejamiento.
    - `system-presence` devuelve la instantánea de presencia actual para los dispositivos operador/nodo conectados.
    - `system-event` agrega un evento del sistema y puede actualizar/transmitir el contexto de presencia.
    - `last-heartbeat` devuelve el evento de latido persistido más reciente.
    - `set-heartbeats` alterna el procesamiento de latidos en el gateway.
  </Accordion>

  <Accordion title="Modelos y uso">
    - `models.list` devuelve el catálogo de modelos permitidos en tiempo de ejecución.
    - `usage.status` devuelve los resúmenes de ventanas de uso/cuota restante del proveedor.
    - `usage.cost` devuelve resúmenes de uso de costos agregados para un rango de fechas.
    - `doctor.memory.status` devuelve la preparación de la memoria vectorial / incrustación en caché para el espacio de trabajo del agente predeterminado activo. Pase `{ "probe": true }` o `{ "deep": true }` solo cuando la persona que llama quiere explícitamente un ping en vivo del proveedor de incrustación.
    - `sessions.usage` devuelve resúmenes de uso por sesión.
    - `sessions.usage.timeseries` devuelve el uso de series temporales para una sesión.
    - `sessions.usage.logs` devuelve las entradas del registro de uso para una sesión.
  </Accordion>

<Accordion title="Canales y auxiliares de inicio de sesión">
  - `channels.status` devuelve resúmenes de estado de canales/complementos integrados y agrupados. - `channels.logout` cierra la sesión en un canal/cuenta específica cuando el canal admite cierre de sesión. - `web.login.start` inicia un flujo de inicio de sesión QR/web para el proveedor de canal web actual con capacidad QR. - `web.login.wait` espera a que se complete ese flujo de inicio de sesión
  QR/web e inicia el canal si tiene éxito. - `push.test` envía una notificación push de prueba de APNs a un nodo iOS registrado. - `voicewake.get` devuelve los activadores de palabra de activación almacenados. - `voicewake.set` actualiza los activadores de palabra de activación y transmite el cambio.
</Accordion>

<Accordion title="Mensajería y registros">- `send` es el RPC de entrega saliente directa para envíos destinados a canal/cuenta/hilo fuera del ejecutor de chat. - `logs.tail` devuelve la cola de registro de archivos del gateway configurada con controles de cursor/límite y bytes máximos.</Accordion>

<Accordion title="Talk y TTS">
  - `talk.config` devuelve la carga útil de configuración efectiva de Talk; `includeSecrets` requiere `operator.talk.secrets` (o `operator.admin`). - `talk.mode` establece/transmite el estado del modo Talk actual para los clientes de WebChat/interfaz de usuario de Control. - `talk.speak` sintetiza voz a través del proveedor de voz Talk activo. - `tts.status` devuelve el estado habilitado de TTS,
  el proveedor activo, los proveedores de respaldo y el estado de configuración del proveedor. - `tts.providers` devuelve el inventario visible de proveedores TTS. - `tts.enable` y `tts.disable` alternan el estado de preferencias de TTS. - `tts.setProvider` actualiza el proveedor TTS preferido. - `tts.convert` ejecuta una conversión de texto a voz de un solo uso.
</Accordion>

<Accordion title="Secretos, configuración, actualización y asistente">
  - `secrets.reload` resuelve activamente los SecretRefs y cambia el estado de los secretos en tiempo de ejecución solo si tiene éxito total. - `secrets.resolve` resuelve las asignaciones de secretos de comando-destino para un conjunto específico de comando/destino. - `config.get` devuelve la instantánea y el hash de la configuración actual. - `config.set` escribe una carga útil de configuración
  validada. - `config.patch` combina una actualización parcial de la configuración. - `config.apply` valida + reemplaza la carga útil completa de la configuración. - `config.schema` devuelve la carga útil del esquema de configuración en vivo utilizada por la interfaz de usuario de Control y las herramientas de CLI: esquema, `uiHints`, versión y metadatos de generación, incluyendo metadatos del
  esquema de complementos y canales cuando el tiempo de ejecución puede cargarlo. El esquema incluye metadatos de campo `title` / `description` derivados de las mismas etiquetas y textos de ayuda utilizados por la interfaz, incluyendo ramas de composición de objeto anidado, comodín, elemento de matriz y `anyOf` / `oneOf` / `allOf` cuando existe documentación de campo coincidente. -
  `config.schema.lookup` devuelve una carga útil de búsqueda con alcance de ruta para una ruta de configuración: ruta normalizada, un nodo de esquema superficial, sugerencia coincidente + `hintPath`, e resúmenes secundarios inmediatos para la exploración en la interfaz/CLI. Los nodos de esquema de búsqueda mantienen la documentación orientada al usuario y los campos de validación comunes (`title`,
  `description`, `type`, `enum`, `const`, `format`, `pattern`, límites numéricos/cadena/matriz/objeto, y banderas como `additionalProperties`, `deprecated`, `readOnly`, `writeOnly`). Los resúmenes secundarios exponen `key`, `path` normalizado, `type`, `required`, `hasChildren`, además de la `hint` / `hintPath` coincidente. - `update.run` ejecuta el flujo de actualización de la puerta de enlace y
  programa un reinicio solo cuando la actualización misma ha tenido éxito. - `update.status` devuelve el último centinela de reinicio de actualización en caché, incluyendo la versión en ejecución posterior al reinicio cuando está disponible. - `wizard.start`, `wizard.next`, `wizard.status` y `wizard.cancel` exponen el asistente de incorporación a través de WS RPC.
</Accordion>

<Accordion title="Agentes y auxiliares del espacio de trabajo">
  - `agents.list` devuelve las entradas de agentes configuradas. - `agents.create`, `agents.update` y `agents.delete` gestionan los registros de agentes y la conexión del espacio de trabajo. - `agents.files.list`, `agents.files.get` y `agents.files.set` gestionan los archivos del espacio de trabajo de arranque expuestos para un agente. - `agent.identity.get` devuelve la identidad efectiva del
  asistente para un agente o sesión. - `agent.wait` espera a que finalice una ejecución y devuelve la instantánea de la terminal cuando está disponible.
</Accordion>

<Accordion title="Control de sesión">
  - `sessions.list` devuelve el índice de la sesión actual. - `sessions.subscribe` y `sessions.unsubscribe` activan o desactivan las suscripciones a eventos de cambio de sesión para el cliente WS actual. - `sessions.messages.subscribe` y `sessions.messages.unsubscribe` activan o desactivan las suscripciones a eventos de transcripción/mensaje para una sesión. - `sessions.preview` devuelve vistas
  previas delimitadas de la transcripción para claves de sesión específicas. - `sessions.resolve` resuelve o canonaliza un objetivo de sesión. - `sessions.create` crea una nueva entrada de sesión. - `sessions.send` envía un mensaje a una sesión existente. - `sessions.steer` es la variante de interrupción y dirección para una sesión activa. - `sessions.abort` aborta el trabajo activo de una sesión.
  - `sessions.patch` actualiza los metadatos/sustituciones de la sesión. - `sessions.reset`, `sessions.delete` y `sessions.compact` realizan el mantenimiento de la sesión. - `sessions.get` devuelve la fila completa almacenada de la sesión. - La ejecución del chat aún usa `chat.history`, `chat.send`, `chat.abort` y `chat.inject`. `chat.history` está normalizado para visualización en clientes de IU:
  las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/anchura completa filtrados
  se eliminan, se omiten las filas de asistente de token silencioso puro como `NO_REPLY` / `no_reply` exactos, y las filas excesivamente grandes pueden ser reemplazadas por marcadores de posición.
</Accordion>

<Accordion title="Emparejamiento de dispositivos y tokens de dispositivo">
  - `device.pair.list` devuelve los dispositivos emparejados pendientes y aprobados. - `device.pair.approve`, `device.pair.reject` y `device.pair.remove` gestionan los registros de emparejamiento de dispositivos. - `device.token.rotate` rota un token de dispositivo emparejado dentro de su rol aprobado y los límites del ámbito de la llamada. - `device.token.revoke` revoca un token de dispositivo
  emparejado dentro de su rol aprobado y los límites del ámbito de la llamada.
</Accordion>

<Accordion title="Emparejamiento de nodos, invocación y trabajo pendiente">
  - `node.pair.request`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove` y `node.pair.verify` cubren el emparejamiento de nodos y la verificación de arranque. - `node.list` y `node.describe` devuelven el estado de los nodos conocidos/conectados. - `node.rename` actualiza una etiqueta de nodo emparejado. - `node.invoke` reenvía un comando a un nodo conectado. -
  `node.invoke.result` devuelve el resultado de una solicitud de invocación. - `node.event` transfiere los eventos originados en el nodo de vuelta a la puerta de enlace. - `node.canvas.capability.refresh` actualiza los tokens de capacidad de lienzo con ámbito. - `node.pending.pull` y `node.pending.ack` son las API de cola de nodos conectados. - `node.pending.enqueue` y `node.pending.drain`
  gestionan el trabajo pendiente duradero para nodos sin conexión/desconectados.
</Accordion>

<Accordion title="Familias de aprobación">
  - `exec.approval.request`, `exec.approval.get`, `exec.approval.list` y `exec.approval.resolve` cubren las solicitudes de aprobación de ejecución de un solo uso más la búsqueda/reproducción de aprobaciones pendientes. - `exec.approval.waitDecision` espera una aprobación de ejecución pendiente y devuelve la decisión final (o `null` en caso de tiempo de espera). - `exec.approvals.get` y
  `exec.approvals.set` gestionan las instantáneas de la política de aprobación de ejecución de la puerta de enlace. - `exec.approvals.node.get` y `exec.approvals.node.set` gestionan la política de aprobación de ejecución local del nodo a través de comandos de retransmisión del nodo. - `plugin.approval.request`, `plugin.approval.list`, `plugin.approval.waitDecision` y `plugin.approval.resolve`
  cubren flujos de aprobación definidos por complementos.
</Accordion>

  <Accordion title="Automatización, habilidades y herramientas">
    - Automatización: `wake` programa una inyección de texto de activación inmediata o en el próximo latido; `cron.list`, `cron.status`, `cron.add`, `cron.update`, `cron.remove`, `cron.run` y `cron.runs` gestionan el trabajo programado.
    - Habilidades y herramientas: `commands.list`, `skills.*`, `tools.catalog`, `tools.effective`.
  </Accordion>
</AccordionGroup>

### Familias de eventos comunes

- `chat`: actualizaciones del chat de la interfaz de usuario, como `chat.inject` y otros eventos de chat
  solo de transcripción.
- `session.message` y `session.tool`: actualizaciones de la transcripción/flujo de eventos para una
  sesión suscrita.
- `sessions.changed`: índice de sesión o metadatos cambiados.
- `presence`: actualizaciones de la instantánea de presencia del sistema.
- `tick`: evento periódico de mantenimiento de conexión / actividad.
- `health`: actualización de la instantánea de salud de la puerta de enlace.
- `heartbeat`: actualización del flujo de eventos de latido.
- `cron`: evento de cambio de trabajo/ejecución programada.
- `shutdown`: notificación de apagado de la puerta de enlace.
- `node.pair.requested` / `node.pair.resolved`: ciclo de vida del emparejamiento de nodos.
- `node.invoke.request`: difusión de solicitud de invocación de nodo.
- `device.pair.requested` / `device.pair.resolved`: ciclo de vida del dispositivo emparejado.
- `voicewake.changed`: cambió la configuración del disparador de palabra de activación.
- `exec.approval.requested` / `exec.approval.resolved`: ciclo de vida de aprobación de ejecución.
- `plugin.approval.requested` / `plugin.approval.resolved`: ciclo de vida de aprobación de complementos.

### Métodos auxiliares de nodo

- Los nodos pueden llamar a `skills.bins` para obtener la lista actual de ejecutables de habilidades para verificaciones de permiso automático.

### Métodos auxiliares del operador

- Los operadores pueden llamar a `commands.list` (`operator.read`) para obtener el inventario de comandos en tiempo de ejecución de un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - `scope` controla qué superficie objetivo tiene el `name` primario:
    - `text` devuelve el token del comando de texto principal sin el `/` inicial
    - `native` y la ruta `both` predeterminada devuelven nombres nativos conocedores del proveedor cuando están disponibles
  - `textAliases` lleva alias de barra exactos como `/model` y `/m`.
  - `nativeName` lleva el nombre del comando nativo conocedor del proveedor cuando existe uno.
  - `provider` es opcional y solo afecta la nomenclatura nativa más la disponibilidad de comandos de complementos nativos.
  - `includeArgs=false` omite los metadatos de argumentos serializados de la respuesta.
- Los operadores pueden llamar a `tools.catalog` (`operator.read`) para obtener el catálogo de herramientas en tiempo de ejecución de un agente. La respuesta incluye herramientas agrupadas y metadatos de procedencia:
  - `source`: `core` o `plugin`
  - `pluginId`: propietario del complemento cuando `source="plugin"`
  - `optional`: si una herramienta de complemento es opcional
- Los operadores pueden llamar a `tools.effective` (`operator.read`) para obtener el inventario de herramientas efectivas en tiempo de ejecución para una sesión.
  - `sessionKey` es obligatorio.
  - El gateway deriva el contexto de tiempo de ejecución confiable del lado del servidor de la sesión en lugar de aceptar el contexto de autenticación o entrega proporcionado por el llamador.
  - La respuesta está limitada a la sesión y refleja lo que la conversación activa puede usar ahora mismo, incluidas las herramientas principales, de complementos y de canal.
- Los operadores pueden llamar a `skills.status` (`operator.read`) para obtener el inventario de habilidades visible para un agente.
  - `agentId` es opcional; omítalo para leer el espacio de trabajo del agente predeterminado.
  - La respuesta incluye la elegibilidad, los requisitos faltantes, las verificaciones de configuración y las opciones de instalación saneadas sin exponer valores de secretos sin procesar.
- Los operadores pueden llamar a `skills.search` y `skills.detail` (`operator.read`) para obtener metadatos de descubrimiento de ClawHub.
- Los operadores pueden llamar a `skills.install` (`operator.admin`) en dos modos:
  - Modo ClawHub: `{ source: "clawhub", slug, version?, force? }` instala una carpeta de habilidades en el directorio `skills/` del espacio de trabajo del agente predeterminado.
  - Modo instalador del gateway: `{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }` ejecuta una acción `metadata.openclaw.install` declarada en el host del gateway.
- Los operadores pueden llamar a `skills.update` (`operator.admin`) en dos modos:
  - El modo ClawHub actualiza un slug rastreado o todas las instalaciones de ClawHub rastreadas en el espacio de trabajo del agente predeterminado.
  - El modo de configuración parchea valores `skills.entries.<skillKey>` tales como `enabled`, `apiKey` y `env`.

## Aprobaciones de ejecución

- Cuando una solicitud de ejecución necesita aprobación, el gateway transmite `exec.approval.requested`.
- Los clientes del operador resuelven llamando a `exec.approval.resolve` (requiere el ámbito `operator.approvals`).
- Para `host=node`, `exec.approval.request` debe incluir `systemRunPlan` (metadatos canónicos de `argv`/`cwd`/`rawCommand`/sesión). Las solicitudes que carecen de `systemRunPlan` son rechazadas.
- Tras la aprobación, las llamadas reenviadas de `node.invoke system.run` reutilizan ese `systemRunPlan` canónico como el contexto de comando/cwd/sesión autoritativo.
- Si un llamador muta `command`, `rawCommand`, `cwd`, `agentId` o
  `sessionKey` entre la preparación y el reenvío final aprobado de `system.run`, la
  pasarela rechaza la ejecución en lugar de confiar en el payload mutado.

## Respaldo de entrega del agente

- Las solicitudes `agent` pueden incluir `deliver=true` para solicitar la entrega saliente.
- `bestEffortDeliver=false` mantiene un comportamiento estricto: los destinos de entrega no resueltos o solo internos devuelven `INVALID_REQUEST`.
- `bestEffortDeliver=true` permite un respaldo a la ejecución solo de sesión cuando no se puede resolver ninguna ruta de entrega externa (por ejemplo, sesiones internas/webchat o configuraciones multicanal ambiguas).

## Versionado

- `PROTOCOL_VERSION` reside en `src/gateway/protocol/schema/protocol-schemas.ts`.
- Los clientes envían `minProtocol` + `maxProtocol`; el servidor rechaza las discordancias.
- Los esquemas y modelos se generan a partir de las definiciones de TypeBox:
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### Constantes del cliente

El cliente de referencia en `src/gateway/client.ts` utiliza estos valores predeterminados. Los valores son
estables en la versión 3 del protocolo y constituyen la línea base esperada para clientes de terceros.

| Constante                                                           | Predeterminado                                               | Fuente                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `PROTOCOL_VERSION`                                                  | `3`                                                          | `src/gateway/protocol/schema/protocol-schemas.ts`            |
| Tiempo de espera de solicitud (por RPC)                             | `30_000` ms                                                  | `src/gateway/client.ts` (`requestTimeoutMs`)                 |
| Tiempo de espera de preautenticación / desafío de conexión          | `10_000` ms                                                  | `src/gateway/handshake-timeouts.ts` (limitar `250`–`10_000`) |
| Retroceso inicial de reconexión                                     | `1_000` ms                                                   | `src/gateway/client.ts` (`backoffMs`)                        |
| Retroceso máximo de reconexión                                      | `30_000` ms                                                  | `src/gateway/client.ts` (`scheduleReconnect`)                |
| Límite de reintento rápido tras el cierre del token del dispositivo | `250` ms                                                     | `src/gateway/client.ts`                                      |
| Período de gracia de detención forzada antes de `terminate()`       | `250` ms                                                     | `FORCE_STOP_TERMINATE_GRACE_MS`                              |
| Tiempo de espera predeterminado de `stopAndWait()`                  | `1_000` ms                                                   | `STOP_AND_WAIT_TIMEOUT_MS`                                   |
| Intervalo de tick predeterminado (antes de `hello-ok`)              | `30_000` ms                                                  | `src/gateway/client.ts`                                      |
| Cierre por tiempo de espera de tick                                 | código `4000` cuando el silencio exceda `tickIntervalMs * 2` | `src/gateway/client.ts`                                      |
| `MAX_PAYLOAD_BYTES`                                                 | `25 * 1024 * 1024` (25 MB)                                   | `src/gateway/server-constants.ts`                            |

El servidor anuncia el `policy.tickIntervalMs` efectivo, `policy.maxPayload`
y `policy.maxBufferedBytes` en `hello-ok`; los clientes deben respetar esos valores
en lugar de los valores predeterminados previos al protocolo de enlace.

## Autenticación

- La autenticación de puerta de enlace de secreto compartido usa `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sea de bucle local,
  satisfacen la verificación de autenticación de conexión desde
  los encabezados de la solicitud en lugar de `connect.params.auth.*`.
- El `gateway.auth.mode: "none"` de entrada privada omite la autenticación de conexión
  de secreto compartido por completo; no exponga ese modo en entradas públicas/no confiables.
- Después del emparejamiento, la puerta de enlace emite un **token de dispositivo** con ámbito para el rol +
  ámbitos de conexión. Se devuelve en `hello-ok.auth.deviceToken` y debe ser
  persistido por el cliente para futuras conexiones.
- Los clientes deben persistir el `hello-ok.auth.deviceToken` principal después de cualquier conexión exitosa.
- La reconexión con ese token de dispositivo **almacenado** también debe reutilizar el conjunto de alcances aprobados almacenados para dicho token. Esto preserva el acceso de lectura/sondeo/estado que ya se ha otorgado y evita colapsar silenciosamente las reconexiones a un alcance implícito más restringido de solo administrador.
- Ensamblaje de autenticación de conexión del lado del cliente (`selectConnectAuth` en `src/gateway/client.ts`):
  - `auth.password` es ortogonal y siempre se reenvía cuando está configurado.
  - `auth.token` se completa en orden de prioridad: primero un token compartido explícito, luego un `deviceToken` explícito, y luego un token almacenado por dispositivo (claveada por `deviceId` + `role`).
  - `auth.bootstrapToken` se envía solo cuando ninguno de los anteriores resolvió un `auth.token`. Un token compartido o cualquier token de dispositivo resuelto lo suprime.
  - La autopromoción de un token de dispositivo almacenado en el reintento de `AUTH_TOKEN_MISMATCH` de un solo uso está limitada a **solo endpoints de confianza**: bucle local (loopback), o `wss://` con un `tlsFingerprint` anclado. El `wss://` público sin anclaje no califica.
- Las entradas adicionales de `hello-ok.auth.deviceTokens` son tokens de traspaso de arranque (bootstrap). Persístalos solo cuando la conexión utilizó autenticación de arranque en un transporte de confianza como `wss://` o emparejamiento local/bucle local.
- Si un cliente proporciona un `deviceToken` **explícito** o un `scopes` explícito, ese conjunto de alcances solicitado por el llamador sigue siendo autoritativo; los alcances en caché solo se reutilizan cuando el cliente está reutilizando el token almacenado por dispositivo.
- Los tokens de dispositivo se pueden rotar/revocar a través de `device.token.rotate` y `device.token.revoke` (requiere alcance `operator.pairing`).
- `device.token.rotate` devuelve metadatos de rotación. Hace eco del token de reemplazo solo para llamadas del mismo dispositivo que ya están autenticadas con ese token de dispositivo, para que los clientes solo con token puedan persistir su reemplazo antes de reconectar. Las rotaciones compartidas/de administrador no hacen eco del token de portador.
- La emisión, rotación y revocación de tokens permanecen limitadas al conjunto de roles aprobados
  registrado en la entrada de emparejamiento de ese dispositivo; la mutación del token no puede expandir o
  dirigirse a un rol de dispositivo que la aprobación de emparejamiento nunca otorgó.
- Para las sesiones de token de dispositivo emparejado, la gestión de dispositivos tiene alcance propio a menos que el
  autor de la llamada también tenga `operator.admin`: los autores de la llamada que no son administradores solo pueden eliminar/revocar/rotar
  su **propia** entrada de dispositivo.
- `device.token.rotate` y `device.token.revoke` también verifican el conjunto de alcances del token
  del operador objetivo frente a los alcances de la sesión actual del autor de la llamada. Los autores de la llamada que no son administradores
  no pueden rotar ni revocar un token de operador más amplio del que ya poseen.
- Los fallos de autenticación incluyen `error.details.code` más sugerencias de recuperación:
  - `error.details.canRetryWithDeviceToken` (booleano)
  - `error.details.recommendedNextStep` (`retry_with_device_token`, `update_auth_configuration`, `update_auth_credentials`, `wait_then_retry`, `review_auth_configuration`)
- Comportamiento del cliente para `AUTH_TOKEN_MISMATCH`:
  - Los clientes de confianza pueden intentar un reintento limitado con un token por dispositivo en caché.
  - Si ese reintento falla, los clientes deben detener los bucles de reconexión automática y mostrar la guía de acción del operador.

## Identidad del dispositivo + emparejamiento

- Los nodos deben incluir una identidad de dispositivo estable (`device.id`) derivada de una
  huella digital de un par de claves.
- Las puertas de enlace emiten tokens por dispositivo + rol.
- Se requieren aprobaciones de emparejamiento para los nuevos ID de dispositivo a menos que la autoaprobación
  local esté habilitada.
- La autoaprobación de emparejamiento se centra en las conexiones directas de bucle invertido local.
- OpenClaw también tiene una ruta estrecha de autoconexión local de backend/contenedor para
  flujos de asistentes de secreto compartido de confianza.
- Las conexiones de red de cola (tailnet) o LAN en el mismo host se siguen tratando como remotas para el emparejamiento y
  requieren aprobación.
- Los clientes WS normalmente incluyen la identidad `device` durante `connect` (operador +
  nodo). Las únicas excepciones de operador sin dispositivo son rutas de confianza explícitas:
  - `gateway.controlUi.allowInsecureAuth=true` para compatibilidad con HTTP no seguro solo para localhost.
  - autenticación exitosa del operador de la Interfaz de usuario de Control `gateway.auth.mode: "trusted-proxy"`.
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (romper el cristal, degradación de seguridad grave).
  - RPCs de backend de bucle local directo `gateway-client` autenticados con el token/contraseña
    compartida de la puerta de enlace.
- Todas las conexiones deben firmar el nonce `connect.challenge` proporcionado por el servidor.

### Diagnósticos de migración de autenticación de dispositivos

Para clientes heredados que aún utilizan el comportamiento de firma previa al desafío, `connect` ahora devuelve
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
  además de los campos dispositivo/cliente/rol/ámbitos/token/nonce.
- Las firmas `v2` heredadas siguen siendo aceptadas por compatibilidad, pero la fijación de metadatos del dispositivo emparejado
  todavía controla la política de comandos al reconectar.

## TLS + anclaje (pinning)

- TLS es compatible para conexiones WS.
- Los clientes pueden opcionalmente anclar la huella digital del certificado de la puerta de enlace (consulte la configuración `gateway.tls` más `gateway.remote.tlsFingerprint` o la CLI `--tls-fingerprint`).

## Alcance

Este protocolo expone la **API completa de la puerta de enlace** (estado, canales, modelos, chat, agente, sesiones, nodos, aprobaciones, etc.). La superficie exacta se define mediante los esquemas TypeBox en `src/gateway/protocol/schema.ts`.

## Relacionado

- [Protocolo de puente](/es/gateway/bridge-protocol)
- [Manual de la puerta de enlace](/es/gateway)

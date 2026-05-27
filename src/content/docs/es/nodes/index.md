---
summary: "Nodos: emparejamiento, capacidades, permisos y asistentes de CLI para canvas/cámara/pantalla/dispositivo/notificaciones/sistema"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "Nodos"
---

Un **nodo** es un dispositivo complementario (macOS/iOS/Android/headless) que se conecta al **WebSocket** de la Gateway (mismo puerto que los operadores) con `role: "node"` y expone una superficie de comandos (p. ej., `canvas.*`, `camera.*`, `device.*`, `notifications.*`, `system.*`) a través de `node.invoke`. Detalles del protocolo: [Gateway protocol](/es/gateway/protocol).

Transporte heredado: [Bridge protocol](/es/gateway/bridge-protocol) (TCP JSONL;
solo histórico para los nodos actuales).

macOS también puede ejecutarse en **modo nodo**: la aplicación de la barra de menú se conecta al servidor
WS de la Gateway y expone sus comandos locales de canvas/cámara como un nodo (así,
`openclaw nodes …` funciona contra este Mac). En el modo de puerta de enlace remota, la automatización
del navegador es manejada por el host de nodo CLI (`openclaw node run` o el
servicio de nodo instalado), no por el nodo de la aplicación nativa.

Notas:

- Los nodos son **periféricos**, no gateways. No ejecutan el servicio de puerta de enlace.
- Los mensajes de Telegram/WhatsApp/etc. llegan a la **gateway**, no a los nodos.
- Manual de resolución de problemas: [/nodes/troubleshooting](/es/nodes/troubleshooting)

## Emparejamiento + estado

**Los nodos WS utilizan el emparejamiento de dispositivos.** Los nodos presentan una identidad de dispositivo durante `connect`; la Gateway
crea una solicitud de emparejamiento de dispositivo para `role: node`. Apruebe a través de la CLI de dispositivos (o interfaz de usuario).

CLI rápida:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

Si un nodo reintenta con detalles de autenticación cambiados (rol/alcaves/clave pública), la solicitud
pendiente anterior es reemplazada y se crea un nuevo `requestId`. Vuelva a ejecutar
`openclaw devices list` antes de aprobar.

Notas:

- `nodes status` marca un nodo como **emparejado** cuando su rol de emparejamiento de dispositivos incluye `node`.
- El registro de emparejamiento de dispositivos es el contrato duradero de rol aprobado. La
  rotación de tokens permanece dentro de ese contrato; no puede actualizar un nodo emparejado a un
  rol diferente que la aprobación de emparejamiento nunca otorgó.
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject/remove/rename`) es un almacén de emparejamiento de nodos
  separado propiedad de la gateway; **no** limita el saludo (handshake) WS `connect`.
- `openclaw nodes remove --node <id|name|ip>` elimina las entradas obsoletas de ese
  almacén de emparejamiento de nodos propiedad separada de la puerta de enlace.
- El alcance de la aprobación sigue los comandos declarados de la solicitud pendiente:
  - solicitud sin comandos: `operator.pairing`
  - comandos de nodo sin ejecución: `operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`: `operator.pairing` + `operator.admin`

## Host de nodo remoto (system.run)

Use un **host de nodo** cuando su puerta de enlace se ejecute en una máquina y desee que los comandos
se ejecuten en otra. El modelo aún habla con la **puerta de enlace**; la puerta de enlace
reenvía las llamadas `exec` al **host de nodo** cuando se selecciona `host=node`.

### Qué se ejecuta dónde

- **Host de Gateway**: recibe mensajes, ejecuta el modelo, enruta las llamadas a herramientas.
- **Host de nodo**: ejecuta `system.run`/`system.which` en la máquina del nodo.
- **Aprobaciones**: se aplican en el host del nodo a través de `~/.openclaw/exec-approvals.json`.

Nota sobre aprobaciones:

- Las ejecuciones de nodos respaldadas por aprobaciones vinculan el contexto exacto de la solicitud.
- Para ejecuciones directas de archivos de shell/runtime, OpenClaw también vincula, con el mejor esfuerzo posible, un operando de archivo local concreto y niega la ejecución si ese archivo cambia antes de la ejecución.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/runtime, la ejecución respaldada por aprobación se deniega en lugar de fingir una cobertura completa del runtime. Utilice sandboxing, hosts separados o una lista de permitidos (allowlist) explícita y confiable/flujo de trabajo completo para semánticas de intérprete más amplias.

### Iniciar un host de nodo (primer plano)

En la máquina del nodo:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### Gateway remoto a través de túnel SSH (vinculación de loopback)

Si la puerta de enlace se enlaza al loopback (`gateway.bind=loopback`, valor predeterminado en modo local),
los hosts de nodos remotos no pueden conectarse directamente. Cree un túnel SSH y apunte el
host del nodo al extremo local del túnel.

Ejemplo (host del nodo -> host del gateway):

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

Notas:

- `openclaw node run` admite autenticación por token o contraseña.
- Se prefieren las variables de entorno: `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`.
- La alternativa de configuración es `gateway.auth.token` / `gateway.auth.password`.
- En modo local, el host del nodo ignora intencionalmente `gateway.remote.token` / `gateway.remote.password`.
- En modo remoto, `gateway.remote.token` / `gateway.remote.password` son elegibles según las reglas de precedencia remota.
- Si se configuran SecretRefs `gateway.auth.*` locales activos pero no resueltos, la autenticación del host del nodo falla de forma cerrada.
- La resolución de autenticación del host del nodo solo respeta las variables de entorno `OPENCLAW_GATEWAY_*`.

### Iniciar un host de nodo (servicio)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

### Emparejar + nombrar

En el host del gateway:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Si el nodo reintentas con detalles de autenticación cambiados, vuelva a ejecutar `openclaw devices list`
y apruebe el `requestId` actual.

Opciones de nomenclatura:

- `--display-name` en `openclaw node run` / `openclaw node install` (persiste en `~/.openclaw/node.json` en el nodo).
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (sobrescritura de puerta de enlace).

### Permitir los comandos (Allowlist)

Las aprobaciones de ejecución son **por host de nodo**. Agregue entradas a la lista de permitidos (allowlist) desde el gateway:

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

Las aprobaciones residen en el host del nodo en `~/.openclaw/exec-approvals.json`.

### Dirigir exec al nodo

Configurar valores predeterminados (configuración del gateway):

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

O por sesión:

```
/exec host=node security=allowlist node=<id-or-name>
```

Una vez configurado, cualquier llamada `exec` con `host=node` se ejecuta en el host del nodo (sujeto a la lista de permitidos/aprobaciones del nodo).

`host=auto` no elegirá implícitamente el nodo por sí solo, pero se permite una solicitud explícita `host=node` por llamada desde `auto`. Si desea que la ejecución en el nodo sea el valor predeterminado de la sesión, establezca `tools.exec.host=node` o `/exec host=node ...` explícitamente.

Relacionado:

- [CLI del host de nodos](/es/cli/node)
- [Herramienta Exec](/es/tools/exec)
- [Aprobaciones Exec](/es/tools/exec-approvals)

## Invocar comandos

De bajo nivel (RPC sin procesar):

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

Existen asistentes de alto nivel para los flujos de trabajo comunes de "dar al agente un adjunto MEDIA".

## Política de comandos

Los comandos de nodo deben pasar dos filtros antes de poder invocarse:

1. El nodo debe declarar el comando en su lista WebSocket `connect.commands`.
2. La política de plataforma de la puerta de enlace debe permitir el comando declarado.

Los nodos complementarios de Windows y macOS permiten comandos declarados seguros como
`canvas.*`, `camera.list`, `location.get` y `screen.snapshot` de forma predeterminada.
Los nodos de confianza que anuncian la capacidad `talk` o declaran comandos `talk.*`
también permiten comandos declarados de pulsar para hablar (`talk.ptt.start`, `talk.ptt.stop`,
`talk.ptt.cancel`, `talk.ptt.once`) de forma predeterminada, independientemente de la etiqueta de la plataforma.
Los comandos peligrosos o con alta carga de privacidad, como `camera.snap`, `camera.clip` y
`screen.record`, todavía requieren una aceptación explícita con
`gateway.nodes.allowCommands`. `gateway.nodes.denyCommands` siempre tiene prioridad sobre
los valores predeterminados y las entradas adicionales de la lista blanca.

Los comandos de nodo propiedad del complemento pueden añadir una política de invocación de nodo de Gateway. Dicha política
se ejecuta después de la verificación de la lista blanca y antes de reenviar al nodo, por lo que `node.invoke` sin procesar,
los auxiliares de CLI y las herramientas de agente dedicadas comparten el mismo límite de permisos del complemento.
Los comandos de nodo de complemento peligrosos todavía requieren una aceptación explícita
de `gateway.nodes.allowCommands`.

Después de que un nodo cambie su lista de comandos declarados, rechace el emparejamiento del dispositivo antiguo
y apruebe la nueva solicitud para que la puerta de enlace almacene la instantánea de comandos actualizada.

## Capturas de pantalla (instantáneas del lienzo)

Si el nodo está mostrando el Canvas (WebView), `canvas.snapshot` devuelve `{ format, base64 }`.

Auxiliar de CLI (escribe en un archivo temporal e imprime `MEDIA:<path>`):

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Controles del Canvas

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

Notas:

- `canvas present` acepta URL o rutas de archivo locales (`--target`), más `--x/--y/--width/--height` opcional para el posicionamiento.
- `canvas eval` acepta JS en línea (`--js`) o un argumento posicional.

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

Notas:

- Solo se admite A2UI v0.8 JSONL (se rechaza v0.9/createSurface).

## Fotos + vídeos (cámara del nodo)

Fotos (`jpg`):

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

Clips de vídeo (`mp4`):

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

Notas:

- El nodo debe estar en **primer plano** para `canvas.*` y `camera.*` (las llamadas en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`).
- La duración del clip está limitada (actualmente `<= 60s`) para evitar cargas útiles base64 demasiado grandes.
- Android solicitará permisos de `CAMERA`/`RECORD_AUDIO` cuando sea posible; los permisos denegados fallan con `*_PERMISSION_REQUIRED`.

## Grabaciones de pantalla (nodos)

Los nodos compatibles exponen `screen.record` (mp4). Ejemplo:

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

Notas:

- La disponibilidad de `screen.record` depende de la plataforma del nodo.
- Las grabaciones de pantalla están limitadas a `<= 60s`.
- `--no-audio` desactiva la captura del micrófono en las plataformas compatibles.
- Use `--screen <index>` para seleccionar una pantalla cuando hay varias disponibles.

## Ubicación (nodos)

Los nodos exponen `location.get` cuando la Ubicación está activada en la configuración.

Auxiliar de CLI:

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

Notas:

- La ubicación está **desactivada por defecto**.
- "Siempre" requiere permiso del sistema; la obtención en segundo plano es de mejor esfuerzo.
- La respuesta incluye latitud/longitud, precisión (metros) y marca de tiempo.

## SMS (nodos Android)

Los nodos Android pueden exponer `sms.send` cuando el usuario otorga permiso de **SMS** y el dispositivo es compatible con telefonía.

Invocación de bajo nivel:

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

Notas:

- El prompt de permiso debe aceptarse en el dispositivo Android antes de que se anuncie la capacidad.
- Los dispositivos solo Wi-Fi sin telefonía no anunciarán `sms.send`.

## Dispositivo Android + comandos de datos personales

Los nodos Android pueden anunciar familias de comandos adicionales cuando se habilitan las capacidades correspondientes.

Familias disponibles:

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`, `motion.pedometer`

Ejemplos de invocaciones:

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

Notas:

- Los comandos de movimiento están limitados por capacidades según los sensores disponibles.

## Comandos del sistema (node host / mac node)

El nodo de macOS expone `system.run`, `system.notify` y `system.execApprovals.get/set`.
El host de nodo sin interfaz gráfica expone `system.run`, `system.which` y `system.execApprovals.get/set`.

Ejemplos:

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

Notas:

- `system.run` devuelve stdout/stderr/código de salida en la carga útil.
- La ejecución de shell ahora se realiza a través de la herramienta `exec` con `host=node`; `nodes` sigue siendo la superficie RPC directa para comandos de nodo explícitos.
- `nodes invoke` no expone `system.run` ni `system.run.prepare`; esos se mantienen solo en la ruta de ejecución.
- La ruta de ejecución prepara un `systemRunPlan` canónico antes de la aprobación. Una vez que
  se concede una aprobación, el gateway reenvía ese plan almacenado, no ningún campo
  de comando/cwd/sesión editado posteriormente por el autor de la llamada.
- `system.notify` respeta el estado del permiso de notificaciones en la aplicación de macOS.
- Los metadatos `platform` / `deviceFamily` de nodo no reconocidos usan una lista de permitidos predeterminada conservadora que excluye `system.run` y `system.which`. Si intencionalmente necesita esos comandos para una plataforma desconocida, agréguelos explícitamente a través de `gateway.nodes.allowCommands`.
- `system.run` admite `--cwd`, `--env KEY=VAL`, `--command-timeout` y `--needs-screen-recording`.
- Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), los valores `--env` con alcance de solicitud se reducen a una lista de permitidos explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Para las decisiones de permitir siempre en modo de lista blanca, los envoltorios de despacho conocidos (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persisten las rutas ejecutables internas en lugar de las rutas de los envoltorios. Si el desenvolvimiento no es seguro, no se persiste automáticamente ninguna entrada en la lista blanca.
- En los hosts de nodos Windows en modo de lista blanca, las ejecuciones de envoltorio de shell a través de `cmd.exe /c` requieren aprobación (una entrada en la lista blanca por sí sola no permite automáticamente el formulario del envoltorio).
- `system.notify` admite `--priority <passive|active|timeSensitive>` y `--delivery <system|overlay|auto>`.
- Los hosts de nodos ignoran las anulaciones de `PATH` y eliminan las claves peligrosas de inicio/shell (`DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`). Si necesita entradas PATH adicionales, configure el entorno del servicio host de nodos (o instale herramientas en ubicaciones estándar) en lugar de pasar `PATH` a través de `--env`.
- En el modo de nodo macOS, `system.run` está limitado por las aprobaciones de ejecución en la aplicación macOS (Configuración → Aprobaciones de ejecución).
  Ask/allowlist/full se comportan igual que el host de nodos sin cabeza; los avisos denegados devuelven `SYSTEM_RUN_DENIED`.
- En el host de nodos sin cabeza, `system.run` está limitado por las aprobaciones de ejecución (`~/.openclaw/exec-approvals.json`).

## Vinculación del nodo de ejecución

Cuando hay varios nodos disponibles, puede vincular la ejecución a un nodo específico.
Esto establece el nodo predeterminado para `exec host=node` (y se puede anular por agente).

Predeterminado global:

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

Anulación por agente:

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
```

Desactivar para permitir cualquier nodo:

```bash
openclaw config unset tools.exec.node
openclaw config unset 'agents.list[0].tools.exec.node'
```

## Mapa de permisos

Los nodos pueden incluir un mapa `permissions` en `node.list` / `node.describe`, claveado por el nombre del permiso (por ejemplo, `screenRecording`, `accessibility`) con valores booleanos (`true` = otorgado).

## Host de nodos sin cabeza (multiplataforma)

OpenClaw puede ejecutar un **host de nodo sin cabeza** (sin IU) que se conecta al WebSocket
del Gateway y expone `system.run` / `system.which`. Esto es útil en Linux/Windows
o para ejecutar un nodo mínimo junto a un servidor.

Inícielo:

```bash
openclaw node run --host <gateway-host> --port 18789
```

Notas:

- El emparejamiento aún es necesario (el Gateway mostrará un mensaje de emparejamiento de dispositivo).
- El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión del Gateway en `~/.openclaw/node.json`.
- Las aprobaciones de ejecución se aplican localmente mediante `~/.openclaw/exec-approvals.json`
  (consulte [Aprobaciones de ejecución](/es/tools/exec-approvals)).
- En macOS, el host de nodo sin cabeza ejecuta `system.run` localmente de forma predeterminada. Establezca
  `OPENCLAW_NODE_EXEC_HOST=app` para enrutar `system.run` a través del host de ejecución de la aplicación complementaria; agregue
  `OPENCLAW_NODE_EXEC_FALLBACK=0` para requerir el host de la aplicación y fallar cerrado si no está disponible.
- Agregue `--tls` / `--tls-fingerprint` cuando el WS del Gateway use TLS.

## Modo de nodo Mac

- La aplicación de la barra de menús de macOS se conecta al servidor WebSocket del Gateway como un nodo (por lo que `openclaw nodes …` funciona contra este Mac).
- En modo remoto, la aplicación abre un túnel SSH para el puerto del Gateway y se conecta a `localhost`.

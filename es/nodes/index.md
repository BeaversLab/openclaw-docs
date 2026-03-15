---
summary: "Nodos: emparejamiento, capacidades, permisos y asistentes de CLI para canvas/cámara/pantalla/dispositivo/notificaciones/sistema"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "Nodos"
---

# Nodos

Un **nodo** es un dispositivo complementario (macOS/iOS/Android/sin interfaz) que se conecta al **WebSocket** de la Gateway (mismo puerto que los operadores) con `role: "node"` y expone una superficie de comandos (p. ej. `canvas.*`, `camera.*`, `device.*`, `notifications.*`, `system.*`) a través de `node.invoke`. Detalles del protocolo: [Gateway protocol](/es/gateway/protocol).

Transporte heredado: [Bridge protocol](/es/gateway/bridge-protocol) (TCP JSONL; en desuso/eliminado para los nodos actuales).

macOS también puede ejecutarse en **modo de nodo**: la aplicación de la barra de menús se conecta al servidor WS de la Gateway y expone sus comandos locales de canvas/cámara como un nodo (por lo que `openclaw nodes …` funciona contra este Mac).

Notas:

- Los nodos son **periféricos**, no gateways. No ejecutan el servicio de gateway.
- Los mensajes de Telegram/WhatsApp/etc. llegan a la **gateway**, no a los nodos.
- Manual de resolución de problemas: [/nodes/troubleshooting](/es/nodes/troubleshooting)

## Emparejamiento + estado

**Los nodos WS utilizan el emparejamiento de dispositivos.** Los nodos presentan una identidad de dispositivo durante `connect`; la Gateway
crea una solicitud de emparejamiento de dispositivos para `role: node`. Apruébala mediante la CLI de dispositivos (o la interfaz de usuario).

CLI rápida:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

Notas:

- `nodes status` marca un nodo como **emparejado** cuando su rol de emparejamiento de dispositivos incluye `node`.
- `node.pair.*` (CLI: `openclaw nodes pending/approve/reject`) es un almacenamiento de emparejamiento de nodos propiedad de la gateway por separado;
  **no** limita el protocolo de enlace WS `connect`.

## Host de nodo remoto (system.run)

Utilice un **host de nodo** cuando su Gateway se ejecute en una máquina y desee que los comandos
se ejecuten en otra. El modelo todavía habla con la **gateway**; la gateway
reenvía las llamadas `exec` al **host de nodo** cuando se selecciona `host=node`.

### Qué se ejecuta dónde

- **Gateway host**: recibe mensajes, ejecuta el modelo, enruta las llamadas a herramientas.
- **Node host**: ejecuta `system.run`/`system.which` en la máquina del nodo.
- **Aprobaciones**: se aplican en el node host a través de `~/.openclaw/exec-approvals.json`.

Nota de aprobación:

- Las ejecuciones de nodo respaldadas por aprobaciones vinculan el contexto exacto de la solicitud.
- Para ejecuciones directas de archivos de shell/runtime, OpenClaw también vincula, lo mejor posible, un operando de archivo local concreto y niega la ejecución si ese archivo cambia antes de la ejecución.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/runtime, la ejecución respaldada por aprobación se deniega en lugar de pretender una cobertura completa del runtime. Utilice sandboxing, hosts separados o una lista de permisos explícita de confianza/flujo de trabajo completo para una semántica de intérprete más amplia.

### Iniciar un node host (primer plano)

En la máquina del nodo:

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### Gateway remoto a través de túnel SSH (loopback bind)

Si el Gateway se vincula a loopback (`gateway.bind=loopback`, predeterminado en modo local),
los node hosts remotos no pueden conectarse directamente. Cree un túnel SSH y apunte el
node host al extremo local del túnel.

Ejemplo (node host -> gateway host):

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
- La configuración de respaldo es `gateway.auth.token` / `gateway.auth.password`.
- En modo local, el node host ignora intencionalmente `gateway.remote.token` / `gateway.remote.password`.
- En modo remoto, `gateway.remote.token` / `gateway.remote.password` son elegibles según las reglas de precedencia remota.
- Si se configuran SecretRefs `gateway.auth.*` locales activos pero no se resuelven, la autenticación del node-host falla de forma segura (cerrada).
- Las variables de entorno `CLAWDBOT_GATEWAY_*` heredadas se ignoran intencionalmente en la resolución de autenticación del node-host.

### Iniciar un node host (servicio)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### Emparejar + nombre

En el gateway host:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Opciones de nomenclatura:

- `--display-name` en `openclaw node run` / `openclaw node install` (persiste en `~/.openclaw/node.json` en el nodo).
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (anulación del gateway).

### Permitir los comandos (allowlist)

Las aprobaciones de ejecución son **por node host**. Agregue entradas a la lista de permitidos desde el gateway:

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

Las aprobaciones residen en el host del nodo en `~/.openclaw/exec-approvals.json`.

### Apuntar exec al nodo

Configurar los valores predeterminados (configuración de puerta de enlace):

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

O por sesión:

```
/exec host=node security=allowlist node=<id-or-name>
```

Una vez establecido, cualquier llamada `exec` con `host=node` se ejecuta en el host del nodo (sujeto a la
lista de permitidos/aprobaciones del nodo).

Relacionado:

- [CLI de host de nodo](/es/cli/node)
- [Herramienta Exec](/es/tools/exec)
- [Aprobaciones de Exec](/es/tools/exec-approvals)

## Invocar comandos

De nivel bajo (RPC sin procesar):

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

Existen auxiliares de nivel superior para los flujos de trabajo comunes de "dar al agente un adjunto MEDIA".

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

- `canvas present` acepta URL o rutas de archivo locales (`--target`), además de `--x/--y/--width/--height` opcional para el posicionamiento.
- `canvas eval` acepta JS en línea (`--js`) o un argumento posicional.

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

Notas:

- Solo se admite A2UI v0.8 JSONL (se rechaza v0.9/createSurface).

## Fotos + videos (cámara del nodo)

Fotos (`jpg`):

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

Clips de video (`mp4`):

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

Notas:

- El nodo debe estar en **primer plano** para `canvas.*` y `camera.*` (las llamadas en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`).
- La duración del clip está limitada (actualmente `<= 60s`) para evitar cargas útiles base64 demasiado grandes.
- Android solicitará permisos `CAMERA`/`RECORD_AUDIO` cuando sea posible; los permisos denegados fallan con `*_PERMISSION_REQUIRED`.

## Grabaciones de pantalla (nodos)

Los nodos compatibles exponen `screen.record` (mp4). Ejemplo:

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

Notas:

- La disponibilidad de `screen.record` depende de la plataforma del nodo.
- Las grabaciones de pantalla están limitadas a `<= 60s`.
- `--no-audio` deshabilita la captura del micrófono en plataformas compatibles.
- Use `--screen <index>` para seleccionar una pantalla cuando haya varias disponibles.

## Ubicación (nodos)

Los nodos exponen `location.get` cuando la Ubicación está habilitada en la configuración.

Auxiliar de CLI:

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

Notas:

- La Ubicación está **desactivada por defecto**.
- "Siempre" requiere permiso del sistema; la obtención en segundo plano es de mejor esfuerzo.
- La respuesta incluye lat/lon, precisión (metros) y marca de tiempo.

## SMS (nodos Android)

Los nodos Android pueden exponer `sms.send` cuando el usuario otorga permisos de **SMS** y el dispositivo es compatible con telefonía.

Invocación de bajo nivel:

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

Notas:

- Se debe aceptar el mensaje de solicitud de permiso en el dispositivo Android antes de que se anuncie la capacidad.
- Los dispositivos solo Wi-Fi sin telefonía no anunciarán `sms.send`.

## Dispositivo Android + comandos de datos personales

Los nodos Android pueden anunciar familias de comandos adicionales cuando las capacidades correspondientes están habilitadas.

Familias disponibles:

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `motion.activity`, `motion.pedometer`

Ejemplos de invocación:

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

Notas:

- Los comandos de movimiento están restringidos por capacidades según los sensores disponibles.

## Comandos del sistema (node host / mac node)

El nodo macOS expone `system.run`, `system.notify` y `system.execApprovals.get/set`.
El nodo host headless expone `system.run`, `system.which` y `system.execApprovals.get/set`.

Ejemplos:

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

Notas:

- `system.run` devuelve stdout/stderr/código de salida en la carga útil.
- `system.notify` respeta el estado del permiso de notificaciones en la aplicación macOS.
- Los metadatos del nodo `platform` / `deviceFamily` no reconocidos utilizan una lista de permitidos predeterminada conservadora que excluye `system.run` y `system.which`. Si necesita intencionalmente esos comandos para una plataforma desconocida, agréguelos explícitamente a través de `gateway.nodes.allowCommands`.
- `system.run` es compatible con `--cwd`, `--env KEY=VAL`, `--command-timeout` y `--needs-screen-recording`.
- Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), los valores `--env` con alcance de solicitud se reducen a una lista de permitidos explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Para las decisiones de permitir siempre en modo de lista de permitidos, los contenedores de despacho conocidos (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) guardan las rutas de los ejecutables internas en lugar de las rutas de los contenedores. Si el desenvoltorio no es seguro, no se guarda ninguna entrada en la lista de permitidos automáticamente.
- En los hosts de nodos de Windows en modo de lista de permitidos, las ejecuciones de contenedor de shell a través de `cmd.exe /c` requieren aprobación (la entrada en la lista de permitidos por sí sola no permite automáticamente el formulario de contenedor).
- `system.notify` es compatible con `--priority <passive|active|timeSensitive>` y `--delivery <system|overlay|auto>`.
- Los hosts de nodos ignoran las anulaciones de `PATH` y eliminan las claves de inicio/shell peligrosas (`DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`). Si necesita entradas PATH adicionales, configure el entorno del servicio del host de nodos (o instale las herramientas en ubicaciones estándar) en lugar de pasar `PATH` a través de `--env`.
- En el modo de nodo de macOS, `system.run` está controlado por las aprobaciones de ejecución en la aplicación de macOS (Configuración → Aprobaciones de ejecución).
  Ask/allowlist/full se comportan igual que el host de nodo sin cabeza; los mensajes denegados devuelven `SYSTEM_RUN_DENIED`.
- En el host de nodo sin cabeza, `system.run` está controlado por las aprobaciones de ejecución (`~/.openclaw/exec-approvals.json`).

## Vinculación de nodo de ejecución

Cuando hay varios nodos disponibles, puedes vincular exec a un nodo específico.
Esto establece el nodo predeterminado para `exec host=node` (y se puede anular por agente).

Predeterminado global:

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

Anulación por agente:

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Desestablecer para permitir cualquier nodo:

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## Mapa de permisos

Los nodos pueden incluir un mapa `permissions` en `node.list` / `node.describe`, clave por nombre de permiso (ej. `screenRecording`, `accessibility`) con valores booleanos (`true` = concedido).

## Host de nodo sin interfaz (multiplataforma)

OpenClaw puede ejecutar un **host de nodo sin interfaz** (sin IU) que se conecta al WebSocket del Gateway y expone `system.run` / `system.which`. Esto es útil en Linux/Windows o para ejecutar un nodo mínimo junto a un servidor.

Inícielo:

```bash
openclaw node run --host <gateway-host> --port 18789
```

Notas:

- Aún se requiere el emparejamiento (el Gateway mostrará un mensaje de emparejamiento de dispositivo).
- El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión de la puerta de enlace en `~/.openclaw/node.json`.
- Las aprobaciones de exec se aplican localmente a través de `~/.openclaw/exec-approvals.json`
  (ver [Exec approvals](/es/tools/exec-approvals)).
- En macOS, el host de nodo sin interfaz ejecuta `system.run` localmente de forma predeterminada. Establezca
  `OPENCLAW_NODE_EXEC_HOST=app` para enrutar `system.run` a través del host exec de la aplicación complementaria; agregue
  `OPENCLAW_NODE_EXEC_FALLBACK=0` para requerir el host de la aplicación y fallar cerrado si no está disponible.
- Agregue `--tls` / `--tls-fingerprint` cuando el WS del Gateway use TLS.

## Modo de nodo Mac

- La aplicación de la barra de menús de macOS se conecta al servidor WS del Gateway como un nodo (por lo que `openclaw nodes …` funciona contra este Mac).
- En modo remoto, la aplicación abre un túnel SSH para el puerto del Gateway y se conecta a `localhost`.

import es from "/components/footer/es.mdx";

<es />

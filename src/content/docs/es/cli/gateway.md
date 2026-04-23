---
summary: "CLI de OpenClaw Gateway (`openclaw gateway`) — ejecutar, consultar y descubrir gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "gateway"
---

# CLI de Gateway

El Gateway es el servidor WebSocket de OpenClaw (canales, nodos, sesiones, hooks).

Los subcomandos de esta página se encuentran en `openclaw gateway …`.

Documentación relacionada:

- [/gateway/bonjour](/es/gateway/bonjour)
- [/gateway/discovery](/es/gateway/discovery)
- [/gateway/configuration](/es/gateway/configuration)

## Ejecutar el Gateway

Ejecute un proceso local del Gateway:

```bash
openclaw gateway
```

Alias en primer plano:

```bash
openclaw gateway run
```

Notas:

- De forma predeterminada, el Gateway se niega a iniciarse a menos que `gateway.mode=local` esté establecido en `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` para ejecuciones ad-hoc/desarrollo.
- Se espera que `openclaw onboard --mode local` y `openclaw setup` escriban `gateway.mode=local`. Si el archivo existe pero `gateway.mode` falta, trátelo como una configuración dañada o corrompida y repárela en lugar de asumir implícitamente el modo local.
- Si el archivo existe y `gateway.mode` falta, el Gateway lo trata como un daño sospechoso en la configuración y se niega a "adivinar local" por usted.
- El enlace más allá del loopback sin autenticación está bloqueado (guarda de seguridad).
- `SIGUSR1` activa un reinicio en proceso cuando está autorizado (`commands.restart` está habilitado de forma predeterminada; establezca `commands.restart: false` para bloquear el reinicio manual, mientras que gateway tool/config apply/update siguen permitidos).
- Los controladores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado de terminal personalizado. Si envuelve la CLI con una TUI o entrada en modo sin formato, restaure la terminal antes de salir.

### Opciones

- `--port <port>`: Puerto WebSocket (el valor predeterminado proviene de config/env; generalmente `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: modo de enlace del escucha.
- `--auth <token|password>`: anulación del modo de autenticación.
- `--token <token>`: anulación de token (también establece `OPENCLAW_GATEWAY_TOKEN` para el proceso).
- `--password <password>`: anulación de contraseña. Advertencia: las contraseñas en línea pueden exponerse en listas de procesos locales.
- `--password-file <path>`: lea la contraseña del gateway desde un archivo.
- `--tailscale <off|serve|funnel>`: exponer el Gateway a través de Tailscale.
- `--tailscale-reset-on-exit`: restablecer la configuración de serve/funnel de Tailscale al apagar.
- `--allow-unconfigured`: permitir el inicio del gateway sin `gateway.mode=local` en la configuración. Esto omite la protección de inicio solo para arranque ad-hoc/desarrollo; no escribe ni repara el archivo de configuración.
- `--dev`: crear una configuración de desarrollo + espacio de trabajo si faltan (omite BOOTSTRAP.md).
- `--reset`: restablecer configuración de desarrollo + credenciales + sesiones + espacio de trabajo (requiere `--dev`).
- `--force`: terminar cualquier escucha existente en el puerto seleccionado antes de iniciar.
- `--verbose`: registros detallados.
- `--cli-backend-logs`: mostrar solo los registros del backend de la CLI en la consola (y habilitar stdout/stderr).
- `--ws-log <auto|full|compact>`: estilo de registro de websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registrar eventos de flujo del modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta del l de flujo sin procesar.

Perfilado de inicio:

- Establezca `OPENCLAW_GATEWAY_STARTUP_TRACE=1` para registrar los tiempos de las fases durante el inicio de Gateway.
- Ejecute `pnpm test:startup:gateway -- --runs 5 --warmup 1` para realizar un benchmark del inicio de Gateway. El benchmark registra la primera salida del proceso, `/healthz`, `/readyz` y los tiempos de seguimiento del inicio.

## Consultar un Gateway en ejecución

Todos los comandos de consulta utilizan WebSocket RPC.

Modos de salida:

- Predeterminado: legible por humanos (con color en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de carga).
- `--no-color` (o `NO_COLOR=1`): desactivar ANSI manteniendo el diseño humano.

Opciones compartidas (donde sea compatible):

- `--url <url>`: URL de WebSocket de Gateway.
- `--token <token>`: token de Gateway.
- `--password <password>`: contraseña de Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: esperar una respuesta "final" (llamadas de agente).

Nota: cuando establece `--url`, la CLI no recurre a las credenciales de configuración o de entorno.
Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

El endpoint HTTP `/healthz` es una sonda de actividad: devuelve una vez que el servidor puede responder HTTP. El endpoint HTTP `/readyz` es más estricto y permanece en rojo mientras los sidecars de inicio, los canales o los hooks configurados todavía se estén asentando.

### `gateway usage-cost`

Obtener resúmenes de costos de uso de los registros de sesión.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

Opciones:

- `--days <days>`: número de días a incluir (predeterminado `30`).

### `gateway status`

`gateway status` muestra el servicio Gateway (launchd/systemd/schtasks) más una sonda opcional de la capacidad de conexión/autenticación.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: agregar un objetivo de sonda explícito. El remoto configurado + localhost todavía se sondean.
- `--token <token>`: autenticación de token para la sonda.
- `--password <password>`: autenticación por contraseña para la sonda.
- `--timeout <ms>`: tiempo de espera de la sonda (por defecto `10000`).
- `--no-probe`: omitir la sonda de conectividad (vista solo de servicio).
- `--deep`: escanear también los servicios de nivel del sistema.
- `--require-rpc`: actualiza la sonda de conectividad predeterminada a una sonda de lectura y sale con un valor distinto de cero cuando esa sonda de lectura falla. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` sigue disponible para diagnósticos incluso cuando falta o no es válida la configuración local de la CLI.
- El `gateway status` predeterminado prueba el estado del servicio, la conexión WebSocket y la capacidad de autenticación visible en el momento del handshake. No prueba las operaciones de lectura/escritura/administración.
- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de la sonda cuando es posible.
- Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no es suficiente y también necesita que las llamadas RPC con alcance de lectura estén saludables.
- `--deep` añade un escaneo de mejor esfuerzo para instalaciones adicionales de launchd/systemd/schtasks. Cuando se detectan múltiples servicios similares a una puerta de enlace, la salida humana imprime sugerencias de limpieza y advierte que la mayoría de las configuraciones deberían ejecutar una puerta de enlace por máquina.
- La salida humana incluye la ruta del registro de archivos resuelta más la instantánea de las rutas/validez de la configuración CLI frente al servicio para ayudar a diagnosticar la deriva del perfil o del directorio de estado.
- En las instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen tanto los valores `Environment=` como `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).
- Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución combinado (entorno del comando de servicio primero, luego respaldo al entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva del token omiten la resolución del token de configuración.

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- tu puerta de enlace remota configurada (si está establecida), y
- localhost (bucle local) **incluso si la remota está configurada**.

Si pasas `--url`, ese objetivo explícito se añade antes que ambos. La salida humana etiqueta los
objetivos como:

- `URL (explicit)`
- `Remote (configured)` o `Remote (configured, inactive)`
- `Local loopback`

Si se pueden alcanzar múltiples puertas de enlace, imprime todas ellas. Se admiten múltiples puertas de enlace cuando usas perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones todavía ejecutan una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` informa de lo que el sondeo pudo probar sobre la autenticación. Está separado de la capacidad de acceso.
- `Read probe: ok` significa que las llamadas RPC de detalles de ámbito de lectura (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `Read probe: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero el RPC de ámbito de lectura es limitado. Esto se informa como capacidad de acceso **degradada**, no como fallo total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondeado es accesible.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un objetivo es accesible.
  - `degraded`: al menos un objetivo tenía RPC de detalles con ámbito limitado.
  - `capability`: la mejor capacidad observada entre los objetivos accesibles (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` o `unknown`).
  - `primaryTargetId`: mejor objetivo para tratar como el ganador activo en este orden: URL explícita, túnel SSH, remoto configurado y luego bucle local.
  - `warnings[]`: registros de advertencia de mejor esfuerzo con `code`, `message` y `targetIds` opcional.
  - `network`: sugerencias de URL de bucle local/tailnet derivadas de la configuración actual y la red del host.
  - `discovery.timeoutMs` y `discovery.count`: el presupuesto/resultados de descubrimiento reales utilizados para este pase de sondeo.
- Por objetivo (`targets[].connect`):
  - `ok`: accesibilidad después de la conexión + clasificación degradada.
  - `rpcOk`: éxito de RPC con detalles completos.
  - `scopeLimited`: la RPC de detalles falló debido a la falta de alcance del operador.
- Por objetivo (`targets[].auth`):
  - `role`: rol de autenticación informado en `hello-ok` cuando está disponible.
  - `scopes`: alcances otorgados informados en `hello-ok` cuando están disponibles.
  - `capability`: la clasificación de capacidad de autenticación expuesta para ese objetivo.

Códigos de advertencia comunes:

- `ssh_tunnel_failed`: falló la configuración del túnel SSH; el comando recurrió a sondeos directos.
- `multiple_gateways`: se pudo alcanzar más de un objetivo; esto es inusual a menos que ejecute intencionalmente perfiles aislados, como un robot de rescate.
- `auth_secretref_unresolved`: no se pudo resolver un SecretRef de autenticación configurado para un objetivo fallido.
- `probe_scope_limited`: la conexión de WebSocket tuvo éxito, pero el sondeo de lectura se limitó por `operator.read` faltante.

#### Remoto a través de SSH (paridad con la aplicación Mac)

El modo "Remoto a través de SSH" de la aplicación macOS utiliza un reenvío de puerto local para que la puerta de enlace remota (que podría estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente de CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: elige el primer host de gateway descubierto como objetivo SSH desde el punto final de descubrimiento resuelto (`local.` más el dominio de área amplia configurado, si lo hay). Se ignoran las sugerencias solo de TXT.

Configuración (opcional, utilizada como valores predeterminados):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Auxiliar de RPC de bajo nivel.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

Opciones:

- `--params <json>`: cadena de objeto JSON para parámetros (predeterminado `{}`)
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

Notas:

- `--params` debe ser un JSON válido.
- `--expect-final` es principalmente para RPCs de tipo agente que transmiten eventos intermedios antes de una carga final.

## Administrar el servicio Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

Opciones de comando:

- `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `gateway uninstall|start|stop|restart`: `--json`

Notas:

- `gateway install` admite `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, `gateway install` valida que el SecretRef sea resoluble pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, la instalación falla de forma segura en lugar de persistir texto plano de reserva.
- Para la autenticación por contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef en lugar de `--password` en línea.
- En el modo de autenticación inferida, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use una configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos de ciclo de vida aceptan `--json` para su uso en scripts.

## Descubrir gateways (Bonjour)

`gateway discover` escanea en busca de balizas de Gateway (`_openclaw-gw._tcp`).

- DNS-SD de multidifusión: `local.`
- DNS-SD de unidifusión (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/es/gateway/bonjour)

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (pista de rol de gateway)
- `transport` (pista de transporte, p. ej., `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (opcional; los clientes establecen por defecto los destinos SSH a `22` cuando está ausente)
- `tailnetDns` (nombre de host de MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (pista de instalación remota escrita en la zona de área amplia)

### `gateway discover`

```bash
openclaw gateway discover
```

Opciones:

- `--timeout <ms>`: tiempo de espera por comando (explorar/resolver); predeterminado `2000`.
- `--json`: salida legible por máquina (también desactiva el estilo/indicador de carga).

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

Notas:

- La CLI examina `local.` además del dominio de área amplia configurado cuando uno está habilitado.
- `wsUrl` en la salida JSON se deriva del punto final del servicio resuelto, no de las sugerencias solo de TXT
  como `lanHost` o `tailnetDns`.
- En `local.` mDNS, `sshPort` y `cliPath` solo se transmiten cuando
  `discovery.mdns.mode` es `full`. DNS-SD de área amplia todavía escribe `cliPath`; `sshPort`
  también permanece opcional allí.

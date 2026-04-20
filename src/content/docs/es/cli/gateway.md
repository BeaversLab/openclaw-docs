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

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

Modos de salida:

- Predeterminado: legible por humanos (coloreado en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de progreso).
- `--no-color` (o `NO_COLOR=1`): desactivar ANSI manteniendo el diseño humano.

Opciones compartidas (cuando se admiten):

- `--url <url>`: URL de WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: esperar una respuesta "final" (llamadas de agente).

Nota: cuando estableces `--url`, la CLI no recurre a las credenciales de configuración o de entorno.
Pasa `--token` o `--password` explícitamente. Faltan las credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway usage-cost`

Obtener resúmenes de costos de uso de los registros de sesión.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

Opciones:

- `--days <days>`: número de días a incluir (por defecto `30`).

### `gateway status`

`gateway status` muestra el servicio Gateway (launchd/systemd/schtasks) más un sondeo RPC opcional.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: agregar un objetivo de sondeo explícito. Se siguen sondando los configurados remotos + localhost.
- `--token <token>`: autenticación por token para el sondeo.
- `--password <password>`: autenticación por contraseña para el sondeo.
- `--timeout <ms>`: tiempo de espera del sondeo (por defecto `10000`).
- `--no-probe`: omitir el sondeo RPC (vista de solo servicio).
- `--deep`: escanear también los servicios de nivel del sistema.
- `--require-rpc`: salir con estado distinto de cero cuando falla el sondeo RPC. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` permanece disponible para diagnósticos incluso cuando falta la configuración local de la CLI o no es válida.
- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de sondeo cuando es posible.
- Si un auth SecretRef requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación del sondeo; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si el sondeo tiene éxito, se suprimen las advertencias de auth-ref no resueltas para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no sea suficiente y necesite que el propio RPC de Gateway esté sano.
- `--deep` añade un escaneo de mejor esfuerzo para instalaciones adicionales de launchd/systemd/schtasks. Cuando se detectan múltiples servicios similares a gateways, la salida humana imprime sugerencias de limpieza y advierte que la mayoría de las configuraciones deberían ejecutar un solo gateway por máquina.
- La salida humana incluye la ruta del registro de archivos resuelta más la instantánea de rutas/validez de la configuración de CLI frente a servicio para ayudar a diagnosticar la deriva del perfil o del directorio de estado.
- En instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen ambos valores `Environment=` y `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).
- Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución fusionado (primero el entorno de comandos del servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de token omiten la resolución del token de configuración.

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- tu puerta de enlace remota configurada (si está establecida), y
- localhost (bucle) **incluso si el remoto está configurado**.

Si pasas `--url`, ese objetivo explícito se añade antes que ambos. La salida humana etiqueta los
objetivos como:

- `URL (explicit)`
- `Remote (configured)` o `Remote (configured, inactive)`
- `Local loopback`

Si son accesibles múltiples puertas de enlace, imprime todas. Se admiten múltiples puertas de enlace cuando usas perfiles/puertos aislados (ej., un robot de rescate), pero la mayoría de las instalaciones aún ejecutan una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `RPC: ok` significa que las llamadas RPC detalladas (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `RPC: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero la RPC detallada tiene un alcance limitado. Esto se reporta como accesibilidad **degradada**, no como falla total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondeado es accesible.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un objetivo es accesible.
  - `degraded`: al menos un objetivo tuvo una RPC detallada con alcance limitado.
  - `primaryTargetId`: mejor objetivo para tratar como el activo ganador en este orden: URL explícita, túnel SSH, remoto configurado y luego bucle local.
  - `warnings[]`: registros de advertencia de mejor esfuerzo con `code`, `message` y opcional `targetIds`.
  - `network`: sugerencias de URL de bucle local/tailnet derivadas de la configuración actual y la red del host.
  - `discovery.timeoutMs` y `discovery.count`: el presupuesto/resultados de descubrimiento real utilizados para este pase de sondeo.
- Por objetivo (`targets[].connect`):
  - `ok`: accesibilidad después de la conexión + clasificación degradada.
  - `rpcOk`: éxito completo de la RPC detallada.
  - `scopeLimited`: error en los detalles del RPC debido a un ámbito de operador faltante.

Códigos de advertencia comunes:

- `ssh_tunnel_failed`: falló la configuración del túnel SSH; el comando recurrió a sondas directas.
- `multiple_gateways`: se pudo alcanzar más de un objetivo; esto es inusual a menos que ejecutes perfiles aislados intencionalmente, como un bot de rescate.
- `auth_secretref_unresolved`: no se pudo resolver una referencia secreta (SecretRef) de autenticación configurada para un objetivo fallido.
- `probe_scope_limited`: la conexión de WebSocket se realizó correctamente, pero el detalle de RPC se limitó por `operator.read` faltante.

#### Remoto a través de SSH (paridad con la aplicación Mac)

El modo "Remote over SSH" (Remoto a través de SSH) de la aplicación macOS utiliza un reenvío de puerto local para que la puerta de enlace remota (que puede estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente en CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: selecciona el primer host de puerta de enlace descubierto como objetivo SSH desde el punto final de descubrimiento resuelto (`local.` más el dominio de área amplia configurado, si lo hubiera). Se ignoran las sugerencias solo de TXT.

Configuración (opcional, se usa como valores predeterminados):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Ayudante de RPC de bajo nivel.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

Opciones:

- `--params <json>`: cadena de objeto JSON para los parámetros (predeterminado `{}`)
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

Notas:

- `--params` debe ser JSON válido.
- `--expect-final` es principalmente para RPC de tipo agente que transmiten eventos intermedios antes de una carga final.

## Administrar el servicio Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

Opciones del comando:

- `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `gateway uninstall|start|stop|restart`: `--json`

Notas:

- `gateway install` admite `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma cerrada en lugar de persistir texto plano de respaldo.
- Para la autenticación por contraseña en `gateway run`, prefiera `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef antes que `--password` en línea.
- En modo de autenticación inferido, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos del ciclo de vida aceptan `--json` para secuencias de comandos.

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD: `local.`
- DNS-SD unidifusión (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/es/gateway/bonjour)

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian el beacon.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (sugerencia de rol de gateway)
- `transport` (sugerencia de transporte, p. ej., `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (opcional; los clientes establecen los destinos SSH de forma predeterminada en `22` cuando está ausente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (sugerencia de instalación remota escrita en la zona de área amplia)

### `gateway discover`

```bash
openclaw gateway discover
```

Opciones:

- `--timeout <ms>`: tiempo de espera por comando (examinar/resolver); predeterminado `2000`.
- `--json`: salida legible por máquina (también deshabilita el estilo/el indicador de carga).

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

Notas:

- La CLI examina `local.` además del dominio de área amplia configurado cuando uno está habilitado.
- `wsUrl` en la salida JSON se deriva del punto final del servicio resuelto, no de sugerencias solo de TXT
  como `lanHost` o `tailnetDns`.
- En mDNS `local.`, `sshPort` y `cliPath` solo se transmiten cuando
  `discovery.mdns.mode` es `full`. DNS-SD de área amplia todavía escribe `cliPath`; `sshPort`
  también permanece opcional allí.

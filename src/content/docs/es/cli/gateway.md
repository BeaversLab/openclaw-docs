---
summary: "CLI de Gateway de OpenClaw (`openclaw gateway`) — ejecute, consulte y descubra gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# CLI de Gateway

El Gateway es el servidor WebSocket de OpenClaw (canales, nodos, sesiones, hooks).

Los subcomandos en esta página se encuentran bajo `openclaw gateway …`.

Documentación relacionada:

- [/gateway/bonjour](/en/gateway/bonjour)
- [/gateway/discovery](/en/gateway/discovery)
- [/gateway/configuration](/en/gateway/configuration)

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
- El enlace más allá de loopback sin autenticación está bloqueado (barra de seguridad).
- `SIGUSR1` activa un reinicio dentro del proceso cuando está autorizado (`commands.restart` está habilitado de forma predeterminada; establezca `commands.restart: false` para bloquear el reinicio manual, mientras que gateway tool/config apply/update permanecen permitidos).
- Los controladores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado personalizado de la terminal. Si envuelve la CLI con una interfaz de usuario de terminal (TUI) o entrada en modo sin procesar, restaure la terminal antes de salir.

### Opciones

- `--port <port>`: puerto WebSocket (el valor predeterminado proviene de config/env; generalmente `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: modo de enlace del escucha.
- `--auth <token|password>`: anulación del modo de autenticación.
- `--token <token>`: anulación del token (también establece `OPENCLAW_GATEWAY_TOKEN` para el proceso).
- `--password <password>`: anulación de contraseña. Advertencia: las contraseñas en línea pueden exponerse en los listados de procesos locales.
- `--password-file <path>`: lea la contraseña del gateway desde un archivo.
- `--tailscale <off|serve|funnel>`: exponga el Gateway a través de Tailscale.
- `--tailscale-reset-on-exit`: restablezca la configuración de serve/funnel de Tailscale al apagar.
- `--allow-unconfigured`: permite el inicio del gateway sin `gateway.mode=local` en la configuración.
- `--dev`: crea una configuración de desarrollo y un espacio de trabajo si faltan (omite BOOTSTRAP.md).
- `--reset`: restablece la configuración de desarrollo + credenciales + sesiones + espacio de trabajo (requiere `--dev`).
- `--force`: mata cualquier escucha existente en el puerto seleccionado antes de iniciar.
- `--verbose`: registros detallados.
- `--cli-backend-logs`: mostrar solo los registros del backend de la CLI en la consola (y habilitar stdout/stderr).
- `--claude-cli-logs`: alias obsoleto para `--cli-backend-logs`.
- `--ws-log <auto|full|compact>`: estilo de registro de websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registrar eventos de flujo del modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta l de flujo sin procesar.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

Modos de salida:

- Predeterminado: legible por humanos (con color en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de carga).
- `--no-color` (o `NO_COLOR=1`): deshabilitar ANSI manteniendo el diseño humano.

Opciones compartidas (donde sea compatible):

- `--url <url>`: URL de WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: esperar una respuesta "final" (llamadas de agente).

Nota: cuando estableces `--url`, la CLI no recurre a las credenciales de configuración o de entorno.
Pasa `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` muestra el servicio Gateway (launchd/systemd/schtasks) más una sonda RPC opcional.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: anula la URL de la sonda.
- `--token <token>`: autenticación con token para la sonda.
- `--password <password>`: autenticación con contraseña para la sonda.
- `--timeout <ms>`: tiempo de espera de la sonda (predeterminado `10000`).
- `--no-probe`: omitir la sonda RPC (vista solo del servicio).
- `--deep`: escanear también los servicios de nivel del sistema.
- `--require-rpc`: salir con un valor distinto de cero cuando falla la sonda RPC. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de la sonda cuando es posible.
- Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pasa `--token`/`--password` explícitamente o resuelve primero la fuente del secreto.
- Si la sonda tiene éxito, las advertencias de referencia de autenticación no resueltas se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no es suficiente y necesitas que el propio Gateway RPC esté sano.
- En instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen tanto los valores `Environment=` como `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).

### `gateway probe`

`gateway probe` es el comando de "depurar todo". Siempre sondea:

- tu puerta de enlace remota configurada (si está configurada), y
- localhost (bucle) **incluso si el remoto está configurado**.

Si se pueden alcanzar múltiples puertas de enlace, imprime todas. Se admiten múltiples puertas de enlace cuando usas perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones aún ejecutan una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `RPC: ok` significa que las llamadas RPC detalladas (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `RPC: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero la RPC detallada tiene un alcance limitado. Esto se informa como accesibilidad **degradada**, no como fallo total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondeado es alcanzable.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un objetivo es alcanzable.
  - `degraded`: al menos un objetivo tenía un RPC de detalle con alcance limitado.
- Por objetivo (`targets[].connect`):
  - `ok`: alcanzabilidad tras la conexión + clasificación degradada.
  - `rpcOk`: éxito del RPC de detalle completo.
  - `scopeLimited`: el RPC de detalle falló debido a la falta de alcance del operador.

#### Remoto a través de SSH (paridad con la app Mac)

El modo "Remote over SSH" de la aplicación macOS utiliza un redireccionamiento de puerto local para que la puerta de enlace remota (que podría estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente en CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: seleccionar el primer host de puerta de enlace descubierto como objetivo SSH (solo LAN/WAB).

Configuración (opcional, utilizada como valores predeterminados):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Auxiliar RPC de bajo nivel.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## Administrar el servicio Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

Notas:

- `gateway install` admite `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, `gateway install` valida que el SecretRef se puede resolver, pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y la SecretRef del token configurado no está resuelta, la instalación falla de forma segura en lugar de conservar el texto plano de respaldo.
- Para la autenticación con contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef antes que `--password` en línea.
- En el modo de autenticación inferida, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use una configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establece explícitamente.
- Los comandos del ciclo de vida aceptan `--json` para secuencias de comandos (scripting).

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- DNS-SD Multicast: `local.`
- DNS-SD Unicast (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/en/gateway/bonjour)

Solo los gateways con el descubrimiento Bonjour habilitado (por defecto) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (sugerencia de rol de gateway)
- `transport` (sugerencia de transporte, p. ej. `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (puerto SSH; por defecto es `22` si no está presente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (sugerencia opcional para instalaciones remotas)

### `gateway discover`

```bash
openclaw gateway discover
```

Opciones:

- `--timeout <ms>`: tiempo de espera por comando (examinar/resolver); por defecto `2000`.
- `--json`: salida legible por máquina (también deshabilita el estilo/indicador de carga).

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

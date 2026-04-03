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
- `--cli-backend-logs`: muestra solo los registros del backend de la CLI en la consola (y habilita stdout/stderr).
- `--claude-cli-logs`: alias obsoleto para `--cli-backend-logs`.
- `--ws-log <auto|full|compact>`: estilo de registro websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registra los eventos del flujo del modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta del l del flujo sin procesar.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

Modos de salida:

- Por defecto: legible por humanos (coloreado en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de progreso).
- `--no-color` (o `NO_COLOR=1`): deshabilita ANSI manteniendo el diseño humano.

Opciones compartidas (cuando se admitan):

- `--url <url>`: URL de WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: espera una respuesta "final" (llamadas de agente).

Nota: cuando estableces `--url`, la CLI no recurre a las credenciales de configuración o del entorno.
Pasa `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` muestra el servicio del Gateway (launchd/systemd/schtasks) más un sondeo RPC opcional.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: anula la URL del sondeo.
- `--token <token>`: autenticación con token para el sondeo.
- `--password <password>`: autenticación con contraseña para el sondeo.
- `--timeout <ms>`: tiempo de espera del sondeo (por defecto `10000`).
- `--no-probe`: omitir el sondeo RPC (vista solo del servicio).
- `--deep`: escanear también los servicios de nivel del sistema.
- `--require-rpc`: sale con un valor distinto de cero cuando falla el sondeo RPC. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación del sondeo cuando es posible.
- Si un auth SecretRef requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación del sondeo; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si el sondeo tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no sea suficiente y necesite que el Gateway RPC en sí esté saludable.
- En las instalaciones de systemd en Linux, las comprobaciones de deriva de autenticación del servicio leen ambos valores `Environment=` y `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).
- Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución combinado (primero el entorno del comando del servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de token omiten la resolución del token de configuración.

### `gateway probe`

`gateway probe` es el comando de "depurar todo". Siempre sondea:

- su gateway remoto configurado (si está establecido), y
- localhost (loopback) **incluso si el remoto está configurado**.

Si se pueden alcanzar múltiples gateways, imprime todos ellos. Se admiten múltiples gateways cuando utiliza perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones todavía ejecutan un solo gateway.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `RPC: ok` significa que las llamadas RPC de detalle (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `RPC: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero el RPC de detalle está limitado en alcance. Esto se informa como accesibilidad **degradada**, no como un fallo total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondeado es accesible.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un objetivo es accesible.
  - `degraded`: al menos un objetivo tuvo un RPC de detalle limitado en alcance.
- Por objetivo (`targets[].connect`):
  - `ok`: accesibilidad después de la conexión + clasificación degradada.
  - `rpcOk`: éxito completo del RPC de detalle.
  - `scopeLimited`: el RPC de detalle falló debido a la falta de alcance de operador.

#### Remoto a través de SSH (paridad con la aplicación Mac)

El modo "Remote over SSH" de la aplicación macOS utiliza un reenvío de puerto local para que la puerta de enlace remota (que puede estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente en CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: selecciona el primer host de puerta de enlace descubierto como objetivo SSH (solo LAN/WAB).

Configuración (opcional, utilizada como predeterminados):

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
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver, pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef de token configurado no se resuelve, la instalación falla de forma segura en lugar de persistir texto plano alternativo.
- Para la autenticación con contraseña en `gateway run`, prefiera `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, o un `gateway.auth.password` respaldado por SecretRef antes que `--password` en línea.
- En modo de autenticación inferida, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos de ciclo de vida aceptan `--json` para secuencias de comandos (scripting).

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD: `local.`
- Unicast DNS-SD (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/en/gateway/bonjour)

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (pista de rol de gateway)
- `transport` (pista de transporte, ej. `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (puerto SSH; predeterminado a `22` si no está presente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (pista opcional para instalaciones remotas)

### `gateway discover`

```bash
openclaw gateway discover
```

Opciones:

- `--timeout <ms>`: tiempo de espera por comando (explorar/resolver); predeterminado `2000`.
- `--json`: salida legible por máquina (también deshabilita el estilo/indicador de carga).

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

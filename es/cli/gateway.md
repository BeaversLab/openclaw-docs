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
- `--claude-cli-logs`: muestra solo los registros de claude-cli en la consola (y habilita su stdout/stderr).
- `--ws-log <auto|full|compact>`: estilo de registro websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registra eventos de flujo del modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta de l de flujo sin procesar.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

Modos de salida:

- Por defecto: legible por humanos (coloreado en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de progreso).
- `--no-color` (o `NO_COLOR=1`): desactiva ANSI manteniendo el diseño humano.

Opciones compartidas (cuando se admiten):

- `--url <url>`: URL WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: espera una respuesta "final" (llamadas de agente).

Nota: cuando estableces `--url`, la CLI no recurre a credenciales de configuración o de entorno.
Pasa `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` muestra el servicio Gateway (launchd/systemd/schtasks) más un sondeo RPC opcional.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: anula la URL de sondeo.
- `--token <token>`: autenticación de token para el sondeo.
- `--password <password>`: autenticación de contraseña para el sondeo.
- `--timeout <ms>`: tiempo de espera del sondeo (por defecto `10000`).
- `--no-probe`: omitir el sondeo de RPC (vista solo de servicio).
- `--deep`: escanear también los servicios a nivel de sistema.
- `--require-rpc`: salir con código distinto de cero cuando falla el sondeo de RPC. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de sondeo cuando es posible.
- Si una SecretRef de autenticación requerida no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la sonda de conectividad/autenticación; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no es suficiente y necesita que el propio Gateway RPC esté sano.
- En instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen ambos valores `Environment=` y `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y opcionales archivos `-`).

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- su puerta de enlace remota configurada (si está configurada), y
- localhost (bucle local) **incluso si se configura el remoto**.

Si se pueden alcanzar varias puertas de enlace, imprime todas. Se admiten varias puertas de enlace cuando usa perfiles/puertos aislados (por ejemplo, un robot de rescate), pero la mayoría de las instalaciones aún ejecutan una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `RPC: ok` significa que las llamadas RPC de detalle (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `RPC: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero que el RPC de detalle tiene un alcance limitado. Esto se informa como accesibilidad **degradada**, no como falla total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondeado es accesible.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un objetivo es accesible.
  - `degraded`: al menos un objetivo tuvo un RPC de detalle con alcance limitado.
- Por objetivo (`targets[].connect`):
  - `ok`: alcance después de la conexión + clasificación degradada.
  - `rpcOk`: éxito de RPC con detalle completo.
  - `scopeLimited`: fallo de RPC de detalles debido a falta de alcance de operador.

#### Remoto a través de SSH (paridad de la aplicación Mac)

El modo "Remoto a través de SSH" de la aplicación macOS utiliza un reenvío de puerto local para que la puerta de enlace remota (que puede estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente de CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: seleccionar el primer host de puerta de enlace descubierto como destino SSH (solo LAN/WAB).

Configuración (opcional, se usa como valores predeterminados):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Ayudante de RPC de bajo nivel.

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
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver, pero no persiste el token resuelto en los metadatos del entorno del servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma segura en lugar de persistir el texto plano de reserva.
- Para la autenticación con contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef antes que `--password` en línea.
- En modo de autenticación inferida, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use la configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos de ciclo de vida aceptan `--json` para secuencias de comandos (scripting).

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD: `local.`
- Unicast DNS-SD (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/es/gateway/bonjour)

Solo los gateways con el descubrimiento Bonjour habilitado (por defecto) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (sugerencia de rol de puerta de enlace)
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

import es from "/components/footer/es.mdx";

<es />

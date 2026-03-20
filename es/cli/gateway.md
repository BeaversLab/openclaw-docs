---
summary: "CLI de OpenClaw Gateway (`openclaw gateway`) — ejecutar, consultar y descubrir gateways"
read_when:
  - Ejecutar el Gateway desde la CLI (desarrollo o servidores)
  - Depuración de la autenticación, modos de enlace y conectividad del Gateway
  - Descubrir gateways mediante Bonjour (LAN + tailnet)
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

Ejecutar un proceso local de Gateway:

```bash
openclaw gateway
```

Alias en primer plano:

```bash
openclaw gateway run
```

Notas:

- De forma predeterminada, el Gateway se niega a iniciarse a menos que se establezca `gateway.mode=local` en `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` para ejecuciones ad-hoc/desarrollo.
- El enlace más allá del loopback sin autenticación está bloqueado (barra de seguridad).
- `SIGUSR1` activa un reinicio en proceso cuando está autorizado (`commands.restart` está habilitado de forma predeterminada; configure `commands.restart: false` para bloquear el reinicio manual, mientras se permite que la herramienta de gateway/config apply/update sigan estando permitidas).
- Los manejadores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado personalizado de la terminal. Si envuelve la CLI con una interfaz TUI o entrada en modo sin formato, restaure la terminal antes de salir.

### Opciones

- `--port <port>`: puerto WebSocket (el valor predeterminado proviene de la configuración/entorno; generalmente `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: modo de enlace del escucha.
- `--auth <token|password>`: anulación del modo de autenticación.
- `--token <token>`: anulación del token (también establece `OPENCLAW_GATEWAY_TOKEN` para el proceso).
- `--password <password>`: anulación de contraseña. Advertencia: las contraseñas en línea pueden exponerse en los listados de procesos locales.
- `--password-file <path>`: leer la contraseña del gateway desde un archivo.
- `--tailscale <off|serve|funnel>`: exponer el Gateway a través de Tailscale.
- `--tailscale-reset-on-exit`: restablecer la configuración de serve/funnel de Tailscale al apagar.
- `--allow-unconfigured`: permite iniciar el gateway sin `gateway.mode=local` en la configuración.
- `--dev`: crea una configuración de desarrollo + espacio de trabajo si faltan (omite BOOTSTRAP.md).
- `--reset`: restablece la configuración de desarrollo + credenciales + sesiones + espacio de trabajo (requiere `--dev`).
- `--force`: finaliza cualquier escucha existente en el puerto seleccionado antes de iniciar.
- `--verbose`: registros detallados.
- `--claude-cli-logs`: muestra solo los registros de claude-cli en la consola (y habilita su stdout/stderr).
- `--ws-log <auto|full|compact>`: estilo de registro websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registra eventos de flujo del modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta l de flujo sin procesar.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

Modos de salida:

- Predeterminado: legible por humanos (con color en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de progreso).
- `--no-color` (o `NO_COLOR=1`): desactiva ANSI manteniendo el diseño humano.

Opciones compartidas (donde se admitan):

- `--url <url>`: URL de WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: esperar una respuesta "final" (llamadas de agente).

Nota: cuando estableces `--url`, la CLI no recurre a credenciales de configuración o de entorno.
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

- `--url <url>`: anular la URL del sondeo.
- `--token <token>`: autenticación de token para el sondeo.
- `--password <password>`: autenticación de contraseña para el sondeo.
- `--timeout <ms>`: tiempo de espera de la sonda (valor predeterminado `10000`).
- `--no-probe`: omitir la sonda RPC (vista solo de servicio).
- `--deep`: también escanear servicios de nivel del sistema.
- `--require-rpc`: salir con un valor distinto de cero cuando falla la sonda RPC. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de la sonda cuando es posible.
- Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no es suficiente y necesita que el propio Gateway RPC esté sano.
- En las instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen ambos valores `Environment=` y `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- su puerta de enlace remota configurada (si está configurada), y
- localhost (bucle de retorno) **incluso si está configurado el remoto**.

Si se pueden alcanzar varias puertas de enlace, imprime todas ellas. Se admiten varias puertas de enlace cuando utiliza perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones siguen ejecutando una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
- `RPC: ok` significa que las llamadas RPC detalladas (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `RPC: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero el RPC detallado tiene un alcance limitado. Esto se informa como accesibilidad **degradada**, no como una falla total.
- El código de salida es distinto de cero solo cuando ningún objetivo sondado es alcanzable.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un destino es accesible.
  - `degraded`: al menos un destino tuvo RPC de detalle con alcance limitado.
- Por destino (`targets[].connect`):
  - `ok`: accesibilidad después de conectar + clasificación degradada.
  - `rpcOk`: éxito de RPC de detalle completo.
  - `scopeLimited`: el RPC de detalle falló debido a falta de alcance del operador.

#### Remoto a través de SSH (paridad de la app Mac)

El modo "Remote over SSH" de la aplicación macOS utiliza un reenvío de puerto local para que la puerta de enlace remota (que puede estar vinculada solo a loopback) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: seleccionar el primer host de puerta de enlace descubierto como objetivo SSH (solo LAN/WAB).

Configuración (opcional, se usa como predeterminada):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Ayudante RPC de bajo nivel.

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
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver pero no persiste el token resuelto en los metadatos del entorno de servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no se resuelve, la instalación falla de forma cerrada en lugar de persistir texto plano de respaldo.
- Para la autenticación con contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef en lugar de `--password` en línea.
- En el modo de autenticación inferido, el uso exclusivo de shell `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` no relaja los requisitos del token de instalación; use una configuración duradera (`gateway.auth.password` o config `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está definido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos del ciclo de vida aceptan `--json` para secuencias de comandos (scripting).

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD: `local.`
- Unicast DNS-SD (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/es/gateway/bonjour)

Solo los gateways con el descubrimiento Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (sugerencia de rol del gateway)
- `transport` (sugerencia de transporte, p. ej. `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (puerto SSH; de forma predeterminada es `22` si no está presente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (sugerencia opcional para instalaciones remotas)

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

import es from "/components/footer/es.mdx";

<es />

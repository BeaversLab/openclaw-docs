---
summary: "CLI de OpenClaw Gateway (`openclaw gateway`) — ejecuta, consulta y descubre gateways"
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

- Por defecto, el Gateway se niega a iniciarse a menos que `gateway.mode=local` esté establecido en `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` para ejecuciones ad-hoc/desarrollo.
- Se espera que `openclaw onboard --mode local` y `openclaw setup` escriban `gateway.mode=local`. Si el archivo existe pero falta `gateway.mode`, trátelo como una configuración dañada o corrompida y repárela en lugar de asumir implícitamente el modo local.
- Si el archivo existe y falta `gateway.mode`, el Gateway lo trata como un daño de configuración sospechoso y se niega a “asumir local” por usted.
- El enlace más allá del loopback sin autenticación está bloqueado (guarda de seguridad).
- `SIGUSR1` activa un reinicio dentro del proceso cuando está autorizado (`commands.restart` está habilitado por defecto; establezca `commands.restart: false` para bloquear el reinicio manual, mientras que gateway tool/config apply/update permanecen permitidos).
- Los controladores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado personalizado de la terminal. Si envuelve la CLI con una interfaz de usuario de texto (TUI) o entrada en modo raw, restaure la terminal antes de salir.

### Opciones

- `--port <port>`: puerto WebSocket (el valor predeterminado proviene de la configuración/entorno; generalmente `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>`: modo de enlace del agente de escucha.
- `--auth <token|password>`: anulación del modo de autenticación.
- `--token <token>`: anulación del token (también establece `OPENCLAW_GATEWAY_TOKEN` para el proceso).
- `--password <password>`: anulación de contraseña. Advertencia: las contraseñas en línea pueden exponerse en listados de procesos locales.
- `--password-file <path>`: lea la contraseña del gateway desde un archivo.
- `--tailscale <off|serve|funnel>`: exponga el Gateway a través de Tailscale.
- `--tailscale-reset-on-exit`: restablecer la configuración de serve/funnel de Tailscale al apagar.
- `--allow-unconfigured`: permite el inicio del gateway sin `gateway.mode=local` en la configuración. Esto omite el guardia de inicio solo para arranque ad-hoc/desarrollo; no escribe ni repara el archivo de configuración.
- `--dev`: crea una configuración de desarrollo + espacio de trabajo si faltan (omite BOOTSTRAP.md).
- `--reset`: restablecer configuración de desarrollo + credenciales + sesiones + espacio de trabajo (requiere `--dev`).
- `--force`: matar cualquier escucha existente en el puerto seleccionado antes de iniciar.
- `--verbose`: registros detallados.
- `--cli-backend-logs`: mostrar solo los registros del backend de la CLI en la consola (y habilitar stdout/stderr).
- `--ws-log <auto|full|compact>`: estilo de registro de websocket (por defecto `auto`).
- `--compact`: alias para `--ws-log compact`.
- `--raw-stream`: registrar eventos de flujo de modelo sin procesar en l.
- `--raw-stream-path <path>`: ruta de l de flujo sin procesar.

Perfilado de inicio:

- Establezca `OPENCLAW_GATEWAY_STARTUP_TRACE=1` para registrar los tiempos de las fases durante el inicio del Gateway.
- Ejecute `pnpm test:startup:gateway -- --runs 5 --warmup 1` para evaluar el rendimiento del inicio del Gateway. El benchmark registra la primera salida del proceso, `/healthz`, `/readyz` y los tiempos de rastreo de inicio.

## Consultar un Gateway en ejecución

Todos los comandos de consulta utilizan WebSocket RPC.

Modos de salida:

- Predeterminado: legible por humanos (con color en TTY).
- `--json`: JSON legible por máquina (sin estilo/indicador de carga).
- `--no-color` (o `NO_COLOR=1`): desactivar ANSI manteniendo el diseño humano.

Opciones compartidas (donde sea compatible):

- `--url <url>`: URL del WebSocket del Gateway.
- `--token <token>`: token del Gateway.
- `--password <password>`: contraseña del Gateway.
- `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
- `--expect-final`: esperar una respuesta "final" (llamadas de agente).

Nota: cuando establece `--url`, la CLI no recurre a credenciales de configuración o de entorno.
Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

El endpoint HTTP `/healthz` es un sondeo de vida (liveness probe): devuelve una respuesta una vez que el servidor puede responder a HTTP. El endpoint HTTP `/readyz` es más estricto y permanece en rojo mientras los sidecars de inicio, los canales o los hooks configurados todavía se estén asentando.

### `gateway usage-cost`

Obtener resúmenes de costos de uso de los registros de sesión.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

Opciones:

- `--days <days>`: número de días a incluir (por defecto `30`).

### `gateway stability`

Obtener el grabador de estabilidad de diagnóstico reciente de un Gateway en ejecución.

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

Opciones:

- `--limit <limit>`: número máximo de eventos recientes a incluir (por defecto `25`, máximo `1000`).
- `--type <type>`: filtrar por tipo de evento de diagnóstico, como `payload.large` o `diagnostic.memory.pressure`.
- `--since-seq <seq>`: incluir solo eventos después de un número de secuencia de diagnóstico.
- `--bundle [path]`: leer un paquete de estabilidad persistente en lugar de llamar al Gateway en ejecución. Use `--bundle latest` (o simplemente `--bundle`) para el paquete más reciente bajo el directorio de estado, o pase una ruta JSON del paquete directamente.
- `--export`: escribir un zip de diagnósticos de soporte compartible en lugar de imprimir detalles de estabilidad.
- `--output <path>`: ruta de salida para `--export`.

Notas:

- El grabador está activo por defecto y sin carga útil (payload-free): captura solo metadatos operativos, no texto de chat, salidas de herramientas, o cuerpos de solicitud o respuesta sin procesar. Establezca `diagnostics.enabled: false` solo cuando necesite deshabilitar completamente la recopilación de latidos de diagnóstico del Gateway.
- Los registros mantienen metadatos operativos: nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de cola/sesión, nombres de canal/complemento y resúmenes de sesión redactados. No mantienen texto de chat, cuerpos de webhook, salidas de herramientas, cuerpos de solicitud o respuesta sin procesar, tokens, cookies, valores secretos, nombres de host o identificadores de sesión sin procesar.
- En salidas fatales de Gateway, tiempos de espera de apagado y fallos de inicio al reiniciar, OpenClaw escribe la misma instantánea de diagnóstico en `~/.openclaw/logs/stability/openclaw-stability-*.json` cuando la grabadora tiene eventos. Inspeccione el paquete más reciente con `openclaw gateway stability --bundle latest`; `--limit`, `--type` y `--since-seq` también se aplican a la salida del paquete.

### `gateway diagnostics export`

Escribe un archivo zip de diagnóstico local diseñado para adjuntar a reportes de errores.

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

Opciones:

- `--output <path>`: ruta del zip de salida. Por defecto es una exportación de soporte bajo el directorio de estado.
- `--log-lines <count>`: máximo de líneas de registro saneadas a incluir (por defecto `5000`).
- `--log-bytes <bytes>`: máximo de bytes de registro a inspeccionar (por defecto `1000000`).
- `--url <url>`: URL WebSocket del Gateway para la instantánea de estado.
- `--token <token>`: token del Gateway para la instantánea de estado.
- `--password <password>`: contraseña del Gateway para la instantánea de estado.
- `--timeout <ms>`: tiempo de espera de la instantánea de estado/salud (por defecto `3000`).
- `--no-stability-bundle`: omitir la búsqueda del paquete de estabilidad persistido.
- `--json`: imprimir la ruta escrita, el tamaño y el manifiesto como JSON.

La exportación contiene un manifiesto, un resumen en Markdown, forma de configuración, detalles de configuración saneados, resúmenes de registros saneados, instantáneas de estado/salud del Gateway saneadas y el paquete de estabilidad más reciente cuando existe uno.

Está pensado para ser compartido. Mantiene detalles operativos que ayudan a la depuración, como campos de registro seguros de OpenClaw, nombres de subsistemas, códigos de estado, duraciones, modos configurados, puertos, ids de complementos, ids de proveedores, configuraciones de características no secretas y mensajes de registro operativos redactados. Omite o redacta el texto del chat, los cuerpos de webhook, las salidas de herramientas, las credenciales, las cookies, los identificadores de cuenta/mensaje, el texto de indicación/instrucción, los nombres de host y los valores secretos. Cuando un mensaje estilo LogTape parece texto de carga útil de usuario/chat/herramienta, la exportación mantiene solo que se omitió un mensaje más su recuento de bytes.

### `gateway status`

`gateway status` muestra el servicio Gateway (launchd/systemd/schtasks) más un sondeo opcional de la capacidad de conectabilidad/autenticación.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Opciones:

- `--url <url>`: añadir un objetivo de sondeo explícito. Los remotos configurados + localhost siguen sondeándose.
- `--token <token>`: autenticación por token para el sondeo.
- `--password <password>`: autenticación por contraseña para el sondeo.
- `--timeout <ms>`: tiempo de espera del sondeo (por defecto `10000`).
- `--no-probe`: omitir el sondeo de conectividad (vista solo del servicio).
- `--deep`: escanear también los servicios de nivel del sistema.
- `--require-rpc`: actualizar el sondeo de conectabilidad predeterminado a un sondeo de lectura y salir con estado distinto de cero cuando ese sondeo de lectura falle. No se puede combinar con `--no-probe`.

Notas:

- `gateway status` permanece disponible para diagnósticos incluso cuando falta la configuración local de la CLI o no es válida.
- El `gateway status` predeterminado comprueba el estado del servicio, la conexión WebSocket y la capacidad de autenticación visible en el momento del handshake. No comprueba las operaciones de lectura/escritura/administración.
- `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación del sondeo cuando es posible.
- Si un auth SecretRef necesario no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectabilidad/autenticación del sondeo; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
- Si el sondeo tiene éxito, las advertencias de auth-ref sin resolver se suprimen para evitar falsos positivos.
- Use `--require-rpc` en scripts y automatización cuando un servicio a la escucha no es suficiente y también necesita que las llamadas RPC con ámbito de lectura estén sanas.
- `--deep` añade un escaneo de mejor esfuerzo para instalaciones adicionales de launchd/systemd/schtasks. Cuando se detectan múltiples servicios tipo gateway, la salida humana imprime sugerencias de limpieza y advierte que la mayoría de las configuraciones deberían ejecutar un gateway por máquina.
- La salida humana incluye la ruta del registro de archivos resuelta más la instantánea de las rutas/validez de configuración CLI vs. servicio para ayudar a diagnosticar la deriva del perfil o del directorio de estado.
- En las instalaciones de systemd en Linux, las comprobaciones de deriva de autenticación del servicio leen tanto los valores de `Environment=` como de `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).
- Las comprobaciones de deriva resuelven las `gateway.auth.token` SecretRefs utilizando el entorno de tiempo de ejecución combinado (primero el entorno de comandos del servicio, luego el respaldo del entorno del proceso).
- Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de tokens omiten la resolución del token de configuración.

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- tu puerta de enlace remota configurada (si está configurada), y
- localhost (bucle de retorno) **incluso si la remota está configurada**.

Si pasas `--url`, ese destino explícito se añade antes que ambos. La salida humana etiqueta los destinos como:

- `URL (explicit)`
- `Remote (configured)` o `Remote (configured, inactive)`
- `Local loopback`

Si se pueden alcanzar múltiples puertas de enlace, imprime todas ellas. Se admiten múltiples puertas de enlace cuando utilizas perfiles/puertos aislados (por ejemplo, un robot de rescate), pero la mayoría de las instalaciones siguen ejecutando una sola puerta de enlace.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interpretación:

- `Reachable: yes` significa que al menos un destino aceptó una conexión WebSocket.
- `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` informa lo que el sondeo pudo probar sobre la autenticación. Está separado de la accesibilidad.
- `Read probe: ok` significa que las llamadas RPC de detalle de alcance de lectura (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
- `Read probe: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero la RPC de alcance de lectura está limitada. Esto se informa como accesibilidad **degradada**, no como fallo total.
- El código de salida es distinto de cero solo cuando ningún destino sondeado es accesible.

Notas JSON (`--json`):

- Nivel superior:
  - `ok`: al menos un destino es accesible.
  - `degraded`: al menos un objetivo tenía un RPC de detalles con alcance limitado.
  - `capability`: la mejor capacidad vista entre los objetivos alcanzables (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` o `unknown`).
  - `primaryTargetId`: el mejor objetivo para tratar como el activo ganador en este orden: URL explícita, túnel SSH, remoto configurado y luego bucle local (loopback).
  - `warnings[]`: registros de advertencia de mejor esfuerzo con `code`, `message` y `targetIds` opcional.
  - `network`: sugerencias de URL de bucle local/tailnet derivadas de la configuración actual y la redes del host.
  - `discovery.timeoutMs` y `discovery.count`: el presupuesto de descubrimiento/recuento de resultados real utilizado para este paso de sondeo.
- Por objetivo (`targets[].connect`):
  - `ok`: alcanzabilidad después de la conexión + clasificación degradada.
  - `rpcOk`: éxito del RPC de detalles completos.
  - `scopeLimited`: el RPC de detalles falló debido a la falta de alcance del operador.
- Por objetivo (`targets[].auth`):
  - `role`: rol de autenticación informado en `hello-ok` cuando esté disponible.
  - `scopes`: alcances otorgados informados en `hello-ok` cuando esté disponible.
  - `capability`: la clasificación de capacidad de autenticación expuesta para ese objetivo.

Códigos de advertencia comunes:

- `ssh_tunnel_failed`: falló la configuración del túnel SSH; el comando recurrió a sondeos directos.
- `multiple_gateways`: más de un objetivo era alcanzable; esto es inusual a menos que ejecute intencionalmente perfiles aislados, como un bot de rescate.
- `auth_secretref_unresolved`: no se pudo resolver una referencia secreta (SecretRef) de autenticación configurada para un objetivo fallido.
- `probe_scope_limited`: la conexión WebSocket tuvo éxito, pero el sondeo de lectura se limitó por `operator.read` faltante.

#### Remoto a través de SSH (paridad con la aplicación Mac)

El modo “Remote over SSH” de la aplicación macOS utiliza un redireccionamiento de puerto local para que la puerta de enlace remota (que puede estar vinculada solo a loopback) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente de CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

Opciones:

- `--ssh <target>`: `user@host` o `user@host:port` (el puerto predeterminado es `22`).
- `--ssh-identity <path>`: archivo de identidad.
- `--ssh-auto`: seleccionar el primer host de puerta de enlace descubierto como objetivo SSH desde el endpoint de descubrimiento resuelto (`local.` más el dominio de área amplia configurado, si lo hubiera). Se ignoran las sugerencias solo TXT.

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

- `--params` debe ser JSON válido.
- `--expect-final` es principalmente para RPCs de estilo agente que transmiten eventos intermedios antes de una carga final.

## Gestionar el servicio Gateway

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
- Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver, pero no persiste el token resuelto en los metadatos del entorno de servicio.
- Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma segura en lugar de persistir el texto sin cifrado de reserva.
- Para la autenticación por contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef en lugar de `--password` en línea.
- En el modo de autenticación inferido, `OPENCLAW_GATEWAY_PASSWORD` solo para shell no relaja los requisitos del token de instalación; use una configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio administrado.
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
- Los comandos de ciclo de vida aceptan `--json` para secuencias de comandos (scripting).

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- DNS-SD Multicast: `local.`
- DNS-SD Unicast (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [/gateway/bonjour](/es/gateway/bonjour)

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (pista de rol de gateway)
- `transport` (pista de transporte, p. ej., `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (opcional; los clientes establecen los destinos SSH por defecto en `22` cuando está ausente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (pista de instalación remota escrita en la zona de área amplia)

### `gateway discover`

```bash
openclaw gateway discover
```

Opciones:

- `--timeout <ms>`: tiempo de espera por comando (explorar/resolver); por defecto `2000`.
- `--json`: salida legible por máquina (también desactiva el estilo/indicador de progreso).

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

Notas:

- La CLI escanea `local.` además del dominio de área amplia configurado cuando uno está habilitado.
- `wsUrl` en la salida JSON se deriva del punto de conexión del servicio resuelto, no de pistas
  solo de TXT como `lanHost` o `tailnetDns`.
- En `local.` mDNS, `sshPort` y `cliPath` solo se transmiten cuando
  `discovery.mdns.mode` es `full`. DNS-SD de área amplia aún escribe `cliPath`; `sshPort`
  también permanece opcional allí.

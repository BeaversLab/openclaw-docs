---
summary: "CLI de Gateway de OpenClaw (`openclaw gateway`) — ejecuta, consulta y descubre gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway"
sidebarTitle: "Gateway"
---

El Gateway es el servidor WebSocket de OpenClaw (canales, nodos, sesiones, ganchos). Los subcomandos en esta página se encuentran bajo `openclaw gateway …`.

<CardGroup cols={3}>
  <Card title="Descubrimiento Bonjour" href="/es/gateway/bonjour">
    Configuración de mDNS local + DNS-SD de área amplia.
  </Card>
  <Card title="Resumen de descubrimiento" href="/es/gateway/discovery">
    Cómo OpenClaw anuncia y encuentra gateways.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration">
    Claves de configuración de nivel superior del gateway.
  </Card>
</CardGroup>

## Ejecutar el Gateway

Ejecutar un proceso de Gateway local:

```bash
openclaw gateway
```

Alias en primer plano:

```bash
openclaw gateway run
```

<AccordionGroup>
  <Accordion title="Comportamiento de inicio">
    - De forma predeterminada, el Gateway se niega a iniciarse a menos que `gateway.mode=local` esté establecido en `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` para ejecuciones ad-hoc/desarrollo. - Se espera que `openclaw onboard --mode local` y `openclaw setup` escriban `gateway.mode=local`. Si el archivo existe pero falta `gateway.mode`, trátelo como una configuración dañada o
    sobrescrita y repárela en lugar de asumir implícitamente el modo local. - Si el archivo existe y falta `gateway.mode`, el Gateway lo trata como un daño sospechoso en la configuración y se niega a "asumir local" por usted. - El enlace más allá del loopback sin autenticación está bloqueado (barra de seguridad). - `SIGUSR1` activa un reinicio en proceso cuando está autorizado (`commands.restart`
    está habilitado de forma predeterminada; configure `commands.restart: false` para bloquear el reinicio manual, mientras que gateway tool/config apply/update siguen permitidos). - Los controladores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado personalizado de la terminal. Si envuelve la CLI con una TUI o entrada en modo sin procesar, restaure la terminal
    antes de salir.
  </Accordion>
</AccordionGroup>

### Opciones

<ParamField path="--port <port>" type="number">
  Puerto WebSocket (el valor predeterminado proviene de la configuración/entorno; generalmente `18789`).
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  Modo de enlace del escucha.
</ParamField>
<ParamField path="--auth <token|password>" type="string">
  Anulación del modo de autenticación.
</ParamField>
<ParamField path="--token <token>" type="string">
  Anulación del token (también establece `OPENCLAW_GATEWAY_TOKEN` para el proceso).
</ParamField>
<ParamField path="--password <password>" type="string">
  Anulación de la contraseña.
</ParamField>
<ParamField path="--password-file <path>" type="string">
  Lea la contraseña de la puerta de enlace desde un archivo.
</ParamField>
<ParamField path="--tailscale <off|serve|funnel>" type="string">
  Exponer la puerta de enlace a través de Tailscale.
</ParamField>
<ParamField path="--tailscale-reset-on-exit" type="boolean">
  Restablecer la configuración de servicio/túnel de Tailscale al apagar.
</ParamField>
<ParamField path="--allow-unconfigured" type="boolean">
  Permitir el inicio de la puerta de enlace sin `gateway.mode=local` en la configuración. Omite el protector de inicio solo para arranque ad-hoc/desarrollo; no escribe ni repara el archivo de configuración.
</ParamField>
<ParamField path="--dev" type="boolean">
  Crear una configuración de desarrollo + espacio de trabajo si faltan (omite BOOTSTRAP.md).
</ParamField>
<ParamField path="--reset" type="boolean">
  Restablecer configuración de desarrollo + credenciales + sesiones + espacio de trabajo (requiere `--dev`).
</ParamField>
<ParamField path="--force" type="boolean">
  Matar cualquier escucha existente en el puerto seleccionado antes de comenzar.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Registros detallados.
</ParamField>
<ParamField path="--cli-backend-logs" type="boolean">
  Mostrar solo los registros del backend de la CLI en la consola (y habilitar stdout/stderr).
</ParamField>
<ParamField path="--ws-log <auto|full|compact>" type="string" default="auto">
  Estilo de registro de Websocket.
</ParamField>
<ParamField path="--compact" type="boolean">
  Alias para `--ws-log compact`.
</ParamField>
<ParamField path="--raw-stream" type="boolean">
  Registrar eventos de flujo de modelo sin procesar en l.
</ParamField>
<ParamField path="--raw-stream-path <path>" type="string">
  Ruta l de flujo sin procesar.
</ParamField>

<Warning>El `--password` en línea puede exponerse en los listados de procesos locales. Se prefiere `--password-file`, variables de entorno, o un `gateway.auth.password` respaldado por SecretRef.</Warning>

### Perfilado de inicio

- Establezca `OPENCLAW_GATEWAY_STARTUP_TRACE=1` para registrar los tiempos de fase durante el inicio del Gateway, incluyendo el retraso `eventLoopMax` por fase y los tiempos de la tabla de búsqueda de complementos para el índice instalado, el registro de manifiesto, la planificación del inicio y el trabajo del mapa de propietarios.
- Ejecute `pnpm test:startup:gateway -- --runs 5 --warmup 1` para realizar un benchmark del inicio del Gateway. El benchmark registra la primera salida del proceso, `/healthz`, `/readyz`, tiempos de traza de inicio, retraso del bucle de eventos y detalles de tiempo de la tabla de búsqueda de complementos.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

<Tabs>
  <Tab title="Modos de salida">
    - Predeterminado: legible por humanos (coloreado en TTY).
    - `--json`: JSON legible por máquina (sin estilo/indicador de carga).
    - `--no-color` (o `NO_COLOR=1`): desactiva ANSI manteniendo el diseño humano.
  </Tab>
  <Tab title="Opciones compartidas">
    - `--url <url>`: URL de WebSocket del Gateway.
    - `--token <token>`: token del Gateway.
    - `--password <password>`: contraseña del Gateway.
    - `--timeout <ms>`: tiempo de espera/presupuesto (varía por comando).
    - `--expect-final`: espera una respuesta "final" (llamadas de agente).
  </Tab>
</Tabs>

<Note>Cuando establece `--url`, la CLI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

El endpoint HTTP `/healthz` es un sondeo de actividad (liveness probe): retorna una vez que el servidor puede responder HTTP. El endpoint HTTP `/readyz` es más estricto y permanece en rojo mientras los sidecars de inicio, canales o hooks configurados aún se están asentando.

### `gateway usage-cost`

Obtener resúmenes de costos de uso desde los registros de sesión.

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

<ParamField path="--days <days>" type="number" default="30">
  Número de días a incluir.
</ParamField>

### `gateway stability`

Obtener el grabador de estabilidad de diagnóstico reciente de un Gateway en ejecución.

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<ParamField path="--limit <limit>" type="number" default="25">
  Número máximo de eventos recientes a incluir (máx. `1000`).
</ParamField>
<ParamField path="--type <type>" type="string">
  Filtrar por tipo de evento de diagnóstico, como `payload.large` o `diagnostic.memory.pressure`.
</ParamField>
<ParamField path="--since-seq <seq>" type="number">
  Incluir solo eventos después de un número de secuencia de diagnóstico.
</ParamField>
<ParamField path="--bundle [path]" type="string">
  Leer un paquete de estabilidad persistente en lugar de llamar al Gateway en ejecución. Use `--bundle latest` (o simplemente `--bundle`) para el paquete más reciente en el directorio de estado, o pase una ruta JSON de paquete directamente.
</ParamField>
<ParamField path="--export" type="boolean">
  Escribir un zip de diagnóstico de soporte compartible en lugar de imprimir detalles de estabilidad.
</ParamField>
<ParamField path="--output <path>" type="string">
  Ruta de salida para `--export`.
</ParamField>

<AccordionGroup>
  <Accordion title="Privacidad y comportamiento del paquete">
    - Los registros mantienen metadatos operativos: nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de la cola/sesión, nombres de canales/complementos y resúmenes de sesión redactados. No mantienen texto de chat, cuerpos de webhook, resultados de herramientas, cuerpos de solicitudes o respuestas sin procesar, tokens, cookies, valores secretos, nombres de host o
    identificadores de sesión sin procesar. Establezca `diagnostics.enabled: false` para deshabilitar el grabador por completo. - En salidas fatales del Gateway, tiempos de espera de apagado y fallos de inicio al reiniciar, OpenClaw escribe la misma instantánea de diagnóstico en `~/.openclaw/logs/stability/openclaw-stability-*.json` cuando el grabador tiene eventos. Inspeccione el paquete más
    reciente con `openclaw gateway stability --bundle latest`; `--limit`, `--type` y `--since-seq` también se aplican a la salida del paquete.
  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

Escribe un archivo zip de diagnóstico local diseñado para adjuntar a informes de errores. Para el modelo de privacidad y el contenido del paquete, consulte [Exportación de diagnósticos](/es/gateway/diagnostics).

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  Ruta de salida del zip. Por defecto es una exportación de soporte en el directorio de estado.
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  Máximo de líneas de registro saneadas a incluir.
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  Máximo de bytes de registro a inspeccionar.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL de WebSocket de Gateway para la instantánea de estado.
</ParamField>
<ParamField path="--token <token>" type="string">
  Token de Gateway para la instantánea de estado.
</ParamField>
<ParamField path="--password <password>" type="string">
  Contraseña de Gateway para la instantánea de estado.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="3000">
  Tiempo de espera de la instantánea de estado/salud.
</ParamField>
<ParamField path="--no-stability-bundle" type="boolean">
  Omitir la búsqueda del paquete de estabilidad persistido.
</ParamField>
<ParamField path="--json" type="boolean">
  Imprimir la ruta escrita, el tamaño y el manifiesto como JSON.
</ParamField>

La exportación contiene un manifiesto, un resumen en Markdown, forma de la configuración, detalles saneados de la configuración, resúmenes saneados de registros, instantáneas saneadas del estado/salud de Gateway y el paquete de estabilidad más reciente cuando existe uno.

Está diseñado para ser compartido. Mantiene detalles operativos que ayudan a la depuración, como campos de registro seguros de OpenClaw, nombres de subsistemas, códigos de estado, duraciones, modos configurados, puertos, ids de complementos, ids de proveedores, configuraciones de características no secretas y mensajes operativos de registro redactados. Omite o redacta el texto del chat, cuerpos de webhooks, salidas de herramientas, credenciales, cookies, identificadores de cuenta/mensaje, texto de instrucciones/prompt, nombres de host y valores secretos. Cuando un mensaje de estilo LogTape parece ser texto de carga útil de usuario/chat/herramienta, la exportación mantiene solo que se omitió un mensaje más su recuento de bytes.

### `gateway status`

`gateway status` muestra el servicio de Gateway (launchd/systemd/schtasks) más una sonda opcional de la capacidad de conectabilidad/autenticación.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  Agregar un objetivo de sondeo explícito. Los hosts remotos y locales configurados todavía son sondeados.
</ParamField>
<ParamField path="--token <token>" type="string">
  Autenticación por token para el sondeo.
</ParamField>
<ParamField path="--password <password>" type="string">
  Autenticación por contraseña para el sondeo.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  Tiempo de espera del sondeo.
</ParamField>
<ParamField path="--no-probe" type="boolean">
  Omitir el sondeo de conectividad (vista solo de servicio).
</ParamField>
<ParamField path="--deep" type="boolean">
  Escanear también los servicios de nivel de sistema.
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  Actualizar el sondeo de conectabilidad predeterminado a un sondeo de lectura y salir con un código distinto de cero cuando ese sondeo de lectura falle. No se puede combinar con `--no-probe`.
</ParamField>

<AccordionGroup>
  <Accordion title="Semántica de estado">
    - `gateway status` permanece disponible para diagnósticos incluso cuando la configuración local de la CLI falta o no es válida. - El valor predeterminado `gateway status` comprueba el estado del servicio, la conexión WebSocket y la capacidad de autenticación visible en el momento del handshake. No prueba las operaciones de lectura/escritura/administración. - Las sondas de diagnóstico no son
    mutantes para la autenticación por primera vez del dispositivo: reutilizan un token de dispositivo en caché existente cuando hay uno, pero no crean una nueva identidad de dispositivo CLI ni un registro de emparejamiento de solo lectura solo para verificar el estado. - `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de la sonda cuando es posible. -
    Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero el origen del secreto. - Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos. - Use
    `--require-rpc` en scripts y automatización cuando un servicio de escucha no sea suficiente y también necesite que las llamadas RPC con alcance de lectura estén sanas. - `--deep` añade un escaneo de mejor esfuerzo para instalaciones adicionales de launchd/systemd/schtasks. Cuando se detectan múltiples servicios similares a gateways, la salida humana imprime sugerencias de limpieza y advierte
    que la mayoría de las configuraciones deberían ejecutar un gateway por máquina. - La salida humana incluye la ruta del registro de archivos resuelta más la instantánea de rutas/validez de la configuración CLI frente al servicio para ayudar a diagnosticar la deriva del perfil o del directorio de estado.
  </Accordion>
  <Accordion title="Comprobaciones de deriva de autenticación de systemd en Linux">
    - En las instalaciones de systemd en Linux, las comprobaciones de deriva de autenticación del servicio leen tanto los valores de `Environment=` como de `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`). - Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución
    combinado (primero el entorno del comando del servicio, luego el respaldo del entorno del proceso). - Si la autenticación por token no está activa de manera efectiva (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato a token puede ganar), las comprobaciones de deriva de tokens omiten la resolución del
    token de configuración.
  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- su puerta de enlace remota configurada (si está establecida), y
- localhost (bucle local) **incluso si está configurado el remoto**.

Si pasa `--url`, ese destino explícito se añade antes que ambos. La salida humana etiqueta los objetivos como:

- `URL (explicit)`
- `Remote (configured)` o `Remote (configured, inactive)`
- `Local loopback`

<Note>Si se pueden alcanzar múltiples puertas de enlace, imprime todas ellas. Se admiten múltiples puertas de enlace cuando utiliza perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones siguen ejecutando una sola puerta de enlace.</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="Interpretación">
    - `Reachable: yes` significa que al menos un destino aceptó una conexión WebSocket.
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` informa lo que la prueba pudo probar sobre la autenticación. Está separado de la accesibilidad.
    - `Read probe: ok` significa que las llamadas RPC de detalle de alcance de lectura (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
    - `Read probe: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero la RPC de alcance de lectura es limitada. Esto se informa como accesibilidad **degradada**, no como falla total.
    - Al igual que `gateway status`, la prueba reutiliza la autenticación del dispositivo en caché existente pero no crea una identidad de dispositivo por primera vez ni el estado de emparejamiento.
    - El código de salida es distinto de cero solo cuando ningún destino sondeado es accesible.
  </Accordion>
  <Accordion title="Salida JSON">
    Nivel superior:

    - `ok`: al menos un objetivo es alcanzable.
    - `degraded`: al menos un objetivo tuvo un RPC de detalle con alcance limitado.
    - `capability`: la mejor capacidad vista en los objetivos alcanzables (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` o `unknown`).
    - `primaryTargetId`: el mejor objetivo para tratar como el activo ganador en este orden: URL explícita, túnel SSH, remoto configurado y luego bucle local.
    - `warnings[]`: registros de advertencia de mejor esfuerzo con `code`, `message` y opcional `targetIds`.
    - `network`: sugerencias de URL de bucle local/tailnet derivadas de la configuración actual y la red del host.
    - `discovery.timeoutMs` y `discovery.count`: el presupuesto/resultados de descubrimiento reales utilizados para este pase de sondeo.

    Por objetivo (`targets[].connect`):

    - `ok`: alcanzabilidad después de conectar + clasificación degradada.
    - `rpcOk`: éxito del RPC de detalle completo.
    - `scopeLimited`: el RPC de detalle falló debido a la falta de alcance de operador.

    Por objetivo (`targets[].auth`):

    - `role`: rol de autenticación reportado en `hello-ok` cuando esté disponible.
    - `scopes`: alcances otorgados reportados en `hello-ok` cuando estén disponibles.
    - `capability`: la clasificación de capacidad de autenticación expuesta para ese objetivo.

  </Accordion>
  <Accordion title="Códigos de advertencia comunes">
    - `ssh_tunnel_failed`: falló la configuración del túnel SSH; el comando recurrió a sondas directas.
    - `multiple_gateways`: se alcanzó más de un destino; esto es inusual a menos que ejecute intencionalmente perfiles aislados, como un bot de rescate.
    - `auth_secretref_unresolved`: no se pudo resolver una referencia secreta (SecretRef) de autenticación configurada para un destino fallido.
    - `probe_scope_limited`: la conexión WebSocket se realizó correctamente, pero la sonda de lectura se limitó por falta de `operator.read`.
  </Accordion>
</AccordionGroup>

#### Remoto a través de SSH (paridad con la aplicación Mac)

El modo "Remoto a través de SSH" de la aplicación macOS utiliza un redireccionamiento de puerto local para que la puerta de enlace remota (que podría estar vinculada solo al bucle local) sea accesible en `ws://127.0.0.1:<port>`.

Equivalente en CLI:

```bash
openclaw gateway probe --ssh user@gateway-host
```

<ParamField path="--ssh <target>" type="string">
  `user@host` o `user@host:port` (el puerto predeterminado es `22`).
</ParamField>
<ParamField path="--ssh-identity <path>" type="string">
  Archivo de identidad.
</ParamField>
<ParamField path="--ssh-auto" type="boolean">
  Selecciona el primer host de puerta de enlace descubierto como destino SSH desde el extremo de descubrimiento resuelto (`local.` más el dominio de área amplia configurado, si lo hubiera). Se ignoran las sugerencias solo de TXT.
</ParamField>

Configuración (opcional, se usa como valores predeterminados):

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Auxiliar RPC de bajo nivel.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

<ParamField path="--params <json>" type="string" default="{}">
  Cadena de objeto JSON para parámetros.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL WebSocket de Gateway.
</ParamField>
<ParamField path="--token <token>" type="string">
  Token de Gateway.
</ParamField>
<ParamField path="--password <password>" type="string">
  Contraseña de Gateway.
</ParamField>
<ParamField path="--timeout <ms>" type="number">
  Presupuesto de tiempo de espera.
</ParamField>
<ParamField path="--expect-final" type="boolean">
  Principalmente para RPCs de tipo agente que transmiten eventos intermedios antes de una carga final.
</ParamField>
<ParamField path="--json" type="boolean">
  Salida JSON legible por máquina.
</ParamField>

<Note>`--params` debe ser JSON válido.</Note>

## Administrar el servicio Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

### Instalar con un contenedor (wrapper)

Use `--wrapper` cuando el servicio administrado debe iniciarse a través de otro ejecutable, por ejemplo un
shim de administrador de secretos o un auxiliar de ejecución (run-as). El contenedor recibe los argumentos normales de Gateway y es
responsable de eventualmente ejecutar (exec) `openclaw` o Node con esos argumentos.

```bash
cat > ~/.local/bin/openclaw-doppler <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec doppler run --project my-project --config production -- openclaw "$@"
EOF
chmod +x ~/.local/bin/openclaw-doppler

openclaw gateway install --wrapper ~/.local/bin/openclaw-doppler --force
openclaw gateway restart
```

También puede establecer el contenedor a través del entorno. `gateway install` valida que la ruta sea
un archivo ejecutable, escribe el contenedor en el servicio `ProgramArguments` y persiste
`OPENCLAW_WRAPPER` en el entorno del servicio para reinstalaciones forzadas, actualizaciones y reparaciones
de doctor posteriores.

```bash
OPENCLAW_WRAPPER="$HOME/.local/bin/openclaw-doppler" openclaw gateway install --force
openclaw doctor
```

Para eliminar un contenedor persistente, borre `OPENCLAW_WRAPPER` mientras reinstala:

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="Opciones de comando">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway uninstall|start|stop|restart`: `--json`
  </Accordion>
  <Accordion title="Comportamiento del ciclo de vida">
    - Use `gateway restart` para reiniciar un servicio gestionado. No encadene `gateway stop` y `gateway start` como sustituto de reinicio; en macOS, `gateway stop` deshabilita intencionalmente el LaunchAgent antes de detenerlo.
    - Los comandos del ciclo de vida aceptan `--json` para secuencias de comandos.
  </Accordion>
  <Accordion title="Autenticación y SecretRefs en el momento de la instalación">
    - Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `gateway install` valida que el SecretRef se pueda resolver pero no persiste el token resuelto en los metadatos del entorno del servicio.
    - Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma cerrada en lugar de persistir texto plano alternativo.
    - Para la autenticación por contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file` o un `gateway.auth.password` respaldado por SecretRef en lugar de `--password` en línea.
    - En el modo de autenticación inferido, el `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio gestionado.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.
  </Accordion>
</AccordionGroup>

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- DNS-SD multidifusión: `local.`
- DNS-SD unidifusión (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [Bonjour](/es/gateway/bonjour).

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia incluyen (TXT):

- `role` (sugerencia de rol de gateway)
- `transport` (sugerencia de transporte, p. ej. `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (opcional; los clientes establecen los objetivos SSH predeterminados en `22` cuando está ausente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (sugerencia de instalación remota escrita en la zona de área amplia)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  Tiempo de espera por comando (examinar/resolver).
</ParamField>
<ParamField path="--json" type="boolean">
  Salida legible por máquina (también deshabilita el estilo/indicador de carga).
</ParamField>

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
  - La CLI examina `local.` más el dominio de área amplia configurado cuando uno está habilitado. - `wsUrl` en la salida JSON se deriva del punto final del servicio resuelto, no de sugerencias solo de TXT como `lanHost` o `tailnetDns`. - En `local.` mDNS, `sshPort` y `cliPath` solo se transmiten cuando `discovery.mdns.mode` es `full`. DNS-SD de área amplia todavía escribe `cliPath`; `sshPort`
  también permanece opcional allí.
</Note>

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Manual de procedimientos de Gateway](/es/gateway)

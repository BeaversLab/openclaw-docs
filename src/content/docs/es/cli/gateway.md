---
summary: "CLI de OpenClaw Gateway (`openclaw gateway`) — ejecuta, consulta y descubre gateways"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (local + wide-area DNS-SD)
title: "Gateway"
sidebarTitle: "Gateway"
---

El Gateway es el servidor WebSocket de OpenClaw (canales, nodos, sesiones, hooks). Los subcomandos en esta página se encuentran en `openclaw gateway …`.

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
    - De forma predeterminada, el Gateway se niega a iniciarse a menos que se establezca `gateway.mode=local` en `~/.openclaw/openclaw.json`. Use `--allow-unconfigured` para ejecuciones ad-hoc/desarrollo.
    - Se espera que `openclaw onboard --mode local` y `openclaw setup` escriban `gateway.mode=local`. Si el archivo existe pero falta `gateway.mode`, trátelo como una configuración rota o alterada y repárela en lugar de asumir implícitamente el modo local.
    - Si el archivo existe y falta `gateway.mode`, el Gateway lo trata como un daño sospechoso en la configuración y se niega a "asumir local" por usted.
    - El enlace más allá del loopback sin autenticación está bloqueado (guardavía de seguridad).
    - `SIGUSR1` desencadena un reinicio en proceso cuando está autorizado (`commands.restart` está habilitado de forma predeterminada; establezca `commands.restart: false` para bloquear el reinicio manual, mientras que gateway tool/config apply/update permanecen permitidos).
    - Los controladores `SIGINT`/`SIGTERM` detienen el proceso del gateway, pero no restauran ningún estado personalizado de la terminal. Si envuelve la CLI con una interfaz de usuario de terminal (TUI) o entrada en modo raw, restaure la terminal antes de salir.

  </Accordion>
</AccordionGroup>

### Opciones

<ParamField path="--port <port>" type="number">
  Puerto WebSocket (el valor predeterminado proviene de la configuración/entorno; generalmente `18789`).
</ParamField>
<ParamField path="--bind <loopback|lan|tailnet|auto|custom>" type="string">
  Modo de enlace del oyente.
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
  Leer la contraseña de la puerta de enlace desde un archivo.
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
  Matar cualquier oyente existente en el puerto seleccionado antes de iniciar.
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

## Reiniciar el Gateway

```bash
openclaw gateway restart
openclaw gateway restart --safe
openclaw gateway restart --safe --skip-deferral
openclaw gateway restart --force
```

`openclaw gateway restart --safe` le pide al Gateway en ejecución que realice una comprobación previa del trabajo activo de OpenClaw antes de reiniciar. Si hay operaciones en cola, entrega de respuestas, ejecuciones integradas o ejecuciones de tareas activas, el Gateway informa de los bloqueos, combina las solicitudes de reinicio seguro duplicadas y se reinicia una vez que se completa el trabajo activo. `restart` normal mantiene el comportamiento del gestor de servicios existente para la compatibilidad. Use `--force` solo cuando desee explícitamente la ruta de anulación inmediata.

`openclaw gateway restart --safe --skip-deferral` ejecuta el mismo reinicio coordinado con conocimiento de OpenClaw que `--safe`, pero omite la puerta de aplazamiento de trabajo activo para que el Gateway emita el reinicio inmediatamente incluso cuando se informan bloqueos. Úselo como la escotilla de escape del operador cuando un aplazamiento ha sido fijado por una ejecución de tarea atascada y `--safe` solo esperaría indefinidamente. `--skip-deferral` requiere `--safe`.

<Warning>`--password` en línea puede exponerse en listados de procesos locales. Se prefiere `--password-file`, env, o un `gateway.auth.password` respaldado por SecretRef.</Warning>

### Perfilado del Gateway

- Establezca `OPENCLAW_GATEWAY_STARTUP_TRACE=1` para registrar los tiempos de las fases durante el inicio del Gateway, incluyendo el retraso `eventLoopMax` por fase y los tiempos de la tabla de búsqueda de complementos para el trabajo de índice instalado, registro de manifiestos, planificación de inicio y mapa de propietarios.
- Establezca `OPENCLAW_GATEWAY_RESTART_TRACE=1` para registrar líneas `restart trace:` con alcance de reinicio para el manejo de señales de reinicio, drenaje de trabajo activo, fases de apagado, próximo inicio, sincronización de listos y métricas de memoria.
- Establezca `OPENCLAW_DIAGNOSTICS=timeline` con `OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=<path>` para escribir una línea de tiempo de diagnóstico de inicio JSONL de mejor esfuerzo para arneses de QA externos. También puede habilitar la opción con `diagnostics.flags: ["timeline"]` en la configuración; la ruta aún se proporciona a través del entorno. Agregue `OPENCLAW_DIAGNOSTICS_EVENT_LOOP=1` para incluir muestras del bucle de eventos.
- Ejecute `pnpm build` primero, luego `pnpm test:startup:gateway -- --runs 5 --warmup 1` para comparar el inicio de Gateway con la entrada CLI construida. El punto de referencia registra la primera salida del proceso, `/healthz`, `/readyz`, tiempos de rastro de inicio, retraso del bucle de eventos y detalles de tiempo de la tabla de búsqueda de complementos.
- Ejecute `pnpm build` primero, luego `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5` para comparar el reinicio en proceso de Gateway con la entrada CLI construida en macOS o Linux. El punto de referencia de reinicio usa SIGUSR1, habilita rastros de inicio y de reinicio en el proceso secundario y registra el siguiente `/healthz`, el siguiente `/readyz`, tiempo de inactividad, tiempo de disponibilidad, CPU, RSS y métricas de rastro de reinicio.
- Trate `/healthz` como actividad (liveness) y `/readyz` como disponibilidad utilizable. Las líneas de rastro y la salida del punto de referencia son para la atribución del propietario; no trate un intervalo de rastro o una muestra como una conclusión de rendimiento completa.

## Consultar un Gateway en ejecución

Todos los comandos de consulta usan WebSocket RPC.

<Tabs>
  <Tab title="Modos de salida">
    - Predeterminado: legible por humanos (coloreado en TTY).
    - `--json`: JSON legible por máquina (sin estilo/indicador de carga).
    - `--no-color` (o `NO_COLOR=1`): desactivar ANSI manteniendo el diseño humano.

  </Tab>
  <Tab title="Opciones compartidas">
    - `--url <url>`: URL WebSocket de Gateway.
    - `--token <token>`: token de Gateway.
    - `--password <password>`: contraseña de Gateway.
    - `--timeout <ms>`: tiempo de espera/presupuesto (varía según el comando).
    - `--expect-final`: esperar una respuesta "final" (llamadas de agente).

  </Tab>
</Tabs>

<Note>Cuando configura `--url`, la CLI no recurre a las credenciales de configuración o del entorno. Pase `--token` o `--password` explícitamente. Faltan credenciales explícitas es un error.</Note>

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

El endpoint HTTP `/healthz` es un sondeo de actividad (liveness probe): devuelve una respuesta una vez que el servidor puede responder a HTTP. El endpoint HTTP `/readyz` es más estricto y permanece en rojo mientras los sidecars de complementos de inicio, los canales o los enlaces configurados aún se estén estabilizando. Las respuestas detalladas de preparación locales o autenticadas incluyen un bloque de diagnóstico `eventLoop` con el retraso del bucle de eventos, la utilización del bucle de eventos, la relación de núcleos de CPU y una bandera `degraded`.

### `gateway usage-cost`

Obtener resúmenes de costos de uso de los registros de sesiones.

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
    - Los registros mantienen metadatos operativos: nombres de eventos, recuentos, tamaños de bytes, lecturas de memoria, estado de cola/sesión, nombres de canal/complemento y resúmenes de sesión redactados. No mantienen texto de chat, cuerpos de webhook, salidas de herramientas, cuerpos de solicitudes o respuestas sin procesar, tokens, cookies, valores secretos, nombres de host o IDs de sesión sin procesar. Configure `diagnostics.enabled: false` para deshabilitar el grabador por completo.
    - En salidas fatales del Gateway, tiempos de espera de apagado y fallos de inicio al reiniciar, OpenClaw escribe la misma instantánea de diagnóstico en `~/.openclaw/logs/stability/openclaw-stability-*.json` cuando el grabador tiene eventos. Inspeccione el paquete más reciente con `openclaw gateway stability --bundle latest`; `--limit`, `--type` y `--since-seq` también se aplican a la salida del paquete.

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

Escriba un archivo zip de diagnóstico local diseñado para adjuntar a los informes de errores. Para conocer el modelo de privacidad y el contenido del paquete, consulte [Exportación de diagnósticos](/es/gateway/diagnostics).

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" type="string">
  Ruta de salida del archivo zip. Por defecto es una exportación de soporte bajo el directorio de estado.
</ParamField>
<ParamField path="--log-lines <count>" type="number" default="5000">
  Máximo de líneas de registro saneadas a incluir.
</ParamField>
<ParamField path="--log-bytes <bytes>" type="number" default="1000000">
  Máximo de bytes de registro a inspeccionar.
</ParamField>
<ParamField path="--url <url>" type="string">
  URL WebSocket del Gateway para la instantánea de salud.
</ParamField>
<ParamField path="--token <token>" type="string">
  Token del Gateway para la instantánea de salud.
</ParamField>
<ParamField path="--password <password>" type="string">
  Contraseña del Gateway para la instantánea de salud.
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

La exportación contiene un manifiesto, un resumen en Markdown, la forma de la configuración, detalles saneados de la configuración, resúmenes de registros saneados, instantáneas saneadas de estado/salud del Gateway, y el paquete de estabilidad más reciente cuando existe uno.

Está pensado para ser compartido. Mantiene detalles operativos que ayudan a la depuración, como campos de registro seguros de OpenClaw, nombres de subsistemas, códigos de estado, duraciones, modos configurados, puertos, IDs de complementos, IDs de proveedores, configuraciones de características no secretas, y mensajes de registro operativos redactados. Omite o redacta el texto del chat, los cuerpos de los webhooks, las salidas de las herramientas, las credenciales, las cookies, los identificadores de cuenta/mensaje, el texto de indicaciones/instrucciones, los nombres de host y los valores secretos. Cuando un mensaje estilo LogTape parece ser texto de carga útil de usuario/chat/herramienta, la exportación mantiene solo que un mensaje fue omitido más su conteo de bytes.

### `gateway status`

`gateway status` muestra el servicio del Gateway (launchd/systemd/schtasks) más una sonda opcional de la capacidad de conectabilidad/autenticación.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

<ParamField path="--url <url>" type="string">
  Añade un objetivo de sondeo explícito. Los remotos configurados + localhost todavía son sondeados.
</ParamField>
<ParamField path="--token <token>" type="string">
  Autenticación mediante token para el sondeo.
</ParamField>
<ParamField path="--password <password>" type="string">
  Autenticación mediante contraseña para el sondeo.
</ParamField>
<ParamField path="--timeout <ms>" type="number" default="10000">
  Tiempo de espera del sondeo.
</ParamField>
<ParamField path="--no-probe" type="boolean">
  Omite el sondeo de conectividad (vista solo de servicios).
</ParamField>
<ParamField path="--deep" type="boolean">
  Escanea también los servicios a nivel de sistema.
</ParamField>
<ParamField path="--require-rpc" type="boolean">
  Actualiza el sondeo de conectabilidad predeterminado a un sondeo de lectura y sale con un valor distinto de cero cuando ese sondeo de lectura falla. No se puede combinar con `--no-probe`.
</ParamField>

<AccordionGroup>
  <Accordion title="Semántica de estado">
    - `gateway status` permanece disponible para diagnósticos incluso cuando la configuración local de la CLI falta o no es válida.
    - El `gateway status` predeterminado prueba el estado del servicio, la conexión WebSocket y la capacidad de autenticación visible en el momento del handshake. No prueba las operaciones de lectura/escritura/administración.
    - Las sondas de diagnóstico no son mutantes para la autenticación de dispositivos por primera vez: reutilizan un token de dispositivo almacenado en caché existente cuando hay uno, pero no crean una nueva identidad de dispositivo CLI ni un registro de emparejamiento de dispositivo de solo lectura solo para verificar el estado.
    - `gateway status` resuelve los SecretRefs de autenticación configurados para la autenticación de la sonda cuando es posible.
    - Si un SecretRef de autenticación requerido no se resuelve en esta ruta de comando, `gateway status --json` informa `rpc.authWarning` cuando falla la conectividad/autenticación de la sonda; pase `--token`/`--password` explícitamente o resuelva primero la fuente del secreto.
    - Si la sonda tiene éxito, las advertencias de auth-ref no resueltas se suprimen para evitar falsos positivos.
    - Use `--require-rpc` en scripts y automatización cuando un servicio de escucha no es suficiente y necesita que las llamadas RPC con alcance de lectura también estén sanas.
    - `--deep` agrega un escaneo de mejor esfuerzo para instalaciones adicionales de launchd/systemd/schtasks. Cuando se detectan múltiples servicios similares a un gateway, la salida humana imprime sugerencias de limpieza y advierte que la mayoría de las configuraciones deberían ejecutar un gateway por máquina.
    - `--deep` también informa un traspaso de reinicio reciente del supervisor del Gateway cuando el proceso del servicio salió limpiamente para un reinicio del supervisor externo.
    - `--deep` ejecuta la validación de configuración en modo compatible con complementos (`pluginValidation: "full"`) y expone las advertencias del manifiesto del complemento configurado (por ejemplo, metadatos de configuración de canal faltantes) para que las pruebas de humo de instalación y actualización las detecten. El `gateway status` predeterminado mantiene la ruta rápida de solo lectura que omite la validación de complementos.
    - La salida humana incluye la ruta del registro de archivos resuelta más la instantánea de las rutas/validez de la configuración de CLI frente al servicio para ayudar a diagnosticar el desvío del perfil o del directorio de estado.

  </Accordion>
  <Accordion title="Linux systemd auth-drift checks">
    - En instalaciones de Linux systemd, las comprobaciones de deriva de autenticación del servicio leen tanto los valores de `Environment=` como los de `EnvironmentFile=` de la unidad (incluyendo `%h`, rutas entre comillas, múltiples archivos y archivos opcionales `-`).
    - Las comprobaciones de deriva resuelven los SecretRefs `gateway.auth.token` utilizando el entorno de tiempo de ejecución combinado (primero el entorno del comando del servicio, luego el respaldo del entorno del proceso).
    - Si la autenticación por token no está efectivamente activa (`gateway.auth.mode` explícito de `password`/`none`/`trusted-proxy`, o modo no establecido donde la contraseña puede ganar y ningún candidato de token puede ganar), las comprobaciones de deriva de tokens omiten la resolución del token de configuración.

  </Accordion>
</AccordionGroup>

### `gateway probe`

`gateway probe` es el comando "depurar todo". Siempre sondea:

- su puerta de enlace remota configurada (si está configurada), y
- localhost (bucle de retorno) **incluso si se configura el remoto**.

Si pasa `--url`, ese objetivo explícito se añade antes que ambos. La salida humana etiqueta los objetivos como:

- `URL (explicit)`
- `Remote (configured)` o `Remote (configured, inactive)`
- `Local loopback`

<Note>Si se pueden alcanzar varias puertas de enlace, imprime todas. Se admiten varias puertas de enlace cuando usa perfiles/puertos aislados (por ejemplo, un bot de rescate), pero la mayoría de las instalaciones aún ejecutan una sola puerta de enlace.</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
```

<AccordionGroup>
  <Accordion title="Interpretación">
    - `Reachable: yes` significa que al menos un objetivo aceptó una conexión WebSocket.
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` informa lo que la sonda pudo probar sobre la autenticación. Está separado de la accesibilidad.
    - `Read probe: ok` significa que las llamadas RPC de detalle de alcance de lectura (`health`/`status`/`system-presence`/`config.get`) también tuvieron éxito.
    - `Read probe: limited - missing scope: operator.read` significa que la conexión tuvo éxito pero la RPC de alcance de lectura está limitada. Esto se informa como accesibilidad **degradada**, no como fallo total.
    - `Read probe: failed` después de `Connect: ok` significa que el Gateway aceptó la conexión WebSocket, pero los diagnósticos de lectura posteriores agotaron el tiempo de espera o fallaron. Esto también es accesibilidad **degradada**, no un Gateway inalcanzable.
    - Al igual que `gateway status`, la sonda reutiliza la autenticación de dispositivo almacenada en caché existente, pero no crea la identidad del dispositivo por primera vez ni el estado de emparejamiento.
    - El código de salida es distinto de cero solo cuando ningún objetivo sondeado es accesible.

  </Accordion>
  <Accordion title="Salida JSON">
    Nivel superior:

    - `ok`: al menos un objetivo es alcanzable.
    - `degraded`: al menos un objetivo aceptó una conexión pero no completó el diagnóstico completo de RPC de detalles.
    - `capability`: la mejor capacidad vista entre los objetivos alcanzables (`read_only`, `write_capable`, `admin_capable`, `pairing_pending`, `connected_no_operator_scope` o `unknown`).
    - `primaryTargetId`: el mejor objetivo para tratar como el ganador activo en este orden: URL explícita, túnel SSH, remoto configurado y luego bucle local.
    - `warnings[]`: registros de advertencia de mejor esfuerzo con `code`, `message` y `targetIds` opcional.
    - `network`: sugerencias de URL de bucle local/tailnet derivadas de la configuración actual y la red del host.
    - `discovery.timeoutMs` y `discovery.count`: el recuento de presupuesto/resultado de descubrimiento real utilizado para este pase de sondeo.

    Por objetivo (`targets[].connect`):

    - `ok`: alcanzabilidad después de conectar + clasificación degradada.
    - `rpcOk`: éxito de RPC de detalles completos.
    - `scopeLimited`: la RPC de detalles falló debido a que falta el ámbito de operador.

    Por objetivo (`targets[].auth`):

    - `role`: rol de autenticación reportado en `hello-ok` cuando esté disponible.
    - `scopes`: ámbitos concedidos reportados en `hello-ok` cuando estén disponibles.
    - `capability`: la clasificación de capacidad de autenticación expuesta para ese objetivo.

  </Accordion>
  <Accordion title="Códigos de advertencia comunes">
    - `ssh_tunnel_failed`: error en la configuración del túnel SSH; el comando recurrió a sondas directas.
    - `multiple_gateways`: se alcanzó más de un objetivo; esto es inusual a menos que ejecute intencionalmente perfiles aislados, como un bot de rescate.
    - `auth_secretref_unresolved`: no se pudo resolver un SecretRef de autenticación configurado para un objetivo fallido.
    - `probe_scope_limited`: la conexión WebSocket se realizó correctamente, pero la sonda de lectura se limitó por la falta de `operator.read`.

  </Accordion>
</AccordionGroup>

#### Remoto a través de SSH (paridad de la aplicación Mac)

El modo "Remote over SSH" de la aplicación macOS utiliza un redireccionamiento de puerto local para que la puerta de enlace remota (que podría estar vinculada solo al loopback) sea accesible en `ws://127.0.0.1:<port>`.

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
  Elija el primer host de puerta de enlace descubierto como objetivo SSH desde el punto final de descubrimiento resuelto (`local.` más el dominio de área amplia configurado, si lo hay). Se ignoran las sugerencias solo TXT.
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
  URL de WebSocket de Gateway.
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
  Principalmente para RPCs estilo agente que transmiten eventos intermedios antes de una carga final.
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
shim de administrador de secretos o un asistente de ejecución (run-as). El contenedor recibe los argumentos normales de Gateway y es
responsable de ejecutar finalmente `openclaw` o Node con esos argumentos.

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

Para eliminar un contenedor persistente, borre `OPENCLAW_WRAPPER` al reinstalar:

```bash
OPENCLAW_WRAPPER= openclaw gateway install --force
openclaw gateway restart
```

<AccordionGroup>
  <Accordion title="Opciones del comando">
    - `gateway status`: `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
    - `gateway install`: `--port`, `--runtime <node|bun>`, `--token`, `--wrapper <path>`, `--force`, `--json`
    - `gateway restart`: `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
    - `gateway uninstall|start`: `--json`
    - `gateway stop`: `--disable`, `--json`

  </Accordion>
  <Accordion title="Comportamiento del ciclo de vida">
    - Use `gateway restart` para reiniciar un servicio administrado. No encadene `gateway stop` y `gateway start` como sustituto de reinicio.
    - En macOS, `gateway stop` usa `launchctl bootout` de forma predeterminada, lo que elimina el LaunchAgent de la sesión de arranque actual sin persistir una desactivación; la recuperación automática de KeepAlive permanece activa para futuros bloqueos y `gateway start` se vuelve a activar limpiamente sin un `launchctl enable` manual. Pase `--disable` para suprimir persistentemente KeepAlive y RunAtLoad para que el puerta de enlace no se regenere hasta el próximo `gateway start` explícito; use esto cuando una parada manual debe sobrevivir a los reinicios o reinicios del sistema.
    - `gateway restart --safe` solicita al Gateway en ejecución que realice un verificación previa del trabajo activo de OpenClaw y difiera el reinicio hasta que se complete la entrega de respuestas, las ejecuciones integradas y las ejecuciones de tareas. `--safe` no se puede combinar con `--force` o `--wait`.
    - `gateway restart --wait 30s` anula el presupuesto de drenaje de reinicio configurado para ese reinicio. Los números simples son milisegundos; se aceptan unidades como `s`, `m` y `h`. `--wait 0` espera indefinidamente.
    - `gateway restart --safe --skip-deferral` ejecuta el reinicio seguro compatible con OpenClaw pero omite el puerta de aplazamiento para que el Gateway emita el reinicio inmediatamente incluso cuando se reportan bloqueadores. Escapatoria del operador para aplazamientos de ejecución de tareas atascadas; requiere `--safe`.
    - `gateway restart --force` omite el drenaje de trabajo activo y se reinicia inmediatamente. Úselo cuando un operador ya haya inspeccionado los bloqueadores de tareas listados y quiera el puerta de enlace ahora mismo.
    - Los comandos del ciclo de vida aceptan `--json` para secuencias de comandos.

  </Accordion>
  <Accordion title="Auth y SecretRefs en el momento de la instalación">
    - Cuando la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, `gateway install` valida que el SecretRef sea resoluble pero no persiste el token resuelto en los metadatos del entorno del servicio.
    - Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación falla de forma segura (fails closed) en lugar de persistir el texto sin formato de reserva.
    - Para la autenticación por contraseña en `gateway run`, se prefiere `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, o un `gateway.auth.password` respaldado por SecretRef en lugar de `--password` en línea.
    - En el modo de autenticación inferido, `OPENCLAW_GATEWAY_PASSWORD` solo de shell no relaja los requisitos del token de instalación; use una configuración duradera (`gateway.auth.password` o configuración `env`) al instalar un servicio gestionado.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación se bloquea hasta que el modo se establezca explícitamente.

  </Accordion>
</AccordionGroup>

## Descubrir gateways (Bonjour)

`gateway discover` escanea balizas de Gateway (`_openclaw-gw._tcp`).

- DNS-SD multidifusión: `local.`
- DNS-SD unidifusión (Bonjour de área amplia): elija un dominio (ejemplo: `openclaw.internal.`) y configure DNS dividido + un servidor DNS; consulte [Bonjour](/es/gateway/bonjour).

Solo los gateways con el descubrimiento de Bonjour habilitado (predeterminado) anuncian la baliza.

Los registros de descubrimiento de área amplia pueden incluir estas sugerencias TXT:

- `role` (sugerencia de rol de gateway)
- `transport` (sugerencia de transporte, p. ej. `gateway`)
- `gatewayPort` (puerto WebSocket, generalmente `18789`)
- `sshPort` (solo modo de descubrimiento completo; los clientes establecen por defecto los destinos SSH a `22` cuando está ausente)
- `tailnetDns` (nombre de host MagicDNS, cuando está disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS habilitado + huella digital del certificado)
- `cliPath` (solo modo de descubrimiento completo)

### `gateway discover`

```bash
openclaw gateway discover
```

<ParamField path="--timeout <ms>" type="number" default="2000">
  Tiempo de espera por comando (examinar/resolver).
</ParamField>
<ParamField path="--json" type="boolean">
  Salida legible por máquina (también deshabilita el estilo/indicador de progreso).
</ParamField>

Ejemplos:

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

<Note>
- La CLI examina `local.` más el dominio de área amplia configurado cuando uno está habilitado.
- `wsUrl` en la salida JSON se deriva del extremo del servicio resuelto, no de sugerencias solo de TXT como `lanHost` o `tailnetDns`.
- En mDNS `local.` y DNS-SD de área amplia, `sshPort` y `cliPath` solo se publican cuando `discovery.mdns.mode` es `full`.

</Note>

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Manual del Gateway](/es/gateway)

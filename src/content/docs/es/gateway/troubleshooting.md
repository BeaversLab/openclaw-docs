---
summary: "Manual de solución de problemas profundo para gateway, canales, automatización, nodos y navegador"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Solución de problemas"
sidebarTitle: "Solución de problemas"
---

Esta página es el manual de ejecución profundo. Comience en [/help/troubleshooting](/es/help/troubleshooting) si primero desea el flujo de triaje rápido.

## Escalera de comandos

Ejecute estos primero, en este orden:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Señales saludables esperadas:

- `openclaw gateway status` muestra `Runtime: running`, `Connectivity probe: ok` y una línea `Capability: ...`.
- `openclaw doctor` informa que no hay problemas de configuración/servicio que bloqueen.
- `openclaw channels status --probe` muestra el estado del transporte por cuenta en vivo y, cuando es compatible, resultados de sondas/auditorías como `works` o `audit ok`.

## Instalaciones con cerebro dividido y protección de configuración más reciente

Use esto cuando un servicio de gateway se detenga inesperadamente después de una actualización, o los registros muestran que un binario `openclaw` es más antiguo que la versión que escribió por última vez `openclaw.json`.

OpenClaw estampa las escrituras de configuración con `meta.lastTouchedVersion`. Los comandos de solo lectura aún pueden inspeccionar una configuración escrita por un OpenClaw más reciente, pero las mutaciones de proceso y servicio se niegan a continuar desde un binario más antiguo. Las acciones bloqueadas incluyen el inicio, detención, reinicio, desinstalación, reinstalación forzada del servicio, inicio del gateway en modo de servicio y la limpieza del puerto `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Corregir PATH">
    Corrija `PATH` para que `openclaw` se resuelva en la instalación más reciente y luego vuelva a ejecutar la acción.
  </Step>
  <Step title="Reinstalar el servicio de gateway">
    Reinstale el servicio de gateway deseado desde la instalación más reciente:

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Eliminar envoltorios obsoletos">
    Elimine paquetes del sistema obsoletos o entradas de envoltorio antiguas que todavía apunten a un binario `openclaw` antiguo.
  </Step>
</Steps>

<Warning>Solo para degradación intencional o recuperación de emergencia, establezca `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` para el comando único. Déjelo sin establecer para el funcionamiento normal.</Warning>

## Anthropic 429 uso adicional requerido para contexto largo

Use esto cuando los registros/errores incluyan: `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Busque:

- El modelo seleccionado de Anthropic Opus/Sonnet tiene `params.context1m: true`.
- La credencial actual de Anthropic no es elegible para el uso de contexto largo.
- Las solicitudes fallan solo en sesiones largas/ejecuciones de modelo que necesitan la ruta beta de 1M.

Opciones de solución:

<Steps>
  <Step title="Deshabilitar context1m">Deshabilite `context1m` para ese modelo para volver a la ventana de contexto normal.</Step>
  <Step title="Usar una credencial elegible">Use una credencial de Anthropic que sea elegible para solicitudes de contexto largo, o cambie a una clave de API de Anthropic.</Step>
  <Step title="Configurar modelos de respaldo">Configure modelos de respaldo para que las ejecuciones continúen cuando las solicitudes de contexto largo de Anthropic sean rechazadas.</Step>
</Steps>

Relacionado:

- [Anthropic](/es/providers/anthropic)
- [Uso de tokens y costos](/es/reference/token-use)
- [¿Por qué veo HTTP 429 de Anthropic?](/es/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## El backend local compatible con OpenAI pasa las sondas directas pero fallan las ejecuciones del agente

Use esto cuando:

- `curl ... /v1/models` funciona
- las llamadas directas `/v1/chat/completions` pequeñas funcionan
- Las ejecuciones del modelo OpenClaw fallan solo en turnos normales del agente

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Busque:

- las llamadas directas pequeñas tienen éxito, pero las ejecuciones de OpenClaw fallan solo en mensajes más grandes
- errores `model_not_found` o 404 aunque el `/v1/chat/completions`
  directo funciona con el mismo id de modelo base
- errores del backend sobre `messages[].content` esperando una cadena
- advertencias `incomplete turn detected ... stopReason=stop payloads=0` intermitentes con un backend local compatible con OpenAI
- fallos del backend que aparecen solo con recuentos de tokens de mensaje grandes o mensajes completos del tiempo de ejecución del agente

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `model_not_found` con un servidor local estilo MLX/vLLM → verifique que `baseUrl` incluya `/v1`, que `api` sea `"openai-completions"` para los backends `/v1/chat/completions`, y que `models.providers.<provider>.models[].id` sea el id local básico del proveedor. Selecciónelo con el prefijo del proveedor una vez, por ejemplo `mlx/mlx-community/Qwen3-30B-A3B-6bit`; mantenga la entrada del catálogo como `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → el backend rechaza las partes de contenido estructuradas de Chat Completions. Solución: establezca `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → el backend completó la solicitud de Chat Completions pero no devolvió texto de asistente visible para el usuario en ese turno. OpenClaw reintentará una vez los turnos vacíos compatibles con OpenAI que sean seguros para repetir; los fallos persistentes generalmente significan que el backend está emitiendo contenido vacío/no textual o suprimiendo el texto de respuesta final.
    - las solicitudes directas pequeñas tienen éxito, pero las ejecuciones del agente OpenClaw fallan con bloqueos del backend/modelo (por ejemplo, Gemma en algunas compilaciones `inferrs`) → es probable que el transporte de OpenClaw ya sea correcto; el backend está fallando debido a la forma del prompt más grande del tiempo de ejecución del agente.
    - los fallos se reducen después de deshabilitar las herramientas pero no desaparecen → los esquemas de herramientas eran parte de la presión, pero el problema restante sigue siendo la capacidad del modelo/servidor ascendente o un error del backend.
  </Accordion>
  <Accordion title="Opciones de corrección">
    1. Establezca `compat.requiresStringContent: true` para backends de Chat Completions solo de cadena.
    2. Establezca `compat.supportsTools: false` para modelos/backends que no puedan manejar de manera confiable la superficie del esquema de herramientas de OpenClaw.
    3. Reduzca la presión del prompt donde sea posible: un arranque de espacio de trabajo más pequeño, un historial de sesión más corto, un modelo local más ligero o un backend con un soporte de contexto largo más fuerte.
    4. Si las solicitudes directas pequeñas siguen pasando mientras los turnos del agente OpenClaw aún se bloquean dentro del backend, trátelo como una limitación del servidor/modelo ascendente y presente un informe de repro allí con la forma de carga útil aceptada.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Configuración](/es/gateway/configuration)
- [Modelos locales](/es/gateway/local-models)
- [Endpoints compatibles con OpenAI](/es/gateway/configuration-reference#openai-compatible-endpoints)

## Sin respuestas

Si los canales están activos pero nada responde, comprueba el enrutamiento y la política antes de volver a conectar nada.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Busca:

- Emparejamiento pendiente para remitentes de MD.
- Bloqueo de mención de grupo (`requireMention`, `mentionPatterns`).
- Incoherencias en la lista de permitidos de canales/grupos.

Firmas comunes:

- `drop guild message (mention required` → mensaje de grupo ignorado hasta la mención.
- `pairing request` → el remitente necesita aprobación.
- `blocked` / `allowlist` → el remitente/canal fue filtrado por la política.

Relacionado:

- [Solución de problemas de canales](/es/channels/troubleshooting)
- [Grupos](/es/channels/groups)
- [Emparejamiento](/es/channels/pairing)

## Conectividad de la interfaz de control del panel

Cuando el panel/interfaz de control no se conecta, valida la URL, el modo de autenticación y los supuestos de contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Busca:

- URL de sondeo correcta y URL del panel.
- Incompatibilidad de modo/token de autenticación entre el cliente y la puerta de enlace.
- Uso de HTTP donde se requiere la identidad del dispositivo.

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → contexto no seguro o autenticación de dispositivo faltante.
    - `origin not allowed` → el navegador `Origin` no está en `gateway.controlUi.allowedOrigins` (o se está conectando desde un origen de navegador que no es de bucle local sin una lista de permitidos explícita).
    - `device nonce required` / `device nonce mismatch` → el cliente no está completando el flujo de autenticación de dispositivo basado en desafíos (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → el cliente firmó la carga útil incorrecta (o una marca de tiempo obsoleta) para el protocolo de enlace actual.
    - `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede realizar un reintento de confianza con el token de dispositivo en caché.
    - Ese reintento de token en caché reutiliza el conjunto de ámbitos en caché almacenado con el token de dispositivo emparejado. Los llamadores explícitos `deviceToken` / explícitos `scopes` mantienen su conjunto de ámbitos solicitado en su lugar.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de arranque.
    - En la ruta asincrónica de la UI de Control de Tailscale Serve, los intentos fallidos para el mismo `{scope, ip}` se serializan antes de que el limitador registre el fallo. Por lo tanto, dos reintentos simultáneos incorrectos del mismo cliente pueden mostrar `retry later` en el segundo intento en lugar de dos discordancias simples.
    - `too many failed authentication attempts (retry later)` de un cliente de bucle local de origen del navegador → los fallos repetidos de ese mismo `Origin` normalizado se bloquean temporalmente; otro origen localhost utiliza un depósito separado.
    - `unauthorized` repetidos después de ese reintento → desviación del token compartido/token de dispositivo; actualice la configuración del token y vuelva a aprobar/rotar el token de dispositivo si es necesario.
    - `gateway connect failed:` → objetivo de host/puerto/url incorrecto.
  </Accordion>
</AccordionGroup>

### Mapa rápido de códigos de detalle de autenticación

Use `error.details.code` de la respuesta fallida `connect` para elegir la siguiente acción:

| Código de detalle            | Significado                                                                                                                                                                                                                | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                                                                                                                                                         | Pegue/establezca el token en el cliente y reintentar. Para rutas del panel: `openclaw config get gateway.auth.token` luego pegue en la configuración de la Interfaz de Control.                                                                                                                                                                                                         |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincide con el token de autenticación de la puerta de enlace.                                                                                                                                      | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Los reintentos con token en caché reutilizan los alcances aprobados almacenados; los llamadores explícitos `deviceToken` / `scopes` mantienen los alcances solicitados. Si sigue fallando, ejecute la [lista de verificación de recuperación de deriva de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token por dispositivo en caché está obsoleto o revocado.                                                                                                                                                                | Rote/vuelva a aprobar el token del dispositivo usando la [CLI de dispositivos](/es/cli/devices), luego vuelva a conectar.                                                                                                                                                                                                                                                               |
| `PAIRING_REQUIRED`           | La identidad del dispositivo necesita aprobación. Verifique `error.details.reason` para `not-paired`, `scope-upgrade`, `role-upgrade`, o `metadata-upgrade`, y use `requestId` / `remediationHint` cuando estén presentes. | Aprobar solicitud pendiente: `openclaw devices list` luego `openclaw devices approve <requestId>`. Las actualizaciones de alcance/rol usan el mismo flujo después de que revise el acceso solicitado.                                                                                                                                                                                   |

<Note>
  Las RPC de backend de bucle directo autenticadas con el token/contraseña compartido de la puerta de enlace no deben depender de la línea base de alcance de dispositivo emparejado de la CLI. Si los subagentes u otras llamadas internas siguen fallando con `scope-upgrade`, verifique que el llamador esté usando `client.id: "gateway-client"` y `client.mode: "backend"` y que no esté forzando un
  `deviceIdentity` explícito o un token de dispositivo.
</Note>

Verificación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente conectante y verifíquelo:

<Steps>
  <Step title="Wait for connect.challenge">El cliente espera el `connect.challenge` emitido por la puerta de enlace.</Step>
  <Step title="Sign the payload">El cliente firma la carga vinculada al desafío.</Step>
  <Step title="Enviar el nonce del dispositivo">El cliente envía `connect.params.device.nonce` con el mismo nonce de desafío.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` se deniega inesperadamente:

- las sesiones de token de dispositivo emparejado solo pueden gestionar **su propio** dispositivo a menos que el solicitante también tenga `operator.admin`
- `openclaw devices rotate --scope ...` solo puede solicitar alcances de operador que la sesión del solicitante ya posee

Relacionado:

- [Configuración](/es/gateway/configuration) (modos de autenticación de la puerta de enlace)
- [Interfaz de usuario de control](/es/web/control-ui)
- [Dispositivos](/es/cli/devices)
- [Acceso remoto](/es/gateway/remote)
- [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth)

## El servicio de puerta de enlace no se está ejecutando

Use esto cuando el servicio está instalado pero el proceso no se mantiene activo.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

Busque:

- `Runtime: stopped` con sugerencias de salida.
- Discrepancia en la configuración del servicio (`Config (cli)` frente a `Config (service)`).
- Conflictos de puerto/escucha.
- Instalaciones adicionales de launchd/systemd/schtasks cuando se usa `--deep`.
- Sugerencias de limpieza de `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace local no está habilitado, o el archivo de configuración fue sobrescrito y perdió `gateway.mode`. Solución: establezca `gateway.mode="local"` en su configuración, o vuelva a ejecutar `openclaw onboard --mode local` / `openclaw setup` para restablecer la configuración de
    modo local esperada. Si está ejecutando OpenClaw mediante Podman, la ruta de configuración predeterminada es `~/.openclaw/openclaw.json`. - `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de puerta de enlace válida (token/contraseña, o proxy de confianza donde esté configurado). - `another gateway instance is already listening` /
    `EADDRINUSE` → conflicto de puertos. - `Other gateway-like services detected (best effort)` → existen unidades launchd/systemd/schtasks obsoletas o en paralelo. La mayoría de las configuraciones deben mantener una sola puerta de enlace por máquina; si necesita más de una, aisle los puertos + configuración/estado/espacio de trabajo. Consulte
    [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host). - `System-level OpenClaw gateway service detected` del doctor → existe una unidad del sistema systemd mientras falta el servicio de nivel de usuario. Elimine o deshabilite el duplicado antes de permitir que el doctor instale un servicio de usuario, o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` si la
    unidad del sistema es el supervisor previsto. - `Gateway service port does not match current gateway config` → el supervisor instalado todavía fija el `--port` antiguo. Ejecute `openclaw doctor --fix` o `openclaw gateway install --force` y luego reinicie el servicio de puerta de enlace.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Herramienta de ejecución en segundo plano y de procesos](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Doctor](/es/gateway/doctor)

## La puerta de enlace restauró la última configuración conocida buena

Use esto cuando la puerta de enlace se inicia, pero los registros indican que restauró `openclaw.json`.

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

Busque:

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- Un archivo `openclaw.json.clobbered.*` con marca de tiempo junto a la configuración activa
- Un evento del sistema del agente principal que comienza con `Config recovery warning`

<AccordionGroup>
  <Accordion title="Qué sucedió">
    - La configuración rechazada no se validó durante el inicio o la recarga en caliente.
    - OpenClaw preservó la carga rechazada como `.clobbered.*`.
    - La configuración activa se restauró desde la última copia válida conocida como buena (last-known-good).
    - Se advierte al siguiente turno del agente principal que no reescriba a ciegas la configuración rechazada.
    - Si todos los problemas de validación estaban bajo `plugins.entries.<id>...`, OpenClaw no restauraría todo el archivo. Los fallos locales del complemento se mantienen visibles mientras la configuración de usuario no relacionada permanece en la configuración activa.
  </Accordion>
  <Accordion title="Inspeccionar y reparar">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="Firmas comunes">
    - `.clobbered.*` existe → se restauró una edición directa externa o una lectura de inicio.
    - `.rejected.*` existe → una escritura de configuración propiedad de OpenClaw falló las verificaciones de esquema o de sobrescritura antes de la confirmación.
    - `Config write rejected:` → la escritura intentó eliminar la forma requerida, reducir el archivo drásticamente o persistir una configuración no válida.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good` o `size-drop-vs-last-good:*` → el inicio trató el archivo actual como sobrescrito porque perdió campos o tamaño en comparación con la copia de seguridad última conocida como buena.
    - `Config last-known-good promotion skipped` → el candidato contenía marcadores de posición de secretos redactados, como `***`.
  </Accordion>
  <Accordion title="Opciones de solución">
    1. Mantenga la configuración activa restaurada si es correcta.
    2. Copie solo las claves deseadas de `.clobbered.*` o `.rejected.*`, luego aplíquelas con `openclaw config set` o `config.patch`.
    3. Ejecute `openclaw config validate` antes de reiniciar.
    4. Si edita a mano, mantenga la configuración completa de JSON5, no solo el objeto parcial que quería cambiar.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Configuración](/es/cli/config)
- [Configuración: recarga en caliente](/es/gateway/configuration#config-hot-reload)
- [Configuración: validación estricta](/es/gateway/configuration#strict-validation)
- [Doctor](/es/gateway/doctor)

## Advertencias de la sonda de Gateway

Use esto cuando `openclaw gateway probe` llega a algo, pero todavía imprime un bloque de advertencia.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Busque:

- `warnings[].code` y `primaryTargetId` en la salida JSON.
- Si la advertencia es sobre el respaldo SSH, múltiples gateways, ámbitos faltantes o referencias de autenticación no resueltas.

Firmas comunes:

- `SSH tunnel failed to start; falling back to direct probes.` → falló la configuración de SSH, pero el comando aún intentó objetivos directos configurados/bucle de retorno.
- `multiple reachable gateways detected` → más de un objetivo respondió. Por lo general, esto significa una configuración intencional de múltiples gateways o oyentes obsoletos/duplicados.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la conexión funcionó, pero el RPC detallado tiene un alcance limitado; empareje la identidad del dispositivo o use credenciales con `operator.read`.
- `Capability: pairing-pending` o `gateway closed (1008): pairing required` → el gateway respondió, pero este cliente aún necesita emparejamiento/aprobación antes del acceso normal del operador.
- texto de advertencia de SecretRef `gateway.auth.*` / `gateway.remote.*` no resuelto → el material de autenticación no estaba disponible en esta ruta de comando para el objetivo fallido.

Relacionado:

- [Gateway](/es/cli/gateway)
- [Múltiples gateways en el mismo host](/es/gateway#multiple-gateways-same-host)
- [Acceso remoto](/es/gateway/remote)

## Canal conectado, mensajes no fluyen

Si el estado del canal está conectado pero el flujo de mensajes está muerto, centre su atención en la política, los permisos y las reglas de entrega específicas del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busque:

- Política de DM (`pairing`, `allowlist`, `open`, `disabled`).
- Lista de permitidos de grupos y requisitos de mención.
- Permisos/ámbitos de la API del canal faltantes.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención de grupo.
- `pairing` / rastros de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [Solución de problemas del canal](/es/channels/troubleshooting)
- [Discord](/es/channels/discord)
- [Telegram](/es/channels/telegram)
- [WhatsApp](/es/channels/whatsapp)

## Entrega de cron y latido

Si el cron o el latido no se ejecutaron o no se entregaron, verifique primero el estado del programador y luego el destino de entrega.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Busque:

- Cron habilitado y presente el próximo despertar.
- Estado del historial de ejecución del trabajo (`ok`, `skipped`, `error`).
- Razones de omisión del latido (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `cron: scheduler disabled; jobs will not run automatically` → cron deshabilitado. - `cron: timer tick failed` → falló el tick del programador; verifique errores de archivo/log/runtime. - `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas. - `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene líneas en blanco /
    encabezados markdown, por lo que OpenClaw omite la llamada al modelo. - `heartbeat skipped` con `reason=no-tasks-due` → `HEARTBEAT.md` contiene un bloque `tasks:`, pero ninguna de las tareas vence en este tick. - `heartbeat: unknown accountId` → id de cuenta no válida para el destino de entrega del latido. - `heartbeat skipped` con `reason=dm-blocked` → el destino del latido se resolvió en un
    destino estilo DM mientras que `agents.defaults.heartbeat.directPolicy` (o anulación por agente) está configurado en `block`.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Latido](/es/gateway/heartbeat)
- [Tareas programadas](/es/automation/cron-jobs)
- [Tareas programadas: solución de problemas](/es/automation/cron-jobs#troubleshooting)

## Nodo emparejado, herramienta falla

Si un nodo está emparejado pero las herramientas fallan, aisle el estado en primer plano, los permisos y el estado de aprobación.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Busque:

- Nodo en línea con las capacidades esperadas.
- Otorgaciones de permisos del sistema operativo para cámara/micrófono/ubicación/pantalla.
- Aprobaciones de ejecución y estado de lista blanca.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación del nodo debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta permiso del sistema operativo.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista de permitidos.

Relacionado:

- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- [Solución de problemas de nodos](/es/nodes/troubleshooting)
- [Nodos](/es/nodes/index)

## Error de la herramienta del navegador

Use esto cuando las acciones de la herramienta del navegador fallan aunque el propio gateway esté sano.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Busque:

- Si `plugins.allow` está configurado e incluye `browser`.
- Ruta válida del ejecutable del navegador.
- Accesibilidad del perfil CDP.
- Disponibilidad local de Chrome para perfiles `existing-session` / `user`.

<AccordionGroup>
  <Accordion title="Complemento / firmas ejecutables">
    - `unknown command "browser"` o `unknown command 'browser'` → el complemento del navegador incluido está excluido por `plugins.allow`.
    - herramienta del navegador faltante / no disponible mientras `browser.enabled=true` → `plugins.allow` excluye `browser`, por lo que el complemento nunca se cargó.
    - `Failed to start Chrome CDP on port` → falló el inicio del proceso del navegador.
    - `browser.executablePath not found` → la ruta configurada no es válida.
    - `browser.cdpUrl must be http(s) or ws(s)` → la URL de CDP configurada utiliza un esquema no admitido como `file:` o `ftp:`.
    - `browser.cdpUrl has invalid port` → la URL de CDP configurada tiene un puerto erróneo o fuera de rango.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → la instalación actual del gateway carece de la dependencia de tiempo de ejecución `playwright-core` del complemento del navegador incluido; ejecute `openclaw doctor --fix` y luego reinicie el gateway. Las instantáneas ARIA y las capturas de pantalla básicas de la página aún pueden funcionar, pero la navegación, las instantáneas de IA, las capturas de pantalla de elementos con selectores CSS y la exportación de PDF permanecerán no disponibles.
  </Accordion>
  <Accordion title="Chrome MCP / firmas de sesión existente">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP sesión existente aún no ha podido adjuntarse al directorio de datos del navegador seleccionado. Abra la página de inspección del navegador, habilite la depuración remota, mantenga el navegador abierto, apruebe el primer aviso de conexión y luego vuelva a intentarlo. Si no se requiere el estado de sesión iniciada, prefiera el perfil gestionado `openclaw`.
    - `No Chrome tabs found for profile="user"` → el perfil de conexión Chrome MCP no tiene pestañas locales de Chrome abiertas.
    - `Remote CDP for profile "<name>" is not reachable` → el punto de conexión CDP remoto configurado no es accesible desde el host de la puerta de enlace.
    - `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo conexión no tiene un objetivo accesible, o el punto de conexión HTTP respondió pero el WebSocket CDP aún no se pudo abrir.
  </Accordion>
  <Accordion title="Elemento / captura de pantalla / firmas de carga">
    - `fullPage is not supported for element screenshots` → solicitud de captura de pantalla `--full-page` mixta con `--ref` o `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → las llamadas de captura de pantalla de Chrome MCP / `existing-session` deben usar la captura de página o una `--ref` de instantánea, no `--element` CSS.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → los hooks de carga de Chrome MCP necesitan referencias de instantánea, no selectores CSS.
    - `existing-session file uploads currently support one file at a time.` → envíe una carga por llamada en los perfiles de Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → los hooks de diálogo en los perfiles de Chrome MCP no admiten anulaciones de tiempo de espera.
    - `existing-session type does not support timeoutMs overrides.` → omita `timeoutMs` para `act:type` en los perfiles de sesión existente de `profile="user"` / Chrome MCP, o use un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `existing-session evaluate does not support timeoutMs overrides.` → omita `timeoutMs` para `act:evaluate` en los perfiles de sesión existente de `profile="user"` / Chrome MCP, o use un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` todavía requiere un navegador administrado o un perfil CDP sin procesar.
    - anulaciones obsoletas de viewport / modo oscuro / configuración regional / sin conexión en perfiles CDP remotos o solo de conexión → ejecute `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación Playwright/CDP sin reiniciar toda la puerta de enlace.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Navegador (administrado por OpenClaw)](/es/tools/browser)
- [Solución de problemas del navegador](/es/tools/browser-linux-troubleshooting)

## Si actualizó y algo se rompió repentinamente

La mayoría de las fallas posteriores a la actualización se deben a la deriva de la configuración o a valores predeterminados más estrictos que ahora se están aplicando.

<AccordionGroup>
  <Accordion title="1. El comportamiento de la autenticación y la anulación de la URL ha cambiado">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    Qué verificar:

    - Si `gateway.mode=remote`, las llamadas de la CLI pueden estar apuntando al servicio remoto mientras que su servicio local está bien.
    - Las llamadas explícitas a `--url` no vuelven a las credenciales almacenadas.

    Firmas comunes:

    - `gateway connect failed:` → URL de destino incorrecta.
    - `unauthorized` → endpoint accesible pero con autenticación incorrecta.

  </Accordion>
  <Accordion title="2. Los enlaces y las salvaguardas de autenticación son más estrictas">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    Qué verificar:

    - Los enlaces que no son de bucle local (`lan`, `tailnet`, `custom`) necesitan una ruta de autenticación de gateway válida: autenticación de token compartido/contraseña, o un despliegue `trusted-proxy` que no sea de bucle local y correctamente configurado.
    - Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

    Firmas comunes:

    - `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de gateway válida.
    - `Connectivity probe: failed` mientras el runtime se está ejecutando → gateway activo pero inaccesible con la autenticación/URL actual.

  </Accordion>
  <Accordion title="3. El emparejamiento y el estado de identidad del dispositivo han cambiado">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    Qué verificar:

    - Aprobaciones de dispositivos pendientes para el panel/nodos.
    - Aprobaciones de emparejamiento DM pendientes después de cambios de política o identidad.

    Firmas comunes:

    - `device identity required` → autenticación de dispositivo no satisfecha.
    - `pairing required` → el remitente/dispositivo debe ser aprobado.

  </Accordion>
</AccordionGroup>

Si la configuración del servicio y el runtime siguen en desacuerdo después de las comprobaciones, reinstale los metadatos del servicio desde el mismo directorio de perfil/estado:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Relacionado:

- [Autenticación](/es/gateway/authentication)
- [Herramienta de ejecución en segundo plano y de procesos](/es/gateway/background-process)
- [Emparejamiento propiedad del Gateway](/es/gateway/pairing)

## Relacionado

- [Doctor](/es/gateway/doctor)
- [Preguntas frecuentes](/es/help/faq)
- [Manual de procedimientos del Gateway](/es/gateway)

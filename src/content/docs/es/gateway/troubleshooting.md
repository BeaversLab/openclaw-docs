---
summary: "Manual de procedimientos profundo de solución de problemas para gateway, canales, automatización, nodos y navegador"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Solución de problemas"
---

# Solución de problemas de la puerta de enlace

Esta página es el manual de procedimientos profundo.
Comience en [/help/troubleshooting](/es/help/troubleshooting) si desea primero el flujo de triaje rápido.

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

- `openclaw gateway status` muestra `Runtime: running` y `RPC probe: ok`.
- `openclaw doctor` informa que no hay problemas de configuración/servicio de bloqueo.
- `openclaw channels status --probe` muestra el estado de transporte en vivo por cuenta y,
  cuando es compatible, los resultados de sondas/auditorías como `works` o `audit ok`.

## Uso adicional de Anthropic 429 requerido para contexto largo

Use esto cuando los registros/errores incluyan:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Busque:

- El modelo Anthropic Opus/Sonnet seleccionado tiene `params.context1m: true`.
- La credencial de Anthropic actual no es elegible para el uso de contexto largo.
- Las solicitudes fallan solo en sesiones/ejecuciones de modelo largas que necesitan la ruta beta de 1M.

Opciones de solución:

1. Desactive `context1m` para ese modelo para volver a la ventana de contexto normal.
2. Use una credencial Anthropic que sea elegible para solicitudes de contexto largo, o cambie a una clave de API de Anthropic.
3. Configure modelos alternativos para que las ejecuciones continúen cuando se rechacen las solicitudes de contexto largo de Anthropic.

Relacionado:

- [/providers/anthropic](/es/providers/anthropic)
- [/reference/token-use](/es/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/es/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## El backend local compatible con OpenAI pasa las sondas directas pero fallan las ejecuciones de agentes

Use esto cuando:

- `curl ... /v1/models` funciona
- las llamadas `/v1/chat/completions` directas diminutas funcionan
- las ejecuciones del modelo OpenClaw fallan solo en turnos normales del agente

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Busque:

- las llamadas directas diminutas tienen éxito, pero las ejecuciones de OpenClaw fallan solo en indicaciones más grandes
- errores del backend sobre `messages[].content` esperando una cadena
- fallos del backend que aparecen solo con recuentos de tokens de indicación grandes o indicaciones
  completas del tiempo de ejecución del agente

Firmas comunes:

- `messages[...].content: invalid type: sequence, expected a string` → el backend
  rechaza las partes de contenido estructurado de Chat Completions. Solución: establecer
  `models.providers.<provider>.models[].compat.requiresStringContent: true`.
- las solicitudes directas diminutas tienen éxito, pero las ejecuciones del agente OpenClaw fallan con fallos del backend/modelo
  (por ejemplo, Gemma en algunas compilaciones `inferrs`) → el transporte OpenClaw es
  probablemente correcto; el backend está fallando en la forma de indicación más grande del tiempo de ejecución del agente.
- los fallos se reducen después de deshabilitar las herramientas pero no desaparecen → los esquemas de herramientas eran
  parte de la presión, pero el problema restante sigue siendo la capacidad del modelo/servidor
  ascendente o un error en el backend.

Opciones de corrección:

1. Establezca `compat.requiresStringContent: true` para backends de Chat Completions que solo sean cadenas.
2. Establezca `compat.supportsTools: false` para modelos/backends que no pueden manejar
   de manera confiable la superficie del esquema de herramientas de OpenClaw.
3. Reduzca la presión del aviso cuando sea posible: arranque del espacio de trabajo más pequeño, historial de
   sesión más corto, modelo local más ligero o un backend con mayor soporte de contexto largo.
4. Si las solicitudes directas diminutas siguen pasando mientras los turnos del agente OpenClaw siguen fallando
   dentro del backend, trátelo como una limitación del servidor/modelo ascendente y archive
   un repro allí con la forma de carga útil aceptada.

Relacionado:

- [/gateway/local-models](/es/gateway/local-models)
- [/gateway/configuration](/es/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/es/gateway/configuration-reference#openai-compatible-endpoints)

## Sin respuestas

Si los canales están activos pero nada responde, verifique el enrutamiento y la política antes de volver a conectar nada.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Busque:

- Emparejamiento pendiente para remitentes de MD.
- Bloqueo de mención de grupo (`requireMention`, `mentionPatterns`).
- Discrepancias en la lista de permitidos de canal/grupo.

Firmas comunes:

- `drop guild message (mention required` → mensaje de grupo ignorado hasta la mención.
- `pairing request` → el remitente necesita aprobación.
- `blocked` / `allowlist` → remitente/canal fue filtrado por la política.

Relacionado:

- [/channels/troubleshooting](/es/channels/troubleshooting)
- [/channels/pairing](/es/channels/pairing)
- [/channels/groups](/es/channels/groups)

## Conectividad de la interfaz de usuario de control del panel

Cuando el panel/interfaz de usuario de control no se conecta, valide la URL, el modo de autenticación y los supuestos de contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Busque:

- URL de sonda y URL del panel correctas.
- Discrepancia en el modo/token de autenticación entre el cliente y la puerta de enlace.
- Uso de HTTP donde se requiere la identidad del dispositivo.

Firmas comunes:

- `device identity required` → contexto no seguro o autenticación de dispositivo faltante.
- `origin not allowed` → el navegador `Origin` no está en `gateway.controlUi.allowedOrigins`
  (o se está conectando desde un origen de navegador que no es de bucle local sin una
  lista de permitidos explícita).
- `device nonce required` / `device nonce mismatch` → el cliente no está completando el
  flujo de autenticación de dispositivo basado en desafíos (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → el cliente firmó la carga útil
  incorrecta (o una marca de tiempo obsoleta) para el handshake actual.
- `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede realizar un reintento de confianza con el token de dispositivo en caché.
- Ese reintento de token en caché reutiliza el conjunto de ámbitos almacenados con el
  token de dispositivo emparejado. Los llamadores `deviceToken` explícitos / `scopes` explícitos mantienen su
  conjunto de ámbitos solicitado en su lugar.
- Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero el token compartido explícito/contraseña,
  luego `deviceToken` explícito, luego el token de dispositivo almacenado,
  y luego el token de arranque (bootstrap).
- En la ruta asíncrona de la Interfaz de Usuario de Control de Tailscale Serve, los intentos fallidos para el mismo
  `{scope, ip}` se serializan antes de que el limitador registre el fallo. Por lo tanto, dos reintentos
  concurrentes incorrectos del mismo cliente pueden mostrar `retry later`
  en el segundo intento en lugar de dos discordancias simples.
- `too many failed authentication attempts (retry later)` desde un cliente de
  bucle local de origen de navegador → los fallos repetidos de ese mismo `Origin` normalizado están
  bloqueados temporalmente; otro origen de localhost usa un depósito separado.
- `unauthorized` repetidos después de ese reintento → desviación del token compartido/token de dispositivo; actualice la configuración del token y reapruebe/gire el token de dispositivo si es necesario.
- `gateway connect failed:` → destino de host/puerto/url incorrecto.

### Mapa rápido de códigos de detalle de autenticación

Use `error.details.code` de la respuesta `connect` fallida para elegir la siguiente acción:

| Código de detalle            | Significado                                                                           | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                    | Pegue/establezca el token en el cliente y reintente. Para rutas del panel: `openclaw config get gateway.auth.token` y luego pegue en la configuración de la Interfaz de Control.                                                                                                                                                                                                             |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincide con el token de autenticación de la puerta de enlace. | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Los reintentos con token en caché reutilizan los alcances aprobados almacenados; las llamadas explícitas `deviceToken` / `scopes` mantienen los alcances solicitados. Si continúa fallando, ejecute la [lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token por dispositivo en caché está obsoleto o revocado.                           | Rote/vuelva a aprobar el token del dispositivo usando la [CLI de dispositivos](/es/cli/devices), luego reconecte.                                                                                                                                                                                                                                                                            |
| `PAIRING_REQUIRED`           | La identidad del dispositivo es conocida pero no está aprobada para este rol.         | Aprobar solicitud pendiente: `openclaw devices list` y luego `openclaw devices approve <requestId>`.                                                                                                                                                                                                                                                                                         |

Verificación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente conectante y verifíquelo:

1. espera `connect.challenge`
2. firma el payload vinculado al desafío
3. envía `connect.params.device.nonce` con el mismo nonce de desafío

Si `openclaw devices rotate` / `revoke` / `remove` se deniega inesperadamente:

- las sesiones de token de dispositivo emparejado solo pueden gestionar **su propio** dispositivo a menos que la
  sesión de llamada también tenga `operator.admin`
- `openclaw devices rotate --scope ...` solo puede solicitar alcances de operador que
  la sesión de llamada ya posee

Relacionado:

- [/web/control-ui](/es/web/control-ui)
- [/gateway/configuration](/es/gateway/configuration) (modos de autenticación de puerta de enlace)
- [/gateway/trusted-proxy-auth](/es/gateway/trusted-proxy-auth)
- [/gateway/remote](/es/gateway/remote)
- [/cli/devices](/es/cli/devices)

## Servicio de puerta de enlace no ejecutándose

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
- Desajuste en la configuración del servicio (`Config (cli)` vs `Config (service)`).
- Conflictos de puerto/escucha.
- Instalaciones adicionales de launchd/systemd/schtasks cuando se usa `--deep`.
- `Other gateway-like services detected (best effort)` sugerencias de limpieza.

Firmas comunes:

- `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace local no está habilitado, o el archivo de configuración fue sobrescrito y perdió `gateway.mode`. Solución: configure `gateway.mode="local"` en su configuración, o vuelva a ejecutar `openclaw onboard --mode local` / `openclaw setup` para restablecer la configuración de modo local esperada. Si está ejecutando OpenClaw mediante Podman, la ruta de configuración predeterminada es `~/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → enlace sin bucle local sin una ruta de autenticación de puerta de enlace válida (token/contraseña, o proxy de confianza donde esté configurado).
- `another gateway instance is already listening` / `EADDRINUSE` → conflicto de puerto.
- `Other gateway-like services detected (best effort)` → existen unidades launchd/systemd/schtasks obsoletas o en paralelo. La mayoría de las configuraciones deben mantener una sola puerta de enlace por máquina; si realmente necesita más de una, aisle los puertos + config/estado/espacio de trabajo. Consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).

Relacionado:

- [/gateway/background-process](/es/gateway/background-process)
- [/gateway/configuration](/es/gateway/configuration)
- [/gateway/doctor](/es/gateway/doctor)

## Advertencias de sondas de puerta de enlace

Use esto cuando `openclaw gateway probe` llega a algo, pero aún imprime un bloque de advertencia.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Busque:

- `warnings[].code` y `primaryTargetId` en la salida JSON.
- Si la advertencia se trata de reserva SSH, múltiples puertas de enlace, alcances faltantes o referencias de autenticación sin resolver.

Firmas comunes:

- `SSH tunnel failed to start; falling back to direct probes.` → falló la configuración de SSH, pero el comando aún intentó los objetivos configurados/de bucle local directos.
- `multiple reachable gateways detected` → más de un objetivo respondió. Por lo general, esto significa una configuración intencional de múltiples puertas de enlace o escuchas obsoletas/duplicadas.
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → la conexión funcionó, pero el RPC detallado tiene un alcance limitado; vincule la identidad del dispositivo o use credenciales con `operator.read`.
- texto de advertencia de SecretRef `gateway.auth.*` / `gateway.remote.*` sin resolver → el material de autenticación no estaba disponible en esta ruta de comando para el objetivo fallido.

Relacionado:

- [/cli/gateway](/es/cli/gateway)
- [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host)
- [/gateway/remote](/es/gateway/remote)

## Mensajes del canal conectado no fluyen

Si el estado del canal es conectado pero el flujo de mensajes está muerto, céntrate en la política, los permisos y las reglas de entrega específicas del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busca:

- Política de MD (`pairing`, `allowlist`, `open`, `disabled`).
- Lista de permitidos de grupos y requisitos de mención.
- Permisos/ámbitos de la API del canal faltantes.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención del grupo.
- `pairing` / trazas de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [/channels/troubleshooting](/es/channels/troubleshooting)
- [/channels/whatsapp](/es/channels/whatsapp)
- [/channels/telegram](/es/channels/telegram)
- [/channels/discord](/es/channels/discord)

## Entrega de Cron y latido

Si el cron o el latido no se ejecutaron o no se entregaron, verifica primero el estado del programador, luego el objetivo de entrega.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Busca:

- Cron habilitado y siguiente despertar presente.
- Estado del historial de ejecuciones del trabajo (`ok`, `skipped`, `error`).
- Razones para omitir el latido (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

Firmas comunes:

- `cron: scheduler disabled; jobs will not run automatically` → cron deshabilitado.
- `cron: timer tick failed` → falló el tick del programador; verifica errores de archivo/log/runtime.
- `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas.
- `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene líneas en blanco / encabezados markdown, por lo que OpenClaw omite la llamada al modelo.
- `heartbeat skipped` con `reason=no-tasks-due` → `HEARTBEAT.md` contiene un bloque `tasks:`, pero ninguna de las tareas vence en este ciclo.
- `heartbeat: unknown accountId` → id de cuenta no válido para el destino de entrega de heartbeat.
- `heartbeat skipped` con `reason=dm-blocked` → el destino de heartbeat se resolvió a un destino estilo DM mientras que `agents.defaults.heartbeat.directPolicy` (o anulación por agente) está configurado en `block`.

Relacionado:

- [/automation/cron-jobs#troubleshooting](/es/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/es/automation/cron-jobs)
- [/gateway/heartbeat](/es/gateway/heartbeat)

## Fallo de herramienta emparejada con nodo

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
- Otorgamiento de permisos del SO para cámara/micrófono/ubicación/pantalla.
- Aprobaciones de ejecución y estado de la lista de permitidos.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación del nodo debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta permiso del SO.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista de permitidos.

Relacionado:

- [/nodes/troubleshooting](/es/nodes/troubleshooting)
- [/nodes/index](/es/nodes/index)
- [/tools/exec-approvals](/es/tools/exec-approvals)

## Fallo de herramienta del navegador

Use esto cuando fallan las acciones de la herramienta del navegador aunque la puerta de enlace en sí esté sana.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Busque:

- Si `plugins.allow` está configurado e incluye `browser`.
- Ruta válida al ejecutable del navegador.
- Alcanzabilidad del perfil CDP.
- Disponibilidad de Chrome local para perfiles `existing-session` / `user`.

Firmas comunes:

- `unknown command "browser"` o `unknown command 'browser'` → el plugin del navegador incluido está excluido por `plugins.allow`.
- herramienta del navegador faltante/no disponible mientras `browser.enabled=true` → `plugins.allow` excluye `browser`, por lo que el plugin nunca se cargó.
- `Failed to start Chrome CDP on port` → no se pudo iniciar el proceso del navegador.
- `browser.executablePath not found` → la ruta configurada no es válida.
- `browser.cdpUrl must be http(s) or ws(s)` → la URL de CDP configurada utiliza un esquema no compatible como `file:` o `ftp:`.
- `browser.cdpUrl has invalid port` → la URL de CDP configurada tiene un puerto incorrecto o fuera de rango.
- `No Chrome tabs found for profile="user"` → el perfil de conexión de Chrome MCP no tiene pestañas locales de Chrome abiertas.
- `Remote CDP for profile "<name>" is not reachable` → el punto final CDP remoto configurado no es accesible desde el host de la puerta de enlace.
- `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo conexión no tiene un destino accesible, o el punto final HTTP respondió pero aún no se pudo abrir el WebSocket de CDP.
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → la instalación actual de la puerta de enlace carece del paquete completo de Playwright; las instantáneas ARIA y las capturas de pantalla básicas de la página aún pueden funcionar, pero la navegación, las instantáneas de IA, las capturas de pantalla de elementos por selector CSS y la exportación de PDF permanecerán no disponibles.
- `fullPage is not supported for element screenshots` → la solicitud de captura de pantalla mezcló `--full-page` con `--ref` o `--element`.
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → las llamadas de captura de pantalla de Chrome MCP / `existing-session` deben usar la captura de página o una instantánea `--ref`, no CSS `--element`.
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → los enlaces de carga (upload hooks) de Chrome MCP necesitan referencias de instantáneas, no selectores CSS.
- `existing-session file uploads currently support one file at a time.` → envíe una carga por llamada en los perfiles de Chrome MCP.
- `existing-session dialog handling does not support timeoutMs.` → los enlaces de diálogo en los perfiles de Chrome MCP no admiten la anulación del tiempo de espera.
- `response body is not supported for existing-session profiles yet.` → `responsebody` aún requiere un navegador administrado o un perfil CDP sin procesar.
- anulaciones obsoletas de viewport / modo oscuro / configuración regional / sin conexión en perfiles de solo conexión o CDP remoto → ejecute `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación de Playwright/CDP sin reiniciar toda la puerta de enlace.

Relacionado:

- [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
- [/tools/browser](/es/tools/browser)

## Si actualizaste y algo se rompió de repente

La mayoría de las fallas posteriores a la actualización se deben a una deriva de la configuración o a valores predeterminados más estrictos que ahora se aplican.

### 1) El comportamiento de autenticación y anulación de URL ha cambiado

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Qué verificar:

- Si `gateway.mode=remote`, las llamadas de la CLI pueden apuntar a un servidor remoto mientras tu servicio local está bien.
- Las llamadas explícitas a `--url` no vuelven a las credenciales almacenadas.

Firmas comunes:

- `gateway connect failed:` → URL de destino incorrecta.
- `unauthorized` → endpoint accesible pero con autenticación incorrecta.

### 2) Las salvaguardas de enlace y autenticación son más estrictas

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

Qué verificar:

- Los enlaces que no son de bucle local (`lan`, `tailnet`, `custom`) necesitan una ruta de autenticación de puerta de enlace válida: autenticación de token compartido/contraseña, o un despliegue `trusted-proxy` que no sea de bucle local y esté correctamente configurado.
- Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

Firmas comunes:

- `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de puerta de enlace válida.
- `RPC probe: failed` mientras el tiempo de ejecución se está ejecutando → puerta de enlace activa pero inaccesible con la auth/url actual.

### 3) El estado de emparejamiento y de identidad del dispositivo ha cambiado

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

Si la configuración del servicio y el tiempo de ejecución aún están en desacuerdo después de las verificaciones, reinstala los metadatos del servicio desde el mismo directorio de perfil/estado:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Relacionado:

- [/gateway/pairing](/es/gateway/pairing)
- [/gateway/authentication](/es/gateway/authentication)
- [/gateway/background-process](/es/gateway/background-process)

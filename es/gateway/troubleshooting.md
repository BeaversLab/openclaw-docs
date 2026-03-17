---
summary: "Manual de procedimientos profundo de solución de problemas para la puerta de enlace, canales, automatización, nodos y navegador"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Solución de problemas"
---

# Solución de problemas de la puerta de enlace

Esta página es el manual de procedimientos detallado.
Comience en [/help/troubleshooting](/es/help/troubleshooting) si desea el flujo de triaje rápido primero.

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
- `openclaw doctor` no informa problemas de configuración/servicio que bloqueen.
- `openclaw channels status --probe` muestra canales conectados/listos.

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

1. Deshabilite `context1m` para ese modelo para volver a la ventana de contexto normal.
2. Use una clave de API de Anthropic con facturación, o habilite el Uso Adicional de Anthropic en la cuenta de suscripción.
3. Configure modelos alternativos para que las ejecuciones continúen cuando se rechacen las solicitudes de contexto largo de Anthropic.

Relacionado:

- [/providers/anthropic](/es/providers/anthropic)
- [/reference/token-use](/es/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/es/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

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
- Filtrado de menciones de grupo (`requireMention`, `mentionPatterns`).
- Discrepancias en la lista de permitidos de canales/grupos.

Firmas comunes:

- `drop guild message (mention required` → mensaje de grupo ignorado hasta la mención.
- `pairing request` → el remitente necesita aprobación.
- `blocked` / `allowlist` → remitente/canal fue filtrado por la política.

Relacionado:

- [/channels/troubleshooting](/es/channels/troubleshooting)
- [/channels/pairing](/es/channels/pairing)
- [/channels/groups](/es/channels/groups)

## Conectividad de la interfaz de usuario de control del panel

Cuando el panel/interfaz de usuario de control no se conecta, valide la URL, el modo de autenticación y los supuestos del contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Busque:

- URL de sonda y URL del panel correctas.
- Discrepancia del modo/token de autenticación entre el cliente y la puerta de enlace.
- Uso de HTTP cuando se requiere la identidad del dispositivo.

Firmas comunes:

- `device identity required` → contexto no seguro o autenticación de dispositivo faltante.
- `device nonce required` / `device nonce mismatch` → el cliente no está completando el
  flujo de autenticación de dispositivo basado en desafío (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → el cliente firmó la carga útil
  incorrecta (o marca de tiempo obsoleta) para el handshake actual.
- `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede hacer un reintento de confianza con el token de dispositivo en caché.
- `unauthorized` repetido después de ese reintento → desviación del token compartido/token de dispositivo; actualice la configuración del token y reapruebe/rote el token de dispositivo si es necesario.
- `gateway connect failed:` → objetivo de host/puerto/url incorrecto.

### Mapa rápido de códigos de detalles de autenticación

Use `error.details.code` de la respuesta `connect` fallida para elegir la siguiente acción:

| Código de detalle            | Significado                                                                            | Acción recomendada                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                     | Pegue/establezca el token en el cliente y vuelva a intentarlo. Para las rutas del panel: `openclaw config get gateway.auth.token` y luego pegue en la configuración de Control UI.                                     |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincidió con el token de autenticación de la puerta de enlace. | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Si continúa fallando, ejecute la [lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token por dispositivo en caché está obsoleto o revocado.                            | Rote/ruebe el token del dispositivo usando [devices CLI](/es/cli/devices), luego vuelva a conectar.                                                                                                                    |
| `PAIRING_REQUIRED`           | La identidad del dispositivo es conocida pero no aprobada para este rol.               | Aprove la solicitud pendiente: `openclaw devices list` y luego `openclaw devices approve <requestId>`.                                                                                                                 |

Verificación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente de conexión y verifique que:

1. espera `connect.challenge`
2. firma el payload vinculado al desafío
3. envía `connect.params.device.nonce` con el mismo nonce de desafío

Relacionado:

- [/web/control-ui](/es/web/control-ui)
- [/gateway/authentication](/es/gateway/authentication)
- [/gateway/remote](/es/gateway/remote)
- [/cli/devices](/es/cli/devices)

## El servicio Gateway no se está ejecutando

Use esto cuando el servicio está instalado pero el proceso no se mantiene activo.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

Busque:

- `Runtime: stopped` con pistas de salida.
- Discordancia en la configuración del servicio (`Config (cli)` frente a `Config (service)`).
- Conflictos de puerto/listener.

Firmas comunes:

- `Gateway start blocked: set gateway.mode=local` → el modo de puerta de enlace local no está habilitado. Solución: establezca `gateway.mode="local"` en su configuración (o ejecute `openclaw configure`). Si está ejecutando OpenClaw a través de Podman usando el usuario dedicado `openclaw`, la configuración se encuentra en `~openclaw/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → enlace no de bucle invertido sin token/contraseña.
- `another gateway instance is already listening` / `EADDRINUSE` → conflicto de puerto.

Relacionado:

- [/gateway/background-process](/es/gateway/background-process)
- [/gateway/configuration](/es/gateway/configuration)
- [/gateway/doctor](/es/gateway/doctor)

## Canal conectado pero los mensajes no fluyen

Si el estado del canal es conectado pero el flujo de mensajes está muerto, centrese en la política, los permisos y las reglas de entrega específicas del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busque:

- Política DM (`pairing`, `allowlist`, `open`, `disabled`).
- Lista de permitidos de grupos y requisitos de mención.
- Permisos/ámbitos de API del canal faltantes.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención de grupo.
- `pairing` / trazas de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [/channels/troubleshooting](/es/channels/troubleshooting)
- [/channels/whatsapp](/es/channels/whatsapp)
- [/channels/telegram](/es/channels/telegram)
- [/channels/discord](/es/channels/discord)

## Entrega de Cron y latidos (heartbeat)

Si el cron o el latido no se ejecutaron o no se entregaron, verifique primero el estado del programador y luego el destino de entrega.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Busque:

- Cron habilitado y siguiente despertar presente.
- Estado del historial de ejecuciones del trabajo (`ok`, `skipped`, `error`).
- Razones de omisión de latido (`quiet-hours`, `requests-in-flight`, `alerts-disabled`).

Firmas comunes:

- `cron: scheduler disabled; jobs will not run automatically` → cron desactivado.
- `cron: timer tick failed` → falló el tick del programador; verifique los errores de archivo/log/runtime.
- `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas.
- `heartbeat: unknown accountId` → id de cuenta no válido para el destino de entrega de latido.
- `heartbeat skipped` con `reason=dm-blocked` → el destino de latido se resolvió a un destino estilo DM mientras que `agents.defaults.heartbeat.directPolicy` (o el override por agente) está establecido en `block`.

Relacionado:

- [/automation/troubleshooting](/es/automation/troubleshooting)
- [/automation/cron-jobs](/es/automation/cron-jobs)
- [/gateway/heartbeat](/es/gateway/heartbeat)

## Falla de herramienta emparejada con nodo

Si un nodo está emparejado pero las herramientas fallan, aisle el estado de primer plano, permisos y aprobación.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Busque:

- Nodo en línea con las capacidades esperadas.
- Concesiones de permisos del sistema operativo para cámara/micrófono/ubicación/pantalla.
- Aprobaciones de ejecución y estado de lista blanca.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación de nodos debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta el permiso del sistema operativo.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista de permitidos.

Relacionado:

- [/nodes/troubleshooting](/es/nodes/troubleshooting)
- [/nodes/index](/es/nodes/index)
- [/tools/exec-approvals](/es/tools/exec-approvals)

## Error en la herramienta del navegador

Use esto cuando fallen las acciones de la herramienta del navegador aunque la puerta de enlace en sí esté sana.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Busque:

- Ruta válida al ejecutable del navegador.
- Accesibilidad del perfil CDP.
- Disponibilidad local de Chrome para perfiles `existing-session` / `user`.

Firmas comunes:

- `Failed to start Chrome CDP on port` → error al iniciar el proceso del navegador.
- `browser.executablePath not found` → la ruta configurada no es válida.
- `No Chrome tabs found for profile="user"` → el perfil de conexión MCP de Chrome no tiene pestañas locales de Chrome abiertas.
- `Browser attachOnly is enabled ... not reachable` → el perfil de solo conexión no tiene un objetivo alcanzable.

Relacionado:

- [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
- [/tools/browser](/es/tools/browser)

## Si actualizaste y algo se rompió repentinamente

La mayoría de las roturas tras una actualización se deben a una desviación de la configuración o a valores predeterminados más estrictos que ahora se aplican.

### 1) Cambió el comportamiento de anulación de autenticación y URL

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Qué verificar:

- Si `gateway.mode=remote`, las llamadas de la CLI pueden estar apuntando a un servidor remoto mientras tu servicio local está bien.
- Las llamadas explícitas a `--url` no recurren a las credenciales almacenadas.

Firmas comunes:

- `gateway connect failed:` → objetivo de URL incorrecto.
- `unauthorized` → endpoint accesible pero autenticación incorrecta.

### 2) Las salvaguardas de enlace y autenticación son más estrictas

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

Qué verificar:

- Los enlaces que no son de bucle local (`lan`, `tailnet`, `custom`) necesitan autenticación configurada.
- Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

Firmas comunes:

- `refusing to bind gateway ... without auth` → desajuste de enlace+autenticación.
- `RPC probe: failed` mientras el runtime se está ejecutando → la puerta de enlace está activa pero es inaccesible con la auth/url actual.

### 3) Cambió el estado de emparejamiento e identidad del dispositivo

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

Qué verificar:

- Aprobaciones de dispositivos pendientes para el panel/nodos.
- Aprobaciones de emparejamiento DM pendientes después de cambios en la política o identidad.

Firmas comunes:

- `device identity required` → autenticación del dispositivo no satisfecha.
- `pairing required` → el remitente/dispositivo debe ser aprobado.

Si la configuración del servicio y el runtime aún no coinciden después de las comprobaciones, reinstala los metadatos del servicio desde el mismo directorio de perfil/estado:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Relacionado:

- [/gateway/pairing](/es/gateway/pairing)
- [/gateway/authentication](/es/gateway/authentication)
- [/gateway/background-process](/es/gateway/background-process)

import es from "/components/footer/es.mdx";

<es />

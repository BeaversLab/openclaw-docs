---
summary: "Manual de procedimientos de solución de problemas profunda para puerta de enlace, canales, automatización, nodos y navegador"
read_when:
  - El centro de solución de problemas te remitió aquí para un diagnóstico más profundo
  - Necesitas secciones de manual de procedimientos estables basadas en síntomas con comandos exactos
title: "Solución de problemas"
---

# Solución de problemas de la puerta de enlace

Esta página es el manual de procedimientos profundo.
Comienza en [/help/troubleshooting](/es/help/troubleshooting) si deseas primero el flujo de triaje rápido.

## Escalera de comandos

Ejecuta estos primero, en este orden:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Señales saludables esperadas:

- `openclaw gateway status` muestra `Runtime: running` y `RPC probe: ok`.
- `openclaw doctor` informa que no hay problemas de configuración/servicio que bloqueen.
- `openclaw channels status --probe` muestra canales conectados/listos.

## Uso adicional Anthropic 429 requerido para contexto largo

Usa esto cuando los registros/errores incluyan:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Busca:

- El modelo Anthropic Opus/Sonnet seleccionado tiene `params.context1m: true`.
- La credencial actual de Anthropic no es elegible para el uso de contexto largo.
- Las solicitudes fallan solo en sesiones largas/ejecuciones de modelo que necesitan la ruta beta de 1M.

Opciones de solución:

1. Deshabilita `context1m` para ese modelo para volver a la ventana de contexto normal.
2. Usa una clave de API de Anthropic con facturación, o habilita el Uso Adicional de Anthropic en la cuenta de suscripción.
3. Configura modelos de reserva para que las ejecuciones continúen cuando las solicitudes de contexto largo de Anthropic sean rechazadas.

Relacionado:

- [/providers/anthropic](/es/providers/anthropic)
- [/reference/token-use](/es/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/es/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Sin respuestas

Si los canales están activos pero nada responde, verifica el enrutamiento y la política antes de volver a conectar nada.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Busca:

- Emparejamiento pendiente para remitentes de MD.
- Filtrado de menciones de grupo (`requireMention`, `mentionPatterns`).
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

Cuando el panel/interfaz de usuario de control no se conecte, valide la URL, el modo de autenticación y las suposiciones del contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Buscar:

- URL de sondeo y URL del panel correctas.
- Discrepancia del modo/token de autenticación entre el cliente y la puerta de enlace.
- Uso de HTTP donde se requiere identidad del dispositivo.

Firmas comunes:

- `device identity required` → contexto no seguro o falta de autenticación de dispositivo.
- `device nonce required` / `device nonce mismatch` → el cliente no está completando el flujo de autenticación de dispositivo basado en desafío (`connect.challenge` + `device.nonce`).
- `device signature invalid` / `device signature expired` → el cliente firmó la carga útil incorrecta (o una marca de tiempo obsoleta) para el protocolo de enlace actual.
- `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede realizar un reintento de confianza con el token de dispositivo en caché.
- `unauthorized` repetido después de ese reintento → desviación del token compartido/token de dispositivo; actualice la configuración del token y reapruebe/gire el token del dispositivo si es necesario.
- `gateway connect failed:` → host/puerto/URL de destino incorrectos.

### Mapa rápido de códigos de detalles de autenticación

Use `error.details.code` de la respuesta fallida `connect` para elegir la siguiente acción:

| Código de detalle            | Significado                                                                            | Acción recomendada                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                     | Pegue/configure el token en el cliente y vuelva a intentar. Para rutas del panel: `openclaw config get gateway.auth.token` y luego pegue en la configuración de la interfaz de usuario de control.                     |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincidió con el token de autenticación de la puerta de enlace. | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Si continúa fallando, ejecute la [lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token por dispositivo en caché está obsoleto o revocado.                            | Gire/reapruebe el token del dispositivo usando [CLI de dispositivos](/es/cli/devices) y luego vuelva a conectarse.                                                                                                     |
| `PAIRING_REQUIRED`           | La identidad del dispositivo es conocida pero no aprobada para este rol.               | Aprobar solicitud pendiente: `openclaw devices list` y luego `openclaw devices approve <requestId>`.                                                                                                                   |

Comprobación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente que se está conectando y verifíquelo:

1. espera `connect.challenge`
2. firma el payload vinculado al desafío
3. envía `connect.params.device.nonce` con el mismo nonce de desafío

Relacionado:

- [/web/control-ui](/es/web/control-ui)
- [/gateway/authentication](/es/gateway/authentication)
- [/gateway/remote](/es/gateway/remote)
- [/cli/devices](/es/cli/devices)

## Servicio de puerta de enlace no ejecutándose

Use esto cuando el servicio está instalado pero el proceso no se mantiene en ejecución.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

Busque:

- `Runtime: stopped` con sugerencias de salida.
- Discrepancia en la configuración del servicio (`Config (cli)` frente a `Config (service)`).
- Conflictos de puerto/escucha.

Firmas comunes:

- `Gateway start blocked: set gateway.mode=local` → el modo de puerta de enlace local no está habilitado. Solución: configure `gateway.mode="local"` en su configuración (o ejecute `openclaw configure`). Si está ejecutando OpenClaw a través de Podman usando el usuario dedicado `openclaw`, la configuración se encuentra en `~openclaw/.openclaw/openclaw.json`.
- `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin token/contraseña.
- `another gateway instance is already listening` / `EADDRINUSE` → conflicto de puerto.

Relacionado:

- [/gateway/background-process](/es/gateway/background-process)
- [/gateway/configuration](/es/gateway/configuration)
- [/gateway/doctor](/es/gateway/doctor)

## Canal conectado pero los mensajes no fluyen

Si el estado del canal está conectado pero el flujo de mensajes está muerto, concéntrese en la política, los permisos y las reglas específicas de entrega del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busque:

- Política de MD (`pairing`, `allowlist`, `open`, `disabled`).
- Lista blanca de grupos y requisitos de mención.
- Permisos/ámbitos faltantes de la API del canal.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención de grupo.
- `pairing` / rastros de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [/channels/troubleshooting](/es/channels/troubleshooting)
- [/channels/whatsapp](/es/channels/whatsapp)
- [/channels/telegram](/es/channels/telegram)
- [/channels/discord](/es/channels/discord)

## Entrega de cron y latido

Si cron o latido no se ejecutaron o no se entregaron, verifique primero el estado del programador y luego el destino de entrega.

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

- `cron: scheduler disabled; jobs will not run automatically` → cron deshabilitado.
- `cron: timer tick failed` → falló el tic del programador; verifique errores de archivo/log/runtime.
- `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas.
- `heartbeat: unknown accountId` → id de cuenta no válido para el destino de entrega de latido.
- `heartbeat skipped` con `reason=dm-blocked` → el destino de latido se resolvió a un destino estilo DM mientras `agents.defaults.heartbeat.directPolicy` (o la anulación por agente) está configurado en `block`.

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
- Otorgación de permisos del SO para cámara/mic/ubicación/pantalla.
- Aprobaciones de ejecución y estado de lista blanca.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación del nodo debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta permiso del SO.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista blanca.

Relacionado:

- [/nodes/troubleshooting](/es/nodes/troubleshooting)
- [/nodes/index](/es/nodes/index)
- [/tools/exec-approvals](/es/tools/exec-approvals)

## La herramienta del navegador falla

Use esto cuando las acciones de la herramienta del navegador fallan aunque la puerta de enlace en sí esté sana.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Buscar:

- Ruta válida al ejecutable del navegador.
- Accesibilidad del perfil CDP.
- Disponibilidad local de Chrome para perfiles `existing-session` / `user`.

Firmas comunes:

- `Failed to start Chrome CDP on port` → falló el inicio del proceso del navegador.
- `browser.executablePath not found` → la ruta configurada no es válida.
- `No Chrome tabs found for profile="user"` → el perfil de conexión de Chrome MCP no tiene pestañas locales de Chrome abiertas.
- `Browser attachOnly is enabled ... not reachable` → el perfil de solo conexión no tiene un destino accesible.

Relacionado:

- [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
- [/tools/browser](/es/tools/browser)

## Si actualizó y algo dejó de funcionar repentinamente

La mayoría de las fallas posteriores a la actualización se deben a una deriva de la configuración o a valores predeterminados más estrictos que ahora se aplican.

### 1) Cambió el comportamiento de invalidación de autenticación y URL

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

Qué verificar:

- Si `gateway.mode=remote`, las llamadas de la CLI pueden estar apuntando a un servidor remoto mientras su servicio local está bien.
- Las llamadas explícitas a `--url` no vuelven a las credenciales almacenadas.

Firmas comunes:

- `gateway connect failed:` → URL de destino incorrecta.
- `unauthorized` → endpoint accesible pero autenticación incorrecta.

### 2) Las barreras de seguridad de enlace y autenticación son más estrictas

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

Qué verificar:

- Los enlaces no locales (`lan`, `tailnet`, `custom`) necesitan autenticación configurada.
- Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

Firmas comunes:

- `refusing to bind gateway ... without auth` → discrepancia de enlace y autenticación.
- `RPC probe: failed` mientras el runtime está en ejecución → puerta de enlace activa pero inaccesible con la auth/url actual.

### 3) Cambió el estado de emparejamiento e identidad del dispositivo

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

- `device identity required` → autenticación del dispositivo no satisfecha.
- `pairing required` → el remitente/dispositivo debe ser aprobado.

Si la configuración y el tiempo de ejecución del servicio aún no coinciden después de las comprobaciones, reinstale los metadatos del servicio desde el mismo directorio de perfil/estado:

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

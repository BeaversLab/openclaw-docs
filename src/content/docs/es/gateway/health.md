---
summary: "Comandos de verificación de salud y monitoreo de la salud de la puerta de enlace"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "Verificaciones de salud"
---

# Verificaciones de salud (CLI)

Guía breve para verificar la conectividad del canal sin conjeturas.

## Verificaciones rápidas

- `openclaw status` — resumen local: accesibilidad/modo de la puerta de enlace, sugerencia de actualización, antigüedad de autenticación del canal vinculado, sesiones + actividad reciente.
- `openclaw status --all` — diagnóstico local completo (solo lectura, color, seguro de pegar para depuración).
- `openclaw status --deep` — solicita al gateway en ejecución un sondeo de salud en vivo (`health` con `probe:true`), incluyendo sondas de canal por cuenta cuando sea compatible.
- `openclaw health` — solicita al gateway en ejecución su instantánea de salud (solo WS; sin sockets de canal directos desde la CLI).
- `openclaw health --verbose` — fuerza un sondeo de salud en vivo e imprime los detalles de la conexión del gateway.
- `openclaw health --json` — salida de instantánea de salud legible por máquina.
- Envíe `/status` como un mensaje independiente en WhatsApp/WebChat para obtener una respuesta de estado sin invocar al agente.
- Registros: haga un tail a `/tmp/openclaw/openclaw-*.log` y filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnósticos profundos

- Credenciales en disco: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime debe ser reciente).
- Almacén de sesiones: `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (la ruta se puede anular en la configuración). El recuento y los destinatarios recientes se muestran a través de `status`.
- Flujo de revinculación: `openclaw channels logout && openclaw channels login --verbose` cuando los códigos de estado 409–515 o `loggedOut` aparecen en los registros. (Nota: el flujo de inicio de sesión QR se reinicia automáticamente una vez para el estado 515 después del emparejamiento).

## Configuración del monitor de salud

- `gateway.channelHealthCheckMinutes`: con qué frecuencia el gateway verifica la salud del canal. Predeterminado: `5`. Establezca `0` para deshabilitar globalmente los reinicios del monitor de salud.
- `gateway.channelStaleEventThresholdMinutes`: cuánto tiempo puede permanecer inactivo un canal conectado antes de que el monitor de salud lo considere obsoleto y lo reinicie. Predeterminado: `30`. Mantenga esto mayor o igual a `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour`: límite móvil de una hora para los reinicios del monitor de salud por canal/cuenta. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: deshabilita los reinicios del monitor de salud para un canal específico mientras deja el monitoreo global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación de múltiples cuentas que tiene prioridad sobre la configuración a nivel de canal.
- Estas anulaciones por canal se aplican a los monitores de canal integrados que las exponen hoy: Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram y WhatsApp.

## Cuando algo falla

- `logged out` o estado 409–515 → volver a vincular con `openclaw channels logout` y luego `openclaw channels login`.
- Gateway inalcanzable → iniciarlo: `openclaw gateway --port 18789` (usar `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirmar que el teléfono vinculado está en línea y que el remitente está permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista blanca + mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando dedicado "health"

`openclaw health` le pide al gateway en ejecución su instantánea de estado (sin sockets de canal directos desde la CLI). Por defecto, puede devolver una instantánea en caché del gateway actualizada; el gateway luego actualiza esa caché en segundo plano. `openclaw health --verbose` fuerza una sondeo en vivo en su lugar. El comando informa la antigüedad de las credenciales/autenticación vinculadas cuando están disponibles, resúmenes de sondeo por canal, resumen del almacén de sesiones y una duración del sondeo. Sale con un valor distinto de cero si el gateway es inalcanzable o si el sondeo falla/expira.

Opciones:

- `--json`: salida JSON legible por máquina
- `--timeout <ms>`: anular el tiempo de espera de sondeo predeterminado de 10s
- `--verbose`: forzar un sondeo en vivo e imprimir los detalles de conexión del gateway
- `--debug`: alias para `--verbose`

La instantánea de estado incluye: `ok` (booleano), `ts` (marca de tiempo), `durationMs` (tiempo de sondeo), estado por canal, disponibilidad del agente y resumen del almacén de sesiones.

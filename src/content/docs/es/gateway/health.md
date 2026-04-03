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
- `openclaw status --deep` — también sondea la puerta de enlace en ejecución (sondeos por canal cuando se admite).
- `openclaw health --json` — solicita a la puerta de enlace en ejecución una instantánea completa de salud (solo WS; sin socket directo de Baileys).
- Envíe `/status` como un mensaje independiente en WhatsApp/WebChat para obtener una respuesta de estado sin invocar al agente.
- Registros: haga un tail de `/tmp/openclaw/openclaw-*.log` y filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnósticos profundos

- Credenciales en disco: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (la hora de modificación debe ser reciente).
- Almacén de sesiones: `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (la ruta se puede anular en la configuración). El recuento y los destinatarios recientes se muestran a través de `status`.
- Flujo de revinculación: `openclaw channels logout && openclaw channels login --verbose` cuando aparecen códigos de estado 409–515 o `loggedOut` en los registros. (Nota: el flujo de inicio de sesión QR se reinicia automáticamente una vez para el estado 515 después del emparejamiento).

## Configuración del monitor de salud

- `gateway.channelHealthCheckMinutes`: con qué frecuencia la puerta de enlace verifica el estado del canal. Predeterminado: `5`. Establezca `0` para desactivar globalmente los reinicios del monitor de salud.
- `gateway.channelStaleEventThresholdMinutes`: cuánto tiempo puede permanecer inactivo un canal conectado antes de que el monitor de salud lo considere obsoleto y lo reinicie. Predeterminado: `30`. Mantenga esto mayor o igual a `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour`: límite móvil de una hora para los reinicios del monitor de salud por canal/cuenta. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: desactiva los reinicios del monitor de salud para un canal específico mientras se deja activado el monitoreo global.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación multicuenta que tiene prioridad sobre la configuración a nivel de canal.
- Estas anulaciones por canal se aplican a los monitores de canal integrados que actualmente las exponen: Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram y WhatsApp.

## Cuando algo falla

- `logged out` o estado 409–515 → volver a vincular con `openclaw channels logout` y luego `openclaw channels login`.
- Puerta de enlace inalcanzable → iníciela: `openclaw gateway --port 18789` (use `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirme que el teléfono vinculado está en línea y que el remitente está permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista de permitidos + mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando dedicado "health"

`openclaw health --json` solicita a la puerta de enlace (Gateway) en ejecución su instantánea de estado (sin sockets de canal directos desde la CLI). Reporta la antigüedad de las credenciales/enlaces de autenticación cuando está disponible, resúmenes de sondeo por canal, resumen del almacén de sesiones y una duración del sondeo. Sale con un valor distinto de cero si la puerta de enlace es inalcanzable o si el sondeo falla o agota el tiempo de espera.

Opciones:

- `--json`: salida JSON legible por máquina
- `--timeout <ms>`: anular el tiempo de espera de sondeo predeterminado de 10s
- `--probe`: forzar un sondeo en vivo de todos los canales en lugar de devolver la instantánea de estado en caché

La instantánea de estado incluye: `ok` (booleano), `ts` (marca de tiempo), `durationMs` (tiempo de sondeo), estado por canal, disponibilidad del agente y resumen del almacén de sesiones.

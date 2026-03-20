---
summary: "Pasos de verificación de estado para la conectividad del canal"
read_when:
  - Diagnóstico del estado del canal de WhatsApp
title: "Health Checks"
---

# Verificaciones de salud (CLI)

Guía breve para verificar la conectividad del canal sin conjeturas.

## Verificaciones rápidas

- `openclaw status` — resumen local: alcance/modo de la puerta de enlace, sugerencia de actualización, antigüedad de la autenticación del canal vinculado, sesiones + actividad reciente.
- `openclaw status --all` — diagnóstico local completo (solo lectura, color, seguro de pegar para depuración).
- `openclaw status --deep` — también sondea la puerta de enlace en ejecución (sondeos por canal cuando se admite).
- `openclaw health --json` — solicita a la puerta de enlace en ejecución una instantánea completa del estado (solo WS; sin socket directo de Baileys).
- Envíe `/status` como un mensaje independiente en WhatsApp/WebChat para obtener una respuesta de estado sin invocar al agente.
- Registros: haga un tail en `/tmp/openclaw/openclaw-*.log` y filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

## Diagnósticos profundos

- Credenciales en disco: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (el mtime debe ser reciente).
- Almacén de sesiones: `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (la ruta se puede anular en la configuración). El recuento y los destinatarios recientes se muestran a través de `status`.
- Flujo de revinculación: `openclaw channels logout && openclaw channels login --verbose` cuando aparecen los códigos de estado 409–515 o `loggedOut` en los registros. (Nota: el flujo de inicio de sesión QR se reinicia automáticamente una vez para el estado 515 después del emparejamiento).

## Configuración del monitor de salud

- `gateway.channelHealthCheckMinutes`: con qué frecuencia la puerta de enlace verifica el estado del canal. Predeterminado: `5`. Establezca `0` para desactivar globalmente los reinicios del monitor de estado.
- `gateway.channelStaleEventThresholdMinutes`: cuánto tiempo puede permanecer inactivo un canal conectado antes de que el monitor de estado lo considere obsoleto y lo reinicie. Predeterminado: `30`. Mantenga esto mayor o igual que `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour`: límite móvil de una hora para los reinicios del monitor de estado por canal/cuenta. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: desactiva los reinicios del monitor de estado para un canal específico mientras deja el monitoreo global activado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación de multicuenta que prevalece sobre la configuración a nivel de canal.
- Estas anulaciones por canal se aplican a los monitores de canal integrados que actualmente las exponen: Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram y WhatsApp.

## Cuando algo falla

- `logged out` o estado 409–515 → volver a vincular con `openclaw channels logout` y luego `openclaw channels login`.
- Gateway inalcanzable → iniciarlo: `openclaw gateway --port 18789` (usar `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirmar que el teléfono vinculado está en línea y que el remitente está permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista blanca y mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando dedicado "health"

`openclaw health --json` solicita al Gateway en ejecución su instantánea de estado (sin sockets directos de canal desde la CLI). Informa la antigüedad de las credenciales/autorización vinculadas cuando está disponible, resúmenes de sondas por canal, resumen del almacén de sesiones y una duración de sonda. Sale con valor distinto de cero si el Gateway es inalcanzable o si la sonda falla/expira. Use `--timeout <ms>` para anular el valor predeterminado de 10s.

import es from "/components/footer/es.mdx";

<es />

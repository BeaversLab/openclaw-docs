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
- Los diagnósticos están habilitados de forma predeterminada. La puerta de enlace registra hechos operativos a menos que se establezca `diagnostics.enabled: false`. Los eventos de memoria registran los recuentos de bytes de RSS/pila, la presión del umbral y la presión de crecimiento. Los eventos de carga excesiva registran lo que se rechazó, truncó o fragmentó, además de los tamaños y límites cuando están disponibles. No registran el texto del mensaje, el contenido de los archivos adjuntos, el cuerpo del webhook, el cuerpo de la solicitud o respuesta sin procesar, los tokens, las cookies ni los valores secretos. El mismo latido inicia el grabador de estabilidad limitada, que está disponible a través de `openclaw gateway stability` o del RPC de la puerta de enlace `diagnostics.stability`. Las salidas fatales de la puerta de enlace, los tiempos de espera de apagado y los fallos de inicio al reiniciar persisten la instantánea más reciente del grabador bajo `~/.openclaw/logs/stability/` cuando existen eventos; inspeccione el paquete guardado más reciente con `openclaw gateway stability --bundle latest`.
- Para informes de errores, ejecute `openclaw gateway diagnostics export` y adjunte el zip generado. La exportación combina un resumen de Markdown, el paquete de estabilidad más reciente, metadatos de registro saneados, instantáneas de estado/salud de la puerta de enlace saneadas y la forma de configuración. Está diseñado para compartirse: se omiten o redactan el texto del chat, los cuerpos de los webhooks, las salidas de las herramientas, las credenciales, las cookies, los identificadores de cuenta/mensaje y los valores secretos.

## Configuración del monitor de salud

- `gateway.channelHealthCheckMinutes`: con qué frecuencia la puerta de enlace verifica el estado del canal. Predeterminado: `5`. Establezca `0` para deshabilitar globalmente los reinicios del monitor de salud.
- `gateway.channelStaleEventThresholdMinutes`: cuánto tiempo puede permanecer inactivo un canal conectado antes de que el monitor de salud lo trate como obsoleto y lo reinicie. Predeterminado: `30`. Mantenga esto mayor o igual que `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour`: límite móvil de una hora para los reinicios del monitor de salud por canal/cuenta. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: deshabilita los reinicios del monitor de salud para un canal específico mientras deja el monitoreo global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación de varias cuentas que tiene prioridad sobre la configuración a nivel de canal.
- Estas anulaciones por canal se aplican a los monitores de canal integrados que las exponen hoy en día: Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram y WhatsApp.

## Cuando algo falla

- `logged out` o estado 409–515 → volver a vincular con `openclaw channels logout` y luego `openclaw channels login`.
- Puerta de enlace inalcanzable → iníciela: `openclaw gateway --port 18789` (use `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirme que el teléfono vinculado esté en línea y que el remitente esté permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista blanca + mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando "health" dedicado

`openclaw health` le pide a la puerta de enlace en ejecución su instantánea de estado (sin sockets directos del canal desde la CLI). De forma predeterminada, puede devolver una instantánea en caché de la puerta de enlace reciente; la puerta de enlace luego actualiza ese caché en segundo plano. `openclaw health --verbose` fuerza una sondeo en vivo en su lugar. El comando informa la antigüedad de las credenciales/autenticación vinculadas cuando está disponible, resúmenes de sondeo por canal, resumen del almacén de sesiones y una duración del sondeo. Sale con un valor distinto de cero si la puerta de enlace es inalcanzable o si el sondeo falla/agota el tiempo de espera.

Opciones:

- `--json`: salida JSON legible por máquina
- `--timeout <ms>`: anular el tiempo de espera de sondeo predeterminado de 10 s
- `--verbose`: forzar un sondeo en vivo e imprimir los detalles de la conexión de la puerta de enlace
- `--debug`: alias para `--verbose`

La instantánea de estado incluye: `ok` (booleano), `ts` (marca de tiempo), `durationMs` (hora del sondeo), estado por canal, disponibilidad del agente y resumen del almacén de sesiones.

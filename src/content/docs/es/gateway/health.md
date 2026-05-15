---
summary: "Comandos de verificación de salud y monitoreo de la salud de la puerta de enlace"
read_when:
  - Diagnosing channel connectivity or gateway health
  - Understanding health check CLI commands and options
title: "Comprobaciones de estado"
---

Guía breve para verificar la conectividad del canal sin suposiciones.

## Verificaciones rápidas

- `openclaw status` — resumen local: accesibilidad/modo de la puerta de enlace, sugerencia de actualización, antigüedad de autenticación del canal vinculado, sesiones + actividad reciente.
- `openclaw status --all` — diagnóstico local completo (solo lectura, en color, seguro de pegar para depuración).
- `openclaw status --deep` — solicita a la puerta de enlace en ejecución una sonda de estado en vivo (`health` con `probe:true`), incluyendo sondas de canal por cuenta cuando se admite.
- `openclaw health` — solicita a la puerta de enlace en ejecución su instantánea de estado (solo WS; sin sockets directos de canal desde la CLI).
- `openclaw health --verbose` — fuerza una sonda de estado en vivo e imprime los detalles de conexión de la puerta de enlace.
- `openclaw health --json` — salida de instantánea de estado legible por máquina.
- Envíe `/status` como un mensaje independiente en WhatsApp/WebChat para obtener una respuesta de estado sin invocar al agente.
- Registros: haga un tail a `/tmp/openclaw/openclaw-*.log` y filtre por `web-heartbeat`, `web-reconnect`, `web-auto-reply`, `web-inbound`.

Para Discord y otros proveedores de chat, las filas de sesión no son la vitalidad del socket.
`openclaw sessions`, Gateway `sessions.list` y la herramienta del agente `sessions_list`
leen el estado almacenado de la conversación. Un proveedor puede reconectarse y mostrar un estado de canal saludable
antes de que se materialice cualquier fila de sesión nueva. Use el estado del canal y
los comandos de salud anteriores para verificar la conectividad en tiempo real.

## Diagnósticos profundos

- Credenciales en disco: `ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json` (mtime debe ser reciente).
- Almacén de sesiones: `ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json` (la ruta se puede anular en la configuración). El recuento y los destinatarios recientes se muestran a través de `status`.
- Flujo de revinculación: `openclaw channels logout && openclaw channels login --verbose` cuando aparecen los códigos de estado 409–515 o `loggedOut` en los registros. (Nota: el flujo de inicio de sesión QR se reinicia automáticamente una vez para el estado 515 después del emparejamiento).
- Los diagnósticos están habilitados de forma predeterminada. La puerta de enlace registra hechos operativos a menos que se establezca `diagnostics.enabled: false`. Los eventos de memoria registran los recuentos de bytes de RSS/heap, la presión umbral y la presión de crecimiento. Las advertencias de vitalidad registran el retraso del bucle de eventos, la utilización del bucle de eventos, la proporción de núcleos de CPU y los recuentos de sesiones activas/en espera/en cola cuando el proceso se está ejecutando pero está saturado. Los eventos de carga útil excesiva registran lo que se rechazó, truncó o fragmentó, además de los tamaños y límites cuando están disponibles. No registran el texto del mensaje, el contenido de los archivos adjuntos, el cuerpo del webhook, el cuerpo de la solicitud o respuesta sin procesar, tokens, cookies ni valores secretos. El mismo latido inicia el grabador de estabilidad limitada, que está disponible a través de `openclaw gateway stability` o el RPC de Gateway `diagnostics.stability`. Las salidas fatales de Gateway, los tiempos de espera de apagado y los fallos de inicio de reinicio conservan la instantánea más reciente del grabador bajo `~/.openclaw/logs/stability/` cuando existen eventos; inspeccione el paquete guardado más reciente con `openclaw gateway stability --bundle latest`.
- Para informes de errores, ejecute `openclaw gateway diagnostics export` y adjunte el zip generado. La exportación combina un resumen en Markdown, el paquete de estabilidad más reciente, metadatos de registros saneados, instantáneas de estado/salud saneadas del Gateway y la forma de la configuración. Está diseñada para ser compartida: el texto del chat, los cuerpos de los webhooks, las salidas de las herramientas, las credenciales, las cookies, los identificadores de cuenta/mensaje y los valores secretos se omiten o se redactan. Consulte [Diagnostics Export](/es/gateway/diagnostics).

## Configuración del monitor de salud

- `gateway.channelHealthCheckMinutes`: con qué frecuencia el gateway verifica el estado del canal. Predeterminado: `5`. Establezca `0` para deshabilitar globalmente los reinicios del health-monitor.
- `gateway.channelStaleEventThresholdMinutes`: cuánto tiempo puede permanecer inactivo un canal conectado antes de que el health-monitor lo trate como obsoleto y lo reinicie. Predeterminado: `30`. Mantenga esto mayor o igual que `gateway.channelHealthCheckMinutes`.
- `gateway.channelMaxRestartsPerHour`: límite móvil de una hora para los reinicios del health-monitor por canal/cuenta. Predeterminado: `10`.
- `channels.<provider>.healthMonitor.enabled`: deshabilita los reinicios del health-monitor para un canal específico mientras se mantiene el monitoreo global habilitado.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: anulación de múltiples cuentas que tiene prioridad sobre la configuración a nivel de canal.
- Estas anulaciones por canal se aplican a los monitores de canal integrados que las exponen hoy en día: Discord, Google Chat, iMessage, Microsoft Teams, Signal, Slack, Telegram y WhatsApp.

## Cuando algo falla

- `logged out` o estado 409–515 → vincule de nuevo con `openclaw channels logout` y luego `openclaw channels login`.
- Gateway inalcanzable → inícielo: `openclaw gateway --port 18789` (use `--force` si el puerto está ocupado).
- Sin mensajes entrantes → confirme que el teléfono vinculado esté en línea y que el remitente esté permitido (`channels.whatsapp.allowFrom`); para chats grupales, asegúrese de que las reglas de lista blanca + mención coincidan (`channels.whatsapp.groups`, `agents.list[].groupChat.mentionPatterns`).

## Comando "health" dedicado

`openclaw health` le pide a la pasarela en ejecución su instantánea de estado (sin sockets de canal directos desde la CLI). Por defecto, puede devolver una instantánea de la pasarela en caché actualizada; la pasarela luego actualiza esa caché en segundo plano. `openclaw health --verbose` fuerza un sondeo en vivo en su lugar. El comando informa la antigüedad de las credenciales/autenticación vinculadas cuando está disponible, resúmenes de sondeo por canal, resumen del almacén de sesiones y una duración del sondeo. Sale con un valor distinto de cero si la pasarela es inalcanzable o si el sondeo falla o expira el tiempo de espera.

Opciones:

- `--json`: salida JSON legible por máquina
- `--timeout <ms>`: anular el tiempo de espera de sondeo predeterminado de 10s
- `--verbose`: forzar un sondeo en vivo e imprimir los detalles de conexión de la pasarela
- `--debug`: alias para `--verbose`

La instantánea de estado incluye: `ok` (booleano), `ts` (marca de tiempo), `durationMs` (tiempo de sondeo), estado por canal, disponibilidad del agente y resumen del almacén de sesiones.

## Relacionado

- [Manual de procedimientos de la pasarela](/es/gateway)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Solución de problemas de la pasarela](/es/gateway/troubleshooting)

---
summary: "Solución rápida de problemas a nivel de canal con firmas de error y soluciones por canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Solución de problemas del canal"
---

Use esta página cuando un canal se conecta pero el comportamiento es incorrecto.

## Escalera de comandos

Ejecute estos en orden primero:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Línea base saludable:

- `Runtime: running`
- `Connectivity probe: ok`
- `Capability: read-only`, `write-capable` o `admin-capable`
- El sondeo del canal muestra el transporte conectado y, si es compatible, `works` o `audit ok`

## Después de una actualización

Use esto cuando Telegram, iMessage, las configuraciones de la era de BlueBubbles u otro canal
de complemento desaparezca después de actualizar.

```bash
openclaw status --all
openclaw doctor --fix
openclaw gateway restart
openclaw status --all
```

Busque `plugin load failed: dependency tree corrupted; run openclaw doctor
--fix` in `openclaw status --all`. Eso significa que el canal está configurado, pero
la ruta de configuración/carga del complemento encontró un árbol de dependencias corrupto en lugar de registrar
el canal. `openclaw doctor --fix` elimina los directorios de almacenamiento temporal de dependencias de complementos obsoletos
y las sombras de autenticación obsoletas, y luego `openclaw gateway restart` recarga el
estado limpio.

## WhatsApp

### Firmas de error de WhatsApp

| Síntoma                                             | Verificación más rápida                                              | Solución                                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conectado pero sin respuestas de MD                 | `openclaw pairing list whatsapp`                                     | Aprobar al remitente o cambiar la política/lista blanca de MD.                                                                                                                         |
| Mensajes de grupo ignorados                         | Verificar `requireMention` + patrones de mención en la configuración | Mencione al bot o relaje la política de mención para ese grupo.                                                                                                                        |
| El inicio de sesión con QR se agota con 408         | Verificar la puerta de enlace `HTTPS_PROXY` / `HTTP_PROXY` env       | Establecer un proxy accesible; use `NO_PROXY` solo para omisiones.                                                                                                                     |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros                       | Las reconexiones recientes se marcan incluso cuando están conectadas actualmente; observe los registros, reinicie la puerta de enlace y luego vuelva a vincular si el aleteo continúa. |
| Las respuestas llegan segundos/minutos tarde        | `openclaw doctor --fix`                                              | El doctor detiene los clientes locales de TUI obsoletos verificados cuando están degradando el bucle de eventos de la puerta de enlace.                                                |

Solución de problemas completa: [Solución de problemas de WhatsApp](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de error de Telegram

| Síntoma                                          | Verificación más rápida                                                           | Solución                                                                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/start` pero sin flujo de respuesta utilizable  | `openclaw pairing list telegram`                                                  | Aprueba el emparejamiento o cambia la política de MD.                                                                                            |
| Bot en línea pero el grupo permanece en silencio | Verifica el requisito de mención y el modo de privacidad del bot                  | Deshabilita el modo de privacidad para la visibilidad del grupo o menciona al bot.                                                               |
| Fallos de envío con errores de red               | Inspecciona los registros en busca de fallos en las llamadas a la API de Telegram | Soluciona el enrutamiento DNS/IPv6/proxy hacia `api.telegram.org`.                                                                               |
| El inicio reporta `getMe returned 401`           | Verifica la fuente del token configurada                                          | Vuelve a copiar o regenera el token de BotFather y actualiza `botToken`, `tokenFile` o la cuenta predeterminada `TELEGRAM_BOT_TOKEN`.            |
| El sondeo se bloquea o se reconecta lentamente   | `openclaw logs --follow` para el diagnóstico del sondeo                           | Actualiza; si los reinicios son falsos positivos, ajusta `pollingStallThresholdMs`. Los bloqueos persistentes siguen apuntando a proxy/DNS/IPv6. |
| `setMyCommands` rechazado al inicio              | Inspecciona los registros para `BOT_COMMANDS_TOO_MUCH`                            | Reduce los complementos/habilidades/comandos personalizados de Telegram o deshabilita los menús nativos.                                         |
| Actualizado y la lista blanca te bloquea         | `openclaw security audit` y listas blancas de configuración                       | Ejecuta `openclaw doctor --fix` o reemplaza `@username` con ID de remitente numéricos.                                                           |

Solución de problemas completa: [Solución de problemas de Telegram](/es/channels/telegram#troubleshooting)

## Discord

### Signaturas de fallo de Discord

| Síntoma                                             | Verificación más rápida                                                                          | Solución                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bot en línea pero sin respuestas del servidor       | `openclaw channels status --probe`                                                               | Permite el servidor/canal y verifica el intento de contenido del mensaje.                                                                                                                                                                                                                                                                                                      |
| Mensajes de grupo ignorados                         | Verifica los registros para descartes por filtrado de menciones                                  | Menciona al bot o establece el `requireMention: false` del servidor/canal.                                                                                                                                                                                                                                                                                                     |
| Uso de escritura/tokens pero sin mensaje de Discord | Verifica si esto es un evento ambiente de la sala o una llamada perdida a `message(action=send)` | Inspecciona el registro detallado de la puerta de enlace en busca de metadatos de carga final suprimidos, verifica `messages.groupChat.unmentionedInbound`, lee [Eventos ambiente de la sala](/es/channels/ambient-room-events) o establece `messages.groupChat.visibleReplies: "automatic"` para usar la ruta de respuesta final heredada para solicitudes de grupo normales. |
| Faltan respuestas de MD                             | `openclaw pairing list discord`                                                                  | Aprueba el emparejamiento de MD o ajusta la política de MD.                                                                                                                                                                                                                                                                                                                    |

Solución de problemas completa: [Solución de problemas de Discord](/es/channels/discord#troubleshooting)

## Slack

### Signaturas de fallo de Slack

| Síntoma                                      | Verificación más rápida                             | Solución                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo de socket conectado pero sin respuestas | `openclaw channels status --probe`                  | Verifica el token de la aplicación + token del bot y los alcances necesarios; vigila los `botTokenStatus` / `appTokenStatus = configured_unavailable` en configuraciones con respaldo de SecretRef. |
| MD bloqueados                                | `openclaw pairing list slack`                       | Aprueba el emparejamiento o relaja la política de MD.                                                                                                                                               |
| Mensaje de canal ignorado                    | Verifica `groupPolicy` y la lista blanca de canales | Permite el canal o cambia la política a `open`.                                                                                                                                                     |

Solución de problemas completa: [Solución de problemas de Slack](/es/channels/slack#troubleshooting)

## iMessage

### Firmas de fallo de iMessage

| Síntoma                                           | Verificación más rápida                                                         | Solución                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `imsg` falta o falla en sistemas que no son macOS | `openclaw channels status --probe --channel imessage`                           | Ejecuta OpenClaw en la Mac de Messages o usa un contenedor SSH para `cliPath`. |
| Puede enviar pero no recibe en macOS              | Verifica los permisos de privacidad de macOS para la automatización de Messages | Vuelve a otorgar los permisos TCC y reinicia el proceso del canal.             |
| Remitente de MD bloqueado                         | `openclaw pairing list imessage`                                                | Aprueba el emparejamiento o actualiza la lista blanca.                         |

Solución de problemas completa:

- [Solución de problemas de iMessage](/es/channels/imessage#troubleshooting)

## Signal

### Firmas de fallo de Signal

| Síntoma                                  | Verificación más rápida                                      | Solución                                                                |
| ---------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Demonio accesible pero el bot silencioso | `openclaw channels status --probe`                           | Verifica la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                             | `openclaw pairing list signal`                               | Aprueba el remitente o ajusta la política de MD.                        |
| Las respuestas de grupo no se activan    | Verifica la lista blanca de grupos y los patrones de mención | Agrega el remitente/grupo o relaja las restricciones.                   |

Solución de problemas completa: [Solución de problemas de Signal](/es/channels/signal#troubleshooting)

## QQ Bot

### Firmas de fallo de QQ Bot

| Síntoma                       | Verificación más rápida                                    | Solución                                                                                  |
| ----------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| El bot responde "ido a Marte" | Verifica `appId` y `clientSecret` en la configuración      | Establece las credenciales o reinicia la puerta de enlace.                                |
| Sin mensajes entrantes        | `openclaw channels status --probe`                         | Verifica las credenciales en la plataforma abierta QQ.                                    |
| Voz no transcrita             | Verifica la configuración del proveedor STT                | Configura `channels.qqbot.stt` o `tools.media.audio`.                                     |
| Mensajes proactivos no llegan | Verifica los requisitos de interacción de la plataforma QQ | Es posible que QQ bloquee los mensajes iniciados por el bot sin una interacción reciente. |

Solución de problemas completa: [Solución de problemas de QQ Bot](/es/channels/qqbot#troubleshooting)

## Matrix

### Signaturas de fallos de Matrix

| Síntoma                                                      | Verificación más rápida                | Solución                                                                                                      |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sesión iniciada pero ignora mensajes de la sala              | `openclaw channels status --probe`     | Comprobar `groupPolicy`, lista blanca de salas y filtrado de menciones.                                       |
| Los MD no se procesan                                        | `openclaw pairing list matrix`         | Aprobar al remitente o ajustar la política de MD.                                                             |
| Las salas cifradas fallan                                    | `openclaw matrix verify status`        | Verificar el dispositivo nuevamente y luego comprobar `openclaw matrix verify backup status`.                 |
| La restauración de la copia de seguridad está pendiente/rota | `openclaw matrix verify backup status` | Ejecutar `openclaw matrix verify backup restore` o volver a ejecutar con una clave de recuperación.           |
| El inicio/cross-signing parece incorrecto                    | `openclaw matrix verify bootstrap`     | Reparar el almacenamiento de secretos, cross-signing y el estado de la copia de seguridad en una sola pasada. |

Configuración completa: [Matrix](/es/channels/matrix)

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)

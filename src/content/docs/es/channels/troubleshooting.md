---
summary: "Solución rápida de problemas a nivel de canal con firmas de fallo y correcciones por canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Solución de problemas de canales"
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
- `Capability: read-only`, `write-capable`, o `admin-capable`
- El sondeo del canal muestra que el transporte está conectado y, donde sea compatible, `works` o `audit ok`

## WhatsApp

### Firmas de fallo de WhatsApp

| Síntoma                                             | Verificación más rápida                                                  | Solución                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conectado pero sin respuestas de MD                 | `openclaw pairing list whatsapp`                                         | Apruebe el remitente o cambie la política/lista de permitidos de MD.                                                                                                                   |
| Mensajes de grupo ignorados                         | Verifique `requireMention` + patrones de mención en la configuración     | Mencione al bot o relaje la política de menciones para ese grupo.                                                                                                                      |
| El inicio de sesión con QR se agota con 408         | Verifique el entorno `HTTPS_PROXY` / `HTTP_PROXY` de la puerta de enlace | Configure un proxy accesible; use `NO_PROXY` solo para omisiones.                                                                                                                      |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros                           | Las reconexiones recientes se marcan incluso cuando están conectados actualmente; observe los registros, reinicie la puerta de enlace y luego vuelva a vincular si el aleteo continúa. |
| Las respuestas llegan segundos/minutos tarde        | `openclaw doctor --fix`                                                  | Doctor detiene los clientes locales de TUI obsoletos verificados cuando están degradando el bucle de eventos de la puerta de enlace.                                                   |

Solución de problemas completa: [Solución de problemas de WhatsApp](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de fallo de Telegram

| Síntoma                                          | Verificación más rápida                                                           | Solución                                                                                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable  | `openclaw pairing list telegram`                                                  | Apruebe el emparejamiento o cambie la política de MD.                                                                                               |
| Bot en línea pero el grupo permanece en silencio | Verifique el requisito de mención y el modo de privacidad del bot                 | Desactive el modo de privacidad para la visibilidad del grupo o mencione al bot.                                                                    |
| Fallos de envío con errores de red               | Inspeccione los registros en busca de fallos en las llamadas a la API de Telegram | Solucione el enrutamiento DNS/IPv6/proxy hacia `api.telegram.org`.                                                                                  |
| El inicio indica `getMe returned 401`            | Verifique la fuente del token configurada                                         | Vuelva a copiar o regenere el token de BotFather y actualice `botToken`, `tokenFile` o default-account `TELEGRAM_BOT_TOKEN`.                        |
| El sondeo se detiene o se reconecta lentamente   | `openclaw logs --follow` para diagnósticos de sondeo                              | Actualice; si los reinicios son falsos positivos, ajuste `pollingStallThresholdMs`. Las detenciones persistentes siguen apuntando a proxy/DNS/IPv6. |
| `setMyCommands` rechazado al inicio              | Inspeccione los registros en busca de `BOT_COMMANDS_TOO_MUCH`                     | Reduzca los comandos personalizados de complemento/habilidad/Telegram o deshabilite los menús nativos.                                              |
| Actualizado y la lista de permitidos le bloquea  | `openclaw security audit` y listas de permitidas de configuración                 | Ejecute `openclaw doctor --fix` o reemplace `@username` con ID de remitente numéricos.                                                              |

Solución de problemas completa: [Solución de problemas de Telegram](/es/channels/telegram#troubleshooting)

## Discord

### Firmas de fallo de Discord

| Síntoma                                            | Verificación más rápida                                                                   | Solución                                                                                                                                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot en línea pero sin respuestas del gremio        | `openclaw channels status --probe`                                                        | Permitir gremio/canal y verificar el intento de contenido del mensaje.                                                                                                                                                                |
| Mensajes grupales ignorados                        | Verifique los registros para ver las caídas por filtrado de menciones                     | Mencione al bot o configure el gremio/canal `requireMention: false`.                                                                                                                                                                  |
| Uso de escritura/token pero sin mensaje de Discord | El registro de sesión muestra el texto del asistente con `didSendViaMessagingTool: false` | El modelo respondió de forma privada en lugar de llamar a la herramienta de mensaje. Use un modelo confiable para llamadas a herramientas o configure `messages.groupChat.visibleReplies: "automatic"` para publicar automáticamente. |
| Faltan las respuestas de MD                        | `openclaw pairing list discord`                                                           | Apruebe el emparejamiento por MD o ajuste la política de MD.                                                                                                                                                                          |

Solución de problemas completa: [Solución de problemas de Discord](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallo de Slack

| Síntoma                                      | Verificación más rápida                                    | Solución                                                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo de socket conectado pero sin respuestas | `openclaw channels status --probe`                         | Verifique el token de la aplicación + el token del bot y los alcances requeridos; esté atento a `botTokenStatus` / `appTokenStatus = configured_unavailable` en configuraciones respaldadas por SecretRef. |
| MD bloqueados                                | `openclaw pairing list slack`                              | Apruebe el emparejamiento o relaje la política de MD.                                                                                                                                                      |
| Mensaje del canal ignorado                   | Verifique `groupPolicy` y la lista de permitidos del canal | Permita el canal o cambie la política a `open`.                                                                                                                                                            |

Solución de problemas completa: [Solución de problemas de Slack](/es/channels/slack#troubleshooting)

## iMessage

### Firmas de fallo de iMessage

| Síntoma                                           | Verificación más rápida                                                          | Solución                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `imsg` falta o falla en sistemas que no son macOS | `openclaw channels status --probe --channel imessage`                            | Ejecute OpenClaw en el Mac de Messages o use un contenedor SSH para `cliPath`. |
| Puede enviar pero no recibe en macOS              | Verifique los permisos de privacidad de macOS para la automatización de Messages | Vuelva a otorgar los permisos TCC y reinicie el proceso del canal.             |
| Remitente de MD bloqueado                         | `openclaw pairing list imessage`                                                 | Apruebe el emparejamiento o actualice la lista de permitidos.                  |

Solución de problemas completa:

- [Solución de problemas de iMessage](/es/channels/imessage#troubleshooting)

## Signal

### Firmas de fallo de Signal

| Síntoma                                              | Verificación más rápida                                              | Solución                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| El demonio es accesible pero el bot está en silencio | `openclaw channels status --probe`                                   | Verifique la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                                         | `openclaw pairing list signal`                                       | Apruebe el remitente o ajuste la política de MD.                         |
| Las respuestas grupales no activan                   | Verifique la lista de permitidos del grupo y los patrones de mención | Agregue el remitente/grupo o afloje el filtrado.                         |

Solución de problemas completa: [Solución de problemas de Signal](/es/channels/signal#troubleshooting)

## Bot de QQ

### Firmas de fallo del Bot de QQ

| Síntoma                       | Verificación más rápida                                     | Solución                                                                      |
| ----------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| El bot responde "ido a Marte" | Verifique `appId` y `clientSecret` en la configuración      | Establezca las credenciales o reinicie la puerta de enlace.                   |
| Sin mensajes entrantes        | `openclaw channels status --probe`                          | Verifique las credenciales en la Plataforma Abierta de QQ.                    |
| Voz no transcrita             | Verificar configuración del proveedor STT                   | Configure `channels.qqbot.stt` o `tools.media.audio`.                         |
| Mensajes proactivos no llegan | Verifique los requisitos de interacción de la plataforma QQ | QQ puede bloquear los mensajes iniciados por el bot sin interacción reciente. |

Solución de problemas completa: [Solución de problemas de QQ Bot](/es/channels/qqbot#troubleshooting)

## Matrix

### Firmas de fallos de Matrix

| Síntoma                                                      | Verificación más rápida                | Solución                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sesión iniciada pero ignora mensajes de la sala              | `openclaw channels status --probe`     | Verifique `groupPolicy`, lista blanca de salas y filtrado de menciones.                                          |
| Los MD no se procesan                                        | `openclaw pairing list matrix`         | Apruebe al remitente o ajuste la política de MD.                                                                 |
| Las salas cifradas fallan                                    | `openclaw matrix verify status`        | Vuelva a verificar el dispositivo, luego verifique `openclaw matrix verify backup status`.                       |
| La restauración de la copia de seguridad está pendiente/rota | `openclaw matrix verify backup status` | Ejecute `openclaw matrix verify backup restore` o vuelva a ejecutar con una clave de recuperación.               |
| El arranque/firma cruzada parece incorrecto                  | `openclaw matrix verify bootstrap`     | Reparar el almacenamiento de secretos, la firma cruzada y el estado de la copia de seguridad en una sola pasada. |

Configuración completa: [Matrix](/es/channels/matrix)

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Solución de problemas de pasarela](/es/gateway/troubleshooting)

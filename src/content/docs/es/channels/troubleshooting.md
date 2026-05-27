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
| `status=408 Request Time-out` bucle                 | Sonda, registros, doctor y luego estado de la puerta de enlace       | Primero corrija la conectividad/timing del host; haga una copia de seguridad de la autenticación y vuelva a vincular la cuenta si el bucle persiste.                                   |
| Las respuestas llegan segundos/minutos tarde        | `openclaw doctor --fix`                                              | El doctor detiene los clientes locales de TUI obsoletos verificados cuando están degradando el bucle de eventos de la puerta de enlace.                                                |

Solución completa de problemas: [Solución de problemas de WhatsApp](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de fallo de Telegram

| Síntoma                                          | Verificación más rápida                                                           | Solución                                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable  | `openclaw pairing list telegram`                                                  | Apruebe el emparejamiento o cambie la política de MD.                                                                                              |
| Bot en línea pero el grupo permanece en silencio | Verifique el requisito de mención y el modo de privacidad del bot                 | Desactive el modo de privacidad para la visibilidad del grupo o mencione al bot.                                                                   |
| Fallos de envío con errores de red               | Inspeccione los registros en busca de fallos en las llamadas a la API de Telegram | Corrija el enrutamiento de DNS/IPv6/proxy hacia `api.telegram.org`.                                                                                |
| El inicio informa `getMe returned 401`           | Verificar la fuente del token configurada                                         | Vuelva a copiar o regenerar el token de BotFather y actualice `botToken`, `tokenFile` o la cuenta predeterminada `TELEGRAM_BOT_TOKEN`.             |
| El sondeo se detiene o se reconecta lentamente   | `openclaw logs --follow` para diagnósticos de sondeo                              | Actualice; si los reinicios son falsos positivos, ajuste `pollingStallThresholdMs`. Las detenciones persistentes todavía apuntan a proxy/DNS/IPv6. |
| `setMyCommands` rechazado al inicio              | Inspeccione los registros para `BOT_COMMANDS_TOO_MUCH`                            | Reduzca los complementos/habilidades/comandos personalizados de Telegram o deshabilite los menús nativos.                                          |
| Actualizado y la lista de permitidos le bloquea  | `openclaw security audit` y listas de permitidas de configuración                 | Ejecute `openclaw doctor --fix` o reemplace `@username` con ID de remitente numéricos.                                                             |

Solución de problemas completa: [Solución de problemas de Telegram](/es/channels/telegram#troubleshooting)

## Discord

### Signaturas de fallo de Discord

| Síntoma                                                | Verificación más rápida                                                                                                         | Solución                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bot en línea pero sin respuestas del gremio            | `openclaw channels status --probe`                                                                                              | Permitir gremio/canal y verificar el intento de contenido del mensaje.                                                                                                                                                                                                                                                |
| Mensajes de grupo ignorados                            | Verifique los registros para ver si hay eliminaciones por filtrado de menciones                                                 | Mencione el bot o configure `requireMention: false` de gremio/canal.                                                                                                                                                                                                                                                  |
| Uso de escritura/tokens pero ningún mensaje de Discord | Verifique si este es un evento de sala ambiental o una sala `message_tool` optada donde el modelo perdió `message(action=send)` | Inspecciona el registro detallado de la puerta de enlace en busca de metadatos de carga final suprimidos, verifica `messages.groupChat.unmentionedInbound`, lee [Ambient room events](/es/channels/ambient-room-events) o mantén `messages.groupChat.visibleReplies: "automatic"` para solicitudes de grupo normales. |
| Faltan respuestas de MD                                | `openclaw pairing list discord`                                                                                                 | Aprueba el emparejamiento de MD o ajusta la política de MD.                                                                                                                                                                                                                                                           |

Solución de problemas completa: [Discord troubleshooting](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallo de Slack

| Síntoma                                      | Verificación más rápida                                   | Solución                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo de socket conectado pero sin respuestas | `openclaw channels status --probe`                        | Verifica el token de la aplicación + token del bot y los alcances requeridos; vigila `botTokenStatus` / `appTokenStatus = configured_unavailable` en configuraciones respaldadas por SecretRef. |
| MD bloqueados                                | `openclaw pairing list slack`                             | Aprueba el emparejamiento o relaja la política de MD.                                                                                                                                           |
| Mensaje de canal ignorado                    | Verifica `groupPolicy` y la lista de permitidos del canal | Permita el canal o cambie la política a `open`.                                                                                                                                                 |

Solución de problemas completa: [Solución de problemas de Slack](/es/channels/slack#troubleshooting)

## iMessage

### Firmas de fallo de iMessage

| Síntoma                                           | Verificación más rápida                                                          | Solución                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `imsg` falta o falla en sistemas que no son macOS | `openclaw channels status --probe --channel imessage`                            | Ejecute OpenClaw en el Mac de Messages o use un contenedor SSH para `cliPath`. |
| Puede enviar pero no recibir en macOS             | Verifique los permisos de privacidad de macOS para la automatización de Messages | Vuelva a otorgar permisos TCC y reinicie el proceso del canal.                 |
| Remitente de MD bloqueado                         | `openclaw pairing list imessage`                                                 | Aprobar el emparejamiento o actualizar la lista de permitidos.                 |

Solución de problemas completa:

- [Solución de problemas de iMessage](/es/channels/imessage#troubleshooting)

## Signal

### Firmas de fallo de Signal

| Síntoma                                                   | Verificación más rápida                                              | Solución                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| El demonio es accesible pero el bot permanece en silencio | `openclaw channels status --probe`                                   | Verifique la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                                              | `openclaw pairing list signal`                                       | Apruebe al remitente o ajuste la política de MD.                         |
| Las respuestas del grupo no se activan                    | Verifique la lista de permitidos del grupo y los patrones de mención | Añada el remitente/grupo o relaje las restricciones.                     |

Solución completa de problemas: [Solución de problemas de Signal](/es/channels/signal#troubleshooting)

## Bot de QQ

### Firmas de fallo del Bot de QQ

| Síntoma                             | Verificación más rápida                                     | Solución                                                                  |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| El bot responde "se ha ido a Marte" | Verifique `appId` y `clientSecret` en la configuración      | Establezca las credenciales o reinicie la puerta de enlace.               |
| Sin mensajes entrantes              | `openclaw channels status --probe`                          | Verifique las credenciales en la Plataforma Abierta de QQ.                |
| Voz no transcrita                   | Verifique la configuración del proveedor STT                | Configure `channels.qqbot.stt` o `tools.media.audio`.                     |
| Mensajes proactivos no llegan       | Verifique los requisitos de interacción de la plataforma QQ | QQ puede bloquear mensajes iniciados por el bot sin interacción reciente. |

Solución de problemas completa: [Solución de problemas de QQ Bot](/es/channels/qqbot#troubleshooting)

## Matrix

### Signaturas de fallo de Matrix

| Síntoma                                                      | Verificación más rápida                | Solución                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sesión iniciada pero ignora mensajes de la sala              | `openclaw channels status --probe`     | Verificar `groupPolicy`, lista blanca de salas y filtrado de menciones.                                          |
| Los MD no se procesan                                        | `openclaw pairing list matrix`         | Aprobar al remitente o ajustar la política de MD.                                                                |
| Las salas cifradas fallan                                    | `openclaw matrix verify status`        | Verificar el dispositivo nuevamente y luego verificar `openclaw matrix verify backup status`.                    |
| La restauración de la copia de seguridad está pendiente/rota | `openclaw matrix verify backup status` | Ejecutar `openclaw matrix verify backup restore` o volver a ejecutar con una clave de recuperación.              |
| El cross-signing/bootstrap parece incorrecto                 | `openclaw matrix verify bootstrap`     | Reparar el almacenamiento de secretos, el cross-signing y el estado de la copia de seguridad en una sola pasada. |

Configuración y configuración completa: [Matrix](/es/channels/matrix)

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Solución de problemas de la pasarela](/es/gateway/troubleshooting)

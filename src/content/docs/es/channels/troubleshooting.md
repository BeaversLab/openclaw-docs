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

| Síntoma                                             | Verificación más rápida                                                  | Solución                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Conectado pero sin respuestas de MD                 | `openclaw pairing list whatsapp`                                         | Apruebe el remitente o cambie la política/lista de permitidos de MD.                  |
| Mensajes de grupo ignorados                         | Verifique `requireMention` + patrones de mención en la configuración     | Mencione al bot o relaje la política de menciones para ese grupo.                     |
| El inicio de sesión con QR se agota con 408         | Verifique el entorno `HTTPS_PROXY` / `HTTP_PROXY` de la puerta de enlace | Configure un proxy accesible; use `NO_PROXY` solo para omisiones.                     |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros                           | Vuelva a iniciar sesión y verifique que el directorio de credenciales esté saludable. |

Solución de problemas completa: [Solución de problemas de WhatsApp](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de fallo de Telegram

| Síntoma                                          | Verificación más rápida                                                           | Solución                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable  | `openclaw pairing list telegram`                                                  | Apruebe el emparejamiento o cambie la política de MD.                                                                                       |
| Bot en línea pero el grupo permanece en silencio | Verifique el requisito de mención y el modo de privacidad del bot                 | Desactive el modo de privacidad para la visibilidad del grupo o mencione al bot.                                                            |
| Fallos de envío con errores de red               | Inspeccione los registros en busca de fallos en las llamadas a la API de Telegram | Corrija el enrutamiento DNS/IPv6/proxy hacia `api.telegram.org`.                                                                            |
| El sondeo se bloquea o se reconecta lentamente   | `openclaw logs --follow` para diagnósticos de sondeo                              | Actualice; si los reinicios son falsos positivos, ajuste `pollingStallThresholdMs`. Los bloqueos persistentes aún apuntan a proxy/DNS/IPv6. |
| `setMyCommands` rechazado al iniciar             | Inspeccione los registros para `BOT_COMMANDS_TOO_MUCH`                            | Reduzca los comandos personalizados de complemento/habilidad/Telegram o desactive los menús nativos.                                        |
| Actualizado y la lista de permitidos le bloquea  | `openclaw security audit` y listas de permitidas en la configuración              | Ejecute `openclaw doctor --fix` o reemplace `@username` con ID de remitente numéricos.                                                      |

Solución de problemas completa: [Solución de problemas de Telegram](/es/channels/telegram#troubleshooting)

## Discord

### Firmas de fallo de Discord

| Síntoma                                       | Verificación más rápida                                      | Solución                                                                |
| --------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Bot en línea pero sin respuestas del servidor | `openclaw channels status --probe`                           | Permitir servidor/canal y verificar el intento de contenido de mensaje. |
| Mensajes de grupo ignorados                   | Verificar registros para descartes por filtrado de menciones | Mencionar al bot o configurar servidor/canal `requireMention: false`.   |
| Faltan respuestas de MD                       | `openclaw pairing list discord`                              | Aprobar el emparejamiento de MD o ajustar la política de MD.            |

Solución de problemas completa: [Solución de problemas de Discord](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallo de Slack

| Síntoma                                   | Verificación más rápida                                 | Solución                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo socket conectado pero sin respuestas | `openclaw channels status --probe`                      | Verificar token de aplicación + token de bot y alcances requeridos; vigilar `botTokenStatus` / `appTokenStatus = configured_unavailable` en configuraciones con respaldo de SecretRef. |
| MD bloqueados                             | `openclaw pairing list slack`                           | Aprobar el emparejamiento o relajar la política de MD.                                                                                                                                 |
| Mensaje de canal ignorado                 | Verificar `groupPolicy` y lista de permitidos del canal | Permitir el canal o cambiar la política a `open`.                                                                                                                                      |

Solución de problemas completa: [Solución de problemas de Slack](/es/channels/slack#troubleshooting)

## iMessage y BlueBubbles

### Firmas de fallo de iMessage y BlueBubbles

| Síntoma                              | Verificación más rápida                                                          | Solución                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Sin eventos entrantes                | Verificar la accesibilidad del webhook/servidor y los permisos de la aplicación  | Corregir la URL del webhook o el estado del servidor BlueBubbles. |
| Puede enviar pero no recibe en macOS | Verificar los permisos de privacidad de macOS para la automatización de Mensajes | Volver a otorgar permisos TCC y reiniciar el proceso del canal.   |
| Remitente de MD bloqueado            | `openclaw pairing list imessage` o `openclaw pairing list bluebubbles`           | Aprobar el emparejamiento o actualizar la lista de permitidos.    |

Solución de problemas completa:

- [Solución de problemas de iMessage](/es/channels/imessage#troubleshooting)
- [Solución de problemas de BlueBubbles](/es/channels/bluebubbles#troubleshooting)

## Signal

### Firmas de fallo de Signal

| Síntoma                               | Verificación más rápida                                              | Solución                                                              |
| ------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Demonio accesible pero bot silencioso | `openclaw channels status --probe`                                   | Verificar URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                          | `openclaw pairing list signal`                                       | Aprobar el remitente o ajustar la política de MD.                     |
| Las respuestas de grupo no se activan | Verificar la lista de permitidos del grupo y los patrones de mención | Añadir remitente/grupo o relajar el filtrado.                         |

Solución de problemas completa: [Solución de problemas de Signal](/es/channels/signal#troubleshooting)

## Bot de QQ

### Firmas de fallo del Bot de QQ

| Síntoma                             | Verificación más rápida                                    | Solución                                                                          |
| ----------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| El bot responde "se ha ido a Marte" | Verifica `appId` y `clientSecret` en la configuración      | Establece las credenciales o reinicia la puerta de enlace.                        |
| No hay mensajes entrantes           | `openclaw channels status --probe`                         | Verifica las credenciales en la Plataforma Abierta de QQ.                         |
| Voz no transcrita                   | Verifica la configuración del proveedor STT                | Configura `channels.qqbot.stt` o `tools.media.audio`.                             |
| Mensajes proactivos no llegan       | Verifica los requisitos de interacción de la plataforma QQ | QQ puede bloquear los mensajes iniciados por el bot sin una interacción reciente. |

Solución de problemas completa: [Solución de problemas del Bot de QQ](/es/channels/qqbot#troubleshooting)

## Matrix

### Firmas de fallos de Matrix

| Síntoma                                                      | Verificación más rápida                | Solución                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Sesión iniciada pero ignora mensajes de la sala              | `openclaw channels status --probe`     | Verifica `groupPolicy`, la lista blanca de salas y el filtrado de menciones.                                 |
| Los MD no se procesan                                        | `openclaw pairing list matrix`         | Aprueba al remitente o ajusta la política de MD.                                                             |
| Las salas cifradas fallan                                    | `openclaw matrix verify status`        | Vuelve a verificar el dispositivo, luego verifica `openclaw matrix verify backup status`.                    |
| La restauración de la copia de seguridad está pendiente/rota | `openclaw matrix verify backup status` | Ejecuta `openclaw matrix verify backup restore` o vuelve a ejecutar con una clave de recuperación.           |
| El arranque/firma cruzada parece incorrecto                  | `openclaw matrix verify bootstrap`     | Repara el almacenamiento de secretos, la firma cruzada y el estado de la copia de seguridad en un solo paso. |

Configuración completa: [Matrix](/es/channels/matrix)

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)

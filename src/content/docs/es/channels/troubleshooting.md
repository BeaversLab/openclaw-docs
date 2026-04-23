---
summary: "Solución rápida de problemas a nivel de canal con firmas de fallo y correcciones por canal"
read_when:
  - Channel transport says connected but replies fail
  - You need channel specific checks before deep provider docs
title: "Solución de problemas del canal"
---

# Solución de problemas del canal

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

## WhatsApp

### Firmas de fallo de WhatsApp

| Síntoma                                             | Verificación más rápida                                              | Solución                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Conectado pero sin respuestas en MD                 | `openclaw pairing list whatsapp`                                     | Aprobar el remitente o cambiar la política/lista blanca de MD.                       |
| Mensajes de grupo ignorados                         | Verificar `requireMention` + patrones de mención en la configuración | Mencione el bot o relaje la política de mención para ese grupo.                      |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros                       | Vuelva a iniciar sesión y verifique que el directorio de credenciales esté correcto. |

Solución de problemas completa: [/channels/whatsapp#troubleshooting](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de fallo de Telegram

| Síntoma                                                | Verificación más rápida                                                        | Solución                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable        | `openclaw pairing list telegram`                                               | Aprobar el emparejamiento o cambiar la política de MD.                                                                                              |
| Bot en línea pero el grupo permanece en silencio       | Verificar el requisito de mención y el modo de privacidad del bot              | Desactivar el modo de privacidad para la visibilidad del grupo o mencionar al bot.                                                                  |
| Fallos de envío con errores de red                     | Inspeccionar los registros en busca de fallos de llamadas a la API de Telegram | Corregir el enrutamiento de DNS/IPv6/proxy hacia `api.telegram.org`.                                                                                |
| El sondeo se detiene o se vuelve a conectar lentamente | `openclaw logs --follow` para diagnósticos de sondeo                           | Actualice; si los reinicios son falsos positivos, ajuste `pollingStallThresholdMs`. Las detenciones persistentes siguen apuntando a proxy/DNS/IPv6. |
| `setMyCommands` rechazado al inicio                    | Inspeccionar los registros para `BOT_COMMANDS_TOO_MUCH`                        | Reducir los comandos personalizados/complementos/habilidades de Telegram o desactivar los menús nativos.                                            |
| Actualizado y la lista blanca le bloquea               | `openclaw security audit` y listas blancas de configuración                    | Ejecutar `openclaw doctor --fix` o reemplazar `@username` con ID de remitente numéricos.                                                            |

Solución de problemas completa: [/channels/telegram#troubleshooting](/es/channels/telegram#troubleshooting)

## Discord

### Firmas de fallo de Discord

| Síntoma                                     | Verificación más rápida                                       | Solución                                                               |
| ------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Bot en línea pero sin respuestas del gremio | `openclaw channels status --probe`                            | Permitir gremio/canal y verificar el intento de contenido del mensaje. |
| Mensajes de grupo ignorados                 | Verificar los registros para caídas por filtrado de menciones | Mencionar al bot o establecer guild/canal `requireMention: false`.     |
| Faltan respuestas de MD                     | `openclaw pairing list discord`                               | Apruebe el emparejamiento de MD o ajuste la política de MD.            |

Solución de problemas completa: [/channels/discord#troubleshooting](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallo de Slack

| Síntoma                                      | Verificación más rápida                              | Solución                                                                                                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modo de socket conectado pero sin respuestas | `openclaw channels status --probe`                   | Verifique el token de la aplicación + el token del bot y los alcances necesarios; preste atención a `botTokenStatus` / `appTokenStatus = configured_unavailable` en configuraciones respaldadas por SecretRef. |
| MD bloqueados                                | `openclaw pairing list slack`                        | Apruebe el emparejamiento o relaje la política de MD.                                                                                                                                                          |
| Mensaje de canal ignorado                    | Verifique `groupPolicy` y la lista blanca de canales | Permita el canal o cambie la política a `open`.                                                                                                                                                                |

Solución de problemas completa: [/channels/slack#troubleshooting](/es/channels/slack#troubleshooting)

## iMessage y BlueBubbles

### Firmas de fallo de iMessage y BlueBubbles

| Síntoma                               | Verificación más rápida                                                          | Solución                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Sin eventos entrantes                 | Verifique la accesibilidad del webhook/servidor y los permisos de la aplicación  | Corrija la URL del webhook o el estado del servidor de BlueBubbles. |
| Puede enviar pero no recibir en macOS | Verifique los permisos de privacidad de macOS para la automatización de Mensajes | Vuelva a otorgar los permisos TCC y reinicie el proceso del canal.  |
| Remitente de MD bloqueado             | `openclaw pairing list imessage` o `openclaw pairing list bluebubbles`           | Apruebe el emparejamiento o actualice la lista blanca.              |

Solución de problemas completa:

- [/channels/imessage#troubleshooting](/es/channels/imessage#troubleshooting)
- [/channels/bluebubbles#troubleshooting](/es/channels/bluebubbles#troubleshooting)

## Signal

### Firmas de fallo de Signal

| Síntoma                                | Verificación más rápida                                       | Solución                                                                 |
| -------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Demonio accesible pero bot silencioso  | `openclaw channels status --probe`                            | Verifique la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                           | `openclaw pairing list signal`                                | Apruebe el remitente o ajuste la política de MD.                         |
| Las respuestas del grupo no se activan | Verifique la lista blanca de grupos y los patrones de mención | Agregue el remitente/grupo o afloje el filtrado.                         |

Solución de problemas completa: [/channels/signal#troubleshooting](/es/channels/signal#troubleshooting)

## Bot de QQ

### Firmas de fallo del Bot de QQ

| Síntoma                             | Verificación más rápida                                     | Solución                                                                          |
| ----------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| El bot responde "se ha ido a Marte" | Verifique `appId` y `clientSecret` en la configuración      | Establezca las credenciales o reinicie la puerta de enlace.                       |
| No hay mensajes entrantes           | `openclaw channels status --probe`                          | Verifique las credenciales en la Plataforma Abierta de QQ.                        |
| Voz no transcrita                   | Verifique la configuración del proveedor STT                | Configure `channels.qqbot.stt` o `tools.media.audio`.                             |
| Los mensajes proactivos no llegan   | Verifique los requisitos de interacción de la plataforma QQ | QQ puede bloquear los mensajes iniciados por el bot sin una interacción reciente. |

Solución de problemas completa: [/channels/qqbot#troubleshooting](/es/channels/qqbot#troubleshooting)

## Matrix

### Signaturas de fallo de Matrix

| Síntoma                                                      | Verificación más rápida                | Solución                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Sesión iniciada pero ignora mensajes de la sala              | `openclaw channels status --probe`     | Verifique `groupPolicy`, la lista blanca de salas y el filtrado de menciones.                                   |
| Los MD no se procesan                                        | `openclaw pairing list matrix`         | Apruebe al remitente o ajuste la política de MD.                                                                |
| Fallo en salas cifradas                                      | `openclaw matrix verify status`        | Vuelva a verificar el dispositivo y luego revise `openclaw matrix verify backup status`.                        |
| La restauración de la copia de seguridad está pendiente/rota | `openclaw matrix verify backup status` | Ejecute `openclaw matrix verify backup restore` o vuelva a ejecutar con una clave de recuperación.              |
| El arranque/firma cruzada parece incorrecto                  | `openclaw matrix verify bootstrap`     | Repare el almacenamiento de secretos, la firma cruzada y el estado de la copia de seguridad en una sola pasada. |

Configuración completa: [Matrix](/es/channels/matrix)

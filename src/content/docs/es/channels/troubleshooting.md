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
- `RPC probe: ok`
- El sondeo del canal muestra conectado/listo

## WhatsApp

### Firmas de fallo de WhatsApp

| Síntoma                                             | Verificación más rápida                                              | Solución                                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Conectado pero sin respuestas de MD                 | `openclaw pairing list whatsapp`                                     | Apruebe el remitente o cambie la política/lista de permitidos de MD.                  |
| Mensajes de grupo ignorados                         | Verifique `requireMention` + patrones de mención en la configuración | Mencione al bot o relaje la política de menciones para ese grupo.                     |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros                       | Vuelva a iniciar sesión y verifique que el directorio de credenciales esté saludable. |

Solución de problemas completa: [/channels/whatsapp#troubleshooting](/es/channels/whatsapp#troubleshooting)

## Telegram

### Firmas de fallo de Telegram

| Síntoma                                         | Verificación más rápida                                                        | Solución                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable | `openclaw pairing list telegram`                                               | Apruebe el emparejamiento o cambie la política de MD.                                                   |
| Bot en línea pero el grupo permanece silencioso | Verifique el requisito de mención y el modo de privacidad del bot              | Desactive el modo de privacidad para la visibilidad del grupo o mencione al bot.                        |
| Fallos de envío con errores de red              | Inspeccione los registros para ver fallos en las llamadas a la API de Telegram | Corrija el enrutamiento DNS/IPv6/proxy hacia `api.telegram.org`.                                        |
| `setMyCommands` rechazado al inicio             | Inspeccione los registros para `BOT_COMMANDS_TOO_MUCH`                         | Reduzca los comandos personalizados de complemento/habilidad/de Telegram o desactive los menús nativos. |
| Actualizado y la lista de permitidos le bloquea | `openclaw security audit` y listas de permitidos de configuración              | Ejecute `openclaw doctor --fix` o reemplace `@username` con ID de remitente numéricos.                  |

Solución de problemas completa: [/channels/telegram#troubleshooting](/es/channels/telegram#troubleshooting)

## Discord

### Firmas de fallo de Discord

| Síntoma                                     | Verificación más rápida                                          | Solución                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Bot en línea pero sin respuestas del gremio | `openclaw channels status --probe`                               | Permita el gremio/canal y verifique el intento de contenido del mensaje. |
| Mensajes de grupo ignorados                 | Verifique los registros para descartes por filtrado de menciones | Menciona el bot o establece el servidor/canal `requireMention: false`.   |
| Faltan respuestas de MD                     | `openclaw pairing list discord`                                  | Aprueba el emparejamiento por MD o ajusta la política de MD.             |

Solución de problemas completa: [/channels/discord#troubleshooting](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallos de Slack

| Síntoma                                   | Verificación más rápida                                   | Solución                                                                     |
| ----------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Modo socket conectado pero sin respuestas | `openclaw channels status --probe`                        | Verifica el token de la aplicación + token del bot y los ámbitos requeridos. |
| MD bloqueados                             | `openclaw pairing list slack`                             | Aprueba el emparejamiento o relaja la política de MD.                        |
| Mensaje del canal ignorado                | Verifica `groupPolicy` y la lista de permitidos del canal | Permite el canal o cambia la política a `open`.                              |

Solución de problemas completa: [/channels/slack#troubleshooting](/es/channels/slack#troubleshooting)

## iMessage y BlueBubbles

### Firmas de fallos de iMessage y BlueBubbles

| Síntoma                               | Verificación más rápida                                                         | Solución                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Sin eventos entrantes                 | Verifica la accesibilidad del webhook/servidor y los permisos de la aplicación  | Corrige la URL del webhook o el estado del servidor BlueBubbles.   |
| Puede enviar pero no recibir en macOS | Verifica los permisos de privacidad de macOS para la automatización de Mensajes | Vuelve a otorgar los permisos TCC y reinicia el proceso del canal. |
| Remitente de MD bloqueado             | `openclaw pairing list imessage` o `openclaw pairing list bluebubbles`          | Aprueba el emparejamiento o actualiza la lista de permitidos.      |

Solución de problemas completa:

- [/channels/imessage#troubleshooting](/es/channels/imessage#troubleshooting)
- [/channels/bluebubbles#troubleshooting](/es/channels/bluebubbles#troubleshooting)

## Signal

### Firmas de fallos de Signal

| Síntoma                                       | Verificación más rápida                                             | Solución                                                                |
| --------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Demonio accesible pero el bot está silencioso | `openclaw channels status --probe`                                  | Verifica la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                                  | `openclaw pairing list signal`                                      | Aprueba el remitente o ajusta la política de MD.                        |
| Las respuestas de grupo no se activan         | Verifica la lista de permitidos del grupo y los patrones de mención | Agrega el remitente/grupo o relaja el filtrado.                         |

Solución de problemas completa: [/channels/signal#troubleshooting](/es/channels/signal#troubleshooting)

## Matrix

### Firmas de fallos de Matrix

| Síntoma                                             | Verificación más rápida                                     | Solución                                                       |
| --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Sesión iniciada pero ignora los mensajes de la sala | `openclaw channels status --probe`                          | Verifica `groupPolicy` y la lista de permitidos de la sala.    |
| Los MD no se procesan                               | `openclaw pairing list matrix`                              | Aprobar remitente o ajustar la política de MD.                 |
| Fallo en salas cifradas                             | Verificar módulo de criptografía y configuración de cifrado | Habilitar soporte de cifrado y volver a unir/sincronizar sala. |

Configuración completa: [Matrix](/es/channels/matrix)

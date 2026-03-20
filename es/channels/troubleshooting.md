---
summary: "Solución de problemas rápida a nivel de canal con firmas de error y soluciones por canal"
read_when:
  - El transporte del canal indica que está conectado pero las respuestas fallan
  - Necesitas comprobaciones específicas del canal antes de profundizar en la documentación del proveedor
title: "Solución de problemas del canal"
---

# Solución de problemas del canal

Usa esta página cuando un canal se conecta pero el comportamiento es incorrecto.

## Escalera de comandos

Ejecuta estos en orden primero:

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

### Firmas de error de WhatsApp

| Síntoma                         | Comprobación más rápida                                       | Solución                                                     |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Conectado pero sin respuestas de MD     | `openclaw pairing list whatsapp`                    | Aprueba el remitente o cambia la política/lista de permitidos de MD.           |
| Mensajes de grupo ignorados          | Comprueba `requireMention` + patrones de mención en la configuración | Menciona al bot o relaja la política de mención para ese grupo. |
| Bucles aleatorios de desconexión/reinicio de sesión | `openclaw channels status --probe` + registros           | Vuelve a iniciar sesión y verifica que el directorio de credenciales esté saludable.   |

Solución de problemas completa: [/channels/whatsapp#troubleshooting-quick](/es/channels/whatsapp#troubleshooting-quick)

## Telegram

### Firmas de error de Telegram

| Síntoma                             | Comprobación más rápida                                   | Solución                                                                         |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `/start` pero sin flujo de respuesta utilizable   | `openclaw pairing list telegram`                | Aprueba el emparejamiento o cambia la política de MD.                                        |
| Bot en línea pero el grupo permanece en silencio   | Verifica el requisito de mención y el modo de privacidad del bot | Deshabilita el modo de privacidad para la visibilidad del grupo o menciona al bot.                   |
| Fallos de envío con errores de red   | Inspecciona los registros en busca de fallos en las llamadas a la API de Telegram     | Soluciona el enrutamiento DNS/IPv6/proxy hacia `api.telegram.org`.                           |
| `setMyCommands` rechazado al inicio | Inspecciona los registros para `BOT_COMMANDS_TOO_MUCH`        | Reduce los complementos/habilidades/comandos personalizados de Telegram o deshabilita los menús nativos.       |
| Actualizado y la lista de permitidos te bloquea   | `openclaw security audit` y listas de permitidos de configuración | Ejecuta `openclaw doctor --fix` o reemplaza `@username` con IDs de remitente numéricos. |

Solución de problemas completa: [/channels/telegram#troubleshooting](/es/channels/telegram#troubleshooting)

## Discord

### Firmas de error de Discord

| Síntoma                         | Comprobación más rápida                       | Solución                                                       |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------- |
| Bot en línea pero sin respuestas del servidor | `openclaw channels status --probe`  | Permite el servidor/canal y verifica el intento de contenido del mensaje.    |
| Mensajes de grupo ignorados          | Busca en los registros menciones de drops de filtrado (gating) | Menciona al bot o establece el gremio/canal `requireMention: false`. |
| Faltan respuestas de MD              | `openclaw pairing list discord`     | Aprueba el emparejamiento de MD o ajusta la política de MD.                   |

Solución de problemas completa: [/channels/discord#troubleshooting](/es/channels/discord#troubleshooting)

## Slack

### Firmas de fallos de Slack

| Síntoma                                | Verificación más rápida                             | Solución                                               |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Modo de conexión conectado pero sin respuestas | `openclaw channels status --probe`        | Verifica el token de la aplicación + token del bot y los alcances necesarios. |
| MD bloqueados                            | `openclaw pairing list slack`             | Aprueba el emparejamiento o relaja la política de MD.               |
| Mensaje del canal ignorado                | Verifica `groupPolicy` y la lista blanca de canales | Permite el canal o cambia la política a `open`.     |

Solución de problemas completa: [/channels/slack#troubleshooting](/es/channels/slack#troubleshooting)

## iMessage y BlueBubbles

### Firmas de fallos de iMessage y BlueBubbles

| Síntoma                          | Verificación más rápida                                                           | Solución                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Sin eventos entrantes                | Verifica la accesibilidad del webhook/servidor y los permisos de la aplicación                  | Corrige la URL del webhook o el estado del servidor BlueBubbles.          |
| Puede enviar pero no recibir en macOS | Verifica los permisos de privacidad de macOS para la automatización de Mensajes                 | Vuelve a otorgar los permisos TCC y reinicia el proceso del canal. |
| Remitente de MD bloqueado                | `openclaw pairing list imessage` o `openclaw pairing list bluebubbles` | Aprueba el emparejamiento o actualiza la lista blanca.                  |

Solución de problemas completa:

- [/channels/imessage#troubleshooting-macos-privacy-and-security-tcc](/es/channels/imessage#troubleshooting-macos-privacy-and-security-tcc)
- [/channels/bluebubbles#troubleshooting](/es/channels/bluebubbles#troubleshooting)

## Signal

### Firmas de fallos de Signal

| Síntoma                         | Verificación más rápida                              | Solución                                                      |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| Demonio accesible pero el bot está silencioso | `openclaw channels status --probe`         | Verifica la URL/cuenta del demonio `signal-cli` y el modo de recepción. |
| MD bloqueado                      | `openclaw pairing list signal`             | Aprueba el remitente o ajusta la política de MD.                      |
| Las respuestas de grupo no activan    | Verifica la lista blanca de grupos y los patrones de mención | Añade el remitente/grupo o relaja el filtrado.                       |

Solución de problemas completa: [/channels/signal#troubleshooting](/es/channels/signal#troubleshooting)

## Matrix

### Firmas de fallos de Matrix

| Síntoma                             | Verificación más rápida                                | Solución                                             |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Sesión iniciada pero ignora mensajes de sala | `openclaw channels status --probe`           | Verifica `groupPolicy` y la lista blanca de salas.         |
| Los MD no se procesan                  | `openclaw pairing list matrix`               | Aprobar remitente o ajustar política de MD.             |
| Fallo en salas cifradas                | Verificar módulo de cifrado y configuración de cifrado | Habilitar compatibilidad de cifrado y volver a unir/sincronizar sala. |

Solución de problemas completa: [/channels/matrix#troubleshooting](/es/channels/matrix#troubleshooting)

import en from "/components/footer/en.mdx";

<en />

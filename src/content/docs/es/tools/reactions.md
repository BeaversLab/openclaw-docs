---
summary: "Semántica de la herramienta de reacciones en todos los canales compatibles"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reacciones"
---

El agente puede agregar y eliminar reacciones de emoji en los mensajes utilizando la herramienta `message` con la acción `react`. El comportamiento de la reacción varía según el canal y el transporte.

## Cómo funciona

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- Se requiere `emoji` al agregar una reacción.
- Establezca `emoji` en una cadena vacía (`""`) para eliminar la(s) reacción(es) del bot.
- Establezca `remove: true` para eliminar un emoji específico (requiere `emoji` no vacío).
- En los canales que admiten reacciones de estado, `trackToolCalls: true` en una reacción permite que el tiempo de ejecución use ese mensaje con reacción para reacciones de progreso de herramientas posteriores durante el mismo turno.

## Comportamiento del canal

<AccordionGroup>
  <Accordion title="Discord y Slack">
    - `emoji` vacío elimina todas las reacciones del bot en el mensaje.
    - `remove: true` elimina solo el emoji especificado.

  </Accordion>

  <Accordion title="Google Chat">
    - `emoji` vacío elimina las reacciones de la aplicación en el mensaje.
    - `remove: true` elimina solo el emoji especificado.

  </Accordion>

  <Accordion title="Nextcloud Talk">
    - Solo agregar reacciones: `emoji` es obligatorio y debe no estar vacío.
    - La eliminación de reacciones aún no es compatible; las llamadas con `remove: true` (o `emoji` vacío) se rechazan con un error claro en lugar de no hacer nada silenciosamente.
    - Requiere que el bot de Talk esté registrado con la característica `reaction` (consulte la [documentación del canal Nextcloud Talk](/es/channels/nextcloud-talk)).

  </Accordion>

  <Accordion title="Telegram">
    - `emoji` vacío elimina las reacciones del bot.
    - `remove: true` también elimina las reacciones pero aún requiere un `emoji` no vacío para la validación de la herramienta.

  </Accordion>

  <Accordion title="WhatsApp">
    - Un `emoji` vacío elimina la reacción del bot.
    - `remove: true` se asigna internamente a un emoji vacío (aún requiere `emoji` en la llamada a la herramienta).
    - WhatsApp tiene una ranura de reacción del bot por mensaje; las actualizaciones de reacción de estado reemplazan esa ranura en lugar de apilar varios emoji.

  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - Requiere un `emoji` no vacío.
    - `remove: true` elimina esa reacción de emoji específica.

  </Accordion>

  <Accordion title="Feishu/Lark">
    - Use la herramienta `feishu_reaction` con las acciones `add`, `remove` y `list`.
    - Agregar/eliminar requiere `emoji_type`; eliminar también requiere `reaction_id`.

  </Accordion>

  <Accordion title="Signal">
    - Las notificaciones de reacción entrantes se controlan mediante `channels.signal.reactionNotifications`: `"off"` las desactiva, `"own"` (predeterminado) emite eventos cuando los usuarios reaccionan a los mensajes del bot, y `"all"` emite eventos para todas las reacciones.

  </Accordion>

  <Accordion title="iMessage">
    - Las reacciones salientes son tapbacks de iMessage (`love`, `like`, `dislike`, `laugh`, `emphasize` y `question`).
    - Las notificaciones de tapback entrantes se controlan mediante `channels.imessage.reactionNotifications`: `"off"` las desactiva, `"own"` (predeterminado) emite eventos cuando los usuarios reaccionan a los mensajes creados por el bot, y `"all"` emite eventos para todos los tapbacks de remitentes autorizados.

  </Accordion>
</AccordionGroup>

## Nivel de reacción

La configuración `reactionLevel` por canal controla la frecuencia con la que el agente utiliza las reacciones. Los valores suelen ser `off`, `ack`, `minimal` o `extensive`.

- [Telegram reactionLevel](/es/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/es/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

Configure `reactionLevel` en canales individuales para ajustar la frecuencia con la que el agente reacciona a los mensajes en cada plataforma.

## Relacionado

- [Agent Send](/es/tools/agent-send) — la herramienta `message` que incluye `react`
- [Channels](/es/channels) — configuración específica del canal

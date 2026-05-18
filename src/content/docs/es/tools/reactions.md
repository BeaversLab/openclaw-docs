---
summary: "Semántica de la herramienta de reacciones en todos los canales compatibles"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reacciones"
---

El agente puede añadir y eliminar reacciones de emoji en los mensajes utilizando la herramienta `message` con la acción `react`. El comportamiento de las reacciones varía según el canal y el transporte.

## Cómo funciona

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- Se requiere `emoji` al añadir una reacción.
- Establezca `emoji` en una cadena vacía (`""`) para eliminar la(s) reacción(es) del bot.
- Establezca `remove: true` para eliminar un emoji específico (requiere un `emoji` no vacío).
- En los canales que admiten reacciones de estado, `trackToolCalls: true` en una reacción permite que el tiempo de ejecución use ese mensaje con reacción para las reacciones de progreso de herramientas posteriores durante el mismo turno.

## Comportamiento del canal

<AccordionGroup>
  <Accordion title="Discord y Slack">
    - Un `emoji` vacío elimina todas las reacciones del bot en el mensaje.
    - `remove: true` elimina solo el emoji especificado.

  </Accordion>

  <Accordion title="Google Chat">
    - Un `emoji` vacío elimina las reacciones de la aplicación en el mensaje.
    - `remove: true` elimina solo el emoji especificado.

  </Accordion>

  <Accordion title="Telegram">
    - Un `emoji` vacío elimina las reacciones del bot.
    - `remove: true` también elimina las reacciones, pero aun así requiere un `emoji` no vacío para la validación de la herramienta.

  </Accordion>

  <Accordion title="WhatsApp">
    - Un `emoji` vacío elimina la reacción del bot.
    - `remove: true` se asigna internamente a un emoji vacío (aún requiere `emoji` en la llamada a la herramienta).
    - WhatsApp tiene un espacio de reacción del bot por mensaje; las actualizaciones de estado de reacción reemplazan ese espacio en lugar de apilar varios emojis.

  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - Requiere un `emoji` no vacío.
    - `remove: true` elimina esa reacción de emoji específica.

  </Accordion>

  <Accordion title="Feishu/Lark">
    - Usa la herramienta `feishu_reaction` con las acciones `add`, `remove` y `list`.
    - Añadir/eliminar requiere `emoji_type`; eliminar también requiere `reaction_id`.

  </Accordion>

  <Accordion title="Signal">
    - Las notificaciones de reacciones entrantes se controlan mediante `channels.signal.reactionNotifications`: `"off"` las desactiva, `"own"` (predeterminado) emite eventos cuando los usuarios reaccionan a los mensajes del bot y `"all"` emite eventos para todas las reacciones.

  </Accordion>

  <Accordion title="iMessage">
    - Las reacciones salientes son respuestas rápidas de iMessage (`love`, `like`, `dislike`, `laugh`, `emphasize` y `question`).
    - Las notificaciones de respuestas rápidas entrantes se controlan mediante `channels.imessage.reactionNotifications`: `"off"` las desactiva, `"own"` (predeterminado) emite eventos cuando los usuarios reaccionan a mensajes creados por el bot y `"all"` emite eventos para todas las respuestas rápidas de remitentes autorizados.

  </Accordion>
</AccordionGroup>

## Nivel de reacción

La configuración `reactionLevel` por canal controla la amplitud con la que el agente utiliza las reacciones. Los valores suelen ser `off`, `ack`, `minimal` o `extensive`.

- [Nivel de reacción de Telegram](/es/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [Nivel de reacción de WhatsApp](/es/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

Establece `reactionLevel` en canales individuales para ajustar con qué frecuencia reacciona el agente a los mensajes en cada plataforma.

## Relacionado

- [Envío del agente](/es/tools/agent-send) — la herramienta `message` que incluye `react`
- [Canales](/es/channels) — configuración específica del canal

---
summary: "Semántica de la herramienta de reacciones en todos los canales compatibles"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Reacciones"
---

# Reacciones

El agente puede añadir y eliminar reacciones con emoji en los mensajes utilizando la herramienta `message`
con la acción `react`. El comportamiento de las reacciones varía según el canal.

## Cómo funciona

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- `emoji` es obligatorio al añadir una reacción.
- Establezca `emoji` en una cadena vacía (`""`) para eliminar la(s) reacción(es) del bot.
- Establezca `remove: true` para eliminar un emoji específico (requiere `emoji` no vacío).

## Comportamiento del canal

<AccordionGroup>
  <Accordion title="Discord y Slack">
    - Un `emoji` vacío elimina todas las reacciones del bot en el mensaje.
    - `remove: true` elimina solo el emoji especificado.
  </Accordion>

<Accordion title="Google Chat">- Un `emoji` vacío elimina las reacciones de la aplicación en el mensaje. - `remove: true` elimina solo el emoji especificado.</Accordion>

<Accordion title="Telegram">- Un `emoji` vacío elimina las reacciones del bot. - `remove: true` también elimina las reacciones pero aún requiere un `emoji` no vacío para la validación de la herramienta.</Accordion>

<Accordion title="WhatsApp">- Un `emoji` vacío elimina la reacción del bot. - `remove: true` se asigna internamente a un emoji vacío (aún requiere `emoji` en la llamada a la herramienta).</Accordion>

<Accordion title="Zalo Personal (zalouser)">- Requiere un `emoji` no vacío. - `remove: true` elimina esa reacción de emoji específica.</Accordion>

  <Accordion title="Signal">
    - Las notificaciones de reacciones entrantes se controlan mediante `channels.signal.reactionNotifications`: `"off"` las desactiva, `"own"` (predeterminado) emite eventos cuando los usuarios reaccionan a los mensajes del bot y `"all"` emite eventos para todas las reacciones.
  </Accordion>
</AccordionGroup>

## Nivel de reacción

La configuración `reactionLevel` por canal controla qué tan ampliamente el agente usa las reacciones. Los valores son típicamente `off`, `ack`, `minimal`, o `extensive`.

- [Nivel de reacción de Telegram (reactionLevel)](/en/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [Nivel de reacción de WhatsApp (reactionLevel)](/en/channels/whatsapp#reactions) — `channels.whatsapp.reactionLevel`

Establezca `reactionLevel` en canales individuales para ajustar qué tan activamente reacciona el agente a los mensajes en cada plataforma.

## Relacionado

- [Envío del agente (Agent Send)](/en/tools/agent-send) — la herramienta `message` que incluye `react`
- [Canales (Channels)](/en/channels) — configuración específica del canal

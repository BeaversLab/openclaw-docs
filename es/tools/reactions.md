---
summary: "Semántica de reacción compartida entre canales"
read_when:
  - Working on reactions in any channel
title: "Reacciones"
---

# Herramientas de reacción

Semántica de reacción compartida entre canales:

- `emoji` es obligatorio al agregar una reacción.
- `emoji=""` elimina la(s) reacción(es) del bot cuando es compatible.
- `remove: true` elimina el emoji especificado cuando es compatible (requiere `emoji`).

Notas del canal:

- **Discord/Slack**: un `emoji` vacío elimina todas las reacciones del bot en el mensaje; `remove: true` elimina solo ese emoji.
- **Google Chat**: un `emoji` vacío elimina las reacciones de la aplicación en el mensaje; `remove: true` elimina solo ese emoji.
- **Telegram**: un `emoji` vacío elimina las reacciones del bot; `remove: true` también elimina las reacciones pero todavía requiere un `emoji` no vacío para la validación de la herramienta.
- **WhatsApp**: un `emoji` vacío elimina la reacción del bot; `remove: true` se asigna a un emoji vacío (aún requiere `emoji`).
- **Zalo Personal (`zalouser`)**: requiere un `emoji` no vacío; `remove: true` elimina esa reacción de emoji específica.
- **Signal**: las notificaciones de reacción entrantes emiten eventos del sistema cuando `channels.signal.reactionNotifications` está habilitado.

import es from "/components/footer/es.mdx";

<es />

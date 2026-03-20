---
summary: "Semántica de reacciones compartida en todos los canales"
read_when:
  - Trabajar en reacciones en cualquier canal
title: "Reacciones"
---

# Herramientas de reacción

Semántica de reacción compartida entre canales:

- `emoji` es obligatorio al agregar una reacción.
- `emoji=""` elimina la(s) reacción(es) del bot cuando es compatible.
- `remove: true` elimina el emoji especificado cuando es compatible (requiere `emoji`).

Notas del canal:

- **Discord/Slack**: `emoji` vacío elimina todas las reacciones del bot en el mensaje; `remove: true` elimina solo ese emoji.
- **Google Chat**: `emoji` vacío elimina las reacciones de la aplicación en el mensaje; `remove: true` elimina solo ese emoji.
- **Telegram**: `emoji` vacío elimina las reacciones del bot; `remove: true` también elimina las reacciones pero todavía requiere un `emoji` no vacío para la validación de la herramienta.
- **WhatsApp**: `emoji` vacío elimina la reacción del bot; `remove: true` asigna un emoji vacío (todavía requiere `emoji`).
- **Zalo Personal (`zalouser`)**: requiere `emoji` no vacío; `remove: true` elimina esa reacción de emoji específica.
- **Signal**: las notificaciones de reacciones entrantes emiten eventos del sistema cuando `channels.signal.reactionNotifications` está habilitado.

import es from "/components/footer/es.mdx";

<es />

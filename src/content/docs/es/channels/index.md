---
summary: "Plataformas de mensajería a las que OpenClaw puede conectarse"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Canales de chat"
---

OpenClaw puede hablar contigo en cualquier aplicación de chat que ya utilices. Cada canal se conecta a través del Gateway.
El texto es compatible en todas partes; los medios y las reacciones varían según el canal.

## Notas de entrega

- Las respuestas de Telegram que contienen sintaxis de imagen de markdown, como `![alt](url)`,
  se convierten en respuestas multimedia en la ruta de salida final cuando es posible.
- Los MD multipersonales de Slack se enrutan como chats grupales, por lo que la política de grupo, el comportamiento de mención
  y las reglas de sesión de grupo se aplican a las conversaciones MPIM.
- La configuración de WhatsApp es bajo demanda (install-on-demand): la incorporación puede mostrar el flujo de configuración antes de
  que se preparen las dependencias del tiempo de ejecución de Baileys, y el Gateway carga el tiempo de ejecución de WhatsApp
  solo cuando el canal está realmente activo.

## Canales compatibles

- [BlueBubbles](/es/channels/bluebubbles) — **Recomendado para iMessage**; utiliza la API REST del servidor de BlueBubbles para macOS con soporte completo de funciones (complemento incluido; editar, cancelar envío, efectos, reacciones, gestión de grupos — la edición actualmente está rota en macOS 26 Tahoe).
- [Discord](/es/channels/discord) — Bot API de Discord + Gateway; admite servidores, canales y MDs.
- [Feishu](/es/channels/feishu) — Bot de Feishu/Lark a través de WebSocket (complemento incluido).
- [Google Chat](/es/channels/googlechat) — Aplicación de API de Google Chat a través de webhook HTTP.
- [iMessage (heredado)](/es/channels/imessage) — Integración heredada de macOS a través de la CLI imsg (obsoleto, use BlueBubbles para nuevas configuraciones).
- [IRC](/es/channels/irc) — Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/es/channels/line) — Bot de la API de Mensajería LINE (complemento incluido).
- [Matrix](/es/channels/matrix) — Protocolo Matrix (complemento incluido).
- [Mattermost](/es/channels/mattermost) — Bot API + WebSocket; canales, grupos, MDs (complemento incluido).
- [Microsoft Teams](/es/channels/msteams) — Bot Framework; soporte empresarial (complemento incluido).
- [Nextcloud Talk](/es/channels/nextcloud-talk) — Chat autohospedado a través de Nextcloud Talk (complemento incluido).
- [Nostr](/es/channels/nostr) — MDs descentralizados a través de NIP-04 (complemento incluido).
- [QQ Bot](/es/channels/qqbot) — API de Bot de QQ; chat privado, chat de grupo y medios enriquecidos (complemento incluido).
- [Signal](/es/channels/signal) — signal-cli; centrado en la privacidad.
- [Slack](/es/channels/slack) — Bolt SDK; aplicaciones del espacio de trabajo.
- [Synology Chat](/es/channels/synology-chat) — Synology NAS Chat a través de webhooks de salida y entrada (complemento incluido).
- [Telegram](/es/channels/telegram) — Bot API a través de grammY; admite grupos.
- [Tlon](/es/channels/tlon) — mensajero basado en Urbit (complemento incluido).
- [Twitch](/es/channels/twitch) — chat de Twitch a través de conexión IRC (complemento incluido).
- [Voice Call](/es/plugins/voice-call) — Telefonía a través de Plivo o Twilio (complemento, instalado por separado).
- [WebChat](/es/web/webchat) — Interfaz de usuario de WebChat de Gateway a través de WebSocket.
- [WeChat](/es/channels/wechat) — Complemento Tencent iLink Bot a través de inicio de sesión con QR; solo chats privados (complemento externo).
- [WhatsApp](/es/channels/whatsapp) — El más popular; usa Baileys y requiere emparejamiento con QR.
- [Zalo](/es/channels/zalo) — API de Bot de Zalo; mensajero popular de Vietnam (complemento incluido).
- [Zalo Personal](/es/channels/zalouser) — cuenta personal de Zalo a través de inicio de sesión con QR (complemento incluido).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por cada chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento con QR y
  almacena más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/es/channels/groups).
- El emparejamiento de MD y las listas de permitidos se aplican por seguridad; consulte [Seguridad](/es/gateway/security).
- Solución de problemas: [Solución de problemas del canal](/es/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/es/providers/models).

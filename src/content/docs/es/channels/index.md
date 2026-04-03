---
summary: "Plataformas de mensajería a las que OpenClaw puede conectarse"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Canales de Chat"
---

# Canales de Chat

OpenClaw puede hablar contigo en cualquier aplicación de chat que ya utilices. Cada canal se conecta a través de la Pasarela (Gateway).
El texto es compatible en todas partes; los medios y las reacciones varían según el canal.

## Canales compatibles

- [BlueBubbles](/en/channels/bluebubbles) — **Recomendado para iMessage**; utiliza la API REST del servidor BlueBubbles para macOS con compatibilidad completa de funciones (editar, deshacer envío, efectos, reacciones, gestión de grupos — editar actualmente roto en macOS 26 Tahoe).
- [Discord](/en/channels/discord) — Bot API de Discord + Gateway; compatible con servidores, canales y MDs.
- [Feishu](/en/channels/feishu) — Bot de Feishu/Lark a través de WebSocket (complemento, instalado por separado).
- [Google Chat](/en/channels/googlechat) — Aplicación de API de Google Chat a través de webhook HTTP.
- [iMessage (heredado)](/en/channels/imessage) — Integración heredada de macOS a través de la CLI imsg (obsoleto, use BlueBubbles para nuevas configuraciones).
- [IRC](/en/channels/irc) — Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/en/channels/line) — Bot de API de mensajería de LINE (complemento, instalado por separado).
- [Matrix](/en/channels/matrix) — Protocolo Matrix (complemento, instalado por separado).
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket; canales, grupos, MDs (complemento, instalado por separado).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework; soporte empresarial (complemento, instalado por separado).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — Chat autohospedado a través de Nextcloud Talk (complemento, instalado por separado).
- [Nostr](/en/channels/nostr) — MDs descentralizados a través de NIP-04 (complemento, instalado por separado).
- [QQ Bot](/en/channels/qqbot) — Bot API de QQ; chat privado, chat de grupo y medios enriquecidos.
- [Signal](/en/channels/signal) — signal-cli; centrado en la privacidad.
- [Slack](/en/channels/slack) — Bolt SDK; aplicaciones de espacio de trabajo.
- [Synology Chat](/en/channels/synology-chat) — Synology NAS Chat vía webhooks de salida y entrada (complemento, instalado por separado).
- [Telegram](/en/channels/telegram) — Bot API vía grammY; admite grupos.
- [Tlon](/en/channels/tlon) — Mensajero basado en Urbit (complemento, instalado por separado).
- [Twitch](/en/channels/twitch) — Chat de Twitch vía conexión IRC (complemento, instalado por separado).
- [Voice Call](/en/plugins/voice-call) — Telefonía vía Plivo o Twilio (complemento, instalado por separado).
- [WebChat](/en/web/webchat) — Interfaz de usuario WebChat del Gateway sobre WebSocket.
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — Complemento de bot Tencent iLink vía login con QR; solo chats privados.
- [WhatsApp](/en/channels/whatsapp) — El más popular; usa Baileys y requiere emparejamiento con código QR.
- [Zalo](/en/channels/zalo) — Zalo Bot API; mensajero popular de Vietnam (complemento, instalado por separado).
- [Zalo Personal](/en/channels/zalouser) — Cuenta personal de Zalo vía login con QR (complemento, instalado por separado).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento con código QR y
  almacena más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/en/channels/groups).
- El emparejamiento DM y las listas de permitidos se aplican por seguridad; consulte [Seguridad](/en/gateway/security).
- Solución de problemas: [Solución de problemas de canales](/en/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/en/providers/models).

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

- [BlueBubbles](/en/channels/bluebubbles) — **Recomendado para iMessage**; utiliza la API REST del servidor BlueBubbles para macOS con soporte completo de funciones (complemento incluido; editar, enviar no leído, efectos, reacciones, gestión de grupos — editar actualmente roto en macOS 26 Tahoe).
- [Discord](/en/channels/discord) — Bot API de Discord + Gateway; compatible con servidores, canales y MDs.
- [Feishu](/en/channels/feishu) — Bot de Feishu/Lark vía WebSocket (complemento incluido).
- [Google Chat](/en/channels/googlechat) — Aplicación de API de Google Chat a través de webhook HTTP.
- [iMessage (heredado)](/en/channels/imessage) — Integración heredada de macOS a través de la CLI imsg (obsoleto, use BlueBubbles para nuevas configuraciones).
- [IRC](/en/channels/irc) — Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/en/channels/line) — Bot de la API de mensajería de LINE (complemento incluido).
- [Matrix](/en/channels/matrix) — Protocolo Matrix (complemento incluido).
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket; canales, grupos, MDs (complemento incluido).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework; soporte empresarial (complemento incluido).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — Chat autoalojado vía Nextcloud Talk (complemento incluido).
- [Nostr](/en/channels/nostr) — MDs descentralizados vía NIP-04 (complemento incluido).
- [QQ Bot](/en/channels/qqbot) — API de Bot de QQ; chat privado, chat grupal y contenido enriquecido (complemento incluido).
- [Signal](/en/channels/signal) — signal-cli; centrado en la privacidad.
- [Slack](/en/channels/slack) — Bolt SDK; aplicaciones de espacio de trabajo.
- [Synology Chat](/en/channels/synology-chat) — Chat de NAS Synology vía webhooks de salida y entrada (complemento incluido).
- [Telegram](/en/channels/telegram) — Bot API vía grammY; admite grupos.
- [Tlon](/en/channels/tlon) — Mensajero basado en Urbit (complemento incluido).
- [Twitch](/en/channels/twitch) — Chat de Twitch vía conexión IRC (complemento incluido).
- [Voice Call](/en/plugins/voice-call) — Telefonía vía Plivo o Twilio (complemento, instalado por separado).
- [WebChat](/en/web/webchat) — Interfaz de usuario WebChat del Gateway sobre WebSocket.
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — Complemento de bot Tencent iLink vía login con QR; solo chats privados.
- [WhatsApp](/en/channels/whatsapp) — El más popular; usa Baileys y requiere emparejamiento con código QR.
- [Zalo](/en/channels/zalo) — API de Bot de Zalo; el mensajero popular de Vietnam (complemento incluido).
- [Zalo Personal](/en/channels/zalouser) — Cuenta personal de Zalo vía inicio de sesión con QR (complemento incluido).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento con código QR y
  almacena más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/en/channels/groups).
- El emparejamiento DM y las listas de permitidos se aplican por seguridad; consulte [Seguridad](/en/gateway/security).
- Solución de problemas: [Solución de problemas de canales](/en/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/en/providers/models).

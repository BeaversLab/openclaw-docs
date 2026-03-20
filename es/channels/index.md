---
summary: "Plataformas de mensajería a las que OpenClaw puede conectarse"
read_when:
  - Deseas elegir un canal de chat para OpenClaw
  - Necesitas una visión general rápida de las plataformas de mensajería compatibles
title: "Canales de chat"
---

# Canales de chat

OpenClaw puede comunicarse contigo en cualquier aplicación de chat que ya uses. Cada canal se conecta a través de la Gateway.
El texto es compatible en todas partes; los medios y las reacciones varían según el canal.

## Canales compatibles

- [BlueBubbles](/es/channels/bluebubbles) — **Recomendado para iMessage**; utiliza la API REST del servidor BlueBubbles para macOS con soporte completo de funciones (editar, deshacer envío, efectos, reacciones, gestión de grupos — editar actualmente roto en macOS 26 Tahoe).
- [Discord](/es/channels/discord) — Discord Bot API + Gateway; es compatible con servidores, canales y MDs.
- [Feishu](/es/channels/feishu) — Bot de Feishu/Lark a través de WebSocket (complemento, instalado por separado).
- [Google Chat](/es/channels/googlechat) — Aplicación de Google Chat API a través de webhook HTTP.
- [iMessage (heredado)](/es/channels/imessage) — Integración heredada de macOS a través de imsg CLI (obsoleto, usa BlueBubbles para nuevas configuraciones).
- [IRC](/es/channels/irc) — Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/es/channels/line) — Bot de LINE Messaging API (complemento, instalado por separado).
- [Matrix](/es/channels/matrix) — Protocolo Matrix (complemento, instalado por separado).
- [Mattermost](/es/channels/mattermost) — Bot API + WebSocket; canales, grupos, MDs (complemento, instalado por separado).
- [Microsoft Teams](/es/channels/msteams) — Bot Framework; soporte empresarial (complemento, instalado por separado).
- [Nextcloud Talk](/es/channels/nextcloud-talk) — Chat autohospedado a través de Nextcloud Talk (complemento, instalado por separado).
- [Nostr](/es/channels/nostr) — MDs descentralizados a través de NIP-04 (complemento, instalado por separado).
- [Signal](/es/channels/signal) — signal-cli; centrado en la privacidad.
- [Synology Chat](/es/channels/synology-chat) — Synology NAS Chat a través de webhooks entrantes y salientes (complemento, instalado por separado).
- [Slack](/es/channels/slack) — Bolt SDK; aplicaciones del espacio de trabajo.
- [Telegram](/es/channels/telegram) — Bot API a través de grammY; es compatible con grupos.
- [Tlon](/es/channels/tlon) — Mensajero basado en Urbit (complemento, se instala por separado).
- [Twitch](/es/channels/twitch) — Chat de Twitch a través de conexión IRC (complemento, se instala por separado).
- [WebChat](/es/web/webchat) — Interfaz de usuario de Gateway WebChat a través de WebSocket.
- [WhatsApp](/es/channels/whatsapp) — El más popular; usa Baileys y requiere emparejamiento por QR.
- [Zalo](/es/channels/zalo) — API de Bot de Zalo; mensajero popular de Vietnam (complemento, se instala por separado).
- [Zalo Personal](/es/channels/zalouser) — Cuenta personal de Zalo mediante inicio de sesión QR (complemento, se instala por separado).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento por QR y
  guarda más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/es/channels/groups).
- El emparejamiento de MD y las listas de permitidos se aplican por seguridad; consulte [Seguridad](/es/gateway/security).
- Solución de problemas: [Solución de problemas del canal](/es/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/es/providers/models).

import en from "/components/footer/en.mdx";

<en />

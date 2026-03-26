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

- [BlueBubbles](/es/channels/bluebubbles) — **Recomendado para iMessage**; utiliza la API REST del servidor BlueBubbles para macOS con compatibilidad completa de funciones (editar, deshacer envío, efectos, reacciones, gestión de grupos — editar actualmente roto en macOS 26 Tahoe).
- [Discord](/es/channels/discord) — Bot API de Discord + Gateway; compatible con servidores, canales y MDs.
- [Feishu](/es/channels/feishu) — Bot de Feishu/Lark a través de WebSocket (complemento, instalado por separado).
- [Google Chat](/es/channels/googlechat) — Aplicación de API de Google Chat a través de webhook HTTP.
- [iMessage (heredado)](/es/channels/imessage) — Integración heredada de macOS a través de la CLI imsg (obsoleto, use BlueBubbles para nuevas configuraciones).
- [IRC](/es/channels/irc) — Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/es/channels/line) — Bot de API de mensajería de LINE (complemento, instalado por separado).
- [Matrix](/es/channels/matrix) — Protocolo Matrix (complemento, instalado por separado).
- [Mattermost](/es/channels/mattermost) — Bot API + WebSocket; canales, grupos, MDs (complemento, instalado por separado).
- [Microsoft Teams](/es/channels/msteams) — Bot Framework; soporte empresarial (complemento, instalado por separado).
- [Nextcloud Talk](/es/channels/nextcloud-talk) — Chat autohospedado a través de Nextcloud Talk (complemento, instalado por separado).
- [Nostr](/es/channels/nostr) — MDs descentralizados a través de NIP-04 (complemento, instalado por separado).
- [Signal](/es/channels/signal) — signal-cli; centrado en la privacidad.
- [Synology Chat](/es/channels/synology-chat) — Chat de NAS Synology a través de webhooks de salida + entrada (complemento, instalado por separado).
- [Slack](/es/channels/slack) — Bolt SDK; aplicaciones de espacio de trabajo.
- [Telegram](/es/channels/telegram) — Bot API a través de grammY; compatible con grupos.
- [Tlon](/es/channels/tlon) — Mensajero basado en Urbit (complemento, instalado por separado).
- [Twitch](/es/channels/twitch) — Chat de Twitch a través de conexión IRC (complemento, instalado por separado).
- [WebChat](/es/web/webchat) — Interfaz de usuario de WebChat del Gateway a través de WebSocket.
- [WhatsApp](/es/channels/whatsapp) — El más popular; usa Baileys y requiere emparejamiento por QR.
- [Zalo](/es/channels/zalo) — API de Bot de Zalo; mensajero popular de Vietnam (complemento, instalado por separado).
- [Zalo Personal](/es/channels/zalouser) — Cuenta personal de Zalo a través de inicio de sesión por QR (complemento, instalado por separado).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento por QR y
  almacena más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/es/channels/groups).
- El emparejamiento de MD y las listas de permitidos se hacen cumplir por seguridad; consulte [Seguridad](/es/gateway/security).
- Solución de problemas: [Solución de problemas del canal](/es/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/es/providers/models).

import es from "/components/footer/es.mdx";

<es />

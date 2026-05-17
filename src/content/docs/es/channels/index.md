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
- La configuración de WhatsApp es bajo demanda: la incorporación puede mostrar el flujo de configuración antes
  de que se instale el paquete del complemento, y el Gateway carga el complemento externo
  de ClawHub/npm solo cuando el canal está realmente activo.

## Canales compatibles

- [Discord](/es/channels/discord) - Bot API de Discord + Gateway; admite servidores, canales y MDs.
- [Feishu](/es/channels/feishu) - Bot de Feishu/Lark a través de WebSocket (complemento incluido).
- [Google Chat](/es/channels/googlechat) - Aplicación de API de Google Chat mediante webhook HTTP (complemento descargable).
- [iMessage](/es/channels/imessage) - Integración nativa de macOS a través del puente `imsg` en un Mac con sesión iniciada (o contenedor SSH cuando el Gateway se ejecuta en otro lugar), incluyendo acciones de API privada para respuestas, tapbacks, efectos, archivos adjuntos y gestión de grupos. Preferido para nuevas configuraciones de iMessage de OpenClaw cuando los permisos de host y el acceso a Messages son adecuados.
- [IRC](/es/channels/irc) - Servidores IRC clásicos; canales + MDs con controles de emparejamiento/lista blanca.
- [LINE](/es/channels/line) - Bot de API de Mensajería LINE (complemento descargable).
- [Matrix](/es/channels/matrix) - Protocolo Matrix (complemento descargable).
- [Mattermost](/es/channels/mattermost) - Bot API + WebSocket; canales, grupos, MDs (complemento descargable).
- [Microsoft Teams](/es/channels/msteams) - Bot Framework; soporte empresarial (complemento incluido).
- [Nextcloud Talk](/es/channels/nextcloud-talk) - Chat autohospedado a través de Nextcloud Talk (complemento incluido).
- [Nostr](/es/channels/nostr) - MDs descentralizados a través de NIP-04 (complemento incluido).
- [QQ Bot](/es/channels/qqbot) - Bot API de QQ; chat privado, chat grupal y medios enriquecidos (complemento incluido).
- [Signal](/es/channels/signal) - signal-cli; centrado en la privacidad.
- [Slack](/es/channels/slack) - Bolt SDK; aplicaciones de espacio de trabajo.
- [Synology Chat](/es/channels/synology-chat) - Chat de NAS Synology mediante webhooks de salida + entrada (complemento incluido).
- [Telegram](/es/channels/telegram) - Bot API a través de grammY; admite grupos.
- [Tlon](/es/channels/tlon) - Mensajero basado en Urbit (complemento incluido).
- [Twitch](/es/channels/twitch) - Chat de Twitch a través de conexión IRC (complemento incluido).
- [Llamada de voz](/es/plugins/voice-call) - Telefonía a través de Plivo o Twilio (complemento, se instala por separado).
- [WebChat](/es/web/webchat) - Interfaz de usuario de WebChat de Gateway a través de WebSocket.
- [WeChat](/es/channels/wechat) - Complemento del bot Tencent iLink mediante inicio de sesión con QR; solo chats privados (complemento externo).
- [WhatsApp](/es/channels/whatsapp) - El más popular; usa Baileys y requiere emparejamiento con QR.
- [Yuanbao](/es/channels/yuanbao) - Bot de Tencent Yuanbao (complemento externo).
- [Zalo](/es/channels/zalo) - API de Bot de Zalo; mensajería popular de Vietnam (complemento incluido).
- [Zalo Personal](/es/channels/zalouser) - Cuenta personal de Zalo mediante inicio de sesión con QR (complemento incluido).

## Notas

- Los canales pueden ejecutarse simultáneamente; configure varios y OpenClaw enrutará por cada chat.
- La configuración más rápida suele ser **Telegram** (token de bot simple). WhatsApp requiere emparejamiento con QR y
  almacena más estado en el disco.
- El comportamiento del grupo varía según el canal; consulte [Grupos](/es/channels/groups).
- El emparejamiento de DM y las listas de permitidos se aplican por seguridad; consulte [Seguridad](/es/gateway/security).
- Solución de problemas: [Solución de problemas del canal](/es/channels/troubleshooting).
- Los proveedores de modelos están documentados por separado; consulte [Proveedores de modelos](/es/providers/models).

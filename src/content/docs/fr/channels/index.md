---
summary: "Plateformes de messagerie auxquelles OpenClaw peut se connecter"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Canaux de discussion"
---

# Canaux de discussion

OpenClaw peut vous parler via n'importe quelle application de chat que vous utilisez déjà. Chaque canal se connecte via le Gateway.
Le texte est pris en charge partout ; les médias et les réactions varient selon le canal.

## Canaux pris en charge

- [BlueBubbles](/en/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec une prise en charge complète des fonctionnalités (modifier, annuler l'envoi, effets, réactions, gestion des groupes — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/en/channels/discord) — Bot Discord de API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/en/channels/feishu) — Bot Feishu/Lark via WebSocket (plugin, installé séparément).
- [Google Chat](/en/channels/googlechat) — Application Google Chat API via webhook HTTP.
- [iMessage (hérité)](/en/channels/imessage) — Intégration macOS héritée via imsg CLI (déconseillé, utilisez BlueBubbles pour les nouvelles configurations).
- [IRC](/en/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appariement/liste d'autorisation.
- [LINE](/en/channels/line) — Bot API de LINE (plugin, installé séparément).
- [Matrix](/en/channels/matrix) — Protocole Matrix (plugin, installé séparément).
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket ; canaux, groupes, DMs (plugin, installé séparément).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework ; prise en charge entreprise (plugin, installé séparément).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plugin, installé séparément).
- [Nostr](/en/channels/nostr) — DMs décentralisés via NIP-04 (plugin, installé séparément).
- [QQ Bot](/en/channels/qqbot) — API QQ Bot ; chat privé, chat de groupe et média enrichi.
- [Signal](/en/channels/signal) — signal-cli ; axé sur la confidentialité.
- [Slack](/en/channels/slack) — SDK Bolt; applications de l'espace de travail.
- [Synology Chat](/en/channels/synology-chat) — Chat Synology NAS via webhooks entrants et sortants (plug-in, installé séparément).
- [Telegram](/en/channels/telegram) — Bot API via grammY ; prend en charge les groupes.
- [Tlon](/en/channels/tlon) — messagerie basée sur Urbit (plug-in, installé séparément).
- [Twitch](/en/channels/twitch) — chat Twitch via connexion IRC (plug-in, installé séparément).
- [Voice Call](/en/plugins/voice-call) — Téléphonie via Plivo ou Twilio (plug-in, installé séparément).
- [WebChat](/en/web/webchat) — Interface utilisateur Gateway WebChat sur WebSocket.
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — Plug-in Tencent iLink Bot via connexion QR ; chats privés uniquement.
- [WhatsApp](/en/channels/whatsapp) — Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Zalo](/en/channels/zalo) — Bot Zalo API ; messagerie populaire au Vietnam (plug-in, installé séparément).
- [Zalo Personal](/en/channels/zalouser) — compte personnel Zalo via connexion QR (plug-in, installé séparément).

## Notes

- Les canaux peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (jeton de bot simple). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le canal ; voir [Groups](/en/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Security](/en/gateway/security).
- Dépannage : [Channel troubleshooting](/en/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Model Providers](/en/providers/models).

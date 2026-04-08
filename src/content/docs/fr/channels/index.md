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

- [BlueBubbles](/en/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec une prise en charge complète des fonctionnalités (plugin inclus ; modifier, annuler l'envoi, effets, réactions, gestion des groupes — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/en/channels/discord) — Bot Discord de API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/en/channels/feishu) — Bot Feishu/Lark via WebSocket (plugin inclus).
- [Google Chat](/en/channels/googlechat) — Application Google Chat API via webhook HTTP.
- [iMessage (hérité)](/en/channels/imessage) — Intégration macOS héritée via imsg CLI (déconseillé, utilisez BlueBubbles pour les nouvelles configurations).
- [IRC](/en/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appariement/liste d'autorisation.
- [LINE](/en/channels/line) — Bot API de messagerie LINE (plugin inclus).
- [Matrix](/en/channels/matrix) — Protocole Matrix (plugin inclus).
- [Mattermost](/en/channels/mattermost) — Bot API + WebSocket ; salons, groupes, DMs (plugin inclus).
- [Microsoft Teams](/en/channels/msteams) — Bot Framework ; support entreprise (plugin inclus).
- [Nextcloud Talk](/en/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plugin inclus).
- [Nostr](/en/channels/nostr) — DMs décentralisés via NIP-04 (plugin inclus).
- [QQ Bot](/en/channels/qqbot) — API du Bot QQ ; chat privé, chat de groupe et média riche (plugin inclus).
- [Signal](/en/channels/signal) — signal-cli ; axé sur la confidentialité.
- [Slack](/en/channels/slack) — SDK Bolt; applications de l'espace de travail.
- [Synology Chat](/en/channels/synology-chat) — Synology NAS Chat via webhooks entrants et sortants (plugin inclus).
- [Telegram](/en/channels/telegram) — Bot API via grammY ; prend en charge les groupes.
- [Tlon](/en/channels/tlon) — Messagerie basée sur Urbit (plugin inclus).
- [Twitch](/en/channels/twitch) — Chat Twitch via connexion IRC (plugin inclus).
- [Voice Call](/en/plugins/voice-call) — Téléphonie via Plivo ou Twilio (plug-in, installé séparément).
- [WebChat](/en/web/webchat) — Interface utilisateur Gateway WebChat sur WebSocket.
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — Plug-in Tencent iLink Bot via connexion QR ; chats privés uniquement.
- [WhatsApp](/en/channels/whatsapp) — Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Zalo](/en/channels/zalo) — Zalo Bot API ; messagerie populaire au Vietnam (plugin inclus).
- [Zalo Personal](/en/channels/zalouser) — Compte personnel Zalo via connexion QR (plugin inclus).

## Notes

- Les canaux peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (jeton de bot simple). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le canal ; voir [Groups](/en/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Security](/en/gateway/security).
- Dépannage : [Channel troubleshooting](/en/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Model Providers](/en/providers/models).

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

- [BlueBubbles](/fr/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec une prise en charge complète des fonctionnalités (plugin inclus ; modifier, annuler l'envoi, effets, réactions, gestion des groupes — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/fr/channels/discord) — Bot Discord de API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/fr/channels/feishu) — Bot Feishu/Lark via WebSocket (plugin inclus).
- [Google Chat](/fr/channels/googlechat) — Application Google Chat API via webhook HTTP.
- [iMessage (hérité)](/fr/channels/imessage) — Intégration macOS héritée via imsg CLI (déconseillé, utilisez BlueBubbles pour les nouvelles configurations).
- [IRC](/fr/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appariement/liste d'autorisation.
- [LINE](/fr/channels/line) — Bot API de messagerie LINE (plugin inclus).
- [Matrix](/fr/channels/matrix) — Protocole Matrix (plugin inclus).
- [Mattermost](/fr/channels/mattermost) — Bot API + WebSocket ; salons, groupes, DMs (plugin inclus).
- [Microsoft Teams](/fr/channels/msteams) — Bot Framework ; support entreprise (plugin inclus).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plugin inclus).
- [Nostr](/fr/channels/nostr) — DMs décentralisés via NIP-04 (plugin inclus).
- [QQ Bot](/fr/channels/qqbot) — API du Bot QQ ; chat privé, chat de groupe et média riche (plugin inclus).
- [Signal](/fr/channels/signal) — signal-cli ; axé sur la confidentialité.
- [Slack](/fr/channels/slack) — SDK Bolt; applications de l'espace de travail.
- [Synology Chat](/fr/channels/synology-chat) — Synology NAS Chat via webhooks entrants et sortants (plugin inclus).
- [Telegram](/fr/channels/telegram) — Bot API via grammY ; prend en charge les groupes.
- [Tlon](/fr/channels/tlon) — Messagerie basée sur Urbit (plugin inclus).
- [Twitch](/fr/channels/twitch) — Chat Twitch via connexion IRC (plugin inclus).
- [Voice Call](/fr/plugins/voice-call) — Téléphonie via Plivo ou Twilio (plug-in, installé séparément).
- [WebChat](/fr/web/webchat) — Interface utilisateur Gateway WebChat sur WebSocket.
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — Plug-in Tencent iLink Bot via connexion QR ; chats privés uniquement.
- [WhatsApp](/fr/channels/whatsapp) — Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Zalo](/fr/channels/zalo) — Zalo Bot API ; messagerie populaire au Vietnam (plugin inclus).
- [Zalo Personal](/fr/channels/zalouser) — Compte personnel Zalo via connexion QR (plugin inclus).

## Notes

- Les canaux peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (jeton de bot simple). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le canal ; voir [Groups](/fr/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Security](/fr/gateway/security).
- Dépannage : [Channel troubleshooting](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Model Providers](/fr/providers/models).

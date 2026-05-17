---
summary: "Plateformes de messagerie auxquelles OpenClaw peut se connecter"
read_when:
  - You want to choose a chat channel for OpenClaw
  - You need a quick overview of supported messaging platforms
title: "Canaux de chat"
---

OpenClaw peut vous parler via n'importe quelle application de chat que vous utilisez déjà. Chaque channel se connecte via le Gateway.
Le texte est pris en charge partout ; les médias et les réactions varient selon le channel.

## Notes de livraison

- Les réponses Telegram qui contiennent une syntaxe d'image markdown, telle que `![alt](url)`,
  sont converties en réponses média sur le chemin de sortie final lorsque cela est possible.
- Les DMs multi-personnes Slack sont acheminés comme des discussions de groupe, donc la stratégie de groupe, le comportement de mention
  et les règles de session de groupe s'appliquent aux conversations MPIM.
- Le configuration de WhatsApp est installée à la demande : l'intégration peut afficher le processus de configuration avant
  l'installation du package du plugin, et le Gateway ne charge le plugin externe
  ClawHub/npm que lorsque le channel est réellement actif.

## Canaux pris en charge

- [Discord](/fr/channels/discord) - Discord Bot API + Gateway ; prend en charge les serveurs, les channels et les DMs.
- [Feishu](/fr/channels/feishu) - Bot Feishu/Lark via WebSocket (plugin inclus).
- [Google Chat](/fr/channels/googlechat) - Application Google Chat API via webhook HTTP (plugin téléchargeable).
- [iMessage](/fr/channels/imessage) - Intégration native macOS via le pont `imsg` sur un Mac connecté (ou wrapper SSH lorsque le Gateway s'exécute ailleurs), incluant les actions de l'API privée pour les réponses, les tapbacks, les effets, les pièces jointes et la gestion de groupe. Préféré pour les nouvelles configurations OpenClaw iMessage lorsque les permissions de l'hôte et l'accès aux Messages correspondent.
- [IRC](/fr/channels/irc) - Serveurs IRC classiques ; channels + DMs avec des contrôles de jumelist/liste d'autorisation.
- [LINE](/fr/channels/line) - Bot API de messagerie LINE (plugin téléchargeable).
- [Matrix](/fr/channels/matrix) - Protocole Matrix (plugin téléchargeable).
- [Mattermost](/fr/channels/mattermost) - Bot API + WebSocket ; channels, groupes, DMs (plugin téléchargeable).
- [Microsoft Teams](/fr/channels/msteams) - Bot Framework ; support entreprise (plugin inclus).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) - Chat auto-hébergé via Nextcloud Talk (plugin inclus).
- [Nostr](/fr/channels/nostr) - DMs décentralisés via NIP-04 (plugin inclus).
- [QQ Bot](/fr/channels/qqbotAPI) - API QQ Bot ; chat privé, chat de groupe et média enrichi (plug-in inclus).
- [Signal](Signal)(/en/channels/signal) - signal-cli ; axé sur la confidentialité.
- [Slack](Slack)(/en/channels/slackBolt) - SDK Bolt ; applications d'espace de travail.
- [Synology Chat](/fr/channels/synology-chat) - Synology NAS Chat via webhooks sortants et entrants (plug-in inclus).
- [Telegram](Telegram)(/en/channels/telegramAPIgrammY) - Bot API via grammY ; prend en charge les groupes.
- [Tlon](Tlon)(/en/channels/tlon) - messagerie basée sur Urbit (plug-in inclus).
- [Twitch](Twitch)(/en/channels/twitchTwitch) - chat Twitch via connexion IRC (plug-in inclus).
- [Voice Call](/fr/plugins/voice-call) - Téléphonie via Plivo ou Twilio (plug-in, installé séparément).
- [WebChat](WebChat)(/en/web/webchatGatewayWebChat) - interface utilisateur WebChat du Gateway sur WebSocket.
- [WeChat](/fr/channels/wechat) - Plug-in iLink Bot de Tencent via connexion QR ; chats privés uniquement (plug-in externe).
- [WhatsApp](WhatsApp)(/en/channels/whatsappBaileys) - Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Yuanbao](/fr/channels/yuanbao) - Bot Tencent Yuanbao (plug-in externe).
- [Zalo](Zalo)(/en/channels/zaloZaloAPI) - API Bot Zalo ; messagerie populaire du Vietnam (plug-in inclus).
- [Zalo](Zalo) Personnel](/fr/channels/zalouserZalo) - compte personnel Zalo via connexion QR (plug-in inclus).

## Notes

- Les canaux peuvent fonctionner simultanément; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (jeton de bot simple). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement de groupe varie selon le channel ; voir [Groupes](/fr/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Sécurité](/fr/gateway/security).
- Dépannage : [Dépannage de channel](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Fournisseurs de modèles](/fr/providers/models).

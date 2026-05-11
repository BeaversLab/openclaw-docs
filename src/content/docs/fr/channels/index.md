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
- L'installation de WhatsApp est à la demande : l'onboarding peut afficher le flux d'installation avant
  que les dépendances d'exécution Baileys ne soient mises en place, et le Gateway charge l'exécution WhatsApp
  uniquement lorsque le channel est réellement actif.

## Canaux pris en charge

- [BlueBubbles](/fr/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec prise en charge complète des fonctionnalités (plugin inclus ; modification, annulation d'envoi, effets, réactions, gestion de groupe — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/fr/channels/discord) — API Bot Discord + API ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/fr/channels/feishu) — Bot Feishu/Lark via WebSocket (plugin inclus).
- [Google Chat](/fr/channels/googlechat) — Application API Google Chat API via webhook HTTP.
- [iMessage (legacy)](/fr/channels/imessage) — Intégration macOS héritée via CLI imsg (obsolète, utilisez CLI pour les nouvelles installations).
- [IRC](/fr/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appairage/liste d'autorisation.
- [LINE](/fr/channels/line) — Bot API de messagerie API (plugin inclus).
- [Matrix](/fr/channels/matrix) — Protocole Matrix (plugin inclus).
- [Mattermost](/fr/channels/mattermost) — API Bot + WebSocket ; canaux, groupes, DMs (plugin inclus).
- [Microsoft Teams](/fr/channels/msteams) — Bot Framework ; support entreprise (plugin inclus).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plugin inclus).
- [Nostr](/fr/channels/nostr) — DMs décentralisés via NIP-04 (plugin inclus).
- [QQ Bot](/fr/channels/qqbot) — QQ Bot API; chat privé, chat de groupe et média enrichi (plugin inclus).
- [Signal](/fr/channels/signal) — signal-cli; axé sur la confidentialité.
- [Slack](/fr/channels/slack) — SDK Bolt; applications d'espace de travail.
- [Synology Chat](/fr/channels/synology-chat) — Synology NAS Chat via webhooks sortants et entrants (plugin inclus).
- [Telegram](/fr/channels/telegram) — Bot API via grammY; prend en charge les groupes.
- [Tlon](/fr/channels/tlon) — messagerie basée sur Urbit (plugin inclus).
- [Twitch](/fr/channels/twitch) — chat Twitch via connexion IRC (plugin inclus).
- [Voice Call](/fr/plugins/voice-call) — Téléphonie via Plivo ou Twilio (plugin, installé séparément).
- [WebChat](/fr/web/webchat) — interface utilisateur Gateway WebChat sur WebSocket.
- [WeChat](/fr/channels/wechat) — plugin Tencent iLink Bot via connexion QR; chats privés uniquement (plugin externe).
- [WhatsApp](/fr/channels/whatsapp) — Le plus populaire; utilise Baileys et nécessite un appariement QR.
- [Zalo](/fr/channels/zalo) — Zalo Bot API; messagerie populaire au Vietnam (plugin inclus).
- [Zalo Personal](/fr/channels/zalouser) — compte personnel Zalo via connexion QR (plugin inclus).

## Notes

- Les canaux peuvent fonctionner simultanément; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (jeton de bot simple). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le canal; voir [Groups](/fr/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité; voir [Security](/fr/gateway/security).
- Dépannage : [Channel troubleshooting](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément; voir [Model Providers](/fr/providers/models).

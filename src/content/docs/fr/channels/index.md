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
- Les canaux qui acceptent les messages entrants créés par des bots peuvent utiliser une
  [protection commune contre les boucles de bots](/fr/channels/bot-loop-protection) pour empêcher les paires de bots
  de se répondre indéfiniment.
- Les salons toujours actifs pris en charge peuvent utiliser des [événements ambiants de salon](/fr/channels/ambient-room-events)
  afin que les bavardages non mentionnés deviennent un contexte silencieux, sauf si l'agent envoie avec
  l'outil `message`.

## Canaux pris en charge

- [Discord](/fr/channels/discord) - Discord Bot API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/fr/channels/feishu) - Bot Feishu/Lark via WebSocket (plug-in intégré).
- [Google Chat](/fr/channels/googlechat) - Application Google Chat API via webhook HTTP (plug-in téléchargeable).
- [iMessage](/fr/channels/imessage) - Intégration native macOS via le pont `imsg` sur un Mac connecté (ou wrapper SSH lorsque le Gateway s'exécute ailleurs), incluant des actions d'API privées pour les réponses, les tapbacks, les effets, les pièces jointes et la gestion de groupe. Préféré pour les nouvelles configurations OpenClaw iMessage lorsque les autorisations de l'hôte et l'accès aux Messages sont adaptés.
- [IRC](/fr/channels/irc) - Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appariement/liste blanche.
- [LINE](/fr/channels/line) - Bot API de messagerie LINE (plug-in téléchargeable).
- [Matrix](/fr/channels/matrix) - Protocole Matrix (plug-in téléchargeable).
- [Mattermost](/fr/channels/mattermost) - Bot API + WebSocket ; canaux, groupes, DMs (plug-in téléchargeable).
- [Microsoft Teams](/fr/channels/msteams) - Bot Framework ; support entreprise (plug-in intégré).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) - Chat auto-hébergé via Nextcloud Talk (plug-in intégré).
- [Nostr](/fr/channels/nostr) - MDs décentralisés via NIP-04 (plugin inclus).
- [QQ Bot](/fr/channels/qqbot) - QQ Bot API ; chat privé, chat de groupe et média enrichi (plugin inclus).
- [Signal](/fr/channels/signal) - signal-cli ; axé sur la confidentialité.
- [Slack](/fr/channels/slack) - Bolt SDK ; applications d'espace de travail.
- [Synology Chat](/fr/channels/synology-chat) - Synology NAS Chat via webhooks sortants et entrants (plugin inclus).
- [Telegram](/fr/channels/telegram) - Bot API via grammY ; prend en charge les groupes.
- [Tlon](/fr/channels/tlon) - Messagerie basée sur Urbit (plugin inclus).
- [Twitch](/fr/channels/twitch) - Chat Twitch via connexion IRC (plugin inclus).
- [Voice Call](/fr/plugins/voice-call) - Téléphonie via Plivo ou Twilio (plugin, installé séparément).
- [WebChat](/fr/web/webchat) - Interface utilisateur Gateway WebChat via WebSocket.
- [WeChat](/fr/channels/wechat) - Extension de bot Tencent iLink via connexion QR ; chats privés uniquement (plugin externe).
- [WhatsApp](/fr/channels/whatsapp) - Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Yuanbao](/fr/channels/yuanbao) - Bot Tencent Yuanbao (plugin externe).
- [Zalo](/fr/channels/zalo) - Zalo Bot API ; messagerie populaire au Vietnam (plugin inclus).
- [Zalo Personal](/fr/channels/zalouser) - Compte personnel Zalo via connexion QR (plugin inclus).

## Notes

- Les canaux peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw acheminera par chat.
- La configuration la plus rapide est généralement **Telegram** (simple jeton de bot). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le channel ; consultez [Groups](/fr/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; consultez [Security](/fr/gateway/security).
- Troubleshooting : [Channel troubleshooting](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; consultez [Model Providers](/fr/providers/models).

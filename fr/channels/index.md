---
summary: "Plateformes de messagerie auxquelles OpenClaw peut se connecter"
read_when:
  - Vous souhaitez choisir un channel de chat pour OpenClaw
  - Vous avez besoin d'un aperçu rapide des plateformes de messagerie prises en charge
title: "Canaux de chat"
---

# Canaux de chat

OpenClaw peut vous parler sur n'importe quelle application de chat que vous utilisez déjà. Chaque channel se connecte via le Gateway.
Le texte est pris en charge partout ; les médias et les réactions varient selon le channel.

## Canaux pris en charge

- [BlueBubbles](/fr/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec une prise en charge complète des fonctionnalités (modifier, annuler l'envoi, effets, réactions, gestion de groupe — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/fr/channels/discord) — Bot Discord API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/fr/channels/feishu) — Bot Feishu/Lark via WebSocket (plug-in, installé séparément).
- [Google Chat](/fr/channels/googlechat) — Application Google Chat API via Webhook HTTP.
- [iMessage (legacy)](/fr/channels/imessage) — Intégration macOS héritée via imsg CLI (obsolète, utilisez BlueBubbles pour les nouvelles configurations).
- [IRC](/fr/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec contrôles d'appariement/liste blanche.
- [LINE](/fr/channels/line) — Bot API de messagerie LINE (plug-in, installé séparément).
- [Matrix](/fr/channels/matrix) — Protocole Matrix (plug-in, installé séparément).
- [Mattermost](/fr/channels/mattermost) — Bot API + WebSocket ; canaux, groupes, DMs (plug-in, installé séparément).
- [Microsoft Teams](/fr/channels/msteams) — Bot Framework ; support entreprise (plug-in, installé séparément).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plug-in, installé séparément).
- [Nostr](/fr/channels/nostr) — DMs décentralisés via NIP-04 (plug-in, installé séparément).
- [Signal](/fr/channels/signal) — signal-cli ; axé sur la confidentialité.
- [Synology Chat](/fr/channels/synology-chat) — Chat Synology NAS via webhooks sortants et entrants (plug-in, installé séparément).
- [Slack](/fr/channels/slack) — SDK Bolt ; applications d'espace de travail.
- [Telegram](/fr/channels/telegram) — Bot API via grammY ; prend en charge les groupes.
- [Tlon](/fr/channels/tlon) — Messagerie basée sur Urbit (plugin, installé séparément).
- [Twitch](/fr/channels/twitch) — Chat Twitch via connexion IRC (plugin, installé séparément).
- [WebChat](/fr/web/webchat) — Interface utilisateur Gateway du WebChat sur WebSocket.
- [WhatsApp](/fr/channels/whatsapp) — Le plus populaire ; utilise Baileys et nécessite un appariement QR.
- [Zalo](/fr/channels/zalo) — Bot Zalo de API ; messagerie populaire au Vietnam (plugin, installé séparément).
- [Zalo Personnel](/fr/channels/zalouser) — Compte personnel Zalo via connexion QR (plugin, installé séparément).

## Notes

- Les canaux peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (simple jeton de bot). WhatsApp nécessite un appariement QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le canal ; voir [Groupes](/fr/channels/groups).
- L'appariement DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Sécurité](/fr/gateway/security).
- Dépannage : [Dépannage des canaux](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Fournisseurs de modèles](/fr/providers/models).

import fr from "/components/footer/fr.mdx";

<fr />

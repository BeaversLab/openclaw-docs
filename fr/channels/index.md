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

- [BlueBubbles](/fr/channels/bluebubbles) — **Recommandé pour iMessage** ; utilise l'API REST du serveur BlueBubbles macOS avec une prise en charge complète des fonctionnalités (modifier, annuler l'envoi, effets, réactions, gestion des groupes — la modification est actuellement cassée sur API 26 Tahoe).
- [Discord](/fr/channels/discord) — Bot Discord de API + Gateway ; prend en charge les serveurs, les canaux et les DMs.
- [Feishu](/fr/channels/feishu) — Bot Feishu/Lark via WebSocket (plugin, installé séparément).
- [Google Chat](/fr/channels/googlechat) — Application Google Chat API via webhook HTTP.
- [iMessage (hérité)](/fr/channels/imessage) — Intégration macOS héritée via imsg CLI (déconseillé, utilisez BlueBubbles pour les nouvelles configurations).
- [IRC](/fr/channels/irc) — Serveurs IRC classiques ; canaux + DMs avec des contrôles d'appariement/liste d'autorisation.
- [LINE](/fr/channels/line) — Bot API de LINE (plugin, installé séparément).
- [Matrix](/fr/channels/matrix) — Protocole Matrix (plugin, installé séparément).
- [Mattermost](/fr/channels/mattermost) — Bot API + WebSocket ; canaux, groupes, DMs (plugin, installé séparément).
- [Microsoft Teams](/fr/channels/msteams) — Bot Framework ; prise en charge entreprise (plugin, installé séparément).
- [Nextcloud Talk](/fr/channels/nextcloud-talk) — Chat auto-hébergé via Nextcloud Talk (plugin, installé séparément).
- [Nostr](/fr/channels/nostr) — DMs décentralisés via NIP-04 (plugin, installé séparément).
- [Signal](/fr/channels/signal) — signal-cli ; axé sur la confidentialité.
- [Synology Chat](/fr/channels/synology-chat) — Synology NAS Chat via webhooks sortants+entrants (plugin, installed separately).
- [Slack](/fr/channels/slack) — SDK Bolt; applications de l'espace de travail.
- [Telegram](/fr/channels/telegram) — Bot API via grammY; prend en charge les groupes.
- [Tlon](/fr/channels/tlon) — Messagerie basée sur Urbit (plugin, installed separately).
- [Twitch](/fr/channels/twitch) — Chat Twitch via connexion IRC (plugin, installed separately).
- [WebChat](/fr/web/webchat) — Interface utilisateur Gateway du WebChat via WebSocket.
- [WhatsApp](/fr/channels/whatsapp) — Le plus populaire ; utilise Baileys et nécessite un appairage QR.
- [Zalo](/fr/channels/zalo) — Bot Zalo API; messagerie populaire au Vietnam (plugin, installed separately).
- [Zalo Personal](/fr/channels/zalouser) — Compte personnel Zalo via connexion QR (plugin, installed separately).

## Notes

- Les channels peuvent fonctionner simultanément ; configurez-en plusieurs et OpenClaw routera par chat.
- La configuration la plus rapide est généralement **Telegram** (simple jeton de bot). WhatsApp nécessite un appairage QR et
  stocke plus d'état sur le disque.
- Le comportement des groupes varie selon le channel ; voir [Groupes](/fr/channels/groups).
- L'appairage DM et les listes d'autorisation sont appliqués pour la sécurité ; voir [Sécurité](/fr/gateway/security).
- Dépannage : [Channel troubleshooting](/fr/channels/troubleshooting).
- Les fournisseurs de modèles sont documentés séparément ; voir [Model Providers](/fr/providers/models).

import fr from '/components/footer/fr.mdx';

<fr />

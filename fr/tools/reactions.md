---
summary: "Sémantique des réactions partagée entre les canaux"
read_when:
  - Travailler sur les réactions dans n'importe quel canal
title: "Réactions"
---

# Outil de réaction

Sémantique des réactions partagée entre les canaux :

- `emoji` est requis lors de l'ajout d'une réaction.
- `emoji=""` supprime la/les réaction(s) du bot lorsque cela est pris en charge.
- `remove: true` supprime l'emoji spécifié lorsque cela est pris en charge (nécessite `emoji`).

Notes sur les canaux :

- **Discord/Slack** : `emoji` vide supprime toutes les réactions du bot sur le message ; `remove: true` supprime uniquement cet emoji.
- **Google Chat** : `emoji` vide supprime les réactions de l'application sur le message ; `remove: true` supprime uniquement cet emoji.
- **Telegram** : `emoji` vide supprime les réactions du bot ; `remove: true` supprime également les réactions mais nécessite tout de même un `emoji` non vide pour la validation de l'outil.
- **WhatsApp** : `emoji` vide supprime la réaction du bot ; `remove: true` correspond à un emoji vide (nécessite tout de même `emoji`).
- **Zalo Personnel (`zalouser`)** : nécessite un `emoji` non vide ; `remove: true` supprime cette réaction emoji spécifique.
- **Signal** : les notifications de réactions entrantes émettent des événements système lorsque `channels.signal.reactionNotifications` est activé.

import en from "/components/footer/en.mdx";

<en />

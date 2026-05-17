---
summary: "Sémantique de l'outil de réaction sur tous les canaux pris en charge"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Réactions"
---

L'agent peut ajouter et supprimer des réactions emoji sur les messages à l'aide de l'outil `message` avec l'action `react`. Le comportement des réactions varie selon le channel et le transport.

## Fonctionnement

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- `emoji` est requis lors de l'ajout d'une réaction.
- Définissez `emoji` sur une chaîne vide (`""`) pour supprimer la ou les réactions du bot.
- Définissez `remove: true` pour supprimer un emoji spécifique (requiert un `emoji` non vide).
- Sur les channels qui prennent en charge les réactions de statut, `trackToolCalls: true` sur une réaction permet au runtime d'utiliser ce message réagi pour les réactions de progression ultérieures de l'outil lors du même tour.

## Comportement du canal

<AccordionGroup>
  <Accordion title="DiscordSlackDiscord et Slack">
    - Un `emoji` vide supprime toutes les réactions du bot sur le message.
    - `remove: true` supprime uniquement l'emoji spécifié.

  </Accordion>

  <Accordion title="Google ChatGoogle Chat">
    - Un `emoji` vide supprime les réactions de l'application sur le message.
    - `remove: true` supprime uniquement l'emoji spécifié.

  </Accordion>

  <Accordion title="TelegramTelegram">
    - Un `emoji` vide supprime les réactions du bot.
    - `remove: true` supprime également les réactions mais requiert toujours un `emoji` non vide pour la validation de l'outil.

  </Accordion>

  <Accordion title="WhatsAppWhatsApp">
    - Un `emoji` vide supprime la réaction du bot.
    - `remove: true` correspond en interne à un emoji vide (requiert toujours `emoji` dans l'appel de l'outil).

  </Accordion>

  <Accordion title="ZaloZalo Personal (zalouser)">
    - Requiert un `emoji` non vide.
    - `remove: true` supprime cette réaction emoji spécifique.

  </Accordion>

  <Accordion title="Feishu/Lark">
    - Utilisez l'outil `feishu_reaction` avec les actions `add`, `remove` et `list`.
    - L'ajout et la suppression nécessitent `emoji_type` ; la suppression nécessite également `reaction_id`.

  </Accordion>

  <Accordion title="Signal">
    - Les notifications de réactions entrantes sont contrôlées par `channels.signal.reactionNotifications` : `"off"` les désactive, `"own"` (par défaut) émet des événements lorsque les utilisateurs réagissent aux messages du bot, et `"all"` émet des événements pour toutes les réactions.

  </Accordion>

  <Accordion title="iMessage">
    - Les réactions sortantes sont des tapbacks iMessage (`love`, `like`, `dislike`, `laugh`, `emphasize` et `question`).
    - Les notifications de tapback entrantes sont contrôlées par `channels.imessage.reactionNotifications` : `"off"` les désactive, `"own"` (par défaut) émet des événements lorsque les utilisateurs réagissent aux messages créés par le bot, et `"all"` émet des événements pour tous les tapbacks des expéditeurs autorisés.

  </Accordion>
</AccordionGroup>

## Niveau de réaction

La configuration `reactionLevel` par canal contrôle la mesure dans laquelle l'agent utilise les réactions. Les valeurs sont généralement `off`, `ack`, `minimal` ou `extensive`.

- [Niveau de réaction Telegram](/fr/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [Niveau de réaction WhatsApp](/fr/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

Définissez `reactionLevel` sur des canaux individuels pour ajuster la fréquence à laquelle l'agent réagit aux messages sur chaque plateforme.

## Connexes

- [Agent Send](/fr/tools/agent-send) — l'outil `message` qui inclut `react`
- [Channels](/fr/channels) — configuration spécifique au channel

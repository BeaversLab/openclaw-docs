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
- Définissez `remove: true` pour supprimer un emoji spécifique (nécessite un `emoji` non vide).
- Sur les channels qui prennent en charge les réactions de statut, `trackToolCalls: true` sur une réaction permet au runtime d'utiliser ce message réagi pour les réactions de progression d'outil ultérieures lors du même tour.

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

  <Accordion title="NextcloudNextcloud Talk">
    - Ajout de réactions uniquement : `emoji` est requis et ne doit pas être vide.
    - La suppression des réactions n'est pas encore prise en charge ; les appels avec `remove: true` (ou `emoji` vide) sont rejetés avec une erreur claire plutôt que de ne rien faire silencieusement.
    - Nécessite que le bot Talk soit enregistré avec la fonctionnalité `reaction`Nextcloud (voir [docs du channel Nextcloud Talk](/fr/channels/nextcloud-talk)).

  </Accordion>

  <Accordion title="TelegramTelegram">
    - Un `emoji` vide supprime les réactions du bot.
    - `remove: true` supprime également les réactions mais exige toujours un `emoji` non vide pour la validation de l'outil.

  </Accordion>

  <Accordion title="WhatsAppWhatsApp">
    - Un `emoji` vide supprime la réaction du bot.
    - `remove: true` correspond en interne à un emoji vide (requiert toujours `emoji`WhatsApp dans l'appel d'outil).
    - WhatsApp dispose d'un seul emplacement de réaction de bot par message ; les mises à jour des réactions de statut remplacent cet emplacement au lieu d'empiler plusieurs emojis.

  </Accordion>

  <Accordion title="ZaloZalo Personal (zalouser)">
    - Nécessite un `emoji` non vide.
    - `remove: true` supprime cette réaction emoji spécifique.

  </Accordion>

  <Accordion title="Feishu/Lark">
    - Utilisez l'outil `feishu_reaction` avec les actions `add`, `remove` et `list`.
    - L'ajout/suppression nécessite `emoji_type` ; la suppression nécessite également `reaction_id`.

  </Accordion>

  <Accordion title="SignalSignal">
    - Les notifications de réactions entrantes sont contrôlées par `channels.signal.reactionNotifications` : `"off"` les désactive, `"own"` (par défaut) émet des événements lorsque les utilisateurs réagissent aux messages du bot, et `"all"` émet des événements pour toutes les réactions.

  </Accordion>

  <Accordion title="iMessageiMessage"iMessage>
    - Les réactions sortantes sont des tapbacks iMessage (`love`, `like`, `dislike`, `laugh`, `emphasize` et `question`).
    - Les notifications de tapback entrantes sont contrôlées par `channels.imessage.reactionNotifications` : `"off"` les désactive, `"own"` (par défaut) émet des événements lorsque les utilisateurs réagissent aux messages créés par le bot, et `"all"` émet des événements pour tous les tapbacks des expéditeurs autorisés.

  </Accordion>
</AccordionGroup>

## Reaction level

La configuration `reactionLevel` par channel contrôle l'étendue de l'utilisation des réactions par l'agent. Les valeurs sont généralement `off`, `ack`, `minimal` ou `extensive`.

- [Telegram reactionLevel](/fr/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/fr/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

Définissez `reactionLevel` sur des channels individuels pour régler la réactivité de l'agent aux messages sur chaque plateforme.

## Connexes

- [Agent Send](/fr/tools/agent-send) — le tool `message` qui inclut `react`
- [Channels](/fr/channels) — configuration spécifique au channel

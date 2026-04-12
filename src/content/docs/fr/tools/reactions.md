---
summary: "Sémantique de l'outil de réaction sur tous les canaux pris en charge"
read_when:
  - Working on reactions in any channel
  - Understanding how emoji reactions differ across platforms
title: "Réactions"
---

# Réactions

L'agent peut ajouter et supprimer des réactions emoji sur les messages à l'aide de l'outil `message` avec l'action `react`. Le comportement des réactions varie selon le channel.

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

## Comportement du canal

<AccordionGroup>
  <Accordion title="Discord et Slack">
    - Un `emoji` vide supprime toutes les réactions du bot sur le message.
    - `remove: true` supprime uniquement l'emoji spécifié.
  </Accordion>

<Accordion title="Google Chat">- Un `emoji` vide supprime les réactions de l'application sur le message. - `remove: true` supprime uniquement l'emoji spécifié.</Accordion>

<Accordion title="Telegram">- Un `emoji` vide supprime les réactions du bot. - `remove: true` supprime également les réactions mais nécessite toujours un `emoji` non vide pour la validation de l'outil.</Accordion>

<Accordion title="WhatsApp">- Un `emoji` vide supprime la réaction du bot. - `remove: true` correspond en interne à un emoji vide (nécessite tout de même `emoji` dans l'appel de l'outil).</Accordion>

<Accordion title="Zalo Personnel (zalouser)">- Nécessite un `emoji` non vide. - `remove: true` supprime cette réaction emoji spécifique.</Accordion>

<Accordion title="Feishu/Lark">- Utilisez l'outil `feishu_reaction` avec les actions `add`, `remove` et `list`. - L'ajout/suppression nécessite `emoji_type` ; la suppression nécessite également `reaction_id`.</Accordion>

  <Accordion title="Signal">
    - Les notifications de réactions entrantes sont contrôlées par `channels.signal.reactionNotifications` : `"off"` les désactive, `"own"` (par défaut) émet des événements lorsque les utilisateurs réagissent aux messages du bot, et `"all"` émet des événements pour toutes les réactions.
  </Accordion>
</AccordionGroup>

## Niveau de réaction

La configuration `reactionLevel` par channel contrôle l'étendue de l'utilisation des réactions par l'agent. Les valeurs sont généralement `off`, `ack`, `minimal` ou `extensive`.

- [Telegram reactionLevel](/en/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/en/channels/whatsapp#reaction-level) — `channels.whatsapp.reactionLevel`

Définissez `reactionLevel` sur des channels individuels pour régler la manière dont l'agent réagit activement aux messages sur chaque plateforme.

## Connexes

- [Agent Send](/en/tools/agent-send) — l'outil `message` qui inclut `react`
- [Channels](/en/channels) — configuration spécifique au channel

---
summary: "OpenClawDéplacer l'itinéraire de réponse d'une session OpenClaw entre les canaux de chat liés"
title: "Ancrage de canal"
read_when:
  - You want replies for one active session to move from Telegram to Discord, Slack, Mattermost, or another linked channel
  - You are configuring session.identityLinks for cross-channel direct messages
  - A /dock command says the sender is not linked or no active session exists
---

L'ancrage de canal est le transfert d'appel pour une session OpenClaw.

Il conserve le même contexte de conversation, mais modifie l'endroit où les futures réponses pour cette session sont livrées.

## Exemple

Alice peut envoyer un message à OpenClaw sur Telegram et Discord :

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

Si Alice envoie ceci depuis Telegram :

```text
/dock_discord
```

OpenClaw conserve le contexte de la session actuelle et modifie l'itinéraire de réponse :

| Avant l'ancrage                            | Après `/dock_discord`                    |
| ------------------------------------------ | ---------------------------------------- |
| Les réponses vont à Telegram Telegram`123` | Les réponses vont à Discord Discord`456` |

La session n'est pas recréée. L'historique des transcriptions reste attaché à la même session.

## Pourquoi l'utiliser

Utilisez l'ancrage lorsqu'une tâche commence dans une application de chat mais que les prochaines réponses doivent atterrir ailleurs.

Flux courant :

1. Lancer une tâche d'agent depuis Telegram.
2. Passer à Discord où vous coordonnez le travail.
3. Envoyer `/dock_discord`Telegram depuis la session Telegram.
4. Conserver la même session OpenClaw, mais recevoir les futures réponses sur Discord.

## Configuration requise

L'ancrage nécessite `session.identityLinks`. L'expéditeur source et le pair cible doivent faire partie du même groupe d'identité :

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

Les valeurs sont des identifiants de pairs préfixés par canal :

| Valeur         | Signification                                      |
| -------------- | -------------------------------------------------- |
| `telegram:123` | Identifiant de l'expéditeur Telegram Telegram`123` |
| `discord:456`  | Identifiant de pair direct Discord Discord`456`    |
| `slack:U123`   | Identifiant d'utilisateur Slack Slack`U123`        |

La clé canonique (`alice` ci-dessus) est uniquement le nom du groupe d'identité partagé. Les commandes d'ancrage utilisent les valeurs préfixées par canal pour prouver que l'expéditeur source et le pair cible sont la même personne.

## Commandes

Les commandes d'amarrage sont générées à partir des plugins de canal chargés qui prennent en charge les commandes natives. Commandes groupées actuelles :

| Canal cible | Commande           | Alias              |
| ----------- | ------------------ | ------------------ |
| Discord     | `/dock-discord`    | `/dock_discord`    |
| Mattermost  | `/dock-mattermost` | `/dock_mattermost` |
| Slack       | `/dock-slack`      | `/dock_slack`      |
| Telegram    | `/dock-telegram`   | `/dock_telegram`   |

Les alias avec tiret du bas sont utiles sur les surfaces de commandes natives telles que Telegram.

## Ce qui change

L'amarrage met à jour les champs de livraison de la session active :

| Champ de session | Exemple après `/dock_discord`          |
| ---------------- | -------------------------------------- |
| `lastChannel`    | `discord`                              |
| `lastTo`         | `456`                                  |
| `lastAccountId`  | le compte du canal cible, ou `default` |

Ces champs sont persistés dans le magasin de sessions et utilisés par la livraison des réponses ultérieures pour cette session.

## Ce qui ne change pas

L'amarrage ne :

- crée pas de comptes de canal
- connecte pas un nouveau bot Discord, Telegram, Slack ou Mattermost
- accorde pas d'accès à un utilisateur
- contourne pas les listes autorisées de canaux ou les stratégies de DM
- déplace pas l'historique des transcription vers une autre session
- fait pas partager une session par des utilisateurs non liés

Il modifie uniquement l'itinéraire de livraison pour la session actuelle.

## Dépannage

**La commande indique que l'expéditeur n'est pas lié.**

Ajoutez à la fois l'expéditeur actuel et le pair cible au même
groupe `session.identityLinks`. Par exemple, si l'expéditeur Telegram `123` doit s'amarrer
au pair Discord `456`, incluez à la fois `telegram:123` et `discord:456`.

**La commande indique qu'aucune session active n'existe.**

Amarrez à partir d'une session de chat direct existante. La commande a besoin d'une entrée de session active
afin de pouvoir persister le nouvel itinéraire.

**Les réponses vont toujours vers l'ancien canal.**

Vérifiez que la commande a répondu par un message de succès et confirmez que l'ID du pair cible correspond à l'ID utilisé par ce channel. L'ancrage ne modifie que l'itinéraire de la session active ; une autre session peut toujours être acheminée ailleurs.

**Je dois revenir en arrière.**

Envoyez la commande correspondante pour le channel d'origine, telle que `/dock_telegram` ou `/dock-telegram`, à partir d'un émetteur lié.

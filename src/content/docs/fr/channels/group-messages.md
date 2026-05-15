---
summary: "WhatsAppGestion des messages de groupe WhatsApp — activation, listes d'autorisation, sessions et injection de contexte"
read_when:
  - Configuring WhatsApp groups specifically
  - Changing WhatsApp activation modes (`mention` vs `always`)
  - Tuning WhatsApp group session keys or pending-message context
title: "WhatsAppMessages de groupe WhatsApp"
sidebarTitle: "WhatsAppGroupes WhatsApp"
---

Pour le model de groupes multi-canaux (Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo), voir [Groups](DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZalo/en/channels/groupsWhatsApp). Cette page couvre le comportement spécifique à WhatsApp par dessus ce model : l'activation, les listes d'autorisation de groupes, les clés de session par groupe et l'injection de contexte des messages en attente.

Objectif : permettre à OpenClaw de siéger dans des groupes WhatsApp, de ne se réveiller que lorsqu'il est mentionné, et de garder ce fil séparé de la session de DM personnelle.

<Note>`agents.list[].groupChat.mentionPatterns`TelegramDiscordSlackiMessage est également utilisé par Telegram, Discord, Slack et iMessage. Pour les configurations multi-agents, définissez-le par agent, ou utilisez `messages.groupChat.mentionPatterns` comme solution de repli globale.</Note>

## Comportement

- Modes d'activation : `mention` (par défaut) ou `always`. `mention`WhatsApp nécessite une mention (vraies mentions @ WhatsApp via `mentionedJids`, motifs regex sûrs, ou le E.164 du bot n'importe où dans le texte). `always` réveille l'agent à chaque message mais il ne doit répondre que lorsqu'il peut ajouter une valeur significative ; sinon, il renvoie le jeton silencieux exact `NO_REPLY` / `no_reply`. Les valeurs par défaut peuvent être définies dans la configuration (`channels.whatsapp.groups`) et remplacées par groupe via `/activation`. Lorsque `channels.whatsapp.groups` est défini, cela agit aussi comme une liste d'autorisation de groupe (incluez `"*"` pour tout autoriser).
- Politique de groupe : `channels.whatsapp.groupPolicy` contrôle si les messages de groupe sont acceptés (`open|disabled|allowlist`). `allowlist` utilise `channels.whatsapp.groupAllowFrom` (secours : `channels.whatsapp.allowFrom` explicite). La valeur par défaut est `allowlist` (bloqué jusqu'à ce que vous ajoutiez des expéditeurs).
- Sessions par groupe : les clés de session ressemblent à `agent:<agentId>:whatsapp:group:<jid>`, de sorte que les commandes telles que `/verbose on`, `/trace on` ou `/think high` (envoyées en tant que messages autonomes) sont limitées à ce groupe ; l'état du DM personnel n'est pas touché. Les battements de cœur (heartbeats) sont ignorés pour les fils de groupe.
- Injection de contexte : les messages de groupe **pending-only** (en attente uniquement, 50 par défaut) qui n'ont _pas_ déclenché une exécution sont préfixés sous `[Chat messages since your last reply - for context]`, avec la ligne déclencheuse sous `[Current message - respond to this]`. Les messages déjà présents dans la session ne sont pas réinjectés.
- Affichage de l'expéditeur : chaque lot de groupe se termine désormais par `[from: Sender Name (+E164)]` afin que Pi sache qui parle.
- Éphémère/vue unique : nous les déballons avant d'extraire le texte/les mentions, de sorte que les pings qu'ils contiennent déclenchent toujours.
- Invite système de groupe : au premier tour d'une session de groupe (et chaque fois que `/activation` modifie le mode), nous injectons une brève note dans l'invite système comme `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.`. Si les métadonnées ne sont pas disponibles, nous indiquons tout de même à l'agent qu'il s'agit d'une conversation de groupe.

## Exemple de configuration (WhatsApp)

Ajoutez un bloc `groupChat` à `~/.openclaw/openclaw.json` afin que les pings par nom d'affichage fonctionnent même lorsque WhatsApp supprime la partie visuelle `@` dans le corps du texte :

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

Notes :

- Les expressions régulières ne sont pas sensibles à la casse et utilisent les mêmes garde-fous de regex sécurisée que les autres surfaces de configuration de regex ; les modèles non valides et les répétitions imbriquées non sécurisées sont ignorés.
- WhatsApp envoie toujours des mentions canoniques via `mentionedJids` lorsque quelqu'un appuie sur le contact, le recours au numéro est donc rarement nécessaire mais constitute un filet de sécurité utile.

### Commande d'activation (propriétaire uniquement)

Utilisez la commande de discussion de groupe :

- `/activation mention`
- `/activation always`

Seul le numéro du propriétaire (issu de `channels.whatsapp.allowFrom`, ou l'E.164 du bot lui-même si non défini) peut modifier cela. Envoyez `/status` comme message autonome dans le groupe pour voir le mode d'activation actuel.

## Comment utiliser

1. Ajoutez votre compte WhatsApp (celui qui exécute OpenClaw) au groupe.
2. Dites `@openclaw …` (ou incluez le numéro). Seuls les expéditeurs autorisés peuvent le déclencher, sauf si vous définissez `groupPolicy: "open"`.
3. L'invite de l'agent inclura le contexte récent du groupe ainsi que le marqueur `[from: …]` à la fin, afin qu'il puisse s'adresser à la bonne personne.
4. Les directives au niveau de la session (`/verbose on`, `/trace on`, `/think high`, `/new` ou `/reset`, `/compact`) ne s'appliquent qu'à la session de ce groupe ; envoyez-les sous forme de messages autonomes pour qu'elles soient enregistrées. Votre session DM personnelle reste indépendante.

## Test / vérification

- Test de fumée manuel :
  - Envoyez un ping `@openclaw` dans le groupe et confirmez que vous recevez une réponse mentionnant le nom de l'expéditeur.
  - Envoyez un second ping et vérifiez que le bloc d'historique est inclus puis effacé au tour suivant.
- Vérifiez les journaux de la passerelle (exécutez avec `--verbose`) pour voir les entrées `inbound web message` affichant `from: <groupJid>` et le suffixe `[from: …]`.

## Considérations connues

- Les battements de cœur (heartbeats) sont intentionnellement ignorés pour les groupes afin d'éviter les diffusions bruyantes.
- La suppression d'écho utilise la chaîne de lot combinée ; si vous envoyez deux fois un texte identique sans mentions, seul le premier recevra une réponse.
- Les entrées du magasin de session apparaîtront sous la forme `agent:<agentId>:whatsapp:group:<jid>` dans le magasin de session (`~/.openclaw/agents/<agentId>/sessions/sessions.json` par défaut) ; une entrée manquante signifie simplement que le groupe n'a pas encore déclenché d'exécution.
- Les indicateurs de frappe dans les groupes suivent `agents.defaults.typingMode`. Lorsque les réponses visibles utilisent le mode par défaut message-tool-only, la frappe commence immédiatement par défaut pour que les membres du groupe voient que l'agent travaille, même si aucune réponse finale automatique n'est publiée. La configuration explicite du mode de frappe prime toujours.

## Connexes

- [Groupes](/fr/channels/groups)
- [Routage de canal](/fr/channels/channel-routing)
- [Groupes de diffusion](/fr/channels/broadcast-groups)

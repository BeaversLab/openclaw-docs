---
summary: "Comportement et configuration pour la gestion des messages de groupe WhatsApp (mentionPatterns sont partagés entre les surfaces)"
read_when:
  - Changing group message rules or mentions
title: "Messages de groupe"
---

Objectif : permettre à Clawd de rester dans les groupes WhatsApp, de ne se réveiller que lorsqu'il est mentionné, et de garder ce fil séparé de la session DM personnelle.

<Note>`agents.list[].groupChat.mentionPatterns` est également utilisé par Telegram, Discord, Slack et iMessage. Ce document se concentre sur le comportement spécifique à WhatsApp. Pour les configurations multi-agents, définissez `agents.list[].groupChat.mentionPatterns` par agent, ou utilisez `messages.groupChat.mentionPatterns` comme solution de repli globale.</Note>

## Implémentation actuelle (2025-12-03)

- Modes d'activation : `mention` (par défaut) ou `always`. `mention` nécessite une mention (vraies mentions @ WhatsApp via `mentionedJids`, motifs regex sûrs, ou le E.164 du bot n'importe où dans le texte). `always` réveille l'agent à chaque message mais il ne doit répondre que lorsqu'il peut apporter une valeur significative ; sinon, il renvoie le jeton silencieux exact `NO_REPLY` / `no_reply`. Les valeurs par défaut peuvent être définies dans la configuration (`channels.whatsapp.groups`) et remplacées par groupe via `/activation`. Lorsque `channels.whatsapp.groups` est défini, il agit également comme une liste d'autorisation de groupe (incluez `"*"` pour tout autoriser).
- Stratégie de groupe : `channels.whatsapp.groupPolicy` contrôle si les messages de groupe sont acceptés (`open|disabled|allowlist`). `allowlist` utilise `channels.whatsapp.groupAllowFrom` (solution de repli : `channels.whatsapp.allowFrom` explicite). La valeur par défaut est `allowlist` (bloqué jusqu'à ce que vous ajoutiez des expéditeurs).
- Sessions par groupe : les clés de session ressemblent à `agent:<agentId>:whatsapp:group:<jid>`, donc les commandes telles que `/verbose on`, `/trace on` ou `/think high` (envoyées en tant que messages autonomes) sont limitées à ce groupe ; l'état du DM personnel reste inchangé. Les battements de cœur (heartbeats) sont ignorés pour les fils de groupe.
- Injection de contexte : les messages de groupe **en attente uniquement** (50 par défaut) qui n'ont _pas_ déclenché une exécution sont préfixés sous `[Chat messages since your last reply - for context]`, avec la ligne déclencheuse sous `[Current message - respond to this]`. Les messages déjà présents dans la session ne sont pas réinjectés.
- Affichage de l'expéditeur : chaque lot de groupe se termine maintenant par `[from: Sender Name (+E164)]` afin que Pi sache qui parle.
- Éphémère/consultation unique : nous les déballons avant d'extraire le texte/les mentions, afin que les pings à l'intérieur déclenchent toujours.
- Invite système de groupe : au premier tour d'une session de groupe (et chaque fois que `/activation` change le mode), nous injectons une brève description dans l'invite système comme `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`. Si les métadonnées ne sont pas disponibles, nous indiquons toujours à l'agent qu'il s'agit d'une discussion de groupe.

## Exemple de configuration (WhatsApp)

Ajoutez un bloc `groupChat` à `~/.openclaw/openclaw.json` afin que les pings par nom d'affichage fonctionnent même lorsque WhatsApp supprime le `@` visuel dans le corps du texte :

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

- Les expressions régulières sont insensibles à la casse et utilisent les mêmes garde-fous de regex sûre que les autres surfaces de regex de configuration ; les modèles invalides et les répétitions imbriquées non sécurisées sont ignorés.
- WhatsApp envoie toujours des mentions canoniques via `mentionedJids` lorsque quelqu'un appuie sur le contact, donc le rappel vers le numéro est rarement nécessaire mais constitue un filet de sécurité utile.

### Commande d'activation (propriétaire uniquement)

Utilisez la commande de discussion de groupe :

- `/activation mention`
- `/activation always`

Seul le numéro du propriétaire (issu de `channels.whatsapp.allowFrom`, ou l'E.164 du bot lui-même si non défini) peut changer cela. Envoyez `/status` comme message autonome dans le groupe pour voir le mode d'activation actuel.

## Comment utiliser

1. Ajoutez votre compte WhatsApp (celui exécutant OpenClaw) au groupe.
2. Dites `@openclaw …` (ou incluez le numéro). Seuls les expéditeurs autorisés peuvent le déclencher, sauf si vous définissez `groupPolicy: "open"`.
3. L'invite de l'agent inclura le contexte récent du groupe ainsi que le marqueur de fin `[from: …]` afin qu'il puisse s'adresser à la bonne personne.
4. Les directives au niveau de la session (`/verbose on`, `/trace on`, `/think high`, `/new` ou `/reset`, `/compact`) ne s'appliquent qu'à la session de ce groupe ; envoyez-les sous forme de messages autonomes pour qu'elles soient enregistrées. Votre session DM personnelle reste indépendante.

## Tests / vérification

- Test manuel :
  - Envoyez un ping `@openclaw` dans le groupe et confirmez une réponse qui mentionne le nom de l'expéditeur.
  - Envoyez un deuxième ping et vérifiez que le bloc d'historique est inclus puis effacé au tour suivant.
- Vérifiez les journaux de la passerelle (exécutez avec `--verbose`) pour voir les entrées `inbound web message` montrant `from: <groupJid>` et le suffixe `[from: …]`.

## Considérations connues

- Les battements de cœur (heartbeats) sont intentionnellement ignorés pour les groupes afin d'éviter les diffusions bruyantes.
- La suppression d'écho utilise la chaîne de lot combinée ; si vous envoyez un texte identique deux fois sans mention, seul le premier recevra une réponse.
- Les entrées du magasin de session apparaîtront comme `agent:<agentId>:whatsapp:group:<jid>` dans le magasin de session (`~/.openclaw/agents/<agentId>/sessions/sessions.json` par défaut) ; une entrée manquante signifie simplement que le groupe n'a pas encore déclenché d'exécution.
- Les indicateurs de frappe dans les groupes suivent `agents.defaults.typingMode` (par défaut : `message` lorsqu'il n'y a pas de mention).

## Connexes

- [Groupes](/fr/channels/groups)
- [Routage de canal](/fr/channels/channel-routing)
- [Groupes de diffusion](/fr/channels/broadcast-groups)

---
summary: "Statut du support du bot Telegram, capacités et configuration"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

Statut : prêt pour la production pour les DMs de bot + groupes via grammY. Le long polling est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/en/channels/pairing">
    La stratégie par défaut pour les Telegram sur Telegram est l'appariement.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/en/channels/troubleshooting">
    Manuels de diagnostic et de réparation multi-canal.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/en/gateway/configuration">
    Modèles et exemples complets de configuration de canal.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Créer le jeton du bot dans BotFather">
    Ouvrez Telegram et discutez avec **@BotFather** (confirmez que le gestionnaire est exactement `@BotFather`).

    Exécutez `/newbot`, suivez les instructions et enregistrez le jeton.

  </Step>

  <Step title="Configurer le jeton et la politique de DM">

```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing",
      groups: { "*": { requireMention: true } },
    },
  },
}
```

    Alternative de variable d'environnement : `TELEGRAM_BOT_TOKEN=...` (compte par défaut uniquement).
    Telegram n'utilise **pas** `openclaw channels login telegram` ; configurez le jeton dans config/env, puis démarrez la passerelle.

  </Step>

  <Step title="Démarrer la passerelle et approuver le premier DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Les codes de jumelage expirent après 1 heure.

  </Step>

  <Step title="Ajouter le bot à un groupe">
    Ajoutez le bot à votre groupe, puis définissez `channels.telegram.groups` et `groupPolicy` pour correspondre à votre modèle d'accès.
  </Step>
</Steps>

<Note>L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration l'emportent sur la valeur de repli de l'environnement, et `TELEGRAM_BOT_TOKEN` s'applique uniquement au compte par défaut.</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Mode de confidentialité et visibilité du groupe">
    Les bots Telegram sont par défaut en **Mode de confidentialité**, ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages du groupe, vous pouvez soit :

    - désactiver le mode de confidentialité via `/setprivacy`, ou
    - rendre le bot administrateur du groupe.

    Lorsque vous basculez le mode de confidentialité, supprimez et ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique le changement.

  </Accordion>

  <Accordion title="Group permissions">
    Le statut d'administrateur est contrôlé dans les paramètres du groupe Telegram.

    Les bots administrateurs reçoivent tous les messages du groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` pour autoriser/refuser les ajouts au groupe
    - `/setprivacy` pour le comportement de visibilité du groupe

  </Accordion>
</AccordionGroup>

## Contrôle d'accès et activation

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.telegram.dmPolicy` contrôle l'accès aux messages directs :

    - `pairing` (par défaut)
    - `allowlist` (nécessite au moins un ID d'expéditeur dans `allowFrom`)
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` accepte les IDs numériques d'utilisateurs Telegram. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    `dmPolicy: "allowlist"` avec un `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    L'intégration accepte les entrées `@username` et les résout en IDs numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste blanche `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous utilisiez précédemment des fichiers de liste blanche de magasin d'appairage, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste blanche (par exemple lorsque `dmPolicy: "allowlist"` n'a pas encore d'IDs explicites).

    Pour les bots à un seul propriétaire, préférez `dmPolicy: "allowlist"` avec des IDs numériques `allowFrom` explicites pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appairage précédentes).

    ### Trouver votre ID d'utilisateur Telegram

    Plus sûr (pas de bot tiers) :

    1. Envoyez un DM à votre bot.
    2. Exécutez `openclaw logs --follow`.
    3. Lisez `from.id`.

    Méthode officielle de Bot API :

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    Méthode tierce (moins privée) : `@userinfobot` ou `@getidsbot`.

  </Tab>

  <Tab title="Stratégie de groupe et listes d'autorisation">
    Deux contrôles s'appliquent conjointement :

    1. **Quels groupes sont autorisés** (`channels.telegram.groups`)
       - aucune configuration `groups` :
         - avec `groupPolicy: "open"` : n'importe quel groupe peut réussir les vérifications d'ID de groupe
         - avec `groupPolicy: "allowlist"` (par défaut) : les groupes sont bloqués jusqu'à ce que vous ajoutiez des entrées `groups` (ou `"*"`)
       - `groups` configuré : agit comme une liste d'autorisation (IDs explicites ou `"*"`)

    2. **Quels expéditeurs sont autorisés dans les groupes** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (par défaut)
       - `disabled`

    `groupAllowFrom` est utilisé pour le filtrage des expéditeurs de groupe. S'il n'est pas défini, Telegram revient à `allowFrom`.
    Les entrées `groupAllowFrom` doivent être des IDs utilisateur numériques Telegram (les préfixes `telegram:` / `tg:` sont normalisés).
    Ne mettez pas les IDs de chat de groupe ou de supergroupe Telegram dans `groupAllowFrom`. Les IDs de chat négatifs appartiennent à `channels.telegram.groups`.
    Les entrées non numériques sont ignorées pour l'autorisation de l'expéditeur.
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur de groupe n'hérite **pas** des approbations du magasin d'appariement DM.
    L'appariement reste réservé au DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Note d'exécution : si `channels.telegram` est complètement absent, l'exécution revient par défaut à `groupPolicy="allowlist"` fermé par défaut, sauf si `channels.defaults.groupPolicy` est explicitement défini.

    Exemple : autoriser n'importe quel membre dans un groupe spécifique :

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          groupPolicy: "open",
          requireMention: false,
        },
      },
    },
  },
}
```

    Exemple : autoriser uniquement des utilisateurs spécifiques dans un groupe spécifique :

```json5
{
  channels: {
    telegram: {
      groups: {
        "-1001234567890": {
          requireMention: true,
          allowFrom: ["8734062810", "745123456"],
        },
      },
    },
  },
}
```

    <Warning>
      Erreur courante : `groupAllowFrom` n'est pas une liste d'autorisation de groupe Telegram.

      - Mettez les IDs de chat de groupe ou de supergroupe négatifs Telegram comme `-1001234567890` sous `channels.telegram.groups`.
      - Mettez les IDs utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous souhaitez limiter les personnes autorisées dans un groupe pouvant déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous souhaitez que n'importe quel membre d'un groupe autorisé puisse parler au bot.
    </Warning>

  </Tab>

  <Tab title="Mention behavior">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername` , ou
    - des modèles de mention dans :
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Commandes de basculement au niveau de la session :

    - `/activation always`
    - `/activation mention`

    Celles-ci ne mettent à jour que l'état de la session. Utilisez la configuration pour la persistance.

    Exemple de configuration persistante :

```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: false },
      },
    },
  },
}
```

    Obtenir l'ID de chat de groupe :

    - transférer un message de groupe vers `@userinfobot` / `@getidsbot`
    - ou lire `chat.id` depuis `openclaw logs --follow`
    - ou inspecter API `getUpdates`

  </Tab>
</Tabs>

## Comportement d'exécution

- Telegram appartient au processus de passerelle.
- Le routage est déterministe : les réponses entrantes Telegram reviennent vers Telegram (le modèle ne choisit pas les canaux).
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec les métadonnées de réponse et les espaces réservés pour les médias.
- Les sessions de groupe sont isolées par l'ID de groupe. Les sujets du forum ajoutent `:topic:<threadId>` pour maintenir les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id` ; OpenClaw les achemine avec des clés de session sensibles aux fils de discussion et conserve l'ID du fil pour les réponses.
- Le long polling utilise le runner grammY avec un séquencement par chat par fil de discussion. La concurrence globale du sink du runner utilise `agents.defaults.maxConcurrent`.
- Le Bot Telegram API ne prend pas en charge les accusés de réception (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Live stream preview (message edits)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - chats directs : message de prévisualisation + `editMessageText`
    - groupes/sujets : message de prévisualisation + `editMessageText`

    Condition requise :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` correspond à `partial` sur Telegram (compatibilité avec la nommage inter-canal)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont mappées automatiquement

    Pour les réponses texte uniquement :

    - DM : OpenClaw conserve le même message de prévisualisation et effectue une modification finale sur place (pas de second message)
    - groupe/sujet : OpenClaw conserve le même message de prévisualisation et effectue une modification finale sur place (pas de second message)

    Pour les réponses complexes (par exemple les charges utiles multimédias), OpenClaw revient à la livraison finale normale puis nettoie le message de prévisualisation.

    Le streaming de prévisualisation est distinct du block streaming. Lorsque le block streaming est explicitement activé pour Telegram, OpenClaw ignore le flux de prévisualisation pour éviter le double-streaming.

    Si le transport de brouillon natif n'est pas disponible/rejeté, OpenClaw revient automatiquement à `sendMessage` + `editMessageText`.

    Flux de raisonnement exclusif à Telegram :

    - `/reasoning stream` envoie le raisonnement à la prévisualisation en direct pendant la génération
    - la réponse finale est envoyée sans le texte de raisonnement

  </Accordion>

  <Accordion title="Mise en forme et repli HTML">
    Le texte sortant utilise Telegram `parse_mode: "HTML"`.

    - Le texte de type Markdown est rendu en HTML sécurisé pour Telegram.
    - Le HTML brut du model est échappé pour réduire les échecs d'analyse de Telegram.
    - Si Telegram rejette le HTML analysé, OpenClaw réessaie en texte brut.

    Les aperçus de liens sont activés par défaut et peuvent être désactivés avec `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Commandes natives et commandes personnalisées">
    L'enregistrement du menu de commandes Telegram est géré au démarrage avec `setMyCommands`.

    Valeurs par défaut des commandes natives :

    - `commands.native: "auto"` active les commandes natives pour Telegram

    Ajouter des entrées de menu de commandes personnalisées :

```json5
{
  channels: {
    telegram: {
      customCommands: [
        { command: "backup", description: "Git backup" },
        { command: "generate", description: "Create an image" },
      ],
    },
  },
}
```

    Règles :

    - les noms sont normalisés (suppression du `/` de début, en minuscules)
    - modèle valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plug-in/compétence peuvent toujours fonctionner lorsqu'elles sont saisies, même si elles ne sont pas affichées dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plug-in peuvent toujours s'enregistrer si elles sont configurées.

    Échecs de configuration courants :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram déborde toujours après la réduction ; réduisez les commandes de plug-in/compétence/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `setMyCommands failed` avec des erreurs de réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appariement d'appareils (plug-in `device-pair`)

    Lorsque le plug-in `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` répertorie les demandes en attente (y compris le rôle/les portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Appariement](/en/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Boutons en ligne">
    Configurer la portée du clavier en ligne :

```json5
{
  channels: {
    telegram: {
      capabilities: {
        inlineButtons: "allowlist",
      },
    },
  },
}
```

    Remplacement par compte :

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          capabilities: {
            inlineButtons: "allowlist",
          },
        },
      },
    },
  },
}
```

    Portées :

    - `off`
    - `dm`
    - `group`
    - `all`
    - `allowlist` (par défaut)

    L'ancien `capabilities: ["inlineButtons"]` correspond à `inlineButtons: "all"`.

    Exemple d'action de message :

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Choose an option:",
  buttons: [
    [
      { text: "Yes", callback_data: "yes" },
      { text: "No", callback_data: "no" },
    ],
    [{ text: "Cancel", callback_data: "cancel" }],
  ],
}
```

    Les clics de rappel sont transmis à l'agent sous forme de texte :
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Actions de message Telegram pour les agents et l'automatisation">
    Les actions d'outil Telegram incluent :

    - `sendMessage` (`to`, `content`, `mediaUrl` facultatif, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, `iconColor` facultatif, `iconCustomEmojiId`)

    Les actions de message de canal exposent des alias ergonomiques (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Contrôles de blocage :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` distincts.
    Les envois lors de l'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram prend en charge les balises de fil de réponse explicites dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`

    Remarque : `off` désactive le fil de réponse implicite. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets du forum et comportement des fils">
    Super-groupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id` (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions d'écriture incluent toujours `message_thread_id`

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe, sauf en cas de substitution (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est réservé aux sujets et n'hérite pas des valeurs par défaut du groupe.

    **Routage d'agent par sujet** : chaque sujet peut être routé vers un agent différent en définissant `agentId` dans la configuration du sujet. Cela donne à chaque sujet son propre espace de travail isolé, sa mémoire et sa session. Exemple :

    ```json5
    {
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "1": { agentId: "main" },      // General topic → main agent
                "3": { agentId: "zu" },        // Dev topic → zu agent
                "5": { agentId: "coder" }      // Code review → coder agent
              }
            }
          }
        }
      }
    }
    ```

    Chaque sujet possède alors sa propre clé de session : `agent:zu:telegram:group:-1001234567890:topic:3`

    **Liaison persistante de sujet ACP** : les sujets de forum peuvent épingler les sessions de harnais ACP via des liaisons ACP typées de niveau supérieur :

    - `bindings[]` avec `type: "acp"` et `match.channel: "telegram"`

    Exemple :

    ```json5
    {
      agents: {
        list: [
          {
            id: "codex",
            runtime: {
              type: "acp",
              acp: {
                agent: "codex",
                backend: "acpx",
                mode: "persistent",
                cwd: "/workspace/openclaw",
              },
            },
          },
        ],
      },
      bindings: [
        {
          type: "acp",
          agentId: "codex",
          match: {
            channel: "telegram",
            accountId: "default",
            peer: { kind: "group", id: "-1001234567890:topic:42" },
          },
        },
      ],
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              topics: {
                "42": {
                  requireMention: false,
                },
              },
            },
          },
        },
      },
    }
    ```

    Ceci est actuellement limité aux sujets de forum dans les groupes et super-groupes.

    **Génération ACP liée au fil depuis le chat** :

    - `/acp spawn <agent> --thread here|auto` peut lier le sujet Telegram actuel à une nouvelle session ACP.
    - les messages de suivi du sujet sont routés directement vers la session ACP liée (aucun `/acp steer` requis).
    - OpenClaw épingle le message de confirmation de génération dans le sujet après une liaison réussie.
    - Nécessite `channels.telegram.threadBindings.spawnAcpSessions=true`.

    Le contexte du modèle inclut :

    - `MessageThreadId`
    - `IsForum`

    Comportement du fil DM :

    - les chats privés avec `message_thread_id` conservent le routage DM mais utilisent des clés de session/cibles de réponse tenant compte du fil.

  </Accordion>

  <Accordion title="Audio, vidéo et stickers">
    ### Messages audio

    Telegram fait la distinction entre les notes vocales et les fichiers audio.

    - par défaut : comportement de fichier audio
    - balise `[[audio_as_voice]]` dans la réponse de l'agent pour forcer l'envoi d'une note vocale

    Exemple d'action de message :

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### Messages vidéo

    Telegram fait la distinction entre les fichiers vidéo et les notes vidéo.

    Exemple d'action de message :

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    Les notes vidéo ne prennent pas en charge les légendes ; le texte du message fourni est envoyé séparément.

    ### Stickers

    Gestion des stickers entrants :

    - WEBP statique : téléchargé et traité (espace réservé `<media:sticker>`)
    - TGS animé : ignoré
    - WEBM vidéo : ignoré

    Champs de contexte du sticker :

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Fichier de cache de stickers :

    - `~/.openclaw/telegram/sticker-cache.json`

    Les stickers sont décrits une fois (si possible) et mis en cache pour réduire les appels de vision répétés.

    Activer les actions de stickers :

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    Envoyer l'action de sticker :

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Rechercher les stickers en cache :

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Reaction notifications">
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction` (séparées des payloads de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own` signifie que seules les réactions des utilisateurs aux messages envoyés par le bot sont prises en compte (au mieux, via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas d'identifiants de fil de discussion dans les mises à jour de réaction.
      - les groupes non-forum routent vers la session de chat de groupe
      - les groupes de forum routent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet exact d'origine

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` envoie un émoji d'accusé de réception pendant que OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - repli vers l'émoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

    Remarques :

    - Telegram attend des émojis unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour une chaîne ou un compte.

  </Accordion>

  <Accordion title="Écritures de configuration depuis les événements et les commandes Telegram">
    Les écritures de configuration du canal sont activées par défaut (`configWrites !== false`).

    Les écritures déclenchées par Telegram incluent :

    - les événements de migration de groupe (`migrate_to_chat_id`) pour mettre à jour `channels.telegram.groups`
    - `/config set` et `/config unset` (nécessite l'activation des commandes)

    Désactiver :

```json5
{
  channels: {
    telegram: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Long polling vs webhook">
    Par défaut : long polling.

    Mode webhook :

    - définissez `channels.telegram.webhookUrl`
    - définissez `channels.telegram.webhookSecret` (requis lorsque l'URL du webhook est définie)
    - optionnel `channels.telegram.webhookPath` (par défaut `/telegram-webhook`)
    - optionnel `channels.telegram.webhookHost` (par défaut `127.0.0.1`)
    - optionnel `channels.telegram.webhookPort` (par défaut `8787`)

    L'écouteur local par défaut pour le mode webhook se lie à `127.0.0.1:8787`.

    Si votre point de terminaison public est différent, placez un proxy inverse devant et pointez `webhookUrl` vers l'URL publique.
    Définissez `webhookHost` (par exemple `0.0.0.0`) lorsque vous avez intentionnellement besoin d'un accès externe.

  </Accordion>

  <Accordion title="Limites, nouvelles tentatives et cibles CLI">
    - `channels.telegram.textChunkLimit` par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client Telegram API (si non défini, la valeur par défaut grammY s'applique).
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - contrôles de l'historique DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la config `channels.telegram.retry` s'applique aux helpers d'envoi Telegram (CLI/tools/actions) pour les erreurs API sortantes récupérables.

    La cible d'envoi API peut être un ID de chat numérique ou un nom d'utilisateur :

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Les sondages CLI utilisent `openclaw message poll` et prennent en charge les sujets de forum :

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Drapeaux de sondage Telegram uniquement :

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` pour les sujets de forum (ou utilisez une cible `:topic:`)

    L'envoi Telegram prend également en charge :

    - `--buttons` pour les claviers en ligne lorsque `channels.telegram.capabilities.inlineButtons` l'autorise
    - `--force-document` pour envoyer des images et des GIF sortants sous forme de documents plutôt que comme des photos compressées ou des téléchargements de médias animés

    Gestion des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations d'exécution sur Telegram">
    Telegram prend en charge les approbations d'exécution dans les DMs des approbateurs et peut éventuellement publier des invites d'approbation dans le chat ou le sujet d'origine.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`

    Les approbateurs doivent être des ID utilisateur numériques Telegram. Lorsque `enabled` est faux ou que `approvers` est vide, Telegram n'agit pas comme client d'approbation d'exécution. Les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de secours pour l'approbation d'exécution.

    Règles de livraison :

    - `target: "dm"` envoie les invites d'approbation uniquement aux DMs des approbateurs configurés
    - `target: "channel"` renvoie l'invite au chat/sujet Telegram d'origine
    - `target: "both"` envoie aux DMs des approbateurs et au chat/sujet d'origine

    Seuls les approbateurs configurés peuvent approuver ou refuser. Les non-approbateurs ne peuvent pas utiliser `/approve` ni utiliser les boutons d'approbation Telegram.

    La livraison sur le canal affiche le texte de la commande dans le chat, n'activez donc `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet pour l'invite d'approbation et le suivi post-approbation.

    Les boutons d'approbation en ligne dépendent également de `channels.telegram.capabilities.inlineButtons` autorisant la surface cible (`dm`, `group` ou `all`).

    Documentation connexe : [Approbations d'exécution](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - Si `requireMention=false`, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Disable
      - puis supprimer et rajouter le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe non mentionnés.
    - `openclaw channels status --probe` peut vérifier les ID numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une vérification d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Bot ne voit pas du tout les messages du groupe">

    - lorsque `channels.telegram.groups` existe, le groupe doit être listé (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons de l'omission

  </Accordion>

  <Accordion title="Les commandes fonctionnent partiellement ou pas du tout">

    - autorisez votre identité d'expéditeur (jumelage et/ou identifiant numérique `allowFrom`)
    - l'autorisation des commandes s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plug-in/compétence/personnalisées ou désactivez les menus natifs
    - `setMyCommands failed` avec des erreurs de réseau/récupération indique généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Polling ou instabilité du réseau">

    - Node 22+ + fetch/proxy personnalisé peut déclencher un comportement d'abandon immédiat si les types AbortSignal ne correspondent pas.
    - Certains hôtes résolvent `api.telegram.org` d'abord en IPv6 ; une sortie IPv6 défaillante peut provoquer des échecs intermittents de l'Telegram API.
    - Si les journaux incluent `TypeError: fetch failed` ou `Network request for 'getUpdates' failed!`, OpenClaw réessaie désormais ces erreurs en tant qu'erreurs réseau récupérables.
    - Sur les hôtes VPS avec une sortie/TLS directe instable, acheminez les appels de l'Telegram API via `channels.telegram.proxy` :

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ utilise par défaut `autoSelectFamily=true` (sauf WSL2) et `dnsResultOrder=ipv4first`.
    - Si votre hôte est WSL2 ou fonctionne explicitement mieux avec un comportement IPv4 uniquement, forcez la sélection de la famille :

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Remplacements d'environnement (temporaires) :
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - Validez les réponses DNS :

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

Plus d'aide : [Channel troubleshooting](/en/channels/troubleshooting).

## Telegram pointeurs de référence de configuration

Référence principale :

- `channels.telegram.enabled` : activer/désactiver le démarrage du canal.
- `channels.telegram.botToken` : jeton du bot (BotFather).
- `channels.telegram.tokenFile` : lire le jeton depuis un chemin de fichier classique. Les liens symboliques sont rejetés.
- `channels.telegram.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : pairing).
- `channels.telegram.allowFrom` : liste d'autorisation DM (identifiants utilisateur numériques Telegram). `allowlist` nécessite au moins un ID d'expéditeur. `open` nécessite `"*"`. `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en ID et peut récupérer les entrées de la liste d'autorisation à partir des fichiers de stockage d'appariement dans les flux de migration de la liste d'autorisation.
- `channels.telegram.actions.poll` : activer ou désactiver la création de sondages Telegram (par défaut : activé ; nécessite toujours `sendMessage`).
- `channels.telegram.defaultTo` : cible Telegram par défaut utilisée par la CLI `--deliver` lorsqu'aucune `--reply-to` explicite n'est fournie.
- `channels.telegram.groupPolicy` : `open | allowlist | disabled` (par défaut : liste blanche).
- `channels.telegram.groupAllowFrom` : liste blanche des expéditeurs de groupe (IDs utilisateur Telegram numériques). `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en IDs. Les entrées non numériques sont ignorées au moment de l'authentification. L'authentification de groupe n'utilise pas le repli du magasin d'appariement DM (`2026.2.25+`).
- Priorité multi-compte :
  - Lorsque deux ou plusieurs IDs de compte sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite.
  - Si aucun n'est défini, OpenClaw revient au premier ID de compte normalisé et `openclaw doctor` avertit.
  - `channels.telegram.accounts.default.allowFrom` et `channels.telegram.accounts.default.groupAllowFrom` ne s'appliquent qu'au compte `default`.
  - Les comptes nommés héritent de `channels.telegram.allowFrom` et `channels.telegram.groupAllowFrom` lorsque les valeurs au niveau du compte ne sont pas définies.
  - Les comptes nommés n'héritent pas de `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups` : valeurs par par groupe + liste d'autorisation (utilisez `"*"` pour les valeurs par globales).
  - `channels.telegram.groups.<id>.groupPolicy` : remplacement pour chaque groupe de groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention` : valeur par défaut de la mention gating.
  - `channels.telegram.groups.<id>.skills` : filtre de compétence (omit = toutes les compétences, empty = aucune).
  - `channels.telegram.groups.<id>.allowFrom` : remplacement de la liste d'autorisation des expéditeurs par groupe.
  - `channels.telegram.groups.<id>.systemPrompt` : invite système supplémentaire pour le groupe.
  - `channels.telegram.groups.<id>.enabled` : désactiver le groupe lorsque `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*` : remplacements par sujet (champs de groupe + `agentId` exclusifs au sujet).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId` : acheminer ce sujet vers un agent spécifique (remplace le routage au niveau du groupe et de la liaison).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy` : remplacement par sujet pour groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention` : remplacement par sujet pour le filtrage des mentions.
- `bindings[]` de niveau supérieur avec `type: "acp"` et l'ID du sujet canonique `chatId:topic:topicId` dans `match.peer.id` : champs de liaison persistante du sujet ACP (voir [ACP Agents](/en/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId` : acheminer les sujets de DM vers un agent spécifique (même comportement que pour les sujets de forum).
- `channels.telegram.execApprovals.enabled` : activer Telegram en tant que client d'approbation exec basé sur le chat pour ce compte.
- `channels.telegram.execApprovals.approvers` : ID d'utilisateur Telegram autorisés à approuver ou refuser les requêtes exec. Requis lorsque les approbations exec sont activées.
- `channels.telegram.execApprovals.target` : `dm | channel | both` (par défaut : `dm`). `channel` et `both` préservent le sujet Telegram d'origine lorsqu'il est présent.
- `channels.telegram.execApprovals.agentFilter` : filtre ID d'agent optionnel pour les invites d'approbation transférées.
- `channels.telegram.execApprovals.sessionFilter` : filtre de clé de session optionnel (sous-chaîne ou regex) pour les invites d'approbation transférées.
- `channels.telegram.accounts.<account>.execApprovals` : remplacement par compte pour le routage des approbations d'exécution Telegram et l'autorisation des approbateurs.
- `channels.telegram.capabilities.inlineButtons` : `off | dm | group | all | allowlist` (par défaut : allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons` : remplacement par compte.
- `channels.telegram.commands.nativeSkills` : activer/désactiver les commandes de compétences natives Telegram.
- `channels.telegram.replyToMode` : `off | first | all` (par défaut : `off`).
- `channels.telegram.textChunkLimit` : taille du bloc sortant (caractères).
- `channels.telegram.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.telegram.linkPreview` : activer/désactiver les aperçus de liens pour les messages sortants (par défaut : true).
- `channels.telegram.streaming` : `off | partial | block | progress` (aperçu du flux en direct ; par défaut : `partial` ; `progress` correspond à `partial` ; `block` est la compatibilité avec le mode d'aperçu hérité). Le streaming d'aperçu Telegram utilise un seul message d'aperçu qui est modifié sur place.
- `channels.telegram.mediaMaxMb` : limite de taille des médias Telegram entrants/sortants (Mo, par défaut : 100).
- `channels.telegram.retry` : stratégie de réessai pour les assistants d'envoi Telegram (CLI/tools/actions) sur les erreurs API sortantes récupérables (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily` : remplacer le Node autoSelectFamily (true=activer, false=désactiver). Activé par défaut sur Node 22+, avec WSL2 désactivé par défaut.
- `channels.telegram.network.dnsResultOrder` : remplacer l'ordre des résultats DNS (`ipv4first` ou `verbatim`). Par défaut `ipv4first` sur Node 22+.
- `channels.telegram.proxy` : URL du proxy pour les appels Bot API (SOCKS/HTTP).
- `channels.telegram.webhookUrl` : activer le mode webhook (nécessite `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret` : secret du webhook (requis quand webhookUrl est défini).
- `channels.telegram.webhookPath` : chemin du webhook local (par défaut `/telegram-webhook`).
- `channels.telegram.webhookHost` : hôte de liaison du webhook local (par défaut `127.0.0.1`).
- `channels.telegram.webhookPort` : port de liaison du webhook local (par défaut `8787`).
- `channels.telegram.actions.reactions` : limiter les réactions du Telegram tool.
- `channels.telegram.actions.sendMessage` : limiter les envois de messages du Telegram tool.
- `channels.telegram.actions.deleteMessage` : limiter les suppressions de messages du Telegram tool.
- `channels.telegram.actions.sticker` : limiter les actions de stickers Telegram — envoi et recherche (par défaut : false).
- `channels.telegram.reactionNotifications` : `off | own | all` — contrôler quelles réactions déclenchent des événements système (par défaut `own` si non défini).
- `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` — contrôler la capacité de réaction de l'agent (par défaut `minimal` si non défini).

- [Référence de configuration - Telegram](/en/gateway/configuration-reference#telegram)

Champs importants spécifiques à Telegram :

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- threading/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `blockStreaming`
- formatting/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/réseau : `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capacités : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- réactions : `reactionNotifications`, `reactionLevel`
- writes/history : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Connexes

- [Appariement](/en/channels/pairing)
- [Routage de canal](/en/channels/channel-routing)
- [Routage multi-agent](/en/concepts/multi-agent)
- [Dépannage](/en/channels/troubleshooting)

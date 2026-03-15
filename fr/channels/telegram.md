---
summary: "Statut, capacités et configuration du support bot Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

Statut : prêt pour la production pour les DMs de bot + les groupes via grammY. Le long polling est le mode par défaut ; le mode webhook est optionnel.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    La politique DM par défaut pour Telegram est l'appairage.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples de configuration complète de canal.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Create the bot token in BotFather">
    Ouvrez Telegram et discutez avec **@BotFather** (confirmez que le handle est exactement `@BotFather`).

    Exécutez `/newbot`, suivez les instructions et enregistrez le jeton.

  </Step>

  <Step title="Configure token and DM policy">

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

    Fallback Env : `TELEGRAM_BOT_TOKEN=...` (compte par défaut uniquement).
    Telegram n'utilise **pas** `openclaw channels login telegram` ; configurez le jeton dans config/env, puis démarrez la passerelle.

  </Step>

  <Step title="Start gateway and approve first DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Les codes d'appairage expirent après 1 heure.

  </Step>

  <Step title="Add the bot to a group">
    Ajoutez le bot à votre groupe, puis définissez `channels.telegram.groups` et `groupPolicy` pour correspondre à votre modèle d'accès.
  </Step>
</Steps>

<Note>
  La résolution des jetons est consciente du compte. En pratique, les valeurs de configuration
  l'emportent sur le repli sur les variables d'environnement, et `TELEGRAM_BOT_TOKEN` s'applique
  uniquement au compte par défaut.
</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Mode de confidentialité et visibilité des groupes">
    Les bots Telegram sont par défaut en **Mode de confidentialité**, ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages de groupe, vous pouvez soit :

    - désactiver le mode de confidentialité via `/setprivacy`, ou
    - nommer le bot administrateur du groupe.

    Lorsque vous basculez le mode de confidentialité, retirez et ajoutez à nouveau le bot dans chaque groupe afin que Telegram applique le changement.

  </Accordion>

  <Accordion title="Autorisations de groupe">
    Le statut d'administrateur est contrôlé dans les paramètres de groupe Telegram.

    Les bots administrateurs reçoivent tous les messages de groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Basculateurs BotFather utiles">

    - `/setjoingroups` pour autoriser/interdire les ajouts dans les groupes
    - `/setprivacy` pour le comportement de visibilité des groupes

  </Accordion>
</AccordionGroup>

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` contrôle l'accès aux messages directs :

    - `pairing` (par défaut)
    - `allowlist` (nécessite au moins un ID d'expéditeur dans `allowFrom`)
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` accepte les ID utilisateur Telegram numériques. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    `dmPolicy: "allowlist"` avec un `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    L'assistant d'intégration (onboarding wizard) accepte les entrées `@username` et les résout en ID numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous utilisiez précédemment des fichiers de liste d'autorisation de magasin d'appariement, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple, lorsque `dmPolicy: "allowlist"` n'a pas encore d'ID explicites).

    Pour les bots à un seul propriétaire, privilégiez `dmPolicy: "allowlist"` avec des ID numériques `allowFrom` explicites pour maintenir la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appariement précédentes).

    ### Trouver votre ID utilisateur Telegram

    Plus sûr (pas de bot tiers) :

    1. Envoyez un DM à votre bot.
    2. Exécutez `openclaw logs --follow`.
    3. Lisez `from.id`.

    Méthode officielle du Bot API :

```bash
curl "https://api.telegram.org/bot<bot_token>/getUpdates"
```

    Méthode tierce (moins privée) : `@userinfobot` ou `@getidsbot`.

  </Tab>

  <Tab title="Stratégie de groupe et listes d'autorisation">
    Deux contrôles s'appliquent conjointement :

    1. **Quels groupes sont autorisés** (`channels.telegram.groups`)
       - aucune configuration `groups` :
         - avec `groupPolicy: "open"` : n'importe quel groupe peut passer les vérifications d'ID de groupe
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
    L'appariement reste limité aux DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Note d'exécution : si `channels.telegram` est complètement manquant, l'exécution revient par défaut à `groupPolicy="allowlist"` en échec sécurisé, sauf si `channels.defaults.groupPolicy` est explicitement défini.

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
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous voulez que n'importe quel membre d'un groupe autorisé puisse parler au bot.
    </Warning>

  </Tab>

  <Tab title="Comportement des mentions">
    Les réponses aux groupes nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername`, ou
    - des modèles de mention dans :
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Bascules de commande au niveau de la session :

    - `/activation always`
    - `/activation mention`

    Ceux-ci ne mettent à jour que l'état de la session. Utilisez la configuration pour la persistance.

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
    - ou inspecter le Bot API `getUpdates`

  </Tab>
</Tabs>

## Comportement à l'exécution

- Telegram appartient au processus de passerelle.
- Le routage est déterministe : les réponses entrantes Telegram reviennent vers Telegram (le modèle ne choisit pas les canaux).
- Les messages entrants sont normalisés dans l'enveloppe de canal partagé avec les métadonnées de réponse et les espaces réservés multimédias.
- Les sessions de groupe sont isolées par l'ID de groupe. Les sujets du forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id` ; OpenClaw les achemine avec des clés de session sensibles aux threads et conserve l'ID de thread pour les réponses.
- Le long polling utilise le runner grammY avec un séquencement par chat par thread. La concurrence globale du sink du runner utilise `agents.defaults.maxConcurrent`.
- Le Bot Telegram API ne prend pas en charge les accusés de réception de lecture (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu du flux en direct (modifications de message)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - discussions directes : message d'aperçu + `editMessageText`
    - groupes/sujets : message d'aperçu + `editMessageText`

    Conditions requises :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` est mappé à `partial` sur Telegram (compatibilité avec la nommage inter-OpenClaw)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont mappées automatiquement

    Pour les réponses texte uniquement :

    - DM : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de deuxième message)
    - groupe/sujet : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de deuxième message)

    Pour les réponses complexes (par exemple charges utiles média), Telegram revient à la livraison finale normale puis nettoie le message d'aperçu.

    La diffusion d'aperçu est distincte de la diffusion par blocs. Lorsque la diffusion par blocs est explicitement activée pour OpenClaw, OpenClaw ignore le flux d'aperçu pour éviter la double diffusion.

    Si le transport de brouillon natif est indisponible ou rejeté, Telegram revient automatiquement à `sendMessage` + `editMessageText`.

    Flux de raisonnement exclusif à Telegram :

    - `/reasoning stream` envoie le raisonnement à l'aperçu en direct lors de la génération
    - la réponse finale est envoyée sans le texte de raisonnement

  </Accordion>

  <Accordion title="Formatage et repli HTML">
    Le texte sortant utilise le `parse_mode: "HTML"` Telegram.

    - Le texte de type Markdown est rendu en HTML sécurisé pour Telegram.
    - Le HTML brut du modèle est échappé pour réduire les erreurs d'analyse Telegram.
    - Si Telegram rejette le HTML analysé, OpenClaw réessaie en texte brut.

    Les aperçus de liens sont activés par défaut et peuvent être désactivés avec `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Commandes natives et commandes personnalisées">
    L'enregistrement du menu des commandes Telegram est géré au démarrage avec `setMyCommands`.

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

    - les noms sont normalisés (supprimer le `/` de début, en minuscules)
    - motif valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugin/compétence peuvent toujours fonctionner lorsqu'elles sont tapées, même si elles ne s'affichent pas dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plugin peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram déborde toujours après le rognage ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `setMyCommands failed` avec des erreurs de réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appareilement (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair approve` approuve la dernière demande en attente

    Plus de détails : [Appareil](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

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

    Les clics sur les rappels sont transmis à l'agent sous forme de texte :
    `callback_data: <value>`

  </Accordion>

  <Accordion title="Actions de message Telegram pour les agents et l'automatisation">
    Les actions de l'outil Telegram incluent :

    - `sendMessage` (`to`, `content`, `mediaUrl` facultatif, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, `iconColor` facultatif, `iconCustomEmojiId`)

    Les actions de message de canal exposent des alias ergonomiques (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Contrôles de validation :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` séparés.
    Les envois d'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression de réaction : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Balises de fil de discussion des réponses">
    Telegram prend en charge les balises explicites de fil de discussion des réponses dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle le traitement :

    - `off` (par défaut)
    - `first`
    - `all`

    Remarque : `off` désactive le fil de discussion implicite des réponses. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets de forum et comportement des fils de discussion">
    Supergroupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'activité de écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id` (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions de écriture incluent toujours `message_thread_id`

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe sauf en cas de substitution (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est propre au sujet et n'hérite pas des valeurs par défaut du groupe.

    **Routage d'agent par sujet** : Chaque sujet peut être routé vers un agent différent en définissant `agentId` dans la configuration du sujet. Cela donne à chaque sujet son propre espace de travail, sa propre mémoire et sa propre session. Exemple :

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

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler des sessions de harnais ACP via des liaisons ACP typées de premier niveau :

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

    Ceci est actuellement limité aux sujets de forum dans les groupes et supergroupes.

    **Génération ACP liée au fil depuis le chat** :

    - `/acp spawn <agent> --thread here|auto` peut lier le sujet Telegram actuel à une nouvelle session ACP.
    - Les messages de suivi du sujet sont routés directement vers la session ACP liée (aucun `/acp steer` requis).
    - OpenClaw épingle le message de confirmation de génération dans le sujet après une liaison réussie.
    - Nécessite `channels.telegram.threadBindings.spawnAcpSessions=true`.

    Le contexte du modèle inclut :

    - `MessageThreadId`
    - `IsForum`

    Comportement du fil DM :

    - les chats privés avec `message_thread_id` conservent le routage DM mais utilisent des clés de session/cibles de réponse conscientes des fils.

  </Accordion>

  <Accordion title="Audio, vidéo et stickers">
    ### Messages audio

    Telegram distingue les notes vocales des fichiers audio.

    - par défaut : comportement des fichiers audio
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

    Telegram distingue les fichiers vidéo des notes vidéo.

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

    Action d'envoi de sticker :

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Rechercher les stickers mis en cache :

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Notifications de réaction">
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction` (séparément des payloads de messages).

    Lorsqu'elles sont activées, OpenClaw met en file des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own` signifie les réactions des utilisateurs aux messages envoyés par le bot uniquement (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les IDs de fil dans les mises à jour de réaction.
      - les groupes non-forum routent vers la session de chat de groupe
      - les groupes forum routent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet d'origine exact

    `allowed_updates` pour le polling/webhook inclut `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Réactions d'accusé de réception">
    `ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - repli vers l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

    Notes :

    - Telegram attend des emoji unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

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

  <Accordion title="Polling long vs webhook">
    Par défaut : polling long.

    Mode webhook :

    - définir `channels.telegram.webhookUrl`
    - définir `channels.telegram.webhookSecret` (requis lorsque l'URL du webhook est définie)
    - `channels.telegram.webhookPath` facultatif (par défaut `/telegram-webhook`)
    - `channels.telegram.webhookHost` facultatif (par défaut `127.0.0.1`)
    - `channels.telegram.webhookPort` facultatif (par défaut `8787`)

    L'écouteur local par défaut pour le mode webhook se lie à `127.0.0.1:8787`.

    Si votre point de terminaison public est différent, placez un proxy inverse devant et pointez `webhookUrl` vers l'URL publique.
    Définissez `webhookHost` (par exemple `0.0.0.0`) lorsque vous avez intentionnellement besoin d'un trafic entrant externe.

  </Accordion>

  <Accordion title="Limites, nouvelles tentatives et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client Telegram de l'API (si non défini, la valeur par défaut grammY s'applique).
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - contrôles de l'historique des DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuration `channels.telegram.retry` s'applique aux assistants d'envoi Telegram (CLI/tools/actions) pour les erreurs API sortantes récupérables.

    La cible d'envoi CLI peut être un ID de chat numérique ou un nom d'utilisateur :

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
```

    Les sondages Telegram utilisent `openclaw message poll` et prennent en charge les sujets de forum :

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```

    Indicateurs de sondage exclusifs à Telegram :

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` pour les sujets de forum (ou utilisez une cible `:topic:`)

    Gating d'action :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations d'exécution dans Telegram">
    Telegram prend en charge les approbations d'exécution dans les DMs des approbateurs et peut facultativement publier les invites d'approbation dans la discussion ou le sujet d'origine.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers`
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`

    Les approbateurs doivent être des ID utilisateur numériques Telegram. Lorsque `enabled` est faux ou que `approvers` est vide, Telegram n'agit pas comme un client d'approbation d'exécution. Les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de repli d'approbation d'exécution.

    Règles de livraison :

    - `target: "dm"` envoie les invites d'approbation uniquement aux DMs des approbateurs configurés
    - `target: "channel"` renvoie l'invite à la discussion/sujet Telegram d'origine
    - `target: "both"` envoie aux DMs des approbateurs et à la discussion/sujet d'origine

    Seuls les approbateurs configurés peuvent approuver ou refuser. Les non-approbateurs ne peuvent pas utiliser `/approve` et ne peuvent pas utiliser les boutons d'approbation Telegram.

    La livraison par canal affiche le texte de la commande dans la discussion, n'activez donc `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet à la fois pour l'invite d'approbation et le suivi post-approbation.

    Les boutons d'approbation en ligne dépendent également de `channels.telegram.capabilities.inlineButtons` autorisant la surface cible (`dm`, `group` ou `all`).

    Documentation connexe : [Approbations d'exécution](/fr/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="Le bot ne répond pas aux messages de groupe sans mention">

    - Si `requireMention=false`, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Disable
      - puis retirer et ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe non mentionnés.
    - `openclaw channels status --probe` peut vérifier les ID numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une sonde d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Le bot ne voit pas les messages de groupe du tout">

    - lorsque `channels.telegram.groups` existe, le groupe doit être listé (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons d'ignorance

  </Accordion>

  <Accordion title="Les commandes fonctionnent partiellement ou pas du tout">

    - autoriser votre identité d'expéditeur (appariement et/ou `allowFrom` numérique)
    - l'autorisation de commande s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif a trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - `setMyCommands failed` avec des erreurs réseau/récupération indique généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + custom fetch/proxy can trigger immediate abort behavior if AbortSignal types mismatch.
    - Some hosts resolve `api.telegram.org` to IPv6 first; broken IPv6 egress can cause intermittent Telegram API failures.
    - If logs include `TypeError: fetch failed` or `Network request for 'getUpdates' failed!`, OpenClaw now retries these as recoverable network errors.
    - On VPS hosts with unstable direct egress/TLS, route Telegram API calls through `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ defaults to `autoSelectFamily=true` (except WSL2) and `dnsResultOrder=ipv4first`.
    - If your host is WSL2 or explicitly works better with IPv4-only behavior, force family selection:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Environment overrides (temporary):
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - Validate DNS answers:

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

More help: [Channel troubleshooting](/fr/channels/troubleshooting).

## Telegram config reference pointers

Primary reference:

- `channels.telegram.enabled`: enable/disable channel startup.
- `channels.telegram.botToken`: bot token (BotFather).
- `channels.telegram.tokenFile`: read token from a regular file path. Symlinks are rejected.
- `channels.telegram.dmPolicy`: `pairing | allowlist | open | disabled` (default: pairing).
- `channels.telegram.allowFrom`: DM allowlist (numeric Telegram user IDs). `allowlist` requires at least one sender ID. `open` requires `"*"`. `openclaw doctor --fix` can resolve legacy `@username` entries to IDs and can recover allowlist entries from pairing-store files in allowlist migration flows.
- `channels.telegram.actions.poll` : activer ou désactiver la création de sondages Telegram (par défaut : activé ; nécessite toujours `sendMessage`).
- `channels.telegram.defaultTo` : cible Telegram par défaut utilisée par CLI `--deliver` lorsqu'aucun `--reply-to` explicite n'est fourni.
- `channels.telegram.groupPolicy` : `open | allowlist | disabled` (par défaut : liste d'autorisation).
- `channels.telegram.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (identifiants utilisateur numériques Telegram). `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en identifiants. Les entrées non numériques sont ignorées lors de l'authentification. L'authentification de groupe n'utilise pas le repli du magasin d'appariement DM (`2026.2.25+`).
- Priorité multi-compte :
  - Lorsque deux identifiants de compte ou plus sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite.
  - Si aucun n'est défini, OpenClaw revient au premier identifiant de compte normalisé et `openclaw doctor` avertit.
  - `channels.telegram.accounts.default.allowFrom` et `channels.telegram.accounts.default.groupAllowFrom` ne s'appliquent qu'au compte `default`.
  - Les comptes nommés héritent de `channels.telegram.allowFrom` et de `channels.telegram.groupAllowFrom` lorsque les valeurs au niveau du compte ne sont pas définies.
  - Les comptes nommés n'héritent pas de `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups` : valeurs par par groupe + liste d'autorisation (utilisez `"*"` pour les valeurs par globales).
  - `channels.telegram.groups.<id>.groupPolicy` : remplacement pour chaque groupe de groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention` : valeur par défaut du filtrage des mentions.
  - `channels.telegram.groups.<id>.skills` : filtre de compétences (omettre = toutes les compétences, vide = aucune).
  - `channels.telegram.groups.<id>.allowFrom` : remplacement de la liste d'autorisation des expéditeurs pour chaque groupe.
  - `channels.telegram.groups.<id>.systemPrompt` : invite système supplémentaire pour le groupe.
  - `channels.telegram.groups.<id>.enabled` : désactiver le groupe lorsque `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*` : substitutions spécifiques par sujet (champs de groupe + `agentId` exclusivement pour le sujet).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId` : acheminer ce sujet vers un agent spécifique (remplace le routage au niveau du groupe et de la liaison).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy` : substitution spécifique au sujet pour groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention` : substitution du filtrage des mentions par sujet.
- `bindings[]` de premier niveau avec `type: "acp"` et l'ID canonique du sujet `chatId:topic:topicId` dans `match.peer.id` : champs de liaison persistants du sujet ACP (voir [ACP Agents](/fr/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId` : acheminer les sujets DM vers un agent spécifique (même comportement que les sujets de forum).
- `channels.telegram.execApprovals.enabled` : activer Telegram en tant que client d'approbation d'exécution basé sur le chat pour ce compte.
- `channels.telegram.execApprovals.approvers` : ID utilisateur Telegram autorisés à approuver ou refuser les demandes d'exécution. Requis lorsque les approbations d'exécution sont activées.
- `channels.telegram.execApprovals.target` : `dm | channel | both` (par défaut : `dm`). `channel` et `both` préservent le sujet Telegram d'origine lorsqu'il est présent.
- `channels.telegram.execApprovals.agentFilter` : filtre d'ID d'agent optionnel pour les invites d'approbation transférées.
- `channels.telegram.execApprovals.sessionFilter` : filtre de clé de session optionnel (sous-chaîne ou regex) pour les invites d'approbation transférées.
- `channels.telegram.accounts.<account>.execApprovals` : substitution par compte pour le routage et l'autorisation des approbateurs de l'exécution Telegram.
- `channels.telegram.capabilities.inlineButtons` : `off | dm | group | all | allowlist` (par défaut : liste d'autorisation).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons` : substitution par compte.
- `channels.telegram.commands.nativeSkills` : activer/désactiver les commandes de compétences natives Telegram.
- `channels.telegram.replyToMode` : `off | first | all` (par défaut : `off`).
- `channels.telegram.textChunkLimit` : taille du bloc sortant (caractères).
- `channels.telegram.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.telegram.linkPreview` : activer/désactiver les aperçus de liens pour les messages sortants (par défaut : true).
- `channels.telegram.streaming` : `off | partial | block | progress` (aperçu du flux en direct ; par défaut : `partial` ; `progress` correspond à `partial` ; `block` est pour la compatibilité avec le mode d'aperçu hérité). Le flux d'aperçu Telegram utilise un seul message d'aperçu qui est modifié sur place.
- `channels.telegram.mediaMaxMb` : limite de média Telegram entrant/sortant (Mo, par défaut : 100).
- `channels.telegram.retry` : politique de réessai pour les assistants d'envoi Telegram (CLI/outils/actions) en cas d'erreurs API sortantes récupérables (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily` : remplacer le autoSelectFamily de Node (true=activer, false=désactiver). Activé par défaut sur Node 22+, WSL2 étant désactivé par défaut.
- `channels.telegram.network.dnsResultOrder` : remplacer l'ordre des résultats DNS (`ipv4first` ou `verbatim`). Par défaut `ipv4first` sur Node 22+.
- `channels.telegram.proxy` : URL du proxy pour les appels au Bot API (SOCKS/HTTP).
- `channels.telegram.webhookUrl` : activer le mode webhook (nécessite `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret` : secret du webhook (requis quand webhookUrl est défini).
- `channels.telegram.webhookPath` : chemin local du webhook (par défaut `/telegram-webhook`).
- `channels.telegram.webhookHost` : hôte de liaison local du webhook (par défaut `127.0.0.1`).
- `channels.telegram.webhookPort` : port de liaison local du webhook (par défaut `8787`).
- `channels.telegram.actions.reactions` : filtrer les réactions aux outils Telegram.
- `channels.telegram.actions.sendMessage` : filtrer les envois de messages des outils Telegram.
- `channels.telegram.actions.deleteMessage` : filtrer les suppressions de messages des outils Telegram.
- `channels.telegram.actions.sticker` : contrôler les actions de stickers Telegram — envoi et recherche (par défaut : false).
- `channels.telegram.reactionNotifications` : `off | own | all` — contrôler les réactions qui déclenchent des événements système (par défaut `own` si non défini).
- `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` — contrôler la capacité de réaction de l'agent (par défaut `minimal` si non défini).

- [Référence de la configuration - Telegram](/fr/gateway/configuration-reference#telegram)

Champs à fort signal spécifiques à Telegram :

- démarrage/authentification : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- discussions/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capacités : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- réactions : `reactionNotifications`, `reactionLevel`
- writes/history : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Connexes

- [Appariement](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)

import fr from '/components/footer/fr.mdx';

<fr />

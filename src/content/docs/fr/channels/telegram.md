---
summary: "Statut de support, capacités et configuration du bot Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

Statut : prêt pour la production pour les DMs de bot + groupes via grammY. Le long polling est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/en/channels/pairing">
    La stratégie DM par défaut pour Telegram est l'appairage.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/en/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canal.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/en/gateway/configuration">
    Modèles et exemples de configuration complète du canal.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Create the bot token in BotFather">
    Ouvrez Telegram et chattez avec **@BotFather** (confirmez que le handle est exactement `@BotFather`).

    Exécutez `/newbot`, suivez les invites et enregistrez le jeton.

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
    Ajoutez le bot à votre groupe, puis définissez `channels.telegram.groups` et `groupPolicy` pour qu'ils correspondent à votre modèle d'accès.
  </Step>
</Steps>

<Note>L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration l'emportent sur le fallback d'env, et `TELEGRAM_BOT_TOKEN` ne s'applique qu'au compte par défaut.</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Les bots Telegram sont par défaut en **Privacy Mode**, ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages de groupe, vous pouvez soit :

    - désactiver le mode privé via `/setprivacy`, soit
    - rendre le bot administrateur du groupe.

    Lorsque vous basculez le mode privé, retirez et ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique la modification.

  </Accordion>

  <Accordion title="Group permissions">
    Le statut d'administrateur est contrôlé dans les paramètres de groupe Telegram.

    Les bots administrateurs reçoivent tous les messages de groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` pour autoriser/interdire les ajouts dans les groupes
    - `/setprivacy` pour le comportement de visibilité dans les groupes

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

    `channels.telegram.allowFrom` accepte les IDs utilisateur numériques Telegram. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    `dmPolicy: "allowlist"` avec un `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    L'intégration accepte les entrées `@username` et les résout en IDs numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous utilisiez précédemment des fichiers de liste d'autorisation de magasin d'appariement, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple, lorsque `dmPolicy: "allowlist"` n'a pas encore d'IDs explicites).

    Pour les bots à un seul propriétaire, privilégiez `dmPolicy: "allowlist"` avec des IDs numériques `allowFrom` explicites pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appariement précédentes).

    ### Trouver votre ID utilisateur Telegram

    Plus sûr (pas de bot tiers) :

    1. Envoyez un message privé à votre bot.
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
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur de groupe **n'hérite pas** des approbations du magasin d'appariement DM.
    L'appariement reste limité aux DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Remarque d'exécution : si `channels.telegram` est totalement absent, l'exécution revient par défaut à `groupPolicy="allowlist"` en mode échec-fermé, sauf si `channels.defaults.groupPolicy` est défini explicitement.

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
      - Mettez les IDs utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous souhaitez limiter les personnes au sein d'un groupe autorisé pouvant déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous souhaitez que n'importe quel membre d'un groupe autorisé puisse parler au bot.
    </Warning>

  </Tab>

  <Tab title="Comportement de mention">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - mention native `@botusername`, ou
    - modèles de mention dans :
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Commutateurs de commande au niveau de la session :

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

## Comportement d'exécution

- Telegram appartient au processus de passerelle.
- Le routage est déterministe : les réponses entrantes Telegram reviennent vers Telegram (le modèle ne choisit pas les canaux).
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec les métadonnées de réponse et les espaces réservés pour les médias.
- Les sessions de groupe sont isolées par ID de groupe. Les sujets du forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id` ; OpenClaw les achemine avec des clés de session conscientes des fils et préserve l'ID de fil pour les réponses.
- Le polling long utilise le lanceur grammY avec un séquençage par chat/fil. La concurrence globale du récepteur du lanceur utilise `agents.defaults.maxConcurrent`.
- Le Bot Telegram API ne prend pas en charge les accusés de lecture (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu en direct du flux (modifications de message)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - discussions directes : message d'aperçu + `editMessageText`
    - groupes/sujets : message d'aperçu + `editMessageText`

    Condition requise :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` correspond à `partial` sur Telegram (compatibilité avec la nommage inter-OpenClaw)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont mappées automatiquement

    Pour les réponses en texte uniquement :

    - DM : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de second message)
    - groupe/sujet : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de second message)

    Pour les réponses complexes (par exemple charges utiles média), Telegram revient à la livraison finale normale puis nettoie le message d'aperçu.

    Le flux d'aperçu est distinct du flux de bloc. Lorsque le flux de bloc est explicitement activé pour OpenClaw, OpenClaw ignore le flux d'aperçu pour éviter la double diffusion.

    Si le transport de brouillon natif est indisponible ou rejeté, Telegram revient automatiquement à `sendMessage` + `editMessageText`.

    Flux de raisonnement exclusif à Telegram :

    - `/reasoning stream` envoie le raisonnement à l'aperçu en direct lors de la génération
    - la réponse finale est envoyée sans le texte de raisonnement

  </Accordion>

  <Accordion title="Formatage et repli HTML">
    Le texte sortant utilise le `parse_mode: "HTML"` de Telegram.

    - Le texte de type Markdown est rendu en HTML sécurisé pour Telegram.
    - Le HTML brut du modèle est échappé pour réduire les échecs d'analyse de Telegram.
    - Si Telegram rejette le HTML analysé, OpenClaw réessaie en texte brut.

    Les aperçus de liens sont activés par défaut et peuvent être désactivés avec `channels.telegram.linkPreview: false`.

  </Accordion>

  <Accordion title="Commandes natives et commandes personnalisées">
    L'enregistrement du menu des commandes Telegram est géré au démarrage avec `setMyCommands`.

    Paramètres par défaut des commandes natives :

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

    - les noms sont normalisés (suppression du `/` au début, en minuscules)
    - modèle valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et journalisés

    Remarques :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes des plugins/compétences peuvent toujours fonctionner lorsqu'elles sont saisies, même si elles ne sont pas affichées dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes de plugins/personnalisées peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram a débordé après la réduction ; réduisez les commandes de plugins/compétences/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `setMyCommands failed` avec des erreurs réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes de jumelage d'appareils (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris le rôle/les portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Jumelage](/en/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Boutons intégrés">
    Configurer la portée du clavier intégré :

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

    Contrôles de limitation :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` distincts.
    Les envois à l'exécution utilisent l'instantané actif de la configuration/secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/en/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram prend en charge les balises explicites de threading de réponse dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`

    Remarque : `off` désactive le threading de réponse implicite. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets de forum et comportement des fils">
    Super-groupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id` (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions d'écriture incluent toujours `message_thread_id`

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe, sauf en cas de remplacement (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est réservé aux sujets et n'hérite pas des valeurs par défaut du groupe.

    **Routage d'agent par sujet** : Chaque sujet peut être acheminé vers un agent différent en définissant `agentId` dans la configuration du sujet. Cela donne à chaque sujet son propre espace de travail, sa propre mémoire et sa propre session. Exemple :

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

    Chaque sujet possède ensuite sa propre clé de session : `agent:zu:telegram:group:-1001234567890:topic:3`

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

    Ceci est actuellement limité aux sujets de forum dans les groupes et super-groupes.

    **Génération ACP liée au fil à partir du chat** :

    - `/acp spawn <agent> --thread here|auto` peut lier le sujet Telegram actuel à une nouvelle session ACP.
    - Les messages de suivi du sujet sont acheminés directement vers la session ACP liée (aucun `/acp steer` requis).
    - OpenClaw épingle le message de confirmation de génération dans le sujet après une liaison réussie.
    - Nécessite `channels.telegram.threadBindings.spawnAcpSessions=true`.

    Le contexte du modèle inclut :

    - `MessageThreadId`
    - `IsForum`

    Comportement du fil DM :

    - les discussions privées avec `message_thread_id` conservent le routage DM mais utilisent des clés de session/cibles de réponse tenant compte du fil.

  </Accordion>

  <Accordion title="Audio, vidéo et stickers">
    ### Messages audio

    Telegram distingue les messages vocaux des fichiers audio.

    - par défaut : comportement de fichier audio
    - balise `[[audio_as_voice]]` dans la réponse de l'agent pour forcer l'envoi d'un message vocal

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

    Telegram distingue les fichiers vidéo des messages vidéo.

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

    Les messages vidéo ne prennent pas en charge les légendes ; le texte du message fourni est envoyé séparément.

    ### Stickers

    Gestion des stickers entrants :

    - WEBP statique : téléchargé et traité (espace réservé `<media:sticker>`)
    - TGS animé : ignoré
    - WEBM vidéo : ignoré

    Champs de contexte de sticker :

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

  <Accordion title="Notification de réaction">
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction` (séparément des payloads de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own` signifie les réactions des utilisateurs uniquement aux messages envoyés par le bot (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les ID de fil dans les mises à jour de réaction.
      - les groupes non-forums acheminent vers la session de chat de groupe
      - les groupes forums acheminent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet d'origine exact

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

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
    - Utilisez `""` pour désactiver la réaction pour un canal ou un compte.

  </Accordion>

  <Accordion title="Écritures de configuration depuis les événements et commandes Telegram">
    Les écritures de configuration du canal sont activées par défaut (`configWrites !== false`).

    Les écritures déclenchées par Telegram incluent :

    - événements de migration de groupe (`migrate_to_chat_id`) pour mettre à jour `channels.telegram.groups`
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

    - définir `channels.telegram.webhookUrl`
    - définir `channels.telegram.webhookSecret` (requis lorsque l'URL du webhook est définie)
    - optionnel `channels.telegram.webhookPath` (par défaut `/telegram-webhook`)
    - optionnel `channels.telegram.webhookHost` (par défaut `127.0.0.1`)
    - optionnel `channels.telegram.webhookPort` (par défaut `8787`)

    L'écouteur local par défaut pour le mode webhook se lie à `127.0.0.1:8787`.

    Si votre point de terminaison public est différent, placez un proxy inverse devant et pointez `webhookUrl` vers l'URL publique.
    Définissez `webhookHost` (par exemple `0.0.0.0`) lorsque vous avez intentionnellement besoin d'un accès externe.

  </Accordion>

  <Accordion title="Limites, nouvelle tentative et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client Telegram de l'API (si non défini, la valeur par défaut de grammY s'applique).
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - contrôles de l'historique des Telegram :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la config `channels.telegram.retry` s'applique aux assistants d'envoi CLI (API/tools/actions) pour les erreurs d'CLI sortantes récupérables.

    La cible d'envoi Telegram peut être un ID de chat numérique ou un nom d'utilisateur :

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

    L'envoi Telegram prend également en charge :

    - `--buttons` pour les claviers en ligne lorsque `channels.telegram.capabilities.inlineButtons` l'autorise
    - `--force-document` pour envoyer des images et des GIF sortants sous forme de documents plutôt que comme des photos compressées ou des téléchargements de médias animés

    Limitation des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations d'exécution sur Telegram">
    Telegram prend en charge les approbations d'exécution dans les DM des approbateurs et peut éventuellement publier des invites d'approbation dans la discussion ou le sujet d'origine.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers` (optionnel ; revient aux ID de propriétaire numériques déduits de `allowFrom` et des `defaultTo` directs si possible)
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`

    Les approbateurs doivent être des ID utilisateur Telegram numériques. Telegram devient un client d'approbation d'exécution lorsque `enabled` est vrai et qu'au moins un approbateur peut être résolu, soit à partir de `execApprovals.approvers`, soit à partir de la configuration du propriétaire numérique du compte (`allowFrom` et `defaultTo` en message direct). Sinon, les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de secours pour l'approbation d'exécution.

    Telegram affiche également les boutons d'approbation partagés utilisés par les autres canaux de discussion. L'adaptateur natif Telegram ajoute principalement le routage vers le DM de l'approbateur, la diffusion vers le canal/sujet et les indices de frappe avant la livraison.

    Règles de livraison :

    - `target: "dm"` envoie les invites d'approbation uniquement aux DM des approbateurs résolus
    - `target: "channel"` renvoie l'invite vers la discussion/sujet Telegram d'origine
    - `target: "both"` envoie vers les DM des approbateurs et la discussion/sujet d'origine

    Seuls les approbateurs résolus peuvent approuver ou refuser. Les non-approbateurs ne peuvent pas utiliser `/approve` ni utiliser les boutons d'approbation Telegram.

    La livraison par canal affiche le texte de la commande dans la discussion, n'activez donc `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw conserve le sujet à la fois pour l'invite d'approbation et le suivi post-approbation. Les approbations d'exécution expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne dépendent également de `channels.telegram.capabilities.inlineButtons` autorisant la surface cible (`dm`, `group` ou `all`).

    Documentation connexe : [Approbations d'exécution](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Contrôles des réponses d'erreur

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs           | Par défaut | Description                                                                                                |
| ----------------------------------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`    | `reply` envoie un message d'erreur convivial au chat. `silent` supprime entièrement les réponses d'erreur. |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000`    | Temps minimum entre les réponses d'erreur vers le même chat. Empêche le spam d'erreurs pendant les pannes. |

Les remplacements par compte, par groupe et par sujet sont pris en charge (même héritage que les autres clés de configuration Telegram).

```json5
{
  channels: {
    telegram: {
      errorPolicy: "reply",
      errorCooldownMs: 120000,
      groups: {
        "-1001234567890": {
          errorPolicy: "silent", // suppress errors in this group
        },
      },
    },
  },
}
```

## Dépannage

<AccordionGroup>
  <Accordion title="Le bot ne répond pas aux messages de groupe sans mention">

    - Si `requireMention=false`, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Désactiver
      - puis retirer et ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe sans mention.
    - `openclaw channels status --probe` peut vérifier les ID numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une sonde d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Le bot ne voit pas du tout les messages de groupe">

    - lorsque `channels.telegram.groups` existe, le groupe doit être répertorié (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour connaître les raisons de l'ignorance

  </Accordion>

  <Accordion title="Les commandes fonctionnent partiellement ou pas du tout">

    - autorisez votre identité d'expéditeur (appairage et/ou `allowFrom` numérique)
    - l'autorisation de commande s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - `setMyCommands failed` avec des erreurs réseau/récupération indique généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Instabilité du sondage ou du réseau">

    - Node 22+ + récupération personnalisée/proxy peut déclencher un comportement d'abandon immédiat si les types AbortSignal ne correspondent pas.
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

## Pointeurs vers la référence de configuration Telegram

Référence principale :

- `channels.telegram.enabled` : activer/désactiver le démarrage du canal.
- `channels.telegram.botToken` : jeton du bot (BotFather).
- `channels.telegram.tokenFile` : lire le jeton depuis un chemin de fichier normal. Les liens symboliques sont rejetés.
- `channels.telegram.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.telegram.allowFrom` : liste d'autorisation DM (identifiants utilisateur numériques Telegram). `allowlist` nécessite au moins un ID d'expéditeur. `open` nécessite `"*"`. `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en ID et peut récupérer les entrées de la liste d'autorisation à partir des fichiers de stockage d'appairage dans les flux de migration de la liste d'autorisation.
- `channels.telegram.actions.poll` : activer ou désactiver la création de sondages Telegram (par défaut : activé ; nécessite toujours `sendMessage`).
- `channels.telegram.defaultTo` : cible Telegram par défaut utilisée par CLI `--deliver` lorsqu'aucun `--reply-to` explicite n'est fourni.
- `channels.telegram.groupPolicy` : `open | allowlist | disabled` (par défaut : liste d'autorisation).
- `channels.telegram.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (identifiants utilisateur numériques Telegram). `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en ID. Les entrées non numériques sont ignorées au moment de l'authentification. L'authentification de groupe n'utilise pas le repli du magasin d'appairage DM (`2026.2.25+`).
- Priorité multi-compte :
  - Lorsque deux ou plusieurs identifiants de compte sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite.
  - Si aucun n'est défini, OpenClaw revient au premier identifiant de compte normalisé et `openclaw doctor` avertit.
  - `channels.telegram.accounts.default.allowFrom` et `channels.telegram.accounts.default.groupAllowFrom` ne s'appliquent qu'au compte `default`.
  - Les comptes nommés héritent de `channels.telegram.allowFrom` et `channels.telegram.groupAllowFrom` lorsque les valeurs au niveau du compte ne sont pas définies.
  - Les comptes nommés n'héritent pas de `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups` : valeurs par groupe + liste d'autorisation (utilisez `"*"` pour les valeurs par défaut globales).
  - `channels.telegram.groups.<id>.groupPolicy` : remplacement par groupe pour groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention` : valeur par défaut de filtrage des mentions.
  - `channels.telegram.groups.<id>.skills` : filtre de compétences (omettre = toutes les compétences, vide = aucune).
  - `channels.telegram.groups.<id>.allowFrom` : remplacement de la liste d'autorisation des expéditeurs par groupe.
  - `channels.telegram.groups.<id>.systemPrompt` : invite système supplémentaire pour le groupe.
  - `channels.telegram.groups.<id>.enabled` : désactiver le groupe lorsque `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*` : remplacements par sujet (champs de groupe + `agentId` exclusifs aux sujets).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId` : acheminer ce sujet vers un agent spécifique (remplace le routage au niveau du groupe et la liaison).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy` : remplacement par sujet pour groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention` : remplacement par sujet pour le filtrage des mentions.
- `bindings[]` de niveau supérieur avec `type: "acp"` et l'ID canonique du sujet `chatId:topic:topicId` dans `match.peer.id` : champs de liaison de sujet ACP persistants (voir [ACP Agents](/en/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId` : acheminer les sujets de DM vers un agent spécifique (même comportement que les sujets de forum).
- `channels.telegram.execApprovals.enabled` : activer Telegram en tant que client d'approbation d'exécution basé sur le chat pour ce compte.
- `channels.telegram.execApprovals.approvers` : IDs d'utilisateur Telegram autorisés à approuver ou refuser les demandes d'exécution. Facultatif lorsque `channels.telegram.allowFrom` ou un `channels.telegram.defaultTo` direct identifie déjà le propriétaire.
- `channels.telegram.execApprovals.target` : `dm | channel | both` (par défaut : `dm`). `channel` et `both` préservent le sujet Telegram d'origine lorsqu'il est présent.
- `channels.telegram.execApprovals.agentFilter` : filtre d'ID d'agent optionnel pour les invites d'approbation transférées.
- `channels.telegram.execApprovals.sessionFilter` : filtre de clé de session optionnel (sous-chaîne ou regex) pour les invites d'approbation transférées.
- `channels.telegram.accounts.<account>.execApprovals` : remplacement par compte pour le routage de l'approbation d'exécution Telegram et l'autorisation de l'approbateur.
- `channels.telegram.capabilities.inlineButtons` : `off | dm | group | all | allowlist` (par défaut : allowlist).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons` : remplacement par compte.
- `channels.telegram.commands.nativeSkills` : activer/désactiver les commandes de compétences natives Telegram.
- `channels.telegram.replyToMode` : `off | first | all` (par défaut : `off`).
- `channels.telegram.textChunkLimit` : taille du bloc sortant (caractères).
- `channels.telegram.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.telegram.linkPreview` : activer/désactiver les aperçus de liens pour les messages sortants (par défaut : true).
- `channels.telegram.streaming` : `off | partial | block | progress` (aperçu du flux en direct ; par défaut : `partial` ; `progress` correspond à `partial` ; `block` est pour la compatibilité avec le mode d'aperçu hérité). Le flux d'aperçu Telegram utilise un seul message d'aperçu qui est modifié sur place.
- `channels.telegram.mediaMaxMb` : plafond de média Telegram entrant/sortant (Mo, par défaut : 100).
- `channels.telegram.retry` : politique de nouvelle tentative pour les assistants d'envoi Telegram (CLI/tools/actions) lors d'erreurs de API sortantes récupérables (attempts, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily` : remplacer autoSelectFamily de Node (true=activer, false=désactiver). Activé par défaut sur Node 22+, avec WSL2 désactivé par défaut.
- `channels.telegram.network.dnsResultOrder` : remplacer l'ordre des résultats DNS (`ipv4first` ou `verbatim`). `ipv4first` par défaut sur Node 22+.
- `channels.telegram.proxy` : URL proxy pour les appels au Bot API (SOCKS/HTTP).
- `channels.telegram.webhookUrl` : activer le mode webhook (nécessite `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret` : secret du webhook (requis lorsque webhookUrl est défini).
- `channels.telegram.webhookPath` : chemin du webhook local (par défaut `/telegram-webhook`).
- `channels.telegram.webhookHost` : hôte de liaison du webhook local (par défaut `127.0.0.1`).
- `channels.telegram.webhookPort` : port de liaison du webhook local (par défaut `8787`).
- `channels.telegram.actions.reactions` : limiter les réactions aux outils Telegram.
- `channels.telegram.actions.sendMessage` : limiter les envois de messages d'outil Telegram.
- `channels.telegram.actions.deleteMessage` : limiter les suppressions de messages de Telegram tool Telegram.
- `channels.telegram.actions.sticker` : limiter les actions de stickers Telegram — envoi et recherche (par défaut : false).
- `channels.telegram.reactionNotifications` : `off | own | all` — contrôler quelles réactions déclenchent des événements système (par défaut `own` si non défini).
- `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` — contrôler la capacité de réaction de l'agent (par défaut `minimal` si non défini).
- `channels.telegram.errorPolicy` : `reply | silent` — contrôler le comportement de réponse en cas d'erreur (par défaut `reply`). Les remplacements par compte/groupe/sujet sont pris en charge.
- `channels.telegram.errorCooldownMs` : durée minimale en ms entre les réponses d'erreur pour le même chat (par défaut `60000`). Empêche le spam d'erreurs pendant les pannes.

- [Référence de la configuration - Telegram](/en/gateway/configuration-reference#telegram)

Champs à fort signal spécifiques à Telegram :

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- fil de discussion/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- media/network : `mediaMaxMb`, `timeoutSeconds`, `retry`, `network.autoSelectFamily`, `proxy`
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capabilities : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- reactions : `reactionNotifications`, `reactionLevel`
- errors : `errorPolicy`, `errorCooldownMs`
- writes/history : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Connexes

- [Jumelage](/en/channels/pairing)
- [Groupes](/en/channels/groups)
- [Sécurité](/en/gateway/security)
- [Routage de canal](/en/channels/channel-routing)
- [Routage multi-agent](/en/concepts/multi-agent)
- [Dépannage](/en/channels/troubleshooting)

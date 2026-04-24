---
summary: "Statut de support du bot Telegram, capacités et configuration"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

# Telegram (Bot API)

Statut : prêt pour la production pour les DMs de bot + groupes via grammY. Le long polling est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut pour Telegram est l'appairage.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics inter-canaux et livres de jeux de réparation.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/fr/gateway/configuration">
    Modèles de configuration complète de canal et exemples.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Créer le jeton du bot dans BotFather">
    Ouvrez Telegram et chattez avec **@BotFather** (confirmez que le pseudonyme est exactement `@BotFather`).

    Exécutez `/newbot`, suivez les invites et enregistrez le jeton.

  </Step>

  <Step title="Configurer le jeton et la politique DM">

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

  <Step title="Ajouter le bot à un groupe">
    Ajoutez le bot à votre groupe, puis définissez `channels.telegram.groups` et `groupPolicy` pour qu'ils correspondent à votre modèle d'accès.
  </Step>
</Steps>

<Note>L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration l'emportent sur le fallback env, et `TELEGRAM_BOT_TOKEN` ne s'applique qu'au compte par défaut.</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Mode de confidentialité et visibilité du groupe">
    Les bots Telegram sont par défaut en **Mode de confidentialité (Privacy Mode)**, ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages de groupe, soit :

    - désactivez le mode de confidentialité via `/setprivacy`, ou
    - rendez le bot administrateur du groupe.

    Lorsque vous basculez le mode de confidentialité, retirez et ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique le changement.

  </Accordion>

  <Accordion title="Group permissions">
    Le statut d'administrateur est contrôlé dans les paramètres de groupe Telegram.

    Les bots administrateurs reçoivent tous les messages de groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Basculateurs utiles BotFather">

    - `/setjoingroups` pour autoriser/refuser les ajouts aux groupes
    - `/setprivacy` pour le comportement de visibilité du groupe

  </Accordion>
</AccordionGroup>

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` contrôle l'accès aux messages privés :

    - `pairing` (par défaut)
    - `allowlist` (nécessite au moins un ID d'expéditeur dans `allowFrom`)
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `channels.telegram.allowFrom` accepte les ID d'utilisateur numériques Telegram. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    `dmPolicy: "allowlist"` avec un `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    L'installation demande uniquement des ID d'utilisateur numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous utilisiez auparavant des fichiers de liste d'autorisation de magasin d'appairage, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple lorsque `dmPolicy: "allowlist"` n'a pas encore d'ID explicites).

    Pour les bots à un seul propriétaire, préférez `dmPolicy: "allowlist"` avec des ID numériques `allowFrom` explicites pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appairage précédentes).

    Confusion courante : l'approbation d'appairage de DM ne signifie pas « cet expéditeur est autorisé partout ».
    L'appairage n'accorde que l'accès aux DM. L'autorisation de l'expéditeur de groupe provient toujours des listes d'autorisation de configuration explicites.
    Si vous voulez « Je suis autorisé une fois et les DMs ainsi que les commandes de groupe fonctionnent », mettez votre ID d'utilisateur numérique Telegram dans `channels.telegram.allowFrom`.

    ### Trouver votre ID d'utilisateur Telegram

    Plus sûr (pas de bot tiers) :

    1. DM votre bot.
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
       - pas de configuration `groups` :
         - avec `groupPolicy: "open"` : n'importe quel groupe peut passer les vérifications d'ID de groupe
         - avec `groupPolicy: "allowlist"` (par défaut) : les groupes sont bloqués jusqu'à ce que vous ajoutiez des entrées `groups` (ou `"*"`)
       - `groups` configuré : agit comme une liste d'autorisation (IDs explicites ou `"*"`)

    2. **Quels expéditeurs sont autorisés dans les groupes** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (par défaut)
       - `disabled`

    `groupAllowFrom` est utilisé pour le filtrage des expéditeurs de groupe. S'il n'est pas défini, Telegram revient à `allowFrom`.
    Les entrées `groupAllowFrom` doivent être des IDs numériques d'utilisateur Telegram (les préfixes `telegram:` / `tg:` sont normalisés).
    Ne mettez pas d'IDs de conversation de groupe ou de supergroupe Telegram dans `groupAllowFrom`. Les IDs de conversation négatifs appartiennent à `channels.telegram.groups`.
    Les entrées non numériques sont ignorées pour l'autorisation de l'expéditeur.
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur du groupe n'hérite **pas** des approbations du magasin d'appariement DM.
    L'appariement reste limité aux DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Si `groupAllowFrom` n'est pas défini, Telegram revient à la configuration `allowFrom`, et non au magasin d'appariement.
    Modèle pratique pour les bots à un seul propriétaire : définissez votre ID utilisateur dans `channels.telegram.allowFrom`, laissez `groupAllowFrom` non défini et autorisez les groupes cibles sous `channels.telegram.groups`.
    Note d'exécution : si `channels.telegram` est complètement manquant, l'exécution revient par défaut à `groupPolicy="allowlist"` fermé par échec, sauf si `channels.defaults.groupPolicy` est explicitement défini.

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

      - Mettez les IDs de conversation de groupe ou de supergroupe Telegram négatifs comme `-1001234567890` sous `channels.telegram.groups`.
      - Mettez les IDs d'utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous souhaitez limiter les personnes dans un groupe autorisé pouvant déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous souhaitez que n'importe quel membre d'un groupe autorisé puisse parler au bot.
    </Warning>

  </Tab>

  <Tab title="Comportement de mention">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername`, ou
    - des motifs de mention dans :
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Commandes de basculement au niveau de la session :

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
- Les sessions de groupe sont isolées par l'ID de groupe. Les sujets du forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id` ; OpenClaw les achemine avec des clés de session conscientes des fils et préserve l'ID du fil pour les réponses.
- Le long polling utilise le runner grammY avec un séquençage par chat/fil. La concurrence globale du récepteur du runner utilise `agents.defaults.maxConcurrent`.
- Les redémarrages du chien de garde du long polling se déclenchent après 120 secondes sans activité de vie `getUpdates` par défaut. Augmentez `channels.telegram.pollingStallThresholdMs` uniquement si votre déploiement rencontre encore de faux redémarrages d'arrêt du polling pendant des travaux de longue durée. La valeur est en millisecondes et est autorisée de `30000` à `600000` ; les remplacements par compte sont pris en charge.
- Le Bot Telegram de API ne prend pas en charge les accusés de réception (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu du flux en direct (modifications de message)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - chats directs : aperçu du message + `editMessageText`
    - groupes/sujets : aperçu du message + `editMessageText`

    Condition requise :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` correspond à `partial` sur Telegram (compatibilité avec la nomination inter-canaux)
    - `streaming.preview.toolProgress` contrôle si les mises à jour d'outil/progression réutilisent le même message d'aperçu modifié (par défaut : `true`). Définissez `false` pour conserver des messages d'outil/progression séparés.
    - les anciennes valeurs `channels.telegram.streamMode` et les valeurs booléennes `streaming` sont mappées automatiquement

    Pour les réponses en texte uniquement :

    - DM : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de second message)
    - groupe/sujet : OpenClaw conserve le même message d'aperçu et effectue une modification finale sur place (pas de second message)

    Pour les réponses complexes (par exemple les charges utiles multimédia), OpenClaw revient à la livraison finale normale, puis nettoie le message d'aperçu.

    La diffusion de l'aperçu est distincte de la diffusion par blocs. Lorsque la diffusion par blocs est explicitement activée pour Telegram, OpenClaw ignore le flux d'aperçu pour éviter la double diffusion.

    Si le transport de brouillon natif est indisponible ou refusé, OpenClaw revient automatiquement à `sendMessage` + `editMessageText`.

    Flux de raisonnement exclusif à Telegram :

    - `/reasoning stream` envoie le raisonnement à l'aperçu en direct pendant la génération
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
    - motif valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugin/compétence peuvent toujours fonctionner lorsqu'elles sont saisies, même si elles ne sont pas affichées dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plugin peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram a toujours débordé après le rognage ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `setMyCommands failed` avec des erreurs de réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes de jumelage d'appareils (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris le rôle/les portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Le code de configuration contient un jeton d'amorçage de courte durée. Le transfert d'amorçage intégré conserve le jeton du nœud principal à `scopes: []` ; tout jeton d'opérateur transféré reste lié à `operator.approvals`, `operator.read`, `operator.talk.secrets` et `operator.write`. Les vérifications de portée d'amorçage sont préfixées par rôle, de sorte que la liste d'autorisation des opérateurs ne satisfait que les demandes des opérateurs ; les rôles non opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Jumelage](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Boutons intégrés">
    Configurez la portée du clavier intégré :

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

    Contrôles de filtrage :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de bascules `channels.telegram.actions.*` distinctes.
    Les envois d'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action ne effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression de réaction : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Reply threading tags">
    Telegram prend en charge les balises de réponse explicites dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`

    Remarque : `off` désactive l'enfilage de réponses implicite. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets de forum et comportement des fils">
    Super-groupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'activité de frappe ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id` (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions de frappe incluent toujours `message_thread_id`

    Héritage des sujets : les entrées de sujet héritent des paramètres du groupe, sauf en cas de remplacement (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est réservé aux sujets et n'hérite pas des valeurs par défaut du groupe.

    **Routage d'agent par sujet** : Chaque sujet peut être routé vers un agent différent en définissant `agentId` dans la configuration du sujet. Cela donne à chaque sujet son propre espace de travail isolé, sa mémoire et sa session. Exemple :

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

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler les sessions de harnais ACP via des liaisons ACP typées de premier niveau :

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
    - Les messages de suivi du sujet sont routés directement vers la session ACP liée (aucun `/acp steer` requis).
    - OpenClaw épingle le message de confirmation de génération dans le sujet après une liaison réussie.
    - Nécessite `channels.telegram.threadBindings.spawnAcpSessions=true`.

    Le contexte du modèle inclut :

    - `MessageThreadId`
    - `IsForum`

    Comportement du fil DM :

    - les discussions privées avec `message_thread_id` conservent le routage DM mais utilisent des clés de session/cibles de réponse conscientes des fils.

  </Accordion>

  <Accordion title="Audio, vidéo et autocollants">
    ### Messages audio

    Telegram distingue les messages vocaux des fichiers audio.

    - par défaut : comportement du fichier audio
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

    ### Autocollants

    Gestion des autocollants entrants :

    - WEBP statique : téléchargé et traité (espace réservé `<media:sticker>`)
    - TGS animé : ignoré
    - WEBM vidéo : ignoré

    Champs de contexte de l'autocollant :

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Fichier de cache d'autocollants :

    - `~/.openclaw/telegram/sticker-cache.json`

    Les autocollants sont décrits une fois (si possible) et mis en cache pour réduire les appels de vision répétés.

    Activer les actions d'autocollants :

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

    Envoyer une action d'autocollant :

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Rechercher des autocollants en cache :

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
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction` (séparément des charges utiles de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own` signifie les réactions des utilisateurs aux messages envoyés par le bot uniquement (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les ID de fil dans les mises à jour de réaction.
      - les groupes non-forum acheminent vers la session de chat de groupe
      - les groupes forum acheminent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet d'origine exact

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

  <Accordion title="Écritures de configuration à partir des événements et commandes Telegram">
    Les écritures de configuration de canal sont activées par défaut (`configWrites !== false`).

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

<Accordion title="Autorisation du sélecteur de modèle dans les groupes">Les boutons en ligne du sélecteur de modèle de groupe nécessitent la même autorisation que `/models`. Les participants non autorisés peuvent parcourir et appuyer sur les boutons, mais OpenClaw rejette le rappel avant de modifier le modèle de session.</Accordion>

  <Accordion title="Long polling vs webhook">
    Par défaut : long polling.

    Mode webhook :

    - définir `channels.telegram.webhookUrl`
    - définir `channels.telegram.webhookSecret` (requis lorsque l'URL du webhook est définie)
    - optionnel `channels.telegram.webhookPath` (par défaut `/telegram-webhook`)
    - optionnel `channels.telegram.webhookHost` (par défaut `127.0.0.1`)
    - optionnel `channels.telegram.webhookPort` (par défaut `8787`)

    L'écouteur local par défaut pour le mode webhook se lie à `127.0.0.1:8787`.

    Si votre point de terminaison public diffère, placez un proxy inverse devant et pointez `webhookUrl` vers l'URL publique.
    Définissez `webhookHost` (par exemple `0.0.0.0`) lorsque vous avez intentionnellement besoin d'un trafic entrant externe.

    Le rappel webhook grammY renvoie un 200 dans les 5 secondes afin que Telegram ne réessaie pas les mises à jour longues en tant que délais d'attente de lecture ; le travail plus long se poursuit en arrière-plan. Le sondage reconstruit le transport HTTP après `getUpdates` conflits 409, de sorte que les nouvelles tentatives utilisent une connexion TCP fraîche au lieu de boucler sur un socket keep-alive terminé par Telegram.

  </Accordion>

  <Accordion title="Limites, nouvelle tentative et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client de l'Telegram API (si non défini, la valeur par défaut grammY s'applique).
    - `channels.telegram.pollingStallThresholdMs` est par défaut `120000` ; ajustez entre `30000` et `600000` uniquement pour les redémarrages de blocage de scrutin faux positifs.
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - le contexte supplémentaire de réponse/citation/transfert est actuellement transmis tel quel.
    - les listes d'autorisation Telegram limitent principalement qui peut déclencher l'agent, et ne constituent pas une limite complète de suppression du contexte supplémentaire.
    - contrôles de l'historique des DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuration `channels.telegram.retry` s'applique aux assistants d'envoi Telegram (CLI/outils/actions) pour les erreurs d'API sortantes récupérables.

    La cible d'envoi CLI peut être un identifiant de discussion numérique ou un nom d'utilisateur :

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

    - `--presentation` avec des blocs `buttons` pour les claviers en ligne lorsque `channels.telegram.capabilities.inlineButtons` l'autorise
    - `--pin` ou `--delivery '{"pin":true}'` pour demander une livraison épinglée lorsque le bot peut épingler dans cette discussion
    - `--force-document` pour envoyer des images et des GIF sortants sous forme de documents au lieu de photos compressées ou de téléchargements de média animé

    Filtrage des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations d'exécution dans Telegram">
    Telegram prend en charge les approbations d'exécution dans les DM des approuveurs et peut éventuellement publier les invites d'approbation dans le chat ou le sujet d'origine.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled`
    - `channels.telegram.execApprovals.approvers` (facultatif ; revient aux ID de propriétaire numériques déduits de `allowFrom` et du `defaultTo` direct lorsque cela est possible)
    - `channels.telegram.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`

    Les approuveurs doivent être des ID utilisateur Telegram numériques. Telegram active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approuveur peut être résolu, soit depuis `execApprovals.approvers`, soit depuis la configuration du propriétaire numérique du compte (`allowFrom` et `defaultTo` en message direct). Définissez `enabled: false` pour désactiver explicitement Telegram en tant que client d'approbation natif. Sinon, les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de repli d'approbation d'exécution.

    Telegram affiche également les boutons d'approbation partagés utilisés par d'autres canaux de chat. L'adaptateur natif Telegram ajoute principalement le routage des DM d'approbation, la diffusion vers les canaux/sujets et les indications de frappe avant la livraison.
    Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique
    que les approbations par chat ne sont pas disponibles ou que l'approbation manuelle est le seul chemin.

    Règles de livraison :

    - `target: "dm"` envoie les invites d'approbation uniquement aux DM des approuveurs résolus
    - `target: "channel"` renvoie l'invite au chat/sujet Telegram d'origine
    - `target: "both"` envoie aux DM des approuveurs et au chat/sujet d'origine

    Seuls les approuveurs résolus peuvent approuver ou refuser. Les non-approuveurs ne peuvent pas utiliser `/approve` ni utiliser les boutons d'approbation Telegram.

    Comportement de résolution d'approbation :

    - Les ID préfixés par `plugin:` sont toujours résolus via les approbations de plugin.
    - Les autres ID d'approbation essaient d'abord `exec.approval.resolve`.
    - Si Telegram est également autorisé pour les approbations de plugin et que la passerelle indique
      que l'approbation d'exécution est inconnue/expirée, Telegram réessaie une fois via
      `plugin.approval.resolve`.
    - Les refus/erreurs réels d'approbation d'exécution ne passent pas silencieusement à la résolution
      d'approbation de plugin.

    La livraison par canal affiche le texte de la commande dans le chat, n'activez donc `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw conserve le sujet pour l'invite d'approbation et le suivi post-approbation. Les approbations d'exécution expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne dépendent également de `channels.telegram.capabilities.inlineButtons` autorisant la surface cible (`dm`, `group` ou `all`).

    Documentation connexe : [Approbations d'exécution](/fr/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Contrôles de réponse aux erreurs

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs           | Par défaut | Description                                                                                                   |
| ----------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`    | `reply` envoie un message d'erreur convivial au chat. `silent` supprime entièrement les réponses aux erreurs. |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000`    | Temps minimum entre les réponses aux erreurs pour le même chat. Empêche le spam d'erreurs pendant les pannes. |

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
      - puis supprimer + ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe non mentionnés.
    - `openclaw channels status --probe` peut vérifier les identifiants numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une sonde d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Le bot ne voit pas du tout les messages de groupe">

    - lorsque `channels.telegram.groups` existe, le groupe doit être répertorié (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons de l'ignorance

  </Accordion>

  <Accordion title="Les commandes fonctionnent partiellement ou pas du tout">

    - autorisez votre identité d'expéditeur (appairage et/ou `allowFrom`)
    - l'autorisation des commandes s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - `setMyCommands failed` avec des erreurs de réseau/récupération indique généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + custom fetch/proxy peut déclencher un comportement d'arrêt immédiat si les types AbortSignal ne correspondent pas.
    - Certains hôtes résolvent `api.telegram.org` d'abord en IPv6 ; une sortie IPv6 défectueuse peut provoquer des échecs intermittents de l'Telegram API.
    - Si les journaux incluent `TypeError: fetch failed` ou `Network request for 'getUpdates' failed!`, OpenClaw réessaie désormais ces erreurs en tant qu'erreurs réseau récupérables.
    - Si les journaux incluent `Polling stall detected`, OpenClaw redémarre le polling et reconstruit le transport Telegram après 120 secondes sans liveness de long-poll terminé par défaut.
    - Augmentez `channels.telegram.pollingStallThresholdMs` uniquement lorsque les appels `getUpdates` de longue durée sont sains mais que votre hôte signale encore de faux redémarrages de polling-stall. Les blocages persistants pointent généralement vers des problèmes de proxy, DNS, IPv6 ou de sortie TLS entre l'hôte et `api.telegram.org`.
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

    - Les réponses de la plage de référence RFC 2544 (`198.18.0.0/15`) sont déjà autorisées
      par défaut pour les téléchargements de médias Telegram. Si un fake-IP de confiance ou
      un proxy transparent réécrit `api.telegram.org` vers une autre adresse
      privée/interne/à usage spécial lors des téléchargements de médias, vous pouvez
      opter pour le contournement Telegram-only :

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La même option d'adhésion est disponible par compte à
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si votre proxy résout les hôtes de médias Telegram en `198.18.x.x`, laissez d'abord
      le flag dangereux désactivé. Les médias Telegram autorisent déjà la plage de référence RFC 2544
      par défaut.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` affaiblit les protections SSRF des médias
      Telegram. Utilisez-le uniquement pour les environnements de proxy
      contrôlés par un opérateur de confiance, tels que Clash, Mihomo ou le routage fake-IP de Surge,
      lorsqu'ils synthétisent des réponses privées ou à usage spécial en dehors de la plage de
      référence RFC 2544. Laissez-le désactivé pour un accès Internet public normal à Telegram.
    </Warning>

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

Plus d'aide : [Channel troubleshooting](/fr/channels/troubleshooting).

## Pointeurs de référence de la configuration Telegram

Référence principale :

- `channels.telegram.enabled` : activer/désactiver le démarrage du canal.
- `channels.telegram.botToken` : jeton de bot (BotFather).
- `channels.telegram.tokenFile` : lire le jeton à partir d'un chemin de fichier standard. Les liens symboliques sont rejetés.
- `channels.telegram.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.telegram.allowFrom` : liste d'autorisation DM (ID utilisateur Telegram numériques). `allowlist` nécessite au moins un ID d'expéditeur. `open` nécessite `"*"`. `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en ID et peut récupérer les entrées de la liste d'autorisation à partir des fichiers de magasin d'appairage dans les flux de migration de la liste d'autorisation.
- `channels.telegram.actions.poll` : activer ou désactiver la création de sondages Telegram (par défaut : activé ; nécessite toujours `sendMessage`).
- `channels.telegram.defaultTo` : cible Telegram par défaut utilisée par la commande `--deliver` de la CLI lorsqu'aucun `--reply-to` explicite n'est fourni.
- `channels.telegram.groupPolicy` : `open | allowlist | disabled` (par défaut : allowlist).
- `channels.telegram.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (ID utilisateur Telegram numériques). `openclaw doctor --fix` peut résoudre les entrées `@username` héritées en ID. Les entrées non numériques sont ignorées au moment de l'authentification. L'authentification de groupe n'utilise pas le repli du magasin d'appairage DM (`2026.2.25+`).
- Priorité multi-compte :
  - Lorsque deux ID de compte ou plus sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite.
  - Si aucun n'est défini, OpenClaw revient au premier ID de compte normalisé et `openclaw doctor` avertit.
  - `channels.telegram.accounts.default.allowFrom` et `channels.telegram.accounts.default.groupAllowFrom` ne s'appliquent qu'au compte `default`.
  - Les comptes nommés héritent de `channels.telegram.allowFrom` et `channels.telegram.groupAllowFrom` lorsque les valeurs au niveau du compte ne sont pas définies.
  - Les comptes nommés n'héritent pas de `channels.telegram.accounts.default.allowFrom` / `groupAllowFrom`.
- `channels.telegram.groups` : valeurs par défaut par groupe + liste d'autorisation (utilisez `"*"` pour les valeurs par défaut globales).
  - `channels.telegram.groups.<id>.groupPolicy` : remplacement par groupe pour groupPolicy (`open | allowlist | disabled`).
  - `channels.telegram.groups.<id>.requireMention` : valeur par défaut du filtrage par mention.
  - `channels.telegram.groups.<id>.skills` : filtre de compétence (omettre = toutes les compétences, vide = aucune).
  - `channels.telegram.groups.<id>.allowFrom` : remplacement de la liste d'autorisation des expéditeurs par groupe.
  - `channels.telegram.groups.<id>.systemPrompt` : invite système supplémentaire pour le groupe.
  - `channels.telegram.groups.<id>.enabled` : désactive le groupe lorsque `false`.
  - `channels.telegram.groups.<id>.topics.<threadId>.*` : remplacements par sujet (champs de groupe + `agentId` exclusifs au sujet).
  - `channels.telegram.groups.<id>.topics.<threadId>.agentId` : achemine ce sujet vers un agent spécifique (remplace le routage au niveau du groupe et de la liaison).
- `channels.telegram.groups.<id>.topics.<threadId>.groupPolicy` : remplacement par sujet pour groupPolicy (`open | allowlist | disabled`).
- `channels.telegram.groups.<id>.topics.<threadId>.requireMention` : remplacement du filtrage par mention par sujet.
- `bindings[]` de niveau supérieur avec `type: "acp"` et l'ID de sujet canonique `chatId:topic:topicId` dans `match.peer.id` : champs de liaison de sujet ACP persistants (voir [ACP Agents](/fr/tools/acp-agents#channel-specific-settings)).
- `channels.telegram.direct.<id>.topics.<threadId>.agentId` : achemine les sujets DM vers un agent spécifique (même comportement que les sujets de forum).
- `channels.telegram.execApprovals.enabled` : active Telegram comme client d'approbation d'exécution basé sur le chat pour ce compte.
- `channels.telegram.execApprovals.approvers` : ID utilisateur Telegram autorisés à approuver ou refuser les demandes d'exécution. Facultatif lorsque `channels.telegram.allowFrom` ou un `channels.telegram.defaultTo` direct identifie déjà le propriétaire.
- `channels.telegram.execApprovals.target` : `dm | channel | both` (par défaut : `dm`). `channel` et `both` préservent le sujet Telegram d'origine lorsqu'il est présent.
- `channels.telegram.execApprovals.agentFilter` : filtre d'ID d'agent facultatif pour les invites d'approbation transférées.
- `channels.telegram.execApprovals.sessionFilter` : filtre de clé de session facultatif (sous-chaîne ou regex) pour les invites d'approbation transférées.
- `channels.telegram.accounts.<account>.execApprovals` : remplacement par compte pour le routage de l'approbation d'exécution Telegram et l'autorisation de l'approbant.
- `channels.telegram.capabilities.inlineButtons` : `off | dm | group | all | allowlist` (par défaut : liste d'autorisation).
- `channels.telegram.accounts.<account>.capabilities.inlineButtons` : remplacement par compte.
- `channels.telegram.commands.nativeSkills` : activer/désactiver les commandes de compétences natives Telegram.
- `channels.telegram.replyToMode` : `off | first | all` (par défaut : `off`).
- `channels.telegram.textChunkLimit` : taille du bloc sortant (caractères).
- `channels.telegram.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.telegram.linkPreview` : activer/désactiver les aperçus de liens pour les messages sortants (par défaut : true).
- `channels.telegram.streaming` : `off | partial | block | progress` (aperçu du flux en direct ; par défaut : `partial` ; `progress` correspond à `partial` ; `block` est la compatibilité du mode d'aperçu hérité). Le streaming d'aperçu Telegram utilise un seul message d'aperçu qui est modifié sur place.
- `channels.telegram.streaming.preview.toolProgress` : réutiliser le message d'aperçu en direct pour les mises à jour de l'outil/de la progression lorsque le streaming d'aperçu est actif (par défaut : `true`). Définir `false` pour conserver des messages d'outil/de progression séparés.
- `channels.telegram.mediaMaxMb` : plafond de support média Telegram entrant/sortant (Mo, par défaut : 100).
- `channels.telegram.retry` : politique de réessai pour les helpers d'envoi Telegram (CLI/outils/actions) sur les erreurs API sortantes récupérables (tentatives, minDelayMs, maxDelayMs, jitter).
- `channels.telegram.network.autoSelectFamily` : remplacer autoSelectFamily de Node (true=activer, false=désactiver). Par défaut activé sur Node 22+, WSL2 désactivé par défaut.
- `channels.telegram.network.dnsResultOrder` : remplacer l'ordre des résultats DNS (`ipv4first` ou `verbatim`). Par défaut `ipv4first` sur Node 22+.
- `channels.telegram.network.dangerouslyAllowPrivateNetwork` : option d'adhésion dangereuse pour les environnements de FAI fictifs ou de proxy transparents de confiance où les téléchargements de médias Telegram résolvent `api.telegram.org` vers des adresses privées/interne/à usage spécial en dehors de l'autorisation de plage de référence RFC 2544 par défaut.
- `channels.telegram.proxy` : URL du proxy pour les appels à l'API Bot (SOCKS/HTTP).
- `channels.telegram.webhookUrl` : activer le mode webhook (nécessite `channels.telegram.webhookSecret`).
- `channels.telegram.webhookSecret` : secret du webhook (requis lorsque webhookUrl est défini).
- `channels.telegram.webhookPath` : chemin local du webhook (par défaut `/telegram-webhook`).
- `channels.telegram.webhookHost` : hôte de liaison local du webhook (par défaut `127.0.0.1`).
- `channels.telegram.webhookPort` : port de liaison local du webhook (par défaut `8787`).
- `channels.telegram.actions.reactions` : restreindre les réactions de l'outil Telegram.
- `channels.telegram.actions.sendMessage` : restreindre les envois de messages de l'outil Telegram.
- `channels.telegram.actions.deleteMessage` : restreindre les suppressions de messages de l'outil Telegram.
- `channels.telegram.actions.sticker` : restreindre les actions de stickers Telegram — envoi et recherche (par défaut : false).
- `channels.telegram.reactionNotifications` : `off | own | all` — contrôler quelles réactions déclenchent des événements système (par défaut : `own` si non défini).
- `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` — contrôler la capacité de réaction de l'agent (par défaut : `minimal` si non défini).
- `channels.telegram.errorPolicy` : `reply | silent` — contrôler le comportement de réponse en cas d'erreur (par défaut : `reply`). Les substitutions par compte/groupe/sujet sont prises en charge.
- `channels.telegram.errorCooldownMs` : durée minimale en ms entre les réponses d'erreur au même chat (par défaut : `60000`). Empêche le spam d'erreurs lors des pannes.

- [Référence de configuration - Telegram](/fr/gateway/configuration-reference#telegram)

Champs à signal fort spécifiques à Telegram :

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- fil de discussion/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `streaming.preview.toolProgress`, `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capacités : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- réactions : `reactionNotifications`, `reactionLevel`
- erreurs : `errorPolicy`, `errorCooldownMs`
- écritures/historique : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)

---
summary: "TelegramÉtat du support, capacités et configuration du bot Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "TelegramTelegram"
---

Prêt pour la production pour les DMs de bot et les groupes via grammY. Le polling long est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing" Telegram>
    La politique DM par défaut pour Telegram est l'appariement (pairing).
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Guides de diagnostic et de réparation multi-canal.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples de configuration complets du canal.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Créer le jeton du bot dans BotFather">
    Ouvrez Telegram et chattez avec **@BotFather** (confirmez que le handle est exactement `@BotFather`).

    Exécutez `/newbot`, suivez les instructions et enregistrez le jeton.

  </Step>

  <Step title="Configurer le jeton et la stratégie DM">

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

    Env fallback : `TELEGRAM_BOT_TOKEN=...`Telegram (compte par défaut uniquement).
    Telegram n'utilise **pas** `openclaw channels login telegram` ; configurez le jeton dans config/env, puis démarrez la passerelle.

  </Step>

  <Step title="Démarrer la passerelle et approuver le premier DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Les codes d'appariement expirent après 1 heure.

  </Step>

  <Step title="Ajouter le bot à un groupe">
    Ajoutez le bot à votre groupe, puis définissez `channels.telegram.groups` et `groupPolicy` pour qu'ils correspondent à votre modèle d'accès.
  </Step>
</Steps>

<Note>L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration priment sur le repli via les variables d'environnement, et `TELEGRAM_BOT_TOKEN` s'applique uniquement au compte par défaut.</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Privacy mode and group visibility">
    Les bots Telegram sont par défaut en **Privacy Mode** (mode privé), ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages de groupe, vous devez soit :

    - désactiver le mode privé via `/setprivacy`, ou
    - rendre le bot administrateur du groupe.

    Lorsque vous basculez le mode privé, retirez puis ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique le changement.

  </Accordion>

  <Accordion title="Group permissions">
    Le statut d'administrateur est contrôlé dans les paramètres de groupe Telegram.

    Les bots administrateurs reçoivent tous les messages de groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` pour autoriser/interdire les ajouts dans des groupes
    - `/setprivacy` pour le comportement de visibilité dans les groupes

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

    `dmPolicy: "open"` avec `allowFrom: ["*"]` permet à n'importe quel compte Telegram qui trouve ou devine la commande du nom d'utilisateur du bot de commander le bot. Utilisez-le uniquement pour les bots intentionnellement publics avec des outils strictement restreints ; les bots à un seul propriétaire devraient utiliser `allowlist` avec des IDs utilisateur numériques.

    `channels.telegram.allowFrom` accepte les IDs utilisateur Telegram numériques. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    Dans les configurations multi-comptes, un `channels.telegram.allowFrom` de niveau supérieur restrictif est traité comme une limite de sécurité : les entrées `allowFrom: ["*"]` au niveau du compte ne rendent pas ce compte public, sauf si la liste d'autorisation de compte effective contient toujours un caractère générique explicite après la fusion.
    `dmPolicy: "allowlist"` avec `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    Le configuration demande uniquement des IDs utilisateur numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous dépendiez précédemment des fichiers de liste d'autorisation de magasin d'appariement, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple lorsque `dmPolicy: "allowlist"` n'a pas encore d'IDs explicites).

    Pour les bots à un seul propriétaire, préférez `dmPolicy: "allowlist"` avec des IDs `allowFrom` numériques explicites pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appariement précédentes).

    Confusion courante : l'approbation d'appariement DM ne signifie pas « cet expéditeur est autorisé partout ».
    L'appariement accorde l'accès DM. Si aucun propriétaire de commande n'existe encore, le premier appariement approuvé définit également `commands.ownerAllowFrom` afin que les commandes réservées au propriétaire et les approbations d'exécution aient un compte d'opérateur explicite.
    L'autorisation de l'expéditeur de groupe provient toujours des listes d'autorisation de configuration explicites.
    Si vous voulez « Je suis autorisé une fois et les DMs ainsi que les commandes de groupe fonctionnent », mettez votre ID utilisateur Telegram numérique dans `channels.telegram.allowFrom` ; pour les commandes réservées au propriétaire, assurez-vous que `commands.ownerAllowFrom` contient `telegram:<your user id>`.

    ### Trouver votre ID utilisateur Telegram

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
    Les entrées non numériques sont ignorées pour l'autorisation des expéditeurs.
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur de groupe n'hérite **pas** des approbations du magasin d'appariement DM.
    L'appariement reste réservé au DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Si `groupAllowFrom` n'est pas défini, Telegram revient à la configuration `allowFrom`, et non au magasin d'appariement.
    Modèle pratique pour les bots à propriétaire unique : définissez votre ID utilisateur dans `channels.telegram.allowFrom`, laissez `groupAllowFrom` non défini, et autorisez les groupes cibles sous `channels.telegram.groups`.
    Note d'exécution : si `channels.telegram` est complètement absent, l'exécution par défaut est `groupPolicy="allowlist"` (fermeture par échec) à moins que `channels.defaults.groupPolicy` ne soit explicitement défini.

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
      - Mettez les IDs utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous voulez limiter les personnes dans un groupe autorisé pouvant déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous voulez que n'importe quel membre d'un groupe autorisé puisse parler au bot.

    </Warning>

  </Tab>

  <Tab title="Mention behavior">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername`, ou
    - des modèles de mention dans :
      - `agents.list[].groupChat.mentionPatterns`
      - `messages.groupChat.mentionPatterns`

    Commutateurs de commande au niveau de la session :

    - `/activation always`
    - `/activation mention`

    Ceux-ci mettent à jour uniquement l'état de la session. Utilisez la configuration pour la persistance.

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
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec des métadonnées de réponse, des espaces réservés pour les médias et un contexte de chaîne de réponse persistant pour les réponses Telegram que la passerelle a observées.
- Les sessions de groupe sont isolées par l'ID de groupe. Les sujets du forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent contenir `message_thread_id` ; OpenClaw préserve l'ID de fil pour les réponses mais garde les DMs sur la session plate par défaut. Configurez `channels.telegram.dm.threadReplies: "inbound"`, `channels.telegram.direct.<chatId>.threadReplies: "inbound"`, `requireTopic: true`, ou une configuration de sujet correspondante lorsque vous souhaitez intentionnellement une isolation de session de sujet DM.
- Le long polling utilise le runner grammY avec un séquençage par chat par fil. La concurrence globale du récepteur du runner utilise `agents.defaults.maxConcurrent`.
- Le long polling est gardé à l'intérieur de chaque processus de passerelle afin qu'un seul sondeur actif puisse utiliser un jeton de bot à la fois. Si vous voyez encore des conflits 409 `getUpdates`, une autre passerelle OpenClaw, un script ou un sondeur externe utilise probablement le même jeton.
- Par défaut, les redémarrages du watchdog de long-polling se déclenchent après 120 secondes sans `getUpdates` liveness terminé. Augmentez `channels.telegram.pollingStallThresholdMs` uniquement si votre déploiement rencontre toujours de faux redémarrages dus à un arrêt du polling pendant des tâches de longue durée. La valeur est en millisecondes et est autorisée de `30000` à `600000` ; les remplacements par compte sont pris en charge.
- La Telegram Bot API ne prend pas en charge les accusés de réception (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu du flux en direct (modifications de messages)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - chats directs : message d'aperçu + `editMessageText`
    - groupes/sujets : message d'aperçu + `editMessageText`

    Exigences :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` conserve un brouillon de statut modifiable pour la progression des outils, le efface à la fin et envoie la réponse finale comme un message normal
    - `streaming.preview.toolProgress` contrôle si les mises à jour d'outil/progression réutilisent le même message d'aperçu modifié (par défaut : `true` lorsque le flux d'aperçu est actif)
    - `streaming.preview.commandText` contrôle les détails de commande/exécution dans ces lignes de progression d'outil : `raw` (par défaut, préserve le comportement publié) ou `status` (étiquette d'outil uniquement)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont détectées ; exécutez `openclaw doctor --fix` pour les migrer vers `channels.telegram.streaming.mode`

    Les mises à jour d'aperçu de la progression des outils sont les courtes lignes de statut affichées pendant l'exécution des outils, par exemple l'exécution de commandes, la lecture de fichiers, les mises à jour de planification ou les résumés de correctifs. Telegram les active par défaut pour correspondre au comportement publié de OpenClaw depuis `v2026.4.22` et versions ultérieures. Pour conserver l'aperçu modifié pour le texte de la réponse mais masquer les lignes de progression des outils, définissez :

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": false
            }
          }
        }
      }
    }
    ```

    Pour garder la progression des outils visible mais masquer le texte de commande/exécution, définissez :

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    Utilisez le mode `progress` lorsque vous voulez une progression d'outil visible sans modifier la réponse finale dans ce même message. Placez la stratégie de texte de commande sous `streaming.progress` :

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    Utilisez `streaming.mode: "off"` uniquement lorsque vous voulez une livraison finale uniquement : les modifications d'aperçu Telegram sont désactivées et les bavardages génériques d'outil/progression sont supprimés au lieu d'être envoyés comme messages de statut autonomes. Les invites d'approbation, les charges utiles multimédias et les erreurs passent toujours par la livraison finale normale. Utilisez `streaming.preview.toolProgress: false` lorsque vous voulez uniquement conserver les modifications d'aperçu de réponse tout en masquant les lignes de statut de progression des outils.

    <Note>
      Les réponses avec citation sélectionnée Telegram font exception. Lorsque `replyToMode` est `"first"`, `"all"` ou `"batched"` et que le message entrant inclut du texte de citation sélectionné, OpenClaw envoie la réponse finale via le chemin natif de réponse par citation de Telegram au lieu de modifier l'aperçu de la réponse, donc `streaming.preview.toolProgress` ne peut pas afficher les courtes lignes de statut pour ce tour. Les réponses au message actuel sans texte de citation sélectionné conservent toujours le flux d'aperçu. Définissez `replyToMode: "off"` lorsque la visibilité de la progression des outils prime sur les réponses natives avec citation, ou définissez `streaming.preview.toolProgress: false` pour accepter le compromis.
    </Note>

    Pour les réponses texte uniquement :

    - courts aperçus DM/groupe/sujet : OpenClaw conserve le même message d'aperçu et effectue la modification finale sur place
    - les finales textuelles longues qui se divisent en plusieurs messages Telegram réutilisent l'aperçu existant comme premier bloc final lorsque c'est possible, puis envoient uniquement les blocs restants
    - les finales en mode progression effacent le brouillon de statut et utilisent la livraison finale normale au lieu de modifier le brouillon en réponse
    - si la modification finale échoue avant que le texte complet ne soit confirmé, OpenClaw utilise la livraison finale normale et nettoie l'aperçu périmé

    Pour les réponses complexes (par exemple charges utiles multimédias), OpenClaw revient à la livraison finale normale puis nettoie le message d'aperçu.

    Le flux d'aperçu est distinct du flux de blocs. Lorsque le flux de blocs est explicitement activé pour Telegram, OpenClaw ignore le flux d'aperçu pour éviter le double flux.

    Flux de raisonnement Telegram uniquement :

    - `/reasoning stream` envoie le raisonnement vers l'aperçu en direct pendant la génération
    - l'aperçu de raisonnement est supprimé après la livraison finale ; utilisez `/reasoning on` lorsque le raisonnement doit rester visible
    - la réponse finale est envoyée sans le texte de raisonnement

  </Accordion>

  <Accordion title="Formatting and HTML fallback"Telegram>
    Le texte sortant utilise Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw.

    - Le texte de type Markdown est rendu en HTML sécurisé pour Telegram.
    - Le HTML brut du modèle est échappé pour réduire les échecs d'analyse Telegram.
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

    - les noms sont normalisés (suppression du `/` de tête, minuscules)
    - motif valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugin/compétence peuvent toujours fonctionner lorsqu'elles sont tapées, même si elles ne sont pas affichées dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plugin peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram débordait toujours après le rognage ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands`, ou `setMyCommands` échouant avec `404: Not Found` alors que les commandes curl directes de Bot API fonctionnent peut signifier que `channels.telegram.apiRoot` a été défini sur le point de terminaison `/bot<TOKEN>` complet. `apiRoot` doit être uniquement la racine de Bot API, et `openclaw doctor --fix` supprime un `/bot<TOKEN>` de fin accidentel.
    - `getMe returned 401` signifie que Telegram a rejeté le jeton de bot configuré. Mettez à jour `botToken`, `tokenFile`, ou `TELEGRAM_BOT_TOKEN` avec le jeton BotFather actuel ; OpenClaw s'arrête avant le polling, ce n'est donc pas signalé comme un échec de nettoyage de webhook.
    - `setMyCommands failed` avec des erreurs réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appariement d'appareils (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris le rôle/portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Le code de configuration contient un jeton d'amorçage (bootstrap) à courte durée de vie. Le transfert d'amorçage intégré conserve le jeton du nœud principal à `scopes: []` ; tout jeton d'opérateur transféré reste limité à `operator.approvals`, `operator.read`, `operator.talk.secrets`, et `operator.write`. Les vérifications de portée d'amorçage sont préfixées par rôle, de sorte que la liste d'autorisation des opérateurs ne satisfait que les demandes des opérateurs ; les rôles non-opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Appariement](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

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

    Les clics sur les rappels (callbacks) sont transmis à l'agent sous forme de texte :
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramActions de message Telegram pour les agents et l'automatisation"Telegram>
    Les actions de tool Telegram incluent :

    - `sendMessage` (`to`, `content`, `mediaUrl` en option, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content`)
    - `createForumTopic` (`chatId`, `name`, `iconColor` en option, `iconCustomEmojiId`)

    Les actions de message de canal exposent des alias ergonomiques (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Contrôles de blocage :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` distincts.
    Les envois d'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de résolution ad-hoc de SecretRef pour chaque envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Balises de fil de discussion">
    Telegram prend en charge les balises explicites de fil de discussion dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`

    Lorsque le fil de discussion est activé et que le texte ou la légende Telegram original est disponible, OpenClaw inclut automatiquement un extrait de citation natif Telegram. Telegram limite le texte de citation natif à 1024 unités de code UTF-16, les messages plus longs sont donc cités depuis le début et reviennent à une réponse simple si Telegram rejette la citation.

    Remarque : `off` désactive le fil de discussion implicite. Les balises explicites `[[reply_to_*]]` sont toujours honorées.

  </Accordion>

  <Accordion title="Sujets de forum et comportement des fils">
    Supergroupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'indication d'écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id`Telegram (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions d'écriture incluent toujours `message_thread_id`

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe sauf en cas de substitution (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
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

    Chaque sujet possède ensuite sa propre clé de session : `agent:zu:telegram:group:-1001234567890:topic:3`

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler des sessions de harnais ACP via des liaisons ACP typées de niveau supérieur (`bindings[]` avec `type: "acp"` et `match.channel: "telegram"`, `peer.kind: "group"`, et un id qualifié par sujet comme `-1001234567890:topic:42`). Actuellement limité aux sujets de forum dans les groupes/supergroupes. Voir [Agents ACP](/fr/tools/acp-agents).

    **Génération ACP liée au fil depuis le chat** : `/acp spawn <agent> --thread here|auto`OpenClaw lie le sujet actuel à une nouvelle session ACP ; les suites y sont routées directement. OpenClaw épingle la confirmation de génération dans le sujet. Nécessite que `channels.telegram.threadBindings.spawnSessions` reste activé (par défaut : `true`).

    Le contexte du modèle expose `MessageThreadId` et `IsForum`. Les chats DM avec `message_thread_id` conservent le routage DM et les métadonnées de réponse sur des sessions plates par défaut ; ils n'utilisent des clés de session sensibles aux fils que lorsqu'ils sont configurés avec `threadReplies: "inbound"`, `threadReplies: "always"`, `requireTopic: true`, ou une configuration de sujet correspondante. Utilisez `channels.telegram.dm.threadReplies` de niveau supérieur pour la valeur par défaut du compte, ou `direct.<chatId>.threadReplies` pour un DM.

  </Accordion>

  <Accordion title="Audio, vidéo et stickers"Telegram>
    ### Messages audio

    Telegram fait la distinction entre les notes vocales et les fichiers audio.

    - par défaut : comportement de fichier audio
    - balise `[[audio_as_voice]]` dans la réponse de l'agent pour forcer l'envoi d'une note vocale
    - les transcriptions des notes vocales entrantes sont présentées comme du texte généré par machine,
      non fiable dans le contexte de l'agent ; la détection de mention utilise toujours la
      transcription brute, de sorte que les messages vocaux filtrés par mention continuent de fonctionner.

    Exemple d'action de message :

````json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```Telegram

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
````

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

    Les stickers sont décrits une fois (lorsque cela est possible) et mis en cache pour réduire les appels de vision répétés.

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

    Envoyer une action de sticker :

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

  <Accordion title="Notifications de réaction"Telegram>
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction`OpenClaw (séparément des payloads de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own`Telegram signifie uniquement les réactions des utilisateurs aux messages envoyés par le bot (au mieux, via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les IDs de fil dans les mises à jour de réaction.
      - les groupes non-forum sont routés vers la session de chat de groupe
      - les groupes de forum sont routés vers la session du sujet général du groupe (`:topic:1`), et non le sujet d'origine exact

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Réactions d'accusé de réception">
    `ackReaction`OpenClaw envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - emoji de repli de l'identité de l'agent (`agents.list[].identity.emoji`Telegram, sinon "👀")

    Notes :

    - Telegram attend des emoji unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

  </Accordion>

  <Accordion title="Config writes from Telegram events and commands">
    Les écritures de configuration de canal sont activées par défaut (`configWrites !== false`).

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
    Le mode par défaut est le long polling. Pour le mode webhook, définissez `channels.telegram.webhookUrl` et `channels.telegram.webhookSecret` ; optionnel `webhookPath`, `webhookHost`, `webhookPort` (par défaut `/telegram-webhook`, `127.0.0.1`, `8787`).

    En mode long polling, OpenClaw ne persiste son filigrane de redémarrage qu'après l'expédition réussie d'une mise à jour. Si un gestionnaire échoue, cette mise à jour reste réessayable dans le même processus et n'est pas écrite comme terminée pour la déduplication de redémarrage.

    L'écouteur local se lie à `127.0.0.1:8787`. Pour un ingress public, placez soit un proxy inverse devant le port local ou définissez `webhookHost: "0.0.0.0"` intentionnellement.

    Le mode webhook valide les gardes de requête, le jeton secret Telegram et le corps JSON avant de retourner `200` à Telegram.
    OpenClaw traite ensuite la mise à jour de manière asynchrone via les mêmes voies de bot par chat/sujet utilisées par le long polling, donc les tours d'agent lents ne bloquent pas l'ACK de livraison de Telegram.

  </Accordion>

  <Accordion title="Limites, nouvelles tentatives et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.mediaGroupFlushMs` (par défaut 500) contrôle la durée de mise en tampon des albums/groupes de médias Telegram avant que OpenClaw ne les distribue comme un seul message entrant. Augmentez-le si les parties de l'album arrivent en retard ; diminuez-le pour réduire la latence de réponse aux albums.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client de l'Telegram de l'API (si non défini, la valeur par défaut de grammY s'applique). Les clients bot limitent les valeurs configurées en dessous de la garde de requête de texte/frappe sortante de 60 secondes afin que grammY n'abandonne pas la livraison de la réponse visible avant que la garde de transport et le repli de OpenClaw ne puissent s'exécuter. Le polling long utilise toujours une garde de requête `getUpdates` de 45 secondes afin que les sondages inactifs ne soient pas abandonnés indéfiniment.
    - `channels.telegram.pollingStallThresholdMs` par défaut à `120000` ; réglez entre `30000` et `600000` uniquement pour les redémarrages de blocage de polling faux positifs.
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - le contexte supplémentaire de réponse/citation/transfert est normalisé en une chaîne de réponse du plus proche au premier lorsque la passerelle a observé les messages parents ; le cache des messages observés est persisté à côté du stockage de session. Telegram n'inclut qu'un `reply_to_message` superficiel dans les mises à jour, donc les chaînes plus anciennes que le cache sont limitées à la charge utile de mise à jour actuelle de Telegram.
    - les listes autorisées Telegram contrôlent principalement qui peut déclencher l'agent, et non une frontière complète de rédaction de contexte supplémentaire.
    - contrôles de l'historique DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la config `channels.telegram.retry` s'applique aux assistants d'envoi Telegram (CLI/outils/actions) pour les erreurs API sortantes récupérables. La livraison de la réponse finale entrante utilise également une nouvelle tentative d'envoi sûr bornée pour les échecs de pré-connexion Telegram, mais elle ne réessaie pas les enveloppes réseau post-envoi ambiguës qui pourraient dupliquer les messages visibles.

    Les cibles d'envoi CLI et de l'outil de message peuvent être l'ID de chat numérique, le nom d'utilisateur, ou une cible de sujet de forum :

```bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
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
    - `--pin` ou `--delivery '{"pin":true}'` pour demander une livraison épinglée lorsque le bot peut épingler dans ce chat
    - `--force-document` pour envoyer des images et des GIF sortants sous forme de documents au lieu de téléchargements de photos compressés ou de médias animés

    Limitation des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="TelegramApprobations d'exécution sur Telegram"TelegramTelegram>
    Telegram prend en charge les approbations d'exécution dans les DMs des approbateurs et peut facultativement publier des invites dans le chat ou le sujet d'origine. Les approbateurs doivent être des IDs utilisateur numériques Telegram.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled` (s'active automatiquement lorsqu'au moins un approbateur est résolvable)
    - `channels.telegram.execApprovals.approvers` (revient aux IDs de propriétaire numériques de `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target` : `dm` (par défaut) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` et `defaultTo` contrôlent qui peut parler au bot et où il envoie les réponses normales. Ils ne font pas de quelqu'un un approbateur d'exécution. Le premier appairage DM approuvé amorce `commands.ownerAllowFrom` lorsqu'aucun propriétaire de commande n'existe encore, donc la configuration à un seul propriétaire fonctionne toujours sans dupliquer les IDs sous `execApprovals.approvers`.

    La livraison par canal affiche le texte de la commande dans le chat ; n'activez `channel` ou `both`OpenClaw que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet pour l'invite d'approbation et la suite. Les approbations d'exécution expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne nécessitent également `channels.telegram.capabilities.inlineButtons` pour autoriser la surface cible (`dm`, `group` ou `all`). Les IDs d'approbation préfixés par `plugin:` sont résolus via les approbations de plugin ; les autres sont résolus d'abord via les approbations d'exécution.

    Voir [Approbations d'exécution](/fr/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Contrôles des réponses d'erreur

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs           | Par défaut | Description                                                                                                |
| ----------------------------------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`    | `reply` envoie un message d'erreur convivial au chat. `silent` supprime entièrement les réponses d'erreur. |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000`    | Temps minimum entre les réponses d'erreur pour le même chat. Empêche le spam d'erreurs pendant les pannes. |

Les redéfinitions par compte, par groupe et par sujet sont prises en charge (même héritage que pour les autres clés de configuration Telegram).

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

    - Si `requireMention=false`Telegram, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Désactiver
      - puis retirer et ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe sans mention.
    - `openclaw channels status --probe` peut vérifier les ID numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une vérification d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Le bot ne voit pas du tout les messages de groupe">

    - lorsque `channels.telegram.groups` existe, le groupe doit être répertorié (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons de l'ignorance

  </Accordion>

  <Accordion title="Les commandes fonctionnent partiellement ou pas du tout">

    - autorisez votre identité d'expéditeur (jumelage et/ou `allowFrom` numérique)
    - l'autorisation de commande s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - les appels de démarrage `deleteMyCommands` / `setMyCommands` et les appels de saisie `sendChatAction` sont limités et réessayés une fois via le secours de transport de Telegram en cas de timeout de requête. Les erreurs persistantes de réseau/récupération indiquent généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Rapports de démarrage indiquant un jeton non autorisé">

    - `getMe returned 401`Telegram est une échec d'authentification Telegram pour le jeton de bot configuré.
    - Recopiez ou régénérez le jeton du bot dans BotFather, puis mettez à jour `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken`, ou `TELEGRAM_BOT_TOKEN` pour le compte par défaut.
    - `deleteWebhook 401 Unauthorized`API lors du démarrage est également un échec d'authentification ; le traiter comme « aucun webhook n'existe » ne ferait que reporter le même échec de mauvais jeton aux appels API ultérieurs.

  </Accordion>

  <Accordion title="Polling ou instabilité du réseau">

    - Node 22+ + fetch/proxy personnalisé peut déclencher un comportement d'abandon immédiat si les types AbortSignal ne correspondent pas.
    - Certains hôtes résolvent `api.telegram.org` d'abord en IPv6 ; une sortie IPv6 défaillante peut provoquer des échecs intermittents de l'Telegram API.
    - Si les journaux incluent `TypeError: fetch failed` ou `Network request for 'getUpdates' failed!`, OpenClaw réessaie désormais ces erreurs en tant qu'erreurs réseau récupérables.
    - Lors du démarrage du polling, OpenClaw réutilise la sonde de démarrage `getMe` réussie pour grammY afin que le runner n'ait pas besoin d'un deuxième `getMe` avant le premier `getUpdates`.
    - Si `deleteWebhook` échoue avec une erreur réseau transitoire lors du démarrage du polling, OpenClaw passe au long polling au lieu de faire un autre appel de plan de contrôle préalable au polling. Un webhook toujours actif apparaît comme un conflit `getUpdates` ; OpenClaw reconstruit alors le transport Telegram et réessaie le nettoyage du webhook.
    - Si les sockets Telegram se recyclent selon une cadence fixe courte, vérifiez un `channels.telegram.timeoutSeconds` faible ; les clients bot limitent les valeurs configurées en dessous des gardes de requête sortantes et `getUpdates`, mais les anciennes versions pouvaient abandonner chaque sondage ou réponse lorsque ceci était réglé en dessous de ces gardes.
    - Si les journaux incluent `Polling stall detected`, OpenClaw redémarre le polling et reconstruit le transport Telegram après 120 secondes sans activité de long polling terminée par défaut.
    - `openclaw channels status --probe` et `openclaw doctor` avertissent lorsqu'un compte de polling en cours d'exécution n'a pas terminé `getUpdates` après le délai de grâce au démarrage, lorsqu'un compte de webhook en cours d'exécution n'a pas terminé `setWebhook` après le délai de grâce au démarrage, ou lorsque la dernière activité de transport de polling réussie est obsolète.
    - Augmentez `channels.telegram.pollingStallThresholdMs` uniquement lorsque les appels `getUpdates` de longue durée sont sains mais que votre hôte signale encore de faux redémarrages d'arrêt de polling. Les arrêts persistants pointent généralement vers des problèmes de proxy, DNS, IPv6 ou de sortie TLS entre l'hôte et `api.telegram.org`.
    - Telegram respecte également les variables d'environnement de proxy de processus pour le transport de Bot API, y compris `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, et leurs variantes en minuscules. `NO_PROXY` / `no_proxy` peuvent toujours contourner `api.telegram.org`.
    - Si le proxy géré par OpenClaw est configuré via `OPENCLAW_PROXY_URL` pour un environnement de service et qu'aucun environnement de proxy standard n'est présent, Telegram utilise également cette URL pour le transport de Bot API.
    - Sur les hôtes VPS avec une sortie/TLS directe instable, acheminez les appels Telegram API via `channels.telegram.proxy` :

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ utilise par défaut `autoSelectFamily=true` (sauf WSL2). L'ordre des résultats DNS Telegram honore `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, puis `channels.telegram.network.dnsResultOrder`, puis la valeur par défaut du processus telle que `NODE_OPTIONS=--dns-result-order=ipv4first` ; si aucune ne s'applique, Node 22+ revient à `ipv4first`.
    - Si votre hôte est WSL2 ou fonctionne explicitement mieux avec un comportement IPv4 uniquement, forcez la sélection de la famille :

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Les réponses de la plage de référence RFC 2544 (`198.18.0.0/15`) sont déjà autorisées
      par défaut pour les téléchargements de médias Telegram. Si un proxy de fausse IP ou
      transparent de confiance réécrit `api.telegram.org` vers une autre
      adresse privée/interne/à usage spécial lors des téléchargements de médias, vous pouvez
      activer le contournement exclusif Telegram :

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La même option est disponible par compte à
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si votre proxy résout les hôtes de médias Telegram en `198.18.x.x`, laissez le
      indicateur dangereux désactivé d'abord. Les médias Telegram autorisent déjà la plage de référence RFC 2544
      par défaut.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` affaiblit les protections
      SSRF des médias Telegram. Utilisez-le uniquement pour les environnements de proxy
      contrôlés par un opérateur de confiance tels que Clash, Mihomo, ou le routage par fausse IP de Surge lorsqu'ils
      synthétisent des réponses privées ou à usage spécial en dehors de la plage de référence RFC 2544.
      Laissez-le désactivé pour l'accès Internet public normal à Telegram.
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

## Référence de configuration

Référence principale : [Configuration reference - Telegram](Telegram/en/gateway/config-channels#telegram).

<Accordion title="TelegramChamps Telegram à fort signal">

- démarrage/authentification : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- discussion/réponses : `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- streaming : `streaming` (aperçu), `streaming.preview.toolProgress`, `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- racine API personnalisée : `apiRoot` (racine de l'API Bot uniquement ; ne pas inclure `/bot<TOKEN>`)
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capacités : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- réactions : `reactionNotifications`, `reactionLevel`
- erreurs : `errorPolicy`, `errorCooldownMs`
- écritures/historique : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>
  Priorité multi-compte : lorsque deux ou plusieurs identifiants de compte sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite. Sinon, OpenClaw revient par défaut au premier identifiant de compte normalisé et `openclaw doctor` avertit. Les comptes nommés héritent des valeurs
  `channels.telegram.allowFrom` / `groupAllowFrom`, mais pas des valeurs `accounts.default.*`.
</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Telegram à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement de la liste d'autorisation des groupes et sujets.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminer les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/fr/concepts/multi-agent">
    Mapper les groupes et sujets aux agents.
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics multi-canaux.
  </Card>
</CardGroup>

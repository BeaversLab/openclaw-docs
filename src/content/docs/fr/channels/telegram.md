---
summary: "État du support, capacités et configuration du bot Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "Telegram"
---

Prêt pour la production pour les DMs de bot et les groupes via grammY. Le polling long est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut pour Telegram est le couplage.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et playbooks de réparation inter-canaux.
  </Card>
  <Card title="Gateway configuration" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples de configuration complète de canal.
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

    Env fallback: `TELEGRAM_BOT_TOKEN=...` (compte par défaut uniquement).
    Telegram n'utilise **pas** `openclaw channels login telegram`; configurez le jeton dans config/env, puis démarrez la passerelle.

  </Step>

  <Step title="Start gateway and approve first DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Les codes de couplage expirent après 1 heure.

  </Step>

  <Step title="Ajouter le bot à un groupe"Telegram>
    Ajoutez le bot à votre groupe, puis récupérez les deux ID nécessaires à l'accès au groupe :

    - votre ID utilisateur Telegram, utilisé dans `allowFrom` / `groupAllowFrom`Telegram
    - l'ID du chat de groupe Telegram, utilisé comme clé sous `channels.telegram.groups`

    Pour une première configuration, obtenez l'ID du chat de groupe depuis `openclaw logs --follow`API, un bot de transfert d'ID, ou l'API Bot `getUpdates`. Une fois le groupe autorisé, `/whoami@<bot_username>`Telegram peut confirmer les ID utilisateur et de groupe.

    Les ID de supergroupe Telegram négatifs commençant par `-100` sont des ID de chat de groupe. Placez-les sous `channels.telegram.groups`, et non sous `groupAllowFrom`.

  </Step>
</Steps>

<Note>
  L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration l'emportent sur le repli de l'environnement, et `TELEGRAM_BOT_TOKEN`OpenClawTelegram ne s'applique qu'au compte par défaut. Après un démarrage réussi, OpenClaw met en cache l'identité du bot dans le répertoire d'état pendant jusqu'à 24 heures afin que les redémarrages puissent éviter un appel
  d'API Telegram `getMe` supplémentaire ; la modification ou la suppression du jeton efface ce cache.
</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Mode privé et visibilité du groupe"Telegram>
    Les bots Telegram sont par défaut en **Mode privé** (Privacy Mode), ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages du groupe, soit :

    - désactivez le mode privé via `/setprivacy`Telegram, ou
    - rendez le bot administrateur du groupe.

    Lorsque vous basculez le mode privé, retirez et ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique le changement.

  </Accordion>

  <Accordion title="Autorisations de groupe"Telegram>
    Le statut d'administrateur est contrôlé dans les paramètres du groupe Telegram.

    Les bots administrateurs reçoivent tous les messages du groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` pour autoriser/refuser les ajouts aux groupes
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

    `dmPolicy: "open"` avec `allowFrom: ["*"]` permet à n'importe quel compte Telegram qui trouve ou devine le nom d'utilisateur du bot de commander le bot. Utilisez-le uniquement pour les bots intentionnellement publics avec des outils restreints ; les bots à un seul propriétaire doivent utiliser `allowlist` avec des ID utilisateur numériques.

    `channels.telegram.allowFrom` accepte les ID utilisateur numériques Telegram. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    Dans les configurations multi-comptes, un `channels.telegram.allowFrom` de premier niveau restrictif est traité comme une limite de sécurité : les entrées `allowFrom: ["*"]` au niveau du compte ne rendent pas ce compte public, sauf si la liste d'autorisation de compte effective contient toujours un caractère générique explicite après fusion.
    `dmPolicy: "allowlist"` avec `allowFrom` vide bloque tous les DMs et est rejeté par la validation de la configuration.
    Le configuration demande uniquement des ID utilisateur numériques.
    Si vous avez mis à jour et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous utilisiez auparavant des fichiers de liste d'autorisation de stockage d'appariement, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple lorsque `dmPolicy: "allowlist"` n'a pas encore d'ID explicites).

    Pour les bots à un seul propriétaire, préférez `dmPolicy: "allowlist"` avec des ID `allowFrom` numériques explicites pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appariement précédentes).

    Confusion courante : l'approbation d'appariement DM ne signifie pas « cet expéditeur est autorisé partout ».
    L'appariement accorde l'accès DM. Si aucun propriétaire de commande n'existe encore, le premier appariement approuvé définit également `commands.ownerAllowFrom` afin que les commandes réservées au propriétaire et les approbations exec aient un compte d'opérateur explicite.
    L'autorisation de l'expéditeur de groupe provient toujours des listes d'autorisation de configuration explicites.
    Si vous souhaitez « Je suis autorisé une fois et les DMs ainsi que les commandes de groupe fonctionnent », placez votre ID utilisateur numérique Telegram dans `channels.telegram.allowFrom` ; pour les commandes réservées au propriétaire, assurez-vous que `commands.ownerAllowFrom` contient `telegram:<your user id>`.

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
    Ne mettez pas les IDs de conversation de groupe ou de supergroupe Telegram dans `groupAllowFrom`. Les IDs de conversation négatifs appartiennent à `channels.telegram.groups`.
    Les entrées non numériques sont ignorées pour l'autorisation de l'expéditeur.
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur de groupe n'hérite **pas** des approbations du magasin d'appariement DM.
    L'appariement reste limité aux DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Si `groupAllowFrom` n'est pas défini, Telegram revient à la configuration `allowFrom`, et non au magasin d'appariement.
    Modèle pratique pour les bots à un seul propriétaire : définissez votre ID utilisateur dans `channels.telegram.allowFrom`, laissez `groupAllowFrom` non défini, et autorisez les groupes cibles sous `channels.telegram.groups`.
    Note d'exécution : si `channels.telegram` est totalement absent, l'exécution par défaut est `groupPolicy="allowlist"` (fermeture sécurisée) sauf si `channels.defaults.groupPolicy` est explicitement défini.

    Configuration de groupe propriétaire uniquement :

```json5
{
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: "pairing",
      allowFrom: ["<YOUR_TELEGRAM_USER_ID>"],
      groupPolicy: "allowlist",
      groups: {
        "<GROUP_CHAT_ID>": {
          requireMention: true,
        },
      },
    },
  },
}
```

    Testez-le depuis le groupe avec `@<bot_username> ping`. Les messages de groupe simples ne déclenchent pas le bot tandis que `requireMention: true`.

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

      - Mettez les IDs de conversation de groupe ou de supergroupe négatifs Telegram comme `-1001234567890` sous `channels.telegram.groups`.
      - Mettez les IDs utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous souhaitez limiter les personnes au sein d'un groupe autorisé pouvant déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous voulez que n'importe quel membre d'un groupe autorisé puisse parler au bot.

    </Warning>

  </Tab>

  <Tab title="Comportement des mentions">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername`, ou
    - des motifs de mention dans :
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

    Obtenir l'ID du chat de groupe :

    - transférer un message de groupe vers `@userinfobot` / `@getidsbot`
    - ou lire `chat.id` depuis `openclaw logs --follow`
    - ou inspecter l'API Bot API `getUpdates`
    - après que le groupe est autorisé, exécuter `/whoami@<bot_username>` si les commandes natives sont activées

  </Tab>
</Tabs>

## Comportement à l'exécution

- Telegram appartient au processus de passerelle.
- Le routage est déterministe : les réponses entrantes Telegram reviennent vers Telegram (le modèle ne choisit pas les canaux).
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec des métadonnées de réponse, des espaces réservés pour les médias et un contexte de chaîne de réponse persistant pour les réponses Telegram que la passerelle a observées.
- Les sessions de groupe sont isolées par l'ID de groupe. Les sujets de forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id` ; OpenClaw préserve l'ID de fil pour les réponses mais conserve les DMs sur la session plate par défaut. Configurez `channels.telegram.dm.threadReplies: "inbound"`, `channels.telegram.direct.<chatId>.threadReplies: "inbound"`, `requireTopic: true`, ou une configuration de sujet correspondante lorsque vous souhaitez intentionnellement une isolation de session de sujet DM.
- Le long polling utilise le runner grammY avec un séquençage par chat par fil. La concurrence globale du sink du runner utilise `agents.defaults.maxConcurrent`.
- Le démarrage multi-compte limite les sondes simultanées `getMe` Telegram afin que les grandes flottes de bots n'éparpillent pas chaque sonde de compte en même temps.
- Le long polling est protégé à l'intérieur de chaque processus de passerelle afin qu'un seul sondeur actif puisse utiliser un jeton de bot à la fois. Si vous voyez encore des conflits `getUpdates` 409, une autre passerelle OpenClaw, un script ou un sondeur externe utilise probablement le même jeton.
- Par défaut, les redémarrages du chien de garde de polling long se déclenchent après 120 secondes sans `getUpdates` de liveness terminée. Augmentez `channels.telegram.pollingStallThresholdMs` uniquement si votre déploiement rencontre toujours des redémarrages intempestifs dus à un arrêt du polling pendant des tâches de longue durée. La valeur est en millisecondes et est autorisée de `30000` à `600000` ; les remplacements par compte sont pris en charge.
- L'Telegram Bot API ne prend pas en charge les accusés de réception (`sendReadReceipts` ne s'applique pas).

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu en direct (modifications de messages)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - discussions directes : message d'aperçu + `editMessageText`
    - groupes/sujets : message d'aperçu + `editMessageText`

    Condition requise :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` conserve un brouillon de statut modifiable pour la progression des outils, l'efface à l'achèvement et envoie la réponse finale sous forme de message normal
    - `streaming.preview.toolProgress` contrôle si les mises à jour des outils/progression réutilisent le même message d'aperçu modifié (par défaut : `true` lorsque la diffusion de l'aperçu est active)
    - `streaming.preview.commandText` contrôle les détails de commande/exec dans ces lignes de progression des outils : `raw` (par défaut, préserve le comportement publié) ou `status` (étiquette de l'outil uniquement)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont détectées ; exécutez `openclaw doctor --fix` pour les migrer vers `channels.telegram.streaming.mode`

    Les mises à jour de l'aperçu de progression des outils sont les courtes lignes de statut affichées pendant l'exécution des outils, par exemple l'exécution de commandes, la lecture de fichiers, les mises à jour de planification, les résumés de correctifs, ou le texte de préambule/commentaire de Codex en mode serveur d'application Codex. Telegram les garde activées par défaut pour correspondre au comportement publié de OpenClaw à partir de `v2026.4.22` et versions ultérieures. Pour conserver l'aperçu modifié pour le texte de réponse mais masquer les lignes de progression des outils, définissez :

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

    Pour garder la progression des outils visible mais masquer le texte de commande/exec, définissez :

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

    Utilisez le mode `progress` lorsque vous souhaitez une progression d'outil visible sans modifier la réponse finale dans ce même message. Placez la stratégie de texte de commande sous `streaming.progress` :

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

    Utilisez `streaming.mode: "off"` uniquement lorsque vous souhaitez une livraison finale uniquement : les modifications d'aperçu Telegram sont désactivées et les bavardages génériques d'outil/progression sont supprimés au lieu d'être envoyés comme messages de statut autonomes. Les invites d'approbation, les charges utiles multimédias et les erreurs passent toujours par la livraison finale normale. Utilisez `streaming.preview.toolProgress: false` lorsque vous ne souhaitez conserver que les modifications d'aperçu de réponse tout en masquant les lignes de statut de progression des outils.

    <Note>
      Les réponses de citation sélectionnées Telegram constituent l'exception. Lorsque `replyToMode` est `"first"`, `"all"`, ou `"batched"` et que le message entrant inclut du texte de citation sélectionné, OpenClaw envoie la réponse finale via le chemin de réponse de citation natif de Telegram au lieu de modifier l'aperçu de la réponse, donc `streaming.preview.toolProgress` ne peut pas afficher les courtes lignes de statut pour ce tour. Les réponses au message actuel sans texte de citation sélectionné conservent toujours la diffusion de l'aperçu. Définissez `replyToMode: "off"` lorsque la visibilité de la progression des outils prime sur les réponses de citation natives, ou définissez `streaming.preview.toolProgress: false` pour accepter le compromis.
    </Note>

    Pour les réponses texte uniquement :

    - aperçus DM/groupe/sujet courts : OpenClaw conserve le même message d'aperçu et effectue la modification finale sur place
    - les textes finaux longs qui sont divisés en plusieurs messages Telegram réutilisent l'aperçu existant comme premier segment final lorsque c'est possible, puis n'envoient que les segments restants
    - les finaux en mode progression effacent le brouillon de statut et utilisent la livraison finale normale au lieu de modifier le brouillon en réponse
    - si la modification finale échoue avant que le texte terminé ne soit confirmé, OpenClaw utilise la livraison finale normale et nettoie l'aperçu périmé

    Pour les réponses complexes (par exemple charges utiles multimédias), OpenClaw revient à la livraison finale normale puis nettoie le message d'aperçu.

    La diffusion de l'aperçu est distincte de la diffusion par blocs. Lorsque la diffusion par blocs est explicitement activée pour Telegram, OpenClaw ignore le flux d'aperçu pour éviter la double diffusion.

    Flux de raisonnement Telegram uniquement :

    - `/reasoning stream` envoie le raisonnement à l'aperçu en direct lors de la génération
    - l'aperçu de raisonnement est supprimé après la livraison finale ; utilisez `/reasoning on` lorsque le raisonnement doit rester visible
    - la réponse finale est envoyée sans texte de raisonnement

  </Accordion>

  <Accordion title="Formatage et repli HTML"Telegram>
    Le texte sortant utilise Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw.

    - Le texte de type Markdown est rendu en HTML sécurisé pour Telegram.
    - Les balises HTML prises en charge par Telegram sont conservées ; le HTML non pris en charge est échappé.
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

    - les noms sont normalisés (suppression du `/` au début, en minuscules)
    - motif valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont uniquement des entrées de menu ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugins/compétences peuvent toujours fonctionner lorsqu'elles sont saisies, même si elles n'apparaissent pas dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plugins peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram déborde toujours après le rognage ; réduisez les commandes de plugins/compétences/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands` ou `setMyCommands` échouant avec `404: Not Found` alors que les commandes curl directes du Bot API fonctionnent peut signifier que `channels.telegram.apiRoot` a été défini sur le point de terminaison `/bot<TOKEN>` complet. `apiRoot` doit être uniquement la racine du Bot API et `openclaw doctor --fix` supprime un `/bot<TOKEN>` de fin accidentel.
    - `getMe returned 401` signifie que Telegram a rejeté le jeton de bot configuré. Mettez à jour `botToken`, `tokenFile` ou `TELEGRAM_BOT_TOKEN` avec le jeton BotFather actuel ; OpenClaw s'arrête avant le polling, ce n'est donc pas signalé comme un échec de nettoyage de webhook.
    - `setMyCommands failed` avec des erreurs réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appareillage des appareils (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris les rôles/portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Le code de configuration transporte un jeton d'amorçage à courte durée de vie. L'amorçage du code de configuration intégré est réservé aux nœuds : la première connexion crée une demande de nœud en attente et, après approbation, le Gateway renvoie un jeton de nœud durable avec `scopes: []`. Il ne renvoie pas de jeton d'opérateur transféré ; l'accès opérateur nécessite un appariement d'opérateur approuvé distinct ou un flux de jetons.

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Relancez `/pair pending` avant d'approuver.

    Plus de détails : [Appareillage](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Inline buttons">
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

    Exemple de bouton de Mini App :

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Open app:",
  presentation: {
    blocks: [
      {
        type: "buttons",
        buttons: [{ label: "Launch", web_app: { url: "https://example.com/app" } }],
      },
    ],
  },
}
```

    Les boutons Telegram `web_app` ne fonctionnent que dans les chats privés entre un utilisateur et le
    bot.

    Les clics sur les rappels (callbacks) sont transmis à l'agent sous forme de texte :
    `callback_data: <value>`

  </Accordion>

  <Accordion title="TelegramActions de message Telegram pour les agents et l'automatisation"Telegram>
    Les actions de tool Telegram incluent :

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

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` distincts.
    Les envois d'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Tags de fil de discussion pour les réponses">
    Telegram prend en charge les balises explicites de fil de discussion pour les réponses dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle le traitement :

    - `off` (par défaut)
    - `first`
    - `all`

    Lorsque le fil de discussion pour les réponses est activé et que le texte ou la légende Telegram d'origine est disponible, OpenClaw inclut automatiquement un extrait de citation natif Telegram. Telegram limite le texte de citation natif à 1024 unités de code UTF-16, donc les messages plus longs sont cités depuis le début et reviennent à une réponse simple si Telegram rejette la citation.

    Remarque : `off` désactive le fil de discussion implicite pour les réponses. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets du forum et comportement des fils">
    Super-groupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id`Telegram (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions d'écriture incluent toujours `message_thread_id`

    Héritage des sujets : les entrées de sujet héritent des paramètres du groupe sauf en cas de substitution (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
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

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler les sessions de harnais ACP via des liaisons ACP typées de niveau supérieur (`bindings[]` avec `type: "acp"` et `match.channel: "telegram"`, `peer.kind: "group"`, et un id qualifié par sujet comme `-1001234567890:topic:42`). Actuellement limité aux sujets de forum dans les groupes/super-groupes. Voir [Agents ACP](/fr/tools/acp-agents).

    **Génération ACP liée au fil depuis le chat** : `/acp spawn <agent> --thread here|auto`OpenClaw lie le sujet actuel à une nouvelle session ACP ; les suites sont routées directement ici. OpenClaw épingle la confirmation de génération dans le sujet. Nécessite que `channels.telegram.threadBindings.spawnSessions` reste activé (par défaut : `true`).

    Le contexte du modèle expose `MessageThreadId` et `IsForum`. Les conversations DM avec `message_thread_id` conservent le routage DM et les métadonnées de réponse sur des sessions plates par défaut ; elles n'utilisent des clés de session sensibles aux fils que lorsqu'elles sont configurées avec `threadReplies: "inbound"`, `threadReplies: "always"`, `requireTopic: true`, ou une configuration de sujet correspondante. Utilisez `channels.telegram.dm.threadReplies` de niveau supérieur pour la valeur par défaut du compte, ou `direct.<chatId>.threadReplies` pour un DM spécifique.

  </Accordion>

  <Accordion title="Audio, vidéo et autocollants">
    ### Messages audio

    Telegram fait la distinction entre les messages vocaux et les fichiers audio.

    - par défaut : comportement de fichier audio
    - balise `[[audio_as_voice]]` dans la réponse de l'agent pour forcer l'envoi d'un message vocal
    - les transcriptions de messages vocaux entrants sont présentées comme du texte généré par machine,
      non fiable dans le contexte de l'agent ; la détection de mention utilise toujours la
      transcription brute, de sorte que les messages vocaux filtrés par mention continuent de fonctionner.

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

    Telegram fait la distinction entre les fichiers vidéo et les messages vidéo.

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

    Champs de contexte des autocollants :

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Fichier de cache des autocollants :

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

    Envoyer l'action d'autocollant :

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    Rechercher les autocollants en cache :

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>

  <Accordion title="Notification de réaction"Telegram>
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction`OpenClaw (séparément des charges utiles de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own`Telegram signifie les réactions des utilisateurs uniquement aux messages envoyés par le bot (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les identifiants de fil dans les mises à jour de réaction.
      - les groupes non-forum acheminent vers la session de chat de groupe
      - les groupes de forum acheminent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet d'origine exact

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Réactions d'accusé de réception">
    `ackReaction`OpenClaw envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - repli vers l'emoji d'identité de l'agent (`agents.list[].identity.emoji`Telegram, sinon "👀")

    Notes :

    - Telegram attend des emoji unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour un canal ou un compte.

  </Accordion>

  <Accordion title="TelegramÉcritures de configuration depuis les événements et commandes Telegram">
    Les écritures de configuration du canal sont activées par défaut (`configWrites !== false`Telegram).

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
    Le mode par défaut est le long polling. Pour le mode webhook, définissez `channels.telegram.webhookUrl` et `channels.telegram.webhookSecret` ; optionnel `webhookPath`, `webhookHost`, `webhookPort` (par défaut `/telegram-webhook`, `127.0.0.1`, `8787`OpenClaw).

    En mode long polling, OpenClaw persiste son filigrane de redémarrage uniquement après l'expédition réussie d'une mise à jour. Si un gestionnaire échoue, cette mise à jour reste réessayable dans le même processus et n'est pas écrite comme terminée pour la déduplication de redémarrage.

    L'écouteur local se lie à `127.0.0.1:8787`. Pour une entrée publique, placez soit un proxy inverse devant le port local, soit définissez `webhookHost: "0.0.0.0"`Telegram intentionnellement.

    Le mode webhook valide les gardes de requête, le jeton secret Telegram et le corps JSON avant de renvoyer `200`TelegramOpenClawTelegram à Telegram.
    OpenClaw traite ensuite la mise à jour de manière asynchrone via les mêmes voies de bot par chat/sujet utilisées par le long polling, de sorte que les tours d'agent lents ne bloquent pas l'ACK de livraison de Telegram.

  </Accordion>

  <Accordion title="CLILimites, nouvelles tentatives et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb`Telegram (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.mediaGroupFlushMs`TelegramOpenClaw (par défaut 500) contrôle la durée de mise en tampon des albums/groupes de médias Telegram avant qu'OpenClaw ne les distribue comme un message entrant unique. Augmentez-le si les parties de l'album arrivent tard ; diminuez-le pour réduire la latence de réponse aux albums.
    - `channels.telegram.timeoutSeconds`TelegramAPIgrammYgrammYOpenClaw remplace le délai d'attente du client API Telegram (si non défini, la valeur par défaut de grammY s'applique). Les clients bot limitent les valeurs configurées en dessous de la garde de requête de texte/frappe sortante de 60 secondes afin que grammY n'abandonne pas la livraison de la réponse visible avant que la garde de transport et le repli d'OpenClaw puissent s'exécuter. Le long polling utilise toujours une garde de requête de 45 secondes `getUpdates` afin que les sondages inactifs ne soient pas abandonnés indéfiniment.
    - `channels.telegram.pollingStallThresholdMs` par défaut `120000`; ajustez entre `30000` et `600000` uniquement pour les redémarrages de stagnation de sondage faux positifs.
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0`Telegram désactive.
    - le contexte supplémentaire de réponse/citation/transfert est normalisé dans une fenêtre de contexte de conversation sélectionnée lorsque la passerelle a observé les messages parents ; le cache des messages observés est persisté à côté du magasin de session. Telegram n'inclut qu'un `reply_to_message`TelegramTelegram superficiel dans les mises à jour, donc les chaînes plus anciennes que le cache sont limitées à la charge utile de mise à jour actuelle de Telegram.
    - les listes blanches Telegram contrôlent principalement qui peut déclencher l'agent, et non une limite complète de suppression du contexte supplémentaire.
    - contrôles de l'historique DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la configuration `channels.telegram.retry`TelegramCLIAPITelegramCLI s'applique aux helpers d'envoi Telegram (CLI/tools/actions) pour les erreurs API sortantes récupérables. La livraison de la réponse finale entrante utilise également une nouvelle tentative d'envoi sécurisé bornée pour les échecs de pré-connexion Telegram, mais elle ne réessaie pas les enveloppes réseau post-envoi ambiguës qui pourraient dupliquer les messages visibles.

    Les cibles d'envoi CLI et message-tool peuvent être un ID de chat numérique, un nom d'utilisateur ou une cible de sujet de forum :

````bash
openclaw message send --channel telegram --target 123456789 --message "hi"
openclaw message send --channel telegram --target @name --message "hi"
openclaw message send --channel telegram --target -1001234567890:topic:42 --message "hi topic"
```Telegram

    Les sondages Telegram utilisent `openclaw message poll` et prennent en charge les sujets de forum :

```bash
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300 --poll-public
```Telegram

    Indicateurs de sondage uniquement Telegram :

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` pour les sujets de forum (ou utilisez une cible `:topic:`Telegram)

    L'envoi Telegram prend également en charge :

    - `--presentation` avec des blocs `buttons` pour les claviers en ligne lorsque `channels.telegram.capabilities.inlineButtons` l'autorise
    - `--pin` ou `--delivery '{"pin":true}'` pour demander une livraison épinglée lorsque le bot peut épingler dans ce chat
    - `--force-document` pour envoyer les images, GIF et vidéos sortants sous forme de documents au lieu de photos compressées, de médias animés ou de téléchargements vidéo

    Gating des actions :

    - `channels.telegram.actions.sendMessage=false`Telegram désactive les messages Telegram sortants, y compris les sondages
    - `channels.telegram.actions.poll=false`Telegram désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="TelegramApprobations exec dans Telegram"TelegramTelegram>
    Telegram prend en charge les approbations exec dans les DMs des approbateurs et peut publier facultativement des invites dans le chat ou le sujet d'origine. Les approbateurs doivent être des IDs utilisateur numériques Telegram.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled` (s'active automatiquement lorsqu'au moins un approbateur peut être résolu)
    - `channels.telegram.execApprovals.approvers` (revient aux IDs de propriétaire numériques de `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target` : `dm` (par défaut) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` et `defaultTo` contrôlent qui peut parler au bot et où il envoie les réponses normales. Ils ne font pas de quelqu'un un approbateur exec. La première association DM approuvée amorce `commands.ownerAllowFrom` lorsqu'aucun propriétaire de commande n'existe encore, donc la configuration à un seul propriétaire fonctionne toujours sans dupliquer les IDs sous `execApprovals.approvers`.

    La livraison par canal affiche le texte de la commande dans le chat ; n'activez `channel` ou `both`OpenClaw que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet pour l'invite d'approbation et la suite. Les approbations exec expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne nécessitent également `channels.telegram.capabilities.inlineButtons` pour autoriser la surface cible (`dm`, `group` ou `all`). Les IDs d'approbation préfixés par `plugin:` sont résolus via les approbations de plugin ; les autres sont d'abord résolus via les approbations exec.

    Voir [Approbations exec](/en/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Contrôles de réponse aux erreurs

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs            | Par défaut | Description                                                                                     |
| ----------------------------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply` | `reply` envoie un message d'erreur convivial au chat. `silent` supprime entièrement les réponses d'erreur. |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000` | Temps minimum entre les réponses aux erreurs pour le même chat. Empêche le spam d'erreurs pendant les pannes.        |

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
````

## Dépannage

<AccordionGroup>
  <Accordion title="Bot does not respond to non mention group messages">

    - Si `requireMention=false`, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Désactiver
      - puis retirer et ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration s'attend à des messages de groupe sans mention.
    - `openclaw channels status --probe` peut vérifier les identifiants numériques explicites de groupes ; le joker `"*"` ne peut pas faire l'objet d'une vérification d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - lorsque `channels.telegram.groups` existe, le groupe doit être listé (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons de l'ignorance

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - autoriser votre identité d'expéditeur (appariement et/ou `allowFrom` numérique)
    - l'autorisation des commandes s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - les appels de démarrage `deleteMyCommands` / `setMyCommands` et les appels de saisie `sendChatAction` sont limités et réessayés une fois via le repli de transport de Telegram en cas de délai d'attente de la demande. Les erreurs persistantes de réseau/récupération indiquent généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401`Telegram est une erreur d'authentification Telegram pour le jeton de bot configuré.
    - Recopiez ou régénérez le jeton du bot dans BotFather, puis mettez à jour `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken` ou `TELEGRAM_BOT_TOKEN` pour le compte par défaut.
    - `deleteWebhook 401 Unauthorized`API lors du démarrage est également une erreur d'authentification ; la traiter comme « aucun webhook n'existe » ne ferait que reporter la même erreur de mauvais jeton aux appels API ultérieurs.

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + un fetch/proxy personnalisé peut déclencher un comportement d'arrêt immédiat si les types AbortSignal ne correspondent pas.
    - Certains hôtes résolvent `api.telegram.org` d'abord en IPv6 ; une sortie IPv6 défectueuse peut provoquer des échecs intermittents de l'Telegram API.
    - Si les journaux incluent `TypeError: fetch failed` ou `Network request for 'getUpdates' failed!`, OpenClaw réessaie désormais en tant qu'erreurs réseau récupérables.
    - Lors du démarrage du polling, OpenClaw réutilise la sonde `getMe` de démarrage réussie pour grammY afin que le runner n'ait pas besoin d'un second `getMe` avant le premier `getUpdates`.
    - Si `deleteWebhook` échoue avec une erreur réseau transitoire lors du démarrage du polling, OpenClaw passe en long polling au lieu de faire un autre appel de plan de contrôle pré-polling. Un webhook toujours actif apparaît comme un conflit `getUpdates` ; OpenClaw reconstruit ensuite le transport Telegram et réessaie le nettoyage du webhook.
    - Si les sockets Telegram recyclent sur une cadence fixe courte, vérifiez un `channels.telegram.timeoutSeconds` faible ; les clients bot limitent les valeurs configurées en dessous des gardes de requête sortantes et `getUpdates`, mais les anciennes versions pouvaient abandonner chaque sondage ou réponse lorsque ceci était réglé en dessous de ces gardes.
    - Si les journaux incluent `Polling stall detected`, OpenClaw redémarre le polling et reconstruit le transport Telegram après 120 secondes sans activité de long polling terminée par défaut.
    - `openclaw channels status --probe` et `openclaw doctor` avertissent lorsqu'un compte de polling en cours n'a pas terminé `getUpdates` après la période de grâce de démarrage, lorsqu'un compte webhook en cours n'a pas terminé `setWebhook` après la période de grâce de démarrage, ou lorsque la dernière activité de transport de polling réussie est obsolète.
    - Augmentez `channels.telegram.pollingStallThresholdMs` uniquement lorsque les appels `getUpdates` de longue durée sont sains mais que votre hôte signale encore de faux redémarrages de stagnation de polling. Les blocages persistants indiquent généralement des problèmes de proxy, DNS, IPv6 ou de sortie TLS entre l'hôte et `api.telegram.org`.
    - Telegram honore également les variables d'environnement de proxy de processus pour le transport Bot API, y compris `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, et leurs variantes en minuscules. `NO_PROXY` / `no_proxy` peuvent toujours contourner `api.telegram.org`.
    - Si le proxy géré OpenClaw est configuré via `OPENCLAW_PROXY_URL` pour un environnement de service et qu'aucune variable d'environnement de proxy standard n'est présente, Telegram utilise également cette URL pour le transport Bot API.
    - Sur les hôtes VPS avec une sortie/TLS directe instable, acheminez les appels Telegram API via `channels.telegram.proxy` :

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ utilise par défaut `autoSelectFamily=true` (sauf WSL2). L'ordre des résultats DNS Telegram honore `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, puis `channels.telegram.network.dnsResultOrder`, puis la valeur par défaut du processus telle que `NODE_OPTIONS=--dns-result-order=ipv4first` ; si aucune ne s'applique, Node 22+ revient à `ipv4first`.
    - Si votre hôte est WSL2 ou fonctionne explicitement mieux avec un comportement IPv4 uniquement, forcez la sélection de famille :

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Les réponses de plage de référence RFC 2544 (`198.18.0.0/15`) sont déjà autorisées
      par défaut pour les téléchargements de médias Telegram. Si un fake-IP de confiance ou
      un proxy transparent réécrit `api.telegram.org` vers une autre
      adresse privée/interne/à usage spécial lors des téléchargements de médias, vous pouvez
      activer le contournement Telegram uniquement :

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - La même activation est disponible par compte au
      niveau de `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si votre proxy résout les hôtes de médias Telegram en `198.18.x.x`, désactivez d'abord
      le drapeau dangereux. Les médias Telegram autorisent déjà la plage de référence
      RFC 2544 par défaut.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` affaiblit les protections SSRF
      des médias Telegram. Utilisez-le uniquement pour les environnements de proxy
      contrôlés par un opérateur de confiance tels que Clash, Mihomo, ou le routage fake-IP
      de Surge lorsqu'ils synthétisent des réponses privées ou à usage spécial en dehors
      de la plage de référence RFC 2544. Désactivez-le pour l'accès Telegram Internet public normal.
    </Warning>

    - Remplacements d'environnement (temporaires) :
      - `OPENCLAW_TELEGRAM_DISABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_ENABLE_AUTO_SELECT_FAMILY=1`
      - `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first`
    - Valider les réponses DNS :

```bash
dig +short api.telegram.org A
dig +short api.telegram.org AAAA
```

  </Accordion>
</AccordionGroup>

Plus d'aide : [Channel troubleshooting](/fr/channels/troubleshooting).

## Référence de configuration

Référence principale : [Configuration reference - Telegram](/fr/gateway/config-channels#telegram).

<Accordion title="TelegramChamps Telegram à fort signal">

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- discussion/réponses : `replyToMode`, `dm.threadReplies`, `direct.*.threadReplies`
- streaming : `streaming` (aperçu), `streaming.preview.toolProgress`, `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`
- racine API personnalisée : `apiRoot` (racine de l'API du bot uniquement ; ne pas inclure `/bot<TOKEN>`)
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
    Associer des groupes et des sujets aux agents.
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics multi-canaux.
  </Card>
</CardGroup>

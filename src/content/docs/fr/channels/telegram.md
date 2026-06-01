---
summary: "TelegramÉtat du support, capacités et configuration du bot Telegram"
read_when:
  - Working on Telegram features or webhooks
title: "TelegramTelegram"
---

Prêt pour la production pour les DMs de bot et les groupes via grammY. Le polling long est le mode par défaut ; le mode webhook est facultatif.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing" Telegram>
    La stratégie DM par défaut pour Telegram est l'appariement.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Manuels de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="GatewayGateway configuration" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples complets de configuration de canal.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Create the bot token in BotFather"Telegram>
    Ouvrez Telegram et chattez avec **@BotFather** (vérifiez que le pseudonyme est exactement `@BotFather`).

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

    Fallback Env : `TELEGRAM_BOT_TOKEN=...`Telegram (compte par défaut uniquement).
    Telegram n'utilise **pas** `openclaw channels login telegram` ; configurez le jeton dans config/env, puis démarrez la passerelle.

  </Step>

  <Step title="Start gateway and approve first DM">

```bash
openclaw gateway
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

    Les codes d'appariement expirent après 1 heure.

  </Step>

  <Step title="Ajouter le bot à un groupe"Telegram>
    Ajoutez le bot à votre groupe, puis récupérez les deux ID nécessaires à l'accès au groupe :

    - votre ID utilisateur Telegram, utilisé dans `allowFrom` / `groupAllowFrom`Telegram
    - l'ID de chat de groupe Telegram, utilisé comme clé sous `channels.telegram.groups`

    Pour une première configuration, obtenez l'ID de chat de groupe depuis `openclaw logs --follow`, un bot de transfert d'ID, ou l'API Bot API `getUpdates`. Une fois le groupe autorisé, `/whoami@<bot_username>`Telegram peut confirmer l'utilisateur et les ID de groupe.

    Les ID de supergroupe Telegram négatifs commençant par `-100` sont des ID de chat de groupe. Placez-les sous `channels.telegram.groups`, et non sous `groupAllowFrom`.

  </Step>
</Steps>

<Note>
  L'ordre de résolution des jetons est conscient du compte. En pratique, les valeurs de configuration l'emportent sur le repli des variables d'environnement, et `TELEGRAM_BOT_TOKEN` s'applique uniquement au compte par défaut. Après un démarrage réussi, OpenClaw met en cache l'identité du bot dans le répertoire d'état jusqu'à 24 heures afin que les redémarrages puissent éviter un appel Telegram
  `getMe` supplémentaire ; la modification ou la suppression du jeton efface ce cache.
</Note>

## Paramètres côté Telegram

<AccordionGroup>
  <Accordion title="Mode de confidentialité et visibilité du groupe">
    Les bots Telegram sont par défaut en **Mode de confidentialité** (Privacy Mode), ce qui limite les messages de groupe qu'ils reçoivent.

    Si le bot doit voir tous les messages du groupe, soit :

    - désactivez le mode de confidentialité via `/setprivacy`, ou
    - rendez le bot administrateur du groupe.

    Lorsque vous basculez le mode de confidentialité, retirez et ajoutez à nouveau le bot dans chaque groupe pour que Telegram applique le changement.

  </Accordion>

  <Accordion title="Autorisations de groupe">
    Le statut d'administrateur est contrôlé dans les paramètres de groupe Telegram.

    Les bots administrateurs reçoivent tous les messages du groupe, ce qui est utile pour un comportement de groupe toujours actif.

  </Accordion>

  <Accordion title="Helpful BotFather toggles">

    - `/setjoingroups` pour autoriser/refuser les ajouts aux groupes
    - `/setprivacy` pour le comportement de visibilité du groupe

  </Accordion>
</AccordionGroup>

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.telegram.dmPolicy` contrôle l'accès aux messages directs :

    - `pairing` (par défaut)
    - `allowlist` (requiert au moins un ID d'expéditeur dans `allowFrom`)
    - `open` (requiert que `allowFrom` inclue `"*"`)
    - `disabled`

    `dmPolicy: "open"` avec `allowFrom: ["*"]` permet à n'importe quel compte Telegram qui trouve ou devine la commande du nom d'utilisateur du bot de commander le bot. Utilisez-le uniquement pour les bots intentionnellement publics avec des outils strictement restreints ; les bots à un seul propriétaire doivent utiliser `allowlist` avec des ID utilisateur numériques.

    `channels.telegram.allowFrom` accepte les ID utilisateur numériques Telegram. Les préfixes `telegram:` / `tg:` sont acceptés et normalisés.
    Dans les configurations multi-comptes, un `channels.telegram.allowFrom` de niveau supérieur restrictif est traité comme une limite de sécurité : les entrées `allowFrom: ["*"]` au niveau du compte ne rendent pas ce compte public, sauf si la liste d'autorisation de compte effective contient toujours un caractère générique explicite après la fusion.
    `dmPolicy: "allowlist"` avec un `allowFrom` vide bloque tous les DMs et est rejeté par la validation de configuration.
    Le configuration demande uniquement des ID utilisateur numériques.
    Si vous avez effectué une mise à niveau et que votre configuration contient des entrées de liste d'autorisation `@username`, exécutez `openclaw doctor --fix` pour les résoudre (au mieux ; nécessite un jeton de bot Telegram).
    Si vous dépendiez précédemment de fichiers de liste d'autorisation de magasin d'appariement, `openclaw doctor --fix` peut récupérer les entrées dans `channels.telegram.allowFrom` dans les flux de liste d'autorisation (par exemple lorsque `dmPolicy: "allowlist"` n'a pas encore d'ID explicites).

    Pour les bots à un seul propriétaire, préférez `dmPolicy: "allowlist"` avec des ID numériques explicites `allowFrom` pour garder la politique d'accès durable dans la configuration (au lieu de dépendre des approbations d'appariement précédentes).

    Confusion courante : l'approbation d'appariement DM ne signifie pas « cet expéditeur est autorisé partout ».
    L'appariement accorde l'accès DM. Si aucun propriétaire de commande n'existe encore, le premier appariement approuvé définit également `commands.ownerAllowFrom` afin que les commandes réservées au propriétaire et les approbations exec aient un compte d'opérateur explicite.
    L'autorisation de l'expéditeur de groupe provient toujours des listes d'autorisation de configuration explicites.
    Si vous souhaitez « Je suis autorisé une fois et que les DMs et les commandes de groupe fonctionnent », mettez votre ID utilisateur numérique Telegram dans `channels.telegram.allowFrom` ; pour les commandes réservées au propriétaire, assurez-vous que `commands.ownerAllowFrom` contient `telegram:<your user id>`.

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

  <Tab title="Group policy and allowlists">
    Deux contrôles s'appliquent conjointement :

    1. **Quels groupes sont autorisés** (`channels.telegram.groups`)
       - aucune configuration `groups` :
         - avec `groupPolicy: "open"` : n'importe quel groupe peut passer les vérifications d'ID de groupe
         - avec `groupPolicy: "allowlist"` (par défaut) : les groupes sont bloqués tant que vous n'ajoutez pas d'entrées `groups` (ou `"*"`)
       - `groups` configuré : agit comme liste d'autorisation (IDs explicites ou `"*"`)

    2. **Quels expéditeurs sont autorisés dans les groupes** (`channels.telegram.groupPolicy`)
       - `open`
       - `allowlist` (par défaut)
       - `disabled`

    `groupAllowFrom` est utilisé pour le filtrage des expéditeurs de groupe. S'il n'est pas défini, Telegram revient à `allowFrom`.
    Les entrées `groupAllowFrom` doivent être des IDs numériques d'utilisateur Telegram (les préfixes `telegram:` / `tg:` sont normalisés).
    Ne mettez pas les IDs de chat de groupe ou de supergroupe Telegram dans `groupAllowFrom`. Les IDs de chat négatifs appartiennent à `channels.telegram.groups`.
    Les entrées non numériques sont ignorées pour l'autorisation de l'expéditeur.
    Limite de sécurité (`2026.2.25+`) : l'authentification de l'expéditeur de groupe n'hérite **pas** des approbations du magasin d'appariement DM.
    L'appariement reste limité aux DM. Pour les groupes, définissez `groupAllowFrom` ou `allowFrom` par groupe/sujet.
    Si `groupAllowFrom` n'est pas défini, Telegram revient à la configuration `allowFrom`, et non au magasin d'appariement.
    Modèle pratique pour les bots à propriétaire unique : définissez votre ID utilisateur dans `channels.telegram.allowFrom`, laissez `groupAllowFrom` non défini, et autorisez les groupes cibles sous `channels.telegram.groups`.
    Note d'exécution : si `channels.telegram` est complètement manquant, l'exécution par défaut est `groupPolicy="allowlist"` (échec fermé) sauf si `channels.defaults.groupPolicy` est explicitement défini.

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

    Testez-le depuis le groupe avec `@<bot_username> ping`. Les messages de groupe simples ne déclenchent pas le bot alors que `requireMention: true`.

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

      - Mettez les IDs de chat de groupe ou de supergroupe Telegram négatifs comme `-1001234567890` sous `channels.telegram.groups`.
      - Mettez les IDs d'utilisateur Telegram comme `8734062810` sous `groupAllowFrom` lorsque vous voulez limiter quelles personnes dans un groupe autorisé peuvent déclencher le bot.
      - Utilisez `groupAllowFrom: ["*"]` uniquement lorsque vous voulez que n'importe quel membre d'un groupe autorisé puisse parler au bot.

    </Warning>

  </Tab>

  <Tab title="Comportement de mention">
    Les réponses de groupe nécessitent une mention par défaut.

    La mention peut provenir de :

    - une mention native `@botusername`, ou
    - de modèles de mention dans :
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

    Obtenir l'ID du chat de groupe :

    - transférer un message de groupe vers `@userinfobot` / `@getidsbot`
    - ou lire `chat.id` depuis `openclaw logs --follow`
    - ou inspecter le Bot API `getUpdates`
    - une fois le groupe autorisé, exécuter `/whoami@<bot_username>` si les commandes natives sont activées

  </Tab>
</Tabs>

## Comportement à l'exécution

- Telegram appartient au processus de passerelle.
- Le routage est déterministe : les réponses entrantes Telegram reviennent vers Telegram (le modèle ne choisit pas les canaux).
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec des métadonnées de réponse, des espaces réservés pour les médias et un contexte de chaîne de réponse persistant pour les réponses Telegram que la passerelle a observées.
- Les sessions de groupe sont isolées par ID de groupe. Les sujets de forum ajoutent `:topic:<threadId>` pour garder les sujets isolés.
- Les messages DM peuvent transporter `message_thread_id`OpenClawTelegram ; OpenClaw le conserve pour les réponses. Les sessions de sujet DM ne se divisent que lorsque le `getMe` Telegram signale `has_topics_enabled: true` pour le bot ; sinon, les DMs restent sur la session plate.
- Le long polling utilise le runner grammY avec un séquençage par chat par fil. La concurrence globale du sink du runner utilise `agents.defaults.maxConcurrent`.
- Le démarrage multi-compte limite les sondes simultanées `getMe` Telegram afin que les grandes flottes de bots n'éparpillent pas chaque sonde de compte en même temps.
- Le long polling est protégé à l'intérieur de chaque processus de passerelle afin qu'un seul sondeur actif puisse utiliser un jeton de bot à la fois. Si vous voyez encore des conflits `getUpdates` 409, une autre passerelle OpenClaw, un script ou un sondeur externe utilise probablement le même jeton.
- Par défaut, les redémarrages du chien de garde de polling long se déclenchent après 120 secondes sans `getUpdates` de liveness terminée. Augmentez `channels.telegram.pollingStallThresholdMs` uniquement si votre déploiement rencontre toujours des redémarrages intempestifs dus à un arrêt du polling pendant des tâches de longue durée. La valeur est en millisecondes et est autorisée de `30000` à `600000` ; les remplacements par compte sont pris en charge.
- L'Telegram Bot API ne prend pas en charge les accusés de réception (`sendReadReceipts` ne s'applique pas).

<Note>
  `channels.telegram.dm.threadReplies` et `channels.telegram.direct.<chatId>.threadReplies` ont été supprimés. Exécutez `openclaw doctor --fix`Telegram après la mise à niveau si votre configuration contient encore ces clés. Le routage des sujets DM suit désormais la fonctionnalité du bot de Telegram `getMe.has_topics_enabled`Telegram, qui est contrôlée par le mode fil de BotFather : les bots avec sujets activés utilisent des sessions DM limitées au fil lorsque Telegram envoie `message_thread_id` ; les autres DMs restent sur la session plate.
</Note>

## Référence des fonctionnalités

<AccordionGroup>
  <Accordion title="Aperçu en direct (modifications de message)">
    OpenClaw peut diffuser des réponses partielles en temps réel :

    - chats directs : message d'aperçu + `editMessageText`
    - groupes/sujets : message d'aperçu + `editMessageText`
    - progression de l'outil en chat direct : aperçu facultatif du statut natif `sendMessageDraft` lorsque activé et pris en charge

    Conditions requises :

    - `channels.telegram.streaming` est `off | partial | block | progress` (par défaut : `partial`)
    - `progress` conserve un brouillon de statut modifiable pour la progression de l'outil, l'efface à la fin et envoie la réponse finale sous forme de message normal
    - `streaming.preview.toolProgress` contrôle si les mises à jour d'outil/progression réutilisent le même message d'aperçu modifié (par défaut : `true` lorsque le flux d'aperçu est actif)
    - `streaming.preview.commandText` contrôle les détails de commande/exec dans ces lignes de progression d'outil : `raw` (par défaut, préserve le comportement publié) ou `status` (étiquette de l'outil uniquement)
    - les valeurs héritées `channels.telegram.streamMode` et booléennes `streaming` sont détectées ; exécutez `openclaw doctor --fix` pour les migrer vers `channels.telegram.streaming.mode`

    Les mises à jour d'aperçu de la progression de l'outil sont les courtes lignes de statut affichées pendant l'exécution des outils, par exemple l'exécution de commandes, la lecture de fichiers, les mises à jour de planification, les résumés de correctifs ou le texte de préambule/commentaire Codex en mode serveur d'application Codex. Telegram les active par défaut pour correspondre au comportement publié de OpenClaw à partir de `v2026.4.22` et des versions ultérieures.

    Les chats directs peuvent utiliser les brouillons natifs Telegram pour ces lignes de progression d'outil sans rendre persistantes les discussions de l'outil dans l'historique du chat. Les brouillons natifs s'arrêtent avant le début du texte de réponse ; les réponses finales restent sur le chemin de livraison persistant normal. Cette voie est désactivée par défaut et doit d'abord être réservée aux ID de DM de confiance :

    ```json
    {
      "channels": {
        "telegram": {
          "streaming": {
            "mode": "partial",
            "preview": {
              "toolProgress": true,
              "nativeToolProgress": true,
              "nativeToolProgressAllowFrom": ["123456789"]
            }
          }
        }
      }
    }
    ```

    Pour conserver l'aperçu modifié pour le texte de réponse mais masquer les lignes de progression de l'outil, définissez :

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

    Pour garder la progression de l'outil visible mais masquer le texte de commande/exec, définissez :

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

    Utilisez le mode `progress` lorsque vous voulez une progression d'outil visible sans modifier la réponse finale dans le même message. Placez la stratégie de texte de commande sous `streaming.progress` :

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

    Utilisez `streaming.mode: "off"` uniquement lorsque vous souhaitez une livraison finale uniquement : les modifications d'aperçu Telegram sont désactivées et les discussions génériques d'outil/progression sont supprimées au lieu d'être envoyées sous forme de messages de statut autonomes. Les invites d'approbation, les charges utiles multimédias et les erreurs passent toujours par la livraison finale normale. Utilisez `streaming.preview.toolProgress: false` lorsque vous souhaitez uniquement conserver les modifications d'aperçu de réponse tout en masquant les lignes de statut de progression de l'outil.

    <Note>
      Les réponses avec citation sélectionnée Telegram sont l'exception. Lorsque `replyToMode` est `"first"`, `"all"` ou `"batched"` et que le message entrant comprend du texte de citation sélectionné, OpenClaw envoie la réponse finale via le chemin de réponse avec citation natif de Telegram au lieu de modifier l'aperçu de la réponse, donc `streaming.preview.toolProgress` ne peut pas afficher les courtes lignes de statut pour ce tour. Les réponses au message actuel sans texte de citation sélectionné conservent toujours le flux d'aperçu. Définissez `replyToMode: "off"` lorsque la visibilité de la progression de l'outil est plus importante que les réponses avec citation natives, ou définissez `streaming.preview.toolProgress: false` pour accepter le compromis.
    </Note>

    Pour les réponses texte uniquement :

    - aperçus DM/groupe/sujet courts : OpenClaw conserve le même message d'aperçu et effectue la modification finale sur place
    - les finales texte longues qui sont divisées en plusieurs messages Telegram réutilisent l'aperçu existant comme premier bloc final lorsque cela est possible, puis envoient uniquement les blocs restants
    - les finales en mode progression effacent le brouillon de statut et utilisent la livraison finale normale au lieu de modifier le brouillon en réponse
    - si la modification finale échoue avant que le texte terminé ne soit confirmé, OpenClaw utilise la livraison finale normale et nettoie l'aperçu périmé

    Pour les réponses complexes (par exemple, des charges utiles multimédias), OpenClaw revient à la livraison finale normale puis nettoie le message d'aperçu.

    Le flux d'aperçu est distinct du flux de blocs. Lorsque le flux de blocs est explicitement activé pour Telegram, OpenClaw ignore le flux d'aperçu pour éviter le double flux.

    Comportement du flux de raisonnement :

    - `/reasoning stream` utilise le chemin d'aperçu de raisonnement d'un channel pris en charge ; sur Telegram, il diffuse le raisonnement dans l'aperçu en direct pendant la génération
    - l'aperçu de raisonnement est supprimé après la livraison finale ; utilisez `/reasoning on` lorsque le raisonnement doit rester visible
    - la réponse finale est envoyée sans texte de raisonnement

  </Accordion>

  <Accordion title="Mise en forme et repli HTML"Telegram>
    Le texte sortant utilise Telegram `parse_mode: "HTML"`TelegramTelegramTelegramOpenClaw.

    - Le texte style Markdown est rendu en HTML sécurisé pour Telegram.
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

    - les noms sont normalisés (suppression du `/` de tête, minuscules)
    - motif valide : `a-z`, `0-9`, `_`, longueur `1..32`
    - les commandes personnalisées ne peuvent pas remplacer les commandes natives
    - les conflits/doublons sont ignorés et journalisés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugin/compétence peuvent toujours fonctionner lorsqu'elles sont tapées même si elles ne s'affichent pas dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes de plugin/personnalisées peuvent toujours s'enregistrer si elles sont configurées.

    Échecs de configuration courants :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram déborde toujours après la réduction ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands`, ou `setMyCommands` échouant avec `404: Not Found` alors que les commandes curl directes de Bot API fonctionnent peut signifier que `channels.telegram.apiRoot` a été défini sur le point de terminaison `/bot<TOKEN>` complet. `apiRoot` doit être uniquement la racine de Bot API, et `openclaw doctor --fix` supprime un `/bot<TOKEN>` de fin accidentel.
    - `getMe returned 401` signifie que Telegram a rejeté le jeton de bot configuré. Mettez à jour `botToken`, `tokenFile`, ou `TELEGRAM_BOT_TOKEN` avec le jeton BotFather actuel ; OpenClaw s'arrête avant le sondage, ce n'est donc pas signalé comme un échec de nettoyage de webhook.
    - `setMyCommands failed` avec des erreurs réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appareillage d'appareil (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris le rôle/les portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Le code de configuration transporte un jeton d'amorçage à courte durée de vie. L'amorçage du code de configuration intégré est réservé aux nœuds : la première connexion crée une demande de nœud en attente, et après approbation, le Gateway renvoie un jeton de nœud durable avec `scopes: []`. Il ne renvoie pas de jeton d'opérateur transféré ; l'accès opérateur nécessite un appariement d'opérateur ou un flux de jeton approuvé distinct.

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Appareillage](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

  </Accordion>

  <Accordion title="Boutons en ligne">
    Configurez la portée du clavier en ligne :

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

    Substitution par compte :

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

    Exemple de bouton Mini App :

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

    Les boutons Telegram `web_app` ne fonctionnent que dans les discussions privées entre un utilisateur et le
    bot.

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

    Contrôles de filtrage :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de bascules `channels.telegram.actions.*` distinctes.
    Les envois à l'exécution utilisent l'instantané actif de la configuration/secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de résolution ad-hoc de SecretRef à chaque envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Balises de fil de discussion des réponses">
    Telegram prend en charge les balises explicites de fil de discussion des réponses dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]` répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`

    Lorsque le fil de discussion des réponses est activé et que le texte ou la légende Telegram d'origine est disponible, OpenClaw inclut automatiquement un extrait de citation natif Telegram. Telegram limite le texte de citation natif à 1024 unités de code UTF-16, les messages plus longs sont donc cités depuis le début et reviennent à une réponse simple si Telegram rejette la citation.

    Remarque : `off` désactive le fil de discussion implicite des réponses. Les balises explicites `[[reply_to_*]]` sont toujours respectées.

  </Accordion>

  <Accordion title="Sujets de forum et comportement des fils">
    Super-groupes de forum :

    - les clés de session de sujet ajoutent `:topic:<threadId>`
    - les réponses et l'écriture ciblent le fil du sujet
    - chemin de configuration du sujet :
      `channels.telegram.groups.<chatId>.topics.<threadId>`

    Cas particulier du sujet général (`threadId=1`) :

    - l'envoi de messages omet `message_thread_id`Telegram (Telegram rejette `sendMessage(...thread_id=1)`)
    - les actions d'écriture incluent toujours `message_thread_id`

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe sauf en cas de substitution (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est réservé aux sujets et n'hérite pas des valeurs par défaut du groupe.
    `topics."*"` définit les valeurs par défaut pour chaque sujet de ce groupe ; les ID de sujet exacts priment toujours sur `"*"`.

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

    Chaque sujet a ensuite sa propre clé de session : `agent:zu:telegram:group:-1001234567890:topic:3`

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler les sessions de harnais ACP via des liaisons ACP typées de niveau supérieur (`bindings[]` avec `type: "acp"` et `match.channel: "telegram"`, `peer.kind: "group"`, et un ID qualifié par sujet comme `-1001234567890:topic:42`). Actuellement limité aux sujets de forum dans les groupes/super-groupes. Voir [Agents ACP](/fr/tools/acp-agents).

    **Génération ACP liée au fil à partir du chat** : `/acp spawn <agent> --thread here|auto`OpenClaw lie le sujet actuel à une nouvelle session ACP ; les relances sont routées directement vers celle-ci. OpenClaw épingle la confirmation de génération dans le sujet. Nécessite que `channels.telegram.threadBindings.spawnSessions` reste activé (par défaut : `true`).

    Le contexte du modèle expose `MessageThreadId` et `IsForum`. Les chats DM avec `message_thread_id`Telegram conservent les métadonnées de réponse ; ils n'utilisent des clés de session conscientes des fils que lorsque `getMe` de Telegram signale `has_topics_enabled: true` pour le bot.
    Les anciennes substitutions `dm.threadReplies` et `direct.*.threadReplies` sont intentionnellement abandonnées ; utilisez le mode fil de BotFather comme source unique de vérité et exécutez `openclaw doctor --fix` pour supprimer les clés de configuration obsolètes.

  </Accordion>

  <Accordion title="Audio, video, and stickers"Telegram>
    ### Messages audio

    Telegram fait la distinction entre les notes vocales et les fichiers audio.

    - par défaut : comportement du fichier audio
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

    ### Autocollants

    Gestion des autocollants entrants :

    - WEBP statique : téléchargé et traité (espace réservé `<media:sticker>`)
    - TGS animé : ignoré
    - WEBM vidéo : ignoré

    Champs de contexte d'autocollant :

    - `Sticker.emoji`
    - `Sticker.setName`
    - `Sticker.fileId`
    - `Sticker.fileUniqueId`
    - `Sticker.cachedDescription`

    Fichier de cache d'autocollants :

    - `~/.openclaw/telegram/sticker-cache.json`

    Les autocollants sont décrits une seule fois (si possible) et mis en cache pour réduire les appels de vision répétés.

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
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction`OpenClaw (séparées des charges utiles de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own`Telegram signifie les réactions des utilisateurs uniquement aux messages envoyés par le bot (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas d'ID de fil dans les mises à jour de réaction.
      - les groupes non-forums acheminent vers la session de chat de groupe
      - les groupes forums acheminent vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet d'origine exact

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction`OpenClaw envoie un emoji de reconnaissance pendant qu'OpenClaw traite un message entrant. `ackReactionScope` décide *quand* cet emoji est réellement envoyé.

    **Ordre de résolution de l'emoji (`ackReaction`) :**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - repli vers l'emoji d'identité de l'agent (`agents.list[].identity.emoji`Telegram, sinon "👀")

    Notes :

    - Telegram attend des emoji unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour un canal ou un compte.

    **Portée (`messages.ackReactionScope`Telegram) :**

    Le fournisseur Telegram lit la portée depuis `messages.ackReactionScope` (par défaut `"group-mentions"`TelegramTelegram). Il n'existe aujourd'hui aucune substitution au niveau du compte Telegram ou du canal Telegram.

    Valeurs : `"all"` (DMs + groupes), `"direct"` (DMs uniquement), `"group-all"` (chaque message de groupe, pas de DMs), `"group-mentions"` (groupes lorsque le bot est mentionné ; **pas de DMs** — c'est la valeur par défaut), `"off"` / `"none"` (désactivé).

    <Note>
    La portée par défaut (`"group-mentions"`Telegram) ne déclenche pas de réactions d'accusé de réception dans les messages directs. Pour obtenir une réaction d'accusé de réception sur les DMs Telegram entrants, définissez `messages.ackReactionScope` sur `"direct"` ou `"all"`Telegram. La valeur est lue au démarrage du fournisseur Telegram, donc un redémarrage de la passerelle est nécessaire pour que la modification prenne effet.
    </Note>

  </Accordion>

  <Accordion title="TelegramÉcritures de configuration depuis les événements et commandes Telegram">
    Les écritures de configuration du canal sont activées par défaut (`configWrites !== false`Telegram).

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
    Le mode par défaut est le long polling. Pour le mode webhook, définissez `channels.telegram.webhookUrl` et `channels.telegram.webhookSecret` ; optionnel `webhookPath`, `webhookHost`, `webhookPort` (par défaut `/telegram-webhook`, `127.0.0.1`, `8787`OpenClaw).

    En mode long polling, OpenClaw ne persiste son filigrane de redémarrage qu'après l'expédition réussie d'une mise à jour. Si un gestionnaire échoue, cette mise à jour reste réessayable dans le même processus et n'est pas écrite comme terminée pour la déduplication de redémarrage.

    L'écouteur local se lie à `127.0.0.1:8787`. Pour une entrée publique, placez soit un proxy inverse devant le port local, soit définissez `webhookHost: "0.0.0.0"`Telegram intentionnellement.

    Le mode webhook valide les gardes de requête, le jeton secret Telegram et le corps JSON avant de retourner `200`TelegramOpenClawTelegram à Telegram.
    OpenClaw traite ensuite la mise à jour de manière asynchrone via les mêmes voies de bot par chat/sujet utilisées par le long polling, afin que les tours d'agent lents ne bloquent pas l'ACK de livraison de Telegram.

  </Accordion>

  <Accordion title="Limites, nouvelle tentative et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (par défaut 100) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.mediaGroupFlushMs` (par défaut 500) contrôle la durée de mise en tampon des albums/groupes de médias Telegram avant que OpenClaw ne les distribue comme un seul message entrant. Augmentez-le si les parties de l'album arrivent en retard ; diminuez-le pour réduire la latence de réponse de l'album.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client de l'Telegram API (si non défini, la valeur par défaut grammY s'applique). Les clients bots limitent les valeurs configurées en dessous de la garde de requête de texte/frappe sortante de 60 secondes afin que grammY n'abandonne pas la livraison de la réponse visible avant que la garde de transport et le repli d'OpenClaw puissent s'exécuter. Le long polling utilise toujours une garde de requête `getUpdates` de 45 secondes afin que les sondages inactifs ne soient pas abandonnés indéfiniment.
    - `channels.telegram.pollingStallThresholdMs` par défaut `120000` ; réglez entre `30000` et `600000` uniquement pour les redémarrages de blocage de sondage faux positifs.
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (par défaut 50) ; `0` désactive.
    - le contexte supplémentaire de réponse/citation/transfert est normalisé dans une fenêtre de contexte de conversation sélectionnée lorsque la passerelle a observé les messages parents ; le cache des messages observés est persisté à côté du stockage de session. Telegram n'inclut qu'un `reply_to_message` superficiel dans les mises à jour, donc les chaînes plus anciennes que le cache sont limitées à la charge utile de mise à jour actuelle de Telegram.
    - les listes blanches Telegram filtrent principalement qui peut déclencher l'agent, et non une limite complète de suppression du contexte supplémentaire.
    - Contrôles de l'historique des DM :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - La configuration `channels.telegram.retry` s'applique aux assistants d'envoi Telegram (CLI/outils/actions) pour les erreurs de l'API sortant récupérables. La livraison de la réponse finale entrante utilise également une nouvelle tentative d'envoi sécurisé bornée pour les échecs de pré-connexion Telegram, mais elle ne répète pas les enveloppes réseau ambiguës post-envoi qui pourraient dupliquer les messages visibles.

    Les cibles d'envoi CLI et de l'outil de message peuvent être un ID de discussion numérique, un nom d'utilisateur ou une cible de sujet de forum :

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

    Drapeaux de sondage uniquement pour Telegram :

    - `--poll-duration-seconds` (5-600)
    - `--poll-anonymous`
    - `--poll-public`
    - `--thread-id` pour les sujets de forum (ou utilisez une cible `:topic:`)

    L'envoi Telegram prend également en charge :

    - `--presentation` avec des blocs `buttons` pour les claviers en ligne lorsque `channels.telegram.capabilities.inlineButtons` l'autorise
    - `--pin` ou `--delivery '{"pin":true}'` pour demander une livraison épinglée lorsque le bot peut épingler dans cette discussion
    - `--force-document` pour envoyer des images, des GIF et des vidéos sortants sous forme de documents au lieu de photos compressées, de médias animés ou de téléchargements vidéo

    Gestion des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations d'exécution dans Telegram">
    Telegram prend en charge les approbations d'exécution dans les DMs des approbateurs et peut éventuellement publier des invites dans le chat ou le sujet d'origine. Les approbateurs doivent être des IDs utilisateur numériques Telegram.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled` (s'active automatiquement lorsqu'au moins un approbateur est résolvable)
    - `channels.telegram.execApprovals.approvers` (revient aux IDs de propriétaire numériques de `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target` : `dm` (par défaut) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` et `defaultTo` contrôlent qui peut parler au bot et où il envoie les réponses normales. Ils ne font pas de quelqu'un un approbateur d'exécution. Le premier appariement DM approuvé amorce `commands.ownerAllowFrom` lorsqu'aucun propriétaire de commande n'existe encore, donc la configuration à un seul propriétaire fonctionne toujours sans dupliquer les IDs sous `execApprovals.approvers`.

    La livraison par canal affiche le texte de la commande dans le chat ; n'activez `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet pour l'invite d'approbation et la suite. Les approbations d'exécution expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne nécessitent également `channels.telegram.capabilities.inlineButtons` pour autoriser la surface cible (`dm`, `group` ou `all`). Les IDs d'approbation préfixés par `plugin:` sont résolus via les approbations de plugin ; les autres sont d'abord résolus via les approbations d'exécution.

    Voir [Approbations d'exécution](/fr/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Contrôles des réponses d'erreur

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs           | Par défaut | Description                                                                                                          |
| ----------------------------------- | ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`    | `reply` envoie un message d'erreur convivial à la conversation. `silent` supprime entièrement les réponses d'erreur. |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000`    | Temps minimum entre les réponses d'erreur pour la même conversation. Empêche le spam d'erreurs pendant les pannes.   |

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

    - Si `requireMention=false`, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Désactiver
      - puis retirer et ajouter à nouveau le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe sans mention.
    - `openclaw channels status --probe` peut vérifier les identifiants numériques explicites de groupe ; le joker `"*"` ne peut pas être sondé pour l'appartenance.
    - test rapide de session : `/activation always`.

  </Accordion>

  <Accordion title="Le bot ne voit pas du tout les messages de groupe">

    - lorsque `channels.telegram.groups` existe, le groupe doit être répertorié (ou inclure `"*"`)
    - vérifier l'appartenance du bot au groupe
    - consulter les journaux : `openclaw logs --follow` pour les raisons d'ignorance

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - autorisez votre identité d'expéditeur (appariement et/ou numérique `allowFrom`)
    - l'autorisation de commande s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif a trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - les appels de démarrage `deleteMyCommands` / `setMyCommands` et les appels de saisie `sendChatAction` sont bornés et réessayent une fois via le secours de transport de Telegram en cas de délai d'attente de la requête. Des erreurs réseau/récupération persistantes indiquent généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401` est un échec d'authentification Telegram pour le jeton de bot configuré.
    - Recopiez ou régénérez le jeton de bot dans BotFather, puis mettez à jour `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken`, ou `TELEGRAM_BOT_TOKEN` pour le compte par défaut.
    - `deleteWebhook 401 Unauthorized` lors du démarrage est également un échec d'authentification ; le traiter comme « aucun webhook n'existe » ne ferait que reporter le même échec de mauvais jeton aux appels API ultérieurs.

  </Accordion>

  <Accordion title="Polling ou instabilité du réseau">

    - Node 22+ + fetch/proxy personnalisé peut déclencher un comportement d'abandon immédiat si les types AbortSignal ne correspondent pas.
    - Certains hôtes résolvent `api.telegram.org` d'abord en IPv6 ; une sortie IPv6 défectueuse peut provoquer des échecs intermittents de l'API Telegram API.
    - Si les journaux incluent `TypeError: fetch failed` ou `Network request for 'getUpdates' failed!`, OpenClaw réessaie désormais en tant qu'erreurs réseau récupérables.
    - Lors du démarrage du polling, OpenClaw réutilise la sonde de démarrage `getMe` réussie pour grammY afin que le runner n'ait pas besoin d'un second `getMe` avant le premier `getUpdates`.
    - Si `deleteWebhook` échoue avec une erreur réseau transitoire lors du démarrage du polling, OpenClaw passe en long polling au lieu de faire un autre appel au plan de contrôle pré-polling. Un webhook toujours actif apparaît comme un conflit `getUpdates` ; OpenClaw reconstruit alors le transport Telegram et réessaie le nettoyage du webhook.
    - Si les sockets Telegram se recyclent selon une cadence fixe courte, vérifiez un `channels.telegram.timeoutSeconds` faible ; les clients de bot limitent les valeurs configurées en dessous des gardes de requête sortantes et `getUpdates`, mais les anciennes versions pouvaient abandonner chaque sondage ou réponse lorsque ceci était défini en dessous de ces gardes.
    - Si les journaux incluent `Polling stall detected`, OpenClaw redémarre le polling et reconstruit le transport Telegram après 120 secondes sans activité de long polling terminée par défaut.
    - `openclaw channels status --probe` et `openclaw doctor` avertissent lorsqu'un compte de polling en cours d'exécution n'a pas terminé `getUpdates` après le délai de grâce au démarrage, lorsqu'un compte de webhook en cours d'exécution n'a pas terminé `setWebhook` après le délai de grâce au démarrage, ou lorsque la dernière activité de transport de polling réussie est obsolète.
    - Augmentez `channels.telegram.pollingStallThresholdMs` uniquement lorsque les appels `getUpdates` de longue durée sont sains mais que votre hôte signale toujours de faux redémarrages d'arrêt de polling. Les arrêts persistants indiquent généralement des problèmes de proxy, DNS, IPv6 ou de sortie TLS entre l'hôte et `api.telegram.org`.
    - Telegram respecte également les variables d'environnement de proxy de processus pour le transport de Bot API, y compris `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, et leurs variantes en minuscules. `NO_PROXY` / `no_proxy` peuvent toujours contourner `api.telegram.org`.
    - Si le proxy géré par OpenClaw est configuré via `OPENCLAW_PROXY_URL` pour un environnement de service et qu'aucune variable d'environnement de proxy standard n'est présente, Telegram utilise également cette URL pour le transport de Bot API.
    - Sur les hôtes VPS avec une sortie/TLS directe instable, acheminez les appels de l'API Telegram API via `channels.telegram.proxy` :

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ utilise par défaut `autoSelectFamily=true` (sauf WSL2). L'ordre des résultats DNS Telegram respecte `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, puis `channels.telegram.network.dnsResultOrder`, puis la valeur par défaut du processus telle que `NODE_OPTIONS=--dns-result-order=ipv4first` ; si aucune ne s'applique, Node 22+ revient à `ipv4first`.
    - Si votre hôte est WSL2 ou fonctionne explicitement mieux avec un comportement IPv4 uniquement, forcez la sélection de la famille :

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - Les réponses de la plage de référence RFC 2544 (`198.18.0.0/15`) sont déjà autorisées
      par défaut pour les téléchargements de médias Telegram. Si un fake-IP de confiance ou
      un proxy transparent réécrit `api.telegram.org` vers une autre
      adresse privée/interne/à usage spécial lors des téléchargements de médias, vous pouvez
      opter pour le contournement exclusif Telegram :

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - Le même opt-in est disponible par compte à
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - Si votre proxy résout les hôtes de médias Telegram en `198.18.x.x`, laissez le
      drapeau dangereux désactivé d'abord. Les médias Telegram autorisent déjà la plage de référence
      RFC 2544 par défaut.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` affaiblit les protections SSRF des médias
      Telegram. Utilisez-le uniquement pour les environnements de proxy contrôlés
      par un opérateur de confiance tels que Clash, Mihomo, ou le routage fake-IP de Surge lorsqu'ils
      synthétisent des réponses privées ou à usage spécial en dehors de la plage de référence
      RFC 2544. Laissez-le désactivé pour l'accès Internet public normal à Telegram.
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

Référence principale : [Configuration reference - Telegram](Telegram)(/en/gateway/config-channels#telegram).

<Accordion title="TelegramChamps Telegram à fort signal">

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de niveau supérieur (`type: "acp"`)
- valeurs par défaut des sujets : `groups.<chatId>.topics."*"` s'applique aux sujets de forum non correspondants ; les ID de sujets exacts priment
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- fil de discussion/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `streaming.preview.toolProgress`, `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`API
- racine API personnalisée : `apiRoot`API (racine de l'API Bot uniquement ; n'incluez pas `/bot<TOKEN>`)
- webhook : `webhookUrl`, `webhookSecret`, `webhookPath`, `webhookHost`
- actions/capacités : `capabilities.inlineButtons`, `actions.sendMessage|editMessage|deleteMessage|reactions|sticker`
- réactions : `reactionNotifications`, `reactionLevel`
- erreurs : `errorPolicy`, `errorCooldownMs`
- écritures/historique : `configWrites`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`

</Accordion>

<Note>
  Priorité multi-compte : lorsque deux ou plusieurs identifiants de compte sont configurés, définissez `channels.telegram.defaultAccount` (ou incluez `channels.telegram.accounts.default`) pour rendre le routage par défaut explicite. Sinon, OpenClaw revient au premier identifiant de compte normalisé et `openclaw doctor` avertit. Les comptes nommés héritent des valeurs `channels.telegram.allowFrom`
  / `groupAllowFrom`, mais pas des valeurs `accounts.default.*`.
</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Telegram à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement de la liste d'autorisation des groupes et des sujets.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminer les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/fr/concepts/multi-agent">
    Associer les groupes et les sujets aux agents.
  </Card>
  <Card title="Troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics inter-canaux.
  </Card>
</CardGroup>

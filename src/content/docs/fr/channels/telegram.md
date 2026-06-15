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
    - les conflits/doublons sont ignorés et consignés

    Notes :

    - les commandes personnalisées sont des entrées de menu uniquement ; elles n'implémentent pas automatiquement le comportement
    - les commandes de plugin/skill peuvent toujours fonctionner lorsqu'elles sont tapées, même si elles ne s'affichent pas dans le menu Telegram

    Si les commandes natives sont désactivées, les commandes intégrées sont supprimées. Les commandes personnalisées/de plugin peuvent toujours s'enregistrer si elles sont configurées.

    Échecs courants de la configuration :

    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu Telegram débordait encore après la réduction ; réduisez les commandes de plugin/skill/personnalisées ou désactivez `channels.telegram.commands.native`.
    - `deleteWebhook`, `deleteMyCommands`, ou `setMyCommands` échouant avec `404: Not Found` alors que les commandes curl directes de Bot API fonctionnent peut signifier que `channels.telegram.apiRoot` a été défini sur le point de terminaison `/bot<TOKEN>` complet. `apiRoot` doit être uniquement la racine de Bot API, et `openclaw doctor --fix` supprime un `/bot<TOKEN>` de fin accidentel.
    - `getMe returned 401` signifie que Telegram a rejeté le jeton de bot configuré. Mettez à jour `botToken`, `tokenFile`, ou `TELEGRAM_BOT_TOKEN` avec le jeton actuel de BotFather ; OpenClaw s'arrête avant le polling, donc cela n'est pas signalé comme un échec de nettoyage de webhook.
    - `setMyCommands failed` avec des erreurs réseau/récupération signifie généralement que le DNS/HTTPS sortant vers `api.telegram.org` est bloqué.

    ### Commandes d'appairage d'appareil (plugin `device-pair`)

    Lorsque le plugin `device-pair` est installé :

    1. `/pair` génère le code de configuration
    2. collez le code dans l'application iOS
    3. `/pair pending` liste les demandes en attente (y compris le rôle/portées)
    4. approuvez la demande :
       - `/pair approve <requestId>` pour une approbation explicite
       - `/pair approve` lorsqu'il n'y a qu'une seule demande en attente
       - `/pair approve latest` pour la plus récente

    Le code de configuration contient un jeton d'amorçage à courte durée de vie. L'amorçage du code de configuration intégré est réservé aux nœuds : la première connexion crée une demande de nœud en attente, et après approbation le Gateway renvoie un jeton de nœud durable avec `scopes: []`. Il ne renvoie pas de jeton d'opérateur transmis ; l'accès opérateur nécessite un flux distinct d'appairage ou de jeton d'opérateur approuvé.

    Si un appareil réessaie avec des détails d'authentification modifiés (par exemple rôle/portées/clé publique), la demande en attente précédente est remplacée et la nouvelle demande utilise un `requestId` différent. Réexécutez `/pair pending` avant d'approuver.

    Plus de détails : [Appairage](/fr/channels/pairing#pair-via-telegram-recommended-for-ios).

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
    Les actions d'outil Telegram incluent :

    - `sendMessage` (`to`, `content`, `mediaUrl` facultatif, `replyToMessageId`, `messageThreadId`)
    - `react` (`chatId`, `messageId`, `emoji`)
    - `deleteMessage` (`chatId`, `messageId`)
    - `editMessage` (`chatId`, `messageId`, `content` ou `caption`, boutons en ligne `presentation` facultatifs ; les modifications de boutons uniquement mettent à jour le balisage de réponse)
    - `createForumTopic` (`chatId`, `name`, `iconColor` facultatif, `iconCustomEmojiId`)

    Les actions de message de canal exposent des alias ergonomiques (`send`, `react`, `delete`, `edit`, `sticker`, `sticker-search`, `topic-create`).

    Contrôles de validation :

    - `channels.telegram.actions.sendMessage`
    - `channels.telegram.actions.deleteMessage`
    - `channels.telegram.actions.reactions`
    - `channels.telegram.actions.sticker` (par défaut : désactivé)

    Remarque : `edit` et `topic-create` sont actuellement activés par défaut et n'ont pas de commutateurs `channels.telegram.actions.*` séparés.
    Les envois d'exécution utilisent l'instantané actif de la configuration/des secrets (démarrage/rechargement), les chemins d'action n'effectuent donc pas de nouvelle résolution ad hoc de SecretRef par envoi.

    Sémantique de suppression des réactions : [/tools/reactions](/fr/tools/reactions)

  </Accordion>

  <Accordion title="Balises de discussion en réponse"Telegram>
    Telegram prend en charge les balises de discussion en réponse explicites dans la sortie générée :

    - `[[reply_to_current]]` répond au message déclencheur
    - `[[reply_to:<id>]]`Telegram répond à un ID de message Telegram spécifique

    `channels.telegram.replyToMode` contrôle la gestion :

    - `off` (par défaut)
    - `first`
    - `all`TelegramOpenClawTelegramTelegramTelegram

    Lorsque la discussion en réponse est activée et que le texte ou la légende Telegram d'origine est disponible, OpenClaw inclut automatiquement un extrait de citation natif Telegram. Telegram limite le texte de citation natif à 1024 unités de code UTF-16, les messages plus longs sont donc cités depuis le début et reviennent à une réponse simple si Telegram rejette la citation.

    Remarque : `off` désactive la discussion en réponse implicite. Les balises explicites `[[reply_to_*]]` sont toujours honorées.

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

    Héritage de sujet : les entrées de sujet héritent des paramètres du groupe sauf en cas de remplacement (`requireMention`, `allowFrom`, `skills`, `systemPrompt`, `enabled`, `groupPolicy`).
    `agentId` est exclusif au sujet et n'hérite pas des valeurs par défaut du groupe.
    `topics."*"` définit les valeurs par défaut pour chaque sujet de ce groupe ; les ID de sujet exacts priment toujours sur `"*"`.

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

    **Liaison persistante de sujet ACP** : Les sujets de forum peuvent épingler les sessions de harnais ACP via des liaisons ACP typées de niveau supérieur (`bindings[]` avec `type: "acp"` et `match.channel: "telegram"`, `peer.kind: "group"`, et un ID qualifié par sujet comme `-1001234567890:topic:42`). Actuellement limité aux sujets de forum dans les groupes/super-groupes. Voir [Agents ACP](/fr/tools/acp-agents).

    **Génération ACP liée au fil depuis le chat** : `/acp spawn <agent> --thread here|auto` lie le sujet actuel à une nouvelle session ACP ; les suites y sont routées directement. OpenClaw épingle la confirmation de génération dans le sujet. Nécessite que `channels.telegram.threadBindings.spawnSessions` reste activé (par défaut : `true`).

    Le contexte du modèle expose `MessageThreadId` et `IsForum``message_thread_id`. Les conversations DM avec `message_thread_id` conservent les métadonnées de réponse ; elles n'utilisent des clés de session conscientes des fils que lorsque Telegram `getMe` signale `has_topics_enabled: true` pour le bot.
    Les anciens remplacements `dm.threadReplies` et `direct.*.threadReplies` sont intentionnellement abandonnés ; utilisez le mode fil de BotFather comme source unique de vérité et exécutez `openclaw doctor --fix` pour supprimer les clés de configuration obsolètes.

  </Accordion>

  <Accordion title="Audio, video, and stickers">
    ### Messages audio

    Telegram distingue les notes vocales des fichiers audio.

    - par défaut : comportement du fichier audio
    - balise `[[audio_as_voice]]` dans la réponse de l'agent pour forcer l'envoi d'une note vocale
    - les transcriptions de notes vocales entrantes sont présentées comme du texte généré par machine,
      non fiable dans le contexte de l'agent ; la détection de mention utilise toujours la transcription brute
      afin que les messages vocaux soumis à mention continuent de fonctionner.

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

    Les descriptions de stickers sont mises en cache dans l'état du plugin SQLite OpenClaw pour réduire les appels de vision répétitifs.

    Activer les actions de sticker :

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

  <Accordion title="Notification de réaction"Telegram>
    Les réactions Telegram arrivent sous forme de mises à jour `message_reaction`OpenClaw (séparées des payloads de messages).

    Lorsqu'elles sont activées, OpenClaw met en file d'attente des événements système tels que :

    - `Telegram reaction added: 👍 by Alice (@alice) on msg 42`

    Config :

    - `channels.telegram.reactionNotifications` : `off | own | all` (par défaut : `own`)
    - `channels.telegram.reactionLevel` : `off | ack | minimal | extensive` (par défaut : `minimal`)

    Notes :

    - `own`Telegram signifie uniquement les réactions des utilisateurs aux messages envoyés par le bot (au mieux via le cache des messages envoyés).
    - Les événements de réaction respectent toujours les contrôles d'accès Telegram (`dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`Telegram) ; les expéditeurs non autorisés sont ignorés.
    - Telegram ne fournit pas les ID de discussion dans les mises à jour de réaction.
      - les groupes non-forum sont routés vers la session de chat de groupe
      - les groupes forum sont routés vers la session du sujet général du groupe (`:topic:1`), et non vers le sujet exact d'origine

    `allowed_updates` pour le polling/webhook incluent `message_reaction` automatiquement.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` envoie un emoji de reconnaissance pendant qu'OpenClaw traite un message entrant. `ackReactionScope` décide *quand* cet emoji est réellement envoyé.

    **Ordre de résolution de l'emoji (`ackReaction`) :**

    - `channels.telegram.accounts.<accountId>.ackReaction`
    - `channels.telegram.ackReaction`
    - `messages.ackReaction`
    - retour de secours à l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

    Notes :

    - Telegram attend des emoji unicode (par exemple "👀").
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

    **Portée (`messages.ackReactionScope`) :**

    Le fournisseur Telegram lit la portée depuis `messages.ackReactionScope` (par défaut `"group-mentions"`). Il n'y a aujourd'hui pas de substitution au niveau du compte Telegram ou du channel Telegram.

    Valeurs : `"all"` (DMs + groupes), `"direct"` (DMs uniquement), `"group-all"` (chaque message de groupe, pas de DMs), `"group-mentions"` (groupes lorsque le bot est mentionné ; **pas de DMs** — c'est la valeur par défaut), `"off"` / `"none"` (désactivé).

    <Note>
    La portée par défaut (`"group-mentions"`) ne déclenche pas de réactions d'accusé de réception dans les messages directs. Pour obtenir une réaction d'accusé de réception sur les DMs Telegram entrants, définissez `messages.ackReactionScope` sur `"direct"` ou `"all"`. La valeur est lue au démarrage du fournisseur Telegram, donc un redémarrage de la passerelle est nécessaire pour que la modification prenne effet.
    </Note>

  </Accordion>

  <Accordion title="TelegramÉcritures de configuration depuis les événements et commandes Telegram">
    Les écritures de configuration de canal sont activées par défaut (`configWrites !== false`Telegram).

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
    OpenClaw traite ensuite la mise à jour de manière asynchrone via les mêmes voies de bot par chat/par sujet utilisées par le long polling, donc les tours d'agent lents ne bloquent pas l'ACK de livraison de Telegram.

  </Accordion>

  <Accordion title="Limites, nouvelles tentatives et cibles CLI">
    - `channels.telegram.textChunkLimit` la valeur par défaut est 4000.
    - `channels.telegram.chunkMode="newline"` préfère les limites de paragraphe (lignes vides) avant le fractionnement par longueur.
    - `channels.telegram.mediaMaxMb` (100 par défaut) plafonne la taille des médias Telegram entrants et sortants.
    - `channels.telegram.mediaGroupFlushMs` (500 par défaut) contrôle la durée de mise en mémoire tampon des albums/groupes de médias Telegram avant que OpenClaw ne les distribue comme un seul message entrant. Augmentez-le si les parties de l'album arrivent en retard ; diminuez-le pour réduire la latence de réponse aux albums.
    - `channels.telegram.timeoutSeconds` remplace le délai d'attente du client de l'Telegram de l'API (si non défini, la valeur par défaut de grammY s'applique). Les clients de bot limitent les valeurs configurées en dessous de la garde de requête de texte/frappe sortante de 60 secondes afin que grammY n'abandonne pas la livraison de réponses visibles avant que la garde de transport et le basculement de OpenClaw puissent s'exécuter. Le sondage long utilise toujours une garde de requête de 45 secondes pour `getUpdates` afin que les sondages inactifs ne soient pas abandonnés indéfiniment.
    - `channels.telegram.pollingStallThresholdMs` est par défaut `120000` ; réglez entre `30000` et `600000` uniquement pour les redémarrages de blocage de sondage faux positifs.
    - l'historique du contexte de groupe utilise `channels.telegram.historyLimit` ou `messages.groupChat.historyLimit` (50 par défaut) ; `0` désactive.
    - le contexte supplémentaire de réponse/citation/transfert est normalisé en une seule fenêtre de contexte de conversation sélectionnée lorsque la passerelle a observé les messages parents ; le cache des messages observés réside dans l'état du plugin SQLite de OpenClaw et `openclaw doctor --fix` importe les sidecars hérités. Telegram n'inclut qu'un seul `reply_to_message` superficiel dans les mises à jour, donc les chaînes plus anciennes que le cache sont limitées à la charge utile de mise à jour actuelle de Telegram.
    - les listes blanches Telegram filtrent principalement qui peut déclencher l'agent, et non une limite complète de suppression du contexte supplémentaire.
    - contrôles de l'historique des  :
      - `channels.telegram.dmHistoryLimit`
      - `channels.telegram.dms["<user_id>"].historyLimit`
    - la config `channels.telegram.retry` s'applique aux assistants d'envoi Telegram (CLI/outils/actions) pour les erreurs d'API sortantes récupérables. La livraison de la réponse finale entrante utilise également une nouvelle tentative d'envoi sécurisé bornée pour les échecs de pré-connexion Telegram, mais elle ne répète pas les enveloppes réseau ambiguës après envoi qui pourraient dupliquer les messages visibles.

    Les cibles d'envoi CLI et de l'outil de message peuvent être un ID de chat numérique, un nom d'utilisateur ou une cible de sujet de forum :

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
    - `--force-document` pour envoyer des images, des GIF et des vidéos sortants sous forme de documents au lieu de photos compressées, de médias animés ou de téléchargements vidéo

    Gestion des actions :

    - `channels.telegram.actions.sendMessage=false` désactive les messages sortants Telegram, y compris les sondages
    - `channels.telegram.actions.poll=false` désactive la création de sondages Telegram tout en laissant les envois réguliers activés

  </Accordion>

  <Accordion title="Approbations exec dans Telegram">
    Telegram prend en charge les approbations exec dans les DM des approuveurs et peut éventuellement publier des invites dans la discussion ou le sujet d'origine. Les approuveurs doivent être des ID utilisateur numériques Telegram.

    Chemin de configuration :

    - `channels.telegram.execApprovals.enabled` (s'active automatiquement lorsqu'au moins un approuveur est résoluble)
    - `channels.telegram.execApprovals.approvers` (revient aux ID de propriétaire numériques depuis `commands.ownerAllowFrom`)
    - `channels.telegram.execApprovals.target` : `dm` (par défaut) | `channel` | `both`
    - `agentFilter`, `sessionFilter`

    `channels.telegram.allowFrom`, `groupAllowFrom` et `defaultTo` contrôlent qui peut parler au bot et où il envoie les réponses normales. Ils ne font pas de quelqu'un un approuveur exec. Le premier appariement DM approuvé amorce `commands.ownerAllowFrom` lorsqu'aucun propriétaire de commande n'existe encore, donc la configuration à un seul propriétaire fonctionne toujours sans dupliquer les ID sous `execApprovals.approvers`.

    La livraison par canal affiche le texte de la commande dans la discussion ; n'activez `channel` ou `both` que dans les groupes/sujets de confiance. Lorsque l'invite atterrit dans un sujet de forum, OpenClaw préserve le sujet pour l'invite d'approbation et la suite. Les approbations exec expirent après 30 minutes par défaut.

    Les boutons d'approbation en ligne nécessitent également `channels.telegram.capabilities.inlineButtons` pour autoriser la surface cible (`dm`, `group` ou `all`). Les ID d'approbation préfixés par `plugin:` sont résolus via les approbations de plugin ; les autres sont résolus d'abord via les approbations exec.

    Voir [Approbations exec](/fr/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Contrôles des réponses d'erreur

Lorsque l'agent rencontre une erreur de livraison ou de fournisseur, Telegram peut soit répondre avec le texte de l'erreur, soit le supprimer. Deux clés de configuration contrôlent ce comportement :

| Clé                                 | Valeurs           | Par défaut | Description                                                                                                        |
| ----------------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `channels.telegram.errorPolicy`     | `reply`, `silent` | `reply`    | `reply` envoie un message d'erreur amical à la discussion. `silent` supprime entièrement les réponses d'erreur.    |
| `channels.telegram.errorCooldownMs` | nombre (ms)       | `60000`    | Temps minimum entre les réponses d'erreur pour la même conversation. Empêche le spam d'erreurs pendant les pannes. |

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
  <Accordion title="Bot does not respond to non mention group messages">

    - Si `requireMention=false`Telegram, le mode de confidentialité Telegram doit autoriser une visibilité complète.
      - BotFather : `/setprivacy` -> Désactiver
      - puis retirer et rajouter le bot au groupe
    - `openclaw channels status` avertit lorsque la configuration attend des messages de groupe non mentionnés.
    - `openclaw channels status --probe` peut vérifier les ID numériques explicites de groupe ; le caractère générique `"*"` ne peut pas faire l'objet d'une vérification d'appartenance.
    - test de session rapide : `/activation always`.

  </Accordion>

  <Accordion title="Bot not seeing group messages at all">

    - lorsque `channels.telegram.groups` existe, le groupe doit être listé (ou inclure `"*"`)
    - vérifiez l'appartenance du bot au groupe
    - consultez les journaux : `openclaw logs --follow` pour les raisons de l'ignorance

  </Accordion>

  <Accordion title="Commands work partially or not at all">

    - autorisez votre identité d'expéditeur (appariement et/ou ID numérique `allowFrom`)
    - l'autorisation de commande s'applique toujours même lorsque la stratégie de groupe est `open`
    - `setMyCommands failed` avec `BOT_COMMANDS_TOO_MUCH` signifie que le menu natif contient trop d'entrées ; réduisez les commandes de plugin/compétence/personnalisées ou désactivez les menus natifs
    - les appels de démarrage `deleteMyCommands` / `setMyCommands` et les appels de frappe `sendChatAction`Telegram sont limités et réessayent une fois via le transport de secours de Telegram en cas d'expiration de la demande. Des erreurs réseau/fetch persistantes indiquent généralement des problèmes d'accessibilité DNS/HTTPS vers `api.telegram.org`

  </Accordion>

  <Accordion title="Startup reports unauthorized token">

    - `getMe returned 401`Telegram est un échec d'authentification Telegram pour le jeton de bot configuré.
    - Recopiez ou régénérez le jeton du bot dans BotFather, puis mettez à jour `channels.telegram.botToken`, `channels.telegram.tokenFile`, `channels.telegram.accounts.<id>.botToken` ou `TELEGRAM_BOT_TOKEN` pour le compte par défaut.
    - `deleteWebhook 401 Unauthorized`API lors du démarrage est également un échec d'authentification ; le traiter comme « aucun webhook n'existe » ne ferait que retarder le même échec de jeton invalide aux appels d'API ultérieurs.

  </Accordion>

  <Accordion title="Polling or network instability">

    - Node 22+ + custom fetch/proxy can trigger immediate abort behavior if AbortSignal types mismatch.
    - Some hosts resolve `api.telegram.org` to IPv6 first; broken IPv6 egress can cause intermittent Telegram API failures.
    - If logs include `TypeError: fetch failed` or `Network request for 'getUpdates' failed!`, OpenClaw now retries these as recoverable network errors.
    - During polling startup, OpenClaw reuses the successful startup `getMe` probe for grammY so the runner does not need a second `getMe` before the first `getUpdates`.
    - If `deleteWebhook` fails with a transient network error during polling startup, OpenClaw continues into long polling instead of making another pre-poll control-plane call. A still-active webhook surfaces as a `getUpdates` conflict; OpenClaw then rebuilds the Telegram transport and retries webhook cleanup.
    - If Telegram sockets recycle on a short fixed cadence, check for a low `channels.telegram.timeoutSeconds`; bot clients clamp configured values below the outbound and `getUpdates` request guards, but older releases could abort every poll or reply when this was set below those guards.
    - If logs include `Polling stall detected`, OpenClaw restarts polling and rebuilds the Telegram transport after 120 seconds without completed long-poll liveness by default.
    - `openclaw channels status --probe` and `openclaw doctor` warn when a running polling account has not completed `getUpdates` after startup grace, when a running webhook account has not completed `setWebhook` after startup grace, or when the last successful polling transport activity is stale.
    - Increase `channels.telegram.pollingStallThresholdMs` only when long-running `getUpdates` calls are healthy but your host still reports false polling-stall restarts. Persistent stalls usually point to proxy, DNS, IPv6, or TLS egress issues between the host and `api.telegram.org`.
    - Telegram also honors process proxy env for Bot API transport, including `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and their lowercase variants. `NO_PROXY` / `no_proxy` can still bypass `api.telegram.org`.
    - If the OpenClaw managed proxy is configured through `OPENCLAW_PROXY_URL` for a service environment and no standard proxy env is present, Telegram uses that URL for Bot API transport too.
    - On VPS hosts with unstable direct egress/TLS, route Telegram API calls through `channels.telegram.proxy`:

```yaml
channels:
  telegram:
    proxy: socks5://<user>:<password>@proxy-host:1080
```

    - Node 22+ defaults to `autoSelectFamily=true` (except WSL2). Telegram DNS result order honors `OPENCLAW_TELEGRAM_DNS_RESULT_ORDER`, then `channels.telegram.network.dnsResultOrder`, then the process default such as `NODE_OPTIONS=--dns-result-order=ipv4first`; if none applies, Node 22+ falls back to `ipv4first`.
    - If your host is WSL2 or explicitly works better with IPv4-only behavior, force family selection:

```yaml
channels:
  telegram:
    network:
      autoSelectFamily: false
```

    - RFC 2544 benchmark-range answers (`198.18.0.0/15`) are already allowed
      for Telegram media downloads by default. If a trusted fake-IP or
      transparent proxy rewrites `api.telegram.org` to some other
      private/internal/special-use address during media downloads, you can opt
      in to the Telegram-only bypass:

```yaml
channels:
  telegram:
    network:
      dangerouslyAllowPrivateNetwork: true
```

    - The same opt-in is available per account at
      `channels.telegram.accounts.<accountId>.network.dangerouslyAllowPrivateNetwork`.
    - If your proxy resolves Telegram media hosts into `198.18.x.x`, leave the
      dangerous flag off first. Telegram media already allows the RFC 2544
      benchmark range by default.

    <Warning>
      `channels.telegram.network.dangerouslyAllowPrivateNetwork` weakens Telegram
      media SSRF protections. Use it only for trusted operator-controlled proxy
      environments such as Clash, Mihomo, or Surge fake-IP routing when they
      synthesize private or special-use answers outside the RFC 2544 benchmark
      range. Leave it off for normal public internet Telegram access.
    </Warning>

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

Plus d'aide : [Channel troubleshooting](/fr/channels/troubleshooting).

## Référence de configuration

Référence principale : [Configuration reference - Telegram](/fr/gateway/config-channels#telegram).

<Accordion title="TelegramChamps Telegram à signal fort">

- démarrage/auth : `enabled`, `botToken`, `tokenFile`, `accounts.*` (`tokenFile` doit pointer vers un fichier régulier ; les liens symboliques sont rejetés)
- contrôle d'accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `groups.*.topics.*`, `bindings[]` de premier niveau (`type: "acp"`)
- défauts de sujet : `groups.<chatId>.topics."*"` s'applique aux sujets de forum non correspondants ; les ID de sujet exacts priment
- approbations d'exécution : `execApprovals`, `accounts.*.execApprovals`
- commande/menu : `commands.native`, `commands.nativeSkills`, `customCommands`
- fil de discussion/réponses : `replyToMode`
- streaming : `streaming` (aperçu), `streaming.preview.toolProgress`, `blockStreaming`
- formatage/livraison : `textChunkLimit`, `chunkMode`, `linkPreview`, `responsePrefix`
- média/réseau : `mediaMaxMb`, `mediaGroupFlushMs`, `timeoutSeconds`, `pollingStallThresholdMs`, `retry`, `network.autoSelectFamily`, `network.dangerouslyAllowPrivateNetwork`, `proxy`API
- racine d'API personnalisée : `apiRoot`API (racine de l'API Bot uniquement ; ne pas inclure `/bot<TOKEN>`)
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

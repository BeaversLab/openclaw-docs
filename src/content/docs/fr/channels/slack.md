---
summary: "Configuration et comportement d'exécution de Slack (Socket Mode + URL de requête HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

Statut : prêt pour la production pour les MDs + canaux via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requête HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/en/channels/pairing">
    Les MD Slack sont en mode appariement par défaut.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/en/tools/slash-commands">
    Comportement de commande natif et catalogue de commandes.
  </Card>
  <Card title="Dépannage de canal" icon="wrench" href="/en/channels/troubleshooting">
    Manuels de diagnostic et de réparation multicanaux.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (par défaut)">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Dans les paramètres de l'application Slack, appuyez sur le bouton **[Create New App](https://api.slack.com/apps/new)** :

        - choisissez **from a manifest** (à partir d'un manifeste) et sélectionnez un espace de travail pour votre application
        - collez l'[exemple de manifeste](#manifest-and-scope-checklist) ci-dessous et continuez pour créer
        - générez un **App-Level Token** (`xapp-...`) avec `connections:write`
        - installez l'application et copiez le **Bot Token** (`xoxb-...`) affiché
      </Step>

      <Step title="Configurer OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        Env fallback (compte par défaut uniquement) :

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="URLs de requêtes HTTP">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Dans les paramètres de l'application Slack, appuyez sur le bouton **[Create New App](https://api.slack.com/apps/new)** :

        - choisissez **from a manifest** et sélectionnez un espace de travail pour votre application
        - collez le [manifeste d'exemple](#manifest-and-scope-checklist) et mettez à jour les URLs avant la création
        - enregistrez le **Signing Secret** pour la vérification des requêtes
        - installez l'application et copiez le **Bot Token** (`xoxb-...`) affiché

      </Step>

      <Step title="Configurer OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

        <Note>
        Utilisez des chemins de webhook uniques pour le HTTP multi-compte

        Donnez à chaque compte un `webhookPath` distinct (par défaut `/slack/events`) pour éviter les conflits d'inscription.
        </Note>

      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Liste de contrôle pour le manifeste et les étendues (scopes)

<Tabs>
  <Tab title="Socket Mode (default)">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

  </Tab>

  <Tab title="URLs de requêtes HTTP">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Portées d'auteur optionnelles (opérations d'écriture)">
    Ajoutez la portée de bot `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité par défaut de l'application Slack.

    Si vous utilisez une icône emoji, Slack attend la syntaxe `:emoji_name:`.

  </Accordion>
  <Accordion title="Portées de jeton utilisateur optionnelles (opérations de lecture)">
    Si vous configurez `channels.slack.userToken`, les portées de lecture typiques sont :

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si vous dépendez des lectures de recherche Slack)

  </Accordion>
</AccordionGroup>

## Modèle de jeton

- `botToken` + `appToken` sont requis pour le mode Socket.
- Le mode HTTP nécessite `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent les chaînes
  en texte brut ou les objets SecretRef.
- Les jetons de configuration prévalent sur le repli (fallback) des variables d'environnement.
- Le repli (fallback) des variables d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` (`xoxp-...`) est uniquement configurable (pas de repli d'environnement) et par défaut se comporte en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané d'état :

- L'inspection du compte Slack suit les champs `*Source` et `*Status`
  par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- L'état est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef
  ou une autre source de secret non en ligne, mais que le chemin de commande/runtime actuel
  n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la
  paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être privilégié lorsqu'il est configuré. Pour les écritures, le jeton bot reste privilégié ; les écritures par jeton utilisateur ne sont autorisées que lorsque `userTokenReadOnly: false` et que le jeton bot est indisponible.</Tip>

## Actions et portes (gates)

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils actuels de Slack :

| Groupe      | Par défaut |
| ----------- | ---------- |
| messages    | activé     |
| réactions   | activé     |
| épingles    | activé     |
| infosMembre | activé     |
| listeEmoji  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DMs (legacy : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.slack.allowFrom` inclue `"*"` ; legacy : `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicateurs de DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (legacy)
    - `dm.groupEnabled` (faux par défaut pour les DMs de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    Le jumelage dans les DMs utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Stratégie de channel">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et doit utiliser des identifiants de channel stables.

    Note d'exécution : si `channels.slack` est complètement absent (configuration uniquement par variables d'environnement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution Nom/ID :

    - les entrées de la liste d'autorisation des channels et des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels privilégient l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions et utilisateurs de channel">
    Les messages de channel sont limités par mention par défaut.

    Sources de mention :

    - mention explicite de l'application (`<@botId>`)
    - modèles de regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par channel (`channels.slack.channels.<id>` ; noms uniquement via la résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `id:`, `e164:`, `username:`, `name:`, ou caractère générique `"*"`
      (les clés héritées sans préfixe mappent toujours uniquement vers `id:`)

  </Tab>
</Tabs>

## Fils de discussion, sessions et balises de réponse

- Les DM sont routés en tant que `direct` ; les channels en tant que `channel` ; les MPIM en tant que `group`.
- Avec `session.dmScope=main` par défaut, les DM Slack se replient sur la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses de fil peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle le nombre de messages de fil existants récupérés lorsqu'une nouvelle session de fil commence (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : quand `true`, supprime les mentions de fil implicites pour que le bot ne réponde qu'aux mentions `@bot` explicites à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil avec participation du bot contournent le filtrage `requireMention`.

Contrôles des fils de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les discussions directes : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de réponse dans Slack, y compris les balises explicites `[[reply_to_*]]`. Cela diffère de Telegram, où les balises explicites sont toujours honorées en mode `"off"`. La différence reflète les modèles de fils de discussion des plateformes : les fils Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles dans le flux de discussion principal.

## Réactions d'accusé de réception

`ackReaction` envoie un émoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- solution de repli de l'émoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des codes courts (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Flux de texte

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver le flux de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.

`channels.slack.streaming.nativeTransport` contrôle le flux de texte natif de Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que le flux de texte natif et le statut du fil de discussion de l'assistant Slack apparaissent. La sélection du fil suit toujours `replyToMode`.
- Les racines de canaux et de discussions de groupe peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible.
- Les Slack DM de premier niveau restent hors fil par défaut, ils n'affichent donc pas l'aperçu de style fil ; utilisez des réponses de fil ou `typingReaction` si vous voulez une progression visible là-bas.
- Les médias et les charges utiles non textuelles reviennent à la livraison normale.
- Si le flux échoue en cours de réponse, OpenClaw revient à la livraison normale pour les charges utiles restantes.

Utiliser l'aperçu de brouillon au lieu du flux de texte natif Slack :

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

Clés héritées :

- `channels.slack.streamMode` (`replace | status_final | append`) est automatiquement migré vers `channels.slack.streaming.mode`.
- Le booléen `channels.slack.streaming` est automatiquement migré vers `channels.slack.streaming.mode` et `channels.slack.streaming.nativeTransport`.
- Le `channels.slack.nativeStreaming` hérité est automatiquement migré vers `channels.slack.streaming.nativeTransport`.

## Repli de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. C'est surtout utile en dehors des réponses de fil, qui utilisent un indicateur d'état par défaut « en train d'écrire... ».

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est effectuée sur la base du meilleur effort et un nettoyage est tenté automatiquement une fois le chemin de réponse ou d'échec terminé.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requête authentifié par jeton) et écrites dans le stockage multimédia lorsque le téléchargement réussit et que les limites de taille le permettent.

    La limite de taille entrante d'exécution est `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texte et fichiers sortants">
  - les fragments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut) - `channels.slack.chunkMode="newline"` active le découpage paragraphe en priorité - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`) - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsque configuré ; sinon les envois de canal
  utilisent les valeurs par défaut de type MIME du pipeline média
</Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack sont ouvertes via les API de conversation Slack lors de l'envoi aux cibles utilisateur.

  </Accordion>
</AccordionGroup>

## Commandes et comportement slash

- Le mode automatique de commande native est **désactivé** pour Slack (`commands.native: "auto"` n'active pas les commandes natives Slack).
- Activez les gestionnaires de commande natifs Slack avec `channels.slack.commands.native: true` (ou global `commands.native: true`).
- Lorsque les commandes natives sont activées, enregistrez les commandes slash correspondantes dans Slack (noms `/<command>`), avec une exception :
  - enregistrez `/agentstatus` pour la commande de statut (Slack réserve `/status`)
- Si les commandes natives ne sont pas activées, vous pouvez exécuter une seule commande slash configurée via `channels.slack.slashCommand`.
- Les menus d'arguments natifs adaptent désormais leur stratégie de rendu :
  - jusqu'à 5 options : blocs de boutons
  - 6-100 options : menu de sélection statique
  - plus de 100 options : sélection externe avec filtrage d'options asynchrone lorsque les gestionnaires d'options d'interactivité sont disponibles
  - si les valeurs d'option encodées dépassent les limites de Slack, le flux revient aux boutons
- Pour les payloads d'option longs, les menus d'arguments de commande Slash utilisent une boîte de dialogue de confirmation avant d'envoyer une valeur sélectionnée.

Paramètres par défaut des commandes Slash :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Les sessions Slash utilisent des clés isolées :

- `agent:<agentId>:slack:slash:<userId>`

et acheminent toujours l'exécution de la commande par rapport à la session de conversation cible (`CommandTargetSessionKey`).

## Réponses interactives

Slack peut afficher des contrôles de réponse interactifs créés par l'agent, mais cette fonctionnalité est désactivée par défaut.

Activez-la globalement :

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

Ou activez-la pour un seul compte Slack :

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

Lorsqu'elle est activée, les agents peuvent émettre des directives de réponse exclusives à Slack :

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Ces directives sont compilées en Slack Block Kit et acheminent les clics ou les sélections via le chemin d'événement d'interaction Slack existant.

Notes :

- Il s'agit d'une interface utilisateur spécifique à Slack. Les autres canaux ne traduisent pas les directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non des valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassaient les limites de Slack Block Kit, OpenClaw reviendrait à la réponse textuelle originale au lieu d'envoyer un payload de blocs non valide.

## Approbations d'exécution dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et des interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations d'exécution utilisent `channels.slack.execApprovals.*` pour le routage natif DM/canal.
- Les approbations de plugin peuvent toujours être résolues via la même surface de bouton native Slack lorsque la demande atterrit déjà dans Slack et que le type d'id d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser les demandes via Slack.

Cela utilise la même surface de bouton d'approbation partagée que les autres channels. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
ne doit inclure une commande manuelle `/approve` que si le résultat du tool indique que les
approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` lorsque possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un
approuveur est résolu. Définissez `enabled: false` pour désactiver Slack en tant que client d'approbation natif explicitement.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approuveurs sont résolus.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native Slack explicite n'est nécessaire que lorsque vous souhaitez remplacer les approuveurs, ajouter des filtres ou
opter pour la livraison via le chat d'origine :

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

Le transfert partagé `approvals.exec` est distinct. Ne l'utilisez que lorsque les invites d'approbation d'exécution doivent également
être acheminées vers d'autres chats ou cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également
séparé ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugin lorsque ces demandes atterrissent déjà
dans Slack.

La commande `/approve` de même-chat fonctionne également dans les channels et DMs Slack qui prennent déjà en charge les commandes. Voir [Exec approvals](/en/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications de messages/suppressions/diffusions de fils sont mappées vers des événements système.
- Les événements d'ajout/suppression de réaction sont mappés vers des événements système.
- Les événements d'arrivée/départ de membre, de création/renommage de channel, et d'ajout/suppression d'épingle sont mappés vers des événements système.
- `channel_id_changed` peut migrer les clés de configuration du channel lorsque `configWrites` est activé.
- Les métadonnées de sujet/objectif du channel sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil de discussion et l'ensemencement initial du contexte de l'historique du fil sont filtrés par les listes d'autorisation d'expéditeur configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements modaux `view_submission` et `view_closed` avec les métadonnées du channel acheminé et les entrées de formulaire

## Pointeurs de référence de configuration

Référence principale :

- [Référence de configuration - Slack](/en/gateway/configuration-reference#slack)

  Champs Slack à signal fort :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (obsolète : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de glace ; désactiver sauf en cas de besoin)
  - accès channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - fil de discussion/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - ops/features : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponse dans les channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`)
    - `requireMention`
    - per-channel `users` allowlist

    Commandes utiles :

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Messages DM ignorés">
    Vérifiez :

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - approbations d'appairage / entrées de liste d'autorisation

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Le mode Socket ne se connecte pas">
    Validez les jetons bot + app et l'activation du mode Socket dans les paramètres de l'application Slack.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais le runtime actuel n'a pas pu résoudre la valeur sauvegardée par SecretRef.

  </Accordion>

  <Accordion title="Le mode HTTP ne reçoit pas d'événements">
    Validez :

    - signing secret
    - webhook path
    - Request URLs Slack (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les
    snapshots de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre le signing secret sauvegardé par SecretRef.

  </Accordion>

  <Accordion title="Les commandes natives/slash ne se déclenchent pas">
    Vérifiez ce que vous aviez l'intention de faire :

    - mode de commande native (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de channel/utilisateur.

  </Accordion>
</AccordionGroup>

## Connexes

- [Appairage](/en/channels/pairing)
- [Groupes](/en/channels/groups)
- [Sécurité](/en/gateway/security)
- [Routage de canal](/en/channels/channel-routing)
- [Dépannage](/en/channels/troubleshooting)
- [Configuration](/en/gateway/configuration)
- [Commandes slash](/en/tools/slash-commands)

---
summary: "Configuration de Slack et comportement à l'exécution (mode Socket + URL de requêtes HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

Statut : prêt pour la production pour les MDs + canaux via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requête HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les DMs Slack sont en mode appairage par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multicanal.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (default)">
    <Steps>
      <Step title="Create a new Slack app">
        Dans les paramètres de l'application Slack, appuyez sur le bouton **[Create New App](https://api.slack.com/apps/new)** :

        - choisissez **from a manifest** et sélectionnez un espace de travail pour votre application
        - collez le [manifeste d'exemple](#manifest-and-scope-checklist) ci-dessous et poursuivez la création
        - générez un **App-Level Token** (`xapp-...`) avec `connections:write`
        - installez l'application et copiez le **Bot Token** (`xoxb-...`) affiché
      </Step>

      <Step title="Configure OpenClaw">

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

        Env fallback (default account only) :

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Start gateway">

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
        - collez le [example manifest](#manifest-and-scope-checklist) et mettez à jour les URL avant de créer
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

        Attribuez à chaque compte un `webhookPath` distinct (par défaut `/slack/events`) pour éviter que les enregistrements n'entrent en collision.
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

### Paramètres de manifeste supplémentaires

Activez différentes fonctionnalités qui étendent les paramètres par défaut ci-dessus.

<AccordionGroup>
  <Accordion title="Commandes slash natives facultatives">

    Plusieurs [native slash commands](#commands-and-slash-behavior) peuvent être utilisées au lieu d'une seule commande configurée avec nuance :

    - Utilisez `/agentstatus` au lieu de `/status` car la commande `/status` est réservée.
    - Pas plus de 25 commandes slash ne peuvent être disponibles à la fois.

    Remplacez votre section `features.slash_commands` existante par un sous-ensemble de [available commands](/fr/tools/slash-commands#command-list) :

    <Tabs>
      <Tab title="Mode Socket (par défaut)">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]"
      },
      {
        "command": "/reset",
        "description": "Reset the current session"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]"
      },
      {
        "command": "/stop",
        "description": "Stop the current run"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]"
      },
      {
        "command": "/help",
        "description": "Show the short help summary"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost"
      }
    ]
```

      </Tab>
      <Tab title="URLs de requêtes HTTP">

```json
    "slash_commands": [
      {
        "command": "/new",
        "description": "Start a new session",
        "usage_hint": "[model]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reset",
        "description": "Reset the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/compact",
        "description": "Compact the session context",
        "usage_hint": "[instructions]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/stop",
        "description": "Stop the current run",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/session",
        "description": "Manage thread-binding expiry",
        "usage_hint": "idle <duration|off> or max-age <duration|off>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/think",
        "description": "Set the thinking level",
        "usage_hint": "<off|minimal|low|medium|high|xhigh>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/verbose",
        "description": "Toggle verbose output",
        "usage_hint": "on|off|full",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/fast",
        "description": "Show or set fast mode",
        "usage_hint": "[status|on|off]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/reasoning",
        "description": "Toggle reasoning visibility",
        "usage_hint": "[on|off|stream]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/elevated",
        "description": "Toggle elevated mode",
        "usage_hint": "[on|off|ask|full]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/exec",
        "description": "Show or set exec defaults",
        "usage_hint": "host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/model",
        "description": "Show or set the model",
        "usage_hint": "[name|#|status]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/models",
        "description": "List providers or models for a provider",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/help",
        "description": "Show the short help summary",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/commands",
        "description": "Show the generated command catalog",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tools",
        "description": "Show what the current agent can use right now",
        "usage_hint": "[compact|verbose]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/agentstatus",
        "description": "Show runtime status, including provider usage/quota when available",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/tasks",
        "description": "List active/recent background tasks for the current session",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/context",
        "description": "Explain how context is assembled",
        "usage_hint": "[list|detail|json]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/whoami",
        "description": "Show your sender identity",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/skill",
        "description": "Run a skill by name",
        "usage_hint": "<name> [input]",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/btw",
        "description": "Ask a side question without changing session context",
        "usage_hint": "<question>",
        "url": "https://gateway-host.example.com/slack/events"
      },
      {
        "command": "/usage",
        "description": "Control the usage footer or show cost summary",
        "usage_hint": "off|tokens|full|cost",
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
```

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="Portées d'auteurship optionnelles (opérations d'écriture)">
    Ajoutez la portée bot `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité de l'application Slack par défaut.

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
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des chaînes
  en texte brut ou des objets SecretRef.
- Les jetons de configuration remplacent le repli d'environnement (env fallback).
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` s'applique uniquement au compte par défaut.
- `userToken` (`xoxp-...`) est uniquement configurable (pas de repli d'environnement) et par défaut le comportement est en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané d'état :

- L'inspection de compte Slack suit les champs `*Source` et `*Status`
  par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- L'état est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef
  ou une autre source de secret non en ligne, mais que le chemin de commande/runtime actuel
  n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la
  paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être privilégié lorsqu'il est configuré. Pour les écritures, le jeton bot reste privilégié ; les écritures avec jeton utilisateur sont autorisées uniquement lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Actions et portes (gates)

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils Slack actuels :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épinglés   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DMs (legacy : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite `channels.slack.allowFrom` pour inclure `"*"` ; legacy : `channels.slack.dm.allowFrom`)
    - `disabled`

    DM flags :

    - `dm.enabled` (true par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (legacy)
    - `dm.groupEnabled` (false par défaut pour les DMs de groupe)
    - `dm.groupChannels` (allowlist MPIM optionnelle)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas définie.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'appairage dans les DMs utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La allowlist des channels se trouve sous `channels.slack.channels` et doit utiliser des IDs de channel stables.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration via env uniquement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la allowlist de channels et les entrées de la allowlist de DMs sont résolues au démarrage lorsque l'accès au token le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    Les messages de canal sont verrouillés par mention par défaut.

    Sources de mention :

    - mention explicite de l'application (`<@botId>`)
    - modèles de regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par canal (`channels.slack.channels.<id>` ; noms uniquement via résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `id:`, `e164:`, `username:`, `name:`, ou `"*"` caractère générique
      (les clés héritées sans préfixe mappent toujours uniquement vers `id:`)

  </Tab>
</Tabs>

## Fils de discussion, sessions et balises de réponse

- Les DMs sont acheminés en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Avec le `session.dmScope=main` par défaut, les DMs Slack sont réduits à la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses dans les fils peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle le nombre de messages de fil existants récupérés lors du démarrage d'une nouvelle session de fil (par défaut `20` ; définir `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fil de discussion pour que le bot ne réponde qu'aux mentions explicites `@bot` à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil où le bot participe contournent le filtrage `requireMention`.

Contrôles du threading de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les discussions directes : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de discussion de réponse dans Slack, y compris les balises explicites `[[reply_to_*]]`. Cela diffère de Telegram, où les balises explicites sont toujours honorées en mode `"off"`. La différence reflète les modèles de threading de la plateforme : les fils de Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles dans le flux de discussion principal.

## Réactions d'accusé de réception

`ackReaction` envoie un émoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- émoji de repli d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des shortcodes (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte d'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.

`channels.slack.streaming.nativeTransport` contrôle le flux de texte natif Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour le flux de texte natif et pour que l'état du fil de discussion de l'assistant Slack apparaisse. La sélection du fil suit toujours `replyToMode`.
- Les racines des canaux et des discussions de groupe peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible.
- Les Slack DM de premier niveau restent hors fil par défaut, ils n'affichent donc pas l'aperçu de style fil ; utilisez les réponses dans le fil ou `typingReaction` si vous souhaitez une progression visible.
- Les médias et les charges utiles non textuelles reviennent à la livraison normale.
- Si le flux échoue en cours de réponse, OpenClaw revient à la livraison normale pour les charges utiles restantes.

Utiliser l'aperçu du brouillon au lieu du flux de texte natif Slack :

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
- le booléen `channels.slack.streaming` est automatiquement migré vers `channels.slack.streaming.mode` et `channels.slack.streaming.nativeTransport`.
- l'ancien `channels.slack.nativeStreaming` est automatiquement migré vers `channels.slack.streaming.nativeTransport`.

## Repli de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message Slack entrant pendant que OpenClaw traite une réponse, puis la supprime lorsque l'exécution est terminée. C'est surtout utile en dehors des réponses dans le fil, qui utilisent un indicateur d'état "est en train d'écrire..." par défaut.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est du « meilleur effort » et le nettoyage est tenté automatiquement après la réponse ou l'achèvement du chemin d'échec.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requêtes authentifiées par jeton) et écrites dans le magasin de médias lorsque la récupération réussit et que les limites de taille le permettent.

    La limite de taille entrante à l'exécution est par défaut de `20MB` sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texte et fichiers sortants">
  - les segments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut) - `channels.slack.chunkMode="newline"` active le découpage prioritaire par paragraphe - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`) - la limite des médias sortants suit `channels.slack.mediaMaxMb` lorsque configuré ; sinon les envois de
  canal utilisent les MIME par défaut du pipeline média
</Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les Slack DMs sont ouvertes via les API de conversation Slack lors de l'envoi vers des cibles utilisateur.

  </Accordion>
</AccordionGroup>

## Commandes et comportement des slashs

Les commandes slash apparaissent dans Slack soit comme une seule commande configurée, soit comme plusieurs commandes natives. Configurez `channels.slack.slashCommand` pour modifier les valeurs par défaut des commandes :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Les commandes natives nécessitent des [paramètres de manifeste supplémentaires](#additional-manifest-settings) dans votre application Slack et sont activées avec `channels.slack.commands.native: true` ou `commands.native: true` dans les configurations globales à la place.

- Le mode automatique des commandes natives est **désactivé** pour Slack, donc `commands.native: "auto"` n'active pas les commandes natives Slack.

```txt
/help
```

Les menus d'arguments natifs utilisent une stratégie de rendu adaptatif qui affiche une fenêtre modale de confirmation avant d'envoyer une valeur d'option sélectionnée :

- jusqu'à 5 options : blocs de boutons
- 6-100 options : menu de sélection statique
- plus de 100 options : sélection externe avec filtrage d'options asynchrone lorsque les gestionnaires d'options d'interactivité sont disponibles
- limites Slack dépassées : les valeurs d'option encodées reviennent aux boutons

```txt
/think
```

Les sessions slash utilisent des clés isolées comme `agent:<agentId>:slack:slash:<userId>` et acheminent toujours les exécutions de commandes vers la session de conversation cible en utilisant `CommandTargetSessionKey`.

## Réponses interactives

Slack peut afficher des contrôles de réponse interactifs créés par l'agent, mais cette fonctionnalité est désactivée par défaut.

Activez-le globalement :

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

Ou activez-le pour un seul compte Slack :

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
- Si les blocs interactifs générés dépassent les limites du Slack Block Kit, OpenClaw revient à la réponse textuelle originale au lieu d'envoyer une charge utile de blocs non valide.

## Approbations d'exécution dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations d'exécution utilisent `channels.slack.execApprovals.*` pour le routage natif DM/canal.
- Les approbations de plugin peuvent toujours être résolues via la même surface de bouton native à Slack lorsque la demande atterrit déjà dans Slack et que le type d'identifiant d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser des demandes via Slack.

Ceci utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'expérience utilisateur (UX) d'approbation principale ; OpenClaw
ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les approbations par chat ne sont pas disponibles ou si l'approbation manuelle est le seul chemin possible.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approbateur résout. Définissez `enabled: false` pour désactiver explicitement Slack en tant que client d'approbation natif.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approbateurs résolvent.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite pour Slack n'est nécessaire que si vous souhaitez remplacer les approbateurs, ajouter des filtres ou
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

Le transfert partagé `approvals.exec` est distinct. Utilisez-le uniquement lorsque les invites d'approbation d'exécution doivent également
être acheminées vers d'autres chats ou cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également
séparé ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugin lorsque ces demandes atterrissent déjà
dans Slack.

Le `/approve` dans le même chat fonctionne également dans les canaux et les DM Slack qui prennent déjà en charge les commandes. Consultez [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages et les diffusions de fils sont mappées en événements système.
- Les événements d'ajout/suppression de réactions sont mappés en événements système.
- Les événements d'arrivée/départ de membre, de canal créé/renommé et d'ajout/suppression d'épingle sont mappés en événements système.
- `channel_id_changed` peut migrer les clés de configuration de canal lorsque `configWrites` est activé.
- Les métadonnées de sujet/objectif du canal sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil et l'amorçage initial du contexte d'historique du fil sont filtrés par les listes d'autorisation d'expéditeur configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système structurés `Slack interaction: ...` avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements modaux `view_submission` et `view_closed` avec les métadonnées du canal routé et les entrées de formulaire

## Pointeurs de référence de configuration

Référence principale :

- [Configuration reference - Slack](/fr/gateway/configuration-reference#slack)

  Champs Slack à signal fort :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - Accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (obsolète : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - compatibilité toggle : `dangerouslyAllowNameMatching` (break-glass ; laisser désactivé sauf en cas de nécessité)
  - accès channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - threading/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - ops/fonctionnalités : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponses dans les channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - allowlist de channels (`channels.slack.channels`)
    - `requireMention`
    - allowlist `users` par channel

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
    - `channels.slack.dmPolicy` (ou obsolète `channels.slack.dm.policy`)
    - approbations d'appariement / entrées de l'allowlist

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Validez les jetons bot + app et l'activation du mode Socket dans les paramètres de l'application Slack.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré, mais l'exécution actuelle n'a pas pu résoudre la valeur
    soutenue par SecretRef.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Validez :

    - signing secret
    - chemin du webhook
    - URL de requête Slack (Événements + Interactivité + Commandes Slash)
    - `webhookPath` unique par compte HTTP

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les
    instantanés de compte, le compte HTTP est configuré mais l'exécution actuelle n'a pas pu
    résoudre le signing secret soutenu par SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande natif (`channels.slack.commands.native: true`) avec les commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de channel/utilisateur.

  </Accordion>
</AccordionGroup>

## Connexes

- [Jumelage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de channel](/fr/channels/channel-routing)
- [Dépannage](/fr/channels/troubleshooting)
- [Configuration](/fr/gateway/configuration)
- [Commandes Slash](/fr/tools/slash-commands)

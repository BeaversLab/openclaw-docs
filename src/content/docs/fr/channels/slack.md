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
  <Tab title="Mode Socket (par défaut)">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Dans les paramètres de l'application Slack, appuyez sur le bouton **[Create New App](https://api.slack.com/apps/new)** :

        - choisissez **from a manifest** et sélectionnez un espace de travail pour votre application
        - collez le [example manifest](#manifest-and-scope-checklist) ci-dessous et continuez la création
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

  <Tab title="URLs de requête HTTP">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Dans les paramètres de l'application Slack, appuyez sur le bouton **[Create New App](https://api.slack.com/apps/new)** :

        - choisissez **from a manifest** et sélectionnez un espace de travail pour votre application
        - collez le [example manifest](#manifest-and-scope-checklist) et mettez à jour les URLs avant de créer
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
        Utilisez des chemins de webhook uniques pour le multi-compte HTTP

        Attribuez à chaque compte un `webhookPath` distinct (par défaut `/slack/events`) pour éviter les conflits d'enregistrement.
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
  <Tab title="Mode Socket (par défaut)">

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

  <Tab title="URLs de requête HTTP">

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
  <Accordion title="Commandes natives slash facultatives">

    Plusieurs [commandes natives slash](#commands-and-slash-behavior) peuvent être utilisées au lieu d'une seule commande configurée avec nuance :

    - Utilisez `/agentstatus` au lieu de `/status` car la commande `/status` est réservée.
    - Pas plus de 25 commandes slash ne peuvent être disponibles à la fois.

    Remplacez votre section `features.slash_commands` existante par un sous-ensemble de [commandes disponibles](/fr/tools/slash-commands#command-list) :

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
        "usage_hint": "<level>"
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
        "description": "List providers/models or add a model",
        "usage_hint": "[provider] [page] [limit=<n>|size=<n>|all] | add <provider> <modelId>"
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
      <Tab title="URLs de requête HTTP">

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
        "usage_hint": "<level>",
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
  <Accordion title="Scopes d'auteur facultatifs (opérations d'écriture)">
    Ajoutez le scope bot `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité de l'application Slack par défaut.

    Si vous utilisez une icône emoji, Slack attend la syntaxe `:emoji_name:`.

  </Accordion>
  <Accordion title="Scopes de jeton utilisateur facultatifs (opérations de lecture)">
    Si vous configurez `channels.slack.userToken`, les scopes de lecture typiques sont :

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

- `botToken` + `appToken` sont requis pour le Mode Socket.
- Le mode HTTP nécessite `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent les chaînes en texte brut ou les objets SecretRef.
- Les jetons de configuration remplacent le repli (fallback) d'environnement.
- Le repli d'env `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` (`xoxp-...`) est uniquement configurable (pas de repli d'env) et par défaut, il se comporte en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané de statut :

- L'inspection du compte Slack suit les champs `*Source` et `*Status` par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- Le statut est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef ou une autre source de secret non en ligne, mais que le chemin de commande/exécution actuel n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être préféré lorsqu'il est configuré. Pour les écritures, le jeton bot reste préféré ; les écritures par jeton utilisateur sont autorisées uniquement lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Actions et portes (gates)

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils actuels de Slack :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.slack.dmPolicy` contrôle l'accès aux DM (ancien : `channels.slack.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite `channels.slack.allowFrom` pour inclure `"*"` ; ancien : `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicateurs de DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom` (préféré)
    - `dm.allowFrom` (ancien)
    - `dm.groupEnabled` (faux par défaut pour les DM de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM optionnelle)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    Le jumelage dans les DM utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Stratégie de channel">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et doit utiliser des IDs de channel stables.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration uniquement via variables d'environnement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des channels et des DM sont résolues au démarrage lorsque l'accès par token le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe de nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Mentions and channel users">
    Les messages de canal sont filtrés par mention par défaut.

    Sources de mention :

    - mention explicite de l'application (`<@botId>`)
    - motifs regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par canal (`channels.slack.channels.<id>`; noms uniquement via la résolution au démarrage ou `dangerouslyAllowNameMatching`) :

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

- Les DMs sont acheminés en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Avec le `session.dmScope=main` par défaut, les Slack DMs sont réduits à la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses dans les fils peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle combien de messages de fil existants sont récupérés lorsqu'une nouvelle session de fil démarre (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fil de discussion afin que le bot ne réponde qu'aux mentions `@bot` explicites à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil où le bot participe contournent le filtrage `requireMention`.

Contrôles du fil de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les conversations directes : `channels.slack.dm.replyToMode`

Les balises de réponse manuelle sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Remarque : `replyToMode="off"` désactive **tous** les fils de discussion de réponse dans Slack, y compris les balises `[[reply_to_*]]` explicites. Cela diffère de Telegram, où les balises explicites sont toujours honorées en mode `"off"`. La différence reflète les modèles de fils de discussion de la plateforme : les fils Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles dans le flux de discussion principal.

Les réponses de fil ciblées Slack sont acheminées via leur session ACP liée lorsqu'elle existe, au lieu de préparer la réponse par rapport au shell de l'agent par défaut. Cela permet de garder les liaisons `/focus` et `/acp spawn ... --bind here` intactes pour les messages de suivi dans le fil.

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- solution de repli pour l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des shortcodes (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte de statut de progression pendant la génération, puis envoyer le texte final.
- `streaming.preview.toolProgress` : lorsque l'aperçu du brouillon est actif, acheminer les mises à jour de l'outil/de la progression vers le même message d'aperçu modifié (par défaut : `true`). Définir `false` pour conserver des messages d'outil/de progression séparés.

`channels.slack.streaming.nativeTransport` contrôle le flux de texte natif Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que le flux de texte natif et le statut du fil de discussion de l'assistant Slack apparaissent. La sélection du fil suit toujours `replyToMode`.
- Les racines de canaux et de discussions de groupe peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible.
- Les DM Slack de niveau supérieur restent hors fil par défaut, ils n'affichent donc pas l'aperçu de style fil ; utilisez des réponses de fil ou `typingReaction` si vous souhaitez une progression visible.
- Les charges utiles multimédias et non textuelles reviennent à la livraison normale.
- Les versions finales médias/erreurs annulent les modifications d'aperçu en attente sans vider un brouillon temporaire ; les versions finales textes/blocs éligibles ne vident que lorsqu'elles peuvent modifier l'aperçu en place.
- Si le flux échoue en cours de réponse, OpenClaw revient à la livraison normale pour les charges utiles restantes.
- Les canaux Slack Connect qui rejettent un flux avant que le SDK ne vide sa mémoire tampon locale reviennent aux réponses normales Slack, afin que les réponses courtes ne soient pas silencieusement abandonnées ou signalées comme livrées avant que Slack ne les reconnaisse.

Utilisez l'aperçu de brouillon au lieu du flux de texte natif Slack :

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

## Retour de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. Ceci est particulièrement utile en dehors des réponses de fil, qui utilisent un indicateur de statut par défaut "est en train d'écrire...".

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est effectuée au mieux et un nettoyage est tenté automatiquement une fois le chemin de réponse ou d'échec terminé.

## Médias, segmentation et livraison

<AccordionGroup>
  <Accordion title="Inbound attachments">
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requête authentifié par jeton) et écrites dans le magasin de médias lorsque la récupération réussit et que les limites de taille le permettent.

    La limite de taille entrante à l'exécution est par défaut de `20MB` sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Outbound text and files">
  - les segments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut) - `channels.slack.chunkMode="newline"` active la segmentation paragraphe en premier - l'envoi de fichiers utilise les API de téléchargement Slack et peut inclure des réponses de fils (`thread_ts`) - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsque configuré ; sinon les envois de canal utilisent
  les valeurs par défaut de type MIME du pipeline de médias
</Accordion>

  <Accordion title="Delivery targets">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack sont ouverts via les API de conversation Slack lors de l'envoi aux cibles utilisateur.

  </Accordion>
</AccordionGroup>

## Commandes et comportement de la barre oblique

Les commandes slash apparaissent dans Slack soit comme une seule commande configurée soit comme plusieurs commandes natives. Configurez `channels.slack.slashCommand` pour modifier les valeurs par défaut des commandes :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Les commandes natives nécessitent des [paramètres de manifeste supplémentaires](#additional-manifest-settings) dans votre application Slack et sont activées avec `channels.slack.commands.native: true` ou `commands.native: true` dans les configurations globales à la place.

- Le mode automatique de commande native est **désactivé** pour Slack donc `commands.native: "auto"` n'active pas les commandes natives Slack.

```txt
/help
```

Les menus d'arguments natifs utilisent une stratégie de rendu adaptatif qui affiche une fenêtre de confirmation avant d'envoyer la valeur de l'option sélectionnée :

- jusqu'à 5 options : blocs de boutons
- 6-100 options : menu de sélection statique
- plus de 100 options : sélection externe avec filtrage d'options asynchrone lorsque les gestionnaires d'options d'interactivité sont disponibles
- limites Slack dépassées : les valeurs d'option encodées reviennent aux boutons

```txt
/think
```

Les sessions Slash utilisent des clés isolées comme `agent:<agentId>:slack:slash:<userId>` et acheminent toujours les exécutions de commandes vers la session de conversation cible en utilisant `CommandTargetSessionKey`.

## Réponses interactives

Slack peut afficher des commandes de réponse interactive créées par l'agent, mais cette fonctionnalité est désactivée par défaut.

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
- Si les blocs interactifs générés dépassent les limites du Slack Block Kit, OpenClaw revient à la réponse textuelle d'origine au lieu d'envoyer une charge utile de blocs non valide.

## Approbations Exec dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et des interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations Exec utilisent `channels.slack.execApprovals.*` pour le routage natif DM/channel.
- Les approbations de plugin peuvent toujours être résolues via la même surface de bouton native Slack lorsque la demande atterrit déjà dans Slack et que le type d'id d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser les demandes via Slack.

Cela utilise la même surface de bouton d'approbation partagée que d'autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'expérience utilisateur (UX) d'approbation principale ; OpenClaw
ne doit inclure une commande `/approve` manuelle que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou que l'approbation manuelle est la seule solution possible.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un
approuveur est résolu. Définissez `enabled: false` pour désactiver explicitement Slack en tant que client d'approbation natif.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approuveurs sont résolus.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite Slack n'est nécessaire que si vous souhaitez remplacer les approuveurs, ajouter des filtres ou
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

Le transfert partagé `approvals.exec` est séparé. Utilisez-le uniquement lorsque les invites d'approbation d'exécution doivent également
être acheminées vers d'autres chats ou cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également
séparé ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugin lorsque ces demandes atterrissent déjà
dans Slack.

La commande `/approve` dans le même chat fonctionne également dans les canaux et les DM Slack qui prennent déjà en charge les commandes. Consultez [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages et les diffusions de fils sont mappées dans des événements système.
- Les événements d'ajout/suppression de réaction sont mappés dans des événements système.
- Les événements d'arrivée/départ de membre, de création/renommage de canal et d'ajout/suppression d'épingle sont mappés dans des événements système.
- `channel_id_changed` peut migrer les clés de configuration du canal lorsque `configWrites` est activé.
- Les métadonnées de sujet/objet du canal sont traitées comme un contexte non approuvé et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil de discussion et l'amorçage du contexte initial de l'historique du fil sont filtrés par les listes d'autorisation d'expéditeurs configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, libellés, valeurs du sélecteur et métadonnées `workflow_*`
  - événements `view_submission` et `view_closed` modaux avec des métadonnées de canal routées et des entrées de formulaire

## Pointeurs de référence de configuration

Référence principale :

- [Référence de configuration - Slack](/fr/gateway/configuration-reference#slack)

  Champs Slack à signal fort :
  - mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (obsolète : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de verre ; garder désactivé sauf en cas de besoin)
  - accès au canal : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - fil/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
  - ops/features : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Dépannage

<AccordionGroup>
  <Accordion title="Aucune réponse dans les channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - liste blanche des channels (`channels.slack.channels`)
    - `requireMention`
    - liste blanche `users` par channel

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
    - approbations d'appairage / entrées de liste blanche

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Mode Socket non connecté">
    Validez les jetons bot + app et l'activation du mode Socket dans les paramètres de l'application Slack.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais le runtime actuel n'a pas pu résoudre la valeur
    soutenue par SecretRef.

  </Accordion>

  <Accordion title="Mode HTTP ne recevant pas d'événements">
    Validez :

    - signing secret
    - chemin du webhook
    - URLs de requête Slack (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les
    instantanés de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre le signing secret soutenu par SecretRef.

    Les webhooks d'URL de requête enregistrés sont distribués via le même registre de gestionnaires partagé utilisé par la configuration du moniteur Slack, les événements Slack en mode HTTP continuent donc de passer par le chemin enregistré au lieu de renvoyer une erreur 404 après l'enregistrement réussi de la route.

  </Accordion>

<Accordion title="Téléchargements de fichiers avec des jetons de bot personnalisés">La fonction d'assistance `downloadFile` résout son jeton de bot à partir de la configuration d'exécution lorsqu'un appelant transmet `cfg` sans `token` explicite ni client préconstruit, ce qui permet de préserver les téléchargements de fichiers cfg-only en dehors du chemin d'exécution de l'action.</Accordion>

  <Accordion title="Les commandes natives/slash ne se déclenchent pas">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande native (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canal/utilisateur.

  </Accordion>
</AccordionGroup>

## Connexes

- [Appariement](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Dépannage](/fr/channels/troubleshooting)
- [Configuration](/fr/gateway/configuration)
- [Commandes slash](/fr/tools/slash-commands)

---
summary: "Configuration et comportement d'exécution de Slack (Mode Socket + URL de requête HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Prêt pour la production pour les DMs et les channels via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requêtes HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les DMs Slack sont par défaut en mode appariement.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canaux.
  </Card>
</CardGroup>

## Choisir entre le mode Socket et les URL de requête HTTP

Les deux modes de transport sont prêts pour la production et offrent une parité fonctionnelle pour la messagerie, les commandes slash, App Home et l'interactivité. Choisissez en fonction de la forme du déploiement, et non des fonctionnalités.

| Souci                                              | Mode Socket (par défaut)                                                                                               | URL de requête HTTP                                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| URL publique Gateway                               | Non requis                                                                                                             | Requis (DNS, TLS, proxy inverse ou tunnel)                                                                                               |
| Réseau sortant                                     | WSS sortant vers `wss-primary.slack.com` doit être joignable                                                           | Pas de WS sortant ; uniquement HTTPS entrant                                                                                             |
| Jetons nécessaires                                 | Jeton bot (`xoxb-...`) + Jeton de niveau application (`xapp-...`) avec `connections:write`                             | Jeton de bot (`xoxb-...`) + Secret de signature                                                                                          |
| Ordinateur de développement / derrière un pare-feu | Fonctionne tel quel                                                                                                    | Nécessite un tunnel public (ngrok, Cloudflare Tunnel, TailscaleGateway Funnel) ou une passerelle de staging                              |
| Mise à l'échelle horizontale                       | Une session Socket Mode par application par hôte ; plusieurs passerelles nécessitent des applications Slack distinctes | Gestionnaire POST sans état ; plusieurs répliques de Gateway peuvent partager une application derrière un répartiteur de charge          |
| Multi-compte sur une seule passerelle              | Pris en charge ; chaque compte ouvre son propre WS                                                                     | Pris en charge ; chaque compte a besoin d'un `webhookPath` unique (par défaut `/slack/events`) pour éviter les conflits d'enregistrement |
| Transport de commande slash                        | Acheminé via la connexion WS ; `slash_commands[].url` est ignoré                                                       | Slack envoie des POST à `slash_commands[].url` ; le champ est requis pour que la commande soit distribuée                                |
| Signature de la requête                            | Non utilisé (l'auth est le Jeton de Niveau Application)                                                                | Slack signe chaque requête ; OpenClaw vérifie avec `signingSecret`                                                                       |
| Récupération en cas de perte de connexion          | Le SDK Slack se reconnecte automatiquement ; le réglage du transport pong-timeout de la passerelle s'applique          | Aucune connexion persistante à perdre ; les nouvelles tentatives sont effectuées par requête depuis Slack                                |

<Note>
  **Choisissez le mode Socket** pour les hôtes Gateway uniques, les ordinateurs portables de développement et les réseaux sur site qui peuvent atteindre `*.slack.com` sortant mais ne peuvent pas accepter HTTPS entrant.

**Choisissez les URL de requête HTTP** lors de l'exécution de plusieurs répliques Gateway derrière un équilibreur de charge, lorsque le WSS sortant est bloqué mais le HTTPS entrant est autorisé, ou lorsque vous terminez déjà les webhooks Slack sur un proxy inverse.

</Note>

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (par défaut)">
    <Steps>
      <Step title="SlackCréer une nouvelle application Slack">
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des manifestes ci-dessous → **Next** → **Create**.

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

````json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
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
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im"
      ]
    }
  }
}
```Slack

        </CodeGroup>

        <Note>
          **Recommended** correspond à l'ensemble complet de fonctionnalités du plugin Slack intégré : App Home, commandes slash, fichiers, réactions, épingles, messages de groupe, et lectures d'émojis/groupes d'utilisateurs. Choisissez **Minimal** lorsque la stratégie de l'espace de travail restreint les portées — il couvre les messages directs, l'historique des canaux/groupes, les mentions et les commandes slash mais supprime les fichiers, les réactions, les épingles, les messages de groupe (`mpim:*`), `emoji:read`, et `usergroups:read`. Consultez la [Manifest and scope checklist](#manifest-and-scope-checklistSlack) pour la justification par portée et les options additives comme des commandes slash supplémentaires.
        </Note>

        Une fois que Slack a créé l'application :

        - **Basic Information → App-Level Tokens → Generate Token and Scopes** : ajoutez `connections:write`, enregistrez, copiez la valeur du `xapp-...`.
        - **Install App → Install to Workspace** : copiez le jeton OAuth Bot User `xoxb-...`OAuth.

      </Step>

      <Step title="OpenClawConfigurer OpenClaw">

        Configuration SecretRef recommandée :

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
cat > slack.socket.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: { source: "env", provider: "default", id: "SLACK_APP_TOKEN" },
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./slack.socket.patch.json5 --dry-run
openclaw config patch --file ./slack.socket.patch.json5
````

        Fallback de variable d'environnement (compte par défaut uniquement) :

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

  <Tab title="URL de requête HTTP">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des manifestes ci-dessous → remplacez `https://gateway-host.example.com/slack/events` par votre URL publique Gateway → **Next** → **Create**.

        <CodeGroup>

```json Recommended
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

```json Minimal
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack inclus ; **Minimal** supprime les fichiers, les réactions, les épingles, les  de groupe (`mpim:*`), `emoji:read` et `usergroups:read` pour les espaces de travail restreints. Consultez [Manifest and scope checklist](#manifest-and-scope-checklist) pour la justification par portée.
        </Note>

        <Info>
          Les trois champs d'URL (`slash_commands[].url`, `event_subscriptions.request_url` et `interactivity.request_url` / `message_menu_options_url`) pointent tous vers le même point de terminaison OpenClaw. Le schéma de manifeste de Slack exige qu'ils soient nommés séparément, mais OpenClaw route par type de payload, donc un seul `webhookPath` (par défaut `/slack/events`) suffit. Les commandes slash sans `slash_commands[].url` n'auront aucun effet en mode HTTP.
        </Info>

        Une fois que Slack a créé l'application :

        - **Basic Information → App Credentials** : copiez le **Signing Secret** pour la vérification des requêtes.
        - **Install App → Install to Workspace** : copiez le jeton OAuth d'utilisateur Bot `xoxb-...`.

      </Step>

      <Step title="Configurer OpenClaw">

        Configuration SecretRef recommandée :

```bash
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_SIGNING_SECRET=...
cat > slack.http.patch.json5 <<'JSON5'
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: { source: "env", provider: "default", id: "SLACK_BOT_TOKEN" },
      signingSecret: { source: "env", provider: "default", id: "SLACK_SIGNING_SECRET" },
      webhookPath: "/slack/events",
    },
  },
}
JSON5
openclaw config patch --file ./slack.http.patch.json5 --dry-run
openclaw config patch --file ./slack.http.patch.json5
```

        <Note>
        Utiliser des chemins de webhook uniques pour le HTTP multi-compte

        Donnez à chaque compte un `webhookPath` distinct (par défaut `/slack/events`) pour éviter que les enregistrements ne entrent en collision.
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

## Réglage du transport en mode Socket

OpenClaw définit le délai d'attente du pong du client Slack SDK à 15 secondes par défaut pour le mode Socket. Ne modifiez les paramètres de transport que si vous avez besoin d'un réglage spécifique à un espace de travail ou à un hôte :

```json5
{
  channels: {
    slack: {
      mode: "socket",
      socketMode: {
        clientPingTimeout: 20000,
        serverPingTimeout: 30000,
        pingPongLoggingEnabled: false,
      },
    },
  },
}
```

N'utilisez ceci que pour les espaces de travail en mode Socket qui enregistrent des dépassements de délai de pong/ping serveur websocket Slack ou qui s'exécutent sur des hôtes avec une famine connue de la boucle d'événements. `clientPingTimeout` est l'attente du pong après l'envoi d'un ping client par le SDK ; `serverPingTimeout` est l'attente des pings serveur Slack. Les messages et événements de l'application restent un état d'application, et non des signaux de vivacité du transport.

## Liste de contrôle du manifeste et des étendues

Le manifeste de base de l'application Slack est le même pour le mode Socket et les URL de requête HTTP. Seul le bloc `settings` (et la `url` de commande slash) diffère.

Manifeste de base (mode Socket par défaut) :

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": { "display_name": "OpenClaw", "always_online": true },
    "app_home": {
      "home_tab_enabled": true,
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
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

Pour le **mode URL de requête HTTP**, remplacez `settings` par la variante HTTP et ajoutez `url` à chaque commande slash. URL publique requise :

```json
{
  "features": {
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

### Paramètres de manifeste supplémentaires

Présentez différentes fonctionnalités qui étendent les valeurs par défaut ci-dessus.

Le manifeste par défaut active l'onglet **Accueil** de l'application Slack et s'abonne à `app_home_opened`. Lorsqu'un membre de l'espace de travail ouvre l'onglet Accueil, OpenClaw publie une vue Accueil par défaut sécurisée avec `views.publish` ; aucune charge utile de conversation ou configuration privée n'est incluse. L'onglet **Messages** reste activé pour les DM Slack.

<AccordionGroup>
  <Accordion title="Commandes slash natives facultatives">

    Plusieurs [commandes slash natives](#commands-and-slash-behavior) peuvent être utilisées au lieu d'une seule commande configurée avec nuance :

    - Utilisez `/agentstatus` au lieu de `/status` car la commande `/status` est réservée.
    - Pas plus de 25 commandes slash ne peuvent être disponibles à la fois.

    Remplacez votre section `features.slash_commands` existante par un sous-ensemble de [commandes disponibles](/fr/tools/slash-commands#command-list) :

    <Tabs>
      <Tab title="Mode Socket (par défaut)">

```json
{
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
      "description": "List providers/models",
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
      "command": "/side",
      "description": "Ask a side question without changing session context",
      "usage_hint": "<question>"
    },
    {
      "command": "/usage",
      "description": "Control the usage footer or show cost summary",
      "usage_hint": "off|tokens|full|cost"
    }
  ]
}
```

      </Tab>
      <Tab title="URL de requête HTTP">
        Utilisez la même liste `slash_commands` que pour le Mode Socket ci-dessus, et ajoutez `"url": "https://gateway-host.example.com/slack/events"` à chaque entrée. Exemple :

```json
{
  "slash_commands": [
    {
      "command": "/new",
      "description": "Start a new session",
      "usage_hint": "[model]",
      "url": "https://gateway-host.example.com/slack/events"
    },
    {
      "command": "/help",
      "description": "Show the short help summary",
      "url": "https://gateway-host.example.com/slack/events"
    }
  ]
}
```

        Répétez cette valeur `url` pour chaque commande de la liste.

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="Portées d'auteur facultatives (opérations d'écriture)">
    Ajoutez la portée de bot `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité par défaut de l'application Slack.

    Si vous utilisez une icône emoji, Slack attend une syntaxe `:emoji_name:`.

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
- Les jetons de configuration remplacent le repli d'environnement.
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` s'applique uniquement au compte par défaut.
- `userToken` (`xoxp-...`) est uniquement configurable (pas de repli d'environnement) et par défaut un comportement en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané d'état :

- L'inspection du compte Slack suit les champs `*Source` et `*Status`
  par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- L'état est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef
  ou une autre source de secret non en ligne, mais que le chemin de commande/runtime actuel
  n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la
  paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être préféré lorsqu'il est configuré. Pour les écritures, le jeton bot reste préféré ; les écritures par jeton utilisateur sont uniquement autorisées lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Actions et portes

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils actuels de Slack :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message actuelles de Slack incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`. `download-file` accepte les ID de fichier Slack affichés dans les espaces réservés de fichiers entrants et renvoie des aperçus d'image pour les images ou des métadonnées de fichier local pour les autres types de fichiers.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.slack.dmPolicy` contrôle l'accès aux DM. `channels.slack.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DM.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.slack.allowFrom` inclue `"*"`)
    - `disabled`

    Indicateurs de DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (hérité)
    - `dm.groupEnabled` (faux par défaut pour les DM de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM optionnelle)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas définie.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'ancien `channels.slack.dm.policy` et `channels.slack.dm.allowFrom` sont toujours lus pour la compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    L'appariement dans les DM utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Stratégie de canal">
    `channels.slack.groupPolicy` contrôle la gestion des canaux :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des canaux se trouve sous `channels.slack.channels` et **doit utiliser des IDs de canal Slack stables** (par exemple `C12345678`) comme clés de configuration.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration via variables d'environnement uniquement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des canaux et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de canal non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des canaux privilégient l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Les clés basées sur le nom (`#channel-name` ou `channel-name`) ne correspondent **pas** sous `groupPolicy: "allowlist"`. La recherche de canal privilégie l'ID par défaut, donc une clé basée sur le nom ne routera jamais avec succès et tous les messages de ce canal seront bloqués silencieusement. Cela diffère de `groupPolicy: "open"`, où la clé de canal n'est pas requise pour le routage et une clé basée sur le nom semble fonctionner.

    Utilisez toujours l'ID de canal Slack comme clé. Pour le trouver : cliquez avec le bouton droit sur le canal dans Slack → **Copy link** — l'ID (`C...`) apparaît à la fin de l'URL.

    Correct :

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            C12345678: { allow: true, requireMention: true },
          },
        },
      },
    }
    ```

    Incorrect (bloqué silencieusement sous `groupPolicy: "allowlist"`) :

    ```json5
    {
      channels: {
        slack: {
          groupPolicy: "allowlist",
          channels: {
            "#eng-my-channel": { allow: true, requireMention: true },
          },
        },
      },
    }
    ```
    </Warning>

  </Tab>

  <Tab title="Mentions and channel users">
    Channel messages are mention-gated by default.

    Mention sources:

    - explicit app mention (`<@botId>`)
    - Slack user-group mention (`<!subteam^S...>`) when the bot user is a member of that user group; requires `usergroups:read`
    - mention regex patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - implicit reply-to-bot thread behavior (disabled when `thread.requireExplicitMention` is `true`)

    Per-channel controls (`channels.slack.channels.<id>`; names only via startup resolution or `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` key format: `id:`, `e164:`, `username:`, `name:`, or `"*"` wildcard
      (legacy unprefixed keys still map to `id:` only)

    `allowBots` is conservative for channels and private channels: bot-authored room messages are accepted only when the sending bot is explicitly listed in that room's `users` allowlist, or when at least one explicit Slack owner ID from `channels.slack.allowFrom` is currently a room member. Wildcards and display-name owner entries do not satisfy owner presence. Owner presence uses Slack `conversations.members`; make sure the app has the matching read scope for the room type (`channels:read` for public channels, `groups:read` for private channels). If the member lookup fails, OpenClaw drops the bot-authored room message.

  </Tab>
</Tabs>

## Threads, sessions et balises de réponse

- Les MDs sont routés en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Les liaisons de routage Slack acceptent les ID de pairs bruts ainsi que les formes de cibles Slack telles que `channel:C12345678`, `user:U12345678` et `<@U12345678>`.
- Avec le `session.dmScope=main` par défaut, les MDs Slack sont réduits à la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses dans les fils peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- Dans les canaux où OpenClaw gère les messages de niveau supérieur sans nécessiter de mention explicite, le `replyToMode` non-`off` achemine chaque racine gérée vers `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` afin que le fil Slack visible corresponde à une session OpenClaw dès le premier tour.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; celle de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle combien de messages de fil existants sont récupérés lorsqu'une nouvelle session de fil démarre (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fil afin que le bot ne réponde qu'aux mentions explicites `@bot` à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil où le bot participe contournent le filtrage `requireMention`.

Contrôles du fil de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les chats directs : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

<Note>`replyToMode="off"`Slack désactive **tous** les fils de discussion de réponse dans Slack, y compris les balises `[[reply_to_*]]`Telegram explicites. Cela diffère de Telegram, où les balises explicites sont toujours respectées en mode `"off"`SlackTelegram. Les fils Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles en ligne.</Note>

## Réactions d'accusé de réception

`ackReaction`OpenClaw envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- secours pour l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des codes courts (par exemple Slack`"eyes"`).
- Utilisez `""`Slack pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par blocs.
- `progress` : afficher le texte d'état de progression lors de la génération, puis envoyer le texte final.
- `streaming.preview.toolProgress` : lorsque l'aperçu brouillon est actif, acheminer les mises à jour d'outil/progression dans le même message d'aperçu modifié (par défaut : `true`). Définir `false` pour conserver des messages d'outil/progression séparés.
- `streaming.preview.commandText` / `streaming.progress.commandText` : définir sur `status` pour conserver des lignes de progression d'outil compactes tout en masquant le texte de commande/exec brut (par défaut : `raw`).

Masquer le texte de commande/exec brut tout en conservant les lignes de progression compactes :

```json
{
  "channels": {
    "slack": {
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

`channels.slack.streaming.nativeTransport`Slack contrôle la diffusion de texte native de Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que la diffusion de texte native et le statut du fil de discussion de l'assistant Slack apparaissent. La sélection du fil suit toujours Slack`replyToMode`.
- Les racines de niveau supérieur des canaux, des discussions de groupe et des DM peuvent toujours utiliser l'aperçu de brouillon normal lorsque la diffusion native n'est pas disponible ou qu'aucun fil de discussion de réponse n'existe.
- Les DM de niveau supérieur de Slack restent hors fil par défaut, ils n'affichent donc pas l'aperçu de flux/état natif de style fil de Slack ; OpenClaw publie et modifie un aperçu de brouillon dans le DM à la place.
- Les médias et les charges utiles non textuelles reviennent à la livraison normale.
- Les finales médias/erreur annulent les modifications d'aperçu en attente ; les finales texte/bloc éligibles ne sont envoyées que lorsqu'elles peuvent modifier l'aperçu en place.
- Si la diffusion échoue en cours de réponse, OpenClaw revient à la livraison normale pour les charges utiles restantes.

Utiliser l'aperçu de brouillon au lieu de la diffusion de texte native de Slack :

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

- `channels.slack.streamMode` (`replace | status_final | append`) est un alias d'exécution hérité pour `channels.slack.streaming.mode`.
- Le booléen `channels.slack.streaming` est un alias d'exécution hérité pour `channels.slack.streaming.mode` et `channels.slack.streaming.nativeTransport`.
- Le `channels.slack.nativeStreaming` hérité est un alias d'exécution pour `channels.slack.streaming.nativeTransport`.
- Exécutez `openclaw doctor --fix` pour réécrire la configuration de diffusion de Slack persistante vers les clés canoniques.

## Solution de repli pour la réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant de Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. C'est surtout utile en dehors des réponses en fil, qui utilisent un indicateur de statut "est en train d'écrire..." par défaut.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est de type « best-effort » et un nettoyage est tenté automatiquement après la fin de la réponse ou du chemin d'échec.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes"Slack>
    Les pièces jointes de fichiers Slack sont téléchargées à partir d'URL privées hébergées par Slack (flux de requête authentifié par jeton) et écrites dans le magasin de médias lorsque le téléchargement réussit et que les limites de taille le permettent. Les espaces réservés de fichiers incluent l'Slack `fileId` afin que les agents puissent récupérer le fichier d'origine avec `download-file`.

    Les téléchargements utilisent des délais d'inactivité et totaux limités. Si la récupération du fichier Slack stagne ou échoue, OpenClaw continue de traiter le message et revient à l'espace réservé du fichier.

    La limite de taille entrante en cours d'exécution est `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texte et fichiers sortants">
    - les segments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut)
    - `channels.slack.chunkMode="newline"` active le fractionnement paragraphe en premier
    - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fils de discussion (`thread_ts`)
    - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsqu'elle est configurée ; sinon, les envois de canal utilisent les valeurs par défaut de type MIME du pipeline média

  </Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack contenant uniquement du texte/blocs peuvent être publiés directement sur les ID d'utilisateur ; les téléchargements de fichiers et les envois threadés ouvrent d'abord le DM via les API de conversation Slack car ces chemins nécessitent un ID de conversation concret.

  </Accordion>
</AccordionGroup>

## Commandes et comportement slash

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

Les menus d'arguments natifs utilisent une stratégie de rendu adaptatif qui affiche une fenêtre modale de confirmation avant d'envoyer la valeur de l'option sélectionnée :

- jusqu'à 5 options : blocs de boutons
- 6-100 options : menu de sélection statique
- plus de 100 options : sélection externe avec filtrage asynchrone des options lorsque les gestionnaires d'options d'interactivité sont disponibles
- limites Slack dépassées : les valeurs d'option encodées reviennent aux boutons

```txt
/think
```

Les sessions de commande slash utilisent des clés isolées comme `agent:<agentId>:slack:slash:<userId>` et routent toujours les exécutions de commandes vers la session de conversation cible en utilisant `CommandTargetSessionKey`.

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

Ces directives sont compilées en Slack Block Kit et routent les clics ou les sélections via le chemin d'événement d'interaction Slack existant.

Notes :

- Il s'agit d'une interface utilisateur spécifique à Slack. Les autres canaux ne traduisent pas les directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non des valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassent les limites du Slack Block Kit, OpenClaw revient à la réponse textuelle originale au lieu d'envoyer une charge utile de blocs non valide.

## Approbations d'exécution dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et des interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations d'exécution utilisent `channels.slack.execApprovals.*` pour le routage natif DM/channel.
- Les approbations de plugins peuvent toujours être résolues via la même surface de boutons native de Slack lorsque la demande atterrit déjà sur Slack et que le type d'id d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser des demandes via Slack.

Ceci utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique que les approbations par chat ne sont pas disponibles ou que l'approbation manuelle est la seule solution possible.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un approbateur résout. Définissez `enabled: false` pour désactiver explicitement Slack en tant que client d'approbation natif. Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approbateurs résolvent.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite Slack n'est nécessaire que si vous souhaitez remplacer les approbateurs, ajouter des filtres ou opter pour la livraison via le chat d'origine :

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

Le transfert partagé `approvals.exec` est distinct. Utilisez-le uniquement lorsque les invites d'approbation d'exécution doivent également être acheminées vers d'autres chats ou des cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également distinct ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugins lorsque ces demandes atterrissent déjà dans Slack.

Le `/approve` dans le même chat fonctionne également dans les channels Slack et les DMs qui prennent déjà en charge les commandes. Voir [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages sont mappées en événements système.
- Les diffusions de fils (réponses de fil "Envoyer également au channel") sont traitées comme des messages utilisateur normaux.
- Les événements d'ajout/suppression de réactions sont mappés en événements système.
- Les événements d'arrivée/départ de membres, de création/de renommage de channel et d'ajout/suppression d'épingles sont mappés en événements système.
- `channel_id_changed` peut migrer les clés de configuration de channel lorsque `configWrites` est activé.
- Les métadonnées de sujet/d'objectif du channel sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil et l'amorçage initial du contexte de l'historique du fil sont filtrés par les listes d'autorisation d'expéditeurs configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements `view_submission` et `view_closed` modaux avec des métadonnées de channel acheminées et des entrées de formulaire

## Référence de configuration

Référence principale : [Configuration reference - Slack](/fr/gateway/config-channels#slack).

<Accordion title="Champs à signal fort Slack">

- mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (ancien : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de glace ; désactiver sauf en cas de besoin)
- accès channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- fil/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- ops/fonctionnalités : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponses dans les channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`) — **les clés doivent être des IDs de channel** (`C12345678`), et non des noms (`#channel-name`). Les clés basées sur le nom échouent silencieusement sous `groupPolicy: "allowlist"` car le routage des channels est basé sur l'ID par défaut. Pour trouver un ID : clic droit sur le channel dans Slack → **Copy link** — la valeur `C...` à la fin de l'URL est l'ID du channel.
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
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - les approbations de pairing / entrées de l'allowlist
    - Événements DM de Slack Assistant : les journaux détaillés mentionnant `drop message_changed`
      signifient généralement que Slack a envoyé un événement de fil Assistant modifié sans
      expéditeur humain récupérable dans les métadonnées du message

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
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - `webhookPath` unique par compte HTTP

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les
    instantanés de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre le signing secret sauvegardé par SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention de :

    - utiliser le mode de commande natif (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canaux/utilisateurs.

  </Accordion>
</AccordionGroup>

## Référence de vision des pièces jointes

Slack peut joindre des médias téléchargés au tour de l'agent lorsque les téléchargements de fichiers Slack réussissent et que les limites de taille le permettent. Les fichiers image peuvent être transmis via le chemin de compréhension des médias ou directement à un modèle de réponse capable de vision ; les autres fichiers sont conservés en tant que contexte de fichier téléchargeable plutôt que traités comme une entrée d'image.

### Types de médias pris en charge

| Type de média                  | Source                       | Comportement actuel                                                                                                  | Notes                                                                                       |
| ------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Images JPEG / PNG / GIF / WebP | URL de fichier Slack         | Téléchargé et joint au tour pour un traitement capable de vision                                                     | Limite par fichier : `channels.slack.mediaMaxMb` (par défaut 20 Mo)                         |
| Fichiers PDF                   | URL de fichier Slack         | Téléchargé et exposé en tant que contexte de fichier pour des outils tels que `download-file` ou `pdf`               | Slack entrant ne convertit pas automatiquement les PDF en entrée de vision d'image          |
| Autres fichiers                | URL de fichier Slack         | Téléchargé si possible et exposé en tant que contexte de fichier                                                     | Les fichiers binaires ne sont pas traités comme une entrée d'image                          |
| Réponses de fil de discussion  | Fichiers d'initiateur de fil | Les fichiers de message racine peuvent être hydratés en tant que contexte lorsque la réponse n'a pas de média direct | Les initiateurs composés uniquement de fichiers utilisent un espace réservé de pièce jointe |
| Messages multi-images          | Plusieurs fichiers Slack     | Chaque fichier est évalué indépendamment                                                                             | Le traitement Slack est plafonné à huit fichiers par message                                |

### Pipeline entrant

Lorsqu'un message Slack avec des pièces jointes de fichiers arrive :

1. OpenClaw télécharge le fichier depuis l'URL privée de Slack en utilisant le jeton bot (`xoxb-...`).
2. Le fichier est écrit dans le média store en cas de succès.
3. Les chemins des médias téléchargés et les types de contenu sont ajoutés au contexte entrant.
4. Les chemins de modèle/outil compatibles avec les images peuvent utiliser les pièces jointes d'images de ce contexte.
5. Les fichiers non-image restent disponibles sous forme de métadonnées de fichier ou de références de média pour les outils qui peuvent les gérer.

### Héritage des pièces jointes à la racine du fil

Lorsqu'un message arrive dans un fil (a un `thread_ts` parent) :

- Si la réponse elle-même n'a pas de média direct et que le message racine inclus contient des fichiers, Slack peut hydrater les fichiers racines en tant que contexte de début de fil.
- Les pièces jointes de réponse directe ont la priorité sur les pièces jointes du message racine.
- Un message racine qui ne contient que des fichiers et pas de texte est représenté par un espace réservé de pièce jointe afin que le repli puisse toujours inclure ses fichiers.

### Gestion des pièces jointes multiples

Lorsqu'un seul message Slack contient plusieurs pièces jointes de fichiers :

- Chaque pièce jointe est traitée indépendamment via le pipeline média.
- Les références de média téléchargées sont agrégées dans le contexte du message.
- L'ordre de traitement suit l'ordre des fichiers de Slack dans la charge utile de l'événement.
- Un échec du téléchargement d'une pièce jointe ne bloque pas les autres.

### Limites de taille, de téléchargement et de modèle

- **Limite de taille** : 20 Mo par fichier par défaut. Configurable via `channels.slack.mediaMaxMb`.
- **Échecs de téléchargement** : Les fichiers que Slack ne peut pas servir, les URL expirées, les fichiers inaccessibles, les fichiers trop volumineux et les réponses HTML d'authentisation/connexion Slack sont ignorés au lieu d'être signalés comme des formats non pris en charge.
- **Modèle de vision** : L'analyse d'image utilise le modèle de réponse actif lorsqu'il prend en charge la vision, ou le modèle d'image configuré à `agents.defaults.imageModel`.

### Limites connues

| Scénario                                      | Comportement actuel                                                                                                       | Solution de contournement                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| URL de fichier Slack expirée                  | Fichier ignoré ; aucune erreur affichée                                                                                   | Télécharger à nouveau le fichier dans Slack                                                        |
| Modèle de vision non configuré                | Les pièces jointes d'images sont stockées sous forme de références de média, mais ne sont pas analysées en tant qu'images | Configurez `agents.defaults.imageModel` ou utilisez un modèle de réponse compatible avec la vision |
| Images très volumineuses (> 20 Mo par défaut) | Ignorées en raison de la limite de taille                                                                                 | Augmentez `channels.slack.mediaMaxMb` si Slack le permet                                           |
| Pièces jointes transférées/partagées          | Le texte et les médias image/fichier hébergés par Slack sont sur la base du meilleur effort                               | Re-partager directement dans le fil OpenClaw                                                       |
| Pièces jointes PDF                            | Stockés en tant que contexte de fichier/média, pas acheminés automatiquement via la vision par image                      | Utilisez `download-file` pour les métadonnées de fichier ou l'outil `pdf` pour l'analyse de PDF    |

### Documentation connexe

- [Pipeline de compréhension des médias](/fr/nodes/media-understanding)
- [Outil PDF](/fr/tools/pdf)
- Epic : [#51349](https://github.com/openclaw/openclaw/issues/51349) — Activation de la vision des pièces jointes Slack
- Tests de régression : [#51353](https://github.com/openclaw/openclaw/issues/51353)
- Vérification en direct : [#51354](https://github.com/openclaw/openclaw/issues/51354)

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Slack à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement des canaux et des DM de groupe.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminer les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Mise en page et priorité de la configuration.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Catalogue et comportement des commandes.
  </Card>
</CardGroup>

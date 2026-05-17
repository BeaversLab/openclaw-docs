---
summary: "Configuration et comportement d'exécution de Slack (Socket Mode + URL de requêtes HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Prêt pour la production pour les DMs et les channels via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requêtes HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les DMs Slack sont en mode appairage par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multicanaux.
  </Card>
</CardGroup>

## Choisir entre le mode Socket et les URL de requête HTTP

Les deux modes de transport sont prêts pour la production et offrent une parité fonctionnelle pour la messagerie, les commandes slash, App Home et l'interactivité. Choisissez en fonction de la forme du déploiement, et non des fonctionnalités.

| Souci                                              | Mode Socket (par défaut)                                                                                               | URL de requête HTTP                                                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| URL publique Gateway                               | Non requis                                                                                                             | Requis (DNS, TLS, proxy inverse ou tunnel)                                                                                                  |
| Réseau sortant                                     | WSS sortant vers `wss-primary.slack.com` doit être accessible                                                          | Pas de WS sortant ; uniquement HTTPS entrant                                                                                                |
| Jetons nécessaires                                 | Jeton de bot (`xoxb-...`) + Jeton de niveau d'application (`xapp-...`) avec `connections:write`                        | Jeton de bot (`xoxb-...`) + Secret de signature                                                                                             |
| Ordinateur de développement / derrière un pare-feu | Fonctionne tel quel                                                                                                    | Nécessite un tunnel public (ngrok, Cloudflare Tunnel, TailscaleGateway Funnel) ou une passerelle de staging                                 |
| Mise à l'échelle horizontale                       | Une session Socket Mode par application par hôte ; plusieurs passerelles nécessitent des applications Slack distinctes | Gestionnaire POST sans état ; plusieurs répliques de Gateway peuvent partager une application derrière un répartiteur de charge             |
| Multi-compte sur une seule passerelle              | Pris en charge ; chaque compte ouvre son propre WS                                                                     | Pris en charge ; chaque compte a besoin d'un `webhookPath` unique (par défaut `/slack/events`) pour éviter les collisions d'enregistrements |
| Transport de commande slash                        | Livré via la connexion WS ; `slash_commands[].url` est ignoré                                                          | Slack effectue des POST sur `slash_commands[].url` ; le champ est requis pour l'envoi de la commande                                        |
| Signature de la requête                            | Non utilisé (l'auth est le Jeton de Niveau Application)                                                                | Slack signe chaque requête ; OpenClaw vérifie avec `signingSecret`                                                                          |
| Récupération en cas de perte de connexion          | Le SDK Slack se reconnecte automatiquement ; le réglage du transport pong-timeout de la passerelle s'applique          | Aucune connexion persistante à perdre ; les nouvelles tentatives sont effectuées par requête depuis Slack                                   |

<Note>
  **Choisissez le mode Socket** pour les hôtes Gateway uniques, les ordinateurs portables de développement et les réseaux sur site qui peuvent atteindre `*.slack.com` en sortie mais ne peuvent pas accepter le HTTPS entrant.

**Choisissez les URL de requête HTTP** lorsque vous exécutez plusieurs répliques Gateway derrière un équilibreur de charge, lorsque le WSS sortant est bloqué mais que le HTTPS entrant est autorisé, ou lorsque vous terminez déjà les webhooks Slack sur un proxy inverse.

</Note>

## Installer

Installez Slack avant de configurer le channel :

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` enregistre et active le plugin. Le plugin ne fait rien tant que vous ne configurez pas les paramètres de l'application Slack et du canal ci-dessous. Consultez [Plugins](/fr/tools/plugin) pour connaître le comportement général des plugins et les règles d'installation.

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (par défaut)">
    <Steps>
      <Step title="Créer une nouvelle application Slack">
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des manifests ci-dessous → **Next** → **Create**.

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
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "groups:history", "groups:read", "im:history", "im:read", "im:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack : App Home, commandes slash, fichiers, réactions, épingles, messages de groupe, et lectures d'émojis/groupes d'utilisateurs. Choisissez **Minimal** lorsque la stratégie de l'espace de travail restreint les portées — il couvre les messages privés, l'historique des canaux/groupes, les mentions et les commandes slash, mais supprime les fichiers, les réactions, les épingles, les messages de groupe (`mpim:*`), `emoji:read`, et `usergroups:read`. Consultez [Manifest and scope checklist](#manifest-and-scope-checklist) pour la justification par portée et les options additives comme les commandes slash supplémentaires.
        </Note>

        Une fois que Slack a créé l'application :

        - **Basic Information → App-Level Tokens → Generate Token and Scopes** : ajoutez `connections:write`, enregistrez, copiez la valeur du `xapp-...``xoxb-...`.
        - **Install App → Install to Workspace** : copiez le jeton Bot User OAuth de l'application.

      </Step>

      <Step title="Configurer OpenClaw">

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
```

        Fallback Env (compte par défaut uniquement) :

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
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack ; **Minimal** supprime les fichiers, les réactions, les épingles, les DM de groupe (`mpim:*`), `emoji:read` et `usergroups:read` pour les espaces de travail restreints. Consultez la [Manifest and scope checklist](#manifest-and-scope-checklist) pour la justification par portée.
        </Note>

        <Info>
          Les trois champs d'URL (`slash_commands[].url`, `event_subscriptions.request_url` et `interactivity.request_url` / `message_menu_options_url`) pointent tous vers le même point de terminaison OpenClaw. Le schéma de manifeste de Slack exige qu'ils soient nommés séparément, mais OpenClaw achemine par type de payload, un seul `webhookPath` (par défaut `/slack/events`) suffit donc. Les commandes slash sans `slash_commands[].url` n'auront aucun effet silencieux en mode HTTP.
        </Info>

        Une fois Slack l'application créée :

        - **Basic Information → App Credentials** : copiez la **Signing Secret** pour la vérification des requêtes.
        - **Install App → Install to Workspace** : copiez le jeton Bot User OAuth `xoxb-...`.

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
        Utilisez des chemins de webhook uniques pour le HTTP multi-compte

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

N'utilisez ceci que pour les espaces de travail en mode Socket qui enregistrent des délais d'attente de pong/ping-serveur du websocket Slack ou qui s'exécutent sur des hôtes présentant une famine connue de la boucle d'événements. `clientPingTimeout` est l'attente du pong après l'envoi d'un ping client par le SDK ; `serverPingTimeout` est l'attente des pings du serveur Slack. Les messages et événements de l'application restent l'état de l'application, et non des signaux de vivacité du transport.

## Liste de contrôle du manifeste et des portées

Le manifeste de base de l'application Slack est le même pour le mode Socket et les URL de requête HTTP. Seul le bloc `settings` (et la commande slash `url`) diffère.

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

Activez différentes fonctionnalités qui étendent les paramètres par défaut ci-dessus.

Le manifeste par défaut active l'onglet **Home** de l'App Home Slack et s'abonne à `app_home_opened`. Lorsqu'un membre de l'espace de travail ouvre l'onglet Home, OpenClaw publie une vue Home par défaut sécurisée avec `views.publish` ; aucune charge utile de conversation ou de configuration privée n'est incluse. L'onglet **Messages** reste activé pour les Slack DMs.

<AccordionGroup>
  <Accordion title="Commandes natives de barre oblique facultatives">

    Plusieurs [commandes natives de barre oblique](#commands-and-slash-behavior) peuvent être utilisées au lieu d'une seule commande configurée avec nuance :

    - Utilisez `/agentstatus` au lieu de `/status` car la commande `/status` est réservée.
    - Pas plus de 25 commandes de barre oblique ne peuvent être disponibles à la fois.

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
      <Tab title="URLs de requête HTTP">
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
  <Accordion title="Optional authorship scopes (write operations)">
    Ajoutez la portée `chat:write.customize` du bot si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité de l'application Slack par défaut.

    Si vous utilisez une icône emoji, Slack attend une syntaxe `:emoji_name:`.

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
    Si vous configurez `channels.slack.userToken`, les étendues de lecture typiques sont :

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
  en clair ou des objets SecretRef.
- Les jetons de configuration remplacent le repli d'env (env fallback).
- Le repli d'env `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` s'applique uniquement au compte par défaut.
- `userToken` (`xoxp-...`) est configuration uniquement (pas de repli d'env) et par défaut à un comportement en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané de statut :

- L'inspection des comptes Slack suit les champs `*Source` et `*Status` par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- L'état est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef ou une autre source de secret non en ligne, mais que le chemin de commande/runtime actuel n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être privilégié lorsqu'il est configuré. Pour les écritures, le jeton bot reste privilégié ; les écritures par jeton utilisateur sont autorisées uniquement lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Actions et portes

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils Slack actuels :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions actuelles des messages Slack incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`. `download-file` accepte les ID de fichiers Slack affichés dans les espaces réservés de fichiers entrants et renvoie des aperçus d'images pour les images ou des métadonnées de fichiers locaux pour les autres types de fichiers.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` contrôle l'accès aux DMs. `channels.slack.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DMs.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.slack.allowFrom` inclue `"*"`)
    - `disabled`

    Indicateurs (flags) DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (hérité)
    - `dm.groupEnabled` (faux par défaut pour les DMs de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'ancien `channels.slack.dm.policy` et `channels.slack.dm.allowFrom` sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    L'appairage dans les DMs utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et **doit utiliser des IDs de channel Slack stables** (par exemple `C12345678`) comme clés de configuration.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration uniquement via variables d'environnement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des channels et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de channel non résolues sont conservées telles qu'elles sont configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe du nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Les clés basées sur le nom (`#channel-name` ou `channel-name`) ne correspondent **pas** sous `groupPolicy: "allowlist"`. La recherche de channel est basée sur l'ID par défaut, donc une clé basée sur le nom ne réussira jamais le routage et tous les messages de ce channel seront bloqués silencieusement. Cela diffère de `groupPolicy: "open"`, où la clé de channel n'est pas requise pour le routage et une clé basée sur le nom semble fonctionner.

    Utilisez toujours l'ID du channel Slack comme clé. Pour le trouver : faites un clic droit sur le channel dans Slack → **Copy link** — l'ID (`C...`) apparaît à la fin de l'URL.

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
    Les messages de channel sont soumis à des mentions par défaut.

    Sources des mentions :

    - mention explicite de l'application (`<@botId>`)
    - mention de groupe d'utilisateurs Slack (`<!subteam^S...>`) lorsque l'utilisateur bot est membre de ce groupe d'utilisateurs ; nécessite `usergroups:read`
    - modèles de regex de mention (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par channel (`channels.slack.channels.<id>` ; noms uniquement via résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (allowlist)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `channel:`, `id:`, `e164:`, `username:`, `name:` ou caractère générique `"*"`
      (les clés héritées sans préfixe mappent toujours uniquement vers `id:`)

    `allowBots` est conservateur pour les channels et les channels privés : les messages de salle rédigés par le bot sont acceptés uniquement lorsque le bot émetteur est explicitement listé dans la liste d'autorisation `users` de cette salle, ou lorsqu'au moins un ID de propriétaire Slack explicite provenant de `channels.slack.allowFrom` est actuellement membre de la salle. Les caractères génériques et les entrées de propriétaire par nom d'affichage ne satisfont pas la présence du propriétaire. La présence du propriétaire utilise Slack `conversations.members` ; assurez-vous que l'application dispose de la portée de lecture correspondante pour le type de salle (`channels:read` pour les channels publics, `groups:read` pour les channels privés). Si la recherche de membre échoue, OpenClaw abandonne le message de salle rédigé par le bot.

  </Tab>
</Tabs>

## Fils de discussion, sessions et balises de réponse

- Les DMs sont routés en tant que `direct` ; les canaux en tant que `channel` ; les MPIM en tant que `group`.
- Les liaisons de routage Slack acceptent les ID de homologues bruts ainsi que les formes de cible Slack telles que `channel:C12345678`, `user:U12345678` et `<@U12345678>`.
- Avec le `session.dmScope=main` par défaut, les DMs Slack sont réduits à la session principale de l'agent.
- Sessions de canal : `agent:<agentId>:slack:channel:<channelId>`.
- Les réponses en fil de discussion peuvent créer des suffixes de session de fil (`:thread:<threadTs>`) le cas échéant.
- Dans les canaux où OpenClaw gère les messages de premier niveau sans nécessiter de mention explicite, les routes non-`off` `replyToMode` chaque racine gérée dans `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` afin que le fil de discussion Slack visible corresponde à une session OpenClaw à partir du premier tour.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; celle de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle le nombre de messages de fil de discussion existants récupérés lors du démarrage d'une nouvelle session de fil (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fils de discussion afin que le bot ne réponde qu'aux mentions `@bot` explicites à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil où le bot participe contournent le filtrage `requireMention`.

Contrôles des fils de discussion de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les conversations directes : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Pour des réponses explicites aux fils de discussion Slack depuis l'outil `message`, définissez `replyBroadcast: true` avec `action: "send"` et `threadId` ou `replyTo` pour demander à Slack de diffuser également la réponse au fil dans le canal parent. Cela correspond au paramètre `chat.postMessage` `reply_broadcast` de Slack et n'est pris en charge que pour les envois de texte ou de Block Kit, et non pour les téléchargements de médias.

Lorsqu'un appel de `message` tool s'exécute dans un fil de discussion Slack et cible le même channel, OpenClaw hérite normalement du fil de discussion Slack actuel selon `replyToMode`. Définissez `topLevel: true` sur `action: "send"` ou `action: "upload-file"` pour forcer plutôt un nouveau message de canal parent. `threadId: null` est accepté en tant qu'option de refus de même niveau supérieur.

<Note>`replyToMode="off"` désactive **tous** les fils de discussion de réponse dans Slack, y compris les balises `[[reply_to_*]]` explicites. Cela diffère de Telegram, où les balises explicites sont toujours respectées en mode `"off"`. Les fils de discussion Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles en ligne.</Note>

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de repli d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Remarques :

- Slack s'attend à des codes courts (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.
- `streaming.preview.toolProgress` : lorsque l'aperçu brouillon est actif, acheminer les mises à jour d'outil/progression dans le même message d'aperçu modifié (par défaut : `true`). Définissez `false` pour conserver des messages d'outil/progression distincts.
- `streaming.preview.commandText` / `streaming.progress.commandText` : définissez sur `status` pour conserver les lignes de progression compactes des outils tout en masquant le texte de commande/exécution brut (par défaut : `raw`).

Masquer le texte de commande/exécution brut tout en conservant les lignes de progression compactes :

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

`channels.slack.streaming.nativeTransport` contrôle le flux de texte natif Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que le flux de texte natif et le statut du fil de discussion de l'assistant Slack apparaissent. La sélection du fil de discussion suit toujours `replyToMode`.
- Les racines des canaux, des discussions de groupe et des DM de niveau supérieur peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible ou qu'aucun fil de discussion de réponse n'existe.
- Les Slack DM de premier niveau restent hors fil par défaut, ils n'affichent donc pas l'aperçu natif de flux/état de style fil de Slack ; OpenClaw publie et modifie un aperçu de brouillon dans le DM à la place.
- Les médias et les charges utiles non textuelles reviennent à une livraison normale.
- Les versions finales des médias/erreurs annulent les modifications d'aperçu en attente ; les versions finales de texte/bloc éligibles sont envoyées uniquement lorsqu'elles peuvent modifier l'aperçu sur place.
- Si le streaming échoue en cours de réponse, OpenClaw revient à une livraison normale pour les charges utiles restantes.

Utiliser l'aperçu de brouillon au lieu du streaming de texte natif de Slack :

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
- boolean `channels.slack.streaming` est un alias d'exécution hérité pour `channels.slack.streaming.mode` et `channels.slack.streaming.nativeTransport`.
- legacy `channels.slack.nativeStreaming` est un alias d'exécution pour `channels.slack.streaming.nativeTransport`.
- Exécutez `openclaw doctor --fix` pour réécrire la configuration de streaming Slack persistante avec les clés canoniques.

## Solution de repli de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message Slack entrant pendant que OpenClaw traite une réponse, puis la supprime lorsque l'exécution est terminée. C'est surtout utile en dehors des réponses de fil, qui utilisent un indicateur d'état "is typing..." par défaut.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des shortcodes (par exemple `"hourglass_flowing_sand"`).
- La réaction est de type best-effort et un nettoyage est tenté automatiquement une fois le chemin de réponse ou d'échec terminé.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes">
    Les pièces jointes de fichiers Slack sont téléchargées à partir d'URL privées hébergées par Slack (flux de requêtes authentifiées par jeton) et écrites dans le média store lorsque le téléchargement réussit et que les limites de taille le permettent. Les espaces réservés de fichiers incluent le Slack `fileId` afin que les agents puissent récupérer le fichier d'origine avec `download-file`.

    Les téléchargements utilisent des délais d'inactivité et totaux bornés. Si la récupération du fichier Slack stagne ou échoue, OpenClaw continue de traiter le message et revient à l'espace réservé du fichier.

    La limite de taille entrante à l'exécution est par défaut de `20MB`, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texte et fichiers sortants">
    - les segments de texte utilisent `channels.slack.textChunkLimit` (par défaut 4000)
    - `channels.slack.chunkMode="newline"` active le découpage prioritaire des paragraphes
    - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`)
    - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsque configuré ; sinon, les envois de canal utilisent les valeurs par défaut de type MIME du pipeline média

  </Accordion>

  <Accordion title="Delivery targets">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les canaux

    Les DMs Slack contenant uniquement du texte ou des blocs peuvent être envoyés directement aux ID d'utilisateur ; les téléchargements de fichiers et les envois en fil de discussion ouvrent d'abord le DM via les API de conversation Slack, car ces chemins nécessitent un ID de conversation concret.

  </Accordion>
</AccordionGroup>

## Commandes et comportement des commandes slash

Les commandes slash apparaissent dans Slack sous la forme d'une seule commande configurée ou de plusieurs commandes natives. Configurez `channels.slack.slashCommand` pour modifier les valeurs par défaut des commandes :

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

Les sessions de slash utilisent des clés isolées comme `agent:<agentId>:slack:slash:<userId>` et acheminent toujours les exécutions de commandes vers la session de conversation cible en utilisant `CommandTargetSessionKey`.

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

Remarques :

- Il s'agit d'une interface utilisateur spécifique à Slack. D'autres canaux ne traduisent pas les directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non des valeurs brutes créées par l'agent.
- Si les blocs interactifs générés devaient dépasser les limites du Slack Block Kit, OpenClaw revient à la réponse texte originale au lieu d'envoyer une charge utile de blocs non valide.

## Approbations Exécutives dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons et des interactions interactifs, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations Exécutives utilisent `channels.slack.execApprovals.*` pour le routage natif DM/canal.
- Les approbations de plugins peuvent toujours être résolues via la même interface de bouton native de Slack lorsque la demande atterrit déjà dans Slack et que le type d'identifiant d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser les demandes via Slack.

Ceci utilise la même interface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
ne doit inclure une commande manuelle `/approve` que lorsque le résultat de l'outil indique que les approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin possible.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (facultatif; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un
approbateur résout. Définissez `enabled: false` pour désactiver Slack en tant que client d'approbation natif explicitement.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approbateurs résolvent.

Comportement par défaut sans configuration explicite des approbations d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite Slack n'est nécessaire que lorsque vous souhaitez remplacer les approbateurs, ajouter des filtres ou
opter pour la livraison dans le chat d'origine :

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

Le transfert partagé `approvals.exec` est distinct. Utilisez-le uniquement lorsque les invites d'approbation exec doivent également
être acheminées vers d'autres chats ou des cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également
distinct ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugins lorsque ces demandes atterrissent déjà
dans Slack.

Le `/approve` dans le même chat fonctionne également dans les canaux et les DM Slack qui prennent déjà en charge les commandes. Voir [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert d'approbation.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages sont mappées en événements système.
- Les diffusions de fils (réponses aux fils « Envoyer également dans le channel ») sont traitées comme des messages utilisateur normaux.
- Les événements d'ajout ou de suppression de réactions sont mappés vers des événements système.
- Les événements d'arrivée ou de départ de membres, de création ou de renommage de channel, et d'ajout ou de suppression d'épingles sont mappés vers des événements système.
- `channel_id_changed` peut migrer les clés de configuration de channel lorsque `configWrites` est activé.
- Les métadonnées du sujet ou de l'objet du channel sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- L'initiateur de fil et l'amorçage du contexte initial de l'historique du fil sont filtrés par les listes blanches d'expéditeurs configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système `Slack interaction: ...` structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, libellés, valeurs de sélecteur et métadonnées `workflow_*`
  - événements `view_submission` et `view_closed` avec des métadonnées de canal acheminées et des entrées de formulaire

## Référence de configuration

Référence principale : [Référence de configuration - Slack](/fr/gateway/config-channels#slack).

<Accordion title="SlackChamps Slack à fort signal">

- mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (legacy : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- commutateur de compatibilité : `dangerouslyAllowNameMatching` (break-glass ; garder désactivé sauf si nécessaire)
- accès aux channels : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- discussion/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls : `unfurlLinks`, `unfurlMedia` pour le contrôle de l'aperçu des liens/médias `chat.postMessage`
- ops/fonctionnalités : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Dépannage

<AccordionGroup>
  <Accordion title="No replies in channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - liste d'autorisation des canaux (`channels.slack.channels`) — **les clés doivent être des IDs de canaux** (`C12345678`), et non des noms (`#channel-name`). Les clés basées sur les noms échouent silencieusement sous `groupPolicy: "allowlist"` car le routage des canaux est basé sur l'ID par défaut. Pour trouver un ID : faites un clic droit sur le canal dans Slack → **Copy link** — la valeur `C...` à la fin de l'URL est l'ID du canal.
    - `requireMention`
    - liste d'autorisation `users` par canal

    Commandes utiles :

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="DM messages ignored">
    Vérifiez :

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - les approbations de couplage / les entrées de liste blanche
    - les événements DM de Slack Assistant : les journaux détaillés mentionnant `drop message_changed`
      signifient généralement que Slack a envoyé un événement de fil Assistant modifié sans
      expéditeur humain récupérable dans les métadonnées du message

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Validez les jetons bot + app et l'activation du mode Socket dans les paramètres de l'application Slack.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais l'exécution actuelle n'a pas pu résoudre la valeur
    soutenue par SecretRef.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Validez :

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - unique `webhookPath` per HTTP account

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les
    snapshots de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre le signing secret soutenu par SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande native (`channels.slack.commands.native: true`) avec des slash commands correspondants enregistrés dans Slack
    - ou le mode de slash command unique (`channels.slack.slashCommand.enabled: true`)

    Vérifiez également `commands.useAccessGroups` et les listes d'autorisation de canal/utilisateur.

  </Accordion>
</AccordionGroup>

## Référence pour la vision des pièces jointes

Slack peut joindre des médias téléchargés au tour de l'agent lorsque les téléchargements de fichiers Slack réussissent et que les limites de taille le permettent. Les fichiers image peuvent être transmis via le chemin de compréhension des médias ou directement à un modèle de réponse capable de vision ; les autres fichiers sont conservés en tant que contexte de fichier téléchargeable plutôt que traités comme une entrée image.

### Types de médias pris en charge

| Type de média                  | Source                                     | Comportement actuel                                                                                                    | Notes                                                                                      |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Images JPEG / PNG / GIF / WebP | URL de fichier Slack                       | Téléchargé et joint au tour pour un traitement compatible avec la vision                                               | Limite par fichier : `channels.slack.mediaMaxMb` (20 Mo par défaut)                        |
| Fichiers PDF                   | URL de fichier Slack                       | Téléchargé et exposé comme contexte de fichier pour des outils tels que `download-file` ou `pdf`                       | Slack entrant ne convertit pas automatiquement les PDF en entrée de vision d'image         |
| Autres fichiers                | URL de fichier Slack                       | Téléchargés si possible et exposés en tant que contexte de fichier                                                     | Les fichiers binaires ne sont pas traités comme une entrée image                           |
| Réponses de fil de discussion  | Fichiers de démarrage de fil de discussion | Les fichiers de messages racines peuvent être hydratés en tant que contexte lorsque la réponse n'a pas de média direct | Les démarrages composés uniquement de fichiers utilisent un espace réservé de pièce jointe |
| Messages multi-images          | Plusieurs fichiers Slack                   | Chaque fichier est évalué indépendamment                                                                               | Le traitement Slack est limité à huit fichiers par message                                 |

### Pipeline entrant

Lorsqu'un message Slack avec des pièces jointes de fichiers arrive :

1. OpenClaw télécharge le fichier depuis l'URL privée de Slack à l'aide du jeton du bot (`xoxb-...`).
2. Le fichier est écrit dans le stockage média en cas de succès.
3. Les chemins des médias téléchargés et les types de contenu sont ajoutés au contexte entrant.
4. Les chemins de model/tool compatibles avec les images peuvent utiliser les pièces jointes d'image de ce contexte.
5. Les fichiers non image restent disponibles en tant que métadonnées de fichier ou références média pour les outils capables de les gérer.

### Héritage des pièces jointes à la racine du fil

Lorsqu'un message arrive dans un fil (a un `thread_ts` parent) :

- Si la réponse elle-même n'a pas de média direct et que le message racine inclus contient des fichiers, Slack peut hydrater les fichiers racine en tant que contexte de démarrage du fil.
- Les pièces jointes de réponse directe ont la priorité sur les pièces jointes du message racine.
- Un message racine qui ne contient que des fichiers et aucun texte est représenté par un espace réservé de pièce jointe afin que la solution de secours puisse toujours inclure ses fichiers.

### Gestion des pièces jointes multiples

Lorsqu'un seul Slack message contient plusieurs pièces jointes de fichiers :

- Chaque pièce jointe est traitée indépendamment via le pipeline média.
- Les références des médias téléchargés sont agrégées dans le contexte du message.
- L'ordre de traitement suit l'ordre des fichiers de Slack dans la charge utile de l'événement.
- Un échec du téléchargement d'une pièce jointe ne bloque pas les autres.

### Taille, téléchargement et limites du model

- **Limite de taille** : 20 Mo par fichier par défaut. Configurable via `channels.slack.mediaMaxMb`.
- **Échecs de téléchargement** : Les fichiers que Slack ne peut pas servir, les URL expirées, les fichiers inaccessibles, les fichiers trop volumineux et les réponses HTML d'authentisation/connexion de Slack sont ignorés au lieu d'être signalés comme formats non pris en charge.
- **Model de vision** : L'analyse d'image utilise le model de réponse actif lorsqu'il prend en charge la vision, ou le model d'image configuré à `agents.defaults.imageModel`.

### Limites connues

| Scénario                                      | Comportement actuel                                                                                                   | Solution de contournement                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| URL de fichier Slack expiré                   | Fichier ignoré ; aucune erreur affichée                                                                               | Téléchargez à nouveau le fichier dans Slack                                                        |
| Modèle de vision non configuré                | Les pièces jointes d'image sont stockées sous forme de références média, mais ne sont pas analysées en tant qu'images | Configurez `agents.defaults.imageModel` ou utilisez un modèle de réponse compatible avec la vision |
| Images très volumineuses (> 20 Mo par défaut) | Ignorées en raison de la limite de taille                                                                             | Augmentez `channels.slack.mediaMaxMb` si Slack le permet                                           |
| Pièces jointes transférées/partagées          | Les média texte et image/fichier hébergés par Slack sont sur la base du meilleur effort                               | Partagez à nouveau directement dans le fil OpenClaw                                                |
| Pièces jointes PDF                            | Stockées sous forme de contexte fichier/média, non routées automatiquement via la vision par image                    | Utilisez `download-file` pour les métadonnées de fichier ou l'outil `pdf` pour l'analyse PDF       |

### Documentation connexe

- [Pipeline de compréhension des médias](/fr/nodes/media-understanding)
- [Tool PDF](/fr/tools/pdf)
- Epic : [#51349](https://github.com/openclaw/openclaw/issues/51349) — Activation de la vision des pièces jointes Slack
- Tests de régression : [#51353](https://github.com/openclaw/openclaw/issues/51353)
- Vérification en direct : [#51354](https://github.com/openclaw/openclaw/issues/51354)

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Slack à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement des salons et des DM de groupe.
  </Card>
  <Card title="Routage des canaux" icon="route" href="/fr/channels/channel-routing">
    Acheminez les messages entrants vers les agents.
  </Card>
  <Card title="Sécurité" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Configuration de la mise en page et de la priorité.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/fr/tools/slash-commands">
    Catalogue et comportement des commandes.
  </Card>
</CardGroup>

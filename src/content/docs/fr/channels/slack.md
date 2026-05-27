---
summary: "Configuration et comportement d'exécution de Slack (Socket Mode + URL de requêtes HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Prêt pour la production pour les DMs et les channels via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requêtes HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les MD Slack utilisent le mode de couplage par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement natif des commandes et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics inter-canaux et playbooks de réparation.
  </Card>
</CardGroup>

## Choisir entre le mode Socket et les URL de requête HTTP

Les deux modes de transport sont prêts pour la production et offrent une parité fonctionnelle pour la messagerie, les commandes slash, App Home et l'interactivité. Choisissez en fonction de la forme du déploiement, et non des fonctionnalités.

| Souci                                              | Mode Socket (par défaut)                                                                                                                                                                             | URL de requête HTTP                                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| URL publique Gateway                               | Non requis                                                                                                                                                                                           | Requis (DNS, TLS, proxy inverse ou tunnel)                                                                                               |
| Réseau sortant                                     | La WSS sortante vers `wss-primary.slack.com` doit être joignable                                                                                                                                     | Pas de WS sortant ; uniquement HTTPS entrant                                                                                             |
| Jetons nécessaires                                 | Jeton de bot + Jeton de niveau application avec `connections:write`                                                                                                                                  | Jeton de bot + Signature secrète                                                                                                         |
| Ordinateur de développement / derrière un pare-feu | Fonctionne tel quel                                                                                                                                                                                  | Nécessite un tunnel public (ngrok, Cloudflare Tunnel, TailscaleGateway Funnel) ou une passerelle de staging                              |
| Mise à l'échelle horizontale                       | Une session Socket Mode par application par hôte ; plusieurs passerelles nécessitent des applications Slack distinctes                                                                               | Gestionnaire POST sans état ; plusieurs répliques de Gateway peuvent partager une application derrière un répartiteur de charge          |
| Multi-compte sur une seule passerelle              | Pris en charge ; chaque compte ouvre son propre WS                                                                                                                                                   | Pris en charge ; chaque compte a besoin d'un `webhookPath` unique (par défaut `/slack/events`) pour éviter les conflits d'enregistrement |
| Transport de commande slash                        | Acheminé via la connexion WS ; `slash_commands[].url` est ignoré                                                                                                                                     | Slack envoie des POST à `slash_commands[].url` ; le champ est requis pour que la commande soit distribuée                                |
| Signature de la requête                            | Non utilisé (l'auth est le Jeton de Niveau Application)                                                                                                                                              | Slack signe chaque requête ; OpenClaw vérifie avec `signingSecret`                                                                       |
| Récupération en cas de perte de connexion          | La reconnexion automatique du SDK Slack est activée ; OpenClaw redémarre également les sessions Socket Mode échouées avec un exponentiel borné. Le réglage du transport du délai de pong s'applique. | Aucune connexion persistante à perdre ; les nouvelles tentatives sont effectuées par requête depuis Slack                                |

<Note>
  **Choisissez le mode Socket** pour les hôtes Gateway uniques, les ordinateurs portables de développement et les réseaux sur site qui peuvent atteindre `*.slack.com` sortant mais ne peuvent pas accepter HTTPS entrant.

**Choisissez les URL de requête HTTP** lors de l'exécution de plusieurs répliques Gateway derrière un équilibreur de charge, lorsque le WSS sortant est bloqué mais le HTTPS entrant est autorisé, ou lorsque vous terminez déjà les webhooks Slack sur un proxy inverse.

</Note>

## Installer

Installez Slack avant de configurer le channel :

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` enregistre et active le plugin. Le plugin ne fait encore rien tant que vous n'avez pas configuré l'application Slack et les paramètres du canal ci-dessous. Consultez la page [Plugins](/fr/tools/plugin) pour connaître le comportement général des plugins et les règles d'installation.

## Configuration rapide

<Tabs>
  <Tab title="Mode Socket (par défaut)">
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
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
    }
  }
}
```

        </CodeGroup>

        <Note>
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack : App Home, commandes slash, fichiers, réactions, épingles, DMs de groupe et lectures d'émojis/groupes d'utilisateurs. Choisissez **Minimal** lorsque la stratégie de l'espace de travail restreint les portées (scopes) — il couvre les DMs, l'historique des canaux/groupes, les mentions et les commandes slash, mais supprime les fichiers, réactions, épingles, DM de groupe (`mpim:*`), `emoji:read` et `usergroups:read`. Consultez [Manifest and scope checklist](#manifest-and-scope-checklist) pour la justification par portée et les options additives telles que des commandes slash supplémentaires.
        </Note>

        Une fois que Slack a créé l'application :

        - **Basic Information -> App-Level Tokens -> Generate Token and Scopes** : ajoutez `connections:write`, enregistrez, et copiez le Jeton de niveau Application (App-Level Token).
        - **Install App -> Install to Workspace** : copiez le Jeton OAuth de l'utilisateur Bot.

      </Step>

      <Step title="Configurer OpenClaw">

        Configuration SecretRef recommandée :

```bash
export SLACK_APP_TOKEN=slack-app-token-example
export SLACK_BOT_TOKEN=slack-bot-token-example
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
SLACK_APP_TOKEN=slack-app-token-example
SLACK_BOT_TOKEN=slack-bot-token-example
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
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des manifests ci-dessous → remplacez `https://gateway-host.example.com/slack/events` par votre URL publique Gateway → **Next** → **Create**.

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
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "message.channels", "message.groups", "message.im"]
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
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack ; **Minimal** supprime les fichiers, les réactions, les épingles, les DM de groupe (`mpim:*`), `emoji:read` et `usergroups:read` pour les espaces de travail restreints. Consultez la [checklist du manifeste et des portées (scope)](#manifest-and-scope-checklist) pour la justification par portée.
        </Note>

        <Info>
          Les trois champs d'URL (`slash_commands[].url`, `event_subscriptions.request_url` et `interactivity.request_url` / `message_menu_options_url`) pointent tous vers le même point de terminaison OpenClaw. Le schéma de manifeste de Slack exige qu'ils soient nommés séparément, mais OpenClaw route par type de payload, donc un seul `webhookPath` (par défaut `/slack/events`) suffit. Les commandes slash sans `slash_commands[].url` n'auront aucun effet (silent no-op) en mode HTTP.
        </Info>

        Une fois Slack l'application créée :

        - **Basic Information → App Credentials** : copiez la **Signing Secret** pour la vérification des requêtes.
        - **Install App -> Install to Workspace** : copiez le jeton Bot User OAuth.

      </Step>

      <Step title="Configurer OpenClaw">

        Configuration SecretRef recommandée :

```bash
export SLACK_BOT_TOKEN=slack-bot-token-example
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

        Donnez à chaque compte un `webhookPath` distinct (par défaut `/slack/events`) pour éviter que les enregistrements ne entrent en conflit.
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

Utilisez ceci uniquement pour les espaces de travail en mode Socket qui enregistrent des délais d'expiration de pong WebSocket/ping serveur Slack ou qui s'exécutent sur des hôtes avec une famine connue de la boucle d'événements. `clientPingTimeout` est l'attente de pong après l'envoi d'un ping client par le SDK ; `serverPingTimeout` est l'attente des pings serveur Slack. Les messages et événements de l'application restent dans l'état de l'application et non des signaux de vivacité du transport.

Notes :

- `socketMode` est ignoré en mode URL de requête HTTP.
- Les paramètres de base `channels.slack.socketMode` s'appliquent à tous les comptes Slack sauf s'ils sont remplacés. Les remplacements par compte utilisent `channels.slack.accounts.<accountId>.socketMode` ; comme il s'agit d'un remplacement d'objet, incluez chaque champ de réglage de socket que vous souhaitez pour ce compte.
- Seul `clientPingTimeout` a une valeur par défaut OpenClaw (`15000`). `serverPingTimeout` et `pingPongLoggingEnabled` sont transmis au SDK Slack uniquement lorsqu'ils sont configurés.
- L'attente de redémarrage du mode Socket commence autour de 2 secondes et plafonne autour de 30 secondes. Les échecs consécutifs récupérables de démarrage/d'attente de démarrage s'arrêtent après 12 tentatives ; après une connexion réussie, les déconnexions récupérables ultérieures commencent un nouveau cycle de réessai. Les erreurs d'authentification Slack non récupérables telles que `invalid_auth`, les jetons révoqués ou les portées manquantes échouent rapidement au lieu de réessayer indéfiniment.

## Liste de vérification du manifeste et des portées

Le manifeste de base de l'application Slack est le même pour le mode Socket et les URL de requête HTTP. Seul le bloc `settings` (et la commande `url` de slash) diffère.

Manifeste de base (par défaut du mode Socket) :

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
    "assistant_view": {
      "assistant_description": "OpenClaw connects Slack assistant threads to OpenClaw agents.",
      "suggested_prompts": [
        { "title": "What can you do?", "message": "What can you help me with?" },
        {
          "title": "Summarize this channel",
          "message": "Summarize the recent activity in this channel."
        },
        { "title": "Draft a reply", "message": "Help me draft a reply." }
      ]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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
      "bot_events": ["app_home_opened", "app_mention", "assistant_thread_context_changed", "assistant_thread_started", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
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

Le manifeste par défaut active l'onglet **Home** (Accueil) de l'application Slack et s'abonne à `app_home_opened`. Lorsqu'un membre de l'espace de travail ouvre l'onglet Accueil, OpenClaw publie une vue Accueil par défaut sécurisée avec `views.publish` ; aucune charge utile de conversation ou configuration privée n'est incluse. L'onglet **Messages** reste activé pour les Slack DMs. Le manifeste active également les fils de discussion de l'assistant Slack avec `features.assistant_view`, `assistant:write`, `assistant_thread_started` et `assistant_thread_context_changed` ; les fils de discussion de l'assistant sont acheminés vers leurs propres sessions de fil de discussion OpenClaw et gardent le contexte de fil fourni par Slack disponible pour l'agent.

<AccordionGroup>
  <Accordion title="Commandes slash natives en option">

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
      "command": "/approve",
      "description": "Approve or deny pending approval requests",
      "usage_hint": "<id> <decision>"
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
  <Accordion title="Portées de paternité facultatives (opérations d'écriture)">
    Ajoutez la portée de bot `chat:write.customize` si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité par défaut de l'application Slack.

    Si vous utilisez une icône emoji, Slack attend la syntaxe `:emoji_name:`.

  </Accordion>
  <Accordion title="Portées de jeton utilisateur facultatives (opérations de lecture)">
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
- `botToken`, `appToken`, `signingSecret` et `userToken` acceptent des chaînes en
  clair ou des objets SecretRef.
- Les jetons de configuration remplacent le repli (fallback) des variables d'environnement.
- Le repli d'environnement `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` est uniquement configurable (pas de repli d'environnement) et par défaut à un comportement en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané d'état :

- L'inspection de compte Slack suit les champs `*Source` et `*Status` par identifiant
  (`botToken`, `appToken`, `signingSecret`, `userToken`).
- Le statut est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef
  ou une autre source de secret non en ligne, mais que le chemin de commande/runtime actuel
  n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la
  paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être préféré lorsqu'il est configuré. Pour les écritures, le jeton bot reste préféré ; les écritures par jeton utilisateur sont autorisées uniquement lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

## Actions et portes (gates)

Les actions Slack sont contrôlées par `channels.slack.actions.*`.

Groupes d'actions disponibles dans les outils Slack actuels :

| Groupe     | Par défaut |
| ---------- | ---------- |
| messages   | activé     |
| réactions  | activé     |
| épingles   | activé     |
| memberInfo | activé     |
| emojiList  | activé     |

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`. `download-file` accepte les ID de fichier Slack affichés dans les espaces réservés de fichiers entrants et renvoie des aperçus d'images pour les images ou des métadonnées de fichiers locaux pour les autres types de fichiers.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie DM">
    `channels.slack.dmPolicy` contrôle l'accès aux DM. `channels.slack.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DM.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.slack.allowFrom` inclue `"*"`)
    - `disabled`

    Indicateurs DM :

    - `dm.enabled` (vrai par défaut)
    - `channels.slack.allowFrom`
    - `dm.allowFrom` (obsolète)
    - `dm.groupEnabled` (faux par défaut pour les DM de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    L'ancien `channels.slack.dm.policy` et `channels.slack.dm.allowFrom` sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    L'appairage dans les DM utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et **doit utiliser des IDs de channel Slack stables** (par exemple `C12345678`) comme clés de configuration.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration uniquement via env), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des channels et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par token le permet
    - les entrées de nom de channel non résolues sont conservées telles qu'elles sont configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe de nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Les clés basées sur le nom (`#channel-name` ou `channel-name`) ne correspondent **pas** sous `groupPolicy: "allowlist"`. La recherche de channel est basée sur l'ID par défaut, donc une clé basée sur le nom ne réussira jamais le routage et tous les messages de ce channel seront bloqués silencieusement. Cela diffère de `groupPolicy: "open"`, où la clé de channel n'est pas requise pour le routage et une clé basée sur le nom semble fonctionner.

    Utilisez toujours l'ID de channel Slack comme clé. Pour le trouver : faites un clic droit sur le channel dans Slack → **Copier le lien** — l'ID (`C...`) apparaît à la fin de l'URL.

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
    Les messages de canal sont filtrés par mention par défaut.

    Sources de mentions :

    - mention explicite de l'application (`<@botId>`)
    - mention de groupe d'utilisateurs Slack (`<!subteam^S...>`) lorsque l'utilisateur bot est membre de ce groupe d'utilisateurs ; nécessite `usergroups:read`
    - modèles de regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement de fil de discussion implicite de réponse au bot (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par canal (`channels.slack.channels.<id>` ; noms uniquement via résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `channel:`, `id:`, `e164:`, `username:`, `name:`, ou joker `"*"`
      (les clés héritées sans préfixe mappent toujours uniquement vers `id:`)

    `allowBots` est conservateur pour les canaux et les canaux privés : les messages de salle créés par des bots sont acceptés uniquement lorsque le bot émetteur est explicitement listé dans la liste d'autorisation `users` de cette salle, ou lorsqu'au moins un ID de propriétaire explicite Slack issu de `channels.slack.allowFrom` est actuellement membre de la salle. Les jokers et les entrées de propriétaire par nom d'affichage ne satisfont pas la présence du propriétaire. La présence du propriétaire utilise Slack `conversations.members` ; assurez-vous que l'application dispose de la portée de lecture correspondante pour le type de salle (`channels:read` pour les canaux publics, `groups:read` pour les canaux privés). Si la recherche de membre échoue, OpenClaw ignore le message de salle créé par le bot.

    Les messages Slack créés par des bots acceptés utilisent une [protection de boucle de bot](/fr/channels/bot-loop-protection) partagée. Configurez `channels.defaults.botLoopProtection` pour le budget par défaut, puis remplacez par `channels.slack.botLoopProtection` ou `channels.slack.channels.<id>.botLoopProtection` lorsqu'un espace de travail ou un canal a besoin d'une limite différente.

  </Tab>
</Tabs>

## Fils de discussion, sessions et balises de réponse

- Les MD sont routés en tant que `direct` ; les channels en tant que `channel` ; les MPIM en tant que `group`.
- Les liaisons de routage Slack acceptent les ID de pairs bruts ainsi que les formes cibles Slack telles que `channel:C12345678`, `user:U12345678` et `<@U12345678>`.
- Avec le `session.dmScope=main` par défaut, les MD Slack sont réduits à la session principale de l'agent.
- Sessions de channel : `agent:<agentId>:slack:channel:<channelId>`.
- Les messages ordinaires de channel de premier niveau restent sur la session par channel, même lorsque `replyToMode` est non `off`.
- Les réponses aux fils de discussion Slack utilisent le Slack parent `thread_ts` pour les suffixes de session (`:thread:<threadTs>`), même lorsque l'enfilage des réponses sortantes est désactivé avec `replyToMode="off"`.
- OpenClaw ensemence une racine de channel de premier niveau éligible dans `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` lorsque cette racine est censée démarrer un fil de discussion visible Slack, de sorte que la racine et les réponses ultérieures du fil partagent une session OpenClaw. Cela s'applique aux événements `app_mention`, aux correspondances explicites de bot ou de modèle de mention configuré, et aux channels `requireMention: false` avec un `replyToMode` non `off`.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle le nombre de messages de fil existants récupérés lorsqu'une nouvelle session de fil démarre (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fils de discussion pour que le bot ne réponde qu'aux mentions `@bot` explicites à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil auquel le bot participe contournent le filtrage `requireMention`.

Contrôles des fils de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les discussions directes : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Pour les réponses explicites aux fils de discussion Slack depuis l'outil `message`, définissez `replyBroadcast: true` avec `action: "send"` et `threadId` ou `replyTo` pour demander à Slack de diffuser également la réponse du fil vers le canal parent. Cela correspond à l'indicateur `chat.postMessage` `reply_broadcast` de Slack et n'est pris en charge que pour les envois de texte ou de Block Kit, et non pour les téléchargements de médias.

Lorsqu'un appel d'outil `message` s'exécute à l'intérieur d'un fil de discussion Slack et cible le même canal, OpenClaw hérite normalement du fil de discussion Slack actuel selon `replyToMode`. Définissez `topLevel: true` sur `action: "send"` ou `action: "upload-file"` pour forcer à la place un nouveau message de canal parent. `threadId: null` est accepté comme la même option de refus de premier niveau.

<Note>
`replyToMode="off"`Slack désactive le threading de réponse Slack sortant, y compris les balises `[[reply_to_*]]`SlackSlack explicites. Cela n'aplatit pas les sessions de thread Slack entrantes : les messages déjà publiés dans un thread Slack sont toujours routés vers la session `:thread:<threadTs>`. Cela diffère de Telegram, où les balises explicites sont toujours honorées en mode `"off"`. Les threads Slack masquent les messages du canal, tandis que les réponses Telegram restent visibles en ligne.
</Note>

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réclamation pendant que OpenClaw traite un message entrant. `ackReactionScope` décide _quand_ cet emoji est réellement envoyé.

### Emoji (`ackReaction`)

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de repli d'identité de l'agent (`agents.list[].identity.emoji`, sinon `"eyes"` / 👀)

Notes :

- Slack attend des codes courts (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

### Portée (`messages.ackReactionScope`)

Le fournisseur Slack lit la portée depuis `messages.ackReactionScope` (par défaut `"group-mentions"`). Il n'existe aujourd'hui aucune substitution au niveau du compte Slack ou du canal Slack ; la valeur est globale pour la passerelle.

Valeurs :

- `"all"` : réagir dans les DMs et les groupes.
- `"direct"` : réagir uniquement dans les DMs.
- `"group-all"` : réagir à chaque message de groupe (pas de DMs).
- `"group-mentions"` (par défaut) : réagir dans les groupes, mais uniquement lorsque le bot est mentionné (ou dans les mentionnables de groupe qui ont opté pour cela). **Les DMs sont exclus.**
- `"off"` / `"none"` : ne jamais réagir.

<Note>
  La portée par défaut (`"group-mentions"`) ne déclenche pas les réactions d'accusé de réception dans les messages directs. Pour voir le `ackReaction` configuré (par exemple `"eyes"`) sur les DMs Slack entrants, définissez `messages.ackReactionScope` sur `"direct"` ou `"all"`. `messages.ackReactionScope` est lu au démarrage du fournisseur Slack, donc un redémarrage de la passerelle est nécessaire
  pour que la modification prenne effet.
</Note>

```json5
{
  messages: {
    ackReaction: "eyes",
    ackReactionScope: "all", // react in DMs and groups
  },
}
```

## Flux de texte

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver le flux de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte de l'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.
- `streaming.preview.toolProgress` : lorsque l'aperçu de brouillon est actif, acheminer les mises à jour d'outil/progression dans le même message d'aperçu modifié (par défaut : `true`). Définissez `false` pour conserver des messages d'outil/progression séparés.
- `streaming.preview.commandText` / `streaming.progress.commandText` : définir sur `status` pour conserver les lignes de progression d'outil compactes tout en masquant le texte de commande/exec brut (par défaut : `raw`).

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

`channels.slack.streaming.nativeTransport` contrôle le flux de texte natif Slack lorsque `channels.slack.streaming.mode` est `partial` (par défaut : `true`).

- Un fil de discussion de réponse doit être disponible pour que le flux de texte natif et le statut du fil de discussion de l'assistant Slack apparaissent. La sélection du fil de discussion suit toujours `replyToMode`.
- Les racines de canal, de discussion de groupe et de DM de premier niveau peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible ou qu'aucun fil de discussion de réponse n'existe.
- Les Slack DM de premier niveau restent hors thread par défaut, ils n'affichent donc pas l'aperçu natif du flux/statut de style thread de Slack ; OpenClaw publie et modifie à la place un aperçu de brouillon dans le DM.
- Les médias et les charges utiles non textuelles reviennent à une livraison normale.
- Les finales de médias/erreurs annulent les modifications d'aperçu en attente ; les finales de texte/bloc éligibles ne sont envoyées que lorsqu'elles peuvent modifier l'aperçu en place.
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
- Exécutez `openclaw doctor --fix` pour réécrire la configuration de streaming Slack persistée avec les clés canoniques.

## Repli de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message entrant Slack pendant que OpenClaw traite une réponse, puis la supprime une fois l'exécution terminée. Ceci est surtout utile en dehors des réponses de thread, qui utilisent un indicateur d'état « is typing... » par défaut.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes courts (par exemple `"hourglass_flowing_sand"`).
- La réaction est de type « meilleur effort » et un nettoyage est tenté automatiquement après l'achèvement de la réponse ou du chemin d'échec.

## Médias, découpage et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes"SlackSlack>
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requêtes authentifiées par jeton) et écrites dans le magasin de médias lorsque le téléchargement réussit et que les limites de taille le permettent. Les espaces réservés de fichiers incluent le Slack `fileId` afin que les agents puissent récupérer le fichier original avec `download-file`.

    Les téléchargements utilisent des délais d'inactivité et totaux bornés. Si la récupération du fichier Slack stagne ou échoue, OpenClaw continue de traiter le message et revient à l'espace réservé du fichier.

    La limite de taille entrante au moment de l'exécution est `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texte et fichiers sortants">
    - les segments de texte utilisent `channels.slack.textChunkLimit` (par défaut 4000)
    - `channels.slack.chunkMode="newline"` active le découpage paragraphe en priorité
    - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`)
    - la limite média sortante suit `channels.slack.mediaMaxMb` lorsqu'elle est configurée ; sinon, les envois de canal utilisent les valeurs par défaut de type MIME du pipeline média

  </Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les canaux

    Les DMs Slack contenant uniquement du texte/blocs peuvent être publiés directement sur les ID d'utilisateur ; les téléchargements de fichiers et les envois filés ouvrent d'abord le DM via les API de conversation Slack car ces chemins nécessitent un ID de conversation concret.

  </Accordion>
</AccordionGroup>

## Commandes et comportement slash

Les commandes slash apparaissent dans Slack sous la forme d'une seule commande configurée ou de plusieurs commandes natives. Configurez `channels.slack.slashCommand` pour modifier les valeurs par défaut des commandes :

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

```txt
/openclaw /help
```

Les commandes natives nécessitent des [paramètres de manifeste supplémentaires](#additional-manifest-settingsSlack) dans votre application Slack et sont activées avec `channels.slack.commands.native: true` ou `commands.native: true` dans les configurations globales à la place.

- Le mode automatique des commandes natives est **désactivé** pour Slack, donc Slack`commands.native: "auto"`Slack n'active pas les commandes natives de Slack.

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

Les sessions slash utilisent des clés isolées comme `agent:<agentId>:slack:slash:<userId>` et acheminent toujours les exécutions de commandes vers la session de conversation cible en utilisant `CommandTargetSessionKey`.

## Réponses interactives

Slack peut afficher des contrôles de réponse interactifs créés par l'agent, mais cette fonctionnalité est désactivée par défaut.
Pour les nouveaux résultats d'agent, de CLI et de plugin, préférez les boutons ou les blocs de sélection partagés
SlackCLI`presentation`Slack. Ils utilisent le même chemin d'interaction Slack
tout en se dégradant sur d'autres canaux.

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

Lorsqu'elle est activée, les agents peuvent encore émettre des directives de réponse obsolètes spécifiques à Slack :

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Ces directives sont compilées en Slack Block Kit et acheminent les clics ou les sélections
via le chemin d'événement d'interaction Slack existant. Conservez-les pour les anciennes
invites et les échappatoires spécifiques à Slack ; utilisez une présentation partagée pour les nouveaux
contrôles portables.

Les API du compilateur de directives sont également obsolètes pour le nouveau code producteur :

- `compileSlackInteractiveReplies(...)`
- `parseSlackOptionsLine(...)`
- `isSlackInteractiveRepliesEnabled(...)`
- `buildSlackInteractiveBlocks(...)`

Utilisez les charges utiles `presentation` et `buildSlackPresentationBlocks(...)` pour les nouveaux
contrôles rendus par Slack.

Notes :

- Il s'agit d'une interface utilisateur héritée spécifique à Slack. Les autres canaux ne traduisent pas les
  directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non les valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassaient les limites du Slack Block Kit, OpenClaw reviendrait à la réponse textuelle originale au lieu d'envoyer une charge utile de blocs non valide.

### Soumissions de modales détenues par des plugins

Les plugins Slack qui enregistrent un gestionnaire interactif peuvent également recevoir des événements
de cycle de vie modale `view_submission` et `view_closed` avant que OpenClaw ne compresse
la charge utile pour l'événement système visible par l'agent. Utilisez l'un de ces modèles de routage
lors de l'ouverture d'une modale Slack :

- Définissez `callback_id` sur `openclaw:<namespace>:<payload>`.
- Ou conservez un `callback_id` existant et placez `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`.

Le gestionnaire reçoit `ctx.interaction.kind` comme `view_submission` ou
`view_closed`, `inputs` normalisé, et l'objet brut complet `stateValues` de
Slack. Un routage basé uniquement sur l'ID de rappel suffit pour invoquer le gestionnaire de plugin ; incluez
les champs de routage utilisateur/session modale `private_metadata` existants lorsque la
modale doit également produire un événement système visible par l'agent. L'agent reçoit un
événement système `Slack interaction: ...` compact et expurgé. Si le gestionnaire renvoie
`systemEvent.summary`, `systemEvent.reference` ou `systemEvent.data`, ces
champs sont inclus dans cet événement compact afin que l'agent puisse référencer
le stockage détenu par le plugin sans voir la charge utile complète du formulaire.

## Approbations natives dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons interactifs et des interactions, au lieu de revenir à l'interface Web Web UI ou au terminal.

- Les approbations d'exécution et de plugin peuvent être rendues sous forme de invites Block Kit natives Slack.
- `channels.slack.execApprovals.*` reste l'activation du client d'approbation d'exécution natif et la configuration de routage DM/channel.
- Les DM d'approbation d'exécution utilisent `channels.slack.execApprovals.approvers` ou `commands.ownerAllowFrom`.
- Les approbations de plugin utilisent des boutons natifs Slack lorsque Slack est activé en tant que client d'approbation natif pour la session d'origine, ou lorsque `approvals.plugin` achemine vers la session Slack d'origine ou une cible Slack.
- Les DM d'approbation de plugin utilisent les approbateurs de plugin Slack provenant de `channels.slack.allowFrom`, du `allowFrom` de compte nommé, ou de la route par défaut du compte.
- L'autorisation de l'approbateur est toujours appliquée : les approbateurs d'exécution uniquement ne peuvent pas approuver les demandes de plugin à moins qu'ils ne soient également approbateurs de plugin.

Cela utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
ne doit inclure une commande manuelle `/approve` que lorsque le résultat de l'outil indique que les
approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque Slack`enabled` n'est pas défini ou `"auto"`SlackSlack et qu'au moins un approbateur d'exécution est résolu. Slack peut également gérer les approbations de plugins natives via ce chemin native-client lorsque les approbateurs de plugins Slack sont résolus et que la demande correspond aux filtres native-client. Définissez `enabled: false`Slack pour désactiver explicitement Slack en tant que client d'approbation native. Définissez `enabled: true`SlackSlack pour forcer l'activation des approbations natives lorsque les approbateurs sont résolus. La désactivation des approbations d'exécution Slack ne désactive pas la livraison des approbations de plugins natives Slack qui est activée via `approvals.plugin`Slack ; la livraison des approbations de plugins utilise les approbateurs de plugins Slack à la place.

Comportement par défaut sans configuration explicite des approbations d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native explicite Slack n'est nécessaire que lorsque vous souhaitez remplacer les approbateurs, ajouter des filtres ou opter pour la livraison origin-chat :

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

Le transfert partagé `approvals.exec` est séparé. Utilisez-le uniquement lorsque les invites d'approbation d'exécution doivent également être acheminées vers d'autres discussions ou des cibles explicites hors bande. Le transfert partagé `approvals.plugin` est également séparé ; la livraison native Slack supprime ce repli uniquement lorsque Slack peut gérer la demande d'approbation de plugin de manière native.

Le `/approve` de même discussion fonctionne également dans les canaux et les DMs Slack qui prennent déjà en charge les commandes. Voir [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert des approbations.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages sont mappées en événements système.
- Les diffusions de fils (réponses de fils « Envoyer également au canal ») sont traitées comme des messages utilisateur normaux.
- Les événements d'ajout/suppression de réactions sont mappés en événements système.
- Les événements d'arrivée/départ de membre, de création/renommage de canal et d'ajout/suppression d'épingle sont mappés en événements système.
- `channel_id_changed` peut migrer les clés de configuration de canal lorsque `configWrites` est activé.
- Les métadonnées de sujet/d'objectif du channel sont traitées comme un contexte non fiable et peuvent être injectées dans le contexte de routage.
- L'initiateur de fil de discussion et l'initialisation du contexte d'historique du fil initial sont filtrés par les listes d'autorisation d'expéditeur configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des `Slack interaction: ...` événements système structurés avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, libellés, valeurs du sélecteur et métadonnées `workflow_*`
  - événements `view_submission` et `view_closed` modaux avec les métadonnées du channel routé et les entrées de formulaire

## Référence de configuration

Référence principale : [Référence de configuration - Slack](/fr/gateway/config-channels#slack).

<Accordion title="SlackChamps Slack à signal fort">

- mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (ancien : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- interrupteur de compatibilité : `dangerouslyAllowNameMatching` (break-glass ; désactiver sauf en cas de besoin)
- accès au channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- fil/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls : `unfurlLinks` (par défaut : `false`), `unfurlMedia` pour `chat.postMessage` contrôle de l'aperçu des liens/médias ; définissez `unfurlLinks: true` pour réactiver les aperçus de liens
- ops/fonctionnalités : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Dépannage

<AccordionGroup>
  <Accordion title="No replies in channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - channel allowlist (`channels.slack.channels`) — **les clés doivent être des ID de channel** (`C12345678`), et non des noms (`#channel-name`). Les clés basées sur des noms échouent silencieusement sous `groupPolicy: "allowlist"` car le routage des channels privilégie l'ID par défaut. Pour trouver un ID : cliquez avec le bouton droit sur le channel dans Slack → **Copy link** — la valeur `C...` à la fin de l'URL est l'ID du channel.
    - `requireMention`
    - per-channel `users` allowlist
    - `messages.groupChat.visibleReplies` : les requêtes de groupe/channel normales sont par défaut `"automatic"`. Si vous avez opté pour `"message_tool"` et que les journaux montrent du texte d'assistant sans appel `message(action=send)`, le model a manqué le chemin visible du message-tool. Le texte final reste privé dans ce mode ; inspectez le journal détaillé de la passerelle pour les métadonnées de payload supprimées, ou définissez-le sur `"automatic"` si vous souhaitez que chaque réponse finale normale de l'assistant soit publiée via l'ancien chemin.
    - `messages.groupChat.unmentionedInbound` : s'il est `"room_event"`, les conversations non mentionnées des channels autorisés constituent un contexte ambiant et restent silencieuses, sauf si l'agent appelle le tool `message`. Voir [Ambient room events](/fr/channels/ambient-room-events).

```json5
{
  messages: {
    groupChat: {
      visibleReplies: "automatic",
    },
  },
}
```

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
    - les approbations de jumelage / les entrées de liste blanche (`dmPolicy: "open"` nécessite toujours `channels.slack.allowFrom: ["*"]`)
    - les DM de groupe utilisent le traitement MPIM ; activez `channels.slack.dm.groupEnabled` et, si configuré, incluez le MPIM dans `channels.slack.dm.groupChannels`
    - événements DM de l'Assistant Slack : les journaux détaillés mentionnant `drop message_changed`
      signifient généralement que Slack a envoyé un événement de fil d'Assistant modifié sans
      expéditeur humain récupérable dans les métadonnées du message

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Validez les jetons bot + application et l'activation du mode Socket dans les paramètres de l'application Slack.
    Le jeton au niveau de l'application a besoin de `connections:write`, et le jeton bot OAuth de l'utilisateur bot
    doit appartenir à la même application/espace de travail Slack que le jeton d'application.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais le runtime actuel n'a pas pu résoudre la valeur
    basée sur SecretRef.

    Les journaux tels que `slack socket mode failed to start; retry ...` sont des échecs de démarrage récupérables.
    Les étendues manquantes, les jetons révoqués et l'authentification invalide échouent rapidement.
    Un journal `slack token mismatch ...` signifie que le jeton bot et le jeton d'application
    semblent appartenir à des applications Slack différentes ; corrigez les informations d'identification de l'application Slack.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Validez :

    - la clé secrète de signature
    - le chemin du webhook
    - les URL de requête Slack (Événements + Interactivité + Commandes Slash)
    - un `webhookPath` unique par compte HTTP
    - l'URL publique termine le TLS et transfère les demandes vers le chemin Gateway
    - le chemin `request_url` de l'application Slack correspond exactement à `channels.slack.webhookPath` (par défaut `/slack/events`)

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les instantanés
    de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre la clé secrète de signature soutenue par SecretRef.

    Un journal `slack: webhook path ... already registered` répété signifie que deux comptes HTTP
    utilisent le même `webhookPath` ; attribuez un chemin distinct à chaque compte.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez ce que vous aviez l'intention de faire :

    - le mode de commande natif (`channels.slack.commands.native: true`) avec des commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Slack ne crée ni ne supprime automatiquement les commandes slash. `commands.native: "auto"` n'active pas les commandes natives Slack ; utilisez `true` et créez les commandes correspondantes dans l'application Slack. En mode HTTP, chaque commande slash Slack doit inclure l'URL Gateway. En mode Socket, les charges utiles de commande arrivent via le websocket et Slack ignore `slash_commands[].url`.

    Vérifiez également `commands.useAccessGroups`, l'autorisation DM, les listes d'autorisation de canal,
    et les listes d'autorisation `users` par canal. Slack renvoie des erreurs éphémères pour
    les expéditeurs de commandes slash bloqués, notamment :

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## Référence de vision d'attachement

Slack peut joindre des médias téléchargés au tour de l'agent lorsque les téléchargements de fichiers Slack réussissent et que les limites de taille le permettent. Les fichiers image peuvent être transmis via le chemin de compréhension des médias ou directement à un modèle de réponse capable de vision ; les autres fichiers sont conservés en tant que contexte de fichier téléchargeable plutôt que d'être traités comme une entrée image.

### Types de médias pris en charge

| Type de média                  | Source                                     | Comportement actuel                                                                                                  | Remarques                                                                                  |
| ------------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Images JPEG / PNG / GIF / WebP | URL de fichier Slack                       | Téléchargé et joint au tour pour un traitement compatible avec la vision                                             | Limite par fichier : `channels.slack.mediaMaxMb` (20 Mo par défaut)                        |
| Fichiers PDF                   | URL de fichier Slack                       | Téléchargé et exposé en tant que contexte de fichier pour les outils tels que `download-file` ou `pdf`               | Slack inbound ne convertit pas automatiquement les PDF en entrée de vision par image       |
| Autres fichiers                | URL de fichier Slack                       | Téléchargé si possible et exposé en tant que contexte de fichier                                                     | Les fichiers binaires ne sont pas traités comme une entrée image                           |
| Réponses de fil de discussion  | Fichiers de démarrage de fil de discussion | Les fichiers de message racine peuvent être hydratés en tant que contexte lorsque la réponse n'a pas de média direct | Les démarreurs composés uniquement de fichiers utilisent un espace réservé de pièce jointe |
| Messages à plusieurs images    | Plusieurs fichiers Slack                   | Chaque fichier est évalué indépendamment                                                                             | Le traitement Slack est limité à huit fichiers par message                                 |

### Pipeline entrant

Lorsqu'un message Slack avec des pièces jointes de fichiers arrive :

1. OpenClaw télécharge le fichier depuis l'URL privée de Slack en utilisant le jeton du bot.
2. Le fichier est écrit dans le média store en cas de succès.
3. Les chemins et types de contenu des médias téléchargés sont ajoutés au contexte entrant.
4. Les chemins de modèle/outil compatibles avec l'image peuvent utiliser les pièces jointes d'image de ce contexte.
5. Les fichiers non-image restent disponibles en tant que métadonnées de fichier ou références de médias pour les outils qui peuvent les gérer.

### Héritage des pièces jointes de racine de fil

Lorsqu'un message arrive dans un fil (a un parent `thread_ts`) :

- Si la réponse elle-même n'a pas de média direct et que le message racine inclus contient des fichiers, Slack peut hydrater les fichiers racine en tant que contexte de démarrage de fil.
- Les pièces jointes de réponse directe priment sur les pièces jointes de message racine.
- Un message racine contenant uniquement des fichiers et sans texte est représenté par un espace réservé de pièce jointe afin que la solution de secours puisse toujours inclure ses fichiers.

### Gestion des pièces jointes multiples

Lorsqu'un seul message Slack contient plusieurs pièces jointes de fichiers :

- Chaque pièce jointe est traitée indépendamment via le pipeline média.
- Les références des médias téléchargés sont agrégées dans le contexte du message.
- L'ordre de traitement suit l'ordre des fichiers de Slack dans la charge utile de l'événement.
- Un échec du téléchargement d'une pièce jointe ne bloque pas les autres.

### Limites de taille, de téléchargement et de model

- **Limite de taille** : 20 Mo par fichier par défaut. Configurable via `channels.slack.mediaMaxMb`.
- **Échecs de téléchargement** : Les fichiers que Slack ne peut pas servir, les URL expirées, les fichiers inaccessibles, les fichiers trop volumineux et les réponses HTML d'authentisation/connexion Slack sont ignorés au lieu d'être signalés comme des formats non pris en charge.
- **Model de vision** : L'analyse d'image utilise le model de réponse actif lorsqu'il prend en charge la vision, ou le model d'image configuré à `agents.defaults.imageModel`.

### Limites connues

| Scénario                                 | Comportement actuel                                                                                                    | Solution de contournement                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| URL de fichier Slack expirée             | Fichier ignoré ; aucune erreur affichée                                                                                | Téléchargez à nouveau le fichier dans Slack                                                       |
| Model de vision non configuré            | Les pièces jointes d'images sont stockées sous forme de références média, mais ne sont pas analysées en tant qu'images | Configurez `agents.defaults.imageModel` ou utilisez un model de réponse compatible avec la vision |
| Très grandes images (> 20 Mo par défaut) | Ignorées en raison de la limite de taille                                                                              | Augmentez `channels.slack.mediaMaxMb` si Slack le permet                                          |
| Pièces jointes transférées/partagées     | Le texte et les médias image/fichier hébergés par Slack sont sur la base du meilleur effort                            | Partagez à nouveau directement dans le fil OpenClaw                                               |
| Pièces jointes PDF                       | Stockées en tant que contexte de fichier/média, non acheminées automatiquement via la vision d'image                   | Utilisez `download-file` pour les métadonnées de fichier ou l'outil `pdf` pour l'analyse PDF      |

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
    Comportement des DM de groupe et de canal.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminer les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Configuration" icon="sliders" href="/fr/gateway/configuration">
    Disposition et priorité de la configuration.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Catalogue et comportement des commandes.
  </Card>
</CardGroup>

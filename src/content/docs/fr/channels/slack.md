---
summary: "SlackConfiguration et comportement d'exécution de Slack (Socket Mode + URL de requête HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

Prêt pour la production pour les DMs et les channels via les intégrations d'application Slack. Le mode par défaut est Socket Mode ; les URL de requêtes HTTP sont également prises en charge.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les DM Slack sont en mode d'appariement par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics multicanaux et playbooks de réparation.
  </Card>
</CardGroup>

## Choisir entre le mode Socket et les URL de requête HTTP

Les deux modes de transport sont prêts pour la production et offrent une parité fonctionnelle pour la messagerie, les commandes slash, App Home et l'interactivité. Choisissez en fonction de la forme du déploiement, et non des fonctionnalités.

| Souci                                              | Mode Socket (par défaut)                                                                                                                                                                             | URL de requête HTTP                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL publique Gateway                               | Non requis                                                                                                                                                                                           | Requis (DNS, TLS, proxy inverse ou tunnel)                                                                                                              |
| Réseau sortant                                     | WSS sortant vers `wss-primary.slack.com` doit être accessible                                                                                                                                        | Pas de WS sortant ; uniquement HTTPS entrant                                                                                                            |
| Jetons nécessaires                                 | Jeton de bot (`xoxb-...`) + Jeton de niveau application (`xapp-...`) avec `connections:write`                                                                                                        | Jeton de bot (`xoxb-...`) + Signing Secret                                                                                                              |
| Ordinateur de développement / derrière un pare-feu | Fonctionne tel quel                                                                                                                                                                                  | Nécessite un tunnel public (ngrok, Cloudflare Tunnel, TailscaleGateway Funnel) ou une passerelle de staging                                             |
| Mise à l'échelle horizontale                       | Une session Socket Mode par application par hôte ; plusieurs passerelles nécessitent des applications Slack distinctes                                                                               | Gestionnaire POST sans état ; plusieurs répliques de Gateway peuvent partager une application derrière un répartiteur de charge                         |
| Multi-compte sur une seule passerelle              | Pris en charge ; chaque compte ouvre son propre WS                                                                                                                                                   | Pris en charge ; chaque compte a besoin d'un `webhookPath` unique (par défaut `/slack/events`) pour éviter que les enregistrements entrent en collision |
| Transport de commande slash                        | Livré via la connexion WS ; `slash_commands[].url` est ignoré                                                                                                                                        | Slack envoie des POST vers `slash_commands[].url` ; le champ est requis pour l'acheminement de la commande                                              |
| Signature de la requête                            | Non utilisé (l'auth est le Jeton de Niveau Application)                                                                                                                                              | Slack signe chaque requête ; OpenClaw vérifie avec `signingSecret`                                                                                      |
| Récupération en cas de perte de connexion          | La reconnexion automatique du SDK Slack est activée ; OpenClaw redémarre également les sessions Socket Mode échouées avec un exponentiel borné. Le réglage du transport du délai de pong s'applique. | Aucune connexion persistante à perdre ; les nouvelles tentatives sont effectuées par requête depuis Slack                                               |

<Note>
  **Choisissez le Socket Mode** pour les hôtes Gateway uniques, les ordinateurs portables de développement et les réseaux sur site qui peuvent atteindre `*.slack.com` sortant mais ne peuvent pas accepter HTTPS entrant.

**Choisissez les URL de requête HTTP** lors de l'exécution de plusieurs répliques Gateway derrière un équilibreur de charge, lorsque le WSS sortant est bloqué mais que le HTTPS entrant est autorisé, ou lorsque vous terminez déjà les webhooks Slack sur un proxy inverse.

</Note>

## Installer

Installez Slack avant de configurer le channel :

```bash
openclaw plugins install @openclaw/slack
```

`plugins install` enregistre et active le plugin. Le plugin ne fait encore rien tant que vous n'avez pas configuré l'application Slack et les paramètres de canal ci-dessous. Consultez [Plugins](/fr/tools/plugin) pour connaître le comportement général des plugins et les règles d'installation.

## Configuration rapide

<Tabs>
  <Tab title="Socket Mode (par défaut)">
    <Steps>
      <Step title="SlackCréer une nouvelle application Slack">
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des fichiers manifeste ci-dessous → **Next** → **Create**.

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
        "assistant_thread_context_changed",
        "assistant_thread_started",
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
          **Recommended** correspond à l'ensemble complet de fonctionnalités du plugin Slack : App Home, commandes slash, fichiers, réactions, épingles, messages de groupe (DMs), et lectures d'émojis/groupes d'utilisateurs. Choisissez **Minimal** lorsque la stratégie de l'espace de travail restreint les portées (scopes) — il couvre les DMs, l'historique des canaux/groupes, les mentions et les commandes slash mais abandonne les fichiers, les réactions, les épingles, les messages de groupe (`mpim:*`), `emoji:read`, et `usergroups:read`. Consultez [Manifest and scope checklist](#manifest-and-scope-checklistSlack) pour la justification par portée et les options additives telles que des commandes slash supplémentaires.
        </Note>

        Une fois que Slack a créé l'application :

        - **Basic Information → App-Level Tokens → Generate Token and Scopes** : ajoutez `connections:write`, enregistrez, copiez la valeur du `xapp-...`.
        - **Install App → Install to Workspace** : copiez le jeton Bot User OAuth OAuth `xoxb-...`.

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

  <Tab title="URLs de requêtes HTTP">
    <Steps>
      <Step title="SlackCréer une nouvelle application Slack">
        Ouvrez [api.slack.com/apps](https://api.slack.com/apps/new) → **Create New App** → **From a manifest** → sélectionnez votre espace de travail → collez l'un des manifests ci-dessous → remplacez `https://gateway-host.example.com/slack/events`Gateway par votre URL publique Gateway → **Next** → **Create**.

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
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "assistant_thread_context_changed",
        "assistant_thread_started",
        "message.channels",
        "message.groups",
        "message.im"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```Slack

        </CodeGroup>

        <Note>
          **Recommended** correspond à l'ensemble complet des fonctionnalités du plugin Slack ; **Minimal** supprime les fichiers, les réactions, les épingles, les DM de groupe (`mpim:*`), `emoji:read`, et `usergroups:read` pour les espaces de travail restrictifs. Consultez la [checklist du manifest et des scopes](#manifest-and-scope-checklist) pour la justification par scope.
        </Note>

        <Info>
          Les trois champs d'URL (`slash_commands[].url`, `event_subscriptions.request_url`, et `interactivity.request_url` / `message_menu_options_url`OpenClawSlackOpenClaw) pointent tous vers le même point de terminaison OpenClaw. Le schéma de manifest de Slack exige qu'ils soient nommés séparément, mais OpenClaw route par type de payload, donc un seul `webhookPath` (par défaut `/slack/events`) suffit. Les commandes slash sans `slash_commands[].url`Slack n'auront aucun effet (no-op) en mode HTTP.
        </Info>

        Une fois que Slack a créé l'application :

        - **Basic Information → App Credentials** : copiez le **Signing Secret** pour la vérification des requêtes.
        - **Install App → Install to Workspace** : copiez le jeton `xoxb-...`OAuth Bot User OAuth.

      </Step>

      <Step title="OpenClawConfigurer OpenClaw">

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
````

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

Utilisez ceci uniquement pour les espaces de travail en mode Socket qui enregistrent des délais d'attente de pong websocket/ping serveur Slack ou qui s'exécutent sur des hôtes avec un manque connu d'événements de boucle (event-loop starvation). `clientPingTimeout` est le temps d'attente du pong après l'envoi d'un ping client par le SDK ; `serverPingTimeout` est l'attente des pings serveur Slack. Les messages et événements de l'application restent un état de l'application, et non des signaux de vivacité du transport.

Notes :

- `socketMode` est ignoré en mode URL de requête HTTP.
- Les paramètres de base `channels.slack.socketMode` s'appliquent à tous les comptes Slack sauf s'ils sont remplacés. Les remplacements par compte utilisent `channels.slack.accounts.<accountId>.socketMode` ; comme il s'agit d'un remplacement d'objet, incluez chaque champ de réglage de socket que vous souhaitez pour ce compte.
- Seul `clientPingTimeout` a une valeur par défaut OpenClaw (`15000`). `serverPingTimeout` et `pingPongLoggingEnabled` sont transmis au SDK Slack uniquement lorsqu'ils sont configurés.
- Le temporisateur de redémarrage (backoff) du mode Socket commence autour de 2 secondes et plafonne autour de 30 secondes. Les défaillances consécutives récupérables de démarrage/attente de démarrage s'arrêtent après 12 tentatives ; après une connexion réussie, les déconnexions récupérables ultérieures entament un nouveau cycle de tentatives. Les erreurs d'authentification Slack non récupérables telles que `invalid_auth`, les jetons révoqués ou les portées manquantes échouent rapidement au lieu de réessayer indéfiniment.

## Liste de vérification du manifeste et des portées

Le manifeste de base de l'application Slack est le même pour le mode Socket et les URL de requête HTTP. Seul le bloc `settings` (et la commande slash `url`) diffère.

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

Le manifeste par défaut active l'onglet **Home** de l'application Slack et s'abonne à Slack`app_home_opened`OpenClaw. Lorsqu'un membre de l'espace de travail ouvre l'onglet Accueil, OpenClaw publie une vue Accueil par défaut sécurisée avec `views.publish`SlackSlack ; aucune charge utile de conversation ni de configuration privée n'est incluse. L'onglet **Messages** reste activé pour les Slack DMs. Le manifeste active également les fils de discussion de l'assistant Slack avec `features.assistant_view`, `assistant:write`, `assistant_thread_started` et `assistant_thread_context_changed`OpenClawSlack ; les fils de discussion de l'assistant acheminent vers leurs propres sessions de fils de discussion OpenClaw et gardent le contexte de fil de discussion fourni par Slack disponible pour l'agent.

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

        Répétez cette valeur `url` sur chaque commande de la liste.

      </Tab>
    </Tabs>

  </Accordion>
  <Accordion title="Optional authorship scopes (write operations)">
    Ajoutez la portée `chat:write.customize` bot si vous souhaitez que les messages sortants utilisent l'identité de l'agent actif (nom d'utilisateur et icône personnalisés) au lieu de l'identité par défaut de l'application Slack.

    Si vous utilisez une icône emoji, Slack attend la syntaxe `:emoji_name:`.

  </Accordion>
  <Accordion title="Optional user-token scopes (read operations)">
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
- Les jetons de configuration remplacent le repli (fallback) des variables d'environnement.
- Le repli (fallback) d'env `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` ne s'applique qu'au compte par défaut.
- `userToken` (`xoxp-...`) est réservé à la configuration (pas de repli d'env) et par défaut à un comportement en lecture seule (`userTokenReadOnly: true`).

Comportement de l'instantané d'état :

- L'inspection du compte Slack suit les champs `*Source` et `*Status`
  par identifiant (`botToken`, `appToken`, `signingSecret`, `userToken`).
- Le statut est `available`, `configured_unavailable` ou `missing`.
- `configured_unavailable` signifie que le compte est configuré via SecretRef
  ou une autre source de secret non en ligne, mais que le chemin de commande/exécution actuel
  n'a pas pu résoudre la valeur réelle.
- En mode HTTP, `signingSecretStatus` est inclus ; en mode Socket, la
  paire requise est `botTokenStatus` + `appTokenStatus`.

<Tip>Pour les actions/lectures de répertoire, le jeton utilisateur peut être préféré lorsqu'il est configuré. Pour les écritures, le jeton bot reste préféré ; les écritures avec jeton utilisateur sont uniquement autorisées lorsque `userTokenReadOnly: false` et que le jeton bot n'est pas disponible.</Tip>

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

Les actions de message Slack actuelles incluent `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` et `emoji-list`. `download-file` accepte les ID de fichier Slack affichés dans les espaces réservés de fichier entrants et renvoie des aperçus d'image pour les images ou les métadonnées de fichier local pour les autres types de fichiers.

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
    - `dm.allowFrom` (obsolète)
    - `dm.groupEnabled` (faux par défaut pour les DM de groupe)
    - `dm.groupChannels` (liste d'autorisation MPIM facultative)

    Priorité multi-compte :

    - `channels.slack.accounts.default.allowFrom` ne s'applique qu'au compte `default`.
    - Les comptes nommés héritent de `channels.slack.allowFrom` lorsque leur propre `allowFrom` n'est pas défini.
    - Les comptes nommés n'héritent pas de `channels.slack.accounts.default.allowFrom`.

    Les `channels.slack.dm.policy` et `channels.slack.dm.allowFrom` obsolètes sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    L'appairage dans les DM utilise `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Politique de channel">
    `channels.slack.groupPolicy` contrôle la gestion des channels :

    - `open`
    - `allowlist`
    - `disabled`

    La liste d'autorisation des channels se trouve sous `channels.slack.channels` et **doit utiliser des IDs de channel Slack stables** (par exemple `C12345678`) comme clés de configuration.

    Note d'exécution : si `channels.slack` est complètement manquant (configuration via variables d'environnement uniquement), l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Résolution de nom/ID :

    - les entrées de la liste d'autorisation des channels et les entrées de la liste d'autorisation des DM sont résolues au démarrage lorsque l'accès par jeton le permet
    - les entrées de nom de channel non résolues sont conservées telles que configurées mais ignorées pour le routage par défaut
    - l'autorisation entrante et le routage des channels sont basés sur l'ID par défaut ; la correspondance directe par nom d'utilisateur/slug nécessite `channels.slack.dangerouslyAllowNameMatching: true`

    <Warning>
    Les clés basées sur le nom (`#channel-name` ou `channel-name`) ne correspondent **pas** sous `groupPolicy: "allowlist"`. La recherche de channel est basée sur l'ID par défaut, donc une clé basée sur le nom ne réussira jamais le routage et tous les messages de ce channel seront bloqués silencieusement. Cela diffère de `groupPolicy: "open"`, où la clé de channel n'est pas requise pour le routage et une clé basée sur le nom semble fonctionner.

    Utilisez toujours l'ID du channel Slack comme clé. Pour le trouver : faites un clic droit sur le channel dans Slack → **Copy link** (Copier le lien) — l'ID (`C...`) apparaît à la fin de l'URL.

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

  <Tab title="Mentions et utilisateurs du channel">
    Les messages des channels sont filtrés par mention par défaut.

    Sources de mentions :

    - mention explicite de l'application (`<@botId>`)
    - mention du groupe d'utilisateurs Slack (`<!subteam^S...>`) lorsque l'utilisateur du bot est membre de ce groupe d'utilisateurs ; nécessite `usergroups:read`
    - modèles de regex de mention (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans un fil (désactivé lorsque `thread.requireExplicitMention` est `true`)

    Contrôles par channel (`channels.slack.channels.<id>` ; noms uniquement via la résolution au démarrage ou `dangerouslyAllowNameMatching`) :

    - `requireMention`
    - `users` (liste d'autorisation)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - format de clé `toolsBySender` : `channel:`, `id:`, `e164:`, `username:`, `name:`, ou Joker `"*"`
      (les clés héritées sans préfixe mappent toujours uniquement à `id:`)

    `allowBots` est prudent pour les channels et les channels privés : les messages de salle rédigés par le bot sont acceptés uniquement lorsque le bot émetteur est explicitement listé dans la liste d'autorisation `users` de cette salle, ou lorsqu'au moins un ID de propriétaire Slack explicite issu de `channels.slack.allowFrom` est actuellement membre de la salle. Les jokers et les entrées de propriétaire par nom d'affichage ne satisfont pas la présence du propriétaire. La présence du propriétaire utilise le `conversations.members` Slack ; assurez-vous que l'application dispose de la portée de lecture correspondante pour le type de salle (`channels:read` pour les channels publics, `groups:read` pour les channels privés). Si la recherche de membre échoue, OpenClaw rejette le message de salle rédigé par le bot.

    Les messages Slack acceptés et rédigés par un bot utilisent une protection commune contre les boucles de bot [bot loop protection](/fr/channels/bot-loop-protection). Configurez `channels.defaults.botLoopProtection` pour le budget par défaut, puis remplacez par `channels.slack.botLoopProtection` ou `channels.slack.channels.<id>.botLoopProtection` lorsqu'un espace de travail ou un channel a besoin d'une limite différente.

  </Tab>
</Tabs>

## Fils de discussion, sessions et balises de réponse

- Les DMs sont acheminés en tant que `direct` ; les channels en tant que `channel` ; les MPIM en tant que `group`.
- Les liaisons de route Slack acceptent les ID de homologues bruts ainsi que les formes cibles Slack telles que `channel:C12345678`, `user:U12345678` et `<@U12345678>`.
- Avec `session.dmScope=main` par défaut, les DMs Slack sont réduits à la session principale de l'agent.
- Sessions de channel : `agent:<agentId>:slack:channel:<channelId>`.
- Les messages de channel de premier niveau ordinaires restent sur la session par channel, même lorsque `replyToMode` est non `off`.
- Les réponses aux fils de discussion Slack utilisent le Slack `thread_ts` parent pour les suffixes de session (`:thread:<threadTs>`), même lorsque le threading des réponses sortantes est désactivé avec `replyToMode="off"`.
- OpenClaw initialise une racine de channel de premier niveau éligible dans `agent:<agentId>:slack:channel:<channelId>:thread:<rootTs>` lorsque cette racine est censée démarrer un fil de discussion Slack visible, de sorte que la racine et les réponses ultérieures du fil partagent une session OpenClaw. Cela s'applique aux événements `app_mention`, aux correspondances explicites du bot ou des modèles de mention configurés, et aux channels `requireMention: false` avec un `replyToMode` non `off`.
- La valeur par défaut de `channels.slack.thread.historyScope` est `thread` ; la valeur par défaut de `thread.inheritParent` est `false`.
- `channels.slack.thread.initialHistoryLimit` contrôle le nombre de messages de fil existants récupérés lors du démarrage d'une nouvelle session de fil (par défaut `20` ; définissez `0` pour désactiver).
- `channels.slack.thread.requireExplicitMention` (par défaut `false`) : lorsque `true`, supprime les mentions implicites de fils de discussion afin que le bot ne réponde qu'aux mentions explicites `@bot` à l'intérieur des fils, même si le bot a déjà participé au fil. Sans cela, les réponses dans un fil auquel participe le bot contournent le filtrage `requireMention`.

Contrôles des fils de réponse :

- `channels.slack.replyToMode` : `off|first|all|batched` (par défaut `off`)
- `channels.slack.replyToModeByChatType` : par `direct|group|channel`
- solution de repli héritée pour les chats directs : `channels.slack.dm.replyToMode`

Les balises de réponse manuelles sont prises en charge :

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Pour les réponses explicites aux fils Slack depuis l'outil `message`, définissez `replyBroadcast: true` avec `action: "send"` et `threadId` ou `replyTo` pour demander à Slack de diffuser également la réponse du fil vers le canal parent. Cela correspond au drapeau `chat.postMessage` `reply_broadcast` de Slack et n'est pris en charge que pour les envois de texte ou de Block Kit, et non pour les téléchargements de médias.

Lorsqu'un appel d'outil `message` s'exécute dans un fil Slack et cible le même canal, OpenClaw hérite normalement du fil Slack actuel selon `replyToMode`. Définissez `topLevel: true` sur `action: "send"` ou `action: "upload-file"` pour forcer un nouveau message de canal parent à la place. `threadId: null` est accepté comme la même option de refus de niveau supérieur.

<Note>
`replyToMode="off"` désactive le thread de réponse sortant Slack, y compris les balises `[[reply_to_*]]` explicites. Cela n'aplatit pas les sessions de thread entrantes Slack : les messages déjà postés dans un thread Slack sont toujours acheminés vers la session `:thread:<threadTs>`. Cela diffère de Telegram, où les balises explicites sont toujours respectées en mode `"off"`. Les threads Slack masquent les messages du channel, tandis que les réponses Telegram restent visibles en ligne.
</Note>

## Réactions d'accusé de réception

`ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- secours emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

Notes :

- Slack attend des codes courts (par exemple `"eyes"`).
- Utilisez `""` pour désactiver la réaction pour le compte Slack ou globalement.

## Diffusion de texte en continu

`channels.slack.streaming` contrôle le comportement de l'aperçu en direct :

- `off` : désactiver la diffusion de l'aperçu en direct.
- `partial` (par défaut) : remplacer le texte d'aperçu par la dernière sortie partielle.
- `block` : ajouter les mises à jour d'aperçu par morceaux.
- `progress` : afficher le texte d'état de progression pendant la génération, puis envoyer le texte final.
- `streaming.preview.toolProgress` : lorsque l'aperçu de brouillon est actif, acheminer les mises à jour d'outil/progression dans le même message d'aperçu modifié (par défaut : `true`). Définir `false` pour conserver des messages d'outil/progression séparés.
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

- Un fil de réponse doit être disponible pour que le flux de texte natif et le statut du fil de l'assistant Slack apparaissent. La sélection du fil suit toujours `replyToMode`.
- Les canaux, les discussions de groupe et les messages directs de niveau supérieur peuvent toujours utiliser l'aperçu de brouillon normal lorsque le flux natif n'est pas disponible ou qu'aucun fil de réponse n'existe.
- Par défaut, les messages directs de niveau supérieur Slack restent hors fil, ils n'affichent donc pas l'aperçu de flux/statut natif de style fil de Slack ; OpenClaw publie et modifie à la place un aperçu de brouillon dans le message direct.
- Les médias et les charges utiles non textuelles reviennent à la livraison normale.
- Les finales médias/erreur annulent les modifications d'aperçu en attente ; les finales textes/blocs éligibles ne sont envoyées que lorsqu'elles peuvent modifier l'aperçu en place.
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

- `channels.slack.streamMode` (`replace | status_final | append`) est un alias d'exécution hérité pour `channels.slack.streaming.mode`.
- le booléen `channels.slack.streaming` est un alias d'exécution hérité pour `channels.slack.streaming.mode` et `channels.slack.streaming.nativeTransport`.
- legacy `channels.slack.nativeStreaming` est un alias d'exécution pour `channels.slack.streaming.nativeTransport`.
- Exécutez `openclaw doctor --fix` pour réécrire la configuration de flux Slack persistante vers les clés canoniques.

## Retour de réaction de frappe

`typingReaction` ajoute une réaction temporaire au message Slack entrant pendant que OpenClaw traite une réponse, puis la supprime lorsque l'exécution est terminée. Ceci est surtout utile en dehors des réponses sur fil, qui utilisent un indicateur de statut "est en train d'écrire..." par défaut.

Ordre de résolution :

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notes :

- Slack attend des codes abrégés (par exemple `"hourglass_flowing_sand"`).
- La réaction est best-effort et un nettoyage est tenté automatiquement une fois le chemin de réponse ou d'échec terminé.

## Médias, segmentation et livraison

<AccordionGroup>
  <Accordion title="Pièces jointes entrantes"Slack>
    Les pièces jointes de fichiers Slack sont téléchargées depuis des URL privées hébergées par Slack (flux de requête authentifié par jeton) et écrites dans le média store lorsque le téléchargement réussit et que les limites de taille le permettent. Les espaces réservés de fichiers incluent le Slack `fileId` afin que les agents puissent récupérer le fichier d'origine avec `download-file`.

    Les téléchargements utilisent des délais d'inactivité et totaux bornés. Si la récupération du fichier Slack stagne ou échoue, OpenClaw continue de traiter le message et revient à l'espace réservé du fichier.

    La limite de taille entrante au moment de l'exécution est `20MB` par défaut, sauf si elle est remplacée par `channels.slack.mediaMaxMb`.

  </Accordion>

  <Accordion title="Texte et fichiers sortants">
    - les segments de texte utilisent `channels.slack.textChunkLimit` (4000 par défaut)
    - `channels.slack.chunkMode="newline"` active la segmentation paragraphe en premier
    - les envois de fichiers utilisent les API de téléchargement Slack et peuvent inclure des réponses de fil (`thread_ts`)
    - la limite de média sortant suit `channels.slack.mediaMaxMb` lorsqu'elle est configurée ; sinon, les envois de canal utilisent les valeurs par défaut de type MIME du pipeline média

  </Accordion>

  <Accordion title="Cibles de livraison">
    Cibles explicites préférées :

    - `user:<id>` pour les DMs
    - `channel:<id>` pour les channels

    Les DMs Slack texte/bloc uniquement peuvent poster directement aux ID utilisateur ; les téléchargements de fichiers et les envois threadés ouvrent le DM via les API de conversation Slack d'abord car ces chemins nécessitent un ID de conversation concret.

  </Accordion>
</AccordionGroup>

## Commandes et comportement slash

Les commandes slash apparaissent dans Slack soit comme une seule commande configurée soit comme plusieurs commandes natives. Configurez `channels.slack.slashCommand` pour modifier les valeurs par défaut des commandes :

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
Pour les nouveaux résultats d'agent, de CLI et de plugin, préférez les boutons
ou blocs de sélection partagés `presentation`. Ils utilisent le même chemin d'interaction
Slack tout en se dégradant sur d'autres canaux.

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

Lorsqu'il est activé, les agents peuvent toujours émettre des directives de réponse obsolètes uniquement Slack :

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

Utilisez les payloads `presentation` et `buildSlackPresentationBlocks(...)` pour les nouveaux
contrôles rendus par Slack.

Notes :

- Il s'agit d'une interface utilisateur (UI) héritée spécifique à Slack. Les autres canaux ne traduisent pas les
  directives Slack Block Kit dans leurs propres systèmes de boutons.
- Les valeurs de rappel interactives sont des jetons opaques générés par OpenClaw, et non les valeurs brutes créées par l'agent.
- Si les blocs interactifs générés dépassent les limites du Slack Block Kit, OpenClaw revient à la réponse textuelle d'origine au lieu d'envoyer un payload de blocs non valide.

### Soumissions de modales appartenant à des plugins

Les plugins Slack qui enregistrent un gestionnaire interactif peuvent également recevoir les événements de cycle de vie
modale `view_submission` et `view_closed` avant que OpenClaw ne compacte le
payload pour l'événement système visible par l'agent. Utilisez l'un de ces modèles de routage
lors de l'ouverture d'une modale Slack :

- Définissez `callback_id` sur `openclaw:<namespace>:<payload>`.
- Ou conservez un `callback_id` existant et mettez `pluginInteractiveData:
"<namespace>:<payload>"` in the modal `private_metadata`.

Le gestionnaire reçoit `ctx.interaction.kind` comme `view_submission` ou
`view_closed`, `inputs` normalisé, et l'objet complet brut `stateValues` de
Slack. Un routage basé uniquement sur l'identifiant de rappel suffit pour invoquer le gestionnaire de plugin ; incluez
les champs de routage utilisateur/session de la modale `private_metadata` existants lorsque la
modale doit également produire un événement système visible par l'agent. L'agent reçoit un
événement système `Slack interaction: ...` compact et expurgé. Si le gestionnaire renvoie
`systemEvent.summary`, `systemEvent.reference` ou `systemEvent.data`, ces
champs sont inclus dans cet événement compact afin que l'agent puisse référencer
le stockage appartenant au plugin sans voir le payload complet du formulaire.

## Approbations Exécutives dans Slack

Slack peut agir comme un client d'approbation natif avec des boutons interactifs et des interactions, au lieu de revenir à l'interface Web ou au terminal.

- Les approbations Exec utilisent `channels.slack.execApprovals.*` pour le routage natif DM/channel.
- Les approbations de plugin peuvent toujours être résolues via la même surface de bouton native Slack lorsque la demande atterrit déjà sur Slack et que le type d'ID d'approbation est `plugin:`.
- L'autorisation de l'approbateur est toujours appliquée : seuls les utilisateurs identifiés comme approbateurs peuvent approuver ou refuser des demandes via Slack.

Ceci utilise la même surface de bouton d'approbation partagée que les autres canaux. Lorsque `interactivity` est activé dans les paramètres de votre application Slack, les invites d'approbation s'affichent sous forme de boutons Block Kit directement dans la conversation.
Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
doit inclure une commande manuelle `/approve` uniquement lorsque le résultat de l'outil indique que les
approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.

Chemin de configuration :

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, défaut : `dm`)
- `agentFilter`, `sessionFilter`

Slack active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un
approbateur est résolu. Définissez `enabled: false` pour désactiver Slack en tant que client d'approbation natif de manière explicite.
Définissez `enabled: true` pour forcer l'activation des approbations natives lorsque les approbateurs sont résolus.

Comportement par défaut sans configuration explicite d'approbation d'exécution Slack :

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Une configuration native Slack explicite n'est nécessaire que lorsque vous souhaitez remplacer les approbateurs, ajouter des filtres ou
opter pour la livraison origin-chat :

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

Le transfert partagé `approvals.exec` est distinct. Utilisez-le uniquement lorsque les invites d'approbation exec doivent également être acheminées vers d'autres chats ou des cibles hors bande explicites. Le transfert partagé `approvals.plugin` est également distinct ; les boutons natifs Slack peuvent toujours résoudre les approbations de plugins lorsque ces demandes aboutissent déjà sur Slack.

Le `/approve` de même chat fonctionne également dans les channels et les DMs Slack qui prennent déjà en charge les commandes. Consultez [Exec approvals](/fr/tools/exec-approvals) pour le modèle complet de transfert des approbations.

## Événements et comportement opérationnel

- Les modifications/suppressions de messages sont mappées en événements système.
- Les diffusions de fils (réponses de fil "Envoyer également au channel") sont traitées comme des messages utilisateur normaux.
- Les événements d'ajout/suppression de réactions sont mappés en événements système.
- Les événements d'arrivée/départ de membre, de channel créé/renommé et d'ajout/suppression d'épingle sont mappés en événements système.
- `channel_id_changed` peut migrer les clés de configuration du channel lorsque `configWrites` est activé.
- Les métadonnées de sujet/objectif du channel sont traitées comme un contexte non approuvé et peuvent être injectées dans le contexte de routage.
- Le lanceur de fil et l'amorçage initial du contexte d'historique du fil sont filtrés par les listes autorisées d'expéditeurs configurées, le cas échéant.
- Les actions de bloc et les interactions modales émettent des événements système structurés `Slack interaction: ...` avec des champs de payload riches :
  - actions de bloc : valeurs sélectionnées, étiquettes, valeurs du sélecteur et métadonnées `workflow_*`
  - événements modaux `view_submission` et `view_closed` avec des métadonnées de channel acheminées et des entrées de formulaire

## Référence de configuration

Référence principale : [Configuration reference - Slack](/fr/gateway/config-channels#slack).

<Accordion title="SlackChamps Slack à signal fort">

- mode/auth : `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
- accès DM : `dm.enabled`, `dmPolicy`, `allowFrom` (obsolète : `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
- commutateur de compatibilité : `dangerouslyAllowNameMatching` (bris de verre ; désactivé sauf en cas de besoin)
- accès au channel : `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
- fils/historique : `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`, `streaming.preview.toolProgress`
- unfurls : `unfurlLinks` (par défaut : `false`), `unfurlMedia` pour le contrôle de l'aperçu des liens/médias `chat.postMessage` ; définissez `unfurlLinks: true` pour réactiver les aperçus de liens
- ops/fonctionnalités : `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

</Accordion>

## Dépannage

<AccordionGroup>
  <Accordion title="No replies in channels">
    Vérifiez, dans l'ordre :

    - `groupPolicy`
    - allowlist de canaux (`channels.slack.channels`) — **les clés doivent être des identifiants de canaux** (`C12345678`), et non des noms (`#channel-name`). Les clés basées sur des noms échouent silencieusement sous `groupPolicy: "allowlist"`Slack car le routage des canaux est basé sur l'ID par défaut. Pour trouver un ID : cliquez avec le bouton droit sur le canal dans Slack → **Copier le lien** — la valeur `C...` à la fin de l'URL est l'identifiant du canal.
    - `requireMention`
    - allowlist `users` par canal
    - `messages.groupChat.visibleReplies` : s'il est `"message_tool"` et que les journaux montrent le texte de l'assistant sans appel `message(action=send)`, le modèle a manqué le chemin du message-tool visible. Le texte final reste privé dans ce mode ; inspectez le journal détaillé de la passerelle pour les métadonnées de charge utile supprimées, ou définissez-le sur `"automatic"` si vous souhaitez que chaque réponse finale normale de l'assistant soit publiée via l'ancien chemin.
    - `messages.groupChat.unmentionedInbound` : s'il est `"room_event"`, les conversations non mentionnées des canaux autorisés constituent un contexte ambiant et restent silencieuses, sauf si l'agent appelle le `message` tool. Voir [Ambient room events](/fr/channels/ambient-room-events).

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
    Vérifier :

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (ou l'ancien `channels.slack.dm.policy`)
    - les approbations de jumelage / les entrées de liste blanche (`dmPolicy: "open"` nécessite toujours `channels.slack.allowFrom: ["*"]`)
    - les DM de groupe utilisent le traitement MPIM ; activez `channels.slack.dm.groupEnabled` et, si configuré, incluez le MPIM dans `channels.slack.dm.groupChannels`
    - Événements DM de Slack Assistant : les journaux détaillés mentionnant `drop message_changed`
      signifient généralement que Slack a envoyé un événement de thread Assistant modifié sans
      expéditeur humain récupérable dans les métadonnées du message

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode not connecting">
    Validez les jetons bot + application et l'activation du mode Socket dans les paramètres de l'application Slack.
    Le jeton de niveau application `xapp-...` a besoin de `connections:write`, et le jeton bot `xoxb-...`
    doit appartenir à la même application/espace de travail Slack que le jeton d'application.

    Si `openclaw channels status --probe --json` affiche `botTokenStatus` ou
    `appTokenStatus: "configured_unavailable"`, le compte Slack est
    configuré mais l'exécution actuelle n'a pas pu résoudre la valeur
    prise en charge par SecretRef.

    Les journaux tels que `slack socket mode failed to start; retry ...` sont des échecs de
    démarrage récupérables. Les étendues manquantes, les jetons révoqués et les authentifications non valides échouent rapidement.
    Un journal `slack token mismatch ...` signifie que le jeton bot et le jeton d'application
    semblent appartenir à des applications Slack différentes ; corrigez les identifiants de l'application Slack.

  </Accordion>

  <Accordion title="HTTP mode not receiving events">
    Validez :

    - signing secret
    - webhook path
    - Slack Request URLs (Events + Interactivity + Slash Commands)
    - unique `webhookPath` par compte HTTP
    - l'URL publique termine TLS et transfère les requêtes vers le chemin Gateway
    - le chemin `request_url` de l'application Slack correspond exactement à `channels.slack.webhookPath` (par défaut `/slack/events`)

    Si `signingSecretStatus: "configured_unavailable"` apparaît dans les instantanés
    de compte, le compte HTTP est configuré mais le runtime actuel n'a pas pu
    résoudre le signing secret soutenu par SecretRef.

    Un journal `slack: webhook path ... already registered` répété signifie que deux comptes HTTP
    utilisent le même `webhookPath` ; donnez à chaque compte un chemin distinct.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Vérifiez si vous aviez l'intention d'utiliser :

    - le mode de commande native (`channels.slack.commands.native: true`) avec les commandes slash correspondantes enregistrées dans Slack
    - ou le mode de commande slash unique (`channels.slack.slashCommand.enabled: true`)

    Slack ne crée ni ne supprime automatiquement les commandes slash. `commands.native: "auto"` n'active pas les commandes natives de Slack ; utilisez `true` et créez les commandes correspondantes dans l'application Slack. En mode HTTP, chaque commande slash Slack doit inclure l'URL Gateway. En mode Socket, les charges utiles de commande arrivent via le websocket et Slack ignore `slash_commands[].url`.

    Vérifiez également `commands.useAccessGroups`, l'autorisation DM, les listes d'autorisation de canaux,
    et les listes d'autorisation `users` par canal. Slack renvoie des erreurs éphémères pour
    les expéditeurs de commandes slash bloqués, notamment :

    - `This channel is not allowed.`
    - `You are not authorized to use this command here.`

  </Accordion>
</AccordionGroup>

## Référence de vision par pièce jointe

Slack peut joindre des médias téléchargés au tour de l'agent lorsque les téléchargements de fichiers Slack réussissent et que les limites de taille le permettent. Les fichiers image peuvent être transmis via le chemin de compréhension des médias ou directement à un modèle de réponse compatible avec la vision ; les autres fichiers sont conservés en tant que contexte de fichier téléchargeable plutôt que traités comme une entrée image.

### Types de médias pris en charge

| Type de média                  | Source                       | Comportement actuel                                                                                         | Notes                                                                                      |
| ------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Images JPEG / PNG / GIF / WebP | URL de fichier Slack         | Téléchargé et joint au tour pour un traitement compatible avec la vision                                    | Limite par fichier : `channels.slack.mediaMaxMb` (20 Mo par défaut)                        |
| Fichiers PDF                   | URL de fichier Slack         | Téléchargé et exposé en tant que contexte de fichier pour des outils tels que `download-file` ou `pdf`      | La réception Slack ne convertit pas automatiquement les PDF en entrée de vision par image  |
| Autres fichiers                | URL de fichier Slack         | Téléchargé si possible et exposé en tant que contexte de fichier                                            | Les fichiers binaires ne sont pas traités comme une entrée image                           |
| Réponses de fil de discussion  | Fichiers de démarrage de fil | Les fichiers du message racine peuvent être hydratés en contexte lorsque la réponse n'a pas de média direct | Les démarreurs composés uniquement de fichiers utilisent un espace réservé de pièce jointe |
| Messages multi-images          | Fichiers Slack multiples     | Chaque fichier est évalué indépendamment                                                                    | Le traitement Slack est limité à huit fichiers par message                                 |

### Pipeline entrant

Lorsqu'un message Slack avec des pièces jointes de fichiers arrive :

1. OpenClaw télécharge le fichier depuis l'URL privée de Slack en utilisant le jeton du bot (`xoxb-...`).
2. Le fichier est écrit dans le stockage média en cas de succès.
3. Les chemins des médias téléchargés et les types de contenu sont ajoutés au contexte entrant.
4. Les chemins de modèle/outil compatibles avec l'image peuvent utiliser les pièces jointes d'image de ce contexte.
5. Les fichiers non-image restent disponibles en tant que métadonnées de fichier ou références média pour les outils capables de les gérer.

### Héritage des pièces jointes de la racine du fil

Lorsqu'un message arrive dans un fil (a un parent `thread_ts`) :

- Si la réponse elle-même n'a pas de média direct et que le message racine inclus contient des fichiers, Slack peut hydrater les fichiers racine en tant que contexte de démarrage de fil.
- Les pièces jointes de réponse directe ont priorité sur les pièces jointes du message racine.
- Un message racine qui ne contient que des fichiers et aucun texte est représenté par un espace réservé de pièce jointe afin que la solution de secours puisse toujours inclure ses fichiers.

### Gestion de plusieurs pièces jointes

Lorsqu'un seul message Slack contient plusieurs pièces jointes de fichiers :

- Chaque pièce jointe est traitée indépendamment via le pipeline multimédia.
- Les références de médias téléchargés sont agrégées dans le contexte du message.
- L'ordre de traitement suit l'ordre des fichiers de Slack dans la charge utile de l'événement.
- Un échec lors du téléchargement d'une pièce jointe ne bloque pas les autres.

### Limites de taille, de téléchargement et de model

- **Limite de taille** : 20 Mo par fichier par défaut. Configurable via `channels.slack.mediaMaxMb`.
- **Échecs de téléchargement** : Les fichiers que Slack ne peut pas servir, les URL expirées, les fichiers inaccessibles, les fichiers trop volumineux et les réponses HTML d'authentification/connexion de Slack sont ignorés au lieu d'être signalés comme des formats non pris en charge.
- **Model de vision** : L'analyse d'image utilise le model de réponse actif lorsqu'il prend en charge la vision, ou le model d'image configuré à `agents.defaults.imageModel`.

### Limites connues

| Scénario                                      | Comportement actuel                                                                                                      | Solution de contournement                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| URL de fichier Slack expirée                  | Fichier ignoré ; aucune erreur affichée                                                                                  | Téléchargez à nouveau le fichier dans Slack                                                       |
| Model de vision non configuré                 | Les pièces jointes d'image sont stockées sous forme de références de média, mais ne sont pas analysées en tant qu'images | Configurez `agents.defaults.imageModel` ou utilisez un model de réponse compatible avec la vision |
| Images très volumineuses (> 20 Mo par défaut) | Ignorées en raison de la limite de taille                                                                                | Augmentez `channels.slack.mediaMaxMb` si Slack le permet                                          |
| Pièces jointes transférées/partagées          | Le texte et les médias d'image/fichier hébergés par Slack sont traités au mieux effort                                   | Partagez à nouveau directement dans le fil OpenClaw                                               |
| Pièces jointes PDF                            | Stockées sous forme de contexte de fichier/média, non acheminées automatiquement via la vision par image                 | Utilisez `download-file` pour les métadonnées de fichier ou le tool `pdf` pour l'analyse de PDF   |

### Documentation connexe

- [Pipeline de compréhension des médias](/fr/nodes/media-understanding)
- [Tool PDF](/fr/tools/pdf)
- Epic : [#51349](https://github.com/openclaw/openclaw/issues/51349) — Activation de la vision pour les pièces jointes Slack
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
    Disposition et priorité de la configuration.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Catalogue et comportement des commandes.
  </Card>
</CardGroup>

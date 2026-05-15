---
summary: "Configuration du channel et de la syntaxe cible pour le jeton de bot ClickClack"
read_when:
  - Connecting OpenClaw to a ClickClack workspace
  - Testing ClickClack bot identities
title: "ClickClack"
---

ClickClack connecte OpenClaw à un espace de travail ClickClack auto-hébergé via des jetons de bot ClickClack de première classe.

Utilisez ceci lorsque vous souhaitez qu'un agent OpenClaw apparaisse comme un utilisateur bot ClickClack. ClickClack prend en charge les bots de service indépendants et les bots détenus par des utilisateurs ; les bots détenus par des utilisateurs conservent un `owner_user_id` et ne reçoivent que les étendues de jeton que vous accordez.

## Configuration rapide

Créez un jeton de bot dans ClickClack :

```bash
clickclack admin bot create \
  --workspace <workspace_id_or_slug> \
  --name "OpenClaw" \
  --handle openclaw \
  --scopes bot:write \
  --plain
```

Pour un bot détenu par un utilisateur, ajoutez `--owner <user_id>`.

Configurez OpenClaw :

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      token: { source: "env", provider: "default", id: "CLICKCLACK_BOT_TOKEN" },
      workspace: "default",
      defaultTo: "channel:general",
      agentId: "clickclack-bot",
      replyMode: "model",
    },
  },
}
```

Exécutez ensuite :

```bash
export CLICKCLACK_BOT_TOKEN="ccb_..."
openclaw gateway
```

## Bots multiples

Chaque compte ouvre sa propre connexion temps réel ClickClack et utilise son propre jeton de bot.

```json5
{
  plugins: {
    entries: {
      clickclack: {
        llm: {
          allowAgentIdOverride: true,
        },
      },
    },
  },
  channels: {
    clickclack: {
      enabled: true,
      baseUrl: "https://app.clickclack.chat",
      defaultAccount: "service",
      accounts: {
        service: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_SERVICE_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "channel:general",
          agentId: "service-bot",
          replyMode: "model",
        },
        peter: {
          token: { source: "env", provider: "default", id: "CLICKCLACK_PETER_BOT_TOKEN" },
          workspace: "default",
          defaultTo: "dm:usr_...",
          agentId: "peter-bot",
          replyMode: "model",
        },
      },
    },
  },
}
```

`replyMode: "model"` utilise `api.runtime.llm.complete` directement pour les réponses courtes des bots.
Lorsqu'un compte définit `agentId`, OpenClaw nécessite le bit de confiance explicite
`plugins.entries.clickclack.llm.allowAgentIdOverride` afin que le plugin
puisse exécuter des complétions pour cet agent bot. Désactivez-le si vous utilisez uniquement l'agent par défaut.

## Cibles

- `channel:<name-or-id>` envoie vers un channel de l'espace de travail. Les cibles nues correspondent par défaut à `channel:`.
- `dm:<user_id>` crée ou réutilise une conversation directe avec cet utilisateur.
- `thread:<message_id>` répond dans un fil existant.

Exemples :

```bash
openclaw message send --channel clickclack --target channel:general --message "hello"
openclaw message send --channel clickclack --target dm:usr_123 --message "hello"
openclaw message send --channel clickclack --target thread:msg_123 --message "following up"
```

## Autorisations

Les étendues de jetons ClickClack sont appliquées par l'API de ClickClack.

- `bot:read` : lire les données de l'espace de travail/channel/message/fil/DM/temps réel/profil.
- `bot:write` : `bot:read` ainsi que les messages de channel, les réponses de fil, les DMs et les téléchargements.
- `bot:admin` : `bot:write` ainsi que la création de channels.

OpenClaw n'a besoin que de `bot:write` pour la chat normal de l'agent.

## Dépannage

- `ClickClack is not configured` : définissez `channels.clickclack.token` ou `CLICKCLACK_BOT_TOKEN`.
- `workspace not found` : définissez `workspace` sur l'ID ou le slug de l'espace de travail renvoyé par ClickClack.
- Pas de réponses entrantes : confirmez que le jeton a un accès en lecture en temps réel et que le bot ne répond pas à ses propres messages.
- Les envois vers le canal échouent : vérifiez que le bot est membre de l'espace de travail et dispose de `bot:write`.

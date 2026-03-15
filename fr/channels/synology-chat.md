---
summary: "Configuration du webhook Synology Chat et configuration OpenClaw"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat (plugin)

État : pris en charge via un plugin en tant que channel de message direct utilisant les webhooks Synology Chat.
Le plugin accepte les messages entrants des webhooks sortants Synology Chat et envoie des réponses
via un webhook entrant Synology Chat.

## Plugin requis

Synology Chat est basé sur un plugin et ne fait pas partie de l'installation par défaut des channel de base.

Installer depuis une copie locale :

```bash
openclaw plugins install ./extensions/synology-chat
```

Détails : [Plugins](/fr/tools/plugin)

## Installation rapide

1. Installez et activez le plugin Synology Chat.
2. Dans les intégrations Synology Chat :
   - Créez un webhook entrant et copiez son URL.
   - Créez un webhook sortant avec votre jeton secret.
3. Faites pointer l'URL du webhook sortant vers votre passerelle OpenClaw :
   - `https://gateway-host/webhook/synology` par défaut.
   - Ou votre `channels.synology-chat.webhookPath` personnalisé.
4. Configurez `channels.synology-chat` dans OpenClaw.
5. Redémarrez la passerelle et envoyez un DM au bot Synology Chat.

Configuration minimale :

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## Variables d'environnement

Pour le compte par défaut, vous pouvez utiliser les env vars :

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (séparé par des virgules)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Les valeurs de configuration remplacent les env vars.

## Stratégie de DM et contrôle d'accès

- `dmPolicy: "allowlist"` est la valeur par défaut recommandée.
- `allowedUserIds` accepte une liste (ou une chaîne séparée par des virgules) d'ID utilisateur Synology.
- En mode `allowlist`, une liste `allowedUserIds` vide est traitée comme une erreur de configuration et la route du webhook ne démarrera pas (utilisez `dmPolicy: "open"` pour tout autoriser).
- `dmPolicy: "open"` permet à n'importe quel expéditeur.
- `dmPolicy: "disabled"` bloque les DMs.
- Les approbations d'appariement fonctionnent avec :
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Livraison sortante

Utilisez les ID numériques des utilisateurs Synology Chat comme cibles.

Exemples :

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

Les envois de médias sont pris en charge via la livraison de fichiers par URL.

## Multi-compte

Plusieurs comptes Synology Chat sont pris en charge sous `channels.synology-chat.accounts`.
Chaque compte peut remplacer le jeton, l'URL entrante, le chemin du webhook, la politique DM et les limites.

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## Notes de sécurité

- Gardez `token` secret et faites-le tourner en cas de fuite.
- Gardez `allowInsecureSsl: false` sauf si vous faites explicitement confiance à un certificat NAS local auto-signé.
- Les demandes de webhook entrantes sont vérifiées par jeton et limitées par taux par expéditeur.
- Préférez `dmPolicy: "allowlist"` pour la production.

import fr from '/components/footer/fr.mdx';

<fr />

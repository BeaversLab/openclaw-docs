---
summary: "Configuration du webhook Synology Chat et de OpenClaw"
read_when:
  - Configuration de Synology Chat avec OpenClaw
  - Débogage du routage des webhooks Synology Chat
title: "Synology Chat"
---

# Synology Chat (plugin)

État : pris en charge via un plugin en tant que channel de message direct utilisant les webhooks Synology Chat.
Le plugin accepte les messages entrants des webhooks sortants Synology Chat et envoie des réponses
via un webhook entrant Synology Chat.

## Plugin requis

Synology Chat est basé sur un plugin et ne fait pas partie de l'installation des channels core par défaut.

Installer à partir d'une copie locale :

```bash
openclaw plugins install ./extensions/synology-chat
```

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide

1. Installez et activez le plugin Synology Chat.
   - `openclaw onboard` affiche désormais Synology Chat dans la même liste de configuration de channel que `openclaw channels add`.
   - Configuration non interactive : `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. Dans les intégrations Synology Chat :
   - Créez un webhook entrant et copiez son URL.
   - Créez un webhook sortant avec votre jeton secret.
3. Pointez l'URL du webhook sortant vers votre passerelle OpenClaw :
   - `https://gateway-host/webhook/synology` par défaut.
   - Ou votre `channels.synology-chat.webhookPath` personnalisé.
4. Terminez la configuration dans OpenClaw.
   - Guidé : `openclaw onboard`
   - Direct : `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
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
- `SYNOLOGY_ALLOWED_USER_IDS` (séparés par des virgules)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Les valeurs de configuration prévalent sur les env vars.

## Stratégie DM et contrôle d'accès

- `dmPolicy: "allowlist"` est la valeur par défaut recommandée.
- `allowedUserIds` accepte une liste (ou une chaîne séparée par des virgules) d'ID utilisateur Synology.
- En mode `allowlist`, une liste `allowedUserIds` vide est considérée comme une mauvaise configuration et la route webhook ne démarrera pas (utilisez `dmPolicy: "open"` pour tout autoriser).
- `dmPolicy: "open"` autorise n'importe quel expéditeur.
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

Les envois de médias sont pris en charge par la livraison de fichiers basée sur l'URL.

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

- Gardez `token` secret et faites-le tourner s'il est divulgué.
- Gardez `allowInsecureSsl: false` sauf si vous faites explicitement confiance à un certificat NAS local auto-signé.
- Les demandes de webhook entrantes sont vérifiées par jeton et limitées en taux par expéditeur.
- Préférez `dmPolicy: "allowlist"` pour la production.

import en from "/components/footer/en.mdx";

<en />

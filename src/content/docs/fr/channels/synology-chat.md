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

Les valeurs de configuration remplacent les env vars.

## Politique de DM et contrôle d'accès

- `dmPolicy: "allowlist"` est la valeur par défaut recommandée.
- `allowedUserIds` accepte une liste (ou une chaîne séparée par des virgules) d'ID utilisateur Synology.
- En mode `allowlist`, une liste `allowedUserIds` vide est considérée comme une mauvaise configuration et la route du webhook ne démarrera pas (utilisez `dmPolicy: "open"` pour tout autoriser).
- `dmPolicy: "open"` autorise n'importe quel expéditeur.
- `dmPolicy: "disabled"` bloque les DMs.
- La liaison du destinataire de la réponse reste par défaut sur un `user_id` numérique stable. `channels.synology-chat.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la recherche modifiable par nom d'utilisateur/pseudo pour la livraison des réponses.
- Les approbations d'appariement fonctionnent avec :
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Livraison sortante

Utilisez les ID utilisateur numériques Synology Chat comme cibles.

Exemples :

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

Les envois de médias sont pris en charge par la livraison de fichiers basée sur l'URL.

## Multi-compte

Plusieurs comptes Synology Chat sont pris en charge sous `channels.synology-chat.accounts`.
Chaque compte peut remplacer le jeton, l'URL entrante, le chemin du webhook, la politique de DM et les limites.
Les sessions de message direct sont isolées par compte et utilisateur, donc le même `user_id` numérique
sur deux comptes Synology différents ne partage pas l'état de la transcription.
Donnez à chaque compte activé un `webhookPath` distinct. OpenClaw rejette désormais les chemins exacts en double
et refuse de démarrer les comptes nommés qui n'héritent que d'un chemin de webhook partagé dans les configurations multi-comptes.
Si vous avez intentionnellement besoin d'un héritage hérité pour un compte nommé, définissez
`dangerouslyAllowInheritedWebhookPath: true` sur ce compte ou à `channels.synology-chat`,
mais les chemins exacts en double sont toujours rejetés en mode échec (fail-closed). Préférez des chemins explicites par compte.

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

- Gardez `token` secret et faites-le tourner s'il fuite.
- Gardez `allowInsecureSsl: false` sauf si vous faites explicitement confiance à un certificat NAS local auto-signé.
- Les requêtes webhook entrantes sont vérifiées par jeton et limitées par taux par expéditeur.
- Préférez `dmPolicy: "allowlist"` pour la production.
- Désactivez `dangerouslyAllowNameMatching` sauf si vous avez explicitement besoin de la livraison de réponse héritée basée sur le nom d'utilisateur.
- Désactivez `dangerouslyAllowInheritedWebhookPath` sauf si vous acceptez explicitement le risque de routage par chemin partagé dans une configuration multi-compte.

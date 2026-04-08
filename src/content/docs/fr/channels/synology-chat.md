---
summary: "Configuration du webhook Synology Chat et configuration OpenClaw"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat

État : canal de message direct plugin intégré utilisant les webhooks Synology Chat.
Le plugin accepte les messages entrants des webhooks sortants Synology Chat et envoie les réponses
via un webhook entrant Synology Chat.

## Plugin intégré

Synology Chat est fourni en tant que plugin intégré dans les versions actuelles d'OpenClaw, donc les versions
normales n'ont pas besoin d'installation séparée.

Si vous utilisez une version ancienne ou une installation personnalisée qui exclut Synology Chat,
installez-le manuellement :

Installation à partir d'une copie locale :

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

Détails : [Plugins](/en/tools/plugin)

## Installation rapide

1. Assurez-vous que le plugin Synology Chat est disponible.
   - Les versions actuelles packagées d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement depuis une copie des sources avec la commande ci-dessus.
   - `openclaw onboard` affiche désormais Synology Chat dans la même liste de configuration de canal que `openclaw channels add`.
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

Détails de l'authentification du webhook :

- OpenClaw accepte le jeton du webhook sortant depuis `body.token`, puis
  `?token=...`, puis les en-têtes.
- Formes d'en-tête acceptées :
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- Les jetons vides ou manquants entraînent un échec sécurisé.

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

Pour le compte par défaut, vous pouvez utiliser des variables d'environnement :

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (séparés par des virgules)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Les valeurs de configuration prévalent sur les variables d'environnement.

## Stratégie de DM et contrôle d'accès

- `dmPolicy: "allowlist"` est la valeur par défaut recommandée.
- `allowedUserIds` accepte une liste (ou une chaîne séparée par des virgules) d'ID utilisateur Synology.
- En mode `allowlist`, une liste `allowedUserIds` vide est considérée comme une mauvaise configuration et la route du webhook ne démarrera pas (utilisez `dmPolicy: "open"` pour tout autoriser).
- `dmPolicy: "open"` autorise n'importe quel expéditeur.
- `dmPolicy: "disabled"` bloque les DMs.
- La liaison du destinataire de la réponse reste par défaut sur l'identifiant numérique stable `user_id`. `channels.synology-chat.dangerouslyAllowNameMatching: true` est un mode de compatibilité de secours qui réactive la recherche mutable par nom d'utilisateur/pseudonyme pour la livraison des réponses.
- Les approbations d'appairage fonctionnent avec :
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Livraison sortante

Utilisez les ID utilisateur numériques Synology Chat comme cibles.

Exemples :

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

Les envois de médias sont pris en charge via la livraison de fichiers par URL.

## Multi-compte

Plusieurs comptes Synology Chat sont pris en charge sous `channels.synology-chat.accounts`.
Chaque compte peut remplacer le jeton, l'URL entrante, le chemin du webhook, la stratégie de DM et les limites.
Les sessions de messages directs sont isolées par compte et par utilisateur, donc le même identifiant numérique `user_id`
sur deux comptes Synology différents ne partage pas l'état de la transcription.
Donnez à chaque compte activé un `webhookPath` distinct. OpenClaw rejette désormais les chemins exacts en double
et refuse de démarrer les comptes nommés qui n'héritent que d'un chemin de webhook partagé dans les configurations multi-comptes.
Si vous avez intentionnellement besoin de l'héritage hérité pour un compte nommé, définissez
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

- Gardez `token` secret et faites-le tourner s'il est divulgué.
- Gardez `allowInsecureSsl: false` sauf si vous faites explicitement confiance à un certificat NAS local auto-signé.
- Les demandes webhook entrantes sont vérifiées par jeton et limitées par taux par expéditeur.
- Les vérifications de jeton invalides utilisent une comparaison secrète à temps constant et échouent de manière fermée (fail closed).
- Préférez `dmPolicy: "allowlist"` pour la production.
- Désactivez `dangerouslyAllowNameMatching` sauf si vous avez explicitement besoin de la livraison des réponses basée sur le nom d'utilisateur hérité.
- Gardez `dangerouslyAllowInheritedWebhookPath` désactivé, sauf si vous acceptez explicitement les risques de routage par chemin partagé dans une configuration multi-compte.

## Dépannage

- `Missing required fields (token, user_id, text)` :
  - la charge utile du webhook sortant manque l'un des champs requis
  - si Synology envoie le jeton dans les en-têtes, assurez-vous que la passerelle/le proxy conserve ces en-têtes
- `Invalid token` :
  - le secret du webhook sortant ne correspond pas à `channels.synology-chat.token`
  - la requête atteint le mauvais compte ou le mauvais chemin de webhook
  - un proxy inverse a supprimé l'en-tête du jeton avant que la requête n'atteigne OpenClaw
- `Rate limit exceeded` :
  - trop de tentatives de jeton invalides provenant de la même source peuvent bloquer temporairement cette source
  - les expéditeurs authentifiés ont également une limite de taux de messages distincte par utilisateur
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.` :
  - `dmPolicy="allowlist"` est activé mais aucun utilisateur n'est configuré
- `User not authorized` :
  - l'identifiant numérique `user_id` de l'expéditeur n'est pas dans `allowedUserIds`

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appariement](/en/channels/pairing) — authentification DM et processus d'appariement
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement

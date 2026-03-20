---
summary: "Vue d'ensemble de l'appairage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Configuration du contrôle d'accès par DM
  - Appairage d'un nouveau nœud iOS/Android
  - Révision de la posture de sécurité OpenClaw
title: "Appairage"
---

# Appairage

« L'appairage » est l'étape explicite d'**approbation par le propriétaire** de OpenClaw.
Elle est utilisée à deux endroits :

1. **Appairage par DM** (qui est autorisé à parler au bot)
2. **Appairage de nœuds** (quels appareils/nœuds sont autorisés à rejoindre le réseau gateway)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Appairage par DM (accès à la chat entrant)

Lorsqu'un channel est configuré avec une stratégie DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message n'est **pas traité** tant que vous n'avez pas approuvé.

Les stratégies DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

Codes d'appairage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n'envoie le message d'appairage que lorsqu'une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes d'appairage DM en attente sont plafonnées à **3 par channel** par défaut ; les demandes supplémentaires sont ignorées jusqu'à ce que l'une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Channels pris en charge : `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`, `feishu`.

### Où l'état est stocké

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d'autorisation approuvée :
  - Compte par défaut : `<channel>-allowFrom.json`
  - Compte non par défaut : `<channel>-<accountId>-allowFrom.json`

Comportement de la portée du compte :

- Les comptes non par défaut lisent/écrivent uniquement leur fichier de liste d'autorisation délimitée.
- Le compte par défaut utilise le fichier de liste d'autorisation non délimité par channel.

Traitez-les comme sensibles (ils contrôlent l'accès à votre assistant).

## 2) Appairage d'appareils nœuds (iOS/Android/macOS/nœuds headless)

Les nœuds se connectent au Gateway en tant qu'**appareils** avec `role: node`. Le Gateway
crée une demande d'appairage d'appareil qui doit être approuvée.

### Appairer via Telegram (recommandé pour iOS)

Si vous utilisez le plugin `device-pair`, vous pouvez effectuer l'appairage de l'appareil pour la première fois entièrement depuis Telegram :

1. Sur Telegram, envoyez un message à votre bot : `/pair`
2. Le bot répond avec deux messages : un message d'instruction et un message de **code de configuration** séparé (facile à copier/coller dans Telegram).
3. Sur votre téléphone, ouvrez l'application OpenClaw iOS → Paramètres → Gateway.
4. Collez le code de configuration et connectez-vous.
5. De retour sur Telegram : `/pair approve`

Le code de configuration est une charge utile JSON encodée en base64 qui contient :

- `url` : l'URL WebSocket du Gateway (`ws://...` ou `wss://...`)
- `bootstrapToken` : un jeton d'amorçage monopériode de courte durée utilisé pour la poignée de main initiale de l'appairage

Traitez le code de configuration comme un mot de passe tant qu'il est valide.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Stockage de l'état d'appairage des nœuds

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (de courte durée ; les demandes en attente expirent)
- `paired.json` (appareils appariés + jetons)

### Remarques

- L'ancien API `node.pair.*` (CLI : `openclaw nodes pending/approve`) est un magasin d'appairage distinct appartenant à la passerelle. Les nœuds WS nécessitent toujours l'appairage des appareils.

## Documentation connexe

- Modèle de sécurité + injection de prompt : [Sécurité](/fr/gateway/security)
- Mise à jour sécurisée (exécuter doctor) : [Mise à jour](/fr/install/updating)
- Configurations de canal :
  - Telegram : [Telegram](/fr/channels/telegram)
  - WhatsApp : [WhatsApp](/fr/channels/whatsapp)
  - Signal : [Signal](/fr/channels/signal)
  - BlueBubbles (iMessage) : [BlueBubbles](/fr/channels/bluebubbles)
  - iMessage (legacy) : [iMessage](/fr/channels/imessage)
  - Discord : [Discord](/fr/channels/discord)
  - Slack : [Slack](/fr/channels/slack)

import fr from "/components/footer/fr.mdx";

<fr />

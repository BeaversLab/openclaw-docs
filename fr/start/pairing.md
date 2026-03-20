---
summary: "Aperçu de l'appairage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Configuration du contrôle d'accès par DM
  - Appairage d'un nouveau nœud iOS/Android
  - Examen de la posture de sécurité de OpenClaw
title: "Appairage"
---

# Appairage

L'« appairage » est l'étape d'**approbation explicite par le propriétaire** de OpenClaw.
Il est utilisé à deux endroits :

1. **Appairage DM** (qui est autorisé à parler au bot)
2. **Appairage de nœud** (quels appareils/nœuds sont autorisés à rejoindre le réseau de la passerelle)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Appairage DM (accès à la discussion entrante)

Lorsqu'un canal est configuré avec la stratégie de DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message n'est **pas traité** jusqu'à ce que vous l'approuviez.

Les stratégies de DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

Codes d'appairage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n'envoie le message d'appairage que lorsqu'une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes d'appairage DM en attente sont limitées à **3 par canal** par défaut ; les demandes supplémentaires sont ignorées jusqu'à ce que l'une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canaux pris en charge : `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`.

### Où se trouve l'état

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d'autorisation approuvée : `<channel>-allowFrom.json`

Traitez-les comme sensibles (ils contrôlent l'accès à votre assistant).

## 2) Appairage d'appareil nœud (nœuds iOS/Android/macOS/headless)

Les nœuds se connectent à la Gateway en tant qu'**appareils** avec `role: node`. La Gateway
crée une demande d'appairage d'appareil qui doit être approuvée.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Où se trouve l'état

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (à courte durée de vie ; les demandes en attente expirent)
- `paired.json` (appareils appariés + jetons)

### Remarques

- L'ancienne API `node.pair.*` (CLI : `openclaw nodes pending/approve`) est un
  magasin d'appairage distinct appartenant à la passerelle. Les nœuds WS nécessitent toujours un appairage d'appareil.

## Documentation connexe

- Modèle de sécurité + injection de prompt : [Sécurité](/fr/gateway/security)
- Mise à jour en toute sécurité (exécuter le doctor) : [Mise à jour](/fr/install/updating)
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

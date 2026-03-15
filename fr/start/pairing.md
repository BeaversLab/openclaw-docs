---
summary: "Aperçu du couplage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Couplage"
---

# Couplage

Le « couplage » est l’étape d’**approbation explicite par le propriétaire** d’OpenClaw.
Il est utilisé à deux endroits :

1. **Couplage DM** (qui est autorisé à parler au bot)
2. **Couplage de nœuds** (quels appareils/nœuds sont autorisés à rejoindre le réseau Gateway)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Couplage DM (accès aux messages entrants)

Lorsqu’un canal est configuré avec la stratégie de DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message est **non traité** jusqu’à votre approbation.

Les stratégies DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

Codes de couplage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n’envoie le message de couplage que lorsqu’une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes de couplage DM en attente sont limitées à **3 par canal** par défaut ; les demandes supplémentaires sont ignorées jusqu’à ce que l’une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canaux pris en charge : `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`.

### Où l’état est stocké

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d’autorisation approuvée : `<channel>-allowFrom.json`

Traitez-les comme sensibles (ils contrôlent l’accès à votre assistant).

## 2) Couplage d’appareils nœuds (iOS/Android/macOS/nœuds headless)

Les nœuds se connectent à la Gateway en tant qu'**appareils** avec `role: node`. La Gateway
crée une demande de couplage d’appareil qui doit être approuvée.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Où l’état est stocké

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (à court terme ; les demandes en attente expirent)
- `paired.json` (appareils appairés + jetons)

### Notes

- L'`node.pair.*` API héritée (CLI : `openclaw nodes pending/approve`) est un
  magasin d'appairage distinct détenu par la passerelle. Les nœuds WS nécessitent toujours l'appairage des appareils.

## Documentation connexe

- Modèle de sécurité + injection de prompt : [Sécurité](/fr/gateway/security)
- Mise à jour en toute sécurité (exécuter doctor) : [Mise à jour](/fr/install/updating)
- Configurations des canaux :
  - Telegram : [Telegram](/fr/channels/telegram)
  - WhatsApp : [WhatsApp](/fr/channels/whatsapp)
  - Signal : [Signal](/fr/channels/signal)
  - BlueBubbles (iMessage) : [BlueBubbles](/fr/channels/bluebubbles)
  - iMessage (legacy) : [iMessage](/fr/channels/imessage)
  - Discord : [Discord](/fr/channels/discord)
  - Slack : [Slack](/fr/channels/slack)

import fr from '/components/footer/fr.mdx';

<fr />

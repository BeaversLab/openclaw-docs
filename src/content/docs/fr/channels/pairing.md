---
summary: "Vue d'ensemble du couplage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Couplage"
---

# Couplage

Le « couplage » est l'étape d'**approbation explicite par le propriétaire** d'OpenClaw.
Il est utilisé dans deux cas :

1. **Couplage DM** (qui est autorisé à parler au bot)
2. **Couplage de nœuds** (quels appareils/nœuds sont autorisés à rejoindre le réseau passerelle)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Couplage DM (accès aux messages entrants)

Lorsqu'un canal est configuré avec la stratégie de DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message n'est **pas traité** tant que vous ne l'avez pas approuvé.

Les politiques DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

Codes de couplage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n'envoie le message de couplage que lorsqu'une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes de couplage DM en attente sont limitées à **3 par canal** par défaut ; les demandes supplémentaires sont ignorées jusqu'à ce que l'une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canaux pris en charge : `bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Où se trouve l'état

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d'autorisation approuvée :
  - Compte par défaut : `<channel>-allowFrom.json`
  - Compte non par défaut : `<channel>-<accountId>-allowFrom.json`

Comportement de la portée du compte :

- Les comptes non par défaut lisent et écrivent uniquement leur fichier de liste d'autorisation délimité.
- Le compte par défaut utilise le fichier de liste d'autorisation non délimité par canal.

Traitez-les comme sensibles (ils contrôlent l'accès à votre assistant).

Important : ce stockage est pour l'accès DM. L'autorisation de groupe est distincte.
Approuver un code de couplage DM n'autorise pas automatiquement cet expéditeur à exécuter des commandes de groupe ou à contrôler le bot dans les groupes. Pour l'accès aux groupes, configurez les listes d'autorisation de groupe explicites du channel (par exemple `groupAllowFrom`, `groups`, ou des remplacements par groupe/sujet selon le channel).

## 2) Couplage des périphériques de nœud (nœuds iOS/Android/macOS/headless)

Les nœuds se connectent à la Gateway en tant que **périphériques** avec `role: node`. La Gateway
crée une demande de couplage de périphérique qui doit être approuvée.

### Coupler via Telegram (recommandé pour iOS)

Si vous utilisez le plugin `device-pair`, vous pouvez effectuer le couplage initial du périphérique entièrement depuis Telegram :

1. Sur Telegram, envoyez un message à votre bot : `/pair`
2. Le bot répond avec deux messages : un message d'instruction et un message de **code de configuration** séparé (facile à copier/coller dans Telegram).
3. Sur votre téléphone, ouvrez l'application OpenClaw iOS → Paramètres → Gateway.
4. Collez le code de configuration et connectez-vous.
5. De retour sur Telegram : `/pair pending` (vérifiez les ID de demande, le rôle et les portées), puis approuvez.

Le code de configuration est une charge utile JSON encodée en base64 qui contient :

- `url` : l'URL WebSocket de la Gateway (`ws://...` ou `wss://...`)
- `bootstrapToken` : un jeton d'amorçage (bootstrap) à courte durée de vie et pour un seul périphérique, utilisé pour la poignée de main initiale du couplage

Ce jeton d'amorçage transporte le profil d'amorçage de couplage intégré :

- le jeton `node` transféré principal reste `scopes: []`
- tout jeton `operator` transféré reste lié à la liste d'autorisation d'amorçage :
  `operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`
- les vérifications de portée d'amorçage sont préfixées par rôle, et non un pool de portées unique :
  les entrées de portée d'opérateur satisfont uniquement les demandes d'opérateur, et les rôles non-opérateurs
  doivent toujours demander des portées sous leur propre préfixe de rôle

Traitez le code de configuration comme un mot de passe tant qu'il est valide.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Si le même appareil réessaie avec des détails d'authentification différents (par exemple un rôle/des portées/une clé publique différent), la demande en attente précédente est remplacée et un nouveau `requestId` est créé.

### Stockage de l'état d'appairage des nœuds

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (à courte durée de vie ; les demandes en attente expirent)
- `paired.json` (appareils appariés + jetons)

### Notes

- L'ancien `node.pair.*` API (CLI : `openclaw nodes pending|approve|reject|rename`) est un magasin d'appairage distinct possédé par la passerelle. Les nœuds WS nécessitent toujours l'appairage des appareils.
- L'enregistrement d'appairage est la source de vérité durable pour les rôles approuvés. Les jetons d'appareil actifs restent liés à cet ensemble de rôles approuvés ; une entrée de jeton erronée en dehors des rôles approuvés ne crée pas nouvel accès.

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

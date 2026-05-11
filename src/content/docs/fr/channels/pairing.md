---
summary: "Aperçu de l'appairage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Appairage"
---

« L'appairage » est l'étape d'**approbation explicite par le propriétaire** d'OpenClaw.
Elle est utilisée à deux endroits :

1. **Appairage DM** (qui est autorisé à parler au bot)
2. **Appairage de nœuds** (quels appareils/nœuds sont autorisés à rejoindre le réseau de passerelle)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Appairage DM (accès aux messages entrants)

Lorsqu'un canal est configuré avec la politique de DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message n'est **pas traité** jusqu'à ce que vous l'approuviez.

Les politiques de DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

Codes d'appairage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n'envoie le message d'appairage que lorsqu'une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes d'appairage DM en attente sont limitées à **3 par canal** par défaut ; les demandes supplémentaires sont ignorées jusqu'à ce que l'une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canaux pris en charge : `bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Où réside l'état

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d'autorisation approuvée :
  - Compte par défaut : `<channel>-allowFrom.json`
  - Compte non par défaut : `<channel>-<accountId>-allowFrom.json`

Comportement de la portée du compte :

- Les comptes non par défaut lisent et écrivent uniquement leur fichier de liste d'autorisation délimitée.
- Le compte par défaut utilise le fichier de liste d'autorisation non délimité et délimité au canal.

Traitez-les comme sensibles (ils contrôlent l'accès à votre assistant).

<Note>
  Ce stockage est pour l'accès DM. L'autorisation de groupe est séparée. Approuver un code d'appariement DM n'autorise pas automatiquement cet expéditeur à exécuter des commandes de groupe ou à contrôler le bot dans les groupes. Pour l'accès aux groupes, configurez les listes d'autorisation de groupe explicites du canal (par exemple `groupAllowFrom`, `groups`, ou des remplacements par groupe ou
  par sujet selon le canal).
</Note>

## 2) Appariement d'appareils nœuds (nœuds iOS/Android/macOS/sans interface)

Les nœuds se connectent à la Gateway en tant qu'**appareils** avec `role: node`. La Gateway
crée une demande d'appariement d'appareil qui doit être approuvée.

### Appairer via Telegram (recommandé pour iOS)

Si vous utilisez le plugin `device-pair`, vous pouvez effectuer le premier appariement d'appareil entièrement depuis Telegram :

1. Dans Telegram, envoyez un message à votre bot : `/pair`
2. Le bot répond avec deux messages : un message d'instruction et un message de **code de configuration** séparé (facile à copier/coller dans Telegram).
3. Sur votre téléphone, ouvrez l'application OpenClaw iOS → Paramètres → Gateway.
4. Collez le code de configuration et connectez-vous.
5. De retour dans Telegram : `/pair pending` (examinez les ID de demande, le rôle et les portées), puis approuvez.

Le code de configuration est une charge utile JSON encodée en base64 qui contient :

- `url` : l'URL WebSocket de la Gateway (`ws://...` ou `wss://...`)
- `bootstrapToken` : un jeton d'amorçage (bootstrap) à court terme pour un seul appareil utilisé pour la poignée de main initiale de l'appariement

Ce jeton d'amorçage transporte le profil d'amorçage d'appariement intégré :

- le jeton `node` transféré principal reste `scopes: []`
- tout jeton `operator` transféré reste limité à la liste d'autorisation d'amorçage :
  `operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`
- les vérifications de portée d'amorçage sont préfixées par rôle, et non un pool de portées plat :
  les entrées de portée d'opérateur ne satisfont que les demandes d'opérateur, et les rôles non-opérateurs
  doivent toujours demander des portées sous leur propre préfixe de rôle
- la rotation/la révocation ultérieures du jeton restent limitées à la fois par le contrat de rôle approuvé de l'appareil et les étendues d'opérateur de la session de l'appelant

Traitez le code de configuration comme un mot de passe tant qu'il est valide.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Si le même appareil réessaie avec des détails d'authentification différents (par exemple un rôle/étendues/clé publique différents), la demande en attente précédente est remplacée et un nouveau `requestId` est créé.

<Note>Un appareil déjà appairé n'obtient pas silencieusement un accès plus large. S'il se reconnecte en demandant plus d'étendues ou un rôle plus large, OpenClaw conserve l'approbation existante telle quelle et crée une nouvelle demande de mise à niveau en attente. Utilisez `openclaw devices list` pour comparer l'accès actuellement approuvé avec le nouvel accès demandé avant d'approuver.</Note>

### Approbation automatique de nœud de CIDR de confiance (facultatif)

L'appairage des appareils reste manuel par défaut. Pour les réseaux de nœuds étroitement contrôlés, vous pouvez opter pour l'auto-approbation des nœuds lors de la première connexion avec des CIDR explicites ou des IP exactes :

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Cela ne s'applique qu'aux nouvelles demandes d'appairage `role: node` sans étendues demandées. Les clients Opérateur, navigateur, Interface de contrôle et WebChat nécessitent toujours une approbation manuelle. Les modifications de rôle, d'étendue, de métadonnées et de clé publique nécessitent toujours une approbation manuelle.

### Stockage de l'état d'appairage des nœuds

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (à court terme ; les demandes en attente expirent)
- `paired.json` (appareils appairés + jetons)

### Notes

- L'ancien `node.pair.*` API (CLI : `openclaw nodes pending|approve|reject|remove|rename`) est un
  magasin d'appairage distinct propriétaire de la passerelle. Les nœuds WS nécessitent toujours un appairage d'appareil.
- L'enregistrement d'appairage est la source durable de vérité pour les rôles approuvés. Les jetons d'appareil actifs restent liés à cet ensemble de rôles approuvés ; une entrée de jeton erronée en dehors des rôles approuvés ne crée pas de nouvel accès.

## Docs associés

- Modèle de sécurité + injection de prompt : [Sécurité](/fr/gateway/security)
- Mise à jour en toute sécurité (exécuter doctor) : [Mise à jour](/fr/install/updating)
- Configurations de canal :
  - Telegram : [Telegram](/fr/channels/telegram)
  - WhatsApp : [WhatsApp](/fr/channels/whatsapp)
  - Signal : [Signal](/fr/channels/signal)
  - BlueBubbles (iMessage) : [BlueBubbles](/fr/channels/bluebubbles)
  - iMessage (ancien) : [iMessage](/fr/channels/imessage)
  - Discord : [Discord](/fr/channels/discord)
  - Slack : [Slack](/fr/channels/slack)

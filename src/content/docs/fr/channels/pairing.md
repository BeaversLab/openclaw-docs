---
summary: "Aperçu de l'appairage : approuver qui peut vous envoyer un DM + quels nœuds peuvent rejoindre"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Appairage"
---

"L'appairage" est l'étape d'approbation d'accès explicite d'OpenClaw.
Il est utilisé dans deux cas :

1. **Appairage DM** (qui est autorisé à parler au bot)
2. **Appairage de nœuds** (quels appareils/nœuds sont autorisés à rejoindre le réseau de passerelle)

Contexte de sécurité : [Sécurité](/fr/gateway/security)

## 1) Appairage DM (accès aux messages entrants)

Lorsqu'un channel est configuré avec la politique de DM `pairing`, les expéditeurs inconnus reçoivent un code court et leur message n'est **pas traité** tant que vous n'avez pas approuvé.

Les stratégies de DM par défaut sont documentées dans : [Sécurité](/fr/gateway/security)

`dmPolicy: "open"` n'est public que lorsque la liste d'autorisation DM effective inclut `"*"`.
La configuration et la validation nécessitent ce caractère générique pour les configurations publiques ouvertes. Si l'état
existant contient `open` avec des entrées `allowFrom` concrètes, le runtime n'admet
toujours que ces expéditeurs, et les approbations du magasin d'appairage n'élargissent pas l'accès `open`.

Codes de couplage :

- 8 caractères, majuscules, sans caractères ambigus (`0O1I`).
- **Expire après 1 heure**. Le bot n'envoie le message de couplage que lorsqu'une nouvelle demande est créée (environ une fois par heure par expéditeur).
- Les demandes de couplage DM en attente sont limitées à **3 par canal** par défaut ; les demandes supplémentaires sont ignorées jusqu'à ce que l'une expire ou soit approuvée.

### Approuver un expéditeur

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Si aucun propriétaire de commande n'est encore configuré, l'approbation d'un code d'appairage DM initialise également
`commands.ownerAllowFrom` pour l'expéditeur approuvé, tel que `telegram:123456789`.
Cela donne aux premières configurations un propriétaire explicite pour les commandes privilégiées et les invites
d'approbation d'exécution. Une fois qu'un propriétaire existe, les approbations d'appairage ultérieures n'accordent que l'accès
DM ; elles n'ajoutent pas de propriétaires supplémentaires.

Canaux pris en charge : `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Groupes d'expéditeurs réutilisables

Utilisez `accessGroups` de premier niveau lorsque le même ensemble d'expéditeurs de confiance doit s'appliquer à
plusieurs canaux de messages ou à la fois aux listes d'autorisation DM et de groupe.

Les groupes statiques utilisent `type: "message.senders"` et sont référencés par
`accessGroup:<name>` depuis les listes d'autorisation de canal :

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

Les groupes d'accès sont documentés en détail ici : [Groupes d'accès](/fr/channels/access-groups)

### Où l'état est stocké

Stocké sous `~/.openclaw/credentials/` :

- Demandes en attente : `<channel>-pairing.json`
- Stockage de la liste d'autorisation approuvée :
  - Compte par défaut : `<channel>-allowFrom.json`
  - Compte non par défaut : `<channel>-<accountId>-allowFrom.json`

Comportement de la portée du compte :

- Les comptes non par défaut lisent et écrivent uniquement leur fichier de liste d'autorisation délimité.
- Le compte par défaut utilise le fichier de liste d'autorisation non délimité par le canal.

Traitez-les comme sensibles (ils contrôlent l'accès à votre assistant).

<Note>
  Le stockage de la liste d'autorisation d'appariement est pour l'accès DM. L'autorisation de groupe est séparée. Approuver un code d'appariement DM n'autorise pas automatiquement cet expéditeur à exécuter des commandes de groupe ou à contrôler le bot dans les groupes. L'amorçage du premier propriétaire est un état de configuration séparé dans `commands.ownerAllowFrom`, et la livraison des
  messages de groupe suit toujours les listes d'autorisation de groupe du canal (par exemple `groupAllowFrom`, `groups`, ou des substitutions par groupe ou par sujet selon le canal).
</Note>

## 2) Appariement de périphérique de nœud (nœuds iOS/Android/macOS/sans tête)

Les nœuds se connectent à la Gateway en tant que **périphériques** avec `role: node`. La Gateway
crée une demande d'appariement de périphérique qui doit être approuvée.

### Appairer via Telegram (recommandé pour iOS)

Si vous utilisez le plugin `device-pair`, vous pouvez effectuer le premier appariement de périphérique entièrement depuis Telegram :

1. Sur Telegram, envoyez un message à votre bot : `/pair`
2. Le bot répond avec deux messages : un message d'instruction et un message de **code de configuration** séparé (facile à copier/coller dans Telegram).
3. Sur votre téléphone, ouvrez l'application OpenClaw iOS → Paramètres → Gateway.
4. Scannez le code QR ou collez le code de configuration et connectez-vous.
5. De retour sur Telegram : `/pair pending` (vérifiez les IDs de demande, le rôle et les portées), puis approuvez.

Le code de configuration est une charge utile JSON encodée en base64 qui contient :

- `url` : l'URL WebSocket du Gateway (`ws://...` ou `wss://...`)
- `bootstrapToken` : un jeton d'amorçage (bootstrap) à courte durée de vie et à usage unique, utilisé pour la poignée de main (handshake) de jumelage initial

Ce jeton d'amorçage porte le profil d'amorçage de jumelage intégré :

- le profil de configuration intégré n'autorise que le rôle `node`
- après approbation, le `node` transféré reste `scopes: []`
- le flux de code de configuration intégré ne transfère pas de `operator`
- l'accès opérateur nécessite un appairage opérateur approuvé distinct ou un flux de jeton
- la rotation/la révocation ultérieure des jetons reste limitée à la fois par le contrat de rôle approuvé de l'appareil et les portées opérateur de la session de l'appelant

Traitez le code de configuration comme un mot de passe tant qu'il est valide.

Pour Tailscale, public ou autre appairage mobile distant, utilisez Tailscale Serve/Funnel
ou une autre URL Gateway `wss://`. Les codes de configuration en texte clair `ws://` sont acceptés uniquement
pour le bouclage, les adresses LAN privées, les hôtes Bonjour `.local` et l'hôte de l'émulateur Android.
Les adresses CGNAT Tailnet, les noms `.ts.net` et les hôtes publics échouent toujours
de manière sécurisée avant l'émission du QR/du code de configuration.

### Approuver un appareil nœud

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Lorsqu'une approbation explicite est refusée parce que la session de l'appareil approuvé approuvant
a été ouverte avec une portée d'appairage uniquement, la CLI réessaie la même requête avec
`operator.admin`. Cela permet à un appareil approuvé capable d'administration existant de récupérer un nouvel
appairage Control UI/navigateur sans modifier `devices/paired.json` à la main. Le
Gateway valide toujours la connexion retentée ; les jetons qui ne peuvent pas s'authentifier
avec `operator.admin` restent bloqués.

Si le même appareil réessaie avec des détails d'authentification différents (par exemple un rôle/portées/clé public différent),
la demande en attente précédente est remplacée et un nouveau `requestId` est créé.

<Note>
  Un appareil déjà appairé n'obtient pas silencieusement un accès plus large. S'il se reconnecte en demandant davantage de portées ou un rôle plus large, OpenClaw conserve l'approbation existante telle quelle et crée une nouvelle demande de mise à niveau en attente. Utilisez `openclaw devices list` pour comparer l'accès actuellement approuvé avec le nouvel accès demandé avant d'approuver.
</Note>

### Approbation automatique optionnelle des nœuds de CIDR de confiance

L'appairage d'appareil reste manuel par défaut. Pour les réseaux de nœuds étroitement contrôlés,
vous pouvez opter pour l'approbation automatique des nœuds lors de la première connexion avec des CIDRs explicites ou des IP exactes :

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

Cela s'applique uniquement aux nouvelles demandes d'appairage `role: node` sans portée
(« scopes ») demandée. Les clients Opérateur, navigateur, Control UI et WebChat nécessitent toujours une approbation
manuelle. Les modifications de rôle, de portée, de métadonnées et de clé publique nécessitent toujours une approbation
manuelle.

### Stockage de l'état d'appairage des nœuds

Stocké sous `~/.openclaw/devices/` :

- `pending.json` (à courte durée de vie ; les demandes en attente expirent)
- `paired.json` (appareils appairés + jetons)

### Notes

- L'API héritée `node.pair.*` (CLI : `openclaw nodes pending|approve|reject|remove|rename`) est un
  stockage d'appairage distinct appartenant à la passerelle. Les nœuds WS nécessitent toujours un appairage d'appareil.
- L'enregistrement d'appairage est la source durable de vérité pour les rôles approuvés. Les
  jetons d'appareil actifs restent liés à cet ensemble de rôles approuvés ; une entrée de jeton errante
  en dehors des rôles approuvés ne crée pas de nouvel accès.

## Documentation connexe

- Modèle de sécurité + injection de prompt : [Sécurité](/fr/gateway/security)
- Mise à jour en toute sécurité (exécuter doctor) : [Mise à jour](/fr/install/updating)
- Configurations de canal :
  - Telegram : [Telegram](/fr/channels/telegram)
  - WhatsApp : [WhatsApp](/fr/channels/whatsapp)
  - Signal : [Signal](/fr/channels/signal)
  - iMessage : [iMessage](/fr/channels/imessage)
  - Discord : [Discord](/fr/channels/discord)
  - Slack : [Slack](SlackSlack/en/channels/slack)

---
summary: "Configuration, installation et utilisation du plug-in de l'API de messagerie LINE"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

LINE se connecte à OpenClaw via l'API de messagerie LINE. Le plugin fonctionne en tant que récepteur de webhook sur la passerelle et utilise votre jeton d'accès de canal et votre secret de canal pour l'authentification.

État : plug-in téléchargeable. Les messages directs, les discussions de groupe, les médias, les localisations, les messages Flex, les modèles de messages et les réponses rapides sont pris en charge. Les réactions et les fils de discussion ne sont pas pris en charge.

## Installer

Installez LINE avant de configurer le canal :

```bash
openclaw plugins install @openclaw/line
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## Configuration

1. Créez un compte LINE Developers et ouvrez la Console :
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. Créez (ou choisissez) un fournisseur et ajoutez un canal **Messaging API**.
3. Copiez le **Channel access token** et le **Channel secret** depuis les paramètres du canal.
4. Activez **Use webhook** dans les paramètres du Messaging API.
5. Définissez l'URL du webhook sur votre point de terminaison de passerelle (HTTPS requis) :

```
https://gateway-host/line/webhook
```

La passerelle répond à la vérification du webhook LINE (GET) et accuse réception des événements entrants signés (POST) immédiatement après la validation de la signature et de la charge utile ; le traitement de l'agent se poursuit de manière asynchrone.
Si vous avez besoin d'un chemin personnalisé, définissez `channels.line.webhookPath` ou `channels.line.accounts.<id>.webhookPath` et mettez à jour l'URL en conséquence.

Note de sécurité :

- La vérification de la signature LINE dépend du corps (HMAC sur le corps brut), donc OpenClaw applique des limites strictes de corps et de délai d'attente avant la vérification.
- OpenClaw traite les événements de webhook à partir des octets de demande bruts vérifiés. Les valeurs `req.body` transformées par l'intergiciel (middleware) en amont sont ignorées pour la sécurité de l'intégrité de la signature.

## Configurer

Configuration minimale :

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

Configuration publique de DM :

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "open",
      allowFrom: ["*"],
    },
  },
}
```

Variables d'environnement (compte par défaut uniquement) :

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Fichiers de jeton/secret :

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` et `secretFile` doivent pointer vers des fichiers réguliers. Les liens symboliques sont rejetés.

Comptes multiples :

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## Contrôle d'accès

Les messages directs sont par défaut en mode appairage. Les expéditeurs inconnus reçoivent un code d'appairage et leurs messages sont ignorés jusqu'à approbation.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Listes d'autorisation et stratégies :

- `channels.line.dmPolicy` : `pairing | allowlist | open | disabled`
- `channels.line.allowFrom` : IDs d'utilisateurs LINE autorisés pour les DMs ; `dmPolicy: "open"` nécessite `["*"]`
- `channels.line.groupPolicy` : `allowlist | open | disabled`
- `channels.line.groupAllowFrom` : IDs d'utilisateurs LINE autorisés pour les groupes
- Remplacements par groupe : `channels.line.groups.<groupId>.allowFrom`
- Les groupes d'accès d'expéditeur statiques peuvent être référencés depuis `allowFrom`, `groupAllowFrom` et par groupe `allowFrom` avec `accessGroup:<name>`.
- Note d'exécution : si `channels.line` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

Les ID LINE sont sensibles à la casse. Les ID valides ressemblent à :

- Utilisateur : `U` + 32 caractères hexadécimaux
- Groupe : `C` + 32 caractères hexadécimaux
- Salon : `R` + 32 caractères hexadécimaux

## Comportement des messages

- Le texte est découpé par tranches de 5000 caractères.
- Le formatage Markdown est supprimé ; les blocs de code et les tableaux sont convertis en cartes Flex lorsque cela est possible.
- Les réponses en flux continu sont mises en tampon ; LINE reçoit des blocs complets avec une animation de chargement pendant que l'agent travaille.
- Les téléchargements de médias sont limités par `channels.line.mediaMaxMb` (par défaut 10).
- Les médias entrants sont enregistrés sous `~/.openclaw/media/inbound/` avant d'être transmis
  à l'agent, correspondant au stockage de médias partagé utilisé par d'autres plugins de channel
  inclus.

## Données de channel (messages riches)

Utilisez `channelData.line` pour envoyer des réponses rapides, des lieux, des cartes Flex ou des messages
modèles.

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

Le plugin LINE fournit également une commande `/card` pour les préréglages de messages Flex :

```
/card info "Welcome" "Thanks for joining!"
```

## Prise en charge de l'ACP

LINE prend en charge les liaisons de conversation ACP (Agent Communication Protocol) :

- `/acp spawn <agent> --bind here` lie la conversation LINE actuelle à une session ACP sans créer de fil de discussion enfant.
- Les liaisons ACP configurées et les sessions ACP actives liées à une conversation fonctionnent sur LINE comme sur les autres canaux de conversation.

Voir [Agents ACP](/fr/tools/acp-agents) pour plus de détails.

## Médias sortants

Le plugin LINE prend en charge l'envoi d'images, de vidéos et de fichiers audio via l'outil de message de l'agent. Les médias sont envoyés via le chemin de livraison spécifique à LINE avec une gestion appropriée de l'aperçu et du suivi :

- **Images** : envoyées sous forme de messages image LINE avec génération automatique d'aperçu.
- **Vidéos** : envoyées avec un aperçu explicite et une gestion du type de contenu.
- **Audio** : envoyé sous forme de messages audio LINE.

Les URL de médias sortants doivent être des URL HTTPS publiques. OpenClaw valide le nom d'hôte cible avant de transmettre l'URL à LINE et rejette les cibles de bouclage, de lien local et de réseau privé.

Les envois de médias génériques reviennent à l'itinéraire existant réservé aux images lorsqu'un chemin spécifique à LINE n'est pas disponible.

## Dépannage

- **Échec de la vérification du webhook :** assurez-vous que l'URL du webhook est HTTPS et que
  `channelSecret` correspond à la console LINE.
- **Pas d'événements entrants :** confirmez que le chemin du webhook correspond à `channels.line.webhookPath`
  et que la passerelle est accessible depuis LINE.
- **Erreurs de téléchargement de média :** déclenchent `channels.line.mediaMaxMb` si le média dépasse la
  limite par défaut.

## Connexes

- [Aperçu des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement des conversations de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement

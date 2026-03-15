---
summary: "Configuration, configuration et utilisation du plugin LINE Messaging API"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE (plugin)

LINE se connecte à OpenClaw via l'API de messagerie LINE. Le plugin fonctionne en tant que récepteur de webhook sur la passerelle et utilise votre jeton d'accès channel + secret channel pour l'authentification.

Statut : pris en charge via un plugin. Les messages directs, les discussions de groupe, les médias, les localisations, les messages Flex, les modèles de messages et les réponses rapides sont pris en charge. Les réactions et les fils de discussion ne sont pas pris en charge.

## Plugin requis

Installez le plugin LINE :

```bash
openclaw plugins install @openclaw/line
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./extensions/line
```

## Configuration

1. Créez un compte LINE Developers et ouvrez la Console :
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. Créez (ou sélectionnez) un fournisseur et ajoutez un channel **Messaging API**.
3. Copiez le **Channel access token** et le **Channel secret** à partir des paramètres du channel.
4. Activez **Use webhook** dans les paramètres de l'API de messagerie.
5. Définissez l'URL du webhook sur votre point de terminaison de passerelle (HTTPS requis) :

```
https://gateway-host/line/webhook
```

La passerelle répond à la vérification du webhook de LINE (GET) et aux événements entrants (POST).
Si vous avez besoin d'un chemin personnalisé, définissez `channels.line.webhookPath` ou
`channels.line.accounts.<id>.webhookPath` et mettez à jour l'URL en conséquence.

Note de sécurité :

- La vérification de la signature LINE dépend du corps (HMAC sur le corps brut), donc OpenClaw applique des limites strictes de corps et de délai d'attente pré-authentification avant la vérification.

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

Les messages directs sont par défaut en mode appariement. Les expéditeurs inconnus reçoivent un code d'appariement et leurs messages sont ignorés jusqu'à approbation.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Listes d'autorisation et stratégies :

- `channels.line.dmPolicy` : `pairing | allowlist | open | disabled`
- `channels.line.allowFrom` : IDs utilisateur LINE autorisés pour les DMs
- `channels.line.groupPolicy` : `allowlist | open | disabled`
- `channels.line.groupAllowFrom` : IDs d'utilisateurs LINE sur liste blanche pour les groupes
- Remplacements par groupe : `channels.line.groups.<groupId>.allowFrom`
- Remarque d'exécution : si `channels.line` est totalement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

Les ID LINE sont sensibles à la casse. Les ID valides ressemblent à :

- Utilisateur : `U` + 32 caractères hexadécimaux
- Groupe : `C` + 32 caractères hexadécimaux
- Salon : `R` + 32 caractères hexadécimaux

## Comportement des messages

- Le texte est découpé par tranches de 5000 caractères.
- Le formatage Markdown est supprimé ; les blocs de code et les tableaux sont convertis en cartes Flex lorsque cela est possible.
- Les réponses en continu sont mises en tampon ; LINE reçoit les blocs complets avec une animation de chargement pendant que l'agent travaille.
- Les téléchargements de médias sont plafonnés par `channels.line.mediaMaxMb` (par défaut 10).

## Données de canal (messages enrichis)

Utilisez `channelData.line` pour envoyer des réponses rapides, des lieux, des cartes Flex ou des modèles de messages.

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

Le plugin LINE comprend également une commande `/card` pour les préréglages de messages Flex :

```
/card info "Welcome" "Thanks for joining!"
```

## Dépannage

- **Échec de la vérification du webhook :** assurez-vous que l'URL du webhook est en HTTPS et que le `channelSecret` correspond à la console LINE.
- **Aucun événement entrant :** confirmez que le chemin du webhook correspond à `channels.line.webhookPath` et que la passerelle est accessible depuis LINE.
- **Erreurs de téléchargement de médias :** augmentez `channels.line.mediaMaxMb` si les médias dépassent la limite par défaut.

import fr from '/components/footer/fr.mdx';

<fr />

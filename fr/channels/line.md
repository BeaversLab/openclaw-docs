---
summary: "Configuration, configuration et utilisation du plugin LINE Messaging API"
read_when:
  - Vous souhaitez connecter OpenClaw à LINE
  - Vous avez besoin de la configuration du webhook et des identifiants LINE
  - Vous souhaitez des options de message spécifiques à LINE
title: LINE
---

# LINE (plugin)

LINE se connecte à OpenClaw via le LINE Messaging API. Le plugin fonctionne en tant que récepteur de webhook
sur la passerelle et utilise votre jeton d'accès de channel et votre secret de channel pour
l'authentification.

Statut : pris en charge via un plugin. Les messages directs, les discussions de groupe, les médias, les localisations, les messages Flex,
les modèles de messages et les réponses rapides sont pris en charge. Les réactions et les fils de discussion
ne sont pas pris en charge.

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
2. Créez (ou choisissez) un fournisseur et ajoutez un channel **Messaging API**.
3. Copiez le **Channel access token** et le **Channel secret** à partir des paramètres du channel.
4. Activez **Use webhook** dans les paramètres du Messaging API.
5. Définissez l'URL du webhook sur le point de terminaison de votre passerelle (HTTPS requis) :

```
https://gateway-host/line/webhook
```

La passerelle répond à la vérification du webhook de LINE (GET) et aux événements entrants (POST).
Si vous avez besoin d'un chemin personnalisé, définissez `channels.line.webhookPath` ou
`channels.line.accounts.<id>.webhookPath` et mettez à jour l'URL en conséquence.

Note de sécurité :

- La vérification de la signature LINE dépend du corps (HMAC sur le corps brut), donc OpenClaw applique des limites strictes sur le corps et un délai d'expiration avant la vérification.

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

Les messages directs sont par défaut en mode appairage. Les expéditeurs inconnus reçoivent un code d'appairage et leurs
messages sont ignorés jusqu'à approbation.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Listes d'autorisation et stratégies :

- `channels.line.dmPolicy` : `pairing | allowlist | open | disabled`
- `channels.line.allowFrom` : IDs utilisateur LINE autorisés pour les DMs
- `channels.line.groupPolicy` : `allowlist | open | disabled`
- `channels.line.groupAllowFrom` : IDs utilisateur LINE autorisés pour les groupes
- Remplacements par groupe : `channels.line.groups.<groupId>.allowFrom`
- Note d'exécution : si `channels.line` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

Les identifiants LINE sont sensibles à la casse. Les identifiants valides ressemblent à :

- Utilisateur : `U` + 32 caractères hexadécimaux
- Groupe : `C` + 32 caractères hexadécimaux
- Salon : `R` + 32 caractères hexadécimaux

## Comportement des messages

- Le texte est découpé par tranches de 5000 caractères.
- Le formatage Markdown est supprimé ; les blocs de code et les tableaux sont convertis en cartes Flex lorsque cela est possible.
- Les réponses en flux continu (streaming) sont mises en tampon ; LINE reçoit des blocs complets avec une animation de chargement pendant que l'agent travaille.
- Les téléchargements de médias sont limités par `channels.line.mediaMaxMb` (par défaut 10).

## Données de canal (messages enrichis)

Utilisez `channelData.line` pour envoyer des réponses rapides, des localisations, des cartes Flex ou des modèles de messages.

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

## Dépannage

- **Échec de la vérification du webhook :** assurez-vous que l'URL du webhook est en HTTPS et que le `channelSecret` correspond à la console LINE.
- **Aucun événement entrant :** confirmez que le chemin du webhook correspond à `channels.line.webhookPath` et que la passerelle est accessible depuis LINE.
- **Erreurs de téléchargement de média :** augmentez `channels.line.mediaMaxMb` si le média dépasse la limite par défaut.

import fr from "/components/footer/fr.mdx";

<fr />

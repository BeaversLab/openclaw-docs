---
summary: "Cartes de messages sémantiques, boutons, sélections, texte de repli et indices de livraison pour les plugins de canal"
title: "Présentation des messages"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

La présentation des messages est le contrat partagé d'OpenClaw pour l'interface utilisateur de chat sortante riche. Elle permet aux agents, aux commandes CLI, aux flux d'approbation et aux plugins de décrire l'intention du message une seule fois, tandis que chaque plugin de canal restitue la meilleure forme native possible.

Utilisez la présentation pour une interface utilisateur de message portable :

- sections de texte
- petit texte de contexte/pied de page
- diviseurs
- boutons
- menus de sélection
- titre et ton de la carte

N'ajoutez pas de nouveaux champs natifs au fournisseur tels que Discord `components`, Slack
`blocks`, Telegram `buttons`, Teams `card` ou Feishu `card` à l'outil de message partagé. Ce sont des sorties du moteur de restitution appartenant au plugin de canal.

## Contrat

Les auteurs de plugins importent le contrat public depuis :

```ts
import type { MessagePresentation, ReplyPayloadDelivery } from "openclaw/plugin-sdk/interactive-runtime";
```

Forme :

```ts
type MessagePresentation = {
  title?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  blocks: MessagePresentationBlock[];
};

type MessagePresentationBlock = { type: "text"; text: string } | { type: "context"; text: string } | { type: "divider" } | { type: "buttons"; buttons: MessagePresentationButton[] } | { type: "select"; placeholder?: string; options: MessagePresentationOption[] };

type MessagePresentationButton = {
  label: string;
  value?: string;
  url?: string;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  value: string;
};

type ReplyPayloadDelivery = {
  pin?:
    | boolean
    | {
        enabled: boolean;
        notify?: boolean;
        required?: boolean;
      };
};
```

Sémantique des boutons :

- `value` est une valeur d'action d'application routée via le chemin d'interaction existant du canal lorsque celui-ci prend en charge les commandes cliquables.
- `url` est un bouton de lien. Il peut exister sans `value`.
- `label` est obligatoire et est également utilisé dans le texte de repli.
- `style` est consultatif. Les moteurs de restitution doivent mapper les styles non pris en charge à une valeur par défaut sécurisée, sans échouer l'envoi.

Sémantique des sélections :

- `options[].value` est la valeur de l'application sélectionnée.
- `placeholder` est consultatif et peut être ignoré par les canaux sans support natif des sélections.
- Si un canal ne prend pas en charge les sélections, le texte de repli liste les étiquettes.

## Exemples de producteurs

Carte simple :

```json
{
  "title": "Deploy approval",
  "tone": "warning",
  "blocks": [
    { "type": "text", "text": "Canary is ready to promote." },
    { "type": "context", "text": "Build 1234, staging passed." },
    {
      "type": "buttons",
      "buttons": [
        { "label": "Approve", "value": "deploy:approve", "style": "success" },
        { "label": "Decline", "value": "deploy:decline", "style": "danger" }
      ]
    }
  ]
}
```

Bouton de lien URL uniquement :

```json
{
  "blocks": [
    { "type": "text", "text": "Release notes are ready." },
    {
      "type": "buttons",
      "buttons": [{ "label": "Open notes", "url": "https://example.com/release" }]
    }
  ]
}
```

Menu de sélection :

```json
{
  "title": "Choose environment",
  "blocks": [
    {
      "type": "select",
      "placeholder": "Environment",
      "options": [
        { "label": "Canary", "value": "env:canary" },
        { "label": "Production", "value": "env:prod" }
      ]
    }
  ]
}
```

Envoi CLI :

```bash
openclaw message send --channel slack \
  --target channel:C123 \
  --message "Deploy approval" \
  --presentation '{"title":"Deploy approval","tone":"warning","blocks":[{"type":"text","text":"Canary is ready."},{"type":"buttons","buttons":[{"label":"Approve","value":"deploy:approve","style":"success"},{"label":"Decline","value":"deploy:decline","style":"danger"}]}]}'
```

Livraison épinglée :

```bash
openclaw message send --channel telegram \
  --target -1001234567890 \
  --message "Topic opened" \
  --pin
```

Livraison épinglée avec JSON explicite :

```json
{
  "pin": {
    "enabled": true,
    "notify": true,
    "required": false
  }
}
```

## Contrat du moteur de restitution

Les plugins de canal déclarent le support de la restitution sur leur adaptateur sortant :

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
  },
  deliveryCapabilities: {
    pin: true,
  },
  renderPresentation({ payload, presentation, ctx }) {
    return renderNativePayload(payload, presentation, ctx);
  },
  async pinDeliveredMessage({ target, messageId, pin }) {
    await pinNativeMessage(target, messageId, { notify: pin.notify === true });
  },
};
```

Les champs de capacité sont des booléens intentionnellement simples. Ils décrivent ce que le moteur de restitution peut rendre interactif, et non chaque limite de la plateforme native. Les moteurs de restitution possèdent toujours les limites spécifiques à la plateforme, telles que le nombre maximum de boutons, le nombre de blocs et la taille de la carte.

## Flux de restitution principal

Lorsqu'un `ReplyPayload` ou une action de message inclut `presentation`, le cœur :

1. Normalise la charge utile de présentation.
2. Résout l'adaptateur sortant du channel cible.
3. Lit `presentationCapabilities`.
4. Appelle `renderPresentation` lorsque l'adaptateur peut rendre la charge utile.
5. Revient à du texte conservateur lorsque l'adaptateur est absent ou ne peut pas rendre.
6. Envoie la charge utile résultante via le chemin de livraison normal du channel.
7. Applique les métadonnées de livraison telles que `delivery.pin` après le premier
   message envoyé avec succès.

Le cœur gère le comportement de repli afin que les producteurs puissent rester indépendants du channel. Les plugins de
channel gèrent le rendu natif et la gestion des interactions.

## Règles de dégradation

La présentation doit être sûre à envoyer sur les channels limités.

Le texte de repli comprend :

- `title` comme première ligne
- Les blocs `text` comme paragraphes normaux
- Les blocs `context` comme lignes de contexte compactes
- Les blocs `divider` comme séparateur visuel
- les étiquettes des boutons, y compris les URL pour les boutons de lien
- les étiquettes des options de sélection

Les contrôles natifs non pris en charge doivent se dégrader plutôt que de faire échouer tout l'envoi.
Exemples :

- Telegram avec les boutons en ligne désactivés envoie le texte de repli.
- Un channel sans support de sélection liste les options de sélection sous forme de texte.
- Un bouton uniquement URL devient soit un bouton de lien natif, soit une ligne d'URL de repli.
- Les échecs d'épinglage optionnels ne font pas échouer le message livré.

L'exception principale est `delivery.pin.required: true` ; si l'épinglage est demandé comme
requis et que le channel ne peut pas épingler le message envoyé, la livraison signale un échec.

## Mappage du provider

Moteurs de rendu groupés actuels :

| Channel         | Cible de rendu natif                   | Notes                                                                                                                                                                                       |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | Composants et conteneurs de composants | Préserve l'ancien `channelData.discord.components` pour les producteurs de charges utiles natives de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`. |
| Slack           | Block Kit                              | Préserve l'ancien `channelData.slack.blocks` pour les producteurs de charges utiles natives de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`.       |
| Telegram        | Texte plus claviers en ligne           | Les boutons/sélections nécessitent la capacité de bouton en ligne pour la surface cible ; sinon le texte de repli est utilisé.                                                              |
| Mattermost      | Texte plus props interactifs           | Les autres blocs se dégradent en texte.                                                                                                                                                     |
| Microsoft Teams | Cartes adaptatives                     | Le texte `message` brut est inclus avec la carte lorsque les deux sont fournis.                                                                                                             |
| Feishu          | Cartes interactives                    | L'en-tête de la carte peut utiliser `title` ; le corps évite de dupliquer ce titre.                                                                                                         |
| Canaux simples  | Repli de texte                         | Les canaux sans moteur de rendu obtiennent toujours une sortie lisible.                                                                                                                     |

La compatibilité avec les payloads natifs du fournisseur est une mesure de transition pour les producteurs de réponse existants. Ce n'est pas une raison pour ajouter de nouveaux champs natifs partagés.

## Presentation vs InteractiveReply

`InteractiveReply` est le sous-ensemble interne plus ancien utilisé par les helpers d'approbation et d'interaction. Il prend en charge :

- texte
- boutons
- sélections

`MessagePresentation` est le contrat d'envoi partagé canonique. Il ajoute :

- titre
- ton
- contexte
- diviseur
- boutons URL uniquement
- métadonnées de livraison génériques via `ReplyPayload.delivery`

Utilisez les helpers de `openclaw/plugin-sdk/interactive-runtime` lors de la connexion de
l'ancien code :

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

Le nouveau code doit accepter ou produire `MessagePresentation` directement.

## Épinglage de livraison

L'épinglage est un comportement de livraison, pas une présentation. Utilisez `delivery.pin` au lieu de
champs natifs du fournisseur tels que `channelData.telegram.pin`.

Sémantique :

- `pin: true` épingle le premier message livré avec succès.
- `pin.notify` par défaut est `false`.
- `pin.required` par défaut est `false`.
- Les échecs d'épinglage optionnel se dégradent et laissent le message envoyé intact.
- Les échecs d'épinglage requis font échouer la livraison.
- Les messages fragmentés épinglent le premier fragment livré, et non le fragment final.

Les actions de message manuelles `pin`, `unpin` et `pins` existent toujours pour les
messages existants lorsque le fournisseur prend en charge ces opérations.

## Liste de contrôle pour l'auteur de plugin

- Déclarez `presentation` à partir de `describeMessageTool(...)` lorsque le canal peut
  rendre ou dégrader en toute sécurité la présentation sémantique.
- Ajoutez `presentationCapabilities` à l'adaptateur sortant d'exécution.
- Implémentez `renderPresentation` dans le code d'exécution, et non dans le code
  d'installation du plugin de plan de contrôle.
- Keep native UI libraries out of hot setup/catalog paths.
- Preserve platform limits in the renderer and tests.
- Add fallback tests for unsupported buttons, selects, URL buttons, title/text
  duplication, and mixed `message` plus `presentation` sends.
- Add delivery pin support through `deliveryCapabilities.pin` and
  `pinDeliveredMessage` only when the provider can pin the sent message id.
- Do not expose new provider-native card/block/component/button fields through
  the shared message action schema.

## Related docs

- [Message CLI](/fr/cli/message)
- [Plugin SDK Overview](/fr/plugins/sdk-overview)
- [Plugin Architecture](/fr/plugins/architecture-internals#message-tool-schemas)
- [Channel Presentation Refactor Plan](/fr/plan/ui-channels)

---
summary: "Cartes de message sémantiques, boutons, sélections, texte de repli et indices de livraison pour les plugins de channel"
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

N'ajoutez pas de nouveaux champs natifs du provider tels que Discord Discord`components`Slack, Slack
`blocks`Telegram, Telegram `buttons`, Teams `card` ou Feishu `card` à l'outil de
message partagé. Ce sont des sorties du renderer appartenant au plugin de channel.

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
  webApp?: { url: string };
  /** @deprecated Use webApp. Accepted for legacy JSON payloads only. */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
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

- `value` est une valeur d'action d'application routée via le chemin d'interaction
  existant du channel lorsque celui-ci prend en charge les contrôles cliquables.
- `url` est un bouton de lien. Il peut exister sans `value`.
- `webApp`Telegram décrit un bouton d'application web natif du channel. Telegram l'affiche
  sous la forme `web_app` et ne le prend en charge que dans les chats privés. `web_app` est toujours
  accepté dans les payloads JSON libres pour compatibilité, mais les producteurs TypeScript
  devraient utiliser `webApp`.
- `label` est obligatoire et est également utilisé dans le texte de repli.
- `style` est consultatif. Les renderers doivent mapper les styles non pris en charge à une valeur
  par défaut sûre, et ne pas échouer l'envoi.
- `priority` est facultatif. Lorsqu'un channel publie des limites d'action et que des contrôles
  doivent être supprimés, le core garde en priorité les boutons de priorité supérieure et préserve
  l'ordre original parmi les boutons de même priorité. Lorsque tous les contrôles tiennent, l'ordre
  de rédaction est préservé.
- `disabled` est facultatif. Les channels doivent s'inscrire avec `supportsDisabled` ; sinon
  le core dégrade le contrôle désactivé en texte de repli non interactif.

Sémantique de sélection :

- `options[].value` est la valeur d'application sélectionnée.
- `placeholder` est consultatif et peut être ignoré par les channels sans prise en charge
  native des sélections.
- Si un channel ne prend pas en charge les sélections, le texte de repli liste les étiquettes.

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

Bouton de lien uniquement URL :

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

Bouton Mini App Telegram :

```json
{
  "blocks": [
    {
      "type": "buttons",
      "buttons": [{ "label": "Launch", "web_app": { "url": "https://example.com/app" } }]
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

## Contrat du moteur de rendu

Les plugins de channel déclarent la prise en charge du rendu sur leur adaptateur sortant :

```ts
const adapter: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  presentationCapabilities: {
    supported: true,
    buttons: true,
    selects: true,
    context: true,
    divider: true,
    limits: {
      actions: {
        maxActions: 25,
        maxActionsPerRow: 5,
        maxRows: 5,
        maxLabelLength: 80,
        maxValueBytes: 100,
        supportsStyles: true,
        supportsDisabled: false,
      },
      selects: {
        maxOptions: 25,
        maxLabelLength: 100,
        maxValueBytes: 100,
      },
      text: {
        maxLength: 2000,
        encoding: "characters",
        markdownDialect: "discord-markdown",
      },
    },
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

Les booléens de capacité décrivent ce que le moteur de rendu peut rendre interactif. Les `limits` facultatifs décrivent l'enveloppe générique que le cœur peut adapter avant d'appeler le moteur de rendu :

```ts
type ChannelPresentationCapabilities = {
  supported?: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  limits?: {
    actions?: {
      maxActions?: number;
      maxActionsPerRow?: number;
      maxRows?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
      supportsStyles?: boolean;
      supportsDisabled?: boolean;
      supportsLayoutHints?: boolean;
    };
    selects?: {
      maxOptions?: number;
      maxLabelLength?: number;
      maxValueBytes?: number;
    };
    text?: {
      maxLength?: number;
      encoding?: "characters" | "utf8-bytes" | "utf16-units";
      markdownDialect?: "plain" | "markdown" | "html" | "slack-mrkdwn" | "discord-markdown";
      supportsEdit?: boolean;
    };
  };
};
```

Le cœur applique des limites génériques aux contrôles sémantiques avant le rendu. Les moteurs de rendu conservent la validation finale spécifique au provider et le découpage pour le nombre de blocs natifs, la taille des cartes, les limites d'URL et les particularités du provider qui ne peuvent pas être exprimées dans le contrat générique. Si les limites suppriment tous les contrôles d'un bloc, le cœur conserve les libellés sous forme de texte contextuel non interactif afin que le message envoyé conserve toujours un repli visible.

## Flux de rendu du cœur

Lorsqu'une `ReplyPayload` ou une action de message inclut `presentation`, le cœur :

1. Normalise la charge utile de présentation.
2. Résout l'adaptateur sortant du channel cible.
3. Lit `presentationCapabilities`.
4. Applique les limites de capacité génériques telles que le nombre d'actions, la longueur du libellé et le nombre d'options de sélection lorsque l'adaptateur les annonce.
5. Appelle `renderPresentation` lorsque l'adaptateur peut rendre la charge utile.
6. Revient à un texte conservateur lorsque l'adaptateur est absent ou ne peut pas rendre.
7. Envoie la charge utile résultante via le chemin de livraison normal du channel.
8. Applique les métadonnées de livraison telles que `delivery.pin` après le premier message envoyé avec succès.

Le cœur est responsable du comportement de repli afin que les producteurs puissent rester agnostiques vis-à-vis des channels. Les plugins de channel sont responsables du rendu natif et de la gestion des interactions.

## Règles de dégradation

La présentation doit être sûre à envoyer sur les channels limités.

Le texte de repli comprend :

- `title` comme première ligne
- Les blocs `text` comme paragraphes normaux
- Les blocs `context` comme lignes de contexte compactes
- Les blocs `divider` comme séparateur visuel
- les libellés des boutons, y compris les URL pour les boutons de lien
- les libellés des options de sélection

Les contrôles natifs non pris en charge doivent se dégrader plutôt que de faire échouer tout l'envoi.
Exemples :

- Telegram avec les boutons en ligne désactivés envoie le texte de repli.
- Un canal sans prise en charge des sélections répertorie les options de sélection sous forme de texte.
- Un bouton avec uniquement une URL devient soit un bouton de lien natif, soit une ligne de URL de repli.
- Les échecs d'épinglage facultatifs ne font pas échouer le message délivré.

L'exception principale est `delivery.pin.required: true` ; si l'épinglage est demandé comme étant requis et que le canal ne peut pas épingler le message envoyé, la livraison signale un échec.

## Mappage de provider

Moteurs de rendu groupés actuels :

| Canal           | Cible de rendu native                  | Remarques                                                                                                                                                                                   |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord         | Composants et conteneurs de composants | Préserve l'ancien `channelData.discord.components` pour les producteurs de charges utiles natives de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`. |
| Slack           | Block Kit                              | Préserve l'ancien `channelData.slack.blocks` pour les producteurs de charges utiles natives de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`.       |
| Telegram        | Texte plus claviers en ligne           | Les boutons/sélections nécessitent la capacité de bouton en ligne pour la surface cible ; sinon, un repli texte est utilisé.                                                                |
| Mattermost      | Texte plus props interactives          | Les autres blocs dégradent en texte.                                                                                                                                                        |
| Microsoft Teams | Adaptive Cards                         | Le texte brut `message` est inclus avec la carte lorsque les deux sont fournis.                                                                                                             |
| Feishu          | Cartes interactives                    | L'en-tête de la carte peut utiliser `title` ; le corps évite de dupliquer ce titre.                                                                                                         |
| Canaux simples  | Repli texte                            | Les canaux sans moteur de rendu obtiennent toujours une sortie lisible.                                                                                                                     |

La compatibilité avec les charges utiles natives de provider est une facilité de transition pour les producteurs de réponses existants. Ce n'est pas une raison pour ajouter de nouveaux champs natifs partagés.

## Présentation vs InteractiveReply

`InteractiveReply` est le sous-ensemble interne plus ancien utilisé par les assistants d'approbation et d'interaction. Il prend en charge :

- texte
- boutons
- sélections

`MessagePresentation` est le contrat d'envoi partagé canonique. Il ajoute :

- titre
- ton
- contexte
- diviseur
- boutons avec uniquement une URL
- métadonnées de livraison génériques via `ReplyPayload.delivery`

Utilisez les assistants de `openclaw/plugin-sdk/interactive-runtime` lors du pontage avec un ancien code :

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

Le nouveau code doit accepter ou produire `MessagePresentation` directement. Les payloads `interactive` existants sont un sous-ensemble obsolète de `presentation` ; la prise en charge à l'exécution est maintenue pour les anciens producteurs.

Les types `InteractiveReply*` hérités et les aides de conversion sont marqués `@deprecated` dans le SDK :

- `InteractiveReply`, `InteractiveReplyBlock`, `InteractiveReplyButton`,
  `InteractiveReplyOption`, `InteractiveReplySelectBlock`, et
  `InteractiveReplyTextBlock`
- `normalizeInteractiveReply(...)`
- `hasInteractiveReplyBlocks(...)`
- `interactiveReplyToPresentation(...)`
- `presentationToInteractiveReply(...)`
- `presentationToInteractiveControlsReply(...)`
- `resolveInteractiveTextFallback(...)`
- `reduceInteractiveReply(...)`

`presentationToInteractiveReply(...)` et
`presentationToInteractiveControlsReply(...)` restent disponibles en tant que ponts de rendu
pour les implémentations de canal héritées. Le nouveau code de producteur ne doit pas les
appeler ; envoyez `presentation` et laissez l'adaptation du canal principal gérer le rendu.

Les assistants d'approbation ont également des remplacements basés sur la présentation :

- utilisez `buildApprovalPresentationFromActionDescriptors(...)` au lieu de
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- utilisez `buildApprovalPresentation(...)` au lieu de
  `buildApprovalInteractiveReply(...)`
- utilisez `buildExecApprovalPresentation(...)` au lieu de
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` renvoie une chaîne vide pour
les blocs de présentation qui n'ont pas de repli textuel, comme une présentation
composée uniquement d'un séparateur. Les transports qui nécessitent un corps d'envoi non vide peuvent passer
`emptyFallback` pour opter pour un corps minimal sans modifier le contrat de repli par défaut.

## Épinglage de livraison

L'épinglage est un comportement de livraison, pas une présentation. Utilisez `delivery.pin` au lieu de
champs natifs du fournisseur tels que `channelData.telegram.pin`.

Sémantique :

- `pin: true` épingle le premier message livré avec succès.
- `pin.notify` est `false` par défaut.
- `pin.required` est `false` par défaut.
- Les échecs d'épinglage facultatifs dégradent et laissent le message envoyé intact.
- Les échecs d'épinglage requis entraînent l'échec de la livraison.
- Les messages fragmentés épinglent le premier fragment livré, et non le dernier fragment.

Les actions de message `pin`, `unpin` et `pins` manuelles existent toujours pour les messages existants lorsque le provider prend en charge ces opérations.

## Liste de contrôle pour l'auteur de plugin

- Déclarez `presentation` à partir de `describeMessageTool(...)` lorsque le channel peut restituer ou dégrader en toute sécurité la présentation sémantique.
- Ajoutez `presentationCapabilities` à l'adaptateur sortant au moment de l'exécution.
- Implémentez `renderPresentation` dans le code d'exécution, et non dans le code de configuration du plugin du plan de contrôle.
- Gardez les bibliothèques d'interface utilisateur natives hors des chemins de configuration/de catalogue à chaud.
- Déclarez les limites de capacités génériques sur `presentationCapabilities.limits` lorsqu'elles sont connues.
- Conservez les limites finales de la plateforme dans le moteur de rendu et les tests.
- Ajoutez des tests de repli pour les boutons non pris en charge, les sélections, les boutons d'URL, la duplication de titre/texte et les envois mixtes `message` et `presentation`.
- Ajoutez la prise en charge de l'épinglage de livraison via `deliveryCapabilities.pin` et `pinDeliveredMessage` uniquement lorsque le provider peut épingler l'id du message envoyé.
- N'exposez pas de nouveaux champs natifs de carte/bloc/composant/bouton du provider via le schéma d'action de message partagé.

## Documentation connexe

- [Message CLI](/fr/cli/message)
- [Aperçu du SDK de plugin](/fr/plugins/sdk-overview)
- [Architecture du plugin](/fr/plugins/architecture-internals#message-tool-schemas)
- [Plan de refactorisation de la présentation des channels](/fr/plan/ui-channels)

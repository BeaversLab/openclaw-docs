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

type MessagePresentationAction = { type: "command"; command: string } | { type: "callback"; value: string };

type MessagePresentationButton = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
  url?: string;
  webApp?: { url: string };
  /** @deprecated Use webApp. Accepted for legacy JSON payloads only. */
  web_app?: { url: string };
  priority?: number;
  disabled?: boolean;
  reusable?: boolean;
  style?: "primary" | "secondary" | "success" | "danger";
};

type MessagePresentationOption = {
  label: string;
  action?: MessagePresentationAction;
  /** Legacy callback value. Prefer action for new controls. */
  value?: string;
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

- `action.type: "command"` exécute une commande slash native via le chemin de commande
  du cœur. Utilisez ceci pour les boutons et menus de commande intégrés.
- `action.type: "callback"` transporte des données de plugin opaques via le chemin
  d'interaction du channel. Les plugins de channel ne doivent pas réinterpréter les données de rappel comme des commandes
  slash.
- `value` est la valeur de rappel opaque héritée. Les nouveaux contrôles doivent utiliser `action`
  afin que les plugins de channel puissent mapper les commandes et les rappels sans deviner à partir du texte.
- `url` est un bouton de lien. Il peut exister sans `value`.
- `webApp` décrit un bouton d'application web natif au channel. Telegram affiche cela
  sous la forme `web_app` et ne le prend en charge que dans les chats privés. `web_app` est toujours
  accepté dans les payloads JSON souples pour compatibilité, mais les producteurs TypeScript
  devraient utiliser `webApp`.
- `label` est requis et est également utilisé dans la repli de texte.
- `style` est consultatif. Les moteurs de rendu devraient mapper les styles non pris en charge à une valeur par défaut sûre,
  et ne pas échouer l'envoi.
- `priority` est optionnel. Lorsqu'un channel publie des limites d'action et que des contrôles
  doivent être supprimés, le cœur conserve d'abord les boutons de priorité supérieure et préserve
  l'ordre d'origine parmi les boutons de priorité égale. Lorsque tous les contrôles tiennent, l'ordre
  de rédaction est préservé.
- `disabled` est optionnel. Les channels doivent s'inscrire avec `supportsDisabled` ; sinon,
  le cœur dégrade le contrôle désactivé en texte de repli non interactif.
- `reusable` est optionnel. Les channels qui prennent en charge les rappels natifs réutilisables peuvent
  garder l'action disponible après une interaction réussie. Utilisez-le pour
  des actions répétables ou idempotentes telles que l'actualisation, l'inspection, ou plus de détails ;
  laissez-le non défini pour les approbations ponctuelles normales et les actions destructrices.

Sémantique de sélection :

- `options[].action` a la même signification de commande/rappel que le bouton `action`.
- `options[].value` est la valeur d'application sélectionnée héritée.
- `placeholder` est consultatif et peut être ignoré par les channels sans prise en charge
  de sélection native.
- Si un channel ne prend pas en charge les sélections, le texte de secours liste les étiquettes.

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

Telegram Mini App button :

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

CLI send :

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

Les booléens de capacité décrivent ce que le moteur de rendu peut rendre interactif. Les `limits` optionnels décrivent l'enveloppe générique que le core peut adapter avant d'appeler le moteur de rendu :

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

Le core applique des limites génériques aux contrôles sémantiques avant le rendu. Les moteurs de rendu conservent toujours la validation et le découpage finaux spécifiques au provider pour le nombre de blocs natifs, la taille des cartes, les limites d'URL et les particularités du provider qui ne peuvent pas être exprimées dans le contrat générique. Si les limites retirent tous les contrôles d'un bloc, le core conserve les étiquettes sous forme de texte contextuel non interactif afin que le message livré dispose toujours d'une solution de secours visible.

## Flux de rendu du core

Lorsqu'une `ReplyPayload` ou une action de message inclut `presentation`, le core :

1. Normalise la charge utile de présentation.
2. Résout l'adaptateur sortant du channel cible.
3. Lit `presentationCapabilities`.
4. Applique des limites de capacité génériques telles que le nombre d'actions, la longueur de l'étiquette et le nombre d'options de sélection lorsque l'adaptateur les annonce.
5. Appelle `renderPresentation` lorsque l'adaptateur peut restituer la charge utile.
6. Revient à un texte conservateur lorsque l'adaptateur est absent ou ne peut pas effectuer le rendu.
7. Envoie la charge utile résultante via le chemin de livraison normal du channel.
8. Applique les métadonnées de livraison telles que `delivery.pin` après le premier message envoyé avec succès.

Le core gère le comportement de secours afin que les producteurs puissent rester agnostiques au channel. Les plugins de channel gèrent le rendu natif et la gestion des interactions.

## Règles de dégradation

La présentation doit être sûre à envoyer sur les channels limités.

Le texte de secours comprend :

- `title` comme première ligne
- Les blocs `text` comme paragraphes normaux
- Les blocs `context` comme lignes de contexte compactes
- Les blocs `divider` comme un séparateur visuel
- les étiquettes des boutons, y compris les URL pour les boutons de lien
- les étiquettes des options de sélection

Les contrôles natifs non pris en charge doivent dégrader plutôt que de faire échouer tout l'envoi.
Exemples :

- Telegram avec les boutons en ligne désactivés envoie un repli textuel.
- Un channel sans support de sélection liste les options de sélection sous forme de texte.
- Un bouton URL-only devient soit un bouton de lien natif, soit une ligne d'URL de repli.
- Les échecs d'épinglage optionnels ne font pas échouer le message délivré.

L'exception principale est `delivery.pin.required: true` ; si l'épinglage est demandé comme
requis et que le channel ne peut pas épingler le message envoyé, la livraison signale un échec.

## Mapping de provider

Moteurs de rendu groupés actuels :

| Channel          | Cible de rendu native                  | Notes                                                                                                                                                                                |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discord          | Composants et conteneurs de composants | Préserve l'ancien `channelData.discord.components` pour les producteurs de payloads natifs de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`. |
| Slack            | Block Kit                              | Préserve l'ancien `channelData.slack.blocks` pour les producteurs de payloads natifs de provider existants, mais les nouveaux envois partagés doivent utiliser `presentation`.       |
| Telegram         | Texte plus claviers en ligne           | Les boutons/sélections nécessitent la capacité de bouton en ligne pour la surface cible ; sinon un repli textuel est utilisé.                                                        |
| Mattermost       | Texte plus props interactives          | Les autres blocs dégradent en texte.                                                                                                                                                 |
| Microsoft Teams  | Adaptive Cards                         | Le texte `message` brut est inclus avec la carte lorsque les deux sont fournis.                                                                                                      |
| Feishu           | Cartes interactives                    | L'en-tête de la carte peut utiliser `title` ; le corps évite de dupliquer ce titre.                                                                                                  |
| Channels simples | Repli textuel                          | Les channels sans moteur de rendu obtiennent toujours une sortie lisible.                                                                                                            |

La compatibilité des payloads natifs de provider est une facilité de transition pour les producteurs de réponses existants. Ce n'est pas une raison d'ajouter de nouveaux champs natifs partagés.

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
- boutons URL-only
- métadonnées de livraison génériques via `ReplyPayload.delivery`

Utilisez les assistants de `openclaw/plugin-sdk/interactive-runtime` lors du pontage vers un
ancien code :

```ts
import { adaptMessagePresentationForChannel, applyPresentationActionLimits, interactiveReplyToPresentation, normalizeMessagePresentation, presentationPageSize, presentationToInteractiveControlsReply, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

Le nouveau code doit accepter ou produire `MessagePresentation` directement. Les
payloads `interactive` existants sont un sous-ensemble obsolète de `presentation` ; le support
à l'exécution reste pour les anciens producteurs.

Les types `InteractiveReply*` hérités et les aides de conversion sont marqués
`@deprecated` dans le SDK :

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
`presentationToInteractiveControlsReply(...)` restent disponibles en tant que ponts de
rendu pour les implémentations de channel héritées. Le nouveau code producteur ne doit pas les
appeler ; envoyez `presentation` et laissez l'adaptation core/channel gérer le rendu.

Les aides d'approbation ont également des remplacements basés sur la présentation :

- utilisez `buildApprovalPresentationFromActionDescriptors(...)` au lieu de
  `buildApprovalInteractiveReplyFromActionDescriptors(...)`
- utilisez `buildApprovalPresentation(...)` au lieu de
  `buildApprovalInteractiveReply(...)`
- utilisez `buildExecApprovalPresentation(...)` au lieu de
  `buildExecApprovalInteractiveReply(...)`

`renderMessagePresentationFallbackText(...)` renvoie une chaîne vide pour
les blocs de présentation qui n'ont pas de repli textuel, comme une présentation
uniquement avec un séparateur. Les transports qui nécessitent un corps d'envoi non vide peuvent passer
`emptyFallback` pour opter pour un corps minimal sans modifier le contrat de repli
par défaut.

## Épinglage de la livraison

L'épinglage est un comportement de livraison, pas une présentation. Utilisez `delivery.pin` au lieu de
champs natifs du provider tels que `channelData.telegram.pin`.

Sémantique :

- `pin: true` épingle le premier message livré avec succès.
- `pin.notify` par défaut à `false`.
- `pin.required` par défaut à `false`.
- Les échecs d'épinglage optionnel se dégradent et laissent le message envoyé intact.
- Les échecs d'épinglage requis échouent la livraison.
- Les messages fragmentés épinglent le premier fragment livré, et non le dernier fragment.

Les actions de message manuelles `pin`, `unpin` et `pins` existent toujours pour les messages existants lorsque le provider prend en charge ces opérations.

## Liste de contrôle pour l'auteur de plugin

- Déclarez `presentation` à partir de `describeMessageTool(...)` lorsque le channel peut restituer ou dégrader en toute sécurité la présentation sémantique.
- Ajoutez `presentationCapabilities` à l'adaptateur sortant (outbound) du runtime.
- Implémentez `renderPresentation` dans le code du runtime, et non dans le code de configuration du plugin du plan de contrôle.
- Gardez les bibliothèques d'interface utilisateur natives hors des chemins de configuration/catalogue à chaud.
- Déclarez les limites de capacités génériques sur `presentationCapabilities.limits` lorsqu'elles sont connues.
- Conservez les limites finales de la plateforme dans le moteur de rendu et les tests.
- Ajoutez des tests de repli pour les boutons non pris en charge, les sélections, les boutons d'URL, la duplication de titre/texte et les envois mixtes `message` plus `presentation`.
- Ajoutez la prise en charge de l'épinglage de livraison via `deliveryCapabilities.pin` et `pinDeliveredMessage` uniquement lorsque le provider peut épingler l'ID du message envoyé.
- N'exposez pas de nouveaux champs natifs de carte/bloc/composant/bouton du provider via le schéma d'action de message partagé.

## Documentation connexe

- [Message CLI](/fr/cli/message)
- [Vue d'ensemble du SDK Plugin](/fr/plugins/sdk-overview)
- [Architecture du Plugin](/fr/plugins/architecture-internals#message-tool-schemas)
- [Plan de refactorisation de la présentation de channel](/fr/plan/ui-channels)

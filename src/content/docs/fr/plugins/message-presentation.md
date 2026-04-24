---
title: "Présentation des messages"
summary: "Cartes de messages sémantiques, boutons, sélections, texte de repli et indices de livraison pour les plugins de canal"
read_when:
  - Adding or modifying message card, button, or select rendering
  - Building a channel plugin that supports rich outbound messages
  - Changing message tool presentation or delivery capabilities
  - Debugging provider-specific card/block/component rendering regressions
---

# Présentation des messages

La présentation des messages est le contrat partagé d'OpenClaw pour l'interface utilisateur de chat sortante riche.
Elle permet aux agents, aux commandes CLI, aux flux d'approbation et aux plugins de décrire l'intention du message
une seule fois, tandis que chaque plugin de canal restitue la meilleure forme native possible.

Utilisez la présentation pour une interface utilisateur de message portable :

- sections de texte
- petit texte de contexte/pied de page
- diviseurs
- boutons
- menus de sélection
- titre et ton de la carte

N'ajoutez pas de nouveaux champs natifs au fournisseur tels que Discord `components`, Slack
`blocks`, Telegram `buttons`, Teams `card` ou Feishu `card` à l'outil de
message partagé. Ce sont des sorties du moteur de rendu détenues par le plugin de canal.

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

- `value` est une valeur d'action d'application routée via le chemin
  d'interaction existant du canal lorsque celui-ci prend en charge les contrôles cliquables.
- `url` est un bouton de lien. Il peut exister sans `value`.
- `label` est requis et est également utilisé dans le texte de repli.
- `style` est consultatif. Les moteurs de rendu doivent mapper les styles non pris en charge à une valeur par
  défaut sûre, sans échouer l'envoi.

Sémantique de la sélection :

- `options[].value` est la valeur d'application sélectionnée.
- `placeholder` est consultatif et peut être ignoré par les canaux sans prise en charge
  native de la sélection.
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

## Contrat du moteur de rendu

Les plugins de canal déclarent la prise en charge du rendu sur leur adaptateur sortant :

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

Les champs de capacité sont des booléens volontairement simples. Ils décrivent ce que le
moteur de rendu peut rendre interactif, et non chaque limite de la plateforme native. Les moteurs de rendu conservent
la propriété des limites spécifiques à la plateforme telles que le nombre maximum de boutons, le nombre de blocs et
la taille de la carte.

## Flux de rendu principal

Quand un `ReplyPayload` ou une action de message inclut `presentation`, le cœur (core) :

1. Normalise la charge utile de présentation.
2. Résout l'adaptateur sortant du channel cible.
3. Lit `presentationCapabilities`.
4. Appelle `renderPresentation` quand l'adaptateur peut rendre la charge utile.
5. Revient à du texte conservateur lorsque l'adaptateur est absent ou ne peut pas rendre.
6. Envoie la charge utile résultante via le chemin normal de livraison du channel.
7. Applique les métadonnées de livraison telles que `delivery.pin` après le premier
   message envoyé avec succès.

Le cœur (core) gère le comportement de repli afin que les producteurs puissent rester indépendants du channel. Les plugins
de channel gèrent le rendu natif et la gestion des interactions.

## Règles de dégradation

La présentation doit être sûre à envoyer sur les canaux limités.

Le texte de repli inclut :

- `title` comme première ligne
- les blocs `text` comme paragraphes normaux
- les blocs `context` comme lignes de contexte compactes
- les blocs `divider` comme un séparateur visuel
- les libellés des boutons, y compris les URL pour les boutons de lien
- les libellés des options de sélection

Les contrôles natifs non pris en charge doivent se dégrader plutôt que de faire échouer tout l'envoi.
Exemples :

- Telegram avec les boutons en ligne désactivés envoie le texte de repli.
- Un channel sans support de sélection liste les options de sélection sous forme de texte.
- Un bouton uniquement URL devient soit un bouton de lien natif, soit une ligne d'URL de repli.
- Les échecs d'épinglage (pin) optionnels ne font pas échouer le message livré.

L'exception principale est `delivery.pin.required: true` ; si l'épinglage est demandé comme
requis et que le channel ne peut pas épingler le message envoyé, la livraison signale un échec.

## Mapping du fournisseur (Provider Mapping)

Moteurs de rendu groupés actuels :

| Channel          | Cible de rendu natif                   | Notes                                                                                                                                                                                            |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discord          | Composants et conteneurs de composants | Préserve l'ancien `channelData.discord.components` pour les producteurs de charges utiles natives de fournisseur existants, mais les nouveaux envois partagés devraient utiliser `presentation`. |
| Slack            | Block Kit                              | Préserve l'ancien `channelData.slack.blocks` pour les producteurs de charges utiles natives de fournisseur existants, mais les nouveaux envois partagés devraient utiliser `presentation`.       |
| Telegram         | Texte plus claviers en ligne           | Les boutons/sélections nécessitent la capacité de bouton en ligne pour la surface cible ; sinon le texte de repli est utilisé.                                                                   |
| Mattermost       | Texte plus props interactives          | Les autres blocs sont dégradés en texte.                                                                                                                                                         |
| Microsoft Teams  | Cartes adaptatives                     | Le texte `message` brut est inclus avec la carte lorsque les deux sont fournis.                                                                                                                  |
| Feishu           | Cartes interactives                    | L'en-tête de la carte peut utiliser `title` ; le corps évite de dupliquer ce titre.                                                                                                              |
| Channels simples | Texte de repli                         | Les channels sans moteur de rendu obtiennent toujours une sortie lisible.                                                                                                                        |

La compatibilité de la charge utile native du provider est une facilité de transition pour les producteurs de réponse existants. Ce n'est pas une raison d'ajouter de nouveaux champs natifs partagés.

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
- boutons URL uniquement
- métadonnées de livraison génériques via `ReplyPayload.delivery`

Utilisez les assistants de `openclaw/plugin-sdk/interactive-runtime` lors de la connexion de l'ancien code :

```ts
import { interactiveReplyToPresentation, normalizeMessagePresentation, presentationToInteractiveReply, renderMessagePresentationFallbackText } from "openclaw/plugin-sdk/interactive-runtime";
```

Le nouveau code doit accepter ou produire `MessagePresentation` directement.

## Épingle de livraison

L'épinglage est un comportement de livraison, pas une présentation. Utilisez `delivery.pin` au lieu des champs natifs du provider tels que `channelData.telegram.pin`.

Sémantique :

- `pin: true` épingle le premier message livré avec succès.
- `pin.notify` est par défaut `false`.
- `pin.required` est par défaut `false`.
- Les échecs d'épinglage facultatif se dégradent et laissent le message envoyé intact.
- Les échecs d'épinglage requis entraînent l'échec de la livraison.
- Les messages fragmentés épinglent le premier fragment livré, et non le dernier fragment.

Les actions de message manuelles `pin`, `unpin` et `pins` existent toujours pour les messages existants lorsque le provider prend en charge ces opérations.

## Liste de contrôle pour l'auteur du plugin

- Déclarez `presentation` à partir de `describeMessageTool(...)` lorsque le channel peut restituer ou dégrader en toute sécurité la présentation sémantique.
- Ajoutez `presentationCapabilities` à l'adaptateur sortant d'exécution.
- Implémentez `renderPresentation` dans le code d'exécution, et non dans le code de configuration du plugin de plan de contrôle.
- Gardez les bibliothèques d'interface utilisateur natives en dehors des chemins de configuration/de catalogue à chaud.
- Préservez les limites de la plateforme dans le moteur de rendu et les tests.
- Ajoutez des tests de repli pour les boutons non pris en charge, les sélections, les boutons d'URL, la duplication du titre/texte
  et les envois mixtes `message` plus `presentation`.
- Ajoutez la prise en charge de l'épinglage de livraison via `deliveryCapabilities.pin` et
  `pinDeliveredMessage` uniquement lorsque le provider peut épingler l'identifiant du message envoyé.
- N'exposez pas de nouveaux champs de carte/bloc/composant/bouton natifs du provider via
  le schéma d'action de message partagé.

## Documentation connexe

- [Message CLI](/fr/cli/message)
- [Aperçu du SDK de plugin](/fr/plugins/sdk-overview)
- [Architecture du plugin](/fr/plugins/architecture#message-tool-schemas)
- [Plan de refactorisation de la présentation du canal](/fr/plan/ui-channels)

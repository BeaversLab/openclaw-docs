---
summary: Découpler la présentation sémantique des messages des moteurs de rendu de l'interface utilisateur native du channel.
title: Plan de refactorisation de la présentation des channels
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

## Statut

Implémenté pour l'agent partagé, le CLI, les capacités des plugins et les surfaces de livraison sortante :

- `ReplyPayload.presentation` transporte l'interface utilisateur sémantique des messages.
- `ReplyPayload.delivery.pin` transporte les requêtes d'épinglage de messages envoyés.
- Les actions de message partagées exposent `presentation`, `delivery` et `pin` au lieu des `components`, `blocks`, `buttons` ou `card` natives du provider.
- Le cœur effectue le rendu ou dégrade automatiquement la présentation via les capacités sortantes déclarées par le plugin.
- Les moteurs de rendu Discord, Slack, Telegram, Mattermost, MS Teams et Feishu consomment le contrat générique.
- Le code du plan de contrôle du channel Discord n'importe plus les conteneurs d'interface utilisateur basés sur Carbon.

La documentation canonique se trouve désormais dans [Message Presentation](/fr/plugins/message-presentation).
Conservez ce plan comme contexte historique de l'implémentation ; mettez à jour le guide canonique
pour les modifications de contrat, de moteur de rendu ou de comportement de repli.

## Problème

L'interface utilisateur du channel est actuellement répartie sur plusieurs surfaces incompatibles :

- Le cœur possède un hook de moteur de rendu inter-contexte de forme Discord via `buildCrossContextComponents`.
- Le Discord `channel.ts` peut importer l'interface utilisateur Carbon native via `DiscordUiContainer`, ce qui introduit des dépendances d'interface utilisateur d'exécution dans le plan de contrôle du plugin de channel.
- L'agent et le CLI exposent des échappatoires de charge utile native telles que Discord `components`, Slack `blocks`, Telegram ou Mattermost `buttons`, et Teams ou Feishu `card`.
- `ReplyPayload.channelData` transporte à la fois des indices de transport et des enveloppes d'interface utilisateur natives.
- Le modèle générique `interactive` existe, mais il est plus étroit que les mises en page plus riches déjà utilisées par Discord, Slack, Teams, Feishu, LINE, Telegram et Mattermost.

Cela rend le conscient des formes de l'interface utilisateur native, affaiblit la paresse (laziness) de l'exécution du plugin et donne aux agents trop de moyens spécifiques au provider pour exprimer la même intention de message.

## Objectifs

- Le cœur décide de la meilleure présentation sémantique pour un message à partir des capacités déclarées.
- Les extensions déclarent des capacités et effectuent le rendu de la présentation sémantique en charges utiles de transport natives.
- L'interface utilisateur de contrôle Web reste séparée de l'interface utilisateur native de chat.
- Les charges utiles natives de canal ne sont pas exposées via la surface de messages de l'agent partagé ou du CLI.
- Les fonctionnalités de présentation non prises en charge se dégradent automatiquement vers la meilleure représentation textuelle.
- Le comportement de livraison, tel que l'épinglage d'un message envoyé, est des métadonnées de livraison génériques, et non une présentation.

## Non objectifs

- Aucune couche de compatibilité ascendante pour `buildCrossContextComponents`.
- Aucune échappatoire native publique pour `components`, `blocks`, `buttons` ou `card`.
- Aucune importation principale de bibliothèques d'interface utilisateur natives de canal.
- Aucune interface SDK spécifique au fournisseur pour les canaux groupés.

## Modèle cible

Ajouter un champ `presentation` appartenant au cœur à `ReplyPayload`.

```ts
type MessagePresentationTone = "neutral" | "info" | "success" | "warning" | "danger";

type MessagePresentation = {
  tone?: MessagePresentationTone;
  title?: string;
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
```

`interactive` devient un sous-ensemble de `presentation` lors de la migration :

- Le bloc de texte `interactive` correspond à `presentation.blocks[].type = "text"`.
- Le bloc de boutons `interactive` correspond à `presentation.blocks[].type = "buttons"`.
- Le bloc de sélection `interactive` correspond à `presentation.blocks[].type = "select"`.

Les schémas de l'agent externe et de la CLI utilisent désormais `presentation` ; `interactive` reste un assistant d'analyse/de rendu hérité interne pour les producteurs de réponses existants.
L'API publique orientée producteur considère `interactive` comme obsolète. La prise en charge
du runtime est maintenue pour que les assistants d'approbation existants et les anciens plugins continuent de
fonctionner tandis que le nouveau code émet `presentation`.

## Métadonnées de livraison

Ajoutez un champ `delivery` appartenant au cœur pour le comportement d'envoi qui n'est pas lié à l'interface utilisateur.

```ts
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

Sémantique :

- `delivery.pin = true` signifie épingler le premier message livré avec succès.
- `notify` est `false` par défaut.
- `required` est `false` par défaut ; les channels non pris en charge ou les échecs d'épinglage se dégradent automatiquement en continuant la livraison.
- Les actions de message manuelles `pin`, `unpin` et `list-pins` restent disponibles pour les messages existants.

La liaison actuelle des sujets ACP Telegram doit passer de `channelData.telegram.pin = true` à `delivery.pin = true`.

## Contrat de capacité d'exécution

Ajoutez les crochets (hooks) de rendu de présentation et de livraison à l'adaptateur sortant (outbound) de l'exécution (runtime), et non au plugin de channel du plan de contrôle (control-plane).

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

type ChannelDeliveryCapabilities = {
  pinSentMessage?: boolean;
};

type ChannelOutboundAdapter = {
  presentationCapabilities?: ChannelPresentationCapabilities;

  renderPresentation?: (params: { payload: ReplyPayload; presentation: MessagePresentation; ctx: ChannelOutboundSendContext }) => ReplyPayload | null;

  deliveryCapabilities?: ChannelDeliveryCapabilities;

  pinDeliveredMessage?: (params: { cfg: OpenClawConfig; accountId?: string | null; to: string; threadId?: string | number | null; messageId: string; notify: boolean }) => Promise<void>;
};
```

Comportement de base :

- Résoudre le channel cible et l'adaptateur d'exécution.
- Demander les capacités de présentation.
- Dégrader les blocs non pris en charge et appliquer les limites de capacités génériques avant
  le rendu.
- Appelez `renderPresentation`.
- Si aucun moteur de rendu n'existe, convertir la présentation en repli texte.
- Après un envoi réussi, appelez `pinDeliveredMessage` lorsque `delivery.pin` est demandé et pris en charge.

## Mapping de channel

Discord :

- Rendez `presentation` dans les composants v2 et les conteneurs Carbon dans les modules d'exécution uniquement.
- Conserver les assistants de couleur d'accentuation dans les modules légers.
- Supprimez les importations `DiscordUiContainer` du code du plan de contrôle du plugin de channel.

Slack :

- Rendez `presentation` en Block Kit.
- Supprimez l'entrée `blocks` de l'agent et de la CLI.

Telegram :

- Rendre le texte, le contexte et les diviseurs sous forme de texte.
- Rendre les actions et les sélections sous forme de claviers en ligne lorsque configuré et autorisé pour la surface cible.
- Utiliser le repli texte lorsque les boutons en ligne sont désactivés.
- Déplacez l'épinglage des sujets ACP vers `delivery.pin`.

Mattermost :

- Rendre les actions sous forme de boutons interactifs là où configuré.
- Rendre les autres blocs sous forme de repli texte.

MS Teams :

- Rendez `presentation` en Adaptive Cards.
- Conserver les actions manuelles d'épinglage/désepinglage/liste-des-épingles.
- Implémentez `pinDeliveredMessage` en option si la prise en charge de Graph est fiable pour la conversation cible.

Feishu :

- Rendre `presentation` sous forme de cartes interactives.
- Conserver les actions manuelles d'épinglage/désepinglage/liste-des-épingles.
- Implémenter facultativement `pinDeliveredMessage`API pour l'épinglage des messages envoyés si le comportement de l'API est fiable.

LINE :

- Rendre `presentation` sous forme de messages Flex ou de modèles lorsque cela est possible.
- Revenir au texte pour les blocs non pris en charge.
- Supprimer les payloads d'interface utilisateur LINE de `channelData`.

Channels simples ou limités :

- Convertir la présentation en texte avec un formatage conservateur.

## Étapes de refactorisation

1. Réappliquer le correctif de version Discord qui sépare Discord`ui-colors.ts` de l'interface utilisateur basée sur Carbon et supprime `DiscordUiContainer` de `extensions/discord/src/channel.ts`.
2. Ajouter `presentation` et `delivery` à `ReplyPayload`, à la normalisation des payloads sortants, aux résumés de livraison et aux payloads de hooks.
3. Ajouter le schéma `MessagePresentation` et les assistants d'analyse dans un sous-chemin étroit du SDK/runtime.
4. Remplacer les capacités de message `buttons`, `cards`, `components` et `blocks` par des capacités de présentation sémantique.
5. Ajoutez des hooks d'adaptateur sortant pour le rendu de la présentation et l'épinglage de la livraison.
6. Remplacer la construction de composants multi-contextes par `buildCrossContextPresentation`.
7. Supprimer `src/infra/outbound/channel-adapters.ts` et retirer `buildCrossContextComponents` des types de plugins de channel.
8. Modifier `maybeApplyCrossContextMarker` pour attacher `presentation` au lieu des paramètres natifs.
9. Mettez à jour les chemins d'envoi plugin-dispatch pour consommer uniquement la présentation sémantique et les métadonnées de livraison.
10. Supprimer les paramètres de payload natifs de l'agent et de la CLI : CLI`components`, `blocks`, `buttons` et `card`.
11. Supprimez les assistants SDK qui créent des schémas de message-tool natifs, en les remplaçant par des assistants de schéma de présentation.
12. Supprimer les enveloppes d'interface utilisateur/natives de `channelData` ; ne conserver que les métadonnées de transport jusqu'à ce que chaque champ restant soit révisé.
13. Migrez les moteurs de rendu Discord, Slack, Telegram, Mattermost, MS Teams, Feishu et LINE.
14. Mettez à jour la documentation pour le message CLI, les pages de channel, le plugin SDK et le livre de recettes des capacités.
15. Exécutez le profilage de l'étalement d'importation pour Discord et les points d'entrée de channel affectés.

Les étapes 1 à 11 et 13 à 14 sont implémentées dans cette refactorisation pour l'agent partagé, la CLI, la capacité du plugin et les contrats d'adaptateur sortant. L'étape 12 reste une passe de nettoyage interne plus approfondie pour les enveloppes de transport CLI`channelData` privées au fournisseur. L'étape 15 reste une validation de suivi si nous souhaitons des nombres quantifiés de diffusion d'importation (import-fanout) au-delà de la porte de type/test.

## Tests

Ajouter ou mettre à jour :

- Tests de normalisation de la présentation.
- Tests de dégradation automatique de la présentation pour les blocs non pris en charge.
- Tests de marqueurs inter-contextes pour la répartition des plugins et les chemins de livraison principaux.
- Tests de matrice de rendu de canal pour Discord, Slack, Telegram, Mattermost, MS Teams, Feishu, LINE et le repli texte.
- Tests de schéma de l'outil de message prouvant que les champs natifs ont disparu.
- Tests CLI prouvant que les indicateurs natifs ont disparu.
- Régression de la paresse d'importation du point d'entrée Discord couvrant Carbon.
- Tests d'épingle de livraison couvrant Telegram et le repli générique.

## Questions ouvertes

- `delivery.pin` doit-il être implémenté pour Discord, Slack, MS Teams et Feishu lors de la première passe, ou uniquement Telegram dans un premier temps ?
- `delivery` doit-il finalement absorber les champs existants tels que `replyToId`, `replyToCurrent`, `silent` et `audioAsVoice`, ou rester concentré sur les comportements post-envoi ?
- La présentation doit-elle prendre en charge directement les images ou les références de fichiers, ou les médias doivent-ils rester séparés de la mise en page de l'interface utilisateur pour l'instant ?

## Connexes

- [Aperçu des canaux](/fr/channels)
- [Présentation des messages](/fr/plugins/message-presentation)

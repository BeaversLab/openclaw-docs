---
title: Channel Presentation Refactor Plan
summary: Decouple semantic message presentation from channel native UI renderers.
read_when:
  - Refactoring channel message UI, interactive payloads, or native channel renderers
  - Changing message tool capabilities, delivery hints, or cross-context markers
  - Debugging Discord Carbon import fanout or channel plugin runtime laziness
---

# Channel Presentation Refactor Plan

## Statut

Implémenté pour l'agent partagé, la CLI, les capacités des plugins et les surfaces de livraison sortantes :

- `ReplyPayload.presentation` transporte l'UI sémantique des messages.
- `ReplyPayload.delivery.pin` transporte les demandes d'épinglage de messages envoyés.
- Les actions de message partagé exposent `presentation`, `delivery` et `pin` au lieu des `components`, `blocks`, `buttons` ou `card` natifs du fournisseur.
- Le cœur rend ou dégrade automatiquement la présentation via les capacités sortantes déclarées par les plugins.
- Les moteurs de rendu Discord, Slack, Telegram, Mattermost, MS Teams et Feishu consomment le contrat générique.
- Le code du plan de contrôle du channel Discord n'importe plus les conteneurs d'UI basés sur Carbon.

La documentation canonique se trouve désormais dans [Présentation des messages](/fr/plugins/message-presentation).
Conserver ce plan comme contexte d'implémentation historique ; mettre à jour le guide canonique
pour les modifications de contrat, de moteur de rendu ou de comportement de repli.

## Problème

L'UI des channels est actuellement répartie sur plusieurs surfaces incompatibles :

- Le cœur possède un hook de moteur de rendu inter-contexte de forme Discord via `buildCrossContextComponents`.
- Le Discord `channel.ts` peut importer l'UI native Carbon via `DiscordUiContainer`, ce qui introduit des dépendances d'UI d'exécution dans le plan de contrôle du plugin de channel.
- L'agent et la CLI exposent des échappatoires de payload natif telles que Discord `components`, Slack `blocks`, Telegram ou Mattermost `buttons`, et Teams ou Feishu `card`.
- `ReplyPayload.channelData` transporte à la fois des indices de transport et des enveloppes d'UI natives.
- Le modèle générique `interactive` existe, mais il est plus étroit que les mises en page plus riches déjà utilisées par Discord, Slack, Teams, Feishu, LINE, Telegram et Mattermost.

Cela rend le conscient des formes d'UI natives, affaiblit la paresse de l'exécution du plugin et donne aux agents trop de moyens spécifiques aux fournisseurs pour exprimer la même intention de message.

## Objectifs

- Le noyau décide de la meilleure présentation sémantique pour un message à partir des capacités déclarées.
- Les extensions déclarent des capacités et rendent la présentation sémantique en charges utiles de transport natives.
- L'interface utilisateur de contrôle Web reste séparée de l'interface utilisateur native de chat.
- Les charges utiles natives du channel ne sont pas exposées via la surface de messages de l'agent partagé ou de la CLI.
- Les fonctionnalités de présentation non prises en charge se dégradent automatiquement vers la meilleure représentation textuelle.
- Le comportement de livraison, tel que l'épinglage d'un message envoyé, est des métadonnées de livraison génériques, et non une présentation.

## Non-objectifs

- Aucune couche de compatibilité ascendante pour `buildCrossContextComponents`.
- Aucune échappatoire native publique pour `components`, `blocks`, `buttons` ou `card`.
- Aucune importation principale de bibliothèques d'interface utilisateur natives au channel.
- Aucune couture de SDK spécifique au provider pour les canaux groupés.

## Modèle cible

Ajouter un champ `presentation` appartenant au noyau à `ReplyPayload`.

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

Les schémas de l'agent externe et de la CLI utilisent désormais `presentation` ; `interactive` reste un assistant d'analyse/de rendu hérité interne pour les producteurs de réponse existants.

## Métadonnées de livraison

Ajouter un champ `delivery` appartenant au noyau pour le comportement d'envoi qui n'est pas une interface utilisateur.

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
- `notify` par défaut à `false`.
- `required` par défaut à `false` ; les canaux non pris en charge ou l'échec de l'épinglage se dégradent automatiquement en continuant la livraison.
- Les actions manuelles de message `pin`, `unpin` et `list-pins` restent pour les messages existants.

La liaison de sujet ACP Telegram actuelle doit passer de `channelData.telegram.pin = true` à `delivery.pin = true`.

## Contrat de capacité d'exécution

Ajouter des hooks de rendu de présentation et de livraison à l'adaptateur sortant d'exécution, et non au plugin de channel du plan de contrôle.

```ts
type ChannelPresentationCapabilities = {
  supported: boolean;
  buttons?: boolean;
  selects?: boolean;
  context?: boolean;
  divider?: boolean;
  tones?: MessagePresentationTone[];
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

Comportement principal :

- Résoudre le channel cible et l'adaptateur d'exécution.
- Demander les capacités de présentation.
- Dégrader les blocs non pris en charge avant le rendu.
- Appeler `renderPresentation`.
- Si aucun moteur de rendu n'existe, convertir la présentation en repli texte.
- Après un envoi réussi, appeler `pinDeliveredMessage` lorsque `delivery.pin` est demandé et pris en charge.

## Mappage de channel

Discord :

- Rendre `presentation` vers les composants v2 et les conteneurs Carbon dans les modules d'exécution uniquement.
- Garder les assistants de couleur d'accentuation dans les modules légers.
- Supprimer les imports `DiscordUiContainer` du code du plan de contrôle du plugin de channel.

Slack :

- Rendre `presentation` vers Block Kit.
- Supprimer l'entrée agent et CLI `blocks`.

Telegram :

- Rendre le texte, le contexte et les séparateurs sous forme de texte.
- Rendre les actions et les sélections sous forme de claviers en ligne lorsque configuré et autorisé pour la surface cible.
- Utiliser le repli texte lorsque les boutons en ligne sont désactivés.
- Déplacer l'épinglage de sujet ACP vers `delivery.pin`.

Mattermost :

- Rendre les actions sous forme de boutons interactifs où configuré.
- Rendre les autres blocs sous forme de repli texte.

MS Teams :

- Rendre `presentation` vers Adaptive Cards.
- Conserver les actions manuelles d'épinglage, désépinglage et liste des épingles.
- Implémenter `pinDeliveredMessage` en option si le support Graph est fiable pour la conversation cible.

Feishu :

- Rendre `presentation` vers des cartes interactives.
- Conserver les actions manuelles d'épinglage, désépinglage et liste des épingles.
- Implémenter `pinDeliveredMessage` en option pour l'épinglage des messages envoyés si le comportement de la API est fiable.

LINE :

- Rendre `presentation` vers des messages Flex ou modèles lorsque possible.
- Revenir au texte pour les blocs non pris en charge.
- Supprimer les charges utiles d'interface utilisateur LINE de `channelData`.

Channels simples ou limités :

- Convertir la présentation en texte avec un formatage conservateur.

## Étapes de refactorisation

1. Réappliquer le correctif de version Discord qui sépare `ui-colors.ts` de l'interface utilisateur basée sur Carbon et supprime `DiscordUiContainer` de `extensions/discord/src/channel.ts`.
2. Ajoutez `presentation` et `delivery` à `ReplyPayload`, la normalisation des payloads sortants, les résumés de livraison et les payloads de hook.
3. Ajoutez le schéma `MessagePresentation` et les assistants d'analyse dans un sous-chemin SDK/runtime étroit.
4. Remplacez les capacités de message `buttons`, `cards`, `components` et `blocks` par des capacités de présentation sémantique.
5. Ajoutez des hooks d'adaptateur sortant d'exécution pour le rendu de présentation et l'épinglage de livraison.
6. Remplacez la construction de composants inter-contextes par `buildCrossContextPresentation`.
7. Supprimez `src/infra/outbound/channel-adapters.ts` et retirez `buildCrossContextComponents` des types de plugins de channel.
8. Modifiez `maybeApplyCrossContextMarker` pour attacher `presentation` au lieu des paramètres natifs.
9. Mettez à jour les chemins d'envoi de plugin-dispatch pour consommer uniquement les métadonnées de présentation sémantique et de livraison.
10. Supprimez les paramètres de payload natifs de l'agent et du CLI : `components`, `blocks`, `buttons` et `card`.
11. Supprimez les assistants SDK qui créent des schémas d'outil de message natifs, en les remplaçant par des assistants de schéma de présentation.
12. Supprimez les enveloppes UI/natives de `channelData` ; ne conservez que les métadonnées de transport jusqu'à ce que chaque champ restant soit révisé.
13. Migrez les moteurs de rendu Discord, Slack, Telegram, Mattermost, MS Teams, Feishu et LINE.
14. Mettez à jour la documentation pour le CLI de message, les pages de channel, le plugin SDK et le livre de recettes des capacités.
15. Exécutez le profilage de l'étalement d'importation pour Discord et les points d'entrée de channel affectés.

Les étapes 1-11 et 13-14 sont implémentées dans cette refactorisation pour les contrats de l'agent partagé, du CLI, de la capacité du plugin et de l'adaptateur sortant. L'étape 12 reste une opération de nettoyage interne plus approfondie pour les enveloppes de transport `channelData` privées au provider. L'étape 15 reste une validation de suivi si nous voulons des chiffres quantifiés d'étalement d'importation au-delà de la barrière de type/test.

## Tests

Ajoutez ou mettez à jour :

- Tests de normalisation de la présentation.
- Tests de dégradation automatique de la présentation pour les blocs non pris en charge.
- Tests de marqueurs inter-contextes pour le répartiteur de plugin et les chemins de livraison principaux.
- Tests de matrice de rendu de canal pour Discord, Slack, Telegram, Mattermost, MS Teams, Feishu, LINE et le repli texte.
- Tests de schéma d'outil de message prouvant que les champs natifs ont disparu.
- Tests CLI prouvant que les indicateurs natifs ont disparu.
- Régression de la paresse d'importation du point d'entrée Discord couvrant Carbon.
- Tests de code confidentiel de livraison couvrant Telegram et le repli générique.

## Questions ouvertes

- `delivery.pin` doit-il être implémenté pour Discord, Slack, MS Teams et Feishu lors de la première passe, ou seulement pour Telegram d'abord ?
- `delivery` doit-il finalement absorber les champs existants tels que `replyToId`, `replyToCurrent`, `silent` et `audioAsVoice`, ou rester concentré sur les comportements après envoi ?
- La présentation doit-elle prendre en charge directement les images ou les références de fichiers, ou les médias doivent-ils rester séparés de la mise en page de l'interface utilisateur pour l'instant ?

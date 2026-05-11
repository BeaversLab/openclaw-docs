---
summary: "Flux de messages, sessions, mise en file d'attente et visibilité du raisonnement"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "Messages"
---

OpenClaw gère les messages entrants via un pipeline de résolution de session, de mise en file d'attente, de streaming, d'exécution d'outils et de visibilité du raisonnement. Cette page trace le chemin du message entrant à la réponse.

## Flux des messages (niveau élevé)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

Les principaux réglages se trouvent dans la configuration :

- `messages.*` pour les préfixes, la mise en file d'attente et le comportement de groupe.
- `agents.defaults.*` pour le bloc streaming et les valeurs par défaut de découpage.
- Remplacements de canal (`channels.whatsapp.*`, `channels.telegram.*`, etc.) pour les limites et les commutateurs de streaming.

Voir [Configuration](/fr/gateway/configuration) pour le schéma complet.

## Déduplication entrante

Les canaux peuvent redéliver le même message après une reconnexion. OpenClaw conserve un cache à court terme indexé par canal/compte/pair/session/id de message afin que les livraisons en double ne déclenchent pas une autre exécution de l'agent.

## Anti-rebond entrant

Les messages consécutifs rapides du **même expéditeur** peuvent être regroupés en un seul tour d'agent via `messages.inbound`. L'anti-rebond est délimité par canal + conversation et utilise le message le plus récent pour le filage/réponse des IDs.

Configuration (par défaut global + remplacements par canal) :

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

Notes :

- L'anti-rebond s'applique aux messages **texte uniquement** ; les médias/pièces jointes sont vidés immédiatement.
- Les commandes de contrôle contournent l'anti-rebond pour rester autonomes — **sauf** lorsqu'un canal opte explicitement pour la fusion de DM du même expéditeur (par exemple, [BlueBubbles `coalesceSameSenderDms`](/fr/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)), où les commandes DM attendent dans la fenêtre d'anti-rebond afin qu'une charge utile d'envoi fractionné puisse rejoindre le même tour d'agent.

## Sessions et appareils

Les sessions sont détenues par la passerelle, et non par les clients.

- Les discussions directes sont réduites à la clé de session principale de l'agent.
- Les groupes/canaux obtiennent leurs propres clés de session.
- Le stockage de session et les transcriptions résident sur l'hôte de la passerelle.

Plusieurs appareils/canaux peuvent correspondre à la même session, mais l'historique n'est pas entièrement synchronisé vers chaque client. Recommandation : utilisez un appareil principal pour les longues conversations afin d'éviter un contexte divergent. L'interface de contrôle et l'interface TUI affichent toujours la transcription de session sauvegardée par la passerelle, elles sont donc la source de vérité.

Détails : [Gestion des sessions](/fr/concepts/session).

## Métadonnées des résultats d'outil

Le résultat d'outil `content` est le résultat visible par le modèle. Le résultat d'outil `details` est
les métadonnées d'exécution pour le rendu de l'interface utilisateur, les diagnostics, la livraison de médias et les plugins.

OpenClaw garde cette limite explicite :

- `toolResult.details` est supprimé avant la réexécution par le fournisseur et l'entrée de compactage.
- Les transcriptions de session persistantes ne gardent que les `details` bornées ; les métadonnées trop volumineuses
  sont remplacées par un résumé compact marqué `persistedDetailsTruncated: true`.
- Les plugins et les outils devraient mettre le texte que le modèle doit lire dans `content`, et non seulement
  dans `details`.

## Corps des messages entrants et contexte de l'historique

OpenClaw sépare le **corps du prompt** du **corps de la commande** :

- `Body` : texte du prompt envoyé à l'agent. Cela peut inclure des enveloppes de canal et
  des wrappers d'historique optionnels.
- `CommandBody` : texte brut de l'utilisateur pour l'analyse de directive/de commande.
- `RawBody` : alias hérité pour `CommandBody` (conservé pour compatibilité).

Lorsqu'un canal fournit un historique, il utilise un wrapper partagé :

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Pour les **chats non directs** (groupes/canaux/salons), le **corps du message actuel** est préfixé par l'étiquette
de l'expéditeur (même style que celui utilisé pour les entrées d'historique). Cela permet de garder les messages en temps réel et ceux mis en file d'attente/d'historique
cohérents dans le prompt de l'agent.

Les tampons d'historique sont **en attente uniquement** : ils incluent les messages de groupe qui n'ont _pas_
déclenché d'exécution (par exemple, les messages limités aux mentions) et **excluent** les messages
déjà présents dans la transcription de session.

Le suppression des directives s'applique uniquement à la section **message actuel** afin que l'historique
reste intact. Les canaux qui enveloppent l'historique devraient définir `CommandBody` (ou
`RawBody`) sur le texte du message original et garder `Body` comme le prompt combiné.
Les tampons d'historique sont configurables via `messages.groupChat.historyLimit` (défaut
global) et des remplacements par canal comme `channels.slack.historyLimit` ou
`channels.telegram.accounts.<id>.historyLimit` (définir `0` pour désactiver).

## Mise en file d'attente et suivis

Si une exécution est déjà active, les messages entrants peuvent être mis en file d'attente, dirigés vers l'exécution en cours ou collectés pour un tour de suivi.

- Configurer via `messages.queue` (et `messages.queue.byChannel`).
- Modes : `interrupt`, `steer`, `followup`, `collect`, plus les variantes de backlog.

Détails : [File d'attente](/fr/concepts/queue).

## Streaming, chunking et batching

Le Block streaming envoie des réponses partielles au fur et à mesure que le modèle produit des blocs de texte.
Le chunking respecte les limites de texte du channel et évite de diviser le code clôturé.

Paramètres clés :

- `agents.defaults.blockStreamingDefault` (`on|off`, désactivé par défaut)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (batching basé sur l'inactivité)
- `agents.defaults.humanDelay` (pause de type humain entre les réponses de blocs)
- Redéfinitions de channel : `*.blockStreaming` et `*.blockStreamingCoalesce` (les channels non-Telegram nécessitent `*.blockStreaming: true` explicite)

Détails : [Streaming + chunking](/fr/concepts/streaming).

## Visibilité du raisonnement et jetons

OpenClaw peut exposer ou masquer le raisonnement du modèle :

- `/reasoning on|off|stream` contrôle la visibilité.
- Le contenu du raisonnement compte toujours dans l'utilisation des jetons lorsqu'il est produit par le modèle.
- Telegram prend en charge le flux de raisonnement dans la bulle de brouillon.

Détails : [Directives de réflexion + raisonnement](/fr/tools/thinking) et [Utilisation des jetons](/fr/reference/token-use).

## Préfixes, discussions et réponses

Le formatage des messages sortants est centralisé dans `messages` :

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` et `channels.<channel>.accounts.<id>.responsePrefix` (cascade de préfixes sortants), plus `channels.whatsapp.messagePrefix` (préfixe entrant WhatsApp)
- Discussion des réponses via `replyToMode` et les valeurs par défaut par channel

Détails : [Configuration](/fr/gateway/config-agents#messages) et documentation des channels.

## Réponses silencieuses

Le jeton silencieux exact `NO_REPLY` / `no_reply` signifie « ne pas envoyer de réponse visible par l'utilisateur ».
Lorsqu'un tour a également des médias d'outil en attente, tels que de l'audio TTS généré, OpenClaw
supprime le texte silencieux mais envoie toujours la pièce jointe multimédia.
OpenClaw résout ce comportement par type de conversation :

- Les conversations directes interdisent le silence par défaut et réécrivent une réponse silencieuse nue
  en un repli visible court.
- Les groupes/canaux autorisent le silence par défaut.
- L'orchestration interne autorise le silence par défaut.

OpenClaw utilise également des réponses silencieuses pour les échecs internes du runner qui se produisent
avant toute réponse de l'assistant dans les chats non directs, afin que les groupes/canaux ne voient pas
le texte standard d'erreur de passerelle. Les chats directs affichent un message d'échec compact par défaut ;
les détails bruts du runner ne sont affichés que lorsque `/verbose` est `on` ou `full`.

Les valeurs par défaut se trouvent sous `agents.defaults.silentReply` et
`agents.defaults.silentReplyRewrite` ; `surfaces.<id>.silentReply` et
`surfaces.<id>.silentReplyRewrite` peuvent les remplacer pour chaque surface.

Lorsque la session parente a une ou plusieurs exécutions de sous-agent générées en attente, les réponses silencieuses nues
sont abandonnées sur toutes les surfaces au lieu d'être réécrites, de sorte que
le parent reste silencieux jusqu'à ce que l'événement d'achèvement de l'enfant envoie la vraie réponse.

## Connexes

- [Streaming](/fr/concepts/streaming) — livraison des messages en temps réel
- [Retry](/fr/concepts/retry) — comportement de nouvelle tentative de livraison de messages
- [Queue](/fr/concepts/queue) — file de traitement des messages
- [Channels](/fr/channels) — intégrations de plateformes de messagerie

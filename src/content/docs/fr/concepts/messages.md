---
summary: "Flux de messages, sessions, mise en file d'attente et visibilité du raisonnement"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "Messages"
---

# Messages

Cette page explique comment OpenClaw gère les messages entrants, les sessions, la mise en file d'attente,
le streaming et la visibilité du raisonnement.

## Flux de messages (niveau élevé)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

Les principaux paramètres se trouvent dans la configuration :

- `messages.*` pour les préfixes, la mise en file d'attente et le comportement de groupe.
- `agents.defaults.*` pour le block streaming et les paramètres par défaut de découpage.
- Les redéfinitions de channel (`channels.whatsapp.*`, `channels.telegram.*`, etc.) pour les limites et les commutateurs de streaming.

Voir [Configuration](/fr/gateway/configuration) pour le schéma complet.

## Dédoublonnage entrant

Les channels peuvent redéliver le même message après une reconnexion. OpenClaw conserve un
cache à courte durée de vie indexé par channel/compte/pair/session/id de message afin que les
livraisons en double ne déclenchent pas une autre exécution de l'agent.

## Anti-rebond entrant

Les messages consécutifs rapides du **même expéditeur** peuvent être regroupés en un seul
tour d'agent via `messages.inbound`. L'anti-rebond est délimité par channel + conversation
et utilise le message le plus récent pour le threading/IDs de réponse.

Configuration (par défaut global + redéfinitions par channel) :

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

- L'anti-rebond s'applique aux messages **texte uniquement** ; les médias/pièces jointes sont envoyés immédiatement.
- Les commandes de contrôle contournent le rebond (debouncing) pour rester autonomes — **sauf** lorsqu'un canal opte explicitement pour la fusion de DM du même expéditeur (ex. [BlueBubbles `coalesceSameSenderDms`](/fr/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)), où les commandes DM attendent dans la fenêtre de rebond pour qu'une charge utile d'envoi fractionné puisse rejoindre le même tour d'agent.

## Sessions et appareils

Les sessions sont détenues par la passerelle, et non par les clients.

- Les chats directs sont réduits à la clé de session principale de l'agent.
- Les groupes/channels obtiennent leurs propres clés de session.
- Le magasin de sessions et les transcriptions résident sur l'hôte de la passerelle.

Plusieurs appareils/channels peuvent correspondre à la même session, mais l'historique n'est pas entièrement
synchronisé vers chaque client. Recommandation : utilisez un appareil principal pour les longues
conversations afin d'éviter un contexte divergent. L'interface de contrôle et le TUI affichent toujours la
transcription de session soutenue par la passerelle, ils constituent donc la source de vérité.

Détails : [Gestion des sessions](/fr/concepts/session).

## Corps des messages entrants et contexte de l'historique

OpenClaw sépare le **corps du prompt** du **corps de la commande** :

- `Body` : texte du prompt envoyé à l'agent. Cela peut inclure des enveloppes de canal et
  des wrappers d'historique optionnels.
- `CommandBody` : texte brut de l'utilisateur pour l'analyse des directives/commandes.
- `RawBody` : alias hérité pour `CommandBody` (conservé pour compatibilité).

Lorsqu'un channel fournit un historique, il utilise un wrapper partagé :

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Pour les **chats non directs** (groupes/channels/salons), le **corps du message actuel** est préfixé par l'étiquette de l'expéditeur (même style que celui utilisé pour les entrées d'historique). Cela permet de garder les messages en temps réel et les messages en file d'attente/historique cohérents dans le prompt de l'agent.

Les tampons d'historique sont **en attente uniquement** : ils incluent les messages de groupe qui n'ont _pas_ déclenché d'exécution (par exemple, les messages filtrés par mention) et **excluent** les messages déjà présents dans la transcription de la session.

Le retraitement des directives s'applique uniquement à la section du **message actuel** afin que l'historique
reste intact. Les canaux qui encapsulent l'historique doivent définir `CommandBody` (ou
`RawBody`) sur le texte du message original et garder `Body` comme le prompt combiné.
Les tampons d'historique sont configurables via `messages.groupChat.historyLimit` (défaut
global) et des redéfinitions par canal comme `channels.slack.historyLimit` ou
`channels.telegram.accounts.<id>.historyLimit` (définir `0` pour désactiver).

## Mise en file d'attente et suivis

Si une exécution est déjà active, les messages entrants peuvent être mis en file d'attente, orientés vers l'exécution en cours, ou collectés pour un tour de suivi.

- Configurer via `messages.queue` (et `messages.queue.byChannel`).
- Modes : `interrupt`, `steer`, `followup`, `collect`, plus les variantes de backlog.

Détails : [Mise en file d'attente](/fr/concepts/queue).

## Streaming, chunking et mise en lot (batching)

Block streaming envoie des réponses partielles au fur et à mesure que le model produit des blocs de texte.
Le découpage respecte les limites de texte du channel et évite de diviser le code clôturé.

Paramètres clés :

- `agents.defaults.blockStreamingDefault` (`on|off`, désactivé par défaut)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (traitement par lot basé sur l'inactivité)
- `agents.defaults.humanDelay` (pause de type humain entre les réponses de bloc)
- Redéfinitions de canal : `*.blockStreaming` et `*.blockStreamingCoalesce` (les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite)

Détails : [Streaming + chunking](/fr/concepts/streaming).

## Visibilité du raisonnement et jetons

OpenClaw peut exposer ou masquer le raisonnement du model :

- `/reasoning on|off|stream` contrôle la visibilité.
- Le contenu du raisonnement compte toujours dans l'utilisation des jetons lorsqu'il est produit par le model.
- Telegram prend en charge le flux de raisonnement dans la bulle de brouillon.

Détails : [Thinking + reasoning directives](/fr/tools/thinking) et [Token use](/fr/reference/token-use).

## Préfixes, fils de discussion et réponses

Le formatage des messages sortants est centralisé dans `messages` :

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` et `channels.<channel>.accounts.<id>.responsePrefix` (cascade de préfixes sortants), plus `channels.whatsapp.messagePrefix` (préfixe entrant WhatsApp)
- Enfilage des réponses via `replyToMode` et les valeurs par défaut par canal

Détails : [Configuration](/fr/gateway/configuration-reference#messages) et docs des canaux.

## Réponses silencieuses

Le jeton silencieux exact `NO_REPLY` / `no_reply` signifie « ne pas délivrer de réponse visible par l'utilisateur ».
OpenClaw résout ce comportement par type de conversation :

- Les conversations directes interdisent le silence par défaut et réécrivent une réponse silencieuse simple en un substitut visible court.
- Les groupes/channels autorisent le silence par défaut.
- L'orchestration interne autorise le silence par défaut.

Les valeurs par défaut se trouvent sous `agents.defaults.silentReply` et
`agents.defaults.silentReplyRewrite` ; `surfaces.<id>.silentReply` et
`surfaces.<id>.silentReplyRewrite` peuvent les remplacer par surface.

Lorsque la session parente a une ou plusieurs exécutions de sous-agent en attente, les réponses silencieuses nues sont abandonnées sur toutes les surfaces au lieu d'être réécrites, donc le parent reste silencieux jusqu'à ce que l'événement d'achèvement de l'enfant délivre la vraie réponse.

## Connexes

- [Streaming](/fr/concepts/streaming) — livraison des messages en temps réel
- [Retry](/fr/concepts/retry) — comportement de nouvelle tentative de livraison de messages
- [Queue](/fr/concepts/queue) — file de traitement des messages
- [Channels](/fr/channels) — intégrations de plateformes de messagerie

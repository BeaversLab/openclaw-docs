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

Voir [Configuration](/en/gateway/configuration) pour le schéma complet.

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
- Les commandes de contrôle contournent l'anti-rebond pour qu'elles restent autonomes.

## Sessions et appareils

Les sessions sont détenues par la passerelle, et non par les clients.

- Les chats directs sont réduits à la clé de session principale de l'agent.
- Les groupes/channels obtiennent leurs propres clés de session.
- Le magasin de sessions et les transcriptions résident sur l'hôte de la passerelle.

Plusieurs appareils/channels peuvent correspondre à la même session, mais l'historique n'est pas entièrement
synchronisé vers chaque client. Recommandation : utilisez un appareil principal pour les longues
conversations afin d'éviter un contexte divergent. L'interface de contrôle et le TUI affichent toujours la
transcription de session soutenue par la passerelle, ils constituent donc la source de vérité.

Détails : [Gestion des sessions](/en/concepts/session).

## Corps des messages entrants et contexte de l'historique

OpenClaw sépare le **corps du prompt** du **corps de la commande** :

- `Body` : texte du prompt envoyé à l'agent. Cela peut inclure des enveloppes de channel et des wrappers d'historique optionnels.
- `CommandBody` : texte brut de l'utilisateur pour l'analyse des directives/commandes.
- `RawBody` : alias historique pour `CommandBody` (conservé pour compatibilité).

Lorsqu'un channel fournit un historique, il utilise un wrapper partagé :

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Pour les **chats non directs** (groupes/channels/salons), le **corps du message actuel** est préfixé par l'étiquette de l'expéditeur (même style que celui utilisé pour les entrées d'historique). Cela permet de garder les messages en temps réel et les messages en file d'attente/historique cohérents dans le prompt de l'agent.

Les tampons d'historique sont **en attente uniquement** : ils incluent les messages de groupe qui n'ont _pas_ déclenché d'exécution (par exemple, les messages filtrés par mention) et **excluent** les messages déjà présents dans la transcription de la session.

Le retrait des directives s'applique uniquement à la section du **message actuel** afin que l'historique reste intact. Les channels qui enveloppent l'historique doivent définir `CommandBody` (ou `RawBody`) sur le texte du message d'origine et garder `Body` comme le prompt combiné.
Les tampons d'historique sont configurables via `messages.groupChat.historyLimit` (défaut global) et des remplacements par channel tels que `channels.slack.historyLimit` ou `channels.telegram.accounts.<id>.historyLimit` (définir `0` pour désactiver).

## Mise en file d'attente et suivis

Si une exécution est déjà active, les messages entrants peuvent être mis en file d'attente, orientés vers l'exécution en cours, ou collectés pour un tour de suivi.

- Configurer via `messages.queue` (et `messages.queue.byChannel`).
- Modes : `interrupt`, `steer`, `followup`, `collect`, plus les variantes de backlog.

Détails : [Mise en file d'attente](/en/concepts/queue).

## Streaming, chunking et mise en lot (batching)

Block streaming envoie des réponses partielles au fur et à mesure que le model produit des blocs de texte.
Le découpage respecte les limites de texte du channel et évite de diviser le code clôturé.

Paramètres clés :

- `agents.defaults.blockStreamingDefault` (`on|off`, désactivé par défaut)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (traitement par lot basé sur l'inactivité)
- `agents.defaults.humanDelay` (pause humaine entre les réponses par bloc)
- Remplacements de channel : `*.blockStreaming` et `*.blockStreamingCoalesce` (les channels non-Telegram nécessitent un `*.blockStreaming: true` explicite)

Détails : [Streaming + découpage](/en/concepts/streaming).

## Visibilité du raisonnement et jetons

OpenClaw peut exposer ou masquer le raisonnement du model :

- `/reasoning on|off|stream` contrôle la visibilité.
- Le contenu du raisonnement compte toujours dans l'utilisation des jetons lorsqu'il est produit par le model.
- Telegram prend en charge le flux de raisonnement dans la bulle de brouillon.

Détails : [Directives de réflexion + raisonnement](/en/tools/thinking) et [Utilisation des jetons](/en/reference/token-use).

## Préfixes, fils de discussion et réponses

Le formatage des messages sortants est centralisé dans `messages` :

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` et `channels.<channel>.accounts.<id>.responsePrefix` (cascade de préfixes sortants), ainsi que `channels.whatsapp.messagePrefix` (préfixe entrant WhatsApp)
- Fils de discussion de réponse via `replyToMode` et les valeurs par défaut par channel

Détails : [Configuration](/en/gateway/configuration-reference#messages) et documentation sur les channels.

## Connexes

- [Streaming](/en/concepts/streaming) — livraison de messages en temps réel
- [Retry](/en/concepts/retry) — comportement de nouvelle tentative de livraison de messages
- [Queue](/en/concepts/queue) — file de traitement des messages
- [Channels](/en/channels) — intégrations de plateformes de messagerie

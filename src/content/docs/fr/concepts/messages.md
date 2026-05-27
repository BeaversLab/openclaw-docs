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
- Les commandes de contrôle contournent l'anti-rebond (debouncing) afin qu'elles restent autonomes. Les channels qui optent explicitement pour la fusion des DM du même expéditeur peuvent conserver les commandes DM dans la fenêtre d'anti-rebond, permettant ainsi à une charge utile envoyée en plusieurs parties de rejoindre le même tour d'agent.

## Sessions et appareils

Les sessions sont détenues par la passerelle, et non par les clients.

- Les discussions directes sont réduites à la clé de session principale de l'agent.
- Les groupes/canaux obtiennent leurs propres clés de session.
- Le stockage de session et les transcriptions résident sur l'hôte de la passerelle.

Plusieurs appareils/canaux peuvent correspondre à la même session, mais l'historique n'est pas entièrement synchronisé vers chaque client. Recommandation : utilisez un appareil principal pour les longues conversations afin d'éviter un contexte divergent. L'interface de contrôle et l'interface TUI affichent toujours la transcription de session sauvegardée par la passerelle, elles sont donc la source de vérité.

Détails : [Gestion de session](/fr/concepts/session).

## Métadonnées des résultats d'outil

Le résultat d'outil `content` est le résultat visible par le model. Le résultat d'outil `details` est
les métadonnées d'exécution pour le rendu de l'interface utilisateur, les diagnostics, la livraison de média et les plugins.

OpenClaw garde cette limite explicite :

- `toolResult.details` est supprimé avant la relance du provider et l'entrée de compactage.
- Les transcriptions de session persistantes ne conservent que `details` borné ; les métadonnées
  trop volumineuses sont remplacées par un résumé compact marqué `persistedDetailsTruncated: true`.
- Les plugins et outils doivent placer le texte que le model doit lire dans `content`, et non
  uniquement dans `details`.

## Corps des messages entrants et contexte de l'historique

OpenClaw sépare le **corps du prompt** du **corps de la commande** :

- `BodyForAgent` : texte principal orienté model pour le message actuel. Les plugins de
  channel devraient garder ce texte concentré sur le prompt actuel de l'expéditeur.
- `Body` : solution de repli de prompt héritée. Cela peut inclure des enveloppes de channel et
  des wrappers d'historique optionnels, mais les channels actuels ne devraient pas s'y fier comme
  entrée principale du model lorsque `BodyForAgent` est disponible.
- `CommandBody` : texte brut de l'utilisateur pour l'analyse des directives/commandes.
- `RawBody` : alias hérité pour `CommandBody` (conservé pour compatibilité).

Lorsqu'un channel fournit un historique, il utilise un wrapper partagé :

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Pour les **chats non directs** (groupes/channels/salons), le **corps du message actuel** est préfixé par
l'étiquette de l'expéditeur (même style que celui utilisé pour les entrées d'historique). Cela maintient la cohérence entre les messages en temps réel et les messages mis en file d'attente/historiques dans le prompt de l'agent.

Les tampons d'historique sont **en attente uniquement** : ils incluent les messages de groupe qui n'ont _pas_
déclenché d'exécution (par exemple, les messages filtrés par mention) et **excluent** les messages
déjà présents dans la transcription de la session.

La suppression des directives ne s'applique qu'à la section du **message actuel**, de sorte que l'historique reste intact. Les canaux qui encapsulent l'historique doivent définir `CommandBody` (ou `RawBody`) sur le texte du message d'origine et conserver `Body` comme le prompt combiné.
Les métadonnées structurées d'historique, de réponse, de transfert et de canal sont rendues sous forme de blocs de contexte non fiables de rôle utilisateur lors de l'assemblage du prompt.
Les tampons d'historique sont configurables via `messages.groupChat.historyLimit` (par défaut global) et des remplacements par canal tels que `channels.slack.historyLimit` ou `channels.telegram.accounts.<id>.historyLimit` (définissez `0` pour désactiver).

## Mise en file d'attente et suivi

Si une exécution est déjà active, les messages entrants sont dirigés vers l'exécution en cours par défaut. `messages.queue` sélectionne si les messages de l'exécution active sont dirigés, mis en file d'attente pour plus tard, collectés en un seul tour ultérieur, ou s'ils interrompent l'exécution active.

- Configurez via `messages.queue` (et `messages.queue.byChannel`).
- Le mode par défaut est `steer`, avec un anti-rebond de 500 ms pour les lots de direction Codex et les files d'attente de suivi/collecte.
- Modes : `steer`, `followup`, `collect` et `interrupt`.

Détails : [File d'attente de commandes](/fr/concepts/queue) et [File d'attente de pilotage](/fr/concepts/queue-steering).

## Propriété de l'exécution du canal

Les plugins de canal peuvent préserver l'ordre, appliquer un anti-rebond à l'entrée et appliquer une contre-pression de transport avant qu'un message n'entre dans la file d'attente de session. Ils ne doivent pas imposer de délai d'attente séparé autour du tour de l'agent lui-même. Une fois qu'un message est acheminé vers une session, le travail de longue durée est régi par le cycle de vie de la session, de l'outil et de l'exécution, de sorte que tous les canaux signalent et récupèrent des tours lents de manière cohérente.

## Streaming, chunking et batching

Le Block streaming envoie des réponses partielles au fur et à mesure que le modèle produit des blocs de texte.
Le chunking respecte les limites de texte du canal et évite de diviser le code clôturé.

Paramètres clés :

- `agents.defaults.blockStreamingDefault` (`on|off`, désactivé par défaut)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (traitement par lot basé sur l'inactivité)
- `agents.defaults.humanDelay` (pause de type humain entre les réponses par bloc)
- Remplacements de channel : `*.blockStreaming` et `*.blockStreamingCoalesce` (les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite)

Détails : [Streaming + découpage](/fr/concepts/streaming).

## Visibilité du raisonnement et jetons

OpenClaw peut exposer ou masquer le raisonnement du model :

- `/reasoning on|off|stream` contrôle la visibilité.
- Le contenu du raisonnement compte toujours dans l'utilisation des jetons lorsqu'il est produit par le model.
- Telegram prend en charge le flux de raisonnement dans une bulle de brouillon éphémère qui est supprimée après la livraison finale ; utilisez `/reasoning on` pour une sortie de raisonnement persistante.

Détails : [Directives de réflexion + raisonnement](/fr/tools/thinking) et [Utilisation des jetons](/fr/reference/token-use).

## Préfixes, fils de discussion et réponses

Le formatage des messages sortants est centralisé dans `messages` :

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` et `channels.<channel>.accounts.<id>.responsePrefix` (cascade de préfixes sortants), plus `channels.whatsapp.messagePrefix` (préfixe entrant WhatsApp)
- Fil de discussion des réponses via `replyToMode` et les valeurs par défaut par channel

Détails : [Configuration](/fr/gateway/config-agents#messages) et la documentation des channels.

## Réponses silencieuses

Le jeton silencieux exact `NO_REPLY` / `no_reply` signifie "ne pas livrer de réponse visible par l'utilisateur".
Lorsqu'un tour a également des médias d'outil en attente, tels que de l'audio TTS généré, OpenClaw
supprime le texte silencieux mais livre toujours la pièce jointe média.
OpenClaw résout ce comportement par type de conversation :

- Les conversations directes ne reçoivent jamais `NO_REPLY` de conseil de prompt. Si une exécution directe renvoie accidentellement un jeton silencieux brut, OpenClaw le supprime au lieu de le réécrire ou de le livrer.
- Les groupes/canaux autorisent le silence par défaut uniquement pour les réponses automatiques de groupe. Dans le mode `message_tool` visible-reply, le silence signifie que le modèle n'appelle pas `message(action=send)`.
- L'orchestration interne autorise le silence par défaut.

OpenClaw utilise également des réponses silencieuses pour les échecs internes du runner qui surviennent
avant toute réponse de l'assistant dans les conversations non directes, afin que les groupes/channels ne voient
pas le texte générique d'erreur de passerelle. Les conversations directes affichent par défaut un message d'échec compact ;
les détails bruts du runner ne sont affichés que lorsque `/verbose full` est activé.

Les valeurs par défaut se trouvent sous `agents.defaults.silentReply` ; `surfaces.<id>.silentReply`
peut remplacer la stratégie de groupe/interne par surface.

Les réponses silencieuses brutes sont abandonnées sur toutes les surfaces, de sorte que les sessions parentes restent silencieuses au lieu de réécrire le texte sentinelle en bavardage de secours.

## Connexes

- [Refonte du cycle de vie des messages](/fr/concepts/message-lifecycle-refactor) - conception cible pour l'envoi et la réception durables
- [Streaming](/fr/concepts/streaming) — livraison des messages en temps réel
- [Nouvelle tentative](/fr/concepts/retry) — comportement de réessai de livraison des messages
- [File d'attente](/fr/concepts/queue) — file de traitement des messages
- [Channels](/fr/channels) — intégrations de plateformes de messagerie

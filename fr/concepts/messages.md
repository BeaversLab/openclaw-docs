---
summary: "Message flow, sessions, queueing, and reasoning visibility"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "Messages"
---

# Messages

This page ties together how OpenClaw handles inbound messages, sessions, queueing,
streaming, and reasoning visibility.

## Message flow (high level)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

Key knobs live in configuration:

- `messages.*` for prefixes, queueing, and group behavior.
- `agents.defaults.*` for block streaming and chunking defaults.
- Channel overrides (`channels.whatsapp.*`, `channels.telegram.*`, etc.) for caps and streaming toggles.

See [Configuration](/fr/gateway/configuration) for full schema.

## Inbound dedupe

Channels can redeliver the same message after reconnects. OpenClaw keeps a
short-lived cache keyed by channel/account/peer/session/message id so duplicate
deliveries do not trigger another agent run.

## Inbound debouncing

Rapid consecutive messages from the **same sender** can be batched into a single
agent turn via `messages.inbound`. Debouncing is scoped per channel + conversation
and uses the most recent message for reply threading/IDs.

Config (global default + per-channel overrides):

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

Notes:

- Debounce applies to **text-only** messages; media/attachments flush immediately.
- Control commands bypass debouncing so they remain standalone.

## Sessions and devices

Sessions are owned by the gateway, not by clients.

- Direct chats collapse into the agent main session key.
- Groups/channels get their own session keys.
- The session store and transcripts live on the gateway host.

Multiple devices/channels can map to the same session, but history is not fully
synced back to every client. Recommendation: use one primary device for long
conversations to avoid divergent context. The Control UI and TUI always show the
gateway-backed session transcript, so they are the source of truth.

Details: [Session management](/fr/concepts/session).

## Inbound bodies and history context

OpenClaw separates the **prompt body** from the **command body**:

- `Body` : texte du prompt envoyé à l'agent. Cela peut inclure des enveloppes de canal et des wrappers d'historique optionnels.
- `CommandBody` : texte brut de l'utilisateur pour l'analyse des directives/commandes.
- `RawBody` : ancien alias pour `CommandBody` (conservé pour compatibilité).

Lorsqu'un canal fournit un historique, il utilise un wrapper partagé :

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

Pour les **chats non directs** (groupes/canaux/salons), le **corps du message actuel** est préfixé par l'étiquette de l'expéditeur (même style que celui utilisé pour les entrées d'historique). Cela permet de garder les messages en temps réel et les messages en file d'attente/historique cohérents dans le prompt de l'agent.

Les tampons d'historique sont **en attente uniquement** : ils incluent les messages de groupe qui n'ont _pas_ déclenché d'exécution (par exemple, les messages restreints par mention) et **excluent** les messages déjà présents dans la transcription de la session.

Le retrait des directives s'applique uniquement à la section **message actuel** afin que l'historique reste intact. Les canaux qui encapsulent l'historique doivent définir `CommandBody` (ou `RawBody`) sur le texte du message d'origine et conserver `Body` comme le prompt combiné.
Les tampons d'historique sont configurables via `messages.groupChat.historyLimit` (par défaut global) et des remplacements par canal comme `channels.slack.historyLimit` ou `channels.telegram.accounts.<id>.historyLimit` (définissez `0` pour désactiver).

## Mise en file d'attente et suites

Si une exécution est déjà active, les messages entrants peuvent être mis en file d'attente, orientés vers l'exécution actuelle ou collectés pour un tour de suite.

- Configurer via `messages.queue` (et `messages.queue.byChannel`).
- Modes : `interrupt`, `steer`, `followup`, `collect`, plus les variantes de backlog.

Détails : [Mise en file d'attente](/fr/concepts/queue).

## Streaming, fractionnement et traitement par lots

Le Block streaming envoie des réponses partielles au fur et à mesure que le modèle produit des blocs de texte.
Le fractionnement respecte les limites de texte du canal et évite de diviser le code clôturé.

Paramètres clés :

- `agents.defaults.blockStreamingDefault` (`on|off`, désactivé par défaut)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (regroupement basé sur l'inactivité)
- `agents.defaults.humanDelay` (pause de type humain entre les réponses de bloc)
- Remplacements de canal : `*.blockStreaming` et `*.blockStreamingCoalesce` (les canaux non Telegram nécessitent `*.blockStreaming: true` explicite)

Détails : [Streaming + chunking](/fr/concepts/streaming).

## Visibilité du raisonnement et jetons

OpenClaw peut exposer ou masquer le raisonnement du modèle :

- `/reasoning on|off|stream` contrôle la visibilité.
- Le contenu du raisonnement compte toujours dans l'utilisation des jetons lorsqu'il est produit par le modèle.
- Telegram prend en charge le flux de raisonnement dans la bulle de brouillon.

Détails : [Thinking + reasoning directives](/fr/tools/thinking) et [Token use](/fr/reference/token-use).

## Préfixes, fils de discussion et réponses

Le formatage des messages sortants est centralisé dans `messages` :

- `messages.responsePrefix`, `channels.<channel>.responsePrefix` et `channels.<channel>.accounts.<id>.responsePrefix` (cascade de préfixes sortants), plus `channels.whatsapp.messagePrefix` (préfixe entrant WhatsApp)
- Fils de discussion de réponse via `replyToMode` et valeurs par par canal

Détails : [Configuration](/fr/gateway/configuration#messages) et documentation du canal.

import fr from "/components/footer/fr.mdx";

<fr />

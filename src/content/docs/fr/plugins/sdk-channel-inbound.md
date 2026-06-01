---
summary: "Inbound event helpers for channel plugins: context building, shared runner orchestration, session record, and prepared reply dispatch"
title: "APIChannel inbound API"
read_when:
  - You are building or refactoring a messaging channel plugin receive path
  - You need shared inbound context construction, session recording, or prepared reply dispatch
  - You are migrating old channel turn helpers to inbound/message APIs
---

Les plugins de channel doivent modéliser les chemins de réception avec les noms inbound et message :

```text
platform event -> inbound facts/context -> agent reply -> message delivery
```

Utilisez `openclaw/plugin-sdk/channel-inbound` pour la normalisation,
le formatage, les racines et l'orchestration des événements inbound. Utilisez
`openclaw/plugin-sdk/channel-outbound` pour l'envoi natif,
la réception, la livraison durable et le comportement de prévisualisation en direct.

## Core Helpers

```ts
import { buildChannelInboundEventContext, runChannelInboundEvent, dispatchChannelInboundReply } from "openclaw/plugin-sdk/channel-inbound";
```

- `buildChannelInboundEventContext(...)`: projette les faits normalisés du channel dans
  le contexte prompt/session.
- `runChannelInboundEvent(...)`: exécute ingest, classify, preflight, resolve,
  record, dispatch et finalize pour un événement de plateforme inbound.
- `dispatchChannelInboundReply(...)`: enregistre et envoie une réponse inbound déjà assemblée
  avec un adaptateur de livraison.

Le runtime de plugin injecté expose les mêmes helpers de haut niveau sous
`runtime.channel.inbound.*` pour les channels bundlés/natifs qui reçoivent déjà l'objet
runtime.

```ts
await runtime.channel.inbound.run({
  channel: "demo",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest: normalizePlatformEvent,
    resolveTurn: resolveInboundReply,
  },
});
```

Les répartiteurs de compatibilité doivent assembler les entrées `dispatchChannelInboundReply(...)`
et conserver la livraison de plateforme dans l'adaptateur de livraison. Les nouveaux chemins d'envoi doivent
préférer les adaptateurs de message et les helpers de message durables.

## Migration

Les anciens alias de runtime `runtime.channel.turn.*` ont été supprimés. Utilisez :

- `runtime.channel.inbound.run(...)` pour les événements inbound bruts.
- `runtime.channel.inbound.dispatchReply(...)` pour les contextes de réponse assemblés.
- `runtime.channel.inbound.buildContext(...)` pour les payloads de contexte inbound.
- `runtime.channel.inbound.runPreparedReply(...)` uniquement pour les chemins de répartition préparés
  détenus par le channel qui assemblent déjà leur propre fermeture de répartition.

Le nouveau code de plugin ne doit pas introduire d'API de channel nommées `turn`. Conservez le vocabulaire de tour model ou
agent à l'intérieur du code agent/provider ; les plugins de channel utilisent les termes inbound,
message, delivery et reply.

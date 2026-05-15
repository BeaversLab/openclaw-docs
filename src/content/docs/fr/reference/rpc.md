---
summary: "RPCAdaptateurs RPC pour les CLIs externes (signal-cli, imsg) et modèles de passerelle"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "adaptateurs RPC"
---

OpenClaw intègre des CLI externes via JSON-RPC. Deux modèles sont utilisés aujourd'hui.

## Modèle A : démon HTTP (signal-cli)

- `signal-cli` s'exécute en tant que démon avec JSON-RPC sur HTTP.
- Le flux d'événements est SSE (`/api/v1/events`).
- Sonde de santé : `/api/v1/check`.
- OpenClaw gère le cycle de vie lorsque `channels.signal.autoStart=true`.

Voir [Signal](/fr/channels/signal) pour la configuration et les points de terminaison.

## Motif B : processus enfant stdio (imsg)

- OpenClaw lance OpenClaw`imsg rpc`iMessage en tant que processus enfant pour [iMessage](/fr/channels/imessage).
- JSON-RPC est délimité par ligne sur stdin/stdout (un objet JSON par ligne).
- Pas de port TCP, pas de démon requis.

Méthodes principales utilisées :

- `watch.subscribe` → notifications (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (sonde/diagnostics)

Voir [iMessage](iMessage/en/channels/imessage) pour la configuration et l'adressage hérités (`chat_id` préféré).

## Directives pour l'adaptateur

- La passerelle possède le processus (démarrage/arrêt lié au cycle de vie du provider).
- Rendez les clients RPC résilients : délais d'attente, redémarrage à la sortie.
- Préférez les ID stables (par ex., `chat_id`) aux chaînes d'affichage.

## Connexes

- [Protocole de passerelle](Gateway/en/gateway/protocol)

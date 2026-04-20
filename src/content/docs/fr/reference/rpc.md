---
summary: "Adaptateurs RPC pour les CLI externes (signal-cli, imsg hérité) et modèles de passerelle"
read_when:
  - Adding or changing external CLI integrations
  - Debugging RPC adapters (signal-cli, imsg)
title: "Adaptateurs RPC"
---

# Adaptateurs RPC

OpenClaw intègre des CLI externes via JSON-RPC. Deux modèles sont utilisés aujourd'hui.

## Modèle A : Démon HTTP (signal-cli)

- `signal-cli` s'exécute en tant que démon avec JSON-RPC sur HTTP.
- Le flux d'événements est SSE (`/api/v1/events`).
- Sonde de santé : `/api/v1/check`.
- OpenClaw gère le cycle de vie lorsque `channels.signal.autoStart=true`.

Voir [Signal](/fr/channels/signal) pour la configuration et les points de terminaison.

## Modèle B : Processus enfant stdio (hérité : imsg)

> **Remarque :** Pour les nouvelles configurations iMessage, utilisez [BlueBubbles](/fr/channels/bluebubbles) à la place.

- OpenClaw génère `imsg rpc` en tant que processus enfant (intégration iMessage héritée).
- JSON-RPC est délimité par ligne sur stdin/stdout (un objet JSON par ligne).
- Pas de port TCP, pas de démon requis.

Méthodes principales utilisées :

- `watch.subscribe` → notifications (`method: "message"`)
- `watch.unsubscribe`
- `send`
- `chats.list` (sonde/diagnostics)

Voir [iMessage](/fr/channels/imessage) pour la configuration héritée et l'adressage (`chat_id` préféré).

## Directives pour les adaptateurs

- La passerelle possède le processus (démarrage/arrêt lié au cycle de vie du fournisseur).
- Rendez les clients RPC résilients : délais d'attente, redémarrage à la sortie.
- Préférez les ID stables (par ex., `chat_id`) aux chaînes d'affichage.

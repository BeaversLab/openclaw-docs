---
summary: "Protocole de pont (nœuds hérités) : TCP JSONL, appairage, RPC étendu"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Protocole de pont"
---

# Protocole de pont (transport de nœud hérité)

Le protocole de pont est un transport de nœud **hérité** (TCP JSONL). Les nouveaux clients nœuds
doivent utiliser à la place le protocole WebSocket Gateway unifié.

Si vous créez un opérateur ou un client nœud, utilisez le
[protocole Gateway](/fr/gateway/protocol).

**Remarque :** Les versions actuelles d'OpenClaw n'incluent plus l'écouteur de pont TCP ; ce document est conservé à titre historique.
Les clés de configuration `bridge.*` héritées ne font plus partie du schéma de configuration.

## Pourquoi nous avons les deux

- **Limite de sécurité** : le pont expose une petite liste d'autorisation au lieu de
  la surface complète de l'API du gateway.
- **Appairage + identité du nœud** : l'admission du nœud est gérée par le gateway et liée
  à un jeton par nœud.
- **UX de découverte** : les nœuds peuvent découvrir les gateways via Bonjour sur le réseau local, ou se connecter
  directement via un tailnet.
- **WS en boucle locale** : le plan de contrôle WS complet reste local sauf s'il est tunnellisé via SSH.

## Transport

- TCP, un objet JSON par ligne (JSONL).
- TLS optionnel (quand `bridge.tls.enabled` est vrai).
- Le port d'écoute par défaut hérité était `18790` (les versions actuelles ne démarrent pas de pont TCP).

Lorsque le TLS est activé, les enregistrements TXT de découverte incluent `bridgeTls=1` plus
`bridgeTlsSha256` comme indice non secret. Notez que les enregistrements TXT Bonjour/mDNS ne sont
pas authentifiés ; les clients ne doivent pas traiter l'empreinte digitale annoncée comme un
épinglage autoritaire sans intention explicite de l'utilisateur ou une autre vérification hors bande.

## Poignée de main + appairage

1. Le client envoie `hello` avec les métadonnées du nœud + le jeton (si déjà appairé).
2. Si non appairé, le gateway répond `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. Le client envoie `pair-request`.
4. Gateway attend l'approbation, puis envoie `pair-ok` et `hello-ok`.

`hello-ok` renvoie `serverName` et peut inclure `canvasHostUrl`.

## Trames

Client → Gateway :

- `req` / `res` : RPC de gateway avec portée (chat, sessions, config, health, voicewake, skills.bins)
- `event` : signaux de nœud (transcription vocale, demande d'agent, abonnement au chat, cycle de vie d'exécution)

Gateway → Client :

- `invoke` / `invoke-res` : commandes de nœud (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event` : mises à jour de chat pour les sessions abonnées
- `ping` / `pong` : keepalive

L'application de la liste d'autorisation héritée résidait dans `src/gateway/server-bridge.ts` (supprimé).

## Événements du cycle de vie d'exécution

Les nœuds peuvent émettre des événements `exec.finished` ou `exec.denied` pour afficher l'activité system.run.
Ceux-ci sont mappés aux événements système dans la gateway. (Les nœuds hérités peuvent encore émettre `exec.started`.)

Champs de charge utile (tous facultatifs sauf indication contraire) :

- `sessionKey` (requis) : session de l'agent pour recevoir l'événement système.
- `runId` : ID d'exécution unique pour le regroupement.
- `command` : chaîne de commande brute ou formatée.
- `exitCode`, `timedOut`, `success`, `output` : détails d'achèvement (terminé uniquement).
- `reason` : motif du refus (refusé uniquement).

## Utilisation de Tailnet

- Liez le pont à une IP tailnet : `bridge.bind: "tailnet"` dans
  `~/.openclaw/openclaw.json`.
- Les clients se connectent via le nom MagicDNS ou l'IP tailnet.
- Bonjour ne traverse **pas** les réseaux ; utilisez l'hôte/port manuel ou le DNS‑SD de grande zone
  si nécessaire.

## Versionnage

Bridge est actuellement **implicit v1** (sans négociation min/max). La rétrocompatibilité
est attendue ; ajoutez un champ de version du protocole de pont avant toute modification cassante.

import fr from '/components/footer/fr.mdx';

<fr />

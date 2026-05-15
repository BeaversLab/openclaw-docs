---
summary: "Protocole de pont historique (nœuds hérités) : TCP JSONL, appariement, RPC délimité"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Protocole de pont"
---

<Warning>Le pont TCP a été **supprimé**. Les versions actuelles d'OpenClaw n'incluent plus l'écouteur du pont et les clés de configuration OpenClaw`bridge.*`Gateway ne sont plus dans le schéma. Cette page est conservée à titre historique uniquement. Utilisez le [Protocole Gateway](/fr/gateway/protocol) pour tous les clients nœuds/opérateurs.</Warning>

## Pourquoi il existait

- **Limite de sécurité** : le pont expose une petite liste d'autorisation (allowlist) au lieu de
  la surface complète de l'API du gateway.
- **Jumelage + identité du nœud** : l'admission du nœud est gérée par le gateway et liée
  à un jeton par nœud.
- **UX de découverte** : les nœuds peuvent découvrir les gateways via Bonjour sur le réseau local, ou se connecter
  directement via un tailnet.
- **Bouclage WS** : le plan de contrôle WS complet reste local sauf s'il est tunnellisé via SSH.

## Transport

- TCP, un objet JSON par ligne (JSONL).
- TLS facultatif (lorsque `bridge.tls.enabled` est vrai).
- Historiquement, le port d'écoute par défaut était `18790` (les versions actuelles ne démarrent pas de
  pont TCP).

Lorsque le TLS est activé, les enregistrements TXT de découverte incluent `bridgeTls=1` plus
`bridgeTlsSha256` comme indice non secret. Notez que les enregistrements TXT Bonjour/mDNS ne sont
pas authentifiés ; les clients ne doivent pas traiter l'empreinte digitale annoncée comme un
épinglage (pin) faisant autorité sans une intention explicite de l'utilisateur ou une autre vérification hors bande.

## Poignée de main + jumelage

1. Le client envoie `hello` avec les métadonnées du nœud + le jeton (si déjà jumelé).
2. S'il n'est pas jumelé, le gateway répond `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. Le client envoie `pair-request`.
4. Le Gateway attend l'approbation, puis envoie `pair-ok` et `hello-ok`.

Historiquement, `hello-ok` renvoyait `serverName`; les surfaces de plugins hébergés sont maintenant
annoncées via `pluginSurfaceUrls`Canvas. Canvas/A2UI utilise
`pluginSurfaceUrls.canvas`; l'alias obsolète `canvasHostUrl` ne fait pas partie du
protocole refactorisé.

## Trames

Client → Gateway :

- `req` / `res`RPC : RPC passerelle avec portée (chat, sessions, config, santé, voicewake, skills.bins)
- `event` : signaux de nœud (transcription vocale, requête d'agent, abonnement chat, cycle de vie exec)

Gateway → Client :

- `invoke` / `invoke-res` : commandes de nœud (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event` : mises à jour de chat pour les sessions abonnées
- `ping` / `pong` : keepalive

L'application héritée de la liste d'autorisation résidait dans `src/gateway/server-bridge.ts` (supprimé).

## Événements de cycle de vie de l'exécution

Les nœuds peuvent émettre des événements `exec.finished` ou `exec.denied` pour exposer l'activité system.run.
Ceux-ci sont mappés aux événements système dans la passerelle. (Les nœuds hérités peuvent encore émettre `exec.started`.)

Champs de payload (tous optionnels sauf indication contraire) :

- `sessionKey` (requis) : session agent pour recevoir l'événement système.
- `runId` : id exec unique pour le regroupement.
- `command` : chaîne de commande brute ou formatée.
- `exitCode`, `timedOut`, `success`, `output` : détails de finition (terminé uniquement).
- `reason` : motif du refus (refusé uniquement).

## Utilisation historique du tailnet

- Lier le pont à une IP tailnet : `bridge.bind: "tailnet"` dans
  `~/.openclaw/openclaw.json` (historique uniquement ; `bridge.*` n'est plus valide).
- Les clients se connectent via le nom MagicDNS ou l'IP du tailnet.
- Bonjour ne **traverse pas** les réseaux ; utilisez un hôte/port manuel ou un DNS-SD étendu
  si nécessaire.

## Versionnage

Le pont était en **v1 implicite** (sans négociation min/max). Cette section est une
référence historique uniquement ; les clients nœud/opérateur actuels utilisent le WebSocket
[Gateway Protocol](/fr/gateway/protocol).

## Connexes

- [Gateway protocol](/fr/gateway/protocol)
- [Nodes](/fr/nodes)

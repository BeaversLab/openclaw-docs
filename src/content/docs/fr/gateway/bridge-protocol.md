---
summary: "Protocole de pont historique (nœuds hérités) : TCP JSONL, appariement, RPC délimité"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "Protocole de pont"
---

# Protocole de pont (transport de nœud hérité)

<Warning>Le pont TCP a été **supprimé**. Les versions actuelles d'OpenClaw n'incluent plus le listener de pont et les clés de configuration `bridge.*` ne sont plus dans le schéma. Cette page est conservée uniquement à des fins historiques. Utilisez le [protocole Gateway](/en/gateway/protocol) pour tous les clients nœud/opérateur.</Warning>

## Pourquoi il existait

- **Limite de sécurité** : le pont expose une petite liste blanche au lieu de l'intégralité de la surface de l'API du gateway.
- **Jumelage + identité du nœud** : l'admission du nœud est gérée par le gateway et liée à un jeton par nœud.
- **UX de découverte** : les nœuds peuvent découvrir les gateways via Bonjour sur le réseau local, ou se connecter directement via un tailnet.
- **WS de bouclage** : le plan de contrôle WS complet reste local sauf s'il est tunnellisé via SSH.

## Transport

- TCP, un objet JSON par ligne (JSONL).
- TLS optionnel (lorsque `bridge.tls.enabled` est vrai).
- Le port d'écoute par défaut historique était `18790` (les versions actuelles ne démarrent pas de
  pont TCP).

Lorsque le TLS est activé, les enregistrements TXT de découverte incluent `bridgeTls=1` plus
`bridgeTlsSha256` comme un indice non secret. Notez que les enregistrements TXT Bonjour/mDNS ne sont pas authentifiés ; les clients ne doivent pas traiter l'empreinte digitale annoncée comme une épingle autoritaire sans intention explicite de l'utilisateur ou une autre vérification hors bande.

## Poignée de main + jumelage

1. Le client envoie `hello` avec les métadonnées du nœud + le jeton (si déjà jumelé).
2. S'il n'est pas jumelé, le gateway répond `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. Le client envoie `pair-request`.
4. Le Gateway attend l'approbation, puis envoie `pair-ok` et `hello-ok`.

Historiquement, `hello-ok` renvoyait `serverName` et pouvait inclure
`canvasHostUrl`.

## Trames

Client → Gateway :

- `req` / `res` : RPC du gateway avec portée (chat, sessions, config, santé, voicewake, skills.bins)
- `event` : signaux du nœud (transcription vocale, demande d'agent, abonnement au chat, cycle de vie d'exécution)

Gateway → Client :

- `invoke` / `invoke-res` : commandes de nœud (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event` : mises à jour de chat pour les sessions abonnées
- `ping` / `pong` : keepalive

L'application de la liste d'autorisation (allowlist) héritée se trouvait dans `src/gateway/server-bridge.ts` (supprimé).

## Événements de cycle de vie d'exécution

Les nœuds peuvent émettre des événements `exec.finished` ou `exec.denied` pour exposer l'activité system.run.
Ces événements sont mappés à des événements système dans la passerelle. (Les nœuds hérités peuvent encore émettre `exec.started`.)

Champs de charge utile (tous optionnels sauf indication contraire) :

- `sessionKey` (requis) : session de l'agent pour recevoir l'événement système.
- `runId` : identifiant d'exécution unique pour le regroupement.
- `command` : chaîne de commande brute ou formatée.
- `exitCode`, `timedOut`, `success`, `output` : détails de l'achèvement (terminé uniquement).
- `reason` : motif du refus (refusé uniquement).

## Utilisation historique du tailnet

- Lier le pont à une IP de tailnet : `bridge.bind: "tailnet"` dans
  `~/.openclaw/openclaw.json` (historique uniquement ; `bridge.*` n'est plus valide).
- Les clients se connectent via le nom MagicDNS ou l'IP tailnet.
- Bonjour ne traverse **pas** les réseaux ; utilisez l'hôte/port manuel ou le DNS‑SD étendu
  si nécessaire.

## Versionnage

Le pont était en **v1 implicite** (sans négociation min/max). Cette section est
une référence historique uniquement ; les clients nœud/opérateur actuels utilisent le WebSocket
[protocole Gateway](/en/gateway/protocol).

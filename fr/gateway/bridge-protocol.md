---
summary: "Protocole de pont (nœuds hérités) : TCP JSONL, appairage, RPC limité"
read_when:
  - Création ou débogage de clients de nœud (mode nœud iOS/Android/macOS)
  - Enquête sur les échecs d'appairage ou d'authentification de pont
  - Audit de la surface de nœud exposée par la passerelle
title: "Protocole de pont"
---

# Protocole de pont (transport de nœud hérité)

Le protocole de pont est un transport de nœud **hérité** (TCP JSONL). Les nouveaux clients de nœud
doivent plutôt utiliser le protocole WebSocket de passerelle unifié.

Si vous créez un opérateur ou un client de nœud, utilisez le
[protocole de passerelle](/fr/gateway/protocol).

**Remarque :** Les versions actuelles de OpenClaw n'incluent plus l'écouteur de pont TCP ; ce document est conservé à titre historique.
Les clés de configuration `bridge.*` héritées ne font plus partie du schéma de configuration.

## Pourquoi nous avons les deux

- **Limite de sécurité** : le pont expose une petite liste d'autorisation au lieu de
  la surface complète de l'API de passerelle.
- **Appairage + identité du nœud** : l'admission du nœud est gérée par la passerelle et liée
  à un jeton par nœud.
- **UX de découverte** : les nœuds peuvent découvrir les passerelles via Bonjour sur un réseau local, ou se connecter
  directement via un tailnet.
- **WS de bouclage** : le plan de contrôle WS complet reste local sauf s'il est tunnellisé via SSH.

## Transport

- TCP, un objet JSON par ligne (JSONL).
- TLS facultatif (lorsque `bridge.tls.enabled` est vrai).
- Le port d'écoute par défaut hérité était `18790` (les versions actuelles ne démarrent pas de pont TCP).

Lorsque TLS est activé, les enregistrements TXT de découverte incluent `bridgeTls=1` plus
`bridgeTlsSha256` comme indice non secret. Notez que les enregistrements TXT Bonjour/mDNS sont
non authentifiés ; les clients ne doivent pas traiter l'empreinte digitale annoncée comme un
code pin d'autorité sans intention explicite de l'utilisateur ou autre vérification hors bande.

## Poignée de main + appairage

1. Le client envoie `hello` avec les métadonnées du nœud + jeton (si déjà apparié).
2. S'il n'est pas apparié, la passerelle répond `error` (`NOT_PAIRED`/`UNAUTHORIZED`).
3. Le client envoie `pair-request`.
4. La Gateway attend l'approbation, puis envoie `pair-ok` et `hello-ok`.

`hello-ok` renvoie `serverName` et peut inclure `canvasHostUrl`.

## Trames

Client → Gateway :

- `req` / `res` : RPC de passerelle avec portée (chat, sessions, config, health, voicewake, skills.bins)
- `event` : signaux de nœud (transcription vocale, demande d'agent, abonnement au chat, cycle de vie d'exécution)

Gateway → Client :

- `invoke` / `invoke-res` : commandes de nœud (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event` : mises à jour de chat pour les sessions abonnées
- `ping` / `pong` : keepalive

L'application de l'allowlist (liste d'autorisation) héritée résidait dans `src/gateway/server-bridge.ts` (supprimé).

## Événements de cycle de vie d'exécution

Les nœuds peuvent émettre des événements `exec.finished` ou `exec.denied` pour signaler l'activité system.run.
Ceux-ci sont mappés à des événements système dans la passerelle. (Les nœuds hérités peuvent encore émettre `exec.started`.)

Champs de payload (tous optionnels sauf indication contraire) :

- `sessionKey` (requis) : session de l'agent pour recevoir l'événement système.
- `runId` : identifiant d'exécution unique pour le regroupement.
- `command` : chaîne de commande brute ou formatée.
- `exitCode`, `timedOut`, `success`, `output` : détails de complétion (terminé uniquement).
- `reason` : motif du refus (refusé uniquement).

## Utilisation de Tailnet

- Lier le pont à une IP de tailnet : `bridge.bind: "tailnet"` dans
  `~/.openclaw/openclaw.json`.
- Les clients se connectent via le nom MagicDNS ou l'IP du tailnet.
- Bonjour ne traverse **pas** les réseaux ; utilisez l'hôte/port manuel ou DNS‑SD étendu
  si nécessaire.

## Versionnage

Le pont est actuellement **v1 implicite** (sans négociation min/max). La compatibilité descendante
est attendue ; ajoutez un champ de version du protocole de pont avant tout changement cassant.

import en from "/components/footer/en.mdx";

<en />

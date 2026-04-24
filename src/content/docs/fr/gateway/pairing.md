---
summary: "Appariement de nœuds détenu par Gateway (Option B) pour iOS et d'autres nœuds distants"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Appariement détenu par Gateway"
---

# Appariement détenu par Gateway (Option B)

Dans l'appariement détenu par Gateway, la **Gateway** est la source de vérité pour les nœuds autorisés à rejoindre. Les interfaces utilisateur (application macOS, futurs clients) ne sont que des interfaces qui approuvent ou rejettent les demandes en attente.

**Important :** Les nœuds WS utilisent l'**appareillage d'appareil** (rôle `node`) pendant `connect`.
`node.pair.*` est un magasin d'appariement distinct et ne verrouille **pas** la poignée de main WS.
Seuls les clients qui appellent explicitement `node.pair.*` utilisent ce flux.

## Concepts

- **Demande en attente** : un nœud a demandé à rejoindre ; nécessite une approbation.
- **Nœud appairé** : nœud approuvé avec un jeton d'authentification émis.
- **Transport** : le point de terminaison WS du Gateway transfère les demandes mais ne décide pas de l'appartenance. (La prise en charge du pont TCP hérité a été supprimée.)

## Fonctionnement de l'appariement

1. Un nœud se connecte au WS de la Gateway et demande l'appariement.
2. La Gateway stocke une **demande en attente** et émet `node.pair.requested`.
3. Vous approuvez ou rejetez la demande (CLI ou interface utilisateur).
4. Lors de l'approbation, la Gateway émet un **nouveau jeton** (les jetons sont remplacés lors du ré-appariement).
5. Le nœud se reconnecte à l'aide du jeton et est désormais « appairé ».

Les demandes en attente expirent automatiquement après **5 minutes**.

## Flux de travail CLI (compatible sans tête)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` affiche les nœuds appairés/connectés et leurs capacités.

## Surface de l'API (protocole de passerelle)

Événements :

- `node.pair.requested` — émis lorsqu'une nouvelle demande en attente est créée.
- `node.pair.resolved` — émis lorsqu'une demande est approuvée/rejetée/expirée.

Méthodes :

- `node.pair.request` — créer ou réutiliser une demande en attente.
- `node.pair.list` — lister les nœuds en attente et appariés (`operator.pairing`).
- `node.pair.approve` — approuver une demande en attente (émet un jeton).
- `node.pair.reject` — rejeter une demande en attente.
- `node.pair.verify` — vérifier `{ nodeId, token }`.

Remarques :

- `node.pair.request` est idempotent par nœud : les appels répétés renvoient la même demande en attente.
- Les demandes répétées pour le même nœud en attente actualisent également les métadonnées du nœud stocké et le dernier instantané des commandes déclarées sur la liste autorisée pour la visibilité de l'opérateur.
- L'approbation génère **toujours** un nouveau jeton ; aucun jeton n'est jamais renvoyé par `node.pair.request`.
- Les demandes peuvent inclure `silent: true` comme indicateur pour les flux d'approbation automatique.
- `node.pair.approve` utilise les commandes déclarées de la demande en attente pour appliquer des étendues d'approbation supplémentaires :
  - demande sans commande : `operator.pairing`
  - demande de commande non-exéc : `operator.pairing` + `operator.write`
  - demande `system.run` / `system.run.prepare` / `system.which` :
    `operator.pairing` + `operator.admin`

Important :

- L'appariement de nœuds est un flux de confiance/identité ainsi que l'émission de jetons.
- Cela ne **fixe pas** la surface des commandes de nœud en direct par nœud.
- Les commandes de nœud en live proviennent de ce que le nœud déclare lors de la connexion après l'application de la stratégie globale de commande de nœud de la passerelle (`gateway.nodes.allowCommands` / `denyCommands`).
- La stratégie d'autorisation/demande `system.run` par nœud réside sur le nœud dans `exec.approvals.node.*`, et non dans l'enregistrement d'appariement.

## Gestion des commandes de nœud (2026.3.31+)

<Warning>**Breaking change** : À partir de `2026.3.31`, les commandes de nœud sont désactivées tant que l'appariement de nœud n'est pas approuvé. L'appariement d'appareil seul ne suffit plus à exposer les commandes de nœud déclarées.</Warning>

Lorsqu'un nœud se connecte pour la première fois, l'appariement est demandé automatiquement. Jusqu'à ce que la demande d'appariement soit approuvée, toutes les commandes de nœud en attente de ce nœud sont filtrées et ne s'exécuteront pas. Une fois la confiance établie par l'approbation de l'appariement, les commandes déclarées du nœud deviennent disponibles sous réserve de la stratégie de commande normale.

Cela signifie :

- Les nœuds qui reposaient précédemment uniquement sur l'appareil associé pour exposer des commandes doivent désormais terminer l'association des nœuds.
- Les commandes mises en file d'attente avant l'approbation de l'association sont supprimées, et non différées.

## Limites de confiance des événements de nœud (2026.3.31+)

<Warning>**Modification rupture :** Les exécutions initiées par le nœud restent désormais sur une surface de confiance réduite.</Warning>

Les résumés initiés par le nœud et les événements de session associés sont restreints à la surface de confiance prévue. Les flux pilotés par notification ou déclenchés par le nœud qui reposaient précédemment sur un accès plus large aux outils de l'hôte ou de la session peuvent nécessiter des ajustements. Ce durcissement garantit que les événements de nœud ne peuvent pas escalader vers un accès au niveau de l'hôte au-delà de ce que la limite de confiance du nœud permet.

## Auto-approbation (application macOS)

L'application macOS peut éventuellement tenter une **approbation silencieuse** lorsque :

- la demande est marquée `silent`, et
- l'application peut vérifier une connexion SSH à l'hôte de la passerelle en utilisant le même utilisateur.

Si l'approbation silencieuse échoue, elle revient à l'invite normale « Approuver/Rejeter ».

## Auto-approbation de mise à niveau des métadonnées

Lorsqu'un appareil déjà associé se reconnecte avec uniquement des modifications de métadonnées non sensibles (par exemple, le nom d'affichage ou les indications de plate-forme cliente), OpenClaw considère cela comme une `metadata-upgrade` et approuve automatiquement la reconnexion sans invite. Les mises à niveau de portée (lecture vers écriture/admin) et les modifications de clés publiques ne sont **pas** éligibles pour l'auto-approbation de mise à niveau des métadonnées — elles restent des demandes de réapprobation explicites.

## Assistants pour l'appariement QR

`/pair qr` restitue la charge utile d'appariement sous forme de média structuré afin que les clients mobiles et navigateurs puissent la scanner directement. La suppression de l'appareil balaye désormais également les demandes d'appariement en attente obsolètes pour le même identifiant d'appareil, `nodes pending` n'affiche donc plus de lignes orphelines après une révocation.

## Localité et en-têtes transmis

L'appariement Gateway traite une connexion comme une boucle locale uniquement lorsque la socket brute et toutes les preuves de proxy en amont sont en accord. Si une demande arrive sur une boucle locale mais transporte des en-têtes `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` qui pointent vers une origine non locale, cette preuve d'en-tête transmis disqualifie la revendication de localité de boucle locale. Le chemin d'appariement nécessite alors une approbation explicite au lieu de traiter silencieusement la demande comme une connexion sur le même hôte. Voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth) pour la règle équivalente sur l'authentification de l'opérateur.

## Stockage (local, privé)

L'état d'appariement est stocké dans le répertoire d'état du Gateway (par défaut `~/.openclaw`) :

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si vous remplacez `OPENCLAW_STATE_DIR`, le dossier `nodes/` se déplace avec lui.

Notes de sécurité :

- Les jetons sont des secrets ; traitez `paired.json` comme sensible.
- La rotation d'un jeton nécessite une réapprobation (ou la suppression de l'entrée du nœud).

## Comportement du transport

- Le transport est **sans état** ; il ne stocke pas les adhésions.
- Si le Gateway est hors ligne ou si l'appariement est désactivé, les nœuds ne peuvent pas s'associer.
- Si le Gateway est en mode distant, l'appariement s'effectue toujours par rapport au stockage du Gateway distant.

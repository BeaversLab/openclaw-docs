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
- **Transport** : le point de terminaison WS de la Gateway transfère les demandes mais ne décide pas de l'appartenance. (La prise en charge du pont TCP hérité est obsolète/supprimée.)

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
- `node.pair.list` — lister les nœuds en attente + appairés.
- `node.pair.approve` — approuver une demande en attente (émet un jeton).
- `node.pair.reject` — rejeter une demande en attente.
- `node.pair.verify` — vérifier `{ nodeId, token }`.

Remarques :

- `node.pair.request` est idempotent par nœud : les appels répétés renvoient la même demande en attente.
- Les demandes répétées pour le même nœud en attente actualisent également les métadonnées du nœud stocké et le dernier instantané des commandes déclarées sur la liste autorisée pour la visibilité de l'opérateur.
- L'approbation génère **toujours** un nouveau jeton ; aucun jeton n'est jamais renvoyé par `node.pair.request`.
- Les demandes peuvent inclure `silent: true` comme indice pour les flux d'approbation automatique.

Important :

- L'appairage de nœuds est un flux de confiance/identité plus l'émission de jetons.
- Il ne fige **pas** la surface des commandes de nœud en direct par nœud.
- Les commandes de nœud en live proviennent de ce que le nœud déclare lors de la connexion après l'application de la stratégie globale de commandes de nœud de la passerelle (`gateway.nodes.allowCommands` / `denyCommands`).
- La stratégie d'autorisation/demande `system.run` par nœud réside sur le nœud dans `exec.approvals.node.*`, et non dans l'enregistrement d'appairage.

## Gestion des commandes de nœud (2026.3.31+)

<Warning>**Breaking change :** À partir de `2026.3.31`, les commandes de nœud sont désactivées jusqu'à ce que l'appairage du nœud soit approuvé. L'appairage des appareils seul ne suffit plus à exposer les commandes de nœud déclarées.</Warning>

Lorsqu'un nœud se connecte pour la première fois, l'appairage est demandé automatiquement. Tant que la demande d'appairage n'est pas approuvée, toutes les commandes de nœud en attente de ce nœud sont filtrées et ne seront pas exécutées. Une fois la confiance établie par l'approbation de l'appairage, les commandes déclarées du nœud deviennent disponibles sous réserve de la stratégie de commande normale.

Cela signifie :

- Les nœuds qui reposaient auparavant uniquement sur l'appairage des appareils pour exposer des commandes doivent désormais effectuer l'appairage des nœuds.
- Les commandes mises en file d'attente avant l'approbation de l'appairage sont abandonnées, et non différées.

## Limites de confiance des événements de nœud (2026.3.31+)

<Warning>**Breaking change :** Les exécutions initiées par le nœud restent désormais sur une surface de confiance réduite.</Warning>

Les résumés initiés par le nœud et les événements de session associés sont limités à la surface de confiance prévue. Les flux pilotés par des notifications ou déclenchés par des nœuds qui reposaient auparavant sur un accès plus large aux outils de l'hôte ou de la session peuvent nécessiter des ajustements. Ce durcissement garantit que les événements de nœud ne peuvent pas escalader en un accès au niveau de l'hôte au-delà de ce que la limite de confiance du nœud permet.

## Approbation automatique (application macOS)

L'application macOS peut éventuellement tenter une **approbation silencieuse** lorsque :

- la demande est marquée `silent`, et
- l'application peut vérifier une connexion SSH à l'hôte de la passerelle en utilisant le même utilisateur.

Si l'approbation silencieuse échoue, elle revient à l'invite normale « Approuver/Rejeter ».

## Stockage (local, privé)

L'état de l'appairage est stocké dans le répertoire d'état du Gateway (par défaut `~/.openclaw`) :

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si vous remplacez `OPENCLAW_STATE_DIR`, le dossier `nodes/` se déplace avec lui.

Notes de sécurité :

- Les jetons sont des secrets ; traitez `paired.json` comme sensible.
- La rotation d'un jeton nécessite une nouvelle approbation (ou la suppression de l'entrée du nœud).

## Comportement du transport

- Le transport est **sans état** ; il ne stocke pas l'appartenance.
- Si la Gateway est hors ligne ou si l'appairage est désactivé, les nœuds ne peuvent pas s'appairer.
- Si la Gateway est en mode distant, l'appairage s'effectue toujours par rapport au stockage de la Gateway distante.

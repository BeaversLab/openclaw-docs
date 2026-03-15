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
- L'approbation génère **toujours** un nouveau jeton ; aucun jeton n'est jamais renvoyé par `node.pair.request`.
- Les demandes peuvent inclure `silent: true` comme indication pour les flux d'approbation automatique.

## Approbation automatique (application macOS)

L'application macOS peut éventuellement tenter une **approbation silencieuse** lorsque :

- la demande est marquée `silent`, et
- l'application peut vérifier une connexion SSH à l'hôte de la passerelle en utilisant le même utilisateur.

Si l'approbation silencieuse échoue, elle revient à l'invite normale « Approuver/Rejeter ».

## Stockage (local, privé)

L'état de l'appariement est stocké dans le répertoire d'état du Gateway (par défaut `~/.openclaw`) :

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si vous remplacez `OPENCLAW_STATE_DIR`, le dossier `nodes/` se déplace avec lui.

Notes de sécurité :

- Les jetons sont des secrets ; traitez `paired.json` comme sensible.
- La rotation d'un jeton nécessite une nouvelle approbation (ou la suppression de l'entrée du nœud).

## Comportement du transport

- Le transport est **sans état** ; il ne stocke pas l'appartenance.
- Si le Gateway est hors ligne ou si l'appariement est désactivé, les nœuds ne peuvent pas s'apparier.
- Si le Gateway est en mode distant, l'appariement s'effectue toujours par rapport au stockage du Gateway distant.

import fr from '/components/footer/fr.mdx';

<fr />

---
summary: "Jumelage de nœuds possédés par Gateway (Option B) pour iOS et autres nœuds distants"
read_when:
  - Implémentation des approbations de jumelage de nœuds sans l'interface utilisateur macOS
  - Ajout de flux CLI pour l'approbation des nœuds distants
  - Extension du protocole de passerelle avec la gestion des nœuds
title: "Jumelage possédé par Gateway"
---

# Jumelage possédé par Gateway (Option B)

Dans le jumelage possédé par Gateway, le **Gateway** est la source de vérité pour les nœuds
autorisés à rejoindre. Les interfaces utilisateur (application macOS, clients futurs) ne sont que des interfaces frontales qui
approuvent ou rejettent les demandes en attente.

**Important :** Les nœuds WS utilisent le **jumelage d'appareil** (rôle `node`) pendant `connect`.
`node.pair.*` est un magasin de jumelage distinct et ne **bloque pas** la poignée de main WS.
Seuls les clients qui appellent explicitement `node.pair.*` utilisent ce flux.

## Concepts

- **Demande en attente** : un nœud a demandé à rejoindre ; nécessite une approbation.
- **Nœud jumelé** : nœud approuvé avec un jeton d'authentification émis.
- **Transport** : le point de terminaison WS Gateway transfère les demandes mais ne décide pas
  de l'appartenance. (La prise en charge du pont TCP hérité est obsolète/supprimée.)

## Fonctionnement du jumelage

1. Un nœud se connecte au WS Gateway et demande le jumelage.
2. Le Gateway stocke une **demande en attente** et émet `node.pair.requested`.
3. Vous approuvez ou rejetez la demande (CLI ou interface utilisateur).
4. Lors de l'approbation, le Gateway émet un **nouveau jeton** (les jetons sont alternés lors du ré‑jumelage).
5. Le nœud se reconnecte à l'aide du jeton et est désormais « jumelé ».

Les demandes en attente expirent automatiquement après **5 minutes**.

## Flux de travail CLI (compatible sans tête)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` affiche les nœuds jumelés/connectés et leurs capacités.

## Surface API (protocole de passerelle)

Événements :

- `node.pair.requested` — émis lorsqu'une nouvelle demande en attente est créée.
- `node.pair.resolved` — émis lorsqu'une demande est approuvée/rejetée/expire.

Méthodes :

- `node.pair.request` — créer ou réutiliser une demande en attente.
- `node.pair.list` — lister les nœuds en attente + jumelés.
- `node.pair.approve` — approuver une demande en attente (émet un jeton).
- `node.pair.reject` — rejeter une demande en attente.
- `node.pair.verify` — vérifier `{ nodeId, token }`.

Notes :

- `node.pair.request` est idempotent par nœud : les appels répétés renvoient la même demande en attente.
- L'approbation génère **toujours** un nouveau jeton ; aucun jeton n'est jamais renvoyé par `node.pair.request`.
- Les demandes peuvent inclure `silent: true` comme indication pour les flux d'approbation automatique.

## Approbation automatique (application macOS)

L'application macOS peut éventuellement tenter une **approbation silencieuse** lorsque :

- la demande est marquée `silent`, et
- l'application peut vérifier une connexion SSH à l'hôte de la passerelle en utilisant le même utilisateur.

Si l'approbation silencieuse échoue, elle revient à l'invite normale « Approuver/Rejeter ».

## Stockage (local, privé)

L'état de jumelage est stocké dans le répertoire d'état de la passerelle (par défaut `~/.openclaw`) :

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si vous remplacez `OPENCLAW_STATE_DIR`, le dossier `nodes/` se déplace avec.

Notes de sécurité :

- Les jetons sont des secrets ; traitez `paired.json` comme sensible.
- La rotation d'un jeton nécessite une nouvelle approbation (ou la suppression de l'entrée du nœud).

## Comportement du transport

- Le transport est **sans état** ; il ne stocke pas l'appartenance.
- Si la passerelle est hors ligne ou si le jumelage est désactivé, les nœuds ne peuvent pas se jumeler.
- Si la passerelle est en mode distant, le jumelage s'effectue toujours par rapport au magasin de la passerelle distante.

import en from "/components/footer/en.mdx";

<en />

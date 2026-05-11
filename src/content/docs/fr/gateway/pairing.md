---
summary: "Appariement de nœuds détenus par la passerelle (Option B) pour iOS et autres nœuds distants"
read_when:
  - Implementing node pairing approvals without macOS UI
  - Adding CLI flows for approving remote nodes
  - Extending gateway protocol with node management
title: "Appariement détenu par la passerelle"
---

Dans l'appariement détenu par la passerelle, la **passerelle** est la source de vérité pour les nœuds autorisés à rejoindre. Les interfaces utilisateur (application macOS, futurs clients) sont simplement des frontaliers qui approuvent ou rejettent les demandes en attente.

**Important :** Les nœuds WS utilisent l'**appareil d'appariement** (rôle `node`) pendant `connect`.
`node.pair.*` est un stockage d'appariement distinct et ne bloquent **pas** la poignée de main WS.
Seuls les clients qui appellent explicitement `node.pair.*` utilisent ce flux.

## Concepts

- **Demande en attente** : un nœud a demandé à rejoindre ; nécessite une approbation.
- **Nœud apparié** : nœud approuvé avec un jeton d'authentification émis.
- **Transport** : le point de terminaison WS de la passerelle transfère les demandes mais ne décide pas de l'appartenance. (La prise en charge du pont TCP hérité a été supprimée.)

## Fonctionnement de l'appariement

1. Un nœud se connecte au WS de la passerelle et demande l'appariement.
2. La passerelle stocke une **demande en attente** et émet `node.pair.requested`.
3. Vous approuvez ou rejetez la demande (CLI ou interface utilisateur).
4. Lors de l'approbation, la passerelle émet un **nouveau jeton** (les jetons sont remplacés lors du ré-appariement).
5. Le nœud se reconnecte à l'aide du jeton et est désormais « apparié ».

Les demandes en attente expirent automatiquement après **5 minutes**.

## Flux de travail CLI (compatible sans tête)

```bash
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes status
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` affiche les nœuds appariés/connectés et leurs capacités.

## Surface API (protocole de passerelle)

Événements :

- `node.pair.requested` — émis lorsqu'une nouvelle demande en attente est créée.
- `node.pair.resolved` — émis lorsqu'une demande est approuvée/rejetée/expirée.

Méthodes :

- `node.pair.request` — créer ou réutiliser une demande en attente.
- `node.pair.list` — lister les nœuds en attente + appariés (`operator.pairing`).
- `node.pair.approve` — approuver une demande en attente (émet un jeton).
- `node.pair.reject` — rejeter une demande en attente.
- `node.pair.remove` — supprimer une entrée de nœud apparié obsolète.
- `node.pair.verify` — vérifier `{ nodeId, token }`.

Remarques :

- `node.pair.request` est idempotent par nœud : les appels répétés renvoient la même
  demande en attente.
- Les demandes répétées pour le même nœud en attente actualisent également les métadonnées du nœud stocké et le dernier instantané des commandes déclarées sur la liste autorisée pour la visibilité de l'opérateur.
- L'approbation génère **toujours** un nouveau jeton ; aucun jeton n'est jamais renvoyé par
  `node.pair.request`.
- Les demandes peuvent inclure `silent: true` comme indication pour les flux d'auto-approbation.
- `node.pair.approve` utilise les commandes déclarées de la demande en attente pour appliquer
  des étendues d'approbation supplémentaires :
  - demande sans commande : `operator.pairing`
  - demande de commande non-exéc : `operator.pairing` + `operator.write`
  - demande `system.run` / `system.run.prepare` / `system.which` :
    `operator.pairing` + `operator.admin`

<Warning>
L'appariement de nœuds est un flux de confiance et d'identité ainsi qu'une émission de jetons. Il ne **fixe pas** la surface de commande de nœud en direct par nœud.

- Les commandes de nœud en direct proviennent de ce que le nœud déclare lors de la connexion après l'application de la stratégie globale de commande de nœud de la passerelle (`gateway.nodes.allowCommands` et `denyCommands`).
- La stratégie d'autorisation et de demande `system.run` par nœud réside sur le nœud dans `exec.approvals.node.*`, et non dans l'enregistrement d'appariement.
  </Warning>

## Gestion des commandes de nœud (2026.3.31+)

<Warning>**Modification avec rupture :** À partir de `2026.3.31`, les commandes de nœud sont désactivées jusqu'à ce que l'appariement de nœud soit approuvé. L'appariement d'appareil seul ne suffit plus à exposer les commandes de nœud déclarées.</Warning>

Lorsqu'un nœud se connecte pour la première fois, l'appariement est demandé automatiquement. Jusqu'à ce que la demande d'appariement soit approuvée, toutes les commandes de nœud en attente de ce nœud sont filtrées et ne seront pas exécutées. Une fois la confiance établie par l'approbation de l'appariement, les commandes déclarées du nœud deviennent disponibles sous réserve de la stratégie de commande normale.

Cela signifie :

- Les nœuds qui reposaient précédemment uniquement sur l'appariement d'appareil pour exposer des commandes doivent désormais compléter l'appariement de nœud.
- Les commandes mises en file d'attente avant l'approbation de l'appariement sont supprimées, pas différées.

## Limites de confiance des événements de nœud (2026.3.31+)

<Warning>**Modification avec rupture :** Les exécutions provenant de nœuds restent désormais sur une surface de confiance réduite.</Warning>

Les résumés provenant des nœuds et les événements de session associés sont restreints à la surface de confiance prévue. Les flux pilotés par des notifications ou déclenchés par des nœuds qui reposaient précédemment sur un accès plus large à l'hôte ou aux outils de session peuvent nécessiter des ajustements. Ce durcissement garantit que les événements de nœuds ne peuvent pas s'élever en un accès aux outils au niveau de l'hôte au-delà de ce que la limite de confiance du nœud permet.

## Approbation automatique (application macOS)

L'application macOS peut éventuellement tenter une **approbation silencieuse** lorsque :

- la demande est marquée comme `silent`, et
- l'application peut vérifier une connexion SSH à l'hôte de la passerelle en utilisant le même utilisateur.

Si l'approbation silencieuse échoue, elle revient à l'invite normale « Approuver/Rejeter ».

## Approbation automatique des appareils de confiance CIDR

Le jumelage d'appareils WS pour `role: node` reste manuel par défaut. Pour les réseaux de nœuds privés où la Gateway fait déjà confiance au chemin réseau, les opérateurs peuvent opter pour des CIDR explicites ou des IP exactes :

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Limite de sécurité :

- Désactivé lorsque `gateway.nodes.pairing.autoApproveCidrs` n'est pas défini.
- Aucun mode d'approbation automatique de réseau local (LAN) ou de réseau privé global n'existe.
- Seuls les jumelages d'appareils `role: node` frais sans étendues demandées sont éligibles.
- Les clients Opérateur, navigateur, Interface de contrôle et WebChat restent manuels.
- Les mises à niveau de rôle, d'étendue, de métadonnées et de clé publique restent manuelles.
- Les chemins d'en-têtes de proxy de confiance en boucle sur le même hôte ne sont pas éligibles car ce chemin peut être usurpé par les appelants locaux.

## Approbation automatique pour mise à niveau des métadonnées

Lorsqu'un appareil déjà jumelé se reconnecte avec uniquement des modifications de métadonnées non sensibles (par exemple, le nom d'affichage ou les indicateurs de plate-forme du client), OpenClaw le traite comme un `metadata-upgrade`. L'approbation automatique silencieuse est étroite : elle s'applique uniquement aux reconnexions locales de confiance non-navigateur qui ont déjà prouvé la possession d'informations d'identification locales ou partagées, y compris les reconnexions d'application native sur le même hôte après des modifications de métadonnées de version du système d'exploitation. Les clients navigateur/interface de contrôle et les clients distants utilisent toujours le flux de réapprobation explicite. Les mises à niveau d'étendue (lecture vers écriture/admin) et les modifications de clé publique ne sont **pas** éligibles pour l'approbation automatique de mise à niveau des métadonnées — elles restent des demandes de réapprobation explicites.

## Aides au jumelage QR

`/pair qr` restitue la charge utile de jumelage sous forme de média structuré afin que les clients mobiles et navigateurs puissent la scanner directement.

La suppression d'un appareil nettoie également toutes les demandes d'appariement en attente et obsolètes pour cet
identifiant d'appareil, de sorte que `nodes pending` n'affiche pas de lignes orphelines après une révocation.

## Localité et en-têtes transférés

L'appariement Gateway traite une connexion comme une boucle locale (loopback) uniquement lorsque la socket brute
et toutes les preuves du proxy en amont sont d'accord. Si une demande arrive sur une boucle locale mais
comporte des en-têtes `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto`
qui pointent vers une origine non locale, cette preuve d'en-tête transféré invalide
la revendication de localité de boucle locale. Le chemin d'appariement nécessite alors une approbation explicite
au lieu de traiter silencieusement la demande comme une connexion de même hôte. Voir
[Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth) pour la règle équivalente sur
l'authentification de l'opérateur.

## Stockage (local, privé)

L'état d'appariement est stocké dans le répertoire d'état du Gateway (par défaut `~/.openclaw`) :

- `~/.openclaw/nodes/paired.json`
- `~/.openclaw/nodes/pending.json`

Si vous remplacez `OPENCLAW_STATE_DIR`, le dossier `nodes/` se déplace avec lui.

Notes de sécurité :

- Les jetons sont des secrets ; traitez `paired.json` comme sensible.
- La rotation d'un jeton nécessite une nouvelle approbation (ou la suppression de l'entrée du nœud).

## Comportement du transport

- Le transport est **sans état** (stateless) ; il ne stocke pas les appartenances.
- Si le Gateway est hors ligne ou si l'appariement est désactivé, les nœuds ne peuvent pas s'apparier.
- Si le Gateway est en mode distant, l'appariement s'effectue toujours par rapport au stockage du Gateway distant.

## Connexes

- [Appariement de canal](/fr/channels/pairing)
- [Nœuds](/fr/nodes)
- [CLI des appareils](/fr/cli/devices)

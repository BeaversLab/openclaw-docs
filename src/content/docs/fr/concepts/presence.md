---
summary: "Comment les entrées de présence OpenClaw sont produites, fusionnées et affichées"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Présence"
---

La « présence » OpenClaw est une vue légère, au mieux effort, de :

- le **Gateway** lui-même, et
- **les clients connectés au Gateway** (application Mac, WebChat, CLI, etc.)

La présence est principalement utilisée pour afficher l'onglet **Instances** de l'application macOS et pour fournir une visibilité rapide aux opérateurs.

## Champs de présence (ce qui s'affiche)

Les entrées de présence sont des objets structurés avec des champs tels que :

- `instanceId` (facultatif mais fortement recommandé) : identité stable du client (généralement `connect.client.instanceId`)
- `host` : nom d'hôte convivial
- `ip` : adresse IP au mieux effort
- `version` : chaîne de version du client
- `deviceFamily` / `modelIdentifier` : indications matérielles
- `mode` : `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds` : « secondes depuis la dernière saisie utilisateur » (si connu)
- `reason` : `self`, `connect`, `node-connected`, `periodic`, ...
- `ts` : horodatage de la dernière mise à jour (ms depuis l'époque)

## Producteurs (d'où vient la présence)

Les entrées de présence sont produites par plusieurs sources et **fusionnées**.

### 1) Entrée automatique Gateway

Le Gateway crée toujours une entrée « self » au démarrage afin que les interfaces affichent l'hôte de la passerelle même avant que des clients ne se connectent.

### 2) Connexion WebSocket

Chaque client WS commence par une requête `connect`. Lors d'une poignée de main réussie, le Gateway effectue un upsert d'une entrée de présence pour cette connexion.

#### Pourquoi les commandes CLI ponctuelles n'apparaissent pas

Le CLI se connecte souvent pour de courtes commandes ponctuelles. Pour éviter de polluer la liste des instances, `client.mode === "cli"` n'est **pas** converti en entrée de présence.

### 3) Balises `system-event`

Les clients peuvent envoyer des balises périodiques plus riches via la méthode `system-event`. L'application Mac l'utilise pour signaler le nom d'hôte, l'IP et `lastInputSeconds`.

### 4) Connexions de nœuds (rôle : nœud)

Lorsqu'un nœud se connecte via le WebSocket du Gateway avec `role: node`, le Gateway
met à jour (upsert) une entrée de présence pour ce nœud (même flux que les autres clients WS).

## Règles de fusion et de déduplication (pourquoi `instanceId` est important)

Les entrées de présence sont stockées dans une seule carte en mémoire (in‑memory map) :

- Les entrées sont indexées par une **clé de présence** (**presence key**).
- La meilleure clé est un `instanceId` stable (provenant de `connect.client.instanceId`) qui survit aux redémarrages.
- Les clés ne sont pas sensibles à la casse (case‑insensitive).

Si un client se reconnecte sans un `instanceId` stable, il peut apparaître comme une
ligne en **double**.

## TTL et taille limitée

La présence est intentionnellement éphémère :

- **TTL :** les entrées plus anciennes que 5 minutes sont supprimées
- **Max entrées :** 200 (les plus anciennes sont supprimées en premier)

Cela permet de garder la liste à jour et d'éviter une croissance mémoire non limitée.

## Mise en garde concernant le tunnel/distant (IPs de bouclage)

Lorsqu'un client se connecte via un tunnel SSH / redirection de port local, le Gateway peut
voir l'adresse distante comme `127.0.0.1`. Pour éviter d'écraser une IP correctement rapportée par le client,
les adresses distantes de bouclage sont ignorées.

## Consommateurs

### Onglet Instances macOS

L'application macOS affiche la sortie de `system-presence` et applique un petit indicateur de
statut (Actif/Inactif/Périmé) basé sur l'âge de la dernière mise à jour.

## Conseils de débogage

- Pour voir la liste brute, appelez `system-presence` sur le Gateway.
- Si vous voyez des doublons :
  - vérifiez que les clients envoient un `client.instanceId` stable lors de la poignée de main (handshake)
  - vérifiez que les balises périodiques utilisent le même `instanceId`
  - vérifiez si l'entrée dérivée de la connexion manque de `instanceId` (les doublons sont attendus)

## Connexes

- [Indicateurs de frappe](/fr/concepts/typing-indicators)
- [Streaming et découpage en blocs](/fr/concepts/streaming)

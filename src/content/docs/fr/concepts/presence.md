---
summary: "Comment les entrées de présence OpenClaw sont produites, fusionnées et affichées"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Présence"
---

La "présence" d'OpenClaw est une vue légère, au meilleur effort, de :

- le **Gateway** lui-même, et
- **les clients connectés au Gateway** (application Mac, WebChat, CLI, etc.)

La présence est principalement utilisée pour afficher l'onglet **Instances** de l'application macOS et pour
fournir une visibilité rapide aux opérateurs.

## Champs de présence (ce qui s'affiche)

Les entrées de présence sont des objets structurés avec des champs tels que :

- `instanceId` (facultatif mais fortement recommandé) : identité client stable (généralement `connect.client.instanceId`)
- `host` : nom d'hôte lisible par l'homme
- `ip` : adresse IP au meilleur effort
- `version` : chaîne de version du client
- `deviceFamily` / `modelIdentifier` : indices sur le matériel
- `mode` : `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds` : "secondes depuis la dernière saisie utilisateur" (si connu)
- `reason` : `self`, `connect`, `node-connected`, `periodic`, ...
- `ts` : horodatage de la dernière mise à jour (ms depuis l'époque)

## Producteurs (d'où vient la présence)

Les entrées de présence sont produites par plusieurs sources et **fusionnées**.

### 1) Entrée automatique Gateway

Le Gateway initialise toujours une entrée "self" au démarrage afin que les interfaces utilisateur affichent l'hôte de la passerelle
même avant que des clients ne se connectent.

### 2) Connexion WebSocket

Chaque client WS commence par une requête `connect`. Lors d'une poignée de main réussie, le
Gateway insère ou met à jour une entrée de présence pour cette connexion.

#### Pourquoi les commandes CLI ponctuelles n'apparaissent pas

Le CLI se connecte souvent pour des commandes courtes et uniques. Pour éviter de polluer la
liste des Instances, `client.mode === "cli"` n'est **pas** transformé en entrée de présence.

### 3) Balises `system-event`

Les clients peuvent envoyer des balises périodiques plus riches via la méthode `system-event`. L'application Mac
l'utilise pour signaler le nom d'hôte, l'IP et `lastInputSeconds`.

### 4) Connexions de nœuds (rôle : nœud)

Lorsqu'un nœud se connecte via le WebSocket du Gateway avec `role: node`, le Gateway
insère ou met à jour une entrée de présence pour ce nœud (même flux que les autres clients WS).

## Règles de fusion et de déduplication (pourquoi `instanceId` est important)

Les entrées de présence sont stockées dans une seule carte en mémoire :

- Les entrées sont indexées par une **clé de présence** (**presence key**).
- La meilleure clé est un `instanceId` stable (issu de `connect.client.instanceId`) qui survit aux redémarrages.
- Les clés ne sont pas sensibles à la casse.

Si un client se reconnecte sans un `instanceId` stable, il peut apparaître comme une ligne
**en double**.

## TTL et taille limitée

La présence est intentionnellement éphémère :

- **TTL :** les entrées plus anciennes que 5 minutes sont supprimées
- **Max entrées :** 200 (les plus anciennes sont supprimées en premier)

Cela permet de garder la liste à jour et d'éviter une croissance mémoire non limitée.

## Mise en garde concernant le tunnel/distant (IPs de bouclage)

Lorsqu'un client se connecte via un tunnel SSH / redirection de port local, le Gateway peut
voir l'adresse distante comme `127.0.0.1`. Pour éviter d'écraser une bonne IP signalée par le client,
les adresses distantes de bouclage sont ignorées.

## Consommateurs

### Onglet Instances macOS

L'application macOS restitue la sortie de `system-presence` et applique un petit indicateur de
statut (Actif/Inactif/Périmé) en fonction de l'ancienneté de la dernière mise à jour.

## Conseils de débogage

- Pour voir la liste brute, appelez `system-presence` sur le Gateway.
- Si vous voyez des doublons :
  - confirmez que les clients envoient un `client.instanceId` stable lors de la poignée de main
  - confirmez que les balises périodiques utilisent le même `instanceId`
  - vérifiez si l'entrée dérivée de la connexion manque de `instanceId` (les doublons sont attendus)

## Connexes

<CardGroup cols={2}>
  <Card title="Indicateurs de frappe" href="/fr/concepts/typing-indicators" icon="ellipsis">
    Quand les indicateurs de frappe sont envoyés et comment les régler.
  </Card>
  <Card title="Streaming et chunking" href="/fr/concepts/streaming" icon="bars-staggered">
    Streaming sortant, découpage (chunking) et formatage par channel.
  </Card>
  <Card title="Architecture du Gateway" href="/fr/concepts/architecture" icon="diagram-project">
    Composants du Gateway et protocole WebSocket qui pilote les mises à jour de présence.
  </Card>
  <Card title="GatewayProtocole Gateway" href="/fr/gateway/protocol" icon="plug">
    Le protocole filaire pour `connect`, `system-event` et `system-presence`.
  </Card>
</CardGroup>

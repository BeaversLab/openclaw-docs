---
summary: "Comment les entrées de présence OpenClaw sont produites, fusionnées et affichées"
read_when:
  - Débogage de l'onglet Instances
  - Enquête sur les lignes d'instance en double ou obsolètes
  - Modification de la connexion WS de la passerelle ou des balises system-event
title: "Présence"
---

# Présence

La « présence » OpenClaw est une vue légère et au meilleur effort de :

- la **Gateway** elle-même, et
- **les clients connectés à la Gateway** (application Mac, WebChat, CLI, etc.)

La présence est principalement utilisée pour afficher l'onglet **Instances** de l'application macOS et pour
fournir une visibilité rapide à l'opérateur.

## Champs de présence (ce qui s'affiche)

Les entrées de présence sont des objets structurés avec des champs tels que :

- `instanceId` (facultatif mais fortement recommandé) : identité client stable (généralement `connect.client.instanceId`)
- `host` : nom d'hôte convivial
- `ip` : adresse IP au meilleur effort
- `version` : chaîne de version du client
- `deviceFamily` / `modelIdentifier` : indicateurs matériels
- `mode` : `ui`, `webchat`, `cli`, `backend`, `probe`, `test`, `node`, ...
- `lastInputSeconds` : « secondes depuis la dernière saisie utilisateur » (si connu)
- `reason` : `self`, `connect`, `node-connected`, `periodic`, ...
- `ts` : horodatage de la dernière mise à jour (ms depuis l'époque)

## Producteurs (d'où vient la présence)

Les entrées de présence sont produites par plusieurs sources et **fusionnées**.

### 1) Entrée propre du Gateway

La Gateway initialise toujours une entrée « self » au démarrage afin que les interfaces affichent l'hôte de la passerelle
même avant que des clients ne se connectent.

### 2) Connexion WebSocket

Chaque client WS commence par une requête `connect`. Lors d'une poignée de main réussie, la
Gateway met à jour ou insère une entrée de présence pour cette connexion.

#### Pourquoi les commandes ponctuelles CLI n'apparaissent pas

La CLI se connecte souvent pour des commandes courtes et ponctuelles. Pour éviter de polluer la
liste des Instances, `client.mode === "cli"` n'est **pas** transformé en entrée de présence.

### 3) balises `system-event`

Les clients peuvent envoyer des balises périodiques plus riches via la méthode `system-event`. L'application Mac utilise ceci pour signaler le nom d'hôte, l'IP et `lastInputSeconds`.

### 4) Connexions de nœuds (rôle : node)

Lorsqu'un nœud se connecte via WebSocket Gateway avec `role: node`, le Gateway met à jour (upsert) une entrée de présence pour ce nœud (même flux que les autres clients WS).

## Règles de fusion et de déduplication (pourquoi `instanceId` est important)

Les entrées de présence sont stockées dans une seule carte en mémoire (in‑memory map) :

- Les entrées sont indexées par une **clé de présence**.
- La meilleure clé est un `instanceId` stable (depuis `connect.client.instanceId`) qui survive aux redémarrages.
- Les clés ne sont pas sensibles à la casse.

Si un client se reconnecte sans un `instanceId` stable, il peut apparaître comme une ligne **en double**.

## TTL et taille limitée

La présence est intentionnellement éphémère :

- **TTL :** les entrées plus anciennes que 5 minutes sont supprimées
- **Max entrées :** 200 (les plus anciennes supprimées en premier)

Cela permet de garder la liste à jour et d'éviter une croissance de la mémoire non limitée.

## Mise en garde relative au tunnel/distant (IP de bouclage)

Lorsqu'un client se connecte via un tunnel SSH / redirection de port local, le Gateway peut voir l'adresse distante comme `127.0.0.1`. Pour éviter d'écraser une bonne IP signalée par le client, les adresses distantes de bouclage sont ignorées.

## Consommateurs

### Onglet Instances macOS

L'application macOS affiche la sortie de `system-presence` et applique un petit indicateur d'état (Actif/Inactif/Périmé) basé sur l'âge de la dernière mise à jour.

## Conseils de débogage

- Pour voir la liste brute, appelez `system-presence` contre le Gateway.
- Si vous voyez des doublons :
  - confirmez que les clients envoient un `client.instanceId` stable lors de la poignée de main
  - confirmez que les balises périodiques utilisent le même `instanceId`
  - vérifiez si l'entrée dérivée de la connexion manque de `instanceId` (les doublons sont attendus)

import fr from "/components/footer/fr.mdx";

<fr />

---
summary: "GatewayRôles d'opérateur, portées et vérifications au moment de l'approbation pour les clients Gateway"
read_when:
  - Debugging missing operator scope errors
  - Reviewing device or node pairing approvals
  - Adding or classifying Gateway RPC methods
title: "Portées d'opérateur"
---

Les portées d'opérateur définissent ce qu'un client Gateway peut faire après s'être authentifié.
Elles constituent un garde-fou du plan de contrôle à l'intérieur d'un domaine d'opérateur Gateway de confiance,
et non une isolation multitenante hostile. Si vous avez besoin d'une séparation forte entre
les personnes, les équipes ou les machines, exécutez des Gateways distincts sous des utilisateurs ou des hôtes OS distincts.

Connexes : [Sécurité](/fr/gateway/securityGateway), [Protocole Gateway](/fr/gateway/protocolGateway),
[Jumelage Gateway](/fr/gateway/pairingCLI), [CLI des appareils](/fr/cli/devices).

## Rôles

Les clients WebSocket Gateway se connectent avec un rôle :

- `operator`CLI : clients du plan de contrôle tels que le CLI, l'interface de contrôle, l'automatisation et
  les processus d'assistance de confiance.
- `node`macOSiOSAndroid : hôtes de capacités tels que macOS, iOS, Android ou des nœuds sans interface qui
  exposent des commandes via `node.invoke`.

Les méthodes RPC d'opérateur nécessitent le rôle RPC`operator`. Les méthodes originaires des nœuds
nécessitent le rôle `node`.

## Niveaux de portée

| Portée                  | Signification                                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operator.read`         | Statut en lecture seule, listes, catalogue, journaux, lectures de session et autres appels de plan de contrôle non modificateurs.                                                                                                                  |
| `operator.write`        | Actions normales modifiant l'opérateur telles que l'envoi de messages, l'appel d'outils, la mise à jour des paramètres talk/voice et le relais de commandes de nœud. Satisfait également `operator.read`.                                          |
| `operator.admin`        | Accès administratif au plan de contrôle. Satisfait toutes les portées `operator.*`. Requis pour la modification de la configuration, les mises à jour, les hooks natifs, les espaces de noms réservés sensibles et les approbations à haut risque. |
| `operator.pairing`      | Gestion de l'appairage des appareils et des nœuds, y compris la liste, l'approbation, le rejet, la suppression, la rotation et la révocation des enregistrements d'appairage ou des jetons d'appareil.                                             |
| `operator.approvals`    | API d'approbation Exec et de plugin.                                                                                                                                                                                                               |
| `operator.talk.secrets` | Lecture de la configuration Talk, secrets inclus.                                                                                                                                                                                                  |

Les étendues (scopes) `operator.*` inconnues futures nécessitent une correspondance exacte, sauf si l'appelant possède
`operator.admin`.

## L'étendue de la méthode est uniquement la première porte

Chaque Gateway RPC possède une étendue de méthode de moindre privilège. Cette étendue de méthode détermine
si la demande peut atteindre le gestionnaire. Certains gestionnaires appliquent ensuite des vérifications
plus strictes au moment de l'approbation, basées sur l'élément concret en cours d'approbation ou de modification.

Exemples :

- `device.pair.approve` est accessible avec `operator.pairing`, mais l'approbation d'un
  appareil opérateur ne peut créer ou conserver que les étendues que l'appelant possède déjà.
- `node.pair.approve` est accessible avec `operator.pairing`, puis dérive des étendues
  d'approbation supplémentaires à partir de la liste des commandes de nœud en attente.
- `chat.send` est normalement une méthode à portée d'écriture, mais `/config set`
  persistantes et `/config unset` nécessitent `operator.admin` au niveau de la commande.

Cela permet aux opérateurs ayant une étendue plus réduite d'effectuer des actions d'appairage à faible risque sans avoir à
rendre toutes les approbations d'appairage réservées aux administrateurs.

## Approbations d'appairage d'appareil

Les enregistrements d'appairage d'appareils sont la source durable des rôles et des étendues approuvés.
Les appareils déjà appairés n'obtiennent pas un accès plus large silencieusement : les reconnexions qui demandent
un rôle plus large ou des étendues plus larges créent une nouvelle demande de mise à niveau en attente.

Lors de l'approbation d'une demande d'appareil :

- Une demande sans rôle d'opérateur ne nécessite pas d'approbation de l'étendue du jeton d'opérateur.
- Une demande pour `operator.read`, `operator.write`, `operator.approvals`,
  `operator.pairing` ou `operator.talk.secrets` exige que l'appelant possède
  ces étendues, ou `operator.admin`.
- Une demande pour `operator.admin` nécessite `operator.admin`.
- Une demande de réparation sans portées explicites peut hériter des portées du jeton d'opérateur existant. Si ce jeton existant a une portée d'administrateur, l'approbation nécessite toujours `operator.admin`.

Pour les sessions de jetons d'appareil appariés, la gestion est auto-portée, sauf si l'appelant possède également `operator.admin` : les appelants non-administrateurs ne voient que leurs propres entrées d'appariement, ne peuvent approuver ou rejeter que leur propre demande en attente, et ne peuvent faire pivoter, révoquer ou supprimer que leur propre entrée d'appareil.

## Approbations d'appariement de nœud

L'ancien `node.pair.*` utilise un magasin d'appariement de nœud distinct et propriétaire du Gateway. Les nœuds WS utilisent l'appariement d'appareil avec `role: node`, mais le même vocabulaire de niveau d'approbation s'applique.

`node.pair.approve` utilise la liste de commandes de demande en attente pour dériver des portées supplémentaires requises :

- Demande sans commande : `operator.pairing`
- Commandes de nœud non-exéc : `operator.pairing` + `operator.write`
- `system.run`, `system.run.prepare` ou `system.which` :
  `operator.pairing` + `operator.admin`

L'appariement de nœud établit l'identité et la confiance. Il ne remplace pas la propre stratégie d'approbation d'exécution `system.run` du nœud.

## Authentification par secret partagé

L'authentification par jeton/mot de passe de passerelle partagé est traitée comme un accès opérateur de confiance pour ce Gateway. Les surfaces HTTP compatibles OpenAI, `/tools/invoke`, et les points de terminaison de l'historique des sessions HTTP restaurent le jeu normal de portées par défaut complet de l'opérateur pour l'authentification par porteur via secret partagé, même si un appelant envoie des portées déclarées plus restreintes.

Les modes porteurs d'identité, tels que l'authentification par proxy de confiance ou `none` d'entrée privée, peuvent toujours honorer les portées déclarées explicites. Utilisez des Gateways distincts pour une véritable séparation des limites de confiance.

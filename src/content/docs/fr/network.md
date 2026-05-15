---
summary: "Network hub: gateway surfaces, pairing, discovery, and security"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Réseau"
---

Ce hub relie les documents de base expliquant comment OpenClaw connecte, associe et sécurise les appareils sur localhost, le LAN et le tailnet.

## Modèle de base

La plupart des opérations passent par le Gateway (`openclaw gateway`), un processus unique de longue durée qui possède les connexions de canal et le plan de contrôle WebSocket.

- **Bouclage prioritaire** : le WS du Gateway est par défaut `ws://127.0.0.1:18789`.
  Les liaisons non-bouclage nécessitent un chemin d'authentification de passerelle valide : authentification par jeton/mot de passe de secret partagé, ou un déploiement non-bouclage `trusted-proxy` correctement configuré.
- Un seul Gateway par hôte est recommandé. Pour l'isolement, faites fonctionner plusieurs passerelles avec des profils et des ports isolés ([Multiple Gateways](/fr/gateway/multiple-gateways)).
- L'hôte **Canvas** est servi sur le même port que le Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protégé par l'authentification Gateway lorsqu'il est lié au-delà du bouclage.
- **L'accès à distance** se fait généralement via un tunnel SSH ou un VPN Tailscale ([Remote Access](/fr/gateway/remote)).

Références clés :

- [Architecture du Gateway](/fr/concepts/architecture)
- [Protocole du Gateway](/fr/gateway/protocol)
- [Runbook du Gateway](/fr/gateway)
- [Surfaces Web + modes de liaison](/fr/web)

## Association + identité

- [Aperçu de l'association (DM + nœuds)](/fr/channels/pairing)
- [Association de nœuds détenus par le Gateway](/fr/gateway/pairing)
- [CLI des appareils (association + rotation des jetons)](/fr/cli/devices)
- [CLI d'association (approbations DM)](/fr/cli/pairing)

Confiance locale :

- Les connexions directes en boucle locale peuvent être approuvées automatiquement pour l'association afin de maintenir
  une fluidité de l'expérience utilisateur sur le même hôte.
- OpenClaw dispose également d'un chemin étroit de connexion automatique local au backend/conteneur pour
  les flux d'assistance de secret partagé de confiance.
- Les clients tailnet et LAN, y compris les liaisons tailnet sur le même hôte, nécessitent toujours
  une approbation d'association explicite.

## Discovery + transports

- [Découverte et transports](/fr/gateway/discovery)
- [Bonjour / mDNS](Bonjour/en/gateway/bonjour)
- [Accès à distance (SSH)](/fr/gateway/remote)
- [Tailscale](Tailscale/en/gateway/tailscale)

## Nœuds + transports

- [Vue d'ensemble des nœuds](/fr/nodes)
- [Protocole de pont (legacy nodes, historique)](/fr/gateway/bridge-protocol)
- [Guide de nœud : iOS](iOS/en/platforms/ios)
- [Guide de nœud : Android](Android/en/platforms/android)

## Sécurité

- [Vue d'ensemble de la sécurité](/fr/gateway/security)
- [Référence de configuration du Gateway](Gateway/en/gateway/configuration)
- [Dépannage](/fr/gateway/troubleshooting)
- [Doctor](/fr/gateway/doctor)

## Connexes

- [Guide du Gateway](Gateway/en/gateway)
- [Accès à distance](/fr/gateway/remote)

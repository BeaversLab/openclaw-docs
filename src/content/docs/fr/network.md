---
summary: "Network hub: gateway surfaces, pairing, discovery, and security"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Réseau"
---

# Hub réseau

Ce hub relie la documentation de base expliquant comment OpenClaw connecte, associe et sécurise les appareils sur localhost, le LAN et le tailnet.

## Modèle principal

La plupart des opérations passent par la Gateway (`openclaw gateway`), un processus unique de longue durée qui possède les connexions de canal et le plan de contrôle WebSocket.

- **Bouclage en priorité** : le WS de la Gateway est par défaut sur `ws://127.0.0.1:18789`.
  Les liaisons non-bouclage nécessitent un chemin d'authentification de passerelle valide : authentification par jeton/mot de passe partagé (shared-secret), ou un déploiement `trusted-proxy` non-bouclage correctement configuré.
- **Une Gateway par hôte** est recommandée. Pour l'isolement, exécutez plusieurs passerelles avec des profils et des ports isolés ([Multiple Gateways](/en/gateway/multiple-gateways)).
- **L'hôte Canvas** est servi sur le même port que la Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protégé par l'authentification Gateway lorsqu'il est lié au-delà du bouclage.
- **L'accès à distance** se fait généralement via un tunnel SSH ou un VPN Tailscale ([Remote Access](/en/gateway/remote)).

Références clés :

- [Architecture de la Gateway](/en/concepts/architecture)
- [Protocole de la Gateway](/en/gateway/protocol)
- [Guide de la Gateway](/en/gateway)
- [Surfaces Web + modes de liaison](/en/web)

## Appairage + identité

- [Aperçu du couplage (DM + nœuds)](/en/channels/pairing)
- [Couplage de nœud appartenant à la Gateway](/en/gateway/pairing)
- [CLI des appareils (couplage + rotation des jetons)](/en/cli/devices)
- [CLI de couplage (approbations DM)](/en/cli/pairing)

Confiance locale :

- Les connexions en boucle local direct peuvent être automatiquement approuvées pour le couplage afin de garder l'UX same-host fluide.
- OpenClaw possède également un chemin étroit d'auto-connexion backend/conteneur-local pour les flux d'assistance de confiance shared-secret.
- Les clients Tailnet et LAN, y compris les liaisons Tailnet same-host, nécessitent toujours une approbation de couplage explicite.

## Discovery + transports

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Accès à distance (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodes + transports

- [Aperçu des nœuds](/en/nodes)
- [Protocole de pont (legacy nodes, historique)](/en/gateway/bridge-protocol)
- [Guide du nœud : iOS](/en/platforms/ios)
- [Guide du nœud : Android](/en/platforms/android)

## Sécurité

- [Aperçu de la sécurité](/en/gateway/security)
- [Référence de configuration de la Gateway](/en/gateway/configuration)
- [Dépannage](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)

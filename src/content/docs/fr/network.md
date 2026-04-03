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

- **Boucle locale en priorité** : le WS de la Gateway est par défaut configuré sur `ws://127.0.0.1:18789`. Des jetons sont requis pour les liaisons non boucle locale.
- **Une Gateway par hôte** est recommandée. Pour l'isolation, exécutez plusieurs passerelles avec des profils et des ports isolés ([Multiple Gateways](/en/gateway/multiple-gateways)).
- L'hôte **Canvas** est servi sur le même port que la Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protégé par l'authentification Gateway lors d'une liaison au-delà de la boucle locale.
- **L'accès à distance** se fait généralement via un tunnel SSH ou le VPN Tailscale ([Remote Access](/en/gateway/remote)).

Références clés :

- [Architecture de la Gateway](/en/concepts/architecture)
- [Protocole de la Gateway](/en/gateway/protocol)
- [Runbook de la Gateway](/en/gateway)
- [Surfaces Web + modes de liaison](/en/web)

## Appairage + identité

- [Aperçu de l'appairage (DM + nœuds)](/en/channels/pairing)
- [Appairage de nœuds possédés par Gateway](/en/gateway/pairing)
- [CLI des appareils (appairage + rotation des jetons)](/en/cli/devices)
- [CLI d'appairage (approbations DM)](/en/cli/pairing)

Confiance locale :

- Les connexions locales (boucle locale ou adresse tailnet propre de l'hôte de la passerelle) peuvent être
  approuvées automatiquement pour l'appairage afin de garder l'UX du même hôte fluide.
- Les clients tailnet/LAN non locaux nécessitent toujours une approbation d'appairage explicite.

## Discovery + transports

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Accès à distance (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nœuds + transports

- [Aperçu des nœuds](/en/nodes)
- [Protocole de pont (nœuds hérités)](/en/gateway/bridge-protocol)
- [Runbook de nœud : iOS](/en/platforms/ios)
- [Runbook de nœud : Android](/en/platforms/android)

## Sécurité

- [Aperçu de la sécurité](/en/gateway/security)
- [Référence de configuration de la Gateway](/en/gateway/configuration)
- [Dépannage](/en/gateway/troubleshooting)
- [Docteur](/en/gateway/doctor)

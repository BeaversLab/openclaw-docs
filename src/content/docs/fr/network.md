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

- [Architecture Gateway](/en/concepts/architecture)
- [Protocole Gateway](/en/gateway/protocol)
- [Runbook Gateway](/en/gateway)
- [Surfaces Web + modes de bind](/en/web)

## Association + identité

- [Aperçu de l'association (DM + nœuds)](/en/channels/pairing)
- [Association de nœuds appartenant à la Gateway](/en/gateway/pairing)
- [CLI des appareils (association + rotation des jetons)](/en/cli/devices)
- [CLI d'association (approbations DM)](/en/cli/pairing)

Confiance locale :

- Les connexions locales (boucle locale ou propre adresse tailnet de l'hôte de la passerelle) peuvent être approuvées automatiquement pour l'association afin de garder l'UX same-host fluide.
- Les clients tailnet/LAN non locaux nécessitent toujours une approbation d'association explicite.

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
- [Référence de configuration Gateway](/en/gateway/configuration)
- [Dépannage](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)

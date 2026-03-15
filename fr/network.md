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

- [Architecture Gateway](/fr/concepts/architecture)
- [Protocole Gateway](/fr/gateway/protocol)
- [Runbook Gateway](/fr/gateway)
- [Surfaces Web + modes de bind](/fr/web)

## Association + identité

- [Aperçu de l'association (DM + nœuds)](/fr/channels/pairing)
- [Association de nœuds appartenant à la Gateway](/fr/gateway/pairing)
- [CLI des appareils (association + rotation des jetons)](/fr/cli/devices)
- [CLI d'association (approbations DM)](/fr/cli/pairing)

Confiance locale :

- Les connexions locales (boucle locale ou propre adresse tailnet de l'hôte de la passerelle) peuvent être approuvées automatiquement pour l'association afin de garder l'UX same-host fluide.
- Les clients tailnet/LAN non locaux nécessitent toujours une approbation d'association explicite.

## Discovery + transports

- [Discovery & transports](/fr/gateway/discovery)
- [Bonjour / mDNS](/fr/gateway/bonjour)
- [Accès à distance (SSH)](/fr/gateway/remote)
- [Tailscale](/fr/gateway/tailscale)

## Nœuds + transports

- [Aperçu des nœuds](/fr/nodes)
- [Protocole de pont (nœuds hérités)](/fr/gateway/bridge-protocol)
- [Runbook de nœud : iOS](/fr/platforms/ios)
- [Runbook de nœud : Android](/fr/platforms/android)

## Sécurité

- [Aperçu de la sécurité](/fr/gateway/security)
- [Référence de configuration Gateway](/fr/gateway/configuration)
- [Dépannage](/fr/gateway/troubleshooting)
- [Doctor](/fr/gateway/doctor)

import fr from '/components/footer/fr.mdx';

<fr />

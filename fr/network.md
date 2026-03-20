---
summary: "Centre de réseau : surfaces Gateway, appairage, découverte et sécurité"
read_when:
  - Vous avez besoin d'une vue d'ensemble de l'architecture et de la sécurité du réseau
  - Vous déboguez l'accès local vs tailnet ou l'appairage
  - Vous souhaitez la liste canonique de la documentation réseau
title: "Réseau"
---

# Centre de réseau

Ce centre relie la documentation principale sur la façon dont OpenClaw connecte, couple et sécurise
les appareils sur localhost, le réseau local et le tailnet.

## Modèle principal

- [Architecture Gateway](/fr/concepts/architecture)
- [Protocole Gateway](/fr/gateway/protocol)
- [Guide d'exploitation Gateway](/fr/gateway)
- [Surfaces Web + modes de liaison](/fr/web)

## Appairage + identité

- [Vue d'ensemble de l'appairage (DM + nœuds)](/fr/channels/pairing)
- [Appairage de nœud détenus par Gateway](/fr/gateway/pairing)
- [CLI des appareils (appairage + rotation des jetons)](/fr/cli/devices)
- [Appairage CLI (approbations DM)](/fr/cli/pairing)

Confiance locale :

- Les connexions locales (boucle locale ou adresse tailnet propre de l’hôte de passerelle) peuvent être
  approuvées automatiquement pour l’appairage afin de maintenir la fluidité de l’expérience utilisateur sur le même hôte.
- Les clients tailnet/LAN non locaux nécessitent toujours une approbation d’appairage explicite.

## Discovery + transports

- [Discovery & transports](/fr/gateway/discovery)
- [Bonjour / mDNS](/fr/gateway/bonjour)
- [Accès à distance (SSH)](/fr/gateway/remote)
- [Tailscale](/fr/gateway/tailscale)

## Nodes + transports

- [Vue d’ensemble des nœuds](/fr/nodes)
- [Protocole de pont (nœuds hérités)](/fr/gateway/bridge-protocol)
- [Manuel du nœud : iOS](/fr/platforms/ios)
- [Manuel du nœud : Android](/fr/platforms/android)

## Sécurité

- [Vue d’ensemble de la sécurité](/fr/gateway/security)
- [Référence de la configuration Gateway](/fr/gateway/configuration)
- [Dépannage](/fr/gateway/troubleshooting)
- [Doctor](/fr/gateway/doctor)

import fr from "/components/footer/fr.mdx";

<fr />

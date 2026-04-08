---
summary: "Référence CLI pour `openclaw dns` (helpers de découverte grande distance)"
read_when:
  - You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS
  - You’re setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "dns"
---

# `openclaw dns`

Helpers DNS pour la découverte grande distance (Tailscale + CoreDNS). Actuellement axé sur macOS + Homebrew CoreDNS.

Connexes :

- Discovery de passerelle : [Discovery](/en/gateway/discovery)
- Configuration de la découverte à grande échelle : [Configuration](/en/gateway/configuration)

## Installation

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

Planifiez ou appliquez la configuration CoreDNS pour la découverte DNS-SD unicast.

Options :

- `--domain <domain>` : domaine de découverte à grande échelle (par exemple `openclaw.internal`)
- `--apply` : installer ou mettre à jour la configuration CoreDNS et redémarrer le service (nécessite sudo ; macOS uniquement)

Ce qu'il affiche :

- domaine de découverte résolu
- chemin du fichier de zone
- IPs actuelles du tailnet
- configuration de découverte `openclaw.json` recommandée
- les valeurs de serveur de noms/domaine DNS fractionné Tailscale à définir

Notes :

- Sans `--apply`, la commande est uniquement une aide à la planification et imprime la configuration recommandée.
- Si `--domain` est omis, OpenClaw utilise `discovery.wideArea.domain` à partir de la configuration.
- `--apply` prend actuellement en charge uniquement macOS et s'attend à ce que CoreDNS soit installé via Homebrew.
- `--apply` initialise le fichier de zone si nécessaire, s'assure que la strophe d'importation CoreDNS existe et redémarre le service brew `coredns`.

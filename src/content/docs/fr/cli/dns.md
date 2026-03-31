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

- Découverte Gateway : [Discovery](/en/gateway/discovery)
- Configuration de la découverte grande distance : [Configuration](/en/gateway/configuration)

## Installation

```bash
openclaw dns setup
openclaw dns setup --apply
```

---
summary: "Référence CLI pour `openclaw voicecall` (surface de commande du plugin voice-call)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` est une commande fournie par un plugin. Elle n'apparaît que si le plugin voice-call est installé et activé.

Documentation principale :

- Plugin voice-call : [Appel vocal](/fr/plugins/voice-call)

## Commandes courantes

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## Exposition de webhooks (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

Note de sécurité : n'exposez le point de terminaison du webhook qu'à des réseaux de confiance. Préférez Tailscale Serve à Funnel lorsque cela est possible.

import fr from "/components/footer/fr.mdx";

<fr />

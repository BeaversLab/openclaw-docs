---
summary: "Referencia de la CLI para `openclaw voicecall` (superficie de comando del complemento de llamada de voz)"
read_when:
  - Usas el complemento de llamada de voz y quieres los puntos de entrada de la CLI
  - Quieres ejemplos rápidos para `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` es un comando proporcionado por un complemento. Solo aparece si el complemento de llamada de voz está instalado y habilitado.

Documentación principal:

- Complemento de llamada de voz: [Llamada de voz](/es/plugins/voice-call)

## Comandos comunes

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## Exponer webhooks (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

Nota de seguridad: solo expon el endpoint del webhook a redes en las que confíes. Prefiere Tailscale Serve sobre Funnel cuando sea posible.

import en from "/components/footer/en.mdx";

<en />

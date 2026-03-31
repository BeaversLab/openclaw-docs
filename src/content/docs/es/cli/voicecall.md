---
summary: "Referencia de CLI para `openclaw voicecall` (superficie de comandos del complemento de llamada de voz)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `openclaw voicecall`

`voicecall` es un comando proporcionado por un complemento. Solo aparece si el complemento de llamada de voz está instalado y habilitado.

Documentación principal:

- Complemento de llamada de voz: [Voice Call](/en/plugins/voice-call)

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

Nota de seguridad: solo exponga el endpoint del webhook a redes en las que confíe. Prefiera Tailscale Serve sobre Funnel cuando sea posible.

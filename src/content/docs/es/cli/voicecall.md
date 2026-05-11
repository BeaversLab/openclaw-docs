---
summary: "Referencia de CLI para `openclaw voicecall` (superficie de comandos del complemento de voz)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Llamada de voz"
---

# `openclaw voicecall`

`voicecall` es un comando proporcionado por un complemento. Solo aparece si el complemento de llamada de voz está instalado y habilitado.

Documentación principal:

- Complemento de llamada de voz: [Llamada de voz](/es/plugins/voice-call)

## Comandos comunes

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` imprime comprobaciones de estado legibles por humanos de forma predeterminada. Use `--json` para
scripts:

```bash
openclaw voicecall setup --json
```

Para proveedores externos (`twilio`, `telnyx`, `plivo`), la configuración debe resolver una URL de
webhook pública desde `publicUrl`, un túnel o exposición de Tailscale. Se rechaza la alternativa de servicio en bucle/privado
porque los operadores no pueden alcanzarla.

`smoke` ejecuta las mismas comprobaciones de estado. No realizará una llamada telefónica real
a menos que ambos `--to` y `--yes` estén presentes:

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## Exponer webhooks (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

Nota de seguridad: solo exponga el endpoint del webhook a redes de confianza. Prefiera Tailscale Serve sobre Funnel cuando sea posible.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Complemento de llamada de voz](/es/plugins/voice-call)

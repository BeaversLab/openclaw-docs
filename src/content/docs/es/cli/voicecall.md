---
summary: "Referencia de CLI para `openclaw voicecall` (superficie de comandos del complemento de voz)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Llamada de voz"
---

# `openclaw voicecall`

`voicecall` es un comando proporcionado por un complemento. Solo aparece si el complemento de llamada de voz está instalado y habilitado.

Cuando el Gateway se está ejecutando, los comandos operativos (`call`, `start`,
`continue`, `speak`, `dtmf`, `end` y `status`) se envían al tiempo de ejecución
voice-call de ese Gateway. Si no hay ningún Gateway accesible, recurren a un tiempo de ejecución
CLI independiente.

Documentación principal:

- Complemento de llamada de voz: [Voice Call](/es/plugins/voice-call)

## Comandos comunes

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
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

`status` imprime las llamadas activas como JSON de forma predeterminada. Pase `--call-id <id>` para inspeccionar
una llamada.

Para proveedores externos (`twilio`, `telnyx`, `plivo`), la configuración debe resolver una URL
pública de webhook desde `publicUrl`, un túnel o una exposición Tailscale. Se rechaza un recurso de
servidor de bucle de retorno/privado porque los operadores no pueden acceder a él.

`smoke` ejecuta las mismas comprobaciones de estado. No realizará una llamada telefónica real
a menos que estén presentes tanto `--to` como `--yes`:

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## Exposición de webhooks (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

Nota de seguridad: solo exponga el endpoint del webhook a redes en las que confíe. Prefiera Tailscale Serve sobre Funnel cuando sea posible.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Complemento de llamada de voz](/es/plugins/voice-call)

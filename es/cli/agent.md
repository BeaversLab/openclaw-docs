---
summary: "Referencia de CLI para `openclaw agent` (enviar una turno de agente a través de la Gateway)"
read_when:
  - Desea ejecutar un turno de agente desde scripts (opcionalmente entregar respuesta)
title: "agent"
---

# `openclaw agent`

Ejecute un turno de agente a través de la Gateway (use `--local` para integrado).
Use `--agent <id>` para apuntar a un agente configurado directamente.

Relacionado:

- Herramienta de envío de agente: [Agent send](/es/tools/agent-send)

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Notas

- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor gestionadas por SecretRef se persisten como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secreto resuelto.
- Las escrituras de marcadores tienen autoridad de origen: OpenClaw guarda los marcadores de la instantánea de la configuración de origen activa, no de los valores secretos de tiempo de ejecución resueltos.

import es from "/components/footer/es.mdx";

<es />

---
summary: "Referencia de la CLI para `openclaw agent` (enviar una vuelta de agente a través de la puerta de enlace)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agente"
---

# `openclaw agent`

Ejecuta una vuelta de agente a través de la puerta de enlace (usa `--local` para embebido).
Usa `--agent <id>` para dirigirte a un agente configurado directamente.

Relacionado:

- Herramienta de envío de agente: [Envío de agente](/es/tools/agent-send)

## Ejemplos

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Notas

- Cuando este comando activa la regeneración de `models.json`, las credenciales del proveedor gestionadas por SecretRef se guardan como marcadores no secretos (por ejemplo, nombres de variables de entorno, `secretref-env:ENV_VAR_NAME` o `secretref-managed`), no como texto plano de secretos resueltos.
- Las escrituras de marcadores tienen autoridad de origen: OpenClaw guarda los marcadores de la instantánea de la configuración de origen activa, no de los valores secretos de tiempo de ejecución resueltos.

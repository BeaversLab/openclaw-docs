---
summary: "Referencia de la CLI para `openclaw webhooks` (ayudantes de webhook + Pub/Sub de Gmail)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You want webhook helper commands
title: "webhooks"
---

# `openclaw webhooks`

Ayudantes de webhooks e integraciones (Gmail Pub/Sub, ayudantes de webhooks).

Relacionado:

- Webhooks: [Webhooks](/es/automation/cron-jobs#webhooks)
- Gmail Pub/Sub: [Gmail Pub/Sub](/es/automation/cron-jobs#gmail-pubsub-integration)

## Gmail

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail run
```

### `webhooks gmail setup`

Configurar la vigilancia de Gmail, Pub/Sub y la entrega de webhooks de OpenClaw.

Obligatorio:

- `--account <email>`

Opciones:

- `--project <id>`
- `--topic <name>`
- `--subscription <name>`
- `--label <label>`
- `--hook-url <url>`
- `--hook-token <token>`
- `--push-token <token>`
- `--bind <host>`
- `--port <port>`
- `--path <path>`
- `--include-body`
- `--max-bytes <n>`
- `--renew-minutes <n>`
- `--tailscale <funnel|serve|off>`
- `--tailscale-path <path>`
- `--tailscale-target <target>`
- `--push-endpoint <url>`
- `--json`

Ejemplos:

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### `webhooks gmail run`

Ejecutar `gog watch serve` además del bucle de renovación automática de la vigilancia.

Opciones:

- `--account <email>`
- `--topic <topic>`
- `--subscription <name>`
- `--label <label>`
- `--hook-url <url>`
- `--hook-token <token>`
- `--push-token <token>`
- `--bind <host>`
- `--port <port>`
- `--path <path>`
- `--include-body`
- `--max-bytes <n>`
- `--renew-minutes <n>`
- `--tailscale <funnel|serve|off>`
- `--tailscale-path <path>`
- `--tailscale-target <target>`

Ejemplo:

```bash
openclaw webhooks gmail run --account you@example.com
```

Consulte la [documentación de Gmail Pub/Sub](/es/automation/cron-jobs#gmail-pubsub-integration) para obtener el flujo de configuración de extremo a extremo y los detalles operativos.

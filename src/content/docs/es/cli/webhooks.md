---
summary: "Referencia de CLI para `openclaw webhooks` (configuración y ejecución de Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You need the full flag list and default values
title: "Webhooks"
---

# `openclaw webhooks`

Asistentes e integraciones de webhooks. Actualmente, esta superficie está limitada a los flujos de Gmail Pub/Sub que se integran con el observador `gog` incluido.

## Subcomandos

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| Subcomando    | Descripción                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `gmail setup` | Configure la observación de Gmail, el tema/suscripción de Pub/Sub y el destino de entrega del webhook de OpenClaw. |
| `gmail run`   | Ejecute `gog watch serve` además del bucle de renovación automática de la observación.                             |

## `webhooks gmail setup`

Configure la observación de Gmail, Pub/Sub y la entrega del webhook de OpenClaw.

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### Obligatorio

| Opción              | Descripción                 |
| ------------------- | --------------------------- |
| `--account <email>` | Cuenta de Gmail a observar. |

### Opciones de Pub/Sub

| Opción                  | Predeterminado         | Descripción                                                |
| ----------------------- | ---------------------- | ---------------------------------------------------------- |
| `--project <id>`        | (ninguno)              | ID del proyecto de GCP (el propietario del cliente OAuth). |
| `--topic <name>`        | `gog-gmail-watch`      | Nombre del tema de Pub/Sub.                                |
| `--subscription <name>` | `gog-gmail-watch-push` | Nombre de la suscripción de Pub/Sub.                       |
| `--label <label>`       | `INBOX`                | Etiqueta de Gmail a observar.                              |
| `--push-endpoint <url>` | (ninguno)              | Endpoint de push explícito de Pub/Sub. Anula Tailscale.    |

### Opciones de entrega de OpenClaw

| Opción                 | Predeterminado | Descripción                                  |
| ---------------------- | -------------- | -------------------------------------------- |
| `--hook-url <url>`     | (ninguno)      | URL del webhook de OpenClaw.                 |
| `--hook-token <token>` | (ninguno)      | Token del webhook de OpenClaw.               |
| `--push-token <token>` | (ninguno)      | Token de push reenviado a `gog watch serve`. |

### Opciones de `gog watch serve`

| Opción                | Predeterminado  | Descripción                                                                                     |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | Host de enlace de `gog watch serve`.                                                            |
| `--port <port>`       | `8788`          | Puerto de `gog watch serve`.                                                                    |
| `--path <path>`       | `/gmail-pubsub` | Ruta de `gog watch serve`.                                                                      |
| `--include-body`      | `true`          | Incluir fragmentos del cuerpo del correo electrónico. Pase `--no-include-body` para desactivar. |
| `--max-bytes <n>`     | `20000`         | Máximo de bytes por fragmento del cuerpo.                                                       |
| `--renew-minutes <n>` | `720` (12h)     | Renovar la vigilancia de Gmail cada N minutos.                                                  |

### Exposición de Tailscale

| Opción                    | Predeterminado | Descripción                                                                    |
| ------------------------- | -------------- | ------------------------------------------------------------------------------ |
| `--tailscale <mode>`      | `funnel`       | Exponer el endpoint de push a través de tailscale: `funnel`, `serve`, o `off`. |
| `--tailscale-path <path>` | (ninguno)      | Ruta para tailscale serve/funnel.                                              |
| `--tailscale-target <t>`  | (ninguno)      | Objetivo de tailscale serve/funnel (puerto, `host:port` o URL).                |

### Salida

| Opción   | Descripción                                                |
| -------- | ---------------------------------------------------------- |
| `--json` | Imprimir un resumen legible por máquina en lugar de texto. |

## `webhooks gmail run`

Ejecutar `gog watch serve` más el bucle de renovación automática de vigilancia en primer plano.

```bash
openclaw webhooks gmail run --account you@example.com
```

`run` acepta las mismas opciones de `gog watch serve`, entrega de OpenClaw, Pub/Sub y Tailscale que `setup`, excepto:

- `--account` es **opcional** en `run` (se remite a la cuenta configurada).
- `run` **no** acepta `--project`, `--push-endpoint` o `--json`.
- Las opciones de `run` no tienen valores predeterminados integrados; los valores faltantes se remiten a los valores escritos por `setup`.

| Categoría           | Opciones                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| Pub/Sub             | `--account`, `--topic`, `--subscription`, `--label`                              |
| Entrega de OpenClaw | `--hook-url`, `--hook-token`, `--push-token`                                     |
| `gog watch serve`   | `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes` |
| Tailscale           | `--tailscale`, `--tailscale-path`, `--tailscale-target`                          |

<Note>Para `run`, el valor `--topic` es la ruta completa del tema de Pub/Sub (`projects/.../topics/...`), no solo el nombre corto del tema.</Note>

## Flujo de un extremo a otro

Consulte [Integración de Gmail Pub/Sub](/es/automation/cron-jobs#gmail-pubsub-integration) para conocer la configuración del proyecto de GCP, OAuth y del lado de la puerta de enlace que se combina con estos comandos de CLI.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Automatización de Webhooks](/es/automation/webhook)
- [Gmail Pub/Sub](/es/automation/cron-jobs#gmail-pubsub-integration)

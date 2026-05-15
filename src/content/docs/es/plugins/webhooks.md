---
summary: "Plugin de Webhooks: entrada TaskFlow autenticada para automatización externa confiable"
read_when:
  - You want to trigger or drive TaskFlows from an external system
  - You are configuring the bundled webhooks plugin
title: "Complemento de Webhooks"
---

El complemento Webhooks añade rutas HTTP autenticadas que vinculan la automatización externa a los TaskFlows de OpenClaw.

Úselo cuando desee que un sistema de confianza, como Zapier, n8n, un trabajo de CI o un servicio interno, cree y gestione TaskFlows administrados sin tener que escribir primero un complemento personalizado.

## Dónde se ejecuta

El complemento Webhooks se ejecuta dentro del proceso Gateway.

Si su Gateway se ejecuta en otra máquina, instale y configure el complemento en ese host de Gateway y luego reinicie el Gateway.

## Configurar rutas

Establezca la configuración bajo `plugins.entries.webhooks.config`:

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

Campos de ruta:

- `enabled`: opcional, por defecto es `true`
- `path`: opcional, por defecto es `/plugins/webhooks/<routeId>`
- `sessionKey`: sesión requerida que posee los TaskFlows vinculados
- `secret`: secreto compartido requerido o SecretRef
- `controllerId`: ID de controlador opcional para los flujos administrados creados
- `description`: nota de operador opcional

Entradas `secret` compatibles:

- Cadena de texto simple
- SecretRef con `source: "env" | "file" | "exec"`

Si una ruta respaldada por un secreto no puede resolver su secreto al iniciarse, el complemento omite esa ruta y registra una advertencia en lugar de exponer un endpoint roto.

## Modelo de seguridad

Se confía en que cada ruta actúe con la autoridad de TaskFlow de su `sessionKey` configurado.

Esto significa que la ruta puede inspeccionar y mutar TaskFlows propiedad de esa sesión, por lo que debería:

- Usar un secreto único y fuerte por ruta
- Preferir referencias a secretos sobre secretos de texto plano en línea
- Vincular rutas a la sesión más estrecha que se ajuste al flujo de trabajo
- Exponer solo la ruta específica de webhook que necesite

El complemento aplica:

- Autenticación de secreto compartido
- Guardas de tamaño del cuerpo de la solicitud y de tiempo de espera
- Limitación de velocidad de ventana fija
- Limitación de solicitudes en vuelo
- Acceso a TaskFlow vinculado al propietario a través de `api.runtime.tasks.managedFlows.bindSession(...)`

## Formato de solicitud

Envíe solicitudes `POST` con:

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` o `x-openclaw-webhook-secret: <secret>`

Ejemplo:

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## Acciones compatibles

Actualmente, el complemento acepta estos valores JSON `action`:

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

Crea un TaskFlow administrado para la sesión vinculada a la ruta.

Ejemplo:

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

Crea una tarea secundaria administrada dentro de un TaskFlow administrado existente.

Los tiempos de ejecución permitidos son:

- `subagent`
- `acp`

Ejemplo:

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## Forma de la respuesta

Las respuestas exitosas devuelven:

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

Las solicitudes rechazadas devuelven:

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

El complemento elimina intencionalmente los metadatos de propietario/sesión de las respuestas de los webhooks.

## Documentos relacionados

- [SDK del tiempo de ejecución del complemento](/es/plugins/sdk-runtime)
- [Descripción general de hooks y webhooks](/es/automation/hooks)
- [Webhooks de CLI](/es/cli/webhooks)

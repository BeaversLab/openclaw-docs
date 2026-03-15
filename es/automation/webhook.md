---
summary: "Ingreso de webhook para activaciones y ejecuciones de agentes aisladas"
read_when:
  - Adding or changing webhook endpoints
  - Wiring external systems into OpenClaw
title: "Webhooks"
---

# Webhooks

La puerta de enlace (Gateway) puede exponer un pequeño endpoint HTTP de webhook para activadores externos.

## Habilitar

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    // Optional: restrict explicit `agentId` routing to this allowlist.
    // Omit or include "*" to allow any agent.
    // Set [] to deny all explicit `agentId` routing.
    allowedAgentIds: ["hooks", "main"],
  },
}
```

Notas:

- `hooks.token` es obligatorio cuando `hooks.enabled=true`.
- `hooks.path` es `/hooks` de forma predeterminada.

## Autenticación

Cada solicitud debe incluir el token del enlace (hook). Se prefieren los encabezados:

- `Authorization: Bearer <token>` (recomendado)
- `x-openclaw-token: <token>`
- Los tokens en la cadena de consulta (query-string) se rechazan (`?token=...` devuelve `400`).

## Endpoints

### `POST /hooks/wake`

Payload:

```json
{ "text": "System line", "mode": "now" }
```

- `text` **obligatorio** (cadena): La descripción del evento (por ejemplo, "Nuevo correo recibido").
- `mode` opcional (`now` | `next-heartbeat`): Si se debe activar un latido inmediato (predeterminado `now`) o esperar hasta la próxima verificación periódica.

Efecto:

- Pone en cola un evento del sistema para la sesión **principal**
- Si `mode=now`, activa un latido inmediato

### `POST /hooks/agent`

Payload:

```json
{
  "message": "Run this",
  "name": "Email",
  "agentId": "hooks",
  "sessionKey": "hook:email:msg-123",
  "wakeMode": "now",
  "deliver": true,
  "channel": "last",
  "to": "+15551234567",
  "model": "openai/gpt-5.2-mini",
  "thinking": "low",
  "timeoutSeconds": 120
}
```

- `message` **obligatorio** (cadena): El prompt o mensaje para que el agente lo procese.
- `name` opcional (cadena): Nombre legible por humanos para el enlace (por ejemplo, "GitHub"), utilizado como prefijo en los resúmenes de sesión.
- `agentId` opcional (cadena): Enruta este enlace a un agente específico. Los IDs desconocidos vuelven al agente predeterminado. Cuando se establece, el enlace se ejecuta utilizando el espacio de trabajo y la configuración del agente resuelto.
- `sessionKey` opcional (cadena): La clave utilizada para identificar la sesión del agente. De forma predeterminada, este campo se rechaza a menos que `hooks.allowRequestSessionKey=true`.
- `wakeMode` opcional (`now` | `next-heartbeat`): Si se debe activar un latido inmediato (predeterminado `now`) o esperar hasta la próxima verificación periódica.
- `deliver` opcional (booleano): Si `true`, la respuesta del agente se enviará al canal de mensajería. Por defecto es `true`. Las respuestas que son solo reconocimientos de latido se omiten automáticamente.
- `channel` opcional (cadena): El canal de mensajería para la entrega. Uno de: `last`, `whatsapp`, `telegram`, `discord`, `slack`, `mattermost` (plugin), `signal`, `imessage`, `msteams`. Por defecto es `last`.
- `to` opcional (cadena): El identificador del destinatario para el canal (por ejemplo, número de teléfono para WhatsApp/Signal, ID de chat para Telegram, ID de canal para Discord/Slack/Mattermost (plugin), ID de conversación para MS Teams). Por defecto es el último destinatario en la sesión principal.
- `model` opcional (cadena): Sobrescritura del modelo (por ejemplo, `anthropic/claude-3-5-sonnet` o un alias). Debe estar en la lista de modelos permitidos si está restringido.
- `thinking` opcional (cadena): Sobrescritura del nivel de pensamiento (por ejemplo, `low`, `medium`, `high`).
- `timeoutSeconds` opcional (número): Duración máxima para la ejecución del agente en segundos.

Efecto:

- Ejecuta un turno de agente **aislado** (propia clave de sesión)
- Siempre publica un resumen en la sesión **principal**
- Si `wakeMode=now`, activa un latido inmediato

## Política de clave de sesión (cambio ruptivo)

Las sobrescrituras de `sessionKey` en la carga útil de `/hooks/agent` están deshabilitadas por defecto.

- Recomendado: establezca un `hooks.defaultSessionKey` fijo y mantenga las sobrescrituras de solicitud desactivadas.
- Opcional: permita sobrescrituras de solicitud solo cuando sea necesario y restrinja los prefijos.

Configuración recomendada:

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"],
  },
}
```

Configuración de compatibilidad (comportamiento heredado):

```json5
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:"], // strongly recommended
  },
}
```

### `POST /hooks/<name>` (mapeado)

Los nombres de hooks personalizados se resuelven a través de `hooks.mappings` (consulte la configuración). Un mapeo puede convertir cargas útiles arbitrarias en acciones `wake` o `agent`, con plantillas opcionales o transformaciones de código.

Opciones de mapeo (resumen):

- `hooks.presets: ["gmail"]` habilita el mapeo integrado de Gmail.
- `hooks.mappings` le permite definir `match`, `action` y plantillas en la configuración.
- `hooks.transformsDir` + `transform.module` carga un módulo JS/TS para lógica personalizada.
  - `hooks.transformsDir` (si se establece) debe permanecer dentro de la raíz de transformaciones bajo su directorio de configuración de OpenClaw (típicamente `~/.openclaw/hooks/transforms`).
  - `transform.module` debe resolverse dentro del directorio de transformaciones efectivo (se rechazan las rutas de cruce/escape).
- Use `match.source` para mantener un endpoint de ingestión genérico (enrutamiento basado en carga útil).
- Las transformaciones TS requieren un cargador TS (por ejemplo, `bun` o `tsx`) o `.js` precompilado en tiempo de ejecución.
- Establezca `deliver: true` + `channel`/`to` en los mapeos para enrutar las respuestas a una superficie de chat
  (`channel` por defecto es `last` y recurre a WhatsApp).
- `agentId` enruta el hook a un agente específico; los IDs desconocidos vuelven al agente predeterminado.
- `hooks.allowedAgentIds` restringe el enrutamiento explícito `agentId`. Omítalo (o incluya `*`) para permitir cualquier agente. Establezca `[]` para denegar el enrutamiento explícito `agentId`.
- `hooks.defaultSessionKey` establece la sesión predeterminada para las ejecuciones de agente de hook cuando no se proporciona una clave explícita.
- `hooks.allowRequestSessionKey` controla si las cargas útiles `/hooks/agent` pueden establecer `sessionKey` (predeterminado: `false`).
- `hooks.allowedSessionKeyPrefixes` opcionalmente restringe los valores explícitos `sessionKey` de las cargas útiles de solicitud y los mapeos.
- `allowUnsafeExternalContent: true` desactiva el contenedor de seguridad de contenido externo para ese enlace (peligroso; solo para fuentes internas de confianza).
- `openclaw webhooks gmail setup` escribe la configuración `hooks.gmail` para `openclaw webhooks gmail run`. Consulte [Gmail Pub/Sub](/es/automation/gmail-pubsub) para ver el flujo completo de vigilancia de Gmail.

## Respuestas

- `200` para `/hooks/wake`
- `200` para `/hooks/agent` (ejecución asíncrona aceptada)
- `401` ante fallo de autenticación
- `429` tras fallos de autenticación repetidos del mismo cliente (verifique `Retry-After`)
- `400` en caso de carga útil no válida
- `413` en caso de cargas útiles de tamaño excesivo

## Ejemplos

```bash
curl -X POST http://127.0.0.1:18789/hooks/wake \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"text":"New email received","mode":"now"}'
```

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","wakeMode":"next-heartbeat"}'
```

### Usar un modelo diferente

Agregue `model` a la carga útil del agente (o asignación) para anular el modelo de esa ejecución:

```bash
curl -X POST http://127.0.0.1:18789/hooks/agent \
  -H 'x-openclaw-token: SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"message":"Summarize inbox","name":"Email","model":"openai/gpt-5.2-mini"}'
```

Si aplica `agents.defaults.models`, asegúrese de que el modelo de anulación esté incluido allí.

```bash
curl -X POST http://127.0.0.1:18789/hooks/gmail \
  -H 'Authorization: Bearer SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"source":"gmail","messages":[{"from":"Ada","subject":"Hello","snippet":"Hi"}]}'
```

## Seguridad

- Mantenga los puntos finales de enlace detrás de loopback, tailnet o proxy inverso de confianza.
- Use un token de enlace dedicado; no reutilice los tokens de autenticación de la puerta de enlace.
- Los fallos de autenticación repetidos tienen una tasa limitada por dirección de cliente para frenar los intentos de fuerza bruta.
- Si utiliza el enrutamiento multiagente, configure `hooks.allowedAgentIds` para limitar la selección explícita de `agentId`.
- Mantenga `hooks.allowRequestSessionKey=false` a menos que requiera sesiones seleccionadas por el llamador.
- Si habilita la solicitud `sessionKey`, restrinja `hooks.allowedSessionKeyPrefixes` (por ejemplo, `["hook:"]`).
- Evite incluir cargas útiles sin procesar confidenciales en los registros de webhook.
- Las cargas útiles de los enlaces se tratan como no confiables y se envuelven con límites de seguridad de forma predeterminada. Si debe desactivar esto para un enlace específico, configure `allowUnsafeExternalContent: true` en la asignación de ese enlace (peligroso).

import es from "/components/footer/es.mdx";

<es />

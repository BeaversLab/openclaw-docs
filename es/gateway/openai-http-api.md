---
summary: "Expone un punto de conexión HTTP /v1/chat/completions compatible con OpenAI desde la Gateway"
read_when:
  - Integración de herramientas que esperan OpenAI Chat Completions
title: "OpenAI Chat Completions"
---

# OpenAI Chat Completions (HTTP)

La Gateway de OpenClaw puede servir un pequeño endpoint de Chat Completions compatible con OpenAI.

Este endpoint está **deshabilitado de forma predeterminada**. Habilítelo primero en la configuración.

- `POST /v1/chat/completions`
- Mismo puerto que la Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/v1/chat/completions`

En segundo plano, las solicitudes se ejecutan como una ejecución de agente normal de la Gateway (mismo camino de código que `openclaw agent`), por lo que el enrutamiento/permisos/configuración coinciden con su Gateway.

## Autenticación

Utiliza la configuración de autenticación de la Gateway. Envíe un token de portador:

- `Authorization: Bearer <token>`

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el punto de conexión devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este endpoint como una superficie de **acceso completo de operador** para la instancia de gateway.

- La autenticación de portador HTTP aquí no es un modelo de ámbito estrecho por usuario.
- Un token/contraseña válido de Gateway para este endpoint debe tratarse como una credencial de propietario/operador.
- Las solicitudes se ejecutan a través de la misma ruta de agente del plano de control que las acciones de operador de confianza.
- No hay un límite de herramienta separado para no propietarios/por usuario en este endpoint; una vez que una persona que llama pasa la autenticación de Gateway aquí, OpenClaw trata a esa persona que llama como un operador de confianza para este gateway.
- Si la política del agente de destino permite herramientas confidenciales, este endpoint puede usarlas.
- Mantenga este endpoint solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet pública.

Consulte [Seguridad](/es/gateway/security) y [Acceso remoto](/es/gateway/remote).

## Elegir un agente

No se requieren encabezados personalizados: codifique el ID del agente en el campo `model` de OpenAI:

- `model: "openclaw:<agentId>"` (ejemplo: `"openclaw:main"`, `"openclaw:beta"`)
- `model: "agent:<agentId>"` (alias)

O diríjase a un agente OpenClaw específico mediante encabezado:

- `x-openclaw-agent-id: <agentId>` (predeterminado: `main`)

Avanzado:

- `x-openclaw-session-key: <sessionKey>` para controlar completamente el enrutamiento de la sesión.

## Habilitar el punto de conexión

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `true`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
```

## Deshabilitar el punto de conexión

Establezca `gateway.http.endpoints.chatCompletions.enabled` en `false`:

```json5
{
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: false },
      },
    },
  },
}
```

## Comportamiento de la sesión

De manera predeterminada, el punto de conexión es **sin estado por solicitud** (se genera una nueva clave de sesión en cada llamada).

Si la solicitud incluye una cadena `user` de OpenAI, la Gateway deriva una clave de sesión estable a partir de ella, por lo que las llamadas repetidas pueden compartir una sesión de agente.

## Transmisión (SSE)

Establezca `stream: true` para recibir eventos enviados por el servidor (SSE):

- `Content-Type: text/event-stream`
- Cada línea de evento es `data: <json>`
- La transmisión termina con `data: [DONE]`

## Ejemplos

Sin transmisión:

```bash
curl -sS http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "messages": [{"role":"user","content":"hi"}]
  }'
```

Con transmisión:

```bash
curl -N http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "messages": [{"role":"user","content":"hi"}]
  }'
```

import en from "/components/footer/en.mdx";

<en />

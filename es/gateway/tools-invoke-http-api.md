---
summary: "Invocar una única herramienta directamente a través del endpoint HTTP del Gateway"
read_when:
  - Llamada a herramientas sin ejecutar un turno completo de agente
  - Creación de automatizaciones que requieren cumplimiento de la política de herramientas
title: "API de invocación de herramientas"
---

# Invocación de herramientas (HTTP)

El Gateway de OpenClaw expone un simple endpoint HTTP para invocar directamente una única herramienta. Siempre está habilitado, pero limitado por la autenticación del Gateway y la política de herramientas.

- `POST /tools/invoke`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/tools/invoke`

El tamaño máximo predeterminado del payload es de 2 MB.

## Autenticación

Utiliza la configuración de autenticación del Gateway. Envíe un token de portador (bearer token):

- `Authorization: Bearer <token>`

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el endpoint devuelve `429` con `Retry-After`.

## Cuerpo de la solicitud

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

Campos:

- `tool` (cadena, obligatorio): nombre de la herramienta a invocar.
- `action` (cadena, opcional): se asigna a los argumentos si el esquema de la herramienta admite `action` y el payload de argumentos lo omitió.
- `args` (objeto, opcional): argumentos específicos de la herramienta.
- `sessionKey` (cadena, opcional): clave de sesión de destino. Si se omite o es `"main"`, el Gateway utiliza la clave de sesión principal configurada (respeta `session.mainKey` y el agente predeterminado, o `global` en el ámbito global).
- `dryRun` (booleano, opcional): reservado para uso futuro; actualmente ignorado.

## Comportamiento de política + enrutamiento

La disponibilidad de las herramientas se filtra a través de la misma cadena de políticas utilizada por los agentes del Gateway:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- políticas de grupo (si la clave de sesión se asigna a un grupo o canal)
- política de subagente (al invocar con una clave de sesión de subagente)

Si una herramienta no está permitida por la política, el punto de conexión devuelve **404**.

Gateway HTTP también aplica una lista de denegación estricta de manera predeterminada (incluso si la política de sesión permite la herramienta):

- `sessions_spawn`
- `sessions_send`
- `gateway`
- `whatsapp_login`

Puedes personalizar esta lista de denegación a través de `gateway.tools`:

```json5
{
  gateway: {
    tools: {
      // Additional tools to block over HTTP /tools/invoke
      deny: ["browser"],
      // Remove tools from the default deny list
      allow: ["gateway"],
    },
  },
}
```

Para ayudar a las políticas de grupo a resolver el contexto, opcionalmente puedes establecer:

- `x-openclaw-message-channel: <channel>` (ejemplo: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (cuando existen múltiples cuentas)

## Respuestas

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (solicitud no válida o error de entrada de herramienta)
- `401` → no autorizado
- `429` → límite de velocidad de autenticación (`Retry-After` establecido)
- `404` → herramienta no disponible (no encontrada o no permitida)
- `405` → método no permitido
- `500` → `{ ok: false, error: { type, message } }` (error de ejecución de herramienta inesperado; mensaje saneado)

## Ejemplo

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

import en from "/components/footer/en.mdx";

<en />

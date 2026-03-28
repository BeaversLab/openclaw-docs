---
summary: "Invocar una sola herramienta directamente a través del endpoint HTTP del Gateway"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "API de invocación de herramientas"
---

# Invocación de herramientas (HTTP)

El Gateway de OpenClaw expone un punto final HTTP simple para invocar una sola herramienta directamente. Siempre está habilitado y utiliza la autenticación del Gateway además de la política de herramientas, pero los llamadores que pasan la autenticación de portador del Gateway se tratan como operadores de confianza para ese gateway.

- `POST /tools/invoke`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/tools/invoke`

El tamaño máximo predeterminado del payload es de 2 MB.

## Autenticación

Utiliza la configuración de autenticación del Gateway. Envíe un token de portador:

- `Authorization: Bearer <token>`

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el endpoint devuelve `429` con `Retry-After`.
- Trate esta credencial como un secreto de operador de acceso completo para ese gateway. No es un token de API con ámbito para un rol `/tools/invoke` más limitado.

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
- `action` (cadena, opcional): se asigna a args si el esquema de la herramienta soporta `action` y la carga útil de args lo omitió.
- `args` (objeto, opcional): argumentos específicos de la herramienta.
- `sessionKey` (cadena, opcional): clave de sesión de destino. Si se omite o es `"main"`, el Gateway utiliza la clave de sesión principal configurada (respeta `session.mainKey` y el agente predeterminado, o `global` en el ámbito global).
- `dryRun` (booleano, opcional): reservado para uso futuro; actualmente ignorado.

## Comportamiento de política y enrutamiento

La disponibilidad de herramientas se filtra a través de la misma cadena de políticas utilizada por los agentes del Gateway:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- políticas de grupo (si la clave de sesión se asigna a un grupo o canal)
- política de subagente (al invocar con una clave de sesión de subagente)

Si una herramienta no está permitida por la política, el punto final devuelve **404**.

Notas importantes sobre los límites:

- `POST /tools/invoke` está en el mismo cubo de operador de confianza que otras API HTTP del Gateway como `/v1/chat/completions`, `/v1/responses` y `/api/channels/*`.
- Las aprobaciones de ejecución son barreras de seguridad para el operador, no un límite de autorización separado para este punto final HTTP. Si una herramienta es accesible aquí a través de la autenticación del Gateway + la política de herramientas, `/tools/invoke` no añade un aviso de aprobación adicional por llamada.
- No comparta las credenciales de portador del Gateway con llamadores que no sean de confianza. Si necesita separación a través de límites de confianza, ejecute gateways separados (e idealmente usuarios/hosts de sistema operativo separados).

Gateway HTTP también aplica una lista de denegación estricta de forma predeterminada (incluso si la política de sesión permite la herramienta):

- `cron`
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

Para ayudar a las políticas de grupo a resolver el contexto, opcionalmente puedes configurar:

- `x-openclaw-message-channel: <channel>` (ejemplo: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (cuando existen múltiples cuentas)

## Respuestas

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (solicitud no válida o error en la entrada de la herramienta)
- `401` → no autorizado
- `429` → autenticación limitada por tasa (`Retry-After` establecido)
- `404` → herramienta no disponible (no encontrada o no en la lista de permitidos)
- `405` → método no permitido
- `500` → `{ ok: false, error: { type, message } }` (error inesperado en la ejecución de la herramienta; mensaje saneado)

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

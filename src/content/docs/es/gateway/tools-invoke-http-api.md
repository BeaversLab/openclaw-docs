---
summary: "Invocar una sola herramienta directamente a través del endpoint HTTP del Gateway"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "API de invocación de herramientas"
---

# Invocación de herramientas (HTTP)

El Gateway de OpenClaw expone un sencillo endpoint HTTP para invocar una única herramienta directamente. Siempre está habilitado y utiliza la autenticación del Gateway más la política de herramientas. Al igual que la superficie `/v1/*` compatible con OpenAI, la autenticación de portador de secreto compartido se trata como acceso de operador de confianza para todo el gateway.

- `POST /tools/invoke`
- Mismo puerto que el Gateway (WS + multiplexación HTTP): `http://<gateway-host>:<port>/tools/invoke`

El tamaño máximo predeterminado del payload es de 2 MB.

## Autenticación

Utiliza la configuración de autenticación del Gateway. Envíe un token de portador:

- `Authorization: Bearer <token>`

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el endpoint devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este endpoint como una superficie de **acceso completo de operador** para la instancia del gateway.

- La autenticación HTTP bearer aquí no es un modelo de ámbito por usuario estrecho.
- Un token/contraseña de Gateway válido para este endpoint debe tratarse como una credencial de propietario/operador.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el endpoint restaura los valores predeterminados normales de operador completo incluso si el remitente envía un encabezado `x-openclaw-scopes` más estrecho.
- La autenticación de secreto compartido también trata las invocaciones directas de herramientas en este endpoint como turnos de remitente propietario.
- Los modos HTTP portadores de identidad de confianza (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"` en un ingreso privado) aún respetan los ámbitos de operador declarados en la solicitud.
- Mantenga este endpoint solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet pública.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador del gateway
  - ignora `x-openclaw-scopes` más estrechos
  - restaura el conjunto completo de ámbitos de operador predeterminados
  - trata las invocaciones directas de herramientas en este endpoint como turnos de remitente propietario
- modos HTTP portadores de identidad de confianza (por ejemplo, autenticación de proxy de confianza, o `gateway.auth.mode="none"` en ingreso privado)
  - autenticar alguna identidad externa de confianza o límite de implementación
  - respetar el encabezado declarado `x-openclaw-scopes`
  - solo obtener la semántica de propietario cuando `operator.admin` está realmente presente en esos alcances declarados

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
- `action` (cadena, opcional): se asigna a args si el esquema de la herramienta admite `action` y la carga útil de args lo omitió.
- `args` (objeto, opcional): argumentos específicos de la herramienta.
- `sessionKey` (cadena, opcional): clave de sesión de destino. Si se omite o es `"main"`, el Gateway usa la clave de sesión principal configurada (respeta `session.mainKey` y el agente predeterminado, o `global` en el ámbito global).
- `dryRun` (booleano, opcional): reservado para uso futuro; actualmente ignorado.

## Política + comportamiento de enrutamiento

La disponibilidad de herramientas se filtra a través de la misma cadena de políticas que utilizan los agentes del Gateway:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- políticas de grupo (si la clave de sesión se asigna a un grupo o canal)
- política de subagente (al invocar con una clave de sesión de subagente)

Si una herramienta no está permitida por la política, el punto final devuelve **404**.

Notas importantes sobre los límites:

- Las aprobaciones de ejecución son guardabarros del operador, no un límite de autorización separado para este punto final HTTP. Si una herramienta es accesible aquí a través de la autenticación del Gateway + la política de herramientas, `/tools/invoke` no añade un prompt de aprobación adicional por llamada.
- No comparta las credenciales de portador del Gateway con llamadores que no sean de confianza. Si necesita separación entre límites de confianza, ejecute gateways separados (y, idealmente, usuarios/host de SO separados).

El HTTP del Gateway también aplica una lista de denegación estricta de forma predeterminada (incluso si la política de sesión permite la herramienta):

- `exec` — ejecución directa de comandos (superficie RCE)
- `spawn` — creación arbitraria de procesos secundarios (superficie RCE)
- `shell` — ejecución de comandos de shell (superficie RCE)
- `fs_write` — mutación de archivos arbitraria en el host
- `fs_delete` — eliminación de archivos arbitraria en el host
- `fs_move` — movimiento/cambio de nombre de archivos arbitrario en el host
- `apply_patch` — la aplicación de parches puede reescribir archivos arbitrarios
- `sessions_spawn` — orquestación de sesión; el lanzamiento de agentes de forma remota es RCE
- `sessions_send` — inyección de mensajes entre sesiones
- `cron` — plano de control de automatización persistente
- `gateway` — plano de control de la puerta de enlace; evita la reconfiguración a través de HTTP
- `nodes` — el relevo de comandos de nodo puede alcanzar system.run en hosts emparejados
- `whatsapp_login` — configuración interactiva que requiere escaneo de código QR en la terminal; se cuelga en HTTP

Puede personalizar esta lista de denegación a través de `gateway.tools`:

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

Para ayudar a las políticas de grupo a resolver el contexto, puede configurar opcionalmente:

- `x-openclaw-message-channel: <channel>` (ejemplo: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (cuando existen múltiples cuentas)

## Respuestas

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (solicitud no válida o error de entrada de herramienta)
- `401` → no autorizado
- `429` → autenticación limitada por velocidad (`Retry-After` establecido)
- `404` → herramienta no disponible (no encontrada o no permitida)
- `405` → método no permitido
- `500` → `{ ok: false, error: { type, message } }` (error de ejecución de herramienta inesperado; mensaje saneado)

## Ejemplo

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

---
summary: "Invocar una sola herramienta directamente a través del endpoint HTTP del Gateway"
read_when:
  - Calling tools without running a full agent turn
  - Building automations that need tool policy enforcement
title: "API de invocación de herramientas"
---

El Gateway de OpenClaw expone un punto final HTTP simple para invocar una sola herramienta directamente. Siempre está habilitado y utiliza la autenticación del Gateway más la política de herramientas. Al igual que la superficie `/v1/*` compatible con OpenAI, la autenticación de portador de secreto compartido se trata como acceso de operador de confianza para todo el gateway.

- `POST /tools/invoke`
- Mismo puerto que el Gateway (multiplexación WS + HTTP): `http://<gateway-host>:<port>/tools/invoke`

El tamaño máximo de carga predeterminado es de 2 MB.

## Autenticación

Utiliza la configuración de autenticación del Gateway.

Rutas comunes de autenticación HTTP:

- autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`):
  `Authorization: Bearer <token-or-password>`
- autenticación HTTP con identidad de confianza (`gateway.auth.mode="trusted-proxy"`):
  enrutar a través del proxy con reconocimiento de identidad configurado y permitirle que inyecte los
  encabezados de identidad requeridos
- autenticación abierta de ingreso privado (`gateway.auth.mode="none"`):
  no se requiere encabezado de autenticación

Notas:

- Cuando `gateway.auth.mode="token"`, use `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`).
- Cuando `gateway.auth.mode="password"`, use `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`).
- Cuando `gateway.auth.mode="trusted-proxy"`, la solicitud HTTP debe provenir de una
  fuente de proxy de confianza configurada; los proxies de bucle invertido del mismo host requieren
  `gateway.auth.trustedProxy.allowLoopback = true` explícito.
- Si `gateway.auth.rateLimit` está configurado y ocurren demasiados fallos de autenticación, el punto final devuelve `429` con `Retry-After`.

## Límite de seguridad (importante)

Trate este punto final como una superficie de **acceso completo de operador** para la instancia del gateway.

- La autenticación de portador HTTP aquí no es un modelo de ámbito estrecho por usuario.
- Un token/contraseña de Gateway válido para este punto final debe tratarse como una credencial de propietario operador.
- Para los modos de autenticación de secreto compartido (`token` y `password`), el punto final restaura los valores predeterminados normales de operador completo incluso si el remitente envía un encabezado `x-openclaw-scopes` más estrecho.
- La autenticación de secreto compartido también trata las invocaciones directas de herramientas en este punto final como turnos de remitente propietario.
- Los modos HTTP de identidad confiable (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"` en un ingreso privado) respetan `x-openclaw-scopes` cuando están presentes y, de lo contrario, recurren al conjunto de alcances predeterminados del operador normal.
- Mantenga este endpoint solo en loopback/tailnet/ingreso privado; no lo exponga directamente a Internet público.

Matriz de autenticación:

- `gateway.auth.mode="token"` o `"password"` + `Authorization: Bearer ...`
  - demuestra la posesión del secreto compartido del operador de la puerta de enlace
  - ignora `x-openclaw-scopes` más estrechos
  - restaura el conjunto completo de alcances predeterminados del operador:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - trata las invocaciones directas de herramientas en este endpoint como turnos de propietario-remitente
- modos HTTP de identidad confiable (por ejemplo, autenticación de proxy de confianza o `gateway.auth.mode="none"` en ingreso privado)
  - autentican alguna identidad confiable externa o límite de implementación
  - respetan `x-openclaw-scopes` cuando el encabezado está presente
  - recurren al conjunto normal de alcances predeterminados del operador cuando el encabezado está ausente
  - solo pierden la semántica de propietario cuando el llamante estrecha explícitamente los alcances y omite `operator.admin`

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
- `action` (cadena, opcional): se asigna a los argumentos si el esquema de la herramienta admite `action` y la carga útil de los argumentos lo omitió.
- `args` (objeto, opcional): argumentos específicos de la herramienta.
- `sessionKey` (cadena, opcional): clave de sesión de destino. Si se omite o es `"main"`, la puerta de enlace utiliza la clave de sesión principal configurada (respeta `session.mainKey` y el agente predeterminado, o `global` en el ámbito global).
- `dryRun` (booleano, opcional): reservado para uso futuro; actualmente se ignora.

## Política + comportamiento de enrutamiento

La disponibilidad de herramientas se filtra a través de la misma cadena de políticas que utilizan los agentes de la puerta de enlace:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- políticas de grupo (si la clave de sesión se asigna a un grupo o canal)
- política de subagente (al invocar con una clave de sesión de subagente)

Si una herramienta no está permitida por la política, el punto de conexión devuelve **404**.

Notas importantes sobre los límites:

- Las aprobaciones de ejecución son barreras de protección del operador, no un límite de autorización separado para este punto de conexión HTTP. Si una herramienta es accesible aquí mediante la autenticación de Gateway + la política de herramientas, `/tools/invoke` no añade un mensaje adicional de aprobación por llamada.
- Si `exec` es accesible aquí, trátelo como una superficie de shell de mutación. Denegar `write`, `edit`, `apply_patch` o herramientas de escritura en el sistema de archivos HTTP no hace que la ejecución del shell sea de solo lectura.
- No comparta las credenciales de portador del Gateway con usuarios que no sean de confianza. Si necesita separación entre límites de confianza, ejecute gateways separados (e idealmente usuarios/sistemas operativos y hosts separados).

El HTTP del Gateway también aplica una lista de bloqueo estricta de manera predeterminada (incluso si la política de sesión permite la herramienta):

- `exec` - ejecución directa de comandos (superficie RCE)
- `spawn` - creación arbitraria de procesos secundarios (superficie RCE)
- `shell` - ejecución de comandos de shell (superficie RCE)
- `fs_write` - mutación arbitraria de archivos en el host
- `fs_delete` - eliminación arbitraria de archivos en el host
- `fs_move` - movimiento/cambio de nombre arbitrario de archivos en el host
- `apply_patch` - la aplicación de parches puede reescribir archivos arbitrarios
- `sessions_spawn` - orquestación de sesiones; generar agentes de forma remota es RCE
- `sessions_send` - inyección de mensajes entre sesiones
- `cron` - plano de control de automatización persistente
- `gateway` - plano de control de puerta de enlace; evita la reconfiguración a través de HTTP
- `nodes` - el relé de comandos del nodo puede alcanzar system.run en hosts emparejados
- `whatsapp_login` - configuración interactiva que requiere un escaneo de código QR en la terminal; se cuelga en HTTP

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

Para ayudar a que las políticas de grupo resuelvan el contexto, opcionalmente puede establecer:

- `x-openclaw-message-channel: <channel>` (ejemplo: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (cuando existen múltiples cuentas)

## Respuestas

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (solicitud no válida o error de entrada de herramienta)
- `401` → no autorizado
- `429` → límite de tasa de autenticación (`Retry-After` establecido)
- `404` → herramienta no disponible (no encontrada o no permitida)
- `405` → método no permitido
- `500` → `{ ok: false, error: { type, message } }` (error inesperado de ejecución de herramienta; mensaje saneado)

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

## Relacionado

- [Protocolo de Gateway](/es/gateway/protocol)
- [Herramientas y complementos](/es/tools)

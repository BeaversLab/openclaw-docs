---
summary: "Expone los métodos seleccionados del plano de control de Gateway a través del complemento incluido y opcional admin-http-rpc"
read_when:
  - Building host tooling that cannot use the Gateway WebSocket RPC client
  - Exposing Gateway admin automation behind a private trusted ingress
  - Auditing the security model for HTTP access to Gateway methods
title: "Complemento Admin HTTP RPC"
---

El complemento incluido `admin-http-rpc` expone métodos seleccionados del plano de control de Gateway a través de HTTP para la automatización de host de confianza que no puede utilizar el cliente RPC de WebSocket normal de Gateway.

El complemento se incluye con OpenClaw, pero está desactivado de forma predeterminada. Cuando está desactivado, la ruta no se registra. Cuando está activado, añade:

- `POST /api/v1/admin/rpc`
- mismo escucha que el Gateway: `http://<gateway-host>:<port>/api/v1/admin/rpc`

Actívelo solo para herramientas de host privadas, automatización de tailnet o un ingreso interno confiable. No exponga esta ruta directamente a Internet pública.

## Antes de activarlo

Admin HTTP RPC es una superficie completa del plano de control del operador. cualquier autor que pase la autenticación HTTP de Gateway puede invocar los métodos permitidos en esta página.

Úselo cuando todos estos sean ciertos:

- El autor es confiable para operar el Gateway.
- El autor no puede utilizar el cliente RPC de WebSocket.
- La ruta es accesible solo en loopback, una tailnet o un ingreso autenticado privado.
- Ha revisado los métodos permitidos y coinciden con la automatización que planea ejecutar.

Use la ruta RPC de WebSocket para clientes de OpenClaw y herramientas interactivas que puedan mantener una conexión WebSocket de Gateway abierta.

## Activar

Active el complemento incluido:

<Tabs>
  <Tab title="CLI">
    ```bash
    openclaw plugins enable admin-http-rpc
    openclaw gateway restart
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      plugins: {
        entries: {
          "admin-http-rpc": { enabled: true },
        },
      },
    }
    ```
  </Tab>
</Tabs>

La ruta se registra durante el inicio del complemento. Reinicie el Gateway después de cambiar la configuración del complemento.

Desactívelo cuando ya no necesite la superficie HTTP:

```bash
openclaw plugins disable admin-http-rpc
openclaw gateway restart
```

## Verificar la ruta

Use `health` como la solicitud segura más pequeña:

```bash
curl -sS http://<gateway-host>:<port>/api/v1/admin/rpc \
  -H 'Authorization: Bearer <gateway-token>' \
  -H 'Content-Type: application/json' \
  -d '{"method":"health","params":{}}'
```

Una respuesta exitosa tiene `ok: true`:

```json
{
  "id": "generated-request-id",
  "ok": true,
  "payload": {
    "status": "ok"
  }
}
```

Cuando el complemento está desactivado, la ruta devuelve `404` porque no está registrada.

## Autenticación

La ruta del complemento utiliza la autenticación HTTP de Gateway.

Rutas comunes de autenticación:

- autenticación de secreto compartido (`gateway.auth.mode="token"` o `"password"`): `Authorization: Bearer <token-or-password>`
- autenticación HTTP confiable con identidad (`gateway.auth.mode="trusted-proxy"`): enrute a través del proxy con conocimiento de identidad configurado y deje que inyecte los encabezados de identidad requeridos
- autenticación abierta de ingreso privado (`gateway.auth.mode="none"`): no se requiere encabezado de autenticación

## Modelo de seguridad

Trate este complemento como una superficie completa de operador de Gateway.

- Habilitar el complemento ofrece intencionalmente acceso a los métodos de RPC de administración en la lista blanca en `/api/v1/admin/rpc`.
- El complemento declara el contrato de manifiesto reservado `contracts.gatewayMethodDispatch: ["authenticated-request"]` para que su ruta HTTP autenticada por Gateway pueda enviar métodos del plano de control en proceso.
- La autenticación de portador de secreto compartido demuestra la posesión del secreto del operador de la puerta de enlace.
- Para la autenticación `token` y `password`, se ignoran los encabezados `x-openclaw-scopes` más estrechos y se restauran los valores predeterminados normales del operador completo.
- Los modos HTTP confiables con identidad respetan `x-openclaw-scopes` cuando están presentes.
- `gateway.auth.mode="none"` significa que esta ruta no está autenticada si el complemento está habilitado. Use eso solo detrás de un ingreso privado en el que confíe completamente.
- Las solicidades se envían a través de los mismos controladores de métodos de Gateway y verificaciones de alcance que RPC de WebSocket después de pasar la autenticación de ruta del complemento.
- Mantenga esta ruta en loopback, tailnet o un ingreso privado confiable. No la exponga directamente a Internet pública.
- Los contratos de manifiesto de complementos no son un sandbox. Evitan el uso accidental de asistentes reservados del SDK; los complementos de confianza aún se ejecutan en el proceso de Gateway.

Use puertas de enlace separadas cuando las llamadas crucen límites de confianza.

## Solicitud

```http
POST /api/v1/admin/rpc
Authorization: Bearer <gateway-token>
Content-Type: application/json
```

```json
{
  "id": "optional-request-id",
  "method": "health",
  "params": {}
}
```

Campos:

- `id` (cadena, opcional): se copia en la respuesta. Se genera un UUID cuando se omite.
- `method` (cadena, obligatorio): nombre del método permitido de Gateway.
- `params` (cualquiera, opcional): parámetros específicos del método.

El tamaño máximo predeterminado del cuerpo de la solicitud es de 1 MB.

## Respuesta

Las respuestas exitosas usan la forma de RPC de Gateway:

```json
{
  "id": "optional-request-id",
  "ok": true,
  "payload": {}
}
```

Los errores de método de Gateway usan:

```json
{
  "id": "optional-request-id",
  "ok": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "bad params"
  }
}
```

El estado HTTP sigue el error de Gateway cuando es posible. Por ejemplo, `INVALID_REQUEST` devuelve `400`, y `UNAVAILABLE` devuelve `503`.

## Métodos permitidos

- discovery: `commands.list`
  Devuelve los nombres de los métodos HTTP RPC permitidos por este complemento.
- gateway: `health`, `status`, `logs.tail`, `usage.status`, `usage.cost`, `gateway.restart.request`
- config: `config.get`, `config.schema`, `config.schema.lookup`, `config.set`, `config.patch`, `config.apply`
- channels: `channels.status`, `channels.start`, `channels.stop`, `channels.logout`
- web: `web.login.start`, `web.login.wait`
- models: `models.list`, `models.authStatus`
- agents: `agents.list`, `agents.create`, `agents.update`, `agents.delete`
- approvals: `exec.approvals.get`, `exec.approvals.set`, `exec.approvals.node.get`, `exec.approvals.node.set`
- cron: `cron.status`, `cron.list`, `cron.get`, `cron.runs`, `cron.add`, `cron.update`, `cron.remove`, `cron.run`
- devices: `device.pair.list`, `device.pair.approve`, `device.pair.reject`, `device.pair.remove`
- nodes: `node.list`, `node.describe`, `node.pair.list`, `node.pair.approve`, `node.pair.reject`, `node.pair.remove`, `node.rename`
- tasks: `tasks.list`, `tasks.get`, `tasks.cancel`
- diagnostics: `doctor.memory.status`, `update.status`

Otros métodos de Gateway están bloqueados hasta que se añadan intencionalmente.

## Comparación con WebSocket

La ruta RPC de WebSocket normal de Gateway sigue siendo la API de plano de control preferida para los clientes de OpenClaw. Use el admin HTTP RPC solo para herramientas de host que necesiten una superficie HTTP de solicitud/respuesta.

Los clientes WebSocket con token compartido sin una identidad de dispositivo confiable no pueden declarar alcances de administrador por sí mismos durante la conexión. El admin HTTP RPC sigue deliberadamente el modelo de operador HTTP confiable existente: cuando el complemento está habilitado, la autenticación bearer con secreto compartido se trata como acceso de operador completo para esta superficie de administración.

## Solución de problemas

`404 Not Found`

: El complemento está deshabilitado, el Gateway no se ha reiniciado desde que se habilitó, o la solicitud se está enviando a un proceso diferente de Gateway.

`401 Unauthorized`

: La solicitud no cumplió con la autenticación HTTP de Gateway. Verifique el token bearer o los encabezados de identidad de proxy confiable.

`400 INVALID_REQUEST`

: El cuerpo de la solicitud no es un JSON válido, falta el campo `method` o el método no está en la lista de permitidos del complemento.

`503 UNAVAILABLE`

: El controlador del método de Gateway no está disponible. Compruebe los registros de Gateway y vuelva a intentarlo después de que Gateway termine el inicio.

## Relacionado

- [Ámbitos del operador](/es/gateway/operator-scopes)
- [Seguridad de Gateway](/es/gateway/security)
- [Acceso remoto](/es/gateway/remote)
- [Manifiesto del complemento](/es/plugins/manifest#contracts)
- [Subrutas del SDK](/es/plugins/sdk-subpaths)

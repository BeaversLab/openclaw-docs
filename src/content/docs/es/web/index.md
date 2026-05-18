---
summary: "Superficies web de Gateway: Interfaz de usuario de control, modos de enlace y seguridad"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

El Gateway sirve una pequeña **Interfaz de usuario de Control del navegador** (Vite + Lit) desde el mismo puerto que el WebSocket del Gateway:

- predeterminado: `http://<host>:18789/`
- con `gateway.tls.enabled: true`: `https://<host>:18789/`
- prefijo opcional: establezca `gateway.controlUi.basePath` (por ejemplo, `/openclaw`)

Las capacidades residen en [Control UI](/es/web/control-ui). El resto de esta página se centra en los modos de enlace, seguridad y superficies web.

## Webhooks

Cuando `hooks.enabled=true`, el Gateway también expone un pequeño endpoint de webhook en el mismo servidor HTTP.
Consulte [Gateway configuration](/es/gateway/configuration) → `hooks` para obtener información sobre autenticación y cargas útiles.

## Admin HTTP RPC

Admin HTTP RPC expone métodos seleccionados del plano de control del Gateway en `POST /api/v1/admin/rpc`.
Está desactivado por defecto y solo se registra cuando el plugin `admin-http-rpc` está habilitado.
Consulte [Admin HTTP RPC](/es/plugins/admin-http-rpc) para ver el modelo de autenticación, los métodos permitidos y la comparación con WebSocket.

## Config (activado por defecto)

La interfaz de usuario de control (Control UI) está **habilitada por defecto** cuando los activos están presentes (`dist/control-ui`).
Puede controlarla a través de la configuración:

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Acceso a Tailscale

### Servicio integrado (recomendado)

Mantenga el Gateway en loopback y deje que Tailscale Serve actúe como proxy:

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Luego inicie el gateway:

```bash
openclaw gateway
```

Abra:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

### Tailnet bind + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

Luego inicie el gateway (este ejemplo que no es de loopback utiliza autenticación
por token de secreto compartido):

```bash
openclaw gateway
```

Abra:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

### Internet pública (Funnel)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## Notas de seguridad

- La autenticación del Gateway se requiere por defecto (token, contraseña, trusted-proxy o encabezados de identidad de Tailscale Serve cuando están habilitados).
- Los enlaces que no son de loopback todavía **requieren** autenticación del gateway. En la práctica, eso significa autenticación por token/contraseña o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- El asistente crea autenticación de secreto compartido por defecto y generalmente genera un
  token de gateway (incluso en loopback).
- En modo de secreto compartido, la interfaz de usuario envía `connect.params.auth.token` o
  `connect.params.auth.password`.
- Cuando `gateway.tls.enabled: true`, los asistentes locales de panel y estado renderizan
  URL del panel `https://` y URL de WebSocket `wss://`.
- En modos con identidad, como Tailscale Serve o `trusted-proxy`, la
  verificación de autenticación de WebSocket se satisface desde los encabezados de la solicitud.
- Para implementaciones públicas de la interfaz de usuario de control (Control UI) que no sean de loopback, establezca `gateway.controlUi.allowedOrigins` explícitamente (orígenes completos). Se aceptan cargas privadas de LAN/Tailnet del mismo origen para loopback, RFC1918/link-local, `.local`, `.ts.net` y hosts CGNAT de Tailscale.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita el modo de reserva de origen del encabezado Host, pero es una degradación peligrosa de la seguridad.
- Con Serve, los encabezados de identidad de Tailscale pueden satisfacer la autenticación de la interfaz de usuario de control (Control UI)/WebSocket cuando `gateway.auth.allowTailscale` es `true` (no se requiere token/contraseña). Los endpoints de la API HTTP no utilizan esos encabezados de identidad de Tailscale; en su lugar, siguen el modo de autenticación HTTP normal de la puerta de enlace. Establezca `gateway.auth.allowTailscale: false` para requerir credenciales explícitas. Consulte [Tailscale](/es/gateway/tailscale) y [Security](/es/gateway/security). Este flujo sin token asume que el host de la puerta de enlace es confiable.
- `gateway.tailscale.mode: "funnel"` requiere `gateway.auth.mode: "password"` (contraseña compartida).

## Construcción de la interfaz de usuario

La puerta de enlace (Gateway) sirve archivos estáticos desde `dist/control-ui`. Constrúyalos con:

```bash
pnpm ui:build
```

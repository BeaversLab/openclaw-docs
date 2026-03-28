---
summary: "Superficies web de Gateway: Interfaz de usuario de control, modos de enlace y seguridad"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway)

El Gateway sirve una pequeña **Interfaz de usuario de control del navegador** (Vite + Lit) desde el mismo puerto que el WebSocket del Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: configure `gateway.controlUi.basePath` (por ejemplo, `/openclaw`)

Las capacidades residen en [Control UI](/es/web/control-ui).
Esta página se centra en los modos de enlace, seguridad y superficies web.

## Webhooks

Cuando `hooks.enabled=true`, el Gateway también expone un pequeño endpoint de webhook en el mismo servidor HTTP.
Consulte [Gateway configuration](/es/gateway/configuration) → `hooks` para obtener información sobre la autenticación y las cargas útiles.

## Configuración (activada de forma predeterminada)

La interfaz de usuario de control está **activada de forma predeterminada** cuando los activos están presentes (`dist/control-ui`).
Puede controlarla mediante la configuración:

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

Abrir:

- `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

### Enlace a Tailnet + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

Luego inicie el gateway (se requiere token para enlaces no loopback):

```bash
openclaw gateway
```

Abrir:

- `http://<tailscale-ip>:18789/` (o su `gateway.controlUi.basePath` configurado)

### Internet público (Funnel)

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

- La autenticación del Gateway se requiere de forma predeterminada (token/contraseña o encabezados de identidad de Tailscale).
- Los enlaces no loopback todavía **requieren** un token/contraseña compartido (`gateway.auth` o variable de entorno).
- El asistente genera un token de gateway de forma predeterminada (incluso en loopback).
- La interfaz de usuario envía `connect.params.auth.token` o `connect.params.auth.password`.
- Para implementaciones de interfaz de usuario de control no loopback, configure `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Sin esto, el inicio del gateway se rechaza de forma predeterminada.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita
  el modo de reserva de origen del encabezado Host, pero es una degradación de seguridad peligrosa.
- Con Serve, los encabezados de identidad de Tailscale pueden satisfacer la autenticación de la interfaz de usuario de control/WebSocket
  cuando `gateway.auth.allowTailscale` es `true` (no se requiere token/contraseña).
  Los endpoints de la API HTTP aún requieren token/contraseña. Establezca
  `gateway.auth.allowTailscale: false` para requerir credenciales explícitas. Consulte
  [Tailscale](/es/gateway/tailscale) y [Seguridad](/es/gateway/security). Este
  flujo sin token asume que el host de la puerta de enlace es confiable.
- `gateway.tailscale.mode: "funnel"` requiere `gateway.auth.mode: "password"` (contraseña compartida).

## Construcción de la interfaz de usuario

La Gateway sirve archivos estáticos desde `dist/control-ui`. Constrúyalos con:

```bash
pnpm ui:build # auto-installs UI deps on first run
```

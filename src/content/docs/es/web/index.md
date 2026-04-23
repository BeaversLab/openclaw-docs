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
Esta página se centra en los modos de enlace, la seguridad y las superficies web.

## Webhooks

Cuando `hooks.enabled=true`, el Gateway también expone un pequeño endpoint de webhook en el mismo servidor HTTP.
Consulte [Gateway configuration](/es/gateway/configuration) → `hooks` para la autenticación y los payloads.

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

Luego inicie el gateway (este ejemplo que no es de loopback usa autenticación
de token de secreto compartido):

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

- La autenticación del Gateway es necesaria de forma predeterminada (token, contraseña, proxy de confianza o encabezados de identidad de Tailscale Serve cuando están habilitados).
- Los enlaces que no son de loopback todavía **requieren** autenticación del gateway. En la práctica, eso significa autenticación por token/contraseña o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- El asistente crea una autenticación de secreto compartido de forma predeterminada y generalmente genera un
  token de gateway (incluso en loopback).
- En el modo de secreto compartido, la interfaz de usuario envía `connect.params.auth.token` o
  `connect.params.auth.password`.
- En modos portadores de identidad como Tailscale Serve o `trusted-proxy`, la
  verificación de autenticación de WebSocket se satisface desde los encabezados de solicitud en su lugar.
- Para los despliegues de la interfaz de usuario de Control que no son de loopback, configure `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Sin ello, el inicio del gateway se rechaza de forma predeterminada.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita
  el modo de reserva de origen del encabezado Host, pero es una degradación de seguridad peligrosa.
- Con Serve, los encabezados de identidad de Tailscale pueden satisfacer la autenticación de Control UI/WebSocket
  cuando `gateway.auth.allowTailscale` es `true` (no se requiere token/contraseña).
  Los endpoints de la API HTTP no usan esos encabezados de identidad de Tailscale; en su lugar, siguen
  el modo normal de autenticación HTTP del gateway. Configure
  `gateway.auth.allowTailscale: false` para requerir credenciales explícitas. Consulte
  [Tailscale](/es/gateway/tailscale) y [Security](/es/gateway/security). Este
  flujo sin token asume que el host del gateway es confiable.
- `gateway.tailscale.mode: "funnel"` requiere `gateway.auth.mode: "password"` (contraseña compartida).

## Construir la interfaz de usuario

El Gateway sirve archivos estáticos desde `dist/control-ui`. Constrúyalos con:

```bash
pnpm ui:build
```

---
summary: "Superficies web de Gateway: interfaz de usuario de control, modos de enlace y seguridad"
read_when:
  - Deseas acceder al Gateway a través de Tailscale
  - Deseas la interfaz de usuario de control del navegador y la edición de configuración
title: "Web"
---

# Web (Gateway)

El Gateway sirve una pequeña **interfaz de usuario de control del navegador** (Vite + Lit) desde el mismo puerto que el WebSocket del Gateway:

- predeterminado: `http://<host>:18789/`
- prefijo opcional: establecer `gateway.controlUi.basePath` (p. ej., `/openclaw`)

Las capacidades residen en [Control UI](/es/web/control-ui).
Esta página se centra en los modos de enlace, la seguridad y las superficies web.

## Webhooks

Cuando `hooks.enabled=true`, el Gateway también expone un pequeño endpoint de webhook en el mismo servidor HTTP.
Consulta [Gateway configuration](/es/gateway/configuration) → `hooks` para obtener información sobre la autenticación y las cargas útiles.

## Config (predeterminado activado)

La interfaz de usuario de control está **habilitada de forma predeterminada** cuando los recursos están presentes (`dist/control-ui`).
Puedes controlarla a través de la configuración:

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Acceso a Tailscale

### Serve integrado (recomendado)

Mantén el Gateway en el bucle local (loopback) y deja que Tailscale Sirve (Serve) actúe como proxy:

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Luego inicia el gateway:

```bash
openclaw gateway
```

Abrir:

- `https://<magicdns>/` (o tu `gateway.controlUi.basePath` configurado)

### Enlace de Tailnet + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

Luego inicia el gateway (se requiere token para enlaces que no sean de bucle local):

```bash
openclaw gateway
```

Abrir:

- `http://<tailscale-ip>:18789/` (o tu `gateway.controlUi.basePath` configurado)

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

- La autenticación del Gateway es obligatoria de forma predeterminada (token/contraseña o encabezados de identidad de Tailscale).
- Los enlaces que no son de bucle local aún **requieren** un token/contraseña compartido (`gateway.auth` o variables de entorno).
- El asistente genera un token de gateway de forma predeterminada (incluso en el bucle local).
- La interfaz de usuario envía `connect.params.auth.token` o `connect.params.auth.password`.
- Para despliegues de la interfaz de usuario de control que no sean de bucle local, establece `gateway.controlUi.allowedOrigins`
  explícitamente (orígenes completos). Sin esto, el inicio del gateway se rechaza de forma predeterminada.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` habilita
  el modo de reserva de origen del encabezado Host, pero es una degradación peligrosa de la seguridad.
- Con Serve, los encabezados de identidad de Tailscale pueden satisfacer la autenticación de Control UI/WebSocket
  cuando `gateway.auth.allowTailscale` es `true` (no se requiere token/contraseña).
  Los endpoints de la API HTTP aún requieren token/contraseña. Configure
  `gateway.auth.allowTailscale: false` para requerir credenciales explícitas. Consulte
  [Tailscale](/es/gateway/tailscale) y [Security](/es/gateway/security). Este
  flujo sin token asume que el host de la puerta de enlace es confiable.
- `gateway.tailscale.mode: "funnel"` requiere `gateway.auth.mode: "password"` (contraseña compartida).

## Construcción de la interfaz de usuario

El Gateway sirve archivos estáticos desde `dist/control-ui`. Compílelos con:

```bash
pnpm ui:build # auto-installs UI deps on first run
```

import es from "/components/footer/es.mdx";

<es />

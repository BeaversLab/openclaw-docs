---
summary: "Referencia de la CLI para `openclaw qr` (generar código QR de emparejamiento iOS + código de configuración)"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

Generar un código QR de emparejamiento iOS y un código de configuración desde la configuración actual de su Gateway.

## Uso

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## Opciones

- `--remote`: usar `gateway.remote.url` más el token/contraseña remota de la configuración
- `--url <url>`: anular la URL de la puerta de enlace utilizada en el payload
- `--public-url <url>`: anular la URL pública utilizada en el payload
- `--token <token>`: anular contra qué token de puerta de enlace se autentica el flujo de arranque (bootstrap)
- `--password <password>`: anular contra qué contraseña de puerta de enlace se autentica el flujo de arranque
- `--setup-code-only`: imprimir solo el código de configuración
- `--no-ascii`: omitir la representación del código QR en ASCII
- `--json`: emitir JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## Notas

- `--token` y `--password` son mutuamente excluyentes.
- El propio código de configuración ahora lleva un `bootstrapToken` opaco de corta duración, no el token/contraseña compartida de la puerta de enlace.
- Con `--remote`, si las credenciales remotas efectivas activas están configuradas como SecretRefs y no pasa `--token` o `--password`, el comando las resuelve desde la instantánea activa de la puerta de enlace. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Sin `--remote`, los SecretRefs de autenticación local de la puerta de enlace se resuelven cuando no se pasa ninguna anulación de autenticación de la CLI:
  - `gateway.auth.token` se resuelve cuando la autenticación por token puede ganar (`gateway.auth.mode="token"` explícito o modo inferido donde ninguna fuente de contraseña gana).
  - `gateway.auth.password` se resuelve cuando la autenticación por contraseña puede ganar (`gateway.auth.mode="password"` explícito o modo inferido sin un token ganante de auth/env).
- Si ambos `gateway.auth.token` y `gateway.auth.password` están configurados (incluyendo SecretRefs) y `gateway.auth.mode` no está establecido, la resolución del código de configuración falla hasta que el modo se establezca explícitamente.
- Nota de desviación de versión de Gateway: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace antiguas devuelven un error de método desconocido.
- Después de escanear, apruebe el emparejamiento del dispositivo con:
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import es from "/components/footer/es.mdx";

<es />

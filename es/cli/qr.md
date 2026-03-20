---
summary: "Referencia de la CLI para `openclaw qr` (generar código QR de emparejamiento iOS + código de configuración)"
read_when:
  - Deseas emparejar la aplicación iOS con una puerta de enlace rápidamente
  - Necesitas la salida del código de configuración para compartirlo de forma remota/manual
title: "qr"
---

# `openclaw qr`

Generar un código QR de emparejamiento iOS y un código de configuración a partir de la configuración actual de tu puerta de enlace.

## Uso

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## Opciones

- `--remote`: usa `gateway.remote.url` más el token/contraseña remota de la configuración
- `--url <url>`: anular la URL de la puerta de enlace utilizada en el payload
- `--public-url <url>`: anular la URL pública utilizada en el payload
- `--token <token>`: anular contra qué token de puerta de enlace se autentica el flujo de arranque
- `--password <password>`: anular contra qué contraseña de puerta de enlace se autentica el flujo de arranque
- `--setup-code-only`: imprimir solo el código de configuración
- `--no-ascii`: omitir la representación del código QR ASCII
- `--json`: emitir JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## Notas

- `--token` y `--password` son mutuamente excluyentes.
- El código de configuración en sí ahora lleva un `bootstrapToken` opaco de corta duración, no el token/contraseña compartida de la puerta de enlace.
- Con `--remote`, si las credenciales remotas efectivas activas están configuradas como SecretRefs y no pasas `--token` o `--password`, el comando las resuelve desde la instantánea activa de la puerta de enlace. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Sin `--remote`, los SecretRefs de autenticación local de la puerta de enlace se resuelven cuando no se pasa ninguna anulación de autenticación de CLI:
  - `gateway.auth.token` se resuelve cuando la autenticación por token puede ganar (`gateway.auth.mode="token"` explícito o modo inferido donde ninguna fuente de contraseña gana).
  - `gateway.auth.password` se resuelve cuando la autenticación por contraseña puede ganar (`gateway.auth.mode="password"` explícito o modo inferido sin token ganante de auth/env).
- Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados (incluyendo SecretRefs) y `gateway.auth.mode` no está establecido, la resolución del código de configuración falla hasta que el modo se establece explícitamente.
- Nota sobre la disparidad de versiones de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que sea compatible con `secrets.resolve`; las puertas de enlace antiguas devuelven un error de método desconocido.
- Después de escanear, apruebe el emparejamiento del dispositivo con:
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

import en from "/components/footer/en.mdx";

<en />

---
summary: "Referencia de CLI para `openclaw qr` (generar código QR de emparejamiento móvil + código de configuración)"
read_when:
  - You want to pair a mobile node app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "QR"
---

# `openclaw qr`

Genera un código QR de emparejamiento móvil y un código de configuración a partir de la configuración actual de tu Gateway.

## Uso

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## Opciones

- `--remote`: prefiere `gateway.remote.url`; si no está configurado, `gateway.tailscale.mode=serve|funnel` aún puede proporcionar la URL pública remota
- `--url <url>`: anula la URL de gateway utilizada en el payload
- `--public-url <url>`: anula la URL pública utilizada en el payload
- `--token <token>`: anula contra qué token de gateway se autentica el flujo de arranque
- `--password <password>`: anula contra qué contraseña de gateway se autentica el flujo de arranque
- `--setup-code-only`: imprime solo el código de configuración
- `--no-ascii`: omite la representación de QR ASCII
- `--json`: emite JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## Notas

- `--token` y `--password` son mutuamente excluyentes.
- El propio código de configuración ahora lleva un `bootstrapToken` opaco de corta duración, no el token/contraseña del gateway compartido.
- El arranque del código de configuración integrado devuelve un token `node` primario con `scopes: []` más un token de traspaso `operator` limitado para la incorporación móvil de confianza.
- El token de operador entregado se limita a `operator.approvals`, `operator.read`, `operator.talk.secrets` y `operator.write`; `operator.admin` y `operator.pairing` requieren un emparejamiento de operador aprobado o flujo de token por separado.
- El emparejamiento móvil falla de forma cerrada para las URL de puerta de enlace `ws://` de Tailscale/públicas. Las direcciones LAN privadas y los hosts Bonjour `.local` siguen siendo compatibles a través de `ws://`, pero las rutas móviles de Tailscale/públicas deben usar Tailscale Serve/Funnel o una URL de puerta de enlace `wss://`.
- Con `--remote`, OpenClaw requiere `gateway.remote.url` o
  `gateway.tailscale.mode=serve|funnel`.
- Con `--remote`, si las credenciales remotas activas efectivas están configuradas como SecretRefs y no pasa `--token` o `--password`, el comando las resuelve desde la instantánea de la puerta de enlace activa. Si la puerta de enlace no está disponible, el comando falla rápidamente.
- Sin `--remote`, los SecretRefs de autenticación de la puerta de enlace local se resuelven cuando no se pasa ninguna anulación de autenticación de CLI:
  - `gateway.auth.token` se resuelve cuando la autenticación por token puede ganar (`gateway.auth.mode="token"` explícito o modo inferido donde ninguna fuente de contraseña gana).
  - `gateway.auth.password` se resuelve cuando la autenticación por contraseña puede ganar (`gateway.auth.mode="password"` explícito o modo inferido sin ningún token ganante de auth/env).
- Si están configurados tanto `gateway.auth.token` como `gateway.auth.password` (incluyendo SecretRefs) y `gateway.auth.mode` no está establecido, la resolución del código de configuración falla hasta que el modo se establece explícitamente.
- Nota de discrepancia de versión de la puerta de enlace: esta ruta de comando requiere una puerta de enlace que admita `secrets.resolve`; las puertas de enlace antiguas devuelven un error de método desconocido.
- Después de escanear, apruebe el emparejamiento del dispositivo con:
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Emparejamiento](/es/cli/pairing)

---
summary: "Serve/Funnel de Tailscale integrado para el panel de Gateway"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (panel de Gateway)

OpenClaw puede configurar automáticamente Tailscale **Serve** (tailnet) o **Funnel** (público) para el
panel de Gateway y el puerto WebSocket. Esto mantiene el Gateway enlazado a loopback mientras
Tailscale proporciona HTTPS, enrutamiento y (para Serve) encabezados de identidad.

## Modos

- `serve`: Serve solo para tailnet a través de `tailscale serve`. El gateway se mantiene en `127.0.0.1`.
- `funnel`: HTTPS público a través de `tailscale funnel`. OpenClaw requiere una contraseña compartida.
- `off`: Predeterminado (sin automatización de Tailscale).

## Autenticación

Establezca `gateway.auth.mode` para controlar el protocolo de enlace:

- `none` (solo entrada privada)
- `token` (predeterminado cuando se establece `OPENCLAW_GATEWAY_TOKEN`)
- `password` (secreto compartido mediante `OPENCLAW_GATEWAY_PASSWORD` o configuración)
- `trusted-proxy` (proxy inverso con conocimiento de identidad; consulte [Trusted Proxy Auth](/es/gateway/trusted-proxy-auth))

Cuando `tailscale.mode = "serve"` y `gateway.auth.allowTailscale` está `true`,
el Control UI/WebSocket auth puede usar los encabezados de identidad de Tailscale
(`tailscale-user-login`) sin proporcionar un token/contraseña. OpenClaw verifica
la identidad resolviendo la dirección `x-forwarded-for` a través del demonio local de Tailscale
(`tailscale whois`) y coincidiéndola con el encabezado antes de aceptarla.
OpenClaw solo trata una solicitud como Serve cuando llega desde loopback con
los encabezados `x-forwarded-for`, `x-forwarded-proto` y `x-forwarded-host`
de Tailscale.
Los endpoints de la API HTTP (por ejemplo `/v1/*`, `/tools/invoke` y `/api/channels/*`)
**no** usan la autenticación por encabezado de identidad de Tailscale. Todavía siguen el modo
normal de autenticación HTTP de la puerta de enlace: autenticación de secreto compartido por defecto, o una configuración
`none` de proxy confiable / ingreso privado configurada intencionalmente.
Este flujo sin token asume que el host de la puerta de enlace es confiable. Si código local no confiable
puede ejecutarse en el mismo host, desactive `gateway.auth.allowTailscale` y exija
autenticación de token/contraseña en su lugar.
Para exigir credenciales explícitas de secreto compartido, configure `gateway.auth.allowTailscale: false`
y use `gateway.auth.mode: "token"` o `"password"`.

## Ejemplos de configuración

### Solo Tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Abra: `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

### Solo Tailnet (vincular a IP de Tailnet)

Use esto cuando desee que Gateway escuche directamente en la IP de Tailnet (sin Serve/Funnel).

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

Conectarse desde otro dispositivo de Tailnet:

- Interfaz de control: `http://<tailscale-ip>:18789/`
- WebSocket: `ws://<tailscale-ip>:18789`

Nota: el bucle local (`http://127.0.0.1:18789`) **no** funcionará en este modo.

### Internet público (Funnel + contraseña compartida)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

Prefiera `OPENCLAW_GATEWAY_PASSWORD` antes de confirmar una contraseña en el disco.

## Ejemplos de CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notas

- Tailscale Serve/Funnel requiere que la CLI de `tailscale` esté instalada y haya iniciado sesión.
- `tailscale.mode: "funnel"` se niega a iniciar a menos que el modo de autenticación sea `password` para evitar la exposición pública.
- Establezca `gateway.tailscale.resetOnExit` si desea que OpenClaw deshaga la configuración de `tailscale serve`
  o `tailscale funnel` al apagar.
- `gateway.bind: "tailnet"` es un enlace directo a Tailnet (sin HTTPS, sin Serve/Funnel).
- `gateway.bind: "auto"` prefiere el loopback; use `tailnet` si desea solo Tailnet.
- Serve/Funnel solo exponen la **interfaz de usuario de control de Gateway + WS**. Los nodos se conectan a través
  del mismo punto final de WS de Gateway, por lo que Serve puede funcionar para el acceso a nodos.

## Control del navegador (Gateway remoto + navegador local)

Si ejecuta el Gateway en una máquina pero desea controlar un navegador en otra máquina,
ejecute un **host de nodo** en la máquina del navegador y mantenga ambos en la misma tailnet.
El Gateway delegará las acciones del navegador al nodo; no se necesita un servidor de control separado ni una URL de Serve.

Evite Funnel para el control del navegador; trate el emparejamiento de nodos como el acceso del operador.

## Requisitos previos y límites de Tailscale

- Serve requiere que HTTPS esté habilitado para tu tailnet; la CLI lo solicita si falta.
- Serve inyecta encabezados de identidad de Tailscale; Funnel no.
- Funnel requiere Tailscale v1.38.3+, MagicDNS, HTTPS habilitado y un atributo de nodo funnel.
- Funnel solo admite los puertos `443`, `8443` y `10000` a través de TLS.
- Funnel en macOS requiere la variante de aplicación de código abierto de Tailscale.

## Más información

- Descripción general de Tailscale Serve: [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- comando `tailscale serve`: [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Descripción general de Tailscale Funnel: [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- comando `tailscale funnel`: [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

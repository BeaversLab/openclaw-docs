---
summary: "Tailscale Serve/Funnel integrado para el panel de Gateway"
read_when:
  - Exponer la interfaz de usuario de Control de Gateway fuera de localhost
  - Automatizar el acceso al panel de tailnet o público
title: "Tailscale"
---

# Tailscale (panel de Gateway)

OpenClaw puede configurar automáticamente Tailscale **Serve** (tailnet) o **Funnel** (público) para el
panel de Gateway y el puerto WebSocket. Esto mantiene el Gateway vinculado al bucle local (loopback) mientras
Tailscale proporciona HTTPS, enrutamiento y encabezados de identidad (para Serve).

## Modos

- `serve`: Solo para tailnet mediante Serve a través de `tailscale serve`. El gateway se mantiene en `127.0.0.1`.
- `funnel`: HTTPS público a través de `tailscale funnel`. OpenClaw requiere una contraseña compartida.
- `off`: Predeterminado (sin automatización de Tailscale).

## Auth

Configure `gateway.auth.mode` para controlar el protocolo de enlace:

- `token` (predeterminado cuando se establece `OPENCLAW_GATEWAY_TOKEN`)
- `password` (secreto compartido a través de `OPENCLAW_GATEWAY_PASSWORD` o configuración)

Cuando `tailscale.mode = "serve"` y `gateway.auth.allowTailscale` es `true`,
la autenticación de la interfaz de usuario de control/WebSocket puede utilizar los encabezados de identidad de Tailscale
(`tailscale-user-login`) sin proporcionar un token/contraseña. OpenClaw verifica
la identidad resolviendo la dirección `x-forwarded-for` a través del demonio local de Tailscale
(`tailscale whois`) y coincidiéndola con el encabezado antes de aceptarla.
OpenClaw solo trata una solicitud como Serve cuando llega desde el bucle local con
los encabezados `x-forwarded-for`, `x-forwarded-proto` y `x-forwarded-host`
de Tailscale.
Los puntos finales de la API HTTP (por ejemplo `/v1/*`, `/tools/invoke` y `/api/channels/*`)
aún requieren autenticación de token/contraseña.
Este flujo sin token asume que el host del gateway es confiable. Si código local no confiable
puede ejecutarse en el mismo host, deshabilite `gateway.auth.allowTailscale` y requiera
autenticación de token/contraseña en su lugar.
Para requerir credenciales explícitas, establezca `gateway.auth.allowTailscale: false` o
fuerce `gateway.auth.mode: "password"`.

## Ejemplos de configuración

### Solo para tailnet (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Abrir: `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

### Solo Tailnet (vincular a IP de Tailnet)

Use esto cuando quiera que el Gateway escuche directamente en la IP de Tailnet (sin Serve/Funnel).

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

Conectar desde otro dispositivo Tailnet:

- UI de control: `http://<tailscale-ip>:18789/`
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

Prefiera `OPENCLAW_GATEWAY_PASSWORD` antes de comprometer una contraseña al disco.

## Ejemplos de CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notas

- Tailscale Serve/Funnel requiere que la CLI de `tailscale` esté instalada y haya iniciado sesión.
- `tailscale.mode: "funnel"` se niega a iniciar a menos que el modo de autenticación sea `password` para evitar la exposición pública.
- Configure `gateway.tailscale.resetOnExit` si desea que OpenClaw deshaga la configuración de `tailscale serve`
  o `tailscale funnel` al apagar.
- `gateway.bind: "tailnet"` es un enlace directo a Tailnet (sin HTTPS, sin Serve/Funnel).
- `gateway.bind: "auto"` prefiere el bucle local; use `tailnet` si desea solo Tailnet.
- Serve/Funnel solo exponen la **UI de control + WS de Gateway**. Los nodos se conectan a través
  del mismo punto final WS de Gateway, por lo que Serve puede funcionar para el acceso a nodos.

## Control del navegador (Gateway remoto + navegador local)

Si ejecuta el Gateway en una máquina pero desea controlar un navegador en otra máquina,
ejecute un **host de nodo** en la máquina del navegador y mantenga ambos en la misma tailnet.
El Gateway enviará por proxy las acciones del navegador al nodo; no se necesita un servidor de control separado ni una URL de Serve.

Evite Funnel para el control del navegador; trate el emparejamiento de nodos como el acceso del operador.

## Requisitos previos y límites de Tailscale

- Serve requiere que HTTPS esté habilitado para su tailnet; la CLI solicita si falta.
- Serve inyecta encabezados de identidad de Tailscale; Funnel no.
- Funnel requiere Tailscale v1.38.3+, MagicDNS, HTTPS habilitado y un atributo de nodo de embudo.
- Funnel solo admite los puertos `443`, `8443` y `10000` a través de TLS.
- Funnel en macOS requiere la variante de aplicación de código abierto de Tailscale.

## Más información

- Descripción general de Tailscale Serve: [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- comando `tailscale serve`: [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Resumen de Tailscale Funnel: [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- comando `tailscale funnel`: [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

import es from "/components/footer/es.mdx";

<es />

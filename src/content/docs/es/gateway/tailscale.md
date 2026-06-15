---
summary: "Serve/Funnel de Tailscale integrado para el panel de Gateway"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

OpenClaw puede configurar automáticamente Tailscale **Serve** (tailnet) o **Funnel** (público) para el tablero de Gateway y el puerto WebSocket. Esto mantiene el Gateway vinculado al loopback mientras Tailscale proporciona HTTPS, enrutamiento y (para Serve) encabezados de identidad.

## Modos

- `serve`: Serve solo para tailnet vía `tailscale serve`. La puerta de enlace se mantiene en `127.0.0.1`.
- `funnel`: HTTPS público vía `tailscale funnel`. OpenClaw requiere una contraseña compartida.
- `off`: Predeterminado (sin automatización de Tailscale).

El estado y la salida de auditoría utilizan **exposición Tailscale** para este modo OpenClaw Serve/Funnel. `off` significa que OpenClaw no está administrando Serve ni Funnel; no significa que el demonio local de Tailscale esté detenido o desconectado.

## Autenticación

Establezca `gateway.auth.mode` para controlar el enlace:

- `none` (solo entrada privada)
- `token` (predeterminado cuando se establece `OPENCLAW_GATEWAY_TOKEN`)
- `password` (secreto compartido vía `OPENCLAW_GATEWAY_PASSWORD` o configuración)
- `trusted-proxy` (proxy inverso con conocimiento de identidad; consulte [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth))

Cuando `tailscale.mode = "serve"` y `gateway.auth.allowTailscale` es `true`,
la autenticación de la Interfaz de Control/WebSocket puede utilizar los encabezados de identidad de Tailscale
(`tailscale-user-login`) sin proporcionar un token/contraseña. OpenClaw verifica
la identidad resolviendo la dirección `x-forwarded-for` a través del demonio local de Tailscale
(`tailscale whois`) y comparándola con el encabezado antes de aceptarla.
OpenClaw solo trata una solicitud como Serve cuando llega desde loopback con
los encabezados `x-forwarded-for`, `x-forwarded-proto` y `x-forwarded-host`
de Tailscale.
Para las sesiones del operador de la Interfaz de Control que incluyen la identidad del dispositivo del navegador, esta
ruta verificada de Serve también omite el viaje de ida y vuelta del emparejamiento de dispositivos. No omite
la identidad del dispositivo del navegador: los clientes sin dispositivo aún son rechazados, y las conexiones
WebSocket de rol de nodo o que no sean de la Interfaz de Control aún siguen las comprobaciones normales de
emparejamiento y autenticación.
Los puntos finales de la API HTTP (por ejemplo `/v1/*`, `/tools/invoke` y `/api/channels/*`)
**no** utilizan la autenticación por encabezado de identidad de Tailscale. Todavía siguen el modo de
autenticación HTTP normal de la puerta de enlace: autenticación de secreto compartido por defecto, o una configuración `none`
de proxy confiable / ingreso privado configurada intencionalmente.
Este flujo sin token asume que el host de la puerta de enlace es confiable. Si código local no confiable
puede ejecutarse en el mismo host, desactive `gateway.auth.allowTailscale` y requiera
autenticación de token/contraseña en su lugar.
Para requerir credenciales explícitas de secreto compartido, establezca `gateway.auth.allowTailscale: false`
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

Abrir: `https://<magicdns>/` (o su `gateway.controlUi.basePath` configurado)

Para exponer la Interfaz de Control a través de un Servicio con nombre de Tailscale en lugar del
nombre de host del dispositivo, establezca `gateway.tailscale.serviceName` en el nombre del Servicio:

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve", serviceName: "svc:openclaw" },
  },
}
```

Con el ejemplo anterior, el inicio informa la URL del Servicio como
`https://openclaw.<tailnet-name>.ts.net/` en lugar del nombre de host del dispositivo.
Los servicios de Tailscale requieren que el host sea un nodo etiquetado aprobado en su
tailnet. Configure la etiqueta y apruebe el Servicio en Tailscale antes de habilitar
esta opción; de lo contrario, `tailscale serve --service=...` fallará durante el inicio del
gateway.

### Solo Tailnet (vincular a la IP de Tailnet)

Use esto cuando desee que el Gateway escuche directamente en la IP de Tailnet (sin Serve/Funnel).

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

<Note>Loopback (`http://127.0.0.1:18789`) **no** funcionará en este modo.</Note>

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

Prefiera `OPENCLAW_GATEWAY_PASSWORD` antes que comprometer una contraseña en el disco.

## Ejemplos de CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notas

- Tailscale Serve/Funnel requiere que la CLI de `tailscale` esté instalada y que se haya iniciado sesión.
- `tailscale.mode: "funnel"` se niega a iniciarse a menos que el modo de autenticación sea `password` para evitar la exposición pública.
- `gateway.tailscale.serviceName` se aplica solo al modo Serve y se pasa a
  `tailscale serve --service=<name>`. El valor debe utilizar el formato de nombre de
  Servicio `svc:<dns-label>` de Tailscale, por ejemplo `svc:openclaw`.
  Tailscale requiere que los hosts de Servicio sean nodos etiquetados y es posible que el Servicio necesite
  aprobación en la consola de administración antes de que Serve pueda publicarlo.
- Establezca `gateway.tailscale.resetOnExit` si desea que OpenClaw deshaga la configuración
  de `tailscale serve` o `tailscale funnel` al apagar.
- Establezca `gateway.tailscale.preserveFunnel: true` para mantener una ruta
  `tailscale funnel` configurada externamente activa a través de los reinicios del gateway. Cuando está habilitado y el
  gateway se ejecuta en `mode: "serve"`, OpenClaw verifica `tailscale funnel status`
  antes de volver a aplicar Serve y lo omite cuando una ruta Funnel ya cubre el
  puerto del gateway. La política de solo contraseña de Funnel administrada por OpenClaw no cambia.
- `gateway.bind: "tailnet"` es un enlace directo a Tailnet (sin HTTPS, sin Serve/Funnel).
- `gateway.bind: "auto"` prefiere loopback; use `tailnet` si desea que sea solo Tailnet.
- Serve/Funnel solo exponen la **interfaz de usuario de control del Gateway + WS**. Los nodos se conectan a través del mismo extremo WS del Gateway, por lo que Serve puede funcionar para el acceso a los nodos.

## Control del navegador (Gateway remoto + navegador local)

Si ejecuta el Gateway en una máquina pero desea controlar un navegador en otra máquina,
ejecute un **host de nodo** en la máquina del navegador y mantenga ambos en la misma tailnet.
El Gateway actuará como proxy de las acciones del navegador hacia el nodo; no se necesita un servidor de control separado ni una URL de Serve.

Evite Funnel para el control del navegador; trate el emparejamiento de nodos como el acceso del operador.

## Requisitos previos y límites de Tailscale

- Serve requiere que HTTPS esté habilitado para su tailnet; la CLI lo solicitará si falta.
- Serve inyecta encabezados de identidad de Tailscale; Funnel no.
- Funnel requiere Tailscale v1.38.3+, MagicDNS, HTTPS habilitado y un atributo de nodo funnel.
- Funnel solo admite los puertos `443`, `8443` y `10000` a través de TLS.
- Funnel en macOS requiere la variante de aplicación de código abierto de Tailscale.

## Más información

- Resumen de Tailscale Serve: [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- comando `tailscale serve`: [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Resumen de Tailscale Funnel: [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- comando `tailscale funnel`: [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## Relacionado

- [Acceso remoto](/es/gateway/remote)
- [Descubrimiento](/es/gateway/discovery)
- [Autenticación](/es/gateway/authentication)

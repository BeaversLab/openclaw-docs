---
summary: "Referencia de la CLI para `openclaw proxy`, incluida la validación del proxy administrado por el operador y el inspector de captura del proxy de depuración local"
read_when:
  - You need to validate operator-managed proxy routing before deployment
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

Valide el enrutamiento del proxy administrado por el operador, o ejecute el proxy de depuración explícito local
e inspeccione el tráfico capturado.

Use `validate` para realizar un verificación previa de un proxy de reenvío administrado por el operador antes de habilitar
el enrutamiento del proxy OpenClaw. Los otros comandos son herramientas de depuración para
la investigación a nivel de transporte: pueden iniciar un proxy local, ejecutar un comando secundario
con la captura habilitada, enumerar las sesiones de captura, consultar patrones de tráfico comunes, leer
los blobs capturados y purgar los datos de captura locales.

## Comandos

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## Validar

`openclaw proxy validate` comprueba la URL efectiva del proxy administrado por el operador desde
`--proxy-url`, la configuración o `OPENCLAW_PROXY_URL`. Informa de un problema de configuración cuando
no hay ningún proxy habilitado y configurado; use `--proxy-url` para una verificación previa única
antes de cambiar la configuración. De forma predeterminada, verifica que un destino público tenga éxito
a través del proxy y que el proxy no pueda alcanzar un canary de bucle invertido temporal.
Los destinos personalizados denegados son de cierre por fallo: las respuestas HTTP y los fallos
de transporte ambiguos fallan a menos que pueda verificar por separado una señal
de denegación específica de la implementación. Agregue `--apns-reachable` para también abrir un túnel CONNECT HTTP/2 de APNs
a través del proxy y confirmar que el entorno de pruebas de APNs responde; la sonda usa un
token de proveedor intencionalmente no válido, por lo que una respuesta APNs `403 InvalidProviderToken`
es una señal de accesibilidad exitosa.

Opciones:

- `--json`: imprime JSON legible por máquina.
- `--proxy-url <url>`: valida esta URL de proxy en lugar de la configuración o las variables de entorno.
- `--allowed-url <url>`: agrega un destino que se espera que tenga éxito a través del proxy. Repítalo para comprobar varios destinos.
- `--denied-url <url>`: agrega un destino que se espera que sea bloqueado por el proxy. Repítalo para comprobar varios destinos.
- `--apns-reachable`: también verifica que el HTTP/2 del entorno de pruebas de APNs sea accesible a través del proxy.
- `--apns-authority <url>`: autoridad de APNs con la que sondear con `--apns-reachable` (`https://api.sandbox.push.apple.com` de forma predeterminada; producción es `https://api.push.apple.com`).
- `--timeout-ms <ms>`: tiempo de espera por solicitud en milisegundos.

Consulte [Network Proxy](/es/security/network-proxy) para obtener orientación sobre implementación y semántica
de denegación.

## Presets de consulta

`openclaw proxy query --preset <name>` acepta:

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## Notas

- `start` por defecto es `127.0.0.1` a menos que se establezca `--host`.
- `run` inicia un proxy de depuración local y luego ejecuta el comando después de `--`.
- El reenvío directo ascendente del proxy de depuración abre sockets ascendentes para diagnósticos. Cuando el modo proxy administrado por OpenClaw está activo, el reenvío directo para solicitudes de proxy y túneles CONNECT está deshabilitado de forma predeterminada; establezca `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1` solo para diagnósticos locales aprobados.
- `validate` sale con el código 1 cuando fallan las comprobaciones de configuración o destino del proxy.
- Las capturas son datos de depuración locales; use `openclaw proxy purge` cuando termine.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Proxy de red](/es/security/network-proxy)
- [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth)

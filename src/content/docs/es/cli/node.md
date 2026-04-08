---
summary: "Referencia de CLI para `openclaw node` (host de nodo sin interfaz)"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "node"
---

# `openclaw node`

Ejecuta un **host de nodo sin interfaz** que se conecta al WebSocket de Gateway y expone
`system.run` / `system.which` en esta máquina.

## ¿Por qué usar un host de nodo?

Use un host de nodo cuando desee que los agentes **ejecuten comandos en otras máquinas** en su
red sin instalar una aplicación complementaria completa de macOS allí.

Casos de uso comunes:

- Ejecutar comandos en cajas remotas de Linux/Windows (servidores de compilación, máquinas de laboratorio, NAS).
- Mantener exec **en sandbox** en la puerta de enlace, pero delegar las ejecuciones aprobadas a otros hosts.
- Proporcionar un objetivo de ejecución ligero y sin interfaz para nodos de automatización o CI.

La ejecución aún está protegida por **aprobaciones de ejecución** y listas de permitidos por agente en el
host del nodo, por lo que puede mantener el acceso a los comandos limitado y explícito.

## Proxy del navegador (sin configuración)

Los hosts de nodo anuncian automáticamente un proxy del navegador si `browser.enabled` no está
deshabilitado en el nodo. Esto permite que el agente use la automatización del navegador en ese nodo
sin configuración adicional.

De manera predeterminada, el proxy expone la superficie del perfil de navegador normal del nodo. Si
establece `nodeHost.browserProxy.allowProfiles`, el proxy se vuelve restrictivo:
se rechaza el destino de perfil no incluido en la lista de permitidos y se bloquean las rutas
de creación/eliminación de perfiles persistentes a través del proxy.

Deshabilítelo en el nodo si es necesario:

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## Ejecutar (en primer plano)

```bash
openclaw node run --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: host de WebSocket de Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: puerto de WebSocket de Gateway (predeterminado: `18789`)
- `--tls`: use TLS para la conexión de puerta de enlace
- `--tls-fingerprint <sha256>`: huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: invalidar el ID del nodo (borra el token de emparejamiento)
- `--display-name <name>`: invalidar el nombre para mostrar del nodo

## Autenticación de puerta de enlace para el host del nodo

`openclaw node run` y `openclaw node install` resuelven la autenticación de puerta de enlace desde config/env (sin marcas `--token`/`--password` en los comandos de nodo):

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` se verifican primero.
- Luego, la configuración local alternativa: `gateway.auth.token` / `gateway.auth.password`.
- En modo local, el host del nodo no hereda intencionalmente `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente mediante SecretRef y no se resuelve, la resolución de autenticación del nodo falla cerrada (sin enmascaramiento de alternativa remota).
- En `gateway.mode=remote`, los campos del cliente remoto (`gateway.remote.token` / `gateway.remote.password`) también son elegibles según las reglas de precedencia remota.
- La resolución de autenticación del host del nodo solo respeta las variables de entorno `OPENCLAW_GATEWAY_*`.

## Servicio (en segundo plano)

Instale un host de nodo sin cabeza como servicio de usuario.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: host de WebSocket de Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: puerto de WebSocket de Gateway (predeterminado: `18789`)
- `--tls`: use TLS para la conexión de puerta de enlace
- `--tls-fingerprint <sha256>`: huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: Anula el id del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anula el nombre para mostrar del nodo
- `--runtime <runtime>`: Tiempo de ejecución del servicio (`node` o `bun`)
- `--force`: Reinstalar/sobrescribir si ya está instalado

Administrar el servicio:

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

Use `openclaw node run` para un host de nodo en primer plano (sin servicio).

Los comandos de servicio aceptan `--json` para una salida legible por máquina.

## Emparejamiento

La primera conexión crea una solicitud de emparejamiento de dispositivo pendiente (`role: node`) en la Gateway.
Apruébala a través de:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si el nodo reintenta el emparejamiento con detalles de autenticación modificados (rol/alcances/clave pública),
la solicitud pendiente anterior es reemplazada y se crea un nuevo `requestId`.
Ejecute `openclaw devices list` nuevamente antes de la aprobación.

El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión de la gateway en
`~/.openclaw/node.json`.

## Aprobaciones de ejecución

`system.run` está limitado por aprobaciones de ejecución locales:

- `~/.openclaw/exec-approvals.json`
- [Aprobaciones de ejecución](/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (editar desde la Gateway)

Para la ejecución de nodo asíncrona aprobada, OpenClaw prepara un `systemRunPlan`
canónico antes de solicitar. El `system.run` de reenvío aprobado posteriormente reutiliza ese plan
almacenado, por lo que las ediciones a los campos command/cwd/session después de que se creó la solicitud de
aprobación se rechazan en lugar de cambiar lo que el nodo ejecuta.

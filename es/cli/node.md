---
summary: "Referencia de CLI para `openclaw node` (host de nodo sin cabeza)"
read_when:
  - Ejecutar el host de nodo sin cabeza
  - Emparejar un nodo que no sea macOS para system.run
title: "node"
---

# `openclaw node`

Ejecuta un **host de nodo sin cabeza** que se conecta al WebSocket de Gateway y expone
`system.run` / `system.which` en esta máquina.

## ¿Por qué usar un host de nodo?

Use un host de nodo cuando desee que los agentes **ejecuten comandos en otras máquinas** en su
red sin instalar una aplicación complementaria macOS completa allí.

Casos de uso comunes:

- Ejecutar comandos en equipos Linux/Windows remotos (servidores de compilación, máquinas de laboratorio, NAS).
- Mantener exec **en sandbox** en la puerta de enlace, pero delegar las ejecuciones aprobadas a otros hosts.
- Proporcionar un objetivo de ejecución ligero y sin cabeza para nodos de automatización o CI.

La ejecución aún está protegida por **aprobaciones de exec** y listas de permitidos por agente en el
host de nodo, por lo que puede mantener el acceso a los comandos limitado y explícito.

## Proxy del navegador (sin configuración)

Los hosts de nodo anuncian automáticamente un proxy del navegador si `browser.enabled` no está
deshabilitado en el nodo. Esto permite que el agente use la automatización del navegador en ese nodo
sin configuración adicional.

Desactívelo en el nodo si es necesario:

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## Ejecutar (primer plano)

```bash
openclaw node run --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: Host de WebSocket de Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: Puerto de WebSocket de Gateway (predeterminado: `18789`)
- `--tls`: Usar TLS para la conexión de puerta de enlace
- `--tls-fingerprint <sha256>`: Huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: Anular el id del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anular el nombre para mostrar del nodo

## Autenticación de puerta de enlace para host de nodo

`openclaw node run` y `openclaw node install` resuelven la autenticación de puerta de enlace desde config/env (sin marcas `--token`/`--password` en los comandos de nodo):

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` se verifican primero.
- Luego, respaldo de configuración local: `gateway.auth.token` / `gateway.auth.password`.
- En modo local, el host de nodo intencionalmente no hereda `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` están configurados explícitamente mediante SecretRef y no se resuelven, la resolución de autenticación del nodo falla cerrada (sin enmascaramiento de reserva remota).
- En `gateway.mode=remote`, los campos del cliente remoto (`gateway.remote.token` / `gateway.remote.password`) también son elegibles según las reglas de precedencia remota.
- Las variables de entorno heredadas de `CLAWDBOT_GATEWAY_*` se ignoran para la resolución de autenticación del host del nodo.

## Servicio (en segundo plano)

Instale un host de nodo sin cabeza como servicio de usuario.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: Host WebSocket de la puerta de enlace (predeterminado: `127.0.0.1`)
- `--port <port>`: Puerto WebSocket de la puerta de enlace (predeterminado: `18789`)
- `--tls`: Usar TLS para la conexión de la puerta de enlace
- `--tls-fingerprint <sha256>`: Huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: Anular el id del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anular el nombre para mostrar del nodo
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

La primera conexión crea una solicitud de emparejamiento de dispositivo pendiente (`role: node`) en la puerta de enlace.
Apruébela a través de:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión de la puerta de enlace en
`~/.openclaw/node.json`.

## Aprobaciones de ejecución

`system.run` está limitado por aprobaciones de ejecución local:

- `~/.openclaw/exec-approvals.json`
- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (editar desde la puerta de enlace)

import en from "/components/footer/en.mdx";

<en />

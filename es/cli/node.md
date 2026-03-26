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

- `--host <host>`: Host de WebSocket de Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: Puerto de WebSocket de Gateway (predeterminado: `18789`)
- `--tls`: Usar TLS para la conexión de puerta de enlace
- `--tls-fingerprint <sha256>`: Huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: Anular el id. del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anular el nombre para mostrar del nodo

## Autenticación de puerta de enlace para el host de nodo

`openclaw node run` y `openclaw node install` resuelven la autenticación de la puerta de enlace desde la configuración/entorno (sin marcas `--token`/`--password` en los comandos de nodo):

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` se verifican primero.
- Luego, respaldo de configuración local: `gateway.auth.token` / `gateway.auth.password`.
- En el modo local, el host del nodo intencionalmente no hereda `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente a través de SecretRef y no se resuelve, la resolución de autenticación del nodo falla de forma cerrada (sin máscara de reserva remota).
- En `gateway.mode=remote`, los campos del cliente remoto (`gateway.remote.token` / `gateway.remote.password`) también son elegibles según las reglas de precedencia remota.
- Las variables de entorno heredadas `CLAWDBOT_GATEWAY_*` se ignoran para la resolución de autenticación del host del nodo.

## Servicio (segundo plano)

Instale un host de nodo sin interfaz (headless) como un servicio de usuario.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: Host del WebSocket de Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: Puerto del WebSocket de Gateway (predeterminado: `18789`)
- `--tls`: Usar TLS para la conexión de puerta de enlace
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

La primera conexión crea una solicitud de emparejamiento de dispositivo pendiente (`role: node`) en la Gateway.
Apruébela a través de:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si el nodo reintenta el emparejamiento con detalles de autenticación modificados (rol/ámbitos/clave pública),
la solicitud pendiente anterior es reemplazada y se crea un nuevo `requestId`.
Ejecute `openclaw devices list` nuevamente antes de la aprobación.

El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión de la puerta de enlace en
`~/.openclaw/node.json`.

## Aprobaciones de ejecución

`system.run` está limitado por aprobaciones de ejecución locales:

- `~/.openclaw/exec-approvals.json`
- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (editar desde la puerta de enlace)

import es from "/components/footer/es.mdx";

<es />

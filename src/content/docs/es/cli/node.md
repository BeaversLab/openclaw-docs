---
summary: "Referencia de CLI para `openclaw node` (host de nodo sin cabeza)"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "Nodo"
---

# `openclaw node`

Ejecute un **host de nodo sin cabeza** que se conecte al WebSocket de Gateway y exponga
`system.run` / `system.which` en esta máquina.

## ¿Por qué usar un host de nodo?

Use un host de nodo cuando desee que los agentes **ejecuten comandos en otras máquinas** en su
red sin instalar una aplicación complementaria completa de macOS allí.

Casos de uso comunes:

- Ejecutar comandos en cajas remotas de Linux/Windows (servidores de compilación, máquinas de laboratorio, NAS).
- Mantener exec **en sandbox** en la puerta de enlace, pero delegar las ejecuciones aprobadas a otros hosts.
- Proporcionar un objetivo de ejecución ligero y sin interfaz para nodos de automatización o CI.

La ejecución todavía está protegida por **aprobasiones de ejecución** y listas de permitidos por agente en el
host del nodo, por lo que puedes mantener el acceso a los comandos limitado y explícito.

## Proxy del navegador (sin configuración)

Los hosts de nodo anuncian automáticamente un proxy de navegador si `browser.enabled` no está
deshabilitado en el nodo. Esto permite que el agente use la automatización del navegador en ese nodo
sin configuración adicional.

De manera predeterminada, el proxy expone la superficie del perfil de navegador normal del nodo. Si usted
establece `nodeHost.browserProxy.allowProfiles`, el proxy se vuelve restrictivo:
se rechaza el direccionamiento a perfiles no incluidos en la lista de permitidos, y las rutas de
creación/eliminación de perfiles persistentes se bloquean a través del proxy.

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
- `--tls`: Usar TLS para la conexión de gateway
- `--tls-fingerprint <sha256>`: Huella digital del certificado TLS esperada (sha256)
- `--node-id <id>`: Anular el id del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anular el nombre para mostrar del nodo

## Autenticación de puerta de enlace para el host del nodo

`openclaw node run` y `openclaw node install` resuelven la autenticación de gateway desde config/env (sin indicadores `--token`/`--password` en los comandos de nodo):

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` se verifican primero.
- Luego, respaldo de configuración local: `gateway.auth.token` / `gateway.auth.password`.
- En modo local, el host de nodo intencionalmente no hereda `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente a través de SecretRef y sin resolver, la resolución de autenticación del nodo falla cerrada (sin enmascaramiento de respaldo remoto).
- En `gateway.mode=remote`, los campos de cliente remoto (`gateway.remote.token` / `gateway.remote.password`) también son elegibles según las reglas de precedencia remota.
- La resolución de autenticación del host de nodos solo respeta las variables de entorno `OPENCLAW_GATEWAY_*`.

Para un nodo que se conecta a un Gateway `ws://` en texto plano, se aceptan hosts de loopback, literales de IP privada, `.local` y hosts de Tailnet `*.ts.net`. Para otros nombres de DNS privados de confianza, configure `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`; sin él, el inicio del nodo falla de forma segura y le pide que use `wss://`, un túnel SSH o Tailscale. Esta es una opción de participación del entorno de proceso, no una clave de configuración `openclaw.json`.
`openclaw node install` lo guarda en el servicio de nodo supervisado cuando está presente en el entorno del comando de instalación.

## Servicio (segundo plano)

Instale un host de nodos sin cabeza como servicio de usuario.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Opciones:

- `--host <host>`: Host del WebSocket del Gateway (predeterminado: `127.0.0.1`)
- `--port <port>`: Puerto del WebSocket del Gateway (predeterminado: `18789`)
- `--tls`: Usar TLS para la conexión del gateway
- `--tls-fingerprint <sha256>`: Huella del certificado TLS esperada (sha256)
- `--node-id <id>`: Anular el id del nodo (borra el token de emparejamiento)
- `--display-name <name>`: Anular el nombre para mostrar del nodo
- `--runtime <runtime>`: Tiempo de ejecución del servicio (`node` o `bun`)
- `--force`: Reinstalar/sobrescribir si ya está instalado

Administrar el servicio:

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

Use `openclaw node run` para un host de nodo en primer plano (sin servicio).

Los comandos de servicio aceptan `--json` para resultados legibles por máquina.

El host de nodos reintenta el reinicio del Gateway y los cierres de red en proceso. Si el Gateway informa una pausa de autenticación terminal de token/contraseña/bootstrap, el host de nodos registra el detalle del cierre y sale con un valor distinto de cero para que launchd/systemd pueda reiniciarlo con configuración y credenciales nuevas. Las pausas que requieren emparejamiento permanecen en el flujo de primer plano para que se pueda aprobar la solicitud pendiente.

## Emparejamiento

La primera conexión crea una solicitud de emparejamiento de dispositivo pendiente (`role: node`) en el Gateway.
Apruébela a través de:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

En redes de nodos estrictamente controladas, el operador del Gateway puede optar explícitamente por aprobar automáticamente el primer emparejamiento de nodos desde CIDRs de confianza:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Esto está deshabilitado de forma predeterminada. Solo se aplica al emparejamiento `role: node` nuevo sin alcances solicitados. Los clientes de operador/navegador, la interfaz de usuario de Control, WebChat y las actualizaciones de rol, alcance, metadatos o clave pública aún requieren aprobación manual.

Si el nodo reintenta el emparejamiento con detalles de autenticación cambiados (rol/alcances/clave pública), la solicitud pendiente anterior es reemplazada y se crea una nueva `requestId`. Ejecute `openclaw devices list` nuevamente antes de la aprobación.

El host del nodo almacena su id de nodo, token, nombre para mostrar e información de conexión del gateway en `~/.openclaw/node.json`.

## Aprobaciones de ejecución

`system.run` está limitado por aprobaciones de ejecución locales:

- `~/.openclaw/exec-approvals.json`
- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (editar desde el Gateway)

Para la ejecución de nodos asíncrona aprobada, OpenClaw prepara un `systemRunPlan` canónico
antes de solicitar. El reenvío posterior aprobado `system.run` reutiliza ese plan
almacenado, por lo que las ediciones a los campos command/cwd/session después de que se creó
la solicitud de aprobación son rechazadas en lugar de cambiar lo que el nodo ejecuta.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Nodos](/es/nodes)

---
summary: "Solucione problemas de emparejamiento de nodos, requisitos en primer plano, permisos y fallos de herramientas"
read_when:
  - Node is connected but camera/canvas/screen/exec tools fail
  - You need the node pairing versus approvals mental model
title: "Solución de problemas de nodos"
---

# Solución de problemas de nodos

Use esta página cuando un nodo es visible en el estado, pero las herramientas del nodo fallan.

## Escalera de comandos

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Luego ejecute verificaciones específicas del nodo:

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
```

Señales saludables:

- El nodo está conectado y emparejado para el rol `node`.
- `nodes describe` incluye la capacidad que está llamando.
- Las aprobaciones de exec muestran el modo/lista blanca esperada.

## Requisitos en primer plano

`canvas.*`, `camera.*` y `screen.*` funcionan solo en primer plano en nodos iOS/Android.

Verificación y solución rápida:

```bash
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow
```

Si ve `NODE_BACKGROUND_UNAVAILABLE`, traiga la aplicación del nodo al primer plano y vuelva a intentarlo.

## Matriz de permisos

| Capacidad                    | iOS                                          | Android                                                 | Aplicación de nodo macOS                | Código de error típico         |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| `camera.snap`, `camera.clip` | Cámara (+ micrófono para audio de clip)      | Cámara (+ micrófono para audio de clip)                 | Cámara (+ micrófono para audio de clip) | `*_PERMISSION_REQUIRED`        |
| `screen.record`              | Grabación de pantalla (+ micrófono opcional) | Solicitud de captura de pantalla (+ micrófono opcional) | Grabación de pantalla                   | `*_PERMISSION_REQUIRED`        |
| `location.get`               | Mientras se usa o siempre (depende del modo) | Ubicación en primer plano/segundo plano según el modo   | Permiso de ubicación                    | `LOCATION_PERMISSION_REQUIRED` |
| `system.run`                 | n/a (ruta de host del nodo)                  | n/a (ruta de host del nodo)                             | Aprobaciones de exec requeridas         | `SYSTEM_RUN_DENIED`            |

## Emparejamiento frente a aprobaciones

Estos son diferentes obstáculos:

1. **Emparejamiento de dispositivos**: ¿puede este nodo conectarse a la puerta de enlace?
2. **Política de comandos del nodo de puerta de enlace**: ¿está el ID de comando RPC permitido por `gateway.nodes.allowCommands` / `denyCommands` y los valores predeterminados de la plataforma?
3. **Aprobaciones de ejecución**: ¿puede este nodo ejecutar un comando de shell específico localmente?

Verificaciones rápidas:

```bash
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"
```

Si falta el emparejamiento, apruebe primero el dispositivo del nodo.
Si a `nodes describe` le falta un comando, verifique la política de comandos del nodo de puerta de enlace y si el nodo declaró realmente ese comando al conectarse.
Si el emparejamiento está bien pero `system.run` falla, corrija las aprobaciones/listas de permitidos de ejecución en ese nodo.

El emparejamiento de nodos es una puerta de identidad/confianza, no una superficie de aprobación por comando. Para `system.run`, la política por nodo reside en el archivo de aprobaciones de ejecución de ese nodo (`openclaw approvals get --node ...`), no en el registro de emparejamiento de la puerta de enlace.

## Códigos de error comunes de nodos

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación está en segundo plano; póngala en primer plano.
- `CAMERA_DISABLED` → el interruptor de cámara está deshabilitado en la configuración del nodo.
- `*_PERMISSION_REQUIRED` → permiso del SO faltante/denegado.
- `LOCATION_DISABLED` → el modo de ubicación está desactivado.
- `LOCATION_PERMISSION_REQUIRED` → modo de ubicación solicitado no otorgado.
- `LOCATION_BACKGROUND_UNAVAILABLE` → la aplicación está en segundo plano pero solo existe el permiso Mientras se usa.
- `SYSTEM_RUN_DENIED: approval required` → la solicitud de ejecución necesita aprobación explícita.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por el modo de lista de permitidos.
  En los hosts de nodo Windows, las formas de contenedor de shell como `cmd.exe /c ...` se tratan como fallos en la lista de permitidos en
  modo de lista de permitidos a menos que se aprueben mediante el flujo de solicitud.

## Bucle de recuperación rápida

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
```

Si sigue atascado:

- Volver a aprobar el emparejamiento del dispositivo.
- Volver a abrir la aplicación del nodo (en primer plano).
- Volver a otorgar permisos del SO.
- Recrear/ajustar la política de aprobación de ejecución.

Relacionado:

- [/nodes/index](/en/nodes/index)
- [/nodes/camera](/en/nodes/camera)
- [/nodes/location-command](/en/nodes/location-command)
- [/tools/exec-approvals](/en/tools/exec-approvals)
- [/gateway/pairing](/en/gateway/pairing)

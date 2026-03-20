---
summary: "Arquitectura IPC de macOS para la aplicación OpenClaw, transporte del nodo de puerta de enlace y PeekabooBridge"
read_when:
  - Edición de contratos IPC o IPC de la aplicación de la barra de menús
title: "macOS IPC"
---

# Arquitectura IPC de macOS de OpenClaw

**Modelo actual:** un socket Unix local conecta el **servicio de host del nodo** con la **aplicación macOS** para aprobaciones de ejecución + `system.run`. Existe una CLI de depuración `openclaw-mac` para verificación de descubrimiento/conexión; las acciones del agente aún fluyen a través del WebSocket de la puerta de enlace y `node.invoke`. La automatización de la interfaz de usuario usa PeekabooBridge.

## Objetivos

- Una única instancia de la aplicación GUI que gestiona todo el trabajo relacionado con TCC (notificaciones, grabación de pantalla, micrófono, voz, AppleScript).
- Una pequeña superficie para la automatización: comandos de la puerta de enlace + nodo, además de PeekabooBridge para la automatización de la interfaz de usuario.
- Permisos predecibles: siempre el mismo ID de bundle firmado, iniciado por launchd, por lo que los permisos TCC se mantienen.

## Cómo funciona

### Transporte de la puerta de enlace + nodo

- La aplicación ejecuta la puerta de enlace (modo local) y se conecta a ella como un nodo.
- Las acciones del agente se realizan a través de `node.invoke` (por ejemplo, `system.run`, `system.notify`, `canvas.*`).

### Servicio de nodo + IPC de la aplicación

- Un servicio host de nodo sin interfaz (headless) se conecta al WebSocket de la puerta de enlace.
- Las solicitudes `system.run` se reenvían a la aplicación macOS a través de un socket Unix local.
- La aplicación realiza la ejecución en el contexto de la interfaz de usuario, solicita confirmación si es necesario y devuelve la salida.

Diagrama (SCI):

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge (automatización de la interfaz de usuario)

- La automatización de la interfaz de usuario usa un socket UNIX separado llamado `bridge.sock` y el protocolo JSON PeekabooBridge.
- Orden de preferencia del host (lado del cliente): Peekaboo.app → Claude.app → OpenClaw.app → ejecución local.
- Seguridad: los hosts del puente requieren un TeamID permitido; la vía de escape del mismo UID solo para DEBUG está protegida por `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (convención de Peekaboo).
- Consulte: [Uso de PeekabooBridge](/es/platforms/mac/peekaboo) para obtener detalles.

## Flujos operativos

- Reiniciar/reconstruir: `SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - Mata las instancias existentes
  - Compilación y paquete de Swift
  - Escribe/inicializa/arranca el LaunchAgent
- Instancia única: la aplicación sale temprano si otra instancia con el mismo ID de bundle se está ejecutando.

## Notas de endurecimiento (Hardening)

- Preferir exigir una coincidencia de TeamID para todas las superficies privilegiadas.
- PeekabooBridge: `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` (solo DEBUG) puede permitir llamadores con el mismo UID para el desarrollo local.
- Toda la comunicación permanece solo local; no se exponen sockets de red.
- Las solicitudes de TCC se originan solo desde el paquete de la aplicación GUI; mantenga estable el ID de paquete firmado entre reconstrucciones.
- Endurecimiento de IPC: modo de socket `0600`, token, verificaciones de UID de pares, desafío/respuesta HMAC, TTL corto.

import en from "/components/footer/en.mdx";

<en />

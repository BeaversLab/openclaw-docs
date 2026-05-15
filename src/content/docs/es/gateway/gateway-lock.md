---
summary: "Guardia de singleton de puerta de enlace que utiliza el enlace del escucha de WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Bloqueo de puerta de enlace"
---

## Por qué

- Asegurar que solo se ejecute una instancia de puerta de enlace por puerto base en el mismo host; las puertas de enlace adicionales deben usar perfiles aislados y puertos únicos.
- Sobrevivir a fallos/SIGKILL sin dejar archivos de bloqueo obsoletos.
- Fallo rápido con un error claro cuando el puerto de control ya está ocupado.

## Mecanismo

- La puerta de enlace primero adquiere un archivo de bloqueo por configuración en el directorio de bloqueos de estado y sondea el puerto configurado para un oyente existente.
- Si el propietario del bloqueo registrado ha desaparecido, el puerto está libre o el bloqueo está obsoleto, el inicio reclama el bloqueo y continúa.
- La puerta de enlace luego vincula el oyente HTTP/WebSocket (por defecto `ws://127.0.0.1:18789`) usando un oyente TCP exclusivo.
- Si el enlace falla con `EADDRINUSE`, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Al apagarse, la puerta de enlace cierra el servidor HTTP/WebSocket y elimina el archivo de bloqueo.

## Superficie de error

- Si otro proceso mantiene el puerto, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Otros fallos de enlace aparecen como `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notas operativas

- Si el puerto está ocupado por _otro_ proceso, el error es el mismo; libere el puerto o elija otro con `openclaw gateway --port <port>`.
- Bajo un supervisor de servicios, un nuevo proceso de puerta de enlace que ve un respondedor `/healthz` existente y saludable deja ese proceso a cargo. En systemd, el iniciador duplicado sale con el código 78 para que el `RestartPreventExitStatus=78` predeterminado evite que `Restart=always` haga un bucle en un bloqueo o un conflicto de `EADDRINUSE`. Si el proceso existente nunca llega a estar saludable, los reintentos están limitados y el inicio falla con un error de bloqueo claro en lugar de hacer un bucle para siempre.
- La aplicación macOS todavía mantiene su propia protección ligera de PID antes de iniciar la puerta de enlace; el bloqueo en tiempo de ejecución se aplica mediante el archivo de bloqueo más el enlace HTTP/WebSocket.

## Relacionado

- [Múltiples puertas de enlace](/es/gateway/multiple-gateways) — ejecución de múltiples instancias con puertos únicos
- [Solución de problemas](/es/gateway/troubleshooting) — diagnóstico de `EADDRINUSE` y conflictos de puertos

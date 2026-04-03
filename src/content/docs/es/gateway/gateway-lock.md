---
summary: "Guardia de singleton de puerta de enlace que utiliza el enlace del escucha de WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Bloqueo de puerta de enlace"
---

# Bloqueo de puerta de enlace

## Por qué

- Garantizar que solo se ejecute una instancia de puerta de enlace por puerto base en el mismo host; las puertas de enlace adicionales deben usar perfiles aislados y puertos únicos.
- Sobrevivir a fallos/SIGKILL sin dejar archivos de bloqueo obsoletos.
- Fallo rápido con un error claro cuando el puerto de control ya está ocupado.

## Mecanismo

- La puerta de enlace vincula el escucha de WebSocket (predeterminado `ws://127.0.0.1:18789`) inmediatamente al inicio mediante un escucha TCP exclusivo.
- Si el enlace falla con `EADDRINUSE`, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- El sistema operativo libera el escucha automáticamente ante cualquier salida del proceso, incluidos fallos y SIGKILL; no se necesita un archivo de bloqueo separado ni un paso de limpieza.
- Al apagarse, la puerta de enlace cierra el servidor WebSocket y el servidor HTTP subyacente para liberar el puerto rápidamente.

## Superficie de error

- Si otro proceso mantiene el puerto, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Otros fallos de enlace aparecen como `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notas operativas

- Si el puerto está ocupado por _otro_ proceso, el error es el mismo; libere el puerto o elija otro con `openclaw gateway --port <port>`.
- La aplicación de macOS aún mantiene su propia protección ligera de PID antes de generar la puerta de enlace; el bloqueo en tiempo de ejecución lo impone el enlace de WebSocket.

## Relacionado

- [Múltiples puertas de enlace](/en/gateway/multiple-gateways) — ejecución de varias instancias con puertos únicos
- [Solución de problemas](/en/gateway/troubleshooting) — diagnóstico de `EADDRINUSE` y conflictos de puertos

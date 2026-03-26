---
summary: "Guardia de singleton de puerta de enlace que utiliza el enlace del escucha de WebSocket"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Bloqueo de puerta de enlace"
---

# Bloqueo de puerta de enlace

Última actualización: 2025-12-11

## Por qué

- Asegurar que solo se ejecute una instancia de puerta de enlace por puerto base en el mismo host; las puertas de enlace adicionales deben usar perfiles aislados y puertos únicos.
- Sobrevivir a fallos/SIGKILL sin dejar archivos de bloqueo obsoletos.
- Fallar rápidamente con un error claro cuando el puerto de control ya está ocupado.

## Mecanismo

- La puerta de enlace vincula el escucha de WebSocket (por defecto `ws://127.0.0.1:18789`) inmediatamente al inicio utilizando un escucha TCP exclusivo.
- Si el enlace falla con `EADDRINUSE`, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- El sistema operativo libera el escucha automáticamente en cualquier salida del proceso, incluyendo fallos y SIGKILL; no se necesita un archivo de bloqueo separado ni un paso de limpieza.
- Al apagar, la puerta de enlace cierra el servidor WebSocket y el servidor HTTP subyacente para liberar el puerto rápidamente.

## Superficie de error

- Si otro proceso mantiene el puerto, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Otros fallos de enlace aparecen como `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notas operativas

- Si el puerto está ocupado por _otro_ proceso, el error es el mismo; libere el puerto o elija otro con `openclaw gateway --port <port>`.
- La aplicación de macOS todavía mantiene su propia guardia de PID ligera antes de generar la puerta de enlace; el bloqueo en tiempo de ejecución se aplica mediante el enlace de WebSocket.

import es from "/components/footer/es.mdx";

<es />

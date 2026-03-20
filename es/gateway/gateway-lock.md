---
summary: "Guardián singleton de Gateway utilizando el enlace del escucha WebSocket"
read_when:
  - Ejecutando o depurando el proceso de gateway
  - Investigando la aplicación de instancia única
title: "Bloqueo de Gateway"
---

# Bloqueo de Gateway

Última actualización: 2025-12-11

## Por qué

- Asegurar que solo se ejecute una instancia de gateway por puerto base en el mismo host; las gateways adicionales deben usar perfiles aislados y puertos únicos.
- Sobrevivir a bloqueos/SIGKILL sin dejar archivos de bloqueo obsoletos.
- Fallo rápido con un error claro cuando el puerto de control ya está ocupado.

## Mecanismo

- El gateway vincula el escucha WebSocket (por defecto `ws://127.0.0.1:18789`) inmediatamente al inicio utilizando un escucha TCP exclusivo.
- Si el enlace falla con `EADDRINUSE`, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- El sistema operativo libera el escucha automáticamente en cualquier salida del proceso, incluidos bloqueos y SIGKILL; no se necesita ningún archivo de bloqueo ni paso de limpieza por separado.
- Al apagarse, el gateway cierra el servidor WebSocket y el servidor HTTP subyacente para liberar el puerto rápidamente.

## Superficie de error

- Si otro proceso mantiene el puerto, el inicio lanza `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`.
- Otros fallos de enlace aparecen como `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`.

## Notas operativas

- Si el puerto está ocupado por _otro_ proceso, el error es el mismo; libere el puerto o elija otro con `openclaw gateway --port <port>`.
- La aplicación de macOS aún mantiene su propio guardián de PID ligero antes de generar el gateway; el bloqueo en tiempo de ejecución se aplica mediante el enlace WebSocket.

import en from "/components/footer/en.mdx";

<en />

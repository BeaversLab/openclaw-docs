---
summary: "Referencia de CLI para `openclaw nodes` (estado, emparejamiento, invocación, cámara/canvas/pantalla)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "nodos"
---

# `openclaw nodes`

Administra nodos emparejados (dispositivos) e invoca capacidades de los nodos.

Relacionado:

- Resumen de nodos: [Nodos](/en/nodes)
- Cámara: [Nodos de cámara](/en/nodes/camera)
- Imágenes: [Nodos de imagen](/en/nodes/images)

Opciones comunes:

- `--url`, `--token`, `--timeout`, `--json`

## Comandos comunes

```bash
openclaw nodes list
openclaw nodes list --connected
openclaw nodes list --last-connected 24h
openclaw nodes pending
openclaw nodes approve <requestId>
openclaw nodes reject <requestId>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` imprime tablas pendientes/emparejadas. Las filas emparejadas incluyen la antigüedad de conexión más reciente (Última conexión).
Usa `--connected` para mostrar solo los nodos conectados actualmente. Usa `--last-connected <duration>` para
filtrar los nodos que se conectaron dentro de un período (p. ej., `24h`, `7d`).

Nota de aprobación:

- `openclaw nodes pending` solo necesita el alcance de emparejamiento.
- `openclaw nodes approve <requestId>` hereda requisitos de alcance adicionales de la
  solicitud pendiente:
  - solicitud sin comando: solo emparejamiento
  - comandos de nodo no ejecutables: emparejamiento + escritura
  - `system.run` / `system.run.prepare` / `system.which`: emparejamiento + administración

## Invocar

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Opciones de invocación:

- `--params <json>`: cadena de objeto JSON (predeterminado `{}`).
- `--invoke-timeout <ms>`: tiempo de espera de invocación del nodo (predeterminado `15000`).
- `--idempotency-key <key>`: clave de idempotencia opcional.
- `system.run` y `system.run.prepare` están bloqueados aquí; use la herramienta `exec` con `host=node` para la ejecución de shell.

Para la ejecución de shell en un nodo, use la herramienta `exec` con `host=node` en lugar de `openclaw nodes run`.
La CLI de `nodes` ahora se centra en capacidades: RPC directo a través de `nodes invoke`, además de emparejamiento, cámara,
pantalla, ubicación, canvas y notificaciones.

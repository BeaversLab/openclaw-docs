---
summary: "Referencia de CLI para `openclaw nodes` (estado, emparejamiento, invocación, cámara/canvas/pantalla)"
read_when:
  - You’re managing paired nodes (cameras, screen, canvas)
  - You need to approve requests or invoke node commands
title: "Nodes"
---

# `openclaw nodes`

Administra nodos emparejados (dispositivos) e invoca capacidades de los nodos.

Relacionado:

- Resumen de Nodes: [Nodes](/es/nodes)
- Cámara: [Nodos de cámara](/es/nodes/camera)
- Imágenes: [Nodos de imagen](/es/nodes/images)

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
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name <displayName>
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` imprime las tablas pendientes/emparejadas. Las filas emparejadas incluyen la antigüedad de conexión más reciente (Última conexión).
Use `--connected` para mostrar solo los nodos conectados actualmente. Use `--last-connected <duration>` para
filtrar a los nodos que se conectaron dentro de una duración (ej. `24h`, `7d`).
Use `nodes remove --node <id|name|ip>` para eliminar un registro de emparejamiento de nodo obsoleto propiedad de la puerta de enlace.

Nota de aprobación:

- `openclaw nodes pending` solo necesita el ámbito de emparejamiento.
- `gateway.nodes.pairing.autoApproveCidrs``role: node` puede omitir el paso pendiente solo para
  el emparejamiento de dispositivos de primera vez explícitamente confiables. Está desactivado por
  defecto y no aprueba actualizaciones.
- `openclaw nodes approve <requestId>` hereda requisitos de ámbito adicionales de la
  solicitud pendiente:
  - solicitud sin comando: solo emparejamiento
  - comandos de nodo no ejecutables: emparejamiento + escritura
  - `system.run` / `system.run.prepare` / `system.which`: emparejamiento + administrador

## Invocar

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
```

Invocar indicadores:

- `--params <json>`: cadena de objeto JSON (predeterminado `{}`).
- `--invoke-timeout <ms>`: tiempo de espera de invocación de nodo (predeterminado `15000`).
- `--idempotency-key <key>`: clave de idempotencia opcional.
- `system.run` y `system.run.prepare` están bloqueados aquí; use la herramienta `exec` con `host=node` para la ejecución de shell.

Para la ejecución de shell en un nodo, use la herramienta `exec` con `host=node` en lugar de `openclaw nodes run`.
La CLI de `nodes` ahora se centra en las capacidades: RPC directo a través de `nodes invoke`, además de emparejamiento, cámara,
pantalla, ubicación, lienzo y notificaciones.

## Relacionado

- [Referencia de CLI](/es/cli)
- [Nodos](/es/nodes)

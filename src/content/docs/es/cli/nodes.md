---
summary: "Referencia de CLI para `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
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
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` imprime tablas pendientes/emparejadas. Las filas emparejadas incluyen la antigüedad de conexión más reciente (Última conexión).
Usa `--connected` para mostrar solo los nodos conectados actualmente. Usa `--last-connected <duration>` para
filtrar los nodos que se conectaron dentro de un período (p. ej., `24h`, `7d`).

## Invocar / ejecutar

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

Marcadores de invocación:

- `--params <json>`: cadena de objeto JSON (predeterminado `{}`).
- `--invoke-timeout <ms>`: tiempo de espera de invocación del nodo (predeterminado `15000`).
- `--idempotency-key <key>`: clave de idempotencia opcional.

### Valores predeterminados de estilo exec

`nodes run` refleja el comportamiento exec del modelo (valores predeterminados + aprobaciones):

- Lee `tools.exec.*` (más anulaciones de `agents.list[].tools.exec.*`).
- Usa aprobaciones exec (`exec.approval.request`) antes de invocar `system.run`.
- `--node` se puede omitir cuando se establece `tools.exec.node`.
- Requiere un nodo que anuncie `system.run` (aplicación complementaria de macOS o host de nodo sin interfaz gráfica).

Marcadores:

- `--cwd <path>`: directorio de trabajo.
- `--env <key=val>`: anulación de entorno (repetible). Nota: los hosts de nodos ignoran las anulaciones de `PATH` (y `tools.exec.pathPrepend` no se aplica a los hosts de nodos).
- `--command-timeout <ms>`: tiempo de espera del comando.
- `--invoke-timeout <ms>`: tiempo de espera de invocación del nodo (por defecto `30000`).
- `--needs-screen-recording`: requiere permiso de grabación de pantalla.
- `--raw <command>`: ejecuta una cadena de shell (`/bin/sh -lc` o `cmd.exe /c`).
  En modo de lista de permitidos en hosts de nodo Windows, las ejecuciones del contenedor de shell `cmd.exe /c` requieren aprobación
  (la entrada en la lista de permitidos por sí sola no permite automáticamente el formato de contenedor).
- `--agent <id>`: aprobaciones/listas de permitidas con ámbito de agente (por defecto al agente configurado).
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>`: anulaciones.

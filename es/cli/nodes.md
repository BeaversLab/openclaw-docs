---
summary: "Referencia de CLI para `openclaw nodes` (list/status/approve/invoke, camera/canvas/screen)"
read_when:
  - Estás gestionando nodos emparejados (cámaras, pantalla, lienzo)
  - Necesitas aprobar solicitudes o invocar comandos de nodo
title: "nodes"
---

# `openclaw nodes`

Gestiona nodos emparejados (dispositivos) e invoca capacidades de nodo.

Relacionado:

- Resumen de nodos: [Nodos](/es/nodes)
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
openclaw nodes status
openclaw nodes status --connected
openclaw nodes status --last-connected 24h
```

`nodes list` imprime tablas pendientes/emparejadas. Las filas emparejadas incluyen la antigüedad de conexión más reciente (Última conexión).
Usa `--connected` para mostrar solo los nodos conectados actualmente. Usa `--last-connected <duration>` para
filtrar a los nodos que se conectaron dentro de un período (por ejemplo, `24h`, `7d`).

## Invocar / ejecutar

```bash
openclaw nodes invoke --node <id|name|ip> --command <command> --params <json>
openclaw nodes run --node <id|name|ip> <command...>
openclaw nodes run --raw "git status"
openclaw nodes run --agent main --node <id|name|ip> --raw "git status"
```

Invocar indicadores:

- `--params <json>`: cadena de objeto JSON (predeterminado `{}`).
- `--invoke-timeout <ms>`: tiempo de espera de invocación de nodo (predeterminado `15000`).
- `--idempotency-key <key>`: clave de idempotencia opcional.

### Valores predeterminados de estilo Exec

`nodes run` refleja el comportamiento exec del modelo (valores predeterminados + aprobaciones):

- Lee `tools.exec.*` (más anulaciones `agents.list[].tools.exec.*`).
- Usa aprobaciones exec (`exec.approval.request`) antes de invocar `system.run`.
- `--node` se puede omitir cuando se establece `tools.exec.node`.
- Requiere un nodo que anuncie `system.run` (aplicación complementaria macOS o host de nodo sin interfaz).

Indicadores:

- `--cwd <path>`: directorio de trabajo.
- `--env <key=val>`: anulación de env (repetible). Nota: los hosts de nodo ignoran las anulaciones `PATH` (y `tools.exec.pathPrepend` no se aplica a los hosts de nodo).
- `--command-timeout <ms>`: tiempo de espera del comando.
- `--invoke-timeout <ms>`: tiempo de espera de invocación del nodo (predeterminado `30000`).
- `--needs-screen-recording`: requiere permiso de grabación de pantalla.
- `--raw <command>`: ejecuta una cadena de shell (`/bin/sh -lc` o `cmd.exe /c`).
  En el modo de lista de permitidos en hosts de nodos Windows, las ejecuciones del contenedor de shell `cmd.exe /c` requieren aprobación
  (una entrada en la lista de permitidos por sí sola no permite automáticamente el formato de contenedor).
- `--agent <id>`: aprobaciones/listas de permitidas con alcance de agente (predeterminado al agente configurado).
- `--ask <off|on-miss|always>`, `--security <deny|allowlist|full>`: anulaciones.

import es from "/components/footer/es.mdx";

<es />

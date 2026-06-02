---
summary: "Supervise Codex app-server sessions from OpenClaw."
read_when:
  - You are installing, configuring, or auditing the codex-supervisor plugin
title: "Codex Supervisor plugin"
---

# Codex Supervisor plugin

Supervise Codex app-server sessions from OpenClaw.

## Distribution

- Paquete: `@openclaw/codex-supervisor`
- Install route: included in OpenClaw

## Surface

contracts: tools

{/* openclaw-plugin-reference:manual-start */}

## Listado de Sesiones

`codex_sessions_list` muestra por defecto solo las sesiones de Codex cargadas. Establezca `include_stored` para incluir el historial almacenado; el complemento utiliza la ruta de listado exclusiva de la base de datos de estados del servidor de aplicaciones de Codex y limita los resultados almacenados a 200 de forma predeterminada. Pase `max_stored_sessions` para bajar o subir ese límite, hasta un máximo de 1000.

{/* openclaw-plugin-reference:manual-end */}

---
summary: "Monitorizar la caducidad de OAuth para los proveedores de modelos"
read_when:
  - Configurar la monitorización de la caducidad de la autenticación o las alertas
  - Automatizar las comprobaciones de actualización de OAuth de Claude Code / Codex
title: "Monitorización de autenticación"
---

# Monitorización de autenticación

OpenClaw expone el estado de la caducidad de OAuth a través de `openclaw models status`. Úselo para la
automatización y las alertas; los scripts son extras opcionales para los flujos de trabajo del teléfono.

## Preferido: comprobación de CLI (portátil)

```bash
openclaw models status --check
```

Códigos de salida:

- `0`: OK
- `1`: credenciales caducadas o ausentes
- `2`: caducará pronto (dentro de 24h)

Esto funciona en cron/systemd y no requiere scripts adicionales.

## Scripts opcionales (flujos de trabajo de operaciones / teléfono)

Estos se encuentran en `scripts/` y son **opcionales**. Asumen acceso SSH al
host de puerta de enlace y están ajustados para systemd + Termux.

- `scripts/claude-auth-status.sh` ahora usa `openclaw models status --json` como la
  fuente de verdad (recurriendo a lecturas directas de archivos si la CLI no está disponible),
  así que mantenga `openclaw` en `PATH` para los temporizadores.
- `scripts/auth-monitor.sh`: objetivo del temporizador cron/systemd; envía alertas (ntfy o teléfono).
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`: temporizador de usuario de systemd.
- `scripts/claude-auth-status.sh`: comprobador de autenticación de Claude Code + OpenClaw (completo//simple).
- `scripts/mobile-reauth.sh`: flujo guiado de reautenticación a través de SSH.
- `scripts/termux-quick-auth.sh`: estado del widget con un toque + abrir URL de autenticación.
- `scripts/termux-auth-widget.sh`: flujo completo guiado de widgets.
- `scripts/termux-sync-widget.sh`: sincronizar credenciales de Claude Code → OpenClaw.

Si no necesita automatización en el teléfono o temporizadores systemd, omita estos scripts.

import es from "/components/footer/es.mdx";

<es />

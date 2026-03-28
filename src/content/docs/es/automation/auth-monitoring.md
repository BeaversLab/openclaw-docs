---
summary: "Supervisa la caducidad de OAuth para los proveedores de modelos"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "Supervisión de autenticación"
---

# Supervisión de autenticación

OpenClaw expone el estado de salud de la caducidad de OAuth a través de `openclaw models status`. Utilízalo para automatización y alertas; los scripts son extras opcionales para flujos de trabajo en el teléfono.

## Preferido: verificación CLI (portátil)

```bash
openclaw models status --check
```

Códigos de salida:

- `0`: OK
- `1`: credenciales caducadas o faltantes
- `2`: caducando pronto (dentro de 24h)

Esto funciona en cron/systemd y no requiere scripts adicionales.

## Scripts opcionales (operaciones / flujos de trabajo del teléfono)

Estos se encuentran en `scripts/` y son **opcionales**. Asumen acceso SSH al
host de puerta de enlace y están ajustados para systemd + Termux.

- `scripts/claude-auth-status.sh` ahora usa `openclaw models status --json` como la
  fuente de verdad (recurriendo a lecturas directas de archivos si el CLI no está disponible),
  así que mantén `openclaw` en `PATH` para los temporizadores.
- `scripts/auth-monitor.sh`: objetivo de temporizador cron/systemd; envía alertas (ntfy o teléfono).
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`: temporizador de usuario systemd.
- `scripts/claude-auth-status.sh`: comprobador de autenticación de Claude Code + OpenClaw (completo//simple).
- `scripts/mobile-reauth.sh`: flujo guiado de re‑autenticación a través de SSH.
- `scripts/termux-quick-auth.sh`: estado de widget de un toque + abrir URL de autenticación.
- `scripts/termux-auth-widget.sh`: flujo guiado completo de widget.
- `scripts/termux-sync-widget.sh`: sincronizar credenciales de Claude Code → OpenClaw.

Si no necesitas automatización en el teléfono o temporizadores systemd, omite estos scripts.

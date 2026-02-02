---
summary: "Platform support overview (Gateway + companion apps)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Platforms"
---

# Platforms

OpenClaw core is written in TypeScript. **Node is the recommended runtime**.
Bun is not recommended for the Gateway (WhatsApp/Telegram bugs).

Companion apps exist for macOS (menu bar app) and mobile nodes (iOS/Android). Windows and
Linux companion apps are planned, but the Gateway is fully supported today.
Native companion apps for Windows are also planned; the Gateway is recommended via WSL2.

## Choose your OS

- macOS: [macOS](/en/platforms/macos)
- iOS: [iOS](/en/platforms/ios)
- Android: [Android](/en/platforms/android)
- Windows: [Windows](/en/platforms/windows)
- Linux: [Linux](/en/platforms/linux)

## VPS & hosting

- VPS hub: [VPS hosting](/en/vps)
- Fly.io: [Fly.io](/en/platforms/fly)
- Hetzner (Docker): [Hetzner](/en/platforms/hetzner)
- GCP (Compute Engine): [GCP](/en/platforms/gcp)
- exe.dev (VM + HTTPS proxy): [exe.dev](/en/platforms/exe-dev)

## Common links

- Install guide: [Getting Started](/en/start/getting-started)
- Gateway runbook: [Gateway](/en/gateway)
- Gateway configuration: [Configuration](/en/gateway/configuration)
- Service status: `openclaw gateway status`

## Gateway service install (CLI)

Use one of these (all supported):

- Wizard (recommended): `openclaw onboard --install-daemon`
- Direct: `openclaw gateway install`
- Configure flow: `openclaw configure` → select **Gateway service**
- Repair/migrate: `openclaw doctor` (offers to install or fix the service)

The service target depends on OS:

- macOS: LaunchAgent (`bot.molt.gateway` or `bot.molt.<profile>`; legacy `com.openclaw.*`)
- Linux/WSL2: systemd user service (`openclaw-gateway[-<profile>].service`)

---
summary: "Platform support overview (Gateway + companion apps)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Platforms"
---

OpenClaw core is written in TypeScript. **Node is the required runtime** because
the canonical state store uses `node:sqlite`. Bun remains available for
dependency installation and package scripts; see [Bun](/en/install/bun).

Companion apps exist for Windows Hub, macOS (menu bar app), and mobile nodes
(iOS/Android). Linux companion apps are planned, but the Gateway is fully
supported today. On Windows, choose Windows Hub for the desktop app, native
PowerShell install for terminal-first use, or WSL2 for the most
Linux-compatible Gateway runtime.

## Choose your OS

- Android: [Android](/en/platforms/android)
- ChromeOS: [ChromeOS (Crostini)](/en/platforms/chromeos)
- iOS: [iOS](/en/platforms/ios)
- Linux: [Linux](/en/platforms/linux)
- macOS: [macOS](/en/platforms/macos)
- Windows: [Windows](/en/platforms/windows)

## VPS and hosting

- VPS hub: [VPS hosting](/en/vps)
- Azure (Linux VM): [Azure](/en/install/azure)
- Daytona (cloud sandbox): [Daytona](/en/install/daytona)
- EasyRunner (Podman + Caddy): [EasyRunner](/en/platforms/easyrunner)
- exe.dev (VM + HTTPS proxy): [exe.dev](/en/install/exe-dev)
- Fly.io: [Fly.io](/en/install/fly)
- GCP (Compute Engine): [GCP](/en/install/gcp)
- Hetzner (Docker): [Hetzner](/en/install/hetzner)

## Common links

- Install guide: [Getting Started](/en/start/getting-started)
- Windows Hub: [Windows](/en/platforms/windows)
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

- macOS: LaunchAgent (`ai.openclaw.gateway`, or `ai.openclaw.<profile>` for a named profile)
- Linux/WSL2: systemd user service (`openclaw-gateway[-<profile>].service`)
- Native Windows: Scheduled Task (`OpenClaw Gateway` or `OpenClaw Gateway (<profile>)`), with a per-user Startup-folder login item fallback if task creation is denied

## Related

- [Install overview](/en/install)
- [Windows Hub](/en/platforms/windows)
- [macOS app](/en/platforms/macos)
- [iOS app](/en/platforms/ios)

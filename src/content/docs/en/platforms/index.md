---
summary: "Platform support overview (Gateway + companion apps)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Platforms"
---

OpenClaw core is written in TypeScript. **Node is the recommended runtime**.
Bun is not recommended for the Gateway — known issues with WhatsApp and
Telegram channels; see [Bun (experimental)](/en/install/bun) for details.

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
- Fly.io: [Fly.io](/en/install/fly)
- Hetzner (Docker): [Hetzner](/en/install/hetzner)
- GCP (Compute Engine): [GCP](/en/install/gcp)
- Azure (Linux VM): [Azure](/en/install/azure)
- exe.dev (VM + HTTPS proxy): [exe.dev](/en/install/exe-dev)

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

- macOS: LaunchAgent (`ai.openclaw.gateway` or `ai.openclaw.<profile>`; legacy `com.openclaw.*`)
- Linux/WSL2: systemd user service (`openclaw-gateway[-<profile>].service`)
- Native Windows: Scheduled Task (`OpenClaw Gateway` or `OpenClaw Gateway (<profile>)`), with a per-user Startup-folder login item fallback if task creation is denied

## Related

- [Install overview](/en/install)
- [macOS app](/en/platforms/macos)
- [iOS app](/en/platforms/ios)

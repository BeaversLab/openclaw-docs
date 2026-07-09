---
summary: "Install and use the OpenClaw macOS menu bar app"
read_when:
  - Installing the macOS app
  - Deciding between local and remote Gateway mode on macOS
  - Looking for macOS app release downloads
title: "macOS app"
---

The macOS app is the OpenClaw **menu bar companion**: native tray UI, macOS
permission prompts, notifications, WebChat, voice input, Canvas, and
Mac-hosted node tools such as `system.run`.

Only need the CLI and Gateway? Start with [Getting started](/en/start/getting-started).

## Download

Get macOS app builds from [OpenClaw GitHub releases](https://github.com/openclaw/openclaw/releases).
When a release ships macOS app assets, look for:

- `OpenClaw-<version>.dmg` (preferred)
- `OpenClaw-<version>.zip`

Some releases only ship CLI, evidence, or Windows assets. If the newest release
has no macOS app asset, use the newest one that does, or build from source with
[macOS dev setup](/en/platforms/mac/dev-setup).

## First run

1. Install and launch **OpenClaw.app**.
2. Pick **This Mac** for a local Gateway, or connect to a remote Gateway.
3. Local mode: wait while the app installs its user-space runtime and Gateway.
4. Complete provider setup and the macOS permission checklist.
5. Send the onboarding test message.

For the CLI/Gateway setup path, use [Getting started](/en/start/getting-started).
For permission recovery, use [macOS permissions](/en/platforms/mac/permissions).

## Choose a Gateway mode

| Mode   | Use it when                                                                    | Detail page                                        |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| Local  | This Mac should run the Gateway and keep it alive with launchd.                | [Gateway on macOS](/en/platforms/mac/bundled-gateway) |
| Remote | Another host runs the Gateway; this Mac controls it over SSH, LAN, or Tailnet. | [Remote control](/en/platforms/mac/remote)            |

Local mode needs an installed `openclaw` CLI. On a fresh Mac, the app installs
the matching CLI and runtime automatically before starting the Gateway wizard.
See [Gateway on macOS](/en/platforms/mac/bundled-gateway) for manual recovery.

## What the app owns

- Menu bar status, notifications, health, and WebChat.
- macOS permission prompts for screen, microphone, speech, automation, and accessibility.
- Local node tools: Canvas, camera/screen capture, notifications, and `system.run`.
- Exec approval prompts for Mac-hosted commands.
- Remote-mode SSH tunnels or direct Gateway connections.

The app does **not** replace the Gateway or general CLI docs. Gateway
configuration, providers, plugins, channels, tools, and security live in their
own docs.

## macOS detail pages

| Task                                     | Read                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Install or debug the CLI/Gateway service | [Gateway on macOS](/en/platforms/mac/bundled-gateway)                                          |
| Keep state out of cloud-synced folders   | [Gateway on macOS](/en/platforms/mac/bundled-gateway#state-directory-on-macos)                 |
| Debug app discovery and connectivity     | [Gateway on macOS](/en/platforms/mac/bundled-gateway#debug-app-connectivity)                   |
| Understand launchd behavior              | [Gateway lifecycle](/en/platforms/mac/child-process)                                           |
| Fix permissions or signing/TCC issues    | [macOS permissions](/en/platforms/mac/permissions)                                             |
| Connect to a remote Gateway              | [Remote control](/en/platforms/mac/remote)                                                     |
| Read menu bar status and health checks   | [Menu bar](/en/platforms/mac/menu-bar), [Health checks](/en/platforms/mac/health)                 |
| Use the embedded chat UI                 | [WebChat](/en/platforms/mac/webchat)                                                           |
| Use voice wake or push-to-talk           | [Voice wake](/en/platforms/mac/voicewake)                                                      |
| Use Canvas and Canvas deep links         | [Canvas](/en/platforms/mac/canvas)                                                             |
| Host PeekabooBridge for UI automation    | [Peekaboo bridge](/en/platforms/mac/peekaboo)                                                  |
| Configure command approvals              | [Exec approvals](/en/tools/exec-approvals), [advanced details](/en/tools/exec-approvals-advanced) |
| Inspect Mac node commands and app IPC    | [macOS IPC](/en/platforms/mac/xpc)                                                             |
| Capture logs                             | [macOS logging](/en/platforms/mac/logging)                                                     |
| Build from source                        | [macOS dev setup](/en/platforms/mac/dev-setup)                                                 |

## Related

- [Platforms](/en/platforms)
- [Getting started](/en/start/getting-started)
- [Gateway](/en/gateway)
- [Exec approvals](/en/tools/exec-approvals)

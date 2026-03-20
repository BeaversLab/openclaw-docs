---
summary: "Gateway(网关) lifecycle on macOS (launchd)"
read_when:
  - Integrating the mac app with the gateway lifecycle
title: "Gateway(网关) Lifecycle"
---

# macOS 上的 Gateway 网关 生命周期

The macOS app **manages the Gateway(网关) via launchd** by default and does not spawn
the Gateway(网关) as a child process. It first tries to attach to an already‑running
Gateway(网关) on the configured port; if none is reachable, it enables the launchd
service via the external `openclaw` CLI (no embedded runtime). This gives you
reliable auto‑start at login and restart on crashes.

Child‑process mode (Gateway(网关) spawned directly by the app) is **not in use** today.
If you need tighter coupling to the UI, run the Gateway(网关) manually in a terminal.

## 默认行为

- The app installs a per‑user LaunchAgent labeled `ai.openclaw.gateway`
  (or `ai.openclaw.<profile>` when using `--profile`/`OPENCLAW_PROFILE`; legacy `com.openclaw.*` is supported).
- When Local mode is enabled, the app ensures the LaunchAgent is loaded and
  starts the Gateway(网关) if needed.
- 日志会写入 launchd 网关日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Replace the label with `ai.openclaw.<profile>` when running a named profile.

## 未签名的开发版本

`scripts/restart-mac.sh --no-sign` is for fast local builds when you don’t have
signing keys. To prevent launchd from pointing at an unsigned relay binary, it:

- Writes `~/.openclaw/disable-launchagent`.

Signed runs of `scripts/restart-mac.sh` clear this override if the marker is
present. To reset manually:

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

To force the macOS app to **never install or manage launchd**, launch it with
`--attach-only` (or `--no-launchd`). This sets `~/.openclaw/disable-launchagent`,
so the app only attaches to an already running Gateway(网关). You can toggle the same
behavior in Debug Settings.

## 远程模式

Remote mode never starts a local Gateway(网关). The app uses an SSH tunnel to the
remote host and connects over that tunnel.

## 为什么我们倾向于使用 launchd

- 登录时自动启动。
- 内置的重启/KeepAlive 语义。
- 可预测的日志和监控。

If a true child‑process mode is ever needed again, it should be documented as a
separate, explicit dev‑only mode.

import en from "/components/footer/en.mdx";

<en />

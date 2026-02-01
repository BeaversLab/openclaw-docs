---
summary: "监控模型提供方的 OAuth 到期情况"
read_when:
  - 配置认证到期监控或告警
  - 自动化 Claude Code / Codex OAuth 刷新检查
---
# 认证监控

OpenClaw 通过 `openclaw models status` 暴露 OAuth 到期健康状态。可用于自动化与告警；
脚本只是面向手机流程的可选补充。

## 首选：CLI 检查（可移植）

```bash
openclaw models status --check
```

退出码：
- `0`: 正常
- `1`: 已过期或缺少凭据
- `2`: 即将到期（24 小时内）

可用于 cron/systemd，无需额外脚本。

## 可选脚本（运维 / 手机流程）

这些脚本位于 `scripts/` 下，均为**可选**。它们假设你能通过 SSH 访问网关主机，
并针对 systemd + Termux 做了适配。

- `scripts/claude-auth-status.sh` now uses `openclaw models status --json` as the
  source of truth (falling back to direct file reads if the CLI is unavailable),
  so keep `openclaw` on `PATH` for timers.
  以 `openclaw models status --json` 作为权威数据源（CLI 不可用时回退到直接读文件），
  因此计时器环境需要把 `openclaw` 放在 `PATH` 中。
- `scripts/auth-monitor.sh`: cron/systemd 定时器目标；发送告警（ntfy 或手机）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`: systemd 用户定时器。
- `scripts/claude-auth-status.sh`: Claude Code + OpenClaw 认证检查器（full/json/simple）。
- `scripts/mobile-reauth.sh`: 通过 SSH 引导重新认证。
- `scripts/termux-quick-auth.sh`: 一键小组件状态 + 打开认证 URL。
- `scripts/termux-auth-widget.sh`: 完整引导式小组件流程。
- `scripts/termux-sync-widget.sh`: 同步 Claude Code 凭据 → OpenClaw。

如果不需要手机自动化或 systemd 定时器，可以跳过这些脚本。

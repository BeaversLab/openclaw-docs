---
summary: "监控模型提供商的 OAuth 过期"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "Auth 监控"
---

# Auth 监控

OpenClaw 通过 `openclaw models status` 暴露 OAuth 过期健康状况。将其用于
自动化和警报；脚本仅用于手机工作流程的可选附加组件。

## 首选：CLI 检查（便携式）

```bash
openclaw models status --check
```

退出代码：

- `0`：正常
- `1`：已过期或缺少凭据
- `2`：即将过期（24 小时内）

这适用于 cron/systemd，无需额外的脚本。

## 可选脚本（运维 / 手机工作流程）

这些位于 `scripts/` 下，并且是**可选的**。它们假设对
网关主机具有 SSH 访问权限，并针对 systemd + Termux 进行了调整。

- `scripts/claude-auth-status.sh` 现在使用 `openclaw models status --json` 作为
  事实来源（如果 CLI 不可用，则回退到直接文件读取），
  因此对于定时器，请将 `openclaw` 保持在 `PATH` 上。
- `scripts/auth-monitor.sh`：cron/systemd 定时器目标；发送警报（ntfy 或手机）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 用户定时器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 身份验证检查器（完整//简单）。
- `scripts/mobile-reauth.sh`：通过 SSH 进行引导式重新身份验证流程。
- `scripts/termux-quick-auth.sh`：一键式小部件状态 + 打开身份验证 URL。
- `scripts/termux-auth-widget.sh`：完整的引导式小部件流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 凭据 → OpenClaw。

如果您不需要手机自动化或 systemd 定时器，请跳过这些脚本。

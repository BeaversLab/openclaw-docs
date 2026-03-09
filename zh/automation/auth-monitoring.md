---
summary: "监控模型提供商的 OAuth 过期"
read_when:
  - "Setting up auth expiry monitoring or alerts"
  - "Automating Claude Code / Codex OAuth refresh checks"
title: "认证监控"
---

# 认证监控"

OpenClaw 通过 `openclaw models status` 暴露 OAuth 过期健康状态。将其用于自动化和告警；脚本是电话工作流程的可选额外功能。"

## 推荐：CLI 检查（可移植）

```bash
openclaw models status --check
```

退出代码："

- `0`：正常"
- `1`：凭证已过期或缺失"
- `2`：即将过期（24 小时内）"

这适用于 cron/systemd，不需要额外的脚本。"

## 可选脚本（运维 / 电话工作流程）"

这些位于 `scripts/` 下，是**可选的**。它们假设对 gateway 主机有 SSH 访问权限，并针对 systemd + Termux 进行了调整。"

- `scripts/claude-auth-status.sh` 现在使用 `openclaw models status --json` 作为真实来源（如果 CLI 不可用，则回退到直接文件读取），因此请在 `PATH` 上保持 `openclaw` 用于计时器。"
- `scripts/auth-monitor.sh`：cron/systemd 计时器目标；发送告警（ntfy 或电话）。"
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 用户计时器。"
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 认证检查器（完整/json/简单）。"
- `scripts/mobile-reauth.sh`：通过 SSH 进行引导式重新认证流程。"
- `scripts/termux-quick-auth.sh`：一键小部件状态 + 打开认证 URL。"
- `scripts/termux-auth-widget.sh`：完整的引导式小部件流程。"
- `scripts/termux-sync-widget.sh`：同步 Claude Code 凭证 → OpenClaw。"

如果您不需要电话自动化或 systemd 计时器，请跳过这些脚本。"

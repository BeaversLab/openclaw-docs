---
summary: "监控模型提供商的 OAuth 过期时间"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "身份验证监控"
---

# Auth 监控

OpenClaw 通过 `openclaw models status` 暴露 OAuth 过期健康状况。使用它进行自动化和警报；脚本是用于电话工作流的可选附加项。

## 首选：CLI 检查（便携式）

```bash
openclaw models status --check
```

退出代码：

- `0`：OK
- `1`：已过期或缺少凭据
- `2`：即将过期（24小时内）

这适用于 cron/systemd，无需额外的脚本。

## 可选脚本（运维 / 手机工作流程）

这些位于 `scripts/` 下，并且是**可选的**。它们假设对网关主机具有 SSH 访问权限，并为 systemd + Termux 进行了调整。

- `scripts/claude-auth-status.sh` 现在使用 `openclaw models status --json` 作为
  事实来源（如果 CLI 不可用，则回退到直接读取文件），
  因此请将 `openclaw` 保存在 `PATH` 上以用于计时器。
- `scripts/auth-monitor.sh`：cron/systemd 计时器目标；发送警报（ntfy 或手机）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 用户计时器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 身份验证检查器（完整//简单）。
- `scripts/mobile-reauth.sh`：通过 SSH 进行的引导式重新身份验证流程。
- `scripts/termux-quick-auth.sh`：一键小部件状态 + 打开身份验证 URL。
- `scripts/termux-auth-widget.sh`：完整的引导式小部件流程。
- `scripts/termux-sync-widget.sh`：将 Claude Code 凭据同步到 OpenClaw。

如果您不需要手机自动化或 systemd 计时器，请跳过这些脚本。

import zh from '/components/footer/zh.mdx';

<zh />

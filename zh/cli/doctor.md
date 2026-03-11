---
summary: "CLI 参考，包含 `openclaw doctor`（健康检查 + 指导修复）"
read_when:
  - "You have connectivity/auth issues and want guided fixes"
  - "You updated and want a sanity check"
title: "诊断"
---

# `openclaw doctor`

Gateway 和频道的健康检查 + 快速修复。"

相关内容："

- 故障排查：[故障排查](/zh/gateway/troubleshooting)"
- 安全审计：[安全性](/zh/gateway/security)"

## 示例"

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

说明："

- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 是 TTY 且**未**设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。"
- `--fix`（`--repair` 的别名）会写入备份到 `~/.openclaw/openclaw.json.bak` 并删除未知的配置键，列出每个删除项。"

## macOS：`launchctl` 环境变量覆盖"

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值将覆盖你的配置文件，并可能导致持久的”未授权”错误。”

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导修复）"
read_when:
  - 你遇到连接/认证问题并需要引导式修复
  - 你刚更新并想做一次 sanity check
title: "doctor"
---

# `openclaw doctor`

用于 Gateway 与渠道的健康检查 + 快速修复。

相关：

- 故障排查：[Troubleshooting](/zh/gateway/troubleshooting)
- 安全审计：[Security](/zh/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

说明：

- 交互式提示（如 keychain/OAuth 修复）仅在 stdin 为 TTY 且未设置 `--non-interactive` 时运行。无终端的运行（cron、Telegram、无 TTY）会跳过提示。
- `--fix`（`--repair` 别名）会在 `~/.openclaw/openclaw.json.bak` 写入备份，并删除未知配置键，逐条列出移除项。

## macOS：`launchctl` 环境变量覆盖

如果你曾执行 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖配置文件并导致持续的 “unauthorized” 错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

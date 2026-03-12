---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
---

# `openclaw doctor`

针对网关和通道的健康检查 + 快速修复。

相关内容：

- 故障排查：[故障排查](/zh/en/gateway/troubleshooting)
- 安全审计：[安全性](/zh/en/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

说明：

- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 为 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak` 并删除未知的配置键，列出每一项删除操作。
- 状态完整性检查现在可以检测 sessions 目录中的孤立脚本文件，并将其存档为 `.deleted.<timestamp>` 以安全地回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业格式，并可以在调度程序必须在运行时自动规范化它们之前就地重写它们。
- Doctor 包含内存搜索就绪检查，并可以在缺少嵌入凭据时推荐 `openclaw configure --section model`。
- 如果启用了沙盒模式但 Docker 不可用，doctor 会报告高信号警告并提供补救措施（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。

## macOS：`launchctl` 环境变量覆盖

如果您之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值将覆盖您的配置文件，并可能导致持续的“unauthorized”（未授权）错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

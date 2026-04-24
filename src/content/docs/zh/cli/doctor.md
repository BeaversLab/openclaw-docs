---
summary: "`openclaw doctor` (health checks + guided repairs) 的 CLI 参考"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
---

# `openclaw doctor`

针对网关和通道的健康检查 + 快速修复。

相关内容：

- 故障排除：[故障排除](/zh/gateway/troubleshooting)
- 安全审计：[安全性](/zh/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

## 选项

- `--no-workspace-suggestions`：禁用工作区内存/搜索建议
- `--yes`：接受默认值而不提示
- `--repair`：应用推荐的修复而不提示
- `--fix`：`--repair` 的别名
- `--force`：应用激进的修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`：无提示运行；仅限安全迁移
- `--generate-gateway-token`：生成并配置网关令牌
- `--deep`：扫描系统服务以查找额外的网关安装

备注：

- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 为 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）将跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切插件加载，以便无头健康检查保持快速。交互式会话在检查需要插件贡献时仍会完全加载插件。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak` 并丢弃未知的配置键，列出每一项删除内容。
- 状态完整性检查现在可以检测会话目录中的孤立转录文件，并可以将它们归档为 `.deleted.<timestamp>` 以安全地回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业格式，并可以在调度程序必须在运行时自动规范化它们之前就地重写它们。
- Doctor 修复缺失的捆绑插件运行时依赖项，而无需对已安装的 OpenClaw 包拥有写入权限。对于 root 所有的 npm 安装或加固的 systemd 单元，请将 `OPENCLAW_PLUGIN_STAGE_DIR` 设置为可写目录，例如 `/var/lib/openclaw/plugin-runtime-deps`。
- Doctor 会自动将旧的平面 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 重复运行 `doctor --fix` 不再报告或应用 Talk 规范化，当唯一差异是对象键顺序时。
- Doctor 包含内存搜索就绪检查，并且在缺少嵌入凭据时可以推荐 `openclaw configure --section model`。
- 如果启用了沙盒模式但 Docker 不可用，doctor 会报告一个高信号警告并提供补救措施（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理，且在当前命令路径中不可用，doctor 将报告只读警告，并且不会写入明文回退凭据。
- 如果渠道 SecretRef 检查在修复路径中失败，doctor 将继续运行并报告警告，而不是提前退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中有一个可解析的 Telegram 令牌。如果令牌检查不可用，doctor 将报告警告并跳过该次自动解析。

## macOS：`launchctl` 环境变量覆盖

如果您之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值将覆盖您的配置文件，并可能导致持续的“unauthorized”（未授权）错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

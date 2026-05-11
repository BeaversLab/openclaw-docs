---
summary: "CLI 参考 for `openclaw setup` (初始化配置 + 工作区)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "Setup"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 和代理工作区。

相关：

- 入门指南：[入门指南](/zh/start/getting-started)
- CLI 新手引导：[新手引导 (CLI)](/zh/start/wizard)

## 示例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 选项

- `--workspace <dir>`：代理工作区目录（存储为 `agents.defaults.workspace`）
- `--wizard`：运行新手引导
- `--non-interactive`：以无提示方式运行新手引导
- `--mode <local|remote>`：新手引导模式
- `--import-from <provider>`：在新手引导期间运行的迁移提供商
- `--import-source <path>`：`--import-from` 的源代理主目录
- `--import-secrets`：在新手引导迁移期间导入支持的密钥
- `--remote-url <url>`：远程 Gateway(网关) WebSocket URL
- `--remote-token <token>`：远程 Gateway(网关) 令牌

要通过 setup 运行新手引导：

```bash
openclaw setup --wizard
```

说明：

- 普通的 `openclaw setup` 会初始化配置和工作区，而不会运行完整的新手引导流程。
- 当存在任何新手引导标志（`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`）时，新手引导将自动运行。
- 如果检测到 Hermes 状态，交互式新手引导可以自动提供迁移。导入新手引导需要全新的设置；在新手引导之外，请使用 [Migrate](/zh/cli/migrate) 进行试运行计划、备份和覆盖模式。

## 相关内容

- [CLI 参考](/zh/cli)
- [安装概述](/zh/install)

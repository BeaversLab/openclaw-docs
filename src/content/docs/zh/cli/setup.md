---
summary: "CLI 参考，用于 `openclaw setup`（初始化配置和工作区，可选择运行新手引导）"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
  - You need every flag and how setup decides between baseline and wizard mode
title: "Setup"
---

# `openclaw setup`

初始化基准配置和代理工作区。如果存在任何新手引导标志，也会运行向导。

<Note>`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝写入设置，因为配置文件由 Nix 管理。请使用第一方 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start) 或其他 Nix 包的等效源配置。</Note>

## 选项

| 标志                       | 描述                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | Agent 工作区目录（默认 `~/.openclaw/workspace`；存储为 `agents.defaults.workspace`）。 |
| `--wizard`                 | 运行交互式新手引导。                                                                   |
| `--non-interactive`        | 运行非提示性新手引导。                                                                 |
| `--accept-risk`            | 确认全系统代理访问风险；与 `--non-interactive` 一起使用时必需。                        |
| `--mode <mode>`            | 新手引导模式：`local` 或 `remote`。                                                    |
| `--import-from <provider>` | 在新手引导期间运行的迁移提供商。                                                       |
| `--import-source <path>`   | `--import-from` 的源代理主目录。                                                       |
| `--import-secrets`         | 在新手引导迁移期间导入支持的密钥。                                                     |
| `--remote-url <url>`       | 远程 Gateway(网关) WebSocket URL。                                                     |
| `--remote-token <token>`   | 远程 Gateway(网关) 令牌（可选）。                                                      |

### 向导自动触发

当明确存在以下任何标志时，`openclaw setup` 会运行向导，即使没有 `--wizard`：

`--wizard`、`--non-interactive`、`--accept-risk`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`。

## 示例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 注意

- 普通的 `openclaw setup` 初始化配置和工作区，而不运行完整的新手引导流程。
- 在普通设置后，运行 `openclaw onboard` 以进行完整的引导式旅程，运行 `openclaw configure` 以进行针对性更改，或运行 `openclaw channels add` 以添加渠道账户。
- 如果检测到 Hermes 状态，交互式新手引导可能会自动提供迁移。导入新手引导需要全新的设置；在新手引导之外，请使用 [Migrate](/zh/cli/migrate) 进行试运行计划、备份和覆盖模式。

## 相关

- [CLI 参考](/zh/cli)
- [新手引导 (CLI)](/zh/start/wizard)
- [入门指南](/zh/start/getting-started)
- [安装概述](/zh/install)

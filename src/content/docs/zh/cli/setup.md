---
summary: "CLI 参考 for `openclaw setup` (初始化配置 + 工作区)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "安装"
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
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 选项

- `--workspace <dir>`：代理工作区目录（存储为 `agents.defaults.workspace`）
- `--wizard`：运行新手引导
- `--non-interactive`：以无提示方式运行新手引导
- `--mode <local|remote>`：新手引导模式
- `--remote-url <url>`：远程 Gateway(网关) WebSocket URL
- `--remote-token <token>`：远程 Gateway(网关) 令牌

要通过 setup 运行新手引导：

```bash
openclaw setup --wizard
```

注意：

- 纯 `openclaw setup` 会初始化配置和工作区，而无需完整的新手引导流程。
- 当存在任何新手引导标志（`--wizard`、`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）时，新手引导将自动运行。

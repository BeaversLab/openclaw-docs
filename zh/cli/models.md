---
summary: "`openclaw models` 的 CLI 参考（status/list/set/scan、aliases、fallbacks、auth）"
read_when:
  - 需要更改默认模型或查看提供商认证状态
  - 需要扫描可用模型/提供商并排查认证配置
title: "models"
---

# `openclaw models`

模型发现、扫描与配置（默认模型、fallbacks、auth profiles）。

相关：

- Providers + models：[Models](/zh/providers/models)
- Provider 认证设置：[Getting started](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 会显示解析后的默认模型/回退，以及认证概览。
当提供商用量快照可用时，OAuth/token 状态区会包含 provider usage 标题。
加上 `--probe` 可对每个已配置的 provider profile 进行实时认证探测。
探测是实际请求（可能消耗 token 并触发限流）。
使用 `--agent <id>` 可检查已配置 agent 的模型/认证状态。省略时，
若设置了 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` 则使用，否则使用
已配置的默认 agent。

备注：

- `models set <model-or-alias>` 接受 `provider/model` 或 alias。
- 模型引用按 **第一个** `/` 分割。如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果省略 provider，OpenClaw 会将输入视为 alias 或 **默认 provider** 的模型（仅当模型 ID 中不含 `/` 时生效）。

### `models status`

选项：
- `--json`
- `--plain`
- `--check`（exit 1=过期/缺失，2=即将过期）
- `--probe`（对已配置的 auth profile 进行实时探测）
- `--probe-provider <name>`（探测某个 provider）
- `--probe-profile <id>`（可重复或逗号分隔的 profile id）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

## Aliases + fallbacks

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Auth profiles

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```
`models auth login` 会运行提供商插件的认证流程（OAuth/API key）。使用
`openclaw plugins list` 查看已安装的提供商。

备注：

- `setup-token` 会提示输入 setup-token 值（可在任意机器上用 `claude setup-token` 生成）。
- `paste-token` 接受在其他地方或自动化中生成的 token 字符串。

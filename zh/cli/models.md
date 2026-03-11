---
summary: "`openclaw models` 的 CLI 参考（status/list/set/scan、别名、fallback、身份验证）"
read_when:
  - "You want to change default models or view provider auth status"
  - "You want to scan available models/providers and debug auth profiles"
title: "models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、fallback、身份验证配置文件）。

相关：

- 提供商 + 模型：[模型](/zh/providers/models)
- 提供商身份验证设置：[入门](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认值/fallback 以及身份验证概述。
当提供商使用快照可用时，OAuth/token 状态部分包括
提供商使用标头。
添加 `--probe` 以对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实的请求（可能会消耗 token 并触发速率限制）。
使用 `--agent <id>` 检查配置的代理的模型/身份验证状态。如果省略，
该命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果设置），否则使用
配置的默认代理。

注意事项：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- 模型引用通过在 **第一个** `/` 上分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会将输入视为 **默认提供商** 的别名或模型（仅当模型 ID 中没有 `/` 时才有效）。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出 1=已过期/缺失，2=即将过期）
- `--probe`（配置的身份验证配置文件的实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

## 别名 + fallback

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看安装了哪些提供商。

注意事项：

- `setup-token` 提示输入 setup-token 值（在任意机器上使用 `claude setup-token` 生成）。
- `paste-token` 接受在其他地方生成的或来自自动化的 token 字符串。

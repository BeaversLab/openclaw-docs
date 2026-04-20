---
summary: "CLI 参考，用于 `openclaw models`（状态/列表/设置/扫描、别名、回退、身份验证）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、备用、认证配置文件）。

相关：

- 提供商 + 模型：[模型](/zh/providers/models)
- 提供商认证设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认/回退以及身份验证概览。
当提供商用法的快照可用时，OAuth/API 密钥状态部分包含
提供商用法的窗口和配额快照。
当前用法窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。用法身份验证来自提供商特定的钩子
（如果可用）；否则 OpenClaw 将回退到从身份验证配置文件、环境变量或配置中匹配的
OAuth/API 密钥凭据。
在 `--json` 输出中，`auth.providers` 是感知环境变量/配置/存储的提供商
概览，而 `auth.oauth` 仅显示身份验证存储配置文件的运行状况。
添加 `--probe` 以对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实的请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 以检查已配置代理的模型/身份验证状态。如果省略，
该命令将使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。
探测行可以来自身份验证配置文件、环境变量凭据或 `models.json`。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- 模型引用通过在 **第一个** `/` 处分割来进行解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会首先将输入解析为别名，然后
  解析为该确切模型 ID 的唯一已配置提供商匹配，只有在那之后才会
  回退到已配置的默认提供商并显示弃用警告。
  如果该提供商不再公开已配置的默认模型，OpenClaw
  将回退到第一个已配置的提供商/模型，而不是显示
  陈旧的已移除提供商的默认值。
- `models status` 可能会在身份验证输出中为非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`）显示 `marker(<value>)`，而不是将其作为机密进行掩码处理。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（对已配置的身份验证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

探测状态分类：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期会遇到的探测详情/原因代码情况：

- `excluded_by_auth_order`：存在已存储的配置文件，但显式
  `auth.order.<provider>` 将其省略，因此探测会报告排除状态而不是
  尝试使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置文件存在但不符合资格/无法解析。
- `no_model`：提供商身份验证存在，但 OpenClaw 无法为该提供商解析可探测的
  模型候选。

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式身份验证助手。它可以启动提供商身份验证
流程（OAuth/API 密钥）或引导您进行手动令牌粘贴，具体取决于您选择的
提供商。

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看已安装哪些提供商。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

注意事项：

- 对于暴露令牌身份验证方法的提供商，`setup-token` 和 `paste-token` 仍然是通用的令牌命令。
- `setup-token` 需要一个交互式 TTY 并运行提供商的令牌身份验证方法（当提供商暴露该方法时，默认为该提供商的 `setup-token` 方法）。
- `paste-token` 接受在其他地方生成或来自自动化的令牌字符串。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其写入默认配置文件 ID `<provider>:manual`，除非您传递 `--profile-id`。
- `paste-token --expires-in <duration>` 存储相对于持续时间的绝对令牌到期时间，例如 `365d` 或 `12h`。
- Anthropic 说明：Anthropic 员工告知我们，允许再次使用 OpenClaw 风格的 Claude CLI，因此除非 Anthropic 发布新政策，否则 OpenClaw 将在此集成中认可 Claude CLI 复用和 `claude -p` 的使用。
- Anthropic `setup-token` / `paste-token` 仍作为受支持的 OpenClaw 令牌路径提供，但如果可用，OpenClaw 现在更倾向于复用 Claude CLI 和使用 `claude -p`。
